import type { PageObjectResponse } from "@notionhq/client";
import { stringify } from "yaml";
import type { NotionPropertyMap } from "./config.js";
import { DEFAULT_LAYOUT_PATH } from "./defaults.js";
import { extractPageMetadata } from "./metadata.js";
import type { FrontmatterAdapter } from "./types.js";

export interface FrontmatterOptions {
  readonly layoutPath?: string;
  readonly propertyMap?: NotionPropertyMap;
  readonly frontmatter?: FrontmatterAdapter;
  readonly isDatabasePage?: boolean;
}

export function renderFrontmatter(
  page: PageObjectResponse,
  options: FrontmatterOptions = {},
): string {
  const { layoutPath = DEFAULT_LAYOUT_PATH } = options;
  if (options.frontmatter) {
    const metadata = extractPageMetadata(page, options.propertyMap);
    const values = options.frontmatter({
      page,
      metadata,
      layoutPath,
      isDatabasePage: options.isDatabasePage ?? true,
    });
    return serializeFrontmatter(values);
  }

  let title = "";
  let description = "";
  let tags: string[] = [];
  let pubDate = "";
  let archived = "";

  for (const [name, property] of Object.entries(page.properties)) {
    switch (property.type) {
      case "title":
        title = property.title.map((item) => item.plain_text).join("");
        break;
      case "multi_select":
        if (name === "tags") {
          tags = property.multi_select.map((tag) => tag.name);
        }
        break;
      case "date":
        if (name === "date") {
          pubDate =
            property.date?.start ?? new Date().toISOString().slice(0, 10);
        }
        break;
    }

    if (name === "archived" && property.type === "checkbox") {
      archived = property.checkbox ? "true" : "false";
    }
    if (name === "description" && property.type === "rich_text") {
      description = property.rich_text
        .map((item) => item.plain_text)
        .join("");
    }
  }

  return (
    "---\n" +
    `layout: ${layoutPath}\n` +
    `title: ${JSON.stringify(title)}\n` +
    `description: ${JSON.stringify(description)}\n` +
    `tags: ${JSON.stringify(tags)}\n` +
    `pubDate: ${JSON.stringify(pubDate)}\n` +
    `archived: ${JSON.stringify(archived)}\n` +
    "---\n"
  );
}

function serializeFrontmatter(values: Readonly<Record<string, unknown>>): string {
  if (
    values === null ||
    typeof values !== "object" ||
    Array.isArray(values) ||
    (Object.getPrototypeOf(values) !== Object.prototype &&
      Object.getPrototypeOf(values) !== null)
  ) {
    throw new Error("Frontmatter adapter must return a plain object");
  }

  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) return "---\n---\n";

  const yaml = stringify(Object.fromEntries(entries), {
    aliasDuplicateObjects: false,
    schema: "yaml-1.1",
  });
  return `---\n${yaml}---\n`;
}
