import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { lstat, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = mkdtempSync(join(tmpdir(), "noblog-smoke-"));
process.on("exit", () => {
  rmSync(cwd, { recursive: true, force: true });
});

const cli = fileURLToPath(new URL("../dist/generate.js", import.meta.url));
const libraryUrl = new URL("../dist/index.js", import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env.PATH, STRICLI_NO_COLOR: "1" },
  });
}

const help = run("--help");
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /noblog generate/);
assert.match(help.stdout, /--store/);

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

const executable = await stat(cli);
assert.notEqual(executable.mode & 0o111, 0, "CLI must be executable");

const library = await import(libraryUrl.href);
assert.equal(typeof library.renderPage, "function");
assert.equal(typeof library.renderPages, "function");
assert.equal(typeof library.writePages, "function");
assert.equal(typeof library.createNotionSource, "function");
assert.equal(typeof library.resolveStoreLayoutPath, "function");
assert.equal("generateBlog" in library, false);

const viewPaths = await library.writePages(
  [
    {
      id: "root",
      content: "# Root\n",
      childPageIds: [],
      isDatabasePage: true,
    },
  ],
  {
    savePath: join(cwd, "views"),
    storePath: join(cwd, "store"),
  },
);
assert.equal((await lstat(join(cwd, "store", "root.md"))).isFile(), true);
assert.equal((await lstat(viewPaths[0])).isSymbolicLink(), true);
assert.equal(await readFile(viewPaths[0], "utf8"), "# Root\n");

const require = createRequire(import.meta.url);
const commonjs = require("noblog");
assert.equal(typeof commonjs.renderPages, "function");

const declarations = await readFile(
  new URL("../dist/index.d.ts", import.meta.url),
  "utf8",
);
assert.match(declarations, /renderPages/);
assert.match(declarations, /resolveStoreLayoutPath/);

console.log("Built CLI and library smoke checks passed.");
