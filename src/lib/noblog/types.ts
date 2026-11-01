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

export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | Date
  | readonly FrontmatterValue[]
  | { readonly [key: string]: FrontmatterValue };

export type FrontmatterRecord = Readonly<
  Record<string, FrontmatterValue | undefined>
>;

export type FrontmatterAdapter = (
  context: FrontmatterContext,
) => FrontmatterRecord;

export interface BlockTransformerContext {
  readonly pageId: string;
}

export type BlockTransformer<
  K extends BlockObjectResponse["type"] = BlockObjectResponse["type"],
> = (
  block: Extract<BlockObjectResponse, { type: K }>,
  context: BlockTransformerContext,
) => string | undefined | Promise<string | undefined>;

export type BlockTransformers = {
  readonly [K in BlockObjectResponse["type"]]?:
    | BlockTransformer<K>
    | undefined;
};

export interface RenderOptions {
  readonly layoutPath?: string;
  readonly recursive?: boolean;
  readonly childPageMarker?: string;
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
