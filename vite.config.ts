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
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        page1: "tests/pages/page1.html",
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
    {
      name: "custom-index-html",
      configureServer(server) {
        server.middlewares.use((req, _, next) => {
          if (req.url === "/" || req.url === "/index.html") {
            req.url = "/tests/pages/index.html";
          }
          next();
        });
      },
    },
  ],
});
