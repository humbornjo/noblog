import { describe, expect, it, vi } from "vitest";
import {
  loadBlockTree,
  renderBlockTree,
} from "../src/lib/noblog/blocks.js";
import type {
  BlockRenderContext,
} from "../src/lib/noblog/blocks.js";
import type {
  NoblogBlock,
  NotionReader,
} from "../src/lib/noblog/types.js";
import {
  block,
  blockBase,
  heading4,
  paragraph,
  text,
} from "./fixtures.js";

const context: BlockRenderContext = {
  pageId: "root",
};

function readerFor(
  blocks: Readonly<Record<string, NoblogBlock[]>>,
) {
  const getBlockChildren = vi.fn<NotionReader["getBlockChildren"]>(
    async (id) => blocks[id] ?? [],
  );
  const reader: NotionReader = {
    getPage: vi.fn<NotionReader["getPage"]>(async () => {
      throw new Error("Not used by block rendering");
    }),
    getBlockChildren,
  };
  return { reader, getBlockChildren };
}

describe("block tree rendering", () => {
  it("renders nested content and derives numbered-list positions", async () => {
    const { reader, getBlockChildren } = readerFor({
      root: [
        block({
          ...blockBase("toggle", true),
          type: "toggle",
          toggle: { rich_text: [text("More")], color: "default" },
        }),
        block({
          ...blockBase("first", true),
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [text("one")],
            color: "default",
          },
        }),
        block({
          ...blockBase("second"),
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [text("two")],
            color: "default",
          },
        }),
        paragraph("reset", "reset"),
        block({
          ...blockBase("third"),
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [text("three")],
            color: "default",
          },
        }),
        block({
          ...blockBase("ignored"),
          type: "unsupported",
          unsupported: {},
        }),
      ],
      toggle: [paragraph("inside", "Inside")],
      first: [
        block({
          ...blockBase("subitem"),
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [text("sub")],
            color: "default",
          },
        }),
      ],
    });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, context);

    expect(rendered.content).toContain("<summary>More</summary>");
    expect(rendered.content).toContain("Inside");
    expect(rendered.content).toContain("1. one\n   - sub");
    expect(rendered.content).toContain("2. two");
    expect(rendered.content).toContain("1. three");
    expect(rendered.content).not.toContain("ignored");
    expect(getBlockChildren).toHaveBeenCalledTimes(3);
    expect(getBlockChildren).toHaveBeenCalledWith("toggle");
    expect(getBlockChildren).toHaveBeenCalledWith("first");
  });

  it("fetches callout children once and includes them in the callout", async () => {
    const { reader, getBlockChildren } = readerFor({
      root: [
        block({
          ...blockBase("callout", true),
          type: "callout",
          callout: {
            rich_text: [text("Note")],
            icon: { type: "emoji", emoji: "💡" },
            color: "default",
          },
        }),
      ],
      callout: [paragraph("detail", "Details")],
    });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, context);

    expect(rendered.content).toContain("> 💡 Note");
    expect(rendered.content).toContain("Details");
    expect(getBlockChildren).toHaveBeenCalledTimes(2);
    expect(getBlockChildren).toHaveBeenCalledWith("callout");
  });

  it.each([
    {
      hasColumnHeader: false,
      expected: "|   |   |\n| - | - |\n| a | b |\n| c | d |",
    },
    {
      hasColumnHeader: true,
      expected: "| a | b |\n| - | - |\n| c | d |",
    },
  ])(
    "renders tables with hasColumnHeader=$hasColumnHeader",
    async ({ hasColumnHeader, expected }) => {
      const { reader } = readerFor({
        root: [
          block({
            ...blockBase("table", true),
            type: "table",
            table: {
              table_width: 2,
              has_column_header: hasColumnHeader,
              has_row_header: false,
            },
          }),
        ],
        table: [
          block({
            ...blockBase("first-row"),
            type: "table_row",
            table_row: { cells: [[text("a")], [text("b")]] },
          }),
          block({
            ...blockBase("second-row"),
            type: "table_row",
            table_row: { cells: [[text("c")], [text("d")]] },
          }),
        ],
      });

      const tree = await loadBlockTree("root", reader);
      const rendered = await renderBlockTree(tree, context);

      expect(rendered.content).toContain(expected);
    },
  );

  it("links child pages to sibling canonical Markdown files", async () => {
    const { reader } = readerFor({
      root: [
        block({
          ...blockBase("child"),
          type: "child_page",
          child_page: { title: "Child" },
        }),
      ],
    });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, context);

    expect(rendered.content).toContain("⸎ [Child](./child.md)");
    expect(rendered.childPageIds).toEqual(["child"]);
  });

  it("supports a custom child-page marker", async () => {
    const { reader } = readerFor({
      root: [
        block({
          ...blockBase("child"),
          type: "child_page",
          child_page: { title: "Child" },
        }),
      ],
    });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, {
      ...context,
      childPageMarker: "↳",
    });

    expect(rendered.content).toContain("↳ [Child](./child.md)");
  });

  it("wraps child-page links in a configured wrapper", async () => {
    const { reader } = readerFor({
      root: [
        block({
          ...blockBase("child"),
          type: "child_page",
          child_page: { title: "Child" },
        }),
      ],
    });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, {
      ...context,
      childPageMarker: "↳",
      childPageWrapper: {
        head: "<noblog-subpage>",
        tail: "</noblog-subpage>",
      },
    });

    expect(rendered.content).toContain(
      "<noblog-subpage>[Child](./child.md)</noblog-subpage>",
    );
    expect(rendered.content).not.toContain("↳");
  });

  it("renders heading_4 blocks as level-four Markdown headings", async () => {
    const { reader } = readerFor({ root: [heading4("h4", "TL;DR")] });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, context);

    expect(rendered.content).toContain("#### TL;DR");
  });

  it("supports a heading_4 transformer with a narrowed payload", async () => {
    const rendered = await renderBlockTree(
      [{ block: heading4("h4", "TL;DR"), children: [] }],
      {
        ...context,
        transformers: {
          heading_4: (block) => {
            expect(block.heading_4.rich_text).toHaveLength(1);
            return "Custom H4";
          },
        },
      },
    );

    expect(rendered.content).toContain("Custom H4");
  });

  it("supports custom block transformers with explicit page context", async () => {
    const rendered = await renderBlockTree(
      [{ block: paragraph("paragraph", "Default"), children: [] }],
      {
        ...context,
        transformers: {
          paragraph: (block, transformerContext) => {
            expect(block.id).toBe("paragraph");
            expect(block.paragraph.rich_text).toHaveLength(1);
            expect(transformerContext.pageId).toBe("root");
            return "Custom";
          },
        },
      },
    );

    expect(rendered.content).toBe("\nCustom\n\n");
  });
});
