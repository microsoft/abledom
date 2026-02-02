# abledom-playwright

Playwright integration for AbleDOM accessibility testing. This package provides a custom reporter and page injection utilities that automatically check for accessibility issues during Playwright tests.

## Installation

```bash
npm install abledom-playwright
```

## Quick Start

### 1. Configure the Reporter

In your `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";
import { setupAbleDOM } from "abledom-playwright";

const abledom = setupAbleDOM({
  reportFile: "accessibility-report.txt",
});

export default defineConfig({
  reporter: [["list"], abledom.reporter],
});

// Export for use in tests
export { abledom };
```

### 2. Attach to Pages in Tests

```typescript
import { test } from "@playwright/test";
import { abledom } from "./playwright.config";

test("my accessibility test", async ({ page }, testInfo) => {
  await page.goto("https://example.com");
  abledom.attachToPage(page, testInfo);

  // All subsequent locator actions will trigger accessibility checks
  await page.locator("button").click();
  await page.locator("input").fill("text");
});
```

## Alternative: Using Fixtures

For automatic attachment without manual setup in each test:

```typescript
// fixtures.ts
import { test as base } from "@playwright/test";
import { createAbleDOMFixture } from "abledom-playwright";

export const test = base.extend({
  page: createAbleDOMFixture(),
});

// my-test.spec.ts
import { test } from "./fixtures";

test("accessibility test", async ({ page }) => {
  await page.goto("https://example.com");
  // AbleDOM is automatically attached
  await page.locator("button").click();
});
```

## API Reference

### `setupAbleDOM(options?)`

Creates an AbleDOM configuration for Playwright.

**Options:**

- `reportFile?: string` - Output file path for the accessibility report (default: `'abledom-report.txt'`)

**Returns:**

- `reporter` - Reporter configuration tuple for `playwright.config.ts`
- `attachToPage(page, testInfo?)` - Function to attach AbleDOM to a page

### `attachAbleDOMMethodsToPage(page, testInfo?)`

Directly attaches AbleDOM accessibility checking to a Playwright page.

**Parameters:**

- `page: Page` - The Playwright Page object
- `testInfo?: TestInfo` - Optional TestInfo for reporting

### `createAbleDOMFixture()`

Creates a Playwright fixture that automatically attaches AbleDOM to pages.

### `AbleDOMReporter`

The custom Playwright reporter class. Can be used directly in config:

```typescript
import { AbleDOMReporter } from "abledom-playwright/reporter";

export default defineConfig({
  reporter: [["list"], [AbleDOMReporter, { outputFile: "report.txt" }]],
});
```

## How It Works

1. **Locator Injection**: The package monkey-patches Playwright's `Locator` prototype to intercept all user actions (`click`, `fill`, `type`, etc.)

2. **Accessibility Checks**: Before each action executes, AbleDOM's `idle()` method is called to check for accessibility issues

3. **Issue Reporting**: Found issues are attached to the test and collected by the custom reporter

4. **Report Generation**: At the end of the test run, all issues are written to the specified report file with:
   - Test name and location
   - Exact line number where the action was called
   - Full issue details including element HTML

## Checked Actions

The following Playwright actions trigger accessibility checks:

- `click`, `dblclick`
- `fill`, `type`, `press`
- `check`, `uncheck`
- `selectOption`
- `hover`, `tap`
- `focus`, `blur`
- `clear`
- `setInputFiles`

## Report Format

```
AbleDOM Accessibility Report
================================================================================
Generated: 2024-01-15T10:30:00.000Z
Total Issues: 2
================================================================================

Issue 1:
  Test: my accessibility test
  Test Location: tests/example.spec.ts:10:5
  Called From: tests/example.spec.ts:15:23
  Time: 2024-01-15T10:30:01.000Z
  Data:
    {
        "type": "AbleDOM Issue",
        "issueCount": 1,
        "issues": [...]
    }
--------------------------------------------------------------------------------
```

## License

MIT
