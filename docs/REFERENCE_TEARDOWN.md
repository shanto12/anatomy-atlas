# Reference Teardown — Learn Arduino (learn-arduino-red.vercel.app)

**Reviewed:** 21 Oct 2026 · Chromium 156 headless, 1440×900, 1024×768 and 390×844 · App: <https://learn-arduino-red.vercel.app/> · Author credited: Dilum Sanjaya.

## Executive summary

Learn Arduino is a single-page, illustrated **3D textbook** for 11 free beginner Arduino lessons. It looks and behaves less like a course platform and more like a beautifully printed electronics poster that happens to be interactive: warm paper background, fine 1.5 px rules, condensed uppercase display type, deep-navy ink, one teal accent, and a large procedural three.js Arduino/breadboard scene at the centre.

The core loop is: pick a lesson from the bottom rail (or sidebar) → the camera eases to a pre-wired circuit → read 3–6 anchored callouts and a four-tab brief → adjust physical parameters by clicking/dragging parts → press **Run** → a scripted “compile / upload” runs, the serial monitor prints, the LEDs/motor/servo/sensor react, and the lesson is automatically marked complete. There are **no quizzes, no knowledge checks, no scoring, and no code editing**. “Try it yourself” means changing physical parameters (resistance, colour, timing, distance) while the code stays read-only and updates inline.

For an anatomy platform, the transferable value is the **annotation-and-camera system**, not the Arduino content model: per-lesson camera framing, collision-aware leaders, a contextual inspector, a consistent lesson schema (lay summary → 3 takeaways → tabbed detail → simulation), and an unusually polished visual language. The cautionary lessons are equally strong: a blocking 20-second loader, a fixed 1672×941 artboard that scales the whole UI down, hidden annotations on mobile, no retrieval practice, and a 3D canvas that cannot be operated by keyboard.

## Information architecture

**Routing and state**

| Concern | Implementation |
|---|---|
| Route | One page, `/`; lessons are hash fragments `#board`, `#blink`, `#button`, `#knob`, `#rgb`, `#light`, `#sensor`, `#sound`, `#motor`, `#servo`, `#project` |
| Deep link | Hash is read once at boot; `#project` loads the last lesson directly |
| History | Only `history.replaceState(null, "", "#" + id)`; no `pushState`, no `hashchange`/`popstate` listener. Browser Back leaves the app rather than going to the previous lesson |
| Document title | `${lesson.title} · Learn Arduino` (e.g. “Blink an LED · Learn Arduino”) |
| Persistence | `localStorage`: `learn-arduino:done` (array of lesson ids), `learn-arduino:values` (per-lesson parameter values), `learn-arduino:settings` |
| Account / sync | None; all progress is local and reset from Settings |

**Screen regions** (desktop artboard, nominal 1672×941, scaled to fit)

| Region | Content | Nominal geometry |
|---|---|---|
| Left rail | Home, Lessons, Components, Simulator, Settings; expand toggle above; credit below | 72 px wide |
| Brand | Arduino infinity mark, “LEARN ARDUINO”, “EXPLORE · UNDERSTAND · BUILD” | top 21, left 95 |
| Stage | WebGL canvas, dashed leaders, callout cards, floating tags, inspector, minimap, view toolbar | inset 0 500px 140px 72px |
| Status | “Basics” progress bar + count (0/11) + live date/time clock | 444×87, top 17, right 79 |
| Info card | Tabs: Overview / Pinout / Example / Specifications | 476×397, top 120, right 20 |
| Code card | “Try it yourself”, expand, copy, run, highlighted code, resizable serial monitor | 464×254, top 527, right 29 |
| Lesson rail | 11 thumbnails, numbers, titles, chevrons, completion badges, prev/next | bottom 32, left 100 |
| Footer | Designer credit on compact layouts | hidden on wide |

**Responsive behaviour**

| Condition | Layout |
|---|---|
| Wide desktop | 1672×941 artboard scaled by `min(vw/1672, vh/941)`; at 1440×900 this is 0.861× |
| Mid-size / tablet | Scale floors at 0.8 using a 1280×941 reference; at 1024×768 the whole UI renders at 0.8× |
| Compact (scale < 0.62 or aspect < 0.95) | Switches to a CSS grid: brand/status row, full-width stage (58vh, clamped 300–660 px), lesson rail, then info and code stacked below, fixed 62 px bottom nav, footer visible |
| ≤ 600 px | Single-column grid with 12 px side padding; stage 366×490 at 390×844; full page ~1649 px tall |

