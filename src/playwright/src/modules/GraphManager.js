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
    this.currentNodeId = null;
  }

  async addNode() {
    const { snapshot, clickableEls } = await this.getDataFromBrowser();

    const data = {
      url: this.page.url(),
      dom: {
        snapshot,
        clickableEls,
        hash: this.getDOMhash(snapshot),
      },
      network: {
        requests: [],
        responses: []
      },
      explored: false,
      parent: this.currentNodeId,
    }

    this.currentNodeId = this.graph.addNode(data);
    return this.currentNodeId;
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

  getDOMhash(dom) {
    return crypto.createHash("sha256").update(dom).digest("hex");
  }
}