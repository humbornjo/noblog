import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import { runCli } from "../src/app.js";
import { createTestContext } from "./helpers.js";

async function withConfig(
  source: string,
  check: (path: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "noblog-config-test-"));
  const path = join(directory, "noblog.yaml");
  await writeFile(path, source, "utf8");
  try {
    await check(path);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("help and version", () => {
  it.each([
    { inputs: ["--help"] },
    { inputs: ["-h"] },
    { inputs: ["help"] },
    { inputs: ["help", "generate"] },
    { inputs: ["generate", "help"] },
    { inputs: ["posts", "help"] },
  ])(
    "prints root help for $inputs without generating",
    async ({ inputs }) => {
      const { context, generateBlog, stdout, stderr } = createTestContext({});

      await runCli(inputs, context);

      expect(context.process.exitCode).toBe(0);
      expect(stdout()).toContain("USAGE");
      expect(stdout()).toContain("noblog generate");
      expect(stdout()).toContain("NOTION_API_SECRET");
      expect(stderr()).toBe("");
      expect(generateBlog).not.toHaveBeenCalled();
    },
  );

  it.each([
    { inputs: ["--version"] },
    { inputs: ["version"] },
    { inputs: ["generate", "version"] },
    { inputs: ["posts", "version"] },
    { inputs: ["generate", "--version"] },
    { inputs: ["posts", "--version"] },
  ])(
    "prints the package version for $inputs",
    async ({ inputs }) => {
      const { context, generateBlog, stdout, stderr } = createTestContext({});

      await runCli(inputs, context);

      expect(context.process.exitCode).toBe(0);
      expect(stdout()).toBe(`noblog v${packageJson.version}\n`);
      expect(stderr()).toBe("");
      expect(generateBlog).not.toHaveBeenCalled();
    },
  );

  it("prints command-specific help", async () => {
    const { context, generateBlog, stdout } = createTestContext({});

    await runCli(["generate", "--help"], context);

    expect(stdout()).toContain("ARGUMENTS");
    expect(stdout()).toContain("--layout");
    expect(stdout()).not.toContain("ALIASES\n  noblog \n");
    expect(generateBlog).not.toHaveBeenCalled();
  });
});

describe("generate routing and arguments", () => {
  it.each([[[]], [["generate"]]])(
    "uses defaults for %s",
    async (inputs) => {
      const { context, generateBlog } = createTestContext();

      await runCli(inputs, context);

      expect(context.process.exitCode).toBe(0);
      expect(generateBlog).toHaveBeenCalledWith(
        {
          notionApiSecret: "test-secret",
          databaseId: "test-database",
        },
        {
          savePath: "./src/pages/posts/",
          storePath: ".noblog/pages/",
          layoutPath: "../../layouts/MarkdownPostLayout.astro",
          recursive: true,
          childPageMarker: "⸎",
          selfiePath: "public/selfie.md",
          verbose: false,
        },
        context.process,
      );
    },
  );

  it("accepts legacy paths with a warning and interspersed flags", async () => {
    const { context, generateBlog, stderr } = createTestContext();

    await runCli(
      [
        "content/blog",
        "children",
        "--layout",
        "../PostLayout.astro",
        "-v",
      ],
      context,
    );

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      {
        savePath: "content/blog",
        storePath: ".noblog/pages/",
        layoutPath: "../PostLayout.astro",
        recursive: true,
        childPageMarker: "⸎",
        selfiePath: "public/selfie.md",
        verbose: true,
      },
      context.process,
    );
    expect(stderr()).toContain("SUB_PATH is deprecated and ignored");
  });

  it("passes the selfie title and output path through", async () => {
    const { context, generateBlog } = createTestContext();

    await runCli(["--selfie", "humbornjo"], context);

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        selfie: "humbornjo",
        selfiePath: "public/selfie.md",
      }),
      context.process,
    );
  });

  it("accepts a custom canonical page store", async () => {
    const { context, generateBlog } = createTestContext();

    await runCli(["--store", "content/.db"], context);

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ storePath: "content/.db" }),
      context.process,
    );
  });

  it("loads output and frontmatter mappings from YAML", async () => {
    await withConfig(
      `version: 1
notion:
  properties:
    series: Series
output:
  savePath: config/posts
  storePath: config/store
  layoutPath: ../ConfigLayout.astro
  recursive: false
  childPageMarker: "↳"
  childPageWrapper:
    head: "<noblog-subpage>"
    tail: "</noblog-subpage>"
  selfiePath: public/bio.md
frontmatter:
  fields:
    series:
      from: series
      required: true
`,
      async (configPath) => {
        const { context, generateBlog } = createTestContext();

        await runCli(["--config", configPath], context);

        expect(context.process.exitCode).toBe(0);
        expect(generateBlog).toHaveBeenCalledWith(
          expect.any(Object),
          {
            savePath: "config/posts",
            storePath: "config/store",
            layoutPath: "../ConfigLayout.astro",
            recursive: false,
            childPageMarker: "↳",
            childPageWrapper: {
              head: "<noblog-subpage>",
              tail: "</noblog-subpage>",
            },
            selfiePath: "public/bio.md",
            propertyMap: { series: "Series" },
            frontmatter: expect.any(Function),
            verbose: false,
          },
          context.process,
        );
      },
    );
  });

  it("prefers explicit CLI paths over YAML output", async () => {
    await withConfig(
      `version: 1
output:
  savePath: config/posts
  storePath: config/store
  layoutPath: ../ConfigLayout.astro
`,
      async (configPath) => {
        const { context, generateBlog } = createTestContext();

        await runCli(
          [
            "--config",
            configPath,
            "cli/posts",
            "--store",
            "cli/store",
            "--layout",
            "../CliLayout.astro",
          ],
          context,
        );

        expect(generateBlog).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            savePath: "cli/posts",
            storePath: "cli/store",
            layoutPath: "../CliLayout.astro",
          }),
          context.process,
        );
      },
    );
  });

  it("does not treat a config path as a legacy control word", async () => {
    const { context, generateBlog, stdout, stderr } = createTestContext();

    await runCli(["--config", "help"], context);

    expect(context.process.exitCode).toBe(2);
    expect(stdout()).toBe("");
    expect(stderr()).toContain('Cannot read Noblog config "help"');
    expect(generateBlog).not.toHaveBeenCalled();
  });

  it("supports escaped dash-prefixed paths", async () => {
    const { context, generateBlog } = createTestContext();

    await runCli(["--", "-posts", "-children"], context);

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        savePath: "-posts",
      }),
      context.process,
    );
  });

  it("skips legacy generate control words outside the command position", async () => {
    const { context, generateBlog } = createTestContext();

    await runCli(["posts", "generate"], context);

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        savePath: "posts",
      }),
      context.process,
    );
  });

  it.each(["help", "version", "generate"])(
    "treats %s as a layout value rather than a control word",
    async (layoutPath) => {
      const { context, generateBlog, stdout } = createTestContext();

      await runCli(["--layout", layoutPath], context);

      expect(context.process.exitCode).toBe(0);
      expect(generateBlog).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ layoutPath }),
        context.process,
      );
      expect(stdout()).toBe("");
    },
  );

  it.each(["help", "version", "generate"])(
    "treats %s as a store value rather than a control word",
    async (storePath) => {
      const { context, generateBlog, stdout } = createTestContext();

      await runCli(["--store", storePath], context);

      expect(context.process.exitCode).toBe(0);
      expect(generateBlog).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ storePath }),
        context.process,
      );
      expect(stdout()).toBe("");
    },
  );

  it("supports escaped control words as paths", async () => {
    const { context, generateBlog, stdout } = createTestContext();

    await runCli(["--", "help", "version"], context);

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ savePath: "help" }),
      context.process,
    );
    expect(stdout()).toBe("");
  });

  it("supports an escaped version flag as a path", async () => {
    const { context, generateBlog, stdout } = createTestContext();

    await runCli(["--", "--version"], context);

    expect(generateBlog).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ savePath: "--version" }),
      context.process,
    );
    expect(stdout()).toBe("");
  });

  it.each([
    {
      inputs: ["--unknown"],
      message: "No flag registered for --unknown",
    },
    {
      inputs: ["--layout"],
      message: "Expected input for flag --layout",
    },
    {
      inputs: ["--config"],
      message: "Expected input for flag --config",
    },
    {
      inputs: ["--store"],
      message: "Expected input for flag --store",
    },
    {
      inputs: ["one", "two", "three"],
      message: "Too many arguments",
    },
  ])("rejects invalid input $inputs", async ({ inputs, message }) => {
    const { context, generateBlog, stderr } = createTestContext();

    await runCli(inputs, context);

    expect(context.process.exitCode).toBe(2);
    expect(stderr()).toContain(message);
    expect(generateBlog).not.toHaveBeenCalled();
  });
});

