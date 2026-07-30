//===================
// Import
//===================



//===================
// Class
//===================
export class Graph {
  constructor() { }

  createGraph() {
    return {
      nodes: {},
      edges: {}
    }
  }

  addNode({ graph, id, data = {} }) {
    graph.nodes[id] = { id, ...graph.nodes[id], ...data };
  }

  /**
   * 
   * @param graph a graph object 
   * @param fromId id of first node (parent || reference node)
   * @param toId id of second node (child || sibling)
   * @param type type of relation (child, render) 
   * @param siblingIdx index of sibling (first sibling has 0) 
   */
  addEdge({ graph, fromId, toId, type, siblingMeta }) {
    // Init nodes
    if (!graph.nodes[fromId]) { graph.nodes[fromId] = {}; }
    if (toId && !graph.nodes[toId]) { graph.nodes[toId] = {}; }
    if (!graph.edges[fromId]) { graph.edges[fromId] = {}; }
    if (toId && !graph.edges[toId]) { graph.edges[toId] = {}; }

    // if (type === "child" && toId) {
    //   if (!graph.edges[fromId].child) {
    //     graph.edges[fromId].child = toId;
    //   }
    //   if (!graph.edges[toId].parent) {
    //     graph.edges[toId].parent = fromId;
    //     graph.nodes[toId].parent = fromId;
    //   }
    // }

    // if (type === "sibling") {
    //   if (toId && !graph.edges[fromId].nextSibling) {
    //     graph.edges[fromId].nextSibling = toId;
    //   }
    //   if (toId && !graph.edges[toId].prevSibling) {
    //     graph.edges[toId].prevSibling = fromId;
    //   }
    //   graph.edges[fromId].siblingMeta = siblingMeta;
    // }
  }

  // Direct access to node: 0(1) complexity
  getNode({ graph, id }) {
    if (graph && id) {
      return graph.nodes.hasOwnProperty(id) ? graph.nodes[id] : undefined;
    };
  }
}