/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type {
  AbleDOM,
  AbleDOMProps,
  ValidationRule,
  ValidationIssue,
} from "abledom";
import { Page } from "@playwright/test";

export const issueSelector = "#abledom-report .abledom-issue";

interface WindowWithAbleDOMData extends Window {
  __ableDOMIdle?: () => Promise<void>;
  __ableDOMIssuesFromCallbacks?: Map<
    HTMLElement | null,
    Map<ValidationRule<ValidationIssue>, ValidationIssue>
  >;
}

export function getAbleDOMCallbacks(): AbleDOMProps["callbacks"] {
  (window as WindowWithAbleDOMData).__ableDOMIssuesFromCallbacks = new Map();

  return {
    onIssueAdded: (element, rule, issue) => {
      let issues = (
        element?.ownerDocument.defaultView as WindowWithAbleDOMData | undefined
      )?.__ableDOMIssuesFromCallbacks;

      if (!issues) {
        return;
      }

      let elementIssues = issues.get(element);

      if (!elementIssues) {
        elementIssues = new Map();
        issues.set(element, elementIssues);
      }

      elementIssues.set(rule, issue);
    },

    onIssueUpdated: (element, rule, issue) => {
      (
        element?.ownerDocument.defaultView as WindowWithAbleDOMData | undefined
      )?.__ableDOMIssuesFromCallbacks
        ?.get(element)
        ?.set(rule, issue);
    },

    onIssueRemoved: (element, rule) => {
      const issues = (
        element?.ownerDocument.defaultView as WindowWithAbleDOMData | undefined
      )?.__ableDOMIssuesFromCallbacks;

      if (issues) {
        const elementIssues = issues.get(element);

        if (elementIssues) {
          elementIssues.delete(rule);

          if (elementIssues.size === 0) {
            issues.delete(element);
          }
        }
      }
    },
  };
}

export function initIdleProp(ableDOM: AbleDOM) {
  (window as WindowWithAbleDOMData).__ableDOMIdle = () => ableDOM.idle();
}

export async function loadTestPage(page: Page, uri: string): Promise<void> {
  await page.goto(uri, {
    waitUntil: "domcontentloaded",
  });
}

export async function awaitIdle(page: Page): Promise<void> {
  return await page.evaluate(async () => {
    await (window as WindowWithAbleDOMData).__ableDOMIdle?.();
  });
}

export async function getIssuesCount(page: Page): Promise<number> {
  const issues = await page.$$(issueSelector);
  return issues.length;
}

export async function getIssuesFromCallbacks(
  page: Page,
): Promise<ValidationIssue[]> {
  return await page.evaluate(() => {
    const issues: ValidationIssue[] = [];
    (window as WindowWithAbleDOMData).__ableDOMIssuesFromCallbacks?.forEach(
      (elementIssues) => {
        elementIssues.forEach((issue) => {
          issues.push(issue);
        });
      },
    );
    return issues;
  });
}
