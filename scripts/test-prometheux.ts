/**
 * Smoke test for the Prometheux contextual-integrity integration.
 *
 * Run from the project root:
 *   npx tsx scripts/test-prometheux.ts
 *
 * The script loads .env.local automatically — no extra flags needed.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local before importing any lib code that reads process.env
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
    console.log("[env] loaded .env.local\n");
  } catch {
    console.warn("[env] .env.local not found — relying on shell environment\n");
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Import after env is populated
// ---------------------------------------------------------------------------
import { checkContextualIntegrity } from "../src/lib/prometheux";

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------
const cases: { label: string; collection: string; reuse: string; expectBreach: boolean }[] = [
  {
    label: "Incompatible — visa data reused for marketing",
    collection: "visa_endorsement_assessment",
    reuse: "marketing_other_services",
    expectBreach: true,
  },
  {
    label: "Compatible — visa data reused for the same purpose",
    collection: "visa_endorsement_assessment",
    reuse: "visa_endorsement_assessment",
    expectBreach: false,
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("  Prometheux integrity_breach smoke test");
  console.log("=".repeat(60));
  console.log();
  console.log(`  BASE_URL   : ${process.env.PROMETHEUX_BASE_URL ?? "(not set)"}`);
  console.log(`  PROJECT_ID : ${process.env.PROMETHEUX_PROJECT_ID ?? "(not set)"}`);
  console.log(`  API_KEY    : ${process.env.PROMETHEUX_API_KEY ? "set (" + process.env.PROMETHEUX_API_KEY.slice(0, 12) + "…)" : "(not set)"}`);
  console.log();

  let passed = 0;
  let failed = 0;

  for (const tc of cases) {
    console.log("-".repeat(60));
    console.log(`Case: ${tc.label}`);
    console.log(`  collection_purpose : ${tc.collection}`);
    console.log(`  reuse_purpose      : ${tc.reuse}`);
    console.log(`  expect breach      : ${tc.expectBreach}`);
    console.log();

    try {
      const result = await checkContextualIntegrity(tc.collection, tc.reuse);

      console.log(`  isBreach  : ${result.isBreach}`);
      console.log(`  rows      : ${JSON.stringify(result.rows)}`);
      console.log(`  reasoning : ${result.reasoning}`);

      const ok = result.isBreach === tc.expectBreach;
      console.log(`  outcome   : ${ok ? "PASS ✓" : "UNEXPECTED (check expectations)"}`);
      if (ok) passed++; else failed++;
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    console.log();
  }

  console.log("=".repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed > 0) process.exit(1);
}

main();
