import { ConfigurationError, loadConfig } from "../config.js";
import type { CliContext } from "../context.js";
import {
  DEFAULT_SAVE_PATH,
  DEFAULT_STORE_PATH,
  DEFAULT_SUB_PATH,
} from "../lib/noblog/defaults.js";

interface GenerateFlags {
  verbose: boolean;
  layout: string;
  store: string;
}

export default async function generate(
  this: CliContext,
  flags: GenerateFlags,
  savePath?: string,
  subPath?: string,
): Promise<Error | void> {
  try {
    const config = loadConfig(this.process.env);
    await this.generateBlog(
      config,
      {
        savePath: savePath ?? DEFAULT_SAVE_PATH,
        storePath: flags.store ?? DEFAULT_STORE_PATH,
        subPath: subPath ?? DEFAULT_SUB_PATH,
        layoutPath: flags.layout,
        verbose: flags.verbose,
      },
      this.process,
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return error;
    }
    if (!(error instanceof Error)) {
      return new Error("Generation failed: an unknown error occurred");
    }

    const message = flags.verbose
      ? (error.stack ?? error.message)
      : error.message;
    return new Error(`Generation failed: ${message}`, { cause: error });
  }
}
