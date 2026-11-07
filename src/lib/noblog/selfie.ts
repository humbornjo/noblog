import type { PageObjectResponse } from "@notionhq/client";
import type { NotionPropertyMap } from "./config.js";
import { extractPageMetadata } from "./metadata.js";

export interface SelfieMatch {
  readonly page: PageObjectResponse;
  readonly title: string;
}

/**
 * Find the database post whose title exactly matches the requested selfie
 * title. Titles are compared trimmed on both sides.
 */
export function findSelfiePage(
  posts: readonly PageObjectResponse[],
  title: string,
  propertyMap?: NotionPropertyMap,
): SelfieMatch | undefined {
  for (const post of posts) {
    const metadata = extractPageMetadata(post, propertyMap);
    if (metadata.title.trim() === title) {
      return { page: post, title: metadata.title };
    }
  }
  return undefined;
}

/**
 * Return the Markdown document with its frontmatter `author` set to the given
 * value. An existing top-level `author` key is replaced so the result always
 * reflects the provided author; the document body is left untouched.
 */
export function upsertFrontmatterAuthor(
  content: string,
  author: string,
): string {
  const authorLine = `author: ${JSON.stringify(author)}`;
  const lines = content.split("\n");
  if (lines[0] !== "---") {
    return `---\n${authorLine}\n---\n${content}`;
  }

  const closing = lines.indexOf("---", 1);
  if (closing === -1) {
    return `---\n${authorLine}\n---\n${content}`;
  }

  const frontmatterLines = lines
    .slice(1, closing)
    .filter((line) => !/^author\s*:/u.test(line));
  return ["---", authorLine, ...frontmatterLines, ...lines.slice(closing)].join(
    "\n",
  );
}
