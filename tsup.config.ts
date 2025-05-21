/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import fs from "fs";
import path from "path";
import { defineConfig, Options } from "tsup";
import type { Plugin } from "esbuild";
import pkg from "./package.json";
import { transformSVG } from "./transformsvg";

type TSUPPlugin = NonNullable<Options["plugins"]>[number];
const disablePlugin = (name: string): TSUPPlugin => ({
  name: `disable-plugin-${name}`,
  esbuildOptions: (options) => {
    const plugin = options.plugins?.find(({ name }) => name === "postcss");
    if (plugin) {
      plugin.setup = () => Promise.resolve();
    }
  },
});

const inlineRawPlugin: Plugin = {
  name: "inline-raw-plugin",
  setup(build) {
    build.onResolve({ filter: /\?raw$|\?inline$/ }, (args) => {
      const cleanPath = args.path.replace(/\?raw$|\?inline$/, "");
      const fullPath = path.resolve(args.resolveDir, cleanPath);
      return { path: fullPath, namespace: "inline-file" };
    });

    build.onLoad({ filter: /.*/, namespace: "inline-file" }, async (args) => {
      const contents = await fs.promises.readFile(args.path, "utf-8");
      return {
        contents: args.path.endsWith(".svg")
          ? `import {DOMBuilder} from "./domBuilder"; export default ${transformSVG(contents)};`
          : `export default ${JSON.stringify(contents)};`,
        loader: "ts",
        resolveDir: path.dirname(args.path),
      };
    });
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "es2019",
  legacyOutput: true,

  env: {
    PKG_VERSION: pkg.version,
  },

  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,

  esbuildPlugins: [inlineRawPlugin],

  plugins: [disablePlugin("postcss")],
});
