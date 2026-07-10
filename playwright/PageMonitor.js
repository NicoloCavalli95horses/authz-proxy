export class PageMonitor {

  async attach(page) {
    console.log("Attaching monitor to:", page.url());

    await page.exposeFunction("_emitEvent", e => {
      // this can be used to reconstruct the user flow and create a AuthZ test
      console.log("Click event:", e);
    });

    await page.evaluate(PageMonitor.injectHook);
    await this.attachOnFrameNavigated(page);
  }



  async attachOnFrameNavigated(page) {
    page.on("framenavigated", async (frame) => {
      if (frame === page.mainFrame()) {
        console.log("Navigation:", frame.url());
        await page.evaluate(PageMonitor.injectHook);
      }
    });
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


    if (window.__pageMonitorInstalled) {
      return;
    }
    window.__pageMonitorInstalled = true;

    document.addEventListener("click", e => {
      if (typeof window._emitEvent !== "function") {
        return;
      }

      const data = getTargetInfo(e);
      window._emitEvent({ type: "click", data });
    }, true);
  }
}