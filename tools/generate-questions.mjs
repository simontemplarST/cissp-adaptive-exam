#!/usr/bin/env node
/* ============================================================================
   OpenRouter CISSP question generator  (BUILD-TIME ONLY — never ship the key)
   ----------------------------------------------------------------------------
   Authors ORIGINAL CISSP-style practice questions grounded in the (ISC)² CBK,
   then self-verifies each one with an independent model pass. Output is baked
   into assets/llm-bank.js so the public site stays static and keyless.

   Usage:
     export OPENROUTER_API_KEY=sk-or-...            # required (never commit)
     node tools/generate-questions.mjs             # defaults below

   Env knobs:
     OPENROUTER_MODEL   default "anthropic/claude-sonnet-5"
     VERIFY_MODEL       default = OPENROUTER_MODEL
     GEN_COUNT          target distinct questions to KEEP (default 600)
     BATCH              questions per generation call (default 8)
     CONCURRENCY        parallel calls (default 4)
     VERIFY             "1" (default) run the self-verify gate, "0" skip
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
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5";
const VERIFY_MODEL = process.env.VERIFY_MODEL || MODEL;
const TARGET = parseInt(process.env.GEN_COUNT || "600", 10);
const BATCH = parseInt(process.env.BATCH || "8", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "4", 10);
const DO_VERIFY = (process.env.VERIFY || "1") !== "0";

const DOMAINS = {
  D1: "Security & Risk Management",
  D2: "Asset Security",
  D3: "Security Architecture & Engineering",
  D4: "Communication & Network Security",
  D5: "Identity & Access Management",
  D6: "Security Assessment & Testing",
  D7: "Security Operations",
  D8: "Software Development Security"
};
// ~2024 CBK weighting -> how much of the target each domain gets
const WEIGHT = { D1: .16, D2: .10, D3: .13, D4: .13, D5: .13, D6: .12, D7: .13, D8: .11 };
const DIFFS = ["easy", "medium", "hard"];
// authoritative deep-dive link per domain (LLM links are NOT trusted)
const LINKS = {
  D1: "https://www.isc2.org/certifications/cissp",
  D2: "https://csrc.nist.gov/pubs/sp/800/88/r1/final",
  D3: "https://csrc.nist.gov/glossary",
  D4: "https://en.wikipedia.org/wiki/Internet_protocol_suite",
  D5: "https://csrc.nist.gov/glossary/term/access_control",
  D6: "https://owasp.org/www-project-web-security-testing-guide/",
  D7: "https://csrc.nist.gov/pubs/sp/800/61/r2/final",
  D8: "https://owasp.org/www-project-top-ten/"
};

const OUT_FILE = path.join(ROOT, "assets", "llm-bank.js");
const PROGRESS = path.join(__dirname, ".progress.json");

/* ---------------- OpenRouter call ---------------- */
async function chat(model, messages, { json = true, retries = 4 } = {}) {
  const body = {
    model,
    messages,
    temperature: 0.7,
    ...(json ? { response_format: { type: "json_object" } } : {})
  };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + KEY,
          "Content-Type": "application/json",
          "X-Title": "CISSP Practice Bank Builder"
        },
        body: JSON.stringify(body)
      });
      if (res.status === 429 || res.status >= 500) throw new Error("HTTP " + res.status);
      if (!res.ok) { console.error("  ! HTTP", res.status, (await res.text()).slice(0, 200)); return null; }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch (e) {
      const wait = Math.min(30000, 1000 * 2 ** attempt);
      if (attempt === retries) { console.error("  ! give up:", e.message); return null; }
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return null;
}

/* ---------------- prompts ---------------- */
function genPrompt(domKey, diff, n) {
  return [
    {
      role: "system",
      content:
        "You are a CISSP exam-prep author. Write ORIGINAL multiple-choice practice questions " +
        "in the style of the (ISC)² CISSP, grounded in the Common Body of Knowledge. " +
        "STRICT RULES:\n" +
        "- Do NOT reproduce real, leaked, or copyrighted exam items. Write fresh questions.\n" +
        "- Exactly 4 options; exactly ONE unambiguously correct answer; distractors must be plausible and clearly wrong to an expert.\n" +
        "- Test concepts and application, not trivia phrasing tricks.\n" +
        "- 'why' = 1-2 sentence explanation of why the answer is correct and why the others are not.\n" +
        "Return ONLY JSON: {\"questions\":[{\"q\":str,\"options\":[4 strings],\"correct\":0-3,\"why\":str}]}"
    },
    {
      role: "user",
      content:
        `Write ${n} ${diff}-difficulty CISSP questions for Domain ${domKey.slice(1)}: ${DOMAINS[domKey]}. ` +
        `Vary the sub-topics so the ${n} questions are distinct from each other.`
    }
  ];
}

