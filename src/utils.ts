/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

interface ErrorWithStack extends ErrorConstructor {
  stackTraceLimit: number;
}

export const focusableElementSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "*[tabindex]",
  "*[contenteditable]",
  "details > summary",
  "audio[controls]",
  "video[controls]",
].join(", ");

export interface HTMLElementAttributes {
  readonly [name: string]: string;
}

export const AccessibilityAffectingElements = {
  a: true,
  area: true,
  article: true,
  aside: true,
  body: true,
  button: true,
  datalist: true,
  details: true,
  dialog: true,
  dl: true,
  form: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
  hr: true,
  iframe: true,
  img: true,
  input: true,
  li: true,
  link: true,
  main: true,
  menu: true,
  menuitem: true,
  meter: true,
  nav: true,
  object: true,
  ol: true,
  option: true,
  progress: true,
  section: true,
  select: true,
  tbody: true,
  textarea: true,
  tfoot: true,
  th: true,
  thead: true,
  ul: true,
};

export const AccessibilityAttributes = {
  role: true,
  tabindex: true,
  disabled: true,
  required: true,
  readonly: true,
  hidden: true,
  "aria-activedescendant": true,
  "aria-atomic": true,
  "aria-autocomplete": true,
  "aria-busy": true,
  "aria-checked": true,
  "aria-colcount": true,
  "aria-colindex": true,
  "aria-colspan": true,
  "aria-controls": true,
  "aria-current": true,
  "aria-describedby": true,
  "aria-details": true,
  "aria-disabled": true,
  "aria-dropeffect": true,
  "aria-errormessage": true,
  "aria-expanded": true,
  "aria-flowto": true,
  "aria-grabbed": true,
  "aria-haspopup": true,
  "aria-hidden": true,
  "aria-invalid": true,
  "aria-keyshortcuts": true,
  "aria-label": true,
  "aria-labelledby": true,
  "aria-level": true,
  "aria-live": true,
  "aria-modal": true,
  "aria-multiline": true,
  "aria-multiselectable": true,
  "aria-orientation": true,
  "aria-owns": true,
  "aria-placeholder": true,
  "aria-posinset": true,
  "aria-pressed": true,
  "aria-readonly": true,
  "aria-relevant": true,
  "aria-required": true,
  "aria-roledescription": true,
  "aria-rowcount": true,
  "aria-rowindex": true,
  "aria-rowspan": true,
  "aria-selected": true,
  "aria-setsize": true,
  "aria-sort": true,
  "aria-valuemax": true,
  "aria-valuemin": true,
  "aria-valuenow": true,
  "aria-valuetext": true,
};

export function isAccessibilityAffectingElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const attributes = getAttributes(element);

  return (
    tagName in AccessibilityAffectingElements ||
    hasAccessibilityAttribute(attributes)
  );
}

export function hasAccessibilityAttribute(
  attributes: HTMLElementAttributes,
): boolean {
  for (let attrName of Object.keys(attributes)) {
    if (
      attrName in AccessibilityAttributes &&
      !(
        attrName === "role" &&
        (attributes[attrName] === "none" ||
          attributes[attrName] === "presentation")
      )
    ) {
      return true;
    }
  }

  return false;
}

export function getAttributes(element: HTMLElement): HTMLElementAttributes {
  const names = element.getAttributeNames();
  const attributes: { [name: string]: string } = {};

  for (let name of names) {
    attributes[name] = element.getAttribute(name) || "";
  }

  return attributes;
}

export function matchesSelector(
  element: HTMLElement,
  selector: string,
): boolean {
  interface HTMLElementWithMatches extends HTMLElement {
    matchesSelector?: typeof HTMLElement.prototype.matches;
    msMatchesSelector?: typeof HTMLElement.prototype.matches;
  }

  const matches =
    element.matches ||
    (element as HTMLElementWithMatches).matchesSelector ||
    (element as HTMLElementWithMatches).msMatchesSelector ||
    element.webkitMatchesSelector;

  return matches && matches.call(element, selector);
}

export function isDisplayNone(element: HTMLElement): boolean {
  const elementDocument = element.ownerDocument;
  const computedStyle = elementDocument.defaultView?.getComputedStyle(element);

  // offsetParent is null for elements with display:none, display:fixed and for <body>.
  if (
    element.offsetParent === null &&
    elementDocument.body !== element &&
    computedStyle?.position !== "fixed"
  ) {
    return true;
  }

  // For our purposes of looking for focusable elements, visibility:hidden has the same
  // effect as display:none.
  if (computedStyle?.visibility === "hidden") {
    return true;
  }

  // if an element has display: fixed, we need to check if it is also hidden with CSS,
  // or within a parent hidden with CSS
  if (computedStyle?.position === "fixed") {
    if (computedStyle.display === "none") {
      return true;
    }

    if (
      element.parentElement?.offsetParent === null &&
      elementDocument.body !== element.parentElement
    ) {
      return true;
    }
  }

  return false;
}

export function isElementVisible(element: HTMLElement): boolean {
  if (!element.ownerDocument || element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  if (isDisplayNone(element)) {
    return false;
  }

  const rect = element.ownerDocument.body.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    // This might happen, for example, if our <body> is in hidden <iframe>.
    return false;
  }

  return true;
}

export function getStackTrace(): string[] {
  const oldStackTraceLimit = (Error as ErrorWithStack).stackTraceLimit;

  try {
    (Error as ErrorWithStack).stackTraceLimit = 1000;

    throw new Error();
  } catch (e) {
    (Error as ErrorWithStack).stackTraceLimit = oldStackTraceLimit;

    return (
      (e as Error).stack
        ?.split("\n")
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("at ")) || []
    );
  }
}
