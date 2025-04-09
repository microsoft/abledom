/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isElementVisible, getStackTrace } from "../utils";
import { FocusError, BlurError, ValidationRule } from "./base";

export class BadFocusRule extends ValidationRule {
  name = "bad-focus";
  anchored = false;

  private _lastFocusStack: string[] | undefined;
  private _lastBlurStack: string[] | undefined;

  private _reject: (() => void) | undefined;

  async focused(): Promise<FocusError | null> {
    this._lastFocusStack = getStackTrace();
    this._reject?.();
    return null;
  }

  async blurred(): Promise<BlurError | null> {
    this._reject?.();

    const win = this.window;

    if (!win) {
      return null;
    }

    this._lastBlurStack = getStackTrace();

    return new Promise((resolve, reject) => {
      let checkTimer: number | undefined;

      this._reject = () => {
        if (checkTimer) {
          win.clearTimeout(checkTimer);
          checkTimer = undefined;
        }

        this._reject = undefined;
        reject();
      };

      checkTimer = win.setTimeout(() => {
        checkTimer = undefined;

        this._reject = undefined;

        if (
          document.activeElement &&
          !isElementVisible(document.activeElement as HTMLElement)
        ) {
          resolve({
            element: document.activeElement as HTMLElement,
            error: {
              id: "bad-focus",
              message: "Focused stolen by invisible element.",
              stack: this._lastBlurStack,
              relStack: this._lastFocusStack,
            },
          });
        } else {
          resolve(null);
        }
      }, 100);
    });
  }
}
