import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findSelfiePage,
  relativizeStoreLinks,
  upsertFrontmatterAuthor,
} from "../src/lib/noblog/selfie.js";
import { writeSelfie } from "../src/lib/noblog/writer.js";
import { page, text } from "./fixtures.js";

function titledPage(id: string, title: string) {
  return page(id, {
    Name: { id: "title", type: "title", title: [text(title)] },
  });
}

describe("findSelfiePage", () => {
  it("finds the post whose title matches exactly", () => {
    const posts = [titledPage("one", "Hello"), titledPage("two", "humbornjo")];

    const match = findSelfiePage(posts, "humbornjo");

    expect(match?.page.id).toBe("two");
    expect(match?.title).toBe("humbornjo");
  });

  it("matches trimmed titles on both sides", () => {
    const posts = [titledPage("one", "  padded  ")];

    expect(findSelfiePage(posts, "padded")?.page.id).toBe("one");
  });

  it("returns undefined when no title matches", () => {
    const posts = [titledPage("one", "Hello")];

    expect(findSelfiePage(posts, "missing")).toBeUndefined();
  });

  it("honors an explicit title property mapping", () => {
    const posts = [
      page("one", {
        Name: { id: "title", type: "title", title: [text("Ignored")] },
        Bio: { id: "bio", type: "title", title: [text("humbornjo")] },
      }),
    ];

    const match = findSelfiePage(posts, "humbornjo", { title: "Bio" });

    expect(match?.title).toBe("humbornjo");
  });
});

describe("upsertFrontmatterAuthor", () => {
  it("inserts author as the first frontmatter key", () => {
    const content =
      '---\nlayout: ../../layouts/Bio.astro\ntitle: "humbornjo"\n---\nBio body\n';

    expect(upsertFrontmatterAuthor(content, "humbornjo")).toBe(
      '---\nauthor: "humbornjo"\nlayout: ../../layouts/Bio.astro\ntitle: "humbornjo"\n---\nBio body\n',
    );
  });

  it("replaces an existing top-level author key", () => {
    const content =
      '---\nlayout: x\ntitle: "humbornjo"\nauthor: "stale"\n---\nBody\n';

    const result = upsertFrontmatterAuthor(content, "humbornjo");

    expect(result).toBe(
      '---\nauthor: "humbornjo"\nlayout: x\ntitle: "humbornjo"\n---\nBody\n',
    );
  });

  it("leaves indented author-like lines inside nested values alone", () => {
    const content =
      '---\ntitle: "humbornjo"\nmeta:\n  author: nested\n---\nBody\n';

    const result = upsertFrontmatterAuthor(content, "humbornjo");

    expect(result).toContain("  author: nested");
    expect(result).toContain('author: "humbornjo"');
  });

  it("handles empty frontmatter", () => {
    expect(upsertFrontmatterAuthor("---\n---\nBody\n", "humbornjo")).toBe(
      '---\nauthor: "humbornjo"\n---\nBody\n',
    );
  });

  it("prepends a frontmatter block to documents without one", () => {
    expect(upsertFrontmatterAuthor("# Body\n", "humbornjo")).toBe(
      '---\nauthor: "humbornjo"\n---\n# Body\n',
    );
  });
});

describe("relativizeStoreLinks", () => {
  const childId = "3ce6b0cb-98ec-4af7-a6b6-6a50a7b4e0e1";

  it("rewrites child links for a selfie next to the store directory", () => {
    const content = `Body\n\n⸎ [Child](./${childId}.md)\n`;

    expect(
      relativizeStoreLinks(content, ".noblog/selfie.md", ".noblog/pages"),
    ).toBe(`Body\n\n⸎ [Child](./pages/${childId}.md)\n`);
  });

  it("rewrites wrapped child links", () => {
    const content = `<sub>[Child](./${childId}.md)</sub>\n`;

    expect(
      relativizeStoreLinks(content, ".noblog/selfie.md", ".noblog/pages"),
    ).toBe(`<sub>[Child](./pages/${childId}.md)</sub>\n`);
  });

  it("leaves links unchanged when the selfie sits in the store directory", () => {
    const content = `⸎ [Child](./${childId}.md)\n`;

    expect(
      relativizeStoreLinks(content, ".noblog/pages/selfie.md", ".noblog/pages"),
    ).toBe(content);
  });

  it("resolves custom store and selfie paths", () => {
    const content = `⸎ [Child](./${childId}.md)\n`;

    expect(
      relativizeStoreLinks(content, "public/selfie.md", "content/.db"),
    ).toBe(`⸎ [Child](./../content/.db/${childId}.md)\n`);
  });

  it("leaves non-store relative links and absolute links untouched", () => {
    const content =
      `[asset](./image.png)\n[uuid-asset](./${childId}.png)\n[web](https://example.com/${childId}.md)\n`;

    expect(
      relativizeStoreLinks(content, ".noblog/selfie.md", ".noblog/pages"),
    ).toBe(content);
  });
});

describe("writeSelfie", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "noblog-selfie-test-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("writes content and creates missing directories", async () => {
    const target = join(directory, "public", "selfie.md");

    const written = await writeSelfie("content", target);

    expect(written).toBe(target);
    expect(await readFile(target, "utf8")).toBe("content");
  });

  it("overwrites an existing file", async () => {
    const target = join(directory, "selfie.md");

    await writeSelfie("old", target);
    await writeSelfie("new", target);

    expect(await readFile(target, "utf8")).toBe("new");
  });
});
