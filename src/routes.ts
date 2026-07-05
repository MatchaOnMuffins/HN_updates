import { fetchNews, fetchNewsInputSchema, listAvailableSources } from "./feeds.js";
import type { Env } from "./env.js";

function parseSourcesParam(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const sources = value
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);

  return sources.length > 0 ? sources : undefined;
}

function parseRssUrlsParam(searchParams: URLSearchParams): string[] | undefined {
  const values = searchParams.getAll("rss_url").concat(searchParams.getAll("rss_urls"));

  if (values.length === 0) {
    const csv = searchParams.get("rss_urls");
    if (csv) {
      values.push(...csv.split(","));
    }
  }

  const urls = values.map((value) => value.trim()).filter(Boolean);
  return urls.length > 0 ? urls : undefined;
}

export async function handleSourcesRequest(): Promise<Response> {
  return Response.json({
    sources: listAvailableSources()
  });
}

export async function handleNewsRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  try {
    const parsed = fetchNewsInputSchema.parse({
      sources: parseSourcesParam(url.searchParams.get("sources")),
      rss_urls: parseRssUrlsParam(url.searchParams),
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined,
      query: url.searchParams.get("query") ?? undefined,
      domain: url.searchParams.get("domain") ?? undefined
    });

    const result = await fetchNews(
      {
        sources: parsed.sources,
        rssUrls: parsed.rss_urls,
        limit: parsed.limit,
        offset: parsed.offset,
        query: parsed.query,
        domain: parsed.domain
      },
      env.NEWS_CACHE
    );

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function handleRootRequest(): Promise<Response> {
  return Response.json({
    name: "news-updates",
    mcp: "/mcp",
    sources: "/sources",
    news: "/news",
    tools: [
      "fetch_news",
      "get_hackernews_stories",
      "get_hackernews_item",
      "get_hackernews_comments",
      "search_hackernews",
      "get_hackernews_top_50"
    ]
  });
}
