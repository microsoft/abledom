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
import uiCSS from "./ui.css?raw";
// @ts-expect-error parsed assets
import highlighterCSS from "./highlighter.css?raw";
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
import svgSparkles from "./sparkles.svg?raw";
// @ts-expect-error parsed assets
import svgChevron from "./chevron.svg?raw";
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
  headless?: boolean;
}

enum UIAlignments {
  BottomLeft = "bottom-left",
  BottomRight = "bottom-right",
  TopLeft = "top-left",
  TopRight = "top-right",
}

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
  private _wrapper: HTMLElementWithAbleDOMUIFlag | undefined;
  private _rule: ValidationRule;
  private _onToggle: ((issueUI: IssueUI, show: boolean) => void) | undefined;
  private _lastIssueMessage: string | undefined;
  private _lastIssueElement: HTMLElement | undefined;

  static getElement(instance: IssueUI): HTMLElement | undefined {
    return instance._wrapper;
  }

  get rule(): ValidationRule {
    return this._rule;
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

    if (!issuesUI.headless) {
      this._wrapper = win.document.createElement(
        "div",
      ) as HTMLElementWithAbleDOMUIFlag;
    }

    issuesUI.addIssue(this);
  }

  update(issue: ValidationIssue): void {
    const rule = this._rule;
    const wrapper = this._wrapper;
    const element = issue.element;

    if (!wrapper) {
      return;
    }

    if (
      this._lastIssueMessage === issue.message &&
      this._lastIssueElement === element
    ) {
      return;
    }

    this._lastIssueMessage = issue.message;
    this._lastIssueElement = element;

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
      .openTag("div", { class: "abledom-issue-message" })
      .text(issue.message)
      .closeTag()
      .openTag("div", { class: "abledom-issue-actions" })
      .openTag(
        "button",
        {
          class: "button abledom-button-log",
          type: "button",
          title: "Log to Console",
        },
        (logButton) => {
          logButton.onclick = (e) => {
            e.stopPropagation();
            const { id, message, element, rel, help, ...extra } = issue;

            console.log(
              "%cAbleDOM Issue:",
              "font-weight: bold; color: #d32f2f",
              issue,
            );

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
          class: "button abledom-button-reveal",
          type: "button",
          title: "Scroll element into view",
        },
        (revealButton: HTMLElement) => {
          const element = issue.element;

          if (element) {
            revealButton.onclick = (e) => {
              e.stopPropagation();
              element.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center",
              });
              this._issuesUI?.highlight(element, true);
            };
          } else {
            revealButton.style.display = "none";
          }
        },
      )
      .element(svgReveal)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button abledom-button-bug",
          type: "button",
          title: "Report bug",
        },
        (bugReportButton) => {
          const bugReport = this._issuesUI?.bugReport;

          if (bugReport?.isVisible(issue)) {
            const title = bugReport.getTitle?.(issue);

            if (title) {
              bugReportButton.title = title;
            }

            bugReportButton.onclick = (e) => {
              e.stopPropagation();
              bugReport.onClick(issue);
            };
          } else {
            bugReportButton.style.display = "none";
          }
        },
      )
      .element(svgBugReport)
      .closeTag()
      .openTag(
        "button",
        {
          class: "button abledom-button-copy",
          type: "button",
          title: "Copy AI Prompt",
        },
        (copyButton) => {
          copyButton.onclick = (e) => {
            e.stopPropagation();
            const { id, message, element, help } = issue;
            const elementHtml = element?.outerHTML || "N/A";
            const prompt = `Fix the following accessibility issue:
Rule ID: ${id}
Message: ${message}
Help Link: ${help || "N/A"}
Element HTML:
\`\`\`html
${elementHtml}
\`\`\``;

            navigator.clipboard
              .writeText(prompt)
              .then(() => {
                console.log(
                  "%cPrompt copied to clipboard!",
                  "color: green; font-weight: bold;",
                );
                // Optional: temporarily change icon or show tooltip
                const originalTitle = copyButton.title;
                copyButton.title = "Copied!";
                setTimeout(() => {
                  copyButton.title = originalTitle;
                }, 2000);
              })
              .catch((err) => {
                console.error("Failed to copy prompt: ", err);
              });
          };
        },
      )
      .element(svgSparkles)
      .closeTag()
      .openTag(
        "a",
        {
          class: "button close abledom-button-help",
          href: issue.help || "/",
          title: "Open help",
          target: "_blank",
        },
        (help) => {
          help.onclick = (e) => {
            e.stopPropagation();
          };
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
          class: "button close abledom-button-hide",
          type: "button",
          title: "Hide",
        },
        (closeButton) => {
          closeButton.onclick = (e) => {
            e.stopPropagation();
            this.toggle(false);
            this._issuesUI?.highlight(null);
          };
        },
      )
      .element(svgClose)
      .closeTag()
      .closeTag()
      .closeTag()
      .closeTag();
  }

  toggle(show: boolean, initial = false) {
    if (!this._wrapper) {
      return;
    }

    this.isHidden = !show;

    if (!initial) {
      this._onToggle?.(this, show);

      if (!this._rule.anchored && !show) {
        this.dispose();
      }
    }

    this._wrapper.style.display = show ? "block" : "none";

    this._issuesUI?.updateRestoreButton(this._rule.name);
  }

  dispose() {
    this._wrapper?.remove();
    this._issuesUI?.removeIssue(this);
    delete this._issuesUI;
  }
}

