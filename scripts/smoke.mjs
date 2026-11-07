import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { lstat, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const cwd = mkdtempSync(join(tmpdir(), "noblog-smoke-"));
process.on("exit", () => {
  rmSync(cwd, { recursive: true, force: true });
});

const cli = fileURLToPath(new URL("../dist/generate.js", import.meta.url));
const libraryUrl = new URL("../dist/index.js", import.meta.url);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {Record<string, unknown>}
 */
function requireRecord(value, label) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

/**
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
function isUnknownArray(value) {
  return Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {unknown[]}
 */
function requireArray(value, label) {
  if (!isUnknownArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string}
 */
function requireString(value, label) {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {value is (...args: unknown[]) => unknown}
 */
function isFunction(value) {
  return typeof value === "function";
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} name
 * @returns {(...args: unknown[]) => unknown}
 */
function requireFunction(record, name) {
  const value = record[name];
  if (!isFunction(value)) {
    throw new TypeError(`${name} must be a function`);
  }
  return value;
}

/** @param {...string} args */
function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env["PATH"], STRICLI_NO_COLOR: "1" },
  });
}

const help = run("--help");
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /noblog generate/);
assert.match(help.stdout, /--store/);
assert.match(help.stdout, /config/);

for (const args of [["--version"], ["version"]]) {
  const version = run(...args);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout, `noblog v${packageJson.version}\n`);
}

const invalid = run("--unknown");
assert.equal(invalid.status, 2, invalid.stderr);
assert.match(invalid.stderr, /No flag registered/);

const unconfigured = run();
assert.equal(unconfigured.status, 2, unconfigured.stderr);
assert.match(unconfigured.stderr, /NOTION_API_SECRET/);
assert.match(unconfigured.stderr, /NOBLOG_DATABASE_ID/);

const validConfigPath = join(cwd, "noblog.yaml");
await writeFile(validConfigPath, "version: 1\n", "utf8");
const validConfig = run("config", "check", "--config", validConfigPath);
assert.equal(validConfig.status, 0, validConfig.stderr);
assert.match(validConfig.stdout, /Configuration valid/);

const invalidConfigPath = join(cwd, "invalid.yaml");
await writeFile(invalidConfigPath, "version: 2\n", "utf8");
const invalidConfig = run("config", "check", "--config", invalidConfigPath);
assert.equal(invalidConfig.status, 2, invalidConfig.stderr);
assert.match(invalidConfig.stderr, /Invalid Noblog config/);

const executable = await stat(cli);
assert.notEqual(executable.mode & 0o111, 0, "CLI must be executable");

const library = requireRecord(
  await import(libraryUrl.href),
  "Built library export",
);
requireFunction(library, "renderPage");
requireFunction(library, "renderPages");
requireFunction(library, "writePages");
requireFunction(library, "writeSelfie");
requireFunction(library, "findSelfiePage");
requireFunction(library, "upsertFrontmatterAuthor");
requireFunction(library, "createNotionSource");
requireFunction(library, "resolveStoreLayoutPath");
requireFunction(library, "createFrontmatterAdapter");
assert.equal("generateBlog" in library, false);

const writeBuiltPages = requireFunction(library, "writePages");
const viewPaths = requireArray(
  await writeBuiltPages(
    [
      {
        id: "root",
        content: "# Root\n",
        childPageIds: ["child"],
        isDatabasePage: true,
      },
      {
        id: "child",
        content: "# Child\n",
        childPageIds: [],
        isDatabasePage: false,
      },
    ],
    {
      savePath: join(cwd, "views"),
      storePath: join(cwd, "store"),
    },
  ),
  "writePages result",
);
assert.equal(viewPaths.length, 1);
const viewPath = requireString(viewPaths[0], "writePages view path");
assert.equal((await lstat(join(cwd, "store", "root.md"))).isFile(), true);
assert.equal((await lstat(join(cwd, "store", "child.md"))).isFile(), true);
assert.equal((await lstat(viewPath)).isSymbolicLink(), true);
assert.equal(await readFile(viewPath, "utf8"), "# Root\n");
await assert.rejects(lstat(join(cwd, "views", "child.md")), {
  code: "ENOENT",
});
await assert.rejects(lstat(join(cwd, "views", "nob_children", "child.md")), {
  code: "ENOENT",
});

const requireFromHere = createRequire(import.meta.url);
const commonjs = requireRecord(requireFromHere("noblog"), "CommonJS export");
requireFunction(commonjs, "renderPages");
const configSchema = requireRecord(
  requireFromHere("noblog/config.schema.json"),
  "Published config schema",
);
const schemaProperties = requireRecord(
  configSchema["properties"],
  "Config schema properties",
);
const versionSchema = requireRecord(
  schemaProperties["version"],
  "Config schema version",
);
assert.equal(versionSchema["const"], 1);

const declarations = await readFile(
  new URL("../dist/index.d.ts", import.meta.url),
  "utf8",
);
assert.match(declarations, /renderPages/);
assert.match(declarations, /resolveStoreLayoutPath/);

console.log("Built CLI and library smoke checks passed.");
