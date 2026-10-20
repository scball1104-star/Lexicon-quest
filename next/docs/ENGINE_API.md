# Engine API (NEXT core)

The chassis every scene and system plugs into. Source of truth: `src/core/*.js` (each file opens with a
usage comment). Reference implementations: `src/scenes/_devTitle.js` (menus, input, settings),
`src/scenes/_devField.js` (grid movement, followers, camera, layer cache, transitions, overlay scenes),
`src/scenes/_devGallery.js` (asset inspector). Read those before writing a scene.

## Conventions

- Internal resolution **384 x 216**, tiles 16 px. All drawing is in game pixels; helpers round positions.
- Logic runs at a fixed **60 Hz** (`STEP = 1/60`); `update(dt)` always gets `dt = 1/60` seconds. Count frames
  for anything timing-critical. Rendering happens once per display frame after the steps.
- Never read keys: read **actions** (`up down left right confirm cancel menu run pageL pageR start`).
- Never use `setTimeout` for gameplay: use `engine.waitFrames(n)`, `engine.wait(sec)`, `engine.tweens`. They
  pause with the game, follow the debug time scale and stay deterministic.
- Pure modules (`rng.js`, `tween.js`, `save.js`, font measuring, `computeLayout`, `ActionState`, `normalizeAtlas`)
  import cleanly in node.

## Boot

`index.html` -> `src/main.js`: creates `Engine`, installs `LQ_DEBUG`, registers the dev scenes, `engine.boot()`
(loads `assets/manifest.json`, fonts, UI art, audio, then the scene registry) and pushes the first scene:
`?scene=` if registered, else `title`, else `_devTitle`.

URL params: `?debug=1` (FPS overlay, F3 toggles), `&fps=0`, `&scene=name`, `&seed=n`, `&speed=x`, `&touch=on|off`,
`&gate=0` (skip the "Tap or press any key" gate on a normal run).

### Loading (W6-pwa; the PWA side is in `docs/PWA.md`)
`engine.boot(opts)` draws the loading screen itself (`BootScene` in `engine.js`: logo, gold bar, status line,
rotating story lines, retry prompt). Order: logo + main font first; then the manifest's eager assets in parallel with
`opts.scenes` (main.js passes `loadRegistry`, which awaits `assets.manifestReady`); then the audio runtime (its SFX
prefetch starts only now); then fonts and UI art, `engine.loaded = true`, and the lazy groups start in the
background (`engine.lazyLoad` is the Promise, `lazyloaded` is emitted); then, with `opts.gate`, "Tap or press any
key" (that press also unlocks audio). main.js sets `gate` on normal runs only, and on `?debug=1` runs it also awaits
`engine.lazyLoad` before `LQ_DEBUG.ready()` resolves, so QA never sees a half-loaded game.
`opts`: `{ manifest, audio: true, scenes: async fn, gate: false, flavor: [lines], lazy: true }`.
A critical (eager, non-optional) asset that fails to load shows "Some pages did not load." with a retry prompt;
a press reloads only what is missing (`assets.retryMissing`). Debug: `engine.bootScene.debugState()`.

**Lazy groups.** `assets/manifest.json` may list `"lazy": { "story": [ids], "battle": [ids], "art": [ids] }`
(hand-written; `sync-manifest.mjs` keeps it and drops unknown ids). Ids in a group are NOT loaded at boot; they load
after it, group by group in manifest order. Until a lazy asset arrives, `assets.has(id)` is false and `img` / `atlas`
return the placeholder, so scenes must keep guarding with `has()` (every current scene does). Need one early:
`await engine.assets.whenLoaded('battle')`. Today: `story` = portraits, dialog_keyart; `battle` = enemies_battle,
bosses_battle, party_battle; `art` = environments (the 675 KB painted sheet). Anything the title, name entry or the
first field frame draws must stay eager; `qa/pwa/precache.test.mjs` pins the boot-critical ids.

### Scene registry (W2 agents)
Create `src/scenes/registry.js`, then run `node qa/core/sync-manifest.mjs` (it adds `"scenes"` to the
manifest; the file is only imported when listed, so the game never requests a missing file):
```js
import { TitleScene } from './title.js';
import { FieldScene } from './field.js';
export default { title: TitleScene, field: FieldScene };  // class (new X(engine)) or factory (engine) => scene
export async function install(engine) { /* optional: register debug commands, preload, etc. */ }
```

