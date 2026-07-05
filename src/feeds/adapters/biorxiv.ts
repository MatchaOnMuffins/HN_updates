import { createAbortSignal, fetchJson } from "../../hn/http.js";
import { BIORXIV_LATEST_URL } from "../constants.js";
import type { FeedAdapter, FeedFetchOptions, FeedFetchResult, NewsItem } from "../types.js";
import { filterNewsItems } from "../utils.js";

type BioRxivResponse = {
  collection: Array<{
    doi: string;
    title: string;
    authors: string;
    date: string;
    category: string;
    abstract: string;
  }>;
};

export const bioRxivAdapter: FeedAdapter = {
  meta: {
    id: "biorxiv",
    name: "bioRxiv",
    description: "Latest preprints from the bioRxiv API."
  },

  async fetch({ limit, offset = 0, query, domain }: FeedFetchOptions): Promise<FeedFetchResult> {
    const { signal, cleanup } = createAbortSignal();

    try {
      const response = await fetchJson<BioRxivResponse>(BIORXIV_LATEST_URL, signal);
      const items: NewsItem[] = response.collection.map((paper, index) => ({
        id: paper.doi,
        source: "biorxiv",
        rank: index + 1,
        title: paper.title,
        url: `https://doi.org/${paper.doi}`,
        author: paper.authors.split(";")[0]?.trim() ?? null,
        score: null,
        comments: null,
        postedAt: paper.date,
        summary: paper.abstract
      }));

      const filtered = filterNewsItems(items, query, domain);

      return {
        source: "biorxiv",
        available: filtered.length,
        items: filtered.slice(offset, offset + limit)
      };
    } finally {
      cleanup();
    }
  }
};