The transformation from artboard to compact mode is class-driven (`html.compact`), not a fluid type system: desktop typography, 34 px controls and 1.5 px borders all shrink together at 0.8×.

**Metadata and discovery**

- Title: “Learn Arduino — interactive 3D lessons for beginners”; meta description: “Learn Arduino on an interactive 3D board: wire LEDs, buttons, sensors, motors and servos, then run the code and watch it work. 11 free beginner lessons.”
- Open Graph/X cards, 1200×630 OG image, canonical URL, `theme-color #F6EDDD`, PWA manifest (`display: standalone`, education category), and `WebApplication` + `LearningResource` JSON-LD listing all 11 `teaches` topics.
- A `<noscript>` block lists all 11 lessons with a one-sentence summary each, so the page is not empty without JS.

**Navigation model**

- **Home** resets to lesson 1 and the home camera.
- **Lessons** opens a flyout list of all 11 with number, title, subtitle and completion tick.
- **Components** opens a flyout of parts currently in view (e.g. “12 in view” on the sensor lesson) with name, one-line description and a focus action.
- **Simulator** runs/stops the current sketch; its icon becomes active while running.
- **Settings** exposes Callout labels, Floor grid, Turntable, Sound, Reduce motion and Reset progress.
- Lesson rail supports horizontal wheel scrolling, pointer drag, fade masks at the edges, and circular previous/next buttons. The active card has a 2 px teal-deep border.
- No search, glossary, account, certificate, or instructor view.

**Curriculum sequence (11 lessons)**

| # | Lesson | Concept |
|---|---|---|
| 1 | Meet the board | Arduino Uno hardware tour |
| 2 | Blink an LED | Digital output, `digitalWrite()`, resistor |
| 3 | Push a button | Digital input, pull-down, hold vs toggle |
| 4 | Turn a knob | Potentiometer, `analogRead()`, PWM dimming |
| 5 | Mix colours | RGB LED, three PWM channels, additive colour |
| 6 | Sense light | LDR voltage divider, threshold logic |
| 7 | Read a sensor | HC-SR04, `pulseIn()`, time-of-flight distance |
| 8 | Make a sound | Piezo, `tone()`, arrays and tempo |
| 9 | Control a motor | Transistor switching, PWM speed ramp |
| 10 | Sweep a servo | Servo pulses, angle mapping |
| 11 | Build a project | Integration: parking sensor with traffic light |

The sequence is pedagogically clean: output → input → analog → colour/PWM → sensor → sound → actuator → integration.

## Visual design system

**Palette (CSS custom properties, exact values)**

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F6EDDD` | Page / paper |
| `--bg-deep` | `#EFE3D1` | Deeper paper tone |
| `--sidebar` | `#E9DCCA` | Left navigation |
| `--card` | `#F9F2E5` | Opaque panels |
| `--card-soft` | `#FAF4E9F7` | Translucent cards/callouts (97% alpha) |
| `--code-bg` | `#F8F0E3` | Code surface |
| `--line` | `#CEC0AD` | 1.5 px borders everywhere |
| `--line-soft` | `#E2D7C7` | Dividers / code gutter |
| `--navy` | `#18213D` | Display headings, primary ink |
| `--navy-2` | `#24304A` | Secondary navy / icons |
| `--ink` | `#4F535B` | Body copy |
| `--muted` | `#696D74` | Secondary copy |
| `--faint` | `#ADA293` | Faint labels, tagline |
| `--teal` | `#1AA3A1` | Accent, hotspots, focus |
| `--teal-deep` | `#3F7F8E` | Active borders, teal text |
| `--trace` | `#D3BEA3` | Decorative PCB traces |
| `--track` | `#E3D8CA` | Progress track |
| `--kw` | `#2A56A3` | Code keyword blue |
| `--fn` | `#C0652D` | Code function orange |
| `--gutter` | `#AAA59D` | Code line numbers |

