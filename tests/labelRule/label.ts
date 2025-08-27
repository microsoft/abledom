/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbleDOM, FocusableElementLabelRule } from "abledom";
import { initIdleProp } from "../utils";

const ableDOM = new AbleDOM(window);
initIdleProp(ableDOM);
ableDOM.addRule(new FocusableElementLabelRule());
ableDOM.start();
