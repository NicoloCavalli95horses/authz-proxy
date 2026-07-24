export function log(...args) {
  const t = new Date().toISOString();
  console.log(`\n[${t}][PLAYWRIGHT]`, ...args);
}