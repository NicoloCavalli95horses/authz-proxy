// findClickableElements.js
// finds and returns clickable DOM elements (candidates)

export function findClickableDOMEl() {

  // Create unique selector based on relations with parent and sibling tags
  // We do not consider classes or attributes because these identifiers may not be stable
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
      let index = 1;
      let sib = el;

      while (sib = sib.previousElementSibling) {
        if (sib.tagName === el.tagName) {
          index++;
        }
      }

      parts.unshift(`${tag}:nth-of-type(${index})`);
      el = el.parentElement;
    }

    return parts.join(" > ");
  }

  // Remove possible existing highlight
  document.querySelectorAll("._redRect").forEach(el => {
    el.classList.remove("_redRect");
    el.removeAttribute("data-clickable-reason");
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
      el.dataset.clickableReason = reasons.join(",");
      clickable.push({
        type: "click",
        tag,
        textContent: el.innerText?.trim().slice(0, 80),
        id: el.id,
        classes: el.className,
        attributes: el.getAttributeNames(),
        selector: getUniqueSelector(el),
        reasons
      });
    }

  }

  console.log(clickable);
  return clickable;
}