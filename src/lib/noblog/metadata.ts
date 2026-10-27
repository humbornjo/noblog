import type { PageObjectResponse } from "@notionhq/client";
import type { NotionPropertyMap } from "./config.js";

type NotionProperty = PageObjectResponse["properties"][string];

export type MetadataValue =
  | string
  | number
  | boolean
  | readonly string[]
  | undefined;

export interface PageMetadata {
  readonly title: string;
  readonly description?: string | undefined;
  readonly tags: readonly string[];
  readonly publishedAt?: string | undefined;
  readonly archived?: boolean | undefined;
  readonly values: Readonly<Record<string, MetadataValue>>;
}

const DEFAULT_PROPERTIES = {
  description: "description",
  tags: "tags",
  publishedAt: "date",
  archived: "archived",
} as const;

export function extractPageMetadata(
  page: PageObjectResponse,
  properties: NotionPropertyMap = {},
): PageMetadata {
  const propertyNames = new Map<string, string>(Object.entries(properties));
  for (const [key, name] of Object.entries(DEFAULT_PROPERTIES)) {
    if (!propertyNames.has(key)) propertyNames.set(key, name);
  }

  const values: Record<string, MetadataValue> = {};
  if (!propertyNames.has("title")) {
    const titleProperty = Object.values(page.properties).findLast(
      (property) => property.type === "title",
    );
    values["title"] = normalizeProperty(titleProperty);
  }
  for (const [key, name] of propertyNames) {
    values[key] = normalizeProperty(page.properties[name]);
  }

  return {
    title: asString(values["title"]) ?? "",
    description: asString(values["description"]),
    tags: asStringArray(values["tags"]) ?? [],
    publishedAt: asString(values["publishedAt"]),
    archived: asBoolean(values["archived"]),
    values,
  };
}

function normalizeProperty(property?: NotionProperty): MetadataValue {
  if (!property) return undefined;

  switch (property.type) {
    case "title":
      return plainText(property.title);
    case "rich_text":
      return plainText(property.rich_text);
    case "multi_select":
      return property.multi_select.map(({ name }) => name);
    case "select":
      return property.select?.name;
    case "status":
      return property.status?.name;
    case "checkbox":
      return property.checkbox;
    case "number":
      return property.number ?? undefined;
    case "date":
      return property.date?.start;
    case "url":
      return property.url ?? undefined;
    case "email":
      return property.email ?? undefined;
    case "phone_number":
      return property.phone_number ?? undefined;
    case "people":
      return property.people.map(entityName);
    case "relation":
      return property.relation.map(({ id }) => id);
    case "files":
      return property.files.map((file) =>
        "file" in file ? file.file.url : file.external.url,
      );
    case "formula":
      return normalizeFormula(property.formula);
    case "created_time":
      return property.created_time;
    case "last_edited_time":
      return property.last_edited_time;
    case "created_by":
      return entityName(property.created_by);
    case "last_edited_by":
      return entityName(property.last_edited_by);
    case "unique_id":
      return property.unique_id.prefix
        ? `${property.unique_id.prefix}-${property.unique_id.number}`
        : String(property.unique_id.number);
    default:
      return undefined;
  }
}

function normalizeFormula(
  formula: Extract<NotionProperty, { type: "formula" }>["formula"],
): MetadataValue {
  switch (formula.type) {
    case "string":
      return formula.string ?? undefined;
    case "number":
      return formula.number ?? undefined;
    case "boolean":
      return formula.boolean ?? undefined;
    case "date":
      return formula.date?.start;
  }
}

function plainText(
  richText: Extract<NotionProperty, { type: "title" }>["title"],
): string {
  return richText.map((item) => item.plain_text).join("");
}

function entityName(entity: {
  readonly id: string;
  readonly name?: string | null;
}): string {
  return entity.name ?? entity.id;
}

function asString(value: MetadataValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: MetadataValue): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: MetadataValue): readonly string[] | undefined {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value : undefined;
}
