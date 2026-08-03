// navigationGuard.js
// These functions are injected in the visited webpage

// ===========
// Import
// ===========


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
      window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", from: "anchor", to: link.href });
      // blocking event propagation prevents the navigation
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  //-------------------------
  // Default form submit
  //-------------------------
  document.addEventListener("submit", e => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) { return; }

    window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", from: "form", action: form.action, method: form.method || "GET" });
    e.preventDefault();
    e.stopPropagation();
  }, true);


  //-------------------------
  // form.submit() 
  //-------------------------
  const originalSubmit = HTMLFormElement.prototype.submit;

  HTMLFormElement.prototype.submit = function () {
    window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", source: "form.submit", action: this.action, method: this.method });
    return;
  };

  //-------------------------
  // window.history.pushState 
  //-------------------------
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function (state, title, url) {
    window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", from: "pushState", to: url });
    // block the navigation
    return
  };

  window.history.replaceState = function (state, title, url) {
    window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", from: "replaceState", to: url });
    // block the navigation
    return
  };

  //-------------------------
  // assign() and replace()
  //-------------------------
  const originalAssign = Location.prototype.assign;
  const originalReplace = Location.prototype.replace;

  Location.prototype.assign = function (url) {
    window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", source: "location.assign", to: url });
    return;
  };

  Location.prototype.replace = function (url) {
    window._dispatchEvent({ type: "NAVIGATION_ATTEMPT", source: "location.replace", to: url });
    return;
  };
}