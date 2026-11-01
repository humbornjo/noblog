export interface NoblogConfig {
  notionApiSecret: string;
  databaseId: string;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function loadConfig(
  env: Readonly<Partial<Record<string, string>>> = {},
): NoblogConfig {
  const notionApiSecret = env["NOTION_API_SECRET"];
  const databaseId = env["NOBLOG_DATABASE_ID"];
  const missing = [
    ["NOTION_API_SECRET", notionApiSecret],
    ["NOBLOG_DATABASE_ID", databaseId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (!notionApiSecret || !databaseId) {
    throw new ConfigurationError(
      `Missing required environment ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}.\n` +
        "Set them in your .env file or export them before running noblog.",
    );
  }

  return { notionApiSecret, databaseId };
}
