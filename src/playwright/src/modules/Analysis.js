//===================
// Import
//===================
import { apiStartAnalysis, apiToggleProxyState } from "../utils/api.js";
import { log } from "../utils/utils.js";
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
    this.unsubscribe = undefined;
    this.currentTransition = {};
    this.pendingRequests = new Set();
    this.lastActivity = Date.now();
  }

  async init() {
    const requestHandler = (req) => {
      if (!this.currentTransition) { return; }
      this.currentTransition.network.requests.push({ url: req.url(), method: req.method(), resourceType: req.resourceType() });
      this.pendingRequests.add(req);
      this.lastActivity = Date.now();
    };

    const responseHandler = (res) => {
      if (!this.currentTransition) { return; }
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
    if (event.type === "NAVIGATION_ATTEMPT" && this.currentTransition) {
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

      const result = await this.evaluateTransition(el);
      const after = await graph.captureState();
      const isDOMchanged = !this.isSameState(state, after);

      let nextState;

      if (isDOMchanged) {
        nextState = await graph.addNode({ ...after, parent: state.id, path: [...state.path, el.signature] });
      } else {
        nextState = state;
      }

      graph.addEdge({ from: state.id, to: nextState.id, action: result });

      if (!nextState.explored) {
        await this.exploreState({ graph, state: nextState, depth: depth + 1, maxDepth });
      }

      if (isDOMchanged) {
        // [Backtracking] Refresh page only if DOM changed, to make sure the next click starts from the same 'checkpoint'
        const restored = await this.restoreState(state.path);

        if (restored) {
          log("[Analysis] Restored state", state.path);
        } else {
          log("[Analysis] Cannot restore state, stopping branch");
          break;
        }
      }
    }

    state.visiting = false;
    state.explored = true;
  }


  async restoreState(path) {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await this.waitForIdle();

    for (const signature of path) {
      const success = await this.findAndClick(signature);
      if (!success) {
        return false;
      }
    }

    return true;
  }

  async findAndClick(signature) {
    const element = await this.findDOMElement(signature);

    if (!element) {
      log("[Analysis] Cannot find element", signature);
      return false;
    }

    try {
      await element.waitForElementState("visible", { timeout: 1000 });
      await element.click();
    } catch (err) {
      log("[Analysis] Element not clickable", signature, err);
      return false;
    }

    await this.waitForIdle();
    return true;
  }


  async findDOMElement(signature) {
    const handle = await this.page.evaluateHandle( (signature) => {
      return window.__instrumentation__.DOMutils.findElementFuzzy(signature);
    }, signature);

    const element = handle.asElement();
    return element;
  }

  async evaluateTransition(el) {
    this.resetTransition(el);

    try {
      const clicked = await this.findAndClick(el.signature);
      if (!clicked) { return; }

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

  resetTransition(el = null) {
    this.pendingRequests.clear();
    this.lastActivity = Date.now();

    this.currentTransition = el ?
      {
        ...el,
        network: {
          requests: [],
          responses: [],
          navigation: []
        }
      } : null;
  }

  isSameState(a, b) {
    return (a.dom.hash === b.dom.hash && a.url === b.url);
  }

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
// }