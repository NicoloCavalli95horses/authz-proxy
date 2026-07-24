// ===========
// Import
// ===========
import { cleanScreenshots, log } from "../utils/utils.js";
import { injectHook } from "./injectHook.js";

// ===========
// Class
// ===========
export class PageMonitor {
  constructor() {
    this.counter = 0;
    this.pages = new WeakSet();
    this.state = "idle";

    this.storage = {
      initialURL: "",
      coordinates: [],
    };
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

      await page.exposeFunction("_emitClickEvent", (e) => this.onClick(page, e));

      // used by injectHook to sync the state of the button on new pages
      await page.exposeFunction("_toggleState", () => this.onToggleState(page));
      await page.exposeFunction("_getState", () => this.state);

    } catch (err) {
      log("Expose failed:", err.message);
      return;
    }

    this.attachOnFrameNavigated(page);
    await this.safeEvaluate(page, injectHook);
  }

  attachOnFrameNavigated(page) {
    page.on("framenavigated", async (frame) => {
      if (page.isClosed()) { return; }

      try {
        if (frame === page.mainFrame()) {
          log("Navigation:", frame.url());
          await this.safeEvaluate(page, injectHook);
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

  async onToggleState(page) {
    log("state change request. Current state is", this.state);

    switch (this.state) {
      case "idle":
        this.state = "record";
        await this.startRecording(page);
        break;

      case "record":
        this.state = "replay";
        await this.startReplay(page);
        break;

      case "replay":
        this.state = "done";
        this.closeSession();
        break;
    }

    log("State update", this.state);
    return this.state;
  }

  async onClick(page, event) {
    if (event.data.id === "__playwright_debug") { return; } // exclude our button
    log("Click event:", event);


    if (this.state == "record") {
      this.counter++;
      const path = `./screenshots/reference/screenshot_${this.counter}.png`;
      await page.screenshot({ path });
      log('New screenshot at', path);

      this.storage.coordinates.push(event.data.position);
      log("Updated coordinates:", this.storage.coordinates);
    }
  }

  async startRecording(page) {
    await cleanScreenshots();

    this.storage.initialURL = page.url();
    this.storage.coordinates = [];

    log("Recording started");
    log("Saved initial URL:", this.storage.initialURL);

    // do an initial screenshot
    // [TODO] extract screenshots fn 
  }

  async startReplay(page) {
    this.counter = 0;
    log("Replay started");

    // Go to starting page
    await page.goto(this.storage.initialURL, { waitUntil: "networkidle" });

    if (!this.storage.coordinates.length) { return; }

    for (const pos of this.storage.coordinates) {
      this.counter++;
      const path = `./screenshots/target/screenshot_${this.counter}.png`;
      await page.screenshot({ path });
      log('New screenshot at', path);

      await page.mouse.click(pos.x, pos.y);
      log('Clicked at', pos);

      await waitAfterClick(page);
    };
  }

  async waitAfterClick(page) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch { }

    // Wait for two frame updates
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }

  closeSession() {
    log("Done")
  }
}