// injectHook.js
// These functions are injected in the visited webpage

// ===========
// Import
// ===========
import { getElementData } from "./DOM.js";


// ===========
// Functions
// ===========

export async function injectButton() {
  window.__instrumentation__ ??= {};

  if (!window.__instrumentation__.installButton) {
    await installButton();
    installClickListener();
  }
  window.__instrumentation__.installButton = true;
  window.__instrumentation__.setButtonState = setButtonState;
}

function setButtonState(state) {
  const btn = document.getElementById("__playwright_debug");
  if (!btn) { return; }

  btn.dataset.state = state;
  btn.innerText = updateBtnLabel(state);
}

async function installButton() {
  if (document.getElementById("__playwright_debug")) { return; }
  if (typeof window._getState != "function") { return; }

  const btn = document.createElement("button");
  btn.id = "__playwright_debug";

  const state = await window._getState();
  btn.dataset.state = state;
  btn.innerText = updateBtnLabel(state);

  btn.style.cssText = `
      position: fixed;
      bottom: 0px;
      right: 0px;
      width: auto;
      z-index: 2147483647;
      background: #000;
      color: white;
      cursor:pointer;
    `;

  btn.onclick = async () => {
    if (typeof window._dispatchEvent === "function") {
      await window._dispatchEvent({ type: "STATE_CHANGE_REQUEST", source: "button" });
      const state = await window._getState();
      btn.dataset.state = state;
      btn.innerText = updateBtnLabel(state);
    }
  };

  document.body.appendChild(btn);
}

function getClickableTarget(el) {
  return el.closest("button, a, input, select, textarea, [role='button'], [onclick]") || el;
}

function installClickListener() {
  document.addEventListener("click", e => {
    const canEmitClick = !e.target.closest("#__playwright_debug") && typeof window._dispatchEvent === "function";
    if (canEmitClick) {
      const target = e.target instanceof Element ? getClickableTarget(e.target) : null;
      if (!target) { return; }
      window._dispatchEvent({ type: "CLICK", data: getElementData(target) });
    }
  }, true);
}

function updateBtnLabel(state) {
  switch (state) {
    case "idle":
      return "Click to start";

    case "setup":
      return "Click to end setup";

    case "exploration":
      return "Exploring page...";

    case "[TODO]":
      return "[TODO]";

    default:
      return "Click to start";
  }
}
