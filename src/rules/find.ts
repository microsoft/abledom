/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

export class FindElementRule extends ValidationRule {
  type = ValidationRuleType.Warning;
  name = "find-element";
  anchored = true;

  private _conditions: { [name: string]: (element: HTMLElement) => boolean } =
    {};

  addCondition(
    name: string,
    condition: (element: HTMLElement) => boolean,
  ): void {
    this._conditions[name] = condition;
  }

  removeCondition(name: string): void {
    delete this._conditions[name];
  }

  validate(element: HTMLElement): ValidationResult | null {
    for (const name of Object.keys(this._conditions)) {
      if (this._conditions[name](element)) {
        return {
          notification: {
            id: "find-element",
            message: `Element found: ${name}.`,
            element,
          },
        };
      }
    }

    return null;
  }
}
