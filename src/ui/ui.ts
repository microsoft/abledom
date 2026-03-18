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
// @ts-expect-error parsed assets
import svgChevronDown from "./chevrondown.svg?raw";
// @ts-expect-error parsed assets
import svgChevronRight from "./chevronright.svg?raw";

import { DOMBuilder } from "./domBuilder";

import type { HTMLElementWithAbleDOMUIFlag } from "./domBuilder";

export { HTMLElementWithAbleDOMUIFlag };

interface HTMLElementWithIssueUI extends HTMLElementWithAbleDOMUIFlag {
  __ableDOMIssueUI?: IssueUI;
}

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

const pressedClass = "pressed";

function getIssueTypeClass(type: ValidationRuleType): string {
  return type === ValidationRuleType.Warning
    ? " abledom-issue_warning"
    : type === ValidationRuleType.Info
      ? " abledom-issue_info"
      : "";
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
  private _appended = false;

  static setAppended(instance: IssueUI): void {
    instance._appended = true;
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

      (this._wrapper as HTMLElementWithIssueUI).__ableDOMIssueUI = this;
      this._wrapper.className = "abledom-issue-container-wrapper";
    }

    issuesUI.addIssue(this);
  }

  update(issue: ValidationIssue): void {
    const wrapper = this._wrapper;

    if (!wrapper) {
      return;
    }

    this._appendToIssueContainer(issue);

    wrapper.__abledomui = true;
    wrapper.textContent = "";
    this._renderIssueContent(wrapper, issue);
  }

  private _appendToIssueContainer(issue: ValidationIssue): void {
    if (!this._appended) {
      return;
    }

    const wrapper = this._wrapper;
    const rule = this._rule;

    if (!wrapper) {
      return;
    }

    const issueContainer = this._issuesUI?.getIssueContainer(
      rule.type,
      rule.groupName,
      issue.help,
    );

    if (!issueContainer || wrapper.parentElement === issueContainer) {
      return;
    }

    issueContainer.appendChild(wrapper);

    if (!this.isHidden) {
      if (
        issueContainer.parentElement?.classList.contains("abledom-issue-group")
      ) {
        issueContainer.parentElement.style.display = "block";
      }
    } else {
      this.toggle(false, true);
    }

    this._issuesUI?.syncGroupIssueCounts();
  }

  private _renderIssueContent(
    wrapper: HTMLElementWithAbleDOMUIFlag,
    issue: ValidationIssue,
  ): void {
    const rule = this._rule;
    const element = issue.element;

    new DOMBuilder(wrapper)
      .openTag("div", { class: "abledom-issue-container" }, (container) => {
        this._bindIssueContainerHover(container, element);
      })
      .openTag("div", {
        class: `abledom-issue${getIssueTypeClass(rule.type)}`,
      })
      .openTag(
        "button",
        {
          class: "button",
          title: "Log to Console",
        },
        (logButton) => {
          this._bindLogButton(logButton, issue);
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
          this._bindRevealButton(revealButton, issue);
        },
        undefined,
        !issue.element,
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
          this._bindBugReportButton(bugReportButton, issue);
        },
      )
      .element(svgBugReport)
      .closeTag()
      .text(issue.message)
      .openTag(
        "a",
        {
          class: "button help",
          href: issue.help || "/",
          title: "Open help",
          target: "_blank",
        },
        (help) => {
          this._bindHelpLink(help, issue.help);
        },
        undefined,
        !!rule.groupName,
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
          this._bindCloseButton(closeButton);
        },
      )
      .element(svgClose)
      .closeTag()
      .closeTag()
      .closeTag();
  }

  private _bindIssueContainerHover(
    container: HTMLElement,
    element: HTMLElement | null | undefined,
  ): void {
    container.onmouseenter = () => {
      element && this._issuesUI?.highlight(element);
    };

    container.onmouseleave = () => {
      this._issuesUI?.highlight(null);
    };
  }

  private _bindLogButton(button: HTMLElement, issue: ValidationIssue): void {
    button.onclick = () => {
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
  }

  private _bindRevealButton(button: HTMLElement, issue: ValidationIssue): void {
    const element = issue.element;

    if (element) {
      button.onclick = () => {
        this._issuesUI?.highlight(element, true);
      };
    }
  }

  private _bindBugReportButton(
    button: HTMLElement,
    issue: ValidationIssue,
  ): void {
    const bugReport = this._issuesUI?.bugReport;

    if (bugReport?.isVisible(issue)) {
      const title = bugReport.getTitle?.(issue);

      if (title) {
        button.title = title;
      }

      button.onclick = () => {
        bugReport.onClick(issue);
      };
    } else {
      button.style.display = "none";
    }
  }

  private _bindHelpLink(help: HTMLElement, issueHelp?: string): void {
    if (!issueHelp) {
      help.style.display = "none";
    }
  }

  private _bindCloseButton(button: HTMLElement): void {
    button.onclick = () => {
      this.toggle(false);
      this._issuesUI?.highlight(null);
    };
  }

  toggle(show: boolean | undefined, initial = false) {
    if (!this._wrapper) {
      return;
    }

    if (show === undefined) {
      this.isHidden = !this.isHidden;
      show = !this.isHidden;
    } else {
      this.isHidden = !show;
    }

    if (!initial) {
      this._onToggle?.(this, !this.isHidden);

      if (!this._rule.anchored && this.isHidden) {
        this.dispose();
      }
    }

    this._wrapper.style.display = show ? "block" : "none";
    this._syncGroupVisibility(!!show);
  }

  private _syncGroupVisibility(show: boolean): void {
    const wrapper = this._wrapper;

    if (!wrapper) {
      return;
    }

    const potentiallyGroupIssuesElement = wrapper.parentElement;
    const potentiallyGroupElement =
      potentiallyGroupIssuesElement?.parentElement;

    if (
      !potentiallyGroupIssuesElement ||
      !potentiallyGroupElement?.classList.contains("abledom-issue-group")
    ) {
      return;
    }

    if (show) {
      potentiallyGroupElement.style.display = "block";
      return;
    }

    if (
      potentiallyGroupElement.style.display !== "none" &&
      Array.prototype.every.call(
        potentiallyGroupIssuesElement.children,
        (el: HTMLElementWithIssueUI) =>
          el.__ableDOMIssueUI ? el.__ableDOMIssueUI?.isHidden : true,
      )
    ) {
      potentiallyGroupElement.style.display = "none";
    }
  }

  dispose() {
    this._wrapper?.remove();
    this._issuesUI?.removeIssue(this);
    delete this._issuesUI;
  }
}

