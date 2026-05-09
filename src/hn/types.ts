export type HackerNewsItem = {
  id: number;
  deleted?: boolean;
  type?: "job" | "story" | "comment" | "poll" | "pollopt";
  by?: string;
  time?: number;
  dead?: boolean;
  kids?: number[];
  parent?: number;
  url?: string;
  score?: number;
  title?: string;
  text?: string;
  descendants?: number;
};

export type HackerNewsStory = {
  rank: number;
  id: number;
  type: string;
  title: string;
  url: string;
  hackerNewsUrl: string;
  author: string | null;
  score: number;
  comments: number;
  postedAt: string | null;
};

export type HackerNewsComment = {
  id: number;
  author: string | null;
  parent: number | null;
  postedAt: string | null;
  text: string;
  depth: number;
  children: HackerNewsComment[];
};

export type AlgoliaHit = {
  objectID: string;
  title?: string | null;
  url?: string | null;
  author?: string | null;
  points?: number | null;
  num_comments?: number | null;
  story_id?: number | null;
  story_title?: string | null;
  story_url?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
  created_at?: string | null;
  created_at_i?: number | null;
  _tags?: string[];
};

export type AlgoliaSearchResponse = {
  hits: AlgoliaHit[];
  page: number;
  nbPages: number;
  nbHits: number;
  hitsPerPage: number;
  query: string;
};

export type HackerNewsSearchResult = {
  id: number;
  objectId: string;
  title: string;
  url: string;
  hackerNewsUrl: string;
  author: string | null;
  points: number;
  comments: number;
  createdAt: string | null;
  tags: string[];
  text: string;
};

export type StoryListResult = {
  available: number;
  stories: HackerNewsStory[];
};

export type CommentTreeResult = {
  item: HackerNewsItem;
  comments: HackerNewsComment[];
};

export type SearchResultPage = {
  query: string;
  page: number;
  nbPages: number;
  nbHits: number;
  count: number;
  results: HackerNewsSearchResult[];
};
