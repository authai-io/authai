/**
 * Programmatic API. The bin script in `bin.ts` is the main entry point;
 * exporting `runInit` here lets test harnesses + IDE integrations call
 * the same flow without spawning a child process.
 */

export { runInit } from "./init.js";
export type { InitOptions } from "./init.js";
