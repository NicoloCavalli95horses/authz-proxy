// Utils.js
// This file contains general utility functions and classes to be imported in the Node context

// ===========
// Import
// ===========
import { rm, mkdir } from "node:fs/promises";
import util from "util";

// ===========
// Functions
// ===========
export function log(...args) {
  const t = new Date().toISOString();

  const formatted = args.map(arg =>
    typeof arg === "object" ? util.inspect(arg, {depth: null,colors: false, maxArrayLength: null}) : arg
  );

  console.log(`\n[${t}][PLAYWRIGHT]`, ...formatted);
}

export async function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function formatTimeMs(t) {
  // Pad to 2 or 3 digits, default is 2
  function pad(n, z) {
    z = z || 2;
    return ('00' + n).slice(-z);
  }

  let ms = t % 1000;
  t = (t - ms) / 1000;
  let secs = t % 60;
  t = (t - secs) / 60;
  let mins = t % 60;
  let hrs = (t - mins) / 60;

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(ms, 3)}`;
}