//===================
// Import
//===================
import { apiStartAnalysis, apiToggleProxyState } from "../utils/api.js";
import { log } from "../utils/utils.js";
import { highlightClickableElements } from "../utils/findClickableElements.js"



//===================
// Functions
//===================
export async function startAnalysis(page) {
  const initialURL = page.url();
  log("[StartAnalysis] Saved initial URL:", initialURL);

  log("[StartAnalysis] Finding clickable elements...");
  const clickable = await page.evaluate(highlightClickableElements);
  log(`[StartAnalysis] Found ${clickable.length} clickable elements`);
}

// [TODO]
// export async function startReplay(page) {
//   await apiToggleProxyState(true);

//   // Go to starting page
//   log("Reloading page...")
//   await page.goto(this.storage.initialURL, { waitUntil: "domcontentloaded", timeout: 4000 }).catch(() => null);
//   await page.waitForTimeout(this.FULL_PAGE_RELOAD_DELAY_MS);

//   if (!this.storage.events.length) { return; }
//   log("Sequence of events to replay:", this.storage.events);

//   await this.saveScreenshot("target", page);

//   for (const e of this.storage.events) {
//     await page.waitForTimeout(e.elapsedTime);
//     log('Replaying event:', e);
//     await page.mouse.click(e.position.x, e.position.y);
//     await this.saveScreenshot("target", page);
//   }

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