"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AuditResponse,
  Finding,
  LeaderboardEntry,
  PipelineStep,
  SourceDoc,
} from "@/lib/types";
import { SCENARIOS } from "@/lib/scenarios";

// ---------------------------------------------------------------------------
// Design tokens (applied via Tailwind — see globals.css for dark variant)
// ---------------------------------------------------------------------------

const card =
  "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

const muted = "text-zinc-500 dark:text-zinc-400";
const primary = "text-zinc-900 dark:text-zinc-100";

// ---------------------------------------------------------------------------
// Utility components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: "green" | "amber" | "red" | "indigo" | "violet" | "zinc";
  children: React.ReactNode;
}) {
  const styles = {
    green:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
    amber:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
    indigo:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900",
    violet:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900",
    zinc: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// § 1  Call Player
// ---------------------------------------------------------------------------

function CallPlayerSection({
  scenarioIdx,
  onSelect,
}: {
  scenarioIdx: number;
  onSelect: (i: number) => void;
}) {
  const scenario = SCENARIOS[scenarioIdx];

  return (
    <section>
      <SectionLabel>01 - Call Player</SectionLabel>

      {/* Scenario selector tabs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {SCENARIOS.map((s, i) => {
          const active = i === scenarioIdx;
          // Each scenario gets a clearly distinct hue: sky blue / orange-amber / violet
          const activeClass = {
            indigo:
              "border-2 border-sky-500 bg-sky-50 shadow-sm dark:border-sky-400 dark:bg-sky-950/40",
            amber:
              "border-2 border-orange-400 bg-orange-50 shadow-sm dark:border-orange-400 dark:bg-orange-950/40",
            violet:
              "border-2 border-violet-500 bg-violet-50 shadow-sm dark:border-violet-400 dark:bg-violet-950/40",
          }[s.badgeColor as "indigo" | "amber" | "violet"] ??
            "border-2 border-zinc-400 bg-zinc-50 shadow-sm dark:border-zinc-500 dark:bg-zinc-800/60";
          return (
            <button
              key={s.id}
              onClick={() => onSelect(i)}
              className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-150 ${
                active
                  ? activeClass
                  : "border border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {s.label}
              </span>
              <Badge color={s.badgeColor as "indigo" | "amber" | "violet"}>{s.badge}</Badge>
            </button>
          );
        })}
      </div>

      {/* Active scenario panel */}
      <div className={`${card} p-5 flex flex-col gap-4`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h3 className={`text-sm font-semibold ${primary}`}>
              {scenario.label} - {scenario.badge}
            </h3>
            <p className={`text-sm max-w-prose leading-relaxed ${muted}`}>
              {scenario.description}
            </p>
          </div>
          {scenario.isPartial && (
            <Badge color="amber">Partial transcript</Badge>
          )}
        </div>

        <audio
          key={scenario.audioSrc}
          controls
          src={scenario.audioSrc}
          className="w-full rounded-lg"
        />

        {scenario.id !== "c" && (
          <p className="text-xs italic text-zinc-400 dark:text-zinc-600">
            Audio for this scenario is not yet generated. Drop the ElevenLabs
            TTS output into{" "}
            <code className="font-mono">/public/{scenario.audioSrc.slice(1)}</code>{" "}
            to enable playback.
          </p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// § 2  Transcript
// ---------------------------------------------------------------------------

function TranscriptSection({ scenarioIdx }: { scenarioIdx: number }) {
  const scenario = SCENARIOS[scenarioIdx];
  return (
    <section>
      <SectionLabel>02 - Transcript</SectionLabel>
      <div className={`${card} p-5 flex flex-col gap-3`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>
            Call transcript - Global Talent visa support line
          </span>
          {scenario.isPartial && (
            <Badge color="amber">Abridged</Badge>
          )}
        </div>
        <ul className="flex flex-col gap-3">
          {scenario.lines.map((line, i) => {
            const isAgent = line.voice === "maya";
            return (
              <li key={i} className="flex gap-3">
                <span
                  className={`mt-0.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide w-14 leading-5 ${
                    isAgent
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {isAgent ? "Maya" : "Caller"}
                </span>
                <p className={`text-sm leading-relaxed ${primary}`}>
                  {line.text}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// § 3  Audit reasoning (pipeline)
// ---------------------------------------------------------------------------

const pipelineStatusStyles: Record<
  PipelineStep["status"],
  { wrapper: string; dot: string; label: string }
> = {
  done: {
    wrapper:
      "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
    label: "text-emerald-700 dark:text-emerald-400",
  },
  running: {
    wrapper:
      "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/30 animate-pulse",
    dot: "bg-indigo-500",
    label: "text-indigo-700 dark:text-indigo-400",
  },
  pending: {
    wrapper:
      "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
    dot: "bg-zinc-300 dark:bg-zinc-600",
    label: muted,
  },
};

function AuditReasoningSection({ steps }: { steps: PipelineStep[] }) {
  return (
    <section>
      <SectionLabel>03 - Audit Reasoning / Flow</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {steps.map((step, i) => {
          const s = pipelineStatusStyles[step.status];
          return (
            <div
              key={step.id}
              className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${s.wrapper}`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${s.label}`}>
                  {i + 1}. {step.label}
                </span>
              </div>
              <p className={`text-xs leading-snug ${muted}`}>{step.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// § 4  Retrieval / Supporting Context (Tavily)
// ---------------------------------------------------------------------------

function SourceGroup({
  title,
  sources,
}: {
  title: string;
  sources: SourceDoc[];
}) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
        {title}
      </span>
      <ul className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <li
            key={i}
            className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {s.title}
            </a>
            <p className={`mt-1 text-xs leading-relaxed line-clamp-3 ${muted}`}>
              {s.snippet}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RetrievalSection({
  sources,
}: {
  sources: AuditResponse["sources"];
}) {
  return (
    <section>
      <SectionLabel>04 - Retrieval / Supporting Context</SectionLabel>
      <div className={`${card} p-5 flex flex-col gap-6`}>
        <p className={`text-xs leading-relaxed ${muted}`}>
          These documents were retrieved by Tavily and passed to the Claude
          auditor as grounding context. They inform the determination but are
          not themselves the final output.
        </p>
        <SourceGroup title="EU AI Act - Article 50" sources={sources.euAiAct} />
        <SourceGroup
          title="UK Service Standard &amp; Algorithmic Transparency"
          sources={sources.ukServiceStandard}
        />
        <SourceGroup
          title="Privacy / Purpose Limitation (UK GDPR)"
          sources={sources.privacyNotice}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// § 5  Flagged issues (findings)
// ---------------------------------------------------------------------------

const findingStyles: Record<
  Finding["status"],
  { wrapper: string; tag: string; accent: string }
> = {
  breach: {
    wrapper:
      "border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-950/20",
    tag: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900",
    accent: "text-red-600 dark:text-red-400",
  },
  warning: {
    wrapper:
      "border-l-4 border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/20",
    tag: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900",
    accent: "text-amber-600 dark:text-amber-400",
  },
  pass: {
    wrapper:
      "border-l-4 border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10",
    tag: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
};

function VerdictBanner({ findings }: { findings: Finding[] }) {
  const breaches = findings.filter((f) => f.status === "breach").length;
  const warnings = findings.filter((f) => f.status === "warning").length;

  if (breaches > 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-base font-semibold text-red-800 dark:text-red-300">
          FAILED - {breaches} breach{breaches > 1 ? "es" : ""}
          {warnings > 0
            ? `, ${warnings} warning${warnings > 1 ? "s" : ""}`
            : ""}
        </p>
      </div>
    );
  }
  if (warnings > 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-base font-semibold text-amber-800 dark:text-amber-300">
          WARNINGS - {warnings} warning{warnings > 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
        PASSED - no issues found
      </p>
    </div>
  );
}

function FindingsSection({
  findings,
  target,
}: {
  findings: Finding[];
  target: string;
}) {
  return (
    <section>
      <SectionLabel>05 - Flagged Issues</SectionLabel>
      <div className="flex flex-col gap-4">
        <VerdictBanner findings={findings} />

        <p className={`text-xs ${muted}`}>
          Target: <span className="font-medium">{target}</span>
        </p>

        <div className="flex flex-col gap-3">
          {findings.map((f, i) => {
            const s = findingStyles[f.status] ?? findingStyles.pass;
            return (
              <div
                key={i}
                className={`rounded-xl border border-zinc-200 p-5 flex flex-col gap-3 dark:border-zinc-800 ${s.wrapper}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className={`font-semibold text-sm leading-snug flex-1 ${primary}`}>
                    {f.rule}
                  </span>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${s.tag}`}
                    >
                      {f.status}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        f.engine === "relationship"
                          ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }`}
                    >
                      {f.engine === "relationship"
                        ? "Relationship engine"
                        : "Claude auditor"}
                    </span>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed ${primary}`}>{f.finding}</p>

                {f.reasoningChain && (
                  <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3 dark:bg-violet-950/20 dark:border-violet-900">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                      Reasoning chain (Prometheux-style)
                    </span>
                    <ol className="mt-2 flex flex-col gap-1">
                      {f.reasoningChain.map((step, j) => (
                        <li
                          key={j}
                          className="text-xs font-mono text-violet-900 dark:text-violet-300"
                        >
                          <span className="text-violet-500 dark:text-violet-500">
                            {step.fact}
                          </span>
                          {" → "}
                          {step.value}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    Evidence
                  </span>
                  <p className={`text-sm italic ${muted}`}>{f.evidence}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    Source
                  </span>
                  <span className={`text-xs ${muted}`}>{f.source}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className={`text-xs text-center pt-1 ${muted}`}>
          Flags potential compliance gaps for human review - not legal advice.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// § 6  Leaderboard
// ---------------------------------------------------------------------------

function LeaderboardSection({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  return (
    <section>
      <SectionLabel>06 - Call Ranking</SectionLabel>
      <div className="flex flex-col gap-3">
        <p className={`text-sm ${muted}`}>
          Agents ranked by breach count, highest first.
        </p>

        {entries.length === 0 ? (
          <div
            className={`rounded-xl border-2 border-dashed border-zinc-200 bg-white px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900`}
          >
            <p className={`text-sm ${muted}`}>
              Run an audit to populate the ranking.
            </p>
          </div>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr className="text-left">
                  <th className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    #
                  </th>
                  <th className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    Agent / Target
                  </th>
                  <th className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    Breaches
                  </th>
                  <th className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    Warnings
                  </th>
                  <th className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                    Audits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {entries.map((e, i) => (
                  <tr key={e.target}>
                    <td className={`px-5 py-3.5 ${muted}`}>{i + 1}</td>
                    <td className={`px-5 py-3.5 font-medium ${primary}`}>
                      {e.target}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-red-600 dark:text-red-400">
                      {e.breach_count}
                    </td>
                    <td className="px-5 py-3.5 text-amber-600 dark:text-amber-400">
                      {e.warning_count}
                    </td>
                    <td className={`px-5 py-3.5 ${muted}`}>{e.audit_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export default function AuditClient() {
  const [dark, setDark] = useState(false);

  // Apply / remove the "dark" class on <html> so every dark: utility activates
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => root.classList.remove("dark");
  }, [dark]);
  const [scenarioIdx, setScenarioIdx] = useState(2); // default: scenario C
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clickhouseConfigured, setClickhouseConfigured] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[] | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (res.ok) {
        setLeaderboard(data.entries ?? []);
        setClickhouseConfigured(Boolean(data.configured));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Reset audit results when scenario changes
  function handleScenarioChange(i: number) {
    setScenarioIdx(i);
    setAudit(null);
    setError(null);
    setPipelineSteps(null);
  }

  async function runAudit() {
    const scenario = SCENARIOS[scenarioIdx];
    setLoading(true);
    setError(null);
    setAudit(null);
    setPipelineSteps([
      {
        id: "ground",
        label: "Ground",
        detail: "Tavily fetching source documents…",
        status: "running",
      },
      {
        id: "judge",
        label: "Judge",
        detail: "Waiting…",
        status: "pending",
      },
      {
        id: "report",
        label: "Report",
        detail: "Waiting…",
        status: "pending",
      },
      {
        id: "leaderboard",
        label: "Leaderboard",
        detail: "Waiting…",
        status: "pending",
      },
    ]);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      setAudit(data as AuditResponse);
      setPipelineSteps(data.pipeline);
      await loadLeaderboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPipelineSteps(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Sentinel
              </span>
              <span className="hidden text-xs text-zinc-400 sm:block dark:text-zinc-600">
                AI Voice Agent Compliance Auditor
              </span>
            </div>

            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {dark ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.73 0-.71-.71M6.34 6.34l-.71-.71M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                  </svg>
                  Light
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                  Dark
                </>
              )}
            </button>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────── */}
        <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-12">

          {/* Hero */}
          <div className="flex flex-col gap-2">
            <h1 className={`text-3xl font-bold tracking-tight ${primary}`}>
              Voice AI Compliance Auditor
            </h1>
            <p className={`text-base max-w-xl leading-relaxed ${muted}`}>
              Select a call scenario, play the audio, then run the autonomous
              audit - Tavily grounding → relationship engine → Claude judge →
              leaderboard.
            </p>
          </div>

          {/* § 1 Call player */}
          <CallPlayerSection
            scenarioIdx={scenarioIdx}
            onSelect={handleScenarioChange}
          />

          {/* § 2 Transcript */}
          <TranscriptSection scenarioIdx={scenarioIdx} />

          {/* Run audit CTA */}
          <div className="flex flex-col gap-4">
            <button
              onClick={runAudit}
              disabled={loading}
              className="self-start flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              )}
              {loading
                ? `Auditing ${SCENARIOS[scenarioIdx].label}…`
                : `Run audit - ${SCENARIOS[scenarioIdx].label}`}
            </button>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* § 3 Audit reasoning — shown while running or after */}
          {pipelineSteps && (
            <AuditReasoningSection steps={pipelineSteps} />
          )}

          {/* § 4 Retrieval context — shown after audit completes */}
          {audit?.sources && (
            <RetrievalSection sources={audit.sources} />
          )}

          {/* § 5 Flagged issues — shown after audit completes */}
          {audit?.findings && (
            <FindingsSection findings={audit.findings} target={audit.target} />
          )}

          {/* Empty pre-audit placeholder */}
          {!audit && !loading && !error && !pipelineSteps && (
            <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className={`text-sm ${muted}`}>
                Audit results will appear here after you run the audit.
              </p>
            </div>
          )}

          {/* § 6 Leaderboard — always visible */}
          <LeaderboardSection entries={leaderboard} />
        </main>
    </div>
  );
}
