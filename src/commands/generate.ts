import { buildCommand } from "@stricli/core";
import {
  DEFAULT_LAYOUT_PATH,
  DEFAULT_SAVE_PATH,
  DEFAULT_SUB_PATH,
} from "../lib/noblog/defaults.js";

export const generateCommand = buildCommand({
  loader: async () => import("./generate.impl.js"),
  parameters: {
    flags: {
      verbose: {
        kind: "boolean",
        brief: "Print diagnostic information",
        default: false,
        withNegated: false,
      },
      layout: {
        kind: "parsed",
        brief: "Layout path relative to each generated post",
        placeholder: "PATH",
        parse: (input) => input,
        default: DEFAULT_LAYOUT_PATH,
      },
    },
    aliases: {
      v: "verbose",
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Directory for database posts",
          placeholder: "SAVE_PATH",
          parse: (input) => input,
          optional: true,
          default: DEFAULT_SAVE_PATH,
        },
        {
          brief: "Subdirectory of SAVE_PATH for nested pages",
          placeholder: "SUB_PATH",
          parse: (input) => input,
          optional: true,
          default: DEFAULT_SUB_PATH,
        },
      ],
    },
  },
  docs: {
    brief: "Generate blog content from Notion",
    fullDescription:
      "Fetch published pages from Notion and write Astro-compatible Markdown files. " +
      "SUB_PATH is resolved inside SAVE_PATH.",
  },
});
