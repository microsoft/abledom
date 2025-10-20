/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbleDOM, ContrastRule } from "abledom";

console.log("Test Page 1 script loaded");

const ableDOM = new AbleDOM(window, {
  bugReport: {
    isVisible: (issue) => {
      return issue.id === "focusable-element-label";
    },
    onClick: (issue) => {
      alert(issue.id);
    },
    getTitle(issue) {
      return `Custom report bug button title for ${issue.id}`;
    },
  },
});
ableDOM.addRule(new ContrastRule());

ableDOM.start();
