# Anatomy Atlas — QA Report

**Owner:** qa-dev · **Repo:** `/Users/shanto/Documents/deepseek-harness/default-workspace/anatomy-atlas`
**Content snapshot:** 12 systems, 95 organs, 12 lessons (96 steps), 96 quiz questions, 120 glossary terms,
80 facts, 16 history events, 7 regions.

> This report is generated from an independent test suite. Tests are not weakened to make them pass: a red
> cell is a product defect or a missing feature, not a test workaround. App code is never edited by QA.

## 1. Scope and artefacts

| Area | Tool | Location |
|---|---|---|
| Content integrity, search, quiz engine, progress store | Vitest 2 | `tests/unit/**` |
| Browser journeys (desktop / mobile / WebKit) | Playwright 1.64 | `tests/e2e/**` |
| Accessibility (axe-core) | @axe-core/playwright | `tests/e2e/a11y.spec.ts` |
| Performance, bundle, console/network, WebGL fallback | Playwright + Node | `tests/e2e/quality.spec.ts` |
| Deployed-build verification | Playwright script | `scripts/verify-live.mjs` |
| Screenshots | Playwright | `test-results/screenshots/**` |
| Machine-readable results | Playwright/Vitest | `test-results/results.json`, `test-results/reports/**` |

### Exact commands

```bash
npm run build                 # tsc --noEmit && vite build (must pass)
npm run test                  # Vitest unit suite (npx vitest run)
npm run test:e2e              # Playwright: builds + previews, then runs the full matrix
QA_DEV=1 npm run test:e2e     # same suite against the Vite dev server (faster iteration)
node scripts/verify-live.mjs <url>   # deployed-build smoke check
```

Playwright projects: `chromium-desktop`, `mobile-pixel-7` (Pixel 7 device profile), `webkit-desktop`, plus an
additive `chromium-webgl` project that exercises the real 3D scene (software WebGL is slow; every other test
uses the documented no-WebGL fallback so the suite stays fast and deterministic).

## 2. Unit suite — PASS (203/203)

`npx vitest run` — **8 files, 203 tests, all passing.**

| File | Tests | What is verified |
|---|---|---|
| `content.test.ts` | 76 | 12 systems present/parsing, exact spec organ IDs and order, global ID uniqueness, every organ field (summary 110–170 words / 2 paragraphs, 3 facts, 2–3 conditions, 2–4 related organs, 2 allowlisted sources, keywords, heroStat), system metadata, stats/functions |
| `lessons-quiz.test.ts` | 49 | lesson ids `lesson-<system>`, 8 steps, ≥5 organ links pointing at real organs, step prose lengths; 8 quiz questions per system, ids `-q1…q8`, 4 distinct options, valid shuffled answer keys, 3/3/2 difficulty mix, explanations |
| `content-hygiene.test.ts` | 5 | no markdown/HTML/emoji/bullets, no generic AI voice, no medical advice or dosage instructions, US spelling, https+allowlisted non-duplicated sources |
| `supplementary.test.ts` | 4 | glossary (120 terms, unique, typed), facts (80, unique ids, valid refs), history (16, year format), regions (all 7 in canonical order with landmarks) |
| `search.test.ts` | 9 | `searchOrgans` ranking (exact > prefix > keyword > system), case/whitespace folding, limits, dedupe, keyword coverage |
| `search-lib.test.ts` | 21 | `searchAtlas` grouped ranking, AND semantics, fuzzy typo tolerance, snippets, highlight segments, glossary anchors, deterministic output |
| `quiz-engine.test.ts` | 20 | seeded PRNG/shuffle determinism, answer-key preservation through option shuffling, 24-question final exam (2/system), partial-content degradation, grading incl. blanks/out-of-range, percent/grade bands, recommendations |
| `progress.test.ts` | 19 | `parseProgress` corruption/sanitisation, pure helpers, provider persistence (first-paint guard), best-score-by-ratio rule, dedupe, bookmarks, reset, private-mode failures, cross-tab storage events |

## 3. Build — PASS

`npm run build` succeeds (tsc strict + Vite production build). Bundle sizes from
`test-results/reports/bundle-report.json`:

| Chunk | gzip | Budget | Status |
|---|---|---|---|
| Initial JS (`index-*` + `react-*`) | — | < 450 KB | — |
| 3D chunk (`three-*`, lazy) | — | < 400 KB | — |
| CSS | — | < 60 KB | — |

## 4. E2E matrix

Full matrix: see `test-results/results.json` (per-project, per-test). Legend: ✅ pass · ❌ fail · n/a not
applicable to that project.

