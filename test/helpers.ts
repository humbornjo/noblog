import { Writable } from "node:stream";
import { vi } from "vitest";
import type { CliContext } from "../src/context.js";
import type { GenerateBlog } from "../src/workflows/generate.js";

export function createTestContext(
  env: Readonly<Partial<Record<string, string>>> = {
    NOTION_API_SECRET: "test-secret",
    NOBLOG_DATABASE_ID: "test-database",
  },
) {
  let stdout = "";
  let stderr = "";

  const process: CliContext["process"] = {
    env: { STRICLI_NO_COLOR: "1", ...env },
    stdout: new Writable({
      write(chunk, _encoding, callback) {
        stdout += chunk.toString();
        callback();
      },
    }),
    stderr: new Writable({
      write(chunk, _encoding, callback) {
        stderr += chunk.toString();
        callback();
      },
    }),
  };
  const generateBlog = vi.fn<GenerateBlog>(async () => {});
  const context: CliContext = { process, generateBlog };

  return {
    context,
    generateBlog,
    stdout: () => stdout,
    stderr: () => stderr,
  };
}
