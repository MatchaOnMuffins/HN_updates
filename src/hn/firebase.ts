import { HN_API_BASE } from "./constants.js";
import { fetchJson, createAbortSignal } from "./http.js";
import { FEED_ENDPOINTS, type HnFeed } from "./schemas.js";
import type { CommentTreeResult, HackerNewsComment, HackerNewsItem, HackerNewsStory, StoryListResult } from "./types.js";
import { cleanHtmlText, mapLimit, matchesDomain, storyUrl, toIsoTime } from "./utils.js";

function toStory(item: HackerNewsItem, rank: number): HackerNewsStory | null {
  if (item.deleted || item.dead || !item.title || !item.type || !["story", "job", "poll"].includes(item.type)) {
    return null;
  }

  const hackerNewsUrl = storyUrl(item.id);

  return {
    rank,
    id: item.id,
    type: item.type,
    title: cleanHtmlText(item.title),
    url: item.url ?? hackerNewsUrl,
    hackerNewsUrl,
    author: item.by ?? null,
    score: item.score ?? 0,
    comments: item.descendants ?? 0,
    postedAt: toIsoTime(item.time)
  };
}

function matchesQuery(story: HackerNewsStory, query?: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return [story.title, story.url, story.author ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery));
}

export async function fetchHackerNewsStories({
  feed,
  limit,
  offset,
  query,
  domain
}: {
  feed: HnFeed;
  limit: number;
  offset: number;
  query?: string;
  domain?: string;
}): Promise<StoryListResult> {
  const { signal, cleanup } = createAbortSignal();

  try {
    const endpoint = FEED_ENDPOINTS[feed];
    const ids = await fetchJson<number[]>(`${HN_API_BASE}/${endpoint}.json`, signal);
    const rankedIds = ids.slice(offset, offset + limit).map((id, index) => ({ id, rank: offset + index + 1 }));

    const items = await mapLimit(rankedIds, 10, async ({ id, rank }) => {
      const item = await fetchJson<HackerNewsItem | null>(`${HN_API_BASE}/item/${id}.json`, signal);
      return item ? toStory(item, rank) : null;
    });

    const stories = items
      .filter((item): item is HackerNewsStory => item !== null)
      .filter((story) => matchesQuery(story, query))
      .filter((story) => matchesDomain(story, domain));

    return { available: ids.length, stories };
  } finally {
    cleanup();
  }
}

export async function fetchHackerNewsItem(id: number): Promise<HackerNewsItem> {
  const { signal, cleanup } = createAbortSignal();

  try {
    const item = await fetchJson<HackerNewsItem | null>(`${HN_API_BASE}/item/${id}.json`, signal);

    if (!item) {
      throw new Error(`HN item ${id} was not found`);
    }

    return item;
  } finally {
    cleanup();
  }
}

async function fetchCommentsForItem(
  item: HackerNewsItem,
  signal: AbortSignal,
  options: { limit: number; maxDepth: number }
): Promise<HackerNewsComment[]> {
  let remaining = options.limit;

  async function fetchCommentTree(id: number, depth: number): Promise<HackerNewsComment | null> {
    if (remaining <= 0 || depth > options.maxDepth) {
      return null;
    }

    const item = await fetchJson<HackerNewsItem | null>(`${HN_API_BASE}/item/${id}.json`, signal);

    if (!item || item.deleted || item.dead || item.type !== "comment") {
      return null;
    }

    remaining -= 1;
    const children: HackerNewsComment[] = [];

    if (remaining > 0 && depth < options.maxDepth) {
      for (const childId of item.kids ?? []) {
        if (remaining <= 0) {
          break;
        }

        const child = await fetchCommentTree(childId, depth + 1);

        if (child) {
          children.push(child);
        }
      }
    }

    return {
      id: item.id,
      author: item.by ?? null,
      parent: item.parent ?? null,
      postedAt: toIsoTime(item.time),
      text: cleanHtmlText(item.text),
      depth,
      children
    };
  }

  const comments: HackerNewsComment[] = [];

  for (const id of item.kids ?? []) {
    if (remaining <= 0) {
      break;
    }

    const comment = await fetchCommentTree(id, 0);

    if (comment) {
      comments.push(comment);
    }
  }

  return comments;
}

export function countComments(comments: HackerNewsComment[]): number {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.children), 0);
}

export async function fetchHackerNewsComments({
  id,
  limit,
  maxDepth
}: {
  id: number;
  limit: number;
  maxDepth: number;
}): Promise<CommentTreeResult> {
  const { signal, cleanup } = createAbortSignal();

  try {
    const item = await fetchJson<HackerNewsItem | null>(`${HN_API_BASE}/item/${id}.json`, signal);

    if (!item) {
      throw new Error(`HN item ${id} was not found`);
    }

    const comments = await fetchCommentsForItem(item, signal, { limit, maxDepth });
    return { item, comments };
  } finally {
    cleanup();
  }
}
