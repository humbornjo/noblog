import type { PageObjectResponse } from "@notionhq/client";
import { loadBlockTree, renderBlockTree } from "./blocks.js";
import { DEFAULT_LAYOUT_PATH, DEFAULT_SUB_PATH } from "./defaults.js";
import { renderFrontmatter } from "./frontmatter.js";
import type {
  BlockTransformers,
  NotionReader,
  RenderedPage,
  RenderOptions,
} from "./types.js";

interface PageRenderContext {
  readonly reader: NotionReader;
  readonly databasePageIds: ReadonlySet<string>;
  readonly layoutPath: string;
  readonly nestedLayoutPath?: string;
  readonly subPath: string;
  readonly recursive: boolean;
  readonly transformers?: BlockTransformers;
  readonly renderedPages: Map<string, Promise<RenderedPage>>;
}

export async function renderPage(
  pageId: string,
  reader: NotionReader,
  options: RenderOptions = {},
): Promise<RenderedPage> {
  const context = createContext([pageId], reader, options);
  return collectPage(pageId, context);
}

export async function renderPages(
  posts: readonly PageObjectResponse[],
  reader: NotionReader,
  options: RenderOptions = {},
): Promise<RenderedPage[]> {
  const context = createContext(
    posts.map((post) => post.id),
    reader,
    options,
  );

  for (const post of posts) {
    await collectPage(post.id, context, post);
  }

  return Promise.all([...context.renderedPages.values()]);
}

function createContext(
  databasePageIds: readonly string[],
  reader: NotionReader,
  options: RenderOptions,
): PageRenderContext {
  return {
    reader,
    databasePageIds: new Set(databasePageIds),
    layoutPath: options.layoutPath ?? DEFAULT_LAYOUT_PATH,
    nestedLayoutPath: options.nestedLayoutPath,
    subPath: options.subPath ?? DEFAULT_SUB_PATH,
    recursive: options.recursive ?? true,
    transformers: options.transformers,
    renderedPages: new Map(),
  };
}

async function collectPage(
  pageId: string,
  context: PageRenderContext,
  post?: PageObjectResponse,
): Promise<RenderedPage> {
  const cached = context.renderedPages.get(pageId);
  if (cached) return cached;

  const rendering = renderSinglePage(pageId, context, post);
  context.renderedPages.set(pageId, rendering);
  const rendered = await rendering;

  if (context.recursive) {
    for (const childPageId of rendered.childPageIds) {
      await collectPage(childPageId, context);
    }
  }

  return rendered;
}

async function renderSinglePage(
  pageId: string,
  context: PageRenderContext,
  post?: PageObjectResponse,
): Promise<RenderedPage> {
  const [page, blockTree] = await Promise.all([
    post ? Promise.resolve(post) : context.reader.getPage(pageId),
    loadBlockTree(pageId, context.reader),
  ]);
  const rendered = await renderBlockTree(blockTree, {
    pageId,
    databasePageIds: context.databasePageIds,
    subPath: context.subPath,
    transformers: context.transformers,
  });
  const frontmatter = renderFrontmatter(page, {
    layoutPath: context.layoutPath,
    nestedLayoutPath: context.nestedLayoutPath,
    isDatabasePage: context.databasePageIds.has(pageId),
  });

  return {
    id: pageId,
    content: frontmatter + rendered.content,
    childPageIds: [...new Set(rendered.childPageIds)],
    isDatabasePage: context.databasePageIds.has(pageId),
  };
}
