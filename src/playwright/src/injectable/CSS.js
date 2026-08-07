
// HTMLmarker.js
// These functions are injected in the visited webpage


// ===========
// Functions
// ===========
export function injectCSS() {
  window.__instrumentation__ ??= {};

  if (window.__instrumentation__.CSSInstalled) {
    return;
  }
  
  window.__instrumentation__.CSSInstalled = true;
  disableCSSAnimations();
}

function disableCSSAnimations() {
  const style = document.createElement("style");

  style.textContent = `
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-delay: 0ms !important;
      transition-duration: 1ms !important;
      transition-delay: 0ms !important;
      scroll-behavior: auto !important;
    }
  `;

  const inject = () => {
    if (document.head) {
      document.head.appendChild(style);
    } else if (document.documentElement) {
      document.documentElement.appendChild(style);
    } else {
      document.addEventListener("readystatechange", inject, { once: true });
    }
  };

  inject();
}
