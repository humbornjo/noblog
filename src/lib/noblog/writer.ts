import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_SAVE_PATH, DEFAULT_SUB_PATH } from "./defaults.js";
import type { RenderedPage, WritePagesOptions } from "./types.js";

export async function writePages(
  pages: readonly RenderedPage[],
  options: WritePagesOptions = {},
): Promise<string[]> {
  const savePath = options.savePath ?? DEFAULT_SAVE_PATH;
  const subPath = options.subPath ?? DEFAULT_SUB_PATH;
  const writtenPaths: string[] = [];

  for (const page of pages) {
    const directory = page.isDatabasePage ? savePath : join(savePath, subPath);
    const filePath = join(directory, `${page.id}.md`);
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, page.content, "utf8");
    writtenPaths.push(filePath);
  }

  return writtenPaths;
}
