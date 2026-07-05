import { fetchHackerNewsStories } from "../../hn/firebase.js";
import type { FeedAdapter, FeedFetchOptions, FeedFetchResult } from "../types.js";

export const hackerNewsAdapter: FeedAdapter = {
  meta: {
    id: "hn",
    name: "Hacker News",
    description: "Top stories from the Hacker News Firebase API."
  },

  async fetch({ limit, offset = 0, query, domain }: FeedFetchOptions): Promise<FeedFetchResult> {
    const result = await fetchHackerNewsStories({
      feed: "top",
      limit,
      offset,
      query,
      domain
    });

    return {
      source: "hn",
      available: result.available,
      items: result.stories.map((story) => ({
        id: String(story.id),
        source: "hn",
        rank: story.rank,
        title: story.title,
        url: story.url,
        author: story.author,
        score: story.score,
        comments: story.comments,
        postedAt: story.postedAt
      }))
    };
  }
};
