/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface HTMLElementWithAbleDOMUIFlag extends HTMLElement {
  // A flag to quickly test that the element should be ignored by the validator.
  __abledomui?: boolean;
}

export interface TextNodeWithAbleDOMUIFlag extends Text {
  // A flag to quickly test that the element should be ignored by the validator.
  __abledomui?: boolean;
}

export class DOMBuilder {
  private _doc: Document | undefined;
  private _stack: (HTMLElement | DocumentFragment | null)[];

  constructor(parent: HTMLElement | DocumentFragment) {
    this._doc = parent.ownerDocument;
    this._stack = [parent];
  }

  openTag(
    tagName: string,
    attributes?: Record<string, string>,
    callback?: (element: HTMLElement) => void,
    namespace?: string,
    skip?: boolean,
  ): DOMBuilder {
    const parent = this._stack[0];
    const element = skip
      ? null
      : ((namespace
          ? this._doc?.createElementNS(namespace, tagName)
          : this._doc?.createElement(tagName)) as HTMLElementWithAbleDOMUIFlag);

    if (parent !== undefined) {
      if (parent && element) {
        element.__abledomui = true;

        if (attributes) {
          for (const [key, value] of Object.entries(attributes)) {
            if (key === "class") {
              element.className = value;
            } else if (key === "style") {
              element.style.cssText = value;
            } else {
              element.setAttribute(key, value);
            }
          }
        }

        if (callback) {
          callback(element);
        }

        parent.appendChild(element);
      }

      this._stack.unshift(element);
    }

    return this;
  }

  closeTag(): DOMBuilder {
    if (this._stack.length <= 1) {
      throw new Error("Nothing to close");
    }

    this._stack.shift();

    return this;
  }

  text(text: string): DOMBuilder {
    const textNode: TextNodeWithAbleDOMUIFlag | undefined =
      this._doc?.createTextNode(text);

    if (textNode) {
      textNode.__abledomui = true;
      this._stack[0]?.appendChild(textNode);
    }

    return this;
  }

  element(
    callback: (element: HTMLElement | DocumentFragment) => void,
  ): DOMBuilder {
    const el = this._stack[0];
    el && callback(el);
    return this;
  }
}
