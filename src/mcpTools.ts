import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { Env } from "./env.js";
import {
  fetchNews,
  fetchNewsInputSchema,
  formatFeedSections
} from "./feeds.js";
import {
  DEFAULT_LIMIT,
  MAX_COMMENT_DEPTH,
  MAX_COMMENT_LIMIT,
  MAX_STORY_LIMIT,
  cleanHtmlText,
  countComments,
  feedSchema,
  fetchHackerNewsComments,
  fetchHackerNewsItem,
  fetchHackerNewsStories,
  formatComments,
  formatItem,
  formatSearchResults,
  formatStories,
  searchHackerNews,
  searchSortSchema,
  searchTypeSchema,
  storyUrl
} from "./hn.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: true;
};

function textResult(text: string, structuredContent: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent: {
      fetchedAt: new Date().toISOString(),
      ...structuredContent
    }
  };
}

async function safeTool(handler: () => Promise<ToolResult>, label = "Hacker News request"): Promise<ToolResult> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      content: [{ type: "text", text: `${label} failed: ${message}` }],
      isError: true
    };
  }
}

export function registerNewsTools(server: McpServer, env: Env): void {
  server.tool(
    "fetch_news",
    "Fetch and combine news from Hacker News, TechCrunch, Lobsters, bioRxiv, and custom RSS feeds.",
    {
      sources: fetchNewsInputSchema.shape.sources,
      rss_urls: fetchNewsInputSchema.shape.rss_urls,
      limit: fetchNewsInputSchema.shape.limit,
      offset: fetchNewsInputSchema.shape.offset,
      query: fetchNewsInputSchema.shape.query,
      domain: fetchNewsInputSchema.shape.domain
    },
    ({ sources, rss_urls, limit, offset, query, domain }) =>
      safeTool(async () => {
        const result = await fetchNews(
          {
            sources,
            rssUrls: rss_urls,
            limit,
            offset,
            query,
            domain
          },
          env.NEWS_CACHE
        );

        return textResult(formatFeedSections(result.items, result.sources), {
          source: "multi-source-news",
          ...result
        });
      }, "News request")
  );
}

export function registerHackerNewsTools(server: McpServer): void {
  server.tool(
    "get_hackernews_stories",
    "Fetch a paginated Hacker News feed: top, new, best, ask, show, or job.",
    {
      feed: feedSchema.default("top").describe("Which Hacker News feed to fetch."),
      limit: z.number().int().min(1).max(MAX_STORY_LIMIT).default(DEFAULT_LIMIT),
      offset: z.number().int().min(0).default(0).describe("Zero-based offset into the selected feed."),
      query: z.string().min(1).optional().describe("Optional local filter matched against title, URL, and author."),
      domain: z.string().min(1).optional().describe("Optional local URL hostname filter, such as github.com.")
    },
    ({ feed, limit, offset, query, domain }) =>
      safeTool(async () => {
        const result = await fetchHackerNewsStories({ feed, limit, offset, query, domain });

        return textResult(formatStories(result.stories), {
          source: "hacker-news-firebase",
          feed,
          offset,
          limit,
          available: result.available,
          count: result.stories.length,
          stories: result.stories
        });
      })
  );

  server.tool(
    "get_hackernews_item",
    "Fetch a Hacker News item by ID, optionally including a bounded comment tree.",
    {
      id: z.number().int().positive().describe("HN item ID."),
      includeComments: z.boolean().default(false),
      commentLimit: z.number().int().min(0).max(MAX_COMMENT_LIMIT).default(20),
      commentDepth: z.number().int().min(1).max(MAX_COMMENT_DEPTH).default(2)
    },
    ({ id, includeComments, commentLimit, commentDepth }) =>
      safeTool(async () => {
        if (!includeComments || commentLimit === 0) {
          const item = await fetchHackerNewsItem(id);

          return textResult(formatItem(item, []), {
            source: "hacker-news-firebase",
            item
          });
        }

        const { item, comments } = await fetchHackerNewsComments({ id, limit: commentLimit, maxDepth: commentDepth });

        return textResult(formatItem(item, comments), {
          source: "hacker-news-firebase",
          item,
          comments
        });
      })
  );

  server.tool(
    "get_hackernews_comments",
    "Fetch a bounded comment tree for a Hacker News story or item.",
    {
      id: z.number().int().positive().describe("HN story or item ID."),
      limit: z.number().int().min(1).max(MAX_COMMENT_LIMIT).default(50),
      depth: z.number().int().min(1).max(MAX_COMMENT_DEPTH).default(2)
    },
    ({ id, limit, depth }) =>
      safeTool(async () => {
        const { item, comments } = await fetchHackerNewsComments({ id, limit, maxDepth: depth });

        return textResult(formatComments(comments), {
          source: "hacker-news-firebase",
          item: {
            id: item.id,
            title: item.title ? cleanHtmlText(item.title) : null,
            hackerNewsUrl: storyUrl(item.id),
            comments: item.descendants ?? 0
          },
          count: countComments(comments),
          comments
        });
      })
  );

  server.tool(
    "search_hackernews",
    "Search Hacker News via Algolia, with pagination and optional type, author, and domain filters.",
    {
      query: z.string().default("").describe("Search query. Leave empty when using tag or author filters."),
      sort: searchSortSchema.default("relevance"),
      type: searchTypeSchema.default("story"),
      author: z.string().min(1).optional().describe("Optional HN username filter."),
      domain: z.string().min(1).optional().describe("Optional post-result URL hostname filter."),
      limit: z.number().int().min(1).max(MAX_STORY_LIMIT).default(20),
      page: z.number().int().min(0).default(0)
    },
    ({ query, sort, type, author, domain, limit, page }) =>
      safeTool(async () => {
        const result = await searchHackerNews({ query, sort, type, author, domain, limit, page });

        return textResult(formatSearchResults(result.results), {
          source: "hacker-news-algolia",
          ...result
        });
      })
  );

  server.tool(
    "get_hackernews_top_50",
    "Fetch the current top Hacker News stories. Backwards-compatible alias for get_hackernews_stories.",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_STORY_LIMIT)
        .default(DEFAULT_LIMIT)
        .describe("Number of top Hacker News stories to fetch. Defaults to 50; maximum is 50.")
    },
    ({ limit }) =>
      safeTool(async () => {
        const result = await fetchHackerNewsStories({ feed: "top", limit, offset: 0 });

        return textResult(formatStories(result.stories), {
          source: "hacker-news-firebase",
          feed: "top",
          offset: 0,
          limit,
          available: result.available,
          count: result.stories.length,
          stories: result.stories
        });
      })
  );
}
