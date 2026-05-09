import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerHackerNewsTools } from "./mcpTools.js";

type Env = Record<string, never>;

const TOOL_NAMES = [
  "get_hackernews_stories",
  "get_hackernews_item",
  "get_hackernews_comments",
  "search_hackernews",
  "get_hackernews_top_50"
];

function createServer(): McpServer {
  const server = new McpServer({
    name: "hn-updates",
    version: "1.1.0"
  });

  registerHackerNewsTools(server);

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        name: "hn-updates",
        mcp: "/mcp",
        tools: TOOL_NAMES
      });
    }

    const server = createServer();
    return createMcpHandler(server, { route: "/mcp" })(request, env, ctx);
  }
} satisfies ExportedHandler<Env>;
