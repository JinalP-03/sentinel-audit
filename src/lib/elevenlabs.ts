import { VOICES } from "./transcript";
import type { ClipLine } from "./transcript";

export const ELEVENLABS_MODELS = {
  flash: "eleven_flash_v2_5",
  multilingual: "eleven_multilingual_v2",
} as const;

export type ElevenLabsModel =
  (typeof ELEVENLABS_MODELS)[keyof typeof ELEVENLABS_MODELS];

const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75 };

/**
 * Synthesise a single line of text with ElevenLabs.
 * Returns raw MP3 bytes as a Buffer.
 */
export async function synthesizeLine(
  text: string,
  voiceKey: ClipLine["voice"],
  modelId: ElevenLabsModel,
  apiKey: string
): Promise<Buffer> {
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
        model_id: modelId,
        voice_settings: VOICE_SETTINGS,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `ElevenLabs error ${res.status} (model=${modelId}, voice=${voiceKey}): ${await res.text()}`
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Synthesise a full scenario (multiple lines) and return concatenated MP3.
 * Also returns the wall-clock latency in ms.
 */
export async function synthesizeScenario(
  lines: ClipLine[],
  modelId: ElevenLabsModel,
  apiKey: string
): Promise<{ audio: Buffer; latencyMs: number }> {
  const start = Date.now();
  const chunks: Buffer[] = [];
  for (const line of lines) {
    chunks.push(await synthesizeLine(line.text, line.voice, modelId, apiKey));
  }
  return { audio: Buffer.concat(chunks), latencyMs: Date.now() - start };
}
