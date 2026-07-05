import { TECHCRUNCH_RSS_URL } from "../constants.js";
import { fetchRssFeed, rssItemsToNewsItems } from "../rss.js";
import type { FeedAdapter, FeedFetchOptions, FeedFetchResult } from "../types.js";
import { filterNewsItems } from "../utils.js";

export const techCrunchAdapter: FeedAdapter = {
  meta: {
    id: "techcrunch",
    name: "TechCrunch",
    description: "Latest TechCrunch headlines via RSS."
  },

  async fetch({ limit, offset = 0, query, domain }: FeedFetchOptions): Promise<FeedFetchResult> {
    const parsed = await fetchRssFeed(TECHCRUNCH_RSS_URL);
    const filtered = filterNewsItems(rssItemsToNewsItems("techcrunch", parsed, parsed.length), query, domain);

    return {
      source: "techcrunch",
      available: filtered.length,
      items: filtered.slice(offset, offset + limit)
    };
  }
};
