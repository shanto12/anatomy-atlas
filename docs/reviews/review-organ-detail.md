# Organ detail — Heart · independent review

**Scope:** `/organs/heart`, live at <https://anatomy-atlas-b2m.pages.dev/organs/heart>
**Artifacts reviewed:** `test-results/live/organ-heart.png`, `test-results/live/webgl-organ-heart.png`, `test-results/screenshots/chromium-desktop/05-organ-heart.png`, `test-results/screenshots/chromium-desktop/360-organ.png`, `test-results/reports/a11y-{chromium-desktop,mobile-pixel-7,webkit-desktop}-organs-heart.json`
**Source read:** `src/pages/OrganPage.tsx`, `src/data/systems/cardiovascular.json`, `src/styles/pages.css`, `src/styles/ui.css`, `src/styles/viewer.css`, `src/components/ui/ViewerStage.tsx`, `src/components/viewer/{BodyViewer,ViewerCanvas,ViewerFallback,ViewerLabels,CameraRig}.tsx`, `src/viewer/anatomy.ts`, `src/lib/seo.ts`, `docs/{VIEWER,CONTENT_SPEC,CONTENT_REPORT}.md`
**Method:** image review; live Playwright re-capture at 1280×800 and Pixel 7 (412×915) with WebGL on and disabled; DOM box measurements; wheel-scroll test; Save-entry reload test; print-to-PDF inspection; axe re-check; factual spot-checks via web search.

## Verdict

**Polish.** The *entry* is excellent: 163 words of precise, vivid prose, a genuinely useful four-step function list, honest condition copy, a clear source block and a museum-grade type hierarchy. A curious beginner finishes it understanding the heart's chambers, two circuits, valve timing, left-ventricle thickness, electrical rhythm, blood supply and output.

What holds it back is the page's signature element. The 3D stage has three concrete overlay defects — an unreadable no-WebGL state, a mobile plate/caption collision, and an unstyled label that floats a bare "Heart" 250 px from the organ — and it labels none of the anatomy the copy names. Separately, the URLs are served with the homepage's canonical and meta tags, which is the wrong signal for 95 organ entries. None of these blocks reading, lessons or quizzes, so this is polish, not a block.

## Score

**7.5 / 10**

## Artifact note (important for reading the supplied captures)

The full-page captures (`organ-heart.png`, `05-organ-heart.png`, `360-organ.png`) show a large blank parchment column where the article should be. That is **not missing content**: `.reveal` starts at `opacity: 0` (`src/styles/base.css:318-327`) and a full-page screenshot never scrolls, so the IntersectionObserver that adds `.is-visible` never fires. Re-capturing the live page after a scroll reveals every block (6/6 `.reveal.is-visible`), and the print path forces `.reveal { opacity: 1 }` (`src/styles/pages.css:2379-2382`). The deployed reading experience is intact; the **artifact** is not evidence for the body copy, and a future regression in that ~3,600 px column would go unseen. The capture helper should pre-scroll or emulate `prefers-reduced-motion: reduce` before `fullPage`.

## Strengths

- **Editorial hierarchy is superb.** 81.9 px Fraunces H1, Roman *Cor* + "also called The pump", a 20 px lede, a 56 px oxblood stat, then the four-column specimen strip. The 814 px reading column against a 300 px sticky rail is calm and confident. The drop cap and the "What *it is*." emphasis are used sparingly rather than everywhere.
- **The writing does the teaching.** The summary names the pericardium, atria and ventricles, explains the two circuits, says why the left ventricle is roughly three times thicker, and lands the "lub-dub" and 100,000-beats-a-day image. The four functions are distinct (not four restatements of "pumps blood"), and the three field notes add coronary supply and 5 L/min output. The conditions are educational and explicitly non-diagnostic.
- **Safety language is clear and repeated.** "Educational descriptions only — never diagnosis or treatment advice" sits above the condition cards, the note under them tells the reader to speak with a clinician, the sources block repeats "not medical advice", and the footer carries the same. No treatment advice appears anywhere.
- **Information architecture is legible.** Overview → what it does → field notes → conditions → related organs → sources, with a numbered "In this entry" rail and working anchors (verified: `#organ-sources` lands 23 px below the sticky header). The related cards and previous/next pager make the entry feel part of a book, not an orphan page.
- **Bookmark and print are functional.** Save entry persists to `localStorage`, survives reload, and exposes `aria-pressed="true"` with a visible "Saved" state. Print CSS hides the stage/aside/pager, reveals all content and appends source URLs to each citation.
- **Accessibility intent is strong.** Semantic `<article>`, one `<h1>`, section `aria-labelledby`, a real `<dl>` specimen strip, `aria-hidden` on decorative icons, labelled nav landmarks, reduced-motion handling, and 8.88:1 body contrast (4.97:1 for `--ink-3`). axe reports **zero** violations on all three heart reports (Chromium desktop, WebKit desktop, Pixel 7).
- **Performance is excellent.** `perf-report.json`: LCP 780 ms, CLS ≈ 0.000003, FCP 556 ms; Three.js is a separate 327 KB gzip chunk excluded from the 226 KB initial payload; the stage reserves its height while loading.
- **Post-hydration metadata is right.** Title, description, canonical and OG tags become `Heart — Cardiovascular System · Anatomy Atlas` and `/organs/heart` correctly once React runs (verified in the live DOM).

