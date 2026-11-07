import type { NoblogConfig } from "../config.js";
import type { NotionPropertyMap } from "../lib/noblog/config.js";
import {
  DEFAULT_SELFIE_PATH,
  findSelfiePage,
  relativizeStoreLinks,
  renderPages,
  resolveStoreLayoutPath,
  upsertFrontmatterAuthor,
  writePages,
  writeSelfie,
} from "../lib/noblog/index.js";
import type {
  ChildPageWrapper,
  FrontmatterAdapter,
} from "../lib/noblog/types.js";
import { createNotionSource } from "../lib/notion/client.js";

export interface GenerateOptions {
  savePath: string;
  storePath: string;
  layoutPath: string;
  recursive: boolean;
  childPageMarker: string;
  childPageWrapper?: ChildPageWrapper;
  propertyMap?: NotionPropertyMap;
  frontmatter?: FrontmatterAdapter;
  selfie?: string;
  selfiePath?: string;
  verbose: boolean;
}

export interface GenerateOutput {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
}

export async function generateBlog(
  config: NoblogConfig,
  options: GenerateOptions,
  output: GenerateOutput,
): Promise<void> {
  const notion = createNotionSource(config);
  const storeLayoutPath = resolveStoreLayoutPath(options);

  if (options.verbose) {
    output.stderr.write("Fetching posts from Notion...\n");
  }

  const posts = await notion.listPages();

  if (options.verbose) {
    output.stderr.write(
      `Found ${posts.length} pages\n` +
        `Save path: ${options.savePath}\n` +
        `Store path: ${options.storePath}\n` +
        `Layout path: ${options.layoutPath}\n`,
    );
  }

  const pages = await renderPages(posts, notion, {
    layoutPath: storeLayoutPath,
    recursive: options.recursive,
    childPageMarker: options.childPageMarker,
    ...(options.childPageWrapper !== undefined
      ? { childPageWrapper: options.childPageWrapper }
      : {}),
    ...(options.propertyMap !== undefined
      ? { propertyMap: options.propertyMap }
      : {}),
    ...(options.frontmatter !== undefined
      ? { frontmatter: options.frontmatter }
      : {}),
  });
  await writePages(pages, {
    savePath: options.savePath,
    storePath: options.storePath,
  });

  const selfieTitle = options.selfie?.trim() ?? "";
  if (selfieTitle !== "") {
    const selfiePath = options.selfiePath ?? DEFAULT_SELFIE_PATH;
    const match = findSelfiePage(posts, selfieTitle, options.propertyMap);
    const rendered = pages.find((page) => page.id === match?.page.id);
    if (match && rendered) {
      const content = upsertFrontmatterAuthor(
        relativizeStoreLinks(rendered.content, selfiePath, options.storePath),
        match.title,
      );
      await writeSelfie(content, selfiePath);
      if (options.verbose) {
        output.stderr.write(
          `Wrote selfie page "${match.title}" to ${selfiePath}\n`,
        );
      }
    } else if (options.verbose) {
      output.stderr.write(
        `Selfie page "${selfieTitle}" not found in the database; ` +
          `leaving ${selfiePath} untouched\n`,
      );
    }
  }

  output.stdout.write("✅ Successfully generated blog content\n");
}

export type GenerateBlog = typeof generateBlog;
