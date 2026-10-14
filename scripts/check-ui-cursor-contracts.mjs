#!/usr/bin/env node
/**
 * Guards the CSS ↔ shadcn/ui contract: every `data-slot` referenced by a stylesheet
 * must exist in the installed components (apps/web/src/components/ui/*.tsx).
 * Fails after a shadcn update that renames or removes a slot used by our CSS.
 * Structural contracts only (data-slot) — never class names.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const webSrc = join(root, "apps/web/src");
const uiDir = join(webSrc, "components/ui");

function walk(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, extension);
    return entry.name.endsWith(extension) ? [path] : [];
  });
}

const definedSlots = new Set(
  walk(uiDir, ".tsx").flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/data-slot="([^"]+)"/g)].map((match) => match[1]),
  ),
);

const missing = [];
let referenced = 0;
for (const file of walk(webSrc, ".css")) {
  const css = readFileSync(file, "utf8");
  for (const match of css.matchAll(/\[data-slot=["']?([\w-]+)["']?\]/g)) {
    referenced++;
    if (!definedSlots.has(match[1]))
      missing.push(`${relative(root, file)} → data-slot="${match[1]}"`);
  }
}

if (missing.length > 0) {
  console.error("UI contract check failed — data-slot used in CSS but not found in components/ui:");
  for (const line of missing) console.error(`  • ${line}`);
  process.exit(1);
}

console.info(
  `UI contract check passed: ${referenced} data-slot reference(s) in CSS, ${definedSlots.size} slot(s) defined.`,
);
