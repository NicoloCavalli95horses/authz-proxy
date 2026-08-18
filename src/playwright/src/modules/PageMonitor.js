// PageMonitor.js
// This monitor coordinates the injected script (injectHook.js) and the Playwright APIs
// It makes use of an istance of StateManager() to handle state changes from the GUI

// ===========
// Import
// ===========
import { config } from "../config.js";
import { log } from "../utils/utils.js";


// ===========
// Class
// ===========
export class PageMonitor {
  constructor(stateManager) {
    this.pages = new WeakSet();
    this.stateManager = stateManager;
  }

  async attach(page) {
    if (page.isClosed()) {
      log("[PageMonitor] Cannot attach: page already closed");
      return;
    }

    try {
      if (page.__monitorAttached) { return; }
      page.__monitorAttached = true;

      await page.exposeFunction("_dispatchEvent", async (event) => {
        return await this.stateManager.handleEvent(event);
      });

      // To sync the button state
      await page.exposeFunction("_getState", async () => {
        return await this.stateManager.getState();
      });

    } catch (err) {
      log("[PageMonitor] Expose failed:", err.message);
      return;
    }

    this.pages.add(page);
    this.stateManager.setPage(page);
    log("[PageMonitor] Attaching monitor to:", page.url());

    if (config.initialPage) {
      await page.goto(config.initialPage);
      log("[PageMonitor] Navigated to initial page:", page.url());
    }

    page.on("close", () => {
      log("[PageMonitor] Page closed");
      this.pages.delete(page);
    });

    page.on("crash", () => {
      log("[PageMonitor] Page crashed");
      this.pages.delete(page);
    });

    page.on("framenavigated", async (frame) => {
      if (page.isClosed()) { return; }

      try {
        if (frame === page.mainFrame()) {
          log("[PageMonitor] Navigation:", frame.url());
        }

      } catch (err) {
        log("[PageMonitor] Navigation handler failed:", err.message);
      }
    });
  }
}