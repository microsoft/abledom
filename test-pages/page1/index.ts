/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  AbleDOM,
  AtomicRule,
  FocusableElementLabelRule,
  ExistingIdRule,
  FocusLostRule,
} from "abledom";

console.log("Test Page 1 script loaded");

const ableDOM = new AbleDOM(window);
ableDOM.addRule(new FocusableElementLabelRule());
ableDOM.addRule(new AtomicRule());
ableDOM.addRule(new ExistingIdRule());
ableDOM.addRule(new FocusLostRule());
ableDOM.start();

const b = document.createElement("button");
b.innerText = "Click me";
b.setAttribute("aria-label", "Piupiu");
b.title = "Tititt";
b.setAttribute("aria-labelledby", "labelledby");
b.setAttribute("aria-hidden", "true");

const img = document.createElement("img");
img.src = "aaa";
img.alt = "Alt";
img.setAttribute("hidden", "");

const i = document.createElement("input");
i.type = "submit";
i.value = "Input";
// i.setAttribute("aria-hidden", "true");

document.getElementById("button")?.appendChild(b);
// document.getElementById("button")?.appendChild(img);
document.getElementById("button")?.appendChild(i);
