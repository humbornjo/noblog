import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";

interface TextOptions {
  readonly href?: string;
  readonly annotations?: Partial<RichTextItemResponse["annotations"]>;
}

export function text(
  content: string,
  options: TextOptions = {},
): RichTextItemResponse {
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

export function equation(expression: string): RichTextItemResponse {
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

export function block(
  id: string,
  type: string,
  content: Record<string, unknown> = {},
  hasChildren = false,
): BlockObjectResponse {
  return {
    id,
    type,
    has_children: hasChildren,
    ...content,
  } as unknown as BlockObjectResponse;
}

export function page(
  id: string,
  properties: Record<string, unknown> = {},
): PageObjectResponse {
  return { id, properties } as unknown as PageObjectResponse;
}

export function paragraph(id: string, content: string): BlockObjectResponse {
  return block(id, "paragraph", {
    paragraph: { rich_text: [text(content)] },
  });
}
