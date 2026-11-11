# E7-audio: three tracker tracks, eight SFX, two ambiences, through the pack (wave 7c, beside E7-maps-a and E7-maps-b)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EPISODE7_PLAN.md` sections 8 and 13.3 (your
contract), `docs/MUSIC.md` (the name motif, the pipeline, the Episode 5 and 6 sections: how the oud and the wind harp were
built as song-local instruments in `tools/music/songs/ep5_theme.py` and `ep6_theme.py` with `synth.py` untouched),
`tools/music/songs/ep6_*.py` (the model), `tools/audio/ep6_sfx.py` and its review, and the root `../SUNO_TRACKS.json`
region-7 prompt (as a brief for the tracker only).

**No Suno and no Runway** (Scott's paid accounts need his own go; plan 9.5 lists the optional items). Everything is
composed in code or synthesized.

## Owned paths

`tools/music/songs/ep7_*.py`, `assets/audio/music/ep7_*`, `tools/audio/ep7_*`, `assets/audio/sfx/ep7_*`,
`assets/audio/ambience/ep7_*`, `src/data/ep7/audio.js` (the manifest fragment), `docs/MUSIC.md` (an Episode 7 section),
`qa/audio/ep7_*`, `qa/music/ep7_*`.

## Outputs (items, in order)

1. **The iceglass bell** (`tools/music/songs/ep7_theme.py`): a song-local instrument, a struck glass bar with a soft-mallet
   attack, a long inharmonic decay (partials near 1, 2.76 and 5.4 of the fundamental) and a slow beat between the top
   partials, so a note sounds like the Listening Bell heard from very far away; the opposite of Episode 6's attack-less wind
   harp. Plus the eight-bar Palehaven tune opening on the complete motif (0 7 9 5). `python tools/music/songs/ep7_theme.py`
   checks the bars, the motif's intervals and the re-barring for the boss quote.
2. **Tracks** `palehaven`, `frostbound_vault`, `boss_phantom` as songs `tools/music/songs/ep7_*.py`, rendered with the
   existing pipeline to `assets/audio/music/ep7_*.mp3`: seamless loops, -16 LUFS, loop metadata, piano-roll review images.
   The motif as specified (the iceglass bell on D A B G with the G ringing on under the cello's reply; the cello augmented
   with the bell echo two beats late and the cut-off bell every 8 bars; the strings with the `palehaven` quote in minor and a
   last major bar on the iceglass bell). Write the cold with the instruments, the mode and the space, not a stock cliche:
   keep it a Lexicon Quest theme first. If time runs short, ship `palehaven` first and set the plan's fallbacks for the other
   two (`hollow`, `boss_king`).
3. **SFX and ambience** of plan 8.4 in the generator (`tools/audio/ep7_sfx.py`), files `assets/audio/sfx/ep7_*.wav` and
   `assets/audio/ambience/ep7_*`, ids exactly as listed. `rime_bite` pitched up a step per pip so 1, 2 and 3 are told apart.
   A pairs sheet `tools/audio/out/ep7/pairs.png` proves `call_cast` against core `kept`, `farewell_break` against Episode 6's
   `rewrite_break`, Episode 5's `prophecy_break` and Episode 4's `decree_void`, `rime_freeze` against core `ice`, and
   `stone_hold` against core `stone_name` and `chime_post`.
4. **`src/data/ep7/audio.js`**: the manifest fragment of plan 13.3 (music, sfx, ambience, `pack.sfx`), every sfx entry
   `pack: 'ep7'`, fallbacks set (`hollowmere`, `hollow`, `boss_king`, `moor_wind`, `archive_hush`). **Do not edit
   `assets/audio/manifest.json`**: its bytes count before the tap prompt.
5. **Docs**: an Episode 7 section in MUSIC.md per track (the table, how Episode 7 wears the name motif, the iceglass bell),
   the SFX table. No SUNO_PROMPTS rows (nothing is generated there).

## Done when

Every id of plan 2.7 resolves through the fragment; every loop seam has been rendered and viewed (waveform and spectrum);
every piano roll shows the motif; the pairs sheet is viewed; `node qa/run.mjs music audio pwa` is green and the initial
download did not move.

## Tests to run

`python tools/music/render.py ep7_palehaven ep7_frostbound_vault ep7_boss_phantom --wav`; `verify_decode.py`; `python
tools/audio/ep7_sfx.py --review`; `node qa/run.mjs music audio pwa`.

## Traps

- **Never `assets/audio/manifest.json`.** Episode 7 audio reaches the game only through `src/data/ep7/audio.js`; sfx stay
  out of the precache through E7-pack's `LAZY_PREFIXES`.
- **Core ids are not yours to redefine** (`bell_thirteenth`, `bell_toll`, `ice`, `name_restore`, `kept`, `stone_name`,
  `moor_wind`, `archive_hush`): reuse them, never shadow them. The Listening Bell's thaw is core `bell_thirteenth`, on
  purpose (it is tuned to the thirteenth bell).
- **The quick start must hear Episode 7** (PLAYTEST_REVIEW_6 fix 3): every id E7-story, E7-world and E7-scene-ui name must
  be in your fragment; list them in your report so E7-integrate's zero-"unknown id" assertion has a target.
- **Grief is shown small**: no stinger on Marten's memory, no swell on Mara's tag; the cue sheet's silences are the score.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bounded
  renders.

## Report (under 400 words)

Track lengths and loop points, LUFS, ids, what the motif does in each and how the iceglass bell is built, fallbacks used,
the id list for the integrator.
