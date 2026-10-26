# XP-packs: the one expansion-pack mechanism for both expansions (X1 wave 1, job 1 of 3)

Shared infrastructure. It replaces `X2-packs.md` (retired) and is the first job of the whole expansion build: it runs in X1 wave 1 beside X1-story and X1-battle
(their owned paths are disjoint from yours) and **everything after it, in both episodes, depends on it**. Read `docs/briefs/COMMON.md`, `DESIGN.md` section 4,
`docs/EXPANSION_RECONCILIATION.md` (decision log; it wins over the plans), `docs/PWA.md` (the whole file: caches, load order, the budget), `tools/pwa/build_pwa.py`,
`qa/pwa/precache.test.mjs`, `src/core/assets.js` (lazy groups, `loadManifest(path)`), `src/core/audio.js` (`loadPack`), `src/world/maps.js` (`loadMap`),
`src/game/story.js` and the exports of `src/data/quests.js`, `npcs.js`, `text.js`.

## The constraint (Fact, run 2026-10-25)

The initial download is **6.30 MB of a 6.5 MB cap** and the before-the-tap-prompt load is 2.30 MB of 2.5 MB. Scott: the cap is **not** raised. Headroom is about 0.2 MB.
Both expansions add far more than that (eleven X1 maps and twelve X2 maps, about 40 scenes each, new tile and sprite sheets), so none of it is part of the initial
download: **maps, data, scenes and art are packs**, fetched lazily on first need, runtime-cached by the service worker, never on the boot path.

Budget ratchet (pinned in `qa/pwa/budget_ratchet.json`, asserted by `qa/pwa/precache.test.mjs`; the cap and the 2.5 MB tap-prompt cap stay exactly as they are):

