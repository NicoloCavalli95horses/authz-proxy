// This function is injected in the visited webpage
export async function injectHook() {
  let agent = null;
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
    
    window._resetBtnState = resetBtn;
    window.__executePageAgent = {
      execute: executePageAgent,
      reset: () => { agent = null; },
    };
  }

  async function executePageAgent(task) {
    if (!agent) {
      agent = new window.PageAgent({ baseURL: "http://localhost:11434/v1", model: "qwen3:14b"});
    }
    return await agent.execute(task);
  }

  async function installAll() {
    installClickListener();
    await installButton();
    await installPageAgent();
  }

  async function installPageAgent() {
    if (window.PageAgent) { return; }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/page-agent@1.12.2/dist/iife/page-agent.demo.js?autoInit=false";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
        return "launch exploration";

      case "exploration":
        return "in progress...";

      case "replay":
        return "replaying ▶️";

      default:
        return "click to record";
    }
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
      const canEmitClick = !e.target.closest("#__playwright_debug") && typeof window._emitClickEvent === "function";
      if (canEmitClick) {
        window._emitClickEvent({ data: getTargetInfo(e) });
      }
    }, true);
  }
}