import { buildRouteMap } from "@stricli/core";
import { configCheckCommand } from "./config-check.js";

export const configCommand = buildRouteMap({
  routes: {
    check: configCheckCommand,
  },
  docs: {
    brief: "Inspect Noblog configuration",
  },
});