| Stage | Initial download (the test's file-size measure) | Who may raise the ratchet |
|---|---|---|
| Today | 6.30 MB | |
| After XP-packs | at most 6.33 MB | XP-packs |
| After X1-integrate | at most 6.38 MB | X1-integrate (the hub's small edits to five existing maps are the growth) |
| After X2-integrate | at most 6.45 MB | X2-integrate (its six small edits to existing maps) |

Before-the-prompt load: at most 2.32 MB after XP-packs, and **no further growth** afterwards. Pack caps (wire, text gzipped as GitHub Pages serves it; code, data and art only):
**x1 at most 1.0 MB, x2 at most 0.8 MB.** Audio is budgeted separately and stays lazy: music tracks 3.5 MB or less each, an SFX pack 0.35 MB or less, an ambience 0.6 MB or less.

## The contract (one mechanism; X1 and X2 plug in with data only)

### 1. Declaration: one table, one place

`src/game/packs.js` exports `PACKS`, the only place a pack name is known to code:

```js
export const PACKS = {
  x1: { entry: '../data/x1/index.js', prefix: 'x1_', assets: 'assets/x1_manifest.json', audioPack: 'x1',
        touches: ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3'],
        wanted: (flags) => !!flags.first_fight_done, enabled: () => X1_LIVE },
  x2: { entry: '../data/x2/index.js', prefix: 'x2_', assets: 'assets/x2_manifest.json', audioPack: 'ep2',
        touches: ['east_road', 'nameless_hollow', 'nh_chapel', 'court_f1', 'court_f2', 'court_f3'],
        wanted: (flags) => !!flags.ep1_complete, enabled: () => X2_LIVE },
};
```

`prefix` is the naming rule: **every file a pack owns carries its prefix** (`src/data/maps/x1_*.js`, `assets/tiles/x1.png` and `assets/tiles/x1_tiles.json`, `assets/sprites/x1_*`,
`assets/ui/x1_*`, `assets/backdrops/x1_*`), and all of a pack's code and data live in `src/data/<id>/` and `src/data/maps/<id>_*.js`. Ids inside the files keep the plans' names.
`src/data/<id>/live.js` is the one exception: it is tiny, holds the switch (`X1_LIVE = false`, `X1_REGIONS`, `x1On(region)`, which is `X1_LIVE && region on && packReady('x1')`), is part of the
**initial** bundle (existing maps import it) and is excluded from the pack file list. **You create both** `src/data/x1/live.js` and `src/data/x2/live.js` (all false); the flips are the owning
integrate agent's, last (X1-integrate, X2-integrate). X1-story and X2-story import them and do not create them.

### 2. The entry module

`src/data/<id>/index.js` (XP-packs writes both skeletons now): imports each data module behind a guard (a missing module is skipped, so later agents plug in just by
exporting `register()`), calls their `register()` in the fixed order `enemies, items, loot, encounters, shops, npcs, quests, text, story`, is **idempotent**, sets `<ID>_READY`, and sets the zone-listing
flag (`X1_MAPS_LISTED`, `X2_MAPS_LISTED`) only when the owning integrate agent has flipped it. Registration **mutates the shared objects** (`ENEMIES`, `ITEMS`, `ENCOUNTERS`, `ZONES` via the non-enumerable
`defineProperty` pattern, `ZONE_LOOT`, `SHOPS`, `NPCS`, `FLAGS` **and `FLAG_IDS`** (it is computed before the Episode 3 flags today: push onto it), `ALL_SIDE_QUESTS`, `BANTER`, `BANNERS`, `BOOKS`, `BARKS`,
`BESTIARY`, `SCENES`, `LINES`, the scene-condition lookup). This replaces every earlier "append a line to a data file" seam: **no agent after you edits `quests.js`, `npcs.js`, `text.js` or `story.js`
for content.** You make the seams those objects need and nothing more: a one-word `export` where something is not exported yet, `registerStory({ scenes, lines, conditions })` in `src/game/story.js`
(collisions reported by `storyCollisions()`), a `prependTalk(npcId, entries)` helper that only prepends. (The battle-data seams, `export enemy`, `eq`, `weapon`, `enc` in `enemies.js`, `items.js`,
`encounters.js`, are X1-battle's: one agent per file.) Node tools and tests import `src/data/<id>/index.js` themselves and call `register()`.

### 3. `ensurePack(id, opts)`

Exported from `src/game/packs.js`; idempotent; **never rejects, never blocks boot**.
1. Returns the same promise on repeat calls. Resolves `{ id, ok, failed, skipped, ms }`. `enabled()` false resolves `{ ok: true, skipped: true }` without a fetch.
2. Steps: dynamic `import(entry)` then `register()`; `assets.loadManifest(PACKS[id].assets)` (the pack's own manifest fragment, loaded by the engine's existing `loadManifest(path)`; if the engine
   cannot load a second manifest, fall back to a lazy group named `<id>` in `assets/manifest.json`, written by `sync-manifest --pack`, and say so in the report); merge the tile fragment
   (`assets/tiles/<id>_tiles.json`) into the tile database; make the pack's sprite atlases resolvable (see 5); `audio.loadPack(audioPack)` fire-and-forget; then idle-time warm of every file in
   `assets/pack_files.json[id]` (a plain `fetch`, so the service worker's runtime cache holds the whole pack for offline play).
3. **Failure is quiet and retried.** A failed import or fetch resolves `{ ok: false, failed: [...] }`, shows one single-line toast per session ("Some new places could not load. They will try again."),
   schedules one automatic retry after 5 s and another on the next call. The game goes on without the pack; every door and event the pack adds simply is not there.
4. `packReady(id)` (sync), `onPackReady(id, fn)`, `packWanted(id, flags)`.

### 4. Call sites (smallest diffs; XP-packs is the only agent that edits `src/main.js` and the title and load scenes)

- **Warm in the background** after the title is up when any save slot satisfies `wanted(flags)`, and again the moment a running game first satisfies it (x1: `first_fight_done` is set; x2: `ep1_complete` or a quick start).
- **Before Continue and `newGameEp2` / `newGameEp3` enter the field**: `ensurePack` for every pack the save wants, awaited for at most 1.5 s behind the existing fade, then go on regardless.
- **The field guard** (`src/world/maps.js` `loadMap`): a map id starting with a pack prefix, or a map listed in a pack's `touches`, calls `ensurePack(id)` first (a spinner for at most 1.5 s). If it
  fails, a prefixed map is simply not reachable (the door never existed) and a touched map loads **unpatched**; when the pack becomes ready later, `maps.js` drops every `touches` map from its
  module cache (re-import with a version query) so the next transition shows the patched version. This is what makes the in-bundle edits of existing maps safe: they are gated by `x1On()` /
  `x2On()`, which are true only when the switch is on **and** `packReady(id)`.
- The Episode 1 credits handoff calls `ensurePack('x2')`. Episode 3 has no pack; do not add one.

### 5. Assets: fragments, never shared files

- **No pack agent edits `assets/tiles/tiles.json`, a shared sprite atlas or `assets/ui/heads.*`.** Tiles: a new sheet `assets/tiles/<id>.png` plus `assets/tiles/<id>_tiles.json`, merged by `ensurePack`.
  Sprites: new atlases `assets/sprites/<id>_npcs`, `<id>_enemies_battle`, `<id>_enemies_field`, `<id>_bosses_battle`, `<id>_portraits` and `assets/ui/<id>_heads.*` (an agent adds only the ones it needs).
  Backdrops: `assets/backdrops/<id>_*.webp`.
- **Atlas resolution across atlases** (this was X2's N10, now yours): an NPC, enemy or portrait id is found in any loaded atlas; the field draws an enemy event's `sprite` from the right field atlas;
  a missing frame falls back to a placeholder with no console error. Keep the diff in `src/core/assets.js` small.
- `sync-manifest.mjs` gets `--pack <id>`: it scans only files carrying the prefix and writes `assets/<id>_manifest.json`; without `--pack` it **ignores** prefixed files, so the main manifest and the
  precache never see them. It is a pure function of the folders, so two art agents in one wave may both run it; the orchestrator runs it once more at wave close.

### 6. Audio

Music tracks are already lazy and runtime-cached, never precached; nothing changes. SFX and ambience for a pack ship in the audio manifest's `packs.<audioPack>` (`x1`; X2 reuses the existing `ep2`) and
load through the existing `audio.loadPack`. The audio manifest and `tools/audio/build.py` stay single-writer: one audio agent per wave, and X1-audio before X2-audio.

### 7. PWA

`tools/pwa/build_pwa.py` reads `PACKS` (or a mirrored `tools/pwa/packs.json` it generates from it) and: excludes every pack file from the `sw.js` precache list and from the `modulepreload` block (the file list is
the prefix rule of section 1 plus `src/data/<id>/**` minus `live.js`); writes `assets/pack_files.json`; teaches the service worker a runtime route for pack paths (stale-while-revalidate into the existing
`lq-next-runtime-v1`, which activation already keeps, so a shell-only release never evicts a pack; a pack file's own hash decides a refetch). `qa/pwa/precache.test.mjs`: the caps unchanged, plus: no pack
file in `sw.js`, every file in `pack_files.json` exists, every file a pack manifest names exists, pack wire sizes within the caps above, the ratchet file.

## Tests (`qa/pwa/` and `qa/core/pack_*.test.mjs`)

`ensurePack` loads once; survives a failed import and retries; registers into every shared object listed in section 2; `FLAG_IDS` gains the pack's flags; a skeleton with no data modules registers cleanly;
`packWanted` per flag set; the field guard fires for a prefixed map and for a touched map; a touched map loaded before the pack was ready is rebuilt after it (late-ready); boot timing is unchanged
(the first frame never awaits a pack: assert it with a pack import stubbed to hang); `enabled()` false never fetches; offline reload after one successful load serves the pack from the runtime cache
(headless); the ratchet and the caps.

## Rules

- **Owned paths (nobody else in either wave edits them):** `src/game/packs.js`, `src/data/x1/index.js`, `src/data/x2/index.js`, `src/data/x1/live.js`, `src/data/x2/live.js`, `src/core/assets.js` (atlas lookup, fragment loading; smallest diff), `src/world/maps.js`
  (guard and cache), `src/game/story.js` (`registerStory`), the content-registry seams in `src/data/quests.js`, `src/data/npcs.js`, `src/data/text.js` (exports and `prependTalk` only), `src/main.js` and the
  title and load scenes (call sites only), `tools/pwa/**`, `qa/pwa/**`, `qa/core/pack_*`, `qa/core/sync-manifest.mjs`, `docs/PWA_PACKS.md` (the API as built; appended to `docs/PWA.md` by pointer).
- Not yours: the battle-data files (X1-battle), any `src/data/x1/*` module other than `index.js` (X1-story, X1-battle), `assets/audio/**`.
- Pure modules stay pure. No git, no em dashes, bounded commands.
- Verify: `node qa/run.mjs pwa core`; `node --test qa/pwa/precache.test.mjs` prints the budget line (initial at most 6.33 MB, tap prompt at most 2.32 MB); `python tools/pwa/build_pwa.py --check` after a build; the offline reload
  check; the late-ready check.
- Report under 400 words: the API as built (any change to the table above), the call sites, the budget line before and after, what each later agent must export or name, anything you could not do and the exact fallback.
