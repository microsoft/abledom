/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isElementVisible, getStackTrace } from "../utils";
import { FocusError, BlurError, ValidationRule } from "./base";

export class FocusLostRule extends ValidationRule {
  name = "focus-lost";
  anchored = false;

  private _focusLostTimeout = 2000; // For now reporting lost focus after 2 seconds of it being lost.
  private _clearScheduledFocusLost: (() => void) | undefined;
  private _focusedElement: HTMLElement | undefined;
  private _focusedElementPosition: string[] | undefined;
  private _lastFocusStack: string[] | undefined;
  private _lastBlurStack: string[] | undefined;

  private _serializeElementPosition(element: HTMLElement): string[] {
    const position: string[] = [];
    const parentElement = element.parentElement;

    if (!parentElement) {
      return position;
    }

    for (
      let el: HTMLElement | null = parentElement;
      el;
      el = el.parentElement
    ) {
      const tagName = el.tagName.toLowerCase();
      position.push(tagName);
    }

    return position;
  }

  async focused(event: FocusEvent): Promise<FocusError | null> {
    const target = event.target as HTMLElement | null;

    this._clearScheduledFocusLost?.();

    if (target) {
      this._lastFocusStack = getStackTrace();

      this._focusedElement = target;
      this._focusedElementPosition = this._serializeElementPosition(target);
    }

    return null;
  }

  async blurred(event: FocusEvent): Promise<BlurError | null> {
    const target = event.target as HTMLElement | null;
    const win = this.window;

    this._clearScheduledFocusLost?.();

    if (!target || !win || event.relatedTarget) {
      return null;
    }

    let focusLostTimer: number | undefined;
    let rejectPromise: (() => void) | undefined;

    const targetPosition =
      this._focusedElement === target
        ? this._focusedElementPosition
        : undefined;

    this._lastBlurStack = getStackTrace();

    // Make sure to not hold the reference once the element is not focused anymore.
    this._focusedElement = undefined;
    this._focusedElementPosition = undefined;

    this._clearScheduledFocusLost = () => {
      delete this._clearScheduledFocusLost;

      rejectPromise?.();

      if (focusLostTimer) {
        win.clearTimeout(focusLostTimer);
        focusLostTimer = undefined;
      }
    };

    return new Promise<BlurError | null>((resolve, reject) => {
      rejectPromise = () => {
        rejectPromise = undefined;
        reject();
      };

      focusLostTimer = win.setTimeout(() => {
        focusLostTimer = undefined;
        rejectPromise = undefined;
        delete this._clearScheduledFocusLost;

        if (
          win.document.body &&
          (!win.document.activeElement ||
            win.document.activeElement === win.document.body) &&
          (!win.document.body.contains(target) || !isElementVisible(target))
        ) {
          resolve({
            element: target,
            position: targetPosition || [],
            error: {
              id: "focus-lost",
              message: "Focus lost.",
              stack: this._lastBlurStack,
              relStack: this._lastFocusStack,
            },
          });
        } else {
          resolve(null);
        }
      }, this._focusLostTimeout);
    });
  }
}
