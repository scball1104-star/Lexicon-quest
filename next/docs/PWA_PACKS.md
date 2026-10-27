# Expansion packs: the API as built (XP-packs, 2026-10-25)

Read with `docs/briefs/XP-packs.md` (the contract), `docs/EXPANSION_RECONCILIATION.md` (wins on conflict) and `docs/PWA.md` (caches, budget). This file is what was built and where it differs from the brief. Pointer from `docs/PWA.md`.

## What a pack is

Two packs, `x1` (The Wider Valley) and `x2` (The Mere Country). **Every file a pack owns carries its prefix** and is left out of the precache and the `modulepreload` block:

| Pack files | Rule |
|---|---|
| code and data | `src/data/<id>/**` except `live.js`; `src/data/maps/<id>_*.js` |
| art | `assets/{tiles,sprites,ui,backdrops}/<id>_*` and `<id>.png` (the tile sheet, `assets/tiles/x1.png`) |
| manifest | `assets/<id>_manifest.json` (generated) |
| audio | not in the pack lists: music is lazy and runtime-cached; SFX ride the audio manifest's `packs.<audioPack>` (`x1`; X2 reuses `ep2`) through `audio.loadPack` |

`src/data/<id>/live.js` (`X1_LIVE`, `X1_REGIONS`, `x1On(region)`, the same for x2) is the one exception: part of the initial bundle, flipped last by X1-integrate / X2-integrate. `x1On(region)` = `X1_LIVE` and the region not set to `false` and `packReady('x1')`. A region name nobody lists counts as on.

## `src/game/packs.js`

```js
PACKS                      // the table of the brief, verbatim; the ONLY place a pack name is known to code
ensurePack(id, opts)       // idempotent, never rejects, never blocks: Promise<{ id, ok, failed, skipped, ms }>
packReady(id)              // sync
onPackReady(id, fn)        // fn(id) once ready (at once if already); returns an unsubscribe
packWanted(id, flags)      // PACKS[id].wanted(flags)
packsToAwait(flags)        // ids that are enabled, not ready and wanted by these flags (the call sites await exactly these)
awaitPacks(ids, ms=1500)   // Promise: ensurePack for each, but gives up at ms; resolves [] at once when nothing is enabled
packForMap(mapId)          // { id, prefixed, touched } | null
startPackWatch(engine, params)   // main.js: warm after the title when a save wants a pack, and when a running game first does
mergeTileFragment(db, frag)      // pure; never overwrites an id the database has
bindPacks(engine), forcePack(id), packState(id), resetPacks(), setPackDefaults(o)   // engine hookup, QA and tests
```

`ensurePack` steps: dynamic `import(entry)` then `register()` (the pack's `index.js`); in parallel `assets/pack_files.json`; `assets.loadPackManifest(PACKS[id].assets)`; merge `<id>_tiles` into the live tile database (`assets.json('tiles')`, in place); `audio.loadPack(audioPack)` fire-and-forget; ready; then idle warm of every file in `pack_files.json[id]` (a plain `fetch`, which the service worker's runtime route caches; it waits for the worker to control the page, at most 30 s). **Failure is quiet**: `{ ok: false, failed: [...] }`, one toast per session ("Some new places could not load. They will try again."), one automatic retry after 5 s, another on the next call. A data module that `index.js` skipped as "missing" but `pack_files.json` lists counts as failed (a network error looks like a 404 in a browser). `enabled()` false (both switches today) resolves `{ ok: true, skipped: true }` with no import and no fetch. `opts` (tests, QA): `engine, importer, packFiles, table, enabled, warm:false, retryMs, quiet, swWait:false`. `?pack=x1,x2` on the page URL forces packs on while their switch is off (content stays gated by `x1On()`).

## The entry module `src/data/<id>/index.js`

