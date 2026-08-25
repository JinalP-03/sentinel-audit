"use client";

import { useRef, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import type { CompareResponse, CompareResult } from "@/app/api/tts-compare/route";
import { AppHeader } from "@/components/AppHeader";
import { card, muted, primary, SectionLabel } from "@/components/ui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64ToObjectUrl(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
}

// ---------------------------------------------------------------------------
// Audio panel — one model's result
// ---------------------------------------------------------------------------

function AudioPanel({
  result,
  isFastest,
  rank,
}: {
  result: CompareResult;
  isFastest: boolean;
  rank: number;
}) {
  const urlRef = useRef<string | null>(null);
  if (!urlRef.current) urlRef.current = base64ToObjectUrl(result.audioBase64);

  return (
    <div className={`${card} p-5 flex flex-col gap-4`}>
      {/* Model label row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest ${muted}`}
          >
            Model {rank}
          </span>
          <code className={`text-sm font-mono font-semibold ${primary}`}>
            {result.modelLabel}
          </code>
        </div>

        {/* Latency badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            isFastest
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {isFastest && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 0l1.5 4.5H12L8.25 7.5 9.75 12 6 9 2.25 12l1.5-4.5L0 4.5h4.5z" />
            </svg>
          )}
          {result.latencyMs.toLocaleString()} ms
        </span>
      </div>

      <audio controls src={urlRef.current} className="w-full rounded-lg" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Latency summary table
// ---------------------------------------------------------------------------

function LatencySummary({ result }: { result: CompareResponse }) {
  const diff = Math.abs(result.flash.latencyMs - result.multilingual.latencyMs);
  const flashFaster = result.flash.latencyMs <= result.multilingual.latencyMs;

  const rows = [
    { label: result.flash.modelLabel, ms: result.flash.latencyMs },
    { label: result.multilingual.modelLabel, ms: result.multilingual.latencyMs },
    {
      label: "Difference",
      ms: diff,
      note: flashFaster ? "flash faster" : "multilingual faster",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ label, ms, note }) => (
        <div
          key={label}
          className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40"
        >
          <code className={`text-xs font-mono ${muted}`}>{label}</code>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-sm font-semibold ${primary}`}>
              {ms.toLocaleString()} ms
            </span>
            {note && (
              <span className={`text-xs ${muted}`}>({note})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ModelComparisonClient() {
  const [scenarioId, setScenarioId] = useState<string>("c");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  async function handleCompare() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tts-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const flashFastest =
    result !== null && result.flash.latencyMs <= result.multilingual.latencyMs;

  const selectedScenario = SCENARIOS.find((s) => s.id === scenarioId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200">

      <AppHeader activePage="comparison" />

      <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-12">

        {/* Hero */}
        <div className="flex flex-col gap-2">
          <h1 className={`text-3xl font-bold tracking-tight ${primary}`}>
            Model Comparison
          </h1>
          <p className={`text-base max-w-xl leading-relaxed ${muted}`}>
            Generate the same scenario audio with two ElevenLabs models and
            compare playback quality and synthesis latency side by side.
          </p>
        </div>

        {/* § 01 Configuration */}
        <section>
          <SectionLabel>01 - Configuration</SectionLabel>
          <div className={`${card} p-5 flex flex-col gap-5`}>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex flex-col gap-1.5 flex-1">
                <label
                  htmlFor="scenario-select"
                  className={`text-xs font-semibold uppercase tracking-wide ${muted}`}
                >
                  Scenario
                </label>
                <select
                  id="scenario-select"
                  value={scenarioId}
                  onChange={(e) => {
                    setScenarioId(e.target.value);
                    setResult(null);
                    setError(null);
                  }}
                  className={`rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 ${primary} focus:outline-none focus:ring-2 focus:ring-indigo-500/40`}
                >
                  {SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} - {s.badge}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCompare}
                disabled={loading}
                className="self-start flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
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
                    Generating...
                  </>
                ) : (
                  "Compare"
                )}
              </button>
            </div>

            {selectedScenario && (
              <p className={`text-sm leading-relaxed ${muted}`}>
                {selectedScenario.description}{" "}
                <span className="text-zinc-400 dark:text-zinc-600">
                  ({selectedScenario.lines.length} lines)
                </span>
              </p>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${muted} mt-0.5 shrink-0`}>
                Models
              </span>
              <div className={`flex flex-wrap gap-x-6 gap-y-1 text-xs ${muted}`}>
                <span>
                  <code className={`font-mono text-xs font-medium ${primary}`}>
                    eleven_flash_v2_5
                  </code>{" "}
                  - optimised for low latency
                </span>
                <span>
                  <code className={`font-mono text-xs font-medium ${primary}`}>
                    eleven_multilingual_v2
                  </code>{" "}
                  - highest quality, 29 languages
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* § 02 Results — loading skeleton */}
        {loading && (
          <section>
            <SectionLabel>02 - Results</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`${card} p-5 animate-pulse flex flex-col gap-4`}
                >
                  <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* § 02 Results — populated */}
        {result && !loading && (
          <section>
            <SectionLabel>02 - Results</SectionLabel>
            <div className="flex flex-col gap-6">

              {/* Side-by-side audio players */}
              <div className="grid sm:grid-cols-2 gap-4">
                <AudioPanel
                  result={result.flash}
                  isFastest={flashFastest}
                  rank={1}
                />
                <AudioPanel
                  result={result.multilingual}
                  isFastest={!flashFastest}
                  rank={2}
                />
              </div>

              {/* Latency summary */}
              <div className={`${card} p-5 flex flex-col gap-4`}>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${muted}`}
                >
                  Latency summary
                </span>
                <LatencySummary result={result} />
              </div>
            </div>
          </section>
        )}

        {/* Pre-compare placeholder */}
        {!result && !loading && !error && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className={`text-sm ${muted}`}>
              Select a scenario and press Compare to generate both audio clips.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