describe("config check", () => {
  it("validates YAML without credentials or generation", async () => {
    await withConfig("version: 1\n", async (configPath) => {
      const { context, generateBlog, stdout, stderr } = createTestContext({});

      await runCli(["config", "check", "--config", configPath], context);

      expect(context.process.exitCode).toBe(0);
      expect(stdout()).toBe(`Configuration valid: ${configPath}\n`);
      expect(stderr()).toBe("");
      expect(generateBlog).not.toHaveBeenCalled();
    });
  });

  it.each([
    {
      name: "invalid YAML",
      source: "version: [\n",
      message: "Invalid YAML",
    },
    {
      name: "schema errors",
      source: "version: 2\n",
      message: "Invalid Noblog config",
    },
  ])("reports $name as a usage error", async ({ source, message }) => {
    await withConfig(source, async (configPath) => {
      const { context, generateBlog, stderr } = createTestContext({});

      await runCli(["config", "check", "--config", configPath], context);

      expect(context.process.exitCode).toBe(2);
      expect(stderr()).toContain(message);
      expect(generateBlog).not.toHaveBeenCalled();
    });
  });

  it("reports a missing file without reading credentials", async () => {
    const { context, generateBlog, stderr } = createTestContext({});

    await runCli(
      ["config", "check", "--config", "/definitely/missing/noblog.yaml"],
      context,
    );

    expect(context.process.exitCode).toBe(2);
    expect(stderr()).toContain("file not found");
    expect(stderr()).not.toContain("NOTION_API_SECRET");
    expect(generateBlog).not.toHaveBeenCalled();
  });
});

