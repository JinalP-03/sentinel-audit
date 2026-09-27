import { NextResponse } from "next/server";
import { logAudit, AUDIT_TARGET } from "@/lib/clickhouse";
import { runAudit } from "@/lib/audit-engine";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import type { AuditResponse, PipelineStep } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const scenarioId: ScenarioId = (body?.scenario as ScenarioId) ?? "c";
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[2];

  const pipeline: PipelineStep[] = [
    {
      id: "ground",
      label: "Ground",
      detail: "Fetching EU AI Act, UK Service Standard, and privacy notice via Tavily",
      status: "running",
    },
    {
      id: "judge",
      label: "Judge",
      detail: "Relationship engine (rules 2–4) + Claude auditor (rules 1, 5, 6)",
      status: "pending",
    },
    {
      id: "report",
      label: "Report",
      detail: "Merging cited findings",
      status: "pending",
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      detail: "Logging breach count to ClickHouse",
      status: "pending",
    },
  ];

  try {
    pipeline[1].status = "running";

    // Delegate all audit logic to the shared engine (no HTTP round-trip)
    const { findings, sources } = await runAudit(scenario);

    pipeline[0].status = "done";
    pipeline[1].status = "done";
    pipeline[2].status = "running";
    pipeline[2].status = "done";
    pipeline[3].status = "running";

    const breachCount = findings.filter((f) => f.status === "breach").length;
    const warningCount = findings.filter((f) => f.status === "warning").length;
    const passCount = findings.filter((f) => f.status === "pass").length;

    const leaderboardLogged = await logAudit(breachCount, warningCount, passCount);

    pipeline[3].status = "done";
    pipeline[3].detail = leaderboardLogged
      ? "Audit logged to leaderboard"
      : "Leaderboard unavailable - no storage backend configured";

    const response: AuditResponse = {
      target: AUDIT_TARGET,
      findings,
      sources,
      pipeline,
      leaderboardLogged,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
