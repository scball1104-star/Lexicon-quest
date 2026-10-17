# W1-music: composed music tracks (code-synthesized, SNES tracker style)

**Owned paths:** `next/tools/music/**`, `next/assets/audio/music/**`, `next/qa/music/**`, `next/docs/MUSIC.md`.
Do NOT edit `next/assets/audio/manifest.json` (owned by W1-audio); report the entries for the orchestrator to merge.

Suno (AI music) cannot be driven from this machine, so you compose the missing Episode 1 music in code, the way
SNES composers did: sequenced notes played by synthesized instruments. The bar is Lufia II / Chrono Trigger /
Final Fantasy VI: real melodies with phrases, countermelodies, bass lines, chord progressions with motion
(secondary dominants, borrowed chords, suspensions), dynamics, and arrangements that evolve over 60 to 100
seconds and loop seamlessly. Not "a loop of four chords with a square wave".

## Tracks to compose (all instrumental, loopable, stereo)
1. `archive` (about 90 s): The Rootbound Archive dungeon. Hushed, mysterious, ancient library. Low strings
   pad, a music-box / celesta motif, soft harp arpeggios, distant choir-like pad, slow 72 BPM, an undercurrent of
   tension (a pedal tone with chromatic movement above it), occasional deep root-creak percussion.
2. `mystery` (about 45 s): story cue for the Thirteenth Bell and fading names. Sparse piano/celesta, sustained
   strings, one tolling bell every two bars, unresolved harmony (suspensions, a Lydian or Phrygian color).
3. `sorrow` (about 60 s): a tender sad theme. Solo oboe-like lead over soft strings and harp, 64 BPM, wistful;
   a gentle swell in the second half then settle. Used when Bram cannot recall his father's name, and in the
   ending when the hero's own name stays faint.
4. `triumph` (about 50 s): warm uplifting resolution. Strings and horns with harp and glockenspiel, 100 BPM,
   bright major key, builds to a glowing finish (this one may end rather than loop; set loopEnd at the end).
5. Also deliver a shared **leitmotif**: a four-note "name" motif (rising fifth, whole-step lift, falling major
   third, as the earlier Suno prompts used) that appears in all four tracks in different guises, so the score
   feels like one world. Document it in MUSIC.md.

## Build
- `tools/music/` in Python + numpy (+ `lameenc` is installed for MP3 encoding; `scipy` available). Write a small
  tracker: tempo map, tracks of notes (pitch, start, length, velocity, articulation), instruments (wavetable or
  additive/subtractive synth with ADSR, vibrato, filter), simple effects (stereo delay, a Schroeder reverb, soft
  limiter), mixing to 44.1 kHz stereo. Instruments to build: strings pad (detuned saws + lowpass + slow attack),
  pizzicato, harp (Karplus-Strong), celesta/music box (sine + partials with fast decay), flute/oboe-like lead
  (triangle/pulse with vibrato and breath noise), french horn (filtered saw with slow swell), choir pad (formant
  bandpass stack), bell (inharmonic partials, long decay), glockenspiel, bass (sine + triangle), low drum, soft
  shaker/brush. Keep everything deterministic.
- Output: `assets/audio/music/<id>.mp3` (160 kbps, stereo) AND a compact `<id>.json` with `{loopStart, loopEnd,
  bpm, key}` in seconds. Loops must be seamless: compose so the loop point lands on a bar line with a tail that
  overlaps the start (render an extra bar and crossfade, or design the arrangement so the loop is clean).
- Peak <= -1 dBFS, integrated level consistent across the four tracks (roughly -16 LUFS equivalent; approximate
  with RMS), no clipping, no DC.
- `qa/music/*.test.mjs`: files exist, MP3 size within bounds, JSON loop metadata valid.
- `docs/MUSIC.md`: the motif, each track's form (A/B sections, bars, key, tempo), instruments, and how to regenerate.

## Self-review (you cannot listen)
Render per-track: a waveform overview, a spectrogram, and a piano-roll image of the sequence (notes over time,
per instrument) to `tools/music/out/`, and view them. Check: melodic contour has phrases and rests (not constant
16ths), bass and melody avoid parallel octaves most of the time, chord changes every 1 to 2 bars, dynamics vary,
spectrogram shows no harsh high-frequency buildup, loop boundary shows no gap or click (plot the 50 ms around
the loop point). Also run a quick harmonic analysis script that prints the chord each bar implies, to confirm the
progressions you intended are what rendered.
