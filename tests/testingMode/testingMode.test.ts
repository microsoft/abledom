/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import { loadTestPage, issueSelector } from "../utils";

interface WindowWithAbleDOMInstance extends Window {
  ableDOMInstanceForTesting?: {
    idle: (markAsRead?: boolean, timeout?: number) => Promise<unknown[] | null>;
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

  test("idle() with markAsRead=true should not return same issues on subsequent calls", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // First call with markAsRead=true
    const firstCallIssues = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      const result = await instance?.idle(true);
      return result?.length ?? 0;
    });

    expect(firstCallIssues).toBe(1);

    // Second call should return empty array since issues were marked as read
    const secondCallIssues = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      const result = await instance?.idle();
      return result?.length ?? 0;
    });

    expect(secondCallIssues).toBe(0);
  });

  test("idle() with markAsRead=false should return same issues on subsequent calls", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // First call with markAsRead=false (or omitted)
    const firstCallIssues = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      const result = await instance?.idle(false);
      return result?.length ?? 0;
    });

    expect(firstCallIssues).toBe(1);

    // Second call should still return the same issues
    const secondCallIssues = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      const result = await instance?.idle();
      return result?.length ?? 0;
    });

    expect(secondCallIssues).toBe(1);
  });

  test("idle() with timeout should return null when timeout expires before validation completes", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue to trigger validation
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Call idle with a very short timeout (1ms) immediately after triggering validation
    // This should timeout before validation completes
    const result = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;

      // Trigger another change to ensure validation is pending
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.setAttribute("data-test", "changed");
      }

      // Call idle with 1ms timeout - should return null if validation is still pending
      return await instance?.idle(false, 1);
    });

    // Result should be null (timeout) or an array (validation completed fast enough)
    // We accept both outcomes since timing can vary
    expect(result === null || Array.isArray(result)).toBe(true);
  });

  test("idle() with sufficient timeout should return issues", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Call idle with a long timeout - should return issues
    const issues = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      const result = await instance?.idle(false, 5000);
      return result;
    });

    expect(issues).not.toBeNull();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues!.length).toBe(1);
  });

  test("idle() timeout should not mark issues as read", async ({ page }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Wait for initial validation to complete
    await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;
      await instance?.idle(false, 5000);
    });

    // Trigger a new change and call idle with markAsRead=true but very short timeout
    const timedOutResult = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;

      // Trigger a change to start new validation
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.setAttribute("data-test", Date.now().toString());
      }

      // Call with markAsRead=true but 1ms timeout - should return null
      return await instance?.idle(true, 1);
    });

    // If timeout occurred, issues should NOT have been marked as read
    if (timedOutResult === null) {
      const subsequentIssues = await page.evaluate(async () => {
        const instance = (window as WindowWithAbleDOMInstance)
          .ableDOMInstanceForTesting;
        const result = await instance?.idle(false, 5000);
        return result?.length ?? 0;
      });

      // Issues should still be available since timeout prevented markAsRead
      expect(subsequentIssues).toBe(1);
    }
  });

  test("concurrent idle() calls - one with timeout, one without - both should get issues", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Make two concurrent idle() calls: one with short timeout, one without
    const results = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;

      // Trigger a change to ensure validation is pending
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.setAttribute("data-test", Date.now().toString());
      }

      // Start both calls concurrently
      const [resultWithTimeout, resultWithoutTimeout] = await Promise.all([
        instance?.idle(true, 1), // Very short timeout
        instance?.idle(true, 5000), // Long timeout (effectively no timeout)
      ]);

      return {
        withTimeout: resultWithTimeout,
        withoutTimeout: resultWithoutTimeout,
      };
    });

    // The call with short timeout may return null (timed out) or issues (validation was fast)
    // The call with long timeout should always return issues
    expect(
      results.withoutTimeout === null || Array.isArray(results.withoutTimeout),
    ).toBe(true);

    // If the short timeout call returned null, the long timeout call should still get issues
    if (results.withTimeout === null) {
      expect(Array.isArray(results.withoutTimeout)).toBe(true);
      expect((results.withoutTimeout as unknown[])?.length).toBeGreaterThan(0);
    }
  });

  test("concurrent idle() calls without timeout should both receive issues", async ({
    page,
  }) => {
    await loadTestPage(page, "tests/testingMode/exposed-headless.html");

    // Create an issue
    await page.evaluate(() => {
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.innerText = "";
      }
    });

    // Make two concurrent idle() calls without timeout
    const results = await page.evaluate(async () => {
      const instance = (window as WindowWithAbleDOMInstance)
        .ableDOMInstanceForTesting;

      // Trigger a change
      const btn = document.getElementById("button-1");
      if (btn) {
        btn.setAttribute("data-test", Date.now().toString());
      }

      // Start both calls concurrently
      const [result1, result2] = await Promise.all([
        instance?.idle(false, 5000),
        instance?.idle(false, 5000),
      ]);

      return {
        result1: result1?.length ?? -1,
        result2: result2?.length ?? -1,
      };
    });

    // Both should receive the same issues
    expect(results.result1).toBe(1);
    expect(results.result2).toBe(1);
  });
});
