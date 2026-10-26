# X2-audio: nine tracks, eight SFX, two ambiences (X2 wave XB)

Scott's decisions: new music for Cairnwatch Heights, the Heronwade marsh, Lamplight Isle, **the Weald and Southmere Shore (each with its own track)**, the three mini-dungeon types and the optional bosses. Read `docs/briefs/COMMON.md`, `DESIGN.md` section 8, `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION2_PLAN.md` section 11 (your contract), `docs/MUSIC.md` (the name motif, the pipeline), `docs/briefs/E3-audio.md`
(the model brief), `docs/briefs/X1-audio.md` and the Episode 1 expansion's finished `docs/MUSIC.md` entries (do not repeat their idea: the barrow count, the orrery arpeggio) and `docs/PWA.md` (the load budget).

## Items, in order

1. **Tracks** `x2_heights`, `x2_marsh`, `x2_isle`, **`x2_weald`**, **`x2_shore`**, `x2_quarry`, `x2_lamp`, `x2_cistern`, `x2_boss` as songs in `tools/music/songs/`, rendered with the existing pipeline: seamless loops, -16 LUFS, loop metadata, piano-roll review images, with the key, tempo, meter, length and motif of the table in plan 11. The Weald and Southmere are two different tunes
   (the Weald: fiddle and plucked guitar in birch-clear sunlight; the shore: slack-key guitar, concertina and a cello pad with a tidal swell), sharing nothing but the motif's identity. `x2_lamp` is one line that climbs a tower (F1 low, F2 an octave up, one file with a loop point at each end). `x2_boss` serves all four optional bosses.
   `x2_quarry` is stone and work (pick-and-sledge percussion), not a counting figure: Episode 1's barrow track owns that idea.
2. **SFX and ambience**: `cairn_set`, `plank_creak`, `heron_call`, `lamp_ignite`, `lens_turn`, `tide_rise`, `hatch_open`, `wick_snip` and the ambiences `marsh_reeds`, `isle_surf`, in the SFX generator, 22 kHz mono, ids exactly as listed. **All SFX go in `pack: 'ep2'`** (the manifest `packs.ep2`, loaded by the existing `audio.loadPack('ep2')`,
   which `ensurePack('x2')` also triggers), never `core`; total under 0.35 MB. Set the fallbacks (plan 11: `x2_weald` and `x2_shore` both fall back to `valley`).
3. **Budget**: music stays lazy-loaded (not precached) and `qa/pwa/precache.test.mjs` must still pass inside the ratchet of `XP-packs.md` (cap 6.5 MB unchanged; audio adds nothing to the initial download); the sfx pack files must not appear in `sw.js`. Report the before and after numbers of the load budget line.
4. **Docs**: `docs/MUSIC_X2.md` (nine sections, one per track: the motif's role, instruments, loop points), nine rows in `docs/SUNO_PROMPTS.md` for optional Suno upgrades in the shared style line (the Weald and Southmere rows are separate).

## Rules

- Owned paths: `tools/music/songs/x2_*`, `assets/audio/music/x2_*`, `tools/audio/x2_*`, `assets/audio/sfx/x2_*`, `assets/audio/ambience/x2_*`, `assets/audio/manifest.json` (through `tools/audio/build.py`, `pack` set), `docs/MUSIC_X2.md`, `docs/SUNO_PROMPTS.md` (append only), `qa/audio/x2_*`, `qa/music/x2_*`. No other shared file. You are the one audio writer in this wave and the Episode 1 audio agent is long done.
- No git, no em dashes, bounded renders.
- Verify: `python tools/music/render.py <id>` for each, `verify_decode.py`, `node qa/run.mjs music audio pwa`; listen to every loop seam (render the seam region and check the waveform and spectrum images); view the piano rolls for the motif.
- Report under 400 words: track lengths and loop points, LUFS, ids, what the motif does in each, fallbacks, the sfx pack size and the load-budget line.
