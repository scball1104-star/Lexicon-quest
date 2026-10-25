# MUSIC.md: the composed score (Episodes 1 to 3)

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

## Episode 2: five more tracks (E2-audio)

Composed and rendered the same way (same tracker, same mix bus, -16.0 LUFS integrated before encoding, true
peak at or under -1 dBFS, 60 ms guard loops, 0-sample decode lag in headless Chromium). Cue sheet:
`docs/EPISODE2_PLAN.md` 8.2 and 8.3.

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `hollow` | The Unwritten Square | A Dorian | 84, 3/4 | 32 | 0.060 s to 68.631 s | 68.73 s | `willowmere` |
| `hollowmere` | Hollowmere | D major | 84, 3/4 | 32 | 0.060 s to 68.631 s | 68.73 s | `hollow` |
| `fading_road` | The Fading Road | E minor to G major | 96, 4/4 | 36 | 0.060 s to 90.060 s | 90.16 s | `valley` |
| `court` | The Court of Mirrors | D Phrygian | 76, 4/4 | 28 | 0.060 s to 88.481 s | 88.58 s | `archive` |
| `boss_king` | The Nameless King | C minor | 6/8, quarter = 132 (dotted quarter 88) | 88 | 0.060 s to 120.060 s | 120.16 s | `boss_archivore` |

