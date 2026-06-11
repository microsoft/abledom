import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    reporter: "src/reporter.ts",
  },
  format: ["cjs", "esm"],
  clean: true,
  sourcemap: true,
  // Type declarations are emitted separately by `tsc --emitDeclarationOnly`.
  dts: false,
  target: "es2020",
  outDir: "dist",

  // reporter.ts intentionally exposes both a named (`AbleDOMReporter`) and a
  // default export. Tell rolldown to emit named CJS exports (the default lands
  // on `.default`, which Playwright's reporter loader already handles) so it
  // doesn't warn about mixing the two.
  outputOptions(options, format) {
    if (format === "cjs") {
      options.exports = "named";
    }
    return options;
  },
});
