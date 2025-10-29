/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { matchesSelector, isElementVisible } from "../utils";
import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

const interactiveElementSelector = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "details",
  "audio[controls]",
  "video[controls]",
  "*[role='button']",
  "*[role='link']",
  "*[role='checkbox']",
  "*[role='radio']",
  "*[role='switch']",
  "*[role='tab']",
  "*[role='menuitem']",
  "*[role='menuitemcheckbox']",
  "*[role='menuitemradio']",
  "*[role='option']",
  "*[role='treeitem']",
].join(", ");

export class NestedInteractiveElementRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "NestedInteractiveElementRule";
  anchored = true;

  private _isAriaHidden(element: HTMLElement): boolean {
    return element.ownerDocument.evaluate(
      `ancestor-or-self::*[@aria-hidden = 'true' or @hidden]`,
      element,
      null,
      XPathResult.BOOLEAN_TYPE,
      null,
    ).booleanValue;
  }

  private _isInteractive(element: HTMLElement): boolean {
    return matchesSelector(element, interactiveElementSelector);
  }

  private _findNestedInteractive(element: HTMLElement): HTMLElement | null {
    const descendants = element.querySelectorAll(interactiveElementSelector);

    for (let i = 0; i < descendants.length; i++) {
      const descendant = descendants[i] as HTMLElement;

      if (this._isAriaHidden(descendant)) {
        continue;
      }

      return descendant;
    }

    return null;
  }

  accept(element: HTMLElement): boolean {
    return this._isInteractive(element);
  }

  validate(element: HTMLElement): ValidationResult | null {
    if (this._isAriaHidden(element)) {
      return null;
    }

    const nestedElement = this._findNestedInteractive(element);

    if (nestedElement) {
      const elementTag = element.tagName.toLowerCase();
      const elementRole = element.getAttribute("role");
      const nestedTag = nestedElement.tagName.toLowerCase();
      const nestedRole = nestedElement.getAttribute("role");

      const elementDesc = elementRole
        ? `${elementTag}[role="${elementRole}"]`
        : elementTag;
      const nestedDesc = nestedRole
        ? `${nestedTag}[role="${nestedRole}"]`
        : nestedTag;

      return {
        issue: isElementVisible(element)
          ? {
              id: "nested-interactive",
              message: `Interactive element <${elementDesc}> contains a nested interactive element <${nestedDesc}>. This can confuse users and assistive technologies.`,
              element,
              rel: nestedElement,
              help: "https://dequeuniversity.com/rules/axe/4.4/nested-interactive",
            }
          : undefined,
      };
    }

    return null;
  }
}