interface IssueGroup {
  header: HTMLElementWithAbleDOMUIFlag;
  content: HTMLElementWithAbleDOMUIFlag;
  countElement: HTMLElementWithAbleDOMUIFlag;
  restoreButton: HTMLElementWithAbleDOMUIFlag;
  count: number;
}

export class IssuesUI {
  private _win: Window | undefined;
  private _container: HTMLElement | undefined;
  private _issuesContainer: HTMLElement | undefined;
  private _toggleButton: HTMLElement | undefined;
  private _toggleButtonCount: HTMLElement | undefined;
  private _alignmentBar: HTMLElement | undefined;

  private _issues: Set<IssueUI> = new Set();
  private _areIssuesVisible = false;

  private _groups: Map<string, IssueGroup> = new Map();

  private _getHighlighter?: () => ElementHighlighter | undefined;

  readonly bugReport: BugReportProperty | undefined;
  readonly headless: boolean;

  constructor(
    win: Window,
    getHighlighter: () => ElementHighlighter | undefined,
    props: IssuesUIProps,
  ) {
    this._win = win;
    this._getHighlighter = getHighlighter;
    this.bugReport = props.bugReport;
    this.headless = !!props.headless;

    if (this.headless) {
      return;
    }

    const doc = win.document;

    const container = (this._container =
      doc.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    container.__abledomui = true;
    container.id = "abledom-report";

    const style = doc.createElement("style");
    style.type = "text/css";
    style.appendChild(doc.createTextNode(uiCSS));
    container.appendChild(style);

    const issuesContainer = (this._issuesContainer =
      doc.createElement("div")) as HTMLElementWithAbleDOMUIFlag;
    issuesContainer.__abledomui = true;
    issuesContainer.className = "abledom-issues-container";
    issuesContainer.style.display = "none";
    container.appendChild(issuesContainer);

    new DOMBuilder(container)
      .openTag(
        "div",
        {
          class: "abledom-floating-button",
          title: "Toggle issues visibility",
        },
        (toggleButton) => {
          this._toggleButton = toggleButton;
          toggleButton.onclick = () => {
            this.toggleIssuesVisibility();
          };
        },
      )
      .openTag("span", { class: "abledom-floating-label" })
      .text("Issues")
      .closeTag()
      .openTag("span", { class: "abledom-floating-counter" }, (span) => {
        this._toggleButtonCount = span;
        span.textContent = "0";
      })
      .closeTag()
      .closeTag();

    // Corner alignment controls (child of toggle button, shown on hover)
    const alignmentBar = doc.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag;
    alignmentBar.__abledomui = true;
    alignmentBar.className = "abledom-alignment-bar";
    // Stop clicks on alignment bar from toggling issues
    alignmentBar.onclick = (e) => e.stopPropagation();

    const corners: Array<{
      svg: typeof svgAlignBottomRight;
      pos: UIAlignments;
      title: string;
    }> = [
      {
        svg: svgAlignTopLeft,
        pos: UIAlignments.TopLeft,
        title: "Move to top-left",
      },
      {
        svg: svgAlignTopRight,
        pos: UIAlignments.TopRight,
        title: "Move to top-right",
      },
      {
        svg: svgAlignBottomLeft,
        pos: UIAlignments.BottomLeft,
        title: "Move to bottom-left",
      },
      {
        svg: svgAlignBottomRight,
        pos: UIAlignments.BottomRight,
        title: "Move to bottom-right",
      },
    ];

    const alignBtns: HTMLElement[] = [];

    for (const corner of corners) {
      const btn = doc.createElement("button") as HTMLElementWithAbleDOMUIFlag;
      btn.__abledomui = true;
      btn.className = "abledom-align-btn";
      btn.title = corner.title;
      corner.svg(btn);

      if (corner.pos === UIAlignments.BottomRight) {
        btn.classList.add("active");
      }

      btn.onclick = () => {
        alignBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this._setAlignment(corner.pos);
      };

      alignBtns.push(btn);
      alignmentBar.appendChild(btn);
    }

    this._alignmentBar = alignmentBar;
    // Append alignment bar inside the toggle button
    if (this._toggleButton) {
      this._toggleButton.appendChild(alignmentBar);
    }

    doc.body.appendChild(container);
  }

  private _setAlignment(pos: UIAlignments) {
    const btn = this._toggleButton;
    const bar = this._alignmentBar;
    const container = this._container;
    const listContainer = this._issuesContainer;

    if (!btn || !container) {
      return;
    }

    // Reset positions
    btn.style.top = "auto";
    btn.style.bottom = "auto";
    btn.style.left = "auto";
    btn.style.right = "auto";
    if (container) {
      container.style.top = "auto";
      container.style.bottom = "auto";
      container.style.left = "auto";
      container.style.right = "auto";
      container.style.flexDirection = "column";
      container.style.justifyContent = "flex-end";
      container.style.alignItems = "flex-end";
    }
    if (listContainer) {
      listContainer.style.marginBottom = "";
      listContainer.style.marginTop = "";
    }
    // Flip alignment bar to the opposite side of the screen edge
    if (bar) {
      bar.style.left = "";
      bar.style.right = "";
    }

    switch (pos) {
      case UIAlignments.BottomRight:
        btn.style.bottom = "24px";
        btn.style.right = "24px";
        if (bar) {
          bar.style.right = "calc(100% + 8px)";
          bar.style.left = "auto";
        }
        if (container) {
          container.style.bottom = "24px";
          container.style.right = "24px";
          container.style.justifyContent = "flex-end";
          container.style.alignItems = "flex-end";
        }
        if (listContainer) {
          listContainer.style.marginBottom = "76px";
        }
        break;
      case UIAlignments.BottomLeft:
        btn.style.bottom = "24px";
        btn.style.left = "24px";
        if (bar) {
          bar.style.left = "calc(100% + 8px)";
          bar.style.right = "auto";
        }
        if (container) {
          container.style.bottom = "24px";
          container.style.left = "24px";
          container.style.alignItems = "flex-start";
        }
        if (listContainer) {
          listContainer.style.marginBottom = "76px";
        }
        break;
      case UIAlignments.TopRight:
        btn.style.top = "24px";
        btn.style.right = "24px";
        if (bar) {
          bar.style.right = "calc(100% + 8px)";
          bar.style.left = "auto";
        }
        if (container) {
          container.style.top = "24px";
          container.style.right = "24px";
          container.style.justifyContent = "flex-start";
          container.style.alignItems = "flex-end";
        }
        if (listContainer) {
          listContainer.style.marginTop = "76px";
          listContainer.style.marginBottom = "0";
        }
        break;
      case UIAlignments.TopLeft:
        btn.style.top = "24px";
        btn.style.left = "24px";
        if (bar) {
          bar.style.left = "calc(100% + 8px)";
          bar.style.right = "auto";
        }
        if (container) {
          container.style.top = "24px";
          container.style.left = "24px";
          container.style.justifyContent = "flex-start";
          container.style.alignItems = "flex-start";
        }
        if (listContainer) {
          listContainer.style.marginTop = "76px";
          listContainer.style.marginBottom = "0";
        }
        break;
    }
  }

  toggleIssuesVisibility() {
    this._areIssuesVisible = !this._areIssuesVisible;
    if (this._issuesContainer) {
      this._issuesContainer.style.display = this._areIssuesVisible
        ? "flex" // Using flex for column layout
        : "none";
    }
    if (this._toggleButton) {
      if (this._areIssuesVisible) {
        this._toggleButton.classList.add("active");
      } else {
        this._toggleButton.classList.remove("active");
      }
    }
  }

  private _setIssuesCount(count: number) {
    if (this._toggleButtonCount) {
      this._toggleButtonCount.textContent = `${count}`;
    }

    if (this._container) {
      this._container.style.display = count > 0 ? "block" : "none";
    }
  }

  private _getOrCreateGroup(ruleName: string): IssueGroup {
    if (this._groups.has(ruleName)) {
      return this._groups.get(ruleName)!;
    }

    const doc = this._win?.document;
    if (!doc) {
      throw new Error("Document not found");
    }

    const header = doc.createElement("div") as HTMLElementWithAbleDOMUIFlag;
    header.__abledomui = true;
    header.className = "abledom-group-header";

    const content = doc.createElement("div") as HTMLElementWithAbleDOMUIFlag;
    content.__abledomui = true;
    content.className = "abledom-group-content";

    const countElement = doc.createElement("span");
    countElement.className = "abledom-group-count";
    countElement.textContent = "0";

    const chevronWrapper = doc.createElement("div");
    chevronWrapper.className = "chevron";
    svgChevron(chevronWrapper);

    const title = doc.createElement("div");
    title.className = "abledom-group-title";
    title.appendChild(chevronWrapper);
    const titleText = doc.createElement("span");
    titleText.textContent = ruleName;
    title.appendChild(titleText);

    const restoreButton = doc.createElement(
      "button",
    ) as HTMLElementWithAbleDOMUIFlag;
    restoreButton.__abledomui = true;
    restoreButton.className = "abledom-group-restore";
    restoreButton.title = "Restore dismissed";
    restoreButton.setAttribute("type", "button");
    restoreButton.style.display = "none";
    svgShowAll(restoreButton);
    restoreButton.onclick = (e) => {
      e.stopPropagation();
      this._restoreGroupIssues(ruleName);
    };

    const headerActions = doc.createElement("div");
    headerActions.className = "abledom-group-header-actions";
    headerActions.appendChild(restoreButton);
    headerActions.appendChild(countElement);

    header.appendChild(title);
    header.appendChild(headerActions);

    header.onclick = () => {
      const isExpanded = header.classList.toggle("expanded");
      content.classList.toggle("expanded", isExpanded);
    };

    if (this._issuesContainer) {
      this._issuesContainer.appendChild(header);
      this._issuesContainer.appendChild(content);
    }

    const group: IssueGroup = {
      header,
      content,
      countElement: countElement as HTMLElementWithAbleDOMUIFlag,
      restoreButton: restoreButton as HTMLElementWithAbleDOMUIFlag,
      count: 0,
    };
    this._groups.set(ruleName, group);

    return group;
  }

  addIssue(issue: IssueUI) {
    if (this._issues.has(issue)) {
      return;
    }

    this._issues.add(issue);

    if (this.headless) {
      return;
    }

    if (!this._issuesContainer) {
      throw new Error("IssuesUI is not initialized");
    }

    // Always show the issue in the list (if not muted logic requires otherwise, but simpler is better)
    issue.toggle(true, true);

    const group = this._getOrCreateGroup(issue.rule.name);
    group.count++;
    group.countElement.textContent = `${group.count}`;

    const issueUIWraper = IssueUI.getElement(issue);
    issueUIWraper && group.content.appendChild(issueUIWraper);

    this._setIssuesCount(this._issues.size);
  }

  removeIssue(issue: IssueUI) {
    if (!this._issues.has(issue)) {
      return;
    }

    this._issues.delete(issue);

    if (!this.headless) {
      const ruleName = issue.rule.name;
      if (this._groups.has(ruleName)) {
        const group = this._groups.get(ruleName)!;
        group.count--;
        group.countElement.textContent = `${group.count}`;

        if (group.count <= 0) {
          group.header.remove();
          group.content.remove();
          this._groups.delete(ruleName);
        }
      }
    }

    this._setIssuesCount(this._issues.size);
    this.highlight(null);
  }

  updateRestoreButton(ruleName: string) {
    const group = this._groups.get(ruleName);
    if (!group) {
      return;
    }

    let hasHidden = false;
    for (const issue of this._issues) {
      if (issue.rule.name === ruleName && issue.isHidden) {
        hasHidden = true;
        break;
      }
    }

    group.restoreButton.style.display = hasHidden ? "inline-flex" : "none";
  }

  private _restoreGroupIssues(ruleName: string) {
    for (const issue of this._issues) {
      if (issue.rule.name === ruleName && issue.isHidden) {
        issue.toggle(true);
      }
    }

    this.updateRestoreButton(ruleName);
  }

  highlight(
    element: HTMLElement | null,
    scrollIntoView?: boolean,
    autoHideTime?: number,
  ) {
    this._getHighlighter?.()?.highlight(element, scrollIntoView, autoHideTime);
  }

  dispose() {
    this._container?.remove();
    delete this._win;
    delete this._getHighlighter;
    delete this._container;
    delete this._issuesContainer;
    delete this._toggleButton;
    delete this._toggleButtonCount;
    delete this._alignmentBar;
  }
}

export class ElementHighlighter {
  private _window: Window | undefined;
  private _container: HTMLElementWithAbleDOMUIFlag | undefined;
  private _overlay: HTMLElementWithAbleDOMUIFlag | undefined;
  private _element: HTMLElement | undefined;
  private _previousZIndex: string | undefined;
  private _previousPosition: string | undefined;
  private _cancelScrollTimer: (() => void) | undefined;
  private _intersectionObserver: IntersectionObserver | undefined;
  private _cancelAutoHideTimer: (() => void) | undefined;

