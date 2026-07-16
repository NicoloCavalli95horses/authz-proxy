export class PageMonitor {
  constructor() {
    this.counter = 0;
    this.pages = new WeakSet();
  }



  async attach(page) {
    if (page.isClosed()) {
      console.warn("Cannot attach: page already closed");
      return;
    }
    this.pages.add(page);
    console.log("Attaching monitor to:", page.url());

    page.on("close", () => {
      console.log("Page closed");
      this.pages.delete(page);
    });

    page.on("crash", () => {
      console.log("Page crashed");
      this.pages.delete(page);
    });


    try {
      if (page.__monitorAttached) { return; }
      page.__monitorAttached = true;

      await page.exposeFunction("_emitEvent", async (e) => {
        console.log("Click event:", e);
        this.counter++;
        // await page.screenshot({ path: `./screenshots/screenshot${this.counter}.png` });
        // this can be used to reconstruct the user flow and create a AuthZ test
      });

      await page.exposeFunction("_emitReplay", async (e) => {
        console.log("Replaying actions...");

        // lets just check that the automatic click is not blocked first
        await page.mouse.click(150,336); // fucking works!!
        console.log("Clicked at 150,336");
      });


    } catch (err) {
      console.warn("Expose failed:", err.message);
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
          console.log("Navigation:", frame.url());
          await this.safeEvaluate(page, PageMonitor.injectHook);
        }

      } catch (err) {
        console.warn("Navigation handler failed:", err.message);
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
      console.warn("Page unavailable:", err.message);
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
      btn.innerText = "Replay";

      btn.onclick = () => {
        if (typeof window._emitReplay !== "function") {
          return;
        }
        window._emitReplay({ type: "replay", data:{} });
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