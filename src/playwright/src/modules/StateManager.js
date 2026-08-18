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
import { config } from "../config.js";
import {
  apiInitRun,
  apiStartAnalysis,
  apiToggleProxyState,
} from "../utils/api.js";


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
    },
    this.db = { // data used in db
      exploration: {},
      replay: {}
    },
    this.setup = undefined;
    this.explorator = undefined;
  }


  async updateBtnLabel(state) {
    await this.context.page.evaluate((state) => {
      window.__instrumentation__.setButtonState(state);
    }, state);
  }



  async init() {
    this.stateMachine.addState("idle", {
      onEnter: () => { },
      onExit: async () => {
        this.db.exploration = await apiInitRun({ type: "exploration", config });
        this.db.replay = await apiInitRun({ type: "replay", config });
      },
    });

    if (config.hasPreliminaryAction) {
      this.stateMachine.addState("setup", {
        onEnter: async (ctx) => {
          await this.updateBtnLabel(this.getState());
          this.setup = new PreliminaryActions(ctx);
          await this.setup.init();
        },
        onExit: (ctx) => {
          ctx.preliminaryActions = this.setup.closeSetup();
          this.setup = undefined;
        }
      });
    }

    this.stateMachine.addState("exploration", {
      onEnter: async (ctx) => {
        await this.updateBtnLabel(this.getState());
        this.explorator = new ExplorationManager(ctx);
        await this.explorator.init();
        await this.explorator.startAnalysis();
      },
      onExit: async () => {
        // await apiSaveGraph({ status: "exploration", data: this.explorator.graph });
        await this.explorator.endAnalysis();
        await apiToggleProxyState(true);
      },
    });

    this.stateMachine.addState("replay", {
      onEnter: async (ctx) => {
        await this.updateBtnLabel(this.getState());
        await this.explorator.replayExploration();
      },
      onExit: async () => {
        // await apiSaveGraph({ state: "replay", data: this.explorator.graph });
        await this.explorator.endAnalysis({ dispose: true });
        await apiToggleProxyState(false);
      },
    });

    this.stateMachine.addState("analysis", {
      onEnter: async () => {
        await this.updateBtnLabel(this.getState());
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

    return await this.eventBus.emit(event);
  }



  async handleStateChangeRequest() {
    switch (this.getState()) {
      case "idle":
        const step = config.hasPreliminaryAction ? "setup" : "exploration";
        await this.stateMachine.transition(step, this.context);
        if (step === "exploration") {
          await this.stateMachine.transition("replay", this.context);
          await this.stateMachine.transition("analysis", this.context);
        }
        break;

      case "setup":
        await this.stateMachine.transition("exploration", this.context);
        await this.stateMachine.transition("replay", this.context);
        await this.stateMachine.transition("analysis", this.context);
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