# Lexicon Quest NEXT: loading screen, offline play and installing (W6-pwa)

Served from `https://scball1104-star.github.io/Lexicon-quest/next/` (GitHub Pages, static, the whole repo is
uploaded). The old game at the repo root keeps its own service worker (`../sw.js`, scope `/Lexicon-quest/`).
Ours is `next/sw.js` with scope `/Lexicon-quest/next/`; the longest scope wins, so inside `next/` only our worker
runs, and the old game is untouched.

## What the player gets

* **Loading screen** (`BootScene` in `src/core/engine.js`, API in `docs/ENGINE_API.md`): the logo, a gold pixel
  bar, "Loading the Archive...", story lines from the prologue, then "Tap or press any key". That press also
  unlocks audio, so the title music can start the moment the title appears. If a needed file fails, the screen says
  "Some pages did not load." and a press retries only what is missing. The HTML behind it is the same dark indigo
  gradient (`#14101e`), so there is no white flash.
* **Install**: `manifest.webmanifest` (name "Lexicon Quest", short name "Lexicon", standalone, any orientation,
  `#14101e` from the palette ink ramp). iOS: `apple-touch-icon` (180 px) and the `apple-mobile-web-app-*` tags give a
  full-screen game from "Add to Home Screen". Android/desktop Chrome offer "Install" from the manifest.
* **Offline**: after one visit the whole game runs without a network (music plays once it has been heard).
* **Updates**: a new deploy installs quietly in the background. The game then shows the toast "Update ready,
  restart to apply"; the new version takes over the next time the game is closed and reopened (all tabs closed).
  Nobody is ever switched to new code in the middle of a battle, and the shell is never half old, half new.

## How caching works (`sw.js`)

| Request | Strategy |
|---|---|
| The game shell: `index.html`, `manifest.webmanifest`, every `src/**/*.js`, `assets/manifest.json`, `palette.json`, `ui/` (fonts, window, touch skin), `tiles/`, `sprites/`, `backdrops/`, `icons/`, `audio/manifest.json`, **sfx** and **jingles** | **Precache, cache-first.** Downloaded at install into `lq-next-shell-<SHELL_VERSION>` (287 files). Any page navigation inside `next/` is answered with the cached `index.html`. |
| Music (`../assets/audio/*.mp3`, `assets/audio/music/*.mp3`), ambience, painted sheets (`../assets/art/*.webp`) | **Stale-while-revalidate** into `lq-next-runtime-v1`: a cached copy is returned at once and refreshed in the background (at most once per file per 10 minutes). `Range` requests (the `<audio>` element) get proper `206` answers cut from the cached file. The first play of a track streams from the network while the full file is cached behind it. |
| `?debug=1` pages and everything they load | **Straight to the network**, never cached. `main.js` does not even register the worker on those runs (`qa/shots.py` and every QA harness use `?debug=1`). |
| Anything else (cross-origin, POST, files not in the list) | Network, untouched. |