## Issues

### 1 · High · 3D stage / error state — the no-WebGL fallback is illegible and overlaps the stage chrome

In [`organ-heart.png`](../../test-results/live/organ-heart.png) (identical to [`05-organ-heart.png`](../../test-results/screenshots/chromium-desktop/05-organ-heart.png)) the stage at 1280×800 is `x 654, y 193, 574×432`. The fallback title sits at `y 506–538` and the body copy at `y 544–584`, directly on top of the plate "SPECIMEN · CHEST & THORAX / Heart / Latin: Cor" at `y 496–562`; the caption at `y 580–595` and the hint at `y 604–621` collide with the foot bar (`y 543–625`). The result in the shipped artifact is visibly garbled: "The 3D body needs WebGL" is printed through "Heart", the explanatory sentence runs through "LATIN: COR", and "ROTATE AND ZOOM COME BACK WHEN WEBGL IS AVAILABLE" is clipped at the bottom edge. The same collision is visible at 360 px in [`360-organ.png`](../../test-results/screenshots/chromium-desktop/360-organ.png).

Root cause: `ViewerStage` always renders the plate, top-right badge and foot outside the error boundary (`src/components/ui/ViewerStage.tsx:113-139`), while the fallback is absolutely centered inside the viewer (`src/components/viewer/ViewerFallback.tsx:64-90`, `src/styles/viewer.css:131`), below the plate's `z-index: 4` (`src/styles/ui.css:1075-1082`). The fallback also promises "Every structure is still listed below", but on the organ page `onSelectOrgan` is not passed, so its own "Browse by name" list never renders (`ViewerFallback.tsx:73`); the only structures below are the four related organs.

**Fix:** Give the stage an explicit `ready | loading | fallback` mode and hide the plate/top-right/foot in fallback, or make the fallback replace the whole stage rather than float over it. Add a real route out ("Browse all cardiovascular structures", "Open in the 3D explorer") and only make the "listed below" claim where a list actually exists. Add a WebGL-disabled capture to the regression set.

### 2 · High · 3D learning — the focus view doesn't show the anatomy the copy teaches

The page names atria, ventricles and "four one-way valves", but the stage renders a glowing stylized heart with **no labels at all** (`showLabels={false}`, `src/pages/OrganPage.tsx:182`). The viewer's label system only knows organ-level entries (`src/components/viewer/ViewerLabels.tsx`), and the heart geometry is four ellipsoids plus vessels (`src/viewer/anatomy.ts:1096-1109`), not labelled chambers or valve meshes. In [`webgl-organ-heart.png`](../../test-results/live/webgl-organ-heart.png) the heart is a red mass in a ghost torso: it communicates *location* well, but not *structure*.

This matters because the platform's promise is "learn every part", and this entry's own text talks about parts the visual cannot point to. The four valves are never named anywhere in the entry (only "four one-way valves"; "aortic valve" appears once in a fact), so even a careful reader finishes without tricuspid/mitral/pulmonary/aortic.

**Fix:** Add a labelled mode for the organ stage — at minimum 2D callouts anchored to chamber/vessel points (right/left atrium, right/left ventricle, aorta, pulmonary trunk), toggled by a "Labels" control; or add a static labelled inset diagram to the "What it is" section, which would also give print an illustration. Add the four valve names to the function copy (one sentence), and consider a small "Inside the heart" sub-diagram. Keep the contextual body view, but let the learner see the parts.

### 3 · High · SEO / metadata — every organ URL is served with the homepage's canonical, title and OG tags

