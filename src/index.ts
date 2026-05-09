import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 15_000;

type Env = Record<string, never>;

type HackerNewsItem = {
  id: number;
  deleted?: boolean;
  type?: string;
  by?: string;
  time?: number;
  dead?: boolean;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  descendants?: number;
};

export type HackerNewsStory = {
  rank: number;
  id: number;
  title: string;
  url: string;
  hackerNewsUrl: string;
  author: string | null;
  score: number;
  comments: number;
  postedAt: string | null;
};

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`HN API request failed with ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function toStory(item: HackerNewsItem, rank: number): HackerNewsStory | null {
  if (item.deleted || item.dead || item.type !== "story" || !item.title) {
    return null;
  }

  const hackerNewsUrl = `https://news.ycombinator.com/item?id=${item.id}`;

  return {
    rank,
    id: item.id,
    title: item.title,
    url: item.url ?? hackerNewsUrl,
    hackerNewsUrl,
    author: item.by ?? null,
    score: item.score ?? 0,
    comments: item.descendants ?? 0,
    postedAt: item.time ? new Date(item.time * 1000).toISOString() : null
  };
}

export async function fetchTopHackerNewsStories(limit = DEFAULT_LIMIT): Promise<HackerNewsStory[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const ids = await fetchJson<number[]>(`${HN_API_BASE}/topstories.json`, controller.signal);
    const rankedIds = ids.slice(0, limit).map((id, index) => ({ id, rank: index + 1 }));

    const items = await Promise.all(
      rankedIds.map(async ({ id, rank }) => {
        const item = await fetchJson<HackerNewsItem>(`${HN_API_BASE}/item/${id}.json`, controller.signal);
        return toStory(item, rank);
      })
    );

    return items.filter((item): item is HackerNewsStory => item !== null);
  } finally {
    clearTimeout(timeout);
  }
}

function formatStories(stories: HackerNewsStory[]): string {
  return stories
    .map((story) => {
      const meta = `${story.score} points, ${story.comments} comments`;
      return `${story.rank}. ${story.title}\n   ${story.url}\n   HN: ${story.hackerNewsUrl}\n   ${meta}`;
    })
    .join("\n\n");
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "hn-updates",
    version: "1.0.0"
  });

  server.tool(
    "get_hackernews_top_50",
    "Fetch the current top Hacker News stories, up to the top 50 ranked items.",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_LIMIT)
        .default(DEFAULT_LIMIT)
        .describe("Number of top Hacker News stories to fetch. Defaults to 50; maximum is 50.")
    },
    async ({ limit }) => {
      try {
        const stories = await fetchTopHackerNewsStories(limit);

        return {
          content: [
            {
              type: "text" as const,
              text: formatStories(stories)
            }
          ],
          structuredContent: {
            source: "hacker-news-topstories",
            fetchedAt: new Date().toISOString(),
            count: stories.length,
            stories
          }
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to fetch Hacker News stories: ${message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        name: "hn-updates",
        mcp: "/mcp",
        tool: "get_hackernews_top_50"
      });
    }

    const server = createServer();
    return createMcpHandler(server, { route: "/mcp" })(request, env, ctx);
  }
} satisfies ExportedHandler<Env>;
