
// HTMLmarker.js
// These functions are injected in the visited webpage

// ===========
// Functions
// ===========
export function injectHTMLmarker() {
  window.__instrumentation__ ??= {};

  if (!window.__instrumentation__.HTMLmarker) {
    window.__instrumentation__.HTMLmarker = { counter: 0 };

    initializeCounter(); // make sure counter starts from the highest number found in the DOM
    installDOMHooks();
  }
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
        markTree(this);
      },

      get() {
        return descriptor.get.call(this);
      }
    });
  }

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

  if (!el.dataset.mitmId) {
    el.dataset.mitmId = String(window.__instrumentation__.HTMLmarker.counter++);
  }
}

function markTree(node) {
  if (!(node instanceof Element)) {
    return;
  }

  for (const child of node.children) {
    markTree(child);
  }
}
