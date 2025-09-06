/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbleDOM, ContrastRule } from "abledom";
import { initIdleProp } from "../utils";

const ableDOM = new AbleDOM(window);
initIdleProp(ableDOM);
ableDOM.addRule(new ContrastRule());
ableDOM.start();
