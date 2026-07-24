// ===========
// Import
// ===========
import { log } from "../utils/utils.js";


// ===========
// Class
// ===========
export class PageMonitor {
  constructor() {
    this.counter = 0;
    this.pages = new WeakSet();
    this.enabled = false;
  }



  async attach(page) {
    if (page.isClosed()) {
      log("Cannot attach: page already closed");
      return;
    }
    this.pages.add(page);
    log("Attaching monitor to:", page.url());

    page.on("close", () => {
      log("Page closed");
      this.pages.delete(page);
    });

    page.on("crash", () => {
      log("Page crashed");
      this.pages.delete(page);
    });


    try {
      if (page.__monitorAttached) { return; }
      page.__monitorAttached = true;

      await page.exposeFunction("_emitEvent", async (e) => {
        log("Click event:", e);
        this.counter++;
        // await page.screenshot({ path: `./screenshots/screenshot${this.counter}.png` });
        // this can be used to reconstruct the user flow and create a AuthZ test
      });

      await page.exposeFunction("_emitReplay", async (e) => {
        log("Replaying actions...");
        // await page.mouse.click(x,y);
      });


    } catch (err) {
      log("Expose failed:", err.message);
      return;
    }


    await this.attachOnFrameNavigated(page);
    await this.safeEvaluate(page, PageMonitor.injectHook);
  }



  attachOnFrameNavigated(page) {
    page.on("framenavigated", async (frame) => {
      if (page.isClosed()) { return; }

      try {
        if (frame === page.mainFrame()) {
          log("Navigation:", frame.url());
          await this.safeEvaluate(page, PageMonitor.injectHook);
        }

      } catch (err) {
        log("Navigation handler failed:", err.message);
      }
    });
  }



  async safeEvaluate(page, fn) {
    if (!page || page.isClosed()) {
      return false;
    }

    try {
      await page.evaluate(fn);
      return true;
    } catch (err) {
      log("Page unavailable:", err.message);
      return false;
    }

    throw err;
  }



  static injectHook() {
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

    function addDebugButton() {
      if (document.getElementById("__playwright_debug")) { return; }

      const btn = document.createElement("button");
      btn.id = "__playwright_debug";
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
      btn.innerText = "record";

      btn.onclick = () => {
        if (typeof window._emitReplay !== "function") {
          return;
        }
        window._emitReplay({ type: "replay", data:{}});
        btn.innerText = btn.innerText == "record" ? "replay" : "record";
      };

      document.body.appendChild(btn);
    }

    // Do not inject two times
    if (window.__pageMonitorInstalled) {
      return;
    }
    window.__pageMonitorInstalled = true;

    document.addEventListener("click", e => {
      if (typeof window._emitEvent !== "function") {
        return;
      }

      const data = getTargetInfo(e); // this cannot be a method of PageMonitor, which does not exist in this context
      window._emitEvent({ type: "click", data });
    }, true);

    // Debug button
    window.addEventListener("load", addDebugButton);
  }
}