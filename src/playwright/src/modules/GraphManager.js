// GraphManager.js
// A layer between the Graph() class and the analysis modules

//===================
// Import
//===================
import { Graph } from "../utils/Graph.js";
import { log } from "../utils/utils.js";
import crypto from "node:crypto";

//===================
// Class
//===================
export class GraphManager {
  constructor(page, ignoreList) {
    this.page = page;
    this.graph = new Graph();
    this.ignoreEls = ignoreList;
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

  async getDataFromBrowser() {
    return await this.page.evaluate((ignoreList) => {
      const getValidElements = (currList, ignoreList) => {
        return currList.filter(currEl => {
          const ignored = ignoreList.some(ignoreEl => {
            return window.__instrumentation__.DOMutils.fingerprintScore(ignoreEl, currEl.data) >= 0.95;
          });
          return !ignored;
        });
      };

      // Get clickable elements using injected DOM functions
      const allClickable = window.__instrumentation__.DOMutils.extractClickableElements();
      const clickableEls = getValidElements(allClickable, ignoreList);

      // Get DOM snapshot
      const doc = document.body.cloneNode(true);
      doc.querySelectorAll("script, style, meta, link").forEach(el => el.remove());

      // Remove instrumentation attributes
      doc.querySelectorAll("[data-mitm-id]").forEach(el => el.removeAttribute("data-mitm-id"));
      const snapshot = doc.outerHTML;

      return { snapshot, clickableEls };
    }, this.ignoreEls);
  }

  // used to preview current DOM state without adding it to the graph
  async getState() {
    const { snapshot, clickableEls } = await this.getDataFromBrowser();
    return {
      url: this.page.url(),
      dom: {
        snapshot,
        clickableEls,
        hash: this.getDOMhash(snapshot),
      },
    }
  }

  // from id, to id, action schema see Graph.js
  addEdge({ from, to, action }) {
    return this.graph.addEdge(from, to, action);
  }

  getDOMhash(dom) {
    return crypto.createHash("sha256").update(dom).digest("hex");
  }

  getNodeById(id) {
    return this.graph.getNodeById(id);
  }

  getEdge(id) {
    return this.graph.getEdge(id);
  }
}