/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface ValidationError {
  id: string;
  message: string;
  rel?: Node;
  link?: string;
  stack?: string[];
  relStack?: string[];
}

export interface ValidationResult {
  error?: ValidationError;
  dependsOnIds?: Set<string>;
}

export interface FocusError {
  element: HTMLElement;
  error: ValidationError;
}

export interface BlurError {
  element: HTMLElement;
  position?: string[];
  error: ValidationError;
}

export abstract class ValidationRule {
  abstract name: string;
  private _window?: Window;
  private _exceptions: ((element: HTMLElement) => boolean)[] = [];

  static setWindow(instance: ValidationRule, window: Window): void {
    instance._window = window;
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

  async focused?(event: FocusEvent): Promise<FocusError | null>;
  async blurred?(event: FocusEvent): Promise<BlurError | null>;
}
