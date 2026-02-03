/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbleDOM, FocusableElementLabelRule } from "abledom";
import { initIdleProp, getAbleDOMCallbacks } from "../utils";

// Create AbleDOM with headless: false (should stay false with mode 3)
const ableDOM = new AbleDOM(window, {
  headless: false,
  callbacks: getAbleDOMCallbacks(),
});
initIdleProp(ableDOM);
ableDOM.addRule(new FocusableElementLabelRule());
ableDOM.start();
