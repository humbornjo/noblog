import { z } from "zod";

export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };

const configValueSchema: z.ZodType<ConfigValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(configValueSchema),
    z.record(z.string(), configValueSchema),
  ]),
);

const fieldModifiers = {
  as: z
    .enum(["string", "date"])
    .optional()
    .describe(
      "Convert to a string (quoting date-like strings) or a YAML date.",
    ),
  default: configValueSchema
    .optional()
    .describe("Value used when the source is empty."),
  omitEmpty: z
    .boolean()
    .optional()
    .describe("Omit undefined, null, empty strings, and empty arrays."),
  required: z
    .boolean()
    .optional()
    .describe("Fail generation if the value is still empty after defaults."),
};

export const frontmatterFieldSchema = z.union([
  z.strictObject({
    ...fieldModifiers,
    from: z
      .string()
      .min(1)
      .describe("Built-in source or a key declared under notion.properties."),
  }),
  z.strictObject({
    ...fieldModifiers,
    value: configValueSchema,
  }),
]);

export const frontmatterFieldsSchema = z.record(
  z.string().min(1),
  frontmatterFieldSchema,
);

export const notionPropertiesSchema = z.record(
  z.string().min(1),
  z.string().min(1),
);

export const BUILT_IN_FRONTMATTER_SOURCES = [
  "title",
  "description",
  "tags",
  "publishedAt",
  "archived",
  "layoutPath",
  "pageId",
  "isDatabasePage",
] as const;

const builtInSources: ReadonlySet<string> = new Set(
  BUILT_IN_FRONTMATTER_SOURCES,
);

export const noblogConfigSchema = z
  .strictObject({
    version: z.literal(1),
    notion: z
      .strictObject({
        properties: notionPropertiesSchema.optional(),
      })
      .optional(),
    output: z
      .strictObject({
        savePath: z
          .string()
          .min(1)
          .optional()
          .describe("Public directory for database-post symlinks."),
        storePath: z
          .string()
          .min(1)
          .optional()
          .describe("Flat directory containing every canonical Markdown file."),
        layoutPath: z
          .string()
          .min(1)
          .optional()
          .describe("Layout import path interpreted relative to savePath."),
        recursive: z
          .boolean()
          .optional()
          .describe("Render child pages recursively (default: true)."),
      })
      .optional(),
    frontmatter: z
      .strictObject({
        fields: frontmatterFieldsSchema.optional(),
      })
      .optional(),
  })
  .superRefine((config, context) => {
    const properties = config.notion?.properties ?? {};
    for (const [name, field] of Object.entries(
      config.frontmatter?.fields ?? {},
    )) {
      if (!("from" in field)) continue;
      if (
        !builtInSources.has(field.from) &&
        !Object.hasOwn(properties, field.from)
      ) {
        context.addIssue({
          code: "custom",
          message: `Unknown frontmatter source "${field.from}"; declare it under notion.properties`,
          path: ["frontmatter", "fields", name, "from"],
        });
      }
    }
  })
  .describe(
    "Noblog YAML configuration. Notion credentials remain in environment variables or .env files.",
  );

export type FrontmatterField = z.infer<typeof frontmatterFieldSchema>;
export type FrontmatterFields = z.infer<typeof frontmatterFieldsSchema>;
export type NotionPropertyMap = z.infer<typeof notionPropertiesSchema>;
export type NoblogFileConfig = z.infer<typeof noblogConfigSchema>;
