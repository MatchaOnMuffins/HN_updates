import { fetchRssFeed, rssItemsToNewsItems } from "../rss.js";
import type { FeedAdapter, FeedFetchOptions, FeedFetchResult } from "../types.js";
import { filterNewsItems } from "../utils.js";

export function createRssAdapter(url: string): FeedAdapter {
  const sourceId = `rss:${url}`;

  return {
    meta: {
      id: "rss",
      name: "Custom RSS",
      description: `Custom RSS feed at ${url}.`,
      requiresUrl: true
    },

    async fetch({ limit, offset = 0, query, domain, rssUrl }: FeedFetchOptions): Promise<FeedFetchResult> {
      const feedUrl = rssUrl ?? url;
      const parsed = await fetchRssFeed(feedUrl);
      const filtered = filterNewsItems(rssItemsToNewsItems(sourceId, parsed, parsed.length), query, domain);

      return {
        source: sourceId,
        available: filtered.length,
        items: filtered.slice(offset, offset + limit)
      };
    }
  };
}

export const rssAdapterTemplate: FeedAdapter = {
  meta: {
    id: "rss",
    name: "Custom RSS",
    description: "Provide one or more RSS/Atom feed URLs via the rss_urls parameter.",
    requiresUrl: true
  },

  async fetch(options: FeedFetchOptions): Promise<FeedFetchResult> {
    if (!options.rssUrl) {
      throw new Error("Custom RSS feeds require an rss_urls entry.");
    }

    return createRssAdapter(options.rssUrl).fetch(options);
  }
};
