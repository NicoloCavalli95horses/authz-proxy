
//===================
// Import
//===================
import { log } from "../../utils/utils.js";
import { BaseExploration } from "./BaseExploration.js";



//===================
// Class
//===================
export class PreliminaryActions extends BaseExploration {
  constructor(context) {
    super(context);
    this.actions = [];
  }

  handleClick(event) {
    log(`[PreliminaryActions] Received click event`, event);
    this.actions.push(event.data);
  }

  closeSetup() {
    this.dispose();
    log(`[PreliminaryActions] Registered ${this.actions.length} preliminary actions`, this.actions);
    return this.actions;
  }
}