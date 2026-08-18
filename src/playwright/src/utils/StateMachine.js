// StateMachine.js
// A general state machine that supports different callbacks:
// - onExit: executed before the state change
// - onEnter: executed on state change

//===================
// Import
//===================
import { log } from "./utils.js";


//===================
// Class
//===================
export class StateMachine {
  constructor() {
    this.states = new Map();
    this.currentState = null;
    this.busy = false;
  }

  
  addState(name, callbacks) {
    this.states.set(name, { name, ...callbacks });
  }


  setInitialState(name) {
    if (!this.states.has(name)) {
      throw new Error(`[StateMachine] State '${name}' does not exist`);
    }

    this.currentState = name;
    log(`[StateMachine] Set initial state: [${this.currentState.toUpperCase()}]`);
  }


  async transition(name, ...args) {
    if (this.busy) {
      log("[StateMachine] State machine busy");
      return;
    }

    if (!this.states.has(name)) {
      throw new Error(`[StateMachine] State ['${name.toUpperCase()}'] does not exist`);
    }

    this.busy = true;
    const previousStateName = this.currentState;
    const previousState = this.states.get(previousStateName);
    const nextState = this.states.get(name);

    try {

      // [Exit old state]
      // callback 'onExit' is executed to clean the previous state
      if (previousState?.onExit) {
        await previousState.onExit(...args);
      }

      this.currentState = name;
      log(`[StateMachine] State update: [${this.currentState.toUpperCase()}]`);

      // [Enter new state]
      // callback 'onEnter' is executed when we transition to the new state
      if (nextState?.onEnter) {
        await nextState.onEnter(...args);
      }
      return this.currentState;

    } catch (error) {
      this.currentState = previousStateName;
      log(`[StateMachine] Transition failed: ${error.message}`);
      throw error;
    } finally {
      this.busy = false;
    }
  }

  getState() {
    return this.currentState ?? null;
  }
}