#!/usr/bin/env node
/**
 * postpack hook — restores the package.json backup written by prepack.mjs.
 * If no backup exists (no publishConfig overrides), this is a no-op.
 */

import { renameSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const pkgPath = resolve(process.cwd(), "package.json");
const backupPath = resolve(process.cwd(), "package.json.bak");

if (!existsSync(backupPath)) {
  process.exit(0);
}

renameSync(backupPath, pkgPath);
console.log(`[postpack] restored ${pkgPath}`);
