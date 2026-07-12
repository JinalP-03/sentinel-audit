/**
 * Prometheux integration — contextual integrity checking via the REST API.
 *
 * Endpoints used (paths relative to PROMETHEUX_BASE_URL):
 *   POST /concepts/{projectId}/run/{conceptName}   — trigger execution
 *   GET  /concepts/{projectId}/execution-status    — poll until terminal
 *   GET  /concepts/{projectId}/fetch               — read output rows
 *
 * All responses use the { status, message, data } envelope documented at
 * https://docs.prometheux.ai/integrations/rest-api
 */

const CONCEPT_NAME = "integrity_breach";
const OUTPUT_PREDICATE = "integrity_breach";
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20; // ~30 s maximum wait

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Envelope<T = unknown> = {
  status: "success" | "error" | "conflict";
  message: string;
  data: T | null;
};

type ExecutionStatusData = {
  status: "idle" | "running" | "success" | "error" | "cancelled" | "interrupted";
  failure_reason: string | null;
  execution_id?: string;
  target_concept?: string;
};

type FetchData = {
  results: {
    facts: unknown[][];        // each element is a row array
    columnNames: string[];     // column headers; last column holds the reason
  };
};

export type PrometheuxResult = {
  /** True when the integrity_breach concept returns at least one matching row. */
  isBreach: boolean;
  /** Matched rows as objects keyed by column name (may be empty). */
  rows: Record<string, unknown>[];
  /** Human-readable derivation text extracted from the last column (_c4). */
  reasoning: string;
  /** Full run-endpoint response data, for debugging. */
  rawRun: unknown;
  /** Full fetch-endpoint response data, for debugging. */
  rawFetch: unknown;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig(): { apiKey: string; baseUrl: string; projectId: string } {
  const apiKey = process.env.PROMETHEUX_API_KEY;
  const baseUrl = process.env.PROMETHEUX_BASE_URL;
  const projectId = process.env.PROMETHEUX_PROJECT_ID;

  if (!apiKey || !baseUrl || !projectId) {
    throw new Error(
      "Missing Prometheux config — ensure PROMETHEUX_API_KEY, " +
        "PROMETHEUX_BASE_URL, and PROMETHEUX_PROJECT_ID are set in .env.local"
    );
  }

  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ""), projectId };
}

// ---------------------------------------------------------------------------
// HTTP helper — logs raw response for debugging
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  url: string,
  init: RequestInit,
  apiKey: string,
  label: string
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();

  let envelope: Envelope<T>;
  try {
    envelope = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new Error(
      `[prometheux] ${label}: non-JSON response (HTTP ${res.status}):\n${text.slice(0, 800)}`
    );
  }

  // Always log the raw envelope so auth/URL errors are immediately visible
  console.log(`[prometheux] ${label} → HTTP ${res.status}`, JSON.stringify(envelope, null, 2));

  if (envelope.status === "error" || envelope.status === "conflict") {
    throw new Error(
      `[prometheux] ${label} failed: ${envelope.message} (status=${envelope.status})`
    );
  }

  return envelope.data as T;
}

// ---------------------------------------------------------------------------
// Poll execution-status until the job reaches a terminal state
// ---------------------------------------------------------------------------

