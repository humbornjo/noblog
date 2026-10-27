import type { PageObjectResponse } from "@notionhq/client";
import { DEFAULT_LAYOUT_PATH } from "./defaults.js";

export interface FrontmatterOptions {
  readonly layoutPath?: string;
  readonly nestedLayoutPath?: string;
  readonly isDatabasePage?: boolean;
}

export function renderFrontmatter(
  page: PageObjectResponse,
  options: FrontmatterOptions = {},
): string {
  const {
    layoutPath = DEFAULT_LAYOUT_PATH,
    nestedLayoutPath,
    isDatabasePage = true,
  } = options;
  const resolvedLayoutPath = isDatabasePage
    ? layoutPath
    : (nestedLayoutPath ?? `../${layoutPath}`);

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
    `layout: ${resolvedLayoutPath}\n` +
    `title: ${JSON.stringify(title)}\n` +
    `description: ${JSON.stringify(description)}\n` +
    `tags: ${JSON.stringify(tags)}\n` +
    `pubDate: ${JSON.stringify(pubDate)}\n` +
    `archived: ${JSON.stringify(archived)}\n` +
    "---\n"
  );
}
