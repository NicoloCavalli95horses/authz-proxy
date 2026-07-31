// GraphManager.js
// A layer between the Graph() class and the analysis modules

//===================
// Import
//===================
import { findClickableDOMEl } from "../utils/findClickableElements.js";
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
      const { snapshot, clickableEls } = await this.getDataFromBrowser();

      Object.assign(data, {
        url: this.page.url(),
        dom: {
          snapshot,
          clickableEls,
          hash: this.getDOMhash(snapshot)
        }
      });
    }

    Object.assign(data, overrides);
    
    return this.graph.addNode(data);
  }

  setCurrentNodeId(id) {
    this.currentNodeId = id;
  }

  async getDataFromBrowser() {
    return await this.page.evaluate((fn) => {
      // Get clickable elements
      const f = eval(`(${fn})`);
      const clickableEls = f();

      // Get DOM snapshot
      const doc = document.body.cloneNode(true);
      doc.querySelectorAll("script, style, meta, link").forEach(el => el.remove());
      const snapshot = doc.outerHTML;

      return { snapshot, clickableEls };

    }, findClickableDOMEl.toString());
  }

  // used to preview current DOM state without adding it to the graph
  async captureState() {
    const { snapshot, clickableEls } = await this.getDataFromBrowser();
    return {
      url: this.page.url(),
      dom: {
        snapshot,
        clickableEls,
        hash: this.getDOMhash(snapshot),
      }
    }
  }

  addEdge({ from, to, action }) {
    return this.graph.addEdge(from, to, action);
  }

  getDOMhash(dom) {
    return crypto.createHash("sha256").update(dom).digest("hex");
  }
}