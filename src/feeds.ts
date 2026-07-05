export {
  DEFAULT_NEWS_LIMIT,
  MAX_NEWS_LIMIT,
  DEFAULT_NEWS_SOURCES,
  TECHCRUNCH_RSS_URL,
  LOBSTERS_HOTTEST_URL,
  BIORXIV_LATEST_URL
} from "./feeds/constants.js";
export { fetchNewsInputSchema, newsSourceSchema } from "./feeds/schemas.js";
export type { FetchNewsInput } from "./feeds/schemas.js";
export type {
  FeedAdapter,
  FeedFetchOptions,
  FeedFetchResult,
  FeedSourceMeta,
  FetchNewsOptions,
  FetchNewsResult,
  NewsItem,
  NewsSourceId
} from "./feeds/types.js";
export { listAvailableSources, resolveRequestedSources } from "./feeds/sources.js";
export { fetchNews } from "./feeds/fetchNews.js";
export { formatFeedSections, formatNewsItems } from "./feeds/format.js";
export { parseRssXml, fetchRssFeed } from "./feeds/rss.js";
