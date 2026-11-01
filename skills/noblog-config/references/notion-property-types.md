# Notion property normalization

Noblog reads the actual Notion property type. It does not use a property named `title` or `date` as a substitute for checking its type.

| Notion type | Normalized value |
| --- | --- |
| `title`, `rich_text` | Concatenated plain-text string |
| `multi_select` | Array of option names |
| `select`, `status` | Selected name string, or undefined |
| `checkbox` | Native boolean |
| `number` | Native number, or undefined for null |
| `date` | Start date string, or undefined |
| `url`, `email`, `phone_number` | String, or undefined for null |
| `people` | Array of names, falling back to IDs for partial users |
| `relation` | Array of related page IDs |
| `files` | Array of uploaded-file or external URLs |
| `formula` | Normalized formula string, number, boolean, or date start |
| `created_time`, `last_edited_time` | Notion timestamp string |
| `created_by`, `last_edited_by` | Name, falling back to ID |
| `unique_id` | `PREFIX-number`, or the number as a string without a prefix |
| Unsupported types, missing properties | Undefined |

The `date` source remains a string until a field requests `as: date`. This distinction matters: `as: string` preserves a quoted date-like string, while `as: date` emits a native YAML timestamp for themes whose schemas call `z.date()` or `z.coerce.date()`.

People, relations, and files are arrays even when Notion contains one item. Apply `omitEmpty` if an empty array should not be emitted. A missing property and an unsupported type both become undefined, allowing `default`, `required`, and `omitEmpty` to handle them consistently.

For formula values, Noblog follows the formula's own result type. Verify formulas returning null with the theme's required/optional rules.

Custom source names are logical keys, not necessarily Notion names:

```yaml
notion:
  properties:
    timestampSource: Published At
frontmatter:
  fields:
    timestamp:
      from: timestampSource
      as: date
```

Here `timestampSource` is declared locally and `Published At` must exactly match Notion.
