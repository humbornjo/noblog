import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveStoreLayoutPath,
  writePages,
} from "../src/lib/noblog/writer.js";
import type { RenderedPage } from "../src/lib/noblog/types.js";

function renderedPage(
  id: string,
  isDatabasePage: boolean,
  content = `# ${id}\n`,
): RenderedPage {
  return {
    id,
    content,
    childPageIds: [],
    isDatabasePage,
  };
}

describe("writePages", () => {
  it("writes one flat store and links only database pages publicly", async () => {
    const directory = await mkdtemp(join(tmpdir(), "noblog-writer-test-"));
    try {
      const savePath = join(directory, "posts");
      const storePath = join(directory, ".noblog", "pages");
      const paths = await writePages(
        [renderedPage("root", true), renderedPage("child", false)],
        { savePath, storePath },
      );
      const viewPath = join(savePath, "root.md");
      const storedPath = join(storePath, "root.md");

      expect(paths).toEqual([viewPath]);
      expect((await readdir(storePath)).sort()).toEqual([
        "child.md",
        "root.md",
      ]);
      expect((await lstat(viewPath)).isSymbolicLink()).toBe(true);
      await expect(readlink(viewPath)).resolves.toBe(
        relative(dirname(viewPath), storedPath),
      );
      await expect(readFile(viewPath, "utf8")).resolves.toBe("# root\n");
      await expect(readFile(join(storePath, "child.md"), "utf8")).resolves.toBe(
        "# child\n",
      );
      await expect(lstat(join(savePath, "child.md"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        lstat(join(savePath, "children", "child.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("replaces legacy files and can update existing symlink views", async () => {
    const directory = await mkdtemp(join(tmpdir(), "noblog-writer-test-"));
    try {
      const savePath = join(directory, "posts");
      const storePath = join(directory, "store");
      await mkdir(savePath, { recursive: true });
      await writeFile(join(savePath, "root.md"), "legacy", "utf8");
      const options = { savePath, storePath };

      await writePages([renderedPage("root", true, "first")], options);
      await writePages([renderedPage("root", true, "second")], options);

      const viewPath = join(savePath, "root.md");
      expect((await lstat(viewPath)).isSymbolicLink()).toBe(true);
      await expect(readFile(viewPath, "utf8")).resolves.toBe("second");
      await expect(readFile(join(storePath, "root.md"), "utf8")).resolves.toBe(
        "second",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses to replace a directory at a page view path", async () => {
    const directory = await mkdtemp(join(tmpdir(), "noblog-writer-test-"));
    try {
      const savePath = join(directory, "posts");
      const viewPath = join(savePath, "root.md");
      await mkdir(viewPath, { recursive: true });

      await expect(
        writePages([renderedPage("root", true)], {
          savePath,
          storePath: join(directory, "store"),
        }),
      ).rejects.toThrow(`Refusing to replace non-file output: ${viewPath}`);
      expect((await lstat(viewPath)).isDirectory()).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("propagates filesystem failures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "noblog-writer-test-"));
    try {
      const file = join(directory, "not-a-directory");
      await writeFile(file, "content");

      await expect(
        writePages([renderedPage("post", true)], {
          savePath: join(file, "posts"),
          storePath: join(file, "store"),
        }),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("resolveStoreLayoutPath", () => {
  it("resolves a view-relative layout from the canonical store", () => {
    const project = join(tmpdir(), "noblog-layout-test");
    expect(
      resolveStoreLayoutPath({
        savePath: join(project, "src/pages/posts"),
        storePath: join(project, ".noblog/pages"),
        layoutPath: "../../layouts/MarkdownPostLayout.astro",
      }),
    ).toBe("../../src/layouts/MarkdownPostLayout.astro");
  });
});
