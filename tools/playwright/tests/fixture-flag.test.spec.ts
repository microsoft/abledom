/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type { WindowWithAbleDOMInstance } from "../src/types.js";
import { test, expect } from "./fixtures.js";

test.describe("fixture with exposeInstanceForTesting", () => {
  test("should call idle() when AbleDOM instance is exposed via exposeInstanceForTesting prop", async ({
    page,
  }) => {
    // Navigate to a page
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Set up a mock that tracks if idle() was called
    let idleCalled = false;
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => {
          (window as unknown as { __idleCalled: boolean }).__idleCalled = true;
          return [];
        },
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger an action
    await page.locator("button").waitFor();

    // Check that idle was called
    idleCalled = await page.evaluate(() => {
      return (window as unknown as { __idleCalled: boolean }).__idleCalled;
    });

    expect(idleCalled).toBe(true);
  });

  test("should work across multiple page navigations", async ({ page }) => {
    // Navigate to first page
    await page.goto(
      'data:text/html,<html><body><div id="page1">Page 1</div></body></html>',
    );

    // Set up mock
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger action
    await page.locator("#page1").waitFor();

    // Navigate to second page
    await page.goto(
      'data:text/html,<html><body><div id="page2">Page 2</div></body></html>',
    );

    // Set up mock on second page
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger action on second page - this should work without errors
    await page.locator("#page2").waitFor();
  });
});
