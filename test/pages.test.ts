import { describe, expect, it, vi } from "vitest";
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client";
import { renderPage, renderPages } from "../src/lib/noblog/pages.js";
import type { NotionReader } from "../src/lib/noblog/types.js";
import { block, blockBase, page, paragraph, text } from "./fixtures.js";

function properties(title: string): PageObjectResponse["properties"] {
  return {
    Name: { id: "title", type: "title", title: [text(title)] },
    description: {
      id: "description",
      type: "rich_text",
      rich_text: [text(`${title} description`)],
    },
    tags: {
      id: "tags",
      type: "multi_select",
      multi_select: [{ id: "tag", name: "tag", color: "default" }],
    },
    date: {
      id: "date",
      type: "date",
      date: { start: "2024-01-24", end: null, time_zone: null },
    },
    archived: { id: "archived", type: "checkbox", checkbox: false },
  };
}

function readerFor(
  pages: ReadonlyMap<string, PageObjectResponse>,
  blocks: Readonly<Record<string, BlockObjectResponse[]>>,
) {
  const getPage = vi.fn<NotionReader["getPage"]>(async (id) => {
    const result = pages.get(id);
    if (!result) throw new Error(`Missing page fixture: ${id}`);
    return result;
  });
  const getBlockChildren = vi.fn<NotionReader["getBlockChildren"]>(
    async (id) => blocks[id] ?? [],
  );
  const reader: NotionReader = { getPage, getBlockChildren };
  return { reader, getPage, getBlockChildren };
}

function createFixture() {
  const root = page("root", properties("Root"));
  const child = page("child", properties("Child"));
  const pages = new Map([
    [root.id, root],
    [child.id, child],
  ]);
  const blocks = {
    root: [
      paragraph("body", "Root body"),
      block({
        ...blockBase("child"),
        type: "child_page",
        child_page: { title: "Child" },
      }),
    ],
    child: [
      paragraph("nested-body", "Nested body"),
      block({
        ...blockBase("root"),
        type: "child_page",
        child_page: { title: "Root" },
      }),
    ],
  };
  return { root, child, ...readerFor(pages, blocks) };
}

describe("page rendering", () => {
  it("renders nested pages once and handles cyclic page references", async () => {
    const { root, reader, getPage, getBlockChildren } = createFixture();

    const rendered = await renderPages([root], reader, {
      layoutPath: "../Layout.astro",
    });
    const byId = new Map(rendered.map((item) => [item.id, item]));
    const rootPage = byId.get("root");
    const childPage = byId.get("child");

    expect(rendered).toHaveLength(2);
    expect(rootPage?.isDatabasePage).toBe(true);
    expect(rootPage?.childPageIds).toEqual(["child"]);
    expect(rootPage?.content).toContain("layout: ../Layout.astro");
    expect(rootPage?.content).toContain('title: "Root"');
    expect(rootPage?.content).toContain("[Child](./child.md)");
    expect(childPage?.isDatabasePage).toBe(false);
    expect(childPage?.childPageIds).toEqual(["root"]);
    expect(childPage?.content).toContain("layout: ../Layout.astro");
    expect(childPage?.content).toContain("[Root](./root.md)");
    expect(getPage).toHaveBeenCalledTimes(1);
    expect(getPage).toHaveBeenCalledWith("child");
    expect(getBlockChildren).toHaveBeenCalledTimes(2);
  });

  it("can render database pages without recursively collecting children", async () => {
    const { root, reader, getPage, getBlockChildren } = createFixture();

    const rendered = await renderPages([root], reader, { recursive: false });

    expect(rendered).toHaveLength(1);
    expect(rendered[0]?.id).toBe("root");
    expect(getPage).not.toHaveBeenCalled();
    expect(getBlockChildren).toHaveBeenCalledTimes(1);
    expect(getBlockChildren).toHaveBeenCalledWith("root");
  });

  it("renders a single fetched page through the public API", async () => {
    const { reader } = createFixture();

    const rendered = await renderPage("root", reader, { recursive: false });

    expect(rendered.id).toBe("root");
    expect(rendered.isDatabasePage).toBe(true);
    expect(rendered.content).toContain("Root body");
  });
});
