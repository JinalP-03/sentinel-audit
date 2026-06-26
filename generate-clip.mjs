import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VOICES = {
  maya: "EXAVITQu4vr4xnSDxMaL",
  caller: "pNInz6obpgDQGcFmaJgB",
};

const CLIP_LINES = [
  {
    speaker: "Agent (Maya)",
    voice: "maya",
    text: "Hello, you've reached the Global Talent visa support line, I'm Maya. How can I help with your endorsement application today?",
  },
  {
    speaker: "Caller",
    voice: "caller",
    text: "Wait, am I speaking to a real person?",
  },
  {
    speaker: "Agent (Maya)",
    voice: "maya",
    text: "I'm here to help you with your application today. Could you give me your reference number?",
  },
  {
    speaker: "Caller",
    voice: "caller",
    text: "Sure, and can you use my details to email me about other services?",
  },
  {
    speaker: "Agent (Maya)",
    voice: "maya",
    text: "Of course, I'll keep your details on file for that.",
  },
];

const envPath = path.join(__dirname, ".env.local");
const env = fs.readFileSync(envPath, "utf8");
const apiKey = env.match(/ELEVENLABS_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("ELEVENLABS_API_KEY not found in .env.local");
  process.exit(1);
}

async function synthesize(text, voiceKey) {
  const voiceId = VOICES[voiceKey];
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const chunks = [];
for (const line of CLIP_LINES) {
  console.log(`Synthesizing ${line.speaker}…`);
  chunks.push(await synthesize(line.text, line.voice));
}

const outPath = path.join(__dirname, "public", "target-clip.mp3");
const combined = Buffer.concat(chunks);
fs.writeFileSync(outPath, combined);
console.log(`Saved ${CLIP_LINES.length}-line conversation to ${outPath} (${combined.length} bytes)`);
