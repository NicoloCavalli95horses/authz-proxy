// navigationGuard.js
// These functions are injected in the visited webpage

// ===========
// Import
// ===========
import { config } from "../config";


// ===========
// Functions
// ===========
export function injectNavigationGuard() {
  window.__instrumentation__ ??= {};

  if (!window.__instrumentation__.installNavigationGuard) {
    installNavigationGuard();
  }
  window.__instrumentation__.installNavigationGuard = true;
}


export function installNavigationGuard() {
  //-------------------------
  // <a href=""> 
  //-------------------------
  document.addEventListener("click", e => {
    const link = e.target.closest("a");

    if (link && link.href) {
      window._dispatchEvent({
        type: "NAVIGATION_ATTEMPT",
        source: "anchor",
        from: window.location.href,
        to: link.href
      });

      if (config.enableNavigationGuard) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  //-------------------------
  // Default form submit
  //-------------------------
  document.addEventListener("submit", e => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) { return; }

    const submitter = e.submitter;
    const method = (submitter?.formMethod || form.method || "GET").toUpperCase();
    const to = submitter?.formAction || form.action || window.location.href;

    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "form",
      method,
      from: window.location.href,
      to,
    });

    if (config.enableNavigationGuard) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);


  //-------------------------
  // form.submit() 
  //-------------------------
  const originalSubmit = HTMLFormElement.prototype.submit;

  HTMLFormElement.prototype.submit = function () {
    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "form.submit",
      method: (this.method || "GET").toUpperCase(),
      from: window.location.href,
      to: this.action || window.location.href
    });

    if (config.enableNavigationGuard) { return; }
    return originalSubmit.call(this);
  };

  //-------------------------
  // window.history.pushState 
  //-------------------------
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function (state, title, url) {
    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "pushState",
      from: window.location.href,
      to: url ? new URL(url, window.location.href).href : window.location.href
    });

    if (config.enableNavigationGuard) { return }

    return originalPushState.call(this, state, title, url);
  };

  window.history.replaceState = function (state, title, url) {
    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "replaceState",
      from: window.location.href,
      to: url ? new URL(url, window.location.href).href : window.location.href
    });

    if (config.enableNavigationGuard) { return; }

    return originalReplaceState.call(this, state, title, url);
  };

  //-------------------------
  // assign() and replace()
  //-------------------------
  const originalAssign = Location.prototype.assign;
  const originalReplace = Location.prototype.replace;

  Location.prototype.assign = function (url) {
    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "location.assign",
      from: window.location.href,
      to: new URL(url, window.location.href).href
    });

    if (config.enableNavigationGuard) { return; }

    return originalAssign.call(this, url);
  };

  Location.prototype.replace = function (url) {
    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "location.replace",
      from: window.location.href,
      to: new URL(url, window.location.href).href
    });

    if (config.enableNavigationGuard) { return; }

    return originalReplace.call(this, url);
  };

  //-------------------------
  // window.open
  //-------------------------
  const originalOpen = window.open;

  window.open = function (...args) {
    window._dispatchEvent({
      type: "NAVIGATION_ATTEMPT",
      source: "window.open",
      from: window.location.href,
      to: args[0] ? new URL(args[0], window.location.href).href : null
    });

    if (config.enableNavigationGuard) { return null; }

    return originalOpen.apply(this, args);
  };
}