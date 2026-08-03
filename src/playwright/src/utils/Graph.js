// Graph.js
// This class constructs and handle a graph of the web GUI

//===================
// Import
//===================



//===================
// Class
//===================

/*
Each node represents a reachable GUI state.
The initial node (S0) corresponds to the initial page state.
Subsequent nodes represent the GUI after an interaction.

node: {
  id: "S0"
  dom: {
    clickableEls: [{...},{...}], // buttons, radio, checkboxes, etc
    snapshot: {},                // entire DOM available in that state
    hash: "",                    // to compare different states/nodes
  },
  url: "",                       // URL of the current state
  explored: false,               // true at the end of the exploration. Prevents re-exploring the same node
  visited: false,                // true while exploring, false at the end
  parent: ""                     // previous state id (undefined for the first node)
  path: []                       // previous actions to get to this state
}

Each edge is an interaction with the GUI (eg. click).
It includes also the observed effect (eg. URL change, HTTP request)

edge: {
  from: "S0"
  to: "S1"
  action: {
    type: "click",
    tag,
    textContent,
    id,
    classes,
    selector,
    reasons,
    network: {
      requests: [],
      responses: []
    },
  },
}  
*/

export class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.counter = 0;
    this.hashes = new Map();
  }

  addNode(data = {}) {
    const hash = data.dom?.hash;

    if (hash && this.hashes.has(hash)) {
      return this.getNodeByHash(hash);
    }

    const id = `S${this.counter++}`;
    this.nodes.set(id, { id, ...data });

    if (hash) {
      this.hashes.set(hash, id); // update hashes map
    }

    return this.getNodeById(id);
  }

  addEdge(from, to, action) {
    if (!this.nodes.has(from)) {
      throw new Error(`[Graph] Unknown node '${from}'`);
    }

    if (!this.nodes.has(to)) {
      throw new Error(`[Graph] Unknown node '${to}'`);
    }

    if (!action?.type) {
      throw new Error("[Graph] Edge requires an action type");
    }

    this.edges.push({ from, to, action });
  }

  getEdge(from) {
    return this.edges.filter(e => e.from === from);
  }

  getNodeById(id) {
    return this.nodes.get(id);
  }

  getNodeByHash(hash) {
    const id = this.hashes.get(hash);
    return id ? this.nodes.get(id) : undefined;
  }
}