export class IssuesUI {
  private _win: Window | undefined;
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
  private _issueGroupContainers: Record<string, HTMLElementWithAbleDOMUIFlag> =
    {};
  private _issueGroupCountElements: Record<string, HTMLElement> = {};

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
    const container = (this._container = this._createRootContainer(doc));
    this._issuesContainer = this._createIssuesContainer(doc, container);
    const menuElement = (this._menuElement = this._createMenuContainer(
      doc,
      container,
    ));

    this._buildMenu(menuElement);

    doc.body.appendChild(container);
  }

  private _createRootContainer(doc: Document): HTMLElementWithAbleDOMUIFlag {
    const container = doc.createElement("div") as HTMLElementWithAbleDOMUIFlag;
    container.__abledomui = true;
    container.id = "abledom-report";

    const style = doc.createElement("style");
    style.type = "text/css";
    style.appendChild(doc.createTextNode(uiCSS));
    container.appendChild(style);

    return container;
  }

  private _createIssuesContainer(
    doc: Document,
    container: HTMLElementWithAbleDOMUIFlag,
  ): HTMLElementWithAbleDOMUIFlag {
    const issuesContainer = doc.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag;
    issuesContainer.__abledomui = true;
    issuesContainer.className = "abledom-issues-container";
    container.appendChild(issuesContainer);
    return issuesContainer;
  }

  private _createMenuContainer(
    doc: Document,
    container: HTMLElementWithAbleDOMUIFlag,
  ): HTMLElementWithAbleDOMUIFlag {
    const menuElement = doc.createElement(
      "div",
    ) as HTMLElementWithAbleDOMUIFlag;
    menuElement.__abledomui = true;
    menuElement.className = "abledom-menu-container";
    container.appendChild(menuElement);
    return menuElement;
  }

  private _buildMenu(menuElement: HTMLElementWithAbleDOMUIFlag): void {
    new DOMBuilder(menuElement)
      .openTag("div", { class: "abledom-menu-wrapper" })
      .openTag("div", { class: "abledom-menu" })
      .openTag(
        "span",
        {
          class: "issues-count",
          title: "Number of issues",
        },
        (issueCountElement) => {
          this._bindIssueCountElement(issueCountElement);
        },
      )
      .closeTag()
      .openTag("div", { class: "controls-wrapper" })
      .openTag("div", { class: "controls" })
      .openTag(
        "button",
        {
          class: "button",
          title: "Show all issues",
        },
        (showAllButton) => {
          this._showAllButton = showAllButton;
          this._bindToggleAllButton(showAllButton, true);
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
          this._bindToggleAllButton(hideAllButton, false);
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
          this._bindMuteButton(muteButton);
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
          this._bindAlignmentButton(
            alignBottomLeftButton,
            UIAlignments.BottomLeft,
          );
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
          this._bindAlignmentButton(alignTopLeftButton, UIAlignments.TopLeft);
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
          this._bindAlignmentButton(alignTopRightButton, UIAlignments.TopRight);
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
          this._bindAlignmentButton(
            alignBottomRightButton,
            UIAlignments.BottomRight,
          );
        },
      )
      .element(svgAlignBottomRight)
      .closeTag()
      .closeTag()
      .closeTag()
      .closeTag()
      .closeTag();
  }

  private _bindToggleAllButton(button: HTMLElement, show: boolean): void {
    button.onclick = () => {
      this.toggleAll(show);
    };
  }

  private _bindIssueCountElement(element: HTMLElement): void {
    this._issueCountElement = element as HTMLSpanElement;
    element.onclick = () => {
      this.toggleAll();
    };
  }

  private _bindMuteButton(button: HTMLElement): void {
    button.onclick = () => {
      const isMuted = (this._isMuted = button.classList.toggle(pressedClass));
      button.setAttribute(
        "title",
        isMuted
          ? "Unmute newly appearing issues"
          : "Mute newly appearing issues",
      );
    };
  }

  private _bindAlignmentButton(
    button: HTMLElement,
    alignment: UIAlignments,
  ): void {
    button.onclick = () => {
      this.setUIAlignment(alignment);
    };
  }

  private setUIAlignment(alignment: UIAlignments) {
    if (!this._container || !this._issuesContainer || !this._menuElement) {
      return;
    }

    this._clearAlignmentButtons();
    this._container.classList.remove(
      "abledom-align-left",
      "abledom-align-right",
      "abledom-align-top",
      "abledom-align-bottom",
    );

    const { containerClasses, issuesFirst, activeButton } =
      this._getAlignmentLayout(alignment);
    activeButton?.classList.add(pressedClass);

    this._container.classList.add(...containerClasses);
    this._container.insertBefore(
      this._issuesContainer,
      issuesFirst ? this._menuElement : null,
    );
  }

  private _clearAlignmentButtons(): void {
    this._alignBottomLeftButton?.classList.remove(pressedClass);
    this._alignBottomRightButton?.classList.remove(pressedClass);
    this._alignTopLeftButton?.classList.remove(pressedClass);
    this._alignTopRightButton?.classList.remove(pressedClass);
  }

  private _getAlignmentLayout(alignment: UIAlignments): {
    containerClasses: string[];
    issuesFirst: boolean;
    activeButton: HTMLElement | undefined;
  } {
    let containerClasses: string[] = [];
    let issuesFirst = false;
    let activeButton: HTMLElement | undefined;

    switch (alignment) {
      case UIAlignments.BottomLeft:
        containerClasses = ["abledom-align-left", "abledom-align-bottom"];
        issuesFirst = true;
        activeButton = this._alignBottomLeftButton;
        break;
      case UIAlignments.BottomRight:
        containerClasses = ["abledom-align-right", "abledom-align-bottom"];
        issuesFirst = true;
        activeButton = this._alignBottomRightButton;
        break;
      case UIAlignments.TopLeft:
        containerClasses = ["abledom-align-left", "abledom-align-top"];
        activeButton = this._alignTopLeftButton;
        break;
      case UIAlignments.TopRight:
        containerClasses = ["abledom-align-right", "abledom-align-top"];
        activeButton = this._alignTopRightButton;
        break;
    }

    return { containerClasses, issuesFirst, activeButton };
  }

  private _setIssuesCount(count: number) {
    if (!this._menuElement) {
      return;
    }

    const countElement = this._issueCountElement;

    if (countElement && count > 0) {
      this._renderIssueCountText(countElement, count);
      this._setMenuVisibility(true);
    } else {
      this._setMenuVisibility(false);
    }
  }

  private _renderIssueCountText(
    countElement: HTMLSpanElement,
    count: number,
  ): void {
    countElement.textContent = "";
    new DOMBuilder(countElement)
      .openTag("strong")
      .text(`${count}`)
      .closeTag()
      .text(` issue${count > 1 ? "s" : ""}`);
  }

  private _setMenuVisibility(visible: boolean): void {
    if (this._menuElement) {
      this._menuElement.style.display = visible ? "block" : "none";
    }
  }

  private _setShowHideButtonsVisibility() {
    const showAllButton = this._showAllButton;
    const hideAllButton = this._hideAllButton;

    if (!showAllButton || !hideAllButton) {
      return;
    }

    const { allHidden, allVisible } = this._getIssueVisibilityState();

    hideAllButton.style.display = allHidden ? "none" : "";
    showAllButton.style.display = allVisible ? "none" : "";
  }

  private _getIssueVisibilityState(): {
    allHidden: boolean;
    allVisible: boolean;
  } {
    let allHidden = true;
    let allVisible = true;

    for (const issue of this._issues) {
      if (issue.isHidden) {
        allVisible = false;
      } else {
        allHidden = false;
      }

      if (!allHidden && !allVisible) {
        break;
      }
    }

    return { allHidden, allVisible };
  }

  private _syncMenuState(): void {
    this._setIssuesCount(this._issues.size);
    this._setShowHideButtonsVisibility();
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

    if (this._isMuted) {
      issue.toggle(false, true);
    }

    IssueUI.setAppended(issue);

    IssueUI.setOnToggle(issue, () => {
      this._setShowHideButtonsVisibility();
    });

    this._syncMenuState();
  }

  getIssueContainer(
    type: ValidationRuleType,
    groupName?: string,
    helpLink?: string,
  ): HTMLElement {
    if (!this._issuesContainer) {
      throw new Error("IssuesUI is not initialized");
    }

    if (!groupName) {
      return this._issuesContainer;
    }

    let groupContainer = this._issueGroupContainers[groupName];

    if (!groupContainer) {
      groupContainer = this._createIssueGroup(groupName, type, helpLink);
    }

    return groupContainer;
  }

  syncGroupIssueCounts(): void {
    this._updateGroupIssueCounts();
  }

  private _createIssueGroup(
    groupName: string,
    type: ValidationRuleType,
    helpLink?: string,
  ): HTMLElementWithAbleDOMUIFlag {
    if (!this._issuesContainer) {
      throw new Error("IssuesUI is not initialized");
    }

    let groupContainer: HTMLElementWithAbleDOMUIFlag | undefined;

    new DOMBuilder(this._issuesContainer)
      .openTag("div", { class: "abledom-issue-group" })
      .openTag("div", {
        class: `abledom-issue-group-title abledom-issue${getIssueTypeClass(type)}`,
      })
      .openTag(
        "button",
        {
          class: "button toggle collapsed",
          title: "Toggle group",
        },
        (toggleButton) => {
          this._bindGroupToggleButton(toggleButton, () => groupContainer);
        },
      )
      .element(svgChevronRight)
      .element(svgChevronDown)
      .openTag("span", { class: "abledom-issue-group-count" }, (countEl) => {
        this._issueGroupCountElements[groupName] = countEl;
      })
      .closeTag()
      .closeTag()
      .text(groupName)
      .openTag(
        "a",
        {
          class: "button help",
          href: helpLink || "/",
          title: "Open help",
          target: "_blank",
        },
        (help) => {
          this._hideHelpLinkIfMissing(help, helpLink);
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
          this._bindGroupCloseButton(closeButton, () => groupContainer);
        },
      )
      .element(svgClose)
      .closeTag()
      .closeTag()
      .openTag("div", { class: "abledom-issue-group-issues" }, (element) => {
        this._issueGroupContainers[groupName] = groupContainer = element;
        groupContainer.style.display = "none";
      })
      .closeTag()
      .closeTag();

    if (!groupContainer) {
      throw new Error("Issue group container was not created");
    }

    return groupContainer;
  }

  private _bindGroupToggleButton(
    button: HTMLElement,
    getGroupContainer: () => HTMLElementWithAbleDOMUIFlag | undefined,
  ): void {
    let isCollapsed = true;

    button.onclick = () => {
      isCollapsed = !isCollapsed;

      button.classList.toggle("collapsed", isCollapsed);
      const groupContainer = getGroupContainer();

      if (groupContainer) {
        groupContainer.style.display = isCollapsed ? "none" : "";
      }
    };
  }

  private _bindGroupCloseButton(
    button: HTMLElement,
    getGroupContainer: () => HTMLElementWithAbleDOMUIFlag | undefined,
  ): void {
    button.onclick = () => {
      const groupContainer = getGroupContainer();

      if (groupContainer) {
        Array.prototype.forEach.call(
          groupContainer.children,
          (el: HTMLElementWithIssueUI) => {
            el.__ableDOMIssueUI?.toggle(false);
          },
        );
        this._setShowHideButtonsVisibility();
      }

      this.highlight(null);
    };
  }

  private _hideHelpLinkIfMissing(help: HTMLElement, helpLink?: string): void {
    if (!helpLink) {
      help.style.display = "none";
    }
  }

  private _updateGroupIssueCounts() {
    for (const [groupName, container] of Object.entries(
      this._issueGroupContainers,
    )) {
      const countElement = this._issueGroupCountElements[groupName];

      if (container && countElement) {
        const count = container.children.length;

        if (count === 0) {
          this._removeIssueGroup(groupName, container);
          continue;
        }

        countElement.textContent = `${count}`;
      }
    }
  }

  private _removeIssueGroup(
    groupName: string,
    container: HTMLElementWithAbleDOMUIFlag,
  ): void {
    const groupElement = container.parentElement;

    if (groupElement?.classList.contains("abledom-issue-group")) {
      groupElement.remove();
    } else {
      container.remove();
    }

    delete this._issueGroupContainers[groupName];
    delete this._issueGroupCountElements[groupName];
  }

  removeIssue(issue: IssueUI) {
    if (!this._issues.has(issue)) {
      return;
    }

    this._issues.delete(issue);

    this._syncMenuState();
    this._updateGroupIssueCounts();
    this.highlight(null);
  }

  toggleAll(show?: boolean) {
    if (show === undefined) {
      const { allVisible } = this._getIssueVisibilityState();
      show = !allVisible;
    }

    this._issues.forEach((issue) => {
      issue.toggle(show);
    });

    this._setShowHideButtonsVisibility();
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

export class ElementHighlighter {
  private _window: Window | undefined;
  private _container: HTMLElementWithAbleDOMUIFlag | undefined;
  private _element: HTMLElement | undefined;
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

    this._unobserve();
    this._intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry) {
        return;
      }

      this._renderHighlightRect(entry.boundingClientRect, win.document.body);
    });

    this._intersectionObserver.observe(element);
  }

  dispose() {
    this._unobserve();
    this._cancelScrollTimer?.();
    this._cancelAutoHideTimer?.();
    this._window?.removeEventListener("scroll", this._onScroll, true);
    this._container?.remove();
    delete this._element;
    delete this._container;
    delete this._window;
  }

  private _renderHighlightRect(rect: DOMRectReadOnly, body: HTMLElement): void {
    const container = this._container;

    if (!container) {
      return;
    }

    if (container.parentElement !== body) {
      body.appendChild(container);
    }

    const style = container.style;
    style.width = `${rect.width}px`;
    style.height = `${rect.height}px`;
    style.top = `${rect.top}px`;
    style.left = `${rect.left}px`;
    style.display = "block";
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
