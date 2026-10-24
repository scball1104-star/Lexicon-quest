# E3-audio: five tracks, ten SFX, two ambiences (wave 17b, run 6 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EPISODE3_PLAN.md` section 8 (your contract), `docs/MUSIC.md`
(the name motif, the pipeline) and the root `../SUNO_TRACKS.json` region-3 prompt.

## Items, in order

1. **Tracks** `emberpeak`, `first_bell`, `ash_road`, `foundry`, `boss_warden` as songs in `tools/music/songs/`,
   rendered with the existing pipeline: seamless loops, -16 LUFS, loop metadata, piano-roll review images. The motif as
   specified: `emberpeak` rests where the fourth note belongs; `first_bell` lands it on a bell; `boss_warden` quotes
   `first_bell` in minor.
2. **SFX and ambience** of plan 8.4 in the generator, ids exactly as listed, fallbacks set. `bell_first` must sound like
   a large bronze bell, slightly flat (Ilya's line depends on it).
3. **Docs**: a MUSIC.md section per track; SUNO_PROMPTS.md rows (plan 8.1).

## Rules

- Owned paths: `tools/music/**`, `assets/audio/music/**`, `tools/audio/**`, `assets/audio/sfx/**`,
  `assets/audio/ambience/**`, `assets/audio/manifest.json` (through `tools/audio/build.py`), `docs/MUSIC.md`,
  `docs/SUNO_PROMPTS.md`, `qa/audio/**`, `qa/music/**`.
- Music stays lazy-loaded (not precached) so the load budget holds. No git, no em dashes, bounded renders.
- Verify: `python tools/music/render.py <id>` for each, `verify_decode.py`, `node qa/run.mjs music audio`; listen to every
  loop seam (render the seam region and check the waveform and spectrum images); view the piano rolls for the motif.
- Report under 400 words: track lengths and loop points, LUFS, ids, what the motif does in each, fallbacks.
