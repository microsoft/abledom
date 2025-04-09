/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* global chrome */

let port;

function retryPostMessage(msg, retryCount = 0, error = undefined) {
  if (retryCount > 3) {
    console.error("Failed to post message after 3 retries:", msg, error);
    return;
  }

  try {
    if (!port) {
      port = chrome.runtime.connect({ name: "devtools" });
      port.onMessage.addListener(listenerFunction);
    }

    port.postMessage(msg);
  } catch (e) {
    port = null;
    retryPostMessage(msg, retryCount + 1, e);
  }
}

retryPostMessage({
  type: "init",
  tabId: chrome.devtools.inspectedWindow.tabId,
});

function listenerFunction(msg) {
  if (msg.type === "reveal" && msg.elementId) {
    chrome.devtools.inspectedWindow.eval(`
      (() => {
        const el = window.__ableDOMDevtools?.revealRegistry?.["${msg.elementId}"];
        if (el) {
          inspect(el);
        }
        delete window.__ableDOMDevtools?.revealRegistry?.["${msg.elementId}"];
      })()
    `);

    retryPostMessage({
      type: "revealed",
      tabId: chrome.devtools.inspectedWindow.tabId,
    });
  }
}
