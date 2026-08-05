
//===================
// Import
//===================
import { log } from "../../utils/utils.js";


//===================
// Main
//===================
export class BaseExploration {
  constructor(context) {
    this.page = context.page;
    this.eventBus = context.eventBus;

    this.currentTransition = {
      network: {
        requests: [],
        responses: [],
        navigation: []
      }
    };
    this.pendingRequests = new Set();
    this.lastActivity = Date.now();
    this.unsubscribe = undefined;
  }



  // Listen to network events
  async init() {
    const requestHandler = (req) => {
      if (!this.currentTransition.data) { return; }
      const requestData = { url: req.url(), headers: req.headers(), method: req.method(), resourceType: req.resourceType() };

      if (["POST", "PUT", "PATCH"].includes(req.method())) {
        const body = req.postData();

        if (body) {
          try {
            requestData.body = JSON.parse(body);
          } catch {
            requestData.body = body;
          }
        }
      }

      this.currentTransition.network.requests.push(requestData);

      this.pendingRequests.add(req);
      this.lastActivity = Date.now();
    };

    const responseHandler = (res) => {
      if (!this.currentTransition.data) { return; }
      this.currentTransition.network.responses.push({ url: res.url(), status: res.status() });
      this.pendingRequests.delete(res.request());
      this.lastActivity = Date.now();
    };

    const requestFailedHandler = (req) => {
      this.pendingRequests.delete(req);
      this.lastActivity = Date.now();
    }

    // Listen to HTTP events
    this.page.on("request", requestHandler);
    this.page.on("response", responseHandler);
    this.page.on("requestfailed", requestFailedHandler);

    // Listen to page events
    log('eventbus exist', this.eventBus);
    this.unsubscribe = this.eventBus.subscribe(event => this.handleEvent(event));
  }



  // Handle events from the Document
  handleEvent(event) {
    switch (event.type) {
      case "NAVIGATION_ATTEMPT":
        this.handleNavigationAttempt(event);
        break;

      case "CLICK":
        this.handleClick(event);
        break;
    }
  }



  handleNavigationAttempt(event) {
    if (!this.currentTransition) { return; }

    this.currentTransition.network.navigation.push(event);
    this.lastActivity = Date.now();
  }



  // Hook
  handleClick(event) { }

  

  // Wait for network idle
  async waitForIdle(timeout = 3000, quietPeriod = 500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const noPendingRequests = this.pendingRequests.size === 0;
      const quiet = Date.now() - this.lastActivity > quietPeriod;

      if (noPendingRequests && quiet) {
        return;
      }
      await this.page.waitForTimeout(100);
    }
  }



  // Reset global variables
  resetTransition(candidate = {}) {
    this.pendingRequests.clear();
    this.lastActivity = Date.now();

    this.currentTransition = {
      ...candidate,
      network: {
        requests: [],
        responses: [],
        navigation: []
      }
    };
  }



  async evaluateTransition(candidate) {
    this.resetTransition(candidate);

    try {
      const success = await this.findAndClick(candidate.data);
      if (!success) { return; }

      return {
        ...this.currentTransition,
        network: {
          ...this.currentTransition.network,
          requests: [...this.currentTransition.network.requests],
          responses: [...this.currentTransition.network.responses],
          navigation: [...this.currentTransition.network.navigation]
        }
      };

    } catch (e) {
      log("[Analysis] An error occured during clicking:", e.message);
    }
    finally {
      this.resetTransition();
    }
  }



  async findAndClick(data) {
    const element = this.page.locator(data.selector);

    if (!element) {
      log("[Analysis] Cannot find element", data);
      return false;
    }

    try {
      await element.waitFor("visible", { timeout: 1000 });
      await element.click();
    } catch (err) {
      log("[Analysis] Element not clickable", data, err);
      return false;
    }

    await this.waitForIdle();
    return true;
  }



  async goToInitialState(url) {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    await this.waitForIdle();
  }
}