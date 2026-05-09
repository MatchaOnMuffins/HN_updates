import { HN_SEARCH_API_BASE } from "./constants.js";
import { createAbortSignal, fetchJson } from "./http.js";
import type { SearchSort, SearchType } from "./schemas.js";
import type { AlgoliaHit, AlgoliaSearchResponse, HackerNewsSearchResult, SearchResultPage } from "./types.js";
import { cleanHtmlText, matchesDomain, storyUrl, toIsoTime } from "./utils.js";

function algoliaHitToResult(hit: AlgoliaHit): HackerNewsSearchResult {
  const id = Number(hit.story_id ?? hit.objectID);
  const title = hit.title ?? hit.story_title ?? `HN item ${id}`;
  const url = hit.url ?? hit.story_url ?? storyUrl(id);

  return {
    id,
    objectId: hit.objectID,
    title: cleanHtmlText(title),
    url,
    hackerNewsUrl: storyUrl(id),
    author: hit.author ?? null,
    points: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
    createdAt: hit.created_at ?? (hit.created_at_i ? toIsoTime(hit.created_at_i) : null),
    tags: hit._tags ?? [],
    text: cleanHtmlText(hit.comment_text ?? hit.story_text)
  };
}

export async function searchHackerNews({
  query,
  sort,
  type,
  author,
  domain,
  limit,
  page
}: {
  query: string;
  sort: SearchSort;
  type: SearchType;
  author?: string;
  domain?: string;
  limit: number;
  page: number;
}): Promise<SearchResultPage> {
  const { signal, cleanup } = createAbortSignal();

  try {
    const params = new URLSearchParams({
      query,
      hitsPerPage: String(limit),
      page: String(page)
    });
    const tags = [type === "all" ? null : type, author ? `author_${author}` : null].filter(
      (tag): tag is string => tag !== null
    );

    if (tags.length > 0) {
      params.set("tags", tags.join(","));
    }

    const endpoint = sort === "date" ? "search_by_date" : "search";
    const response = await fetchJson<AlgoliaSearchResponse>(`${HN_SEARCH_API_BASE}/${endpoint}?${params}`, signal);
    const results = response.hits.map(algoliaHitToResult).filter((result) => matchesDomain(result, domain));

    return {
      query: response.query,
      page: response.page,
      nbPages: response.nbPages,
      nbHits: response.nbHits,
      count: results.length,
      results
    };
  } finally {
    cleanup();
  }
}
