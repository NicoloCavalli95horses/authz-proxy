// This function is injected in the visited webpage
export async function injectHook() {
  await bootstrap();

  async function bootstrap() {
    // Do not inject two times
    if (window.__pageMonitorInstalled) { return; }
    window.__pageMonitorInstalled = true;

    installClickListener();

    if (document.readyState === "loading") {
      window.addEventListener("load", installButton);
    } else {
      await installButton();
    }
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

  function canEmitClick() {
    return typeof window._emitClickEvent === "function";
  }

  function canToggleState() {
    return typeof window._toggleState === "function";
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
        bottom: 20px;
        left: 20px;
        width: 60px;
        height: 40px;
        z-index: 9999;
        background: #111;
        color: white;
        border-radius:4px;
        cursor:pointer;
    `;

    btn.onclick = async () => {
      if (canToggleState()) {
        const state = await window._toggleState();
        btn.dataset.state = state;
        btn.innerText = updateBtnLabel(btn.dataset.state);
      }
    };

    document.body.appendChild(btn);
  }

  function installClickListener() {
    document.addEventListener("click", e => {
      if (canEmitClick()) {
        window._emitClickEvent({ data: getTargetInfo(e) });
      }
    }, true);
  }
}