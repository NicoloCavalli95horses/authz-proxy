//===================
// Import
//===================


//===================
// Config
//===================
export const config = Object.freeze({

  // Setup initial page. This may not be exactly the page under test (!)
  // [NOTE] authentication and CAPTCHA solving have to be done manually
  initialPage: "https://example.com/",

  // Increases the number of GUI states to explore exponentially
  maxExplorationDepth: 1,

  // Ignore certain parts of the DOM (eg. top: 100 = ignore elements within 100px of the top margin) or certain tags
  // [Note] by connecting via CDP, Playwright cannot control the viewport. Force the viewport via Browser DevTools if needed
  ignoreDOMarea: {
    tags: ["nav", "footer", "header", "[role=banner], img, input"],
    viewport: {
      top: 200,
      left: 0,
      right: 0,
      bottom: 0
    }
  },

  // Execute preliminary clicks before exploration (eg. to close cookie banner, wizard, etc)
  hasPreliminaryAction: false,

  // Applied on actions (click, fill, evaluate) and navigation (goto, reload, waitForNavigation)
  maxPageTimeout: 10000,

  // max click timeout
  clickTimeout: 10000,

  // performance.now, window.Date and Math.random() return stable values. Can break applications that heavily rely on timestamps
  enableClockMocking: false,

  // <a href="">, window.open, history.push, assign and replace and other navigation APIs are blocked to speed up the exploration
  enableNavigationGuard: false,

});