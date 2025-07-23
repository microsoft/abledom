/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  ValidationNotification,
  ValidationRule,
  ValidationRuleType,
} from "../rules/base";

import type { AbleDOM } from "../core";

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
import svgBugReport from "./bug.svg?raw";

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

import type { HTMLElementWithAbleDOMUIFlag } from "./domBuilder";

export { HTMLElementWithAbleDOMUIFlag };

export interface BugReportProperty {
  isVisible: (notification: ValidationNotification) => boolean;
  onClick: (notification: ValidationNotification) => void;
  getTitle?: (notification: ValidationNotification) => string;
}

export interface NotificationsUIProps {
  bugReport?: BugReportProperty;
}

enum UIAlignments {
  BottomLeft = "bottom-left",
  BottomRight = "bottom-right",
  TopLeft = "top-left",
  TopRight = "top-right",
}

const pressedClass = "pressed";

// interface WindowWithAbleDOMDevtools extends Window {
//   __ableDOMDevtools?: {
//     revealElement?: (element: HTMLElement) => Promise<boolean>;
//   };
// }

export class NotificationUI {
  static setOnToggle(
    instance: NotificationUI,
    onToggle: (notificationUI: NotificationUI, show: boolean) => void,
  ) {
    instance._onToggle = onToggle;
  }

  private _core: AbleDOM;
  private _notificationsUI: NotificationsUI | undefined;
  private _wrapper: HTMLElementWithAbleDOMUIFlag;
  private _rule: ValidationRule;
  private _onToggle:
    | ((notificationUI: NotificationUI, show: boolean) => void)
    | undefined;

  static getElement(instance: NotificationUI): HTMLElement {
    return instance._wrapper;
  }

  isHidden = false;

  constructor(
    win: Window,
    core: AbleDOM,
    rule: ValidationRule,
    notificationsUI: NotificationsUI,
  ) {
    this._core = core;
    this._rule = rule;
    this._notificationsUI = notificationsUI;

    this._wrapper = win.document.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag;

    notificationsUI.addNotification(this);
  }

  update(notification: ValidationNotification): void {
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
            element && this._notificationsUI?.highlight(element);
          };

          container.onmouseout = () => {
            this._notificationsUI?.highlight(null);
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
            const { id, message, element, rel, help, ...extra } = notification;

            this._core.log(
              "AbleDOM: ",
              "\nid:",
              id,
              "\nmessage:",
              message,
              "\nelement:",
              element,
              ...(rel ? ["\nrelative:", rel] : []),
              ...(help ? ["\nhelp:", help] : []),
              ...(Object.keys(extra).length > 0 ? ["\nextra:", extra] : []),
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
          // title: "Reveal in Elements panel",
          title: "Scroll element into view",
        },
        (revealButton: HTMLElement) => {
          const element = notification.element;

          if (element) {
            revealButton.onclick = () => {
              element.scrollIntoView();
              this._notificationsUI?.highlight(element);
            };
          } else {
            revealButton.style.display = "none";
          }
          // const body = win.document.body;
          // const hasDevTools =
          //   !!(win as WindowWithAbleDOMDevtools).__ableDOMDevtools
          //     ?.revealElement && false; // Temtorarily disabling the devtools plugin integration.

          // if (hasDevTools && element && body.contains(element)) {
          //   revealButton.onclick = () => {
          //     const revealElement = (win as WindowWithAbleDOMDevtools)
          //       .__ableDOMDevtools?.revealElement;

          //     if (revealElement && body.contains(element)) {
          //       revealElement(element).then((revealed: boolean) => {
          //         if (!revealed) {
          //           // TODO
          //         }
          //       });
          //     }
          //   };
          // } else {
          //   revealButton.style.display = "none";
          // }
        },
      )
      .element(svgReveal)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button",
          title: "Report bug",
        },
        (bugReportButton) => {
          const bugReport = this._notificationsUI?.bugReport;

          if (bugReport?.isVisible(notification)) {
            const title = bugReport.getTitle?.(notification);

            if (title) {
              bugReportButton.title = title;
            }

            bugReportButton.onclick = () => {
              bugReport.onClick(notification);
            };
          } else {
            bugReportButton.style.display = "none";
          }
        },
      )
      .element(svgBugReport)
      .closeTag()
      .text(notification.message)
      .openTag(
        "a",
        {
          class: "button close",
          href: notification.help || "/",
          title: "Open help",
          target: "_blank",
        },
        (help) => {
          if (!notification.help) {
            help.style.display = "none";
          }
        },
      )
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
            this._notificationsUI?.highlight(null);
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
    this._notificationsUI?.removeNotification(this);
    delete this._notificationsUI;
  }
}

