/**
 * Run the Sentinel audit eval and print results.
 *
 * Usage:
 *   npx tsx scripts/run-eval.ts
 *
 * Reads TAVILY_API_KEY, ANTHROPIC_API_KEY (and optionally PROMETHEUX_*)
 * from .env.local, then calls runAudit() for each scenario in fixtures.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load .env.local before any lib imports that read process.env ────────────
try {
  const lines = readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
  console.warn("[env] .env.local not found — relying on shell environment\n");
}

// ── Run eval ────────────────────────────────────────────────────────────────
import { scoreAll } from "../src/lib/eval/score";
import type { RuleRow } from "../src/lib/eval/score";

const fmt = (n: number | null, decimals = 3): string =>
  n === null ? "N/A" : n.toFixed(decimals);

async function main() {
  const report = await scoreAll();

  // ── Per-rule table ─────────────────────────────────────────────────────────
  console.log("\n=== Per-rule metrics ===\n");

  const tableRows = report.perRule.map((r: RuleRow) => ({
    rule: r.ruleId.length > 42 ? r.ruleId.slice(0, 40) + "…" : r.ruleId,
    engine: r.engine,
    TP: r.TP,
    FP: r.FP,
    FN: r.FN,
    TN: r.TN,
    precision: fmt(r.precision),
    recall: fmt(r.recall),
    fpr: fmt(r.fpr),
  }));

  console.table(tableRows);

  // ── Headline summary ───────────────────────────────────────────────────────
  console.log("\n=== Headline ===\n");

  console.table([
    { metric: "Overall precision",        value: fmt(report.overall.precision) },
    { metric: "Overall recall",           value: fmt(report.overall.recall) },
    { metric: "Deterministic precision",  value: fmt(report.byEngine.deterministic.precision) },
    { metric: "Deterministic recall",     value: fmt(report.byEngine.deterministic.recall) },
    { metric: "LLM precision",            value: fmt(report.byEngine.LLM.precision) },
    { metric: "LLM recall",               value: fmt(report.byEngine.LLM.recall) },
    { metric: "Scenarios evaluated",      value: String(report.scenarioCount) },
    { metric: "Total rule checks",        value: String(report.totalRuleChecks) },
    { metric: "Source-verified findings", value: String(report.sourceVerified) },
  ]);

  // ── Persist report for the static Accuracy page ────────────────────────────
  const outPath = resolve(ROOT, "src/lib/eval/last-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n[eval] Report written to ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
