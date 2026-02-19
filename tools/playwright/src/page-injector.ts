/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { Page, Locator, TestInfo } from "@playwright/test";
import type { WindowWithAbleDOMInstance } from "./types.js";
import { normalizeFilePath } from "./utils.js";

/**
 * Options for AbleDOM idle() behavior.
 */
export interface AbleDOMIdleOptions {
  /**
   * Whether to mark returned issues as read so they won't be returned again.
   * @default true
   */
  markAsRead?: boolean;
  /**
   * Timeout in milliseconds to wait for validation to complete.
   * If validation doesn't complete within the timeout, returns null.
   * @default 2000
   */
  timeout?: number;
}

interface LocatorMonkeyPatchedWithAbleDOM extends Locator {
  __locatorIsMonkeyPatchedWithAbleDOM?: boolean;
}

type FunctionWithCachedLocatorProto = ((page: Page) => void) & {
  __cachedLocatorProto?: LocatorMonkeyPatchedWithAbleDOM;
};

/**
 * Helper function to extract caller location from stack trace.
 * Finds the first stack frame that's in a test file (.spec.ts or .test.ts).
 */
function getCallerLocation(
  stack?: string,
): { file: string; line: number; column: number } | null {
  if (!stack) {
    return null;
  }

  const lines = stack.split("\n");

  // Find the first line that's NOT from page-injector.js/ts (the library) or internal playwright files
  for (const line of lines) {
    // Skip if it's from page-injector.js/.ts (the library file) or node_modules
    // But don't skip test files that happen to have "page-injector" in their name
    if (
      (line.includes("page-injector.js") ||
        line.includes("page-injector.ts")) &&
      !line.includes(".test.") &&
      !line.includes(".spec.")
    ) {
      continue;
    }
    if (line.includes("node_modules")) {
      continue;
    }

    // Match patterns like:
    // at Context.<anonymous> (/path/to/file.spec.ts:25:30)
    // at /path/to/file.spec.ts:25:30
    // at webpack:/@scope/package/file.spec.ts:25:30
    const match = line.match(/\((.+):(\d+):(\d+)\)|at\s+(.+):(\d+):(\d+)/);
    if (match) {
      const rawFile = match[1] || match[4];
      const lineNum = parseInt(match[2] || match[5], 10);
      const column = parseInt(match[3] || match[6], 10);

      // Make sure it's a test file
      if (
        rawFile &&
        (rawFile.includes(".spec.") || rawFile.includes(".test."))
      ) {
        return { file: normalizeFilePath(rawFile), line: lineNum, column };
      }
    }
  }

  return null;
}

/**
 * Attaches AbleDOM accessibility checking methods to a Playwright Page.
 *
 * This function monkey-patches Playwright's Locator prototype to automatically
 * run AbleDOM accessibility checks before each user action (click, fill, etc.).
 *
 * @param page - The Playwright Page object to attach methods to
 * @param testInfo - Optional TestInfo object for reporting issues to the custom reporter
 * @param options - Optional idle options (markAsRead defaults to true, timeout defaults to 2000ms)
 *
 * @example
 * ```typescript
 * import { test } from '@playwright/test';
 * import { attachAbleDOMMethodsToPage } from 'abledom-playwright';
 *
 * test('my test', async ({ page }, testInfo) => {
 *   await page.goto('https://example.com');
 *   await attachAbleDOMMethodsToPage(page, testInfo);
 *
 *   // All subsequent locator actions will trigger AbleDOM checks
 *   await page.locator('button').click();
 * });
 * ```
 */
