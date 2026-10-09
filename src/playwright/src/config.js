export const config = Object.freeze({

  // Setup initial page: this may not be exactly the page under test
  // Authentication and CAPTCHA solving have to be done manually
  initialPage: "https://www.calm.com/app",

  pageAgent: {
    baseURL: process.env.BASE_URL,
    model: process.env.LLM_MODEL,
    apiKey: process.env.API_KEY,
    language: "en-US",
  },

  // Retry in case of LLM failure
  LLMfailureRetries: 5,
});