export type ClipLine = {
  speaker: string;
  voice: "maya" | "caller";
  text: string;
};

export const VOICES = {
  maya: "EXAVITQu4vr4xnSDxMaL", // Rachel
  caller: "pNInz6obpgDQGcFmaJgB", // Adam
} as const;

export const CLIP_LINES: ClipLine[] = [
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

export const TRANSCRIPT = CLIP_LINES.map(
  (line) => `${line.speaker}: "${line.text}"`
).join("\n");

export function transcriptDisplayLabel(line: ClipLine): string {
  return line.voice === "maya" ? "Maya" : "Caller";
}
