# CISSP Adaptive Practice Exam

A static, single-page **Computerized Adaptive Testing (CAT)** practice tool for the
(ISC)² CISSP, with immediate feedback, per-question explanations + deep-dive links,
and an 8-domain competency report. Runs entirely in the browser — no backend.

**Live site:** enabled via GitHub Pages (see the repo's Pages settings).

## Features

- **~10,000 questions** generated from verified fact tables (see *How the bank works*),
  plus 47 hand-authored CISSP-style items.
- **Adaptive engine** — a Rasch/1-parameter IRT model estimates your ability (θ) after
  each answer and selects the next item near your level, weighted toward the real exam's
  domain mix. Miss one → it eases off; nail it → it pushes harder.
- **Early-stop** when the estimate's standard error is small enough, emulating the real
  CISSP CAT (100–150 items).
- **Immediate feedback** — wrong answers are flagged instantly with the correct choice,
  an explanation, and a link to an authoritative source (NIST / OWASP / ISC² / Wikipedia).
- **Domain competency report** — difficulty-weighted score per domain, a pass/borderline/
  not-yet verdict from scaled θ, and a "where to focus next" list.

## How the question bank works

Questions are **generated, not scraped.** `assets/bank.js` holds structured, verified
knowledge tables (ports, OSI layers, crypto families, security models, laws/regulations,
IR/DR phases, RAID, cloud models, access-control models, a ~90-term glossary, …) and a
set of templates. A seeded PRNG combines facts with plausible same-family distractors to
produce items that are **correct by construction**. The 10,000 figure is the *item count*:
roughly 340 distinct concept-stems, each rendered with many randomized answer-option sets
(which also discourages rote memorization of "answer C").

## ⚠️ Important

These are **original practice questions**, not real, leaked, or copyrighted CISSP exam
items. The actual exam pool is confidential, and using leaked "braindump" pools can void a
certification. Use this to drill concepts — not as a substitute for the official CBK and
reputable study guides.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` over `http://` (external scripts won't load from a raw
`file://` path in some browsers).

## Files

| File | Purpose |
|------|---------|
| `index.html` | App UI + adaptive engine + report |
| `assets/bank.js` | Fact tables + question generator |
| `assets/curated.js` | 47 hand-authored core questions |
| `cissp-exam.html` | Standalone single-file variant (self-contained, ~47 Qs) |

## License

Content and code are original. MIT-licensed for reuse.
