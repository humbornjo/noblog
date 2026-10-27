import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";
import { ConfigurationError } from "./config.js";
import {
  noblogConfigSchema,
  type NoblogFileConfig,
} from "./lib/noblog/config.js";

export async function loadNoblogConfig(
  path: string,
): Promise<NoblogFileConfig> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    const detail =
      (error as NodeJS.ErrnoException).code === "ENOENT"
        ? "file not found"
        : error instanceof Error
          ? error.message
          : "unknown read error";
    throw new ConfigurationError(
      `Cannot read Noblog config "${path}": ${detail}`,
    );
  }

  let input: unknown;
  try {
    input = parse(source, { prettyErrors: false });
  } catch (error) {
    throw new ConfigurationError(
      `Invalid YAML in Noblog config "${path}": ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }

  const result = noblogConfigSchema.safeParse(input);
  if (!result.success) {
    throw new ConfigurationError(
      `Invalid Noblog config "${path}":\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
