import { config as loadDotenv } from "dotenv";
import type { DotenvPopulateInput } from "dotenv";
import { runCli } from "./app.js";
import type { CliContext } from "./context.js";
import { generateBlog } from "./workflows/generate.js";

const nodeProcess: CliContext["process"] = {
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  get exitCode() {
    const exitCode = process.exitCode;
    return typeof exitCode === "number" ? exitCode : null;
  },
  set exitCode(value: number | null) {
    process.exitCode = value ?? undefined;
  },
};

export async function main(
  inputs: readonly string[] = process.argv.slice(2),
  context: CliContext = { process: nodeProcess, generateBlog },
): Promise<void> {
  const environment = context.process.env ?? {};
  const processEnv: DotenvPopulateInput = Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  loadDotenv({ processEnv, quiet: true });
  Object.assign(environment, processEnv);
  await runCli(inputs, context);
}
