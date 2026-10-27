import type {
  FrontmatterField,
  FrontmatterFields,
} from "./config.js";
import type { FrontmatterAdapter } from "./types.js";

export const DEFAULT_FRONTMATTER_FIELDS: FrontmatterFields = {
  layout: { from: "layoutPath" },
  title: { from: "title", default: "" },
  description: { from: "description", default: "" },
  tags: { from: "tags", default: [] },
  pubDate: { from: "publishedAt", as: "string", default: "" },
  archived: { from: "archived", as: "string", default: "" },
};

export function createFrontmatterAdapter(
  fields: FrontmatterFields,
): FrontmatterAdapter {
  for (const [name, field] of Object.entries(fields)) {
    if (("from" in field) === ("value" in field)) {
      throw new Error(
        `Frontmatter field "${name}" must have exactly one of "from" or "value"`,
      );
    }
  }

  return ({ page, metadata, layoutPath, isDatabasePage }) => {
    const sources: Record<string, unknown> = {
      ...metadata.values,
      layoutPath,
      pageId: page.id,
      isDatabasePage,
    };
    const output: Record<string, unknown> = {};

    for (const [name, field] of Object.entries(fields)) {
      let value =
        "value" in field
          ? field.value
          : sources[field.from];

      if (isEmpty(value) && "default" in field) {
        value = field.default;
      }
      if (field.required && isEmpty(value)) {
        throw new Error(
          `Missing required frontmatter field "${name}" for page "${page.id}"`,
        );
      }
      if (field.omitEmpty && isEmpty(value)) continue;

      output[name] = convertValue(value, field, name, page.id);
    }

    return output;
  };
}

function convertValue(
  value: unknown,
  field: FrontmatterField,
  name: string,
  pageId: string,
): unknown {
  if (!field.as || isEmpty(value)) return value;

  if (field.as === "string") {
    if (["string", "number", "boolean"].includes(typeof value)) {
      return String(value);
    }
    throw conversionError(name, pageId, "a string, number, or boolean");
  }

  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    throw conversionError(name, pageId, "a valid date string");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw conversionError(name, pageId, "a valid date string");
  }
  return date;
}

function conversionError(
  name: string,
  pageId: string,
  expected: string,
): Error {
  return new Error(
    `Cannot convert frontmatter field "${name}" for page "${pageId}"; expected ${expected}`,
  );
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
