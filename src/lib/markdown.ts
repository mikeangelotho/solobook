import { marked } from "marked";
import DOMPurify from "dompurify";

export interface ChapterHeading {
  level: number;
  text: string;
  id: string;
}

export interface ParsedChapter {
  id: string;
  title: string;
  rawMarkdown: string;
  html: string;
  headings: ChapterHeading[];
  links: { text: string; url: string }[];
  wordCount: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractTitle(markdown: string, filename: string): string {
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return filename.replace(/\.md$/i, "").replace(/[-_]/g, " ");
}

function extractHeadings(markdown: string): ChapterHeading[] {
  const headings: ChapterHeading[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const text = match[2].trim();
      headings.push({
        level: match[1].length,
        text,
        id: slugify(text),
      });
    }
  }
  return headings;
}

function extractLinks(markdown: string): { text: string; url: string }[] {
  const links: { text: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }
  return links;
}

export function parseMarkdownFile(
  raw: string,
  filename: string,
  index: number
): ParsedChapter {
  const title = extractTitle(raw, filename);
  const headings = extractHeadings(raw);
  const links = extractLinks(raw);
  const wordCount = raw.split(/\s+/).filter(Boolean).length;

  const html = DOMPurify.sanitize(
    marked.parse(raw, { async: false }) as string,
    { ADD_ATTR: ["id", "target", "rel"] }
  );

  return {
    id: `chapter-${index}`,
    title,
    rawMarkdown: raw,
    html,
    headings,
    links,
    wordCount,
  };
}
