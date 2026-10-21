# Systems index + system detail — independent review

**Scope:** `/systems` and `/systems/:id` (cardiovascular as the exemplar), live build at <https://anatomy-atlas-b2m.pages.dev>
**Artifacts reviewed:** `test-results/live/systems.png`, `test-results/live/system-cardiovascular.png`, `test-results/screenshots/chromium-desktop/03-systems.png`, `test-results/screenshots/chromium-desktop/04-system-cardiovascular.png`, `test-results/reports/a11y-*-systems*.json`
**Method:** image review + source review (`src/pages/SystemsPage.tsx`, `src/pages/SystemPage.tsx`, `src/data/systems/cardiovascular.json`, `src/styles/pages.css`, `src/styles/ui.css`, `src/styles/viewer.css`) + live re-capture at 1280×800, 390×844 and 360×800 with WebGL both on and disabled + DOM/box measurements + claim spot-checks.

## Verdict

**Polish.** This is one of the strongest surfaces of the product editorially — a genuinely museum-grade type system, disciplined numbering, and organ-level prose that reads like it was written by a person who likes anatomy. The two things holding it back are both in the *viewer*: the system-page 3D stage promises organ selection that is never wired, and its no-WebGL state renders overlapping, misleading text. The index also spends its entire first viewport on masthead, so a visitor arriving to "browse the twelve systems" sees none of them. None of this blocks the reading, lesson or quiz routes, so this is polish, not a block.

## Score

**7 / 10**

## Strengths

- **Typography and hierarchy are exceptional.** Fraunces display + Inter text, the oxblood italic accent on "twelve systems", the hairline rules and the 4-up statline give the index a real editorial masthead quality. The page has one obvious entry point and one editorial voice; nothing looks templated.
- **The card itself is well built.** Number → icon → title → tagline → "N structures" → "Explore ↗" is a predictable scan path, the 3-up hairline grid reads as a museum plate, and each card carries the system's accent only in the icon ring, so the grid stays calm (`src/components/ui/SystemCard.tsx`, `src/styles/ui.css:719`).
- **Content is accurate, specific and not boilerplate.** Spot-checks held up: 100,000 km of vessels / ~100,000 beats a day / left-ventricle wall "roughly three times thicker" / coronary flow "~5%" / pulmonary pressure "roughly a fifth of aortic" / veins holding "~70%" / capillaries 5–10 µm all match standard teaching. The drop-cap opening ("Every cell in your body is a small, demanding city") and the "cane handle" aorta are the kind of concrete images that make facts stick.
- **Scholarship infrastructure is real, not decorative.** Every organ carries exactly two allowlisted sources; `docs/CONTENT_REPORT.md` documents 188/188 URLs returning HTTP 200 and an allowlist with no Wikipedia/blog sources. The system page aggregates them into a per-system bibliography (15 unique references for cardiovascular).
- **The system hero is a proper content hierarchy.** "System 04 of 12 · Circulatory" eyebrow, H1, tagline, dual CTA, then a 3-stat meta row that mirrors the 8 structures / 8 lesson steps / 8 quiz questions actually present in the JSON. The statline band (100,000 km · 5 L · ~100,000) is the best moment on the page.
- **Accessibility intent is above average.** axe reports zero violations for both routes across chromium desktop, WebKit desktop and Pixel 7 (`test-results/reports/a11y-*systems*.json`); sampled body/label text bottoms out at 4.97:1 at 10 px (`--ink-3` on parchment); focus-visible rings, `prefers-reduced-motion`, skip/nav landmarks, breadcrumbs and `aria-labelledby` section naming are all present.
- **Performance signals are excellent.** `perf-report.json`: LCP 780 ms, CLS ≈ 0.000003, FCP 556 ms. Three.js is a separate 327 KB-gzip chunk kept out of the initial 226 KB (`bundle-report.json`), and the stage reserves its final height while loading.
- **SEO plumbing is complete.** Canonical + OG/Twitter per route (`src/lib/seo.ts`), all 12 system URLs in `public/sitemap.xml` (138 URLs total), JSON-LD `WebApplication`/`LearningResource` in `index.html`, and a written, non-boilerplate meta description on the index.

## Issues

### 1 · High · 3D affordance — the system stage says "select an organ", but nothing is selectable

`src/pages/SystemPage.tsx:102-116` renders `<ViewerStage interactive controls …>` but never passes `onSelectOrgan`. `src/components/viewer/ViewerScene.tsx:70` computes `pointerInteractive = Boolean(interactive && onSelectOrgan)` and disables picking and hover when it is false. The visible caption (`SystemPage.tsx:115`) says **"Drag to orbit · select an organ"**, and the canvas `aria-label` is hard-coded to **"Interactive 3D human body. Drag to rotate, scroll to zoom, click an organ."** (`ViewerCanvas.tsx:61`). Live check at 1280×800: clicking inside the stage at (950, 560) left the URL unchanged, produced no selected state, and the canvas cursor stayed `auto`; the DOM label still told screen-reader users to "click an organ". The stage is also not focusable (`tabindex` absent), so keyboard users have no in-stage interaction at all. This is the one place on the page where the product promises an interaction it does not deliver.

