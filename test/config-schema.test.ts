import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";
import { noblogConfigSchema } from "../src/lib/noblog/config.js";

describe("Noblog YAML config schema", () => {
  it("accepts a minimal versioned config", () => {
    expect(noblogConfigSchema.safeParse({ version: 1 }).success).toBe(true);
  });

  it("accepts output, custom Notion properties, and native field values", () => {
    const result = noblogConfigSchema.safeParse({
      version: 1,
      notion: {
        properties: {
          title: "Name",
          publishedAt: "date",
          series: "Series",
          sensitive: "Sensitive",
          top: "Priority",
        },
      },
      output: {
        savePath: "src/content/note/",
        storePath: ".noblog/pages/",
        layoutPath: "../../layouts/Note.astro",
        recursive: false,
      },
      frontmatter: {
        fields: {
          title: { from: "title", required: true },
          timestamp: { from: "publishedAt", as: "date" },
          series: { from: "series", omitEmpty: true },
          sensitive: { from: "sensitive", default: false },
          toc: { value: true },
          top: { from: "top", default: 0 },
          extra: { value: { nested: [1, "two", false, null] } },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it.each([
    { name: "missing version", input: {} },
    { name: "unsupported version", input: { version: 2 } },
    {
      name: "unknown output option",
      input: { version: 1, output: { subPath: "children" } },
    },
    {
      name: "both field sources",
      input: {
        version: 1,
        frontmatter: {
          fields: { title: { from: "title", value: "Static" } },
        },
      },
    },
    {
      name: "missing field source",
      input: {
        version: 1,
        frontmatter: { fields: { title: { required: true } } },
      },
    },
    {
      name: "undeclared custom source",
      input: {
        version: 1,
        frontmatter: { fields: { series: { from: "series" } } },
      },
    },
    {
      name: "invalid conversion",
      input: {
        version: 1,
        frontmatter: {
          fields: { pubDate: { from: "publishedAt", as: "number" } },
        },
      },
    },
  ])("rejects $name", ({ input }) => {
    expect(noblogConfigSchema.safeParse(input).success).toBe(false);
  });

  it.each(["nobloger", "thought-lite"])(
    "ships a valid %s skill example",
    async (name) => {
      const source = await readFile(
        new URL(
          `../skills/noblog-config/assets/${name}.yaml`,
          import.meta.url,
        ),
        "utf8",
      );

      expect(noblogConfigSchema.safeParse(parse(source)).success).toBe(true);
    },
  );

  it("keeps the published JSON Schema in sync with the runtime schema", async () => {
    const published = JSON.parse(
      await readFile(new URL("../schema/config.json", import.meta.url), "utf8"),
    );

    expect(published).toEqual(
      z.toJSONSchema(noblogConfigSchema, { target: "draft-2020-12" }),
    );
  });
});
