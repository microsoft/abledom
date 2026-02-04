/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test as baseTest } from "@playwright/test";
import { attachAbleDOMMethodsToPage } from "../src/index";
import type { WindowWithAbleDOMInstance } from "../src/types.js";
import { test, expect } from "./fixtures.js";

test.describe("page-injector with mocked AbleDOM", () => {
  test("should report AbleDOM issues with correct caller location", async ({
    page,
  }, testInfo) => {
    // Navigate to a simple page
    await page.goto(
      'data:text/html,<html><body><h1>Test</h1><button>Click</button><div id="test">Content</div></body></html>',
    );

    // Mock the AbleDOM instance with issues
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => {
          // Return mock accessibility issues
          return [
            {
              id: "missing-label",
              message: "Button is missing an accessible label",
              element: document.querySelector("button"),
            },
          ];
        },
        highlightElement: (el: HTMLElement) => {
          // Mock highlight - just add a style
          el.style.outline = "2px solid red";
        },
      };
    });

    // This waitFor should trigger the AbleDOM check and report the issue
    await page.locator("button").waitFor();

    // Check that the issue was reported to testInfo attachments
    const customDataAttachments = testInfo.attachments.filter(
      (att) => att.name === "abledom-test-data",
    );

    expect(customDataAttachments.length).toBe(1);

    const reportData = JSON.parse(customDataAttachments[0].body!.toString());
    expect(reportData.type).toBe("AbleDOM Issue");
    expect(reportData.issueCount).toBe(1);
    expect(reportData.callerFile).toContain("page-injector.test.spec.ts");
    expect(reportData.callerLine).toBeGreaterThan(25);
    expect(reportData.issues[0].message).toBe(
      "Button is missing an accessible label",
    );
  });

  test("should not report when no issues are found", async ({
    page,
  }, testInfo) => {
    await page.goto(
      'data:text/html,<html><body><h1>Test</h1><button aria-label="Submit">Click</button></body></html>',
    );

    // Mock AbleDOM with NO issues
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => {
          // Return empty array - no issues
          return [];
        },
        highlightElement: (el: HTMLElement) => {
          el.style.outline = "2px solid red";
        },
      };
    });

    // This should not report anything since there are no issues
    await page.locator("button").waitFor();
    await page.locator("h1").waitFor();

    // Verify no abledom-test-data attachments were added
    const customDataAttachments = testInfo.attachments.filter(
      (att) => att.name === "abledom-test-data",
    );
    expect(customDataAttachments.length).toBe(0);
  });

  test("should report multiple issues from different locators", async ({
    page,
  }, testInfo) => {
    await page.goto(
      'data:text/html,<html><body><h1>Test</h1><button>Button1</button><input type="text"/><button>Button2</button></body></html>',
    );

    // Mock AbleDOM to return different issues on each call
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      let callCount = 0;

      win.ableDOMInstanceForTesting = {
        idle: async () => {
          callCount++;

          if (callCount === 1) {
            // First call - issue with button
            return [
              {
                id: "missing-label-button",
                message: "Button is missing an accessible label",
                element: document.querySelector("button"),
              },
            ];
          } else if (callCount === 2) {
            // Second call - issue with input
            return [
              {
                id: "missing-label-input",
                message: "Input field is missing a label",
                element: document.querySelector("input"),
              },
            ];
          }

          // No issues for other calls
          return [];
        },
        highlightElement: (el: HTMLElement) => {
          el.style.outline = "2px solid red";
        },
      };
    });

    // First waitFor - should report button issue
    await page.locator("button").first().waitFor();

    // Second waitFor - should report input issue
    await page.locator("input").waitFor();

    // Third waitFor - no issues
    await page.locator("h1").waitFor();

    // Verify we got 2 issues reported
    const customDataAttachments = testInfo.attachments.filter(
      (att) => att.name === "abledom-test-data",
    );

    expect(customDataAttachments.length).toBe(2);

    // Check first issue
    const firstReport = JSON.parse(customDataAttachments[0].body!.toString());
    expect(firstReport.issues[0].message).toBe(
      "Button is missing an accessible label",
    );

    // Check second issue
    const secondReport = JSON.parse(customDataAttachments[1].body!.toString());
    expect(secondReport.issues[0].message).toBe(
      "Input field is missing a label",
    );
  });

  test("should handle multiple issues in a single check", async ({
    page,
  }, testInfo) => {
    await page.goto(
      "data:text/html,<html><body><button>B1</button><button>B2</button><input/></body></html>",
    );

    // Mock AbleDOM to return multiple issues at once
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => {
          return [
            {
              id: "issue-1",
              message: "First button missing label",
              element: document.querySelectorAll("button")[0],
            },
            {
              id: "issue-2",
              message: "Second button missing label",
              element: document.querySelectorAll("button")[1],
            },
            {
              id: "issue-3",
              message: "Input missing label",
              element: document.querySelector("input"),
            },
          ];
        },
        highlightElement: (el: HTMLElement) => {
          el.style.outline = "2px solid red";
        },
      };
    });

    // This waitFor should report all 3 issues
    await page.locator("body").waitFor();

    const customDataAttachments = testInfo.attachments.filter(
      (att) => att.name === "abledom-test-data",
    );

    expect(customDataAttachments.length).toBe(1);

    const reportData = JSON.parse(customDataAttachments[0].body!.toString());
    expect(reportData.issueCount).toBe(3);
    expect(reportData.issues).toHaveLength(3);
  });

  test("should report correct caller location when using click()", async ({
    page,
  }, testInfo) => {
    await page.goto(
      "data:text/html,<html><body><h1>Test</h1><button onclick=\"console.log('clicked')\">Click Me</button></body></html>",
    );

    // Mock AbleDOM to return an issue
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => {
          return [
            {
              id: "button-missing-label",
              message: "Button is missing an accessible label",
              element: document.querySelector("button"),
            },
          ];
        },
        highlightElement: (el: HTMLElement) => {
          el.style.outline = "2px solid red";
        },
      };
    });

    // Use click() - this should trigger AbleDOM check via our patched waitFor()
    await page.locator("button").click();

    // Verify the issue was reported with correct caller location
    const customDataAttachments = testInfo.attachments.filter(
      (att) => att.name === "abledom-test-data",
    );

    expect(customDataAttachments.length).toBe(1);

    const reportData = JSON.parse(customDataAttachments[0].body!.toString());
    expect(reportData.type).toBe("AbleDOM Issue");
    expect(reportData.issueCount).toBe(1);
    expect(reportData.callerFile).toContain("page-injector.test.spec.ts");
    expect(reportData.issues[0].message).toBe(
      "Button is missing an accessible label",
    );
  });
});

// This test uses baseTest (without fixture) to test the case where testInfo is not provided
baseTest("should work without testInfo parameter", async ({ page }) => {
  await page.goto(
    "data:text/html,<html><body><button>Test</button></body></html>",
  );

  // Mock AbleDOM with issues
  await page.evaluate(() => {
    const win = window as WindowWithAbleDOMInstance;
    win.ableDOMInstanceForTesting = {
      idle: async () => {
        return [
          {
            id: "test-issue",
            message: "Test accessibility issue",
            element: document.querySelector("button"),
          },
        ];
      },
      highlightElement: (el: HTMLElement) => {
        el.style.outline = "2px solid red";
      },
    };
  });

  // Call without testInfo - should not report anything but should not error
  await attachAbleDOMMethodsToPage(page);

  // Should complete without errors
  await page.locator("button").waitFor();

  // Test passes - no errors thrown
  baseTest.expect(true).toBe(true);
});
