import type { NoblogConfig } from "../config.js";
import type { NotionPropertyMap } from "../lib/noblog/config.js";
import {
  renderPages,
  resolveStoreLayoutPath,
  writePages,
} from "../lib/noblog/index.js";
import type { FrontmatterAdapter } from "../lib/noblog/types.js";
import { createNotionSource } from "../lib/notion/client.js";

export interface GenerateOptions {
  savePath: string;
  storePath: string;
  layoutPath: string;
  recursive: boolean;
  propertyMap?: NotionPropertyMap;
  frontmatter?: FrontmatterAdapter;
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

  output.stdout.write("✅ Successfully generated blog content\n");
}

export type GenerateBlog = typeof generateBlog;