### The lullaby (`tools/music/songs/lullaby.py`)
`hollow`, `hollowmere` and the march in `boss_king` share one tune, written once in scale degrees (0 = tonic) so
it can be realized in any mode. 32 bars of 3/4, four sections (A, A', B, coda). It is a "reflected melody":
every two-bar phrase is answered by its diatonic mirror inversion (the contour flipped step for step), starting
on the phrase's own first note, or from above in bars 19 and 31. `python tools/music/songs/lullaby.py` checks
that every answer is a true mirror of its phrase. Chords per bar are degree triads, so the same harmony becomes
Am, Am6, D, D7, C, Bm7, Em, Am in A Dorian and D, D6, G, Gmaj7, F#m, Em7, A, D in D major.

### How Episode 2 wears the name motif
- **hollow**: music box, A5 E6 F#6 (degrees 1 5 6; the F# is the Dorian sixth) and then a rest where the D
  belongs. The celesta's mirror answer is A5 D5 C5, which is exactly `NAME_MOTIF_INVERTED` (0, -7, -9). The
  fourth note never comes: in every statement (bars 2, 4, 10, 12, 26, 28, 32) the slot is silent, and in bar 30
  the F# is simply held through it.
- **hollowmere**: the same bars with the fourth note landing: horn D4 A4 B4 G4 in bars 1-2, high strings and
  horn in octaves in bars 25-26, and the Hollow's own music box plays it complete in bars 29-30 (D6 A6 B6 G6).
  The mirror answers land too (D G F# A).
- **fading_road**: the flute's opening, G5 D6 E6 C6 over Em7 to Cmaj7 (the motif's natural-minor guise from the
  third); in the G major half (bar 17) it is the tonic's own 1-5-6-4. In bars 27-28 the flute drops out and the
  glass bells remember its motif for it.
- **court**: F5 C6 D6 Bb5 (the minor-mode guise from the third) in strict canon with its own inversion, half a
  bar later: G4 C4 Bb3 D4, which is `NAME_MOTIF_INVERTED`. The motif opens sections X and X' and the coda.
- **boss_king**: in the brass from the third, Eb4 Bb4 C5, and it never gets its fourth note: a brass stab and a
  timpani hit land where the Ab belongs (bars 5-6, 9-10, 13-14, 21-26, 53-60, 65-66). Once, in bars 17-18, the
  horn plays its major shape F4 C5 D5 over Bb. In the march every missing fourth note of the lullaby is a stab.

### hollow: The Unwritten Square (the Hollow, its interiors, memory scenes, Mira's hum, vow vignettes)
A lullaby waltz. Music box and celesta trade phrase and mirror (A: the box asks, the celesta answers; A': the
roles swap); a felt-muted piano keeps the waltz (bass on 1, two chord tones on 2 and 3); soft strings from bar 9,
low strings in B, and a glassy pad holding a high open fifth every four bars. The coda's last mirror drifts down
over D7 into bar 1, and a faint music-box A-E echo turns the loop over.
Instruments: musicbox, celesta, piano_muted, strings, strings_low, glasspad. Reverb room 0.86, 3.8 s.

### hollowmere: Hollowmere (the town after `nh_restored`, the end of `king_after`, the Episode 2 credits)
The same lullaby in D major, in the light. A: horn asks, celesta answers, strings take the falling phrase;
A': high strings lead with the glockenspiel an octave up and the horn holding a countermelody; B: pizzicato and
timpani lift the climb; coda: choir, horn and strings in octaves, the music box's complete motif, a soft
timpani roll on A into bar 1. Harp plays the waltz as an arpeggio throughout.
Instruments: strings_high, horn, celesta, glock, musicbox, harp, strings, strings_low, bass, pizz, choir, lowdrum.

### fading_road: The Fading Road (east_road)
Flute over pizzicato off-beats and a walking bass (quarter notes stepping diatonically into each next chord),
glass bells glinting, a light shaker. E minor for 16 bars, then G major, then four bars of mist (Cmaj7, Am7,
B7sus4, B7) back to Em. Every eight bars one instrument forgets and remembers: pizzicato out in bars 13-14, the
walking bass in 21-22, the flute in 27-28 (the bells play its motif), the bells and shaker in 33-34.
Instruments: flute, pizz, bass, glass, strings, shaker.

### court: The Court of Mirrors (court_f1, court_f2)
A strict mirror canon at half a bar: the follower plays every note of the leader two beats later, inverted
around C (p -> S - p with S a multiple of 12). C is the mirror axis of the D Phrygian collection, so the
inversion never leaves the mode. The leader's line was chosen so that each note and the note two beats before it
sum to a consonance (sum mod 12 in {0, 3, 4, 5, 7, 8, 9}); the few remaining seconds sit on weak eighths and are
meant as the cold glint of the glass. X (bars 1-8): celesta leads, harp follows below; Y (9-16): the line rises,
the low pedal slips from D to Eb (the Phrygian shadow) in bars 13-14; X' (17-24): the mirror swaps, the harp
leads an octave lower and the celesta follows above; coda (25-28): the motif and a descent that stops on D, the
follower answering Bb (the mirror chord Bb/D). The following voice is doubled by a quiet glass pad (the mirror's
halo); high strings hold long cold dyads; struck-glass pings and a few high drips are the percussion.
Instruments: celesta, harp (softer pluck), glasspad, strings_low, bass, strings_high, glass, musicbox (drips).

### boss_king: The Nameless King (the King's battle)
6/8 felt as two dotted quarters at 88 (written as three quarter beats per bar at 132).
- I (1-4): harpsichord ostinato alone (a descending top line over a repeated pedal tone), low strings and
  timpani join, G7.
- A (5-20): Cm, Ab, Fm, G7, Cm, Db, Bb, G-G7. Low strings drive long-short, brass motif plus stab, the high
  strings answer each statement with a falling fragment.
- A2 (21-28): choir enters, the motif climbs (Cm-Ab, Fm-G7, Cm-Db), G7sus4-G7 into the march.
- B (29-52): the lullaby march. Lullaby bars 1-24 in C minor (aeolian, raised seventh over the dominant), re-barred
  to the 6/8 lilt (two notes become two dotted quarters, three notes become quarter, eighth, dotted quarter), brass
  and high strings in octaves for the phrase, horn and strings for its mirror, snare march figure, a stab and
  timpani hit on every missing fourth note, choir from bar 37.
- C (53-68): the motif climbs a sequence (Cm, Db, Eb, Fm), a four-bar G7b9 pedal in hemiola (three quarter-note
  stabs against the 6/8, timpani and snare rolls), the motif fortissimo in brass, horn and strings, Ab, G7.
- M (69-76): the man under the glass. C major, no percussion: the lullaby's motif on the music box and its mirror
  on the celesta (the Hollow's own instruments), harp and soft strings. The fourth note still never comes.
- R (77-88): the ostinato creeps back pianissimo, the minor motif C G Ab in the strings, then G7 for four bars
  (hemiola stabs, timpani roll, snare crescendo) into bar 1, where the harpsichord is suddenly alone again.
Instruments: harpsichord, strings_low (spiccato preset), bass, brass (melody and stabs), horn, strings_high,
choir, lowdrum, snare, musicbox, celesta, harp, strings.

### New instruments (`tools/music/synth.py`, Episode 2)
harpsichord (two bright Karplus-Strong strings, 8' and a slightly detuned 4', plucked near the nut, quill click,
nasal body peak, fast dampers), brass (three detuned saws, lip scoop, a bright blat that settles, light
saturation), snare (two damped drum modes plus snare-wire noise), glass (struck-glass plate partials in the
Mallet family), glasspad (sine partials 1, 2, 3 and an inharmonic 5.07, unequal stereo sides so a mono fold-down
beats gently), piano_muted (the Piano through a felt lowpass with a shorter ring).
`python tools/music/preview_instruments.py` includes them in its sheet. `Song(..., true_peak_trim=True)` (set by the
Episode 2 songs) trims the whole mix by the excess when inter-sample peaks of the delivered pass exceed -1 dBFS
after the sample limiter; it is opt-in so Episode 1 renders keep their bytes (archive would trigger it by 0.01 dB).

## Episode 3: five more tracks (E3-audio)

Composed and rendered the same way (same tracker and mix bus, -16 LUFS integrated, true peak at or under -1 dBFS, 60 ms
guard loops). Cue sheet: `docs/EPISODE3_PLAN.md` 8.1 to 8.3. Music stays lazy: it is runtime-cached, never precached.
`tools/audio/build.py --manifest` wires the files, sidecar loop points and fallbacks into `assets/audio/manifest.json`.

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `emberpeak` | Bellows Square | D Dorian | 104, 4/4 | 32 | 0.060 s to 73.906 s | 74.01 s | `hollow` |
| `first_bell` | The First Bell | D major | 104, 4/4 | 32 | 0.060 s to 73.906 s | 74.01 s | `hollowmere` |
| `ash_road` | The Old Sand Road | A minor to C major | 100, 4/4 | 38 | 0.060 s to 91.260 s | 91.36 s | `fading_road` |
| `foundry` | The Ashen Foundry | E Phrygian | 88, 4/4 | 32 | 0.060 s to 87.333 s | 87.43 s | `court` |
| `boss_warden` | The Cinder Warden | C minor | 7/8, quarter = 144 (bar = 3.5 beats, grouped 2+2+3) | 80 | 0.060 s to 116.727 s | 116.83 s | `boss_king` |

### The First Bell theme (`tools/music/songs/e3_theme.py`)
`emberpeak`, `first_bell` and the bell section of `boss_warden` share one eight-bar tune, written once in scale
degrees. Its first bar is the complete name motif (degrees 0 4 5 3, D A B G in D); the fourth note is where each
track makes its point. The helper module also holds the chord parser used by the Episode 3 songs (`tones`,
`root_note`, `fifth_note`).

### How Episode 3 wears the name motif
- **emberpeak**: the dulcimer plays the theme with the fourth note always missing (D A B, then a rest, in bars 1 and
  5 of each statement), and on the downbeat of every fourth bar (1, 5, 9 ...) where a toll would fall the bass,
  anvil and timpani all rest. In bars 29 and 30 the motif stops on its third note and the pad hangs open. The town
  has lost its bell.
- **first_bell**: the same tune in D major on horn and high strings. The fourth note (G) is never played by a melodic
  instrument: it is struck on a real bell (G3, loud) while everything else rests, in bars 1 and 5 of each A section
  (and in bars 9, 13, 25 and 29). A bell also tolls on every downbeat of the A sections (bars 1 to 8 and 25 to 32).
- **ash_road**: the low whistle opens the road with the complete motif (A E F# D, scale degrees 1 5 6 4 in A Dorian) and
  again, quiet, at the start of A'; at the start of B it is the same four degrees in C major (C G A F), warmer.
- **foundry**: the cold flute plays the motif augmented, four beats a note (E B C# A), over the heat. The C# is a
  major third against the F chord (the Phrygian second), so it rings icy. It returns high in the C section and once
  more, quiet, in A'.
- **boss_warden**: the brass states the motif in C minor (C G A F, the A natural a hot Dorian note) every four bars of A
  and A2, with a brass stab and a timpani hit where the fourth note belongs. In the B section the First Bell theme is
  quoted in minor (C G Ab F ...): bell and anvil strike together on every accent, the bell has the fourth note
  (F), and the last two statements go to brass. The last bar before the loop is C major.

### emberpeak: Bellows Square (the town before the bell; loops)
104 BPM, 32 bars. Low strings, hammered dulcimer, measured anvil strikes on beat 3 (and beat 1 of even bars that are not
toll bars), brass held back to a soft horn pedal. A (1-8) Dm, Dm, C, G, Dm, Am, G, Dm: dulcimer theme, no fourth note.
A' (9-16): high strings carry the theme, the dulcimer turns to an arpeggio. B (17-24) Bb, F, Gm, Dm, Bb, F, Gm, A:
the dulcimer's own tune climbs, a horn pedal and faint choir. A'' (25-32): thin again, A as the last chord so the loop
falls back into Dm. Instruments: dulcimer (two tracks), strings_high, strings_low, strings, bass, anvil, lowdrum, horn, choir.

### first_bell: The First Bell (the town after `pk_restored`, the end of `warden_after`, the credits; loops)
104 BPM, 32 bars. A (1-8) D, D, G, Em7, D, Bm, G, A7sus4: horn (an octave under) and high strings, choir from bar 5,
a bell on every downbeat. A' (9-16): glockenspiel and harp, the bell every other bar, softer. B (17-24) Bm, G, D/F#, A,
Bm, G, Em7, A: the family of the theme climbs to a high E (bar 20) over brass stabs and timpani. A'' (25-32): tutti,
a bell on every downbeat again. Instruments: horn, strings_high, brass, glock, harp, bell, strings, strings_low,
choir, bass, lowdrum.

### ash_road: The Old Sand Road (sand_road; loops)
100 BPM, 38 bars. A fiddle and a low whistle over a cart-wheel rhythm: a soft drum on beat 1 and the "and" of 2, a
shaker in eighths, a brush on 2 and 4, plucked root and fifth. Ash-grey first (thin low strings, no harp), warming to
amber: harp arpeggios from B, horn and glockenspiel in B', the key turning to C major. A (1-8) Am, Am, F, C, Am, G, F,
E7. A' (9-16) Am, F, C, G, Am, F, G, Am. B (17-24) C, G/B, Am, F, C, G, F, C. B' (25-32) C, Em, F, C/E, Dm7, G, C,
G. T (33-38) Am, F, G, Am, F, E7 (back to Am). Instruments: whistle, fiddle, strings_low, strings, pizz, bass,
lowdrum, shaker, brush, harp, horn, glock.

### foundry: The Ashen Foundry (foundry_f1, foundry_f2; loops)
88 BPM, 32 bars. A sixteenth-note figure on two tuned anvils (slots 0 3 6 8 10 14) and a low drum, a steam valve
hissing every four bars (bars 3, 7, ...), a low brass pedal on E that never moves, a bass doubling it. A (1-8) Em, Em,
F, Em, Em, F, G, F; the flute enters in bar 5. B (9-16) Am, F, Em, F, Dm, C, F, E: low strings, a glass pad. C (17-24)
F, G, F, Em, F, G, Am, E: brass stabs on the anvil accents, choir, the motif high. A' (25-32): the foundry cools.
Instruments: flute, anvil (two), lowdrum, steam, brass (pedal and stabs), strings_low, glasspad, bass, choir.

### boss_warden: The Cinder Warden (the Warden's battle; loops)
7/8 at quarter = 144 (a bar is 3.5 beats, grouped 2+2+3 eighths, so accents fall on beats 0, 1 and 2 of the bar).
80 bars. I (1-4) a C minor pedal, timpani and anvil on the accents, the choir enters in bar 3. A (5-20) Cm, Ab, Fm, G7,
Cm, Ab, Bb, G7 (two bars each): spiccato strings drive, the motif in the brass every four bars. A2 (21-36): choir and
horns, the motif an octave higher. B (37-52): the First Bell quote in C minor, four statements of a four-bar phrase
(Cm Fm Cm Fm, then Cm Ab Cm Bb), bell and anvil together. C (53-68): the motif climbs Cm, Db, Eb, Fm, a G7 hemiola of
three stabs per bar, then Ab, Bb, G7sus4. R (69-79): the ostinato creeps back and a timpani roll builds. Bar 80: C
major. Instruments: spiccato strings (strings_low with a fast attack), brass (melody, stabs, pedal), horn, strings_high,
choir, lowdrum, anvil, bell, bass.

### New instruments (`tools/music/synth.py`, Episode 3)
dulcimer (a pair of slightly detuned Karplus-Strong strings, hammer click, a mid peak), anvil (hammer click, a thump and
five inharmonic partials of a steel face, tuned by the note), fiddle (two detuned saws, body formants at 1.1 and
2.4 kHz, bow noise, delayed vibrato), whistle (near-pure sine with husky breath and a late shallow vibrato), steam
(band-limited noise hiss shaped by the gate).

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
python tools/music/render.py                 # all fourteen: MP3 + JSON + review images in tools/music/out/
python tools/music/render.py hollow court    # a subset (Episode 2: hollow hollowmere fading_road court boss_king; Episode 3: emberpeak first_bell ash_road foundry boss_warden)
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
