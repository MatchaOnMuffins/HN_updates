import { createAbortSignal } from "../../hn/http.js";
import { ARXIV_LATEST_URL } from "../constants.js";
import { fetchRssFeed, rssItemsToNewsItems } from "../rss.js";
import type { FeedAdapter, FeedFetchOptions, FeedFetchResult } from "../types.js";
import { filterNewsItems } from "../utils.js";

export const arxivAdapter: FeedAdapter = {
  meta: {
    id: "arxiv",
    name: "arXiv",
    description: "Recent computer science preprints from the arXiv Atom API."
  },

  async fetch({ limit, offset = 0, query, domain }: FeedFetchOptions): Promise<FeedFetchResult> {
    const { signal, cleanup } = createAbortSignal();

    try {
      const parsed = await fetchRssFeed(ARXIV_LATEST_URL, signal);
      const filtered = filterNewsItems(rssItemsToNewsItems("arxiv", parsed, parsed.length), query, domain);

      return {
        source: "arxiv",
        available: filtered.length,
        items: filtered.slice(offset, offset + limit)
      };
    } finally {
      cleanup();
    }
  }
};