Install details: files are fetched with `cache: 'no-cache'` (a 304 costs no body, and stale HTTP-cache bytes never
land in a new version's cache); 16 at a time; one missing non-critical file is skipped with a warning, but if
`index.html`, `src/main.js` or `src/core/engine.js` fail the install fails and the old version keeps running. The
first-ever install calls `skipWaiting()` and `clients.claim()` so offline works in the same session; later versions
wait. Activation deletes old `lq-next-shell-*` caches; the runtime cache is kept.

Registration (`src/main.js`): 2.5 s after the game is playable, with `scope` = the `next/` folder, so the 5 MB
precache never competes with the first frame. `reg.waiting` or a worker reaching `installed` while a controller
exists shows the toast (`engine.toasts.flash`, from `src/ui/toast.js`).

## How to bump the version

`SHELL_VERSION` and the precache list in `sw.js` and the `<link rel="modulepreload">` block in `index.html` are
**generated**. After any change to the shell (a module, a sprite sheet, an sfx, `assets/manifest.json`, `index.html`):

```bash
python next/tools/pwa/build_pwa.py          # rewrite sw.js and index.html (version = hash of every precached file)
python next/tools/pwa/build_pwa.py --check  # exit 1 when stale (the release gate)
python next/tools/pwa/build_pwa.py --sizes  # precache size table
LQ_RELEASE=1 node next/qa/run.mjs pwa       # the same gate inside the test runner: stale = failure
```

Because the version is a content hash, "bump" is automatic: change a file, run the script, deploy. **If you deploy
without running it, returning players keep the old shell** (cache-first) until some file in the list changes and the
script runs. Without `LQ_RELEASE=1` the test only prints a WARNING, so day-to-day edits do not turn the suite red.
Music, ambience and painted sheets need no bump: they refresh by themselves. Icons: `python
next/tools/pwa/make_icons.py` (from `assets/ui/logo.png` and the hero portrait in `assets/sprites/portraits.png`)
writes `assets/icons/`; then run `build_pwa.py`.

## Load order and size budget

`assets/manifest.json` has a `lazy` section (group order = load order). Eager assets (and the 1.3 MB of scene
modules) load behind the loading screen; lazy groups start once the game is playable and finish while the player is
on the title, the name entry and the prologue:

| Group | Ids | Why lazy |
|---|---|---|
| `story` | portraits, dialog_keyart | first used in the prologue dialogue |
| `battle` | enemies_battle, bosses_battle, party_battle | first battle is minutes away |
| `art` | environments (675 KB painted sheet) | battle backdrop layers and dialogue key art |

Also deferred: the audio runtime's SFX prefetch (2.7 MB) now starts only after the scene modules are in, and the
music streams (title music starts after the title appears; nothing music-sized is in the boot path). Module graph:
`index.html` carries `<link rel="modulepreload">` for the 94 modules (main.js's own graph first), which removed the
serial scene-registry waterfall (tap prompt 3.1 s before the preload, 2.4 s after, same throttled run; before the SFX prefetch was moved behind the prompt it was 5.9 s).

**Measured** (`python next/qa/pwa/pwa.py`, Chromium headless, throttled to 10 Mbps down and 40 ms latency, text
gzipped as GitHub Pages serves it; bytes are on the wire):

| Moment | Time | Downloaded | Of which |
|---|---|---|---|
| First loading-screen frame | 1.2 to 1.3 s | 0.43 MB | html, logo, font, first modules |
| "Tap or press any key" shown (game playable) | 2.4 to 2.6 s | 1.27 MB | modules 0.42, pixel art 0.75, json 0.04, audio started 0.06 |
| Everything fetched by the page (lazy groups and SFX prefetch done) | about 6.7 s | 5.26 MB | sfx and jingles 3.10, pixel art 1.01, painted sheet 0.68, modules 0.42, json 0.04 |
| Music, streamed after the title | on demand | 0.9 to 4.2 MB per track | `../assets/audio/title.mp3` is 4.16 MB; cached after the first play |

Targets from the brief: first interactive frame under 3 s (2.4 to 2.6 s: met) and total initial download under 6 MB
(5.26 MB: met; the audio prefetch is 59 % of it and happens behind the title). The service worker's own install adds a
background pass of conditional requests (304 for what the page just fetched). `qa/pwa/precache.test.mjs` pins the
budget: under 2.5 MB before the tap prompt and under 6.5 MB initial, by file size. The initial cap was 6 MB until
2026-10-21; Episode 2's SFX took it to 6.00 MB, so it moved to 6.5 MB (the tap-prompt budget, the one a player
feels, did not change). Episode 3 must not raise it again: split SFX and ambience into per-episode packs.

**Precache contents** (`build_pwa.py --sizes`, 287 files):

| Group | Files | Raw KB | Wire KB (gzip text) |
|---|---|---|---|
| js modules | 107 | 1310 | 424 |
| png art (sprites, tiles, ui, backdrops, touch, icons) | 48 | 1109 | 1109 |
| json | 27 | 255 | 31 |
| html + manifest | 2 | 8 | 2 |
| sfx | 94 | 2702 | 2702 |
| jingles | 9 | 793 | 793 |
| **total** | **287** | **6176** | **5061** |

Runtime-cached on top (only if played or seen): music 0.9 to 4.2 MB per track (9 tracks, about 19 MB in all),
ambience 1.1 MB, `environments.webp` 0.68 MB.

## Tests and tools

* `node next/qa/run.mjs pwa`: `qa/pwa/manifest.test.mjs` (manifest, icon sizes against the real PNG headers, iOS tags,
  no registration on `?debug=1`, worker debug bypass) and `qa/pwa/precache.test.mjs` (every precache entry exists,
  every file the game manifest loads is precached or a runtime sheet, lazy groups valid, load budget, release gate).
* `python next/qa/pwa/pwa.py [--only loading,retry,offline,update,debug] [--mbps 10]`: headless Chromium. `loading` captures
  the loading screen at 0, 50 and 100 % (throttled) to `qa/pwa/out/<device>-loading-<pct>.png` and prints the bytes and
  times above; `retry` blocks a critical file and expects the retry prompt (`desktop-loading-error.png`) and a clean recovery; `offline` visits once, goes offline, reloads and must reach the title from the worker; `update` serves a
  changed `sw.js` and expects the waiting worker plus the toast; `debug` checks `?debug=1` leaves no worker and no
  cache. Report: `qa/pwa/out/pwa-report.json`.
* `tools/pwa/make_icons.py`, `tools/pwa/build_pwa.py` as above.

## Known limits

* A new version fetches every shell file again with a conditional request: unchanged files that the browser's HTTP
  cache still holds cost a 304, anything evicted or changed is downloaded in full. There is no per-file reuse across
  cache names.
* iOS evicts a home-screen app's storage after weeks of non-use; the next visit simply re-installs.
* Music is only available offline after it has been played once online (4.2 MB for the title alone is too much to
  precache).

## Expansion packs (XP-packs, 2026-10-25)

The two expansions are **packs**, not part of the shell: every file with the `x1_` / `x2_` prefix (and `src/data/x1/**`, `src/data/x2/**` except `live.js`) is left out of the precache and the preload block, fetched on first need, and cached by the worker's runtime route. The initial download is held by `qa/pwa/budget_ratchet.json` (6.33 MB after XP-packs). The whole API, call sites and checklists are in `docs/PWA_PACKS.md`.
