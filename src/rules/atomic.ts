/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { focusableElementSelector, matchesSelector } from "../utils";
import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

export class AtomicRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "atomic";
  anchored = true;

  accept(element: HTMLElement): boolean {
    return matchesSelector(element, focusableElementSelector);
  }

  validate(element: HTMLElement): ValidationResult | null {
    const parentAtomic = element.ownerDocument
      .evaluate(
        `ancestor::*[
          @role = 'button' or 
          @role = 'checkbox' or 
          @role = 'link' or 
          @role = 'menuitem' or 
          @role = 'menuitemcheckbox' or 
          @role = 'menuitemradio' or 
          @role = 'option' or 
          @role = 'radio' or 
          @role = 'switch' or 
          @role = 'tab' or 
          @role = 'treeitem' or
          self::a or
          self::button or
          self::input or
          self::option or
          self::textarea 
        ][1]`,
        element,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null,
      )
      .snapshotItem(0);

    if (parentAtomic) {
      return {
        issue: {
          id: "focusable-in-atomic",
          message: "Focusable element inside atomic focusable.",
          element,
          rel: parentAtomic,
        },
      };
    }

    return null;
  }
}
