/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  matchesSelector,
  focusableElementSelector,
  isElementVisible,
} from "../utils";
import { ValidationRule, ValidationResult } from "./base";

const _keyboardEditableInputTypes = new Set([
  "text",
  "password",
  "email",
  "search",
  "tel",
  "url",
  "number",
  "date",
  "month",
  "week",
  "time",
  "datetime-local",
]);

export class FocusableElementLabelRule extends ValidationRule {
  name = "FocusableElementLabelRule";
  anchored = true;

  private _isAriaHidden(element: HTMLElement): boolean {
    return document.evaluate(
      `ancestor-or-self::*[@aria-hidden = 'true' or @hidden]`,
      element,
      null,
      XPathResult.BOOLEAN_TYPE,
      null,
    ).booleanValue;
  }

  private _hasLabel(element: HTMLElement): boolean {
    const labels = (element as HTMLInputElement).labels;

    if (labels && labels.length > 0) {
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label.innerText.trim()) {
          return true;
        }
      }
    }

    if (element.tagName === "IMG") {
      if ((element as HTMLImageElement).alt.trim()) {
        return true;
      }
    }

    const labelNodes = document.evaluate(
      `(
      .//@aria-label | 
      .//text() | 
      .//@title | 
      .//img/@alt | 
      .//input[@type = 'image']/@alt | 
      .//input[@type != 'hidden'][@type = 'submit' or @type = 'reset' or @type = 'button']/@value
    )[not(ancestor-or-self::*[@aria-hidden = 'true' or @hidden])]`,
      element,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );

    for (let i = 0; i < labelNodes.snapshotLength; i++) {
      const val = labelNodes.snapshotItem(i)?.nodeValue?.trim();

      if (val) {
        return true;
      }
    }

    return false;
  }

  accept(element: HTMLElement): boolean {
    return matchesSelector(element, focusableElementSelector);
  }

  validate(element: HTMLElement): ValidationResult | null {
    if (element.tagName === "INPUT") {
      const type = (element as HTMLInputElement).type;

      if (type === "hidden") {
        return null;
      }

      if (_keyboardEditableInputTypes.has(type)) {
        return null;
      }

      if (type === "image") {
        if ((element as HTMLInputElement).alt.trim()) {
          return null;
        }
      }

      if (type === "submit" || type === "reset" || type === "button") {
        if ((element as HTMLInputElement).value.trim()) {
          return null;
        }
      }
    }

    if (this._isAriaHidden(element)) {
      return null;
    }

    if (this._hasLabel(element)) {
      return null;
    }

    const labelledByNodes = document.evaluate(
      `.//@aria-labelledby[not(ancestor-or-self::*[@aria-hidden = 'true' or @hidden])]`,
      element,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );

    const labelledByValues: string[] = [];

    for (let i = 0; i < labelledByNodes.snapshotLength; i++) {
      const val = (labelledByNodes.snapshotItem(i) as Attr)?.value
        ?.trim()
        .split(" ");

      if (val?.length) {
        labelledByValues.push(...val);
      }
    }

    for (const id of labelledByValues) {
      const labelElement = document.getElementById(id);

      if (labelElement && this._hasLabel(labelElement)) {
        return {
          dependsOnIds: new Set(labelledByValues),
        };
      }
    }

    return {
      error: isElementVisible(element)
        ? {
            id: "focusable-element-label",
            message: "Focusable element must have a non-empty text label.",
          }
        : undefined,
      dependsOnIds: new Set(labelledByValues),
    };
  }
}