Supporting colours: teal gradient `#23B0AD → #149895` (progress/loader), run button `#34436A → #283656`, stop/hover coral `#D0614C → #B84D3A`, syntax code surface `#F8F0E3`, component paint set `#D64A3A` red, `#F0B53A` yellow, `#3FAE6A` green, `#3D6FC4` blue, `#EE7F62` coral, `#8A63C9` purple, `#7A5034` brown, `#2F3547` navy.

The background is not flat: the artboard uses `radial-gradient(120% 90% at 45% 45%, #FFFAF08C, transparent 60%)` over `--bg`, and the loading screen overlays a 28×28 px `#CEC0AD52` grid with a radial mask. Decorative SVG “PCB trace” paths and pixel motifs frame the stage. The big 3D board is hand-finished with a subtle `x.com/DilumSanjaya` watermark.

**Typography**

| Role | Family | Weight | Size / line-height | Notes |
|---|---|---|---|---|
| Brand H1 | Barlow Semi Condensed | 600 | 36.5 / 38 px | Uppercase, tracking .13em, navy |
| Brand tagline | Barlow Semi Condensed | 500 | 19.5 px | Uppercase, tracking .17em, faint |
| Section / panel H2 | Barlow Semi Condensed | 700 | 25 / 30 px | Uppercase, tracking .04em |
| Callout H3 | Barlow Semi Condensed | 700 | 18 / 22 px | Uppercase, tracking .035em |
| Tabs | Barlow Semi Condensed | 500 (700 active) | 17.5 px | Uppercase, tracking .04em |
| Body / intro | Barlow | 400 | 16 px base; intro 18.3 / 23 px | `--ink` |
| Callout body | Barlow | 400 | 15.7 / 20 px | `#5C6066` |
| Lesson title | Barlow Semi Condensed | 500 (700 active) | 15.2 / 22 px | Uppercase, tracking .05em |
| Progress label / count | Barlow Semi Condensed | 700 | 17 px / 19 px | Uppercase |
| Code | JetBrains Mono | 500 | 16.2 / 22.6 px | Ligatures disabled, tabular line numbers |
| Clock | JetBrains Mono | 400 | 17.5 / 23 px | Uppercase date, 24-hour time |

Fonts actually loaded: Barlow 400; Barlow Semi Condensed 500, 600, 700; JetBrains Mono 400, 500. Only the two Semi Condensed 500/600 files are preloaded in the HTML; the rest are discovered from CSS (`font-display: swap`). No variable-font axes are used.

**Shape, border, shadow**

- Radii: 7 px (toolbar buttons), 8 px (run button), 9 px (callouts, lesson cards, code), 10 px (info body), 11–12 px (major panels, flyout, inspector), 14 px (mobile stage), 999 px (pills/readouts).
- Nearly every panel is delimited by a **1.5 px solid `--line`** border; separation comes from rules and paper tones more than elevation.
- Shadows are sparse, warm and heavily offset-spread:
  - Flyout: `0 18px 40px -22px #3C2D148C`
  - Inspector: `0 18px 34px -22px #3C2D14A6, inset 0 1px #FFFFFFB3`
  - Callout: `inset 0 1px #FFFFFFB3`
  - Minimap: `0 10px 22px -16px #3C2D148C`
  - Active lesson: `0 0 0 1px #3F7F8E14` plus 2 px teal-deep border
  - Run button: `0 1px 2px #18213D40`
- Key proportions: info card 476×397, code card 464×254, status 444×87, lesson tile 91 px tall, tab row 47 px, 56 px code header, 33 px tab gap, 18 px card padding, 1.5 px borders. Spacing is a hand-tuned px scale (4, 8, 9, 12, 14, 16, 18, 22, 24, 33), not a strict 4/8 token system.

**Art direction read.** Editorial mid-century technical illustration meets a modern product UI: cream paper, navy ink, hairline frames, condensed grotesque caps, monospaced instrumentation, tiny teal ring highlights. The effect is “premium field guide”, not “SaaS dashboard”. Colour is reserved for the thing being taught (components) and for progress/selection (teal).

## Core interactions

**3D scene and rendering**

