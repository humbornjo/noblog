import type { RichTextItemResponse } from "@notionhq/client";
import { inlineEquation, link } from "./markdown.js";

type AnnotationName = Exclude<
  keyof RichTextItemResponse["annotations"],
  "color"
>;

interface AnnotationFormat {
  readonly name: AnnotationName;
  readonly open: string;
  readonly close: string;
}

// Ordered from the outermost marker to the innermost marker. Stable sorting
// keeps this order when annotations end on the same rich-text segment.
const ANNOTATION_FORMATS: readonly AnnotationFormat[] = [
  { name: "strikethrough", open: "~~", close: "~~" },
  { name: "underline", open: "<u>", close: "</u>" },
  { name: "italic", open: "_", close: "_" },
  { name: "bold", open: "**", close: "**" },
  { name: "code", open: "`", close: "`" },
];

export function renderPlainText(
  richText: readonly RichTextItemResponse[],
): string {
  return richText.map((item) => item.plain_text).join("");
}

export function renderRichText(
  richText: readonly RichTextItemResponse[],
): string {
  let rendered = "";
  let active: AnnotationFormat[] = [];

  for (const [index, item] of richText.entries()) {
    const desired = getAnnotationFormats(richText, index, item);
    let shared = 0;
    while (
      shared < active.length &&
      shared < desired.length &&
      active[shared]?.name === desired[shared]?.name
    ) {
      shared++;
    }

    for (const format of active.slice(shared).toReversed()) {
      rendered += format.close;
    }
    for (const format of desired.slice(shared)) {
      rendered += format.open;
    }

    rendered += renderContent(item);
    active = desired;
  }

  for (const format of active.toReversed()) {
    rendered += format.close;
  }
  return rendered;
}

function getAnnotationFormats(
  richText: readonly RichTextItemResponse[],
  index: number,
  item: RichTextItemResponse,
): AnnotationFormat[] {
  if (item.type === "equation") return [];

  return ANNOTATION_FORMATS.filter((format) => item.annotations[format.name])
    .map((format) => ({
      format,
      runEnd: getAnnotationRunEnd(richText, index, format.name),
    }))
    .sort((left, right) => right.runEnd - left.runEnd)
    .map(({ format }) => format);
}

function getAnnotationRunEnd(
  richText: readonly RichTextItemResponse[],
  start: number,
  name: AnnotationName,
): number {
  let end = start;
  for (const [offset, next] of richText.slice(start + 1).entries()) {
    if (next.type === "equation" || !next.annotations[name]) break;
    end = start + offset + 1;
  }
  return end;
}

function renderContent(item: RichTextItemResponse): string {
  if (item.type === "equation") {
    return inlineEquation(item.equation.expression);
  }
  return item.href ? link(item.plain_text, item.href) : item.plain_text;
}
