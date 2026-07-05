import type { NewsItem } from "./types.js";

export function formatNewsItems(items: NewsItem[]): string {
  if (items.length === 0) {
    return "No news items matched the request.";
  }

  return items
    .map((item) => {
      const metaParts = [
        item.source,
        item.score !== null ? `${item.score} points` : null,
        item.comments !== null ? `${item.comments} comments` : null,
        item.author ? `by ${item.author}` : null,
        item.postedAt ? item.postedAt : null
      ].filter((part): part is string => part !== null);

      const summary = item.summary ? `\n   ${item.summary.slice(0, 280)}` : "";

      return `${item.rank}. ${item.title}\n   ${item.url}\n   ${metaParts.join(" | ")}${summary}`;
    })
    .join("\n\n");
}

export function formatFeedSections(items: NewsItem[], sources: string[]): string {
  const grouped = new Map<string, NewsItem[]>();

  for (const item of items) {
    const bucket = grouped.get(String(item.source)) ?? [];
    bucket.push(item);
    grouped.set(String(item.source), bucket);
  }

  const sections = sources.map((source) => {
    const sourceItems = grouped.get(source) ?? [];
    if (sourceItems.length === 0) {
      return `## ${source}\nNo items returned.`;
    }

    return `## ${source}\n${formatNewsItems(sourceItems)}`;
  });

  return sections.join("\n\n");
}