describe("configuration and failures", () => {
  it("reports all missing credentials as a usage error", async () => {
    const { context, generateBlog, stderr } = createTestContext({});

    await runCli([], context);

    expect(context.process.exitCode).toBe(2);
    expect(stderr()).toContain("NOTION_API_SECRET");
    expect(stderr()).toContain("NOBLOG_DATABASE_ID");
    expect(generateBlog).not.toHaveBeenCalled();
  });

  it("returns a concise runtime error by default", async () => {
    const { context, generateBlog, stderr } = createTestContext();
    generateBlog.mockRejectedValueOnce(new Error("Notion unavailable"));

    await runCli([], context);

    expect(context.process.exitCode).toBe(1);
    expect(stderr()).toContain("Generation failed: Notion unavailable");
    expect(stderr()).not.toContain("    at ");
  });

  it("includes a stack trace in verbose mode", async () => {
    const { context, generateBlog, stderr } = createTestContext();
    generateBlog.mockRejectedValueOnce(new Error("Notion unavailable"));

    await runCli(["-v"], context);

    expect(context.process.exitCode).toBe(1);
    expect(stderr()).toContain("Generation failed: Error: Notion unavailable");
    expect(stderr()).toContain("    at ");
  });

  it("handles non-Error failures", async () => {
    const { context, generateBlog, stderr } = createTestContext();
    generateBlog.mockImplementationOnce(async () => {
      throw "failure";
    });

    await runCli([], context);

    expect(context.process.exitCode).toBe(1);
    expect(stderr()).toContain("an unknown error occurred");
  });
});
