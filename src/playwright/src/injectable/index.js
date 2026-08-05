// index.js
// This file imports all the modules to injects. It is the entry point of the bundle

// ===========
// Import
// ===========
import { injectButton } from "./button.js";
import { injectDOMfn } from "./DOM.js";
import { injectHTMLmarker } from "./HTMLmarker.js";
import { injectNavigationGuard } from "./navigationGuard.js";
import { injectClockMocking } from "./clock.js";
import { injectScrollGuard } from "./scrollGuard.js";



// ===========
// Functions
// ===========
function onDOMReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

// ===========
// Main
// ===========
(async () => {
  window.__instrumentation__ ??= {};

  // Install navigation guards
  injectNavigationGuard();

  // Install clock mocking
  injectClockMocking();

  // Install DOM manipulation functions
  injectDOMfn();

  // Install window scroll guard
  injectScrollGuard();

  // Install HTML marker
  injectHTMLmarker();

  // Install command button
  onDOMReady(() => {
    injectButton();
  })
})();