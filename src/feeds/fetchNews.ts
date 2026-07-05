import { createRssAdapter } from "./adapters/rss.js";
import { buildCacheKey, withCache } from "./cache.js";
import { DEFAULT_NEWS_LIMIT } from "./constants.js";
import { getBuiltinAdapter, resolveRequestedSources } from "./sources.js";
import type { FetchNewsOptions, FetchNewsResult, FeedFetchResult, NewsSourceId } from "./types.js";
import { combineFeedItems } from "./utils.js";

function buildFetchCacheKey(source: string, options: FetchNewsOptions): string {
  return buildCacheKey([
    "news",
    source,
    String(options.limit ?? DEFAULT_NEWS_LIMIT),
    String(options.offset ?? 0),
    options.query ?? "",
    options.domain ?? ""
  ]);
}

async function fetchSourceFeed(
  source: NewsSourceId,
  options: FetchNewsOptions,
  kv?: KVNamespace,
  rssUrl?: string
): Promise<{ feed: FeedFetchResult; cached: boolean }> {
  const adapter = source === "rss" && rssUrl ? createRssAdapter(rssUrl) : getBuiltinAdapter(source);
  const cacheKey = buildFetchCacheKey(rssUrl ? `rss:${rssUrl}` : source, options);

  const { data, cached } = await withCache(kv, cacheKey, () =>
    adapter.fetch({
      limit: options.limit ?? DEFAULT_NEWS_LIMIT,
      offset: options.offset ?? 0,
      query: options.query,
      domain: options.domain,
      rssUrl
    })
  );

  return { feed: data, cached };
}

export async function fetchNews(options: FetchNewsOptions = {}, kv?: KVNamespace): Promise<FetchNewsResult & { cacheHits: string[] }> {
  const sources = resolveRequestedSources(options.sources);
  const rssUrls = options.rssUrls ?? [];
  const cacheHits: string[] = [];
  const feeds: FeedFetchResult[] = [];

  for (const source of sources) {
    if (source === "rss") {
      if (rssUrls.length === 0) {
        throw new Error("The rss source requires one or more rss_urls.");
      }

      for (const rssUrl of rssUrls) {
        const { feed, cached } = await fetchSourceFeed("rss", options, kv, rssUrl);
        feeds.push(feed);
        if (cached) {
          cacheHits.push(`rss:${rssUrl}`);
        }
      }
      continue;
    }

    const { feed, cached } = await fetchSourceFeed(source, options, kv);
    feeds.push(feed);
    if (cached) {
      cacheHits.push(source);
    }
  }

  if (!sources.includes("rss") && rssUrls.length > 0) {
    for (const rssUrl of rssUrls) {
      const { feed, cached } = await fetchSourceFeed("rss", options, kv, rssUrl);
      feeds.push(feed);
      if (cached) {
        cacheHits.push(`rss:${rssUrl}`);
      }
    }
  }

  const items = combineFeedItems(feeds);

  return {
    fetchedAt: new Date().toISOString(),
    sources: feeds.map((feed) => feed.source),
    count: items.length,
    feeds,
    items,
    cacheHits
  };
}
