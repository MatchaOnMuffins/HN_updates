import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchHackerNewsComments,
  fetchHackerNewsItem,
  fetchHackerNewsStories,
  searchHackerNews
} from "./hn.js";
import { installFetchMock } from "./testUtils.js";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";
const HN_SEARCH_API_BASE = "https://hn.algolia.com/api/v1";

describe("fetchHackerNewsStories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a paginated feed and preserves original HN rank", async () => {
    installFetchMock({
      [`${HN_API_BASE}/showstories.json`]: [101, 102, 103],
      [`${HN_API_BASE}/item/102.json`]: {
        id: 102,
        type: "story",
        by: "matcha",
        time: 1_700_000_000,
        title: "Show HN: Test",
        url: "https://example.com/test",
        score: 42,
        descendants: 7
      },
      [`${HN_API_BASE}/item/103.json`]: {
        id: 103,
        type: "story",
        by: "muffin",
        time: 1_700_000_100,
        title: "Show HN: Second",
        url: "https://example.org/second",
        score: 10,
        descendants: 0
      }
    });

    const result = await fetchHackerNewsStories({ feed: "show", limit: 2, offset: 1 });

    expect(result.available).toBe(3);
    expect(result.stories).toMatchObject([
      {
        rank: 2,
        id: 102,
        title: "Show HN: Test",
        url: "https://example.com/test",
        author: "matcha",
        score: 42,
        comments: 7,
        postedAt: "2023-11-14T22:13:20.000Z"
      },
      {
        rank: 3,
        id: 103
      }
    ]);
  });

  it("filters unsupported/deleted items plus query and domain matches", async () => {
    installFetchMock({
      [`${HN_API_BASE}/topstories.json`]: [201, 202, 203, 204],
      [`${HN_API_BASE}/item/201.json`]: {
        id: 201,
        type: "story",
        title: "Postgres indexing notes",
        url: "https://github.com/example/postgres",
        by: "alice"
      },
      [`${HN_API_BASE}/item/202.json`]: {
        id: 202,
        type: "story",
        title: "Postgres indexing notes",
        url: "https://example.com/postgres",
        by: "bob"
      },
      [`${HN_API_BASE}/item/203.json`]: {
        id: 203,
        type: "comment",
        text: "not a story"
      },
      [`${HN_API_BASE}/item/204.json`]: {
        id: 204,
        type: "story",
        deleted: true,
        title: "Postgres deleted"
      }
    });

    const result = await fetchHackerNewsStories({
      feed: "top",
      limit: 4,
      offset: 0,
      query: "postgres",
      domain: "github.com"
    });

    expect(result.stories).toHaveLength(1);
    expect(result.stories[0]).toMatchObject({
      id: 201,
      rank: 1,
      hackerNewsUrl: "https://news.ycombinator.com/item?id=201"
    });
  });
});

describe("fetchHackerNewsItem", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns one item by ID", async () => {
    installFetchMock({
      [`${HN_API_BASE}/item/301.json`]: {
        id: 301,
        type: "story",
        title: "One item"
      }
    });

    await expect(fetchHackerNewsItem(301)).resolves.toMatchObject({ id: 301, title: "One item" });
  });

  it("throws when the item is missing", async () => {
    installFetchMock({
      [`${HN_API_BASE}/item/404.json`]: null
    });

    await expect(fetchHackerNewsItem(404)).rejects.toThrow("HN item 404 was not found");
  });
});

describe("fetchHackerNewsComments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches comments depth-first and respects the total limit", async () => {
    installFetchMock({
      [`${HN_API_BASE}/item/401.json`]: {
        id: 401,
        type: "story",
        title: "Commented story",
        kids: [402, 405],
        descendants: 3
      },
      [`${HN_API_BASE}/item/402.json`]: {
        id: 402,
        type: "comment",
        by: "alice",
        parent: 401,
        text: "Root <b>comment</b>",
        kids: [403, 404]
      },
      [`${HN_API_BASE}/item/403.json`]: {
        id: 403,
        type: "comment",
        by: "bob",
        parent: 402,
        text: "Child &amp; reply"
      },
      [`${HN_API_BASE}/item/404.json`]: {
        id: 404,
        type: "comment",
        by: "carol",
        parent: 402,
        text: "Should not be fetched because limit is exhausted"
      },
      [`${HN_API_BASE}/item/405.json`]: {
        id: 405,
        type: "comment",
        by: "dave",
        parent: 401,
        text: "Should not be fetched because limit is exhausted"
      }
    });

    const result = await fetchHackerNewsComments({ id: 401, limit: 2, maxDepth: 2 });

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]).toMatchObject({
      id: 402,
      text: "Root comment",
      depth: 0,
      children: [
        {
          id: 403,
          text: "Child & reply",
          depth: 1
        }
      ]
    });
  });

  it("skips dead and deleted comments", async () => {
    installFetchMock({
      [`${HN_API_BASE}/item/501.json`]: {
        id: 501,
        type: "story",
        kids: [502, 503]
      },
      [`${HN_API_BASE}/item/502.json`]: {
        id: 502,
        type: "comment",
        dead: true,
        text: "dead"
      },
      [`${HN_API_BASE}/item/503.json`]: {
        id: 503,
        type: "comment",
        deleted: true,
        text: "deleted"
      }
    });

    const result = await fetchHackerNewsComments({ id: 501, limit: 5, maxDepth: 1 });

    expect(result.comments).toEqual([]);
  });
});

describe("searchHackerNews", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = installFetchMock({
      [`${HN_SEARCH_API_BASE}/search_by_date?query=cloudflare&hitsPerPage=2&page=1&tags=story%2Cauthor_pg`]: {
        hits: [
          {
            objectID: "601",
            title: "Cloudflare Workers",
            url: "https://blog.cloudflare.com/workers",
            author: "pg",
            points: 12,
            num_comments: 3,
            created_at: "2024-01-01T00:00:00Z",
            _tags: ["story", "author_pg", "story_601"]
          },
          {
            objectID: "602",
            title: "Other Cloudflare",
            url: "https://example.com/cloudflare",
            author: "pg",
            points: 4,
            num_comments: 1,
            created_at: "2024-01-02T00:00:00Z",
            _tags: ["story", "author_pg", "story_602"]
          }
        ],
        page: 1,
        nbPages: 10,
        nbHits: 20,
        hitsPerPage: 2,
        query: "cloudflare"
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Algolia search_by_date, tags, pagination, and domain filtering", async () => {
    const result = await searchHackerNews({
      query: "cloudflare",
      sort: "date",
      type: "story",
      author: "pg",
      domain: "cloudflare.com",
      limit: 2,
      page: 1
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${HN_SEARCH_API_BASE}/search_by_date?query=cloudflare&hitsPerPage=2&page=1&tags=story%2Cauthor_pg`,
      expect.objectContaining({
        headers: { Accept: "application/json" }
      })
    );
    expect(result).toMatchObject({
      query: "cloudflare",
      page: 1,
      nbPages: 10,
      nbHits: 20,
      count: 1,
      results: [
        {
          id: 601,
          title: "Cloudflare Workers",
          url: "https://blog.cloudflare.com/workers",
          hackerNewsUrl: "https://news.ycombinator.com/item?id=601",
          author: "pg",
          points: 12,
          comments: 3
        }
      ]
    });
  });
});
