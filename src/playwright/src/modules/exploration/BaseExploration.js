
//===================
// Import
//===================
import { config } from "../../config.js";
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
        navigations: [] // routes or path modifications (e.g., history.pushState), often handled client-side in SPAs
      }
    };
    this.pendingRequests = new Set(); // used to wait for network idle
    this.lastActivity = Date.now();
    this.unsubscribe = undefined;
    this.context = context;

    this.requestIds = new Map(); // used to map HTTP req/res at DB level
  }



  // Listen to network events
  async init() {
    // Listen to HTTP events
    this.page.on("request", this.requestHandler);
    this.page.on("response", this.responseHandler);
    this.page.on("requestfailed", this.requestFailedHandler);

    // Listen to page events
    this.unsubscribe = this.eventBus.subscribe(event => this.handleEvent(event));
  }



  // Use arrow function to preserve the value of `this`, used in `this.page.on("request", this.requestHandler)`
  requestHandler = (req) => {
    if (!this.currentTransition?.data) { return; }

    const id = crypto.randomUUID();
    const requestData = {
      id,
      method: req.method(),
      url: req.url(),
      headers: req.headers(),
      body: null
    };

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
    this.requestIds.set(req, id);

    this.pendingRequests.add(req);
    this.lastActivity = Date.now();
  };



  responseHandler = async (res) => {
    if (!this.currentTransition?.data) { return; }

    const request = res.request();
    const requestId = this.requestIds.get(request);

    if (!requestId) {
      log("[BaseExploration][NETWORK] Response without tracked request", { url: res.url(), status: res.status(), method: request.method() });
      return;
    };

    const contentType = (res.headers()["content-type"] || "").split(";")[0].trim().toLowerCase();

    const hasBody =
      contentType.startsWith("text/") ||
      contentType === "application/json" ||
      contentType.endsWith("+json") ||
      contentType === "application/javascript" ||
      contentType === "application/xml" ||
      contentType.endsWith("+xml");

    const responseData = {
      requestId: requestId || null,
      status: res.status(),
      url: res.url(),
      headers: res.headers(),
      body: null
    };


    if (hasBody) {
      try {
        // normalize for DB (no JSON)
        responseData.body = await res.text();
      } catch {
        responseData.body = null;
      }
    }

    this.currentTransition.network.responses.push(responseData);
    this.pendingRequests.delete(request);
    this.lastActivity = Date.now();
  };

  requestFailedHandler = (req) => {
    if (!this.currentTransition?.data) { return; }
    this.pendingRequests.delete(req);
    this.lastActivity = Date.now();
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
    if (!this.currentTransition?.data) { return; }

    this.currentTransition.network.navigations.push(event);
    this.lastActivity = Date.now();
  }



  // Hook
  handleClick(event) { }



  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.page.off("request", this.requestHandler);
    this.page.off("response", this.responseHandler);
    this.page.off("requestfailed", this.requestFailedHandler);
  }



  async safePageEvaluate(fn, args, retries = 3, delay = 300) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.page.evaluate(fn, args);
      } catch (err) {
        log(`[safePageEvaluate] Retry ${i + 1}/${retries}`, err.message);

        if (i < retries - 1) {
          await this.page.waitForTimeout(delay);
        }
      }
    }

    return null;
  }



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
    try {
      await this.page.evaluate(({ timeout, quietPeriod }) => {
        return new Promise(resolve => {
          if (!document.body) {
            resolve();
            return;
          }

          let quietTimer;

          const observer = new MutationObserver(() => {
            clearTimeout(quietTimer);

            quietTimer = setTimeout(() => {
              observer.disconnect();
              resolve();
            }, quietPeriod);
          });

          observer.observe(document.body, { childList: true, subtree: true, attributes: true });

          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, timeout);
        });
      }, { timeout, quietPeriod });

    } catch (err) {
      if (err.message.includes("Execution context was destroyed")) {
        log("[BaseExploration][waitForDOMStable] Navigation detected, skipping");
        return;
      }

      throw err;
    }
  }



  async waitForPageReady() {
    await this.page.waitForLoadState("domcontentloaded");
    await this.waitForDOMStable();
  }



  // Reset global variables
  resetTransition(data = {}) {
    this.pendingRequests.clear();
    this.lastActivity = Date.now();

    this.currentTransition = {
      ...data,
      network: {
        requests: [],
        responses: [],
        navigations: []
      }
    };
  }



  async evaluateTransition(el) {
    this.resetTransition(el);

    try {
      const success = await this.findAndClick(el.data);
      if (!success) { return; }

      return {
        ...this.currentTransition,
        network: {
          ...this.currentTransition.network,
          requests: [...this.currentTransition.network.requests],
          responses: [...this.currentTransition.network.responses],
          navigations: [...this.currentTransition.network.navigations]
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

      await this.safeClick(element);
      log("[BaseExploration] Clicked on element", data);

      await this.waitForIdle();
      await this.waitForDOMStable();
      return true;
    } catch (err) {
      log("[Analysis] Error, element not clickable", data, err);
      return false;
    }
  }



  async safeClick(element) {
    const timeout = config.clickTimeout / 2;
    try {
      await element.click({ timeout });
    } catch (err) {
      log("[BaseExploration] Normal click failed:", err.message);
      await element.click({ timeout, force: true });
    }
  }



  // Finds a DOM element and retries till timeout
  async findElement(data, timeout = 2000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const handle = await this.page.evaluateHandle((data) => {
        const result = window.__instrumentation__.DOMutils.findElement(data);
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
    try {
      // networkidle is risky because we may never idle
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (err) {
      log("[BaseExploration] Error while going to initial state", err.message);
    }

    await this.waitForDOMStable();
  }
}