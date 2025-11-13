/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import { loadTestPage, awaitIdle, getIssuesCount } from "../utils";

test("Contrast Rule", async ({ page }) => {
  await loadTestPage(page, "tests/contrastRule/contrast.html");

  await awaitIdle(page);

  const issues = await getIssuesCount(page);

  // There will be 2 issues:
  // - contrast-text-1 (white on white)
  // - contrast-text-2 (Bad contrast: not enough contrast #000 on #000)
  expect(issues).toBe(2);

  // Make #good-contrast to have bad contrast
  await page.evaluate(() => {
    const el = document.getElementById("good-contrast");
    if (el) {
      el.style.color = "#000";
      el.style.backgroundColor = "#000";
    }
  });
  await awaitIdle(page);
  expect(await getIssuesCount(page)).toBe(3);
});
