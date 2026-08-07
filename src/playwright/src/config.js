//===================
// Import
//===================


//===================
// Config
//===================
export const config = Object.freeze({

  // Increases the number of GUI states to explore exponentially
  maxExplorationDepth: 2,

  // Ignore certain parts of the DOM (eg. top: 100 = ignore elements within 100px of the top margin) or certain tags
  // [Note] by connecting via CDP, Playwright cannot control the viewport. Force the viewport via Browser DevTools if needed
  ignoreDOMarea: {
    tags: ["nav", "footer", "header", "[role=banner]"],
    viewport: {
      top: 500,
      left: 200,
      right: 0,
      bottom: 0
    }
  },

  // Applied on actions (click, fill, evaluate) and navigation (goto, reload, waitForNavigation)
  maxPageTimeout: 10000,

  // max click timeout
  clickTimeout: 10000,

  // performance.now, window.Date and Math.random() return stable values. Can break applications that heavily rely on timestamps
  enableClockMocking: false,

  // <a href="">, window.open, history.push, assign and replace and other navigation APIs are blocked to speed up the exploration
  enableNavigationGuard: false,

});