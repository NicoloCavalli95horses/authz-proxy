import { rm, mkdir } from "node:fs/promises";


export function log(...args) {
  const t = new Date().toISOString();
  console.log(`\n[${t}][PLAYWRIGHT]`, ...args);
}

export async function cleanScreenshots() {
  try {
    log("Cleaning screenshots...");
    for (const dir of ["./screenshots/reference", "./screenshots/target"]) {
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
    }
  } catch (err) {
    log(err);
  }
}