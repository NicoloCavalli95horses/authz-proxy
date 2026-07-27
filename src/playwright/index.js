// ===========
// Import
// ===========
import { chromium } from "playwright";
import { PageMonitor } from "./src/modules/PageMonitor.js";
import { log } from "./src/utils/utils.js";
import { injectHook } from "./src/modules/injectHook.js";
import 'dotenv/config';


// ===========
// Main
// ===========
async function connect() {
  log("Try connecting to Chrome...");
  try {
    const browser = await chromium.connectOverCDP(`http://${process.env.API_HOST}:${process.env.CHROME_DEBUG_PORT}`);
    log("Connected!");
    return browser;
  } catch (error) {
    log("Connection error: ", error);
  }
}


async function bootstrap() {
  const browser = await connect();
  const context = browser.contexts()[0];
  const monitor = new PageMonitor();

  // Hook for all documents
  await context.addInitScript(injectHook);

  // New tab/popup
  context.on("page", async (page) => {
    log("Current page:", page.url());
    await configurePage(page);
    await monitor.attach(page);
  });

  // Monitor existing page
  for (const page of context.pages()) {
    await configurePage(page);
    await monitor.attach(page);
  }
}

// Disable client cache
async function configurePage(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Network.setBypassServiceWorker", { bypass: true });
}


await bootstrap();

