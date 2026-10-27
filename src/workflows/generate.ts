import type { NoblogConfig } from "../config.js";
import {
  renderPages,
  resolveStoreLayoutPath,
  writePages,
} from "../lib/noblog/index.js";
import { createNotionSource } from "../lib/notion/client.js";

export interface GenerateOptions {
  savePath: string;
  storePath: string;
  subPath: string;
  layoutPath: string;
  verbose: boolean;
}

export interface GenerateOutput {
  stdout: { write(chunk: string): unknown };
  stderr: { write(chunk: string): unknown };
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
        `Sub path: ${options.subPath}\n` +
        `Layout path: ${options.layoutPath}\n`,
    );
  }

  const pages = await renderPages(posts, notion, {
    layoutPath: storeLayoutPath,
    nestedLayoutPath: storeLayoutPath,
    subPath: options.subPath,
  });
  await writePages(pages, {
    savePath: options.savePath,
    storePath: options.storePath,
    subPath: options.subPath,
  });

  output.stdout.write("✅ Successfully generated blog content\n");
}

export type GenerateBlog = typeof generateBlog;
