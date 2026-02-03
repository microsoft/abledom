# abledom-playwright

Playwright integration for AbleDOM accessibility testing. This package provides fixtures and a custom reporter that automatically check for accessibility issues during Playwright tests.

## Installation

```bash
npm install abledom-playwright
```

## Quick Start

### 1. Configure the Reporter

In your `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";
import { AbleDOMReporter } from "abledom-playwright";

export default defineConfig({
  reporter: [
    ["list"],
    [AbleDOMReporter, { outputFile: "accessibility-report.json" }],
  ],
});
```

### 2. Use the Fixture

#### Option A: Automatic Page Attachment (Recommended)

For automatic attachment to the built-in `page` fixture:

```typescript
// fixtures.ts
import { test as base } from "@playwright/test";
import { createAbleDOMPageFixture } from "abledom-playwright";

export const test = base.extend({
  page: createAbleDOMPageFixture(),
});

// my-test.spec.ts
import { test } from "./fixtures";

test("accessibility test", async ({ page }) => {
  await page.goto("https://example.com");
  // AbleDOM is automatically attached
  await page.locator("button").click();
});
```

#### Option B: Manual Attachment with `attachAbleDOM`

For tests that create pages manually (e.g., via `context.newPage()`):

```typescript
// fixtures.ts
import { test as base, mergeTests } from "@playwright/test";
import { createAbleDOMTest } from "abledom-playwright";

export const test = mergeTests(base, createAbleDOMTest());

// my-test.spec.ts
import { test } from "./fixtures";

test("accessibility test", async ({ attachAbleDOM, browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await attachAbleDOM(page); // Must await before navigation!
  await page.goto("https://example.com");
  await page.locator("button").click();
});
```

## API Reference

### `createAbleDOMPageFixture()`

Creates a Playwright fixture that automatically attaches AbleDOM to the built-in `page` fixture.

### `createAbleDOMTest()`

Creates a test fixture that provides an `attachAbleDOM` function for manual attachment. Use with `mergeTests()` to combine with other fixtures.

### `attachAbleDOMMethodsToPage(page, testInfo?, mode?)`

Directly attaches AbleDOM accessibility checking to a Playwright page.

**Parameters:**

- `page: Page` - The Playwright Page object
- `testInfo?: TestInfo` - Optional TestInfo for reporting
- `mode?: AbleDOMTestingMode` - Testing mode (1=headed, 2=headless, 3=exact). Defaults to 2.

**Important:** This is an async function and MUST be awaited before navigating the page.

### `AbleDOMReporter`

The custom Playwright reporter class:

```typescript
import { AbleDOMReporter } from "abledom-playwright";

export default defineConfig({
  reporter: [["list"], [AbleDOMReporter, { outputFile: "report.json" }]],
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

## License

MIT
