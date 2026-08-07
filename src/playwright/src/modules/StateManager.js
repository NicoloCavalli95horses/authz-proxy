// StateManager.js
// This class is a layer between PageMonitor() and StateMachine()
// It instantiates a state machine class and orchestrates the callbacks to be executed for each state

//===================
// Import
//===================
import { log } from "../utils/utils.js";
import { EventBus } from "../utils/eventBus.js";
import { StateMachine } from "../utils/StateMachine.js";
import { PreliminaryActions } from "./exploration/PreliminaryActions.js";
import { ExplorationManager } from "./exploration/ExplorationManager.js";
import { apiToggleProxyState, apiStartAnalysis } from "../utils/api.js";


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

    this.setup = undefined;
    this.explorator = undefined;
  }



  init() {
    this.stateMachine.addState("idle", {
      onEnter: () => { },
      onExit: () => { },
    });

    this.stateMachine.addState("setup", {
      onEnter: async (ctx) => {
        this.setup = new PreliminaryActions(ctx);
        await this.setup.init();
      },
      onExit: (ctx) => {
        ctx.preliminaryActions = this.setup.closeSetup();
        this.setup = undefined;
      }
    });

    this.stateMachine.addState("exploration", {
      onEnter: async (ctx) => {
        this.explorator = new ExplorationManager(ctx);
        await this.explorator.init();
        await this.explorator.startAnalysis();
      },
      onExit: async () => {
        await apiToggleProxyState(true);
      },
    });

    this.stateMachine.addState("replay", {
      onEnter: async (ctx) => {
        await this.explorator.replayExploration();
      },
      onExit: async () => {
        await apiToggleProxyState(false);
        await this.explorator.dispose();
      },
    });

    this.stateMachine.addState("analysis", {
      onEnter: async () => {
        await apiStartAnalysis();
      },
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

      case "exploration":
        await this.stateMachine.transition("replay", this.context);
        break;

      case "replay":
        await this.stateMachine.transition("analysis", this.context);
        break;

      case "analysis":
        await this.stateMachine.transition("idle", this.context);
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