
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
    this.unsubscribe = this.eventBus.subscribe(event => this.handleEvent(event));
  }



  // Handle events from the Document
  handleEvent(event) {
    switch (event.type.toUpperCase()) {
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
  async waitForIdle(timeout = 2500, quietPeriod = 400) {
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



  async waitForDOMStable(timeout = 2000, quietPeriod = 200) {
    await this.page.evaluate(({ timeout, quietPeriod }) => {
      return new Promise(resolve => {
        let quietTimer;
        const observer = new MutationObserver(() => {
          clearTimeout(quietTimer);

          quietTimer = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, quietPeriod);
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        // max timeout
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, timeout);
      });
    }, { timeout, quietPeriod });
  }



  async waitForPageReady() {
    await this.page.waitForLoadState("domcontentloaded");
    await this.waitForDOMStable();
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



  async findAndClick(data, timeout = 2500) {
    try {
      await this.waitForPageReady();
      const element = await this.findElement(data);

      if (!element) {
        log("[Analysis] Error, cannot find element", data);
        return false;
      }

      await this.page.evaluate(() => {
        // Reset scroll
        window.scrollTo(0, 0);

        // Clear active elements
        if (document.activeElement instanceof Element) {
          document.activeElement?.blur();
        }
      });

      await element.click();
      log("[BaseExploration] Clicked on element", data);

      await this.waitForIdle();
      await this.waitForDOMStable();
      return true;
    } catch (err) {
      log("[Analysis] Error, element not clickable", data, err);
      return false;
    }
  }



  // Finds a DOM element and retries till timeout
  async findElement(data, timeout = 2000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const handle = await this.page.evaluateHandle((data) => {
        const result = window.__instrumentation__.DOMutils.findElement(data);
        console.log(result)
        return result.element;
      }, data);

      const element = handle.asElement();

      if (element) {
        return element;
      }

      await handle.dispose();
      await this.page.waitForTimeout(100);
    }

    return null;
  }



  async goToInitialState(url) {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    await this.waitForDOMStable();
  }
}