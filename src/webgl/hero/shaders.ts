/**
 * Hero shaders.
 *
 * Passes per frame:
 *  1. trail   — ping-pong buffer of cursor energy + flow direction (screen space, y-up)
 *  2. scene   — full-screen composite: extended backplate, orbit-ring light,
 *               smeared wordmark, depth-parallaxed figure, cursor relight,
 *               and the "machine interior" revealed wherever voxels broke away
 *  3. voxels  — one GL point per figure cell; detached cells fly out and reassemble
 *
 * Conventions: "suv" = screen uv (y-down), "iuv"/"uv" = hero image uv (y-down).
 */

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

export const TRAIL_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uPrev;
uniform vec2 uA;          // segment start (trail uv, y-up)
uniform vec2 uB;          // segment end
uniform vec2 uVelIn;      // pointer flow direction (y-up), roughly -1..1
uniform float uStrength;
uniform float uRadius;
uniform float uDecay;
uniform float uAspect;
uniform vec4 uBurst;      // xy = centre (y-up), z = ring radius, w = strength

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec4 here = texture(uPrev, vUv);
  vec2 v = here.gb * 2.0 - 1.0;
  // advect along the stored flow so the trail drifts like a wake
  vec4 prev = texture(uPrev, vUv - v * 0.006);
  float I = max(prev.r * uDecay - 0.003, 0.0);
  v = (prev.gb * 2.0 - 1.0) * 0.99;

  vec2 asp = vec2(uAspect, 1.0);
  float d = segDist(vUv * asp, uA * asp, uB * asp);
  float s = exp(-d * d / (uRadius * uRadius)) * uStrength;
  I = min(1.0, I + s);
  v = mix(v, uVelIn, clamp(s * 2.0, 0.0, 1.0));

  // tap / click shockwave: an expanding ring that throws voxels outward
  if (uBurst.w > 0.0) {
    vec2 q = (vUv - uBurst.xy) * asp;
    float r = length(q);
    float b = exp(-pow((r - uBurst.z) / 0.035, 2.0)) * uBurst.w;
    I = min(1.0, I + b);
    v = mix(v, q / max(r, 1e-4), clamp(b * 1.5, 0.0, 1.0));
  }
  fragColor = vec4(I, clamp(v * 0.5 + 0.5, 0.0, 1.0), 1.0);
}`

/** Shared between the scene pass and the voxel pass so both agree on every cell. */
const COMMON = /* glsl */ `
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform sampler2D uTrail;
uniform vec2 uRes;        // drawing buffer px
uniform vec4 uRect;       // hero image rect in buffer px (x, y, w, h), y-down
uniform vec2 uImgSize;    // source image px
uniform float uCell;      // voxel size in source image px
uniform vec2 uTilt;       // parallax driver, -1..1
uniform float uTime;
uniform float uIntro;     // 0 = scattered, 1 = assembled
uniform float uScroll;    // 0 = intact, 1 = dispersed by scroll
uniform float uIdle;      // idle silhouette erosion on/off

const vec3 BLUE = vec3(0.42, 0.62, 1.0);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}
float depthAt(vec2 uv) { return texture(uDepth, clamp(uv, 0.0, 1.0)).r; }
float maskOf(float d) { return smoothstep(0.14, 0.22, d); }
vec2 parallax(float d) { return uTilt * (d - 0.3) * vec2(0.026, 0.02); }
vec2 imgToScreen(vec2 iuv) { return (uRect.xy + iuv * uRect.zw) / uRes; }
vec4 trailAt(vec2 suv) { return texture(uTrail, vec2(suv.x, 1.0 - suv.y)); }