| Journey | chromium-desktop | mobile-pixel-7 | webkit-desktop |
|---|---|---|---|
| Home hero, nav, stats, 12 system links, footer, SEO | | | |
| Skip link + single h1 + 1280/1024/768 no overflow | | | |
| Systems index → system page (12 systems, lesson/quiz CTAs) | | | |
| System → organ → related organ; bookmark persists | | | |
| Organ sources on allowlist | | | |
| Deep links `/organs/heart`, `/learn/...`, `/systems/...`, `/quiz/final` | | | |
| 404 for unknown route/organ/system/lesson | | | |
| Explore fallback + full organ browser + selection panel + URL sync | | | |
| Explore deep link `?organ=heart` | | | |
| Explore system filter + organ search | | | |
| Real 3D canvas renders pixels (webgl project) | | n/a | n/a |
| Learn index (12 lessons) | | | |
| Lesson 8 steps → Mark complete → persists after reload → learn index reflects | | | |
| Lesson outline/prev/next/arrow keys | | | |
| Quiz hub (12 system quizzes + final exam) | | | |
| Quiz perfect run 8/8 + explanations + best score persisted + reload | | | |
| Quiz mixed run exact score | | | |
| Final exam 24 questions (2/system) | | | |
| Quiz deep link + unknown system 404 | | | |
| Glossary search/filter/empty state/anchor deep link | | | |
| ⌘K/Ctrl-K search: autofocus, grouped results, arrow/Enter, Escape/close, empty state | | | |
| Keyboard-only search, organ selection, quiz, lesson, focus rings | | | |
| Mobile menu open/navigate/close, touch bookmark | | | |
| No horizontal overflow at 360px on 10 routes | | | |
| Reduced motion: no infinite animations, still functional | | | |
| Accessibility axe: 12 routes, no serious/critical | | | |
| Console errors / page errors / failed requests across 11 routes | | | |
| WebGL-unavailable fallback usable | | | |
| Bundle budget + LCP/CLS/DOMContentLoaded budget | | | |

## 5. Accessibility

axe-core scan set: `/`, `/explore`, `/systems`, `/systems/cardiovascular`, `/organs/heart`, `/learn`,
`/learn/lesson-cardiovascular`, `/quiz`, `/quiz/cardiovascular`, `/quiz/final`, `/glossary`, `/about`, plus the
open search dialog and an in-progress quiz. Serious/critical violations are treated as failures; all
violations (including moderate/minor) are saved under `test-results/a11y/<project>/*.json`.

## 6. Performance and quality

`test-results/reports/perf-report.json` records FCP, LCP, CLS, DOMContentLoaded from the production preview
build. Console errors, uncaught page errors and failed requests are asserted to be empty across all key
routes. Screenshots for every key route and viewport are in `test-results/screenshots/<project>/`.

## 7. Defects

Severity scale: **S1** blocks release (data loss / broken core journey / serious a11y on core page) ·
**S2** should fix before launch · **S3** polish, record only.

| ID | Severity | Area | Description | Repro | Owner | Status |
|---|---|---|---|---|---|---|
| A11Y-1 | **S1** | `/about` | Invalid list structure: `.history-list` `<ol>` directly contains `<div class="reveal">` wrappers, so all 16 `.history-item` `<li>`s sit outside a list (axe `list` + `listitem`, serious). | Open `/about`, scroll to history. JSON: `test-results/a11y/*/axe-about.json`. | ui-dev | Open (reported) |
| A11Y-2 | **S1** | Search overlay | Colour contrast failures (axe `color-contrast`, serious, 10 nodes): group heading `#search-group-organ`, `.search-result__meta`, `.search-result__snippet mark` are below 4.5:1. | Open ⌘K, type "heart". JSON: `test-results/a11y/*/axe-search-dialog-open.json`. | learning-dev | Open (reported) |
| A11Y-3 | **S1** | `/quiz` hub | `label-content-name-mismatch` (serious) on `.final-exam-card`: accessible name does not contain visible text. | Open `/quiz`. JSON: `test-results/a11y/*/axe-quiz.json`. | learning-dev | Open (reported) |

No other defects were found by the suite so far. Content, unit logic, search ranking, quiz grading/final exam,
progress persistence, deep links, 404s, keyboard-only journeys, console/network cleanliness, bundle budget and
the WebGL fallback all passed in the runs completed before the test-run collision (see §8 history).

> Note: several owners are fixing the three a11y defects above while this report is being finalised. The final
> pass is re-run from a clean rebuild after the owners report frozen code; results replace the interim cells in
> §4.

## 8. Sign-off

_Pending the post-freeze clean single-runner pass (build + unit + full e2e matrix from source)._

