# W6-pwa: loading screen, installable PWA, fast first load

**Owned paths:** `next/index.html`, `next/sw.js` (new), `next/manifest.webmanifest` (new), `next/assets/icons/**`
(new), `next/src/main.js`, `next/src/core/assets.js`, `next/src/core/engine.js` (loading-bar draw only),
`next/qa/core/**`, `next/qa/pwa/**` (new), `next/docs/ENGINE_API.md` (loading section), `next/docs/PWA.md` (new),
`next/tools/pwa/**` (new, icon generation).

Context: the game is served at `https://scball1104-star.github.io/Lexicon-quest/next/` by GitHub Pages (static,
the whole repo is uploaded). The repo root has its own old game with a service worker at root scope
(`../sw.js`); a service worker registered at `/Lexicon-quest/next/` scope takes precedence for our paths. Assets
referenced as `../assets/art/*.webp` and `../assets/audio/*.mp3` live at the repo root and must keep working.

## Deliverables
1. **Loading screen** drawn by the engine before assets are ready: the logo (load `assets/ui/logo.png` first), a
   pixel progress bar with the palette's gold, a one-line status ("Loading the Archive...", rotating flavor
   lines from the story), and a "Tap or press any key" prompt at the end (that press also unlocks audio). No
   white flash on boot: `index.html` body background is the game's dark indigo; the canvas appears only when the
   first frame is ready.
2. **Load order and size budget:** measure what the manifest loads (bytes per file, total). Put music and the
   big painted sheets on lazy load (title music starts streaming after the title appears; battle backdrops and
   portraits load during the prologue). Target: first interactive frame under 3 s on a 10 Mbps connection
   (simulate with Playwright's network throttling) and total initial download under 6 MB. Report the table.
3. **PWA:** `manifest.webmanifest` (name "Lexicon Quest", short_name "Lexicon", display standalone, orientation
   any, theme/background colors from the palette, icons 192/512 maskable generated from the logo and the
   hero portrait via `tools/pwa/make_icons.py`), `sw.js` with a versioned precache of the core shell (html, js,
   fonts, ui, tiles, sprites, sfx, jingles) and runtime caching (stale-while-revalidate) for music and painted
   sheets; a tiny in-game toast "Update ready, restart to apply" when a new SW waits. Register from `main.js`
   with the correct scope; never cache `?debug=1` runs. `apple-touch-icon` and iOS meta tags so "Add to Home
   Screen" gives a full-screen game on iPhone.
4. **Resilience:** if an asset fails, the loading screen shows a clear retry prompt instead of a blank canvas;
   the existing error overlay keeps working.
5. **Tests:** `qa/pwa/*.test.mjs`: manifest validity, every precache entry exists, icon sizes; `qa/pwa/pwa.py`:
   headless Chromium loads the page offline after one online visit (service worker serving the shell) and
   captures the loading screen at 0%, 50%, 100% (throttled) to `qa/pwa/out/`.
6. `docs/PWA.md`: how caching works, how to bump the version, the size table.

Keep `node next/qa/run.mjs` and `python next/qa/shots.py` green (the shots harness boots the game; make sure the
loading screen and the SW do not slow or break it; shots run with `?debug=1`). No em dashes in player text.