## Scenes

```js
export class FieldScene {
  constructor(engine) { this.engine = engine; }
  enter(data) {}            // pushed / replaced in
  exit() {}                 // popped / replaced out
  update(dt, below) {}      // fixed step; below = true when updating under an updateBelow scene
  draw(r) {}                // r = engine.renderer
  onResume(result) {}       // the scene above popped with result
  debugState() { return {}; } // optional: shown in LQ_DEBUG.state().sceneState
}
```
Flags on the scene object: `transparent` (scenes below are drawn first: dialogs, menus, pause),
`updateBelow` (the scene below keeps updating, e.g. a dialogue over an animated field), `backdrop`
(image/canvas used to tint the letterbox bars while the scene is on top).

A scene pushed during an update first updates on the next step (the press that opened it cannot close it).
Exceptions in a scene are caught: logged once with `console.error`, shown on screen, and `cancel` pops the
broken scene.

## Engine (`engine`)

| Member | Notes |
|---|---|
| `registerScene(name, ClassOrFactory)`, `hasScene(name)` | |
| `push(nameOrScene, data)` -> scene | top scene pauses until popped |
| `pushAwait(nameOrScene, data)` -> Promise(result) | e.g. `const r = await engine.pushAwait('shop', {...})` |
| `pop(result)`, `replace(nameOrScene, data)`, `reset(nameOrScene, data)` | `reset` clears the stack |
| `fadeTo(fn, opts)` -> Promise | cover, run `fn` (may be async), uncover. opts: `color` ('#000'), `duration` (0.5 s total), `style` ('fade', 'dither', 'iris', 'mosaic', 'wipe' or `fn(r, amount, opts)`), `x,y` (iris center, screen px), `ease`, `hold` (s), `freeze` (true). Input is suspended throughout. |
| `waitFrames(n)`, `wait(sec)`, `after(n, fn)` | game-time timers |
| `tweens` | see tween.js below |
| `input`, `renderer` (= `r`), `assets`, `audio`, `save`, `rng`, `fonts`, `settings`, `touch` | services |
| `setSetting(key, value)` | persists + applies (volumes, scale mode, touch controls); emits `settings` |
| `on(evt, fn)` / `off` / `emit` | events: `scene`, `settings`, `resize`, `visibility`, `loaded`, `postdraw` |
| `frame`, `time`, `timeScale` | logic frame counter, game seconds, debug speed |
| `game` | slot for the running game's state object (owned and saved by gameplay code; shown by LQ_DEBUG) |
| `advance(n)`, `perfStats()` | automation |

`engine.audio` is W1-audio's `createAudio()` wrapped so an audio fault can never crash the game
(`music, stopMusic, pushMusic, popMusic, sfx, jingle, ambience, setVolumes, ...`; see `src/core/audio.js`).
Unknown ids are silent. Volumes follow `settings.master/music/sfx/ambience`.

## Renderer (`r`)

Game-pixel helpers on the 384x216 offscreen canvas (`r.ctx` is the raw 2D context, `r.W`, `r.H`):

- `clear(color)`, `rect(x,y,w,h,color)` (= `fillRect`), `strokeRect(x,y,w,h,color,t=1)`, `pixel`, `line` (Bresenham),
  `circle(cx,cy,r,color,fill)`, `ellipse(cx,cy,rx,ry,color,fill)`, `gradientV(x,y,w,h,top,bottom,steps)` (FF window fill),
  `dither(x,y,w,h,color,density)` (4x4 Bayer, world-anchored), `ditherEllipse(cx,cy,rx,ry,color,density)` (soft shadows).
- `sprite(atlasOrId, frameName, x, y, {flipX, flipY, alpha, tint, tintAmount, scale, topLeft})`: puts the frame's
  **origin** pixel on (x, y) (feet for characters). `tint: '#fff'` = hit flash (cached per frame+color).
