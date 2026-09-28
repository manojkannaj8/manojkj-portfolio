# updates.md — project log & handover

> Hand this file to a new session to resume. It records what exists, why, and what's next.
> **Keep it updated at the end of every stage.** Newest log entries at the bottom of the Log section.

_Last updated: 2026-09-27 — Mobile optimisation done on branch `mobile-optimisation` (desktop verified pixel-identical to `main`); owner will merge._

---

## 1. Project brief (from the owner)

- Interactive portfolio for **Manoj Kanna J** that feels like "an interactive world built around my hero and my story", not a conventional portfolio with animations added.
- **Hero artwork** (futuristic figure with a cyber-visor, orbit ring, HUD text; graphite + visor-blue) is the visual foundation.
- **Interaction reference:** Unicorn Studio remix `qoiI7LkXy1QpxMsevGBy` (public view: `https://www.unicorn.studio/remix/qoiI7LkXy1QpxMsevGBy`; the `/dashboard/...` link needs login). Observed behaviour: figure shatters into voxel fragments along the cursor path, huge blurred wordmark behind the head with velocity smear + RGB split, pixel-dissolve intro, glass HUD cards. Use as foundation, push further.
- Cursor/scroll must affect the scene (depth, perspective, distortion, lighting, particles). **Touch:** scroll/tap/tilt equivalents. Performance + load time matter.
- **Build in stages**, section by section, with a preview each time before continuing.
- Content from CV, LinkedIn, projects, achievements, education, experience, skills. **Never invent information.** Missing details get added later.
- Content lives in **one editable file**, separate from animation components.
- Each part of the journey gets a **unique animated/interactive representation**, not generic cards/sections.
- Respect `prefers-reduced-motion`; keep text contrast readable in animated sections.
- Clean, maintainable structure; use libraries only where they genuinely help.
- Owner asked for this `updates.md` to be maintained throughout development.

## 2. Status at a glance

| Stage | Section | Status |
|---|---|---|
| 1 | Hero (WebGL) | ✅ Done — **approved by owner, locked: do not change visuals/interactions unless asked** |
| 2 | Chapter 01 · Learn (education + skills) | ✅ Done — owner: "perfect, continue" |
| 3 | Chapter 02 · Build (projects) | ✅ Done — owner: "perfect continue" |
| 4 | Chapter 03 · Explore (experience & leadership) | ✅ Done — owner: "everything is perfect"; requested highlight tweaks applied |
| 5 | Chapter 04 · Evolve (achievements + contact finale) | ✅ Built & verified — **awaiting owner feedback**. Pending owner asset: Debug Odyssey image |
| 6 | Polish: mobile menu, nav backdrop on scroll, global chapter progress rail, SEO/OG image, deploy, real-device pass | ⏳ Deployed to Vercel by owner; remaining polish items still open |
| 7 | **Mobile optimisation** (branch `mobile-optimisation`) | ✅ Done — audited, fixed, verified; **awaiting owner merge into `main`** |

**Progress:** 5 of 6 stages built. All four chapters and the contact finale exist, so the site is complete end to end, pending polish.

## 3. Tech stack & dependencies

