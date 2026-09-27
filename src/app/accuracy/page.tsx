import AccuracyClient from "./AccuracyClient";
import reportJson from "@/lib/eval/last-report.json";
import type { EvalReport } from "@/lib/eval/score";

export const metadata = {
  title: "Accuracy - Sentinel",
  description:
    "End-to-end eval: scores the audit pipeline against hand-graded ground truth across all three scenarios.",
};

export default function AccuracyPage() {
  // Cast is safe — last-report.json is written by run-eval.ts which returns
  // an EvalReport from scoreAll(). Re-run `npx tsx scripts/run-eval.ts` to
  // refresh the file with updated results.
  return <AccuracyClient report={reportJson as EvalReport} />;
}
