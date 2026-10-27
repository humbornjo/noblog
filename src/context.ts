import type { ApplicationContext } from "@stricli/core";
import type { GenerateBlog } from "./workflows/generate.js";

export interface CliContext extends ApplicationContext {
  readonly generateBlog: GenerateBlog;
}
