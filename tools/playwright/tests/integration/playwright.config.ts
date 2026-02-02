/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: "sample.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [
    [
      "../../src/reporter",
      { outputFile: "../../.test-output/integration-report.txt" },
    ],
  ],
  use: {
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
