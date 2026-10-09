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
    this.results = {
      exploration: undefined,
      evaluation: undefined,
    };

    this.retryAttempts = config.retryAttempts;
  }

  async start(promptReady = undefined) {
    log("[PageAgentManager] Started");
    await this.waitForDOMStable();

    this.initialURL = this.page.url();

    const prompt = promptReady ?? await this.getPrompt(this.prompts[this.currentRun]);

    const result = await this.executeWithRetry(prompt);

    if (!result?.success) {
      throw new Error(`Page agent failed during ${this.currentRun}`);
    }

    await apiSaveAgentOutput(result);
    this.results[this.currentRun] = result;

    return result;
  }



  async next() {
    const exploration = this.results.exploration;

    if (!exploration?.success || exploration.data == null) {
      throw new Error("Cannot evaluate: exploration results are missing or invalid");
    }

    this.currentRun = "evaluation";

    const basePrompt = await this.getPrompt(this.prompts[this.currentRun]);
    const prompt = `
      The following data contains the results produced by the previous exploration step.
      You must use these results as input for the current task.
      ${this.results.data}
      # Current Task ${basePrompt}
    `;

    log("[ExplorationManager][next] Evaluating previous results...");
    await this.start(prompt);
  }



  async end() {
    if (this.initialURL) {
      await this.goToInitialState(this.initialURL);
    }
  }


  // ==============================
  // Utils
  // ==============================

  async executeWithRetry(prompt) {
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      const result = await this.safePageEvaluate(async ({ prompt, config }) => {
        const agent = window.__instrumentation__?.pageAgent;

        if (!agent) { return { success: false, error: "Page agent not initialized" }; }

        try {
          return await agent.execute(prompt, config);
        } catch (error) {
          return { success: false, error: error.message, };
        }

      }, { prompt, config: config.pageAgent });

      if (result?.success) { return result; }
      log(`[PageAgentManager] Attempt ${attempt + 1}/` + `${this.retryAttempts + 1} failed: ` + `${result?.error ?? "Unknown error"}`);
    }

    return { success: false, error: "Maximum retry attempts exceeded" };
  }



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