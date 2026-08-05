
//===================
// Import
//===================
import { BaseExploration } from "./BaseExploration.js";



//===================
// Consts
//===================
let setup = undefined;

export async function startSetup(context) {
  setup = new PreliminaryActions(context);
  await setup.init();
}

export function endSetup() {
  return setup.closeSetup();
}


//===================
// Class
//===================
export class PreliminaryActions extends BaseExploration {
  constructor(context) {
    super(context);
    this.actions = [];
  }

  handleClick(event) {
    this.actions.push(event);
  }

  closeSetup() {
    return this.actions.length ? this.actions : undefined;
  }
}