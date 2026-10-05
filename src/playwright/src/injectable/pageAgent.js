// pageAgent.js
// These functions are injected in the visited webpage

// ===========
// Import
// ===========

// ===========
// Const
// ===========
const PAGE_AGENT_SRC = "https://cdn.jsdelivr.net/npm/page-agent@1.12.2/dist/iife/page-agent.demo.js?autoInit=false";
let agent = null;


// ===========
// Functions
// ===========
export async function injectPageAgent() {
  window.__instrumentation__ ??= {};

  if (window.__instrumentation__.pageAgent?.installed) { return; }

  window.__instrumentation__.pageAgent = {
    installed: true,
    execute: executePageAgent,
    reset: () => { agent = null; },
  };

  // DOM available
  if (document.head && !agent) {
    await installPageAgent();
    return;
  }

  // DOM not available yet
  await new Promise((resolve, reject) => {
    const onReady = async () => {
      try {
        await installPageAgent();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    if (document.head && !agent) {
      onReady();
    } else {
      document.addEventListener("readystatechange", onReady, { once: true });
    }
  });
}


async function executePageAgent(prompt, config) {
  if (!agent) {
    await installPageAgent();
    agent = new window.PageAgent(config);
  }

  return await agent.execute(prompt);
}


async function installPageAgent() {
  if (window.PageAgent || agent) { return; }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAGE_AGENT_SRC;
    script.onload = resolve;
    script.onerror = reject;
    (document.head || document.documentElement).appendChild(script);
  });
}