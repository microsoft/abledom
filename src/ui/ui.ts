/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// The imports below will become string contents of the files unrolled by
// both Vite (in `npm run dev`) and TSUP (in `npm run build`).
import { ValidationError } from "../rules/base";
// @ts-expect-error parsed assets
import css from "./ui.css?raw";
// @ts-expect-error parsed assets
import svgClose from "./close.svg?raw";
// @ts-expect-error parsed assets
import svgHelp from "./help.svg?raw";
// @ts-expect-error parsed assets
import svgLog from "./log.svg?raw";
// @ts-expect-error parsed assets
import svgReveal from "./reveal.svg?raw";

interface WindowWithAbleDOMDevtools extends Window {
  __ableDOMDevtools?: {
    revealElement?: (element: HTMLElement) => Promise<boolean>;
  };
}

export interface HTMLElementWithAbleDOMUIFlag extends HTMLElement {
  // A flag to quickly test that the element should be ignored by the validator.
  __abledomui?: boolean;
}

export class NotificationUI {
  private static _highlight: ElementHighlighter;

  private _wrapper: HTMLElement;

  static getElement(instance: NotificationUI): HTMLElement {
    return instance._wrapper;
  }

  constructor(element: HTMLElement, error: ValidationError) {
    const wrapper = (this._wrapper = document.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag);

    const win = element.ownerDocument.defaultView;

    if (!win) {
      return;
    }

    if (!NotificationUI._highlight) {
      NotificationUI._highlight = new ElementHighlighter(win);
    }

    wrapper.__abledomui = true;

    wrapper.innerHTML = `
      <div class="abledom-notification-container"><div class="abledom-notification">
        <button class="button" title="Log to Console">${svgLog}</button>
        <button class="button" title="Reveal in Elements panel">${svgReveal}</button>
        ${error.message}
        <a href class="button close" href="/" title="Open help" target="_blank">${svgHelp}</a>
        <button class="button close" class="close" title="Hide">${svgClose}</button>
      </div></div>`;

    const container = wrapper.firstElementChild as HTMLElement;
    const buttons = wrapper.querySelectorAll("button");

    const logButton = buttons[0];
    const revealButton = buttons[1];
    const closeButton = buttons[2];

    logButton.onclick = () => {
      console.error(
        "AbleDOM violation: ",
        "\nerror:",
        error.message,
        "\nelement:",
        element,
        ...(error.rel ? ["\nrelative:", error.rel] : []),
      );
    };

    const hasDevTools = !!(win as WindowWithAbleDOMDevtools).__ableDOMDevtools
      ?.revealElement;

    if (hasDevTools && win.document.body.contains(element)) {
      revealButton.onclick = () => {
        const revealElement = (win as WindowWithAbleDOMDevtools)
          .__ableDOMDevtools?.revealElement;

        if (revealElement && win.document.body.contains(element)) {
          revealElement(element).then((revealed: boolean) => {
            if (!revealed) {
              // TODO
            }
          });
        }
      };
    } else {
      revealButton.style.display = "none";
    }

    closeButton.onclick = () => {
      wrapper.style.display = "none";
      NotificationUI._highlight?.hide();
    };

    container.onmouseover = () => {
      NotificationUI._highlight?.highlight(element);
    };

    container.onmouseout = () => {
      NotificationUI._highlight?.hide();
    };
  }

  dispose() {
    this._wrapper.remove();
  }
}

export class NotificationsUI {
  // private _window: Window;
  private _container: HTMLElement;
  private _notifications: Set<NotificationUI> = new Set();

  constructor(win: Window) {
    // this._window = win;

    const container = (this._container =
      document.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    container.__abledomui = true;
    container.id = "abledom-report";
    container.innerHTML = `<style>${css}</style>`;

    win.document.body.appendChild(container);
  }

  addNotification(notification: NotificationUI) {
    if (this._notifications.has(notification)) {
      return;
    }

    this._notifications.add(notification);
    this._container.appendChild(NotificationUI.getElement(notification));
  }

  removeNotification(notification: NotificationUI) {
    if (!this._notifications.has(notification)) {
      return;
    }

    this._notifications.delete(notification);
    this._container.removeChild(NotificationUI.getElement(notification));
  }
}

class ElementHighlighter {
  private _window: Window;
  private _container: HTMLElement;

  constructor(win: Window) {
    this._window = win;

    const container = (this._container =
      win.document.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    container.__abledomui = true;
    container.className = "abledom-highlight";
  }

  highlight(element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const win = this._window;
    const container = this._container;
    const style = container.style;

    if (container.parentElement !== win.document.body) {
      win.document.body.appendChild(container);
    }

    style.width = `${rect.width}px`;
    style.height = `${rect.height}px`;
    style.top = `${rect.top}px`;
    style.left = `${rect.left}px`;

    container.style.display = "block";
  }

  hide() {
    this._container.style.display = "none";
  }
}

export function isAbleDOMUIElement(element: HTMLElement): boolean {
  for (let el: HTMLElement | null = element; el; el = el.parentElement) {
    if ((el as HTMLElementWithAbleDOMUIFlag).__abledomui) {
      return true;
    }
  }

  return false;
}
