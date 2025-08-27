/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type { AbleDOM } from "abledom";
import { Page } from "@playwright/test";

export const issueSelector = "#abledom-report .abledom-issue";

interface WindowWithAbleDOMIdle extends Window {
  __ableDOMIdle?: () => Promise<void>;
}

export function initIdleProp(ableDOM: AbleDOM) {
  (window as WindowWithAbleDOMIdle).__ableDOMIdle = () => ableDOM.idle();
}

export async function loadTestPage(page: Page, uri: string): Promise<void> {
  await page.goto(uri, {
    waitUntil: "domcontentloaded",
  });
}

export async function awaitIdle(page: Page): Promise<void> {
  return await page.evaluate(async () => {
    await (window as WindowWithAbleDOMIdle).__ableDOMIdle?.();
  });
}

export async function getIssuesCount(page: Page): Promise<number> {
  const issues = await page.$$(issueSelector);
  return issues.length;
}
