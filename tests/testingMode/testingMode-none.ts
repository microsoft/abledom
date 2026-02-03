/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbleDOM, FocusableElementLabelRule } from "abledom";
import { initIdleProp, getAbleDOMCallbacks } from "../utils";

// Create AbleDOM without any testing mode flag
const ableDOM = new AbleDOM(window, {
  headless: true,
  callbacks: getAbleDOMCallbacks(),
});
initIdleProp(ableDOM);
ableDOM.addRule(new FocusableElementLabelRule());
ableDOM.start();
