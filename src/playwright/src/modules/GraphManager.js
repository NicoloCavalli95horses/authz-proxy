// GraphManager.js
// A layer between the Graph() class and the analysis modules

//===================
// Import
//===================
import { config } from "../config.js";
import { Graph } from "../utils/Graph.js";
import { log } from "../utils/utils.js";
import crypto from "node:crypto";

//===================
// Class
//===================
export class GraphManager extends Graph {
  constructor(page) {
    super()
    this.page = page;
  }



  async addNode(overrides = {}) {
    let data = {
      visiting: false,  // true at the beginning of the exploration and false at the end of the exploration
      explored: false,  // true at the end of the exploration (eg clicked everywhere)
      parent: null,     // assigned during exploration
      path: []          // previous actions to get to this state
    };

    if (overrides.dom === undefined) {
      Object.assign(data, await this.getState());
    }

    Object.assign(data, overrides);
    return super.addNode(data);
  }



  async safeGetDataFromBrowser(retries = 3) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await this.getDataFromBrowser();
      } catch (error) {
        lastError = error;
        const retryable = error.message.includes("Execution context was destroyed") || error.message.includes("Cannot read properties");

        if (!retryable) { throw error; }

        log(`[getDataFromBrowser] Retry ${i + 1}/${retries}`);
        await this.page.waitForLoadState("domcontentloaded").catch(() => { });
        await this.page.waitForTimeout(500);
      }
    }

    throw lastError;
  }



  async getDataFromBrowser() {
    return await this.page.evaluate((ignoreObj) => {
      // Get clickable elements using injected DOM functions
      const clickableEls = window.__instrumentation__.DOMutils.extractClickableElements(ignoreObj);

      // DOM snapshot
      const doc = document.body.cloneNode(true);
      doc.querySelector('#__playwright_debug').remove();

      const KEEP_DOM_EL = "h1, h2, h3, p, button, a, input, select, textarea";
      const KEEP_ATTRIBUTES = ["href", "type", "name", "value", "role", "aria-label", "placeholder"];
      const elements = doc.querySelectorAll(KEEP_DOM_EL);

      const snapshot = [...elements].map(el => {
        const attrs = [...el.attributes].filter(a => KEEP_ATTRIBUTES.includes(a.name)).map(a => `${a.name}=${a.value}`).sort().join("|");
        return `${el.tagName}|${attrs}|${el.textContent.replace(/\s+/g, " ").trim()}`;
      }).join("\n");

      return { snapshot, clickableEls };
    }, config.ignoreDOMarea);
  }



  // used to preview current DOM state without adding it to the graph
  async getState() {
    const { snapshot, clickableEls } = await this.safeGetDataFromBrowser();
    return {
      url: this.page.url(),
      dom: {
        snapshot,
        clickableEls,
        hash: this.getStateHash(snapshot),
      },
    }
  }



  // Two pages are considered identical if share the normalized DOM
  getStateHash(dom) {
    return crypto.createHash("sha256").update(JSON.stringify(dom)).digest("hex");
  }
}