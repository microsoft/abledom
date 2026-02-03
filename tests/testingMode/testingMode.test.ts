/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import { loadTestPage, issueSelector } from "../utils";

interface WindowWithAbleDOMInstance extends Window {
  ableDOMInstanceForTestingNeeded?: number;
  ableDOMInstanceForTesting?: {
    idle: () => Promise<unknown[]>;
    highlightElement: (element: HTMLElement, scrollIntoView: boolean) => void;
  };
}

test.describe("Testing Mode Flag", () => {
  test("mode 1 (headed) should expose instance and override headless to false", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/testingMode-headed.html");

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

    // Mode 1 should show UI (headless: false), so we should see the AbleDOM UI elements
    // when there are issues. Let's create an issue by removing the button text.
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

    // In headed mode (headless: false), the UI should be visible
    const issueCount = await page.$$(issueSelector);
    expect(issueCount.length).toBeGreaterThan(0);
  });

  test("mode 2 (headless) should expose instance and override headless to true", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/testingMode-headless.html");

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

    // Mode 2 should hide UI (headless: true), so we should NOT see UI elements
    // even when there are issues.
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

    // In headless mode (headless: true), the UI should NOT be visible
    const issueCount = await page.$$(issueSelector);
    expect(issueCount.length).toBe(0);
  });

  test("mode 3 (exact) should expose instance and preserve original headless prop", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/testingMode-exact.html");

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

    // Mode 3 should preserve the original headless prop (false in this test)
    // So UI should be visible when there are issues.
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

    // With headless: false preserved, UI should be visible
    const issueCount = await page.$$(issueSelector);
    expect(issueCount.length).toBeGreaterThan(0);
  });

  test("no flag should NOT expose instance", async ({ page }) => {
    await loadTestPage(page, "tests/testingMode/testingMode-none.html");

    // Check that the instance is NOT exposed when no flag is set
    const hasInstance = await page.evaluate(() => {
      return (
        typeof (window as WindowWithAbleDOMInstance)
          .ableDOMInstanceForTesting !== "undefined"
      );
    });
    expect(hasInstance).toBe(false);
  });

  test("exposed instance idle() should return issues", async ({ page }) => {
    await loadTestPage(page, "tests/testingMode/testingMode-headless.html");

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
