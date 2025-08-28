/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import {
  loadTestPage,
  awaitIdle,
  getIssuesCount,
  getIssuesFromCallbacks,
} from "../utils";

test("Headless Mode", async ({ page }) => {
  await loadTestPage(page, "tests/headlessMode/headless.html");

  expect(await getIssuesCount(page)).toBe(0);

  await page.evaluate(() => {
    const btn = document.getElementById("button-1");
    if (btn) {
      btn.innerText = "";
    }
  });
  await page.evaluate(() => {
    const btn = document.getElementById("button-2");
    if (btn) {
      btn.title = "";
    }
  });

  await awaitIdle(page);

  expect(await getIssuesCount(page)).toBe(0);
  expect((await getIssuesFromCallbacks(page)).length).toBe(2);

  await page.evaluate(() => {
    const btn = document.getElementById("button-1");
    if (btn) {
      btn.innerText = "Button1";
    }
  });

  await awaitIdle(page);

  expect(await getIssuesCount(page)).toBe(0);
  expect((await getIssuesFromCallbacks(page)).length).toBe(1);

  await page.evaluate(() => {
    const btn = document.getElementById("button-2");
    if (btn) {
      btn.title = "Button2";
    }
  });

  await awaitIdle(page);

  expect(await getIssuesCount(page)).toBe(0);
  expect((await getIssuesFromCallbacks(page)).length).toBe(0);
});