// 0 = cell intact on the figure, 1 = fully broken away
float detachOf(vec2 cell, vec2 cc, float d, float m, out vec2 flow) {
  vec4 T = trailAt(imgToScreen(cc + parallax(d)));
  flow = T.gb * 2.0 - 1.0;
  float h = hash21(cell);
  float D = T.r * 1.2;
  // intro: voxels land top → bottom with jitter
  float s0 = h * 0.45 + cc.y * 0.35;
  D = max(D, 1.0 - smoothstep(s0, s0 + 0.2, uIntro));
  // scroll: the head lifts away first
  float s1 = h * 0.35 + cc.y * 0.45;
  D = max(D, smoothstep(s1, s1 + 0.25, uScroll));
  // idle: slow erosion along right-facing silhouette edges
  float edge = m * (1.0 - maskOf(depthAt(cc + vec2(0.035, -0.012))));
  float n = noise(cc * 9.0 + vec2(uTime * 0.12, -uTime * 0.07));
  D = max(D, uIdle * edge * smoothstep(0.5, 0.85, n));
  float inside = step(0.0, cc.x) * step(cc.x, 1.0) * step(0.0, cc.y) * step(cc.y, 1.0);
  return smoothstep(h * 0.55, h * 0.55 + 0.35, D) * step(0.5, m) * inside;
}
`

export const SCENE_FS = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
uniform sampler2D uWord;
uniform vec4 uWordRect;   // wordmark rect in screen uv, y-down
uniform vec2 uVel;        // smoothed pointer velocity (screen uv / s)
uniform vec2 uLightPos;   // light position, screen uv y-down
uniform float uLight;     // cursor light amount
uniform float uWordIn;    // wordmark reveal
uniform vec3 uRing;       // orbit ring: centre (image px) + radius
out vec4 fragColor;

vec3 plate(vec2 uv) {
  vec2 c = clamp(uv, 0.0, 1.0);
  float inside = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  vec3 col = mix(textureLod(uImg, c, 5.5).rgb, texture(uImg, c).rgb, smoothstep(0.0, 0.05, inside));
  return col * exp(-max(-inside, 0.0) * 3.0);
}

float word(vec2 uv, float lod) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return textureLod(uWord, uv, lod).r;
}

void main() {
  vec2 suv = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;
  vec2 iuv = (suv * uRes - uRect.xy) / uRect.zw;

  // two-step inverse parallax so near and far layers slide against each other
  vec2 uv = iuv - parallax(depthAt(iuv));
  float d = depthAt(uv);
  uv = iuv - parallax(d);
  float inImg = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float m = maskOf(d) * smoothstep(0.0, 0.004, inImg);

  vec4 T = trailAt(suv);
  float tr = T.r;
  vec2 tv = (T.gb * 2.0 - 1.0) * vec2(1.0, -1.0); // to y-down

  // ── backplate ──────────────────────────────────────────────
  vec2 buv = uv + tv * tr * 0.012;
  vec3 bg = plate(buv);

  // orbit ring: a highlight that turns to face the light, plus a slow orbiting glint
  vec2 rc = buv * uImgSize - uRing.xy;
  float ring = exp(-pow((length(rc) - uRing.z) / 6.0, 2.0));
  float ang = atan(rc.y, rc.x);
  vec2 lImg = ((uLightPos * uRes - uRect.xy) / uRect.zw) * uImgSize - uRing.xy;
  float facing = pow(max(cos(ang - atan(lImg.y, lImg.x)), 0.0), 10.0) * uLight;
  float orbit = pow(max(cos(ang - uTime * 0.45), 0.0), 60.0);
  bg += BLUE * ring * (facing * 0.85 + orbit * 0.55) * uIntro;

  // ── wordmark: sits between backplate and figure ────────────
  vec2 wuv = (suv - uWordRect.xy) / uWordRect.zw;
  wuv -= uTilt * vec2(0.01, 0.03);
  wuv += tv * tr * vec2(0.035, 0.12);
  vec3 wc = vec3(0.0);
  if (wuv.x > -0.25 && wuv.x < 1.25 && wuv.y > -0.6 && wuv.y < 1.6) {
    vec2 sm = clamp(vec2(uVel.x, uVel.y * 0.25) * 0.045, vec2(-0.09), vec2(0.09));
    float sl = length(sm);
    vec2 ca = vec2(0.0025 + sl * 0.25, 0.0);
    float lod = 0.8 + sl * 38.0;
    for (int i = 0; i < 6; i++) {
      vec2 o = sm * (float(i) / 5.0);
      wc += vec3(word(wuv - o + ca, lod), word(wuv - o, lod), word(wuv - o - ca, lod));
    }
    wc /= 6.0;
    // reveal: left → right wipe with a soft leading edge
    wc *= smoothstep(wuv.x - 0.15, wuv.x, uWordIn * 1.3 - 0.15);
  }
  bg = bg * (1.0 - wc * 0.8) + vec3(0.8, 0.85, 0.93) * wc * 0.8;

  // ── figure ────────────────────────────────────────────────
  vec2 cell = floor(uv * uImgSize / uCell);
  vec2 cc = (cell + 0.5) * uCell / uImgSize;
  float dc = depthAt(cc);
  vec2 flow;
  float hollow = step(0.01, detachOf(cell, cc, dc, maskOf(dc), flow));

  vec3 fig = texture(uImg, clamp(uv + tv * tr * 0.003, 0.0, 1.0)).rgb;

  // cursor relight using normals reconstructed from the depth map
  float e = 2.5 / 683.0;
  float dx = depthAt(uv + vec2(e, 0.0)) - depthAt(uv - vec2(e, 0.0));
  float dy = depthAt(uv + vec2(0.0, e)) - depthAt(uv - vec2(0.0, e));
  vec3 n = normalize(vec3(-dx * 16.0, dy * 16.0, 1.0));
  vec2 lv = (uLightPos - suv) * vec2(uRes.x / uRes.y, -1.0);
  float diff = max(dot(n, normalize(vec3(lv, 0.4))), 0.0);
  float lum = dot(fig, vec3(0.299, 0.587, 0.114));
  fig += BLUE * pow(diff, 3.0) * exp(-dot(lv, lv) * 2.2) * uLight * (0.12 + lum * 0.7);

  // machine interior: depth contours + voxel lattice, visible where cells broke off
  float f = d * 60.0;
  float contour = 1.0 - smoothstep(0.0, 1.5 * fwidth(f), abs(fract(f - 0.5) - 0.5));
  vec2 g = fract(uv * uImgSize / uCell);
  float lattice = step(0.9, max(g.x, g.y));
  float pulse = 0.6 + 0.4 * sin(d * 40.0 - uTime * 3.0);
  vec3 interior = vec3(0.01, 0.016, 0.03) + BLUE * (contour * 0.55 * pulse + lattice * 0.1);
  fig = mix(fig, interior, hollow);

  vec3 col = mix(bg, fig, m);

  // ── intro scan beam ───────────────────────────────────────
  float beamY = uIntro * 1.3 - 0.15;
  col *= smoothstep(beamY + 0.02, beamY - 0.12, suv.y);
  col += BLUE * exp(-pow((suv.y - beamY) * 60.0, 2.0)) * (1.0 - uIntro) * 0.7;

  // ── grade ─────────────────────────────────────────────────
  col *= 1.0 - uScroll * 0.5;
  vec2 vq = suv - vec2(0.55, 0.45);
  col *= 1.0 - dot(vq, vq) * 0.6;
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.03;
  fragColor = vec4(col, 1.0);
}`

