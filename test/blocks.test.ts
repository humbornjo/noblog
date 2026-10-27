import { describe, expect, it, vi } from "vitest";
import type { BlockObjectResponse } from "@notionhq/client";
import {
  loadBlockTree,
  renderBlockTree,
} from "../src/lib/noblog/blocks.js";
import type {
  BlockRenderContext,
} from "../src/lib/noblog/blocks.js";
import type { NotionReader } from "../src/lib/noblog/types.js";
import { block, paragraph, text } from "./fixtures.js";

const context: BlockRenderContext = {
  pageId: "root",
};

function readerFor(
  blocks: Readonly<Record<string, BlockObjectResponse[]>>,
) {
  const getBlockChildren = vi.fn(async (id: string) => blocks[id] ?? []);
  const reader: NotionReader = {
    getPage: vi.fn(async () => {
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
        block(
          "toggle",
          "toggle",
          { toggle: { rich_text: [text("More")] } },
          true,
        ),
        block(
          "first",
          "numbered_list_item",
          { numbered_list_item: { rich_text: [text("one")] } },
          true,
        ),
        block("second", "numbered_list_item", {
          numbered_list_item: { rich_text: [text("two")] },
        }),
        paragraph("reset", "reset"),
        block("third", "numbered_list_item", {
          numbered_list_item: { rich_text: [text("three")] },
        }),
        block("ignored", "unsupported", { unsupported: {} }),
      ],
      toggle: [paragraph("inside", "Inside")],
      first: [
        block("subitem", "bulleted_list_item", {
          bulleted_list_item: { rich_text: [text("sub")] },
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
        block(
          "callout",
          "callout",
          {
            callout: {
              rich_text: [text("Note")],
              icon: { type: "emoji", emoji: "💡" },
            },
          },
          true,
        ),
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
          block(
            "table",
            "table",
            {
              table: {
                table_width: 2,
                has_column_header: hasColumnHeader,
                has_row_header: false,
              },
            },
            true,
          ),
        ],
        table: [
          block("first-row", "table_row", {
            table_row: { cells: [[text("a")], [text("b")]] },
          }),
          block("second-row", "table_row", {
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
        block("child", "child_page", { child_page: { title: "Child" } }),
      ],
    });

    const tree = await loadBlockTree("root", reader);
    const rendered = await renderBlockTree(tree, context);

    expect(rendered.content).toContain("[Child](./child.md)");
    expect(rendered.childPageIds).toEqual(["child"]);
  });

  it("supports custom block transformers with explicit page context", async () => {
    const rendered = await renderBlockTree(
      [{ block: paragraph("paragraph", "Default"), children: [] }],
      {
        ...context,
        transformers: {
          paragraph: (block, transformerContext) => {
            expect(block.id).toBe("paragraph");
            expect(transformerContext.pageId).toBe("root");
            return "Custom";
          },
        },
      },
    );

    expect(rendered.content).toBe("\nCustom\n\n");
  });
});
