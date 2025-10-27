/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

// Interactive elements that can naturally receive focus
const INTERACTIVE_ELEMENTS = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "DETAILS",
  "SUMMARY",
  "AUDIO",
  "VIDEO",
]);

// Elements with interactive roles
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "textbox",
  "combobox",
  "listbox",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "tablist",
  "tree",
  "treegrid",
  "treeitem",
  "grid",
  "gridcell",
]);

export class TabIndexRule extends ValidationRule {
  type = ValidationRuleType.Warning;
  name = "tabindex";
  anchored = true;

  accept(element: HTMLElement): boolean {
    return element.hasAttribute("tabindex");
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    if (INTERACTIVE_ELEMENTS.has(element.tagName)) {
      if (element.hasAttribute("disabled")) {
        return false;
      }

      if (element.tagName === "A" && !element.hasAttribute("href")) {
        return false;
      }
      return true;
    }

    const role = element.getAttribute("role");
    if (role && INTERACTIVE_ROLES.has(role)) {
      return true;
    }

    if (element.isContentEditable) {
      return true;
    }

    return false;
  }

  validate(element: HTMLElement): ValidationResult | null {
    const tabindex = parseInt(element.getAttribute("tabindex") || "0", 10);

    if (tabindex > 0 && this.isInteractiveElement(element)) {
      return {
        issue: {
          id: "tabindex",
          message: `Avoid positive tabindex values (found: ${tabindex})`,
          element,
          help: "https://dequeuniversity.com/rules/axe/4.2/tabindex",
        },
      };
    }

    if (!this.isInteractiveElement(element)) {
      return {
        issue: {
          id: "tabindex-non-interactive",
          message: `Avoid using tabindex on non-interactive elements (<${element.tagName.toLowerCase()}>). Consider adding an interactive role or making the element naturally interactive.`,
          element,
          help: "https://dequeuniversity.com/rules/axe/4.2/tabindex",
        },
      };
    }

    return null;
  }
}
