import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BIORXIV_LATEST_URL,
  LOBSTERS_HOTTEST_URL,
  TECHCRUNCH_RSS_URL,
  fetchNews,
  listAvailableSources,
  parseRssXml,
  resolveRequestedSources,
  withCache
} from "./feeds.js";
import { handleNewsRequest, handleSourcesRequest } from "./routes.js";
import { createMemoryKv, installFetchMock } from "./testUtils.js";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

const TECHCRUNCH_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Cloud startup raises funding</title>
      <link>https://techcrunch.com/cloud-startup</link>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <dc:creator>Jane Doe</dc:creator>
      <description>Startup news</description>
    </item>
    <item>
      <title>AI platform launch</title>
      <link>https://techcrunch.com/ai-platform</link>
      <pubDate>Tue, 02 Jan 2024 00:00:00 GMT</pubDate>
      <dc:creator>John Smith</dc:creator>
    </item>
  </channel>
</rss>`;

const CUSTOM_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Custom feed headline</title>
      <link>https://example.com/custom</link>
      <pubDate>Wed, 03 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

function installNewsFetchMock(): ReturnType<typeof installFetchMock> {
  return installFetchMock({
    [`${HN_API_BASE}/topstories.json`]: [1001, 1002],
    [`${HN_API_BASE}/item/1001.json`]: {
      id: 1001,
      type: "story",
      title: "HN top story",
      url: "https://example.com/hn-top",
      by: "pg",
      score: 100,
      descendants: 20,
      time: 1_700_000_000
    },
    [`${HN_API_BASE}/item/1002.json`]: {
      id: 1002,
      type: "story",
      title: "HN second story",
      url: "https://github.com/example/repo",
      by: "dang",
      score: 50,
      descendants: 5,
      time: 1_700_000_100
    },
    [TECHCRUNCH_RSS_URL]: TECHCRUNCH_RSS,
    [LOBSTERS_HOTTEST_URL]: [
      {
        short_id: "abc123",
        short_id_url: "https://lobste.rs/s/abc123",
        created_at: "2024-01-01T00:00:00Z",
        title: "Lobsters story",
        url: "https://lobste.rs/s/abc123",
        score: 25,
        comment_count: 8,
        submitter_user: "lobsterfan"
      }
    ],
    [BIORXIV_LATEST_URL]: {
      collection: [
        {
          doi: "10.1101/2024.01.01.123456",
          title: "A bioRxiv preprint",
          authors: "Alice Researcher; Bob Scientist",
          date: "2024-01-01",
          category: "bioinformatics",
          abstract: "Important biology findings."
        }
      ]
    },
    "https://example.com/custom-feed.xml": CUSTOM_RSS
  });
}

describe("resolveRequestedSources", () => {
  it("defaults to Hacker News when no sources are provided", () => {
    expect(resolveRequestedSources()).toEqual(["hn"]);
    expect(resolveRequestedSources([])).toEqual(["hn"]);
  });
});

describe("parseRssXml", () => {
  it("parses RSS item fields", () => {
    const items = parseRssXml(TECHCRUNCH_RSS);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Cloud startup raises funding",
      url: "https://techcrunch.com/cloud-startup",
      author: "Jane Doe"
    });
  });
});

describe("fetchNews", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to Hacker News when no source is specified", async () => {
    installNewsFetchMock();

    const result = await fetchNews({ limit: 2 });

    expect(result.sources).toEqual(["hn"]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      source: "hn",
      title: "HN top story",
      score: 100
    });
  });

  it("selects one or more sources through fetch_news options", async () => {
    installNewsFetchMock();

    const result = await fetchNews({ sources: ["hn", "lobsters"], limit: 1 });

    expect(result.sources).toEqual(["hn", "lobsters"]);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item: { source: string }) => item.source)).toEqual(["hn", "lobsters"]);
  });

  it("fetches TechCrunch, Lobsters, bioRxiv, and custom RSS feeds", async () => {
    installNewsFetchMock();

    const result = await fetchNews({
      sources: ["techcrunch", "lobsters", "biorxiv"],
      rssUrls: ["https://example.com/custom-feed.xml"],
      limit: 1
    });

    expect(result.sources).toEqual(["techcrunch", "lobsters", "biorxiv", "rss:https://example.com/custom-feed.xml"]);
    expect(result.items).toMatchObject([
      { source: "techcrunch", title: "Cloud startup raises funding" },
      { source: "lobsters", title: "Lobsters story", score: 25 },
      { source: "biorxiv", title: "A bioRxiv preprint", summary: "Important biology findings." },
      { source: "rss:https://example.com/custom-feed.xml", title: "Custom feed headline" }
    ]);
  });

  it("applies query and domain filters across feeds", async () => {
    installNewsFetchMock();

    const result = await fetchNews({
      sources: ["hn"],
      limit: 5,
      query: "github",
      domain: "github.com"
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: "1002", url: "https://github.com/example/repo" });
  });
});

describe("withCache", () => {
  it("returns cached data on subsequent reads and tracks cache hits", async () => {
    const kv = createMemoryKv();
    const fetcher = vi.fn(async () => ({ value: "fresh" }));

    const first = await withCache(kv, "news:test", fetcher);
    const second = await withCache(kv, "news:test", fetcher);

    expect(first).toEqual({ data: { value: "fresh" }, cached: false });
    expect(second).toEqual({ data: { value: "fresh" }, cached: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses KV when fetchNews is called twice for the same source", async () => {
    installNewsFetchMock();
    const kv = createMemoryKv();
    const fetchMock = vi.mocked(globalThis.fetch);

    const first = await fetchNews({ sources: ["lobsters"], limit: 1 }, kv);
    const second = await fetchNews({ sources: ["lobsters"], limit: 1 }, kv);

    expect(first.cacheHits).toEqual([]);
    expect(second.cacheHits).toEqual(["lobsters"]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === LOBSTERS_HOTTEST_URL)).toHaveLength(1);
  });
});

describe("listAvailableSources", () => {
  it("includes all built-in and custom RSS sources", () => {
    const sources = listAvailableSources();

    expect(sources.map((source: { id: string }) => source.id)).toEqual(["hn", "techcrunch", "lobsters", "biorxiv", "rss"]);
  });
});

describe("GET /sources", () => {
  it("returns available news sources", async () => {
    const response = await handleSourcesRequest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sources: expect.arrayContaining([
        expect.objectContaining({ id: "hn", name: "Hacker News" }),
        expect.objectContaining({ id: "lobsters", name: "Lobsters" })
      ])
    });
  });
});

describe("GET /news", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("combines multiple requested feeds in one response", async () => {
    installNewsFetchMock();

    const response = await handleNewsRequest(
      new Request("https://example.com/news?sources=hn,lobsters&limit=1"),
      {}
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sources: ["hn", "lobsters"],
      count: 2,
      items: expect.arrayContaining([
        expect.objectContaining({ source: "hn" }),
        expect.objectContaining({ source: "lobsters" })
      ])
    });
  });
});
