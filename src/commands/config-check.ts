import { buildCommand } from "@stricli/core";

export const configCheckCommand = buildCommand({
  loader: async () => import("./config-check.impl.js"),
  parameters: {
    flags: {
      config: {
        kind: "parsed",
        brief: "YAML configuration file",
        placeholder: "PATH",
        parse: (input) => input,
      },
    },
    positional: {
      kind: "tuple",
      parameters: [],
    },
  },
  docs: {
    brief: "Validate a YAML configuration without network access",
  },
});