- `image(imgOrId, x, y, {sx,sy,sw,sh,w,h,flipX,alpha,tint})`, `tile(img, sx, sy, dx, dy, w=16, h=16)`,
  `nineSlice(img, [sx,sy,sw,sh], border, dx, dy, dw, dh, {center, mode:'stretch'|'tile'})`.
- `text(str, x, y, {font:'main'|'large'|'num'|'num_big', color, align, width, shadow, outline, chars, alpha, lineHeight})`,
  `measure(str, font)`, `wrap(str, maxWidth, font)`, `font(id)`.
- `pushCamera(x, y)` / `popCamera()` (rounded), `pushClip(x,y,w,h)` / `popClip()`, `withAlpha(a, fn)`.
- `createLayer(w, h)` -> `{canvas, ctx, w, h, clear()}`; `drawLayer(layer, sx, sy, sw, sh, dx, dy)`: cache static map
  layers once, blit the visible window each frame.
- Screen fx: `shake(mag, frames)`, `flash(color, frames, alpha)` (both honour `reduceMotion`), `fade(color, a)`,
  `ditherFade(color, k)`, `iris(cx, cy, radius, color)`, `mosaic(size)`, `snapshot()` (copy of the frame).
- `setBackdrop(imgOrNull)`: art for the letterbox bars (drawn dark and blurred). Default: an ambient glow sampled
  from the game frame (`settings.backdrop = 'ambient' | 'plain'`).
- `view`: `{scale, x, y, w, h (device px), cssScale, cssX, cssY, cssW, cssH, screenW, screenH, dpr, integer, mode,
  touchMode: 'none'|'bars'|'below'|'overlay', bars:{left,right,top,bottom}, safe}`; `toGame(clientX, clientY)`.

Scaling (DESIGN 3) is computed in **device pixels**: largest integer scale, exact fit below 2x
(`settings.scaleMode`: `integer` default, `sharp` = integer upscale then smooth fit, `fit` = nearest fit).
Verified pixel-perfect (every game pixel a uniform NxN block) at 1920x1080, 1536x864@1.25, 1440x900,
1366x768, 844x390@3, 390x844@3, 1180x820@2.

## Input (`engine.input`)

`pressed(a)`, `held(a)`, `released(a)`, `repeat(a)` (press, then 18 frames, then every 5), `heldFrames(a)`,
`heldDir()` (latest held direction: use for 4-way movement), `repeatDir()` (menus), `anyPressed()`,
`consume(a)` (one UI layer ate the press), `suspend()/resume()`, `inject(action, frames)`,
`pointer {x, y, down, pressed, released, type}` in game px, `tapIn(x, y, w, h)` (tap on a dialogue box = confirm),
`startText()/takeText()/stopText()` (typed characters for name entry; letters do not fire actions meanwhile),
`lastDevice` ('keyboard'|'gamepad'|'touch'|'mouse'), `onDevice(fn)`, `setKeyBindings(map)`, `setPadBindings(map)`.

Keyboard: arrows/WASD, confirm Z/Enter/Space, cancel X/Esc/Backspace, menu C/Tab, run Shift, pageL/R Q/E,
start Enter. Gamepad (standard): d-pad/left stick, A confirm, B cancel (+ hold = run), X/Y menu, LB/RB page,
RT run, Start. Touch: DOM overlay (only UI outside the canvas) shown on touch devices; d-pad (slide between
directions), A, B, Menu, Run toggle (latches `run`), fullscreen. `input.setTouchSkin({...})` swaps art; the
engine applies `assets/ui/touch/*.png` automatically (manifest `"touch"`).
Run semantics for the field: `running = input.held('run') !== settings.alwaysRun`.

## Assets (`engine.assets`) and the manifest

`assets/manifest.json` (paths relative to `next/`): `images`, `atlases` (JSON with `"image"`), `json`, `fonts`,
plus `touch` and `scenes`. **Keep it in sync with `node qa/core/sync-manifest.mjs`** (scans `assets/ui`,
`assets/sprites`, `assets/tiles`, `assets/palette.json`; ids are file stems; fonts: `font.json` = `main`,
`font_<x>.json` = `<x>`). `qa/core/assets.test.mjs` fails on missing files and reports unlisted ones.

