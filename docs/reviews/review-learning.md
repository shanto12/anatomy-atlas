# Review — Learn index and lesson reader

**Scope:** `/learn`, `/learn/lesson-cardiovascular`, the completion flow, the progress dashboard, and mobile behaviour.

**Evidence base:** `test-results/live/learn.png`, `test-results/live/lesson-cardiovascular.png`, `test-results/screenshots/chromium-desktop/lesson-complete.png`, the axe JSON in `test-results/reports/`, and the source. The workflow capture set has no 360 px Learn or Lesson frame, so mobile findings below were verified against the same built `dist` at 360 × 800 (and cross-checked in CSS). All page measurements quoted are from that build.

---

## Verdict

**Polish.** This is the most editorial corner of the product and much of it is genuinely excellent: the lesson copy has a voice, the typography is controlled, and the reader is calm to use. What holds it back is not craft but **learning-state honesty**. The “Continue learning” card, the lesson rail status and the completion copy describe a learner's journey that the app does not actually track. Fix the state model and this is a flagship surface; ship it as-is and the first thing a returning learner sees is a card that says “Continue” for a lesson they never opened.

---

## Score

**7.5 / 10** — design and content 9, accessibility intent 8.5, learning state 5.5, mobile information architecture 6.5.

---

## Strengths

