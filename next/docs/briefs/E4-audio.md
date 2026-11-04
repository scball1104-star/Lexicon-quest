# E4-audio: three tracker tracks, eight SFX, one ambience, through the pack (wave 4c, beside E4-maps-a and E4-maps-b)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EPISODE4_PLAN.md` sections 8 and 13.3 (your contract),
`docs/MUSIC.md` (the name motif, the pipeline), `tools/music/songs/emberpeak.py`, `first_bell.py`, `boss_warden.py`
(Episode 3's pieces as the model), and the root `../SUNO_TRACKS.json` region-4 prompt (as a brief for the tracker only).

**No Suno and no Runway tonight** (Scott's paid accounts need his go). Everything is composed in code or synthesized.

## Items, in order

1. **Tracks** `valewyn`, `sunken_keep`, `boss_regent` as songs `tools/music/songs/ep4_*.py`, rendered with the existing
   pipeline to `assets/audio/music/ep4_*.mp3`: seamless loops, -16 LUFS, loop metadata, piano-roll review images. The
   motif as specified (celesta with the held last note; clarinet augmented; brass with the `valewyn` quote in minor).
   If time runs short, ship `valewyn` first and set the plan's fallbacks for the other two.
2. **SFX and ambience** of plan 8.4 in the generator (`tools/audio/ep4_*`), files `assets/audio/sfx/ep4_*.wav` and
   `assets/audio/ambience/ep4_*`, ids exactly as listed. `bell_drowned` must read as a bell heard through water;
   `decree_void` must not be confused with `quench_hiss`.
3. **`src/data/ep4/audio.js`**: the manifest fragment of plan 13.3 (music, sfx, ambience, `pack.sfx`), every sfx entry
   `pack: 'ep4'`, fallbacks set. **Do not edit `assets/audio/manifest.json`**: its bytes count before the tap prompt.
4. **Docs**: an Episode 4 section in MUSIC.md per track. No SUNO_PROMPTS rows tonight (nothing is generated there).

## Rules

- Owned paths: plan 11.1, row E4-audio.
- Music stays lazy; SFX stay out of the precache (E4-pack's `LAZY_PREFIXES`). No git, no em dashes, bounded renders.
- Verify: `python tools/music/render.py <id>` for each, `verify_decode.py`, `node qa/run.mjs music audio pwa`; listen to
  every loop seam (render the seam region and view the waveform and spectrum); view the piano rolls for the motif;
  confirm the initial download did not move.
- Report under 400 words: track lengths and loop points, LUFS, ids, what the motif does in each, fallbacks used.
