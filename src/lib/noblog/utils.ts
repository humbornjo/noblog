import type { CalloutBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

export const BLOCK_TO_DO = "to_do";
export const BLOCK_TOGGLE = "toggle";
export const BLOCK_CALLOUT = "callout";
export const BLOCK_CHILD_PAGE = "child_page";
export const BLOCK_UNSUPPORTED = "supported";
export const BLOCK_SYNCED_BLOCK = "synced_block";
export const BLOCK_NUMBERED_LIST_ITEM = "numbered_list_item";
export const BLOCK_BULLETED_LIST_ITEM = "bulleted_list_item";
export const BLOCK_IMAGE = "image";
export const BLOCK_DIVIDER = "divider";
export const BLOCK_EQUATION = "equation";
export const BLOCK_PDF = "pdf";
export const BLOCK_FILE = "file";
export const BLOCK_VIDEO = "video";
export const BLOCK_EMBED = "embed";
export const BLOCK_BOOKMARK = "bookmark";
export const BLOCK_LINK_PREVIEW = "link_preview";
export const BLOCK_LINK_TO_PAGE = "link_to_page";
export const BLOCK_CHILD_DATABASE = "child_database";
export const BLOCK_TABLE = "table";
export const BLOCK_CODE = "code";
export const BLOCK_HEADING_1 = "heading_1";
export const BLOCK_HEADING_2 = "heading_2";
export const BLOCK_HEADING_3 = "heading_3";
export const BLOCK_QUOTE = "quote";
export const BLOCK_PARAGRAPH = "paragraph";

export const LINEWRAP_NULL = "";
export const LINEWRAP_NEWLINE = "\n";

export type Range = [number | never, number | never];

export type AnnotatedRange = {
  range: Range;
  Annotation: string;
};

export type CalloutIcon = CalloutBlockObjectResponse["callout"]["icon"];
