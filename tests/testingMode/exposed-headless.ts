/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbleDOM, FocusableElementLabelRule } from "abledom";
import { initIdleProp, getAbleDOMCallbacks } from "../utils";

// Create AbleDOM with headless: true (hide UI) and expose instance for testing
const ableDOM = new AbleDOM(window, {
  headless: true,
  exposeInstanceForTesting: true,
  callbacks: getAbleDOMCallbacks(),
});
initIdleProp(ableDOM);
ableDOM.addRule(new FocusableElementLabelRule());
ableDOM.start();
