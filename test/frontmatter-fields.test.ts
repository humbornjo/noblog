import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import type { PageObjectResponse } from "@notionhq/client";
import type { FrontmatterFields } from "../src/lib/noblog/config.js";
import { createFrontmatterAdapter } from "../src/lib/noblog/frontmatter-fields.js";
import { renderFrontmatter } from "../src/lib/noblog/frontmatter.js";
import { page, text } from "./fixtures.js";

function properties(): PageObjectResponse["properties"] {
  return {
    Name: { id: "title", type: "title", title: [text("Post")] },
    description: { id: "description", type: "rich_text", rich_text: [] },
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
    archived: { id: "archived", type: "checkbox", checkbox: false },
    Series: {
      id: "series",
      type: "rich_text",
      rich_text: [text("Notes")],
    },
    Sensitive: { id: "sensitive", type: "checkbox", checkbox: true },
    Priority: { id: "priority", type: "number", number: 0 },
  };
}

function parseFrontmatter(rendered: string): unknown {
  return parse(rendered.slice(4, -4));
}

describe("declarative frontmatter", () => {
  it("maps a theme schema with native values and a YAML date", () => {
    const fields: FrontmatterFields = {
      title: { from: "title", required: true },
      timestamp: { from: "publishedAt", as: "date" },
      series: { from: "series", omitEmpty: true },
      tags: { from: "tags" },
      description: { from: "description", omitEmpty: true },
      sensitive: { from: "sensitive", default: false },
      toc: { value: true },
      top: { from: "top", default: 0 },
      draft: { from: "archived", default: false },
    };
    const rendered = renderFrontmatter(page("page-1", properties()), {
      propertyMap: {
        series: "Series",
        sensitive: "Sensitive",
        top: "Priority",
      },
      frontmatter: createFrontmatterAdapter(fields),
    });
    const values = parseFrontmatter(rendered);

    expect(values).toEqual({
      title: "Post",
      timestamp: "2024-01-24",
      series: "Notes",
      tags: ["blog", "typescript"],
      sensitive: true,
      toc: true,
      top: 0,
      draft: false,
    });
    expect(rendered).toContain("timestamp: 2024-01-24");
    expect(rendered).toContain("sensitive: true");
    expect(rendered).toContain("top: 0");
    expect(rendered).not.toContain("description:");
    expect(rendered).not.toContain("layout:");
  });

  it("keeps date strings as strings when requested", () => {
    const rendered = renderFrontmatter(page("page", properties()), {
      frontmatter: createFrontmatterAdapter({
        pubDate: { from: "publishedAt", as: "string" },
        archived: { from: "archived", as: "string" },
      }),
    });

    expect(parseFrontmatter(rendered)).toEqual({
      pubDate: "2024-01-24",
      archived: "false",
    });
    expect(rendered).toContain('pubDate: "2024-01-24"');
    expect(rendered).toContain('archived: "false"');
  });

  it("uses defaults without treating false or zero as empty", () => {
    const rendered = renderFrontmatter(page("page", properties()), {
      propertyMap: { sensitive: "Missing", top: "Priority" },
      frontmatter: createFrontmatterAdapter({
        sensitive: { from: "sensitive", default: false },
        top: { from: "top", default: 10 },
        tags: { from: "tags", default: ["default"] },
        description: { from: "description", default: "Fallback" },
      }),
    });

    expect(parseFrontmatter(rendered)).toEqual({
      sensitive: false,
      top: 0,
      tags: ["blog", "typescript"],
      description: "Fallback",
    });
  });

  it("reports required fields and invalid dates with page context", () => {
    expect(() =>
      renderFrontmatter(page("required-page", properties()), {
        propertyMap: { series: "Missing" },
        frontmatter: createFrontmatterAdapter({
          series: { from: "series", required: true },
        }),
      }),
    ).toThrow('Missing required frontmatter field "series" for page "required-page"');

    expect(() =>
      renderFrontmatter(
        page("date-page", {
          Name: { id: "title", type: "title", title: [text("Post")] },
          date: {
            id: "date",
            type: "date",
            date: { start: "not-a-date", end: null, time_zone: null },
          },
        }),
        {
          frontmatter: createFrontmatterAdapter({
            timestamp: { from: "publishedAt", as: "date" },
          }),
        },
      ),
    ).toThrow('Cannot convert frontmatter field "timestamp" for page "date-page"');
  });

  it("supports programmatic adapters and rejects non-object roots", () => {
    const rendered = renderFrontmatter(page("page", properties()), {
      frontmatter: ({ page, metadata }) => ({
        title: metadata.title,
        notionId: page.id,
        omitted: undefined,
      }),
    });

    expect(parseFrontmatter(rendered)).toEqual({
      title: "Post",
      notionId: "page",
    });
    expect(() =>
      renderFrontmatter(page("page", properties()), {
        // @ts-expect-error Intentionally violate FrontmatterRecord to test the runtime root guard.
        frontmatter: () => [],
      }),
    ).toThrow("Frontmatter adapter must return a plain object");
  });
});
