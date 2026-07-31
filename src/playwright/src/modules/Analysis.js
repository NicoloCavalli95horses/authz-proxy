//===================
// Import
//===================
import { apiStartAnalysis, apiToggleProxyState } from "../utils/api.js";
import { log } from "../utils/utils.js";
import { findClickableDOMEl } from "../utils/findClickableElements.js";
import { GraphManager } from "./GraphManager.js";


//===================
// Functions
//===================

export async function startAnalysis(page, eventBus) {
  const a = new Analysis(page, eventBus);
  await a.init();
  await a.startAnalysis()
}

class Analysis {
  constructor(page, eventBus) {
    this.page = page;
    this.eventBus = eventBus;
    this.unsubscribed = undefined;
    this.currentTransition = {};
    this.pendingRequests = new Set();
    this.lastActivity = Date.now();
  }

  async init() {
    const requestHandler = (req) => {
      if (!this.currentTransition.selector) { return; }
      this.currentTransition.network.requests.push({ url: req.url(), method: req.method(), resourceType: req.resourceType() });
      this.pendingRequests.add(req);
      this.lastActivity = Date.now();
    };

    const responseHandler = (res) => {
      if (!this.currentTransition.selector) { return; }
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

  handleEvent(event) {
    if (event.type === "NAVIGATION_ATTEMPT" && this.currentTransition.selector) {
      log('[Analysis]', event);
      this.currentTransition.network.navigation.push(event);
      this.lastActivity = Date.now();
    }
  }

  async startAnalysis() {
    const graph = new GraphManager(this.page);
    const S0 = await graph.addNode();

    log("[Analysis] exploring page:", S0.url);
    await this.exploreState({ graph, state: S0, depth: 0, maxDepth: 1 });
    log("[Analysis] exploration done");
  }

  async exploreState({ graph, state, depth, maxDepth }) {
    if (depth >= maxDepth) {
      return;
    }

    if (state.explored || state.visiting) {
      return;
    }

    state.visiting = true;

    for (const [idx, el] of state.dom.clickableEls.entries()) {
      log(`[Analysis][${state.id}] Evaluating element ${idx + 1}/${state.dom.clickableEls.length}`, el.selector);

      await this.restoreState(state);
      log("[Analysis] Restored state", state.path);

      const result = await this.evaluateTransition(el);
      const after = await graph.captureState();

      let nextState;

      if (this.isSameState(state, after)) {
        nextState = state;
      } else {
        nextState = await graph.addNode({
          ...after,
          parent: state.id,
          path: [...state.path, el.selector]
        });
      }

      graph.addEdge({ from: state.id, to: nextState.id, action: result });
      await this.exploreState({ graph, state: nextState, depth: depth + 1, maxDepth });
    }

    state.visiting = false;
    state.explored = true;
  }


  async restoreState(state) {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await this.waitForIdle();

    for (const selector of state.path) {
      await this.page.locator(selector).click();
      await this.waitForIdle();
    }
  }

  async evaluateTransition(el) {
    this.resetTransition(el);

    try {
      const locator = this.page.locator(el.selector);
      const count = await locator.count();
      
      if (count === 1) {
        await locator.waitFor({ state: "visible", timeout: 1000 });
        await locator.click();
        log('[Analysis] successfully clicked on:', el.selector);
      } else {
        log('[Analysis] ERROR, multiple DOM elements match the same selector', el.selector);
      }
      

      await this.waitForIdle();

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

  resetTransition(el = {}) {
    this.currentTransition = {
      ...el,
      network: {
        requests: [],
        responses: [],
        navigation: [],
      }
    };
    this.pendingRequests.clear();
    this.lastActivity = Date.now();
  }

  isSameState(a, b) {
    return (a.dom.hash === b.dom.hash && a.url === b.url);
  }

  async waitForIdle(timeout = 3000, quietPeriod = 300) {
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
}


// [TODO]
// export async function startReplay(page) {
//   await apiToggleProxyState(true);

//   // Go to starting page
//   log("Reloading page...")
//   await page.goto(this.storage.initialURL, { waitUntil: "domcontentloaded", timeout: 4000 }).catch(() => null);
//   await page.waitForTimeout(this.FULL_PAGE_RELOAD_DELAY_MS);
//   await this.closeSession(page);
// }

// [TODO]
// export async function closeSession(page) {
//   await apiToggleProxyState(false);
//   await apiStartAnalysis();
//   log("Replay done");

//   await page.evaluate((state) => {
//     window._resetBtnState?.(state);
//   }, "idle");
// }