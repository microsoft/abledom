/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isElementVisible, getStackTrace } from "../utils";
import { ValidationRule, ValidationRuleType } from "./base";

export class BadFocusRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "bad-focus";
  anchored = false;

  private _lastFocusStack: string[] | undefined;
  private _lastBlurStack: string[] | undefined;
  private _clearCheckTimer: (() => void) | undefined;

  focused(): null {
    this._lastFocusStack = getStackTrace();
    return null;
  }

  blurred(): null {
    const win = this.window;

    if (!win) {
      return null;
    }

    this._lastBlurStack = getStackTrace();

    this._clearCheckTimer?.();

    const checkTimer = win.setTimeout(() => {
      delete this._clearCheckTimer;

      if (
        document.activeElement &&
        !isElementVisible(document.activeElement as HTMLElement)
      ) {
        this.notify({
          id: "bad-focus",
          message: "Focused stolen by invisible element.",
          element: document.activeElement as HTMLElement,
          stack: this._lastBlurStack,
          relStack: this._lastFocusStack,
        });
      }
    }, 100);

    this._clearCheckTimer = () => {
      delete this._clearCheckTimer;
      win.clearTimeout(checkTimer);
    };

    return null;
  }

  stop(): void {
    this._clearCheckTimer?.();
    this._clearCheckTimer = undefined;
    this._lastFocusStack = undefined;
    this._lastBlurStack = undefined;
  }
}
