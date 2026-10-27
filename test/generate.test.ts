import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateBlog } from "../src/workflows/generate.js";

const mocks = vi.hoisted(() => ({
  createNotionSource: vi.fn(),
  notion: {
    listPages: vi.fn(),
    getPage: vi.fn(),
    getBlockChildren: vi.fn(),
  },
  renderPages: vi.fn(),
  writePages: vi.fn(),
}));

vi.mock("../src/lib/notion/client.js", () => ({
  createNotionSource: mocks.createNotionSource,
}));

vi.mock("../src/lib/noblog/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/noblog/index.js")>();
  return {
    ...actual,
    renderPages: mocks.renderPages,
    writePages: mocks.writePages,
  };
});

describe("generateBlog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createNotionSource.mockReturnValue(mocks.notion);
    mocks.notion.listPages.mockResolvedValue([]);
    mocks.renderPages.mockResolvedValue([]);
    mocks.writePages.mockResolvedValue([]);
  });

  it("renders and writes pages through the package API", async () => {
    const config = { notionApiSecret: "secret", databaseId: "database" };
    const options = {
      savePath: "posts",
      storePath: "store",
      subPath: "children",
      layoutPath: "../Layout.astro",
      verbose: false,
    };
    const output = {
      stdout: { write: vi.fn() },
      stderr: { write: vi.fn() },
    };

    await generateBlog(config, options, output);

    expect(mocks.createNotionSource).toHaveBeenCalledWith(config);
    expect(mocks.renderPages).toHaveBeenCalledWith([], mocks.notion, {
      layoutPath: "../Layout.astro",
      nestedLayoutPath: "../Layout.astro",
      subPath: "children",
    });
    expect(mocks.writePages).toHaveBeenCalledWith([], {
      savePath: "posts",
      storePath: "store",
      subPath: "children",
    });
    expect(output.stdout.write).toHaveBeenCalledWith(
      "✅ Successfully generated blog content\n",
    );
    expect(output.stderr.write).not.toHaveBeenCalled();
  });

  it("writes diagnostics to stderr in verbose mode", async () => {
    mocks.notion.listPages.mockResolvedValue([{ id: "page" }]);
    const output = {
      stdout: { write: vi.fn() },
      stderr: { write: vi.fn() },
    };

    await generateBlog(
      { notionApiSecret: "secret", databaseId: "database" },
      {
        savePath: "posts",
        storePath: "store",
        subPath: "children",
        layoutPath: "../Layout.astro",
        verbose: true,
      },
      output,
    );

    expect(output.stderr.write).toHaveBeenNthCalledWith(
      1,
      "Fetching posts from Notion...\n",
    );
    expect(output.stderr.write).toHaveBeenNthCalledWith(
      2,
      "Found 1 pages\nSave path: posts\nStore path: store\nSub path: children\nLayout path: ../Layout.astro\n",
    );
  });
});
