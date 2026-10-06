//===================
// Import
//===================
import { apiSaveInteraction, apiSaveState } from "../utils/api.js";
import { log, screenshot } from "../utils/utils.js";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

//===================
// Class
//===================
export class PageAgentManager {
  constructor(context) {
    this.page = context.page;
    this.eventBus = context.eventBus;
    this.db = context.db;
    this.initialURL = undefined;
    this.currentRun = "exploration";

    this.currentTransition = {
      network: {
        requests: [],
        responses: [],
        navigations: [] // routes or path modifications (e.g., history.pushState), often handled client-side in SPAs
      }
    };

    this.pendingRequests = new Set(); // used to wait for network idle
    this.lastActivity = Date.now();

    this.requestIds = new Map(); // used to map HTTP req/res at DB level

    this.prompts = {
      exploration: "discovery.md",
      evaluation: "evaluation.md",
    }

    this.results = null;
  }

  async start(promptReady = undefined) {
    log(`[PageAgentManager][start] Started with the following page agent config:`, config.pageAgent);

    this.initialURL = this.page.url();
    const prompt = promptReady || await this.getPrompt(this.prompts[this.currentRun]);

    await screenshot(this.page);

    // Execute page agent
    this.results = await this.safePageEvaluate(async ({ prompt, config }) => {
      if (window.__instrumentation__?.pageAgent) {
        return await window.__instrumentation__.pageAgent?.execute(prompt, config);
      }
    }, { prompt, config: config.pageAgent });

    log(this.results); // to save to db
  }



  async next() {
    if (!this.results?.success) {
      log('[ExplorationManager][next] Preliminar exploration failed, exiting');
      return;
    }
    try {
      const data = JSON.parse(this.results?.data);
      this.currentRun = "evaluation";

      const basePrompt = await this.getPrompt(this.prompts[this.currentRun]);

      const prompt = `
        # Previous Exploration Results
        The following JSON contains the results produced by the previous exploration step. Use these results as input for the current task.
        \`\`\`json ${JSON.stringify(data, null, 2)} \`\`\`
        # Current Task ${basePrompt}
      `;

      log("[ExplorationManager][next] Evaluating previous results...");
      await this.start(prompt);
    } catch (error) {
      log('[ExplorationManager][next] Invalid JSON received:', error.message);
    }
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