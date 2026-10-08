//===================
// Import
//===================
import { log } from "../utils/utils.js";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { apiSaveAgentOutput } from "../utils/api.js";

//===================
// Class
//===================
export class PageAgentManager {
  constructor(context) {
    this.page = context.page;
    this.initialURL = undefined;
    this.currentRun = "exploration";

    this.prompts = {
      exploration: "discovery.md",
      evaluation: "evaluation.md",
    }
  }

  async start(promptReady = undefined) {
    log("[PageAgentManager] Started");
    await this.waitForDOMStable();

    this.initialURL = this.page.url();
    const prompt = promptReady || await this.getPrompt(this.prompts[this.currentRun]);

    // Execute page agent
    const result = await this.safePageEvaluate(async ({ prompt, config }) => {
      if (window.__instrumentation__?.pageAgent) {
        return await window.__instrumentation__.pageAgent?.execute(prompt, config);
      }
    }, { prompt, config: config.pageAgent });

    log(result);
    await apiSaveAgentOutput(result);
  }



  async next() {
    if (!this.results?.success && !this.results?.data) {
      log('[ExplorationManager][next] Preliminar exploration failed, exiting');
      return;
    }
    
    this.currentRun = "evaluation";
    const basePrompt = await this.getPrompt(this.prompts[this.currentRun]);
    const prompt = `
      # Previous Exploration Results
      The following data contains the results produced by the previous exploration step. Use these results as input for the current task.
      ${this.results.data}
      # Current Task ${basePrompt}
    `;

    log("[ExplorationManager][next] Evaluating previous results...");
    await this.start(prompt);
  }



  async end() {
    await this.goToInitialState(this.initialURL);
  }

  // ==============================
  // Utils
  // ==============================

  async safePageEvaluate(fn, args, retries = 3, delay = 300) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.page.evaluate(fn, args);
      } catch (err) {
        log(`[PageAgentManager][safePageEvaluate] Retry ${i + 1}/${retries}`, err.message);
        if (i < retries - 1) {
          await this.page.waitForTimeout(delay);
        }
      }
    }
    return null;
  }



  async goToInitialState(url) {
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" }); // networkidle is risky because we may never idle
    } catch (err) {
      log("[PageAgentManager][goToInitialState] Error while going to initial state", err.message);
    }

    await this.waitForDOMStable();
  }



  async waitForDOMStable(timeout = 2000, quietPeriod = 200) {
    try {
      await this.page.evaluate(({ timeout, quietPeriod }) => {
        return new Promise(resolve => {
          if (!document.body) {
            resolve();
            return;
          }

          let quietTimer;

          const observer = new MutationObserver(() => {
            clearTimeout(quietTimer);
            quietTimer = setTimeout(() => {
              observer.disconnect();
              resolve();
            }, quietPeriod);
          });

          observer.observe(document.body, { childList: true, subtree: true, attributes: true });

          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, timeout);
        });
      }, { timeout, quietPeriod });

    } catch (err) {
      if (err.message.includes("Execution context was destroyed")) {
        log("[PageAgentManager][waitForDOMStable] Navigation detected, skipping");
        return;
      }

      throw err;
    }
  }



  async getPrompt(fileName) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const promptPath = join(__dirname, "../prompts", fileName);
    return await readFile(promptPath, "utf8");
  }
}