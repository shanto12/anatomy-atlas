# Review — Glossary and About / Sources

**Scope:** `/glossary` and `/about` — glossary search, topic/letter filters, definition quality, sourcing and disclaimer, the history timeline, mobile behaviour, metadata and accessibility.

**Evidence base:** `test-results/live/glossary.png`, `test-results/live/about.png`, `test-results/screenshots/chromium-desktop/glossary.png`, the glossary/about axe JSON files in `test-results/reports/`, the source listed below, and a live pass on 21 Oct 2026 at 1280 × 800 and 390 × 844 (Chromium, production URL).

**Method note — read the tall screenshots with care.** `test-results/live/about.png` is largely blank between the hero and the timeline because `.reveal` sections start at `opacity: 0` until an IntersectionObserver fires (`src/styles/base.css:318-334`); a full-page capture never scrolls, so it records the pre-reveal state. On the live page the content reveals normally as you scroll (verified section by section), and the print stylesheet explicitly restores it (`src/styles/pages.css:2379-2382`). Similarly, the 23,066 px glossary capture stops painting after roughly 21,400 px (the live page renders Villus → X-ray → Zygote correctly), and `test-results/screenshots/mobile-pixel-7/glossary.png` has a stitched missing column. Those are capture limits, not product defects; the findings below use the live DOM and computed styles where the screenshots stop.

---

## Verdict

**Polish.** This is one of the strongest content surfaces in the product. The glossary is a real reference — 120 plain-English definitions, eight topic filters, resolved cross-references, deep links and a genuinely useful sticky letter heading — and the About page has the voice and visual confidence of a museum catalogue rather than a startup trust page. What holds it back is not craft but **provenance honesty and navigation feedback**: the Sources section lists a bibliography that is not the one in the data, the search field's own example returns nothing, and the A–Z controls give no visible result where the click happens. None of that breaks a core journey; all of it costs the trust the design is working so hard to earn. Fix the seven items below and this pair is comfortably a 10.

---

## Score

**8 / 10** — editorial design 9, content quality 9, glossary UX 7, trust/sourcing 6.5, accessibility 7.5, metadata 6.5.

---

## Strengths

