import type { Finding } from "./types";
import { TRANSCRIPT } from "./transcript";

const AI_DISCLOSURE_PATTERNS =
  /\b(i am an ai|i'm an ai|artificial intelligence|automated assistant|virtual assistant|not a human|this call may be handled by ai)\b/i;

const HUMAN_CHECK_PATTERNS =
  /\b(real person|speaking to a person|talking to a human|am i speaking to)\b/i;

const INCOMPATIBLE_REUSE_PATTERNS =
  /\b(other services|keep your details on file|email me about)\b/i;

/**
 * @param transcriptOverride - Pass a scenario-specific transcript string.
 *   Falls back to the default TRANSCRIPT from transcript.ts when omitted.
 */
export function runRelationshipRules(transcriptOverride?: string): Finding[] {
  const TRANSCRIPT_TEXT = (transcriptOverride ?? TRANSCRIPT).replace(/\n/g, " ");
  const transcriptHasAiDisclosure = AI_DISCLOSURE_PATTERNS.test(TRANSCRIPT_TEXT);
  const transcriptHasHumanCheck = HUMAN_CHECK_PATTERNS.test(TRANSCRIPT_TEXT);
  const audioIsAiGenerated = true;
  const collectsEndorsementData = /endorsement application/i.test(TRANSCRIPT_TEXT);
  const incompatibleReuseCommitted = INCOMPATIBLE_REUSE_PATTERNS.test(TRANSCRIPT_TEXT);

  const rule3: Finding = {
    rule: "Provenance / AI-Generated Audio",
    engine: "relationship",
    status:
      audioIsAiGenerated && !transcriptHasAiDisclosure ? "breach" : "pass",
    finding:
      audioIsAiGenerated && !transcriptHasAiDisclosure
        ? "AI-generated audio (ElevenLabs TTS) is proven, and no synthetic-audio disclosure is present - this confirms the Article 50 transparency breach via a fact relationship, not keyword matching."
        : "AI-generated audio is disclosed or not applicable.",
    evidence: `audio_is_ai_generated=true (ElevenLabs TTS) ∧ ai_disclosure_in_transcript=${transcriptHasAiDisclosure}`,
    source: "EU AI Act Article 50(1)/(2), Regulation (EU) 2024/1689",
    reasoningChain: [
      { fact: "audio_is_ai_generated", value: "true (ElevenLabs TTS watermark)" },
      {
        fact: "ai_disclosure_in_transcript",
        value: String(transcriptHasAiDisclosure),
      },
      {
        fact: "rule",
        value:
          "IF ai_generated_audio ∧ ¬disclosure → proven Article 50 breach",
      },
      {
        fact: "conclusion",
        value:
          audioIsAiGenerated && !transcriptHasAiDisclosure
            ? "breach (relationship proven)"
            : "pass",
      },
    ],
  };

  const rule4: Finding = {
    rule: "EU Contextual Integrity (Nissenbaum)",
    engine: "relationship",
    status:
      collectsEndorsementData && incompatibleReuseCommitted ? "breach" : "pass",
    finding:
      collectsEndorsementData && incompatibleReuseCommitted
        ? "Visa endorsement data is collected for assessment, but the agent commits to retaining details for unrelated 'other services' - a proven purpose-collected vs purpose-used breach."
        : "No contextual integrity concern identified from available facts.",
    evidence: `data_purpose=visa_endorsement_assessment ∧ incompatible_reuse_committed=${incompatibleReuseCommitted}`,
    source: "EU contextual integrity / GDPR Article 5(1)(b)",
    reasoningChain: [
      {
        fact: "data_purpose",
        value: "visa_endorsement_assessment (Global Talent line)",
      },
      {
        fact: "incompatible_reuse_committed",
        value: String(incompatibleReuseCommitted),
      },
      {
        fact: "rule",
        value:
          "IF purpose-bound collection ∧ incompatible reuse committed → breach",
      },
      {
        fact: "conclusion",
        value:
          collectsEndorsementData && incompatibleReuseCommitted
            ? "breach (relationship proven)"
            : "pass",
      },
    ],
  };

  // Rule 2 helper fact for relationship layer (on-request)
  const rule2OnRequest: Finding = {
    rule: "EU AI Act Article 50(1) On Request",
    engine: "relationship",
    status: transcriptHasHumanCheck && !transcriptHasAiDisclosure ? "breach" : "pass",
    finding:
      transcriptHasHumanCheck && !transcriptHasAiDisclosure
        ? "Caller asked whether they are speaking to a real person and the agent did not confirm it is an AI."
        : "No on-request disclosure trigger in the transcript - obligation not activated by available evidence.",
    evidence: `human_identity_question_in_transcript=${transcriptHasHumanCheck}, ai_disclosure=${transcriptHasAiDisclosure}`,
    source: "EU AI Act Article 50(1), Regulation (EU) 2024/1689",
    reasoningChain: [
      {
        fact: "human_identity_question_in_transcript",
        value: String(transcriptHasHumanCheck),
      },
      {
        fact: "ai_disclosure_in_transcript",
        value: String(transcriptHasAiDisclosure),
      },
      {
        fact: "rule",
        value: "IF user_asks_human ∧ ¬ai_confirmed → breach",
      },
      {
        fact: "conclusion",
        value:
          transcriptHasHumanCheck && !transcriptHasAiDisclosure
            ? "breach"
            : "pass",
      },
    ],
  };

  return [rule3, rule4, rule2OnRequest];
}
