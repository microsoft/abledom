/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { defineConfig, devices } from "@playwright/test";
import { attachAbleDOMMethodsToPage } from "../src/index";

export default defineConfig({
  testDir: "./",
  testIgnore: ["**/integration/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["list"],
    ["../src/reporter", { outputFile: ".test-output/test-report.txt" }],
  ],

  use: {
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

export { attachAbleDOMMethodsToPage };