  constructor(win: Window) {
    this._window = win;

    const container: HTMLElementWithAbleDOMUIFlag = (this._container =
      win.document.createElement("div"));
    container.__abledomui = true;
    container.className = "abledom-highlight";

    const doc = win.document;
    const style = doc.createElement("style");
    style.type = "text/css";
    style.appendChild(doc.createTextNode(highlighterCSS));
    container.appendChild(style);

    new DOMBuilder(container)
      .openTag("div", { class: "abledom-highlight-border1" })
      .closeTag()
      .openTag("div", { class: "abledom-highlight-border2" })
      .closeTag();

    const overlay: HTMLElementWithAbleDOMUIFlag =
      win.document.createElement("div");
    overlay.__abledomui = true;
    overlay.className = "abledom-dimming-overlay";
    this._overlay = overlay;

    win.addEventListener("scroll", this._onScroll, true);
  }

  highlight(
    element: HTMLElement | null,
    scrollIntoView?: boolean,
    autoHideTime?: number,
  ) {
    if (this._cancelAutoHideTimer && element !== this._element) {
      this._cancelAutoHideTimer();
    }

    if (!element) {
      this._restoreElementStyle();
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

    this._restoreElementStyle();
    this._element = element;

    this._previousZIndex = element.style.zIndex;
    this._previousPosition = element.style.position;
    element.style.zIndex = "100499";
    if (!element.style.position || element.style.position === "static") {
      element.style.position = "relative";
    }

    if (scrollIntoView) {
      element.scrollIntoView({ block: "center" });
    }

    if (autoHideTime) {
      this._cancelAutoHideTimer?.();

      const autoHideTimeout = win.setTimeout(() => {
        if (this._cancelAutoHideTimer) {
          this.highlight(null);
          delete this._cancelAutoHideTimer;
        }
      }, autoHideTime);

      this._cancelAutoHideTimer = () => {
        win.clearTimeout(autoHideTimeout);
        delete this._cancelAutoHideTimer;
      };
    }

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

        if (this._overlay) {
          if (!this._overlay.parentElement) {
            win.document.body.appendChild(this._overlay);
          }
          this._overlay.classList.add("visible");
        }
      }
    });

    this._intersectionObserver.observe(element);
  }

  dispose() {
    this._restoreElementStyle();
    this._unobserve();
    this._cancelScrollTimer?.();
    this._cancelAutoHideTimer?.();
    this._window?.removeEventListener("scroll", this._onScroll, true);
    this._container?.remove();
    this._overlay?.remove();
    delete this._element;
    delete this._container;
    delete this._overlay;
    delete this._window;
  }

  private _hide() {
    this._container && (this._container.style.display = "none");
    this._overlay?.classList.remove("visible");
  }

  private _restoreElementStyle() {
    const el = this._element;
    if (el) {
      el.style.zIndex = this._previousZIndex ?? "";
      el.style.position = this._previousPosition ?? "";
      delete this._previousZIndex;
      delete this._previousPosition;
    }
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
