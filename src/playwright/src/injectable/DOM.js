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
    getElementData,
    fingerprintScore,
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

  const candidateEls = [];
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
      candidateEls.push({ type: "CLICK", data: getElementData(el), reasons });
    }
  }
  const validEls = candidateEls.filter(el => !hasInteractiveAncestor(el.data));

  console.log('[DOM] Clickable elements', validEls);
  return validEls;
}

function hasInteractiveAncestor(data) {
  let p = data.parent;

  while (p) {
    const tag = p.tag.toLowerCase();
    if (tag === "button" || tag === "a" || tag === "label" || tag === "summary") { return true; }
    if (p.role) { return true; }
    p = p.parent;
  }

  return false;
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


// Used to generate fingerprint
export function getElementData(el, depth = 2) {
  if (!el) { return null; }

  return {
    tag: el.tagName.toLowerCase(),
    text: normalizeText(el.innerText || el.textContent),
    id: getStableId(el),
    attributes: getUsefulAttributes(el),
    role: el.getAttribute("role"),
    type: el.getAttribute("type"),
    name: el.getAttribute("name"),
    aria: getAriaAttributes(el),
    parent: depth > 0 ? getElementData(el?.parentElement, depth - 1) : null,
    siblings: getSiblingInfo(el),
    fingerprint: fingerprint(el),
    rect: el.rect || el.getBoundingClientRect(),
  };
}

function normalizeText(text) {
  return text?.replace(/\s+/g, " ").trim().slice(0, 200) || "";
}


function getStableId(el) {
  const id = el.getAttribute("id");
  if (!id || isProbablyDynamicId(id)) { return null; }

  const matches = document.querySelectorAll(`#${CSS.escape(id)}`);
  return matches.length === 1 ? id : null;
}

function isProbablyDynamicId(id) {
  return (
    /\d{4,}/.test(id) ||
    /[:]/.test(id) ||
    /random|uuid|generated/i.test(id)
  );
}

function getUsefulAttributes(el) {
  const STABLE_ATTRIBUTES = [
    "name",
    "type",
    "role",
    "href",
    "title",
    "alt",
    "placeholder",
    "aria-label",
    "value"
  ];
  const result = {};

  for (const attr of STABLE_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (value) {
      result[attr] = value;
    }
  }
  return result;
}

function getAriaAttributes(el) {
  const result = {};

  for (const attr of el.attributes) {
    if (attr.name.startsWith("aria-")) {
      result[attr.name] = attr.value;
    }
  }

  return result;
}


function getSiblingInfo(el) {
  return Array
    .from(el.parentElement?.children || [])
    .filter(child => child !== el)
    .map(child => ({ tag: child.tagName.toLowerCase(), text: normalizeText(child.innerText) }))
    .slice(0, 10);
}


// Used to select the element 
function findElement(fp) {
  console.log('[DOM] searching for element:', fp);

  const candidates = Array.from(document.querySelectorAll(fp.tag)).filter(el => {
    const style = window.getComputedStyle(el);
    return (style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null);
  });

  for (const el of candidates) {
    const candidateFingerprint = fingerprint(el);
    if (candidateFingerprint === fp.fingerprint) {
      return { element: el, score: 1 };
    }
  }

  return { element: null, score: 0 };
}


function isEqual(a, b) {
  return a === b ? 1 : 0;
}

function escapeAttributeValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Calculate attribute similarity
function attributesSimilarity(a, b) {
  const keys = Object.keys(b);

  if (keys.length === 0) {
    return 1;
  }

  let match = 0;
  for (const key of keys) {
    if (a[key] === b[key]) {
      match++;
    }
  }

  return match / keys.length;
}

function siblingsSimilarity(a, b) {
  if (!a || !b) {
    return 0;
  }

  const aTexts = a.map(x => x.text).filter(Boolean);
  const bTexts = b.map(x => x.text).filter(Boolean);


  if (aTexts.length === 0) {
    return 0;
  }

  const common = aTexts.filter(x => bTexts.includes(x));

  return common.length / Math.max(aTexts.length, bTexts.length);
}

// Calculate parent similarity
function parentSimilarity(candidateParent, savedParent) {
  if (!candidateParent || !savedParent) {
    return 0;
  }

  return fingerprintScore(candidateParent, savedParent);
}

function fingerprint(el) {
  if (!el) { return ""; }

  let fp = el.tagName.toLowerCase();

  if (el.id) {
    fp += `#${el.id}`;
  }

  for (const attr of el.attributes) {
    if (attr.name.startsWith("data-") || attr.name === "role" || attr.name === "name") {
      fp += `[${attr.name}="${attr.value}"]`;
    }
  }

  return fp;
}


function textSimilarity(a = "", b = "") {
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();

  if (!a && !b) {
    return 1;
  }

  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i++)
    matrix[i][0] = i;

  for (let j = 0; j <= a.length; j++)
    matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
    }
  }

  return matrix[b.length][a.length];
}


function fingerprintScore(candidate, fp) {
  let score = 0;

  score += 0.35 * textSimilarity(candidate.text, fp.text);
  score += 0.20 * attributesSimilarity(candidate.attributes, fp.attributes);
  score += 0.15 * isEqual(candidate.role, fp.role);
  score += 0.15 * parentSimilarity(candidate.parent, fp.parent);
  score += 0.05 * siblingsSimilarity(candidate.siblings, fp.siblings);
  score += 0.10 * isEqual(candidate.type, fp.type);
  score += 0.05 * isEqual(candidate.name, fp.name);

  return score;
}