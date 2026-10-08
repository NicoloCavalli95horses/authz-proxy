// StateManager.js
// This class is a layer between PageMonitor() and StateMachine()
// It instantiates a state machine class and orchestrates the callbacks to be executed for each state

//===================
// Import
//===================
import { EventBus } from "../utils/eventBus.js";
import { StateMachine } from "../utils/StateMachine.js";
import { PageAgentManager } from "./PageAgentManager.js";
import { config } from "../config.js";

import {
  apiGetResults,
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
    };
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
      onExit: () => {},
    });

    this.stateMachine.addState("exploration", {
      onEnter: async (ctx) => {
        await this.updateBtnLabel(this.getState());
        this.pageAgent = new PageAgentManager(ctx);
        await this.pageAgent.start();
      },
      onExit: async () => {
        await apiToggleProxyState(true);
        await this.pageAgent.end();
      },
    });

    this.stateMachine.addState("evaluation", {
      onEnter: async () => {
        await this.updateBtnLabel(this.getState());
        await this.pageAgent.next();
      },
      onExit: async () => {
        await apiToggleProxyState(false);
        await this.pageAgent.end();
        await apiGetResults();
      },
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

    if (currState === "idle") {
      for (const state of ["exploration", "evaluation", "idle"]) {
        await this.stateMachine.transition(state, this.context);
      }
    }

    return currState;
  }



  getState() {
    return this.stateMachine.getState();
  }
}