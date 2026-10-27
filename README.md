# 📝 Noblog

> Generate Astro-compatible Markdown from your Notion database.

[![npm version](https://badge.fury.io/js/noblog.svg)](https://badge.fury.io/js/noblog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Noblog fetches published Notion pages, converts their blocks to Markdown, and writes a complete blog structure with Astro frontmatter. Each page lives once in a canonical store, with symlinks at its public root or nested path. Custom output, store, and layout paths are supported.

The renderer includes logic derived from [notion-to-md](https://github.com/souvikinator/notion-to-md), with additional handling for nested formatting and blog generation.

## Requirements

- Node.js 24 or newer
- A Notion integration with read access to your database
- A Notion database with `publish` and `date` properties

## Installation

```bash
npm install -g noblog
```

For use as a library in another package:

```bash
npm install noblog
```

## Configuration

Set the following environment variables in your shell or in a `.env` file in the directory where you run `noblog`:

```bash
NOTION_API_SECRET="your-notion-api-secret"
NOBLOG_DATABASE_ID="your-notion-database-id"
```

The CLI loads `.env` automatically. Credentials are validated only when generating content, so `--help` and `--version` do not require them.

## Usage

```text
noblog [generate] [options] [SAVE_PATH] [SUB_PATH]
```

Running `noblog` without arguments immediately generates content with the default settings. It does not print help.

### Commands

| Command | Description |
| --- | --- |
| `noblog` / `noblog generate` | Generate blog content |
| `noblog help` | Show general help |
| `noblog version` | Show the installed version |

### Options

| Option | Description |
| --- | --- |
| `-v, --verbose` | Print diagnostics and error stack traces |
| `--layout PATH` | Set the layout path relative to `SAVE_PATH` |
| `--store PATH` | Set the canonical Markdown store (default: `.noblog/pages/`) |
| `-h, --help` | Show general or command-specific help |
| `--version` | Show the installed version |
| `--` | Treat all remaining inputs as positional paths |

### Positional arguments

| Argument | Default | Description |
| --- | --- | --- |
| `SAVE_PATH` | `./src/pages/posts/` | Public view directory for database posts |
| `SUB_PATH` | `nob_children/` | Subdirectory **inside `SAVE_PATH`** for nested-page views |

### Examples

```bash
# Generate with all defaults
noblog

# Equivalent explicit command
noblog generate

# Use a custom layout
noblog --layout ../../layouts/BlogLayout.astro

# Write database posts to ./content/blog/ and nested pages
# to ./content/blog/subpages/
noblog ./content/blog/ subpages/ --layout ../../layouts/CustomLayout.astro

# Store the real Markdown files in a custom canonical store
noblog --store content/.noblog-pages

# Print diagnostics
noblog generate -v

# Show help for the generate command and its arguments
noblog generate --help
```

## Output structure

With the default paths, Noblog names files by Notion page ID. All real Markdown files are flat in `.noblog/pages/`; the public paths are relative symlinks:

```text
project-root/
├── .noblog/
│   └── pages/
│       ├── <database-page-id>.md    # real file
│       └── <nested-page-id>.md      # real file
└── src/
    └── pages/
        └── posts/
            ├── <database-page-id>.md    # relative symlink
            └── nob_children/
                └── <nested-page-id>.md  # relative symlink
```

The public views preserve existing URLs while keeping nested pages out of `src/pages/posts/*.md` listings. Use `--store PATH` to change the canonical store independently of the public paths.

Generation is repeatable. Existing regular view files with matching page IDs are replaced by links, and their canonical files are updated. Unrelated files are left unchanged; directories and other non-file outputs are not replaced.

The store and views must remain together when building or deploying. If generated content is committed, include both; otherwise regenerate before building. Creating the views requires filesystem symlink support. On Windows, this may require Developer Mode or elevated privileges.

## Frontmatter

Generated files include Astro-compatible frontmatter:

```yaml
---
layout: ../../src/layouts/MarkdownPostLayout.astro
title: "Your Blog Post Title"
description: "Your post description here"
tags: ["tag1", "tag2", "tag3"]
pubDate: "2024-01-24"
archived: "false"
---
```

Vite and Astro resolve Markdown symlinks to their real paths, so layout imports must be relative to the canonical store. The CLI interprets `--layout` relative to `SAVE_PATH`, then writes the equivalent store-relative path for both root and nested pages.

## Programmatic API

The package exposes a reusable renderer and filesystem writer. The optional Notion adapter is configured explicitly; importing `noblog` has no environment or network side effects.

```ts
import {
  createNotionSource,
  renderPages,
  resolveStoreLayoutPath,
  writePages,
} from "noblog";

const notion = createNotionSource({
  notionApiSecret: process.env.NOTION_API_SECRET!,
  databaseId: process.env.NOBLOG_DATABASE_ID!,
});

const savePath = "./content/blog/";
const storePath = ".noblog/pages/";
const subPath = "subpages/";
const layoutPath = resolveStoreLayoutPath({
  savePath,
  storePath,
  layoutPath: "../../layouts/MarkdownPostLayout.astro",
});

const posts = await notion.listPages();
const pages = await renderPages(posts, notion, {
  layoutPath,
  nestedLayoutPath: layoutPath,
  subPath,
});

await writePages(pages, { savePath, storePath, subPath });
```

`renderPages` recursively collects child pages by default and returns complete Markdown documents with frontmatter. Set `recursive: false` to render only the supplied database pages. `writePages` writes the canonical files and returns their consumer-visible view paths. When rendering for a canonical store, use `resolveStoreLayoutPath` and pass the result as both `layoutPath` and `nestedLayoutPath`, as above; this keeps layout imports valid after symlink resolution.

Use `renderPage` for a single page, or supply any implementation of the `NotionReader` interface instead of the built-in adapter. Lower-level helpers such as `renderRichText` and `renderFrontmatter` are exported as well. To customize a block, pass a `transformers` map in `RenderOptions`; return a string to override the default renderer or `undefined` to fall back to it. The programmatic API does not load `.env`; load environment variables yourself or pass explicit configuration.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Help, version, or successful generation |
| `1` | Generation or unexpected runtime failure |
| `2` | Invalid arguments or missing configuration |

## Development

Noblog uses [Stricli](https://bloomberg.github.io/stricli/) for typed command routing, [tsdown](https://tsdown.dev/) for CLI/library builds, and [Vitest](https://vitest.dev/) for tests.

```bash
pnpm install

# Run the TypeScript CLI directly
pnpm dev --help

# Run unit tests and type checking
pnpm test
pnpm typecheck

# Build and smoke-test the actual dist artifacts
pnpm test:built

# Run the complete verification suite
pnpm check
```

### Project structure

```text
src/
├── cli.ts                    # Process entry
├── main.ts                   # Dotenv loading and dependency composition
├── app.ts                    # Routes, help/version, and exit handling
├── commands/
│   ├── generate.ts           # Declarative arguments and documentation
│   └── generate.impl.ts      # Lazy-loaded command action
├── workflows/
│   └── generate.ts           # CLI-oriented generation orchestration
└── lib/
    ├── noblog/               # Reusable rendering and file-writing package
    │   ├── pages.ts          # Page collection, caching, and recursion
    │   ├── blocks.ts         # Notion block-tree loading and rendering
    │   ├── rich-text.ts      # Rich-text annotations and links
    │   ├── markdown.ts       # Markdown formatting primitives
    │   ├── frontmatter.ts    # Astro frontmatter
    │   └── writer.ts         # Canonical store and symlink views
    └── notion/client.ts      # Explicit Notion SDK adapter
```

## Acknowledgments

- [Notion API](https://developers.notion.com/reference/intro) and [Notion SDK](https://github.com/makenotion/notion-sdk-js)
- [notion-to-md](https://github.com/souvikinator/notion-to-md)
- [notablog](https://github.com/dragonman225/notablog)
- [astro-notion-blog](https://github.com/otoyo/astro-notion-blog)
- [nobloger](https://github.com/humbornjo/nobloger), a starter Astro template
