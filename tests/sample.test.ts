/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";

test("sample test: page loads", async ({ page }) => {
  await page.goto("tests/pages/page1.html");
  await expect(page).toHaveTitle(/Test Page 1/i);
});
