# HN Updates MCP

Cloudflare Worker MCP server that exposes read-only Hacker News tools for feeds, item details, comments, and search.

## Tools

### `get_hackernews_stories`

Fetches a paginated Hacker News feed from the public Hacker News Firebase API.

Input:

```json
{
  "feed": "top",
  "limit": 50,
  "offset": 0,
  "query": "cloudflare",
  "domain": "github.com"
}
```

`feed` can be `top`, `new`, `best`, `ask`, `show`, or `job`. `limit` defaults to `50` and cannot exceed `50`.

### `get_hackernews_item`

Fetches one HN item by ID, optionally including a bounded comment tree.

```json
{
  "id": 48071262,
  "includeComments": true,
  "commentLimit": 20,
  "commentDepth": 2
}
```

### `get_hackernews_comments`

Fetches a bounded comment tree for a story or item.

```json
{
  "id": 48071262,
  "limit": 50,
  "depth": 2
}
```

### `search_hackernews`

Searches Hacker News through Algolia with pagination and optional filters.

```json
{
  "query": "cloudflare workers",
  "sort": "relevance",
  "type": "story",
  "author": "pg",
  "domain": "github.com",
  "limit": 20,
  "page": 0
}
```

`sort` can be `relevance` or `date`. `type` can be `all`, `story`, `comment`, `poll`, `show_hn`, `ask_hn`, or `front_page`.

### `get_hackernews_top_50`

Backwards-compatible alias for the original top-story tool. Prefer `get_hackernews_stories` for new clients.

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
