# W1-core: engine core, renderer, input, scenes, debug, QA harness

**Owned paths:** `next/index.html`, `next/package.json`, `next/src/main.js`, `next/src/core/**` (EXCEPT
`audio.js`, owned by W1-audio), `next/src/scenes/_dev*.js`, `next/qa/run.mjs`, `next/qa/shots.py`,
`next/qa/shots.json`, `next/qa/core/**`, `next/docs/ENGINE_API.md`, `next/assets/manifest.json`.

You build the chassis every other system plugs into. Quality of this layer decides whether the game *feels*
professional (crisp pixels, zero input lag, correct scaling everywhere, no jank).

## Deliverables
1. `index.html`: only a `<canvas id="game">` (plus a tiny loading line), viewport meta with viewport-fit=cover,
   no page scroll, `touch-action:none`, dark themed body. Loads `src/main.js` as a module. No other UI markup.
2. `package.json` `{"type":"module","private":true}`.
3. `core/engine.js`: fixed 60 Hz step with accumulator (clamp spikes, pause when hidden), scene stack
   (`push/pop/replace`, `onResume(result)`), `fadeTo(fn,{color,duration})` transitions, services
   (`input, assets, audio, save, rng, settings`), frame counter, time scale for debug.
   Audio: `import('./audio.js')` and use `createAudio(...)` if present (W1-audio is writing it now with API
   `createAudio({basePath})` -> `{init(manifest), unlock(), music(id,{fade}), stopMusic(f), pushMusic(id), popMusic(f),
   sfx(id,{volume,pitch,pan}), jingle(id), ambience(id,{fade}), setVolumes(v)}`); fall back to a no-op stub.
4. `core/renderer.js`: render to a 384x216 offscreen canvas; present to the visible canvas with nearest
   scaling per DESIGN 3 (integer scale when it is >= 2, otherwise exact fit). Handle devicePixelRatio so pixels
   stay crisp on phones. Letterbox/pillarbox areas: tasteful dark backdrop (subtle gradient + vignette, optionally a
   heavily darkened, blurred copy of a backdrop image set by the current scene). Helpers: `clear, rect, fillRect,
   strokeRect, line, circle, sprite(atlas, frame, x, y, {flipX, alpha, tint, scale})`, `image`, `tile`,
   `nineSlice(img, rect, border)`, `text` (via font.js), camera push/pop, layer canvases for caching static map
   layers, `snap()` rounding. Expose `renderer.view` (current scale, offsets) so input can map touches.
5. `core/input.js`: actions per DESIGN 3 (`pressed/held/repeat`, `lastDevice`). Keyboard, Gamepad API (standard
   mapping, stick deadzone), touch. **Touch controls**: DOM overlay shown only on touch devices: d-pad on the left,
   A and B on the right, a Menu button top-right, Run toggle. Place them in the pillarbox bars when the bars are
   wide enough, otherwise as translucent overlays over the bottom corners. Multi-touch, slide between d-pad
   directions without lifting, no scroll/zoom/double-tap zoom/long-press menus. Pixel-styled CSS placeholders
   now; support an image skin later (`input.setTouchSkin(urls)`).
6. `core/assets.js`: manifest-driven loader (`assets/manifest.json`: `{images:{id:path}, atlases:{id:path-to-json},
   json:{id:path}}`, paths relative to `next/`), progress callback, `img(id)`, `atlas(id)` -> `{image, frames, anims,
   origin, ...}`, `json(id)`. Missing optional assets must not crash: log once and return a visible placeholder.
7. `core/save.js` (3 slots + settings, versioned, try/catch every storage call), `core/rng.js` (seeded
   mulberry32 with `int(a,b)`, `pick`, `chance`), `core/tween.js` (easings + tween runner).
8. `core/font.js`: draws bitmap fonts in the COMMON.md format, tint cache per color, `{c:gold}..{/c}` color codes
   with named colors, `measure`, `wrap(text,maxWidth)`, optional 1 px shadow, typewriter support
   (`drawPartial(text, nChars)`). **Embed a fallback font** (a clean 5x7 pixel font as inline bitmap data) so text
   renders even before W1-ui-art's `assets/ui/font.json` exists. Use the real font automatically when present.
9. `core/debug.js`: `window.LQ_DEBUG` = `{state(), scene(), push(name,data), setSpeed(x), register(name,fn),
   call(name,...args), ready()}` where `ready()` resolves after assets load and 10 frames render. `?debug=1` shows
   an FPS/frame-time overlay. Later agents register `warp`, `battle`, `give`, `setFlag` through `register`.
10. Scenes registry: `src/scenes/registry.js` is NOT yours; expose `engine.registerScene(name, factory)` and make
    `main.js` import a scene list from `src/scenes/registry.js` if present (fallback to your dev scenes).
    Build `_devTitle.js` (shows text, cursor menu, proves input) and `_devField.js` (a 48x32 checker map of colored
    16 px tiles with a few solid blocks, a 16x24 player box with grid movement, smooth interpolation, run, camera
    follow clamped to bounds, two follower boxes trailing the leader's path). These are references for W2 agents.
11. `qa/run.mjs`: find every `next/qa/**/*.test.mjs`, run each with `node --test` in a child process with a 90 s
    timeout, print a summary table, exit non-zero on any failure.
12. `qa/shots.py` + `qa/shots.json`: serve the REPO ROOT with a threaded static server on a free port (so
    `../assets/...` paths resolve), open `/next/index.html?debug=1` in headless Chromium at desktop 1920x1080 (dpr 1)
    and phone landscape 844x390 (dpr 3, is_mobile, has_touch), await `LQ_DEBUG.ready()`, run each shot
    (`{"name":"title","steps":[{"call":"push","args":["title"]},{"wait":800},{"key":"Enter"}]}`), save PNGs to
    `next/qa/out/<device>-<name>.png`, and FAIL on any console error or page error. CLI: `--only name`, `--device`.
13. `qa/core/*.test.mjs`: rng determinism, save roundtrip with a fake localStorage, font wrap/measure (pure parts).
14. `docs/ENGINE_API.md`: a concise reference other agents will code against.

## Verify
Screenshots at 1920x1080, 1440x900, 1366x768, 844x390 (touch), 390x844 (portrait touch). Check: crisp pixels
(zoom in on screenshots), correct letterbox, touch controls placement, no blurry text, input works (drive it with
Playwright key presses and touch taps), FPS overlay ~60. Measure frame time with the perf API in headless mode.
