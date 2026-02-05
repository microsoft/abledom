/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import { loadTestPage, issueSelector } from "../utils";

interface WindowWithAbleDOMInstance extends Window {
  ableDOMInstanceForTesting?: {
    idle: () => Promise<unknown[]>;
    highlightElement: (element: HTMLElement, scrollIntoView: boolean) => void;
  };
}

test.describe("exposeInstanceForTesting prop", () => {
  test("exposeInstanceForTesting: true with headless: false should expose instance and show UI", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-with-ui.html");

    // Check that the instance is exposed
    const hasInstance = await page.evaluate(() => {
      return (
        typeof (window as WindowWithAbleDOMInstance)
          .ableDOMInstanceForTesting !== "undefined"
      );
    });
    expect(hasInstance).toBe(true);

    // Check that the instance has the expected methods
    const hasIdleMethod = await page.evaluate(() => {
      return (
        typeof (window as WindowWithAbleDOMInstance).ableDOMInstanceForTesting
          ?.idle === "function"
      );
    });
    expect(hasIdleMethod).toBe(true);

    // Create an issue by removing the button text
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Wait for AbleDOM to process
    await page.evaluate(async () => {
      await (
        window as WindowWithAbleDOMInstance
      ).ableDOMInstanceForTesting?.idle();
    });

    // With headless: false, the UI should be visible
    const issueCount = await page.$$(issueSelector);
    expect(issueCount.length).toBeGreaterThan(0);
  });

  test("exposeInstanceForTesting: true with headless: true should expose instance but hide UI", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Check that the instance is exposed
    const hasInstance = await page.evaluate(() => {
      return (
        typeof (window as WindowWithAbleDOMInstance)
          .ableDOMInstanceForTesting !== "undefined"
      );
    });
    expect(hasInstance).toBe(true);

    // Check that the instance has the expected methods
    const hasIdleMethod = await page.evaluate(() => {
      return (
        typeof (window as WindowWithAbleDOMInstance).ableDOMInstanceForTesting
          ?.idle === "function"
      );
    });
    expect(hasIdleMethod).toBe(true);

    // Create an issue by removing the button text
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Wait for AbleDOM to process
    await page.evaluate(async () => {
      await (
        window as WindowWithAbleDOMInstance
      ).ableDOMInstanceForTesting?.idle();
    });

    // With headless: true, the UI should NOT be visible
    const issueCount = await page.$$(issueSelector);
    expect(issueCount.length).toBe(0);
  });

  test("without exposeInstanceForTesting should NOT expose instance", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/not-exposed.html");

    // Check that the instance is NOT exposed
    const hasInstance = await page.evaluate(() => {
      return (
        typeof (window as WindowWithAbleDOMInstance)
          .ableDOMInstanceForTesting !== "undefined"
      );
    });
    expect(hasInstance).toBe(false);
  });

  test("exposed instance idle() should return issues", async ({ page }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Use the exposed instance to get issues
    const issues = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      const result = await instance?.idle();
      return result?.map((issue) => ({
        id: (issue as { id?: string }).id,
        message: (issue as { message?: string }).message,
      }));
    });

    expect(issues).toBeDefined();
    expect(issues!.length).toBe(1);
    expect(issues![0].id).toBe("focusable-element-label");
  });
});
