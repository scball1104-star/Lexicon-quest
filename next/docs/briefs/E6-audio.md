# E6-audio: three tracker tracks, nine SFX, two ambiences, through the pack (wave 6c, beside E6-maps-a and E6-maps-b)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EPISODE6_PLAN.md` sections 8 and 13.3 (your
contract), `docs/MUSIC.md` (the name motif, the pipeline, the Episode 5 section: how the oud was built as a song-local
instrument in `tools/music/songs/ep5_theme.py` with `synth.py` untouched), `tools/music/songs/ep5_*.py` (the model),
`tools/audio/ep5_sfx.py` and `ep5_review.py`, and the root `../SUNO_TRACKS.json` region-6 prompt (as a brief for the
tracker only).

**No Suno and no Runway** (Scott's paid accounts need his own go; plan 9.5 lists the optional items). Everything is
composed in code or synthesized.

## Owned paths

`tools/music/songs/ep6_*.py`, `assets/audio/music/ep6_*`, `tools/audio/ep6_*`, `assets/audio/sfx/ep6_*`,
`assets/audio/ambience/ep6_*`, `src/data/ep6/audio.js` (the manifest fragment), `docs/MUSIC.md` (an Episode 6 section),
`qa/audio/ep6_*`, `qa/music/ep6_*`.

## Outputs (items, in order)

1. **The wind harp** (`tools/music/songs/ep6_theme.py`): a song-local instrument, a bank of strings excited by filtered
   noise so each note swells in, rings on its harmonics and fades with no attack; plus the eight-bar Zephyr tune opening on
   the complete motif (0 4 5 3). `python tools/music/songs/ep6_theme.py` checks the bars, the motif's intervals and the 6/8
   re-barring for the boss quote.
2. **Tracks** `zephyr`, `storm_observatory`, `boss_scribe` as songs `tools/music/songs/ep6_*.py`, rendered with the existing
   pipeline to `assets/audio/music/ep6_*.mp3`: seamless loops, -16 LUFS, loop metadata, piano-roll review images. The motif
   as specified (the wind harp swelling in on the C and holding it over the bar line; the horn augmented with the wind harp
   echo two beats late; the brass with the `zephyr` quote in minor and a last major bar on the wind harp). Write the sky with
   the instruments, the mode and the space, not a stock cliche: keep it a Lexicon Quest theme first. If time runs short,
   ship `zephyr` first and set the plan's fallbacks for the other two.
3. **SFX and ambience** of plan 8.4 in the generator (`tools/audio/ep6_sfx.py`), files `assets/audio/sfx/ep6_*.wav` and
   `assets/audio/ambience/ep6_*`, ids exactly as listed. `gale_gust` must not be confused with core `thunder`;
   `rewrite_break` must not be confused with Episode 4's `decree_void` or Episode 5's `prophecy_break`; `signal_lamp` must
   not sound like Episode 5's `caravan_bell`. A pairs sheet `tools/audio/out/ep6/pairs.png` proves each.
4. **`src/data/ep6/audio.js`**: the manifest fragment of plan 13.3 (music, sfx, ambience, `pack.sfx`), every sfx entry
   `pack: 'ep6'`, fallbacks set (`the_downs`, `court`, `boss_king`, `wind_valley`, `moor_wind`). **Do not edit
   `assets/audio/manifest.json`**: its bytes count before the tap prompt.
5. **Docs**: an Episode 6 section in MUSIC.md per track (the table, how Episode 6 wears the name motif, the wind harp), the
   SFX table. No SUNO_PROMPTS rows (nothing is generated there).

## Done when

Every id of plan 2.7 resolves through the fragment; every loop seam has been rendered and viewed (waveform and spectrum);
every piano roll shows the motif; the pairs sheet is viewed; `node qa/run.mjs music audio pwa` is green and the initial
download did not move.

## Tests to run

`python tools/music/render.py ep6_zephyr ep6_storm_observatory ep6_boss_scribe --wav`; `verify_decode.py`; `python
tools/audio/ep6_sfx.py --review`; `node qa/run.mjs music audio pwa`.

## Traps

- **Never `assets/audio/manifest.json`.** Episode 6 audio reaches the game only through `src/data/ep6/audio.js`; sfx stay
  out of the precache through E6-pack's `LAZY_PREFIXES`.
- **Core ids are not yours to redefine** (`thunder`, `wind_valley`, `moor_wind`): reuse them as fallbacks only.
- **The quick start must hear Episode 6** (PLAYTEST_REVIEW_6 fix 3): every id E6-story and E6-world name must be in your
  fragment; list them in your report so E6-integrate's zero-"unknown id" assertion has a target.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bounded
  renders.

## Report (under 400 words)

Track lengths and loop points, LUFS, ids, what the motif does in each and how the wind harp is built, fallbacks used, the
id list for the integrator.
