# Anatomy Atlas — Build Architecture & Team Contract

> Read this before writing any code. It defines the stack, contracts, and **file ownership**. Violating ownership
> causes merge conflicts in a shared workspace.

Repo: `/Users/shanto/Documents/deepseek-harness/default-workspace/anatomy-atlas`
GitHub: https://github.com/shanto12/anatomy-atlas
Live: https://anatomy-atlas-b2m.pages.dev (Cloudflare Pages — Netlify accounts are credit-blocked)
Content spec: `docs/CONTENT_SPEC.md`
Reference teardown: `docs/REFERENCE_TEARDOWN.md`

## Product

A free, interactive 3D human anatomy learning platform for curious beginners. The centerpiece is a stylized,
rotatable/zoomable human body with clickable organs and selectable systems. Around it: authoritative organ entries,
12 guided lessons, explained quizzes, a glossary, and search.

Design direction: warm parchment + ink + oxblood, editorial serif (Fraunces) with Inter UI, museum-label typography,
a dark “anatomy theatre” stage for the 3D body. Premium, calm, not clinical. Use the design tokens in
`src/styles/tokens.css`; do not invent a second palette.

## Stack (already installed — do not reinstall)

- Vite 6 + React 19 + TypeScript 5.9 (strict), React Router 7 (`BrowserRouter`)
- three 0.172 + @react-three/fiber 9 + @react-three/drei 10
- lucide-react icons, clsx
- @fontsource-variable/fraunces + @fontsource-variable/inter (imported in `src/main.tsx`)
- Vitest 2 (unit), Playwright 1.64 + @axe-core/playwright (e2e/a11y)
- Hosting: Cloudflare Pages via `npx wrangler pages deploy dist --project-name anatomy-atlas --branch main`
  (`CLOUDFLARE_ACCOUNT_ID=4c936f21d17be8ba59a88e6e89bece09`)

Commands: `npm run dev`, `npm run build` (typecheck + build), `npm run test`, `npm run test:e2e`,
`npm run content:validate`, `npm run deploy`.

Path alias `@/` → `src/`.

## Routes (already wired in `src/App.tsx`)

| Route | Page component | Owner |
|---|---|---|
| `/` | `HomePage` | ui-dev |
| `/explore` | `ExplorePage` | viewer-dev |
| `/systems` | `SystemsPage` | ui-dev |
| `/systems/:systemId` | `SystemPage` | ui-dev |
| `/organs/:organId` | `OrganPage` | ui-dev |
| `/learn` | `LearnPage` | learning-dev |
| `/learn/:lessonId` | `LessonPage` | learning-dev |
| `/quiz` and `/quiz/:systemId` | `QuizPage` | learning-dev |
| `/glossary` | `GlossaryPage` | learning-dev |
| `/about` | `AboutPage` | ui-dev |
| `*` | `NotFoundPage` | ui-dev |

The app shell (`AppShell`: header, nav, footer, search mount) is owned by **ui-dev**. `main.tsx` and `App.tsx` are
owned by the **Lead** — request changes instead of editing them.

## Data model

Types: `src/lib/types.ts` (Lead-owned, stable). Data access: `src/data/index.ts` (content-integrator-owned).

`src/data/systems/<id>.json` → `AnatomySystem` with `organs[]`, `lesson`, `quiz[]`. There are 12 systems:
skeletal, muscular, nervous, cardiovascular, respiratory, digestive, endocrine, immune, urinary, reproductive,
integumentary, sensory. Organ IDs are globally unique and fixed by `docs/CONTENT_SPEC.md`.

Exports from `@/data`:

```ts
systems, systemsById, organs, organsById, lessons, lessonsById, siteStats,
glossary, facts, history, regions,
getSystem(id), getOrgan(id), getOrgansForSystem(id), getRelatedOrgans(organ),
getSystemForOrgan(organ), getLesson(id), searchOrgans(query, limit)
```

Supplementary JSON (generated in parallel): `glossary.json` (`GlossaryTerm[]`), `facts.json` (`Fact[]`),
`history.json` (`HistoryEvent[]`), `regions.json` (`RegionInfo[]`). Do not invent their content in UI code —
read from `@/data`.

## Contracts (do not change without messaging the Lead)

### 1. 3D viewer — `src/components/viewer/BodyViewer.tsx` (viewer-dev)

Default export, props in `src/components/viewer/BodyViewer.tsx`:

```ts
interface BodyViewerProps {
  variant?: 'hero' | 'explore' | 'organ' | 'system';
  activeSystems?: SystemId[] | null;      // null/undefined = all
  selectedOrganId?: string | null;
  onSelectOrgan?: (organId: string | null) => void;
  showSkin?: boolean;
  showSkeleton?: boolean;
  showLabels?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  controls?: boolean;
  className?: string;
  resetSignal?: number;                   // increment to reset camera
  focusOrganId?: string | null;
  focusSignal?: number;                   // increment to focus camera on focusOrganId
}
```

