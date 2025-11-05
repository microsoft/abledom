/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import { loadTestPage, awaitIdle, getIssuesCount } from "../utils";

test("Label Rule", async ({ page }) => {
  await loadTestPage(page, "tests/labelRule/label.html");

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
  await page.evaluate(() => {
    const label = document.getElementById("button-3-label");
    if (label) {
      label.innerText = "";
    }
  });

  expect(await awaitIdle(page)).toEqual([
    {
      element: '<button id="button-1"></button>',
      help: "https://www.w3.org/WAI/tutorials/forms/labels/",
      id: "focusable-element-label",
      message: "Focusable element must have a non-empty text label.",
    },
    {
      element: '<button title="" id="button-2"></button>',
      help: "https://www.w3.org/WAI/tutorials/forms/labels/",
      id: "focusable-element-label",
      message: "Focusable element must have a non-empty text label.",
    },
    {
      element:
        '<button aria-labelledby="button-3-label" id="button-3"></button>',
      help: "https://www.w3.org/WAI/tutorials/forms/labels/",
      id: "focusable-element-label",
      message: "Focusable element must have a non-empty text label.",
    },
  ]);

  expect(await getIssuesCount(page)).toBe(3);

  await page.evaluate(() => {
    const btn = document.getElementById("button-1");
    if (btn) {
      btn.innerText = "Button1";
    }
  });
  await page.evaluate(() => {
    const btn = document.getElementById("button-2");
    if (btn) {
      btn.title = "Button2";
    }
  });
  await page.evaluate(() => {
    const label = document.getElementById("button-3-label");
    if (label) {
      label.innerText = "Button3";
    }
  });

  expect(await awaitIdle(page)).toEqual([]);

  expect(await getIssuesCount(page)).toBe(0);
});
