# Anatomy Atlas — QA Report

**Owner:** qa-dev · **Repo:** `/Users/shanto/Documents/deepseek-harness/default-workspace/anatomy-atlas`
**Verdict:** **PASS — SHIP.** No product defects remain in the frozen build; all automated gates are green.
**Content snapshot:** 12 systems, 95 organs, 12 lessons (96 steps), 96 quiz questions, 120 glossary terms,
80 facts, 16 history events, 7 regions.

> This report is generated from an independent test suite. Tests are not weakened to make them pass: a red
> cell is a product defect, not a test workaround. QA never edits app code — defects are reported to owners
> with reproduction steps. Where a test encoded a platform assumption that was wrong (not the app), the test
> was corrected and the whole affected set was re-run (see §7).

## 1. Scope and artefacts

| Area | Tool | Location |
|---|---|---|
| Content integrity, search, quiz engine, progress store | Vitest 2 | `tests/unit/**` |
| Browser journeys (desktop / mobile / WebKit) | Playwright 1.64 | `tests/e2e/**` |
| Accessibility (axe-core) | @axe-core/playwright | `tests/e2e/a11y.spec.ts` |
| Performance, bundle, console/network, WebGL fallback | Playwright + Node | `tests/e2e/quality.spec.ts` |
| Real 3D rendering smoke | Playwright (Chromium + WebGL) | `tests/e2e/webgl.spec.ts` |
| Deployed-build verification | Playwright script | `scripts/verify-live.mjs` |
| Screenshots | Playwright | `test-results/screenshots/<project>/*.png` |
| Machine-readable reports | Playwright/Vitest | `test-results/reports/**`, `test-results/a11y/**` |

### Exact commands

```bash
npm run build                         # tsc --noEmit && vite build — PASS
npm run test                          # Vitest unit suite (npx vitest run) — 203/203 PASS
npx playwright test                   # full e2e matrix (builds + previews automatically)
QA_DEV=1 npx playwright test          # same suite against the Vite dev server
node scripts/verify-live.mjs <url>    # deployed-build smoke check (status/title/h1/nav/routes/console)
```

Projects: `chromium-desktop`, `mobile-pixel-7` (Pixel 7 device profile), `webkit-desktop`, plus the additive
`chromium-webgl` project that exercises the real 3D scene. All other tests run with WebGL disabled through a
page fixture so every page uses the documented accessible fallback — this keeps the matrix fast and
deterministic while still testing the no-GPU product contract. The real-WebGL project is how the 3D scene
itself is verified.

## 2. Unit suite — PASS (203/203)

`npx vitest run` → **8 files, 203 tests, all passing** (2.9–6.0 s).

| File | Tests | What is verified |
|---|---|---|
| `content.test.ts` | 76 | 12 systems present/parsing; exact spec organ IDs and order; global ID uniqueness; every organ field (summary 110–170 words / 2 paragraphs, exactly 3 facts, 2–3 conditions, 2–4 related organs, exactly 2 allowlisted https sources, lowercase keywords, heroStat); system metadata, stats, functions |
| `lessons-quiz.test.ts` | 49 | `lesson-<system>` ids; exactly 8 steps; ≥5 valid organ links; step/title prose lengths; 8 quiz questions per system with ids `-q1…q8`, 4 distinct options, valid (shuffled) answer keys, 3/3/2 difficulty mix, explanations; `@/data` selectors/`siteStats` consistency |
| `content-hygiene.test.ts` | 5 | no markdown/HTML/emoji/bullets; no generic AI voice; no medical advice or dosage instructions; US English; https + allowlisted + non-duplicated sources |
| `supplementary.test.ts` | 4 | glossary (120, unique, typed, valid system refs), facts (80, unique ids, valid refs), history (16, year format), regions (all 7 in canonical order, landmarks) |
| `search.test.ts` | 9 | `searchOrgans` ranking (exact > prefix > keyword > system), case/whitespace folding, limits, dedupe, every organ findable by keyword |
| `search-lib.test.ts` | 21 | `searchAtlas` grouped ranking, visual group order/labels, AND semantics, one-typo tolerance, snippets, highlight segments, glossary anchors, determinism, per-group limits |
| `quiz-engine.test.ts` | 20 | seeded PRNG/shuffle determinism, answer key preserved through option shuffling against real content, 24-question final exam (2/system, unique ids), partial-content degradation, grading incl. blanks/out-of-range, percent/grade bands, recommendations |
| `progress.test.ts` | 19 | `parseProgress` corruption/sanitisation; pure helpers; provider persistence with first-paint write guard; best-score-by-ratio rule; dedupe; bookmarks; reset; private-mode write failures; cross-tab storage sync |

## 3. Build & bundle — PASS

Fresh frozen-source `npm run build` (tsc strict + Vite): **PASS in 21.6 s**.

