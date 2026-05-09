import { z } from "zod";

export const feedSchema = z.enum(["top", "new", "best", "ask", "show", "job"]);
export const searchSortSchema = z.enum(["relevance", "date"]);
export const searchTypeSchema = z.enum(["all", "story", "comment", "poll", "show_hn", "ask_hn", "front_page"]);

export type HnFeed = z.infer<typeof feedSchema>;
export type SearchSort = z.infer<typeof searchSortSchema>;
export type SearchType = z.infer<typeof searchTypeSchema>;

export const FEED_ENDPOINTS: Record<HnFeed, string> = {
  top: "topstories",
  new: "newstories",
  best: "beststories",
  ask: "askstories",
  show: "showstories",
  job: "jobstories"
};
