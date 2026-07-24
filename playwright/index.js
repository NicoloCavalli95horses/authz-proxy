// ===========
// Import
// ===========
import { chromium } from "playwright";
import { PageMonitor } from "./src/modules/PageMonitor.js";
import { log } from "./src/utils/utils.js";


// ===========
// Main
// ===========
async function connect() {
  log("Try connecting to Chrome...");
  try {
    const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    log("Connected!");
    return browser;
  } catch (error) {
    log("Connection error: ", error);
  }
}


async function main() {
  const browser = await connect();
  const context = browser.contexts()[0];
  const monitor = new PageMonitor();

  // Hook for all documents
  await context.addInitScript(PageMonitor.injectHook);

  // New tab/popup
  context.on("page", async (page) => {
    log("Current page:", page.url());
    await monitor.attach(page);
  });

  // Monitor existing page
  for (const page of context.pages()) {
    await monitor.attach(page);
  }
}



await main();

