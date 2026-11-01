import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateBlog } from "../src/workflows/generate.js";
import type { GenerateOutput } from "../src/workflows/generate.js";
import type {
  createNotionSource,
  NotionSource,
} from "../src/lib/notion/client.js";
import type { renderPages } from "../src/lib/noblog/pages.js";
import type { writePages } from "../src/lib/noblog/writer.js";
import { page } from "./fixtures.js";

const mocks = vi.hoisted(() => ({
  createNotionSource: vi.fn<typeof createNotionSource>(),
  notion: {
    listPages: vi.fn<NotionSource["listPages"]>(),
    getPage: vi.fn<NotionSource["getPage"]>(),
    getBlockChildren: vi.fn<NotionSource["getBlockChildren"]>(),
  },
  renderPages: vi.fn<typeof renderPages>(),
  writePages: vi.fn<typeof writePages>(),
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
    const propertyMap = { series: "Series" };
    const frontmatter = () => ({ title: "Custom" });
    const options = {
      savePath: "posts",
      storePath: "store",
      layoutPath: "../Layout.astro",
      recursive: false,
      childPageMarker: "↳",
      childPageWrapper: {
        head: "<noblog-subpage>",
        tail: "</noblog-subpage>",
      },
      propertyMap,
      frontmatter,
      verbose: false,
    };
    const output = {
      stdout: { write: vi.fn<GenerateOutput["stdout"]["write"]>() },
      stderr: { write: vi.fn<GenerateOutput["stderr"]["write"]>() },
    };

    await generateBlog(config, options, output);

    expect(mocks.createNotionSource).toHaveBeenCalledWith(config);
    expect(mocks.renderPages).toHaveBeenCalledWith([], mocks.notion, {
      layoutPath: "../Layout.astro",
      recursive: false,
      childPageMarker: "↳",
      childPageWrapper: {
        head: "<noblog-subpage>",
        tail: "</noblog-subpage>",
      },
      propertyMap,
      frontmatter,
    });
    expect(mocks.writePages).toHaveBeenCalledWith([], {
      savePath: "posts",
      storePath: "store",
    });
    expect(output.stdout.write).toHaveBeenCalledWith(
      "✅ Successfully generated blog content\n",
    );
    expect(output.stderr.write).not.toHaveBeenCalled();
  });

  it("writes diagnostics to stderr in verbose mode", async () => {
    mocks.notion.listPages.mockResolvedValue([page("page")]);
    const output = {
      stdout: { write: vi.fn<GenerateOutput["stdout"]["write"]>() },
      stderr: { write: vi.fn<GenerateOutput["stderr"]["write"]>() },
    };

    await generateBlog(
      { notionApiSecret: "secret", databaseId: "database" },
      {
        savePath: "posts",
        storePath: "store",
        layoutPath: "../Layout.astro",
        recursive: true,
        childPageMarker: "⸎",
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
      "Found 1 pages\nSave path: posts\nStore path: store\nLayout path: ../Layout.astro\n",
    );
  });
});
