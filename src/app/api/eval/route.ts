import { NextResponse } from "next/server";
import { scoreAll } from "@/lib/eval/score";

/**
 * POST /api/eval
 *
 * Runs the full eval pipeline (real Tavily + Claude + Prometheux calls)
 * and returns an EvalReport as JSON.
 *
 * No request body needed.
 */
export async function POST() {
  try {
    const report = await scoreAll();
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
