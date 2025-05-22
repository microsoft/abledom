/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  ValidationNotification,
  ValidationRule,
  ValidationRuleType,
} from "../rules/base";

// The imports below will become functions that use DOMBuilder to build SVG
// unrolled by both Vite (in `npm run dev`) and TSUP (in `npm run build`).
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

// @ts-expect-error parsed assets
import svgHideAll from "./hideall.svg?raw";
// @ts-expect-error parsed assets
import svgMuteAll from "./muteall.svg?raw";
// @ts-expect-error parsed assets
import svgShowAll from "./showall.svg?raw";
// @ts-expect-error parsed assets
import svgAlignTopLeft from "./aligntopleft.svg?raw";
// @ts-expect-error parsed assets
import svgAlignTopRight from "./aligntopright.svg?raw";
// @ts-expect-error parsed assets
import svgAlignBottomRight from "./alignbottomright.svg?raw";
// @ts-expect-error parsed assets
import svgAlignBottomLeft from "./alignbottomleft.svg?raw";

import { DOMBuilder } from "./domBuilder";

enum UIAlignments {
  BottomLeft = "bottom-left",
  BottomRight = "bottom-right",
  TopLeft = "top-left",
  TopRight = "top-right",
}

const pressedClass = "pressed";

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
  private static _notificationsUI: NotificationsUI | undefined;

  static setOnToggle(
    instance: NotificationUI,
    onToggle: (notificationUI: NotificationUI, show: boolean) => void,
  ) {
    instance._onToggle = onToggle;
  }

  private static _highlight: ElementHighlighter;

  private _win: Window;
  private _wrapper: HTMLElementWithAbleDOMUIFlag;
  private _rule: ValidationRule;
  private _onToggle:
    | ((notificationUI: NotificationUI, show: boolean) => void)
    | undefined;

  static getElement(instance: NotificationUI): HTMLElement {
    return instance._wrapper;
  }

  isHidden = false;

  constructor(win: Window, rule: ValidationRule) {
    this._win = win;
    this._rule = rule;

    if (!NotificationUI._notificationsUI) {
      NotificationUI._notificationsUI = new NotificationsUI(this._win);
    }

    this._wrapper = win.document.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag;

    if (!NotificationUI._highlight) {
      NotificationUI._highlight = new ElementHighlighter(win);
    }

    NotificationUI._notificationsUI.addNotification(this);
  }

  update(notification: ValidationNotification): void {
    const win = this._win;
    const rule = this._rule;
    const wrapper = this._wrapper;
    const element = notification.element;

    wrapper.__abledomui = true;
    wrapper.textContent = "";

    new DOMBuilder(wrapper)
      .openTag(
        "div",
        { class: "abledom-notification-container" },
        (container) => {
          container.onmouseover = () => {
            element && NotificationUI._highlight?.highlight(element);
          };

          container.onmouseout = () => {
            NotificationUI._highlight?.hide();
          };
        },
      )
      .openTag("div", {
        class: `abledom-notification${
          rule.type === ValidationRuleType.Warning
            ? " abledom-notification_warning"
            : rule.type === ValidationRuleType.Info
              ? " abledom-notification_info"
              : ""
        }`,
      })
      .openTag(
        "button",
        {
          class: "button",
          title: "Log to Console",
        },
        (logButton) => {
          logButton.onclick = () => {
            console.error(
              "AbleDOM: ",
              "\nmessage:",
              notification.message,
              "\nelement:",
              element,
              ...(notification.rel ? ["\nrelative:", notification.rel] : []),
              "\nnotification:",
              notification,
            );
          };
        },
      )
      .element(svgLog)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button",
          title: "Reveal in Elements panel",
        },
        (revealButton: HTMLElement) => {
          const hasDevTools =
            !!(win as WindowWithAbleDOMDevtools).__ableDOMDevtools
              ?.revealElement && false; // Temtorarily disabling the devtools plugin integration.
          if (hasDevTools && element && win.document.body.contains(element)) {
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
        },
      )
      .element(svgReveal)
      .closeTag()
      .text(notification.message)
      .openTag("a", {
        class: "button close",
        href: "/",
        title: "Open help",
        target: "_blank",
      })
      .element(svgHelp)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button close",
          title: "Hide",
        },
        (closeButton) => {
          closeButton.onclick = () => {
            this.toggle(false);
            NotificationUI._highlight?.hide();
          };
        },
      )
      .element(svgClose)
      .closeTag()
      .closeTag()
      .closeTag();
  }

  toggle(show: boolean, initial = false) {
    this.isHidden = !show;

    if (!initial) {
      this._onToggle?.(this, show);

      if (!this._rule.anchored && !show) {
        this.dispose();
      }
    }

    this._wrapper.style.display = show ? "block" : "none";
  }

  dispose() {
    this._wrapper.remove();
    NotificationUI._notificationsUI?.removeNotification(this);
  }
}

