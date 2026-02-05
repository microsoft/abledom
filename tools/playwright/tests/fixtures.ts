/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test as base, mergeTests } from "@playwright/test";
import { createAbleDOMPageFixture, createAbleDOMTest } from "../src/index";

/**
 * Extended test with AbleDOM page fixture.
 * The page automatically has AbleDOM methods attached.
 * Use this when you want to override Playwright's built-in page fixture.
 */
export const test = base.extend({
  page: createAbleDOMPageFixture(),
});

/**
 * Extended test with AbleDOM test fixture using mergeTests.
 * Provides attachAbleDOM function to manually attach to pages.
 * Use this when you create pages manually (e.g., via context.newPage()).
 */
export const testWithAttachAbleDOM = mergeTests(base, createAbleDOMTest());

export { expect } from "@playwright/test";
