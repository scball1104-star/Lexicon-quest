# MUSIC.md: the composed Episode 1 score

Four tracks were composed and rendered in code (SNES tracker style: sequenced notes played by
synthesized instruments) because Suno cannot be driven from this machine. They live in
`assets/audio/music/<id>.mp3` (160 kbps CBR, 44.1 kHz stereo, gapless LAME tag) with a sidecar
`<id>.json` holding `{loopStart, loopEnd, bpm, key, duration}` in seconds. Every render is
deterministic: the same code produces the same bytes.

| id | title | key | BPM | bars | loop | length |
|---|---|---|---|---|---|---|
| `archive` | The Rootbound Archive | D Dorian (D pedal) | 72 | 28 | 0.060 s to 93.393 s | 93.49 s |
| `mystery` | The Thirteenth Bell | E Phrygian / Lydian color | 64 | 12 | 0.060 s to 45.060 s | 45.16 s |
| `sorrow` | A Name Forgotten | A minor | 64 (rit. to 58 in bar 16) | 16 | 0.060 s to 60.246 s | 60.35 s |
| `triumph` | Names Returned | D major | 100 (rit. to 72 at the end) | 20 + ring-out | 0 to 51.828 s (ends) | 51.83 s |

All four sit at -16.0 LUFS integrated (BS.1770 K-weighted), true peak at or under -1 dBFS, no DC,
no limiter gain reduction needed.

## The name motif (leitmotif)

Four notes: **a rising perfect fifth, a whole-step lift, then a falling major third**. In semitones from
the first note: `0, +7, +9, +5`. Scale degrees when it starts on the tonic: 1, 5, 6, 4 (it fits major,
Dorian and Mixolydian; in natural minor it starts on the third). Defined once in `tools/music/theory.py`
as `NAME_MOTIF`, with the inverted "fading" guise `NAME_MOTIF_INVERTED = (0, -7, -9, -5)`.

How each track wears it:

- **archive**: music box, D6 A6 B6 G6 (tonic start in D Dorian, the B natural is the Dorian sixth), bars
  1-4 and 25-26; transposed onto Bb in bar 9 (Bb5 F6 G6 Eb6, the Eb a borrowed Phrygian shadow that
  resolves down to D); the celesta melody of section C opens with it in the middle register (D5 A5 B5 G5).
- **mystery**: piano, C5 G5 A5 F5 over Fmaj7#11 (all four notes are chord tones there), bar 3. In bar 9
  the **inverted guise** E5 A4 G4 B4 (the name slipping away). In bars 11-12 only the first three notes
  sound and the fourth never comes: the name fades before it is finished.
- **sorrow**: oboe, C5 G5 A5 F5 inside A minor, so the four notes are b3, b7, 1, b6 and the "lift" lands
  on F, the saddest note in the key (bar 1). Phrase 2 (bar 5) bends it upward: C G A B, continuing to C6.
- **triumph**: horn, D4 A4 B4 G4 in long notes over the intro pedal (bars 3-4), as the first bar of the
  theme (bar 5), an octave up for the tutti (bar 13, doubled by high strings and glockenspiel), and in
  quarter notes over D and G/D as the final gesture before the glowing chord (bar 19).

## Track by track

