import {
  buildApplication,
  buildRouteMap,
  ExitCode,
  help,
  run,
  version,
} from "@stricli/core";
import packageJson from "../package.json" with { type: "json" };
import { configCommand } from "./commands/config.js";
import { generateCommand } from "./commands/generate.js";
import { ConfigurationError } from "./config.js";
import type { CliContext } from "./context.js";

const root = buildRouteMap({
  routes: {
    config: configCommand,
    generate: generateCommand,
  },
  docs: {
    brief: "Generate static blog content from Notion",
    fullDescription:
      "Running noblog without a subcommand is equivalent to 'noblog generate'.\n" +
      "The legacy 'help' and 'version' commands are also supported.\n\n" +
      "Generation requires environment variables:\n" +
      "  NOTION_API_SECRET    Your Notion API secret\n" +
      "  NOBLOG_DATABASE_ID   Your Notion database ID",
  },
});

const helpFormatting = {
  caseStyle: "original",
  useAliasInUsageLine: false,
  onlyRequiredInUsageLine: false,
} as const;

export const app = buildApplication(
  root,
  {
    name: "noblog",
    scanner: {
      allowArgumentEscapeSequence: true,
    },
    determineExitCode: (error) =>
      error instanceof ConfigurationError ? 2 : ExitCode.CommandRunError,
  },
  {
    help: help({
      brief: "Show help information",
      defaultForRouteMap: true,
      formatting: helpFormatting,
    }),
    version: version({
      brief: "Show version information",
      info: { currentVersion: `noblog v${packageJson.version}` },
      alias: false,
    }),
  },
);

const PATH_FLAGS = new Set(["--config", "--layout", "--store"]);

export async function runCli(
  inputs: readonly string[],
  context: CliContext,
): Promise<void> {
  const escapeIndex = inputs.indexOf("--");
  const commandInputs =
    escapeIndex === -1 ? inputs : inputs.slice(0, escapeIndex);
  const escapedInputs = escapeIndex === -1 ? [] : inputs.slice(escapeIndex);

  let normalizedInputs: readonly string[];
  if (hasLegacyControl(commandInputs, "help")) {
    normalizedInputs = ["--help"];
  } else if (
    hasLegacyControl(commandInputs, "version") ||
    hasLegacyControl(commandInputs, "--version")
  ) {
    normalizedInputs = ["--version"];
  } else {
    // Legacy control words were global. Keep the first explicit command and
    // skip later ones; escaped words and flag values remain positional data.
    const remainingInputs: string[] = [];
    for (let index = 0; index < commandInputs.length; index++) {
      const input = commandInputs[index]!;
      if (input === "generate" && index !== 0) continue;

      remainingInputs.push(input);
      if (PATH_FLAGS.has(input) && hasFlagValue(commandInputs, index)) {
        remainingInputs.push(commandInputs[index + 1]!);
        index++;
      }
    }
    normalizedInputs = [...remainingInputs, ...escapedInputs];

    if (
      normalizedInputs[0] !== "generate" &&
      normalizedInputs[0] !== "config" &&
      normalizedInputs[0] !== "-h" &&
      normalizedInputs[0] !== "--help" &&
      normalizedInputs[0] !== "--version"
    ) {
      normalizedInputs = ["generate", ...normalizedInputs];
    }
  }

  await run(app, normalizedInputs, context);

  const exitCode = context.process.exitCode;
  if (typeof exitCode === "number" && exitCode < 0) {
    context.process.exitCode =
      exitCode === ExitCode.InvalidArgument ||
      exitCode === ExitCode.UnknownCommand
        ? 2
        : 1;
  }
}

function hasLegacyControl(
  inputs: readonly string[],
  control: "help" | "version" | "--version",
): boolean {
  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index]!;
    if (PATH_FLAGS.has(input) && hasFlagValue(inputs, index)) {
      index++;
      continue;
    }
    if (input === control) return true;
  }
  return false;
}

function hasFlagValue(inputs: readonly string[], flagIndex: number): boolean {
  const value = inputs[flagIndex + 1];
  return value !== undefined && !value.startsWith("-");
}
