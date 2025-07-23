/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  NotificationUI,
  NotificationsUI,
  HTMLElementWithAbleDOMUIFlag,
  isAbleDOMUIElement,
} from "./ui/ui";
import { isAccessibilityAffectingElement } from "./utils";
import { ValidationRule, ValidationNotification } from "./rules/base";

interface HTMLElementWithAbleDOM extends HTMLElement {
  __abledom?: {
    notifications?: Map<ValidationRule, NotificationUI>;
  };
}

export interface AbleDOMProps {
  log?: typeof console.error;
  bugReport?: {
    isVisible: (notification: ValidationNotification) => boolean;
    onClick: (notification: ValidationNotification) => void;
    getTitle?: (notification: ValidationNotification) => string;
  };
}

export class AbleDOM {
  private _win: Window;
  private _props: AbleDOMProps | undefined = undefined;
  private _observer: MutationObserver;
  private _clearValidationTimeout: (() => void) | undefined;
  private _elementsWithNotifications: Set<HTMLElementWithAbleDOM> = new Set();
  private _changedElementIds: Set<string> = new Set();
  private _elementsDependingOnId: Map<string, Set<HTMLElement>> = new Map();
  private _dependantIdsByElement: Map<HTMLElement, Set<string>> = new Map();
  private _idByElement: Map<HTMLElement, string> = new Map();
  private _rules: ValidationRule[] = [];
  private _startFunc: (() => void) | undefined;
  private _isStarted = false;
  private _notificationsUI: NotificationsUI | undefined;

  constructor(win: Window, props: AbleDOMProps = {}) {
    this._win = win;
    this._props = props;

    const _elementsToValidate: Set<HTMLElementWithAbleDOM> = new Set();
    const _elementsToRemove: Set<HTMLElementWithAbleDOM> = new Set();

    const doc = win.document;

    doc.addEventListener("focusin", this._onFocusIn, true);
    doc.addEventListener("focusout", this._onFocusOut, true);

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

      this._observer.observe(doc, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      // Initial validation.
      findTargets(doc.body, false);
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
        addTarget(n, _elementsToRemove.has(node as HTMLElementWithAbleDOM));
      }
    }

    function findTargets(node: Node, removed: boolean): void {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      addTarget(node as HTMLElement, removed);

      const walker = doc.createTreeWalker(
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

  private _addNotification(
    rule: ValidationRule,
    notification: ValidationNotification,
  ) {
    if (!this._notificationsUI) {
      this._notificationsUI = new NotificationsUI(this._win, {
        bugReport: this._props?.bugReport,
      });
    }

    const element = notification?.element as HTMLElementWithAbleDOM | undefined;

    if (!notification) {
      this._removeNotification(element || this._win.document.body, rule);
      return;
    }

    let notificationUI: NotificationUI | undefined;

    if (rule.anchored && element) {
      let abledomOnElement = element.__abledom;

      if (!abledomOnElement) {
        abledomOnElement = element.__abledom = {};
      }

      let notifications = abledomOnElement.notifications;

      if (!notifications) {
        notifications = abledomOnElement.notifications = new Map();
      }

      notificationUI = notifications.get(rule);

      if (!notificationUI) {
        notificationUI = new NotificationUI(
          this._win,
          this,
          rule,
          this._notificationsUI,
        );
        notifications.set(rule, notificationUI);
      }

      this._elementsWithNotifications.add(element);
    } else {
      notificationUI = new NotificationUI(
        this._win,
        this,
        rule,
        this._notificationsUI,
      );
    }

    notificationUI.update(notification);
  }

  private _removeNotification(
    element: HTMLElementWithAbleDOM,
    rule: ValidationRule,
  ) {
    if (!rule.anchored) {
      return;
    }

    const notifications = element.__abledom?.notifications;

    if (!notifications) {
      return;
    }

    const notification = notifications.get(rule);

    if (notification) {
      notification.dispose();
      notifications.delete(rule);
    }

    if (notifications.size === 0) {
      this._elementsWithNotifications.delete(element);
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
        element.__abledom?.notifications
      ) {
        const dependsOnIds = new Set<string>();

        for (const rule of this._rules) {
          if (!rule.validate || rule.accept?.(element) === false) {
            continue;
          }

          if (ValidationRule.checkExceptions(rule, element)) {
            continue;
          }

          const validationResult = rule.validate?.(element);

          if (validationResult?.notification) {
            this._addNotification(rule, validationResult.notification);

            const ids = validationResult.dependsOnIds;

            if (ids) {
              for (const id of ids) {
                dependsOnIds.add(id);
              }
            }
          } else if (element.__abledom?.notifications?.has(rule)) {
            this._removeNotification(element, rule);
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
      const rules = [...(element.__abledom?.notifications?.keys() || [])];
      rules.forEach((rule) => this._removeNotification(element, rule));
    });
  }

  private _onFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;

    if (target && isAbleDOMUIElement(target)) {
      return;
    }

    for (const rule of this._rules) {
      const focusNotification = rule.focused?.(event);

      if (focusNotification) {
        this._addNotification(rule, focusNotification);
      }
    }
  };

  private _onFocusOut = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;

    if (target && isAbleDOMUIElement(target)) {
      return;
    }

    for (const rule of this._rules) {
      const blurNotification = rule.blurred?.(event);

      if (blurNotification) {
        this._addNotification(rule, blurNotification);
      }
    }
  };

  private _notifyAsync = (
    rule: ValidationRule,
    notification: ValidationNotification,
  ): void => {
    this._addNotification(rule, notification);
  };

  log: typeof console.error = (...args) => {
    return (
      this._props?.log ||
      // In a multi-window application, just `console.error` could belong to a different window.
      (this._win as Window & { console: Console })?.console?.error
    )?.apply(null, args);
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
      ValidationRule.init(rule, this._win, this._notifyAsync);
      rule.start?.();
    }

    this._startFunc?.();
  }

  dispose() {
    const doc = this._win.document;

    doc.addEventListener("focusin", this._onFocusIn, true);
    doc.addEventListener("focusout", this._onFocusOut, true);

    this._remove(this._elementsWithNotifications);
    this._elementsWithNotifications.clear();

    this._dependantIdsByElement.clear();
    this._elementsDependingOnId.clear();
    this._idByElement.clear();

    this._notificationsUI?.dispose();
    delete this._notificationsUI;

    this._clearValidationTimeout?.();

    for (const rule of this._rules) {
      rule.stop?.();
      ValidationRule.dispose(rule);
    }

    this._rules = [];

    if (this._startFunc) {
      delete this._startFunc;
    } else {
      this._observer.disconnect();
    }
  }
}
