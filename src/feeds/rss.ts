import { createAbortSignal } from "../hn/http.js";
import { cleanHtmlText } from "../hn/utils.js";
import type { NewsItem } from "./types.js";

export type ParsedRssItem = {
  title: string;
  url: string;
  author: string | null;
  postedAt: string | null;
  summary: string | null;
};

function readTag(block: string, tag: string): string | null {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) {
      return cleanHtmlText(match[1].trim());
    }
  }

  return null;
}

function readAtomLink(block: string): string | null {
  const relAlternate = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (relAlternate?.[1]) {
    return relAlternate[1].trim();
  }

  const hrefOnly = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return hrefOnly?.[1]?.trim() ?? null;
}

export function parseRssXml(xml: string): ParsedRssItem[] {
  const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);

  if (blocks.length === 0) {
    return [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((match) => {
      const block = match[0];
      const title = readTag(block, "title") ?? "Untitled";
      const url = readAtomLink(block) ?? readTag(block, "id") ?? "";
      const author =
        readTag(block, "name") ??
        block.match(/<author[\s\S]*?<name>([\s\S]*?)<\/name>/i)?.[1]?.trim() ??
        null;

      return {
        title,
        url,
        author: author ? cleanHtmlText(author) : null,
        postedAt: readTag(block, "updated") ?? readTag(block, "published"),
        summary: readTag(block, "summary") ?? readTag(block, "content")
      };
    });
  }

  return blocks.map((block) => ({
    title: readTag(block, "title") ?? "Untitled",
    url: readTag(block, "link") ?? readTag(block, "guid") ?? "",
    author: readTag(block, "dc:creator") ?? readTag(block, "author"),
    postedAt: readTag(block, "pubDate") ?? readTag(block, "updated"),
    summary: readTag(block, "description") ?? readTag(block, "content:encoded")
  }));
}

export async function fetchRssFeed(url: string, signal?: AbortSignal): Promise<ParsedRssItem[]> {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml"
    }
  });

  if (!response.ok) {
    throw new Error(`RSS feed request failed (${response.status}) for ${url}`);
  }

  const xml = await response.text();
  return parseRssXml(xml);
}

export function rssItemsToNewsItems(source: string, items: ParsedRssItem[], limit: number, offset = 0): NewsItem[] {
  return items.slice(offset, offset + limit).map((item, index) => ({
    id: `${source}:${item.url || item.title}:${offset + index}`,
    source,
    rank: offset + index + 1,
    title: item.title,
    url: item.url,
    author: item.author,
    score: null,
    comments: null,
    postedAt: item.postedAt,
    summary: item.summary
  }));
}
