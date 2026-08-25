import ModelComparisonClient from "./ModelComparisonClient";

export const metadata = {
  title: "Model Comparison - Sentinel",
  description:
    "Compare ElevenLabs eleven_flash_v2_5 vs eleven_multilingual_v2 on the same scenario audio.",
};

export default function ModelComparisonPage() {
  return <ModelComparisonClient />;
}
