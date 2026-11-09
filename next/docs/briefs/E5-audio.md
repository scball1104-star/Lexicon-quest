# E5-audio: three tracker tracks, eight SFX, one ambience, through the pack (wave 5c, beside E5-maps-a and E5-maps-b)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EPISODE5_PLAN.md` sections 8 and 13.3 (your contract),
`docs/MUSIC.md` (the name motif, the pipeline, the Episode 4 section), `tools/music/songs/ep4_*.py` (the model), and the
root `../SUNO_TRACKS.json` region-5 prompt (as a brief for the tracker only).

**No Suno and no Runway** (Scott's paid accounts need his go; plan 9.5 lists the optional items). Everything is composed
in code or synthesized.

## Items, in order

1. **Tracks** `saffron`, `labyrinth`, `boss_oracle` as songs `tools/music/songs/ep5_*.py`, rendered with the existing
   pipeline to `assets/audio/music/ep5_*.mp3`: seamless loops, -16 LUFS, loop metadata, piano-roll review images. The
   motif as specified (plucked strings with the last note bent down; the flute augmented; brass with the `saffron` quote in
   minor). Write the desert colour with the instruments and the mode, not with a stock "exotic" cliche: keep it a
   Lexicon Quest theme first. If time runs short, ship `saffron` first and set the plan's fallbacks for the other two.
2. **SFX and ambience** of plan 8.4 in the generator (`tools/audio/ep5_*`), files `assets/audio/sfx/ep5_*.wav` and
   `assets/audio/ambience/ep5_*`, ids exactly as listed. `sky_turn` must have a night and a day variant by pitch and
   timbre; `prophecy_break` must not be confused with Episode 4's `decree_void`; `caravan_bell` must not sound like
   `bell_drowned`.
3. **`src/data/ep5/audio.js`**: the manifest fragment of plan 13.3 (music, sfx, ambience, `pack.sfx`), every sfx entry
   `pack: 'ep5'`, fallbacks set (`orrery`, `court`, `boss_king`, `ash_wind`, `archive_hush`). **Do not edit
   `assets/audio/manifest.json`**: its bytes count before the tap prompt.
4. **Docs**: an Episode 5 section in MUSIC.md per track. No SUNO_PROMPTS rows (nothing is generated there).

## Rules

- Owned paths: plan 11.1, row E5-audio.
- Music stays lazy; SFX stay out of the precache (E5-pack's `LAZY_PREFIXES`). No git, no em dashes, bounded renders.
- Verify: `python tools/music/render.py <id>` for each, `verify_decode.py`, `node qa/run.mjs music audio pwa`; listen to
  every loop seam (render the seam region and view the waveform and spectrum); view the piano rolls for the motif;
  confirm the initial download did not move.
- Report under 400 words: track lengths and loop points, LUFS, ids, what the motif does in each, fallbacks used.