`img(id)`, `atlas(id)`, `json(id, fallback)`, `font(id)`, `has(id)`, `ids(kind)`, `url(path)`,
`loadImage(id, path)` (runtime), `setImage/setAtlas/setJson` (generated assets). Missing assets log one
`console.warn` and return a magenta checker placeholder; nothing throws.

Atlases are normalized: `atlas.frames[name] = {x, y, w, h, ox, oy, ...extra}`; frames may be `[x,y,w,h]`,
`[x,y,w,h,ox,oy]` or `{frame|rect, anchor|origin, ...}`; origin order: frame anchor, `origins[name]`, atlas
`origin`, bottom-center. `atlas.anims[name] = {frames, fps, loop}`; `animFrameAt(anim, seconds)` picks the frame.
Extra top-level keys stay on `atlas.meta`.

## Fonts (`engine.fonts`, `src/core/font.js`)

COMMON.md bitmap format, white glyphs tinted per color (cached), 1 px ink shadow by default. Inline codes:
`{c:gold}text{/c}` (named or `#hex`), `{i:potion}` (ui.json `icon_potion`), `{i:btn_confirm}` (the current device's
button glyph). Substitute `{hero}` yourself before drawing. Pre-colored fonts (`font_num`, `font_num_big`) are
drawn untinted; `color` picks a variant (`white crit heal mp poison gray`); `font.drawWord(ctx, 'BREAK', x, y)`.
`measure`, `measureBlock`, `wrap(text, maxWidth)` (keeps colors balanced per line), `length` (typewriter units),
`draw(ctx, text, x, y, {chars})`. An embedded 5x7 fallback font renders before/without the art.
Named colors come from `ui.json textColors` + rarity: `white gray dim gold cream cyan blue green red orange violet
pink shadow`, `common magic rare legendary set`, plus `hp mp fury heal crit ink`.

## Save (`engine.save`)

`save(slot, data, meta)` / `load(slot)` / `loadEnvelope` / `exists` / `remove` / `list()` / `exportSlot` /
`importSlot` / `registerMigration(fromVersion, fn)`. Slots 1..3 (`lq-next-slot-<n>`), slot 0 = autosave.
Envelope `{v, savedAt, meta, data}`; every storage call is guarded. Settings: `lq-next-settings` (use
`engine.setSetting`). Defaults in `DEFAULT_SETTINGS` (save.js).

## RNG and tweens

`createRng(seed)`: `next, int(a,b) (inclusive), range, chance, pick, weighted, shuffle, jitter, fork(label), state`.
`hash2d(x, y, seed)` for order-independent per-tile variation. `engine.rng` is seeded from `?seed=` when given.
`engine.tweens.to(obj, props, seconds, {ease, delay, onUpdate, onDone, tag})` -> Promise (+ `.cancel()`),
`value(from, to, sec, fn)`, `wait(sec)`, `after(sec, fn)`, `cancel(idOrTag)`, `finishAll()` (skip).
Easings in `ease` (`outCubic`, `outBack`, `inOutSine`, `steps(n)`, ...). `frames(n)` converts frames to seconds.

## Debug and QA

`window.LQ_DEBUG`: `ready()`, `state()`, `scene()`, `push/replace/pop/reset`, `setSpeed(x)` (0 freezes),
`advance(n)`, `press(action, frames)`, `perf()`, `view()`, `overlay(on)`, `settings(patch)`, `errors()`,
`register(name, fn)` (then `LQ_DEBUG[name](...)` and `call(name, ...)`), `provide(name, fn)` (adds to `state()`).
Register `warp(mapId, x, y)`, `battle(encId)`, `give(itemId, qty)`, `setFlag(flag, value)` from your systems.

- `node qa/run.mjs [filter]`: every `qa/**/*.test.mjs` with `node --test`, 90 s timeout each, summary table.
- `python qa/shots.py [--only a,b] [--device phone|all] [--list] [--fps]`: headless Chromium over a local server
  of the repo root; saves `qa/out/<device>-<shot>.png` and `qa/out/shots-report.json`; fails on any console or page
  error. Add a shot per scene to `qa/shots.json` (step vocabulary at the top of `shots.py`). Default devices:
  desktop 1920x1080 and phone 844x390@3 (touch); also laptop, small, hidpi, portrait, tablet.
