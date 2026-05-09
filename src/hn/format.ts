import type { HackerNewsComment, HackerNewsItem, HackerNewsSearchResult, HackerNewsStory } from "./types.js";
import { cleanHtmlText, storyUrl, toIsoTime } from "./utils.js";

export function formatStories(stories: HackerNewsStory[]): string {
  if (stories.length === 0) {
    return "No Hacker News stories matched the request.";
  }

  return stories
    .map((story) => {
      const meta = `${story.score} points, ${story.comments} comments, ${story.type}`;
      return `${story.rank}. ${story.title}\n   ${story.url}\n   HN: ${story.hackerNewsUrl}\n   ${meta}`;
    })
    .join("\n\n");
}

export function formatItem(item: HackerNewsItem, comments: HackerNewsComment[]): string {
  const heading = item.title ? cleanHtmlText(item.title) : `HN item ${item.id}`;
  const lines = [
    `${heading}`,
    `HN: ${storyUrl(item.id)}`,
    item.url ? `URL: ${item.url}` : null,
    `Type: ${item.type ?? "unknown"}`,
    item.by ? `Author: ${item.by}` : null,
    item.score !== undefined ? `Score: ${item.score}` : null,
    item.descendants !== undefined ? `Comments: ${item.descendants}` : null,
    item.time ? `Posted: ${toIsoTime(item.time)}` : null,
    item.text ? `\n${cleanHtmlText(item.text)}` : null
  ].filter((line): line is string => line !== null);

  if (comments.length > 0) {
    lines.push("\nComments:");
    lines.push(formatComments(comments));
  }

  return lines.join("\n");
}

export function formatComments(comments: HackerNewsComment[]): string {
  if (comments.length === 0) {
    return "No comments found.";
  }

  const lines: string[] = [];

  function visit(comment: HackerNewsComment): void {
    const indent = "  ".repeat(comment.depth);
    const author = comment.author ?? "unknown";
    lines.push(`${indent}- ${author}: ${comment.text}`);
    comment.children.forEach(visit);
  }

  comments.forEach(visit);
  return lines.join("\n");
}

export function formatSearchResults(results: HackerNewsSearchResult[]): string {
  if (results.length === 0) {
    return "No Hacker News search results matched the request.";
  }

  return results
    .map((result, index) => {
      const meta = `${result.points} points, ${result.comments} comments`;
      const text = result.text ? `\n   ${result.text.slice(0, 400)}` : "";
      return `${index + 1}. ${result.title}\n   ${result.url}\n   HN: ${result.hackerNewsUrl}\n   ${meta}${text}`;
    })
    .join("\n\n");
}
