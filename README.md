# HN Updates MCP

Cloudflare Worker MCP server that exposes a read-only tool for fetching the current top Hacker News stories.

## Tool

`get_hackernews_top_50`

Fetches the current top Hacker News stories from the public Hacker News Firebase API.

Input:

```json
{
  "limit": 50
}
```

`limit` is optional, defaults to `50`, and cannot exceed `50`.

## Setup

```bash
npm install
```

## Local Dev

```bash
npm run dev
```

The MCP endpoint is:

```text
http://localhost:8787/mcp
```

## Deploy

```bash
npm run deploy
```

After deployment, point your MCP client at:

```text
https://news.matchaonmuffins.dev/mcp
```

For a local MCP client config that supports remote Streamable HTTP servers:

```json
{
  "mcpServers": {
    "hn-updates": {
      "url": "https://news.matchaonmuffins.dev/mcp"
    }
  }
}
```

This project uses a stateless Cloudflare Worker via `createMcpHandler`, so it does not need Docker, Durable Objects, or a long-running Node process.