- **A coherent, premium art direction.** The Fraunces display face, parchment paper, oxblood italic and thin gold rules carry through the hero, catalogue cards, key-point pull quotes and completion panel. The Learn page reads as a curated museum catalogue rather than a dashboard bolted onto an atlas.
- **Typography and measure are disciplined.** Desktop lesson prose is 703 px wide at 20.8 px / 34.5 px line-height — roughly 64–66 characters per line (`src/styles/learn.css:356-364`). At 360 px it becomes 17 px over 278 px with no horizontal overflow. Headline sizes, kickers and the 8-step titles have a clear hierarchy, and body copy never fights the chrome.
- **Lesson pacing is strong.** Each of the eight steps is one idea and roughly 500–700 characters; every step ends with a forward pull (“Ready?”, “Now it is ready for the long trip.”) and a key point. Step 1 of the cardiovascular lesson is 513 characters and renders in eight lines, so the reader is never asked to scroll a wall of text between actions.
- **Completion is treated as a reflective moment, not a score.** Key takeaways are aggregated from every step's key point, the language is deliberately non-gamified (“Completion is saved in this browser — it is not a test”), and “Read again” plus a completed chip make returning to a finished lesson legible (`src/components/learn/LessonReader.tsx:214-264`).
- **Accessibility intent is visible in the implementation, not just the audit.** Step dots are real buttons with spoken labels and `aria-current="step"`, step changes move focus to the new heading, ←/→ navigation works outside form fields, scroll behaviour respects reduced motion, and progress bars expose `role="progressbar"` values. Axe reports zero violations on both routes at desktop and mobile (`test-results/reports/a11y-chromium-desktop-learn.json`, `test-results/reports/a11y-chromium-desktop-learn-lesson-cardiovascular.json`, plus the `a11y-mobile-pixel-7-*` equivalents).
- **Performance signals are healthy.** LCP 780 ms, CLS ≈ 0.000003, and Three.js is split out of the initial bundle (`test-results/reports/perf-report.json`, `bundle-report.json`). A text lesson does not pay for the 3D viewer up front.
- **Content checks out.** I spot-checked the cardiovascular lesson's physiology — left-ventricle wall thickness, the pulmonary-artery exception, four chambers/four valves, capillary exchange, venous valves and the muscle/respiratory pumps — against standard references, along with the site's 5 L/min resting cardiac output summary ([Cardiac Output](https://rd.springer.com/rwe/10.1007/978-1-4614-6439-6_235-2), [NLM circulation transcript](https://collections.nlm.nih.gov/transcript/nlm:nlmuid-8701025A-vid)). No factual errors surfaced in the reviewed lesson.

---

## Issues

### 1. “Continue learning” does not follow what the learner actually did — **High · Learn index / progress model**

**Evidence.** In `test-results/live/learn.png` the dashboard shows **0 / 12 lessons completed** (one organ explored), yet the hero card reads **“CONTINUE LEARNING … Continue lesson”** for lesson 01, which was never started. In `test-results/screenshots/chromium-desktop/lesson-complete.png`, the learner has completed lesson 04 (“Follow the blood”), the dashboard says **1 / 12**, and the card still offers lesson 01 (“Build a body”) with the verb **“Continue lesson”**. The target is simply the first system whose lesson is not complete (`src/pages/LearnPage.tsx:33-36`); the label is driven by `hasProgress` (`LearnPage.tsx:78-96`), which is true for *any* explored organ (`src/lib/progress.tsx:313-317`). The reader's actual position is saved only in `sessionStorage` per tab (`src/components/learn/LessonReader.tsx:16-25, 71-77`), so the index cannot resume it even within the same session.

**Recommended fix.** Persist `lastLessonId` + `lastStep` (and per-lesson `started`) in the `anatomy-atlas:progress:v1` store. Then derive the card from that state: “Resume ‘Follow the blood’ at step 4” when a lesson is open, “Start lesson 02 — The pull of a lifetime” when the next item is untouched, and “Next lesson” after a completion. Encode the step in the lesson URL (`?step=4`) so the resume is shareable and survives a new tab.

---

### 2. The reader says “100% through the lesson” while the lesson is still “In progress” — **High · Lesson reader / completion**

**Evidence.** `test-results/live/lesson-cardiovascular.png` shows **“STEP 1 OF 8 · 13% through the lesson”** before any reading, and the rail simultaneously says **Status: In progress** and **“Finish the last step to mark this lesson complete.”** The meter counts the current step as done (`src/components/learn/StepProgress.tsx:19-23`), so at step 8 it reads 100% even though completion still requires pressing “Mark lesson complete” (`LessonReader.tsx:242-247`). The rail's status is derived only from `isComplete`, so every incomplete lesson is “In progress” — including a first visit (`LessonReader.tsx:322-331`).

**Recommended fix.** Make the meter represent completed steps (`current / total`) or label it “Step 8 of 8 · end of lesson” instead of a percentage. Track and display **Not started / In progress / Complete**. If completion stays manual (which is the right call), replace “Finish the last step to mark this lesson complete” with “Mark it complete below when the ideas feel settled.” The three surfaces — step meter, rail status, dashboard count — should never disagree.

---

### 3. The dashboard celebrates “ground you have covered” when both learning bars are empty — **Medium · Progress dashboard**

**Evidence.** `test-results/live/learn.png` shows **“THE GROUND YOU HAVE COVERED”** above 0 / 12 lessons and 0 / 13 quizzes (with one organ explored). The helpful empty-state paragraph (`src/components/learn/ProgressDashboard.tsx:120-124`) is suppressed because `hasProgress` is also true for a single organ view (`src/lib/progress.tsx:313-317`), while the title only branches on that same flag (`ProgressDashboard.tsx:50-52`).

**Recommended fix.** Gate the celebratory headline on lesson or quiz activity, not on any activity. With organ views only, use an accurate intermediate line (“A start — one organ explored”) and keep the explanatory sentence until the first lesson is finished. This is a two-line change that removes the “my progress is broken” first impression.

---

### 4. On mobile, the catalogue starts more than two screens down — **Medium · Mobile Learn index**

**Evidence.** At 360 × 800 on the built app, the hero is 890 px, the continue card 325 px, the dashboard 629 px and the filter block 311 px, putting the first lesson card at **y ≈ 2,102 px**. The 13 system chips wrap to **seven rows** because `.learn-filters` is `flex-wrap: wrap` (`src/styles/learn.css:1012-1019`) and the chips are 34 px tall (`learn.css:8-24`); the dashboard stacks to one column at ≤960 px (`learn.css:2739-2764`). On a phone, a returning learner sees a full screen of hero and a full screen of empty progress before the first lesson.

**Recommended fix.** At `< 720px`, turn the system filter into a single horizontally scrollable row (with a fade/scroll affordance) or a native select; collapse the dashboard to a one-line summary until progress exists; consider placing the catalogue ahead of the progress panel on mobile. Target: first lesson card within one viewport.

---

### 5. Marking a lesson complete drops keyboard focus and is silent to screen readers — **Medium · Completion flow / accessibility**

**Evidence.** “Mark lesson complete” is the primary action (`LessonReader.tsx:242-247`). Activating it removes the button, and no focus is moved to the new “Lesson complete.” heading, which has no `tabIndex`; there is no `role="status"` or `aria-live` region. In Chromium the active element falls back to `<body>` immediately after the click, so the state change is neither announced nor keyboard-locatable. Axe does not catch this class of issue, which is why the zero-violation JSONs do not contradict it.

**Recommended fix.** Give `#lesson-finish-title` `tabIndex={-1}` and focus it after the state change, or wrap the confirmation in a polite live region. While there, make “Take the quiz” the primary action once the lesson is complete — after the button disappears the panel has no primary forward path, only a ghost button and a text link.

---

### 6. Lesson pages serve the homepage's canonical and social metadata — **Medium · SEO / metadata**

**Evidence.** `curl https://anatomy-atlas-b2m.pages.dev/learn/lesson-cardiovascular` returns `<title>Anatomy Atlas — Explore the Human Body in 3D</title>`, `<link rel="canonical" href="https://anatomy-atlas-b2m.pages.dev/">` and `og:url` pointing at the root. `dist/` contains a single `index.html`; per-page metadata is applied only after hydration in `usePageMeta` (`src/lib/seo.ts:41`, `src/pages/LessonPage.tsx:10-17`). The sitemap correctly lists the 12 lesson URLs, so search and share surfaces disagree with what is served. Social scrapers do not run the effect, and lesson shares will render the generic homepage card.

**Recommended fix.** Prerender the Learn index and the 12 lesson routes at build time (the data is static JSON), or inject route-specific tags at the edge. Add `LearningResource`/`Course` JSON-LD per lesson with `name`, `description`, `teaches`, and `timeRequired`.

---

### 7. The closing step sends the reader to the heart, but offers no link — **Low · Lesson content / IA**

**Evidence.** Cardiovascular step 8 says “Explore the heart in more detail next, then the coronary arteries that keep it running” (`src/data/systems/cardiovascular.json:682`), but step 8 has no `organId` (the step object at lines 680-684 omits it). The “Follow this thread” organ block only renders when `current.organId` exists (`LessonReader.tsx:203-211`), and the finish panel's only forward path is “Next lesson: A breath from the outside in” (`LessonReader.tsx:248-261`). The reader is told to go somewhere the page does not offer.

**Recommended fix.** Add `organId: "heart"` to step 8 (or an inline link to the heart and coronary arteries), or rewrite the final hook to match the actual next action. Keep one forward path per screen.

---

## What would make this a 10

1. **One honest learning-state model.** Persist started/in-progress/complete and the last step per lesson; derive every CTA from it, including “Resume step 4” and “Next lesson 05”. No surface should claim progress the store does not have.
2. **A completion moment that is announced and points forward.** Focus or live-announce “Lesson complete.”, then make the quiz the primary next action, with “Next lesson” as the secondary.
3. **A mobile Learn page that starts with lessons.** One horizontal filter rail (or a select), a one-line progress summary when empty, and the first card within the first screen.
4. **Server-rendered lesson metadata and JSON-LD**, even if it is a tiny build-time prerender of 13 routes. This turns lessons into shareable, indexable objects rather than one SPA shell.
5. **A visible trust line on the lesson header.** “Reviewed against 2 sources · October 2026” linking to the organ pages' MedlinePlus/NIH sources would connect the excellent fact-checking work in `docs/CONTENT_REPORT.md` to the place a learner actually reads.
6. **Use the rail for something the header cannot show.** “Level / Reading time” is already in the lesson header; replace the duplicate with live progress (“Step 4 of 8 · about 4 min left”) so the sidebar earns its sticky position.

The bones of a 10 are already here — the type, the voice, the pace, the key points and the keyboard model. The next pass is about making the product's memory as good as its writing.
