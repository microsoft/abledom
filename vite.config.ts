/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { defineConfig } from "vite";
import { transformSVG } from "./transformsvg";

export default defineConfig({
  define: {
    "process.env.PKG_VERSION": JSON.stringify("local"),
  },
  resolve: {
    alias: {
      abledom: "/src",
    },
  },
  server: {
    open: "/test-pages/page1/index.html",
  },
  build: {
    rollupOptions: {
      input: {
        page1: "test-pages/page1/index.html",
        // page2: 'test-pages/page2/index.html',
      },
    },
  },
  plugins: [
    {
      name: "postprocess-raw",
      enforce: "post",
      transform(code, id) {
        if (id.endsWith(".svg?raw")) {
          // Your postprocessing logic here
          // const processed = code.replace(/body/g, 'html body'); // Example
          return {
            code: `import {DOMBuilder} from "./domBuilder"; export default ${transformSVG(code)};`,
            map: null,
          };
        }

        return undefined;
      },
    },
  ],
});
