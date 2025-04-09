/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* global chrome */

const portsByTab = {}; // { [tabId]: { devtools, content } }

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "devtools") {
    let currentTabId = null;

    port.onMessage.addListener((msg) => {
      if (msg.type === "init" && msg.tabId != null) {
        currentTabId = msg.tabId;
        if (!portsByTab[currentTabId]) {
          portsByTab[currentTabId] = {};
        }
        portsByTab[currentTabId].devtools = port;
      }

      if (msg.type === "revealed" && portsByTab[msg.tabId]?.content) {
        // console.error(9394994, portsByTab[msg.tabId].content)
        portsByTab[msg.tabId].content.postMessage({
          type: "ololo",
          payload: { message: "Hi from background!" },
        });
      }
    });

    port.onDisconnect.addListener(() => {
      if (currentTabId && portsByTab[currentTabId]?.devtools === port) {
        portsByTab[currentTabId].devtools = null;
      }
    });
  } else if (port.name === "content") {
    const tabId = port.sender?.tab?.id;
    if (tabId == null) {
      return;
    }

    if (!portsByTab[tabId]) {
      portsByTab[tabId] = {};
    }
    portsByTab[tabId].content = port;

    port.onMessage.addListener((msg) => {
      if (msg.type === "reveal" && portsByTab[tabId]?.devtools) {
        portsByTab[tabId].devtools.postMessage(msg);
      }
    });

    port.onDisconnect.addListener(() => {
      if (portsByTab[tabId]?.content === port) {
        portsByTab[tabId].content = null;
      }
    });
  }
});

// Inject into page when DevTools opens
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "devtools-opened" && msg.tabId) {
    chrome.scripting.executeScript({
      target: { tabId: msg.tabId },
      files: ["inject.js"],
    });
  }
});