`curl -sL https://anatomy-atlas-b2m.pages.dev/organs/heart` returns the **homepage** head: `<title>Anatomy Atlas — Explore the Human Body in 3D</title>`, `<link rel="canonical" href="https://anatomy-atlas-b2m.pages.dev/" />`, and the homepage OG/Twitter cards. This is structural: `dist/_redirects` contains `/* /index.html 200`, and `usePageMeta` only updates the head after React mounts (`src/lib/seo.ts:38-66`). After hydration the values are correct (verified), so Google's renderer will eventually see them — but non-JS crawlers, Slack/iMessage/Discord unfurlers and link previews get the wrong canonical and a generic homepage card. Meanwhile `sitemap.xml` lists `/organs/heart` among 138 URLs, so the sitemap and the served canonical disagree. The only JSON-LD is the site-level `WebApplication`/`LearningResource` block (`index.html:41-56`); there is no `MedicalWebPage`/`Article` for the entry, no `citation`, no `lastReviewed`.

**Fix:** Prerender per-route HTML at build time (or inject head tags at the edge) for all 138 routes, including title, description, canonical, OG image and JSON-LD; add `MedicalWebPage`/`Article` with `about`, `citation` (the two source URLs), `lastReviewed` and `dateModified`; verify with `curl` and a social debugger. This is the single highest-leverage SEO fix on the site.

### 4 · Medium · 3D label — the selected-organ label renders unstyled at the stage's left edge

`ViewerLabels.tsx:127` creates the label `<div>` but never assigns the base `viewer-label` class (it only toggles `is-selected` at line 140). The live DOM is literally `<div class="is-selected" style="opacity: 1; transform: translate3d(12px, 203px, 0)">`; the pill CSS at `src/styles/viewer.css:85-113` never applies. Because the div is a full-width block, it measures 574 px, hits the right-edge clamp, and gets pinned to `x = 12`. In [`webgl-organ-heart.png`](../../test-results/live/webgl-organ-heart.png) that is the bare, 16 px "Heart" floating at `x 666, y 396`, roughly 250 px left of the heart and disconnected from the plate. On mobile the same label appears at `x 32` over the stage.

**Fix:** Set `node.className = 'viewer-label'` before appending (or `classList.add('viewer-label')`), and re-measure after the class is applied. Consider suppressing the selected label on the organ variant, where the plate already names the specimen; if kept, position it as a proper callout near the organ.

### 5 · Medium · Interaction / affordance — the stage captures scroll and explains only "drag"

At 1280×800, putting the cursor over the 574×432 stage and wheeling leaves `window.scrollY` at **0**; the same wheel 400 px outside the stage scrolls the page to 400. OrbitControls leaves zoom enabled by default (`src/components/viewer/CameraRig.tsx:227-243`), so the reading page's largest element silently zooms instead of scrolling. On mobile the R3F wrapper sets `touch-action: none` (documented as "one-finger orbit, pinch zoom" in `docs/VIEWER.md`), so a thumb swipe over the 372×400 stage rotates the model rather than moving the page. The only instruction is the 9 px caption "Drag to orbit · structure highlighted" (`OrganPage.tsx:194`); it never mentions scroll-to-zoom, there is no reset/zoom control, and the canvas has no grab cursor (`viewer.css:52-63`). The canvas `aria-label` still says "click an organ", though this page passes no `onSelectOrgan` (`ViewerCanvas.tsx:61`).

**Fix:** On the organ variant, make page scroll win: disable wheel zoom (or require Ctrl/Cmd), allow `pan-y` touch scrolling, and add explicit zoom-in/zoom-out/reset controls or a "Tap to interact" gate on mobile. Add `cursor: grab` / `grabbing` for pointer users, update the caption to "Drag to orbit · ⌘/Ctrl-scroll to zoom" (or just "Drag to orbit"), and give the canvas a variant-specific `aria-label` that does not promise selection here.

### 6 · Medium · Trust / provenance — sources are real but undated, unannotated and unreviewed on the page

The entry shows exactly two links (Cleveland Clinic — Heart; NHLBI — Heart) with hostnames only (`OrganPage.tsx:371-392`), no description of what each supports, no author, no medical reviewer and no "last reviewed" date. The project has this information internally — `src/data/reviews/cardiovascular.json` records `reviewedAt: 2026-10-21` — but never surfaces it. The About & sources page explains the editorial method well (`src/pages/AboutPage.tsx:70-75, 98-107`), but the entry does not link to it from the sources block, and `docs/CONTENT_SPEC.md:84` caps every organ at exactly two sources. For a health-adjacent learning product, "we checked it" needs to be visible where the claim is.

