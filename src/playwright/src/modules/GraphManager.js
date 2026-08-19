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
      doc.querySelectorAll("script, style, meta, link").forEach(el => el.remove());
      const snapshot = doc.outerHTML;

      // Textual content
      const TEXT_SELECTORS = ["h1", "h2", "h3", "p", "label", "button"];

      const innerText = Array.from(doc.querySelectorAll(TEXT_SELECTORS.join(",")))
        .map(el => el.innerText.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");

      return { snapshot, clickableEls, innerText };
    }, config.ignoreDOMarea);
  }



  // used to preview current DOM state without adding it to the graph
  async getState() {
    const { snapshot, clickableEls, innerText } = await this.safeGetDataFromBrowser();
    return {
      url: this.page.url(),
      dom: {
        snapshot,
        clickableEls,
        innerText,
        hash: this.getStateHash(clickableEls, innerText),
      },
    }
  }



  // Two pages are considered identical if share these two variables
  // > the fingerprint of all the available clickable elements (this carries information about parent/sibling DOM nodes)
  // > all the available textual content
  getStateHash(els, txt) {
    const fingerprints = els.map(el => el.fingerprint).sort();
    const stateRepresentation = { fingerprints, txt };
    return crypto.createHash("sha256").update(JSON.stringify(stateRepresentation)).digest("hex");
  }
}