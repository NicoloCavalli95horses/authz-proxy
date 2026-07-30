//===================
// Import
//===================
import { StateMachine } from "../utils/StateMachine.js";
import { startAnalysis } from "./Analysis.js";
import { log } from "../utils/utils.js";


//===================
// Class
//===================
export class StateManager {
  constructor() {
    this.stateMachine = new StateMachine();
  }

  init() {
    this.stateMachine.addState("idle", {
      onEnter: () => {},
      onExit: () => {},
      onEvent: async (event, page) => {
        if (event.type == "CLICK") {
          log("[StateManager] Ignoring click in idle");
        }
      }
    });

    this.stateMachine.addState("analysis", {
      onEnter: startAnalysis,
      onExit: () => {},
      onEvent: async (event, page) => {
        if (event.type == "CLICK") {
          log("[StateManager] Click during analysis");
        }
      }
    });

    this.stateMachine.setInitialState("idle");
  }


  async handleEvent(page, event) {
    switch (event.type) {
      case "STATE_CHANGE_REQUEST":
        return await this.handleStateChangeRequest(page);

      default:
        return await this.stateMachine.handleEvent(event, page);
    }
  }


  async handleStateChangeRequest(page) {
    switch (this.getState()) {
      case "idle":
        await this.stateMachine.transition("analysis", page);
        break;

      default:
        log(`[StateManager] No transition available from ${this.getState()}`);
        break;
    }

    return this.getState();
  }


  getState() {
    return this.stateMachine.getState();
  }
}