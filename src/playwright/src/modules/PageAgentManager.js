//===================
// Import
//===================
import { apiSaveInteraction, apiSaveState } from "../utils/api.js";
import { formatTimeMs, log, screenshot } from "../utils/utils.js";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

    this.config = {
      baseURL: process.env.BASE_URL,
      model: process.env.LLM_MODEL,
      apiKey: process.env.API_KEY,
      language: "en-US",
    }


    this.currentTransition = {
      network: {
        requests: [],
        responses: [],
        navigations: [] // routes or path modifications (e.g., history.pushState), often handled client-side in SPAs
      }
    };

    this.pendingRequests = new Set(); // used to wait for network idle
    this.lastActivity = Date.now();
    this.unsubscribe = undefined;
    this.context = context;
    this.requestIds = new Map(); // used to map HTTP req/res at DB level
  }

  async start() {
    const startTime = performance.now();
    log(`[PageAgentManager][start] Started with the following page agent config:`, this.config);
    
    this.initialURL = this.page.url();

    await screenshot(this.page);

    const prompt = await this.getPrompt("premium_feature_discovery.md");
  
    // Run page agent
    await this.safePageEvaluate(async ({ prompt, config }) => {
      if (window.__instrumentation__?.pageAgent) {
        const response = await window.__instrumentation__.pageAgent?.execute(prompt, config);
        console.log(response)
      }
    }, { prompt, config: this.config });

    const endTime = performance.now();
    log(`[ExplorationManager][start] Exploration done in: ${formatTimeMs(endTime - startTime)}`);
  }





  async replayExploration() {
    this.currentRun = "replay";
    log("[ExplorationManager] Replying exploration...");
    await this.startAnalysis();
  }

  async endAnalysis({ dispose } = {}) {
    await this.goToInitialState(this.initialURL);

    if (dispose) {
      this.dispose();
    }
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