- **Vite 8 + React 19 + TypeScript 6** (`npm run dev` → http://localhost:5173, `npm run build`, `npx oxlint src`).
- **Raw WebGL2** for the hero (no three.js: one fullscreen triangle + one point cloud keeps the bundle small).
- **2D canvas** for voxel chapter titles, the Build voxel transitions, the Explore flight scene and Evolve's voxel images (`VoxelImage`); **DOM + SVG** for the Learn orbit system and Build schematics (accessible buttons, crisp text).
- **gsap** (+ ScrollTrigger): timelines, scroll scrubbing, and the single shared ticker (`gsap.ticker`) every render loop hangs off.
- **lenis**: smooth scrolling, synced to the GSAP ticker (disabled for reduced motion).
- **Fonts (self-hosted via @fontsource):** `Michroma` (HUD labels), `Unbounded Variable` (wordmark + voxel titles), `Manrope Variable` (body + headlines).
- **Python tooling (dev only, not deployed):** `torch` + `transformers` (Depth-Anything-V2-Small, ~100 MB HF download, cached), `numpy`, `Pillow`.
- Bundle after stage 5: ~154 KB gzipped JS, ~18 KB gzipped CSS. Hero assets are ≈ 194 KB plate + 45 KB depth. Evolve images total ≈ 410 KB WebP and are **lazy-loaded** (only when within 800px of the viewport).
- `.claude/launch.json` defines the `portfolio` dev server for the Claude browser pane (git-ignored).
- **Repo:** https://github.com/manojkannaj8/manojkj-portfolio (branch `main`). **Deploy:** Vercel → Import that repo; the Vite preset is auto-detected (build `npm run build`, output `dist`), and no `vercel.json` is needed (single page, hash anchors only).
- **Git-ignored on purpose:** `art/achievements/` (the original SurgeGuard screenshots contain private browser tabs/URLs; only the cropped copies in `public/` are committed), plus `.claude/`, `node_modules`, `dist`.

## 4. Folder structure

```
portfolio v1/
  updates.md                ← this file
  README.md                 ← how to run / edit / regenerate assets
  index.html                ← meta, preloads hero assets
  art/hero-original.webp    ← untouched original artwork (NOT deployed)
  art/logos/                ← original org logos supplied by the owner (NOT deployed)
  art/achievements/         ← original achievement photos/screenshots supplied by the owner (NOT deployed)
  tools/
    make_depth.py           ← depth map from the artwork (Depth-Anything-V2-Small)
    clean_plate.py          ← paints the baked lettering out of the artwork
    logo_mark.py            ← logo on black → small transparent square mark (python tools/logo_mark.py in.png out.png 128)
    skill-graph.mjs         ← prints which work each skill links to (node tools/skill-graph.mjs)
    optimize_image.py       ← resize + WebP + optional crop (python tools/optimize_image.py in out.webp 1400 --crop x0,y0,x1,y1)
  public/logos/             ← deloitte.png, logic-play.png (128px transparent marks, used in Explore)
  public/achievements/sensora/ ← winning.webp, command-center.webp, live-detection.webp, hardware.webp (Evolve)
  public/hero/
    hero-plate.webp         ← artwork with baked text removed (used at runtime)
    hero-depth.png          ← half-res depth map (bg ≈ 0.05, figure ≥ 0.25)
  src/
    content/profile.ts      ← ★ ALL site text/data. The only file to edit for content.
    lib/
      pointer.ts            ← shared input store (mouse, velocity, taps→bursts, gyro)
      motion.ts             ← useReducedMotion(), prefersReducedMotion(), isTouchDevice(); dev ?reduced-motion override
      scramble.ts           ← HUD "decode" text effect (ASCII glyphs only, avoids width jitter)
      skillGraph.ts         ← derives skill → experience/project/achievement links + related skills from content
      systemLayout.ts       ← layered DAG layout for Build schematics (columns, barycentre rows, orthogonal traces; vertical/compact modes)
      scroll.ts             ← Lenis registry + scrollToY() for programmatic scrolling (App registers the instance)
      dates.ts              ← month-precision CV period parsing ("Jun 2026 – Aug 2026", "… – Present"), formatting, durations
      useInView.ts          ← one-shot in-viewport flag (true immediately under reduced motion)
      offscreen.ts          ← marks off-screen scopes (data-offscreen) → CSS pauses their animations; isOffscreen() for timers
    webgl/
      gl.ts                 ← tiny WebGL2 helpers (program, texture, render target)
      hero/HeroScene.ts     ← hero renderer + HERO_ART constants (size, ring, focus, cell)
      hero/shaders.ts       ← GLSL: trail, scene composite, voxel points
    components/
      chrome/Nav.*          ← fixed nav (chapters from content + "Open a channel" mailto CTA)
      chrome/Cursor.*       ← custom cursor (dot + ring; brackets "Decompile" over figure; data-cursor labels)
      hero/                 ← Hero.tsx/.css, HeroStatus, HeroChapters, HeroReadout (locked)
      chapter/
        ChapterHead.tsx/.css← shared chapter header: "Chapter 0N / blurb", voxel title + real <h2>, caption
        VoxelTitle.tsx      ← canvas voxel display type: assembles on scroll, cursor/touch repels voxels
      learn/
        Learn.tsx/.css      ← Chapter 01 section (sticky stage, legend, education callout, detail panel)
        OrbitSystem.tsx     ← tilted orbit rings + skill nodes + constellation lines + leader line; render loop
        CoreGauge.tsx       ← CGPA "planet" gauge (imperative set(progress))
        SkillDetail.tsx     ← "Signal trace" panel (aria-live)
        rings.ts            ← ring colours + ringsFrom(graph)
      build/
        Build.tsx/.css      ← Chapter 02 section (pinned workbench, scroll → project time, info, inspector, rail)
        Schematic.tsx       ← one project as a running system: modules, traces, packets, voxel assemble/decompile
        NodeIcon.tsx        ← animated glyph per module kind
      explore/
        Explore.tsx/.css    ← Chapter 03 section (pinned flight, scroll → camera depth, HUD, gate labels)
        FlightScene.ts      ← canvas 2D renderer: stars (streak with speed), voxel trail, ring-gates, far planet, crossing flash
        missions.ts         ← experience → chronological missions with parsed dates, colours, timeline lanes
        Dossier.tsx         ← mission dossier (or flight plan before the first gate)
        Timeline.tsx        ← month-accurate lanes timeline with camera-date cursor
      media/
        VoxelImage.tsx/.css ← lazy image that assembles from voxels on scroll; cursor/tap pops voxels out
      evolve/
        Evolve.tsx/.css     ← Chapter 04 section (flowing, sticky version rail, releases, finale)
        Exhibit.tsx         ← headline achievement: voxel media + seal, project, pipeline strip, count-up stats
        Research.tsx        ← research/patent dossiers (published stamp, progress bar, classified + redacted specs)
        Notes.tsx           ← minor "patch notes" tiles with animated glyphs
        Finale.tsx          ← contact: hero figure reassembles from voxels + email/copy/links + footer
        bits.tsx            ← CountUp, Seal
    styles/tokens.css       ← colour/typography tokens
    styles/global.css       ← base styles, .hud-label, .sr-only, cursor + reduced-motion rules
```

## 5. Design system

- **Palette (tokens.css):** bg `#06080c`, raised `#0c1118`, glass `rgba(16,22,32,.52)`, ink `#eaf0f8` (17.6:1), ink-2 `#b3bfcf` (10.9:1), ink-3 `#8592a5` (6.2:1, the floor for small text), accent/visor blue `#8fb5ff`, deep `#4a7dff`, glow `rgba(110,150,255,.45)`, status LED green `#7dffb2`. Orbit ring colours: `#7fd6ff`, `#a9b4ff`, `#8fb5ff`, `#d4def0`.
- **Type:** HUD labels = Michroma, uppercase, 0.22em tracking, ~9–11px. Headlines = Manrope 300, tight tracking. Display/voxel type = Unbounded 800.
- **Surfaces:** glass cards (blur 18px, 1px `--line` border, radius 18px), pill buttons, HUD corner brackets, crosshairs, dashes, leader lines.
- **Motion language:** voxel assembly/disassembly, decode-scramble text, scan beams, orbiting glints, expo/power3 easing, `--ease-out: cubic-bezier(.16,1,.3,1)`. All render loops run on `gsap.ticker`, pause off-screen (IntersectionObserver), and use dt-based smoothing.
- **Storytelling device:** the artwork's painted words **LEARN / BUILD / EXPLORE / EVOLVE** are the four chapters (`profile.chapters`), driving the nav, the hero chapter list and each chapter's voxel title. The hero's voxels disperse upward on scroll, and each chapter title "catches" voxels falling into place.
- **Layout tiers used everywhere:** wide (aspect ≥ 5/4) · stacked (aspect < 5/4) · mobile (< 760px); short-landscape tier in the hero.

## 6. Hero (Stage 1, complete & locked)

Render pipeline per frame (`HeroScene.ts`):
1. **Trail pass**: ping-pong buffer (~⅓ res, RGBA16F if available) storing cursor energy + flow direction. It's advected, and it decays with an 8-bit-safe epsilon. Taps/clicks inject an **expanding shockwave ring** (0.9 s).
2. **Scene pass**: full-screen composite:
   - **backplate**: the clean plate with edge extension (mip-blurred clamp), so any aspect ratio works;
   - **depth parallax**: two-step inverse displacement;
   - **orbit-ring light**: highlight facing the light, plus an orbiting glint (ring centre 667.4, 699.3; radius 437.2 px);
   - **wordmark "MANOJ"** between plate and figure, with velocity smear, RGB split and a reveal wipe;
   - **cursor relight** of the figure, using normals from the depth map;
   - **"machine interior"**: blue depth contours and a voxel lattice where voxels broke away;
   - **finishing**: intro scan beam, vignette, grain, scroll darkening.
3. **Voxel pass**: one GL point per 9 px image cell (~19k). A cell detaches from trail energy, the intro, scroll, or idle silhouette erosion, then flies out and reassembles.

**Timing and scroll:**
- Intro runs 2.8 s. Copy reveals at 1.3 s.
- The section is 175svh with a sticky 100lvh stage. Extra scroll disperses the figure upward.
- Loop pauses off-screen. DPR is capped at 1.5 (1.25 on touch). WebGL2 missing or context lost → static `<img>` fallback.

**Layout:**
- Wide: figure right-of-centre, copy bottom-left, chapter list right, status card bottom-right, telemetry top-left.
- Stacked: figure pulled back, copy and status at the bottom.
- Short-landscape tiers apply at ≤ 640 px and ≤ 470 px heights.

**Input and accessibility:**
- Touch: gyro tilt (iOS permission requested on first tap), tap shockwave, scroll dispersal.
- Reduced motion: single still frame, figure intact on scroll (verified via `?reduced-motion`).

**Why the artwork was edited:** its baked text duplicated and collided with the live copy. `clean_plate.py` removed it, and the words were re-created as live type. The original is kept in `art/`.

## 7. Chapter 01 · Learn (Stage 2, built)

**Concept:** *"The core — and everything that orbits it."*
- **Education is a planet at the centre:** a CGPA gauge (9.35 / 10) whose arc fills with scroll, with a count-up readout.
- **Skills orbit it** on four tilted rings, one per category, Saturn-style. Back halves pass behind the planet and front arcs pass over it. Rings are sorted by size, so Frameworks & Libraries (15) gets the outer orbit.
- Echoes the hero's orbit ring and earth.

**Scroll:** the section is 230svh (210svh stacked/mobile) with a sticky 100svh stage.
- The voxel title "LEARN" assembles as the stage slides in (voxels fall from above).
- Build progress is scrubbed from `top 65%` to `top -45%`: the core fills first, then rings expand outward one by one. Node opacity eases in quadratically so collapsed rings don't clutter the core.
- The remaining pinned scroll is free interaction.

**Interaction:**
- Cursor tilts the plane (roll + pitch); gyro does the same on phones.
- Drag (mouse or touch) spins the rings with inertia. `touch-action: pan-y` keeps vertical page scroll working.
- Hovering or focusing a skill pauses the spin and highlights it. It draws **constellation lines** to every skill it has been used alongside, dims the rest, and fills the **Signal trace** panel.
- The panel shows the skill's category and an "Applied in" list: Experience / Project / Achievement, derived from content. Skills with no links show "In my toolkit."
- Clicking pins a skill; the close button or Escape clears it.
- **Legend:** hover previews a ring, click locks it (a filter).
- Filled dots mean the skill is traced to real work; hollow dots mean toolkit only.
- The education details sit top-right as a HUD callout, with a **leader line** from the planet (wide layout only).
- Labels face outward but flip inward if they would leave the stage.

**Data (`lib/skillGraph.ts`):**
- A skill links to an item when its name or an alias from `profile.skillAliases` appears in that item's stack or text. The match is whole-term; terms of 3 characters or fewer are case-sensitive, and plurals are allowed.
- Related skills are those sharing at least one application. Run `node tools/skill-graph.mjs` to audit the links.
- Currently 22 of 34 skills are traced to real work.

**Mobile/stacked:**
- The education callout sits under the title.
- Orbits show dots only until an orbit chip or a skill is chosen; the active and related labels always show.
- The legend becomes a horizontal chip row, and the detail panel sits at the bottom (scrollable, footnote hidden).

**Reduced motion:** fully built, static, no spin/tilt/inertia; drag still rotates directly; selection redraws lines.

**Accessibility:**
- Nodes are real `<button>`s grouped per category (`role="group"`).
- The panel is `aria-live="polite"`, and the gauge is `role="img"` with an aria-label.
- The visible heading is a canvas with an sr-only `<h2>` text.

## 8. Chapter 02 · Build (Stage 3, built)

**Concept:** "Systems I have built — shown running." Each project appears as a **live system schematic**, not a card: modules (UI, API, model, data, store, agents, LLMs, viz…) connected by circuit traces with data packets flowing. It assembles from voxels, holds for inspection, then **decompiles** into voxels drifting up-right before the next project assembles. This echoes the hero's disintegration.

**Scroll model:**
- One sticky 100svh workbench. Section height is `100svh + N × 115svh`.
- ScrollTrigger (`top 30%` → `bottom bottom`) maps scroll to a virtual time `u ∈ [0, N]`, and project `i` owns `u ∈ [i, i+1)`.
- **Local time `t`:** assemble 0 → ~0.33 (column by column), hold, decompile 0.78 → 1.
- Traces draw in after their source module, and packets flow only once a trace is complete.
- Info panel fades/slides in and out with `t`; the name decodes (scramble) on change.
- `u` is lerped (dt-based) so it's smooth, and it's scrubbed, so scrolling back reverses everything.

**Interaction:**
- Hovering or focusing a module fills the inspector: kind, label, tech, and a note that uses only CV/README wording. Its traces go hot, with faster and brighter packets, and unrelated modules dim.
- Hovering or focusing a stack chip lights every module using that tech.
- Tap toggles on touch (pen too); keyboard focus works.
- The cursor (or gyro) tilts the schematic plane in 3D (perspective 1400px).
- **Rail:** 01/02/03 with a progress bar per project (`--u` CSS var); clicking scrolls to that project's hold point via Lenis.
- Source / Live links appear only when present in content.
- The inspector shows the project's **build log** (CV points) by default.

**Module icons:** tiny CSS-animated SVG glyphs per kind:
- **model:** prediction bars
- **agent:** orbiting dots
- **viz:** a line chart that draws itself
- **external:** a rotating globe
- **api:** ⇄ arrows
- **ui:** a blinking caret
- **data:** rows
- **store:** a cylinder
- **llm:** a pulsing spark
- **output:** ticks

**Layout (`lib/systemLayout.ts`, automatic from content):**
- Columns come from the longest path; sources are pulled next to their consumer.
- Rows are sorted by predecessor barycentre, which avoids crossings.
- Module width is fitted to the column count with a 40px trace gap. Below 168px wide, modules go **compact** (icon above text, 80px tall).
- Below 560px wide the flow **transposes vertically** (top → bottom). Module height adapts to the screen (32–44px), and a module alone on its row gets up to 236px width.

**Tiers:**
- **Wide:** header + project info left (34vw); schematic right (39vw → gutter, top 120, bottom 262); inspector bottom-right; rail bottom-left.
- **Stacked/mobile:** info under the header, links in their own row, chips hidden (modules show tech). The schematic sits in the middle, the rail as `01 02 03` under the schematic, and a scrollable inspector at the bottom (`min(160px, 21svh)` on phones).

**Reduced motion:** no voxels, packets or tilt. The active project (from scroll) is shown fully assembled and static.

**Accessibility:**
- Modules and chips are real buttons.
- The inspector is `aria-live="polite"`.
- An sr-only line explains the project buttons, and the rail uses `aria-current`.
- The project name has sr-only text beside the scrambled visual.

**Verified:**
- 1238×698 (native pane): all three projects' hold states, mid-decompile, mid-assembly and module inspection.
- 768×1024, 375×812, 375×667 and reduced motion (375×812).
- No console errors across a full-page scroll; build and type-check pass.

## 9. Chapter 03 · Explore (Stage 4, built)

**Concept:** "The route so far — scroll to fly it." Experience is a **flight through ring-gates**, one gate per role, in chronological order of start date. The gates echo the hero's orbit ring, and this is the only chapter with forward motion into depth.

**Scene (`FlightScene.ts`, canvas 2D, pinhole projection, +z forward):**
- Gates sit `GAP = 1600` apart and alternate left/right on a Catmull-Rom lateral path; gate radius is 260.
- **Starfield:** 900 stars (520 on phones) that twinkle, and streak radially with camera speed.
- **Voxel trail:** pulsing squares along the path.
- **Gates:** a ring, a glow, 48 HUD ticks and 3 rotating arc segments each. The docked gate is brighter.
- **Far ringed planet:** a nod to the hero's earth, growing slightly with progress.
- **Crossing flash:** a radial flash in the gate's colour when the camera passes through.
- Vanishing point is at (0.42, 0.48) on wide screens and (0.5, 0.4) stacked/mobile.
- DPR is capped at 1.5.

**Scroll model:**
- The section is `100svh + N × 120svh` with a sticky stage.
- ScrollTrigger (`top 70%` → `bottom bottom`) drives camera z from `zStart = -1500` to `zEnd = lastGate + 500`, and the camera eases toward it.
- **Docking:** mission `i` is active from `gateZ - 900`, and its dock is `gateZ - 650`, where the ring frames the view.
- **Mission clock:** the date is interpolated between docks (dock = the mission's start month), ending at the current month at `zEnd`. While docked, it snaps to the exact start month.
- **Status line:** Pre-flight / Docked · org / Entering gate NN / In transit → next org / Route complete · present day.

**Interaction:**
- The cursor (or gyro) steers the camera, giving parallax on stars, trail and gates.
- **Gate labels** (org + period) float at each ring's top-right; only the docked gate and the next one are labelled. Clicking one flies there via Lenis. They are mouse-only (`aria-hidden`), because the timeline bars duplicate them accessibly.
- **Dossier:**
  - Mission NN / NN and an "Active" LED for present roles.
  - Role (decoded), org and period, with a derived duration (inclusive months, "so far" when present).
  - The CV points as the log (staggered in), plus the stack as "Loadout".
  - Before the first gate it shows a **flight plan** (clickable missions).
- **Timeline:**
  - Month-accurate bars on lanes (overlapping roles are split greedily).
  - Month ticks, with year markers at January and at the first month.
  - A cursor at the camera's date (`--x`).
  - Bars are buttons (with `aria-label` and `aria-current`) that fly to the mission.

**Highlights** (owner request; content-driven via optional `experience[].highlight`, all subtle):
- **Deloitte (featured):**
  - Owner-supplied "D." logo; brand green `#86BC25` as its mission accent (gate, timeline bar, dossier).
  - Gate 14% larger, with a faint dashed outer ring and an accent dot on the rim (echoing the logo's dot).
  - Dossier: logo + **"Big Four"** badge + note "One of the Big Four professional services firms.", a faint accent wash and a 2px top edge.
  - Timeline bar slightly taller and brighter.
  - New log point: "Worked with and handled client data." (the owner's own words).
  - **Milestone line** (`highlight.milestone`): "Earned my first stipend here." A small accent diamond sits under the Big Four note (subtle, per the owner). Dossier spacing was tightened slightly so it still fits at 1280×720.
- **Logic Play (current leadership):**
  - Owner-supplied LP logo.
  - Dossier LED reads **"Current · Leadership"**, and the top edge carries a slow live shimmer.
  - Gate has a slow 2-ring beacon pulse (static in reduced motion).
  - Timeline bar has a live green "now" edge; gate label and flight plan show a "Current" tag.
- **Gate labels:** only the **upcoming** gate is labelled (the docked one is described by the dossier). Labels are clamped inside the stage (widths cached on resize), and tags are hidden in stacked/mobile.

**Tiers:**
- **Wide:** header + clock left; dossier right (min(40vw, 540px), max-height 100svh − 226px, scrolls only if needed; all three dossiers fit at 1280×720); timeline full width at the bottom.
- **Stacked/mobile:** clock inline under the header; dossier as a bottom sheet (34svh, scrollable); compact timeline above it (no bar labels); gate labels without period.

**Reduced motion:** no continuous flight, streaks, twinkle or steer. The camera jumps between docked views (and pre-flight) as you scroll, and it re-renders only on scroll updates.

**Verified:**
- 1238×698: docked at all three gates, in transit, route end, and the flight plan.
- 375×812: docked; reduced motion docked at gate 3.
- The clock, status, dossier and timeline cursor are correct at every checkpoint (e.g. Deloitte dock reads Jun 2026 with the cursor at 7/11).
- No console errors across a full-page scroll; build, type-check and lint pass apart from the 2 known warnings.
- **Not measured:** Explore frame rate. The pane was hidden, so animation frames paused. The expected cost is light (canvas 2D, about 1k primitives a frame).

## 10. Chapter 04 · Evolve (Stage 5, built)

**Concept:** "Every release, a more capable me." A **release history** that echoes the hero's "Version 2.0". Each achievement ships as a release with its own treatment, tracked by a sticky **version rail**, and the chapter ends in the **contact finale**. Unlike the three pinned chapters, Evolve **flows with the page**, a deliberate change of pace.

**Releases** (content: `profile.achievements`, newest/biggest first; `weight: 'major' | 'minor'`):
1. **SENSORA 2.0: Best Implementation Winner** (`layout: 'exhibit'`, major)
   - **Media:** the winning photo as the hero image, plus 3 thumbnails (command center, live detection & tracking, IoT hardware), all `VoxelImage`.
   - **Seal:** a rotating award seal pops in: "BEST IMPLEMENTATION WINNER · SENSORA 2.0".
   - **Text:** tag "Hackathon · Winner · Sep 2026"; title decodes (scramble); event "SENSORA 2.0 · VIT Vellore"; note "36-hour hardware × software hackathon by the Instrumentation Society of India at graVITas ’26."
   - **Project:** SurgeGuard (intelligent queue and crowd management, IoT + software).
   - **Pipeline strip:** DroidCam → YOLO → ByteTrack → XGBoost → Decision pipeline → Arduino. Nodes light in order, then data keeps "pinging" through.
   - **Stats (count-up):** Award / 36 hours / Team Ragnaroks Forge / ₹8,000.
2. **Research: Patents & publications** (`layout: 'research'`, major). Three dossier cards, each with an **honest status chip**:
   - Patent budget from my college (**In progress**, indeterminate progress bar).
   - DOP-XML (**IEEE conference paper**, green "Published · IEEE" stamp; "one of the projects in my patent work"). This does **not** claim a granted or filed patent.
   - Agentic AI research project (**In development**; tags Agentic AI + Containerized systems). A "Classified" stamp sits across redacted spec rows (Core idea / Architecture / Implementation) that scramble but never decode. **Nothing real is hidden in the DOM.**
3. **Celestia 2.0: Top 6 Finalist** (`layout: 'exhibit'`, major; reversed columns)
   - Debug Odyssey (interactive coding-learning platform, clean aesthetic interface).
   - **No image yet**, so a generated `</>` VoxelTitle visual shows, never a "coming soon" placeholder.
   - Seal "TOP 6 FINALIST · CELESTIA 2.0"; stat Placement: Top 6.
4. **Creative & extracurricular: "Beyond the code"** (`layout: 'notes'`, **minor**, deliberately lighter): three tiles with live glyphs:
   - Freelance web developer (browser glyph).
   - Poster & visual design, with Photoshop + Canva chips (poster glyph).
   - DJ & music at the high school's main cultural event (equalizer glyph).
5. **Finale / contact** (`#contact`)
   - The hero figure (clean plate, face crop) **reassembles from voxels** inside a tilted orbit ring, bookending the story.
   - Kicker "Open a channel" and headline "Let's build the next version." (both from `profile.contact`).
   - Email link plus a **Copy** button (clipboard, with mailto fallback), GitHub and LinkedIn pills, and location.
   - Footer: © year + name + "Version 2.0".

**Motion:**
- Entrance choreography uses CSS transitions triggered by `useInView` (`.rv` items stagger via `--i`).
- Seals and stamps pop with an overshoot; pipeline nodes light sequentially; stats count up.
- `VoxelImage` assembly is scroll-scrubbed (`top 92%` → `top 42%`, reversible), and the cursor or a tap pops voxels out of their slots, showing dark holes (the hero's "interior").
- The rail fill is scrubbed across the list, and the active release is tracked with ScrollTrigger toggles. Rail items scroll to their release via Lenis.

**Tiers:**
- **Wide:** rail (190px) + content; exhibits are 2 columns (alternating); research is 3 columns (2 below 1180px); notes are 3 columns; finale is 2 columns.
- **Stacked/mobile (< 5/4 or < 900px):**
  - The rail is hidden, and everything is a single column.
  - The seal moves inside the photo's top-right.
  - The pipeline is 2 columns on phones, and stats are 2×2.
  - In the finale, the portrait comes first (72% width).

**Reduced motion:**
- Everything is visible immediately; images are plain (no voxels or hover); stats are static.
- Redacted rows don't scramble, and CSS animations are disabled globally.

**Accessibility:**
- Each release is an `<article>` labelled by its title.
- `VoxelImage` is `role="img"` with alt text.
- CountUp and scrambled titles have sr-only real text.
- The rail uses `aria-current`, and the redacted block is labelled "Details withheld".
- Real links and buttons are used throughout.

**Verified:**
- 1280×720 (all releases, the finale, and rail states) and 375×812 (exhibit, research, finale).
- Reduced motion (all releases visible, stats static).
- No console errors across a full-page scroll; build, type-check and lint clean (2 known warnings).

## 11. Mobile optimisation (branch `mobile-optimisation`, 2026-09-27)

**Owner brief:** the desktop is final, so do not change it. On phones, some heavy animations occasionally glitched, got stuck or felt less smooth. Audit everything first, and only lighten what is genuinely heavy, keeping the visual intent.

**Audit method** (scripts lived in the session scratchpad, not the repo; recreate them with `puppeteer-core` if needed):
- **Emulation:** headless Chrome (real GPU via ANGLE/D3D11), phone emulation (390×844, DPR 3, touch, mobile UA), **4× CPU throttling**.
- **Frame timing:** per-frame `requestAnimationFrame` deltas per section; Long Animation Frame entries with script attribution.
- **Profiles:** CPU profiles on an unminified build.
- **Ablations:** CSS ablation (toggle one visual feature and re-measure).
- **Entry spikes:** "entry" profiles scrolling into each chapter to catch one-off freezes.
- **Desktop checks:** pixel diffs at 1440×900 against `main`; phone screenshots side by side with `main`.

**Findings (measured, not assumed):**
1. **Infinite CSS animations ran everywhere, even off-screen.** Evolve at 32 ms/frame fell to 10 ms with animations off. Off-screen timers (redacted scrambler every 140 ms, hero telemetry, chapter scanner, status cycle) also kept mutating text, which dirtied layout for the whole page.
2. **Forced synchronous layout:** `VoxelTitle` and `VoxelImage` called `getBoundingClientRect()` every frame after other loops wrote styles. That was 12–21% of CPU in the pinned chapters.
3. **Build packets:** `getPointAtLength` every frame was ~30% of Build's CPU.
4. **Glass (backdrop-filter) over constantly redrawing content:** the Explore dossier cost ~13 ms/frame at 4× CPU (Learn ~4 ms, Build ~2 ms). The hero status card showed no measurable cost, so it was left alone.
5. **Non-composited SVG animations:** Build module glyphs cost ~10 ms of Build's ~25 ms. The Learn planet's inner dash spin repainted its glow-filtered layer (~4 ms). The Evolve seal's text-ring spin with drop-shadow, and the pipeline box-shadow pings, also repainted.
6. **Learn orbit:** opacity and z-index were rewritten for all 34 nodes every frame even when unchanged, and ring SVG attributes were rewritten every frame.
7. **One-off freezes:**
   - ~220 ms (4× CPU) as the SENSORA images entered lazy-load range: canvas prep on the main thread, plus `toLocaleString` rebuilding a formatter every CountUp frame.
   - My own first-pass path sampling (3px) caused a 160 ms hitch on Build project changes; fixed with 8px sampling.
8. **Interaction bugs:**
   - `VoxelTitle` repelled voxels from the last tap position (stale pointer on touch), so titles "glitched" as they scrolled past it.
   - The mobile bottom sheets (Learn panel, Build inspector, Explore dossier) used `overscroll-behavior: contain`, so swipes on them could not scroll the page: the "stuck" feeling.
   - The iOS motion-permission prompt fired on the first tap anywhere, including links and buttons.

**Changes. Invisible (all devices, pixel-identical on desktop):**
- `lib/offscreen.ts` + a rule in `global.css`: chapters, releases and the finale get `data-offscreen` (200px margin), and infinite CSS animations inside are paused. The rule is disabled under reduced motion, where it could freeze a 0.001 ms animation mid-way.
- **Timers gated by visibility:** hero chapter scanner (also skipped when CSS hides it), status cycle (retries until back on screen), telemetry ticker (skipped when hidden or off-screen), redacted scrambler.
- **Build packets:** traces are sampled once per layout into point arrays (8px chords, < 0.7px error) and interpolated; no per-frame `getPointAtLength`.
- **Learn orbit:** skips unchanged node opacity and z-index writes and unchanged ring geometry.
- `CountUp` uses one cached `Intl.NumberFormat`.
- `VoxelImage` canvas prep is queued one image per frame.

**Changes. Touch devices only** (`!pointer.hasFinePointer` in JS, `@media (hover: none) and (pointer: coarse)` in CSS):
- **`VoxelTitle`:**
  - No per-frame rect read and no stale-pointer repulsion. A **tap** on a title scatters its voxels (spring back as before).
  - Once assembled and still, it redraws every 4th frame, so the twinkle is kept.
- **`VoxelImage`:**
  - No per-frame rect read.
  - Decode, crop and resize off the main thread via `createImageBitmap(Blob, …, {resizeWidth, resizeHeight, resizeQuality:'high'})`, with a canvas fallback. (From an `<img>` element it runs on the main thread: measured 370 ms.)
  - Desktop keeps the original canvas path, which stays pixel-identical.
- **Glass panels over animating content → deep tint** (`rgba(12,17,26,.92)`, no live blur): Explore dossier, Learn skill panel, Build inspector. They look the same on these dark scenes (checked side by side).
- **Bottom sheets:** `overscroll-behavior: auto`, so swipes chain to the page (fixes "stuck").
- **Build module glyphs:** stepped timing (`steps(8, jump-none)`; spins `steps(30)`). Same motions in a digital-HUD cadence, with far fewer repaints.
- **Learn planet inner ring:** `steps(160)` over its 40 s turn.
- **Evolve seal:** the whole badge spins on the compositor instead of repainting the text ring; the offset drop-shadow becomes a centred, rotation-proof glow.
- **Evolve pipeline ping:** a pre-drawn glow layer fades via opacity (compositor) instead of animating box-shadow.
- **Research progress bar:** transform instead of `left`; patch-note glyphs are stepped.
- **Motion permission (`lib/pointer.ts`):** the iOS prompt is requested only from taps on the scene, never on links or buttons.

**Deliberately not changed:**
- **Hero visuals:** its cost dropped from the off-screen fixes alone (33 → 9–18 ms at 4× CPU).
- **Voxel counts, particle densities, parallax strengths:** not the bottleneck.
- **Stage heights (100svh):** the band below a pinned stage when mobile toolbars collapse fades into the page colour, so it's invisible.

**Results.** A/B on the same machine, back to back, phone emulation at 4× CPU. Figures are average frame ms / % frames > 33 ms:

| Phase | `main` | `mobile-optimisation` |
|---|---|---|
| Hero idle | 14.7 / 2.3% | **9.3 / 0.4%** |
| Scroll Learn | 28.1 / 22.4% | **15.7 / 2.7%** |
| Scroll Build | 21.5 / 9.3% | **12.4 / 1.9%** |
| Scroll Explore | 23.8 / 8.2% | **15.2 / 3.3%** |
| Scroll Evolve | 21.1 / 7.3% | **12.0 / 1.9%** |
| Idle Build | 26.5 / 16.9% | **12.3 / 1.5%** |

- **Worst single frames:** `main` had 508 / 555 / 268 ms freezes; the branch's worst is ≤ 94 ms.
- Absolute numbers vary between runs with machine load; the back-to-back A/B is the fair comparison. For reference, the first baseline run (same harness, busier machine) had main at 33–58 ms and 50–60% of frames over 33 ms.

**Verification:**
- **Desktop 1440×900** (reduced motion to freeze animation state): all 6 checkpoints are **pixel-identical to `main`**.
- **Phone:** screenshots side by side with `main` look the same in every chapter.
- **Functional checks on phone emulation:**
  - the seal compositor spin is running and the inner spin is off;
  - pipeline `pipe-glow` is running;
  - the sheets have `overscroll-behavior: auto` and no backdrop blur;
  - the hero pauses when scrolled away and resumes;
  - no page errors.
- **Build:** production build, type-check, lint (2 known warnings).
- **Not verified on real hardware** (owner to test on their phone after deploying the branch preview): Safari/iOS specifics such as the motion permission flow and `createImageBitmap` resize support (falls back safely).

## 12. Content (src/content/profile.ts)

**Sources:** CV (`Manoj_Kanna_J_CV-1 (1).docx`, Sep 2026) and public GitHub (`github.com/manojkannaj8`). LinkedIn was behind an auth wall, so nothing was taken from it yet.

- **Identity:** name, wordmark `MANOJ`, tagline (derived from the CV), Chennai, email `manojkannaj8@gmail.com`, GitHub and LinkedIn links. **Phone deliberately omitted** (`phone: null`).
- **Hero copy:** headline `Human ideas. / Machine / possibilities.` and eyebrow `Version 2.0 — a more capable me` (the artwork's own words).
- **Chapters:** `{ id, label, blurb, caption }`. Captions: Learn is "The core — and everything that orbits it."; Build is "Systems I have built — shown running."; Explore is "The route so far — scroll to fly it."; Evolve is "Every release, a more capable me."
- **Education:** SRM IST Ramapuram, B.Tech CSE, Aug 2024 – Present, CGPA 9.35/10.
- **Experience:**
  - Deloitte LLP, Summer Intern (Jun–Aug 2026).
  - Logic Play Technical Club, Technical Head (Aug 2026–Present).
  - CHiPSET Technical Club, Technical Team Member (Nov 2025–Aug 2026; ran the VibeX workshop).
- **Projects:**
  - DOP-XML (Nov 2025).
  - GitHub Repository Analyser (Feb 2026; repo, plus live site `repo-lens-nu.vercel.app`).
  - **Multi-Agentic Resume Analyser: from public GitHub, not on the CV** (the owner may remove it).
- **Project system maps (`projects[].system`):** modules + edges drawn from the CV points / GitHub README. **The owner should sanity-check these**: they are an interpretation of the stated components, and the notes quote CV wording.
  - **DOP-XML:** React frontend → Flask REST API → {CatBoost classifier, Persistence (SQLAlchemy)}, plus Feature pipeline (Python/Pandas/NumPy) → CatBoost.
  - **GitHub Repository Analyser:** GitHub API → FastAPI service → React dashboard (React/Vite/Tailwind) → D3 visualisations.
  - **Multi-Agentic Resume Analyser:** Resume + job description → Streamlit app → CrewAI agents → {Language models (Ollama, Gemini 2.5), Screening output (skill matching, SWOT, scoring, recommendations)}.
- **`experience[].highlight`** (optional): `logo`, `accent`, `badge {label, note}`, `milestone`, `featured`, `leadership`.
  - **Deloitte:** logo, accent `#86BC25`, badge "Big Four" with a note, milestone "Earned my first stipend here.", featured.
  - **Logic Play:** logo, leadership.
  - Deloitte also has a 4th point, "Worked with and handled client data." (owner-provided).
- **Experience dates drive Explore:** `period` strings are parsed (`lib/dates.ts`), so keep the "Mon YYYY – Mon YYYY" / "Mon YYYY – Present" format. "Present" resolves to the current month at runtime.
- **Skills:** 4 groups. The CV typo "SQLlite" is normalised to "SQLite".
- **`skillAliases` (literal search terms only):**
  - AWS → `AWS`
  - Agentic AI → `agentic`, `multi-agent`
  - Machine Learning → `CatBoost`, `ML-based`
  - Data Analysis → `data preprocessing`, `analytics`
  - REST APIs → `REST API`
  - Version Control → `Git`, `GitHub`
- **`achievements` is now a typed `Release[]`** (`layout: 'exhibit' | 'research' | 'notes'`; see §10). **Every item comes from the owner's message of 2026-09-27 or the CV.**
  - SENSORA 2.0 facts from the owner: Best Implementation Winner, hardware × software hackathon at VIT Vellore, SurgeGuard, IoT + software, YOLO / ByteTrack / XGBoost / DroidCam / Arduino, prediction/decision pipeline.
  - **Read off the owner's winning photo** (owner to confirm or remove): 36-hour format, Instrumentation Society of India, graVITas ’26, 16–17 Sep 2026, team "Ragnaroks Forge", ₹8,000 prize.
  - **SurgeGuard pipeline order** (DroidCam → YOLO → ByteTrack → XGBoost → Decision pipeline → Arduino) is my reading of the listed technologies. The owner should confirm it.
  - **Patent wording:** the CV said "Patented an application with an ML-based approach". Per the owner's accurate description, it is now presented as a college-assigned patent budget with patent work in progress. DOP-XML is "published as an IEEE conference paper, one of the projects in my patent work"; no granted or filed patent is claimed.
  - **Agentic AI project:** only its general direction (Agentic AI, containerized systems) and status (toward a patent and IEEE publication, in development). No idea, architecture or implementation details anywhere.
  - Freelance ("portfolios, business and full-stack websites for multiple clients") merges the CV with the new detail. Poster & visual design merges the CV (events across organisations) with the new detail (high school event/team posters in Photoshop and Canva; college events and clubs). DJ & music is the high school cultural event.
- **Media:** paths live in each release's `media[]`. The **first** image is the exhibit's hero. The owner-supplied screenshots were cropped to remove browser chrome (tab titles, URL bar, account avatar) before publishing.
  - **Debug Odyssey image: `TODO(owner)`.** Optimise with `tools/optimize_image.py`, save to `public/achievements/celestia/`, and add it to the Celestia release's `media` (a commented example is in the file).
  - SurgeGuard images can be swapped the same way if the owner sends final versions.
- **`contact`:** `kicker` "Open a channel", `headline` "Let's build the next version." Email, links and location reuse the identity fields.
- **Learn skill graph:** it now reads the new achievements. XGBoost → SurgeGuard; Agentic AI → the Agentic AI research project; CatBoost / Machine Learning → "DOP-XML — IEEE conference paper". Research entries show their status in Learn's panel so they don't duplicate project names.
- **`TODO(linkedin)`:** about/summary; paper title, conference name and year; patent details once the owner can share them.

## 13. Known issues / caveats

- Mobile nav links are hidden below 760 px, and there is **no mobile menu yet** (polish stage).
- The fixed nav has no backdrop, so on phones the logo and CTA sit over scrolling content (e.g. the Evolve cards). A backdrop/blur on scroll is planned for polish.
- **Not verified on real hardware:** the iOS gyro permission flow and low-end phone GPU performance.
- **Reduced motion:** the JS paths were verified via `?reduced-motion` (dev only). The CSS `@media (prefers-reduced-motion)` rules can't be emulated in the pane.
- The hero art constants (`HERO_ART.ring`, `focus`, clean-plate regions) are specific to the current artwork.
- **Lint:** two harmless warnings remain in locked or stable files:
  - `Hero.tsx`: setState in effect, for the WebGL fallback.
  - `Cursor.tsx`: exports `setFigureProbe` alongside the component.
- **Dev-only helpers:** `window.__hero` exposes the hero scene; `?reduced-motion` URL flag. Both are stripped or ignored in production.
- **Claude browser-pane quirk:** the first screenshot after a navigate/scroll in an emulated viewport can be black. The pane was hidden, so no frame had been painted; take a second screenshot. Frame rate under emulation is capped around 72 fps (the hero measures the same), so compare like with like.
- Ordering skills by name inside a ring is content order. Changing the skill lists changes the ring layout automatically.
- **Browser-pane testing tips:**
  - When the pane is hidden, captures can come back cropped (top-left 800×451 CSS px) and animation frames only run when you capture. Temporarily scaling `#root` with `transform: scale()` to fit a capture works, **but ScrollTrigger may auto-refresh while it's applied and store scaled positions**. Always remove the transform and call `ScrollTrigger.refresh()` afterwards (get the instance via `performance.getEntriesByType('resource')` → the `gsap_ScrollTrigger` dep URL → `import()`).
  - Thin tick marks near the right edge of some captures belong to the pane, not the page.
  - With the pane hidden, `requestAnimationFrame` doesn't run, so fps probes time out. Measure only while the pane is visible.
- Chapter labels wrap on phones (< 760px) instead of overflowing (`ChapterHead.css`).

## 14. Next up

- **Owner:** test the `mobile-optimisation` branch on a phone (Vercel creates a preview deployment per branch), then merge into `main`.
- **PR not yet opened** (as of 2026-09-28): the branch is pushed, but the GitHub CLI isn't installed on this machine. Either the owner opens it via https://github.com/manojkannaj8/manojkj-portfolio/compare/main...mobile-optimisation, or install `gh` (`winget install GitHub.cli`) and have the owner run `gh auth login` first.
- **Pending owner inputs:**
  - The Debug Odyssey image.
  - Optionally, final SurgeGuard images.
  - Confirmation of the photo-derived SENSORA details (team, prize, date, organiser) and the SurgeGuard pipeline order.
- **Stage 6, polish:**
  - Mobile menu overlay, plus a nav backdrop on scroll.
  - A global chapter progress indicator.
  - SEO: meta/OG image (a hero still), favicon set, `robots`/sitemap.
  - Preload/perf audit (Lighthouse).
  - Deploy (Vercel suggested).
  - A real-device pass (iOS gyro, low-end Android GPU).
  - Remove dev-only helpers if desired.

---

## Log

### 2026-09-27 — Stage 1: Hero
- Scaffolded Vite/React/TS; installed gsap, lenis and fonts.
- Studied the reference via its public remix page. LinkedIn was auth-walled, so content came from the CV and GitHub only.
- Generated the depth map, fitted the ring, and built the clean plate.
- Implemented the WebGL hero (trail, scene, voxels), cursor, nav, status card, telemetry and live chapter list.
- Verified at 1440×860, 736×698, 736×414 and 375×812 (emulated). Checked the tap shockwave (frozen-frame check) and scroll dispersal. No console errors; ~116 fps in the pane.
- Owner feedback: **"The hero feels really good now, keep it as it is."**

### 2026-09-27 — Stage 2: Chapter 01 · Learn
- Created this file, plus session memory notes.
- Added `chapters[].caption` and `skillAliases` to content, plus `lib/skillGraph.ts` and `tools/skill-graph.mjs` (audit printout).
- Built reusable `ChapterHead` + `VoxelTitle` (canvas voxel type that assembles on scroll and repels from the cursor), for use by all chapters.
- Built the Learn chapter: CGPA planet core, four tilted skill orbits, constellation lines, Signal-trace panel, legend filter, education callout with leader line, drag-to-spin with inertia, cursor/gyro tilt.
- Iterations:
  - Moved education from the left column to a top-right callout (the outer ring's labels collided).
  - Widened the header.
  - Added quadratic node fade-in.
  - Added label side-flipping at the stage edges.
  - Mobile: dots-only until an orbit is chosen, a chip legend, and a scrollable panel.
  - Made active/related labels override filters.
  - Lowered the orbit on wide screens.
- Added a dev `?reduced-motion` override. Reduced motion is now verified for the hero and Learn.
- Verified at 1280×720, 1238×698, 768×1024 (tablet) and 375×812 (mobile): hover, pin, legend filter, mobile tap flow, build mid-state and reduced motion. The production build and type-check pass.

### 2026-09-27 — Stage 3: Chapter 02 · Build
- Owner approved Learn ("perfect continue").
- Added `SystemNode` type + `projects[].system` maps and the Build caption to content; `lib/systemLayout.ts` (auto DAG layout); `lib/scroll.ts` (Lenis registry; Lenis now uses `anchors: true`, so nav links scroll smoothly).
- Built the Build chapter: pinned workbench, scroll-scrubbed project time, voxel assemble/decompile canvas, SVG traces with packets, animated module glyphs, inspector (build log ↔ module detail), stack-chip → module highlighting, 3D tilt, project rail with per-project progress.
- Moved the shared `.chapter-head__label` nowrap and stacked caption-hiding rules into `ChapterHead.css`.
- Iterations:
  - Modules truncated at 4 columns → fitted widths plus a compact (icon-on-top) mode.
  - Tech line overflow in compact mode fixed.
  - Mobile Source/Live pills collided with the date line → moved to their own row.
  - Short phones → adaptive module height, and wider solo modules in vertical flows.
- Verified at 1238×698, 768×1024, 375×812, 375×667 and reduced motion. No console errors; build, type-check and lint clean apart from the 2 known warnings.

### 2026-09-27 — Stage 4: Chapter 03 · Explore
- Owner approved Build ("perfect continue").
- Added `lib/dates.ts`, the Explore caption, and `components/explore/*` (FlightScene, missions, Dossier, Timeline, Explore).
- Iterations:
  - Limited gate labels to the docked and next gate (clutter).
  - Anchored the date mapping to dock positions and snapped the clock while docked (Deloitte dock read "Mar 2026" before the fix).
  - Widened the dossier and tightened log type so Deloitte's log fits without scrolling on desktop.
  - Chapter labels now wrap on phones.
- Verified the checkpoints listed in §9. The Explore fps probe couldn't run with the pane hidden.

### 2026-09-27 — Explore highlight tweaks (owner request)
- Owner: "Everything is perfect". They asked for small, subtle tweaks: more prominence for Deloitte with a factual "Big Four" mention, the client-data point, and extra emphasis for the current Technical Head role at Logic Play.
- Added the optional `highlight` field on experience, owner-supplied logos (keyed to transparency with the new `tools/logo_mark.py`; originals in `art/logos/`), featured/current gate rendering in `FlightScene`, and badge/logo/tag UI in the gate labels, dossier, flight plan and timeline.
- Fixes during verification:
  - The Deloitte dossier overflowed → wider dossier, tighter log lines, more height.
  - The wider next-gate label clipped on mobile → labels clamped on-stage.
  - The docked-gate label collided with the mobile clock → only the upcoming gate is labelled now.
- Verified at 1280×720 (Deloitte and Logic Play docks) and 375×812. No console errors on a full scroll; build passes.
- **Now waiting for the owner's achievement details. No further development until then.**

### 2026-09-27 — Stage 5: Chapter 04 · Evolve + Explore stipend line
- The owner sent the achievement details, plus 4 images (the SENSORA winning photo, 2 SurgeGuard dashboard screenshots, the Arduino hardware photo). The Debug Odyssey image will come later.
- **Explore:** added `highlight.milestone` and the Deloitte line "Earned my first stipend here." (subtle diamond). Tightened dossier spacing to keep the fit at 1280×720.
- **Content:** added the `Media` + `Release` types; rebuilt `achievements` as releases (SENSORA exhibit, research dossiers, Celestia exhibit, creative notes); added `contact`; the Evolve caption; and updated `skillGraph` sources for the new shape.
- **Assets:**
  - Added `tools/optimize_image.py`.
  - Images go to `public/achievements/sensora/` (the screenshots are cropped to remove browser tabs, URL bar and account avatar); originals are in `art/achievements/`.
- **Components:** `media/VoxelImage`, `evolve/*` (Evolve, Exhibit, Research, Notes, Finale, bits), `lib/useInView`. Removed `NextChapterPlaceholder`.
- **Fixes during verification:**
  - The Classified stamp overlapped the card title → it now sits across the redacted spec block.
  - The "Implementation" label was truncated → wider label column.
  - Invalid `<span>` inside `<dl>` → wrapped properly.
- **Verified:** 1280×720 and 375×812, reduced motion, no console errors on a full scroll. Build, type-check and lint pass (2 known warnings).

### 2026-09-27 — Production check + GitHub
- Production build served with `vite preview` and loaded: all 5 sections render, WebGL hero active, no console errors on a full scroll, dev helpers (`window.__hero`) stripped. `dist` is 1.6 MB.
- Initialised git and pushed to https://github.com/manojkannaj8/manojkj-portfolio (`main`). Private screenshot originals are excluded.
- Still recommended before calling it final (Stage 6): a mobile menu + nav backdrop, OG/share meta image, Lighthouse pass, real-device test.

### 2026-09-27 — Mobile optimisation (branch `mobile-optimisation`)
- Owner: desktop is final; audit mobile, lighten only what's genuinely heavy, and keep the character. Work was done on the owner-created branch.
- Built a headless-Chrome audit harness (phone emulation, touch, 4× CPU): frame timing, LoAF attribution, CPU profiles, CSS ablations, entry-spike profiles.
- Fixed, in order of measured impact:
  - off-screen animations and timers;
  - forced layouts;
  - Build packet geometry queries;
  - glass-over-canvas on touch;
  - non-composited SVG/CSS animations on touch;
  - orbit style churn;
  - one-off freezes (off-thread image prep, cached number formatter, staggered prep);
  - touch interaction bugs (stale-pointer title repulsion, bottom-sheet scroll trap, iOS permission prompt on links).
- Details, the results table and verification are in §11. Desktop pixel-identical to `main`.

