// injectHook.js
// This function is injected in the visited webpage

export async function injectHook() {
  await bootstrap();

  async function bootstrap() {
    // Do not inject two times
    if (window.__pageMonitorInstalled) { return; }
    window.__pageMonitorInstalled = true;

    if (document.readyState === "loading") {
      window.addEventListener("load", installAll);
    } else {
      await installAll();
    }
  }

  async function installAll() {
    await installButton();
    installClickListener();
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
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    return { tag, id, classes, attributes, text, position, rect, scrollX, scrollY };
  }

  function resetBtn(state) {
    const btn = document.getElementById("__playwright_debug");
    if (!btn) { return; }

    btn.dataset.state = state;
    btn.innerText = updateBtnLabel(state);
  }

  function updateBtnLabel(state) {
    switch (state) {
      case "idle":
        return "Click to start";

      case "analysis":
        return "Processing page...";

      case "[TODO]":
        return "[TODO]";

      default:
        return "Click to start";
    }
  }

  async function installButton() {
    if (document.getElementById("__playwright_debug")) { return; }
    if (typeof window._getState != "function") { return; }

    const btn = document.createElement("button");
    btn.id = "__playwright_debug";

    const state = await window._getState();
    btn.dataset.state = state;
    btn.innerText = updateBtnLabel(state);

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
      if (typeof window._dispatchEvent === "function") {
        await window._dispatchEvent({ type: "STATE_CHANGE_REQUEST", source: "button" });
        const state = await window._getState();
        btn.dataset.state = state;
        btn.innerText = updateBtnLabel(state);
      }
    };

    document.body.appendChild(btn);
  }

  function installClickListener() {
    document.addEventListener("click", e => {
      const canEmitClick = !e.target.closest("#__playwright_debug") && typeof window._dispatchEvent === "function";
      if (canEmitClick) {
        window._dispatchEvent({ type: "CLICK", data: getTargetInfo(e) });
      }
    }, true);
  }
}