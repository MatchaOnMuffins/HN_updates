import { z } from "zod";

export const newsSourceSchema = z.enum(["hn", "techcrunch", "lobsters", "biorxiv", "rss"]);

export const fetchNewsInputSchema = z.object({
  sources: z.array(newsSourceSchema).optional().describe("News sources to fetch. Defaults to Hacker News."),
  rss_urls: z
    .array(z.string().url())
    .optional()
    .describe("Custom RSS/Atom feed URLs to include when fetching from rss sources."),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
  query: z.string().min(1).optional().describe("Optional local filter matched against title, URL, author, and summary."),
  domain: z.string().min(1).optional().describe("Optional URL hostname filter.")
});

export type FetchNewsInput = z.infer<typeof fetchNewsInputSchema>;
