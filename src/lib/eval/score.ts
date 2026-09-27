/**
 * Eval scorer for the Sentinel audit pipeline.
 *
 * - Loads src/lib/eval/fixtures.json for ground-truth labels.
 * - Runs runAudit() for each scenario (real API calls).
 * - Matches each fixture rule to the returned Finding by the `rule` string.
 *   If no Finding matches, the verdict is treated as "pass".
 * - Classification:
 *     POSITIVE = "breach" | "warning"   (auditor flagged something)
 *     NEGATIVE = "pass"
 *   TP: groundTruth positive, verdict positive
 *   FP: groundTruth negative, verdict positive
 *   FN: groundTruth positive, verdict negative
 *   TN: groundTruth negative, verdict negative
 * - Engine mapping: "relationship" → "deterministic", "claude" → "LLM"
 */

import { SCENARIOS } from "../scenarios";
import { runAudit } from "../audit-engine";
import type { Finding } from "../types";
import fixturesRaw from "./fixtures.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditStatus = "breach" | "warning" | "pass";
type EngineFamily = "deterministic" | "LLM";

type FixtureRule = {
  ruleId: string;
  engine: "relationship" | "claude";
  groundTruth: AuditStatus;
};

type FixtureScenario = {
  scenarioId: string;
  rules: FixtureRule[];
};

export type RuleRow = {
  ruleId: string;
  engine: EngineFamily;
  TP: number;
  FP: number;
  FN: number;
  TN: number;
  precision: number | null;
  recall: number | null;
  fpr: number | null;
};

export type EngineMetrics = {
  precision: number | null;
  recall: number | null;
};

export type EvalReport = {
  perRule: RuleRow[];
  overall: { precision: number | null; recall: number | null };
  byEngine: { deterministic: EngineMetrics; LLM: EngineMetrics };
  scenarioCount: number;
  totalRuleChecks: number;
  sourceVerified: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPositive(status: AuditStatus): boolean {
  return status === "breach" || status === "warning";
}

function toEngineFamily(engine: "relationship" | "claude"): EngineFamily {
  return engine === "relationship" ? "deterministic" : "LLM";
}

function safeDivide(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

function aggregateMetrics(rows: RuleRow[]): EngineMetrics {
  const TP = rows.reduce((s, r) => s + r.TP, 0);
  const FP = rows.reduce((s, r) => s + r.FP, 0);
  const FN = rows.reduce((s, r) => s + r.FN, 0);
  return {
    precision: safeDivide(TP, TP + FP),
    recall: safeDivide(TP, TP + FN),
  };
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export async function scoreAll(): Promise<EvalReport> {
  const fixtures = fixturesRaw as FixtureScenario[];

  // Accumulate per-rule confusion matrix across all scenarios.
  // Key = ruleId
  const accumulator = new Map<
    string,
    { engine: EngineFamily; TP: number; FP: number; FN: number; TN: number }
  >();

  let totalRuleChecks = 0;
  let sourceVerified = 0;
  let scenarioCount = 0;

  for (const fixture of fixtures) {
    const scenario = SCENARIOS.find((s) => s.id === fixture.scenarioId);
    if (!scenario) {
      console.warn(`[eval] unknown scenarioId "${fixture.scenarioId}" — skipping`);
      continue;
    }

    console.log(`[eval] running audit for scenario ${fixture.scenarioId.toUpperCase()}…`);
    const { findings } = await runAudit(scenario);
    scenarioCount++;

    // Index findings by rule string for O(1) lookup
    const findingByRule = new Map<string, Finding>();
    for (const f of findings) {
      findingByRule.set(f.rule, f);
      if (f.source && f.source.trim().length > 0) sourceVerified++;
    }

    for (const fixtureRule of fixture.rules) {
      if (fixtureRule.groundTruth === null) {
        console.warn(`[eval] groundTruth is null for ${fixture.scenarioId}/${fixtureRule.ruleId} — skipping`);
        continue;
      }

      totalRuleChecks++;
      const found = findingByRule.get(fixtureRule.ruleId);
      const verdict: AuditStatus = found?.status ?? "pass";
      const gt = fixtureRule.groundTruth as AuditStatus;
      const engFamily = toEngineFamily(fixtureRule.engine);

      const predPos = isPositive(verdict);
      const gtPos = isPositive(gt);

      const prev = accumulator.get(fixtureRule.ruleId) ?? {
        engine: engFamily,
        TP: 0, FP: 0, FN: 0, TN: 0,
      };

      if (gtPos && predPos)  prev.TP++;
      if (!gtPos && predPos) prev.FP++;
      if (gtPos && !predPos) prev.FN++;
      if (!gtPos && !predPos) prev.TN++;

      accumulator.set(fixtureRule.ruleId, prev);
    }
  }

  // Build per-rule rows
  const perRule: RuleRow[] = Array.from(accumulator.entries()).map(
    ([ruleId, counts]) => ({
      ruleId,
      engine: counts.engine,
      TP: counts.TP,
      FP: counts.FP,
      FN: counts.FN,
      TN: counts.TN,
      precision: safeDivide(counts.TP, counts.TP + counts.FP),
      recall: safeDivide(counts.TP, counts.TP + counts.FN),
      fpr: safeDivide(counts.FP, counts.FP + counts.TN),
    })
  );

  // Overall metrics (all rules pooled)
  const overallTP = perRule.reduce((s, r) => s + r.TP, 0);
  const overallFP = perRule.reduce((s, r) => s + r.FP, 0);
  const overallFN = perRule.reduce((s, r) => s + r.FN, 0);
  const overall = {
    precision: safeDivide(overallTP, overallTP + overallFP),
    recall: safeDivide(overallTP, overallTP + overallFN),
  };

  // By-engine breakdown
  const deterministicRows = perRule.filter((r) => r.engine === "deterministic");
  const llmRows = perRule.filter((r) => r.engine === "LLM");

  return {
    perRule,
    overall,
    byEngine: {
      deterministic: aggregateMetrics(deterministicRows),
      LLM: aggregateMetrics(llmRows),
    },
    scenarioCount,
    totalRuleChecks,
    sourceVerified,
  };
}