`register()` (async, idempotent) imports `flags, enemies, items, loot, encounters, shops, npcs, quests, text, story` **in that order** (`flags` first so quests can name them), each as `./<name>.js`, behind a guard: a module that does not exist is skipped (listed in the result's `skipped`), a module that exists and throws **rejects** (so a broken module fails the pack and is retried, not hidden). Each module exports `register()` (named, or default function). Resolves `{ id, loaded: [...], skipped: [...] }`. Sets `X1_READY`; `X1_MAPS_LISTED` mirrors the value exported by the pack's `encounters.js` (that module's own `register()` does the non-enumerable `defineProperty` on `ZONES`; the integrate agent flips the flag there). Node tools and tests import `src/data/<id>/index.js` and call `register()` themselves.

Seams (everything else was already exported): `registerStory({ scenes, lines, conditions })` in `src/game/story.js` (returns collided ids; an existing id is never overwritten; `storyCollisions()` reports them; `sceneAllowed` reads the pack conditions), `prependTalk(npcId, entries)` in `src/data/npcs.js` (prepends, once per entry object, returns the count added). `FLAG_IDS` and `ALL_SIDE_QUESTS` are plain arrays: push. `ENEMIES`, `ITEMS`, `ENCOUNTERS`, `ZONES`, `ZONE_LOOT`, `SHOPS`, `NPCS`, `FLAGS`, `BANTER`, `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY` were already exported objects. The battle-data helpers (`enemy`, `enc`, `eq`, `weapon`) are X1-battle's.

## Call sites (smallest diffs)

| Where | What |
|---|---|
| `src/main.js` | `startPackWatch(engine, params)` after `engine.push(first)`; never awaited; installs nothing while every pack is off |
| `src/scenes/loadGame.js` `load()` (Continue) | inside the fade callback: `packsToAwait(g.flags)`; if any, `awaitPacks(ids)` (at most 1.5 s) then enter the field; otherwise the old synchronous path |
| `src/scenes/title.js` `startEpisode2` / `startEpisode3` (`newGameEp2` / `newGameEp3`) | the same pattern |
| `src/world/maps.js` `loadMap` | the field guard (below) |
| Episode 1 credits handoff | **not edited** (`field.js` is not owned here). `startPackWatch` already warms `x2` as soon as `ep1_complete` is set (scene change or 3 s tick), long before the credits finish; a later agent who wants a hard call adds `ensurePack('x2')` at `rollCredits` |

**Field guard** (`loadMap`): a map id starting with a pack prefix, or listed in a pack's `touches`, first waits for its pack (at most 1.5 s, behind the fade the field already draws; only when the pack is enabled and not ready). A prefixed map whose pack did not arrive resolves `null` (the door never existed); a touched map loads unpatched. When a pack becomes ready, every touched map already in the module cache is marked stale and the next `loadMap` of it re-imports the module as `...<id>.js?v=n` (the service worker ignores the query); `peekMap` keeps returning the module being played until then. A map module may therefore evaluate `x1On()` at its top level.

## Assets (fragments, never shared files)

- `assets.loadPackManifest(path)` (new, in `src/core/assets.js`) loads `assets/<id>_manifest.json` **without** touching the main manifest, its lazy groups or `manifestReady` (the engine's `loadManifest(path)` replaces all three, so the brief's fallback "a lazy group in the main manifest" was **not needed**). Every entry loads; a retry loads only what failed.
- **Atlas resolution.** An atlas whose id is `<pack>_<base>` with base in `npcs, enemies_battle, enemies_field, bosses_battle, portraits, heads` is merged **into the base atlas in place** (frames, anims, meta; the two images are stacked on one canvas, base on top so its coordinates never move; the base wins a frame-name clash), in either arrival order, and again if the base is reloaded. `actors.js`, the battle scene, the portraits and the heads therefore find a pack id without any change. An id nobody has still falls back as before (`resolveSprite` falls back to the hero and logs one `console.warn`; that function is `field` code, not changed).
- `qa/core/sync-manifest.mjs --pack <id>` writes `assets/<id>_manifest.json` from the prefixed files only; without `--pack` prefixed files are ignored. Tile fragment id is `<id>_tiles` (`assets/tiles/<id>_tiles.json`, same shape as `tiles.json`); tile sheet image id is the stem (`x1`).

## PWA

`tools/pwa/build_pwa.py` reads `PACKS` (through node; mirror `tools/pwa/packs.json`, rewritten on every build), excludes pack files from the precache and the preload block, writes `assets/pack_files.json`, and puts `PACK_PATTERN` into `sw.js`. The service worker routes matching paths through its existing stale-while-revalidate **runtime** handler into `lq-next-runtime-v1`; activation deletes only old `lq-next-shell-*` caches, so a shell-only release never evicts a pack. A stale pack file refreshes in the background (at most every 10 minutes) and shows on the next visit. `--check` also reports a stale `pack_files.json`. `--sizes` prints each pack's wire size.

**The wave-close checklist** (orchestrator): `node qa/core/sync-manifest.mjs --pack x1` (and `x2`), then `python tools/pwa/build_pwa.py`, then `node qa/run.mjs pwa core`. A stale `pack_files.json` is a warning day to day and a failure under `LQ_RELEASE=1`.

## Budget

`qa/pwa/budget_ratchet.json` (asserted by `qa/pwa/precache.test.mjs`): initial download at most 6.33 MB after XP-packs, 6.38 after X1-integrate, 6.45 after X2-integrate; cap 6.5 and tap prompt 2.5 unchanged; tap prompt at most 2.32 and never growing; pack caps x1 1.0 MB, x2 0.8 MB (wire; `qa/pwa/packs.test.mjs`). The agent named in `stages` raises `initialMB` to its stage value in its own step.

## What each later agent must export or name

- Data modules: `src/data/<id>/<name>.js` for `name` in the order above, each exporting `register()` (idempotent; mutate the shared objects; push onto `FLAG_IDS`; use `registerStory` and `prependTalk`).
- Gates in existing maps, NPC talk entries and scene conditions: `x1On(region)` / `x2On()` from `src/data/<id>/live.js`.
- Art: only prefixed files; run `sync-manifest --pack <id>`. Atlases to be found by existing code must be named `<id>_npcs`, `<id>_enemies_field`, `<id>_enemies_battle`, `<id>_bosses_battle`, `<id>_portraits`, `<id>_heads`. Tile fragment `<id>_tiles.json` plus sheet `<id>.png`.
- Maps: `src/data/maps/<id>_*.js`; edits to `touches` maps behind `x1On()` / `x2On()`.
- X1-integrate / X2-integrate: flip the `*_LIVE` switch last, set the ratchet to your stage, run the wave-close checklist, and run `python qa/pwa/pwa.py --only packoffline` (needs the build to be current).

## Tests

`qa/core/pack_ensure.test.mjs`, `pack_register.test.mjs`, `pack_assets.test.mjs`, `pack_maps.test.mjs`, `pack_maps_fail.test.mjs`; `qa/pwa/packs.test.mjs`, `precache.test.mjs`; headless offline: `python qa/pwa/pwa.py --only packoffline` (visit with `?pack=x1,x2`, runtime cache holds every pack file, offline reload brings both packs up).

## X1-integrate additions (2026-10-26)

- **A failed import is not retried by the browser.** Chromium caches a failed dynamic `import()` for the life of the page (checked: the second import of the same URL does not hit the network), so `ensurePack`'s retry could never succeed after a network failure. `attempt()` now fetches the pack's own code (`src/data/<id>/*.js` from `assets/pack_files.json`) with `fetch` before importing the entry; a failure there leaves the module map clean and the retry (after 5 s, and on the next call) is real. `loadMap` counts failed imports per map and imports with a new `?v=` the next time, and does not cache a missing pack map as null. Tests: `qa/saves/x1_saves.py` (the entry refused once; the pack comes up on the retry), `qa/core/pack_maps_fail.test.mjs`.
- The x1 switch is on (`src/data/x1/live.js`), the ratchet is at the `after-X1-integrate` stage (6.38 MB), the tap prompt has 306 bytes of headroom (`node qa/integrate/x1_budget.mjs` prints the numbers).

## The cave pack (2026-10-27)

`cave` (prefix `cave_`, entry `src/data/cave/index.js`, cap 0.8 MB) holds the Deep Stacks: generator, prefabs, data and later its sprites. It has no audio pack and touches no map at boot; `CAVE_LIVE` in `src/data/cave/live.js` gates it. Registered by the orchestrator so the precache never lists cave code.
