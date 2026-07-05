import { vi } from "vitest";

export type MockRouteMap = Record<string, unknown>;

export function installFetchMock(routes: MockRouteMap): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = routes[url];

    if (body === undefined) {
      return new Response(JSON.stringify({ error: `Unhandled URL: ${url}` }), {
        status: 404,
        statusText: "Not Found"
      });
    }

    if (typeof body === "string") {
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" }
      });
    }

    return Response.json(body);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export type MemoryKvStore = Map<string, string>;

export function createMemoryKv(initial: MemoryKvStore = new Map()): KVNamespace {
  const store = new Map(initial);

  return {
    get: vi.fn(async (key: string, type?: "text" | "json" | "arrayBuffer" | "stream") => {
      const value = store.get(key);
      if (value === undefined) {
        return null;
      }

      if (type === "json") {
        return JSON.parse(value);
      }

      return value;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async () => ({ keys: [], list_complete: true, cacheStatus: null })),
    getWithMetadata: vi.fn(async () => ({ value: null, metadata: null, cacheStatus: null }))
  } as unknown as KVNamespace;
}
