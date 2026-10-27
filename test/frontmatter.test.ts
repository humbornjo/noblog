import { describe, expect, it } from "vitest";
import { renderFrontmatter } from "../src/lib/noblog/frontmatter.js";
import { page, text } from "./fixtures.js";

const intendedProperties = {
  tags: {
    type: "multi_select",
    multi_select: [{ name: "blog" }, { name: "typescript" }],
  },
  date: { type: "date", date: { start: "2024-01-24" } },
};

const unrelatedProperties = {
  categories: {
    type: "multi_select",
    multi_select: [{ name: "not-a-tag" }],
  },
  updated: { type: "date", date: { start: "2030-12-31" } },
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
        Name: { type: "title", title: [text("Post")] },
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