export class NotificationsUI {
  private _container: HTMLElement | undefined;
  private _notificationsContainer: HTMLElement | undefined;
  private _menuElement: HTMLElement | undefined;
  private _notificationCountElement: HTMLSpanElement | undefined;
  private _showAllButton: HTMLElement | undefined;
  private _hideAllButton: HTMLElement | undefined;
  private _alignBottomLeftButton: HTMLElement | undefined;
  private _alignTopLeftButton: HTMLElement | undefined;
  private _alignTopRightButton: HTMLElement | undefined;
  private _alignBottomRightButton: HTMLElement | undefined;

  private _isMuted = false;
  private _notifications: Set<NotificationUI> = new Set();

  private _highlighter: ElementHighlighter | undefined;

  readonly bugReport: BugReportProperty | undefined;

  constructor(win: Window, props: NotificationsUIProps) {
    this.bugReport = props.bugReport;

    const doc = win.document;

    const container = (this._container =
      doc.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    container.__abledomui = true;
    container.id = "abledom-report";

    const style = doc.createElement("style");
    style.type = "text/css";
    style.appendChild(doc.createTextNode(css));
    container.appendChild(style);

    const notificationsContainer = (this._notificationsContainer =
      doc.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    notificationsContainer.__abledomui = true;
    notificationsContainer.className = "abledom-notifications-container";
    container.appendChild(notificationsContainer);

    const menuElement = (this._menuElement =
      doc.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    menuElement.__abledomui = true;
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

    doc.body.appendChild(container);

    this._highlighter = new ElementHighlighter(win);
  }

  private setUIAlignment(alignment: UIAlignments) {
    if (
      !this._container ||
      !this._notificationsContainer ||
      !this._menuElement
    ) {
      return;
    }

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
    if (!this._menuElement) {
      return;
    }

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
    if (!this._notificationsContainer) {
      throw new Error("NotificationsUI is not initialized");
    }

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
    this.highlight(null);
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

  highlight(element: HTMLElement | null) {
    this._highlighter?.highlight(element);
  }

  dispose() {
    this._highlighter?.dispose();
    this._container?.remove();
    delete this._highlighter;
    delete this._container;
    delete this._notificationsContainer;
    delete this._menuElement;
    delete this._notificationCountElement;
    delete this._showAllButton;
    delete this._hideAllButton;
    delete this._alignBottomLeftButton;
    delete this._alignTopLeftButton;
    delete this._alignTopRightButton;
    delete this._alignBottomRightButton;
  }
}

class ElementHighlighter {
  private _window: Window | undefined;
  private _container: HTMLElementWithAbleDOMUIFlag | undefined;
  private _element: HTMLElement | undefined;
  private _cancelScrollTimer: (() => void) | undefined;
  private _intersectionObserver: IntersectionObserver | undefined;

  constructor(win: Window) {
    this._window = win;

    const container: HTMLElementWithAbleDOMUIFlag = (this._container =
      win.document.createElement("div"));
    container.__abledomui = true;
    container.className = "abledom-highlight";

    new DOMBuilder(container)
      .openTag("div", { class: "abledom-highlight-border1" })
      .closeTag()
      .openTag("div", { class: "abledom-highlight-border2" })
      .closeTag();

    win.addEventListener("scroll", this._onScroll, true);
  }

  highlight(element: HTMLElement | null) {
    if (!element) {
      delete this._element;
      this._unobserve();
      this._hide();
      return;
    }

    const win = this._window;
    const container = this._container;

    if (!win || !container) {
      return;
    }

    this._element = element;

    this._intersectionObserver = new IntersectionObserver(([entry]) => {
      if (entry) {
        const rect = entry.boundingClientRect;

        const body = win.document.body;
        const style = container.style;

        if (container.parentElement !== body) {
          body.appendChild(container);
        }

        style.width = `${rect.width}px`;
        style.height = `${rect.height}px`;
        style.top = `${rect.top}px`;
        style.left = `${rect.left}px`;

        container.style.display = "block";
      }
    });

    this._intersectionObserver.observe(element);
  }

  dispose() {
    this._unobserve();
    this._cancelScrollTimer?.();
    this._window?.removeEventListener("scroll", this._onScroll, true);
    this._container?.remove();
    delete this._element;
    delete this._container;
    delete this._window;
  }

  private _hide() {
    this._container && (this._container.style.display = "none");
  }

  private _unobserve() {
    this._intersectionObserver?.disconnect();
    delete this._intersectionObserver;
  }

  private _onScroll = () => {
    this._cancelScrollTimer?.();
    this._hide();

    const win = this._window;

    if (win) {
      const scrollTimer = win.setTimeout(() => {
        delete this._cancelScrollTimer;
        this.highlight(this._element || null);
      }, 100);

      this._cancelScrollTimer = () => {
        delete this._cancelScrollTimer;
        win.clearTimeout(scrollTimer);
      };
    }
  };
}

export function isAbleDOMUIElement(element: HTMLElement): boolean {
  for (let el: HTMLElement | null = element; el; el = el.parentElement) {
    if ((el as HTMLElementWithAbleDOMUIFlag).__abledomui) {
      return true;
    }
  }

  return false;
}
