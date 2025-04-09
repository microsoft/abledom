/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* global chrome */

const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.type = "text/javascript";
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

// Connect to background
let port; // = chrome.runtime.connect({ name: 'content' });

function retryPostMessage(msg, retryCount = 0, error = undefined) {
  if (retryCount > 3) {
    console.error("Failed to post message after 3 retries:", msg, error);
    return;
  }

  try {
    if (!port) {
      port = chrome.runtime.connect({ name: "content" });
      port.onMessage.addListener(listenerFunction);
    }

    port.postMessage(msg);
  } catch (e) {
    port = null;
    retryPostMessage(msg, retryCount + 1, e);
  }
}

window.addEventListener("abledom:reveal-element", (e) => {
  const { elementId } = e.detail;
  retryPostMessage({ type: "reveal", elementId });
});

setInterval(() => {
  retryPostMessage({ type: "ping" });
}, 3000);

function listenerFunction(msg /*, sender, sendResponse*/) {
  // console.error(11111, msg);

  if (msg.type === "ololo") {
    window.dispatchEvent(
      new CustomEvent("ololo", {
        detail: msg.payload,
      }),
    );
  }
}
