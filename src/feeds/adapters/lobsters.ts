import { createAbortSignal, fetchJson } from "../../hn/http.js";
import { LOBSTERS_HOTTEST_URL } from "../constants.js";
import type { FeedAdapter, FeedFetchOptions, FeedFetchResult, NewsItem } from "../types.js";
import { filterNewsItems } from "../utils.js";

type LobstersStory = {
  short_id: string;
  short_id_url: string;
  created_at: string;
  title: string;
  url: string;
  score: number;
  comment_count: number;
  submitter_user: string;
};

export const lobstersAdapter: FeedAdapter = {
  meta: {
    id: "lobsters",
    name: "Lobsters",
    description: "Hottest stories from lobste.rs."
  },

  async fetch({ limit, offset = 0, query, domain }: FeedFetchOptions): Promise<FeedFetchResult> {
    const { signal, cleanup } = createAbortSignal();

    try {
      const stories = await fetchJson<LobstersStory[]>(LOBSTERS_HOTTEST_URL, signal);
      const items: NewsItem[] = stories.map((story, index) => ({
        id: story.short_id,
        source: "lobsters",
        rank: index + 1,
        title: story.title,
        url: story.url || story.short_id_url,
        author: story.submitter_user ?? null,
        score: story.score,
        comments: story.comment_count,
        postedAt: story.created_at
      }));

      const filtered = filterNewsItems(items, query, domain);

      return {
        source: "lobsters",
        available: filtered.length,
        items: filtered.slice(offset, offset + limit)
      };
    } finally {
      cleanup();
    }
  }
};
