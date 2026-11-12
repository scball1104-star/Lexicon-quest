# E8-audio: four tracks, the solo violin, eight SFX, one ambience (wave 8c)

Compose Episode 8's music in code and synthesize its sounds, all through the pack's audio fragment.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 8, plan `docs/EPISODE8_PLAN.md` section 8 (your contract)
and 13.3, `docs/MUSIC.md` (the name motif, every episode's instrument, the Episode 5 to 7 sections), `SUNO_TRACKS.json`'s
region-8 brief (the town theme's brief for the tracker only), the built `tools/music/songs/ep7_*.py` and `ep6_theme.py` (a
song-local instrument), `tools/audio/` and the Episode 7 SFX scripts, `src/data/ep7/audio.js` (the fragment shape).

## Owned paths

`tools/music/songs/ep8_*.py`, `assets/audio/music/ep8_*`, `tools/audio/ep8_*`, `assets/audio/sfx/ep8_*`,
`assets/audio/ambience/ep8_*`, `src/data/ep8/audio.js`, `docs/MUSIC.md` (an Episode 8 section), `qa/audio/ep8_*`,
`qa/music/ep8_*`.

## Outputs (items, in order)

1. **The solo violin**, song-local (`synth.py` untouched): bow-pressure swell, delayed light vibrato, rosin noise on the attack.
   A preview sheet comparing it against the core strings and the earlier episodes' instruments.
2. **The four tracks** of plan 8.1 (`scriptorium_town`, `first_library`, `boss_eraser`, `the_last_word`), -16 LUFS, the name
   motif on the violin, loop points, piano rolls. `the_last_word` states the motif on each episode's instrument in order (read
   MUSIC.md for Episodes 1 to 7's; Episode 7's iceglass bell as built) and ends on the violin alone; 240 to 300 s.
3. **The eight SFX and one ambience** of plan 8.4, with the pairs sheet `tools/audio/out/ep8/pairs.png` proving each is told apart
   from its named neighbours.
4. **`src/data/ep8/audio.js`**: the fragment in the manifest entry shape, `pack: 'ep8'`, music `srcs` under
   `assets/audio/music/ep8_*.mp3`, sfx under `sfx/ep8_*.wav`; never overwriting an id; the reused ids (`orrery`, `sky_wind`,
   `palehaven`, core) referenced, never redefined.
5. **`docs/MUSIC.md`**: an Episode 8 section (instruments, structure, keys, tempos, loop points).
6. **Tests**: loudness, loop seams, every id resolves through the fragment, no id collides with the core manifest or the ep4 to
   ep7 fragments, the credits track's length covers the credits at the box speed E8-story reports.

## Done when

Every render, seam and piano roll is **viewed or listened through**, the pairs sheet is viewed, `node qa/run.mjs music audio`
is green.

## Tests to run

`node qa/run.mjs music audio`; the song scripts and SFX scripts (bounded).

## Traps

- **No Suno, no Runway.** The region-8 Suno brief is a brief for the tracker; a real recording is plan 9.5, Scott's own go.
- **Never edit `assets/audio/manifest.json`**: everything rides the fragment, merged on every path (the quick start too).
- **Distinct sounds:** `read_cast` must not sound like `kept` or Episode 7's `call_cast`; `unwrite_break` must not sound like any
  of the four earlier break sounds; `rub_out` must not sound like `ice` or Episode 6's smudge.
- **The bell scene has no music:** the core `bell_toll` and `bell_thirteenth`; do not redefine them.
- **Photosensitivity has an audio twin:** `silence_gather` ducks the mix; never a sudden loud return.
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command.

## Report (under 400 words)

Each track's key, tempo, length and loop points, measured LUFS, the pairs results, file sizes (for E8-pack's budget note), and
fallbacks used if any.
