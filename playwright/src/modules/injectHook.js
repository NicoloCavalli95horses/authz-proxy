// This function is injected in the visited webpage
export async function injectHook() {
  await bootstrap();

  async function bootstrap() {
    // Do not inject two times
    if (window.__pageMonitorInstalled) { return; }
    window.__pageMonitorInstalled = true;
    window.__normalizeGUI = installGUINormalizer;

    if (document.readyState === "loading") {
      window.addEventListener("load", installAll);
    } else {
      await installAll();
    }
  }

  async function installAll() {
    await installButton();
    installClickListener();
    installGUINormalizer();
  }

  function installGUINormalizer() {
    // disableAnimations();
    // hideIframes();
  }

  function getTargetInfo(e) {
    const target = e.target;
    const tag = target.tagName;
    const id = target.id;
    const classes = [...target.classList];
    const attributes = Object.fromEntries([...target.attributes].map(attr => [attr.name, attr.value]));
    const text = target.innerText?.slice(0, 200);
    const position = { x: e.clientX, y: e.clientY };
    const r = target.getBoundingClientRect();
    const rect = { x: r.x, y: r.y, width: r.width, height: r.height };

    return { tag, id, classes, attributes, text, position, rect };
  }

  function hideIframes() {
    document.querySelectorAll("iframe").forEach(iframe => {
      iframe.style.background = "white";
      iframe.style.visibility = "hidden";
    });
  }

  function disableAnimations() {
    if (document.getElementById("__screenshot_normalizer")) { return; }

    const style = document.createElement("style");

    style.id = "__screenshot_normalizer";

    style.textContent = `
        *,
        *::before,
        *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
            scroll-behavior: auto !important;
        }
    `;

    document.head.appendChild(style);
  }

  function updateBtnLabel(state) {
    switch (state) {
      case "idle":
        return "click to record";

      case "record":
        return "recording ⏺️";

      case "replay":
        return "replaying ▶️";

      default:
        return "click to record";
    }
  }

  function canEmitClick(e) {
    return !e.target.closest("#__playwright_debug") && typeof window._emitClickEvent === "function";
  }

  async function installButton() {
    if (document.getElementById("__playwright_debug")) { return; }

    const btn = document.createElement("button");
    btn.id = "__playwright_debug";

    let state = "idle";

    if (typeof window._getState === "function") {
      state = await window._getState();
    }

    btn.dataset.state = state ?? "idle";
    btn.innerText = updateBtnLabel(btn.dataset.state);

    btn.style.cssText = `
        position: fixed;
        bottom: 0px;
        right: 0px;
        width: auto;
        z-index: 99999;
        background: #000;
        color: white;
        cursor:pointer;
    `;

    btn.onclick = async () => {
      if (typeof window._toggleState === "function") {
        const state = await window._toggleState();
        btn.dataset.state = state;
        btn.innerText = updateBtnLabel(btn.dataset.state);
      }
    };

    document.body.appendChild(btn);
  }

  function installClickListener() {
    document.addEventListener("click", e => {
      if (canEmitClick(e)) {
        window._emitClickEvent({ data: getTargetInfo(e) });
      }
    }, true);
  }
}