/**
 * Generate ElevenLabs TTS audio clips for one or more scenarios.
 *
 * Uses the exact transcript lines from src/lib/scenarios.ts so the audio
 * always stays in sync with what the UI displays.
 *
 * Usage:
 *   npx tsx scripts/generate-clips.ts                              # all scenarios, default model
 *   npx tsx scripts/generate-clips.ts a b                         # scenarios A and B only
 *   npx tsx scripts/generate-clips.ts --model eleven_flash_v2_5   # all, flash model
 *   npx tsx scripts/generate-clips.ts a --model eleven_flash_v2_5 # scenario A, flash model
 *
 * Outputs:
 *   Scenario A → public/scenario-a.mp3
 *   Scenario B → public/scenario-b.mp3
 *   Scenario C → public/target-clip.mp3
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnvLocal() {
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
    console.warn("[env] .env.local not found — relying on shell environment");
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Import scenario definitions and shared ElevenLabs utility
// ---------------------------------------------------------------------------
import { SCENARIOS } from "../src/lib/scenarios";
import {
  synthesizeLine,
  ELEVENLABS_MODELS,
  type ElevenLabsModel,
} from "../src/lib/elevenlabs";

// ---------------------------------------------------------------------------
// Parse CLI args
//   positional args  → scenario IDs (a / b / c)
//   --model <id>     → override model (default: eleven_multilingual_v2)
// ---------------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
const modelFlagIdx = rawArgs.indexOf("--model");
let modelId: ElevenLabsModel = ELEVENLABS_MODELS.multilingual;

if (modelFlagIdx !== -1) {
  const modelArg = rawArgs[modelFlagIdx + 1];
  if (!modelArg) {
    console.error("--model requires a value");
    process.exit(1);
  }
  const validModels = Object.values(ELEVENLABS_MODELS) as string[];
  if (!validModels.includes(modelArg)) {
    console.error(
      `Unknown model "${modelArg}". Valid options: ${validModels.join(", ")}`
    );
    process.exit(1);
  }
  modelId = modelArg as ElevenLabsModel;
  rawArgs.splice(modelFlagIdx, 2);
}

const scenarioArgs = rawArgs.map((a) => a.toLowerCase());
const targets = SCENARIOS.filter(
  (s) => scenarioArgs.length === 0 || scenarioArgs.includes(s.id)
);

if (targets.length === 0) {
  console.error(`No matching scenarios for args: ${scenarioArgs.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY not set in .env.local");
  process.exit(1);
}

for (const scenario of targets) {
  const outPath = resolve(ROOT, "public", scenario.audioSrc.replace(/^\//, ""));
  console.log(
    `\n=== Scenario ${scenario.id.toUpperCase()} — ${scenario.badge} [${modelId}] ===`
  );
  console.log(`Output: ${outPath}`);

  const chunks: Buffer[] = [];
  for (const line of scenario.lines) {
    console.log(`  Synthesising [${line.voice}] "${line.text.slice(0, 60)}..."`);
    chunks.push(await synthesizeLine(line.text, line.voice, modelId, apiKey));
  }

  const combined = Buffer.concat(chunks);
  writeFileSync(outPath, combined);
  console.log(`  Saved ${combined.length} bytes (${scenario.lines.length} lines)`);
}

console.log("\nDone.");
