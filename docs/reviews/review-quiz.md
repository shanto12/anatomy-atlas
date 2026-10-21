# Quiz & Assessment Review — Anatomy Atlas

**Reviewer:** independent product review (design, content, accessibility)
**Scope:** quiz hub, system quiz, final exam, result screen, keyboard/mobile behaviour
**Artifacts reviewed:** `test-results/live/quiz-hub.png`, `test-results/live/quiz-cardiovascular.png`, `test-results/live/quiz-final.png`, `test-results/screenshots/chromium-desktop/quiz-result.png`, `test-results/screenshots/chromium-desktop/keyboard-quiz.png`, the quiz axe JSONs, and the quiz source/data files. Because the files named `quiz-result.png` are actually the quiz intro after a reload, I also exercised the real result state against the local production build at 1280×800 and 360×800 (including axe), and re-verified the scroll and payload findings against the live site.

## Verdict

**Polish — do not ship broadly until the mobile flow and result contrast are fixed.**

This is the most confident expression of the product's "science museum, not hospital pamphlet" voice. The hub has a clear hierarchy, the dark final-exam slab feels like an event, the one-question flow is calm and legible, and the result screen handles a low score with unusual dignity ("This is a beginning, not a verdict."). The learning loop is genuinely good.

Two real problems keep it from being shippable as-is: on a common 1280×800 laptop and on mobile, advancing to the next question can leave the new question entirely above the viewport, and the review screen's key labels ("Your answer" / "Correct answer") fail WCAG AA contrast. A third, quieter problem is that a 24-question final exam can be discarded with one small tap on "Leave quiz", with no confirmation or recovery. None of these is architecturally hard to fix.

## Score

**7 / 10**

Strong editorial design and a sound quiz engine, held back by a high-impact mobile flow bug, a serious contrast failure in the result state, and missing attempt safety. The content itself is in good shape.

## Strengths

