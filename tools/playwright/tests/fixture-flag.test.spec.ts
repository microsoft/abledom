/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type { WindowWithAbleDOMInstance } from "../src/types.js";
import { test, expect } from "./fixtures.js";

test.describe("fixture flag setting", () => {
  test("should set ableDOMInstanceForTestingNeeded flag on the page", async ({
    page,
  }) => {
    // Navigate to a page
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Set up a mock that tracks if idle() was called
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger an action that should set the flag
    await page.locator("button").waitFor();

    // Check that the flag was set
    const flagValue = await page.evaluate(() => {
      return (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTestingNeeded;
    });

    expect(flagValue).toBe(2);
  });

  test("should set flag even when using fixture before navigation", async ({
    page,
  }) => {
    // This test specifically tests the fixture pattern where attachAbleDOMMethodsToPage
    // is called before any navigation happens

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

    // Check flag on first page
    const flag1 = await page.evaluate(
      () =>
        (window as WindowWithAbleDOMInstance).ableDOMInstanceForTestingNeeded,
    );
    expect(flag1).toBe(2);

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

    // Trigger action on second page
    await page.locator("#page2").waitFor();

    // Check flag on second page - this should also be true
    const flag2 = await page.evaluate(
      () =>
        (window as WindowWithAbleDOMInstance).ableDOMInstanceForTestingNeeded,
    );
    expect(flag2).toBe(2);
  });
});