- three.js, orthographic camera, custom controls (not OrbitControls). The scene appears **fully procedural**: Arduino Uno, breadboard, jumper wires, LED, button, potentiometer, RGB LED, LDR + lamp, HC-SR04 + toy car, piezo, DC motor + transistor, SG90 servo, traffic-light module. No external `.glb`/`.gltf`, Draco, KTX2 or texture downloads were observed.
- Renderer: `powerPreference: "high-performance"`, transparent clear, PCF-soft shadow map enabled, **2048×2048** single directional shadow map, `shadowMap.autoUpdate = false` with explicit invalidation. Environment is baked from a procedural room environment through PMREM (`0.04` blur) rather than an HDR file.
- Custom composer draws the ink-style outlines; line thickness scales with zoom. Render is **on demand**: a rAF loop runs, but the scene only re-renders when camera, tween, simulation, selection or shadows are dirty.
- Camera defaults: azimuth **36°**, elevation **43°**, zoom **8.4**; each lesson defines its own target, zoom and frame (e.g. board target `[0,0,0]` zoom 8.4; light target `[50,0,-32]` zoom 5; servo target `[26,0,-20]` zoom 6.4). Transitions use ~1.1 s in-out cubic easing; reduced motion collapses tweens to 5% duration.
- Constraints: zoom 3.2–22, pan target x ∈ [−90, 150], z ∈ [−110, 90], fixed elevation; you cannot orbit below the table.

**Controls**

| Input | Action |
|---|---|
| Left-drag / one finger | Pan with glide and fling inertia (~340 ms decay) |
| Middle-drag | Turn horizontally; elevation is fixed |
| Two fingers | Pinch zoom + twist |
| Wheel | Exponential zoom anchored at the cursor |
| WASD / arrows | Pan (Shift = 2×) |
| Q / E | Rotate in 36° snapped steps, animated |
| `+` / `−`, PageUp/PageDown | Zoom |
| R / Home | Reset to lesson home view |
| Double-click part | Zoom/focus that part; double-click empty space resets |
| Space | Run/stop sketch (when focus is not a button/input) |
| 1–9, 0 | Jump to lessons 1–10 |
| `[` / `]` | Previous / next lesson |
| Esc | Close inspector → flyout/expanded panel → reset view |

A 5-button toolbar exposes left/right turn, zoom out/in and reset (compass), plus a transient hint: “Drag or WASD to pan · Q / E to rotate · Scroll to zoom”. A minimap appears on wide layouts once the view leaves home, for click/drag re-centring.

**Picking and the inspector**

- Raycasting against the board group and part groups (`intersectObjects`, recursive), with NDC converted from the canvas rect; walks parents to find `userData.part` and the owning part id. Selection gets a teal ring on the ground plane.
- Clicking a part opens a floating **inspector** with a header, one-sentence description, and 1–4 controls. For the LED: “5 MM LED — Lights when current flows from the long leg (anode) to the short leg.”, colour swatches, “ON FOR 500 ms”, “OFF FOR 500 ms”, **Zoom to it** and **Run to see it**.
- The inspector is positioned in the corner on wide layouts and docked to the bottom in compact; it draws a leader back to the selected anchor and forces free-floating tags for nearby parts. Escape or the close button dismisses it.
- Direct manipulation is used where physical: drag the potentiometer knob, drag the desk lamp, drag the toy-car obstacle; click the resistor to cycle values, click the LED to change colour/timing, click the traffic light to move thresholds.

**Annotation system**

- Callouts are HTML cards laid out in a stage-relative rig, with SVG dashed leaders and animated teal hotspot dots. Each callout has an anchor (`part:led`, `pin:D13`, `ledL`), side, offset, width and leg length.
- Layout is collision-aware: callout positions are projected from 3D anchors and flipped/slid to avoid overlap; floating tags use a candidate-position search. Cards animate in with a 60 ms stagger.
- On desktop, cards are always visible at the lesson home view; floating tags are shown when the camera leaves home or a part is selected. Clicking a callout focuses/zooms its anchor.
- On mobile (`html.compact`), **the entire callout rig is `display:none`**; only small 11.5 px tags remain. The textual explanation is still available in the Overview tab, but the spatial label layer is lost.

**Simulation model**