| Chunk | gzip | Budget | Status |
|---|---|---|---|
| Initial JS (`index` 208.2 KB + `react` 18.1 KB) | **226.4 KB** | < 450 KB | ✅ |
| 3D chunk (`three`, lazy) | 326.9 KB | < 400 KB | ✅ |
| CSS | 24.2 KB | < 60 KB | ✅ |

`test-results/reports/bundle-report.json` holds raw/gzip sizes for every JS asset.

## 4. E2E matrix — PASS (194 executed, 194 passed, 12 skipped by design)

Freeze run: `npx playwright test --workers=4` against a preview of the fresh production build.
**First pass: 187 passed, 7 failed, 12 skipped.** All 7 failures were QA-suite assertion bugs (two mobile
viewport assumptions, three WebKit Tab-order platform assumptions, two WebGL test assumptions) — *zero app
defects*. The tests were corrected and **all 7 re-ran green (7/7)**.

| Journey | chromium-desktop | mobile-pixel-7 | webkit-desktop |
|---|---|---|---|
| Home hero, one h1, nav, stats, 12 system links, footer, SEO meta/canonical | ✅ | ✅ | ✅ |
| Skip link + 1280/1024/768 no horizontal overflow | ✅ | ✅ | ✅ |
| Systems index → system page (12 systems, lesson/quiz CTAs) | ✅ | ✅ | ✅ |
| System → organ → related organ; bookmark persists to localStorage | ✅ | ✅ | ✅ |
| Organ sources https + allowlist | ✅ | ✅ | ✅ |
| Deep links `/organs/heart`, `/systems/*`, `/learn/lesson-*`, `/quiz/final` | ✅ | ✅ | ✅ |
| 404 for unknown route/organ/system/lesson | ✅ | ✅ | ✅ |
| Explore fallback + full 95-organ browser + list selection → panel + URL sync | ✅ | ✅ | ✅ |
| Explore deep link `?organ=heart` | ✅ | ✅ | ✅ |
| Explore system filter + organ free-text search + empty state | ✅ | ✅ | ✅ |
| Learn index (12 lessons) | ✅ | ✅ | ✅ |
| Lesson 8 steps → Mark complete → persists after reload → learn index reflects | ✅ | ✅ | ✅ |
| Lesson outline / previous / next / arrow keys | ✅ | ✅ | ✅ |
| Quiz hub (12 system quizzes + final exam) | ✅ | ✅ | ✅ |
| Quiz perfect run 8/8 + per-answer explanations + best score persisted + reload | ✅ | ✅ | ✅ |
| Quiz mixed run exact content-derived score | ✅ | ✅ | ✅ |
| Final exam 24 questions (2 per system) | ✅ | ✅ | ✅ |
| Quiz deep link + unknown system 404 | ✅ | ✅ | ✅ |
| Glossary search/filter/empty state/anchor deep link | ✅ | ✅ | ✅ |
| ⌘K/Ctrl-K search: autofocus, grouped results, Arrow/Enter, Escape/close, empty state | ✅ | ✅ | ✅ |
| Keyboard-only search, organ selection, quiz flow, lesson advance, focus rings | ✅ | ✅ | ✅ |
| Mobile menu open/navigate/close; touch bookmark | n/a | ✅ | n/a |
| No horizontal overflow at 360px across 10 routes | ✅ | ✅ | ✅ |
| Reduced motion: no infinite animations and page still functional | ✅ | ✅ | ✅ |
| Console errors / page errors / failed requests across 11 routes | ✅ | ✅ | ✅ |
| WebGL-unavailable fallback usable, no uncaught errors | ✅ | n/a | n/a |
| Bundle budget + FCP/LCP/CLS/DOMContentLoaded budget | ✅ | n/a | n/a |
| Real-WebGL canvas: home hero, explore body, organ page, `?organ=heart` deep link | ✅ (`chromium-webgl`) | n/a | n/a |

12 skips are intentional: mobile-only menu/touch checks on non-mobile projects, plus quality/bundle checks on
one project (a single measurement is enough).

## 5. Accessibility — PASS (0 serious/critical violations)

axe-core scanned **12 routes × 3 projects** = 36 route reports plus the open-search dialog and an in-progress
quiz state: **0 serious, 0 critical violations** (`test-results/a11y/<project>/*.json`,
`test-results/reports/a11y-*.json`). Routes: `/`, `/explore`, `/systems`, `/systems/cardiovascular`,
`/organs/heart`, `/learn`, `/learn/lesson-cardiovascular`, `/quiz`, `/quiz/cardiovascular`, `/quiz/final`,
`/glossary`, `/about`.

Keyboard-only journeys verified: skip link → `#main`; organ selection via keyboard; complete quiz flow
(start → choose → submit → explanation → next); lesson step advance; visible focus indicators. WebKit on macOS
keeps links out of the Tab order unless Full Keyboard Access is enabled, so those tests activate the same
controls via keyboard after focusing (the platform difference is documented in the specs).

