import type { CalloutBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

export const BLOCK_TO_DO = "to_do";
export const BLOCK_TOGGLE = "toggle";
export const BLOCK_CALLOUT = "callout";
export const BLOCK_CHILD_PAGE = "child_page";
export const BLOCK_UNSUPPORTED = "supported";
export const BLOCK_SYNCED_BLOCK = "synced_block";
export const BLOCK_NUMBERED_LIST_ITEM = "numbered_list_item";
export const BLOCK_BULLETED_LIST_ITEM = "bulleted_list_item";

export const LINEWRAP_NULL = "";
export const LINEWRAP_NEWLINE = "\n";

export type Range = [number | never, number | never];

export type AnnotatedRange = {
  range: Range;
  Annotation: string;
};

export type CalloutIcon = CalloutBlockObjectResponse["callout"]["icon"];
