import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type { LeaderboardEntry } from "./types";

const TARGET = "Global Talent visa support line (Maya)";

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
  if (!client) return false;
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
  if (!client) return [];
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
