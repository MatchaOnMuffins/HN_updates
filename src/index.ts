import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerHackerNewsTools, registerNewsTools } from "./mcpTools.js";
import { handleNewsRequest, handleRootRequest, handleSourcesRequest } from "./routes.js";

type Env = Record<string, never>;

function createServer(): McpServer {
  const server = new McpServer({
    name: "news-updates",
    version: "2.0.0"
  });

  registerNewsTools(server);
  registerHackerNewsTools(server);

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return handleRootRequest();
    }

    if (url.pathname === "/sources" && request.method === "GET") {
      return handleSourcesRequest();
    }

    if (url.pathname === "/news" && request.method === "GET") {
      return handleNewsRequest(request);
    }

    const server = createServer();
    return createMcpHandler(server, { route: "/mcp" })(request, env, ctx);
  }
} satisfies ExportedHandler<Env>;
