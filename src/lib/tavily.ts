import type { SourceDoc } from "./types";

type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

export async function tavilySearch(
  query: string,
  apiKey: string
): Promise<SourceDoc[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 3,
      include_raw_content: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error ${res.status}`);
  const data = await res.json();
  return (data.results as TavilyResult[]).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 400),
  }));
}

export function sourcesToText(sources: SourceDoc[]): string {
  return sources
    .map((s) => `${s.title}\n${s.url}\n${s.snippet}`)
    .join("\n\n");
}
