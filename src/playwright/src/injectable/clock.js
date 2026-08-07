// clock.js
// These functions are injected in the visited webpage

// ===========
// Functions
// ===========
export function injectClockMocking() {
  window.__instrumentation__ ??= {};

  if (!window.__instrumentation__.clock) {
    installPatches();
    window.__instrumentation__.clock = true;
  }
}

function installPatches() {
  // =================
  // Performance
  // =================
  const originalPerformanceNow = performance.now.bind(performance);
  const performanceStart = originalPerformanceNow();
  performance.now = () => {
    return originalPerformanceNow() - performanceStart;
  };


  // =================
  // Date
  // =================
  const OriginalDate = window.Date;
  const START = 1700000000000;

  function frozenNow() {
    return START + performance.now();
  }

  class FakeDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(frozenNow());
      } else {
        super(...args);
      }

    }

    static now() {
      return frozenNow();
    }

    static parse(str) {
      return OriginalDate.parse(str);
    }

    static UTC(...args) {
      return OriginalDate.UTC(...args);
    }
  }


  window.Date = FakeDate;


  // =================
  // Math.random
  // =================
  let seed = 12345;

  Math.random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}