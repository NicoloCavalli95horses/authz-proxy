//===================
// Import
//===================
import { config } from "../../config.js";
import { apiSaveState } from "../../utils/api.js";
import { formatTimeMs, log } from "../../utils/utils.js";
import { GraphManager } from "../GraphManager.js";
import { BaseExploration } from "./BaseExploration.js";


//===================
// Class
//===================
export class ExplorationManager extends BaseExploration {
  constructor(context) {
    super(context);
    this.initialURL = undefined;
    this.preliminaryActions = context.preliminaryActions || [];
    this.graph = undefined;
    this.db = context.db;
    this.currentState = "exploration";
  }



  async startAnalysis() {
    const start = performance.now();

    this.graph = new GraphManager(this.page);
    this.initialURL = this.page.url();

    const S0 = await this.graph.addNode();
    await apiSaveState(this.db[this.currentState].run_id, S0);

    log("[ExplorationManager] Exploration started");
    await this.deepFirstSearch({ graph: this.graph, state: S0, depth: 0, maxDepth: config.maxExplorationDepth });

    const end = performance.now();
    log(`[ExplorationManager] Exploration done in: ${formatTimeMs(end - start)}`);
  }



  async replayExploration() {
    this.currentState = "replay";
    log("[ExplorationManager] Replying exploration...");
    return await this.startAnalysis();
  }



  async deepFirstSearch({ graph, state, depth, maxDepth }) {
    if (depth >= maxDepth) { return; }
    if (state.explored || state.visiting) { return; }

    state.visiting = true;

    for (const [idx, el] of state.dom.clickableEls.entries()) {
      log(`[ExplorationManager][${state.id}] Evaluating element ${idx + 1}/${state.dom.clickableEls.length}`);

      const result = await this.evaluateClickableEl(el);
      if (!result) { log("[ExplorationManager] Skipping invalid transition", el.data); continue; }

      const after = await graph.getState();
      const isDOMchanged = !this.isSameState(state, after);

      let nextState;

      if (isDOMchanged) {
        nextState = await graph.addNode({ ...after, parent: state.id, path: [...state.path, el.data] });
        await apiSaveState(this.db[this.currentState].run_id, nextState);
        log("[ExplorationManager] DOM has changed, saved new state");
      } else {
        nextState = state;
        log("[ExplorationManager] DOM has NOT changed, skipped state");
      }

      graph.addEdge({ from: state.id, to: nextState.id, action: result });

      if (!nextState.explored) {
        await this.deepFirstSearch({ graph, state: nextState, depth: depth + 1, maxDepth });
      }

      log(`[ExplorationManager] Finished exploring ${nextState.id}, restoring ${state.id}`);

      // [Backtracking] Refresh to make sure the next click starts from the same checkpoint
      const success = await this.executePreliminaryActions();
      if (!success) { break; }

      const restored = await this.restoreState(state.path);
      if (!restored) { break; }
    }

    state.visiting = false;
    state.explored = true;
  }



  // Check that the DOM element is not among the element involved in the preliminary actions
  async evaluateClickableEl(el) {
    const isInPreliminary = await this.safePageEvaluate((obj) => {
      if (!window.__instrumentation__?.DOMutils?.fingerprintScore) { return false; }
      return obj.ignoreList.some(ignoreEl => {
        return window.__instrumentation__.DOMutils.fingerprintScore(ignoreEl, obj.el.data) >= 0.95;
      });
    }, { el, ignoreList: this.preliminaryActions });

    if (isInPreliminary) {
      log("[ExplorationManager] Ignoring clickable element because was in preliminary action", el.data);
      return false;
    }

    log("[ExplorationManager] New clickable element is valid");
    return this.evaluateTransition(el);
  }


  async executePreliminaryActions() {
    await this.goToInitialState(this.initialURL); // must go to initial URL in any case
    log("[ExplorationManager] Page refreshed");

    if (!this.preliminaryActions.length) { return true; }

    for (const action of this.preliminaryActions) {
      const success = await this.findAndClick(action);
      if (!success) {
        log("[ExplorationManager] Error, cannot reproduce preliminary actions");
        return false;
      }
    }

    await this.waitForIdle();
    log("[ExplorationManager] Executed all preliminary action");
    return true;
  }


  async restoreState(path) {
    for (const element of path) {
      const success = await this.findAndClick(element);

      if (!success) {
        log("[ExplorationManager] Cannot restore", element);
        return false;
      }
      await this.waitForIdle();
    }

    log("[ExplorationManager] State restored correctly");
    return true
  }



  isSameState(a, b) {
    return (a.dom.hash === b.dom.hash && a.url === b.url);
  }

  async endAnalysis({ dispose } = {}) {
    await this.goToInitialState(this.initialURL);
    this.graph = undefined;
    this.initialURL = undefined;
    
    if (dispose) {
      this.dispose();
      this.preliminaryActions = [];
    }
  }
}