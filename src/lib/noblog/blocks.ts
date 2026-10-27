import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import * as md from "./markdown.js";
import { renderPlainText, renderRichText } from "./rich-text.js";
import type {
  BlockTransformerContext,
  BlockTransformers,
  NotionReader,
} from "./types.js";

export interface BlockNode {
  readonly block: BlockObjectResponse;
  readonly children: BlockNode[];
}

export interface BlockRenderContext extends BlockTransformerContext {
  readonly transformers?: BlockTransformers;
}

export interface RenderedBlocks {
  content: string;
  childPageIds: string[];
}

export async function loadBlockTree(
  blockId: string,
  reader: NotionReader,
  ancestors: ReadonlySet<string> = new Set(),
): Promise<BlockNode[]> {
  if (ancestors.has(blockId)) return [];

  const blocks = await reader.getBlockChildren(blockId);
  const childAncestors = new Set(ancestors).add(blockId);
  const nodes: BlockNode[] = [];

  for (const block of blocks) {
    if (block.type === "unsupported") continue;

    const childSourceId = getChildSourceId(block);
    const children =
      childSourceId && !childAncestors.has(childSourceId)
        ? await loadBlockTree(childSourceId, reader, childAncestors)
        : [];
    nodes.push({ block, children });
  }

  return nodes;
}

function getChildSourceId(block: BlockObjectResponse): string | undefined {
  if (block.type === "child_page" || block.type === "child_database") {
    return undefined;
  }
  if (block.type === "synced_block") {
    return (
      block.synced_block.synced_from?.block_id ??
      (block.has_children ? block.id : undefined)
    );
  }
  return block.has_children ? block.id : undefined;
}

export async function renderBlockTree(
  nodes: readonly BlockNode[],
  context: BlockRenderContext,
): Promise<RenderedBlocks> {
  const result: RenderedBlocks = { content: "", childPageIds: [] };
  let numberedListIndex = 0;

  for (const node of nodes) {
    const { block } = node;
    numberedListIndex =
      block.type === "numbered_list_item" ? numberedListIndex + 1 : 0;

    const children =
      block.type === "table"
        ? { content: "", childPageIds: [] }
        : await renderBlockTree(node.children, context);
    const content = await renderBlockNode(
      node,
      children.content,
      numberedListIndex || undefined,
      context,
    );

    if (block.type === "toggle") {
      result.content += content;
    } else {
      const lineWrap = isListBlock(block) ? "" : "\n";
      result.content += `${lineWrap}${content}\n${lineWrap}`;
      if (!containsOwnChildren(block)) {
        result.content += children.content;
      }
    }

    if (block.type === "child_page") {
      result.childPageIds.push(block.id);
    } else {
      result.childPageIds.push(...children.childPageIds);
    }
  }

  return result;
}

function isListBlock(block: BlockObjectResponse): boolean {
  return (
    block.type === "to_do" ||
    block.type === "bulleted_list_item" ||
    block.type === "numbered_list_item"
  );
}

function containsOwnChildren(block: BlockObjectResponse): boolean {
  return (
    block.type === "child_page" ||
    block.type === "callout" ||
    block.type === "bulleted_list_item" ||
    block.type === "numbered_list_item" ||
    block.type === "table"
  );
}

async function renderBlockNode(
  node: BlockNode,
  children: string,
  listNumber: number | undefined,
  context: BlockRenderContext,
): Promise<string> {
  const { block } = node;
  const transformer = context.transformers?.[block.type];
  const transformed = await transformer?.(block, context);
  const content =
    transformed ?? (await renderDefaultBlock(node, context));

  switch (block.type) {
    case "toggle":
      return md.toggle(content, children);
    case "callout":
      return md.callout(
        children ? `${content}\n${children}`.trim() : content,
        block.callout.icon,
      );
    case "bulleted_list_item":
      return md.bullet(withIndentedChildren(content, children, 2));
    case "numbered_list_item":
      return md.bullet(
        withIndentedChildren(
          content,
          children,
          `${listNumber ?? 1}. `.length,
        ),
        listNumber,
      );
    default:
      return content;
  }
}

