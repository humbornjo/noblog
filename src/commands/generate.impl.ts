import { ConfigurationError, loadConfig } from "../config.js";
import { loadNoblogConfig } from "../config-file.js";
import type { CliContext } from "../context.js";
import {
  DEFAULT_LAYOUT_PATH,
  DEFAULT_SAVE_PATH,
  DEFAULT_STORE_PATH,
} from "../lib/noblog/defaults.js";
import {
  createFrontmatterAdapter,
  DEFAULT_FRONTMATTER_FIELDS,
} from "../lib/noblog/frontmatter-fields.js";

interface GenerateFlags {
  verbose: boolean;
  config?: string;
  layout?: string;
  store?: string;
}

export default async function generate(
  this: CliContext,
  flags: GenerateFlags,
  savePath?: string,
  legacySubPath?: string,
): Promise<Error | void> {
  try {
    const fileConfig = flags.config
      ? await loadNoblogConfig(flags.config)
      : undefined;
    const config = loadConfig(this.process.env);
    if (legacySubPath !== undefined) {
      this.process.stderr.write(
        "Warning: SUB_PATH is deprecated and ignored; child pages now live only in the canonical store.\n",
      );
    }

    const propertyMap = fileConfig?.notion?.properties;
    const fields = fileConfig?.frontmatter?.fields;
    const frontmatter =
      fields || propertyMap
        ? createFrontmatterAdapter(fields ?? DEFAULT_FRONTMATTER_FIELDS)
        : undefined;

    await this.generateBlog(
      config,
      {
        savePath:
          savePath ?? fileConfig?.output?.savePath ?? DEFAULT_SAVE_PATH,
        storePath:
          flags.store ?? fileConfig?.output?.storePath ?? DEFAULT_STORE_PATH,
        layoutPath:
          flags.layout ?? fileConfig?.output?.layoutPath ?? DEFAULT_LAYOUT_PATH,
        recursive: fileConfig?.output?.recursive ?? true,
        propertyMap,
        frontmatter,
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
