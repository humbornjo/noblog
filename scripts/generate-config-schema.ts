import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { noblogConfigSchema } from "../src/lib/noblog/config.js";

const schema = z.toJSONSchema(noblogConfigSchema, {
  target: "draft-2020-12",
});
const destination = new URL("../schema/config.json", import.meta.url);

await mkdir(new URL("../schema/", import.meta.url), { recursive: true });
await writeFile(destination, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
