import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client";
import type { NotionPropertyMap } from "./config.js";
import type { PageMetadata } from "./metadata.js";

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

export interface FrontmatterContext {
  readonly page: PageObjectResponse;
  readonly metadata: PageMetadata;
  readonly layoutPath: string;
  readonly isDatabasePage: boolean;
}

export type FrontmatterAdapter = (
  context: FrontmatterContext,
) => Readonly<Record<string, unknown>>;

export interface BlockTransformerContext {
  readonly pageId: string;
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
  readonly recursive?: boolean;
  readonly propertyMap?: NotionPropertyMap;
  readonly frontmatter?: FrontmatterAdapter;
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
}

export interface StoreLayoutOptions {
  readonly savePath?: string;
  readonly storePath?: string;
  readonly layoutPath?: string;
}