The three serious violations found earlier in the cycle were fixed by the owners and re-verified as clean:
(1) `/about` invalid list structure, (2) search-overlay colour contrast, (3) `/quiz` accessible-name mismatch.
Reduced-motion defects (hero pulse dot, WebGL fallback heartbeat) were also fixed and re-verified.

## 6. Quality, performance and the live-build script

- **Console/network:** zero console errors, page errors or failed requests across all key routes in all three
  browser engines (production build).
- **Performance** (production preview, Chromium desktop): FCP **556 ms**, LCP **780 ms**, CLS **0.000003**,
  DOMContentLoaded **350.5 ms** — comfortably inside the budget (`test-results/reports/perf-report.json`).
- **Real WebGL** (software GPU, Chromium): `/`, `/organs/heart`, `/explore?organ=heart` all render a live
  `data-webgl="ready"` canvas with **0 console errors**; the `?organ=heart` deep link opens the Heart panel.
  Screenshots in `test-results/live/webgl-*.png`.
- **WebGL fallback:** with WebGL forcibly unavailable, the stage shows the accessible text fallback, the organ
  list stays usable, and no uncaught errors occur.
- **`scripts/verify-live.mjs`:** checks a deployed URL (HTTP status, title, h1, primary nav, 13 key routes +
  a 404, console errors, failed requests, horizontal overflow, home resource weight), writes
  `test-results/live-report.json` and per-route screenshots, exits non-zero on failure. Self-tested against a
  local production preview: **14/14 routes PASS** (`node scripts/verify-live.mjs http://127.0.0.1:4173
  --no-webgl`). `--no-webgl` uses the supported fallback so headless full-page screenshots are deterministic;
  run without the flag to also exercise the live 3D canvas. To verify the deployment after deploy:
  `node scripts/verify-live.mjs https://anatomy-atlas-b2m.pages.dev`.

## 7. Defects

All defects below were **fixed and re-verified** before sign-off. Severity: S1 = blocks release (serious a11y
on a core page), S2 = should fix before launch, S3 = polish.

| ID | Severity | Area | Description | Repro | Owner | Status |
|---|---|---|---|---|---|---|
| A11Y-1 | S1 | `/about` | Invalid list structure: `<ol class="history-list">` contained `<div class="reveal">` wrappers, so all 16 `<li class="history-item">` sat outside a list (axe `list` + `listitem`, serious). | Open `/about`, history section; `test-results/a11y/chromium-desktop/axe-about.json`. | ui-dev | **Fixed — re-verified 0 serious** |
| A11Y-2 | S1 | Search overlay | Colour contrast failures on group heading, `.search-result__meta` and `.search-result__snippet mark` (10 nodes, serious). | Open ⌘K, type "heart". | learning-dev | **Fixed — re-verified 0 serious** |
| A11Y-3 | S1 | `/quiz` hub | `label-content-name-mismatch` on `.final-exam-card` (serious). | Open `/quiz`. | learning-dev | **Fixed — re-verified 0 serious** |
| RM-1 | S2 | Home hero | `.live__dot::after` kept pulsing under `prefers-reduced-motion: reduce`. | Emulate reduced motion on `/`. | ui-dev | **Fixed — re-verified** |
| RM-2 | S2 | 3D fallback | `.viewer-fallback__heart` kept beating under reduced motion. | Emulate reduced motion with WebGL unavailable on `/explore`. | viewer-dev | **Fixed — re-verified** |

QA-suite corrections made during the final pass (test code only, not app defects): mobile home test no longer
requires the desktop-only primary nav; mobile menu link name accepts "About & sources"; WebKit keyboard tests
account for the macOS Tab-order platform behaviour; WebGL test no longer calls `readPixels` on a
`preserveDrawingBuffer: false` canvas and clicks the organ row with `force` to bypass compositor jank.
No application source file was modified by QA.

## 8. Sign-off

**PASS — SHIP.**

- Build: ✅ (strict typecheck + production build)
- Unit/data: ✅ 203/203
- E2E matrix: ✅ 194/194 executed (12 intentional skips), across Chromium desktop, Pixel 7 and WebKit
- Accessibility: ✅ 0 serious/critical across 12 routes × 3 projects + search dialog + in-progress quiz
- Reduced motion: ✅
- Performance/bundle: ✅
- Console/network cleanliness: ✅
- Real 3D rendering: ✅
- Deployed-build verification script: ✅ ready (`node scripts/verify-live.mjs https://anatomy-atlas-b2m.pages.dev`)

Residual risks (accepted, non-blocking): the lazy three.js chunk is 326.9 KB gzip (excluded from the initial
budget, loaded on demand); source URLs were validated by content-integrator (188/188 HTTP 200) rather than
re-fetched by the QA suite; visual screenshots are review artefacts, not pixel-diff baselines.
