import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/clickhouse";

export async function GET() {
  try {
    const entries = await getLeaderboard();
    return NextResponse.json({
      entries,
      configured: Boolean(process.env.CLICKHOUSE_URL),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
