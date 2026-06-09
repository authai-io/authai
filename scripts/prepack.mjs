#!/usr/bin/env node
/**
 * prepack hook for publishable workspace packages.
 *
 * Why this exists: npm only substitutes a small set of fields from
 * `publishConfig` (`access`, `tag`, `registry`). It does NOT substitute
 * `main`, `types`, `exports`, `bin`, etc. — so a published package keeps
 * whatever workspace-friendly paths the source package.json declared
 * (e.g. `./src/index.ts`), which doesn't ship in the tarball.
 *
 * Pattern: each publishable package sets `publishConfig` with the
 * fields it wants substituted. This script (run from each package's
 * `prepack`) backs up package.json → package.json.bak, then writes a
 * mutated package.json where every key in `publishConfig` overrides
 * the top-level value. `postpack.mjs` restores the backup.
 *
 * Run from the package directory (npm sets cwd to the package being
 * packed).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const pkgPath = resolve(process.cwd(), "package.json");
const backupPath = resolve(process.cwd(), "package.json.bak");

if (existsSync(backupPath)) {
  console.error(
    `[prepack] ${backupPath} already exists — refusing to overwrite. ` +
      `If a previous publish crashed, restore it manually: mv package.json.bak package.json`,
  );
  process.exit(1);
}

const raw = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);

if (!pkg.publishConfig || typeof pkg.publishConfig !== "object") {
  // Nothing to do — no overrides declared. Don't write a backup so postpack is a no-op.
  process.exit(0);
}

writeFileSync(backupPath, raw);

const { access, tag, registry, ...overrides } = pkg.publishConfig;
const next = { ...pkg, ...overrides };
// Keep the fields npm itself reads from publishConfig in place.
next.publishConfig = { access, tag, registry };
for (const k of Object.keys(next.publishConfig)) {
  if (next.publishConfig[k] === undefined) delete next.publishConfig[k];
}

writeFileSync(pkgPath, JSON.stringify(next, null, 2) + "\n");
console.log(`[prepack] applied publishConfig overrides to ${pkg.name}`);
