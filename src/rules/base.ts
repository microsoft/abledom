/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export enum ValidationRuleType {
  Error = 1,
  Warning,
  Info,
}

export interface ValidationNotification {
  id: string;
  message: string;
  element?: HTMLElement;
  rel?: Node;
  link?: string;
  stack?: string[];
  relStack?: string[];
}

export interface ValidationResult {
  notification?: ValidationNotification;
  dependsOnIds?: Set<string>;
}

export interface BlurNotification extends ValidationNotification {
  position?: string[];
}

export abstract class ValidationRule<
  N extends ValidationNotification = ValidationNotification,
> {
  abstract type: ValidationRuleType;
  abstract name: string;
  private _window?: Window;
  private _exceptions: ((element: HTMLElement) => boolean)[] = [];
  private _onNotification:
    | ((rult: ValidationRule<N>, notification: N) => void)
    | undefined;

  static init(
    instance: ValidationRule,
    window: Window,
    onNotification: (
      rule: ValidationRule,
      notification: ValidationNotification,
    ) => void,
  ): void {
    instance._window = window;
    instance._onNotification = onNotification;
  }

  static dispose(instance: ValidationRule): void {
    instance.dispose();
  }

  static checkExceptions(
    instance: ValidationRule,
    element: HTMLElement,
  ): boolean {
    for (const exception of instance._exceptions) {
      if (exception(element)) {
        return true;
      }
    }

    return false;
  }

  private dispose(): void {
    this._window = undefined;
    this._onNotification = undefined;
    this._exceptions = [];
  }

  addException(checkException: (element: HTMLElement) => boolean): void {
    this._exceptions?.push(checkException);
  }

  removeException(checkException: (element: HTMLElement) => boolean): void {
    const index = this._exceptions.indexOf(checkException);

    if (index >= 0) {
      this._exceptions.splice(index, 1);
    }
  }

  /**
   * If true, the rule violation will be anchored to the currently present
   * in DOM element it is applied to, otherwise the error message will show
   * till it is dismissed.
   */
  abstract anchored: boolean;

  /**
   * Window is set when the rule is added to the AbleDOM instance.
   */
  get window(): Window | undefined {
    return this._window;
  }

  // Called when the parent AbleDOM instance is started.
  start?(): void;
  // Called when the parent AbleDOM instance is stopped.
  stop?(): void;

  // Called before validation. If returns false, the rule will not be applied to
  // the element.
  accept?(element: HTMLElement): boolean;

  validate?(element: HTMLElement): ValidationResult | null;

  notify(notification: N): void {
    this._onNotification?.(this, notification);
  }

  focused?(event: FocusEvent): ValidationNotification | null;
  blurred?(event: FocusEvent): BlurNotification | null;
}