- “Run” is not compilation. `runSketch` plays a fixed 1.2 s sequence — “Compiling sketch…”, “Uploading to Arduino Uno…”, “Done uploading.” — then runs a hand-authored per-lesson JS simulator that updates LEDs, emissives, motor rotation, servo arm, sensor readouts and the console.
- The serial monitor is a resizable pane (drag grip; arrow keys resize; double-click resets to 92 px) with `aria-live="polite"`; console lines like `D13 → HIGH` stream while the trace highlights the executing code line.
- Code is syntax-highlighted and rendered read-only; parameter tokens (`{{on}}`, `{{near}}`, etc.) are clickable buttons that focus the matching control. There is **no editor** — no `contenteditable`, no textarea for code, no compile feedback.
- Sound is optional: a WebAudio square-wave oscillator approximates the piezo, gated by the Sound setting and started on user gesture.

**Navigation and state**

- Changing lesson updates hash, document title, 3D scene, callouts, info panel, code, inspector and the rail active state, with a 1 s stagger for annotations. It does not push a history entry.
- Hovering/selection states are separate: callout hover raises it, part hover may show a tag, selected part gets a ring and inspector.
- The “Home” action selects lesson 1 and resets the camera; it is not a separate landing page.

## Learning UX

**Lesson template.** Every lesson is one object with a consistent schema: `heading`, 1–2 sentence `lede`, exactly 3 `features` (icon + one-liner), a `pinout` table (2–6 rows: pin → connects to → what it does), 4 `example` steps explaining the code, 5 `specs` rows (board lesson has 0), 0–4 live `params`, 3–6 `callouts`, and ~8–21 lines of code. This is the strongest reusable idea in the app: content and interaction share one schema, so each lesson feels complete without bespoke layout.

**Per-lesson information density**

| Lesson | Features | Pinout rows | Example steps | Spec rows | Callouts | Code lines |
|---|---:|---:|---:|---:|---:|---:|
| Meet the board | 3 | 6 | 4 | 0 | 6 | 8 |
| Blink an LED | 3 | 2 | 4 | 5 | 5 | 12 |
| Push a button | 3 | 4 | 4 | 5 | 4 | 11 |
| Turn a knob | 3 | 4 | 4 | 5 | 4 | 14 |
| Mix colours | 3 | 4 | 4 | 5 | 4 | 16 |
| Sense light | 3 | 5 | 4 | 5 | 4 | 19 |
| Read a sensor | 3 | 4 | 4 | 5 | 4 | 18 |
| Make a sound | 3 | 2 | 4 | 5 | 4 | 13 |
| Control a motor | 3 | 4 | 4 | 5 | 4 | 15 |
| Sweep a servo | 3 | 3 | 4 | 5 | 3 | 17 |
| Build a project | 3 | 5 | 4 | 5 | 4 | 21 |

**Progression and completion**

- Progress is a single “Basics” bar with `0/11` and a lesson-rail checkmark.
- A lesson is completed automatically when the simulated sketch finishes its upload and starts running — there is no answer, task, or correctness check. Pressing Run is therefore sufficient to complete any lesson.
- Completion is stored locally, deduplicated by lesson id, and shown in the Lessons flyout and rail. Reset Progress clears `learn-arduino:done`.
- There is **no next-lesson CTA** after completion. The learner must use the rail, flyout, `[` `]` shortcuts, or a number key. The only “next” language is a spec row (“Next step — Add a buzzer from lesson 8”).
- No time estimates, prerequisites, learning objectives, spaced repetition, streaks, or analytics.

**Quiz / assessment: none.** A string search across all shipped bundles found zero occurrences of “quiz”, “question”, “answer”, “assessment”, “exercise” or “practice”. There is no scored activity, no multiple choice, no drag-and-drop check, no self-report, and no per-lesson mastery state. “Run to see it” is a demonstration, not an assessment.

**Feedback quality.** Good sensory feedback (light emission, motion, sound, console, active code line, parameter-linked code values) and good reference feedback (pin table, specs, callout definitions). Weak elaborative feedback: no explanation of *why* a change produced an effect beyond the static Example tab; no error states because the learner cannot make an error.

## Copy voice

**Attributes.** Warm, direct, second person, technically precise, calmly authoritative. Sentence case in content; uppercase is applied by CSS, not written in caps. Short declaratives, no exclamation marks, no emoji, no gamification slang. British spelling sits alongside Arduino-standard American technical terms (“colours”, “potentiometer” vs “analogRead”, “analog”).

