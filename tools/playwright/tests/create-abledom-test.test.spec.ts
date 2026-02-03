/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { testWithAttachAbleDOM as test, expect } from "./fixtures.js";
import type { WindowWithAbleDOM } from "./types.js";

test.describe("createAbleDOMTest fixture", () => {
  test("should provide attachAbleDOM function", async ({
    attachAbleDOM,
    browser,
  }) => {
    expect(typeof attachAbleDOM).toBe("function");

    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate first to have a valid page context
    await page.goto("data:text/html,<html><body>Test</body></html>");

    // Should not throw when attaching
    attachAbleDOM(page);

    // Give time for async operations to settle
    await page.waitForTimeout(100);

    await context.close();
  });

  test("should set ableDOMInstanceForTestingNeeded flag after navigation", async ({
    attachAbleDOM,
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate first to have a valid page context
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Now attach AbleDOM to the page
    attachAbleDOM(page);

    // Set up mock
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOM;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger an action - this will also set the flag via the patched waitFor
    await page.locator("button").waitFor();

    // Check that the flag was set
    const flagValue = await page.evaluate(() => {
      return (window as WindowWithAbleDOM).ableDOMInstanceForTestingNeeded;
    });

    expect(flagValue).toBe(true);

    await context.close();
  });

  test("should report issues when AbleDOM finds problems", async ({
    attachAbleDOM,
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Attach AbleDOM to the page
    attachAbleDOM(page);

    // Navigate to a page
    await page.goto(
      'data:text/html,<html><body><button id="btn">Button</button></body></html>',
    );

    // Set up mock that returns an issue
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOM;
      win.ableDOMInstanceForTesting = {
        idle: async () => [
          {
            id: "test-issue-1",
            message: "Test accessibility issue",
            element: document.querySelector("#btn"),
          },
        ],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger an action that will check AbleDOM
    await page.locator("#btn").click();

    // Check that an attachment was created
    const attachments = testInfo.attachments.filter(
      (a) => a.name === "abledom-test-data",
    );
    expect(attachments.length).toBe(1);

    // Verify the attachment content
    const data = JSON.parse(attachments[0].body!.toString());
    expect(data.type).toBe("AbleDOM Issue");
    expect(data.issueCount).toBe(1);
    expect(data.issues[0].id).toBe("test-issue-1");
    expect(data.issues[0].message).toBe("Test accessibility issue");

    await context.close();
  });

  test("should work with multiple pages in the same context", async ({
    attachAbleDOM,
    browser,
  }) => {
    const context = await browser.newContext();

    // Create and attach to first page
    const page1 = await context.newPage();
    attachAbleDOM(page1);

    // Create and attach to second page
    const page2 = await context.newPage();
    attachAbleDOM(page2);

    // Navigate both pages
    await page1.goto(
      'data:text/html,<html><body><div id="page1">Page 1</div></body></html>',
    );
    await page2.goto(
      'data:text/html,<html><body><div id="page2">Page 2</div></body></html>',
    );

    // Set up mocks on both pages
    for (const page of [page1, page2]) {
      await page.evaluate(() => {
        const win = window as WindowWithAbleDOM;
        win.ableDOMInstanceForTesting = {
          idle: async () => [],
          highlightElement: () => {
            /* noop */
          },
        };
      });
    }

    // Trigger actions on both pages
    await page1.locator("#page1").waitFor();
    await page2.locator("#page2").waitFor();

    // Both should have the flag set
    const flag1 = await page1.evaluate(
      () => (window as WindowWithAbleDOM).ableDOMInstanceForTestingNeeded,
    );
    const flag2 = await page2.evaluate(
      () => (window as WindowWithAbleDOM).ableDOMInstanceForTestingNeeded,
    );

    expect(flag1).toBe(true);
    expect(flag2).toBe(true);

    await context.close();
  });

  test("should persist flag across navigations via addInitScript", async ({
    attachAbleDOM,
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // First navigation to establish page context
    await page.goto(
      'data:text/html,<html><body><div id="page1">Page 1</div></body></html>',
    );

    // Attach AbleDOM - this will set flag immediately and add init script for future navigations
    attachAbleDOM(page);

    await page.evaluate(() => {
      const win = window as WindowWithAbleDOM;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    await page.locator("#page1").waitFor();

    const flag1 = await page.evaluate(
      () => (window as WindowWithAbleDOM).ableDOMInstanceForTestingNeeded,
    );
    expect(flag1).toBe(true);

    // Second navigation - flag should be set by addInitScript before page scripts run
    await page.goto(
      'data:text/html,<html><body><div id="page2">Page 2</div></body></html>',
    );

    // Check flag immediately after navigation (before setting up mock)
    // The addInitScript should have already set it
    const flag2BeforeMock = await page.evaluate(
      () => (window as WindowWithAbleDOM).ableDOMInstanceForTestingNeeded,
    );
    expect(flag2BeforeMock).toBe(true);

    await page.evaluate(() => {
      const win = window as WindowWithAbleDOM;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    await page.locator("#page2").waitFor();

    const flag2 = await page.evaluate(
      () => (window as WindowWithAbleDOM).ableDOMInstanceForTestingNeeded,
    );
    expect(flag2).toBe(true);

    await context.close();
  });
});
