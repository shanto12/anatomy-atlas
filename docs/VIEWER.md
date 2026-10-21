# Viewer & Body Explorer — implementation notes

Owner: **viewer-dev**. Scope: `src/viewer/**`, `src/components/viewer/**`, `src/pages/ExplorePage.tsx`,
`src/styles/viewer.css`, this file.

The 3D body is the product's front door: a procedural, glass-and-bone "anatomy theatre" mannequin on a
warm dark stage. Everything is generated in code — no models, textures, or HDR files are downloaded.

## How it fits together

```
src/viewer/
  types.ts        Internal geometry/placement types (body space, +y up, +z anterior)
  systems.ts      The 12 system accents/names (matches CONTENT_SPEC; content JSON overlays it)
  authoring.ts    Tiny helpers for authoring parts (ellipsoid, tube, shell, …)
  bodyData.ts     Torso cross-section profile, limb centre lines, hands/feet → one merged skin mesh
  skeletonData.ts Bone groups, each bound to a skeletal organ id
  anatomy.ts      The placement table: one representation for every organ id in CONTENT_SPEC (95)
  geometry.ts     Geometry builders + module-level caches (organ merges, skeleton, skin, textures)
  materials.ts    Material factory (skin, fresnel rim, bone, organ, floor, glow sprite)
  catalog.ts      Merges @/data content with the placement table for the explorer UI
  controls.ts     Tiny zoom bus used by the explorer's zoom buttons
  webgl.ts        WebGL capability detection
  useReducedMotion.ts

src/components/viewer/
  BodyViewer.tsx      Public component + WebGL failure/fallback handling, lazy canvas
  ViewerCanvas.tsx    <Canvas>, tone mapping, canvas aria role/label, context-loss handling
  ViewerScene.tsx     Composition + system scoping + skin opacity rules
  CameraRig.tsx       OrbitControls, damped home/reset/focus/zoom animation
  StageEnvironment.tsx Lights, procedural studio environment, stage floor, rings, halo
  BodyLayer.tsx       Skin mesh (merged), fresnel rim, subcutaneous-fat shell
  SkeletonLayer.tsx   Bone rig; each group is a pickable organ
  OrganLayer.tsx      One mesh per organ (all non-skeletal systems)
  ViewerLabels.tsx    Imperative, collision-aware DOM labels
  SelectedGlow.tsx    Additive halo sprite + tinted point light on the selected organ
  ViewerFallback.tsx  Accessible text/list fallback (loading / no-WebGL / context lost)
```

## Anatomy model

- **Body space**: feet at `y = 0`, crown at `≈ 8.05`, shoulders at `≈ 6.6`, hips at `≈ 4.1`. Roughly eight
  head-heights, which is what makes the silhouette read as human at a glance.
- **Skin**: one merged geometry from an elliptical torso sweep plus tapered tubes for limbs, a sculpted
  head, hands, and feet. Rendered as a warm ivory `MeshPhysicalMaterial` with low opacity, plus a
  custom fresnel shell for a glass-specimen edge.
- **Skeleton**: 12 pickable bone groups (skull, mandible, vertebral column, ribcage, sternum, pelvis,
  femur, humerus, radius/ulna, scapula, clavicle, patella) plus a decorative group for hands, feet,
  tibia/fibula, and hyoid. Ribs are swept curves; vertebrae follow an S-curve with spinous processes.
- **Organs**: 95 representations, one per organ id in `docs/CONTENT_SPEC.md`. Shapes are assembled from
  ellipsoids, tapered tubes (Catmull-Rom + Frenet frames), shells, rings, and clusters. Networks
  (arteries, veins, capillaries, peripheral nerves, lymphatics) are procedural branch sets. Paired
  organs are merged so left and right highlight together, as an educational atlas should.
