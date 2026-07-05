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
