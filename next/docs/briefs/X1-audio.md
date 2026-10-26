# X1-audio: eight tracks, ten SFX, two ambiences, inside the load budget (X1 wave W4, beside X1-maps-wild)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION1_PLAN.md` section 10.4 (your contract), `docs/briefs/E3-audio.md` (the shape
of the last audio brief and what it delivered), `docs/MUSIC.md` (the name motif, the pipeline, the Episode 2 and 3 track sections) and
`docs/PWA.md` "Load order and size budget" (why the budget exists). The Episode 2 expansion has an audio agent too (nine tracks): it runs only after the Episode 1 expansion is published, so you are the one writer of the manifest and `docs/MUSIC.md` until then.

## Items, in order

1. **Tracks** (plan 10.4): `the_downs`, `high_moor`, `wethers_barrow`, `orrery`, `larchhill`, `millrace`, `boss_reeve`, `boss_millstone` as songs in
   `tools/music/songs/`, rendered with the existing pipeline: seamless loops, -16 LUFS, loop metadata, piano-roll review images. The shared
   four-note name motif as the plan says per track (`wethers_barrow` and `boss_reeve` keep the count one short; `millrace` states it
   complete). Each has a fallback track in the manifest so a missing file never silences a map.
2. **SFX and ambience**: ten SFX in a **new pack `x1`** (`pack: 'x1'` in the manifest, generated through `tools/audio/build.py`, never `core`; the pack mechanism of `docs/briefs/XP-packs.md` loads it with the rest of `x1`) and
   two ambiences, ids exactly as in plan 10.4, fallbacks set. The first `x1` sound loads the pack on its own (`audio.loadPack`); no engine change.
3. **The budget** (the point of this brief): core SFX and jingles are untouched and stay precached; `qa/pwa/precache.test.mjs` passes **unchanged**
   (the 6.5 MB initial cap is not raised, the before-tap 2.5 MB cap holds, and the ratchet of XP-packs is untouched by audio); music, the `x1` pack and the ambiences are runtime-cached, not
   precached (the test already asserts it). Report the sizes: SFX pack 350 KB or less, each ambience 600 KB or less, each track 3.5 MB or less,
   and `python tools/pwa/build_pwa.py --sizes` before and after (the precache table must be identical).
4. **Docs**: a `docs/MUSIC.md` section per track (what the motif does, the structure bar by bar like the existing entries) and the cue sheet of
   10.4; `docs/SUNO_PROMPTS.md` rows for each track in the shared style line.

## Rules

- Owned paths: `tools/music/**`, `tools/audio/**`, `assets/audio/music/**`, `assets/audio/sfx/**`, `assets/audio/ambience/**`,
  `assets/audio/manifest.json` (only through `tools/audio/build.py`), `docs/MUSIC.md`, `docs/SUNO_PROMPTS.md`, `qa/audio/**`, `qa/music/**`.
- Music stays lazy-loaded. Composed in code like the Episode 2 and 3 tracks (no Suno at build time; the Suno rows are for Scott). No git, no em
  dashes, bounded renders.
- Verify: `python tools/music/render.py <id>` for each, `verify_decode.py`, `node qa/run.mjs music audio pwa`; listen to every loop seam (render the
  seam region and check the waveform and spectrum images); view the piano rolls for the motif; `node qa/core/sync-manifest.mjs`.
- Report under 400 words: track lengths and loop points, LUFS, ids, what the motif does in each, fallbacks, the size table and the unchanged
  precache numbers.
