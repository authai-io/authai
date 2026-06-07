#!/usr/bin/env node
/**
 * `authai-cloud` — entrypoint published as the `npx authai-cloud` bin.
 *
 * Subcommands:
 *   init      register an app with AuthAI Cloud and wire it into .env
 *   help      print usage
 */

import { runInit, type InitOptions } from "./init.js";

const args = process.argv.slice(2);
const subcommand = args[0];

if (!subcommand || subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
  printHelp();
  process.exit(0);
}

if (subcommand === "init") {
  const options = parseInitFlags(args.slice(1));
  runInit(options).catch((err) => {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
} else {
  console.error(`unknown subcommand: ${subcommand}\n`);
  printHelp();
  process.exit(1);
}

function parseInitFlags(rest: string[]): InitOptions {
  const opts: InitOptions = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--force") opts.force = true;
    else if (arg === "--name") opts.name = rest[++i];
    else if (arg === "--origin") opts.origin = rest[++i];
    else if (arg === "--relay") opts.relayUrl = rest[++i];
    else if (arg === "--env-file") opts.envFile = rest[++i];
    else {
      throw new Error(`unknown flag: ${arg}`);
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`\nauthai-cloud — set up Sign-in-with-ChatGPT for your app in 30 seconds\n`);
  console.log(`Usage:\n  npx authai-cloud init [flags]\n`);
  console.log(`Flags:`);
  console.log(`  --name <string>     app name shown on consent screens (default: prompt)`);
  console.log(`  --origin <url>      origin (e.g. https://myapp.com) (default: prompt)`);
  console.log(`  --relay <url>       AuthAI Cloud relay URL (default: https://cloud.authai.dev)`);
  console.log(`  --env-file <path>   write AUTH_AI_KEY to this file (default: ./.env)`);
  console.log(`  --force             overwrite an existing AUTH_AI_KEY in the env file\n`);
  console.log(`Docs: https://cloud.authai.dev/docs\n`);
}
