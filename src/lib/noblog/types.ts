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

type Heading1Block = Extract<BlockObjectResponse, { type: "heading_1" }>;

export type Heading4BlockObjectResponse = Omit<
  Heading1Block,
  "type" | "heading_1"
> & {
  readonly type: "heading_4";
  readonly heading_4: Heading1Block["heading_1"];
};

export type NoblogBlock = BlockObjectResponse | Heading4BlockObjectResponse;

export interface NotionReader {
  getPage(pageId: string): Promise<PageObjectResponse>;
  getBlockChildren(blockId: string): Promise<readonly NoblogBlock[]>;
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
  K extends NoblogBlock["type"] = NoblogBlock["type"],
> = (
  block: Extract<NoblogBlock, { type: K }>,
  context: BlockTransformerContext,
) => string | undefined | Promise<string | undefined>;

export type BlockTransformers = {
  readonly [K in NoblogBlock["type"]]?: BlockTransformer<K> | undefined;
};

export interface ChildPageWrapper {
  readonly head: string;
  readonly tail: string;
}

export interface RenderOptions {
  readonly layoutPath?: string;
  readonly recursive?: boolean;
  readonly childPageMarker?: string;
  readonly childPageWrapper?: ChildPageWrapper;
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
