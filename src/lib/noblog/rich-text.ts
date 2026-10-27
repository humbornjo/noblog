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

  for (let index = 0; index < richText.length; index++) {
    const item = richText[index]!;
    const desired = getAnnotationFormats(richText, index);
    let shared = 0;
    while (
      shared < active.length &&
      shared < desired.length &&
      active[shared]?.name === desired[shared]?.name
    ) {
      shared++;
    }

    for (let marker = active.length - 1; marker >= shared; marker--) {
      rendered += active[marker]!.close;
    }
    for (let marker = shared; marker < desired.length; marker++) {
      rendered += desired[marker]!.open;
    }

    rendered += renderContent(item);
    active = desired;
  }

  for (let marker = active.length - 1; marker >= 0; marker--) {
    rendered += active[marker]!.close;
  }
  return rendered;
}

function getAnnotationFormats(
  richText: readonly RichTextItemResponse[],
  index: number,
): AnnotationFormat[] {
  const item = richText[index]!;
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
  while (end + 1 < richText.length) {
    const next = richText[end + 1]!;
    if (next.type === "equation" || !next.annotations[name]) break;
    end++;
  }
  return end;
}

function renderContent(item: RichTextItemResponse): string {
  if (item.type === "equation") {
    return inlineEquation(item.equation.expression);
  }
  return item.href ? link(item.plain_text, item.href) : item.plain_text;
}
