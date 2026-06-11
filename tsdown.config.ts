/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import fs from "fs";
import path from "path";
import { defineConfig, type TsdownPlugin } from "tsdown";
import pkg from "./package.json";
import { transformSVG } from "./transformsvg";

const RAW_RE = /\?(raw|inline)$/;
const INLINE_PREFIX = "\0inline-raw:";
// The virtual id ends in `.js` so rolldown/tsdown treat it as a JS module
// rather than a CSS/SVG asset (otherwise tsdown's css-guard rejects it).
const INLINE_SUFFIX = ".js";

// Replicates Vite's `?raw` / `?inline` imports for the bundled build: a `.svg`
// import becomes a function that builds the SVG via DOMBuilder, anything else
// is inlined as a string. (Vite handles this in `pnpm dev`.)
const inlineRawPlugin = (): TsdownPlugin => ({
  name: "inline-raw",
  resolveId(source: string, importer: string | undefined) {
    if (!RAW_RE.test(source)) {
      return null;
    }
    const cleanPath = source.replace(RAW_RE, "");
    const baseDir = importer ? path.dirname(importer) : process.cwd();
    return INLINE_PREFIX + path.resolve(baseDir, cleanPath) + INLINE_SUFFIX;
  },
  load(id: string) {
    if (!id.startsWith(INLINE_PREFIX)) {
      return null;
    }
    const filePath = id
      .slice(INLINE_PREFIX.length)
      .slice(0, -INLINE_SUFFIX.length);
    const contents = fs.readFileSync(filePath, "utf-8");

    if (filePath.endsWith(".svg")) {
      const domBuilder = path.resolve(path.dirname(filePath), "domBuilder");
      return `import {DOMBuilder} from ${JSON.stringify(domBuilder)}; export default ${transformSVG(contents)};`;
    }

    return `export default ${JSON.stringify(contents)};`;
  },
});

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "es2019",

  // PKG_VERSION is replaced at build time (matches vite.config.ts).
  define: {
    "process.env.PKG_VERSION": JSON.stringify(pkg.version),
  },

  clean: true,
  // Type declarations are emitted separately by `tsc` + `downlevel-dts`.
  dts: false,
  sourcemap: true,

  plugins: [inlineRawPlugin()],
});
