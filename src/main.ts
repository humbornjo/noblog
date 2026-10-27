import { config as loadDotenv } from "dotenv";
import type { DotenvPopulateInput } from "dotenv";
import { runCli } from "./app.js";
import type { CliContext } from "./context.js";
import { generateBlog } from "./workflows/generate.js";

export async function main(
  inputs: readonly string[] = process.argv.slice(2),
  context: CliContext = { process, generateBlog },
): Promise<void> {
  loadDotenv({
    processEnv: (context.process.env ?? {}) as DotenvPopulateInput,
    quiet: true,
  });
  await runCli(inputs, context);
}
