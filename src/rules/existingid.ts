/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ValidationRule, ValidationResult } from "./base";

export class ExistingIdRule extends ValidationRule {
  name = "existing-id";
  anchored = true;

  accept(element: HTMLElement): boolean {
    return (
      element.hasAttribute("aria-labelledby") ||
      element.hasAttribute("aria-describedby") ||
      (element.tagName === "LABEL" && !!(element as HTMLLabelElement).htmlFor)
    );
  }

  validate(element: HTMLElement): ValidationResult | null {
    const ids = [
      ...(element.getAttribute("aria-labelledby")?.split(" ") || []),
      ...(element.getAttribute("aria-describedby")?.split(" ") || []),
      ...(element.tagName === "LABEL"
        ? [(element as HTMLLabelElement).htmlFor]
        : []),
    ].filter((id) => !!id);

    if (ids.length === 0) {
      return null;
    }

    for (const id of ids) {
      if (document.getElementById(id)) {
        return {
          dependsOnIds: new Set(ids),
        };
      }
    }

    return {
      error: {
        id: "missing-id",
        message: `Elements with referenced ids do not extist.`,
      },
      dependsOnIds: new Set(ids),
    };
  }
}
