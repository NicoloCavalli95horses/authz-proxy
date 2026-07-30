// Utils.js
// This file contains general utility functions and classes

// ===========
// Import
// ===========
import { rm, mkdir } from "node:fs/promises";


// ===========
// Functions
// ===========
export function log(...args) {
  const t = new Date().toISOString();
  console.log(`\n[${t}][PLAYWRIGHT]`, ...args);
}

export async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
