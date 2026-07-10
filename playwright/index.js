// ===========
// Import
// ===========
import { chromium } from "playwright";
import { PageMonitor } from "./PageMonitor.js";



// ===========
// Main
// ===========
async function connect() {
  console.log("Try connecting to Chrome...");
  try {
    const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    console.log("Connected!");
    return browser;
  } catch (error) {
    console.error("Connection error: ", error);
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
    console.log("Current page:", page.url());
    await monitor.attach(page);
  });

  // Monitor existing page
  for (const page of context.pages()) {
    await monitor.attach(page);
  }
}



await main();

