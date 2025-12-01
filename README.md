# AbleDOM

A continuous accessibility (a11y) monitor for modern web applications.

AbleDOM is a lightweight JavaScript/TypeScript library that observes your DOM in real-time and detects common accessibility issues as they appear.

_Here be dragons_.

## Installation

```bash
npm install abledom
# or
yarn add abledom
# or
pnpm add abledom
```

## Quick start

```typescript
import { AbleDOM } from "abledom";

const consoleError = win.console?.orig?.error || win.console?.error;

const _ableDOM = new AbleDOM(window, { log: consoleError });

// ...Create and add rules and exceptions
```

### Using rules

```typescript
import { AbleDOM, ContrastRule } from "abledom";

const contrastRule = new ContrastRule();
this._ableDOM.addRule(contrastRule);
```

### Adding valid exceptions

```typescript
import { AbleDOM, ContrastRule } from "abledom";

const contrastExceptions: ((element: HTMLElement) => boolean)[] = [
  (element: HTMLElement) => {
    return element.style?.display === "none";
  },
  (element: HTMLElement) => {
    return element.datalist?.ignore === "true";
  },
];

const contrastRule = new ContrastRule();

contrastExceptions.forEach((exception) => contrastRule.addException(exception));

this._ableDOM.addRule(contrastRule);
```

### Usage in E2E

```typescript
import { scanOnce } from "abledom";

test("page should not have accessibility issues", async () => {
  await page.goto("http://localhost:3000");

  const issues = await scanOnce(page);
  expect(issues.length).toBe(0);
});
```

## Rules

### AtomicRule

Detects focusable elements nested inside other atomic focusable elements (like buttons, links, or inputs). Prevents confusing interactive hierarchies that can break keyboard navigation and assistive technology functionality.

### BadFocusRule

Monitors focus changes to detect when focus is stolen by invisible elements. Helps identify scenarios where focus moves to elements that users cannot see, creating a poor accessibility experience.

### ContrastRule

Validates color contrast ratios between text and background colors according to WCAG standards. Ensures text meets minimum contrast requirements (4.5:1 for normal text, 3:1 for large text) for readability.

### ExistingIdRule

Verifies that elements referenced by `aria-labelledby`, `aria-describedby`, or `<label for>` attributes actually exist in the DOM. Prevents broken accessibility relationships.

### FocusableElementLabelRule

Ensures all focusable interactive elements have accessible labels. Checks for labels through various methods including `<label>` elements, ARIA attributes, alt text, and visible text content.

### FocusLostRule

Detects when keyboard focus is lost without being moved to another valid element. Monitors focus/blur events to catch scenarios where users might lose their place while navigating with keyboard.

### NestedInteractiveElementRule

Identifies interactive elements nested within other interactive elements (e.g., a button inside a link). This pattern can confuse users and assistive technologies about which element to interact with.

### RequiredParentRule

Validates that elements requiring specific parent elements are properly nested. Enforces correct HTML structure for elements like `<li>` (must be in `<ul>` or `<ol>`), table elements, and ARIA roles that have parent requirements.

### TabIndexRule

Warns about problematic uses of the `tabindex` attribute, including positive values that break natural tab order and `tabindex` on non-interactive elements. Promotes accessible keyboard navigation patterns.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
