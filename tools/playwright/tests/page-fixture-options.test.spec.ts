/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test as baseTest, expect } from "@playwright/test";
import { createAbleDOMPageFixture } from "../src/index";
import type { WindowWithAbleDOMInstance } from "../src/types.js";

// Test with custom markAsRead=false option
const testWithMarkAsReadFalse = baseTest.extend({
  page: createAbleDOMPageFixture({ markAsRead: false }),
});

// Test with custom timeout option
const testWithCustomTimeout = baseTest.extend({
  page: createAbleDOMPageFixture({ timeout: 5000 }),
});

// Test with both custom options
const testWithBothOptions = baseTest.extend({
  page: createAbleDOMPageFixture({ markAsRead: false, timeout: 3000 }),
});

testWithMarkAsReadFalse.describe(
  "createAbleDOMPageFixture with markAsRead=false",
  () => {
    testWithMarkAsReadFalse(
      "should pass markAsRead=false to idle()",
      async ({ page }) => {
        await page.goto(
          "data:text/html,<html><body><button>Test</button></body></html>",
        );

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

        expect(opts).toHaveLength(1);
        expect(opts[0]).toEqual({ markAsRead: false, timeout: 2000 });
      },
    );
  },
);

testWithCustomTimeout.describe(
  "createAbleDOMPageFixture with custom timeout",
  () => {
    testWithCustomTimeout(
      "should pass custom timeout to idle()",
      async ({ page }) => {
        await page.goto(
          "data:text/html,<html><body><button>Test</button></body></html>",
        );

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

        expect(opts).toHaveLength(1);
        expect(opts[0]).toEqual({ markAsRead: true, timeout: 5000 });
      },
    );
  },
);

testWithBothOptions.describe(
  "createAbleDOMPageFixture with both custom options",
  () => {
    testWithBothOptions(
      "should pass both custom options to idle()",
      async ({ page }) => {
        await page.goto(
          "data:text/html,<html><body><button>Test</button></body></html>",
        );

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

        expect(opts).toHaveLength(1);
        expect(opts[0]).toEqual({ markAsRead: false, timeout: 3000 });
      },
    );
  },
);
