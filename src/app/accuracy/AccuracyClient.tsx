// Server Component — no "use client".
// Receives the eval report as a prop (imported statically in page.tsx from
// last-report.json), so the page renders instantly with no live API calls.

import { AppHeader } from "@/components/AppHeader";
import { card, muted, primary, SectionLabel } from "@/components/ui";
import type { EvalReport, RuleRow } from "@/lib/eval/score";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number | null, decimals = 3): string =>
  n === null ? "N/A" : n.toFixed(decimals);

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${card} p-5 flex flex-col gap-1`}>
      <span className={`text-[11px] font-semibold uppercase tracking-widest ${muted}`}>
        {label}
      </span>
      <span className={`text-3xl font-bold tracking-tight tabular-nums ${primary}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Engine comparison card
// ---------------------------------------------------------------------------

function EngineCard({
  label,
  precision,
  recall,
}: {
  label: string;
  precision: number | null;
  recall: number | null;
}) {
  return (
    <div className={`${card} p-5 flex flex-col gap-4`}>
      <span className={`text-[11px] font-semibold uppercase tracking-widest ${muted}`}>
        {label}
      </span>
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ["Precision", precision],
            ["Recall", recall],
          ] as [string, number | null][]
        ).map(([metric, val]) => (
          <div key={metric} className="flex flex-col gap-0.5">
            <span className={`text-xs ${muted}`}>{metric}</span>
            <span
              className={`text-xl font-bold tabular-nums ${
                val !== null && val < 1
                  ? "text-amber-600 dark:text-amber-400"
                  : primary
              }`}
            >
              {fmt(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-rule table
// ---------------------------------------------------------------------------

function RuleTable({ rows }: { rows: RuleRow[] }) {
  const thCls = `px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide ${muted}`;
  const tdBase = "px-4 py-3 text-sm";

  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60">
          <tr>
            <th className={thCls}>Rule</th>
            <th className={thCls}>Engine</th>
            <th className={`${thCls} text-right`}>Precision</th>
            <th className={`${thCls} text-right`}>Recall</th>
            <th className={`${thCls} text-right`}>FP-rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => {
            const imprecise = r.precision !== null && r.precision < 1;
            return (
              <tr
                key={r.ruleId}
                className={
                  imprecise ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                }
              >
                <td className={`${tdBase} max-w-xs`}>
                  <span className={primary}>{r.ruleId}</span>
                </td>
                <td className={tdBase}>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      r.engine === "deterministic"
                        ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400"
                        : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {r.engine}
                  </span>
                </td>
                <td className={`${tdBase} text-right font-mono`}>
                  <span
                    className={
                      imprecise
                        ? "font-semibold text-amber-600 dark:text-amber-400"
                        : primary
                    }
                  >
                    {fmt(r.precision)}
                  </span>
                </td>
                <td className={`${tdBase} text-right font-mono ${primary}`}>
                  {fmt(r.recall)}
                </td>
                <td className={`${tdBase} text-right font-mono`}>
                  <span
                    className={
                      r.fpr !== null && r.fpr > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : muted
                    }
                  >
                    {fmt(r.fpr)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function AccuracyClient({ report }: { report: EvalReport }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200">
      <AppHeader activePage="accuracy" />

      <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-12">

        {/* Hero */}
        <div className="flex flex-col gap-2">
          <h1 className={`text-3xl font-bold tracking-tight ${primary}`}>
            Accuracy
          </h1>
          <p className={`text-base max-w-xl leading-relaxed ${muted}`}>
            End-to-end eval against hand-graded ground truth across all three
            audit scenarios.
          </p>
        </div>

        {/* § 01 Headline */}
        <section>
          <SectionLabel>01 - Headline</SectionLabel>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Scenarios evaluated"
                value={String(report.scenarioCount)}
              />
              <StatCard
                label="Overall recall"
                value={fmt(report.overall.recall)}
              />
              <StatCard
                label="Overall precision"
                value={fmt(report.overall.precision)}
              />
            </div>
            <p className={`text-xs leading-relaxed ${muted}`}>
              {report.scenarioCount} scenarios / {report.totalRuleChecks}{" "}
              rule-level checks. Labels hand-graded against EU AI Act
              Art.&nbsp;50 and UK GDPR Art.&nbsp;5(1)(b).
            </p>
          </div>
        </section>

        {/* § 02 Per-rule breakdown */}
        <section>
          <SectionLabel>02 - Per-rule breakdown</SectionLabel>
          <div className="flex flex-col gap-3">
            <RuleTable rows={report.perRule} />
            <p className={`text-xs ${muted}`}>
              Rows highlighted in amber have precision &lt; 1.0 — the engine
              produced at least one false positive for that rule.
            </p>
          </div>
        </section>

        {/* § 03 Engine comparison */}
        <section>
          <SectionLabel>03 - Engine comparison</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-4">
            <EngineCard
              label="Deterministic (relationship engine)"
              precision={report.byEngine.deterministic.precision}
              recall={report.byEngine.deterministic.recall}
            />
            <EngineCard
              label="LLM (Claude auditor)"
              precision={report.byEngine.LLM.precision}
              recall={report.byEngine.LLM.recall}
            />
          </div>
        </section>

        {/* Source-verified stat */}
        <p className={`text-xs ${muted}`}>
          Source-verified:{" "}
          <span className={`font-semibold ${primary}`}>
            {report.sourceVerified}
          </span>{" "}
          /{" "}
          <span className={`font-semibold ${primary}`}>
            {report.totalRuleChecks}
          </span>{" "}
          findings across all scenarios.
        </p>

        {/* Known-finding footnote */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-300">
            <span className="font-semibold">Known finding: </span>
            the Contextual Integrity rule shows a false positive on Scenario A, a
            fully compliant call. When the Prometheux reasoning service is
            unavailable, the rule falls back to a keyword match that fires on the
            caller&rsquo;s question rather than the agent&rsquo;s commitment.
            Surfaced by this eval; fix tracked as the next iteration.
          </p>
        </div>

      </main>
    </div>
  );
}
