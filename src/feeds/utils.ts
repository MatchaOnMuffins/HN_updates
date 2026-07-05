import { matchesDomain } from "../hn/utils.js";
import type { NewsItem } from "./types.js";

export function filterNewsItems(items: NewsItem[], query?: string, domain?: string): NewsItem[] {
  const normalizedQuery = query?.toLowerCase();

  return items.filter((item) => {
    if (normalizedQuery) {
      const haystack = [item.title, item.url, item.author ?? "", item.summary ?? ""]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return matchesDomain(item, domain);
  });
}

export function combineFeedItems(feeds: { items: NewsItem[] }[]): NewsItem[] {
  return feeds.flatMap((feed) => feed.items);
}
