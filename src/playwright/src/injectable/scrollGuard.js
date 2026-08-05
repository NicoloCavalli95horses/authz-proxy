// preventScroll.js
// These functions are injected in the visited webpage

// ===========
// Functions
// ===========
export function injectScrollGuard() {
  window.__instrumentation__ ??= {};

  if (!window.__instrumentation__.scrollGuard) {
    installScrollGuard();
    window.__instrumentation__.scrollGuard = true;
  }
}

function installScrollGuard() {
  const originalScrollTo = window.scrollTo;
  const originalScrollBy = window.scrollBy;

  const initialX = window.scrollX;
  const initialY = window.scrollY;

  window.scrollTo = function (...args) {
    originalScrollTo.call(window, initialX, initialY);
  };

  window.scrollBy = function (...args) {
    originalScrollTo.call(window, initialX, initialY);
  };

  window.addEventListener("scroll", () => {
    if (window.scrollX !== initialX || window.scrollY !== initialY) {
      originalScrollTo.call(window, initialX, initialY);
    }
  }, { passive: true });



  const originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function () { return; };
}