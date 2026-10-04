# Manoj Kanna J — portfolio

An interactive world built around the hero artwork. Vite + React + TypeScript, raw WebGL2 for the hero, GSAP + Lenis for motion.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint     # oxlint
```

## Editing content

**All copy lives in [`src/content/profile.ts`](src/content/profile.ts).** Components never hard-code text.

- Empty fields (`null` / `[]`) are hidden, never shown as placeholders.
- `TODO(linkedin)` marks details still to be added.
- `chapters` drives the nav, the hero's live LEARN / BUILD / EXPLORE / EVOLVE list, and each chapter header.
- `skillAliases` controls how skills are traced to your work in the Learn chapter — check the result with `node tools/skill-graph.mjs`.
- Experience `period` strings are parsed for the Explore timeline — keep the `Mon YYYY – Mon YYYY` / `Mon YYYY – Present` format.
- `achievements` is a list of "releases" (`exhibit` / `research` / `notes`) for the Evolve chapter. To add an image, optimise it first — `python tools/optimize_image.py in.jpg public/achievements/<name>.webp 1400` (add `--crop x0,y0,x1,y1` to cut browser chrome out of screenshots) — then add it to that release's `media` list (the first image is the large one).
- `projects[].system` describes each project as modules + data-flow edges for the Build chapter; the layout is automatic. Set it to `null` to hide the schematic.

Project history, decisions and next steps live in [`updates.md`](updates.md).

## Structure

```
src/
  content/profile.ts        ← the only file to edit for text
  components/
    chrome/                 nav, custom cursor
    hero/                   hero DOM layer (copy, status card, chapter list, telemetry)
    chapter/                shared chapter header + voxel title
    learn/                  Chapter 01 — education core + skill orbits
    build/                  Chapter 02 — projects as running system schematics
    explore/                Chapter 03 — experience as a flight through ring-gates
    evolve/                 Chapter 04 — achievements as a release history + contact finale
    media/                  VoxelImage (images that assemble from voxels)
  webgl/
    gl.ts                   tiny WebGL2 helpers
    hero/HeroScene.ts       renderer: input → trail → scene → voxels
    hero/shaders.ts         GLSL for all hero passes
  lib/                      shared pointer store, reduced-motion hook, text scramble
  styles/                   tokens + globals
public/hero/                runtime assets (clean plate + depth map)
art/                        original artwork (not deployed)
tools/                      asset pipeline scripts
```

## Hero asset pipeline

If the hero image changes, regenerate both assets and update `HERO_ART` in `HeroScene.ts` (size, ring, focus):

```bash
python tools/make_depth.py art/hero-original.webp public/hero
python tools/clean_plate.py art/hero-original.webp public/hero/hero-depth.png public/hero/hero-plate.webp
```

`make_depth.py` needs `torch` + `transformers` (Depth-Anything-V2-Small). `clean_plate.py` paints out the artwork's baked lettering so it can be re-created as live type — its regions are specific to the current artwork.

## Accessibility & performance

- `prefers-reduced-motion`: no intro, trail, voxels, parallax, smooth scroll or custom cursor; hero renders as a still frame, chapters arrive fully built. In dev, add `?reduced-motion` to the URL to test this.
- Touch: gyro tilt (iOS asks permission on first tap), tap shockwaves, scroll-driven dispersal.
- WebGL render loop pauses when the hero is off-screen or the tab is hidden; DPR capped at 1.5 (1.25 on touch).
- No WebGL2 → static image fallback with the same copy.