export async function attachAbleDOMMethodsToPage(
  page: Page,
  testInfo?: TestInfo,
  options: AbleDOMIdleOptions = {},
): Promise<void> {
  const { markAsRead = true, timeout = 2000 } = options;
  const attachAbleDOMMethodsToPageWithCachedLocatorProto: FunctionWithCachedLocatorProto =
    attachAbleDOMMethodsToPage;

  // Store testInfo and options on the page object so each page has its own config
  (page as unknown as Record<string, unknown>).__abledomTestInfo = testInfo;
  (page as unknown as Record<string, unknown>).__abledomMarkAsRead = markAsRead;
  (page as unknown as Record<string, unknown>).__abledomTimeout = timeout;

  let locatorProto: LocatorMonkeyPatchedWithAbleDOM | undefined =
    attachAbleDOMMethodsToPageWithCachedLocatorProto.__cachedLocatorProto;

  if (!locatorProto) {
    // Playwright doesn't expose Locator prototype, so we get it from an instance.
    locatorProto =
      attachAbleDOMMethodsToPageWithCachedLocatorProto.__cachedLocatorProto =
        Object.getPrototypeOf(page.locator("head"));
  }

  if (!locatorProto) {
    return;
  }

  // It is more efficient to monkey-patch the prototype once, comparing to patching
  // every instance.
  if (!locatorProto.__locatorIsMonkeyPatchedWithAbleDOM) {
    locatorProto.__locatorIsMonkeyPatchedWithAbleDOM = true;

    const reportAbleDOMIssues = async (self: Locator) => {
      const currentPage = self.page();

      // Get options from the page object
      const pageMarkAsRead = (currentPage as unknown as Record<string, unknown>)
        .__abledomMarkAsRead as boolean | undefined;
      const pageTimeout = (currentPage as unknown as Record<string, unknown>)
        .__abledomTimeout as number | undefined;

      const result = await currentPage.evaluate(
        async ({ markAsRead, timeout }) => {
          const win = window as unknown as WindowWithAbleDOMInstance;
          const hasInstance = !!win.ableDOMInstanceForTesting;
          const issues = await win.ableDOMInstanceForTesting?.idle(
            markAsRead,
            timeout,
          );
          const el = issues?.[0]?.element;

          if (el) {
            // TODO: Make highlighting flag-dependent.
            // win.ableDOMInstanceForTesting?.highlightElement(el, true);
          }

          return {
            hasInstance,
            issues: issues?.map((issue) => ({
              id: issue.id,
              message: issue.message,
              element: issue.element?.outerHTML,
              parentParent:
                issue.element?.parentElement?.parentElement?.outerHTML,
            })),
          };
        },
        { markAsRead: pageMarkAsRead, timeout: pageTimeout },
      );

      const { hasInstance, issues } = result;

      // Get testInfo from the page object (stored by attachAbleDOMMethodsToPage)
      const pageTestInfo = (currentPage as unknown as Record<string, unknown>)
        .__abledomTestInfo as TestInfo | undefined;

      // Report assertion count to the reporter
      if (pageTestInfo) {
        await pageTestInfo.attach("abledom-assertion", {
          body: JSON.stringify({
            type: hasInstance ? "good" : "bad",
          }),
          contentType: "application/json",
        });
      }

      if (issues && issues.length) {
        // Capture stack trace to find the actual caller location
        const error = new Error();
        const callerLocation = getCallerLocation(error.stack);

        // Report to custom reporter if testInfo is available
        if (pageTestInfo && callerLocation) {
          await pageTestInfo.attach("abledom-test-data", {
            body: JSON.stringify({
              type: "AbleDOM Issue",
              callerFile: callerLocation.file,
              callerLine: callerLocation.line,
              callerColumn: callerLocation.column,
              issueCount: issues.length,
              issues: issues.map((issue) => ({
                id: issue.id,
                message: issue.message,
                element: issue.element,
                parentParent: issue.parentParent,
              })),
            }),
            contentType: "application/json",
          });
        }

        // Note: We don't throw an error here - just report the issues
        // This allows tests to continue and report all issues found
      }
    };

    const origWaitFor = locatorProto.waitFor;

    locatorProto.waitFor = async function waitFor(
      this: Locator,
      ...args: Parameters<Locator["waitFor"]>
    ) {
      const ret = await origWaitFor.apply(this, args);
      await reportAbleDOMIssues(this);
      return ret;
    };

    // Patch action methods to call our patched waitFor() before executing
    // This ensures all actions trigger AbleDOM checks
    const actionsToPatch = [
      "click",
      "dblclick",
      "fill",
      "type",
      "press",
      "check",
      "uncheck",
      "selectOption",
      "hover",
      "tap",
      "focus",
      "blur",
      "clear",
      "setInputFiles",
    ] as const;

    type LocatorAction = (...args: unknown[]) => Promise<void>;
    type LocatorProtoWithActions = Record<string, LocatorAction>;

    for (const action of actionsToPatch) {
      const originalAction = (
        locatorProto as unknown as LocatorProtoWithActions
      )[action];

      if (originalAction) {
        (locatorProto as unknown as LocatorProtoWithActions)[action] =
          async function (this: Locator, ...args: unknown[]) {
            const ret = await originalAction.apply(this, args);
            await reportAbleDOMIssues(this);
            return ret;
          };
      }
    }
  }
}
