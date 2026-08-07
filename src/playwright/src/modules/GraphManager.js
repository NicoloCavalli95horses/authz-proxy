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
export class GraphManager {
  constructor(page) {
    this.page = page;
    this.graph = new Graph();
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

    return this.graph.addNode(data);
  }



  async safeGetDataFromBrowser(retries = 3) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await this.getDataFromBrowser();

      } catch (error) {
        lastError = error;

        const retryable =
          error.message.includes("Execution context was destroyed") ||
          error.message.includes("Cannot read properties");

        if (!retryable) {
          throw error;
        }

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
      doc.querySelectorAll("script, style, meta, link").forEach(el => el.remove());
      const snapshot = doc.outerHTML;

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
        hash: this.getStateHash(clickableEls),
      },
    }
  }



  // from id, to id, action schema see Graph.js
  addEdge({ from, to, action }) {
    return this.graph.addEdge(from, to, action);
  }



  // State id is obtained considering the fingerprint of the clickable elements in this state
  // Two pages must have the same id if they share all the clickable elements
  getStateHash(els) {
    const fingerprints = els.map(el => el.fingerprint).sort();
    return crypto.createHash("sha256").update(JSON.stringify(fingerprints)).digest("hex");
  }



  getNodeById(id) {
    return this.graph.getNodeById(id);
  }



  getEdge(id) {
    return this.graph.getEdge(id);
  }
}