- **Hub hierarchy and tone are excellent.** "Test yourself, gently." sets the register, the final exam is visually promoted without competing with the twelve system cards, and every card answers the three practical questions: how many, how scored, what next. The system colours and Fraunces headings hold the museum feel. See `test-results/live/quiz-hub.png` and `src/pages/QuizPage.tsx:85-215`.
- **In-app discoverability is solved.** Quiz is a primary nav item, the hub exposes all 12 systems plus the final exam in one screen, system pages link to their own quiz (`src/pages/SystemPage.tsx:81-82`; `tests/e2e/navigation.spec.ts:36`), and the Learn index links to the hub and final exam (`src/pages/LearnPage.tsx:230-246`). A learner does not need to hunt.
- **The intro states the contract clearly.** Count, no timer, an explanation after every answer, best score kept locally, and privacy in plain language. A user knows exactly what they are agreeing to before "Start quiz" (`src/components/learn/QuizRunner.tsx:171-207`; `test-results/live/quiz-cardiovascular.png` and `quiz-final.png`).
- **The question flow is well-built.** One question per screen, native radio inputs, lettered options, disabled Submit until an answer is chosen, an accessible progress bar with `aria-valuetext`, and a clear "Leave quiz" escape. The keyboard-only path is real and tested (`keyboard-quiz.png`; `tests/e2e/a11y.spec.ts:67-102`).
- **Feedback teaches instead of judging.** Every answer — right or wrong — gets a verdict, the correct answer when relevant, and a 20–50-word explanation. The correct option also gains visually hidden text for screen readers, and the feedback is a `role="status"` region (`QuestionCard.tsx:92-133`).
- **The result screen is emotionally intelligent.** The score ring, warm grade copy, score line, saved-best line, Retry/Back actions, "A sensible next step", and the All/Missed review filters make a 25% result feel like a next step rather than a failure (`ResultSummary.tsx:66-220`). On mobile the header stacks into a centred, readable score card.
- **Content is coherent and accurate in the sampled items.** 96 questions (8 per system), 24 for the final exam (2 per system), with a 10 easy / 9 medium / 5 hard mix in the final paper. I spot-checked the pulmonary-artery answer against the [Cleveland Clinic great-vessels page](https://my.clevelandclinic.org/health/body/17057-your-heart--blood-vessels), the ~1/5 pulmonary vs aortic pressure claim against an [NCBI pulmonary-circulation table](https://pmc.ncbi.nlm.nih.gov/articles/PMC6039797/table/t2/), and the capillary range against standard histology; no factual errors found. The explanations are consistent with the lesson ("The detour to the lungs", "The heart feeds itself").
- **Trust language is consistent.** "No accounts, no tracking, no ads", best score local to the browser, educational-content disclaimer in the footer. The promised privacy model matches the implementation (`src/lib/progress.tsx`).

## Issues

### 1. High — One-question flow: "Next question" leaves the next question off-screen

**Area:** Mobile and laptop usability, focus management
**Evidence:** `src/components/learn/QuizRunner.tsx:122-129` advances the index but never calls the `scrollToTop` helper defined at `:63-70`. `src/components/learn/QuestionCard.tsx:40-42` then focuses the new question heading with `focus({ preventScroll: true })`, which explicitly prevents the browser from bringing it into view. Reproduced against live on two viewports: at 1280×800, after submitting Q1 and scrolling to "Next question" (scrollY 580), the Q2 heading landed at **−304px** and the card top at **−393px**; at 360×800, after tapping Next (scrollY 592), the Q2 heading was at **−358px** and the card top at **−421px**. The viewport then shows only a disabled Submit button, the hint, and the footer. The supplied `keyboard-quiz.png` shows Q2 without the preceding feedback, when the card fits; it does not exercise the transition that triggers the bug.
**Impact:** After any feedback long enough to require scrolling to "Next question" — the normal case on a 1280×800 laptop and every mobile — the next question appears to be missing. The learner must discover that they need to scroll up. Focus is also sitting on an off-screen heading, so keyboard and screen-reader users lose their place. This is the core one-question loop, not a corner case.
**Recommended fix:** Call `scrollToTop()` in `nextQuestion` after the state update (or scroll the question card into view on every index change), and remove the conflicting `preventScroll` when advancing. Add e2e assertions at 1280×800 and 360×800 that `.question-card__question` is within the viewport after "Next question".

### 2. High — Accessibility / result review: key labels fail contrast and the result state is untested

**Area:** Accessibility, score screen
**Evidence:** `.result-review__answers dt` uses `--ink-4` (#8f8678) at 11px on `--paper-2` (#eee6d8) — **2.90:1** (`src/styles/learn.css:2048-2058`; tokens in `src/styles/tokens.css:20-21`). Running axe against the real result state produced a **serious `color-contrast` violation on 14 nodes** (every "Your answer" / "Correct answer" label). The same `--ink-4` is **3.11:1** on parchment and is reused for the intro note (`learn.css:1474-1483`), the "Leave quiz" link (`:1516-1522`), and hub card metadata. The existing axe reports are clean because `tests/e2e/a11y.spec.ts:38-42` scans only the intro and the un-revealed question state; there is no result scan. The artifacts named `quiz-result.png` (desktop, mobile, and WebKit) are actually the intro after a reload (`tests/e2e/quiz.spec.ts:97-102`), so the score screen has no visual or axe artifact of its own.
**Impact:** The two labels that explain the review are the least readable text on the page. Low-vision users can see the question and their answer value but not which is which. The same token also makes practical hints and the destructive "Leave quiz" link faint. The testing gap is why a serious violation shipped unflagged.
**Recommended fix:** Darken `--ink-4` or use `--ink-3` (4.97:1) for all small metadata, keeping `--ink-4` for decorative marks only. Add axe scans for the result state (mixed and perfect runs) and the revealed-feedback state on desktop and mobile, and re-capture `quiz-result.png` from the actual result screen.

### 3. Medium — Usability / abandonment: the final exam can be lost with one small tap

**Area:** Attempt safety, mobile accessibility
**Evidence:** "Leave quiz" is a plain `<Link>` with no confirmation (`src/components/learn/QuizRunner.tsx:230-232`). There is no `beforeunload`, router blocker, or attempt persistence anywhere in `src/` (searched). The link is 11px text with no padding (`learn.css:1516-1522`), placed on its own row at mobile (`:2823-2825`) — roughly 16px high, below the 24×24 CSS-px WCAG 2.2 target minimum.
**Impact:** A 24-question final exam is a 10–20 minute investment. A stray tap on a small, faint link — or a browser Back gesture — silently discards every answer. The result screen's encouraging tone cannot help a learner who never reaches it. The small target makes the destructive action more likely, not less.
**Recommended fix:** Add a confirmation ("Leave quiz? Your answers will be lost") or a router blocker, and persist in-progress answers to `sessionStorage` keyed by quiz id so a learner can resume. Give "Leave quiz" a proper 44px touch target and a clearer hierarchy, or move it under a menu on mobile.

### 4. Medium — Performance: quiz pages download the 3D engine they never use

**Area:** Performance, mobile payload
**Evidence:** `dist/index.html:69` injects `<link rel="modulepreload" href="/assets/three-K6UhbsPG.js">` into the shell for every route. Resource timing on the live quiz measured **326,232 bytes transferred for Three.js** (1,159,932 bytes decoded), plus 206,747 bytes for the app chunk and 18,924 bytes for React. `test-results/reports/bundle-report.json` marks Three.js `excludedFromInitial: true`, but the HTML preload means the quiz route still fetches it on first load.
**Impact:** A text-only quiz pays roughly 0.33 MB gzip / 1.16 MB parse for a renderer it cannot use. On a mid-tier phone or a slow connection, that is the difference between a quiz that starts immediately and one that feels heavy. The budget report masks the cost because it excludes the chunk from "initial".
**Recommended fix:** Stop preloading the viewer chunk from the app shell; load Three.js only on routes that render the 3D viewer, and verify with resource timing that `/quiz` transfers only the app + React chunks. Add a route-specific JS budget to the performance test so this cannot regress.

### 5. Medium — Final exam / result: "the whole map at once" ends in a single flat number

**Area:** Final exam framing, score screen
**Evidence:** `ResultSummary` receives the whole `QuizResult` but only renders the global score and ring (`src/components/learn/ResultSummary.tsx:59-108`); the 24 review items each carry a system chip, but there is no aggregate per system. Recommendations are generic by percentage (`src/lib/quiz.ts:284-318`): at 75%+ the final exam recommends "Explore the glossary"; below 75% it recommends "Review the lessons" (and at 55%+ also "Explore the glossary"). The hub promises "One paper, mixed across 12 systems — a way to see the whole map at once" (`src/pages/QuizPage.tsx:132-136`).
**Impact:** The final exam is the one place where a learner wants a map of strengths and gaps — "2/2 immune, 0/2 urinary" — and it is exactly what the result does not show. A learner who scores 60% is sent to the glossary or the entire lesson library rather than the systems they actually missed. The framing promises synthesis; the result delivers an overall mark.
**Recommended fix:** Compute per-system tallies from `result.answers` (the data is already there) and add a compact 12-system breakdown to the final result. Base the "sensible next step" on the weakest two systems, linking to those system quizzes and lessons. Keep the current warm overall copy.

### 6. Medium — Final exam / retry: every retake is the identical paper

**Area:** Assessment validity, retry/best score
**Evidence:** `buildFinalExam` uses the fixed seed `'final-exam-v1'` and picks two questions per system with `seededShuffle` (`src/lib/quiz.ts:150-160`); `prepareQuestion` shuffles options with a seed derived only from the question id (`:101-115`). As a result, every retake has the same 24 questions, in the same order, with the same option positions. The hub explicitly invites unlimited retries and keeps the best score (`QuizPage.tsx:133-155`).
**Impact:** After one run, the result screen reveals every correct answer. A second run can be near-perfect by recall, so "Best so far" measures memory of this paper rather than knowledge of the body. "Final exam" implies a representative assessment; the fixed paper is not disclosed in the intro.
**Recommended fix:** Sample two questions per system per attempt using an attempt seed (preserved in session state so the paper is deterministic within the attempt), or offer a clearly labelled "fresh paper" alongside the fixed one. If the fixed paper is intentional for comparability, say so on the intro and avoid presenting the best as a mastery score.

### 7. Medium — SEO / shareability: every quiz URL serves the homepage's metadata

**Area:** SEO, metadata, link previews
**Evidence:** A no-JS fetch of the live `/quiz/cardiovascular` returns the homepage shell: `<title>Anatomy Atlas — Explore the Human Body in 3D</title>`, `canonical https://anatomy-atlas-b2m.pages.dev/`, and homepage OG/Twitter tags (`dist/index.html:6,14,23-28`). Per-page metadata is applied client-side by `usePageMeta` (`src/lib/seo.ts`). The title does update after JS boots (verified), but non-JS crawlers and social unfurlers see the homepage.
**Impact:** A shared cardiovascular or final-exam link previews as the site homepage, and the served canonical points every deep link at `/`. That weakens quiz discoverability through the two channels the hub cannot reach: search and messaging.
**Recommended fix:** Prerender route HTML at build time or inject route-specific title/description/canonical/OG tags at the edge, and add per-quiz OG images. Verify with `curl` (no JS) and a social-share debugger, not only with Playwright after hydration.

### 8. Low — Result / best score: the first completed attempt is never acknowledged as a new best

**Area:** Retry / best-score feedback
**Evidence:** `src/components/learn/QuizRunner.tsx:115` computes `const beatBest = Boolean(best) && isBetterQuizResult(best, ...)`. With no previous best, this is always false, even though the attempt is by definition a new best. `ResultSummary` then skips "New best on this device." and shows "Best so far: 2 / 8 (25%) · Oct 21" instead (`ResultSummary.tsx:101-108`). Reproduced on a first run.
**Impact:** The moment that most deserves acknowledgement — the first completed quiz — gets none, and the copy is internally inconsistent. It is a small miss, but it is the one piece of positive feedback the score screen withholds.
**Recommended fix:** Use `const beatBest = isBetterQuizResult(best, scored.score, scored.total);` (the helper already returns `true` when there is no previous result), or `!best || ...`, and add a test for first-attempt result copy.

## What would make this a 10

- **Make the one-question flow feel choreographed.** Every question transition should land at the question, with the heading visibly focused and the progress context in view. Test the "Next question" path at both 1280×800 and 360×800, not just the initial question screen.
- **Make accessibility a state-level gate.** Raise all small metadata to 4.5:1, scan the result and revealed-feedback states with axe, and do a screen-reader pass on the feedback announcement. A keyboard-focus ring around a heading should read as "you are here", not as a red error box.
- **Respect the attempt.** Autosave the final exam and confirm before leaving; make the destructive link a proper target. No learner should lose 20 minutes to a mis-tap.
- **Let the final exam deliver the map.** Show per-system 2/2 results and send the learner to the weakest systems; either vary the paper per attempt or be explicit that it is fixed. Celebrate the first new best.
- **Ship only what the quiz needs.** Remove the global 3D preload from text routes, and prerender or edge-inject per-quiz metadata so shared links preview correctly.
- **Close the loop from explanation to source.** Each result explanation could link to the relevant lesson step (or organ entry's sources), giving the quiz the same chain of evidence as the rest of the atlas.
