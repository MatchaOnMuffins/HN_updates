import { bioRxivAdapter } from "./adapters/biorxiv.js";
import { hackerNewsAdapter } from "./adapters/hackerNews.js";
import { lobstersAdapter } from "./adapters/lobsters.js";
import { rssAdapterTemplate } from "./adapters/rss.js";
import { techCrunchAdapter } from "./adapters/techcrunch.js";
import type { FeedAdapter, FeedSourceMeta, NewsSourceId } from "./types.js";

const BUILTIN_ADAPTERS: Record<Exclude<NewsSourceId, "rss">, FeedAdapter> = {
  hn: hackerNewsAdapter,
  techcrunch: techCrunchAdapter,
  lobsters: lobstersAdapter,
  biorxiv: bioRxivAdapter
};

export function getBuiltinAdapter(source: NewsSourceId): FeedAdapter {
  if (source === "rss") {
    return rssAdapterTemplate;
  }

  return BUILTIN_ADAPTERS[source];
}

export function listAvailableSources(): FeedSourceMeta[] {
  return [
    hackerNewsAdapter.meta,
    techCrunchAdapter.meta,
    lobstersAdapter.meta,
    bioRxivAdapter.meta,
    rssAdapterTemplate.meta
  ];
}

export function resolveRequestedSources(sources?: NewsSourceId[]): NewsSourceId[] {
  if (!sources || sources.length === 0) {
    return ["hn"];
  }

  return [...new Set(sources)];
}

export { BUILTIN_ADAPTERS };