**Representative lines**

- “Explore · Understand · Build” — brand promise, three imperatives with spaced middots.
- “Your first circuit: an LED and a resistor on a breadboard, driven by pin 13. Switching the pin on and off with a pause in between makes it blink.” — context, mechanism, effect in two sentences.
- “A servo is a motor that knows where it is.” — memorable one-line definition.
- “A potentiometer is a resistor with a slider.” — analogy over jargon.
- “The short leg (−) returns current here.” — callout copy written for a beginner standing at the board.
- “Click the resistor to try other values.” / “Drag around the knob to turn it.” / “Drag it closer and watch the lights.” — verb-first affordance microcopy.
- “Turn a quarter every few seconds when idle” — settings description that explains behaviour, not the toggle.
- “Let the buzzer play out loud.” — permission-shaped, human.
- “Compiling sketch…”, “Uploading to Arduino Uno…”, “Done uploading.”, “D13 → HIGH”, “Stopped.” — instrumentation voice, ellipsis character, no chatter.
- “Something went wrong while starting. Try reloading the page.” — plain failure copy.
- “The 3D board is drawn with WebGL, which this browser has turned off. Turn on hardware acceleration in its settings, or try another browser — the lessons and their code still work.” — exemplary fallback copy: cause, remedy, reassurance.

**Tone risks.** The voice occasionally over-promises. “Try it yourself” implies authorship, but the code cannot be edited. “Run to see it” is honest; “Try it yourself” is not quite. Technical asides are excellent but sometimes dense for a beginner (“≈ 4.9 mV per step”, “PWM 8-bit, 0–255 at ~490 Hz”).

## Performance / accessibility observations

**Measured on the review machine (headless Chromium, software WebGL — treat timings as a floor/caveat, not a real-device benchmark)**