Must: render a recognizable stylized human body (procedural geometry is fine), support orbit/zoom, highlight and
pick organs, show system layers, be keyboard-fallback friendly (organ lists exist in the page UI), handle WebGL
failure gracefully, and avoid unbounded re-renders. Every organ ID from the spec needs a visible representation
(position table can be authored in `src/viewer/`). Hero variant must look beautiful on first paint.

### 2. Search overlay — `src/components/search/SearchDialog.tsx` (learning-dev)

```ts
interface SearchDialogProps { open: boolean; onClose: () => void }
```

Rendered once by AppShell. Must support ⌘K/Ctrl-K opening (AppShell handles the shortcut), Escape/backdrop close,
autofocus, arrow-key navigation, Enter to navigate, grouped results (organs, systems, lessons, glossary), and
`role="dialog"`/focus management.

### 3. Progress store — `src/lib/progress.tsx` (learning-dev)

`ProgressProvider` wraps the app in `main.tsx`; `useProgress()` returns:

```ts
{
  state: {
    completedLessons: string[];
    quizBest: Record<string, { score: number; total: number; at: string }>;
    exploredOrgans: string[];
    bookmarks: string[];
  };
  markLessonComplete(id: string): void;
  isLessonComplete(id: string): boolean;
  saveQuizResult(quizId: string, score: number, total: number): void;
  getQuizBest(quizId: string): { score: number; total: number; at: string } | undefined;
  markOrganExplored(id: string): void;
  exploredCount: number;
  toggleBookmark(id: string): void;
  isBookmarked(id: string): boolean;
  resetProgress(): void;
}
```

localStorage key `anatomy-atlas:progress:v1`, guarded for private mode/corrupt JSON. Progress is device-local and
never sent anywhere.

### 4. SEO — `src/lib/seo.ts` (Lead)

Every page calls `usePageMeta({ title, description, path })`.

### 5. System icon — `src/components/ui/SystemIcon.tsx` (ui-dev)

```ts
interface SystemIconProps { systemId: SystemId; size?: number; className?: string }
```

A distinct lucide icon per system, colored with `currentColor` (parent sets `--sys`/color). Must exist for all 12.
Other agents may import it.

## File ownership matrix

| Owner | Write scope |
|---|---|
| **Lead** | `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/lib/types.ts`, `src/lib/seo.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `public/**`, `docs/ARCHITECTURE.md`, `docs/CONTENT_SPEC.md`, `README.md`, deploy config |
| **viewer-dev** | `src/viewer/**`, `src/components/viewer/**`, `src/pages/ExplorePage.tsx`, `src/styles/viewer.css`, `docs/VIEWER.md` |
| **ui-dev** | `src/components/ui/**`, `src/components/layout/**`, pages `Home`, `Systems`, `System`, `Organ`, `About`, `NotFound`, `src/styles/ui.css`, `src/styles/pages.css` |
| **learning-dev** | `src/components/learn/**`, `src/components/search/**`, pages `Learn`, `Lesson`, `Quiz`, `Glossary`, `src/lib/progress.tsx`, `src/lib/search.ts`, `src/lib/quiz.ts`, `src/styles/learn.css` |
| **content-integrator** | `src/data/**` (including systems JSON fixes), `scripts/validate-content.mjs`, `docs/CONTENT_REPORT.md` |
| **qa-dev** | `tests/**`, `playwright.config.ts`, `vitest.config.ts`, `docs/QA_REPORT.md`, `test-results/**` |

Rules:
- Only edit files in your scope. Need a change elsewhere? Message the Lead.
- Do not run `npm install`/`pnpm` or change dependencies. If a dependency is genuinely required, message the Lead.
- Do not run `git commit`, `git push`, or deploy. The Lead owns git and deployment.
- Content JSON is generated by the Lead's content agents; content-integrator may fix it but should not rewrite
  good prose or invent new organs.
- Every teammate must run `npm run build` when done and report the result. QA runs the full suite.
- Use `npm run dev`/Playwright locally; do not start long-lived servers on port 80/443. Vite dev server is fine.

## Design requirements

- Responsive down to 360px; no horizontal scroll. Mobile: viewer + list-based organ navigation (canvas must not
  block reading).
- Accessible: semantic landmarks, visible focus, keyboard-operable controls, `aria-*` on canvas alternatives,
  prefers-reduced-motion respected, color contrast AA, skip link (already in AppShell).
- Performance: lazy-load heavy three.js where sensible; no layout shifts; total initial JS budget ~<450 KB gzip
  excluding the 3D chunk.
- Voice: warm, precise, editorial. No generic AI copy (“delve”, “in today's fast-paced world”). Use the content
  already authored; do not duplicate organ facts in UI copy.

## Current status (Lead-managed)

- [x] Repo + GitHub + Cloudflare Pages smoke-tested
- [x] Vite/React/TS scaffold, tokens, routes, shared types, placeholder pages
- [ ] 12 system content files being generated/fact-checked in parallel
- [ ] Supplementary content (glossary/facts/history/regions) in parallel
- [ ] 3D viewer, final UI, learning features, QA, deploy
