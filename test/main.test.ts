import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/main.js";
import { createTestContext } from "./helpers.js";

describe("CLI environment bootstrap", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "noblog-env-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(directory);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it("loads credentials from the working directory .env file", async () => {
    await writeFile(
      join(directory, ".env"),
      "NOTION_API_SECRET=file-secret\nNOBLOG_DATABASE_ID=file-database\n",
    );
    const { context, generateBlog } = createTestContext({});

    await main([], context);

    expect(context.process.exitCode).toBe(0);
    expect(generateBlog).toHaveBeenCalledWith(
      { notionApiSecret: "file-secret", databaseId: "file-database" },
      expect.any(Object),
      context.process,
    );
  });

  it("keeps shell environment values ahead of .env values", async () => {
    await writeFile(
      join(directory, ".env"),
      "NOTION_API_SECRET=file-secret\nNOBLOG_DATABASE_ID=file-database\n",
    );
    const { context, generateBlog } = createTestContext({
      NOTION_API_SECRET: "shell-secret",
      NOBLOG_DATABASE_ID: "shell-database",
    });

    await main([], context);

    expect(generateBlog).toHaveBeenCalledWith(
      { notionApiSecret: "shell-secret", databaseId: "shell-database" },
      expect.any(Object),
      context.process,
    );
  });
});
