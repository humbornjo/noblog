import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import type {
  Heading4BlockObjectResponse,
  NoblogBlock,
} from "../src/lib/noblog/types.js";

interface TextOptions {
  readonly href?: string;
  readonly annotations?: Partial<RichTextItemResponse["annotations"]>;
}

export function text(
  content: string,
  options: TextOptions = {},
): Extract<RichTextItemResponse, { type: "text" }> {
  return {
    type: "text",
    text: { content, link: null },
    plain_text: content,
    href: options.href ?? null,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
      ...options.annotations,
    },
  };
}

export function equation(
  expression: string,
): Extract<RichTextItemResponse, { type: "equation" }> {
  return {
    type: "equation",
    equation: { expression },
    plain_text: expression,
    href: null,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
    },
  };
}

type BlockBase = Pick<
  BlockObjectResponse,
  | "parent"
  | "object"
  | "id"
  | "created_time"
  | "created_by"
  | "last_edited_time"
  | "last_edited_by"
  | "has_children"
  | "archived"
  | "in_trash"
>;

export function blockBase(id: string, hasChildren = false): BlockBase {
  return {
    parent: { type: "page_id", page_id: "parent" },
    object: "block",
    id,
    created_time: "2024-01-01T00:00:00.000Z",
    created_by: { object: "user", id: "user" },
    last_edited_time: "2024-01-01T00:00:00.000Z",
    last_edited_by: { object: "user", id: "user" },
    has_children: hasChildren,
    archived: false,
    in_trash: false,
  };
}

export function block<Block extends NoblogBlock>(value: Block): Block {
  return value;
}

export function page(
  id: string,
  properties: PageObjectResponse["properties"] = {},
): PageObjectResponse {
  return {
    parent: { type: "database_id", database_id: "database" },
    properties,
    icon: null,
    cover: null,
    created_by: { object: "user", id: "user" },
    last_edited_by: { object: "user", id: "user" },
    is_locked: false,
    object: "page",
    id,
    created_time: "2024-01-01T00:00:00.000Z",
    last_edited_time: "2024-01-01T00:00:00.000Z",
    archived: false,
    in_trash: false,
    url: `https://www.notion.so/${id}`,
    public_url: null,
  };
}

export function paragraph(
  id: string,
  content: string,
): Extract<BlockObjectResponse, { type: "paragraph" }> {
  return block({
    ...blockBase(id),
    type: "paragraph",
    paragraph: { rich_text: [text(content)], color: "default" },
  });
}

export function heading4(
  id: string,
  content: string,
): Heading4BlockObjectResponse {
  return {
    ...blockBase(id),
    type: "heading_4",
    heading_4: {
      rich_text: [text(content)],
      color: "default",
      is_toggleable: false,
    },
  };
}
