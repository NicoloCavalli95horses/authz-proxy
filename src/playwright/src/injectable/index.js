// index.js
// This file imports all the modules to injects. It is the entry point of the bundle

// ===========
// Import
// ===========
import { injectButton } from "./button.js";
import { injectPageAgent } from "./pageAgent.js";



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

  // Install Page Agent
  await injectPageAgent();

  // Install command button
  onDOMReady(() => {
    injectButton();
  })
})();