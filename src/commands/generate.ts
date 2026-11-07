import { buildCommand } from "@stricli/core";

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
      config: {
        kind: "parsed",
        brief: "YAML configuration file",
        placeholder: "PATH",
        parse: (input) => input,
        optional: true,
      },
      layout: {
        kind: "parsed",
        brief: "Layout path relative to SAVE_PATH",
        placeholder: "PATH",
        parse: (input) => input,
        optional: true,
      },
      store: {
        kind: "parsed",
        brief: "Directory for canonical Markdown files",
        placeholder: "PATH",
        parse: (input) => input,
        optional: true,
      },
      selfie: {
        kind: "parsed",
        brief: "Render the database page with this title to output.selfiePath",
        placeholder: "PAGE_TITLE",
        parse: (input) => input,
        optional: true,
      },
    },
    aliases: {
      v: "verbose",
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Public view directory for database posts",
          placeholder: "SAVE_PATH",
          parse: (input) => input,
          optional: true,
        },
        {
          brief: "Deprecated compatibility argument; ignored",
          placeholder: "SUB_PATH",
          parse: (input) => input,
          optional: true,
        },
      ],
    },
  },
  docs: {
    brief: "Generate blog content from Notion",
    fullDescription:
      "Fetch published pages from Notion and write Astro-compatible Markdown files. " +
      "Only database posts receive public symlinks; child pages live in the canonical store. " +
      "The legacy SUB_PATH argument is accepted but ignored. " +
      "With --selfie PAGE_TITLE, the matching database page is also rendered to output.selfiePath " +
      "(default public/selfie.md) with frontmatter author set to the page title; " +
      "when the title is empty or matches no page, the selfie file is left untouched.",
  },
});
