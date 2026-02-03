/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  test as base,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType,
  TestInfo,
} from "@playwright/test";
import { attachAbleDOMMethodsToPage } from "./page-injector.js";

/**
 * Fixtures provided by the AbleDOM test integration.
 */
export interface AbleDOMFixtures {
  /**
   * Attaches AbleDOM accessibility checking to a page.
   * Call this after creating a page to enable automatic a11y checks on locator actions.
   *
   * @param page - The Playwright Page object to attach AbleDOM to
   *
   * @example
   * ```typescript
   * const page = await context.newPage();
   * attachAbleDOM(page);
   * // Now all locator actions on this page will trigger AbleDOM checks
   * ```
   */
  attachAbleDOM: (page: Page) => void;
}

/**
 * Creates an AbleDOM test fixture that can be merged with other Playwright test fixtures.
 *
 * This fixture provides an `attachAbleDOM` function that can be called after creating
 * a page to enable automatic accessibility checks on all locator actions.
 *
 * @returns A TestType that can be merged with other tests using `mergeTests`
 *
 * @example
 * ```typescript
 * // In your fixtures file
 * import { test as base, mergeTests } from '@playwright/test';
 * import { createAbleDOMTest } from 'abledom-playwright';
 *
 * // Merge with base test
 * const test = mergeTests(base, createAbleDOMTest());
 *
 * // Or merge with existing custom fixtures
 * const baseTestWithAbleDOM = mergeTests(existingTest, createAbleDOMTest());
 * export const myTest = baseTestWithAbleDOM.extend<MyFixtures>({
 *   myPage: async ({ attachAbleDOM, browser }, use) => {
 *     const context = await browser.newContext();
 *     const page = await context.newPage();
 *     attachAbleDOM(page); // Enable AbleDOM on this page
 *     await use(page);
 *     await context.close();
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // In a test file
 * import { test } from './fixtures';
 *
 * test('accessibility test', async ({ attachAbleDOM, browser }) => {
 *   const context = await browser.newContext();
 *   const page = await context.newPage();
 *   attachAbleDOM(page);
 *
 *   await page.goto('https://example.com');
 *   // All locator actions now trigger AbleDOM checks
 *   await page.locator('button').click();
 * });
 * ```
 */
export function createAbleDOMTest(): TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & AbleDOMFixtures,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> {
  return base.extend<AbleDOMFixtures>({
    attachAbleDOM: async ({}, use, testInfo) => {
      const attach = (page: Page): void => {
        try {
          attachAbleDOMMethodsToPage(page, testInfo);
          console.log("[AbleDOM] Attached to page.");
        } catch (error) {
          console.warn(`[AbleDOM] Failed to attach to page: ${error}`);
        }
      };
      await use(attach);
    },
  });
}

/**
 * Creates an AbleDOM page fixture for use with Playwright's test.extend().
 *
 * This provides an alternative way to integrate AbleDOM that automatically
 * attaches to pages without manual setup in each test. Use this when you
 * want to override Playwright's built-in `page` fixture.
 *
 * @returns A fixture definition that can be used with test.extend()
 *
 * @example
 * ```typescript
 * // fixtures.ts
 * import { test as base } from '@playwright/test';
 * import { createAbleDOMPageFixture } from 'abledom-playwright';
 *
 * export const test = base.extend({
 *   page: createAbleDOMPageFixture(),
 * });
 *
 * // my-test.spec.ts
 * import { test } from './fixtures';
 *
 * test('accessibility test', async ({ page }) => {
 *   await page.goto('https://example.com');
 *   // AbleDOM is automatically attached
 *   await page.locator('button').click();
 * });
 * ```
 */
export function createAbleDOMPageFixture() {
  return async (
    { page }: { page: Page },
    use: (page: Page) => Promise<void>,
    testInfo: TestInfo,
  ): Promise<void> => {
    attachAbleDOMMethodsToPage(page, testInfo);
    await use(page);
  };
}
