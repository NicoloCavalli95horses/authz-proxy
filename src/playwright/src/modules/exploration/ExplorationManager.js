//===================
// Import
//===================
import { apiStartAnalysis, apiToggleProxyState } from "../../utils/api.js";
import { formatTimeMs, log } from "../../utils/utils.js";
import { GraphManager } from "../GraphManager.js";
import { BaseExploration } from "./BaseExploration.js";


//===================
// Functions
//===================
export async function startExploration(context) {
  const explorator = new ExplorationManager(context);
  await explorator.init();
  await explorator.startAnalysis();
}


class ExplorationManager extends BaseExploration {
  constructor(context) {
    super(context);
    this.initialURL = undefined;
    this.preliminaryActions = context.preliminaryActions || [];
  }



  async startAnalysis() {
    const start = performance.now();

    const graph = new GraphManager(this.page);
    const S0 = await graph.addNode();

    this.initialURL = S0.url;
    log("[Analysis] Saved initial page:", S0.url);

    await this.exploreState({ graph, state: S0, depth: 0, maxDepth: 1 });

    const end = performance.now();
    log(`[Analysis] Exploration done in: ${formatTimeMs(end - start)}`);
  }



  async exploreState({ graph, state, depth, maxDepth }) {
    if (depth >= maxDepth) { return; }
    if (state.explored || state.visiting) { return; }

    state.visiting = true;

    for (const [idx, candidate] of state.dom.clickableEls.entries()) {
      log(`[Analysis][${state.id}] Evaluating element ${idx + 1}/${state.dom.clickableEls.length}`, candidate.data);

      const result = await this.evaluateTransition(candidate);

      if (!result) {
        log("[Analysis] Skipping invalid transition", candidate.data);
        continue;
      }

      const after = await graph.getState();
      const isDOMchanged = !this.isSameState(state, after);
      let nextState;

      if (isDOMchanged) {
        nextState = await graph.addNode({ ...after, parent: state.id, path: [...state.path, candidate.data] });
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
    log('preliminary actions:', this.preliminaryActions);

    await this.goToInitialState(this.initialURL);

    for (const p of [...this.preliminaryActions, ...path]) {
      const success = await this.findAndClick(p);
      if (!success) { return false; }
    }

    await this.waitForIdle();
    return true;
  }



  isSameState(a, b) {
    return (a.dom.hash === b.dom.hash && a.url === b.url);
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