export const config = Object.freeze({

  // Setup initial page. This may not be exactly the page under test (!)
  // > Authentication and CAPTCHA solving have to be done manually
  initialPage: "",

  // Set to true if no authentication is required and the analysis can start immediatly at the provided initialPage
  startImmediately: false,

  // Ignore cross origin HTTP requests and responses
  ignoreCrossOriginHTTPevents: false,

  pageAgent: {
    baseURL: process.env.BASE_URL,
    model: process.env.LLM_MODEL,
    apiKey: process.env.API_KEY,
    language: "en-US",
  }
});