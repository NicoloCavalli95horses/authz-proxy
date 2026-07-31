// StateManager.js
// This class is a layer between PageMonitor() and StateMachine()
// It instantiates a state machine class and orchestrates the callbacks to be executed for each state

//===================
// Import
//===================
import { StateMachine } from "../utils/StateMachine.js";
import { startAnalysis } from "./Analysis.js";
import { log } from "../utils/utils.js";
import { EventBus } from "../utils/eventBus.js";


//===================
// Class
//===================
export class StateManager {
  constructor() {
    this.stateMachine = new StateMachine();
    this.eventBus = new EventBus();
  }

  init() {
    this.stateMachine.addState("idle", {
      onEnter: () => { },
      onExit: () => { },
    });

    this.stateMachine.addState("analysis", {
      onEnter: startAnalysis,
      onExit: () => { },
    });

    this.stateMachine.setInitialState("idle");
  }


  async handleEvent(page, event) {
    if (event.type === "STATE_CHANGE_REQUEST") {
      return await this.handleStateChangeRequest(page);
    }

    this.eventBus.emit(event);
  }


  async handleStateChangeRequest(page) {
    switch (this.getState()) {
      case "idle":
        await this.stateMachine.transition("analysis", page, this.eventBus);
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