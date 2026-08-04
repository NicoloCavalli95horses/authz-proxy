// DOM.js
// utilities functions for DOM element retrieval
// These functions are injected in the visited webpage

// ===========
// Functions
// ===========
export function injectDOMfn() {
  window.__instrumentation__ ??= {};

  if (!window.__instrumentation__.DOMutils) {
    window.__instrumentation__.DOMutils = installDOMfn();
  }
}


function installDOMfn() {
  return {
    extractClickableElements,
  }
}


function getElData(el) {
  const id = el.dataset.mitmId;
  const selector = `[data-mitm-id="${id}"]`;

  return {
    selector,
    tag: el.tagName.toLowerCase(),
    text: el.innerText.trim(),
  };
}


function extractClickableElements() {
  // Remove possible existing highlight
  document.querySelectorAll("._redRect").forEach(el => {
    el.classList.remove("_redRect");
  });

  // One-time CSS injection
  if (!document.getElementById("__redRectStyle")) {
    const style = document.createElement("style");
    style.id = "__redRectStyle";
    style.textContent = `
      ._redRect{
        outline:3px solid red !important;
        outline-offset:-2px !important;
      }

      ._redRect:hover{
        outline:3px solid orange !important;
      }
    `;
    document.head.appendChild(style);
  }

  const clickableRoles = new Set([
    "button",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "tab",
    "checkbox",
    "radio",
    "switch",
    "option",
    "treeitem"
  ]);

  const clickable = [];
  const all = document.querySelectorAll("*");

  for (const el of all) {
    if (!(el instanceof Element)) { continue; }
    if (el.id === "__playwright_debug") { continue; }

    const reasons = [];
    //-------------------------
    // TAG
    //-------------------------

    const tag = el.tagName.toLowerCase();

    if (tag === "button") {
      reasons.push("button");
    }

    if (tag === "a" && el.hasAttribute("href")) {
      reasons.push("anchor");
    }

    if (tag === "select") {
      reasons.push("select");
    }

    if (tag === "input") {
      const t = (el.getAttribute("type") || "").toLowerCase();
      if (["button", "radio", "checkbox"].includes(t)) { // exclude input type="text" and similar
        reasons.push("input:" + t);
      }
    }

    //-------------------------
    // ROLE
    //-------------------------
    const role = el.getAttribute("role");

    if (role && clickableRoles.has(role)) {
      reasons.push("role=" + role);
    }

    //-------------------------
    // TABINDEX
    //-------------------------
    if (el.tabIndex >= 0) {
      reasons.push("tabindex");
    }

    //-------------------------
    // ARIA
    //-------------------------
    if (el.hasAttribute("disabled")) {
      continue;
    }

    if (el.hasAttribute("aria-expanded")) {
      reasons.push("aria-expanded");
    }

    if (el.hasAttribute("aria-controls")) {
      reasons.push("aria-controls");
    }

    if (el.hasAttribute("aria-haspopup")) {
      reasons.push("aria-haspopup");
    }

    //-------------------------
    // Inline onclick
    //-------------------------
    if (typeof el.onclick === "function") {
      reasons.push("onclick");
    }

    //-------------------------
    // CSS
    //-------------------------
    const style = window.getComputedStyle(el);

    if (style.pointerEvents === "none" || style.visibility === "hidden") {
      continue;
    }

    if (style.cursor === "pointer") {
      reasons.push("cursor:pointer");
    }


    //-------------------------
    // Exclude invisible elements
    //-------------------------
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);

    if (top !== el && !el.contains(top)) {
      continue;
    }

    //-------------------------
    // Highlight
    //-------------------------
    if (reasons.length > 0) {
      el.classList.add("_redRect");
      clickable.push({ type: "click", data: getElData(el) });
    }
  }

  console.log(clickable);
  return clickable;
}