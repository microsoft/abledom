/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export { attachAbleDOMMethodsToPage } from "./page-injector.js";
export type { AbleDOMTestingMode, WindowWithAbleDOMInstance } from "./types.js";
export {
  AbleDOMReporter,
  type AbleDOMReporterOptions,
  type ReportEntry,
} from "./reporter.js";
export {
  createAbleDOMTest,
  createAbleDOMPageFixture,
  type AbleDOMFixtures,
} from "./fixtures.js";
