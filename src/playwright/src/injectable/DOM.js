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
    findElementFuzzy
  }
}


function getUniqueSelector(el) {
  const parts = [];

  while (el) {
    if (el.tagName === "HTML") {
      parts.unshift("html");
      break;
    }

    if (el.tagName === "BODY") {
      parts.unshift("body");
      el = el.parentElement;
      continue;
    }

    const tag = el.tagName.toLowerCase();

    let selector = tag;

    // Prefer stable attributes
    const attrs = [];

    if (el.id) {
      attrs.push(`#${CSS.escape(el.id)}`);
    }

    for (const attr of el.attributes) {
      if (
        attr.name.startsWith("data-") ||
        attr.name === "name" ||
        attr.name === "role" ||
        attr.name === "tabindex"
      ) {
        attrs.push(`[${attr.name}="${escapeAttributeValue(attr.value)}"]`);
      }
    }

    if (attrs.length > 0) {
      selector += attrs.join("");
    }

    // If still ambiguous among siblings, add nth-of-type
    const parent = el.parentElement;

    if (parent) {
      const sameType = [...parent.children].filter(child => child.tagName === el.tagName);
      if (sameType.length > 1) {
        const index = sameType.indexOf(el) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    const fullSelector = parts.join(" > ");

    if (document.querySelectorAll(fullSelector).length === 1) {
      return fullSelector;
    }

    el = el.parentElement;
  }

  return parts.join(" > ");
}

function escapeAttributeValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fingerprint(el) {
  if (!el) return "";

  let fp = el.tagName.toLowerCase();

  if (el.id)
    fp += `#${el.id}`;

  for (const attr of el.attributes) {
    if (
      attr.name.startsWith("data-") ||
      attr.name === "role" ||
      attr.name === "name"
    ) {
      fp += `[${attr.name}="${attr.value}"]`;
    }
  }

  return fp;
}

function buildElementSignature(el) {
  const attributes = {};

  for (const attr of el.attributes) {
    if (attr.name.startsWith("data-") || attr.name === "role" || attr.name === "name") {
      attributes[attr.name] = attr.value;
    }
  }

  return {
    selector: getUniqueSelector(el),
    tag: el.tagName.toLowerCase(),
    text: el.innerText.trim(),
    siblingIndex: [...el.parentElement.children].filter(e => e.tagName === el.tagName).indexOf(el),
    parentFingerprint: fingerprint(el.parentElement),
    attributes
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
    if (!(el instanceof HTMLElement)) { continue; }
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

      clickable.push({
        type: "click",
        data: buildElementSignature(el),
      });
    }

  }

  console.log(clickable);
  return clickable;
}

// Calculate attribute similarity
function attributeSimilarity(el, signature) {
  const attrs = signature.attributes;

  let score = 0;
  let total = Object.keys(attrs).length;

  if (!total)
    return 0;

  for (const [key, value] of Object.entries(attrs)) {
    if (el.getAttribute(key) === value)
      score++;
  }

  return score / total;
}

// Calculate parent similarity
function parentSimilarity(el, signature) {
  const fp = fingerprint(el.parentElement);
  return fp === signature.parentFingerprint ? 1 : 0;
}

// Calcolate score for fuzzy matching
function elementScore(el, signature) {
  let score = 0;

  // tag
  if (el.tagName.toLowerCase() === signature.tag) {
    score += 30;
  }

  // text
  score += textSimilarity(el.innerText ?? "", signature.text ?? "") * 30;

  // attributes
  score += attributeSimilarity(el, signature) * 20;

  // parent
  score += parentSimilarity(el, signature) * 10;

  // relative position
  const index = [...el.parentElement.children].filter(e => e.tagName === el.tagName).indexOf(el);

  if (index === signature.siblingIndex) {
    score += 10;
  }

  return score;
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

// Return the best match, given the element signature
function findElementFuzzy(data, thr = 70) {
  const candidates = [...document.querySelectorAll(data.tag)];

  let best = null;
  let bestScore = 0;

  for (const el of candidates) {
    const score = elementScore(el, data);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  // Min threashold
  if (bestScore < thr) {
    return null;
  }

  return best;
}

