#!/usr/bin/env node
/* ============================================================================
   Validate the full question bank: structural integrity of every item, plus
   cross-file duplicate stems across curated.js + claude-1000.js + llm-bank.js.
   Exits non-zero (and prints details) if anything is wrong.
   ============================================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadArray(file, globalName) {
  global.window = global;
  const src = fs.readFileSync(file, "utf8");
  const fn = new Function("window", "globalThis", src + `\nreturn window.${globalName};`);
  const arr = fn(global, global);
  if (!Array.isArray(arr)) throw new Error(`${file} did not export ${globalName} as an array`);
  return arr;
}

const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const sets = {
  curated: loadArray(path.join(ROOT, "assets", "curated.js"), "CISSP_CURATED"),
  claude1000: loadArray(path.join(ROOT, "assets", "claude-1000.js"), "CISSP_CLAUDE"),
  llmBank: fs.existsSync(path.join(ROOT, "assets", "llm-bank.js"))
    ? loadArray(path.join(ROOT, "assets", "llm-bank.js"), "CISSP_LLM") : []
};

let ok = true;
let totalItems = 0;
const allStems = new Map(); // norm stem -> [source, source, ...]

for (const [name, arr] of Object.entries(sets)) {
  let badStruct = 0;
  arr.forEach((q, i) => {
    const okOpts = Array.isArray(q.o) && q.o.length === 4 && new Set(q.o).size === 4;
    const okC = Number.isInteger(q.c) && q.c >= 0 && q.c <= 3;
    const okQ = typeof q.q === "string" && q.q.length > 5;
    if (!okOpts || !okC || !okQ) {
      badStruct++;
      console.error(`  ✗ ${name}[${i}] structurally invalid:`, JSON.stringify(q).slice(0, 150));
    }
    const key = norm(q.q);
    if (!allStems.has(key)) allStems.set(key, []);
    allStems.get(key).push(name);
  });
  totalItems += arr.length;
  console.log(`${name}: ${arr.length} items, ${badStruct} structurally invalid`);
  if (badStruct > 0) ok = false;
}

const dupes = [...allStems.entries()].filter(([, sources]) => sources.length > 1);
console.log(`\ntotal items across all files: ${totalItems}`);
console.log(`distinct stems: ${allStems.size}`);
console.log(`cross-file duplicate stems: ${dupes.length}`);
if (dupes.length > 0) {
  ok = false;
  dupes.slice(0, 20).forEach(([stem, sources]) => console.error(`  ✗ dup in [${sources.join(", ")}]: ${stem.slice(0, 100)}`));
  if (dupes.length > 20) console.error(`  ... and ${dupes.length - 20} more`);
}

if (ok) {
  console.log("\n✓ bank is valid: no structural errors, no cross-file duplicates");
  process.exit(0);
} else {
  console.error("\n✗ VALIDATION FAILED — see errors above");
  process.exit(1);
}
