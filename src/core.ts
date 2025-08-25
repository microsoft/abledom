/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  IssueUI,
  IssuesUI,
  HTMLElementWithAbleDOMUIFlag,
  isAbleDOMUIElement,
} from "./ui/ui";
import { isAccessibilityAffectingElement } from "./utils";
import { ValidationRule, ValidationIssue } from "./rules/base";

interface HTMLElementWithAbleDOM extends HTMLElement {
  __abledom?: {
    issues?: Map<ValidationRule, IssueUI>;
  };
}

export interface AbleDOMProps {
  log?: typeof console.error;
  bugReport?: {
    isVisible: (issue: ValidationIssue) => boolean;
    onClick: (issue: ValidationIssue) => void;
    getTitle?: (issue: ValidationIssue) => string;
  };
}

export class AbleDOM {
  private _win: Window;
  private _props: AbleDOMProps | undefined = undefined;
  private _observer: MutationObserver;
  private _clearValidationTimeout: (() => void) | undefined;
  private _elementsWithIssues: Set<HTMLElementWithAbleDOM> = new Set();
  private _changedElementIds: Set<string> = new Set();
  private _elementsDependingOnId: Map<string, Set<HTMLElement>> = new Map();
  private _dependantIdsByElement: Map<HTMLElement, Set<string>> = new Map();
  private _idByElement: Map<HTMLElement, string> = new Map();
  private _rules: ValidationRule[] = [];
  private _startFunc: (() => void) | undefined;
  private _isStarted = false;
  private _issuesUI: IssuesUI | undefined;

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

  private _addIssue(rule: ValidationRule, issue: ValidationIssue) {
    if (!this._issuesUI) {
      this._issuesUI = new IssuesUI(this._win, {
        bugReport: this._props?.bugReport,
      });
    }

    const element = issue?.element as HTMLElementWithAbleDOM | undefined;

    if (!issue) {
      this._removeIssue(element || this._win.document.body, rule);
      return;
    }

    let issueUI: IssueUI | undefined;

    if (rule.anchored && element) {
      let abledomOnElement = element.__abledom;

      if (!abledomOnElement) {
        abledomOnElement = element.__abledom = {};
      }

      let issues = abledomOnElement.issues;

      if (!issues) {
        issues = abledomOnElement.issues = new Map();
      }

      issueUI = issues.get(rule);

      if (!issueUI) {
        issueUI = new IssueUI(this._win, this, rule, this._issuesUI);
        issues.set(rule, issueUI);
      }

      this._elementsWithIssues.add(element);
    } else {
      issueUI = new IssueUI(this._win, this, rule, this._issuesUI);
    }

    issueUI.update(issue);
  }

  private _removeIssue(element: HTMLElementWithAbleDOM, rule: ValidationRule) {
    if (!rule.anchored) {
      return;
    }

    const issues = element.__abledom?.issues;

    if (!issues) {
      return;
    }

    const issue = issues.get(rule);

    if (issue) {
      issue.dispose();
      issues.delete(rule);
    }

    if (issues.size === 0) {
      this._elementsWithIssues.delete(element);
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
        element.__abledom?.issues
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

          if (validationResult?.issue) {
            this._addIssue(rule, validationResult.issue);

            const ids = validationResult.dependsOnIds;

            if (ids) {
              for (const id of ids) {
                dependsOnIds.add(id);
              }
            }
          } else if (element.__abledom?.issues?.has(rule)) {
            this._removeIssue(element, rule);
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
      const rules = [...(element.__abledom?.issues?.keys() || [])];
      rules.forEach((rule) => this._removeIssue(element, rule));
    });
  }

  private _onFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;

    if (target && isAbleDOMUIElement(target)) {
      return;
    }

    for (const rule of this._rules) {
      const focusIssue = rule.focused?.(event);

      if (focusIssue) {
        this._addIssue(rule, focusIssue);
      }
    }
  };

  private _onFocusOut = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;

    if (target && isAbleDOMUIElement(target)) {
      return;
    }

    for (const rule of this._rules) {
      const blurIssue = rule.blurred?.(event);

      if (blurIssue) {
        this._addIssue(rule, blurIssue);
      }
    }
  };

  private _notifyAsync = (
    rule: ValidationRule,
    issue: ValidationIssue,
  ): void => {
    this._addIssue(rule, issue);
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

    this._remove(this._elementsWithIssues);
    this._elementsWithIssues.clear();

    this._dependantIdsByElement.clear();
    this._elementsDependingOnId.clear();
    this._idByElement.clear();

    this._issuesUI?.dispose();
    delete this._issuesUI;

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
