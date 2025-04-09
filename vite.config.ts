/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { defineConfig } from "vite";

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
});
