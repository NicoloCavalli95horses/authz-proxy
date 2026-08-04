
// HTMLmarker.js
// These functions are injected in the visited webpage


// ===========
// Const
// =========== 
const RUNTIME_MARK = Symbol("runtimeMarked"); // symbols are not cloned


// ===========
// Functions
// ===========
export function injectHTMLmarker() {
  window.__instrumentation__ ??= {};

  if (window.__instrumentation__.HTMLmarkerInstalled) {
    return;
  }
  window.__instrumentation__.HTMLmarkerInstalled = true;
  window.__instrumentation__.HTMLmarker = { counter: 0 };

  initializeCounter(); // make sure counter starts from the highest number found in the DOM
  disableCSSAnimations();
  installDOMHooks();
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


function installDOMHooks() {
  // createElement
  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function (...args) {
    const el = originalCreateElement.apply(this, args);
    markElement(el);
    return el;
  };

  // createElementNS (for svg)
  const originalCreateElementNS = Document.prototype.createElementNS;
  Document.prototype.createElementNS = function (...args) {
    const el = originalCreateElementNS.apply(this, args);
    markElement(el);
    return el;
  };

  // appendChild
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (child) {
    markTree(child);
    return originalAppendChild.call(this, child);
  };

  // insertBefore
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, ref) {
    markTree(newNode);
    return originalInsertBefore.call(this, newNode, ref);
  };

  // replaceChild
  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function (newNode, oldNode) {
    markTree(newNode);
    return originalReplaceChild.call(this, newNode, oldNode);
  };

  // innerHTML
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  if (descriptor) {
    Object.defineProperty(Element.prototype, "innerHTML", {
      set(value) {
        descriptor.set.call(this, value);

        for (const child of this.children) {
          markTree(child);
        }
      },
      get() {
        return descriptor.get.call(this);
      }
    });
  }

  // cloneNode
  const originalCloneNode = Node.prototype.cloneNode;
  Node.prototype.cloneNode = function (deep) {
    const clone = originalCloneNode.call(this, deep);

    if (deep) {
      markTree(clone);
    } else {
      markElement(clone);
    }

    return clone;
  };

  installDOMObserver()
}


function initializeCounter() {
  const elements = document.querySelectorAll("[data-mitm-id]"); // works even on empty document, no need to wait for DOM load

  for (const el of elements) {
    const id = Number(el.dataset.mitmId);
    if (!Number.isNaN(id)) {
      window.__instrumentation__.HTMLmarker.counter = Math.max(window.__instrumentation__.HTMLmarker.counter, id + 1);
    }
  }
}

function installDOMObserver() {
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        markTree(node);
      }
    }
  });

  observer.observe(document, { childList: true, subtree: true });
}

function markElement(el) {
  if (!(el instanceof Element)) { return; }

  // already processed
  if (el[RUNTIME_MARK]) { return; }

  el.dataset.mitmId = String(window.__instrumentation__.HTMLmarker.counter++);

  // The following internal property cannot be cloned with cloneNode()
  // This prevents duplicate attributes on cloned nodes
  el[RUNTIME_MARK] = true;
}

function markTree(node) {
  if (!(node instanceof Element)) {
    return;
  }

  markElement(node);

  for (const child of node.children) {
    markTree(child);
  }
}
