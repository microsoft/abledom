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

test.describe("idle options (markAsRead and timeout)", () => {
  test("should pass markAsRead and timeout options to idle()", async ({
    page,
  }) => {
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Mock AbleDOM to capture the arguments passed to idle()
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      (window as unknown as { __idleArgs: unknown[] }).__idleArgs = [];

      win.ableDOMInstanceForTesting = {
        idle: async (markAsRead?: boolean, timeout?: number) => {
          (window as unknown as { __idleArgs: unknown[] }).__idleArgs.push({
            markAsRead,
            timeout,
          });
          return [];
        },
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Trigger an action - should use default options (markAsRead=true, timeout=2000)
    await page.locator("button").waitFor();

    // Verify the options were passed
    const idleArgs = await page.evaluate(() => {
      return (window as unknown as { __idleArgs: unknown[] }).__idleArgs;
    });

    expect(idleArgs.length).toBe(1);
    expect(idleArgs[0]).toEqual({ markAsRead: true, timeout: 2000 });
  });

  test("should use default markAsRead=true and timeout=2000", async ({
    page,
  }) => {
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Track idle() calls and their arguments
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      (window as unknown as { __idleCalls: unknown[] }).__idleCalls = [];

      win.ableDOMInstanceForTesting = {
        idle: async (markAsRead?: boolean, timeout?: number) => {
          (window as unknown as { __idleCalls: unknown[] }).__idleCalls.push({
            markAsRead,
            timeout,
          });
          return [];
        },
        highlightElement: () => {
          /* noop */
        },
      };
    });

    await page.locator("button").waitFor();

    const calls = await page.evaluate(() => {
      return (window as unknown as { __idleCalls: unknown[] }).__idleCalls;
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ markAsRead: true, timeout: 2000 });
  });

  test("should handle null return from idle() when timeout expires", async ({
    page,
  }, testInfo) => {
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Mock AbleDOM to return null (simulating timeout expiration)
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      win.ableDOMInstanceForTesting = {
        idle: async () => {
          // Return null to simulate timeout
          return null;
        },
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // This should not throw even when idle() returns null
    await page.locator("button").waitFor();

    // Verify no issues were reported (since null was returned)
    const customDataAttachments = testInfo.attachments.filter(
      (att) => att.name === "abledom-test-data",
    );
    expect(customDataAttachments.length).toBe(0);
  });

  test("markAsRead=true should cause subsequent idle() calls to receive same option", async ({
    page,
  }) => {
    await page.goto(
      "data:text/html,<html><body><button>B1</button><input/></body></html>",
    );

    // Track all idle() calls
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      (window as unknown as { __allIdleCalls: unknown[] }).__allIdleCalls = [];

      win.ableDOMInstanceForTesting = {
        idle: async (markAsRead?: boolean, timeout?: number) => {
          (
            window as unknown as { __allIdleCalls: unknown[] }
          ).__allIdleCalls.push({ markAsRead, timeout });
          return [];
        },
        highlightElement: () => {
          /* noop */
        },
      };
    });

    // Multiple actions should all pass the same options
    await page.locator("button").waitFor();
    await page.locator("input").waitFor();

    const calls = await page.evaluate(() => {
      return (window as unknown as { __allIdleCalls: unknown[] })
        .__allIdleCalls;
    });

    expect(calls).toHaveLength(2);
    // Both calls should have the same default options
    expect(calls[0]).toEqual({ markAsRead: true, timeout: 2000 });
    expect(calls[1]).toEqual({ markAsRead: true, timeout: 2000 });
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

test.describe("action argument passthrough", () => {
  test("should pass all arguments correctly to original action (fill)", async ({
    page,
  }) => {
    await page.goto(
      'data:text/html,<html><body><input type="text" id="test-input" /></body></html>',
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

    // Call fill with value and options - this tests that Function.prototype.apply.call
    // correctly passes all arguments to the original action
    await page.locator("#test-input").fill("test value", { timeout: 5000 });

    // Verify the input was actually filled with the correct value
    const inputValue = await page.locator("#test-input").inputValue();
    expect(inputValue).toBe("test value");
  });

  test("should pass all arguments correctly to original action (selectOption)", async ({
    page,
  }) => {
    await page.goto(
      `data:text/html,<html><body>
        <select id="test-select">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </select>
      </body></html>`,
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

    // Call selectOption with value and options
    await page.locator("#test-select").selectOption("b", { timeout: 5000 });

    // Verify the correct option was selected
    const selectedValue = await page.locator("#test-select").inputValue();
    expect(selectedValue).toBe("b");
  });
});

baseTest.describe("custom idle options via attachAbleDOMMethodsToPage", () => {
  baseTest(
    "should pass custom markAsRead=false option",
    async ({ page }, testInfo) => {
      await page.goto(
        "data:text/html,<html><body><button>Test</button></body></html>",
      );

      // Attach with custom options
      await attachAbleDOMMethodsToPage(page, testInfo, { markAsRead: false });

      // Track idle() calls
      await page.evaluate(() => {
        const win = window as WindowWithAbleDOMInstance;
        (window as unknown as { __idleOpts: unknown[] }).__idleOpts = [];

        win.ableDOMInstanceForTesting = {
          idle: async (markAsRead?: boolean, timeout?: number) => {
            (window as unknown as { __idleOpts: unknown[] }).__idleOpts.push({
              markAsRead,
              timeout,
            });
            return [];
          },
          highlightElement: () => {
            /* noop */
          },
        };
      });

      await page.locator("button").waitFor();

      const opts = await page.evaluate(() => {
        return (window as unknown as { __idleOpts: unknown[] }).__idleOpts;
      });

      baseTest.expect(opts).toHaveLength(1);
      baseTest.expect(opts[0]).toEqual({ markAsRead: false, timeout: 2000 });
    },
  );

  baseTest("should pass custom timeout option", async ({ page }, testInfo) => {
    await page.goto(
      "data:text/html,<html><body><button>Test</button></body></html>",
    );

    // Attach with custom timeout
    await attachAbleDOMMethodsToPage(page, testInfo, { timeout: 5000 });

    // Track idle() calls
    await page.evaluate(() => {
      const win = window as WindowWithAbleDOMInstance;
      (window as unknown as { __idleOpts: unknown[] }).__idleOpts = [];

      win.ableDOMInstanceForTesting = {
        idle: async (markAsRead?: boolean, timeout?: number) => {
          (window as unknown as { __idleOpts: unknown[] }).__idleOpts.push({
            markAsRead,
            timeout,
          });
          return [];
        },
        highlightElement: () => {
          /* noop */
        },
      };
    });

    await page.locator("button").waitFor();

    const opts = await page.evaluate(() => {
      return (window as unknown as { __idleOpts: unknown[] }).__idleOpts;
    });

    baseTest.expect(opts).toHaveLength(1);
    baseTest.expect(opts[0]).toEqual({ markAsRead: true, timeout: 5000 });
  });

  baseTest(
    "should pass both custom markAsRead and timeout options",
    async ({ page }, testInfo) => {
      await page.goto(
        "data:text/html,<html><body><button>Test</button></body></html>",
      );

      // Attach with both custom options
      await attachAbleDOMMethodsToPage(page, testInfo, {
        markAsRead: false,
        timeout: 10000,
      });

      // Track idle() calls
      await page.evaluate(() => {
        const win = window as WindowWithAbleDOMInstance;
        (window as unknown as { __idleOpts: unknown[] }).__idleOpts = [];

        win.ableDOMInstanceForTesting = {
          idle: async (markAsRead?: boolean, timeout?: number) => {
            (window as unknown as { __idleOpts: unknown[] }).__idleOpts.push({
              markAsRead,
              timeout,
            });
            return [];
          },
          highlightElement: () => {
            /* noop */
          },
        };
      });

      await page.locator("button").waitFor();

      const opts = await page.evaluate(() => {
        return (window as unknown as { __idleOpts: unknown[] }).__idleOpts;
      });

      baseTest.expect(opts).toHaveLength(1);
      baseTest.expect(opts[0]).toEqual({ markAsRead: false, timeout: 10000 });
    },
  );
});
