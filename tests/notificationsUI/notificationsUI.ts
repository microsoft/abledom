/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  AbleDOM,
  CustomNotifyRule,
  FocusableElementLabelRule,
  ContrastRule,
} from "abledom";
import { initIdleProp } from "../utils";

const notifyRule = new CustomNotifyRule();

const ableDOM = new AbleDOM(window);
initIdleProp(ableDOM);
ableDOM.addRule(notifyRule);
ableDOM.addRule(new FocusableElementLabelRule());
ableDOM.addRule(new ContrastRule());
ableDOM.start();

(window as Window & { __notifyRule?: CustomNotifyRule }).__notifyRule =
  notifyRule;
