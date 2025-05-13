/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ValidationRule, ValidationRuleType } from "./base";

export class CustomNotifyRule extends ValidationRule {
  type = ValidationRuleType.Info;
  name = "custom-notify";
  anchored = false;

  customNotify(message: string, element?: HTMLElement): void {
    this.notify({
      id: "custom-notify",
      message,
      element,
    });
  }
}
