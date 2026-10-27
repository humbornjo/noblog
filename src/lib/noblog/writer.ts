import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  DEFAULT_LAYOUT_PATH,
  DEFAULT_SAVE_PATH,
  DEFAULT_STORE_PATH,
} from "./defaults.js";
import type {
  RenderedPage,
  StoreLayoutOptions,
  WritePagesOptions,
} from "./types.js";

export async function writePages(
  pages: readonly RenderedPage[],
  options: WritePagesOptions = {},
): Promise<string[]> {
  const savePath = options.savePath ?? DEFAULT_SAVE_PATH;
  const storePath = options.storePath ?? DEFAULT_STORE_PATH;
  const writtenPaths: string[] = [];
  await mkdir(storePath, { recursive: true });

  for (const page of pages) {
    const storedPath = join(storePath, `${page.id}.md`);
    const storedStats = await getStats(storedPath);
    if (storedStats && !storedStats.isFile()) {
      throw new Error(`Page store path is not a regular file: ${storedPath}`);
    }
    await writeFile(storedPath, page.content, "utf8");

    if (!page.isDatabasePage) continue;

    const viewPath = join(savePath, `${page.id}.md`);
    await mkdir(savePath, { recursive: true });
    await linkStoredPage(storedPath, viewPath);
    writtenPaths.push(viewPath);
  }

  return writtenPaths;
}

export function resolveStoreLayoutPath(
  options: StoreLayoutOptions = {},
): string {
  const savePath = options.savePath ?? DEFAULT_SAVE_PATH;
  const storePath = options.storePath ?? DEFAULT_STORE_PATH;
  const layoutPath = options.layoutPath ?? DEFAULT_LAYOUT_PATH;
  const layoutTarget = resolve(savePath, layoutPath);
  return relative(resolve(storePath), layoutTarget).split(sep).join("/");
}

async function linkStoredPage(
  storedPath: string,
  viewPath: string,
): Promise<void> {
  if (resolve(storedPath) === resolve(viewPath)) return;

  const viewStats = await getStats(viewPath);
  if (viewStats && !viewStats.isFile() && !viewStats.isSymbolicLink()) {
    throw new Error(`Refusing to replace non-file output: ${viewPath}`);
  }

  const target = relative(dirname(viewPath), storedPath);
  if (viewStats?.isSymbolicLink() && (await readlink(viewPath)) === target) {
    return;
  }

  const temporaryPath = `${viewPath}.noblog-${randomUUID()}.tmp`;
  try {
    await symlink(target, temporaryPath, "file");
    await rename(temporaryPath, viewPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function getStats(path: string) {
  try {
    return await lstat(path);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