| Metric | Value |
|---|---|
| DOMContentLoaded | 247 ms |
| Load event | 292 ms |
| Loader dismissed / ready | 21.6 s (software WebGL; the app's own 20 s safety timeout fired) |
| Total transferred | 373 KB |
| JS transferred / raw | 225 KB / 780 KB (index 87.7 KB + kit 283.3 KB + stage 404.3 KB + thumbs 4.2 KB) |
| CSS transferred / raw | 12.4 KB / 52.3 KB |
| Fonts transferred | 135.7 KB across 6 WOFF2 files |
| HTML | 16.9 KB |
| External 3D models/textures | none observed |

**Techniques used**

- Vite code-splitting: `stage`, `kit` and `thumbs` are dynamic imports; the stage is only fetched after fonts resolve. Thumbnails are rendered with the same WebGL renderer rather than shipped as images.
- Procedural geometry and a PMREM-baked room environment keep the network payload small; instanced meshes are used in the scene; custom line composer replaces heavy post-processing.
- On-demand rendering, static shadow map (updated only when needed), 2048 shadow map, and a rAF loop that can idle without drawing.
- Device-pixel-ratio clamp: `Math.min(2, Math.max(1.5, devicePixelRatio * layoutScale))` — a **floor of 1.5×** even on a 1× display, a quality choice with a real GPU cost.
- Fonts preloaded only for the two most critical Semi Condensed weights; `font-display: swap`.
- Graceful failure: a 20 s watchdog releases the UI; a WebGL failure swaps in a `role="note"` panel with recovery copy while leaving lessons/code usable.
- `prefers-reduced-motion` sets tween speed to 0.05 and a `reduce-motion` class; the Turntable auto-rotate is off by default.

**Where it costs**

- The first paint is gated by a full-screen loader that states “Drawing the lessons · n / 11”; all 11 thumbnails must render before the app is released. The 20 s fallback is a safety net, not a fast path. There is no skip or partial-UI reveal.
- Everyone downloads the entire stage and kit (~688 KB raw) even if they only read the first lesson. There is no per-lesson asset split.
- The DPR floor and 2048 shadow map are expensive on integrated/mobile GPUs; no adaptive quality tier was found.
- The fixed artboard is scaled with a CSS transform rather than reflowed; at 1024×768 the scale is 0.8, so 16 px body copy renders at ~12.8 px effective and 34 px buttons at ~27 px. Text remains crisp but small.

**Accessibility strengths**

- Semantic landmarks (`nav`, `main`, `header`, `section`, `footer`), one `H1`, meaningful `H2`/`H3` hierarchy, `lang="en"`.
- Tabs implement `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, roving tabindex and Left/Right arrow navigation.
- Progressbar exposes `aria-valuemin/max/now`; lesson items are keyboard-activatable with `role="button"` and `aria-label`; callouts are focusable and Enter/Space activated.
- `aria-live="polite"` on the flyout and serial monitor; loader is `role="status"`; the app is `inert` while loading.
- Global 2 px teal `:focus-visible` outline; callouts replace it with a border/shadow change.
- Full keyboard camera control (WASD/QE/zoom/reset) and lesson shortcuts.

**Accessibility gaps**

- **Canvas is `tabindex="-1"`, has no role, and is not focusable.** 3D parts cannot be picked, focused, or inspected from the keyboard. Callout cards are the only keyboard route to structures, and they disappear on compact layouts.
- Lesson completion is visual only: `.lesson-done` is `aria-hidden`, and the lesson's `aria-label` does not include “completed”. Screen-reader users cannot tell which lessons are done.
- The progressbar has no accessible name; the tabpanel has no `aria-labelledby`; tabs have no `id`/`aria-controls`.
- Contrast: `#ADA293` on `#F6EDDD` ≈ **2.16:1** (tagline, faint labels); `#1AA3A1` on `#F6EDDD` ≈ **2.66:1** (teal text); white on teal ≈ **3.09:1**; `#3F7F8E` on `#F6EDDD` ≈ **3.90:1**. Body ink is fine (`#4F535B` ≈ 6.64:1; muted `#696D74` ≈ 4.47:1, borderline at 16 px).
- Many targets are below 44×44 CSS px: viewbar buttons 34×32 (≈29×28 rendered at 1440), expand 22×22, code actions 34×33, tabs 40 px high; at the 0.8 tablet scale these become smaller still. Lesson-card targets are large and fine.
- Mobile hides all callout cards, the minimap and the view hint; only 11.5 px tags remain, and the 3D scene is 366×490. The information panel sits below a 100 px lesson rail, requiring a long scroll; the whole page is ~1649 px tall on a 390×844 viewport.
- `<time>` has no `datetime`; the clock is decorative and updates every second.
- No 2D/text-only equivalent of the 3D scene exists. The Overview text partially compensates but does not map labels to positions.

## 10 concrete takeaways for an anatomy app

1. **Make the specimen the product’s front door, not a widget.** Give the 3D model the visual weight Learn Arduino gives its board: a large, centred, softly lit specimen on a warm paper field, with the UI as thin framing rails. Build the brand around “explore · understand” rather than around dashboards.
2. **Invest in a real annotation engine.** Anchored hotspots + collision-aware leader cards + a projection step for 3D→2D + staggered reveal is the single most reusable system here. For anatomy, support occlusion-aware anchors, layer filters (skeletal / muscular / vascular / nervous), and a “show all labels / show selected only” mode instead of hiding labels on small screens.
3. **Give every lesson its own camera choreography.** Store target, zoom, azimuth, elevation and a bounding frame per structure/system, then ease between them (~1 s, cubic). Add 30–45° snap rotation, scroll-at-cursor zoom, pan bounds, reset, and a minimap. This turns navigation into teaching.
4. **Use one contextual inspector for every structure.** Anatomy equivalent: name, one-sentence function, 2–4 actions (isolate, fade others, explode, compare left/right), a “zoom to it” control, and a “show in a body” control. Anchor it with a leader to the selected structure, and make it the only place parameters live.
5. **Adopt a strict lesson schema.** One screen = lede + 3 takeaways + tabbed detail + simulation + labels. For anatomy, replace Arduino’s Pinout/Example/Specifications tabs with **Structure / Function / Clinical / Pathways** (or Origins/Insertions/Innervation/Actions for muscles). Keep each tab short; the schema is what makes 11 lessons feel curated rather than assembled.
6. **Replace “code + serial monitor” with a physiology workbench.** The transferable mechanic is parameter → visible effect: change heart rate, resistance, oxygenation, nerve conduction velocity, or joint angle and watch the model, readout and explanation update together. Keep a live trace/readout panel (the serial-monitor analogue) but make the causal chain explicit.
7. **Require retrieval, not just attendance.** Learn Arduino marks a lesson complete when the simulation runs; that is a completion metric, not learning. Build 2–3 quick checks per lesson — identify the structure on the model, order a pathway, predict the effect of a parameter change — with immediate explanatory feedback and per-system mastery.
8. **Always provide a visible next step and portable progress.** After a lesson, surface “Next: …” with the next structure/system, and expose progress as more than a local bar. Sync or export progress; let learners resume at the exact structure, camera and layer state.
9. **Codify the visual language in tokens.** Warm paper (`#F6EDDD`), navy ink (`#18213D`), one teal accent (`#1AA3A1`), hairline borders (1.5 px `#CEC0AD`), 9–12 px radii, condensed uppercase display type + humanist body + mono readouts. This combination reads as premium and clinical without looking like a hospital dashboard.
10. **Treat performance, keyboard access and mobile as design requirements.** Lazy-load the 3D chunk, render on demand, cap DPR, use a progressive loader that reveals content early, provide a WebGL fallback, mirror the model in a keyboard-navigable structure list, and design a mobile mode with a full-width model + bottom-sheet inspector rather than deleting the labels.

## Things to avoid

- **Do not block the entire product on asset generation.** A full-screen loader that waits for 11 rendered thumbnails (and needed a 20 s watchdog in software rendering) makes a premium product feel broken. Reveal the shell and first lesson first; render the rest lazily.
- **Do not scale a fixed artboard down to every viewport.** The 1672×941 canvas becomes 0.8× at 1024 px, shrinking body text to ~12.8 px and controls to ~27 px. Reflow the layout; reserve transform-scaling for a kiosk/presentation mode.
- **Do not hide the teaching layer on mobile.** Removing callout cards leaves only 11.5 px tags and a long-scroll info panel. Use a bottom sheet, tap-to-select and a “labels” toggle instead.
- **Do not call it “Try it yourself” if the learner cannot author anything.** The code is read-only; only parameters change. Either rename it (“Try the parameters”) or provide a safe editable surface with reset and validation.
- **Do not ship a learning app with no retrieval practice.** Viewing + pressing Run is not evidence of learning. Add low-stakes checks, structure identification and explain-why feedback.
- **Do not rely on a single completion signal.** Auto-completing on Run makes progress trivially gameable and gives no diagnostic information. Track per-objective mastery and expose it.
- **Do not leave the 3D model keyboard-inaccessible.** A `tabindex="-1"` canvas with no role and no structure list excludes keyboard and switch users from the core experience.
- **Do not let decorative chrome compete with content.** The live clock, designer watermark on the specimen, and always-on credit rail add noise; in an anatomy app, clinical credibility suffers more than in a hobbyist Arduino app.
- **Do not use low-contrast faint text for functional labels.** `#ADA293` at 2.16:1 is decorative, not readable; teal at 2.66:1 fails for normal text. Reserve faint tones for non-essential rules.
- **Do not use hash replacement as your only navigation.** `replaceState` means Back exits the app instead of returning to the previous lesson; no `hashchange` listener means pasted hashes after load do nothing. Use real history and deep-linkable state (lesson + selected structure + camera).
- **Do not make progress local-only and silently resettable.** With no account or export, a cleared browser loses everything; in a premium anatomy product, progress is part of the value proposition.
- **Do not over-density the first screen.** Status, info, code, rail, minimap, toolbar, callouts and a watermark all compete at once. Learn Arduino just barely holds it together through strong hierarchy; a medical audience will expect a calmer default with progressive disclosure.

## Limits of this teardown

- Load time (21.6 s) and render quality were measured under headless Chromium with software WebGL; real GPU load time and FPS were not measurable here. No Lighthouse/Core Web Vitals field data is available.
- No analytics, retention, or learner-outcome data is exposed; claims about engagement are inferred from the interface.
- Audio behaviour, touch feel on physical devices, and high-DPI rendering were not evaluated beyond code inspection and screenshots.
- Font licensing, 3D asset provenance and content accuracy were not audited.
- Lesson duration and difficulty are not stated anywhere in the app; no estimates are given here.
