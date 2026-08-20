// index.js
// This file imports all the modules to injects. It is the entry point of the bundle

// ===========
// Import
// ===========
import { injectButton } from "./button.js";
import { injectDOMfn } from "./DOM.js";
import { injectCSS } from "./CSS.js";
import { injectNavigationGuard } from "./navigationGuard.js";
import { injectClockMocking } from "./clock.js";
import { injectScrollGuard } from "./scrollGuard.js";
import { config } from "../config.js";



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
  if (config.enableClockMocking) {
    injectClockMocking();
  }

  // Install DOM manipulation functions
  injectDOMfn();

  // Install window scroll guard
  if (config.preventScroll) {
    injectScrollGuard();
  }

  // Install CSS
  if (config.preventAnimations) {
    injectCSS();
  }

  // Install command button
  onDOMReady(() => {
    injectButton();
  })
})();