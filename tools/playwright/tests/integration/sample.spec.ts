/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "../fixtures.js";
import type { WindowWithAbleDOMInstance } from "../../src/types.js";

test("integration test with single issue", async ({ page }, testInfo) => {
  await page.goto(
    'data:text/html,<html><body><button id="btn1">Button 1</button></body></html>',
  );

  await page.evaluate(() => {
    const win = window as WindowWithAbleDOMInstance;
    win.ableDOMInstanceForTesting = {
      idle: async () => [
        {
          id: "integration-issue-1",
          message: "Integration test issue one",
          element: document.querySelector("#btn1"),
        },
      ],
      highlightElement: (el: HTMLElement) => {
        el.style.outline = "2px solid red";
      },
    };
  });

  await page.locator("#btn1").click();

  const attachments = testInfo.attachments.filter(
    (a) => a.name === "abledom-test-data",
  );
  expect(attachments.length).toBe(1);
});

test("integration test with multiple issues", async ({ page }, testInfo) => {
  await page.goto(
    'data:text/html,<html><body><input id="input1"/><button id="btn2">Button 2</button></body></html>',
  );

  await page.evaluate(() => {
    const win = window as WindowWithAbleDOMInstance;
    win.ableDOMInstanceForTesting = {
      idle: async () => [
        {
          id: "integration-issue-2",
          message: "Integration test issue two",
          element: document.querySelector("#input1"),
        },
        {
          id: "integration-issue-3",
          message: "Integration test issue three",
          element: document.querySelector("#btn2"),
        },
      ],
      highlightElement: (el: HTMLElement) => {
        el.style.outline = "2px solid red";
      },
    };
  });

  await page.locator("#input1").fill("test");

  const attachments = testInfo.attachments.filter(
    (a) => a.name === "abledom-test-data",
  );
  expect(attachments.length).toBe(1);

  const data = JSON.parse(attachments[0].body!.toString());
  expect(data.issueCount).toBe(2);
});

test("integration test with no issues", async ({ page }, testInfo) => {
  await page.goto(
    'data:text/html,<html><body><div id="accessible">Accessible content</div></body></html>',
  );

  await page.evaluate(() => {
    const win = window as WindowWithAbleDOMInstance;
    win.ableDOMInstanceForTesting = {
      idle: async () => [],
      highlightElement: () => {
        /* no-op for testing */
      },
    };
  });

  await page.locator("#accessible").waitFor();

  const attachments = testInfo.attachments.filter(
    (a) => a.name === "abledom-test-data",
  );
  expect(attachments.length).toBe(0);
});
