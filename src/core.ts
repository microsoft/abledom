/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  NotificationsUI,
  NotificationUI,
  HTMLElementWithAbleDOMUIFlag,
  isAbleDOMUIElement,
} from "./ui/ui";
import { isAccessibilityAffectingElement } from "./utils";
import { ValidationRule, ValidationError } from "./rules/base";

export class ValidationErrorReport {
  static _notificationsUI: NotificationsUI | undefined;

  private _notification: NotificationUI | undefined;
  private _onHide: (() => void) | undefined;

  constructor(
    public readonly element: HTMLElement,
    public error: ValidationError,
    onHide?: () => void,
  ) {
    this._onHide = onHide;
    this.report();
  }

  update(error: ValidationError): void {
    this.error = error;
    this.report();
  }

  report(): void {
    if (!ValidationErrorReport._notificationsUI) {
      ValidationErrorReport._notificationsUI = new NotificationsUI(window);
    }

    let notification = this._notification;

    if (notification) {
      /** TODO */
    } else {
      notification = this._notification = new NotificationUI(
        this.element,
        this.error,
      );
    }

    ValidationErrorReport._notificationsUI.addNotification(notification);
  }

  hide(): void {
    this._onHide?.();
  }

  remove(): void {
    if (this._notification) {
      ValidationErrorReport._notificationsUI?.removeNotification(
        this._notification,
      );
      delete this._notification;
    }
  }
}

interface HTMLElementWithAbleDOM extends HTMLElement {
  __abledom?: {
    errors?: Map<ValidationRule, ValidationErrorReport>;
  };
}

export class AbleDOM {
  private _window: Window;
  private _observer: MutationObserver;
  private _clearValidationTimeout: (() => void) | undefined;
  private _elementsWithErrors: Set<HTMLElementWithAbleDOM> = new Set();
  private _changedElementIds: Set<string> = new Set();
  private _elementsDependingOnId: Map<string, Set<HTMLElement>> = new Map();
  private _dependantIdsByElement: Map<HTMLElement, Set<string>> = new Map();
  private _idByElement: Map<HTMLElement, string> = new Map();
  private _rules: ValidationRule[] = [];
  private _startFunc: (() => void) | undefined;
  private _isStarted = false;

  constructor(win: Window) {
    this._window = win;

    const _elementsToValidate: Set<HTMLElementWithAbleDOM> = new Set();
    const _elementsToRemove: Set<HTMLElementWithAbleDOM> = new Set();

    win.document.addEventListener("focusin", this._onFocusIn, true);
    win.document.addEventListener("focusout", this._onFocusOut, true);

    this._observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if ((mutation.target as HTMLElementWithAbleDOMUIFlag).__abledomui) {
          continue;
        }

        const added = mutation.addedNodes;
        const removed = mutation.removedNodes;
        const attributeName = mutation.attributeName;

        if (attributeName === "id") {
          // A bunch of aria attributes reference elements by id, so, we are handling it as special case.
          this._onElementId(mutation.target as HTMLElementWithAbleDOM, false);

          continue;
        }

        // Adding children should trigger revalidation of the parents (it could,
        // for example, be a text that of a parent button).
        lookUp(mutation.target);

        for (let i = 0; i < added.length; i++) {
          findTargets(added[i], false);
        }

        for (let i = 0; i < removed.length; i++) {
          findTargets(removed[i], true);
        }
      }

      this._clearValidationTimeout?.();

      const _validationTimeout: number | undefined = win.setTimeout(() => {
        delete this._clearValidationTimeout;

        this._remove(_elementsToRemove);
        this._validate(_elementsToValidate);

        _elementsToRemove.clear();
        _elementsToValidate.clear();
        this._changedElementIds.clear();
      }, 200); // Defer the validation a bit.

