/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type { WindowWithAbleDOMInstance } from "../src/types.js";
import { testWithAttachAbleDOM as test, expect } from "./fixtures.js";

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
    await attachAbleDOM(page);

    await context.close();
  });

  test("should call idle() when AbleDOM instance is exposed", async ({
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
    await attachAbleDOM(page);

    // Set up mock
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

    await context.close();
  });

  test("should report issues when AbleDOM finds problems", async ({
    attachAbleDOM,
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Attach AbleDOM to the page (must await before navigation!)
    await attachAbleDOM(page);

    // Navigate to a page
    await page.goto(
      'data:text/html,<html><body><button id="btn">Button</button></body></html>',
    );

    // Set up mock that returns an issue
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
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
    await attachAbleDOM(page1);

    // Create and attach to second page
    const page2 = await context.newPage();
    await attachAbleDOM(page2);

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
        const win = window as WindowWithAbleDOMInstance;
        win.ableDOMInstanceForTesting = {
          idle: async () => [],
          highlightElement: () => {
            /* noop */
          },
        };
      });
    }

    // Trigger actions on both pages - should work without errors
    await page1.locator("#page1").waitFor();
    await page2.locator("#page2").waitFor();

    await context.close();
  });

  test("should work across navigations", async ({ attachAbleDOM, browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // First navigation to establish page context
    await page.goto(
      'data:text/html,<html><body><div id="page1">Page 1</div></body></html>',
    );

    // Attach AbleDOM
    await attachAbleDOM(page);

    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    await page.locator("#page1").waitFor();

    // Second navigation
    await page.goto(
      'data:text/html,<html><body><div id="page2">Page 2</div></body></html>',
    );

    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => [],
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Should work without errors
    await page.locator("#page2").waitFor();

    await context.close();
  });
});
