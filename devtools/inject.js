/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

(function () {
  // Minimal registry to map elements without polluting them
  const registry = {};
  let counter = 0;
  let currentResolve = undefined;
  let currentResolveTimeout = undefined;

  window.__ableDOMDevtools = {};
  window.__ableDOMDevtools.revealRegistry = registry;

  window.__ableDOMDevtools.revealElement = function (element) {
    if (!(element instanceof Element)) {
      return;
    }
    const id = "el_" + ++counter;
    registry[id] = element;

    window.dispatchEvent(
      new CustomEvent("abledom:reveal-element", {
        detail: { elementId: id },
      }),
    );

    return new Promise((resolve) => {
      if (currentResolveTimeout) {
        clearTimeout(currentResolveTimeout);
        currentResolveTimeout = undefined;
      }

      if (currentResolve) {
        currentResolve(true);
        currentResolve = undefined;
      }

      currentResolve = resolve;

      currentResolveTimeout = setTimeout(() => {
        currentResolveTimeout = undefined;
        currentResolve = undefined;

        resolve(false);
      }, 200);
    });
  };

  window.addEventListener("ololo", () => {
    if (currentResolveTimeout) {
      clearTimeout(currentResolveTimeout);
      currentResolveTimeout = undefined;
    }

    if (currentResolve) {
      currentResolve(true);
      currentResolve = undefined;
    }
  });
})();
