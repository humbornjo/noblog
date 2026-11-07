# Theme examples

These examples are snapshots, not substitutes for inspecting the installed theme. The assets contain complete YAML starting points.

Child-page links are prefixed by `output.childPageMarker`, which defaults to `⸎` (U+2E0E EDITORIAL CORONIS). Set it to the marker the theme recognizes. If the theme expects a wrapper element, configure `output.childPageWrapper` with `head` and `tail`; it overrides the marker.

## Nobloger

Evidence inspected: `src/layouts/MarkdownPostLayout.astro` and `src/pages/blog/index.astro` in [humbornjo/nobloger](https://github.com/humbornjo/nobloger).

Nobloger uses file-based Markdown routes and `Astro.glob("@/pages/posts/*.md")`. Its layout/list contract uses required `title` and string `pubDate`, plus `tags` and optional `description`. Therefore [`assets/nobloger.yaml`](../assets/nobloger.yaml):

- keeps database-post symlinks in `src/pages/posts/` for existing routes;
- stores all real files in `.noblog/pages/`;
- emits `layout` and a quoted string `pubDate`;
- omits empty descriptions and does not invent fields from other themes.

The existing glob does not list child pages in the hidden store. A theme route must explicitly load that store to expose children. Noblog does not recreate the removed `nob_children` routes.

When the Nobloger site renders `frontmatter.author` in its footer, the author's build can pass `--selfie humbornjo` so the bio page from the author's database is written to `output.selfiePath` with `author` set to the page title. Other builds, and builds with no matching title, keep the committed `public/selfie.md` sample.

## ThoughtLite

Evidence inspected: `src/content.config.ts` in [tuyuritio/astro-theme-thought-lite](https://github.com/tuyuritio/astro-theme-thought-lite). Its `note` collection loads `./src/content/note/**/*.md` and validates `title`, native date `timestamp`, optional `series`, `tags`, `description`, and native `sensitive`, `toc`, `top`, and `draft` controls.

[`assets/thought-lite.yaml`](../assets/thought-lite.yaml):

- puts the canonical store directly at `src/content/note/`, where the collection can load root and child pages;
- keeps required database-post symlinks in `.noblog/note-links/`, separate from collection input;
- uses `as: date` for `timestamp` and native booleans/numbers elsewhere;
- maps `archived` to `draft` as an explicit policy choice, not a universal Notion convention;
- uses static `toc: true` to demonstrate a theme-level constant;
- emits no Markdown `layout`, because this collection schema does not declare one.

Before using it, confirm that the installed version has the same collection glob and fields, and decide whether archived Notion pages should really become drafts. Also confirm `Sensitive`, `Series`, and `Top` exist with those exact names or change the mappings.

## Adapting another theme

1. Copy no asset until its schema and routing evidence match.
2. For file-based routes, keep public views in the routed directory and arrange separate store loading for children.
3. For a content collection, point `storePath` at the collection input only when all generated pages should belong to that collection. Keep `savePath` distinct; Noblog cannot create a symlink onto its own canonical file.
4. Match native schema types. Use `as: date` for date schemas, and avoid stringifying booleans or numbers unless consumers explicitly require strings.
5. Validate the final file with `noblog config check --config PATH` and report any remaining route work.
