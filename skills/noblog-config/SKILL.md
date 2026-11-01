---
name: noblog-config
description: Generate, migrate, or validate Noblog YAML configuration by inspecting a site's actual content schema, frontmatter types, Notion property names, and routes. Use when adapting Noblog to an Astro or other Markdown theme, creating frontmatter mappings, choosing savePath/storePath, or debugging noblog config check errors.
---

# Noblog configuration

Create a `version: 1` Noblog YAML file that matches the installed theme, not a generic blog template.

## Workflow

1. **Locate the site and existing configuration.** Identify the framework, package manager, content directories, route files, and any existing Noblog YAML. Read an existing config before changing it. Do not read or print `.env` values.
2. **Inspect the real content contract.** Read collection schemas, Zod/Valibot/TypeScript frontmatter definitions, Markdown layouts, and the code that lists or routes content. For Astro, check both `src/content.config.ts` and `src/content/config.ts`, plus `Astro.glob` or dynamic collection routes. A layout alone is not proof of validation rules.
3. **Record the contract before writing YAML.** Note required and optional fields, native types, defaults, date handling, collection glob patterns, and which directories produce routes. Distinguish file-based Markdown routes from content collections.
4. **Confirm Notion property names.** Use names supplied by the user or visible in existing configuration/code. Do not invent custom properties or request credentials. Map logical sources to exact Notion names under `notion.properties`.
5. **Choose output paths with routing in mind.** `savePath` receives database-post symlinks; `storePath` receives every real Markdown file, including children. Child links target `./<page-id>.md` inside the store and are prefixed by `output.childPageMarker` (default `⸎`, U+2E0E EDITORIAL CORONIS); set it if the theme expects a specific marker. Ensure the theme actually loads/routes the store if child pages must be public. Noblog does not create `nob_children` routes or remove old nested views.
6. **Write only the fields the theme consumes.** Custom `frontmatter.fields` replaces the legacy field set. Use exactly one of `from` or `value` per field. Keep booleans, numbers, arrays, and objects native unless the theme requires strings.
7. **Validate without generating.** Run:

   ```sh
   noblog config check --config ./noblog.yaml
   ```

   Fix schema and unknown-source errors. Do not run generation merely to validate: generation calls Notion and writes files.

Read [the configuration reference](references/config-schema.md) before writing mappings. Use [Notion property types](references/notion-property-types.md) for custom sources and [theme examples](references/theme-examples.md) when one matches the inspected site.

## Safety and compatibility

- Keep `NOTION_API_SECRET` and `NOBLOG_DATABASE_ID` in environment variables or `.env`; never put credentials in YAML, logs, patches, or examples.
- Do not overwrite an existing config without inspecting it and preserving intentional settings.
- Do not modify theme routes or delete legacy files unless the user asks. Report any routing changes the theme still needs.
- Explicit CLI paths override YAML; built-in defaults apply only when neither is present.
- The legacy `SUB_PATH` argument is ignored. Do not add `subPath` to YAML.
- Assets in `assets/` are starting points, not universal presets. Re-check them against the installed theme version before copying.
- If no explicit schema exists, infer conservatively from all consumers and label assumptions in the final summary.

## Completion report

Summarize the config path, schema evidence used, Notion mappings, output/routing implications, and `config check` result. Call out unresolved property names or theme changes instead of hiding them in defaults.
