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
    findElement,
    fingerprintMatches,
    getElFingerprint,
    extractClickableElements,
  }
}



function extractClickableElements(ignoreObj) {
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
        outline:6px solid red !important;
        outline-offset:-4px !important;
      }
    `;
    document.head.appendChild(style);
  }

  const clickableRoles = new Set([
    "button",
    "checkbox",
    "dialog",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "switch",
    "tab",
  ]);

  const clickableEls = [];
  const all = document.querySelectorAll("*");

  for (const el of all) {
    if (!(el instanceof Element)) { continue; }
    if (el.id === "__playwright_debug") { continue; }
    if (isInsideIgnoredTags(el, ignoreObj.tags)) { continue; }

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
    // Disabled buttons may be interesting to click too
    // if (el.hasAttribute("disabled")) {
    // continue;
    // }

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

    //-------------------------
    // Exclude invisible elements
    //-------------------------
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const top = document.elementFromPoint(cx, cy);
    el.rect = rect;

    // ignore elements in areas defined as out of scope
    if (isInsideIgnoredArea(el.rect, ignoreObj.viewport)) { continue; }

    // element is invisible
    if (top !== el && !el.contains(top)) {
      continue;
    }

    // element is too small
    if (rect.width < 8 || rect.height < 8) {
      continue;
    }

    //-------------------------
    // Highlight
    //-------------------------
    if (reasons.length > 0) {
      el.classList.add("_redRect");
      clickableEls.push({ type: "CLICK", data: getElFingerprint(el), reasons });
    }
  }

  return clickableEls;
}


function isInsideIgnoredTags(el, ignoredRegions = []) {
  if (!ignoredRegions.length) { return false; }
  return el.closest(ignoredRegions.join(",")) !== null;
}


function isInsideIgnoredArea(rect, config = {}) {
  if (config.top !== undefined && rect.bottom <= config.top) {
    return true;
  }

  if (config.bottom !== undefined && rect.top >= window.innerHeight - config.bottom) {
    return true;
  }

  if (config.left !== undefined && rect.right <= config.left) {
    return true;
  }

  if (config.right !== undefined && rect.left >= window.innerWidth - config.right) {
    return true;
  }

  return false;
}



// Used to select the element 
function findElement(fp) {

  const candidates = Array.from(
    document.querySelectorAll(fp.tag)
  ).filter(el => {
    const style = window.getComputedStyle(el);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      el.offsetParent !== null
    );
  });

  const matches = candidates.filter(el => {
    const candidateFp = getElFingerprint(el);
    return fingerprintMatches(candidateFp, fp);
  });

  return matches.length === 1 ? matches[0] : null;
}



/**
 * Returns element fingerprint
 * Example
 * 
  {
    tag: "button",
    id: null,
    attributes: [
      {
        name: "data-name",
        value: "f78979af-5680-4b95-8a93-27c5f66ba2f3"
      }
    ],
    rect: {
      x: 240,
      y: 95.8125,
      width: 200,
      height: 200
    }
  }
 * 
 */
export function getElFingerprint(el) {
  if (!el) { return null; }

  const attrs = Array.from(el.attributes)
    .filter(attr => attr.name.startsWith("data-") || attr.name === "role" || attr.name === "name")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(attr => ({ name: attr.name, value: attr.value }));

  const rect = el.rect || el.getBoundingClientRect();

  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    attributes: attrs,
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    }
  };
}



function rectMatches(a, b, tolerance = 0) {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}



function fingerprintMatches(candidate, target) {
  if (candidate.tag !== target.tag) {
    return false;
  }

  if (candidate.id !== target.id) {
    return false;
  }

  if (candidate.attributes.length !== target.attributes.length) {
    return false;
  }

  for (const attr of target.attributes) {
    const candidateAttr = candidate.attributes.find(
      a => a.name === attr.name
    );

    if (!candidateAttr || candidateAttr.value !== attr.value) {
      return false;
    }
  }

  return rectMatches(candidate.rect,target.rect,);
}