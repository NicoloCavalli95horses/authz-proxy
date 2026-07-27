// ===========
// Import
// ===========
import { apiStartAnalysis, apiToggleProxyState } from "../utils/api.js";
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
    this.busy = false;

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
    if (this.busy) { return this.state; }
    log(`State change request. Current state is: "${this.state.toUpperCase()}"`);
    this.busy = true;

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
        await this.closeSession();
        this.state = "idle";
        break;
    }

    this.busy = false;
    log("State update", this.state);
    return this.state;
  }

  async onClick(page, event) {
    if (this.busy) { return; }
    if (this.state !== "record") { return; }

    await this.saveScreenshot("reference", page);

    log("Click event:", event);
    this.storage.coordinates.push(event.data.position);
    log("Updated coordinates:", this.storage.coordinates);
  }

  async startRecording(page) {
    await cleanScreenshots();

    this.storage.initialURL = page.url();
    this.storage.coordinates = [];

    log("Recording started");
    log("Saved initial URL:", this.storage.initialURL);

    await this.saveScreenshot("reference", page);
  }

  async startReplay(page) {
    this.counter = 0;
    log("Replay started");

    await apiToggleProxyState(true);

    // Go to starting page
    await page.reload({ waitUntil: "networkidle", timeout: 8000 });
    await page.goto(this.storage.initialURL, { waitUntil: "networkidle", timeout: 8000 });
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 2000 }).catch(() => null);

    if (!this.storage.coordinates.length) { return; }

    await this.saveScreenshot("target", page);

    for (const pos of this.storage.coordinates) {
      await this.clickAndWait(pos, page);
      await this.saveScreenshot("target", page);
    }

    await this.closeSession();
  }

  async saveScreenshot(type, page) {
    this.counter++;
    const path = `./screenshots/${type}/screenshot_${this.counter}.png`;
    await page.screenshot({ path });
    log("New screenshot at", path);
  }

  async clickAndWait(pos, page) {
    const navigation = page.waitForNavigation({
      waitUntil: "domcontentloaded",
      timeout: 2000
    }).catch(() => null);

    await page.mouse.click(pos.x, pos.y);
    await navigation;

    await this.waitForStableDOM(page);
  }

  // Observe DOM mutation, wait till no mutations are observed or MAX_WAIT
  async waitForStableDOM(page) {
    await page.evaluate(() => {
      return new Promise(resolve => {
        let timer;
        const MAX_WAIT = 5000;

        const timeout = setTimeout(done, MAX_WAIT);

        function done() {
          clearTimeout(timer);
          observer.disconnect();
          resolve();
        }

        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(done, 500);
        });

        observer.observe(document, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        });

        timer = setTimeout(done, 500);
      });
    });
  }

  async closeSession() {
    await apiToggleProxyState(false);
    await apiStartAnalysis();
    log("Replay done");
  }
}