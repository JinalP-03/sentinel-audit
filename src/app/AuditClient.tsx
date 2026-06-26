"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AuditResponse,
  Finding,
  LeaderboardEntry,
  PipelineStep,
  SourceDoc,
} from "@/lib/types";
import { CLIP_LINES, transcriptDisplayLabel } from "@/lib/transcript";

const statusStyles: Record<Finding["status"], { tag: string; row: string }> = {
  breach: {
    tag: "bg-red-100 text-red-700 border border-red-300",
    row: "border-l-4 border-red-400",
  },
  warning: {
    tag: "bg-amber-100 text-amber-700 border border-amber-300",
    row: "border-l-4 border-amber-400",
  },
  pass: {
    tag: "bg-green-100 text-green-700 border border-green-300",
    row: "border-l-4 border-green-400",
  },
};

function Verdict({ findings }: { findings: Finding[] }) {
  const breaches = findings.filter((f) => f.status === "breach").length;
  const warnings = findings.filter((f) => f.status === "warning").length;
  const failed = breaches > 0;
  const label = failed
    ? `FAILED — ${breaches} breach${breaches > 1 ? "es" : ""}${warnings > 0 ? `, ${warnings} warning${warnings > 1 ? "s" : ""}` : ""}`
    : warnings > 0
      ? `WARNINGS — ${warnings} warning${warnings > 1 ? "s" : ""}`
      : "PASSED — no issues found";
  const bg = failed
    ? "bg-red-50 border-red-300 text-red-800"
    : warnings > 0
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-green-50 border-green-300 text-green-800";

  return (
    <div className={`rounded-lg border px-5 py-3 font-semibold text-lg ${bg}`}>
      {label}
    </div>
  );
}

function PipelineBar({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`rounded-lg border px-3 py-2 text-xs ${
            step.status === "done"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : step.status === "running"
                ? "bg-blue-50 border-blue-200 text-blue-800 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        >
          <div className="font-bold uppercase tracking-wide">
            {i + 1}. {step.label}
          </div>
          <div className="mt-1 opacity-80 leading-snug">{step.detail}</div>
        </div>
      ))}
    </div>
  );
}

function SourceList({ title, sources }: { title: string; sources: SourceDoc[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <li
            key={i}
            className="bg-white rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 hover:underline"
            >
              {s.title}
            </a>
            <p className="text-slate-600 text-xs mt-1 line-clamp-2">{s.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaderboardTable({
  entries,
  configured,
}: {
  entries: LeaderboardEntry[];
  configured: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-slate-900">Leaderboard</h2>
        <span className="text-xs text-slate-500">
          {configured ? "ClickHouse" : "Set CLICKHOUSE_URL to enable"}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {configured
            ? "Run an audit to populate the breach leaderboard."
            : "Get connection details from the ClickHouse desk, add CLICKHOUSE_URL to .env.local, redeploy."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Agent / target</th>
                <th className="px-4 py-2">Breaches</th>
                <th className="px-4 py-2">Warnings</th>
                <th className="px-4 py-2">Audits</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.target} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{e.target}</td>
                  <td className="px-4 py-2 text-red-600 font-semibold">
                    {e.breach_count}
                  </td>
                  <td className="px-4 py-2 text-amber-600">{e.warning_count}</td>
                  <td className="px-4 py-2 text-slate-600">{e.audit_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AuditClient() {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clickhouseConfigured, setClickhouseConfigured] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[] | null>(
    null
  );

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

  async function runAudit() {
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
      const res = await fetch("/api/audit", { method: "POST" });
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

  const findings = audit?.findings ?? null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-6 py-12 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sentinel — public-service voice AI auditor
          </h1>
          <p className="text-slate-500 text-base">
            Autonomous inspector: Tavily ground → relationship + LLM judge →
            cited report → ClickHouse leaderboard
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">
            Demo clip — Global Talent visa support line
          </label>
          <audio
            controls
            src="/target-clip.mp3"
            className="w-full rounded-lg border border-slate-200 bg-white shadow-sm"
          />
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Call transcript
            </span>
            <ul className="flex flex-col gap-2 text-sm text-slate-700 leading-relaxed">
              {CLIP_LINES.map((line, i) => (
                <li key={i}>
                  <span className="font-bold text-slate-900">
                    {transcriptDisplayLabel(line)}:
                  </span>{" "}
                  {line.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500 italic">
            ElevenLabs two-speaker clip — no AI disclosure; on-request and purpose breaches
          </p>
        </div>

        <button
          onClick={runAudit}
          disabled={loading}
          className="self-start flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-white font-medium text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          {loading ? "Running autonomous audit…" : "Run audit"}
        </button>

        {pipelineSteps && <PipelineBar steps={pipelineSteps} />}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {audit?.sources && (
          <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-100/50 p-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Grounded sources (Tavily)
            </h2>
            <SourceList title="EU AI Act Article 50" sources={audit.sources.euAiAct} />
            <SourceList
              title="UK Service Standard & transparency"
              sources={audit.sources.ukServiceStandard}
            />
            <SourceList
              title="Privacy / purpose limitation"
              sources={audit.sources.privacyNotice}
            />
          </section>
        )}

        {findings && (
          <div className="flex flex-col gap-4">
            <Verdict findings={findings} />
            <p className="text-sm text-slate-600">
              Target: <strong>{audit?.target}</strong>
            </p>

            <div className="flex flex-col gap-3">
              {findings.map((f, i) => {
                const s = statusStyles[f.status] ?? statusStyles.pass;
                return (
                  <div
                    key={i}
                    className={`bg-white rounded-lg shadow-sm p-5 flex flex-col gap-3 ${s.row}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm leading-snug flex-1">
                        {f.rule}
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${s.tag}`}
                        >
                          {f.status}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                            f.engine === "relationship"
                              ? "bg-violet-100 text-violet-800 border border-violet-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {f.engine === "relationship"
                            ? "Relationship engine"
                            : "Claude auditor"}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700 text-sm leading-relaxed">
                      {f.finding}
                    </p>

                    {f.reasoningChain && (
                      <div className="rounded-md bg-violet-50 border border-violet-100 px-3 py-2">
                        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                          Reasoning chain (Prometheux-style)
                        </span>
                        <ol className="mt-2 flex flex-col gap-1">
                          {f.reasoningChain.map((step, j) => (
                            <li
                              key={j}
                              className="text-xs font-mono text-violet-900"
                            >
                              <span className="text-violet-500">{step.fact}</span>
                              {" → "}
                              {step.value}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Evidence
                      </span>
                      <p className="text-slate-600 text-sm italic">{f.evidence}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Source
                      </span>
                      <span className="text-xs text-slate-500">{f.source}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 text-center pt-2">
              Flags potential compliance gaps for human review — not legal advice.
            </p>
          </div>
        )}

        {!findings && !loading && !error && (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-400 text-sm">
            Audit results will appear here
          </div>
        )}

        <LeaderboardTable
          entries={leaderboard}
          configured={clickhouseConfigured}
        />
      </div>
    </div>
  );
}
