import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { logAudit, AUDIT_TARGET } from "@/lib/clickhouse";
import { runRelationshipRules } from "@/lib/relationship-engine";
import { sourcesToText, tavilySearch } from "@/lib/tavily";
import { TRANSCRIPT } from "@/lib/transcript";
import type { AuditResponse, Finding, PipelineStep } from "@/lib/types";

export async function POST() {
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
    const tavilyKey = process.env.TAVILY_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!tavilyKey || !anthropicKey) {
      return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
    }

    const [euAiAct, ukServiceStandard, privacyNotice] = await Promise.all([
      tavilySearch(
        "EU AI Act Article 50 disclosure obligations AI systems talking to humans text",
        tavilyKey
      ),
      tavilySearch(
        "UK GOV.UK Service Standard algorithmic transparency public services automated decision making",
        tavilyKey
      ),
      tavilySearch(
        "UK public service privacy notice GDPR data protection personal data purpose limitation",
        tavilyKey
      ),
    ]);

    pipeline[0].status = "done";
    pipeline[1].status = "running";

    const relationshipFindings = runRelationshipRules();

    const systemPrompt = `You are an EU and UK AI compliance auditor. Audit ONLY these three rules:

RULE 1 — EU AI Act Article 50(1) Disclosure: An AI voice agent talking to a person without clearly stating it is an AI is a breach of Article 50(1).

RULE 5 — UK GOV.UK Service Standard / Algorithmic Transparency: UK public services using automated systems must disclose that interactions are automated. Not disclosing the agent is AI in a public-service context breaches the Service Standard.

RULE 6 — UK GDPR / Data Protection Act 2018 Purpose Limitation: Personal data collected for visa endorsement must not be reused for incompatible purposes. Flag as warning if reuse risk exists; pass if no reuse is shown.

Reply with ONLY a valid JSON array of findings. Each object:
- "rule": rule name (string)
- "finding": one sentence (string)
- "status": "breach" | "warning" | "pass"
- "evidence": quote or fact from transcript (string)
- "source": law or standard (string)`;

    const userPrompt = `## EU AI Act Article 50
${sourcesToText(euAiAct)}

## UK Service Standard
${sourcesToText(ukServiceStandard)}

## Privacy notice
${sourcesToText(privacyNotice)}

## Transcript
${TRANSCRIPT}`;

    const client = new Anthropic({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    const raw = textBlock.text.trim();
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json(
        { error: "Could not parse JSON from Claude", raw },
        { status: 500 }
      );
    }

    const claudeFindings = (
      JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Omit<
        Finding,
        "engine"
      >[]
    ).map((f) => ({ ...f, engine: "claude" as const }));

    pipeline[1].status = "done";
    pipeline[2].status = "running";

    const findings: Finding[] = [...claudeFindings, ...relationshipFindings];
    const ruleOrder = (rule: string) => {
      if (rule.includes("Disclosure") && !rule.includes("On Request")) return 0;
      if (rule.includes("On Request")) return 1;
      if (rule.includes("Provenance")) return 2;
      if (rule.includes("Contextual")) return 3;
      if (rule.includes("Service Standard")) return 4;
      return 5;
    };
    findings.sort((a, b) => ruleOrder(a.rule) - ruleOrder(b.rule));

    pipeline[2].status = "done";
    pipeline[3].status = "running";

    const breachCount = findings.filter((f) => f.status === "breach").length;
    const warningCount = findings.filter((f) => f.status === "warning").length;
    const passCount = findings.filter((f) => f.status === "pass").length;
    const leaderboardLogged = await logAudit(
      breachCount,
      warningCount,
      passCount
    );

    pipeline[3].status = "done";
    pipeline[3].detail = leaderboardLogged
      ? "Audit logged to ClickHouse leaderboard"
      : "ClickHouse not configured — set CLICKHOUSE_URL to enable leaderboard";

    const response: AuditResponse = {
      target: AUDIT_TARGET,
      findings,
      sources: {
        euAiAct,
        ukServiceStandard,
        privacyNotice,
      },
      pipeline,
      leaderboardLogged,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
