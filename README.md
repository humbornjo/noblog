# 📝 Noblog

> Generate Astro-compatible Markdown from your Notion database.

[![npm version](https://badge.fury.io/js/noblog.svg)](https://badge.fury.io/js/noblog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Noblog fetches published Notion pages, converts their blocks to Markdown, and writes a complete blog structure with Astro frontmatter. Each page lives once in a canonical store. Database posts also receive public symlinks, while child pages are referenced directly in the store. Custom output, store, and layout paths are supported.

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

The CLI loads `.env` automatically. Credentials are validated only when generating content, so `--help`, `--version`, and `config check` do not require them. Keep credentials in environment variables or `.env`; YAML configuration has no credential fields.

## Usage

```text
noblog [generate] [options] [SAVE_PATH] [SUB_PATH]
```

Running `noblog` without arguments immediately generates content with the default settings. It does not print help.

### Commands

| Command | Description |
| --- | --- |
| `noblog` / `noblog generate` | Generate blog content |
| `noblog config check --config PATH` | Validate YAML without credentials or network access |
| `noblog help` | Show general help |
| `noblog version` | Show the installed version |

### Options

| Option | Description |
| --- | --- |
| `-v, --verbose` | Print diagnostics and error stack traces |
| `--config PATH` | Load YAML configuration for generation |
| `--layout PATH` | Set the layout path relative to `SAVE_PATH` |
| `--store PATH` | Set the canonical Markdown store (default: `.noblog/pages/`) |
| `-h, --help` | Show general or command-specific help |
| `--version` | Show the installed version |
| `--` | Treat all remaining inputs as positional paths |

### Positional arguments

| Argument | Default | Description |
| --- | --- | --- |
| `SAVE_PATH` | `./src/pages/posts/` | Public view directory for database posts |
| `SUB_PATH` | — | Deprecated compatibility argument; ignored with a warning |

### Examples

```bash
# Generate with all defaults
noblog

# Equivalent explicit command
noblog generate

# Use a custom layout
noblog --layout ../../layouts/BlogLayout.astro

# Write database-post symlinks to ./content/blog/
noblog ./content/blog/ --layout ../../layouts/CustomLayout.astro

# Store the real Markdown files in a custom canonical store
noblog --store content/.noblog-pages

# Generate using YAML configuration
noblog --config ./noblog.yaml

# Validate configuration without credentials or Notion access
noblog config check --config ./noblog.yaml

# Print diagnostics
noblog generate -v

# Show help for the generate command and its arguments
noblog generate --help
```

## YAML configuration

Pass `--config PATH` to load a versioned YAML file. Configuration is explicit; Noblog does not search for a YAML file automatically. Generation resolves each output setting with this precedence:

```text
built-in defaults < YAML configuration < explicit CLI flags and SAVE_PATH
```

For example, this config adapts output and frontmatter to a theme with a native date, custom Notion properties, and typed boolean/number fields:

```yaml
version: 1
notion:
  properties:
    title: Name
    publishedAt: Published
    series: Series
    sensitive: Sensitive
    top: Top
output:
  savePath: src/pages/posts/
  storePath: .noblog/pages/
  layoutPath: ../../layouts/MarkdownPostLayout.astro
  recursive: true
  childPageMarker: "⸎"
frontmatter:
  fields:
    title:
      from: title
      required: true
    timestamp:
      from: publishedAt
      as: date
      required: true
    series:
      from: series
      omitEmpty: true
    sensitive:
      from: sensitive
      default: false
    top:
      from: top
      default: 0
    toc:
      value: true
```

`output.childPageMarker` sets the prefix on child-page links. It defaults to `⸎` (U+2E0E EDITORIAL CORONIS) and must be a non-empty string. Set it to a marker your theme recognizes.

`output.childPageWrapper` optionally wraps the child-page link instead:

```yaml
output:
  childPageWrapper:
    head: "<noblog-subpage>"
    tail: "</noblog-subpage>"
```

When configured, the wrapper overrides `output.childPageMarker`. Both strings must be non-empty and single-line. The wrapper is emitted as raw content, so use it with an HTML-capable Markdown renderer.

The keys under `notion.properties` are logical source names; their values must exactly match Notion property names. Custom sources such as `series` must be declared there before frontmatter can reference them. Built-in sources need no declaration.

Validate a file without Notion credentials, a Notion client, or network access:

```bash
noblog config check --config ./noblog.yaml
```

The machine-readable JSON Schema is generated from the runtime Zod schema and shipped as `schema/config.json` (package export: `noblog/config.schema.json`). For a local installation, enable editor validation with:

```yaml
# yaml-language-server: $schema=./node_modules/noblog/schema/config.json
```

The schema checks structure and native types. `config check` additionally enforces cross-field rules such as declared custom sources. Invalid YAML, unsupported versions, unknown keys, and invalid field definitions exit with status 2.

A standard Agent Skill is included at [`skills/noblog-config/SKILL.md`](skills/noblog-config/SKILL.md), with detailed references and Nobloger/ThoughtLite examples. Copy that directory into your agent's skills location or point the agent at it. The skill inspects the theme's actual collection schema, frontmatter consumers, and routes before generating YAML; it does not need or request Notion credentials.

## Output structure

With the default paths, Noblog names files by Notion page ID. All real Markdown files are flat in `.noblog/pages/`; database posts also have relative symlinks in `SAVE_PATH`:

```text
project-root/
├── .noblog/
│   └── pages/
│       ├── <database-page-id>.md  # real file
│       └── <child-page-id>.md     # real file
└── src/
    └── pages/
        └── posts/
            └── <database-page-id>.md  # relative symlink
```

Only database posts receive public views. Child pages live exclusively in the canonical store, and child links are written as `<marker> [title](./<child-page-id>.md)`. The marker defaults to `⸎` (U+2E0E EDITORIAL CORONIS) and is configurable with `output.childPageMarker`; set it to match the marker your theme recognizes. Set `output.childPageWrapper` to wrap the link in custom `head`/`tail` strings instead; the wrapper overrides the marker. Links resolve as siblings after Vite/Astro resolves symlinks to real paths, so child pages stay out of `src/pages/posts/*.md` listings. Use `--store PATH` to change the canonical store independently of the public path.

**Routing migration:** Noblog no longer creates `/nob_children/` routes. Configure the theme to load and route child pages from `.noblog/pages/` (or the custom store). Existing nested view files are not deleted; remove or redirect them separately after updating the theme. Existing `SUB_PATH` arguments are ignored with a warning.

Generation is repeatable. Existing regular database-post view files with matching page IDs are replaced by links, and all canonical files are updated. Unrelated files are left unchanged; directories and other non-file outputs are not replaced.

The store and views must remain together when building or deploying. If generated content is committed, include both; otherwise regenerate before building. Creating the views requires filesystem symlink support. On Windows, this may require Developer Mode or elevated privileges.

## Frontmatter

Without custom Notion or frontmatter mappings, generated files retain the legacy Astro-compatible frontmatter:

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

When `frontmatter.fields` is present, it defines the complete output field set; legacy fields are not implicitly added. When only `notion.properties` is present, Noblog uses the declarative equivalent of the legacy fields (`layout`, `title`, `description`, `tags`, `pubDate`, and `archived`) with the configured property names.

Every custom field has exactly one of:

- `from`: read a built-in source or a key declared under `notion.properties`.
- `value`: emit a static native string, finite number, boolean, null, array, or nested object.

Built-in sources are `title`, `description`, `tags`, `publishedAt`, `archived`, `layoutPath`, `pageId`, and `isDatabasePage`. Without explicit property mappings, the conventional Notion names are `description`, `tags`, `date`, and `archived`; title comes from the last Notion title property.

Field behavior can be refined with:

| Directive | Behavior |
| --- | --- |
| `default` | Use this value when the source is empty |
| `required` | Fail generation if the value remains empty after defaults; errors include the field and page ID |
| `omitEmpty` | Omit an empty value after default/required processing |
| `as: string` | Convert a string, number, or boolean to a string; date-like strings remain quoted |
| `as: date` | Convert a valid date string or finite number to an unquoted YAML timestamp |

Empty means `undefined`, `null`, `""`, or `[]`; `false` and `0` are preserved. Processing order is source/static value, default, required check, omission, then conversion.

Notion values are normalized according to their actual property types. Text, select/status, dates, URLs, times, users, and unique IDs become strings; checkboxes and numeric properties remain native; multi-selects, people, relations, and files become string arrays. Formula results follow their own value type. Unsupported or missing properties become `undefined`, so defaults and omission rules apply. See the [property-type reference](skills/noblog-config/references/notion-property-types.md) for the complete table.

This makes native theme schemas possible without stringly-typed frontmatter: `as: string` can produce `pubDate: "2024-01-24"`, while `as: date` produces `timestamp: 2024-01-24`, and booleans/numbers remain unquoted unless conversion is requested.

Vite and Astro resolve Markdown symlinks to their real paths, so layout imports must be relative to the canonical store. The CLI interprets `--layout` relative to `SAVE_PATH`, then writes the equivalent store-relative path for every page.

## Programmatic API

The package exposes a reusable renderer and filesystem writer. The optional Notion adapter is configured explicitly; importing `noblog` has no environment or network side effects.

```ts
import {
  createNotionSource,
  renderPages,
  resolveStoreLayoutPath,
  writePages,
} from "noblog";

const notionApiSecret = process.env["NOTION_API_SECRET"];
const databaseId = process.env["NOBLOG_DATABASE_ID"];
if (!notionApiSecret || !databaseId) {
  throw new Error("Notion credentials are required");
}

const notion = createNotionSource({ notionApiSecret, databaseId });

const savePath = "./content/blog/";
const storePath = ".noblog/pages/";
const layoutPath = resolveStoreLayoutPath({
  savePath,
  storePath,
  layoutPath: "../../layouts/MarkdownPostLayout.astro",
});

const posts = await notion.listPages();
const pages = await renderPages(posts, notion, { layoutPath });

await writePages(pages, { savePath, storePath });
```

`renderPages` recursively collects child pages by default and returns complete Markdown documents with frontmatter. Set `recursive: false` to render only the supplied database pages. Set `childPageMarker` in `RenderOptions` to override the default `⸎` (U+2E0E EDITORIAL CORONIS) prefix used for child-page links. Set `childPageWrapper` to `{ head, tail }` to wrap the link instead; it overrides `childPageMarker`. `writePages` writes every canonical file but returns only the public database-post view paths. When rendering for a canonical store, use `resolveStoreLayoutPath` as above so layout imports remain valid after symlink resolution.

Use `renderPage` for a single page, or supply any implementation of the `NotionReader` interface instead of the built-in adapter. Lower-level helpers such as `renderRichText` and `renderFrontmatter` are exported as well. To customize a block, pass a `transformers` map in `RenderOptions`; return a string to override the default renderer or `undefined` to fall back to it. Each key narrows its handler's block payload to the corresponding Notion block type, so a `paragraph` transformer can access `block.paragraph` directly. The programmatic API does not load `.env`; load environment variables yourself or pass explicit configuration.

The same declarative mapping is available programmatically, or you can provide a `FrontmatterAdapter` function for full control:

```ts
import { createFrontmatterAdapter, renderPages } from "noblog";

const frontmatter = createFrontmatterAdapter({
  title: { from: "title", required: true },
  timestamp: { from: "publishedAt", as: "date" },
  draft: { from: "archived", default: false },
});

const pages = await renderPages(posts, notion, {
  layoutPath,
  propertyMap: { publishedAt: "Published" },
  frontmatter,
});
```

An adapter receives `{ page, metadata, layoutPath, isDatabasePage }` and returns a plain object. It can use the raw Notion page or normalized metadata, and root `undefined` values are omitted. Values follow the exported `FrontmatterValue` contract: strings, numbers, booleans, `null`, `Date`, and readonly arrays/objects containing those values. Arrays, null, dates, and class instances are rejected as adapter roots.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Help, version, successful validation, or successful generation |
| `1` | Generation or unexpected runtime failure |
| `2` | Invalid arguments, YAML, or configuration |

## Development

Noblog uses [Stricli](https://bloomberg.github.io/stricli/) for typed command routing, [tsdown](https://tsdown.dev/) for CLI/library builds, and [Vitest](https://vitest.dev/) for tests.

```bash
pnpm install

# Run the TypeScript CLI directly
pnpm dev --help

# Run unit tests and type checking
pnpm test
pnpm typecheck

# Regenerate the published JSON Schema (also runs during build)
pnpm schema:generate

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
├── config-file.ts            # YAML loading and validation
├── commands/
│   ├── config*.ts            # Offline configuration validation
│   ├── generate.ts           # Declarative arguments and documentation
│   └── generate.impl.ts      # Lazy-loaded command action
├── workflows/
│   └── generate.ts           # CLI-oriented generation orchestration
└── lib/
    ├── noblog/               # Reusable rendering and file-writing package
    │   ├── config.ts         # Runtime YAML schema and types
    │   ├── metadata.ts       # Notion property normalization
    │   ├── frontmatter-fields.ts # Declarative frontmatter adapter
    │   ├── pages.ts          # Page collection, caching, and recursion
    │   ├── blocks.ts         # Notion block-tree loading and rendering
    │   ├── rich-text.ts      # Rich-text annotations and links
    │   ├── markdown.ts       # Markdown formatting primitives
    │   ├── frontmatter.ts    # Legacy/custom frontmatter serialization
    │   └── writer.ts         # Canonical store and database-post symlinks
    └── notion/client.ts      # Explicit Notion SDK adapter
schema/config.json            # Generated JSON Schema
skills/noblog-config/         # Agent Skill, references, and examples
```

## Acknowledgments

- [Notion API](https://developers.notion.com/reference/intro) and [Notion SDK](https://github.com/makenotion/notion-sdk-js)
- [notion-to-md](https://github.com/souvikinator/notion-to-md)
- [notablog](https://github.com/dragonman225/notablog)
- [astro-notion-blog](https://github.com/otoyo/astro-notion-blog)
- [nobloger](https://github.com/humbornjo/nobloger), a starter Astro template