function verifyPrompt(q) {
  return [
    {
      role: "system",
      content:
        "You are an independent CISSP subject-matter expert grading a draft question. " +
        "Answer the question yourself, then judge it. Return ONLY JSON: " +
        "{\"answer\":0-3,\"single_correct\":bool,\"ambiguous\":bool,\"accurate\":bool}. " +
        "single_correct=exactly one option is defensibly correct. ambiguous=stem/options are unclear or two options both work. " +
        "accurate=the content is factually correct."
    },
    {
      role: "user",
      content:
        "Question: " + q.q + "\nOptions:\n" +
        q.options.map((o, i) => i + ") " + o).join("\n") +
        "\n(The draft marks option " + q.correct + " as correct.)"
    }
  ];
}

/* ---------------- validation ---------------- */
function structOk(q) {
  return q && typeof q.q === "string" && q.q.length > 15 &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every(o => typeof o === "string" && o.trim()) &&
    new Set(q.options.map(o => o.trim().toLowerCase())).size === 4 &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3 &&
    typeof q.why === "string" && q.why.length > 10;
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseJSON(txt) {
  if (!txt) return null;
  try { return JSON.parse(txt); } catch {}
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

/* ---------------- concurrency pool ---------------- */
async function pool(items, worker, size) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }));
  return results;
}

/* ---------------- plan the batches ---------------- */
function planBatches() {
  const jobs = [];
  for (const dom of Object.keys(DOMAINS)) {
    const want = Math.ceil(TARGET * WEIGHT[dom] * 1.4); // 1.4x to survive verify losses
    let made = 0, di = 0;
    while (made < want) {
      const diff = DIFFS[di % 3]; di++;
      const n = Math.min(BATCH, want - made);
      jobs.push({ dom, diff, n });
      made += n;
    }
  }
  return jobs;
}

/* ---------------- main ---------------- */
(async () => {
  console.log(`▶ model=${MODEL}  target=${TARGET}  verify=${DO_VERIFY}`);
  const seen = new Set();
  let kept = [];
  if (fs.existsSync(PROGRESS)) {
    try {
      const prev = JSON.parse(fs.readFileSync(PROGRESS, "utf8"));
      kept = prev.kept || [];
      kept.forEach(q => seen.add(norm(q.q)));
      console.log(`  resumed with ${kept.length} kept`);
    } catch {}
  }

  const jobs = planBatches();
  console.log(`  ${jobs.length} generation batches planned`);

  let gen = 0, dupes = 0, badStruct = 0, verifyFail = 0, done = 0;

  await pool(jobs, async (job) => {
    if (kept.length >= TARGET) return;
    const raw = await chat(MODEL, genPrompt(job.dom, job.diff, job.n));
    const parsed = parseJSON(raw);
    const list = parsed?.questions || [];
    for (const q of list) {
      gen++;
      if (!structOk(q)) { badStruct++; continue; }
      const key = norm(q.q);
      if (seen.has(key)) { dupes++; continue; }

      if (DO_VERIFY) {
        const vraw = await chat(VERIFY_MODEL, verifyPrompt(q));
        const v = parseJSON(vraw);
        if (!v || v.answer !== q.correct || v.single_correct === false ||
            v.ambiguous === true || v.accurate === false) { verifyFail++; continue; }
      }
      seen.add(key);
      kept.push({
        dom: job.dom, d: job.diff,
        q: q.q.trim(),
        o: q.options.map(o => o.trim()),
        c: q.correct,
        why: q.why.trim(),
        link: LINKS[job.dom]
      });
    }
    done++;
    if (done % 5 === 0 || kept.length >= TARGET) {
      fs.writeFileSync(PROGRESS, JSON.stringify({ kept }, null, 0));
      console.log(`  [${done}/${jobs.length}] kept=${kept.length} gen=${gen} dupes=${dupes} struct-fail=${badStruct} verify-fail=${verifyFail}`);
    }
  }, CONCURRENCY);

  kept = kept.slice(0, TARGET);
  const banner =
    "/* AUTO-GENERATED by tools/generate-questions.mjs — do not edit by hand.\n" +
    "   " + kept.length + " original, self-verified CISSP practice questions. */\n";
  const js = banner +
    "(function(g){g.CISSP_LLM=" + JSON.stringify(kept) +
    ";})(typeof window!=='undefined'?window:globalThis);\n";
  fs.writeFileSync(OUT_FILE, js);
  fs.rmSync(PROGRESS, { force: true });

  const byDom = {};
  kept.forEach(q => byDom[q.dom] = (byDom[q.dom] || 0) + 1);
  console.log(`\n✓ wrote ${kept.length} questions -> ${path.relative(ROOT, OUT_FILE)}`);
  console.log("  by domain:", JSON.stringify(byDom));
  console.log(`  totals: generated=${gen} kept=${kept.length} dupes=${dupes} struct-fail=${badStruct} verify-fail=${verifyFail}`);
})();
