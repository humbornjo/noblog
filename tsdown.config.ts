import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    generate: "src/cli.ts",
    index: "src/index.ts",
  },
  format: "esm",
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  fixedExtension: false,
  dts: true,
});
