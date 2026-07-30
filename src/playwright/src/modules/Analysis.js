//===================
// Import
//===================
import { apiStartAnalysis, apiToggleProxyState } from "../utils/api.js";
import { log } from "../utils/utils.js";
import { findClickableDOMEl } from "../utils/findClickableElements.js";
import { GraphManager } from "./GraphManager.js";


//===================
// Functions
//===================
export async function startAnalysis(page) {
  const graphManager = await new GraphManager(page)
  const S0 = graphManager.addNode();
  log("[StartAnalysis] Created first state snapshot:", S0);
}

// [TODO]
// export async function startReplay(page) {
//   await apiToggleProxyState(true);

//   // Go to starting page
//   log("Reloading page...")
//   await page.goto(this.storage.initialURL, { waitUntil: "domcontentloaded", timeout: 4000 }).catch(() => null);
//   await page.waitForTimeout(this.FULL_PAGE_RELOAD_DELAY_MS);
//   await this.closeSession(page);
// }

// [TODO]
// export async function closeSession(page) {
//   await apiToggleProxyState(false);
//   await apiStartAnalysis();
//   log("Replay done");

//   await page.evaluate((state) => {
//     window._resetBtnState?.(state);
//   }, "idle");
// }