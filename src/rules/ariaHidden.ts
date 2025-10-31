/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { focusableElementSelector, matchesSelector } from "../utils";
import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

export class AriaHiddenFocusableRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "AriaHiddenFocusableRule";
  anchored = true;

  private _isAriaHidden(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;

    while (current && current !== element.ownerDocument.documentElement) {
      if (current.getAttribute("aria-hidden") === "true") {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  private _hasAriaHiddenAncestor(element: HTMLElement): boolean {
    let current: HTMLElement | null = element.parentElement;

    while (current && current !== element.ownerDocument.documentElement) {
      if (current.getAttribute("aria-hidden") === "true") {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  private _isFocusable(element: HTMLElement): boolean {
    if (!matchesSelector(element, focusableElementSelector)) {
      return false;
    }

    const tabindex = element.getAttribute("tabindex");

    if (tabindex && parseInt(tabindex, 10) < -1) {
      return false;
    }

    if (element.hasAttribute("disabled")) {
      return false;
    }

    return true;
  }

  private _findFocusableDescendants(element: HTMLElement): HTMLElement[] {
    const focusable: HTMLElement[] = [];
    const descendants = element.querySelectorAll(focusableElementSelector);

    descendants.forEach((descendant) => {
      if (this._isFocusable(descendant as HTMLElement)) {
        focusable.push(descendant as HTMLElement);
      }
    });

    return focusable;
  }

  accept(element: HTMLElement): boolean {
    return (
      element.getAttribute("aria-hidden") === "true" ||
      matchesSelector(element, focusableElementSelector)
    );
  }

  validate(element: HTMLElement): ValidationResult | null {
    if (element.getAttribute("aria-hidden") === "true") {
      const hasAriaHiddenAncestor = this._hasAriaHiddenAncestor(element);
      if (this._isFocusable(element) && !hasAriaHiddenAncestor) {
        return {
          issue: {
            id: "aria-hidden-focusable",
            message: "Element with aria-hidden='true' should not be focusable.",
            element,
            help: "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html",
          },
        };
      }

      if (!hasAriaHiddenAncestor) {
        const focusableDescendants = this._findFocusableDescendants(element);

        if (focusableDescendants.length > 0) {
          return {
            issue: {
              id: "aria-hidden-contains-focusable",
              message: `Element with aria-hidden='true' contains ${focusableDescendants.length} focusable ${
                focusableDescendants.length === 1 ? "element" : "elements"
              }.`,
              element,
              rel: focusableDescendants[0],
              help: "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html",
            },
          };
        }
      }
    }

    if (
      this._isFocusable(element) &&
      this._isAriaHidden(element) &&
      element.getAttribute("aria-hidden") !== "true"
    ) {
      return {
        issue: {
          id: "focusable-in-aria-hidden",
          message:
            "Focusable element is inside a container with aria-hidden='true'.",
          element,
          help: "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html",
        },
      };
    }

    return null;
  }
}