### archive: The Rootbound Archive (dungeon, loops)
72 BPM, 4/4, 28 bars. Hushed, ancient library. A D pedal in the bass for 16 bars while a single high
string line descends chromatically above it (D, C#, C, B, A, Ab, G, F#, F): the "undercurrent of tension"
from the brief as a line cliche. Chords, two bars each: Dm, Dm(maj7), Dm7, Dm6/G, Bbmaj7/D, Bb7/D,
A7sus4/D to A7/D, D major (a one-bar glimmer), Dm.
- A (1-8): low strings pad, harp eighths, the motif in the music box twice, celesta answer in 5-8, a root
  creak every four bars.
- B (9-16): choir enters, harp thins to quarters, pizzicato heartbeat on beats 3 and 4-and, motif on Bb.
- C (17-24): the bass finally moves: Dm, F/A, Gm, A7sus4-A7 / Dm, Bbmaj7, Gm6-Em7b5, A7b9. The celesta
  sings an 8-bar melody built from the motif, with a breath in bar 22.
- A' (25-28): pedal and motif return; bar 28 is a slow harp rise into bar 1. High strings hold D5 across
  the seam.
Instruments: bass, strings_low, strings_high, choir, harp, musicbox, celesta, pizz, creak.
Reverb: large stone hall (room 0.88, 4.5 s), music box and celesta also on a dotted-eighth ping-pong delay.

### mystery: The Thirteenth Bell (story cue, loops)
64 BPM, 4/4, 12 bars. One bell (E3) tolls every two bars. Harmony never resolves: Em7sus4 with a 4-3
suspension (A to G in bar 2), Fmaj7#11 over the E pedal (the Phrygian F and the Lydian B in one chord),
Cmaj7/E, Bsus4 to B (the leading-tone dominant, left hanging), Em(add9), Fmaj7#11 again; the loop
"resolves" only by sliding the half step F to E back into bar 1. Sparse piano carries the motif and its
inversion; celesta glints with long echoes; sustained strings; E pedal in low strings and bass.
Instruments: bell, piano, celesta, strings, strings_low, bass. Reverb: very large (room 0.9, 5 s).

### sorrow: A Name Forgotten (story cue, loops)
64 BPM, 4/4, 16 bars, slight ritardando in bar 16. Solo oboe over soft strings and harp.
- A (1-8): lament bass A, G, F, E under phrase 1 (Am, Am/G, Fmaj7, E7sus4-E7); phrase 2 ends on a modal
  G (bVII) half cadence (Am, C/G, Dm7, G).
- B (9-16): the swell. Harmony climbs Fmaj7, G, Am, F to E7/G# (rising bass into the climax), then
  Am (oboe on E6, high strings in thirds below, harp in sixteenths), Fmaj7, and it settles over Dm7 and
  E7sus4-E7 with the oboe silent, so the loop resolves E7 to Am at bar 1.
Instruments: oboe, strings, strings_high, strings_low, harp, bass, celesta (three glints).

### triumph: Names Returned (story resolution, ends)
100 BPM, 4/4, 20 bars then a 3 s ring-out; ritardando over the last two bars (100 to 72).
- Intro (1-4): D pedal, harp eighths, strings on D(add9), horn motif in long notes over G/D and A7/D.
- A (5-12): horn theme (D, A/C#, Bm7, G / D/F#, G, Asus4-A, A7) with breaths; glockenspiel answers.
- B (13-20): tutti. High strings double the horn an octave up, second horn in thirds and sixths, glock on
  top, timpani: D, Bm7, Em7, A7, then the borrowed **Bb and C** (bVI, bVII) lift into D, the motif in
  quarters over D and G/D, a two-octave harp glissando and a glowing D(add9) with choir.
Instruments: horn x2, strings, strings_high, strings_low, choir, harp, glock, bass, lowdrum (timpani).
`loopStart` is 0 and `loopEnd` is the end of the file: if the engine loops it, it restarts from the top
after the ring-out.

## Instruments (tools/music/synth.py)
All oscillators are band-limited wavetables (additive, Lanczos-smoothed), so nothing aliases.
strings (five unevenly detuned saws with independent vibrato, dark-to-bright filter morph, slow attack;
`_low` adds a sub, `_high` is brighter), choir (four-voice pulse stack through three formant bandpasses,
"oo" opening toward "ah"), horn (saw plus sine, lip scoop, filter swell), oboe (28 percent pulse, nasal
formants, delayed vibrato, breath noise), flute, pizz, harp (Karplus-Strong with fractional delay and a
lowpass loop filter, tuned to 0 cents), celesta / musicbox / glock / vibes (additive struck bars with
measured partial ratios and per-partial decays), piano (inharmonic additive, two-stage decay, hammer
noise, damper on key release), bell (nine inharmonic partials with slow beating, 6 s decay), bass (sine
plus triangle), lowdrum (timpani sweep), creak (decelerating impulse train through low resonances),
shaker and brush. Mix bus: Freeverb-style Schroeder reverb (8 combs, 4 allpasses, rendered to an impulse
response and applied by FFT convolution), ping-pong delay, K-weighted loudness normalization, lookahead
limiter at -1 dBFS, DC block.

## Looping and the decoder
The loop body is rendered twice back to back and the delivered audio is the second pass, so every
instrument and reverb tail from the end of the loop is already present at the loop start (the brief's
"tail that overlaps the start"). The MP3 gets a hand-built Xing/Info + LAME tag (encoder delay 576,
padding) because `lameenc` writes none; Chrome, Firefox and Safari honor it and trim exactly
(`tools/music/verify_decode.py` measured a 0-sample lag in headless Chromium for all four files).
As a belt and braces a 60 ms guard copy of the loop's last samples precedes `loopStart` (ramped over
its first 30 ms) and a 60 ms copy of the loop's first samples follows `loopEnd`, so the seam stays
sample-continuous even if a decoder ignores the tag (+1105 samples) or over-trims (up to 60 ms).
Play with `AudioBufferSourceNode.loop = true; loopStart; loopEnd` for sample accuracy. Looping the whole
file with an HTMLAudio element also works, with a 0.1 s dip at the file edges.

## Regenerate and review
```
python tools/music/render.py                 # all four: MP3 + JSON + review images in tools/music/out/
python tools/music/render.py sorrow --wav    # one track, plus a WAV copy in tools/music/out/
python tools/music/verify_decode.py sorrow   # decode in headless Chromium, check the loop offset
python tools/music/preview_instruments.py    # one note per instrument: tuning, level, spectrogram sheet
node qa/music/music.test.mjs                 # file, tag, size and loop-metadata checks
```
Review output per track: `<id>_overview.png` (waveform, short-term loudness, spectrogram, 50 ms around
the loop seam with and without gapless trimming, level stats) and `<id>_pianoroll.png` (notes per
instrument with the chord each bar implies). The console prints the implied chord per bar next to the
intended one, melody phrase statistics (rest ratio, longest run without a breath), parallel octaves
between bass and melody, dynamics range and spectral balance by band.

To write a new track: copy a file in `tools/music/songs/`, build a `Song`, add tracks with
`s.track(name, instrument, volume=dB, pan, reverb, delay, role)`, and place notes with the pattern DSL
(`c4/0.5` note with duration in beats, `r/1` rest, `[c4 e4 g4]/2` chord, `@0.7` velocity, `.` staccato,
`_` legato, `^` accent) or `track.add(beat, 'c4', dur, vel)`. Add its id to `ALL` in `render.py` and to
`TRACKS` in the test.