async function pollUntilDone(
  baseUrl: string,
  projectId: string,
  apiKey: string
): Promise<void> {
  const url = `${baseUrl}/concepts/${projectId}/execution-status?scope=user`;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));

    const data = await apiFetch<ExecutionStatusData>(
      url,
      { method: "GET" },
      apiKey,
      `execution-status poll ${i + 1}`
    );

    const s = data?.status ?? "idle";

    if (s === "success") return;
    if (s === "error") {
      throw new Error(
        `[prometheux] concept execution failed: ${data.failure_reason ?? "unknown reason"}`
      );
    }
    if (s === "cancelled" || s === "interrupted") {
      throw new Error(`[prometheux] concept execution was ${s}`);
    }
    // "running" or "idle" — keep polling
  }

  throw new Error(
    `[prometheux] timed out after ${MAX_POLLS} polls (${(MAX_POLLS * POLL_INTERVAL_MS) / 1000}s)`
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs the `integrity_breach` Vadalog concept on the given purpose pair
 * and returns whether a contextual integrity breach is derived.
 *
 * @param collectionPurpose  The purpose for which the data was collected
 *                           (e.g. "visa_endorsement_assessment").
 * @param reusePurpose       The purpose for which the data would be reused
 *                           (e.g. "marketing_services").
 */
export async function checkContextualIntegrity(
  collectionPurpose: string,
  reusePurpose: string
): Promise<PrometheuxResult> {
  const { apiKey, baseUrl, projectId } = getConfig();

  // 1. Trigger the run
  const runUrl = `${baseUrl}/concepts/${projectId}/run/${CONCEPT_NAME}`;
  const rawRun = await apiFetch<unknown>(
    runUrl,
    {
      method: "POST",
      body: JSON.stringify({
        scope: "user",
        force_rerun: true,
        persist_outputs: true,
        params: {
          collection_purpose: collectionPurpose,
          reuse_purpose: reusePurpose,
        },
      }),
    },
    apiKey,
    `run/${CONCEPT_NAME}`
  );

  // 2. Wait for execution to finish
  await pollUntilDone(baseUrl, projectId, apiKey);

  // 3. Fetch output rows.
  //    Docs say GET /fetch, but the server returns 405 on GET (path exists,
  //    wrong method) and 404 on POST /search (path absent on this deployment).
  //    405 "Method Not Allowed" means the server knows /fetch but rejects GET,
  //    so we try POST /fetch with params in the query string (matching the
  //    pattern the /search endpoint uses for output_predicate + project_scope)
  //    and an empty body.
  const fetchUrl =
    `${baseUrl}/concepts/${projectId}/fetch` +
    `?output_predicate=${encodeURIComponent(OUTPUT_PREDICATE)}` +
    `&page=1&page_size=100&project_scope=user`;

  const rawFetch = await apiFetch<FetchData>(
    fetchUrl,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    apiKey,
    `POST fetch/${OUTPUT_PREDICATE}`
  );

  const fetchData = rawFetch as FetchData;
  const facts: unknown[][] = fetchData?.results?.facts ?? [];
  const columnNames: string[] = fetchData?.results?.columnNames ?? [];

  // Normalise a purpose string: lowercase, collapse underscores to spaces
  const normalise = (s: unknown) =>
    String(s ?? "")
      .toLowerCase()
      .replace(/_/g, " ")
      .trim();

  const normCollection = normalise(collectionPurpose);
  const normReuse = normalise(reusePurpose);

  const colIdx = columnNames.findIndex((c) =>
    c.toLowerCase().includes("collection")
  );
  const reuseIdx = columnNames.findIndex((c) =>
    c.toLowerCase().includes("reuse")
  );

  // Filter to rows whose Collection_purpose and Reuse_purpose match the
  // requested pair (the concept may hold results from previous runs too)
  const matchedRows = facts
    .filter(
      (fact) =>
        normalise(fact[colIdx]) === normCollection &&
        normalise(fact[reuseIdx]) === normReuse
    )
    .map((fact) =>
      Object.fromEntries(columnNames.map((col, i) => [col, fact[i]]))
    );

  const isBreach = matchedRows.length > 0;

  // The last column (_c4) carries the human-readable derivation reason
  const lastCol = columnNames[columnNames.length - 1];
  const derivation = isBreach
    ? String(matchedRows[0][lastCol] ?? "")
    : "";

  const reasoning = isBreach
    ? `Prometheux integrity_breach: ${derivation} ` +
      `(collection_purpose="${collectionPurpose}", reuse_purpose="${reusePurpose}")`
    : `Prometheux integrity_breach concept returned no rows for ` +
      `collection_purpose="${collectionPurpose}" / reuse_purpose="${reusePurpose}" - ` +
      `purposes are contextually compatible.`;

  return { isBreach, rows: matchedRows, reasoning, rawRun, rawFetch };
}