- **A coherent editorial language.** Fraunces display type, parchment, oxblood italic and gold rules carry from the glossary masthead through the numbered method cards, pull quote and timeline. The glossary terms are set in the display face while definitions stay at a measured 68ch (`src/styles/learn.css:2366-2376`), so the page reads as a dictionary designed by a book designer, not a database dump.
- **The glossary is substantive, not decorative.** All 120 definitions are short (median 18 words, 15–29 range), plain-English, and readable without a biology background. Every one of the cross-references resolves (`npm run content:validate` reports 0 errors / 0 warnings for the 120 entries), and the eight categories carry honest counts. Directly linked terms get a gold flash (`GlossaryExplorer.tsx:91-115, 287`), which makes `?/#alveolus`-style links from search feel intentional.
- **The filters and states are built with care.** Topic chips use `aria-pressed` and counts; the letter rail disables empty letters and gives each one an accessible count (`GlossaryExplorer.tsx:189-226`); the result count is a polite live region; the no-results and empty-glossary states both offer a real way out (`GlossaryExplorer.tsx:244-267`). The sticky per-letter `h2` (`learn.css:2292-2303`) is a small, excellent touch for a long alphabetical page.
- **Trust is at least attempted in the right places.** Every one of the 95 organ entries has exactly two specific source pages, not homepages (188 unique URLs, all HTTP 200 at the last audit per `docs/CONTENT_REPORT.md` §4), and the About page exposes the correction path, the GitHub repository, the privacy posture and a real disclaimer. That is more than most anatomy sites do.
- **The disclaimer is clear and reachable, not decorative.** It is a `role="note"` with a labelled heading, two direct paragraphs including emergency guidance (`AboutPage.tsx:263-287`), a footer line on every page ("Educational content only. Not medical advice.") and a `/about#disclaimer` link (`AppShell.tsx:264`). This is exactly the right tone for a learning tool: educational scope, no diagnosis, no treatment.
- **The timeline is accurate in the specifics I checked.** The 16 entries are well written and correctly sequenced. Targeted checks confirmed the Ebers Papyrus's 1872 acquisition ([HathiTrust introduction](https://babel.hathitrust.org/cgi/ssd?id=coo.31924073200077;seq=43;num=1#1)), Ibn al-Nafis's c. 1242 pulmonary circulation ([Library of Congress](https://www.loc.gov/item/2021667365)), the first clinical CT scan at Atkinson Morley's in October 1971 ([BMJ obituary](https://pmc.ncbi.nlm.nih.gov/articles/PMC1444860/pdf/bmj33200978.pdf#1#1)) and FlyWire's ~140,000 neurons / 50 million synapses in 2024 ([Nature](https://www.nature.com/immersive/d42859-024-00053-4/index.html#1)). A full read of the 120 definitions surfaced no factual errors.
- **Performance is not the problem with the long page.** Rendering all 120 entries costs 1,838 DOM nodes and no images on `/glossary`; the latest performance run reports LCP 780 ms and CLS ≈ 0.000003 (`test-results/reports/perf-report.json`), with Three.js split out of the initial bundle (`bundle-report.json`). The 23,000 px length is an information-architecture choice, not a rendering failure.

---

## Issues

### 1. The “Sources” section describes a bibliography that is not the one the atlas cites — **High · About / trust**

**Evidence.** The page says: “Every organ entry cites two stable pages from the libraries below. These are the institutions the atlas leans on; no single entry depends on any one of them.” (`src/pages/AboutPage.tsx:193`). The six cards below it are MedlinePlus, NIH, Cleveland Clinic, Mayo Clinic, Johns Hopkins Medicine and Encyclopaedia Britannica (`AboutPage.tsx:23-60, 198-211`). The actual 190 organ-source slots are distributed as: Cleveland Clinic 57, **TeachMeAnatomy 43**, **Kenhub 40**, MedlinePlus 35, NIH 14, Yale 1. So **83 of 190 slots (44%) come from two publishers that are not listed**, while **Mayo Clinic, Johns Hopkins and Britannica appear zero times**. The second sentence is also false in three entries that cite two pages from the same publisher: Vena Cava (both Kenhub, `src/data/systems/cardiovascular.json:543-549`), Pulmonary Arteries (both Kenhub, `cardiovascular.json:618-624`) and Radius and Ulna (both TeachMeAnatomy, `src/data/systems/skeletal.json:677-683`). The footer’s “Reference libraries” link also bypasses this page entirely and opens MedlinePlus (`AppShell.tsx:255-262`), while the Sources section has no `id` to link to.

**Recommended fix.** Generate the reference cards from the actual source data (or at minimum, add Kenhub and TeachMeAnatomy with a one-line description and remove or relabel unused institutions as “also consulted”). Change the promise to what the data supports — “at least two references, each on a specific page” — and fix the three single-publisher entries. Give the section `id="sources"` and point the footer link at it. This is the trust page; it should not require a data audit to be true.

---

### 2. The search field’s own example, “reflex”, returns nothing — **High · Glossary / search**

**Evidence.** The input placeholder is `Try “alveolus” or “reflex”` (`src/components/learn/GlossaryExplorer.tsx:144`). There is no Reflex entry in `src/data/glossary.json`; typing the suggested word on the live page returns **“0 of 120 terms”** and the empty state **“No terms match that combination.”** (`GlossaryExplorer.tsx:260-267`). This is the first suggested action in the product’s primary lookup surface, and it lands on a dead end with no spelling suggestion, no “browse A–Z” path, and copy that describes a single word as a “combination.” “Alveolus” works (2 results), which makes the failure look like an oversight rather than a deliberate limitation.

**Recommended fix.** Add a Reflex entry (e.g. “An automatic, involuntary response to a stimulus, such as the knee-jerk reflex, usually routed through the spinal cord without waiting for the brain.”) and make the placeholder examples derive from the dataset so they cannot go stale. In the empty state, name the query and offer a next step: “No entry for ‘reflex’. Try one of these: … / Browse all 120 terms.” Add a test asserting every placeholder example returns at least one term.

---

### 3. Search and A–Z feedback happens below the fold, and the controls scroll away — **High · Glossary / navigation**

**Evidence.** `.glossary-explorer__tools` is a normal static block (`src/styles/learn.css:2120-2125`), so the only controls for a 23,066 px page disappear as soon as you scroll. At 1280 × 800 the letter rail sits at y ≈ 745, the live result count at y ≈ 829 and the first entry at y ≈ 881. Typing the working query “heart” returns **“11 of 120 terms”**, but `scrollY` stays 0 and both the count and the first result are below the viewport; clicking “M” (or “Z”) behaves the same way, so **the only visible change is the letter button turning dark**. On a 390 × 844 phone the tools panel is 444 px tall, the search status is at y ≈ 865 and the first term at y ≈ 950 — the reader must pass the hero, eight topic chips and three rows of letters before seeing any answer. The mobile letter targets are 24 × 28 px (`learn.css:2902-2907`), well below comfortable touch size. The global back-to-top button exists, but using it to change letter is a two-step recovery, not navigation.

**Recommended fix.** Make the search + topic + letter rail sticky under the header once the tools scroll out (or add a compact sticky bar with the current filter and a “Filters” popover), put the live count next to the search/rail, and on any search or filter change scroll the result list into view or focus the first group heading without stealing keyboard focus. On mobile, collapse the eight chips behind a single “Topics” disclosure and give the letter row 44 px targets or a horizontally scrollable row. Encoding `?q=…&letter=M&topic=…` in the URL would also make filtered views shareable.

---

### 4. The glossary’s letter headings and metadata labels fail WCAG AA contrast, and the axe artifacts cannot see it — **Medium · Accessibility**

**Evidence.** The visual hierarchy is beautiful, but two of its supporting colours do not meet AA on the parchment ground:

- `.glossary-group__heading` is `--gold` `#b9863b` at 32 px on `--paper` `#f4eee3` — **2.78:1**, below the 3:1 required for large text (`learn.css:2292-2303`, `tokens.css:8,27`). Visible in `test-results/live/glossary.png` as the pale A/B/C letters.
- The category tag is `--ink-4` `#8f8678` at **9.5 px** on paper — **3.11:1**, below 4.5:1; the “RELATED” caps label is 11 px at the same colour (`learn.css:2345-2354, 2382-2385`, `tokens.css:20-21`). These labels carry meaning (topic and relationship), so they are not decorative.

`test-results/reports/a11y-chromium-desktop-glossary.json` and the mobile equivalent report `"all": []`. The reason is not that the page passes: axe returns `color-contrast` as **incomplete** on this page because the body has a gradient (“Element's background color could not be determined due to a background gradient”), and the report helper persists only `violations`, not `incomplete` (`tests/e2e/helpers.ts:191-229`). I re-ran axe live: 0 violations, 1 incomplete group.

**Recommended fix.** Use a darker gold (or ink) for the letter headings and `--ink-3` `#6d6559` (4.97:1) for the category and “RELATED” labels; consider raising the 9.5 px tag to at least 11 px. Add a manual contrast check for the token pairs that sit on gradients, and include axe `incomplete` results in the accessibility report so a clean JSON cannot hide a real AA failure.

---

### 5. Precise claims are presented without a named reviewer, a review date, or citations — **Medium · Trust / provenance**

**Evidence.** The page is framed as a careful editorial object (“Written from references”, “Checked against the source”, “No atlas is finished”), yet it names no author, editor or medical reviewer and gives no “last reviewed” date (`AboutPage.tsx`, whole file). The data model cannot carry citations for the two content types that most need them: `GlossaryTerm` and `HistoryEvent` have no source or review fields (`src/lib/types.ts:135-155`), and neither `src/data/glossary.json` (120 records) nor `src/data/history.json` (16 records) contains a single source URL. The timeline makes precise, checkable claims — Georg Ebers acquiring the papyrus in 1872, the HGP’s $3 billion and 2001/2003/2022 sequence, FlyWire’s 140,000 neurons — and they check out, but a reader has no way to verify any of them from the page. For a health-adjacent reference, “trust us” is the one thing the design cannot supply on its own.

**Recommended fix.** Add a compact provenance band near the disclaimer: “Written by … · Reviewed by … · Last reviewed October 2026”, linked to a short “How we check” paragraph. Extend `HistoryEvent` and `GlossaryTerm` with optional `sources`/`reviewedAt`, then render a discreet source line per timeline milestone (Nobel Prize, Nature, FlyWire) and a single glossary-wide provenance note linking to About. The content is already good enough to survive that scrutiny; showing the receipts would make it earned.

---

### 6. `/glossary` and `/about` serve the homepage head to anything that does not run React — **Medium · SEO / metadata**

**Evidence.** `curl -sL https://anatomy-atlas-b2m.pages.dev/glossary` and `/about` both return `<title>Anatomy Atlas — Explore the Human Body in 3D</title>`, `<link rel="canonical" href="https://anatomy-atlas-b2m.pages.dev/" />`, `og:title` and `og:url` pointing at the root. The route-specific tags in `usePageMeta` are applied only in a React effect (`src/lib/seo.ts:40-76`), while the served shell is static `index.html:6-25`. The sitemap correctly lists both URLs, so discovery and the served document disagree; social scrapers and non-JS crawlers will treat the glossary and the About page as the homepage. This is the same SPA-shell issue as the lesson review, but here it undercuts the two pages whose job is credibility and reference.

**Recommended fix.** Prerender these two routes at build time (both are static data) or inject route-specific `<title>`, description, canonical and OG tags at the edge. Add `DefinedTermSet`/`DefinedTerm` JSON-LD for the glossary, and `AboutPage`/`MedicalWebPage` with `reviewedBy` and `dateModified` for About. Use a glossary-specific OG image rather than the homepage card.

---

### 7. Chronology years wrap mid-phrase on desktop — **Low · Visual typography**

**Evidence.** In `test-results/live/about.png`, the Ebers and Hippocratic rows read “c. 1550” / “BCE” and “c. 400” / “BCE” on two lines. The year column is fixed at 130 px (`src/styles/pages.css:1592-1605`) while `.history-item__year` is up to 2rem in the display serif; at 390 px the row becomes one column (`pages.css:2146-2149`) and the wrap disappears, so this is a desktop-only break in an otherwise very controlled timeline.

**Recommended fix.** Give `.history-item__year` `white-space: nowrap` and widen the column to ~150 px, or reduce only the `c.` dates to a slightly smaller optical size. The two-line break should be intentional or absent, not accidental.

---

## What would make this a 10

1. **A Sources section generated from the bibliography.** Show every publisher the atlas actually uses, with real counts and links; link the footer’s “Reference libraries” to `/about#sources`; make the “two references” promise true for all 95 entries. The data is already strong enough to display honestly.
2. **A visible provenance layer.** Named editor and medical reviewer, a “last reviewed” date, and per-milestone sources. The timeline’s prose reads like a well-edited museum label — give it the same citation apparatus a museum label has.
3. **Glossary navigation that stays with the reader.** A sticky search/filter bar, a result count next to the active filter, focus/scroll handling on filter change, and shareable filtered URLs. The sticky letter is the right idea; extend it one level up to the controls.
4. **Accessibility that trusts its own numbers.** Replace the low-contrast gold/ink-4 labels, include axe `incomplete` results in CI, and check the token pairs against the gradient ground. The zero-violation JSON should mean “we checked”, not “axe could not tell”.
5. **Fix the two small trust leaks.** Make “reflex” a real entry (or stop suggesting it), and keep the chronology years on one line. These are trivial changes with an outsized effect on the impression of care.

The bones of a 10 are already here: the definitions are accurate and humane, the timeline is genuinely interesting, and the disclaimer and correction path are honest. The next pass is about making the page's claims about itself as accurate as its claims about the body.
