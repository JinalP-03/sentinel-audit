import { NextResponse } from "next/server";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import {
  synthesizeScenario,
  ELEVENLABS_MODELS,
} from "@/lib/elevenlabs";

export type CompareResult = {
  modelId: string;
  modelLabel: string;
  audioBase64: string;
  latencyMs: number;
};

export type CompareResponse = {
  scenarioId: ScenarioId;
  flash: CompareResult;
  multilingual: CompareResult;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const scenarioId: ScenarioId = (body?.scenarioId as ScenarioId) ?? "c";

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    return NextResponse.json(
      { error: `Unknown scenario "${scenarioId}"` },
      { status: 400 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // Run both models in parallel; each call tracks its own wall-clock time.
  const [flashRes, multilingualRes] = await Promise.all([
    synthesizeScenario(scenario.lines, ELEVENLABS_MODELS.flash, apiKey),
    synthesizeScenario(scenario.lines, ELEVENLABS_MODELS.multilingual, apiKey),
  ]);

  const response: CompareResponse = {
    scenarioId,
    flash: {
      modelId: ELEVENLABS_MODELS.flash,
      modelLabel: "eleven_flash_v2_5",
      audioBase64: flashRes.audio.toString("base64"),
      latencyMs: flashRes.latencyMs,
    },
    multilingual: {
      modelId: ELEVENLABS_MODELS.multilingual,
      modelLabel: "eleven_multilingual_v2",
      audioBase64: multilingualRes.audio.toString("base64"),
      latencyMs: multilingualRes.latencyMs,
    },
  };

  return NextResponse.json(response);
}
