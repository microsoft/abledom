/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test as base } from "@playwright/test";
import { createAbleDOMFixture } from "../src/index";

/**
 * Extended test with AbleDOM fixture.
 * The page automatically has AbleDOM methods attached.
 */
export const test = base.extend({
  page: createAbleDOMFixture(),
});

export { expect } from "@playwright/test";
