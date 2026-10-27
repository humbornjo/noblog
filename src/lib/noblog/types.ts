import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client";

export type CalloutIcon = Extract<
  BlockObjectResponse,
  { type: "callout" }
>["callout"]["icon"];

export interface NotionReader {
  getPage(pageId: string): Promise<PageObjectResponse>;
  getBlockChildren(
    blockId: string,
  ): Promise<readonly BlockObjectResponse[]>;
}

export interface BlockTransformerContext {
  readonly pageId: string;
  readonly databasePageIds: ReadonlySet<string>;
  readonly subPath: string;
}

export type BlockTransformer = (
  block: BlockObjectResponse,
  context: BlockTransformerContext,
) => string | undefined | Promise<string | undefined>;

export type BlockTransformers = Readonly<
  Partial<Record<BlockObjectResponse["type"], BlockTransformer>>
>;

export interface RenderOptions {
  readonly layoutPath?: string;
  readonly nestedLayoutPath?: string;
  readonly subPath?: string;
  readonly recursive?: boolean;
  readonly transformers?: BlockTransformers;
}

export interface RenderedPage {
  readonly id: string;
  readonly content: string;
  readonly childPageIds: readonly string[];
  readonly isDatabasePage: boolean;
}

export interface WritePagesOptions {
  readonly savePath?: string;
  readonly storePath?: string;
  readonly subPath?: string;
}

export interface StoreLayoutOptions {
  readonly savePath?: string;
  readonly storePath?: string;
  readonly layoutPath?: string;
}
