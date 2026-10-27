import { describe, expect, it } from "vitest";
import type { PageObjectResponse } from "@notionhq/client";
import { renderFrontmatter } from "../src/lib/noblog/frontmatter.js";
import { page, text } from "./fixtures.js";

const intendedProperties: PageObjectResponse["properties"] = {
  tags: {
    id: "tags",
    type: "multi_select",
    multi_select: [
      { id: "blog", name: "blog", color: "default" },
      { id: "typescript", name: "typescript", color: "default" },
    ],
  },
  date: {
    id: "date",
    type: "date",
    date: { start: "2024-01-24", end: null, time_zone: null },
  },
};

const unrelatedProperties: PageObjectResponse["properties"] = {
  categories: {
    id: "categories",
    type: "multi_select",
    multi_select: [
      { id: "not-a-tag", name: "not-a-tag", color: "default" },
    ],
  },
  updated: {
    id: "updated",
    type: "date",
    date: { start: "2030-12-31", end: null, time_zone: null },
  },
};

describe("frontmatter properties", () => {
  it.each([
    { order: "intended properties first", intendedFirst: true },
    { order: "unrelated properties first", intendedFirst: false },
  ])("selects named properties with $order", ({ intendedFirst }) => {
    const orderedProperties = intendedFirst
      ? { ...intendedProperties, ...unrelatedProperties }
      : { ...unrelatedProperties, ...intendedProperties };
    const rendered = renderFrontmatter(
      page("page", {
        Name: { id: "title", type: "title", title: [text("Post")] },
        ...orderedProperties,
      }),
    );

    expect(rendered).toContain('tags: ["blog","typescript"]');
    expect(rendered).toContain('pubDate: "2024-01-24"');
    expect(rendered).not.toContain("not-a-tag");
    expect(rendered).not.toContain("2030-12-31");
  });

  it("uses the configured store-relative layout for every page", () => {
    const layoutPath = "../../src/layouts/MarkdownPostLayout.astro";
    const rendered = renderFrontmatter(page("nested"), { layoutPath });

    expect(rendered).toContain(`layout: ${layoutPath}\n`);
  });
});
