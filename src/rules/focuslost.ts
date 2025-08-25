/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isElementVisible, getStackTrace } from "../utils";
import { BlurIssue, ValidationRule, ValidationRuleType } from "./base";

export class FocusLostRule extends ValidationRule<BlurIssue> {
  type = ValidationRuleType.Error;
  name = "focus-lost";
  anchored = false;

  private _focusLostTimeout = 2000; // For now reporting lost focus after 2 seconds of it being lost.
  private _clearScheduledFocusLost: (() => void) | undefined;
  private _focusedElement: HTMLElement | undefined;
  private _focusedElementPosition: string[] | undefined;
  private _lastFocusStack: string[] | undefined;
  private _lastBlurStack: string[] | undefined;
  private _mouseEventTimer: number | undefined;
  private _releaseMouseEvent: (() => void) | undefined;

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

  focused(event: FocusEvent): null {
    const target = event.target as HTMLElement | null;

    this._clearScheduledFocusLost?.();

    if (target) {
      this._lastFocusStack = getStackTrace();

      this._focusedElement = target;
      this._focusedElementPosition = this._serializeElementPosition(target);
    }

    return null;
  }

  blurred(event: FocusEvent): null {
    const target = event.target as HTMLElement | null;
    const win = this.window;

    this._clearScheduledFocusLost?.();

    if (!target || !win || event.relatedTarget || this._mouseEventTimer) {
      return null;
    }

    const doc = win.document;

    const targetPosition =
      this._focusedElement === target
        ? this._focusedElementPosition
        : undefined;

    this._lastBlurStack = getStackTrace();

    // Make sure to not hold the reference once the element is not focused anymore.
    this._focusedElement = undefined;
    this._focusedElementPosition = undefined;

    const focusLostTimer = win.setTimeout(() => {
      delete this._clearScheduledFocusLost;

      if (
        doc.body &&
        (!doc.activeElement || doc.activeElement === doc.body) &&
        (!doc.body.contains(target) || !isElementVisible(target))
      ) {
        this.notify({
          element: target,
          id: "focus-lost",
          message: "Focus lost.",
          stack: this._lastBlurStack,
          relStack: this._lastFocusStack,
          position: targetPosition || [],
        });
      }
    }, this._focusLostTimeout);

    this._clearScheduledFocusLost = () => {
      delete this._clearScheduledFocusLost;
      win.clearTimeout(focusLostTimer);
    };

    return null;
  }

  start(): void {
    const win = this.window;

    if (!win) {
      return;
    }

    const onMouseEvent = () => {
      if (!this._mouseEventTimer) {
        this._mouseEventTimer = win.setTimeout(() => {
          this._mouseEventTimer = undefined;
        }, 0);
      }
    };

    win.addEventListener("mousedown", onMouseEvent, true);
    win.addEventListener("mouseup", onMouseEvent, true);
    win.addEventListener("mousemove", onMouseEvent, true);

    this._releaseMouseEvent = () => {
      delete this._releaseMouseEvent;

      if (this._mouseEventTimer) {
        win.clearTimeout(this._mouseEventTimer);
        delete this._mouseEventTimer;
      }

      win.removeEventListener("mousedown", onMouseEvent, true);
      win.removeEventListener("mouseup", onMouseEvent, true);
      win.removeEventListener("mousemove", onMouseEvent, true);
    };
  }

  stop(): void {
    this._releaseMouseEvent?.();
    this._clearScheduledFocusLost?.();
    this._focusedElement = undefined;
    this._focusedElementPosition = undefined;
    this._lastFocusStack = undefined;
    this._lastBlurStack = undefined;
  }
}
