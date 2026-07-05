import { createRssAdapter } from "./adapters/rss.js";
import { DEFAULT_NEWS_LIMIT } from "./constants.js";
import { getBuiltinAdapter, resolveRequestedSources } from "./sources.js";
import type { FetchNewsOptions, FetchNewsResult, FeedFetchResult, NewsSourceId } from "./types.js";
import { combineFeedItems } from "./utils.js";

async function fetchSourceFeed(
  source: NewsSourceId,
  options: FetchNewsOptions,
  rssUrl?: string
): Promise<FeedFetchResult> {
  const adapter = source === "rss" && rssUrl ? createRssAdapter(rssUrl) : getBuiltinAdapter(source);

  return adapter.fetch({
    limit: options.limit ?? DEFAULT_NEWS_LIMIT,
    offset: options.offset ?? 0,
    query: options.query,
    domain: options.domain,
    rssUrl
  });
}

export async function fetchNews(options: FetchNewsOptions = {}): Promise<FetchNewsResult> {
  const sources = resolveRequestedSources(options.sources);
  const rssUrls = options.rssUrls ?? [];
  const feeds: FeedFetchResult[] = [];

  for (const source of sources) {
    if (source === "rss") {
      if (rssUrls.length === 0) {
        throw new Error("The rss source requires one or more rss_urls.");
      }

      for (const rssUrl of rssUrls) {
        feeds.push(await fetchSourceFeed("rss", options, rssUrl));
      }
      continue;
    }

    feeds.push(await fetchSourceFeed(source, options));
  }

  if (!sources.includes("rss") && rssUrls.length > 0) {
    for (const rssUrl of rssUrls) {
      feeds.push(await fetchSourceFeed("rss", options, rssUrl));
    }
  }

  const items = combineFeedItems(feeds);

  return {
    fetchedAt: new Date().toISOString(),
    sources: feeds.map((feed) => feed.source),
    count: items.length,
    feeds,
    items
  };
}
