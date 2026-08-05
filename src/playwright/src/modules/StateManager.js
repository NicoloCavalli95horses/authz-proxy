// StateManager.js
// This class is a layer between PageMonitor() and StateMachine()
// It instantiates a state machine class and orchestrates the callbacks to be executed for each state

//===================
// Import
//===================
import { log } from "../utils/utils.js";
import { EventBus } from "../utils/eventBus.js";
import { StateMachine } from "../utils/StateMachine.js";
import { startSetup, endSetup } from "./exploration/PreliminaryActions.js";
import { startExploration } from "./exploration/ExplorationManager.js";


//===================
// Class
//===================
export class StateManager {
  constructor() {
    this.stateMachine = new StateMachine();
    this.eventBus = new EventBus();
    this.context = {
      page: undefined,
      eventBus: this.eventBus,
      preliminaryActions: []
    };
  }

  init() {
    this.stateMachine.addState("idle", {
      onEnter: () => { },
      onExit: () => { },
    });

    this.stateMachine.addState("setup", {
      onEnter: startSetup,
      onExit: () => {
        this.context.preliminaryActions = endSetup();
      }
    });

    this.stateMachine.addState("exploration", {
      onEnter: startExploration,
      onExit: async () => {
        await this.context.page.evaluate(() => {
          window.__instrumentation__.setButtonState("idle");
        });
      },
    });

    this.stateMachine.addState("replay", {
      onEnter: () => { },
      onExit: () => { },
    });

    this.stateMachine.setInitialState("idle");
  }

  setPage(page) {
    this.context.page = page;
  }


  async handleEvent(event) {
    if (event.type === "STATE_CHANGE_REQUEST") {
      return await this.handleStateChangeRequest();
    }

    this.eventBus.emit(event);
  }


  async handleStateChangeRequest() {
    switch (this.getState()) {
      case "idle":
        await this.stateMachine.transition("setup", this.context);
        break;

      case "setup":
        await this.stateMachine.transition("exploration", this.context);
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