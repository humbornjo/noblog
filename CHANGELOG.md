# Changelog

All notable changes to `noblog` are documented in this file.

## [0.3.0-beta.1] - 2026-11-01

This beta contains breaking changes to the generated output layout and the
programmatic API. Test it against a copy of a site before upgrading.

### Breaking changes

- **Flat canonical page store.** Real Markdown files are written only to a
  canonical store (`.noblog/pages/` by default, or `--store` /
  `output.storePath`). Each database post also gets a relative symlink at
  `SAVE_PATH/<page-id>.md`; child pages get no public view. Child links target
  `./<page-id>.md` and resolve as siblings in the store.
- **No generated child routes.** `nob_children` routes and nested child views
  are no longer produced. Existing nested files are not deleted. Themes must
  load and route the canonical store themselves.
- **Sub-path options removed.** `SUB_PATH` is accepted only as a deprecated,
  ignored positional argument (with a warning). `DEFAULT_SUB_PATH`, `subPath`,
  and `nestedLayoutPath` were removed.
- **Programmatic API reorganized.** The `Noblog` class and the old helper
  exports were removed. Use `createNotionSource`, `renderPage`/`renderPages`,
  `writePages`, and `resolveStoreLayoutPath`. Importing `noblog` no longer
  loads `.env`, mutates the environment, or performs network access.
- **`-v` means verbose.** Use `version` or `--version` for the installed
  version.

### Added

- YAML configuration via `--config` for output paths, Notion property names,
  recursion, and frontmatter. Precedence is built-in defaults < YAML < explicit
  CLI flags and positional paths.
- `noblog config check --config PATH` validates configuration without Notion
  credentials or network access.
- Declarative frontmatter fields supporting `from` or `value`, `as`, `default`,
  `omitEmpty`, and `required`, with native Notion value normalization. The
  programmatic `FrontmatterAdapter` remains available.
- Published JSON Schema at `noblog/config.schema.json`, generated from the
  runtime schema.
- `skills/noblog-config/`, an Agent Skill with configuration references and
  theme examples.
- Typed block transformers: each key narrows the handler payload to the
  corresponding Notion block type.
- `help`, `version`, `--help`, and `--version` commands that work without
  credentials.

### Changed

- The CLI is now built on Stricli with lazy command loading, typed flags and
  positionals, and documented exit codes (`0` success, `1` runtime failure,
  `2` usage or configuration error).
- `noblog` with no arguments still generates with defaults; `noblog generate`
  and the legacy positional `SAVE_PATH` remain supported.
- `--` allows control words and dash-prefixed strings to be used as paths.
- Generation is repeatable. Unchanged view symlinks are reused and changed
  views are replaced atomically. Existing regular database-post view files with
  matching page IDs are replaced by links; unrelated files are left unchanged,
  and directories are never replaced.
- The package publishes `schema/` and `skills/` in addition to `dist/`, with an
  explicit exports map.
- The frontmatter and block-rendering types now expose
  `FrontmatterValue`/`FrontmatterRecord` and keyed transformer contracts.

### Fixed

- Legacy control words and flag values are no longer misinterpreted as paths.
- Frontmatter serialization uses YAML 1.1 semantics so date-like strings and
  dates round-trip correctly.
- Configuration and runtime failures now report distinct non-zero exit codes.

### Internal

- TypeScript strictness expanded with `exactOptionalPropertyTypes`, unused-code
  checks, unchecked side-effect imports, and checked JavaScript verification
  scripts.
- Test suite expanded to 93 tests, including built-artifact CLI/library smoke
  checks and `publint`.