      this._clearValidationTimeout = () => {
        win.clearTimeout(_validationTimeout);
        delete this._clearValidationTimeout;
      };
    });

    this._startFunc = () => {
      delete this._startFunc;

      this._observer.observe(win.document, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Initial validation.
      findTargets(win.document.body, false);
      this._validate(_elementsToValidate);
      _elementsToValidate.clear();
    };

    const addTarget = (node: Node, removed: boolean): void => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const id = (node as HTMLElement).id;

      if (id) {
        this._onElementId(node as HTMLElement, removed);
      }

      if (removed) {
        _elementsToRemove.add(node as HTMLElementWithAbleDOM);
        _elementsToValidate.delete(node as HTMLElementWithAbleDOM);
      } else {
        _elementsToValidate.add(node as HTMLElementWithAbleDOM);
        _elementsToRemove.delete(node as HTMLElementWithAbleDOM);
      }
    };

    function lookUp(node: Node): void {
      for (let n: Node | null = node; n; n = n.parentNode) {
        addTarget(n, false);
      }
    }

    function findTargets(node: Node, removed: boolean): void {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      addTarget(node as HTMLElement, removed);

      const walker = win.document.createTreeWalker(
        node,
        NodeFilter.SHOW_ELEMENT,
        (node: Node): number => {
          addTarget(node, removed);
          return NodeFilter.FILTER_SKIP;
        },
      );

      if (walker) {
        while (walker.nextNode()) {
          /* Iterating for the sake of going through all elements in the subtree. */
        }
      }
    }
  }

  private _onElementId(element: HTMLElement, removed: boolean) {
    const elementId = element.getAttribute("id");
    const oldElementId = this._idByElement.get(element);

    if (oldElementId) {
      this._changedElementIds.add(oldElementId);

      const elements = this._elementsDependingOnId.get(oldElementId);

      if (elements) {
        elements.delete(element);

        if (elements.size === 0) {
          this._elementsDependingOnId.delete(oldElementId);
        }
      }
    }

    if (elementId) {
      this._changedElementIds.add(elementId);

      let elements = this._elementsDependingOnId.get(elementId);

      if (removed) {
        this._idByElement.delete(element);

        if (elements) {
          elements.delete(element);

          if (elements.size === 0) {
            this._elementsDependingOnId.delete(elementId);
          }
        }
      } else {
        this._idByElement.set(element, elementId);

        if (!elements) {
          elements = new Set();
          this._elementsDependingOnId.set(elementId, elements);
        }

        elements.add(element);
      }
    } else {
      this._idByElement.delete(element);
    }
  }

  private _addValidationError(
    element: HTMLElementWithAbleDOM,
    rule: ValidationRule,
    error?: ValidationError,
  ) {
    if (!error) {
      this._removeElementError(element, rule);
      return;
    }

    if (rule.anchored) {
      let abledomOnElement = element.__abledom;

      if (!abledomOnElement) {
        abledomOnElement = element.__abledom = {};
      }

      let errors = abledomOnElement.errors;

      if (!errors) {
        errors = abledomOnElement.errors = new Map();
      }

      const report = errors.get(rule);

      if (report) {
        report.update(error);
      } else {
        errors.set(rule, new ValidationErrorReport(element, error));
      }

      this._elementsWithErrors.add(element);
    } else {
      const report = new ValidationErrorReport(element, error, () => {
        report.remove();
      });
    }
  }

  private _removeElementError(
    element: HTMLElementWithAbleDOM,
    rule: ValidationRule,
  ) {
    if (!rule.anchored) {
      return;
    }

    const errors = element.__abledom?.errors;

    if (!errors) {
      return;
    }

    const report = errors.get(rule);

    if (report) {
      report.remove();
      errors.delete(rule);
    }

    if (errors.size === 0) {
      this._elementsWithErrors.delete(element);
      delete element.__abledom;
    }
  }

  private _validate(elements: Set<HTMLElementWithAbleDOM>) {
    for (const id of this._changedElementIds) {
      const dependingOnId = this._elementsDependingOnId.get(id);

      if (dependingOnId) {
        for (const element of dependingOnId) {
          elements.add(element);
        }
      }
    }

    elements.forEach((element) => {
      if (
        isAccessibilityAffectingElement(element) ||
        element.__abledom?.errors
      ) {
        const dependsOnIds = new Set<string>();

        for (const rule of this._rules) {
          if (rule.accept?.(element) === false) {
            continue;
          }

          if (ValidationRule.checkExceptions(rule, element)) {
            continue;
          }

          const validationResult = rule.validate?.(element);

          if (validationResult) {
            this._addValidationError(element, rule, validationResult.error);

            const ids = validationResult.dependsOnIds;

            if (ids) {
              for (const id of ids) {
                dependsOnIds.add(id);
              }
            }
          } else if (element.__abledom?.errors?.has(rule)) {
            this._removeElementError(element, rule);
          }
        }

        this._processElementDependingOnIds(
          element,
          dependsOnIds.size === 0 ? null : dependsOnIds,
        );
      }
    });
  }

  private _processElementDependingOnIds(
    element: HTMLElement,
    ids: Set<string> | null,
  ): void {
    let dependsOnIds = this._dependantIdsByElement.get(element);

    if (!ids && !dependsOnIds) {
      return;
    }

    if (!dependsOnIds) {
      dependsOnIds = new Set();
    }

    if (!ids) {
      ids = new Set();
    }

    for (const id of dependsOnIds) {
      if (!ids.has(id)) {
        const elements = this._elementsDependingOnId.get(id);

        if (elements) {
          elements.delete(element);

          if (elements.size === 0) {
            this._elementsDependingOnId.delete(id);
          }
        }
      }
    }

    for (const id of ids) {
      if (!dependsOnIds.has(id)) {
        dependsOnIds.add(id);

        let elements = this._elementsDependingOnId.get(id);

        if (!elements) {
          elements = new Set();
          this._elementsDependingOnId.set(id, elements);
        }

        elements.add(element);
      }
    }

    if (dependsOnIds.size === 0) {
      this._dependantIdsByElement.delete(element);
    } else {
      this._dependantIdsByElement.set(element, dependsOnIds);
    }
  }

  private _remove(elements: Set<HTMLElementWithAbleDOM>) {
    elements.forEach((element) => {
      const rules = [...(element.__abledom?.errors?.keys() || [])];
      rules.forEach((rule) => this._removeElementError(element, rule));
    });
  }

  private _onFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;

    if (target && isAbleDOMUIElement(target)) {
      return;
    }

    for (const rule of this._rules) {
      rule.focused?.(event).then(
        (focusError) => {
          if (focusError) {
            this._addValidationError(
              focusError.element,
              rule,
              focusError.error,
            );
          }
        },
        () => {
          // Ignore errors.
        },
      );
    }
  };

  private _onFocusOut = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;

    if (target && isAbleDOMUIElement(target)) {
      return;
    }

    for (const rule of this._rules) {
      rule.blurred?.(event).then(
        (focusError) => {
          if (focusError) {
            this._addValidationError(
              focusError.element,
              rule,
              focusError.error,
            );
          }
        },
        () => {
          // Ignore errors.
        },
      );
    }
  };

  addRule(rule: ValidationRule): void {
    this._rules.push(rule);
  }

  removeRule(rule: ValidationRule): void {
    const index = this._rules.indexOf(rule);

    if (index >= 0) {
      const rule = this._rules[index];
      this._rules.splice(index, 1);
      rule.stop?.();
    }
  }

  start(): void {
    if (this._isStarted) {
      return;
    }

    this._isStarted = true;

    for (const rule of this._rules) {
      ValidationRule.setWindow(rule, this._window);
      rule.start?.();
    }

    this._startFunc?.();
  }

  dispose() {
    this._window.document.addEventListener("focusin", this._onFocusIn, true);
    this._window.document.addEventListener("focusout", this._onFocusOut, true);

    this._remove(this._elementsWithErrors);
    this._elementsWithErrors.clear();

    this._dependantIdsByElement.clear();
    this._elementsDependingOnId.clear();
    this._idByElement.clear();

    this._clearValidationTimeout?.();

    for (const rule of this._rules) {
      rule.stop?.();
    }

    this._rules = [];

    if (this._startFunc) {
      delete this._startFunc;
    } else {
      this._observer.disconnect();
    }
  }
}
