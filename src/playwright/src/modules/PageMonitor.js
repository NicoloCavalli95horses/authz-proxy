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
    this.lastTimestamp = 0;
    this.SCREENSHOT_DELAY_MS = 800;
    this.FULL_PAGE_RELOAD_DELAY_MS = 2000;

    this.storage = {
      initialURL: "",
      events: [],
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
    this.busy = true;

    switch (this.state) {
      case "idle":
        this.state = "exploration";
        log(`State update: ${this.state.toUpperCase()}`);
        await this.startExploration(page);
        break;

      case "record":
        this.state = "replay";
        log(`State update: ${this.state.toUpperCase()}`);
        await this.startReplay(page);
        break;

      case "replay":
        await this.closeSession(page);
        this.state = "idle";
        log(`State update: ${this.state.toUpperCase()}`);
        break;
    }

    this.busy = false;
    return this.state;
  }

  async onClick(page, event) {
    if (this.busy) { return; }
    if (this.state !== "record") { return; }

    const now = performance.now();
    const elapsedTime = this.lastTimestamp ? now - this.lastTimestamp : 0;
    this.lastTimestamp = now;

    await page.waitForTimeout(this.SCREENSHOT_DELAY_MS);
    await this.saveScreenshot("reference", page);

    log("Click event:", event);

    this.storage.events.push({ ...event.data, elapsedTime: Math.round(elapsedTime) });
  }

  async startExploration(page) {
    this.storage.initialURL = page.url();
    this.storage.events = [];
    
    log("Exploration started");
    log("Saved initial URL:", this.storage.initialURL);

    const prompt = `
      Find one locked or premium lesson and attempt to access its content using the available user interface.
      If you find a paywall, conclude your exploration and end the task. Avoid analysis and reasoning, prioritize speed over completeness.
      `;

    const results = await page.evaluate(task => {
      return window.__executePageAgent.execute(task);
    }, prompt);

    log('Results from first exploration', results);
  }

  async startReplay(page) {
    this.counter = 0;

    await apiToggleProxyState(true);

    // Go to starting page
    log("Reloading page...")
    await page.goto(this.storage.initialURL, { waitUntil: "domcontentloaded", timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(this.FULL_PAGE_RELOAD_DELAY_MS);

    if (!this.storage.events.length) { return; }
    log("Sequence of events to replay:", this.storage.events);

    await this.saveScreenshot("target", page);

    for (const e of this.storage.events) {
      await page.waitForTimeout(e.elapsedTime);
      log('Replaying event:', e);
      await page.mouse.click(e.position.x, e.position.y);
      await page.waitForTimeout(this.SCREENSHOT_DELAY_MS);
      await this.saveScreenshot("target", page);
    }

    await this.closeSession(page);
  }

  async saveScreenshot(type, page) {
    this.counter++;
    const path = `./screenshots/${type}/screenshot_${this.counter}.png`;
    await page.screenshot({ path });
    log("New screenshot at", path);
  }

  async closeSession(page) {
    await apiToggleProxyState(false);
    await apiStartAnalysis();
    log("Replay done");

    await page.evaluate((state) => {
      window._resetBtnState?.(state);
    }, "idle");
  }
}