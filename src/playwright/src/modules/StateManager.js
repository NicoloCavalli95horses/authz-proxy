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
      preliminaryActions: [],
      db: { // data used in db
        exploration: {},
        replay: {}
      },
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
      onEnter: async () => {
        await this.updateBtnLabel(this.getState());
      },
      onExit: async () => {
        const d1 = await apiInitRun({ type: "exploration", config });
        this.context.db.exploration = d1.data;
        const d2 = await apiInitRun({ type: "replay", config });
        this.context.db.replay = d2.data;
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
    const currState = this.getState();
    if (currState === "idle" && config.hasPreliminaryAction) {
      await this.stateMachine.transition("setup", this.context);
      return currState;
    }

    for (const state of ["exploration", "replay", "analysis", "idle"]) {
      await this.stateMachine.transition(state, this.context);
    }    
    return currState; 
  }



  getState() {
    return this.stateMachine.getState();
  }
}