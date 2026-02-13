import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    reporter: "src/reporter.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: "es2020",
  outDir: "dist",
});