export const VOXEL_VS = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
layout(location = 0) in vec2 aCell;
out vec3 vCol;
out float vP;
out float vA;
void main() {
  vec2 cc = (aCell + 0.5) * uCell / uImgSize;
  float d = depthAt(cc);
  vec2 flow;
  float p = detachOf(aCell, cc, d, maskOf(d), flow);
  if (p < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }

  float h = hash21(aCell + 3.7), h2 = hash21(aCell + 11.3);
  vec2 dir = vec2(cos(h * 6.2832), sin(h * 6.2832)) * 0.7
           + flow * vec2(1.0, -1.0) * 1.4
           + vec2(0.45, -0.25)                       // drift back-and-up, like dust leaving the silhouette
           + vec2(0.0, -2.0) * smoothstep(0.0, 0.4, uScroll);
  dir = normalize(dir);
  float dist = p * p * (0.06 + h2 * 0.3);
  vec2 swirl = vec2(sin(uTime * 1.3 + h * 20.0), cos(uTime * 1.1 + h2 * 20.0)) * 0.014 * p;
  vec2 pos = imgToScreen(cc + parallax(d)) + (dir * dist + swirl) * vec2(uRes.y / uRes.x, 1.0);

  gl_Position = vec4(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0, 0.0, 1.0);
  gl_PointSize = uCell * uRect.z / uImgSize.x * mix(1.0, 0.4 + h2 * 0.5, p);
  vCol = textureLod(uImg, cc, 2.0).rgb;
  vP = p;
  vA = 1.0 - smoothstep(0.5, 1.0, p) * 0.9;
}`

export const VOXEL_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vCol;
in float vP;
in float vA;
out vec4 fragColor;
const vec3 BLUE = vec3(0.42, 0.62, 1.0);
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float edge = max(abs(q.x), abs(q.y));
  vec3 c = vCol * (1.0 + (-q.x - q.y) * 0.16);   // bevel lit from top-left
  c += BLUE * (smoothstep(0.6, 0.95, edge) * 0.9 + 0.18) * vP;
  fragColor = vec4(c, vA);
}`
