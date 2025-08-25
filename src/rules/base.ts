/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export enum ValidationRuleType {
  Error = 1,
  Warning,
  Info,
}

export interface ValidationIssue {
  id: string;
  message: string;
  element?: HTMLElement;
  rel?: Node;
  help?: string;
  stack?: string[];
  relStack?: string[];
}

export interface ValidationResult {
  issue?: ValidationIssue;
  dependsOnIds?: Set<string>;
}

export interface BlurIssue extends ValidationIssue {
  position?: string[];
}

export abstract class ValidationRule<
  N extends ValidationIssue = ValidationIssue,
> {
  abstract type: ValidationRuleType;
  abstract name: string;
  private _window?: Window;
  private _exceptions: ((element: HTMLElement) => boolean)[] = [];
  private _onIssue: ((rule: ValidationRule<N>, issue: N) => void) | undefined;

  static init(
    instance: ValidationRule,
    window: Window,
    onIssue: (rule: ValidationRule, issue: ValidationIssue) => void,
  ): void {
    instance._window = window;
    instance._onIssue = onIssue;
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
    this._onIssue = undefined;
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

  notify(issue: N): void {
    this._onIssue?.(this, issue);
  }

  focused?(event: FocusEvent): ValidationIssue | null;
  blurred?(event: FocusEvent): BlurIssue | null;
}
