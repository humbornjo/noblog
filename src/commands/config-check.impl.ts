import { loadNoblogConfig } from "../config-file.js";
import type { CliContext } from "../context.js";

interface ConfigCheckFlags {
  config: string;
}

export default async function checkConfig(
  this: CliContext,
  flags: ConfigCheckFlags,
): Promise<Error | void> {
  try {
    await loadNoblogConfig(flags.config);
    this.process.stdout.write(`Configuration valid: ${flags.config}\n`);
  } catch (error) {
    return error instanceof Error
      ? error
      : new Error("Configuration check failed: an unknown error occurred");
  }
}
