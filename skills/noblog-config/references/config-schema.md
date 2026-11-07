# Noblog YAML configuration reference

## Precedence and credentials

Generation resolves settings in this order:

```text
built-in defaults < YAML configuration < explicit CLI flags and SAVE_PATH
```

`--config PATH` selects the YAML file. `config check --config PATH` reads and validates only that file; it does not require Notion credentials or access the network.

Credentials belong only in `NOTION_API_SECRET` and `NOBLOG_DATABASE_ID`, supplied through the environment or `.env`. Unknown YAML keys are rejected, and there are no credential fields.

## Output

```yaml
version: 1
output:
  savePath: src/pages/posts/
  storePath: .noblog/pages/
  layoutPath: ../../layouts/MarkdownPostLayout.astro
  recursive: true
  childPageMarker: "⸎"
```

| Key | Default | Meaning |
| --- | --- | --- |
| `savePath` | `./src/pages/posts/` | Receives relative symlinks for database posts. The positional `SAVE_PATH` and YAML key configure it. |
| `storePath` | `.noblog/pages/` | Receives every real Markdown file in a flat page-ID layout. Override with `--store`. |
| `layoutPath` | `../../layouts/MarkdownPostLayout.astro` | Interpreted relative to `savePath`; Noblog writes the equivalent store-relative import. Override with `--layout`. |
| `recursive` | `true` | Collect and render child pages recursively. |
| `childPageMarker` | `⸎` (U+2E0E EDITORIAL CORONIS) | Non-empty prefix added to child-page links. Set it to the marker the theme recognizes. |
| `childPageWrapper` | — | Optional `{ head, tail }` wrapper around child-page links. Overrides `childPageMarker`. Both values must be non-empty single-line strings. |
| `selfiePath` | `public/selfie.md` | Output file for the page named by `--selfie PAGE_TITLE`. Written only when the title matches a database page; otherwise the existing file is left untouched. |

Optional wrapper (overrides `childPageMarker`):

```yaml
output:
  childPageWrapper:
    head: "<noblog-subpage>"
    tail: "</noblog-subpage>"
```

All paths are resolved from the generation working directory. Child pages have no public symlinks. Child-page links are written as `<marker> [title](./<page-id>.md)` or, when configured, `<head>[title](./<page-id>.md)<tail>`. The theme must load and route the canonical store itself when child pages should have routes.

## Notion property mapping

```yaml
notion:
  properties:
    title: Name
    publishedAt: Published
    series: Series
```

Keys are logical sources available to frontmatter fields; values are exact, case-sensitive Notion property names. Custom keys such as `series` must be declared here before `from: series` is valid.

Without explicit mappings, conventional sources use `description`, `tags`, `date`, and `archived`. The title source uses the last Notion title property. Explicit entries override those conventions individually.

Supplying `notion.properties` without `frontmatter.fields` enables the declarative equivalent of the legacy fields: `layout`, `title`, `description`, `tags`, `pubDate`, and `archived`. Explicit `frontmatter.fields` instead emits exactly the declared fields.

## Frontmatter fields

```yaml
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
    draft:
      from: archived
      default: false
    toc:
      value: true
    provider:
      value:
        name: Notion
        options: [canonical, symlinks]
```

Each field must have exactly one source:

- `from`: a built-in source or a key declared under `notion.properties`.
- `value`: a static native YAML value.

Built-in sources are `title`, `description`, `tags`, `publishedAt`, `archived`, `layoutPath`, `pageId`, and `isDatabasePage`.

Modifiers:

- `default`: used when the resolved value is empty.
- `required`: fail generation when the value remains empty after applying the default. Errors include the field and page ID.
- `omitEmpty`: omit an empty value after default/required processing.
- `as: string`: convert a string, number, or boolean to a string. Date-like strings are quoted in output so downstream YAML parsers do not coerce them.
- `as: date`: convert a valid date string or finite number to a YAML timestamp.

Empty means `undefined`, `null`, `""`, or `[]`. `false` and `0` are not empty. Resolution order is source/static value, default, required check, omission, then conversion.

Static values may be strings, finite numbers, booleans, null, arrays, or nested objects. Notion sources normalize to strings, numbers, booleans, string arrays, or undefined; see the property-type reference.

## Schema and validation

The published JSON Schema is `schema/config.json`, also exported as `noblog/config.schema.json`. It is generated from the runtime Zod schema. For a project-local installation, an editor modeline can use:

```yaml
# yaml-language-server: $schema=./node_modules/noblog/schema/config.json
```

The JSON Schema describes structure and types. Runtime validation additionally rejects unknown custom `from` sources that are not built in or declared under `notion.properties`; always finish with `noblog config check`.

## Programmatic escape hatch

Applications can bypass declarative fields by passing a `FrontmatterAdapter` in `RenderOptions`. It receives `{ page, metadata, layoutPath, isDatabasePage }` and returns a plain object. Root `undefined` values are omitted; arrays, null, dates, and class instances are not valid roots. `createFrontmatterAdapter(fields)` exposes the same declarative behavior to library consumers.
