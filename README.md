# 📝 Noblog

> Generate Astro-compatible Markdown from your Notion database.

[![npm version](https://badge.fury.io/js/noblog.svg)](https://badge.fury.io/js/noblog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Noblog fetches published Notion pages, converts their blocks to Markdown, and writes a complete blog structure with Astro frontmatter. It supports nested pages, custom output paths, and custom layout paths.

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
| `--layout PATH` | Set the layout path in generated frontmatter |
| `-h, --help` | Show general or command-specific help |
| `--version` | Show the installed version |
| `--` | Treat all remaining inputs as positional paths |

### Positional arguments

| Argument | Default | Description |
| --- | --- | --- |
| `SAVE_PATH` | `./src/pages/posts/` | Directory for database posts |
| `SUB_PATH` | `nob_children/` | Subdirectory **inside `SAVE_PATH`** for nested pages |

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

# Print diagnostics
noblog generate -v

# Show help for the generate command and its arguments
noblog generate --help
```

## Output structure

With the default paths, Noblog writes files named by Notion page ID:

```text
project-root/
└── src/
    └── pages/
        └── posts/
            ├── <database-page-id>.md
            └── nob_children/
                └── <nested-page-id>.md
```

Existing files with the same page IDs are overwritten. Other files in the output directories are left unchanged.

## Frontmatter

Generated files include Astro-compatible frontmatter:

```yaml
---
layout: ../../layouts/MarkdownPostLayout.astro
title: "Your Blog Post Title"
description: "Your post description here"
tags: ["tag1", "tag2", "tag3"]
pubDate: "2024-01-24"
archived: "false"
---
```

Nested pages receive a `../` prefix on their configured layout path.

## Programmatic API

The package exposes a reusable renderer and filesystem writer. The optional Notion adapter is configured explicitly; importing `noblog` has no environment or network side effects.

```ts
import {
  createNotionSource,
  renderPages,
  writePages,
} from "noblog";

const notion = createNotionSource({
  notionApiSecret: process.env.NOTION_API_SECRET!,
  databaseId: process.env.NOBLOG_DATABASE_ID!,
});

const posts = await notion.listPages();
const pages = await renderPages(posts, notion, {
  layoutPath: "../../layouts/MarkdownPostLayout.astro",
  subPath: "subpages/",
});

await writePages(pages, {
  savePath: "./content/blog/",
  subPath: "subpages/",
});
```

`renderPages` recursively collects child pages by default and returns complete Markdown documents with frontmatter. Set `recursive: false` to render only the supplied database pages. `writePages` returns the paths it wrote.

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
    │   └── writer.ts         # Filesystem output
    └── notion/client.ts      # Explicit Notion SDK adapter
```

## Acknowledgments

- [Notion API](https://developers.notion.com/reference/intro) and [Notion SDK](https://github.com/makenotion/notion-sdk-js)
- [notion-to-md](https://github.com/souvikinator/notion-to-md)
- [notablog](https://github.com/dragonman225/notablog)
- [astro-notion-blog](https://github.com/otoyo/astro-notion-blog)
- [nobloger](https://github.com/humbornjo/nobloger), a starter Astro template