function withIndentedChildren(
  content: string,
  children: string,
  markerWidth: number,
): string {
  const nested = children.trim();
  if (!nested) return content;

  const indentation = " ".repeat(markerWidth);
  const indented = nested
    .split("\n")
    .map((line) => (line ? `${indentation}${line}` : ""))
    .join("\n");
  return `${content}\n${indented}`;
}

async function renderDefaultBlock(
  node: BlockNode,
  context: BlockRenderContext,
): Promise<string> {
  const { block } = node;

  switch (block.type) {
    case "image": {
      const url = getFileUrl(block.image);
      const caption = renderPlainText(block.image.caption);
      const alt = caption.trim() || getFileName(url) || "image";
      return md.image(alt, url);
    }
    case "divider":
      return md.divider();
    case "equation":
      return md.equation(block.equation.expression);
    case "pdf":
      return renderFileLink(block.pdf, block.type);
    case "file":
      return renderFileLink(block.file, block.type);
    case "video":
      return renderFileLink(block.video, block.type);
    case "audio":
      return renderFileLink(block.audio, block.type);
    case "embed":
      return md.link(block.type, block.embed.url);
    case "bookmark":
      return md.link(block.type, block.bookmark.url);
    case "link_preview":
      return md.link(block.type, block.link_preview.url);
    case "link_to_page": {
      const target = block.link_to_page;
      if (target.type !== "page_id" && target.type !== "database_id") {
        return "";
      }
      const id = target.type === "page_id" ? target.page_id : target.database_id;
      return md.link(block.type, `https://www.notion.so/${id}`);
    }
    case "child_page":
      return renderChildPageLink(block);
    case "child_database":
      return md.heading2(block.child_database.title || "child_database");
    case "table":
      return renderTable(node.children, block.table.has_column_header);
    case "code":
      return md.codeBlock(
        renderRichText(block.code.rich_text),
        block.code.language,
      );
    case "heading_1":
      return md.heading1(renderRichText(block.heading_1.rich_text));
    case "heading_2":
      return md.heading2(renderRichText(block.heading_2.rich_text));
    case "heading_3":
      return md.heading3(renderRichText(block.heading_3.rich_text));
    case "quote":
      return md.quote(renderRichText(block.quote.rich_text));
    case "to_do":
      return md.todo(
        renderRichText(block.to_do.rich_text),
        block.to_do.checked,
      );
    case "paragraph":
      return renderRichText(block.paragraph.rich_text);
    case "toggle":
      return renderRichText(block.toggle.rich_text);
    case "callout":
      return renderRichText(block.callout.rich_text);
    case "bulleted_list_item":
      return renderRichText(block.bulleted_list_item.rich_text);
    case "numbered_list_item":
      return renderRichText(block.numbered_list_item.rich_text);
    case "template":
      return renderRichText(block.template.rich_text);
    default:
      return "";
  }
}

interface FileContent {
  readonly type: "file" | "external";
  readonly file?: { readonly url: string };
  readonly external?: { readonly url: string };
  readonly caption: readonly RichTextItemResponse[];
}

function getFileUrl(content: Omit<FileContent, "caption">): string {
  if (content.type === "external") return content.external?.url ?? "";
  return content.file?.url ?? "";
}

function getFileName(url: string): string | undefined {
  return url.match(/[^\/\\&?]+\.\w{3,4}(?=([?&].*$|$))/)?.[0];
}

function renderFileLink(content: FileContent, fallbackTitle: string): string {
  const url = getFileUrl(content);
  const caption = renderPlainText(content.caption);
  const title = caption.trim() || getFileName(url) || fallbackTitle;
  return md.link(title, url);
}

function renderChildPageLink(
  block: Extract<BlockObjectResponse, { type: "child_page" }>,
): string {
  return `(」ﾟﾛﾟ)｣ ${md.link(block.child_page.title, `./${block.id}.md`)}`;
}

function renderTable(
  nodes: readonly BlockNode[],
  hasColumnHeader: boolean,
): string {
  const rows = nodes.flatMap(({ block }) => {
    if (block.type !== "table_row") return [];
    return [
      block.table_row.cells.map((cell) => renderRichText(cell)),
    ];
  });
  return md.table(rows, hasColumnHeader);
}
