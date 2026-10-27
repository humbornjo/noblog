import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writePages } from "../src/lib/noblog/writer.js";
import type { RenderedPage } from "../src/lib/noblog/types.js";

function renderedPage(
  id: string,
  isDatabasePage: boolean,
): RenderedPage {
  return {
    id,
    content: `# ${id}\n`,
    childPageIds: [],
    isDatabasePage,
  };
}

describe("writePages", () => {
  it("writes database and nested pages to their respective directories", async () => {
    const directory = await mkdtemp(join(tmpdir(), "noblog-writer-test-"));
    try {
      const savePath = join(directory, "posts");
      const paths = await writePages(
        [renderedPage("root", true), renderedPage("child", false)],
        { savePath, subPath: "children" },
      );

      expect(paths).toEqual([
        join(savePath, "root.md"),
        join(savePath, "children", "child.md"),
      ]);
      await expect(readFile(paths[0]!, "utf8")).resolves.toBe("# root\n");
      await expect(readFile(paths[1]!, "utf8")).resolves.toBe("# child\n");
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
        }),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
