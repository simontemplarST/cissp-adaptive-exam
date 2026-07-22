#!/usr/bin/env node
/* ============================================================================
   Merge a staged batch (from generate-questions.mjs, OUT_FILE=<staging>)
   into assets/llm-bank.js, deduping against curated.js, claude-1000.js,
   and whatever's already in llm-bank.js.

   Usage:
     BATCH_FILE=tools/.batch-staging.js node tools/merge-batch.mjs
   ============================================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BATCH_FILE = process.env.BATCH_FILE
  ? path.resolve(ROOT, process.env.BATCH_FILE)
  : path.join(ROOT, "tools", ".batch-staging.js");
const LLM_BANK = path.join(ROOT, "assets", "llm-bank.js");

if (!fs.existsSync(BATCH_FILE)) {
  console.error("✗ staging batch file not found:", BATCH_FILE);
  process.exit(1);
}

function loadArray(file, globalName) {
  global.window = global;
  const src = fs.readFileSync(file, "utf8");
  const fn = new Function("window", "globalThis", src + `\nreturn window.${globalName};`);
  const arr = fn(global, global);
  if (!Array.isArray(arr)) throw new Error(`${file} did not export ${globalName} as an array`);
  return arr;
}

const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const curated = loadArray(path.join(ROOT, "assets", "curated.js"), "CISSP_CURATED");
const claude1000 = loadArray(path.join(ROOT, "assets", "claude-1000.js"), "CISSP_CLAUDE");
const existingLlm = fs.existsSync(LLM_BANK) ? loadArray(LLM_BANK, "CISSP_LLM") : [];
const batch = loadArray(BATCH_FILE, "CISSP_LLM");

const seen = new Set(
  curated.map(q => norm(q.q))
    .concat(claude1000.map(q => norm(q.q)))
    .concat(existingLlm.map(q => norm(q.q)))
);

let added = 0, dropped = 0, badStruct = 0;
const merged = existingLlm.slice();
for (const q of batch) {
  const okOpts = Array.isArray(q.o) && q.o.length === 4 && new Set(q.o).size === 4;
  const okC = Number.isInteger(q.c) && q.c >= 0 && q.c <= 3;
  if (!okOpts || !okC) { badStruct++; continue; }
  const key = norm(q.q);
  if (seen.has(key)) { dropped++; continue; }
  seen.add(key);
  merged.push(q);
  added++;
}

const banner =
  "/* AI-generated (Nemotron, self-verified/Sonnet-verified via OpenRouter) — merged incrementally.\n" +
  "   " + merged.length + " questions, deduped against curated + hand-authored + prior batches. */\n";
fs.writeFileSync(LLM_BANK, banner + "(function(g){g.CISSP_LLM=" + JSON.stringify(merged) + ";})(typeof window!==\"undefined\"?window:globalThis);\n");

const byDom = {}; merged.forEach(q => byDom[q.dom] = (byDom[q.dom] || 0) + 1);
console.log(`✓ merged batch: +${added} new, ${dropped} duplicates dropped, ${badStruct} structurally invalid dropped`);
console.log(`  llm-bank.js total now: ${merged.length}`);
console.log(`  by domain: ${JSON.stringify(byDom)}`);
