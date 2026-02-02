/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { Page, TestInfo } from "@playwright/test";
import { attachAbleDOMMethodsToPage } from "./page-injector.js";
import { AbleDOMReporter, type AbleDOMReporterOptions } from "./reporter.js";

export { attachAbleDOMMethodsToPage } from "./page-injector.js";
export {
  AbleDOMReporter,
  type AbleDOMReporterOptions,
  type ReportEntry,
} from "./reporter.js";

/**
 * Options for the AbleDOM Playwright setup.
 */
export interface AbleDOMSetupOptions {
  /**
   * Output file path for the accessibility report.
   * Defaults to 'abledom-report.txt'.
   */
  reportFile?: string;
}

/**
 * Result of the AbleDOM setup, containing the reporter configuration
 * and a function to attach AbleDOM to pages.
 */
export interface AbleDOMSetupResult {
  /**
   * Reporter configuration to use in playwright.config.ts.
   * This is a tuple of [ReporterClass, options] that can be spread into the reporters array.
   */
  reporter: [typeof AbleDOMReporter, AbleDOMReporterOptions];

  /**
   * Function to attach AbleDOM methods to a page.
   * Call this in your test after navigating to the page.
   *
   * @param page - The Playwright Page object
   * @param testInfo - The TestInfo object from the test
   */
  attachToPage: (page: Page, testInfo?: TestInfo) => void;
}

/**
 * Sets up AbleDOM integration for Playwright tests.
 *
 * This function returns a configuration object that includes:
 * - A reporter configuration for your playwright.config.ts
 * - A function to attach AbleDOM to pages in your tests
 *
 * @param options - Configuration options
 * @returns Setup result with reporter config and page attachment function
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * import { setupAbleDOM } from 'abledom-playwright';
 *
 * const abledom = setupAbleDOM({ reportFile: 'accessibility-report.txt' });
 *
 * export default defineConfig({
 *   reporter: [
 *     ['list'],
 *     abledom.reporter,
 *   ],
 * });
 *
 * // Export for use in tests
 * export { abledom };
 * ```
 *
 * @example
 * ```typescript
 * // my-test.spec.ts
 * import { test } from '@playwright/test';
 * import { abledom } from './playwright.config';
 *
 * test('accessibility test', async ({ page }, testInfo) => {
 *   await page.goto('https://example.com');
 *   abledom.attachToPage(page, testInfo);
 *
 *   // All subsequent actions will trigger accessibility checks
 *   await page.locator('button').click();
 * });
 * ```
 */
export function setupAbleDOM(
  options: AbleDOMSetupOptions = {},
): AbleDOMSetupResult {
  const reporterOptions: AbleDOMReporterOptions = {
    outputFile: options.reportFile || "abledom-report.txt",
  };

  return {
    reporter: [AbleDOMReporter, reporterOptions],
    attachToPage: attachAbleDOMMethodsToPage,
  };
}

/**
 * Creates an AbleDOM test fixture for use with Playwright's test.extend().
 *
 * This provides an alternative way to integrate AbleDOM that automatically
 * attaches to pages without manual setup in each test.
 *
 * @param options - Configuration options
 * @returns A fixture definition that can be used with test.extend()
 *
 * @example
 * ```typescript
 * // fixtures.ts
 * import { test as base } from '@playwright/test';
 * import { createAbleDOMFixture } from 'abledom-playwright';
 *
 * export const test = base.extend({
 *   page: createAbleDOMFixture(),
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
export function createAbleDOMFixture() {
  return async (
    { page }: { page: Page },
    use: (page: Page) => Promise<void>,
    testInfo: TestInfo,
  ): Promise<void> => {
    attachAbleDOMMethodsToPage(page, testInfo);
    await use(page);
  };
}