I spot-checked the claims and found **no factual errors**: weight 250–350 g and length ≈12 cm match [Jove](https://www.jove.com/science-education/v/15266/location-and-orientation-of-the-heart); 100,000 beats/day and >2.5 billion lifetime match [Cleveland Clinic](https://health.clevelandclinic.org/fun-facts-about-your-heart) and [PBS NOVA](https://www.pbs.org/wgbh/nova/eheart/facts.html); the left ventricle's ~3× wall thickness matches [Clinical Anatomy](https://www.clinicalanatomy.com/mtd/187-ventricle); coronary origins above the aortic valve match [NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK534790/). The gap is provenance presentation, not accuracy.

**Fix:** Add a "Written by · Reviewed <date>" line under the specimen strip (use the existing `reviewedAt`), a one-line annotation per source ("overview of heart anatomy and function", "heart-health reference"), and a "How we source entries" link to `/about`. Allow a third reference (AHA or NCBI Bookshelf) in the content spec for flagship organs, and do not claim clinician review unless a clinician actually reviewed it.

### 7 · Medium · Mobile IA — no in-page navigation on a 7,284 px page, and duplicated specimen data / CTAs

At Pixel 7 (412 px) the page is **7,284 px** tall, but the "In this entry" rail is `display: none` below 980 px (`src/styles/pages.css:2003-2005`), so mobile readers have no jump navigation at all. (The 360 px capture is 7,889 px.) The mobile aside then repeats the specimen strip: "Specimen data" renders Latin/System/Region/Also known as/Size (`OrganPage.tsx:448-475`) after the pager, while the strip already showed Location/Size/Region/System at `OrganPage.tsx:92-96, 209-226`. On desktop both are visible in the same viewport region. The entry also has three links to `/explore?organ=heart` ("Open in 3D", the stage's "Full explorer", and the aside's "Open in 3D explorer", `OrganPage.tsx:137-139, 196-204, 493-495`), two of which are visible within the hero/rail.

**Fix:** Add a collapsible "In this entry" disclosure above the article on mobile (and a small progress indicator), remove the duplicated System/Region/Size rows from the aside (keep Latin, AKA and keywords there), and keep one primary 3D CTA plus, at most, one contextual stage link. This also shortens the 7,000 px scroll.

### 8 · Low · Print — functional, but a six-page text dump with no masthead or figure

Print-to-PDF produces **6 A4 pages** for a ~1,500-word entry: page 1 hero+overview, page 2 functions (about half blank), page 3 facts, page 4 conditions, page 5 related organs, page 6 sources (mostly blank). Each `.organ-block` gets `break-inside: avoid` (`src/styles/pages.css:2409-2415`), forcing nearly every section onto a fresh page. The sheets carry no site name, canonical URL or review date, and the 3D stage is hidden with no static illustration — so the printed artifact loses both provenance and the visual that makes the page distinctive. Source URLs do print correctly (`pages.css:2384-2390`), which is good.

**Fix:** Allow breaks inside long blocks (keep `break-inside: avoid` only on cards/facts), tighten print spacing and type, add a print-only masthead ("Anatomy Atlas · /organs/heart · reviewed 2026-10-21"), and reuse the static labelled heart SVG from issue 2. Two or three pages would be a better keepsake than six half-empty ones.

## What would make this a 10

1. **Make the stage trustworthy in every state.** Fix the label class, reserve space for the fallback, and resolve the mobile plate/caption collision with a container-driven layout (or drop the plate on small stages). Add WebGL-on and WebGL-off visual tests at 360, 768 and 1280.
2. **Turn the 3D from a mood piece into a teaching diagram.** Label the chambers, valves and great vessels (or add a labelled SVG inset), name the four valves in the copy, and make the stage scroll-safe with visible zoom/reset affordances and a truthful `aria-label`.
3. **Show the provenance you already have.** Surface the review date, annotate the two sources, add a third for flagship organs, link "How we source entries", and emit per-entry `MedicalWebPage` JSON-LD. Prerender the head tags so every organ URL carries its own canonical and OG card.
4. **Tighten the editorial system.** One metadata block, one 3D CTA, a mobile TOC disclosure, a 2×2 or 4-up related grid (the current 3-up leaves Lungs orphaned on a second row), lowercase "the pump", and a meta description that doesn't end on "and…".

## Bottom line

The Heart entry is the best *reading* surface in the atlas and a strong piece of science writing. The 3D stage is the weak link: it looks expensive but currently fails in its error state, collides with its own chrome on phones, labels nothing, and steals the scroll. Fix the stage and the served metadata, and this page moves from "good with visible seams" to genuinely flagship.