**Fix:** pass an `onSelectOrgan` that routes to `/organs/:id` (ideally also showing a small "selected structure" card with the organ's tagline and a link), so the "look" door and the organ grid reinforce each other. If the stage is intentionally read-only on system pages, change the caption to "Drag to orbit · scroll to zoom", change the canvas label to match, and let "Open in explorer" be the only drill-in promise.

### 2 · High · 3D error state — the no-WebGL fallback overlaps the plate and caption and keeps false claims

`src/styles/viewer.css:131` positions `.viewer-fallback` absolutely, inset 0, vertically centered — on top of `.stage__plate` (`src/styles/ui.css:1075`, z-index 4, bottom-left) and `.stage__foot` (`ui.css:1164`). With WebGL disabled (the state captured in **`test-results/live/system-cardiovascular.png`**; the same failure mode is deliberately documented for other routes in `test-results/live/webgl-*.png`), the measurements at 1280×800 are: stage `y 200–648`, fallback content `scrollHeight 475 > clientHeight 448`, fallback title/note `y 530–598`, plate title/meta `y 538–584`, caption `y 602–617`. The result is visible in the artifact: "The 3D body needs WebGL" is printed straight across "Circulatory", and the explanatory sentence runs through "8 STRUCTURES ILLUMINATED" (see the stage crop at approximately x 660–1230, y 200–650). The plate also still claims **"8 structures illuminated"** when nothing is illuminated, and the caption still says **"Drag to orbit · select an organ"** when orbit/selection are unavailable. Because `onSelectOrgan` is unset (issue 1), the fallback's own "Browse by name" organ list never renders either (`ViewerFallback.tsx:73`), so the error state offers no in-stage way out.

**Fix:** when `data-webgl="unavailable"`, hide the plate, foot and caption (or move the fallback into normal flow above the plate); replace "8 structures illuminated" with "3D unavailable — list below"; and pass `onSelectOrgan` so the fallback's text list works on system pages. Add one regression capture with WebGL disabled, since that is what the current live artifact set is actually showing.

### 3 · Medium · IA — no system is visible in the first viewport; the masthead says the same thing twice

Measured on the live page at 1280×800: H1 `y 241–312`, statline bottom `y 542`, "Choose a chapter." `y 744`, its lede bottom `y 857`, **first card `y 928`**. At 390×844 the first card is at `y 942`; at 360×800 it is at `y 1027`. So the index — whose only job is to list twelve things — shows zero of them on arrival. The header already carries "twelve systems" in the H1, then repeats it as "12 SYSTEMS" in the statline, then adds a second intro block ("ALL TWELVE" eyebrow + "Choose a chapter." + a second lede) before the grid (`SystemsPage.tsx:29-92`). Three introductions in 928 px is one too many.

**Fix:** collapse to a single masthead — move the 4 stats into the hero's bottom rail (they already look like it), drop the second lede or fold it into the first, and tighten `padding-block` on `.systems-index` (`pages.css:493`). Target the first card row at ≤ 700 px so a phone and a laptop both see "there are cards here".

### 4 · Medium · Artifacts / motion — the supplied screenshots cannot evidence this page, because all primary content is opacity-gated

`src/styles/base.css:318` sets `.reveal { opacity: 0 }` until IntersectionObserver fires. `SystemsPage.tsx:67` wraps the entire 12-card grid in one `<Reveal>`, and `SystemPage.tsx:141/157/179/204` wrap each content block. A `fullPage` capture does not scroll, so nothing below the fold ever intersects: the capture is blank. Concretely, `test-results/live/systems.png` and `test-results/screenshots/chromium-desktop/03-systems.png` are **byte-identical** (`sha256 765adf7…`) and show empty parchment from the section lede to the footer; `test-results/live/system-cardiovascular.png` and `04-system-cardiovascular.png` are also byte-identical (`sha256 4290fb3…`) and leave the entire main column (`y 920–3499` of 4254) empty while the non-`Reveal` aside renders normally. Re-capturing with a 500 px scroll step makes every block appear (0 hidden reveals on the system page, verified), so the deployed page is fine for a user who scrolls — but the QA evidence is not, and any future regression in that 2,579 px column would ship unseen.

**Fix:** animate only `transform`, not `opacity`, for primary content; or gate the hidden state behind `@media (prefers-reduced-motion: no-preference)` and add a mount-time fallback that sets `is-visible` after ~1.5 s. Update the capture helper to scroll the page (or set `prefers-reduced-motion: reduce`) before `fullPage`, and regenerate the systems artifacts.

### 5 · Medium · Trust / scholarship — no reviewer, no review date, and the bibliography is folded away

`SystemPage.tsx:204-232` puts all 15 references behind a collapsed `<details>` ("Show 15 references"). There is no author, editor, medical reviewer or "last reviewed" date anywhere on the system page (all byline copies live on `/about`, not here), and `src/lib/seo.ts` emits no `dateModified`. For cardiovascular, 7 of the 15 unique references are Kenhub URLs (a commercial anatomy-training site, covering 6 of the 8 structures), against 6 Cleveland Clinic, 1 MedlinePlus and 1 NHLBI — all live and on the project's own allowlist, but that is a thinner scholarly base than the copy's confidence suggests. The underlying data discipline is genuinely good (2 sources per organ, 188/188 HTTP 200), so the gap is presentation, not substance.

**Fix:** add a visible "Written by · Reviewed <month year>" line under the hero meta (and a `lastReviewed` field to `docs/CONTENT_SPEC.md` so it is checkable), surface 2–3 keystone primary references expanded above the fold of the References block, and consider swapping two or three Kenhub links for NCBI Bookshelf/Gray's-level sources on the flagship system.

### 6 · Medium · IA / semantics — "Related systems" is a positional slice, not a relationship

`SystemPage.tsx:46-53` builds `relatedSystems` by slicing `SYSTEM_ORDER` starting at the current index. For cardiovascular it will always return Respiratory, Digestive, Endocrine, Immune — the *next four chapters*, regardless of physiology. The eyebrow says "Adjacent chapters" (honest) but the heading says "Related systems" (not), and the index page's promise is "Start anywhere; follow the connections." An anatomy learner would expect heart↔lungs or cardiovascular↔urinary (blood pressure, fluid balance) to surface here; the data model already has `relatedOrgans`, so the concept exists one level down but not at system level.

**Fix:** add a curated `relatedSystems` field (3–4 IDs with a one-line reason each) to the system schema, and render it as "Connections" — e.g. "Respiratory — the other half of the gas-exchange loop". Until then, rename the heading to "Next chapters" so it does not overclaim.

### 7 · Low · Mobile CSS — the 600 px card override is dead code, leaving 38 px of dead space per card

`pages.css:488` declares `.system-grid--index .system-card { min-height: 248px }` (specificity 0,2,0). The mobile rule at `ui.css:1775` (`.system-card { min-height: 0 }`, inside `@media (max-width: 600px)`) is 0,1,0 and therefore loses. Measured at 390 px: computed `min-height: 248px`, card height 248 px, **38 px** of empty space between the tagline and the footer rule on every card, and a `/systems` page 5,904 px tall. On a phone that is roughly 450 px of pure dead space across the twelve cards.

**Fix:** add `.system-grid--index .system-card { min-height: 0 }` inside the `max-width: 600px` block (or scope the 248 px rule to `min-width: 601px`).

### 8 · Low · Copy — reader-facing text leaks the content spec, and one guide CTA links to its own page

- `SystemPage.tsx:163`: the functions lede reads **"Four to six jobs this system performs, in plain language."** That is the JSON schema's allowance (`docs/CONTENT_SPEC.md`: "4–6 short strings") surfaced to the reader; every system in the data has exactly 5, so it reads as a hedge and will silently become wrong if a system gains a function. Replace with "Five jobs this system performs, in plain language." or drop the count.
- `SystemsPage.tsx:123`: on `/systems`, the "Read" card in "Three ways in" renders **"Pick a system"** pointing at `/systems` — a link to the page you are already on. Point it at the first system, or at `/explore`, so each guide card is a real door.
- Minor, same family: card numbers are `aria-hidden` (`SystemCard.tsx:24`) even though the page tells everyone the numbering *is* the teaching order; using an `<ol>` (or a visually hidden "Chapter 4:") would expose the order to assistive tech instead of hiding it.

## What would make this a 10

1. **Make the stage teach.** Selecting a structure on the system page should highlight it, name it in the plate, and link to its `/organs/:id` entry — with the same list reachable by keyboard and in the no-WebGL fallback. One wired `onSelectOrgan` turns the hero from a beautiful illustration into the "look" door the copy promises.
2. **Design a real error state.** Plate hidden, one honest sentence, a tappable structure list, no "drag to orbit" copy, no overflow — and a CI screenshot with WebGL disabled so it cannot regress.
3. **Get the cards above the fold.** One masthead, first row visible at 1280×800 and on a phone; the twelve systems should be the first thing the page is about, not the third.
4. **Add a scholarly byline.** "Written by … · Reviewed <date>" in the hero, 2–3 primary references shown open, `dateModified`/`MedicalWebPage` structured data per system, and a `lastReviewed` field enforced by the content validator.
5. **Curate the connections.** Replace the positional "related" slice with 3–4 editorial relationships that explain *why* two systems belong together.
6. **Let the index earn its numbers.** Show each card's lesson length and quiz count (the data is already there) and a subtle visited/progress state, so the numbering becomes a syllabus rather than decoration.
7. **De-risk the reveal pattern.** Transform-only animation for primary content, capture-safe by default, so the design QA loop can actually see the page it is reviewing.
