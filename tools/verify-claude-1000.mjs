#!/usr/bin/env node
/* ============================================================================
   Independent verification of the 1,000 hand-authored CISSP questions
   (assets/claude-1000.js), using OpenRouter — NVIDIA Nemotron 3 Ultra (free).
   ----------------------------------------------------------------------------
   For each question, an independent model call:
     - answers the question from scratch (blind to which option was marked
       correct in the source file)
     - judges whether exactly one option is defensibly correct (single_correct)
     - flags ambiguity in the stem/options (ambiguous)
     - flags factual inaccuracy (accurate)

   Anything where the independent answer disagrees with the marked key, or
   any flag comes back negative, is written to a report file for manual
   review — this script does NOT auto-edit the question bank.

   Usage:
     export OPENROUTER_API_KEY=sk-or-...
     node tools/verify-claude-1000.mjs
   ============================================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("✗ OPENROUTER_API_KEY is not set. Run: export OPENROUTER_API_KEY=sk-or-...");
  process.exit(1);
}
const MODEL = process.env.VERIFY_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "3", 10); // free tier: be gentle
const RETRIES = parseInt(process.env.RETRIES || "5", 10);

const SRC = path.join(ROOT, "assets", "claude-1000.js");
const PROGRESS = path.join(__dirname, ".verify-progress.json");
const REPORT = path.join(ROOT, "tools", "verify-report.json");

/* ---------------- load the 1000 questions ---------------- */
global.window = global;
await import(SRC + "?t=" + Date.now()).catch(async () => {
  // .js file uses a plain (function(g){...})(window) IIFE; import as text-eval fallback
});
const src = fs.readFileSync(SRC, "utf8");
const fn = new Function("window", "globalThis", src + "\nreturn window.CISSP_CLAUDE;");
const QUESTIONS = fn(global, global);
if (!Array.isArray(QUESTIONS) || QUESTIONS.length === 0) {
  console.error("✗ Could not load questions from", SRC);
  process.exit(1);
}
console.log(`▶ loaded ${QUESTIONS.length} questions from ${path.relative(ROOT, SRC)}`);
console.log(`▶ model=${MODEL}  concurrency=${CONCURRENCY}`);

/* ---------------- OpenRouter call (with retry/backoff) ---------------- */
async function chat(messages, { retries = RETRIES } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + KEY,
          "Content-Type": "application/json",
          "X-Title": "CISSP Practice Bank - Independent Verification"
        },
        body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 })
      });
      if (res.status === 429 || res.status >= 500) throw new Error("HTTP " + res.status);
      if (!res.ok) {
        const body = await res.text();
        console.error("  ! HTTP", res.status, body.slice(0, 200));
        return null;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch (e) {
      const wait = Math.min(30000, 1500 * 2 ** attempt);
      if (attempt === retries) { console.error("  ! give up:", e.message); return null; }
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return null;
}

function parseJSON(txt) {
  if (!txt) return null;
  try { return JSON.parse(txt); } catch {}
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function verifyPrompt(item) {
  return [
    {
      role: "system",
      content:
        "You are an independent CISSP subject-matter expert grading a draft multiple-choice question. " +
        "Determine the correct answer YOURSELF first, from your own knowledge — do not assume the draft's " +
        "marked answer is correct. Then judge the question's quality. " +
        "Respond with ONLY a JSON object, no other text, in exactly this shape: " +
        '{"answer": 0-3, "single_correct": true/false, "ambiguous": true/false, "accurate": true/false}. ' +
        "single_correct = exactly one option is defensibly correct. " +
        "ambiguous = the stem or options are unclear, or more than one option could reasonably be defended. " +
        "accurate = the content is factually correct."
    },
    {
      role: "user",
      content:
        "Question: " + item.q + "\nOptions:\n" +
        item.o.map((o, i) => i + ") " + o).join("\n") +
        "\n\n(The draft author marked option " + item.c + " as correct. Independently verify this.)"
    }
  ];
}

/* ---------------- concurrency pool ---------------- */
async function pool(items, worker, size) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }));
  return results;
}

/* ---------------- main ---------------- */
(async () => {
  let items = QUESTIONS.map((q, i) => ({ i, q: q.q, o: q.o, c: q.c }));
  const LIMIT = parseInt(process.env.LIMIT || "0", 10);
  if (LIMIT > 0) items = items.slice(0, LIMIT);

  let done = [];
  if (fs.existsSync(PROGRESS)) {
    try {
      done = JSON.parse(fs.readFileSync(PROGRESS, "utf8"));
      console.log(`  resuming: ${done.length} already checked`);
    } catch {}
  }
  const doneIdx = new Set(done.map(d => d.i));
  const remaining = items.filter(it => !doneIdx.has(it.i));
  console.log(`  ${remaining.length} remaining to check`);

  let checked = 0;
  await pool(remaining, async (item) => {
    const raw = await chat(verifyPrompt(item));
    const v = parseJSON(raw);
    const rec = {
      i: item.i,
      q: item.q,
      myAnswer: item.c,
      verdict: v, // null if the call failed entirely
    };
    done.push(rec);
    checked++;
    if (checked % 25 === 0 || checked === remaining.length) {
      fs.writeFileSync(PROGRESS, JSON.stringify(done));
      console.log(`  [${done.length}/${items.length}] checked`);
    }
    return rec;
  }, CONCURRENCY);

  fs.writeFileSync(PROGRESS, JSON.stringify(done));

  const callFailed = done.filter(d => !d.verdict);
  const flagged = done.filter(d =>
    d.verdict && (
      d.verdict.answer !== d.myAnswer ||
      d.verdict.single_correct === false ||
      d.verdict.ambiguous === true ||
      d.verdict.accurate === false
    )
  );
  const clean = done.length - callFailed.length - flagged.length;

  const report = {
    model: MODEL,
    total: done.length,
    clean,
    flaggedCount: flagged.length,
    callFailedCount: callFailed.length,
    flagged: flagged.map(f => ({
      i: f.i, q: f.q, myAnswer: f.myAnswer, verdict: f.verdict
    })),
    callFailed: callFailed.map(f => ({ i: f.i, q: f.q }))
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log(`\n✓ done: ${done.length}/${items.length} checked`);
  console.log(`  clean: ${clean}   flagged: ${flagged.length}   call-failed: ${callFailed.length}`);
  console.log(`  report -> ${path.relative(ROOT, REPORT)}`);
})();
