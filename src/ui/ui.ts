/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  ValidationIssue,
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
  isVisible: (issue: ValidationIssue) => boolean;
  onClick: (issue: ValidationIssue) => void;
  getTitle?: (issue: ValidationIssue) => string;
}

export interface IssuesUIProps {
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

export class IssueUI {
  static setOnToggle(
    instance: IssueUI,
    onToggle: (issueUI: IssueUI, show: boolean) => void,
  ) {
    instance._onToggle = onToggle;
  }

  private _core: AbleDOM;
  private _issuesUI: IssuesUI | undefined;
  private _wrapper: HTMLElementWithAbleDOMUIFlag;
  private _rule: ValidationRule;
  private _onToggle: ((issueUI: IssueUI, show: boolean) => void) | undefined;

  static getElement(instance: IssueUI): HTMLElement {
    return instance._wrapper;
  }

  isHidden = false;

  constructor(
    win: Window,
    core: AbleDOM,
    rule: ValidationRule,
    issuesUI: IssuesUI,
  ) {
    this._core = core;
    this._rule = rule;
    this._issuesUI = issuesUI;

    this._wrapper = win.document.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag;

    issuesUI.addIssue(this);
  }

  update(issue: ValidationIssue): void {
    const rule = this._rule;
    const wrapper = this._wrapper;
    const element = issue.element;

    wrapper.__abledomui = true;
    wrapper.textContent = "";

    new DOMBuilder(wrapper)
      .openTag("div", { class: "abledom-issue-container" }, (container) => {
        container.onmouseenter = () => {
          element && this._issuesUI?.highlight(element);
        };

        container.onmouseleave = () => {
          this._issuesUI?.highlight(null);
        };
      })
      .openTag("div", {
        class: `abledom-issue${
          rule.type === ValidationRuleType.Warning
            ? " abledom-issue_warning"
            : rule.type === ValidationRuleType.Info
              ? " abledom-issue_info"
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
            const { id, message, element, rel, help, ...extra } = issue;

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
          const element = issue.element;

          if (element) {
            revealButton.onclick = () => {
              element.scrollIntoView({ block: "center" });
              this._issuesUI?.highlight(element);
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
          const bugReport = this._issuesUI?.bugReport;

          if (bugReport?.isVisible(issue)) {
            const title = bugReport.getTitle?.(issue);

            if (title) {
              bugReportButton.title = title;
            }

            bugReportButton.onclick = () => {
              bugReport.onClick(issue);
            };
          } else {
            bugReportButton.style.display = "none";
          }
        },
      )
      .element(svgBugReport)
      .closeTag()
      .text(issue.message)
      .openTag(
        "a",
        {
          class: "button close",
          href: issue.help || "/",
          title: "Open help",
          target: "_blank",
        },
        (help) => {
          if (!issue.help) {
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
            this._issuesUI?.highlight(null);
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
    this._issuesUI?.removeIssue(this);
    delete this._issuesUI;
  }
}

export class IssuesUI {
  private _container: HTMLElement | undefined;
  private _issuesContainer: HTMLElement | undefined;
  private _menuElement: HTMLElement | undefined;
  private _issueCountElement: HTMLSpanElement | undefined;
  private _showAllButton: HTMLElement | undefined;
  private _hideAllButton: HTMLElement | undefined;
  private _alignBottomLeftButton: HTMLElement | undefined;
  private _alignTopLeftButton: HTMLElement | undefined;
  private _alignTopRightButton: HTMLElement | undefined;
  private _alignBottomRightButton: HTMLElement | undefined;

  private _isMuted = false;
  private _issues: Set<IssueUI> = new Set();

  private _highlighter: ElementHighlighter | undefined;

  readonly bugReport: BugReportProperty | undefined;

  constructor(win: Window, props: IssuesUIProps) {
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

    const issuesContainer = (this._issuesContainer =
      doc.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    issuesContainer.__abledomui = true;
    issuesContainer.className = "abledom-issues-container";
    container.appendChild(issuesContainer);

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
          class: "issues-count",
          title: "Number of issues",
        },
        (issueCountElement) => {
          this._issueCountElement = issueCountElement;
        },
      )
      .closeTag()
      .openTag(
        "button",
        {
          class: "button",
          title: "Show all issues",
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
          title: "Hide all issues",
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
          title: "Mute newly appearing issues",
        },
        (muteButton) => {
          muteButton.onclick = () => {
            const isMuted = (this._isMuted =
              muteButton.classList.toggle(pressedClass));

            if (isMuted) {
              muteButton.setAttribute("title", "Unmute newly appearing issues");
            } else {
              muteButton.setAttribute("title", "Mute newly appearing issues");
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
          title: "Attach issues to bottom left",
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
          title: "Attach issues to top left",
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
          title: "Attach issues to top right",
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
          title: "Attach issues to bottom right",
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
    if (!this._container || !this._issuesContainer || !this._menuElement) {
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
    let issuesFirst = false;

    switch (alignment) {
      case UIAlignments.BottomLeft:
        containerClasses = ["abledom-align-left", "abledom-align-bottom"];
        issuesFirst = true;
        this._alignBottomLeftButton?.classList.add(pressedClass);
        break;
      case UIAlignments.BottomRight:
        containerClasses = ["abledom-align-right", "abledom-align-bottom"];
        issuesFirst = true;
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
      this._issuesContainer,
      issuesFirst ? this._menuElement : null,
    );
  }

  private _setIssuesCount(count: number) {
    if (!this._menuElement) {
      return;
    }

    const countElement = this._issueCountElement;

    if (countElement && count > 0) {
      countElement.textContent = "";
      new DOMBuilder(countElement)
        .openTag("strong")
        .text(`${count}`)
        .closeTag()
        .text(` issue${count > 1 ? "s" : ""}`);

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

    for (let issue of this._issues) {
      if (issue.isHidden) {
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

  addIssue(issue: IssueUI) {
    if (!this._issuesContainer) {
      throw new Error("IssuesUI is not initialized");
    }

    if (this._issues.has(issue)) {
      return;
    }

    if (this._isMuted) {
      issue.toggle(false, true);
    }

    this._issues.add(issue);
    this._issuesContainer.appendChild(IssueUI.getElement(issue));

    IssueUI.setOnToggle(issue, () => {
      this._setShowHideButtonsVisibility();
    });

    this._setIssuesCount(this._issues.size);
    this._setShowHideButtonsVisibility();
  }

  removeIssue(issue: IssueUI) {
    if (!this._issues.has(issue)) {
      return;
    }

    this._issues.delete(issue);

    this._setIssuesCount(this._issues.size);
    this._setShowHideButtonsVisibility();
    this.highlight(null);
  }

  hideAll() {
    this._issues.forEach((issue) => {
      issue.toggle(false);
    });
    this._setShowHideButtonsVisibility();
  }

  showAll() {
    this._issues.forEach((issue) => {
      issue.toggle(true);
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
    delete this._issuesContainer;
    delete this._menuElement;
    delete this._issueCountElement;
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
