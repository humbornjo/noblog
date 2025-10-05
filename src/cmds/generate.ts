#!/usr/bin/env node

import { Noblog } from "../lib/noblog/noblog.js";
import { ListPages } from "../lib/notion/client.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

interface CliOptions {
  verbose: boolean;
  help: boolean;
  version: boolean;
  savePath: string;
  subPath: string;
  layoutPath: string;
}

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version;
  } catch {
    return "unknown";
  }
}

function help() {
  console.log(`
noblog - Generate static blog content from Notion.so

Usage: noblog [command] [options] [SAVE_PATH] [SUB_PATH]

Options:
  -v, --verbose    Print more messages for debugging
  -h, --help       Show help message
  --version        Show version information
  --layout PATH    Custom layout path (default: ../../layouts/MarkdownPostLayout.astro)

Commands:
  help     Show this help message
  version  Show version information
  generate Generate blog content (default command)

Options:
  -v, --verbose    Print more messages for debugging
  -h, --help       Show help message
  --version        Show version information

Arguments:
  SAVE_PATH        Directory to save main posts (default: ./src/pages/posts/)
  SUB_PATH         Subdirectory for nested content (default: nob_children/)

Layout Options:
  --layout PATH    Custom layout path relative to save directory (default: ../../layouts/MarkdownPostLayout.astro)

Examples:
  noblog help
  noblog version
  noblog generate
  noblog -v
  noblog src/pages/posts/ nob_children/
  noblog --layout ../../layouts/BlogLayout.astro
  noblog src/posts/ children/ --layout ../../../layouts/CustomLayout.astro -v

Environment Variables:
  NOTION_API_SECRET    Your Notion API secret
  NOBLOG_DATABASE_ID   Your Notion database ID
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    verbose: false,
    help: false,
    version: false,
    savePath: "./src/pages/posts/",
    subPath: "nob_children/",
    layoutPath: "../../layouts/MarkdownPostLayout.astro",
  };

  const positionalArgs: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    switch (arg) {
      case "-v":
      case "--verbose":
        options.verbose = true;
        break;
      case "-h":
      case "--help":
      case "help":
        options.help = true;
        break;
      case "--version":
      case "version":
        options.version = true;
        break;
      case "--layout":
        if (i + 1 < argv.length && !argv[i + 1]!.startsWith("-")) {
          options.layoutPath = argv[++i]!;
        } else {
          console.error("Error: --layout requires a path argument");
          help();
          process.exit(1);
        }
        break;
      case "generate":
        // Explicit generate command, skip it
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          help();
          process.exit(1);
        }
        positionalArgs.push(arg);
        break;
    }
  }

  // Handle positional arguments
  if (positionalArgs.length > 0) {
    options.savePath = positionalArgs[0]!;
  }
  if (positionalArgs.length > 1) {
    options.subPath = positionalArgs[1]!;
  }
  if (positionalArgs.length > 2) {
    console.error("Error: Too many arguments.");
    help();
    process.exit(1);
  }

  return options;
}

async function generateBlog(options: CliOptions) {
  try {
    if (options.verbose) {
      console.log("Fetching posts from Notion...");
    }

    const pages = await ListPages();

    if (options.verbose) {
      console.log(`Found ${pages.length} pages`);
      console.log(`Save path: ${options.savePath}`);
      console.log(`Sub path: ${options.subPath}`);
      console.log(`Layout path: ${options.layoutPath}`);
    }

    const nob = new Noblog(
      pages,
      options.savePath,
      options.subPath,
      options.layoutPath,
    );
    await nob.Collect(true);

    console.log(`✅ Successfully generated blog content`);
  } catch (error) {
    console.error(`❌ Error generating blog content:`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
    } else {
      console.error(`   An unknown error occurred`);
    }
    process.exit(1);
  }
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    // Default behavior: generate with default options
    await generateBlog({
      verbose: false,
      help: false,
      version: false,
      savePath: "./src/pages/posts/",
      subPath: "nob_children/",
      layoutPath: "../../layouts/MarkdownPostLayout.astro",
    });
    return;
  }

  const options = parseArgs(argv);

  if (options.help) {
    help();
    return;
  }

  if (options.version) {
    console.log(`noblog v${getVersion()}`);
    return;
  }

  await generateBlog(options);
}

main().catch((error) => {
  console.error(`❌ Unexpected error:`, error);
  process.exit(1);
});
