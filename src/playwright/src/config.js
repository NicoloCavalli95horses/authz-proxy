export const config = Object.freeze({

  // Setup initial page. This may not be exactly the page under test (!)
  // > Authentication and CAPTCHA solving have to be done manually
  initialPage: "https://www.busuu.com/dashboard/timeline/a1",

  // Set to true if no authentication is required and the analysis can start immediatly at the provided initialPage
  startImmediately: false,

  // Ignore cross origin HTTP requests and responses
  ignoreCrossOriginHTTPevents: false,
});