export class NotificationsUI {
  private _container: HTMLElement;
  private _notificationsContainer: HTMLElement;
  private _menuElement: HTMLElement;
  private _notificationCountElement: HTMLSpanElement | undefined;
  private _showAllButton: HTMLElement | undefined;
  private _hideAllButton: HTMLElement | undefined;
  private _alignBottomLeftButton: HTMLElement | undefined;
  private _alignTopLeftButton: HTMLElement | undefined;
  private _alignTopRightButton: HTMLElement | undefined;
  private _alignBottomRightButton: HTMLElement | undefined;

  private _isMuted = false;
  private _notifications: Set<NotificationUI> = new Set();

  constructor(win: Window) {
    const container = (this._container =
      win.document.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    container.__abledomui = true;
    container.id = "abledom-report";

    const style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    container.appendChild(style);

    const notificationsContainer = (this._notificationsContainer =
      win.document.createElement("div")) as HTMLDivElement;
    notificationsContainer.className = "abledom-notifications-container";
    container.appendChild(notificationsContainer);

    const menuElement = (this._menuElement =
      win.document.createElement("div")) as HTMLDivElement;

    menuElement.className = "abledom-menu-container";
    container.appendChild(menuElement);

    new DOMBuilder(menuElement)
      .openTag("div", { class: "abledom-menu" })
      .openTag(
        "span",
        {
          class: "notifications-count",
          title: "Number of notifications",
        },
        (notificationCountElement) => {
          this._notificationCountElement = notificationCountElement;
        },
      )
      .closeTag()
      .openTag(
        "button",
        {
          class: "button",
          title: "Show all notifications",
        },
        (showAllButton) => {
          this._showAllButton = showAllButton;

          showAllButton.onclick = () => {
            this.showAll();
          };
        },
      )
      .element(svgShowAll)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button",
          title: "Hide all notifications",
        },
        (hideAllButton) => {
          this._hideAllButton = hideAllButton;

          hideAllButton.onclick = () => {
            this.hideAll();
          };
        },
      )
      .element(svgHideAll)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button",
          title: "Mute newly appearing notifications",
        },
        (muteButton) => {
          muteButton.onclick = () => {
            const isMuted = (this._isMuted =
              muteButton.classList.toggle(pressedClass));

            if (isMuted) {
              muteButton.setAttribute(
                "title",
                "Unmute newly appearing notifications",
              );
            } else {
              muteButton.setAttribute(
                "title",
                "Mute newly appearing notifications",
              );
            }
          };
        },
      )
      .element(svgMuteAll)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button align-button align-button-first pressed",
          title: "Attach notifications to bottom left",
        },
        (alignBottomLeftButton) => {
          this._alignBottomLeftButton = alignBottomLeftButton;

          alignBottomLeftButton.onclick = () => {
            this.setUIAlignment(UIAlignments.BottomLeft);
          };
        },
      )
      .element(svgAlignBottomLeft)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button align-button",
          title: "Attach notifications to top left",
        },
        (alignTopLeftButton) => {
          this._alignTopLeftButton = alignTopLeftButton;

          alignTopLeftButton.onclick = () => {
            this.setUIAlignment(UIAlignments.TopLeft);
          };
        },
      )
      .element(svgAlignTopLeft)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button align-button",
          title: "Attach notifications to top right",
        },
        (alignTopRightButton) => {
          this._alignTopRightButton = alignTopRightButton;

          alignTopRightButton.onclick = () => {
            this.setUIAlignment(UIAlignments.TopRight);
          };
        },
      )
      .element(svgAlignTopRight)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button align-button align-button-last",
          title: "Attach notifications to bottom right",
        },
        (alignBottomRightButton) => {
          this._alignBottomRightButton = alignBottomRightButton;

          alignBottomRightButton.onclick = () => {
            this.setUIAlignment(UIAlignments.BottomRight);
          };
        },
      )
      .element(svgAlignBottomRight)
      .closeTag()
      .closeTag();

    win.document.body.appendChild(container);
  }

  private setUIAlignment(alignment: UIAlignments) {
    this._alignBottomLeftButton?.classList.remove(pressedClass);
    this._alignBottomRightButton?.classList.remove(pressedClass);
    this._alignTopLeftButton?.classList.remove(pressedClass);
    this._alignTopRightButton?.classList.remove(pressedClass);

    this._container.classList.remove(
      "abledom-align-left",
      "abledom-align-right",
      "abledom-align-top",
      "abledom-align-bottom",
    );
    let containerClasses: string[] = [];
    let notificationsFirst = false;

    switch (alignment) {
      case UIAlignments.BottomLeft:
        containerClasses = ["abledom-align-left", "abledom-align-bottom"];
        notificationsFirst = true;
        this._alignBottomLeftButton?.classList.add(pressedClass);
        break;
      case UIAlignments.BottomRight:
        containerClasses = ["abledom-align-right", "abledom-align-bottom"];
        notificationsFirst = true;
        this._alignBottomRightButton?.classList.add(pressedClass);
        break;
      case UIAlignments.TopLeft:
        containerClasses = ["abledom-align-left", "abledom-align-top"];
        this._alignTopLeftButton?.classList.add(pressedClass);
        break;
      case UIAlignments.TopRight:
        containerClasses = ["abledom-align-right", "abledom-align-top"];
        this._alignTopRightButton?.classList.add(pressedClass);
        break;
    }

    this._container.classList.add(...containerClasses);
    this._container.insertBefore(
      this._notificationsContainer,
      notificationsFirst ? this._menuElement : null,
    );
  }

  private _setNotificationsCount(count: number) {
    const countElement = this._notificationCountElement;

    if (countElement && count > 0) {
      countElement.textContent = "";
      new DOMBuilder(countElement)
        .openTag("strong")
        .text(`${count}`)
        .closeTag()
        .text(` notification${count > 1 ? "s" : ""}`);

      this._menuElement.style.display = "block";
    } else {
      this._menuElement.style.display = "none";
    }
  }

  private _setShowHideButtonsVisibility() {
    const showAllButton = this._showAllButton;
    const hideAllButton = this._hideAllButton;

    if (!showAllButton || !hideAllButton) {
      return;
    }

    let allHidden = true;
    let allVisible = true;

    for (let notification of this._notifications) {
      if (notification.isHidden) {
        allVisible = false;
      } else {
        allHidden = false;
      }

      if (!allHidden && !allVisible) {
        break;
      }
    }

    hideAllButton.style.display = allHidden ? "none" : "block";
    showAllButton.style.display = allVisible ? "none" : "block";
  }

  addNotification(notification: NotificationUI) {
    if (this._notifications.has(notification)) {
      return;
    }

    if (this._isMuted) {
      notification.toggle(false, true);
    }

    this._notifications.add(notification);
    this._notificationsContainer.appendChild(
      NotificationUI.getElement(notification),
    );

    NotificationUI.setOnToggle(notification, () => {
      this._setShowHideButtonsVisibility();
    });

    this._setNotificationsCount(this._notifications.size);
    this._setShowHideButtonsVisibility();
  }

  removeNotification(notification: NotificationUI) {
    if (!this._notifications.has(notification)) {
      return;
    }

    this._notifications.delete(notification);

    this._setNotificationsCount(this._notifications.size);
    this._setShowHideButtonsVisibility();
  }

  hideAll() {
    this._notifications.forEach((notification) => {
      notification.toggle(false);
    });
    this._setShowHideButtonsVisibility();
  }

  showAll() {
    this._notifications.forEach((notification) => {
      notification.toggle(true);
    });
    this._setShowHideButtonsVisibility();
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
