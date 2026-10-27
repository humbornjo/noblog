import { describe, expect, it } from "vitest";
import { ConfigurationError, loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads the Notion configuration", () => {
    expect(
      loadConfig({
        NOTION_API_SECRET: "secret",
        NOBLOG_DATABASE_ID: "database",
      }),
    ).toEqual({ notionApiSecret: "secret", databaseId: "database" });
  });

  it.each([
    [{}, ["NOTION_API_SECRET", "NOBLOG_DATABASE_ID"]],
    [{ NOTION_API_SECRET: "secret" }, ["NOBLOG_DATABASE_ID"]],
    [{ NOBLOG_DATABASE_ID: "database" }, ["NOTION_API_SECRET"]],
  ])("rejects missing variables in %s", (env, missing) => {
    let error: unknown;
    try {
      loadConfig(env);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConfigurationError);
    if (!(error instanceof ConfigurationError)) {
      throw new TypeError("Expected loadConfig to throw ConfigurationError");
    }
    for (const name of missing) {
      expect(error.message).toContain(name);
    }
  });
});