- Music note: the model is stylised, not diagnostic. Reproductive anatomy shows both sets schematically
  in the pelvis because the content spec defines one body; this is called out in the page copy ("stylised
  teaching model — not a diagnostic image").

## Selection, camera, and controls

- **Picking**: transparent skin is not hit-testable (except in the Integumentary filter); organs, bones,
  and integumentary organs are. Hovering sets a pointer cursor, lifts the label, and brightens the
  material's emissive. Clicking a structure calls `onSelectOrgan(id)`; clicking empty space deselects
  (guarded so a fresh pick is never immediately cleared).
- **System layers**: `activeSystems` scopes which organ meshes render. Muscles are veiled when all
  systems are on so internal organs stay readable. A selected organ is always rendered even if its
  system is filtered out.
- **Focus** (`focusSignal` + `focusOrganId`): damped camera flight to the structure. Each variant uses a
  different framing distance: `organ` fills the frame (and isolates the system, hides the skeleton,
  virtually hides skin), `explore` keeps body context, `system` frames more broadly. The camera keeps
  its current orbit direction while it flies, and any user drag cancels the animation. Reduced motion
  snaps instead of animating.
- **Reset** (`resetSignal`): returns to the default view. Default views are composed per variant and
  nudged right/down for the hero so the museum plate never collides with the head; portrait stages pull
  back automatically.
- **Zoom buttons** call `viewerControls.zoom(factor)` from `src/viewer/controls.ts`; the rig dollies
  about the orbit target with bounds `2.2–30`.
- **Auto-rotate** uses OrbitControls; it is disabled for `prefers-reduced-motion` and paused during
  focus flights.
- **Mobile**: one-finger orbit, pinch zoom, `touch-action: none` on the canvas; the explorer turns the
  selected-organ panel into a bottom sheet.

## Explore page

- Dark stage with system chips (all 12 + All), counts, and color dots. Wide screens wrap chips; narrow
  screens use a snapped horizontal rail with a fade affordance.
- Camera tools (zoom in/out/reset) and layer toggles (skin, skeleton, labels, auto-rotate) are real
  `<button>`s with `aria-label`/`aria-pressed`.
- Searchable organ list grouped by system; selecting a row updates the URL and eases the camera in.
- Selected-organ panel: system, name, Latin name, tagline, first summary paragraph, hero stat, region,
  "Open full entry" (→ `/organs/:id`) and "Frame in 3D". Escape or the close button clears the selection
  and resets the camera.
- Deep links: `/explore?system=cardiovascular` and `/explore?organ=heart` (combinable). Unknown ids are
  ignored rather than crashing. `?organ=` triggers the focus flight on load.
- Missing content is safe: the catalogue is complete from the placement table, and the panel shows an
  "entry being written" state when `@/data` does not yet have the organ.
- No WebGL: the stage renders an accessible silhouette plus a real list of organs in the active systems.

## Performance notes

- The three.js canvas is a lazily imported chunk (`ViewerCanvas`), so first paint does not wait for it.
- Geometry is built once, merged per organ, cached, and shared. No per-frame allocations in `useFrame`
  paths; label DOM is updated imperatively.
- DPR capped at `[1, 1.75]`, no shadow maps (a baked gradient floor shadow is used instead), procedural
  environment at 128px, ACES tone mapping.
- `frameloop` stays `always` for damped OrbitControls and auto-rotate; all React state changes are
  event-driven.

## Accessibility

- Canvas exposes `role="img"` and an `aria-label`; the same structures exist as a keyboard-operable
  list in the explorer and in the fallback.
- All controls are buttons with visible focus (`--gold-soft` outline on the dark stage), labels are 12px+
  with AA-oriented contrast, and the theme respects `prefers-reduced-motion` (camera snaps, auto-rotate
  disabled, fallback heartbeat stopped).

## Adding or adjusting an organ

1. Add/adjust the entry in `src/viewer/anatomy.ts` using the `organ(...)` helper; parts are authored in
   body space. Give it the system accent color (individual tints are allowed within the family).
2. If it is a bone, add its geometry to `skeletonData.ts` under the matching organ id instead of
   `anatomy.ts` parts.
3. Keep the organ id exactly as specified in `docs/CONTENT_SPEC.md` — the explorer, `/organs/:id`, and
   the content JSON all key off it.
4. `npm run build` to typecheck; content for the new organ can land independently.
