/**
 * Generate ElevenLabs TTS audio clips for one or more scenarios.
 *
 * Uses the exact transcript lines from src/lib/scenarios.ts so the audio
 * always stays in sync with what the UI displays.
 *
 * Usage:
 *   npx tsx scripts/generate-clips.ts          # all scenarios
 *   npx tsx scripts/generate-clips.ts a b      # scenarios A and B only
 *   npx tsx scripts/generate-clips.ts c        # scenario C only
 *
 * Outputs:
 *   Scenario A → public/scenario-a.mp3
 *   Scenario B → public/scenario-b.mp3
 *   Scenario C → public/target-clip.mp3
 *
 * Voices (same as generate-clip.mjs):
 *   maya   → Rachel  EXAVITQu4vr4xnSDxMaL
 *   caller → Adam    pNInz6obpgDQGcFmaJgB
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
// Import scenario definitions (after env is loaded)
// ---------------------------------------------------------------------------
import { SCENARIOS } from "../src/lib/scenarios";
import { VOICES } from "../src/lib/transcript";

// ---------------------------------------------------------------------------
// ElevenLabs TTS
// ---------------------------------------------------------------------------
const MODEL = "eleven_multilingual_v2";
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75 };

async function synthesize(text: string, voiceKey: "maya" | "caller", apiKey: string): Promise<Buffer> {
  const voiceId = VOICES[voiceKey];
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status} for voice ${voiceKey}: ${await res.text()}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Filter scenarios by CLI args (e.g. "a b"), default to all
  const args = process.argv.slice(2).map((a) => a.toLowerCase());
  const targets = SCENARIOS.filter((s) => args.length === 0 || args.includes(s.id));

  if (targets.length === 0) {
    console.error(`No matching scenarios for args: ${args.join(", ")}`);
    process.exit(1);
  }

  for (const scenario of targets) {
    const outPath = resolve(ROOT, "public", scenario.audioSrc.replace(/^\//, ""));
    console.log(`\n=== Scenario ${scenario.id.toUpperCase()} — ${scenario.badge} ===`);
    console.log(`Output: ${outPath}`);

    const chunks: Buffer[] = [];
    for (const line of scenario.lines) {
      console.log(`  Synthesising [${line.voice}] "${line.text.slice(0, 60)}…"`);
      chunks.push(await synthesize(line.text, line.voice, apiKey));
    }

    const combined = Buffer.concat(chunks);
    writeFileSync(outPath, combined);
    console.log(`  Saved ${combined.length} bytes (${scenario.lines.length} lines)`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
