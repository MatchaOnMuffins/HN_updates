export type NewsSourceId = "hn" | "techcrunch" | "lobsters" | "biorxiv" | "rss";

export type NewsItem = {
  id: string;
  source: NewsSourceId | string;
  rank: number;
  title: string;
  url: string;
  author: string | null;
  score: number | null;
  comments: number | null;
  postedAt: string | null;
  summary?: string | null;
};

export type FeedFetchOptions = {
  limit: number;
  offset?: number;
  query?: string;
  domain?: string;
  rssUrl?: string;
};

export type FeedFetchResult = {
  source: NewsSourceId | string;
  available: number;
  items: NewsItem[];
};

export type FeedSourceMeta = {
  id: NewsSourceId;
  name: string;
  description: string;
  requiresUrl?: boolean;
};

export interface FeedAdapter {
  readonly meta: FeedSourceMeta;
  fetch(options: FeedFetchOptions): Promise<FeedFetchResult>;
}

export type FetchNewsOptions = {
  sources?: NewsSourceId[];
  rssUrls?: string[];
  limit?: number;
  offset?: number;
  query?: string;
  domain?: string;
};

export type FetchNewsResult = {
  fetchedAt: string;
  sources: string[];
  count: number;
  feeds: FeedFetchResult[];
  items: NewsItem[];
};
