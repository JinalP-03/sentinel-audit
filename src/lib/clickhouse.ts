import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type { LeaderboardEntry } from "./types";

const TARGET = "Global Talent visa support line (Maya)";

// ---------------------------------------------------------------------------
// In-memory fallback store — used when CLICKHOUSE_URL is not set.
// Rows accumulate for the lifetime of the Node.js process (dev server / single
// serverless container). The ClickHouse path is unchanged and takes priority
// whenever CLICKHOUSE_URL is present.
// ---------------------------------------------------------------------------
type MemoryAuditRow = {
  target: string;
  breach_count: number;
  warning_count: number;
  pass_count: number;
  audited_at: string;
};

const memoryStore: MemoryAuditRow[] = [];

function getMemoryLeaderboard(): LeaderboardEntry[] {
  const byTarget = new Map<
    string,
    { breach_count: number; warning_count: number; audit_count: number; last_audited: string }
  >();
  for (const row of memoryStore) {
    const existing = byTarget.get(row.target);
    if (existing) {
      existing.breach_count += row.breach_count;
      existing.warning_count += row.warning_count;
      existing.audit_count += 1;
      if (row.audited_at > existing.last_audited) existing.last_audited = row.audited_at;
    } else {
      byTarget.set(row.target, {
        breach_count: row.breach_count,
        warning_count: row.warning_count,
        audit_count: 1,
        last_audited: row.audited_at,
      });
    }
  }
  return [...byTarget.entries()]
    .map(([target, counts]) => ({ target, ...counts }))
    .sort((a, b) => b.breach_count - a.breach_count || b.warning_count - a.warning_count)
    .slice(0, 20);
}

function getClient(): ClickHouseClient | null {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) return null;
  return createClient({
    url,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    database: process.env.CLICKHOUSE_DATABASE ?? "default",
  });
}

export async function ensureAuditTable(): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS sentinel_audits (
        target String,
        breach_count UInt8,
        warning_count UInt8,
        pass_count UInt8,
        audited_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (target, audited_at)
    `,
  });
}

export async function logAudit(
  breachCount: number,
  warningCount: number,
  passCount: number
): Promise<boolean> {
  const client = getClient();
  if (!client) {
    memoryStore.push({
      target: TARGET,
      breach_count: breachCount,
      warning_count: warningCount,
      pass_count: passCount,
      audited_at: new Date().toISOString(),
    });
    return true;
  }
  await ensureAuditTable();
  await client.insert({
    table: "sentinel_audits",
    values: [
      {
        target: TARGET,
        breach_count: breachCount,
        warning_count: warningCount,
        pass_count: passCount,
      },
    ],
    format: "JSONEachRow",
  });
  return true;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = getClient();
  if (!client) return getMemoryLeaderboard();
  await ensureAuditTable();
  const result = await client.query({
    query: `
      SELECT
        target,
        sum(breach_count) AS breach_count,
        sum(warning_count) AS warning_count,
        count() AS audit_count,
        max(audited_at) AS last_audited
      FROM sentinel_audits
      GROUP BY target
      ORDER BY breach_count DESC, warning_count DESC
      LIMIT 20
    `,
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as LeaderboardEntry[];
  return rows.map((r) => ({
    ...r,
    last_audited:
      typeof r.last_audited === "string"
        ? r.last_audited
        : new Date(r.last_audited).toISOString(),
  }));
}

export { TARGET as AUDIT_TARGET };
