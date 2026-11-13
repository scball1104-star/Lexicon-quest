# MUSIC.md: the composed score (Episodes 1 to 3 and Expansion 1)

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

## Expansion 1: eight more tracks (X1-audio)

Composed and rendered the same way (same tracker and mix bus, -16 LUFS integrated before encoding, true peak at or under -1 dBFS,
60 ms guard loops, 0-sample decode lag in headless Chromium). Plan: `docs/EXPANSION1_PLAN.md` 10.4. Music stays lazy: runtime-cached,
never precached; the ten new SFX are the pack `x1` and the two ambiences are runtime-cached (see "Cue sheet and sounds" below).
`tools/audio/build.py --manifest` wires files, sidecar loop points and fallbacks into `assets/audio/manifest.json`.

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `the_downs` | The Shepherd's Road | G major | 92, 6/8 (quarter = 92) | 40 | 0.060 s to 78.321 s | 78.42 s | `valley` |
| `high_moor` | The High Moor | D Dorian | 76, 4/4 | 28 | 0.060 s to 88.481 s | 88.58 s | `valley` |
| `wethers_barrow` | The Count | E minor | 66 (quarter), 12 counted eighths + 1 silent | 14 | 0.060 s to 82.787 s | 82.89 s | `mystery` |
| `orrery` | The Orrery | F# Lydian | 72, 4/4 with a 3-against-4 arpeggio | 30 | 0.060 s to 100.060 s | 100.16 s | `mystery` |
| `larchhill` | Larchhill | C Mixolydian | 84, 3/4 | 42 | 0.060 s to 90.060 s | 90.16 s | `valley` |
| `millrace` | The Millrace | A major | 100, 6/8 (quarter = 100) | 44 | 0.060 s to 79.260 s | 79.36 s | `willowmere` |
| `boss_reeve` | One Short | E minor | 132 (quarter), 12/8 | 36 | 0.060 s to 98.242 s | 98.34 s | `battle` |
| `boss_millstone` | The Wheel Runs | D minor | 120, 5/4 (3+2) | 40 | 0.060 s to 100.060 s | 100.16 s | `battle` |

Sizes are 1.5 to 2.0 MB each (the cap is 3.5 MB). Measured after MP3 decode: -16.4 to -16.6 LUFS (the manifest `volume` brings each to
-16). The loop seam is sample-continuous in every one (the loop is rendered twice and the second pass delivered); the review
number "loop seam jump / typical sample step" runs 0.0 to 1.6, and 4.2 for `boss_reeve`, where the downbeat of bar 1 is a drum and bass
onset (the step at the seam is the same size as the steps either side of it, about 0.02 against a loop-wide mean of 0.006).

### How Expansion 1 wears the name motif
- **the_downs**: the tin whistle plays it as a shepherd's call, G D E (bar 1) and C held (bar 2), and a second whistle far off
  (quiet, wide, wet) answers the fourth note an octave up. The call returns in A'' (bars 25-26) and twice in the coda (33-36).
- **high_moor**: the dulcimer states it in long notes, a bar a note (D4, A4, B4: the B the Dorian sixth over a minor chord), and
  a distant horn lands the fourth note, G4, in bar 4. The same four bars open A'' (bars 21-24).
- **wethers_barrow**: the bone flute keeps the first three notes and never plays the fourth. In E minor from the third it is
  G D E and then a rest where the C belongs (bars 3, 5, 11, 12, 13), and from D it is D A B and a rest where the G belongs (bars 7, 9).
  The drum counts twelve and the thirteenth eighth of every bar is silence.
- **orrery**: the celesta plays it once, high and lit, in bar 17: C#6 G#6 A#6 F#6, from the dominant of F# Lydian, so the fourth
  note is the key note itself, landing as the chord changes from C# to F#.
- **larchhill**: the clarinet plays it complete, C5 G5 A5 F5 (degrees 1 5 6 4 of C Mixolydian), at the start of A (bars 3-4) and A'
  (bars 19-20). The accordion answers the fourth note: its hive drone moves from C and G to F and C for a bar (bars 4, 22, 42) and
  settles back. Quiet once more at bars 41-42.
- **millrace**: the accordion plays it complete and plain, A4 E5 F#5 D5, as the first bar of the tune (bars 5-6), again in A''
  (29-30) and the coda (41-42). Nothing interrupts it: this is the place where a name is kept.
- **boss_reeve**: the choir sings it one note short, G D E, one note to each of the first three groups of the 12/8 bar, and the
  fourth group (where the C belongs) is the beat that is missing from every instrument, every bar. Resolved once, at the loop: bar
  36 is E major, the fourth group is present in every voice, and the choir sings E B C# A complete.
- **boss_millstone**: the brass states it augmented and low, F3 C4 D4 Bb3, a bar a note (five beats a note), on the grind: bars 5-8,
  9-12, 13-16, then with the horn above it in B (17-20, 21-24, 25-28).

### the_downs: The Shepherd's Road (x1_downs, x1_loomhouse; loops)
G major, 6/8 felt as two dotted-quarter pulses to a bar (tracker quarter = 92, so a dotted quarter is 61). 40 bars. Tin whistle and fiddle over an
open G and D drone in low strings, a plucked bass on both pulses, a light hand drum (low on 1, slaps on the 3rd and 6th eighths).
- A (1-8) G C C G Em C D G: the call (bars 1-2), the whistle's tune, the drum from bar 5.
- A' (9-16) G C G Em C G D G: the fiddle takes the tune above, the whistle holds long notes under it.
- B (17-24) C G Am Em C G D D7: the tune lifts an octave, harp arpeggios, a soft string pad.
- A'' (25-32): the call and tune again, the fiddle a third below. C (33-40) G C G D G C D G: thin; the call twice with its far answer,
  then a falling line home.
Instruments: tinwhistle (two tracks, one far), fiddle, strings_low, strings, pizz, framedrum, harp.

### high_moor: The High Moor (x1_highmoor; loops)
D Dorian, 76 BPM, 28 bars. A D pedal in bowed bass and low strings that never moves, modal chords above it, wind (band noise, the
pitch moves the band) in breaths of eight beats, a soft timpani at the start of each section.
- A (1-4) Dm G/D Dm C/D: the motif, a bar a note, the horn lands G.
- B (5-12) Dm C/D G/D Dm Am/D C/D G/D Dm: the long theme in the dulcimer, half notes, strings under it.
- C (13-20) F C G Dm F Am Em G over the pedal: the horn takes the theme's opening, choir joins, the dulcimer doubles low.
- A' (21-28): the motif again, then Dm G/D Dm C/D and a falling dulcimer line, the pedal alone at the end.
Instruments: dulcimer, horn (low-passed, wet, far), strings_low, strings, bowbass, choir, steam (wind), lowdrum.

### wethers_barrow: The Count (x1_barrow; loops)
E minor, quarter = 66, so an eighth is 132 a minute. A bar is twelve counted eighths plus one silent: bars are 13 eighths long (5.9 s) and the
tracker beat is one eighth. The drum counts twelve soft taps (accent on every third) and the thirteenth never sounds. 14 bars.
- I (1-2) Em: choir hum and the count, nothing else.
- A (3-6) Em Em C D: the flute, G D E and the missing fourth.
- B (7-10) Am G D Em: the flute from D, D A B and the missing fourth; a timpani on the bar.
- A' (11-14) Em C D Em: the same, the count dwindling (twelve taps, nine, six, three) until the flute is alone with the hum; then it comes round again.
Instruments: boneflute, choir (hum), strings_low, framedrum (muted), lowdrum.

### orrery: The Orrery (x1_terrace, x1_orrery, x1_cellar; loops)
F# Lydian, 72 BPM, 4/4, 30 bars. The harp plays one slow arpeggio in groups of three eighths across bars of four (it comes back to the
same place only every three bars) under a celesta that sings in half notes, struck-glass chimes on some downbeats, a glass pad and
soft strings. Chords are the F# Lydian triads: F#, G#, C#, A#m, D#m.
- I (1-4) F# G# C# F#: harp and pad alone. A (5-12): the celesta's tune, strings in the second four.
- B (13-20) F# G# A#m D#m C# F# G# C#: chimes, the motif at bar 17. A' (21-28): the tune again, thinner. O (29-30): harp alone, F# then C#.
The Cellar plays this track with the filter down if the engine has a flag for it; otherwise the same track.
Instruments: harp, celesta, glass, glasspad, strings_high, strings_low.

### larchhill: Larchhill (x1_larchhill; loops)
C Mixolydian, 84 BPM, 3/4, 42 bars. Clarinet and accordion over a plucked bass and a hive drone (two reeds fourteen cents apart, so it beats);
oom-pah-pah reed chords on beats 2 and 3 from bar 11, a shaker, a soft hand drum. The Bb stays a Bb.
- I (1-2) C. A (3-10) C F C Bb F C Gm C. B (11-18) F C Bb F Dm Gm C C: busier clarinet runs, waltz chords, shaker.
- A' (19-26): the motif, the accordion carrying the tune an octave down. B' (27-34): the accordion leads, the clarinet in thirds.
- D (35-42) C F C G C F Gm C: drowsy, the clarinet low and slow, the chords drop away, the motif once more, quiet.
Instruments: clarinet, accordion (three tracks: tune, chords, drone), pizz, framedrum, shaker.

### millrace: The Millrace (x1_millrace, x1_mill; loops)
A major, 100 BPM (quarter), 6/8, 44 bars. One loop only: there is no brighter second section for after `mill_turning`. The waterwheel is the
ostinato: a wooden clack on the first pulse, the 2nd and the last eighth, a brush for the water, a deep drum on the first pulse.
- I (1-4) A D A E: the wheel alone, then the strum (a harp played as a strummed guitar, 18 ms between strings).
- A (5-12) A D A E A D E A: the accordion's tune. A' (13-20): the fiddle above it. B (21-28) F#m D A E F#m Bm E E: the bridge, the fiddle leads.
- A'' (29-36): the tin whistle joins. C (37-44): the wheel and strum thin, the motif once more (41-42), the accordion alone at the end.
Instruments: accordion, fiddle, tinwhistle, harp (strummed), pizz, strings, woodblock (paddle clack), brush, framedrum.

### boss_reeve: One Short (the Barrow Reeve; loops)
E minor, quarter = 132, 12/8 (four groups of three eighths, 1.5 beats each), 36 bars. In every bar the fourth group is silent in every instrument:
two bone flutes run an eighth-note figure through groups one to three, two frame drums knock "bum ba ba", bass on root, root, fifth, and the
count stops one short.
- I (1-4) Em: drums and low pulse. A (5-12) Em Em C D Em G Am B7: flutes, the choir's three notes every four bars.
- A' (13-20): flutes an octave up, a second flute, timpani on the first group, the choir in thirds.
- B (21-28) C G D Em C G D B7: the climax, the choir's three notes every two bars. A'' (29-35): thinner.
- R (36) E major: the fourth group is there in every voice, the choir sings E B C# A, then the loop.
Instruments: boneflute (two), choir (melody and pad), framedrum (two), lowdrum, strings_low, bass.

### boss_millstone: The Wheel Runs (the Millstone Golem; loops)
D minor, 120 BPM (quarter), 5/4 grouped 3+2, 40 bars. A millstone grind (rubbed band noise over a stone thud) on the pulses, timpani on the 3+2
accents, a bowed bass on a D pedal, low brass stabs on the second group.
- I (1-4) Dm. A (5-16) Dm Dm Bb A / Dm Dm C A / Dm Bb C A: the brass motif, bars 5-8, 9-12, 13-16.
- B (17-28) Gm Dm Bb A / Gm Dm C A / Bb C Dm A: a horn above the brass, a second grind an octave up, timpani on every beat.
- C (29-40) Dm Bb C A, three times: the grind in eighths (29-36) and in sixteenths (37-40), the timpani rolling, stabs on every beat; the last
  bar is the dominant, so the loop starts over faster than it ended slow.
Instruments: grind (two), lowdrum, bowbass, brass (melody and stabs), horn, strings_low, strings_high.

### Cue sheet and sounds (EXPANSION1_PLAN.md 10.4)
Maps: x1_downs and x1_loomhouse `the_downs`; x1_highmoor `high_moor`; x1_barrow `wethers_barrow`; x1_terrace, x1_orrery, x1_cellar `orrery`;
x1_larchhill `larchhill`; x1_millrace and x1_mill `millrace`; x1_culvert `mystery` with the `river_birds` ambience; the Reeve `boss_reeve`; the
Golem `boss_millstone`; the Stones scene `sorrow` then back; `orrery_align` a held chord from `orrery`; `mill_done` stays `millrace`; ordinary
fights `battle`. A scene that leaves its map's track puts it back before it ends.

SFX, pack `x1` (22.05 kHz mono WAV, 346,204 bytes for all twelve files; each names a core fallback played until the pack arrives):

| id | length | fallback | what it is |
|---|---|---|---|
| `slab_slide` | 0.65 s | `door_rumble` | a heavy stone scrape and a dull thud |
| `stone_name` | 0.98 s | `name_restore` | a low bell-like chime over a chisel rasp |
| `sheep_baa` (2) | 0.44 s, 0.36 s | `emote_pop` | a trembling nasal baa through two moving formants |
| `loom_clack` | 0.34 s | `shelf_move` | two wooden clacks and a thread whisper |
| `wheel_groan` | 1.43 s | `block_push` | a groan, a drip, then wooden clacks settling to a rhythm |
| `star_chime` | 0.72 s | `save_chime` | a three-note glass chime, D6 F#6 A6 |
| `orrery_hum` | 0.87 s | `lantern_reveal` | a soft brass hum, D3 and its fifth, with shimmer |
| `hive_buzz` | 0.61 s | `page_flutter` | a warm hum with three bees passing |
| `windmill_creak` | 0.73 s | `door_open` | a slow wooden creak and a sweep of air |
| `chime_post` (2) | 0.35 s each | `crystal_hit` | three hollow wooden tubes, two variants |

Ambience (16 kHz mono, 10 s, 320 KB each, seamless, runtime-cached; the manifest `fallback` names an older bed): `moor_wind` (fallback
`wind_valley`): wide dry wind, grass hiss on the gusts, a thin whistle on the strongest; `larchhill_hum` (fallback `river_birds`): a hive hum,
three bees passing, leaves, one far windmill creak mid-loop.

### New instruments (`tools/music/synth.py`, Expansion 1)
tinwhistle (sine plus 2nd and 3rd, a chiff and a small scoop on the attack, almost no vibrato), boneflute (hollow, breathy, slow attack, a dull top, the
pitch sagging a hair at the end), framedrum (a tuned skin: a pitch-dropping body, a band of skin noise and a rim partial), clarinet (odd harmonics, a woody
breath), accordion (two reeds a few cents apart plus one an octave down, a hollow formant and a bellows swell; `beat_cents` widens the beat for the drone),
woodblock (a dry clack, no ring), grind (rubbed band noise in pulses over a stone thud; the pitch moves the band), bowbass (a dark saw with bow scrape).
`python tools/music/preview_instruments.py` includes them.

## Episode 4: three more tracks (E4-audio)

Composed and rendered the same way (same tracker and mix bus, -16 LUFS integrated before encoding, true peak at or under -1 dBFS,
60 ms guard loops, 0-sample decode lag in headless Chromium for all three, `verify_decode.py`). Plan: `docs/EPISODE4_PLAN.md` 8.
Files are `assets/audio/music/ep4_<id>.mp3` (+ sidecar), songs `tools/music/songs/ep4_*.py`; render with
`python tools/music/render.py ep4_valewyn ep4_sunken_keep ep4_boss_regent --wav`. They are NOT in `render.py`'s `ALL`, in
`build.py`'s `MUSIC_IDS` or in `assets/audio/manifest.json`: Episode 4 audio reaches the game only through the pack fragment
`src/data/ep4/audio.js` (plan 13.3), which also carries `volume` from the decoded loudness (-16.44 to -16.49 LUFS measured).

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `valewyn` | The Drowned Crown | A minor to C major | 90, 4/4 | 32 | 0.060 s to 85.393 s | 85.49 s | `hollowmere` |
| `sunken_keep` | The Sunken Keep | D Dorian | 80, 4/4 | 32 | 0.060 s to 96.060 s | 96.16 s | `court` |
| `boss_regent` | The Paper Regent | F minor | 6/8, quarter = 132 (dotted quarter 88) | 80 (4 intro + 76 loop) | 5.455 s to 109.091 s | 109.19 s | `boss_warden` |

### The Valewyn tune (`tools/music/songs/ep4_theme.py`)
Eight bars of 4/4 in scale degrees: the complete motif (0 4 5 3), its fourth note held a whole bar across the bar line (the
held breath), then the flute's answer. `valewyn` plays it in C major in its B section; `boss_regent` quotes it in F minor,
re-barred to 6/8 by `swing68` (each quarter a dotted quarter, each off-beat eighth the last eighth of its group).
`python tools/music/songs/ep4_theme.py` checks the bars and the 6/8 re-barring.

### How Episode 4 wears the name motif
- **valewyn**: the celesta, C5 G5 A5 F5, the F held four beats across the bar line into the next chord, where it becomes the root
  (Fmaj7 in A minor, bars 1-2 and 5-6; F/A in C major, bars 17-18). The same four pitches are b3 b7 1 b6 in A minor and 1 5 6 4 in
  C major: the motif does not change between the sections, the city around it does. Once more in bar 29 over Dm7, the held F
  sinking to E in the flute.
- **sunken_keep**: the clarinet, augmented, a bar a note, D4 A4 B4 G4 (the B the Dorian sixth, sung over G/D), bars 1-4 and 17-20;
  in 17-20 a glass pad plays it back an octave up, two beats late (the reflection on the water). In C the harp states it plainly
  in quarter notes (D A B G, then C G A F over Fmaj7).
- **boss_regent**: the brass, from the third of F minor, Ab4 Eb5 F5 Db5, the same shape as the celesta's in `valewyn`, the Db held
  across the bar line and ended by a wax-stamp thud (timpani and woodblock), bars 5, 9, 13, 17 (A) and 21-33 (A2, doubled by
  horn and high strings). In B the Valewyn tune in minor (F C Db Bb, the Bb held, then the answer; horn and strings, then brass),
  the city's song turned into law. In C the motif climbs from Ab, Bb, Db and Eb. Bar 80, the last before the loop, is F major:
  the motif in its tonic guise F C D Bb on the celesta (the city's instrument) and the horn.

### valewyn: The Drowned Crown (ep4_valewyn and ep4_vw_*, crown_remembers, the Episode 4 credits; loops)
The root region-4 brief for the tracker: flowing harp, lyrical strings, soft flute, a celesta like water. A (1-8) Am, Fmaj7, C,
Gsus4-G, Am, Fmaj7, Dm7, E7sus4-E7: celesta motif, flute answers. A' (9-16) Am, Fmaj7, C/G, D/F#, Fmaj7, C/E, Dm7, E7: high strings
sing, glass drops of rain. B (17-24) C, F/A, G/B, C, F, C/E, Dm7, Gsus4-G: the lift into C major, the theme, faint choir. B' (25-28)
C, G/B, Am7, Fmaj7: flute and strings in octaves, harp in sixteenths. T (29-32) Dm7, Am/C, Bbmaj7, E7sus4-E7 back to Am.
Instruments: celesta, flute, strings_high, harp, glass, strings, strings_low, choir, bass. Reverb room 0.88, 4.0 s.

### sunken_keep: The Sunken Keep (ep4_keep_f1, ep4_keep_f2; loops)
A slow pulse of plucked low strings (pizzicato on beats 1 and 3), the Keep's drowned bell (D3 through a 650 Hz lowpass, very wet)
every four bars, water drops (a small song-local `Drop` instrument: a sine that bends up as it pops), a clarinet line.
A (1-8) Dm, Am7/D, G/D, C/D, Dm, C/D, G/D, Dm over a D pedal. B (9-16) F, C/E, Dm, Am, F, G, Em7, A7sus4-A7: the bass moves,
strings and choir. A' (17-24): A with the reflection. C (25-32) Dm, Em7, Fmaj7, G, Dm, Em7, Fmaj7, A7sus4-A7: more drops, a slow harp
arpeggio, the clarinet low. Instruments: clarinet, glasspad, harp, pizz, bass, bell (lowpassed), drop, strings_low, strings, choir.

### boss_regent: The Paper Regent (the Regent's battle; loops)
6/8 written as three quarter beats a bar at 132. I (1-4) harp ostinato alone, then low brass and timpani; played once (E4-integrate,
2026-11-04: the loop used to restart into the harp alone under the dying tail of bar 80, about 2.7 s at -23 to -31 dB RMS; the song
now renders bars 5 to 80 as the loop body and bars 1 to 4 as a head before loopStart, at the body's gain, its last 60 ms under the
guard, so the seam stays the tracker's sample-continuous one). A (5-20) Fm, Db, Bbm, C,
Fm, Db, Eb, C7 (two bars each): spiccato strings on the eighths, timpani and low brass on both pulses. A2 (21-36) Fm, Db, Bbm, C,
Fm, Gb, Eb, C: choir up, motif doubled. B (37-52) the quote: Fm, Bbm/Db, Cm/Eb, Fm, Bbm, Fm/Ab, Gm7b5, Csus4-C (the raised leading
tone E over the last C). C (53-68) Fm, Eb, Gb, Ab (the climb), C7 hemiola (three stabs against two pulses, timpani roll), the
motif fortissimo, Db, C7. R (69-79) the ostinato creeps back, the motif cut short in the strings, a C7 build. M (80) F major.
Instruments: spiccato strings (strings_low, fast attack), harp, brass (melody, stabs, pedal), horn, strings_high, choir, celesta,
lowdrum, woodblock (the stamp), bass.

### Sounds (plan 8.4), `tools/audio/ep4_sfx.py`
Not registered in `sfx_defs.REG` on purpose: `build.py` would write them unprefixed (precached) and into the core manifest. The
script masters with `build.master` and writes `assets/audio/sfx/ep4_<id>.wav` (22.05 kHz mono) and `assets/audio/ambience/ep4_<id>.wav`
(16 kHz mono, 10 s, seamless); `--review` draws waveform and spectrogram sheets into `tools/audio/out/ep4/`. All pack `ep4`, lazy.

| id | length | fallback | what it is |
|---|---|---|---|
| `tide_wheel` | 0.89 s | `block_push` | an iron axle creak, three ratchet clicks, a heavy clunk |
| `water_rise` | 1.02 s | `splash` | a deep gulp, then water swelling up the walls |
| `water_drain` | 0.93 s | `splash` | a falling rush to a trickle and a last drip |
| `seal_wash` | 1.24 s | `ink_gurgle` | a wet paper tear and a low sinking bloom (wet and dark, no shimmer) |
| `seal_stamp` | 0.30 s | `hit_heavy` | a padded wax-stamp thunk with a wooden knock and a paper slap |
| `decree_void` | 1.03 s | `page_flutter` | a dry crisp tear and a bright rising glass shimmer, D6 A6 D7 F#7 |
| `decree_unroll` | 1.48 s | `telegraph` | a scroll unrolling in two rolls over a low tone rising a fourth |
| `bell_drowned` | 4.40 s | `bell_toll` | a bronze bell about D3 through water: a drifting lowpass near 600 Hz, a slow wobble, long dark decay |
| `bell_clear` | 4.78 s | `bell_toll` | the clear variant (E3, open and bright) for the principle stones; an extra id no script names yet |

Ambience: `canal_rain` (fallback `river_birds`): steady rain on water, countless tiny plinks, a gutter trickle, slow gusts, a few
eave drips. `keep_drip` (fallback `archive_hush`): a still flooded hall, low hum, slow lapping, near and far drips, one far groan of
a lock gear.

## Episode 5: three more tracks (E5-audio)

Composed and rendered the same way (same tracker and mix bus, -16 LUFS integrated before encoding, true peak at or under -1 dBFS,
60 ms guard loops). Plan: `docs/EPISODE5_PLAN.md` 8. Files are `assets/audio/music/ep5_<id>.mp3` (+ sidecar), songs
`tools/music/songs/ep5_*.py`; render with `python tools/music/render.py ep5_saffron ep5_labyrinth ep5_boss_oracle --wav`. Like
Episode 4's, they are NOT in `render.py`'s `ALL`, in `build.py`'s `MUSIC_IDS` or in `assets/audio/manifest.json`: Episode 5 audio
reaches the game only through the pack fragment `src/data/ep5/audio.js` (plan 13.3), whose `volume` brings each decoded MP3 to -16
LUFS (measured -16.44 to -16.65, the same spread as the Episode 4 and Expansion 1 tracker pieces in `tools/audio/music_levels.json`).
`python tools/audio/ep5_review.py` decodes each MP3 and draws the loop seam, the three sound pairs and the oud's bend
(`tools/audio/out/ep5/seams.png`, `pairs.png`, `bend.png`).

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `saffron` | The Moonwell Caravanserai | D minor (harmonic minor dominant) | 92, 4/4 | 32 | 0.060 s to 83.538 s | 83.64 s | `orrery` |
| `labyrinth` | The Shifting Dunes | E Dorian | 84, 4/4 | 32 | 0.060 s to 91.489 s | 91.59 s | `court` |
| `boss_oracle` | The Sand Oracle | C minor | 12/8, quarter = 132 (dotted quarter 88) | 42 (2 intro + 40 loop) | 5.455 s to 114.545 s | 114.65 s | `boss_king` |

### The Saffron tune and the oud (`tools/music/songs/ep5_theme.py`)
Eight bars of 4/4 in scale degrees, opening with the complete motif (0 4 5 3), its fourth note held into the next bar. `saffron`
plays it in F major in its B section; `boss_oracle` quotes it in C minor, re-barred to 12/8 by `swing128`. The module also holds
two song-local instruments (synth.py is untouched): `Oud`, two Karplus-Strong courses plucked near the bridge, a woody body, a
tamed pick spike, and an optional `bend` (semitones, after `bend_delay` seconds, read back through a time-varying resampler so
the pitch moves while the string rings); and `Tar`, a finger frame drum whose pitch picks the stroke (below C4 the open dum,
above it the rim tek). `python tools/music/songs/ep5_theme.py` checks the bars, the motif's intervals and the 12/8 re-barring.

### How Episode 5 wears the name motif
- **saffron**: the oud, F4 C5 D5 Bb4, from the third of D minor (the same four pitches are 1 5 6 4 in F major). The Bb rings
  across the bar line and is bent down a half step onto A, the fifth of the key, as the harmony moves to Bbmaj7 (bars 1-2, 5-6
  and 29-30); the high strings sigh F to E with it. In B the tune in F major has the same four notes on the oud, held, not bent.
  The harmonic minor's C# only appears inside A7 (no Bb to C# step in any melody): the desert is in the oud, the frame drum and
  the breathy flute, not in a scale.
- **labyrinth**: the bone flute, augmented to six beats a note, E4 B4 C#5 A4 (the C# the Dorian sixth): the notes change in the
  middle of bars as often as on them, a dune drifting against the path (bars 1-6, 17-22). In A' the high strings answer two beats
  late with the inverted guise E5 A4 G4 B4 (the motif read in a mirror: the Gallery of False Horizons). In C only the last three
  notes come back.
- **boss_oracle**: the brass, Eb4 Bb4 C5 Ab4, one note on each pulse of a 12/8 bar, the Ab held across the bar line into the Ab
  chord (bars 3 and 7; doubled by high strings and horn in 11 and 15, fortissimo in 33). In B the Saffron tune in C minor: its
  motif notes on the oud (the town's instrument, C5 G5 Ab5 F5), the rest on horn and strings, then on the brass. In C the motif
  climbs from Eb, F, G and Ab. Bar 42, the last before the loop, is C major: the oud plays C G A F and bends the F down onto E,
  the major third, the town's sigh landing in the light for one bar.

### saffron: The Moonwell Caravanserai (ep5_saffron and ep5_sh_*, haven_arrival, every_road, the Episode 5 credits; loops)
The root region-5 brief for the tracker: plucked oud-like strings, hand percussion, a breathy flute, spacious string pads. A (1-8)
Dm, Bbmaj7, Gm, A7sus4-A7, Dm, Bbmaj7, Gm7-Em7b5, A7sus4-A7: night; the oud motif and its bend, the flute answers, a D/A drone,
a frame-drum dum on the downbeat, a few glass stars. A' (9-16) Dm, Gm/D, Bb, A7, Dm, F/C, Gm, Gm7-C7: the flute's long night
melody, the oud walks in eighths. B (17-24) F, Gm7, Bbmaj7, C, Dm7, Gm, F-Gm7, Csus4-C: the caravans, the tune in F major, the
strings an octave under from bar 19, the drum's walking figure and a shaker. B' (25-28) Bb, F/A, Gm, A7: flute and strings in
octaves. T (29-32) Dm, Bbmaj7, Gm6, A7sus4-A7: the motif once more, bent; the A7 falls into bar 1. Instruments: oud (melody, bent
note, walk), bone flute, strings_high, strings, strings_low, bass, tar, shaker, glass. Reverb room 0.9, 4.2 s.

### labyrinth: The Shifting Dunes (ep5_lab_f1, ep5_lab_f2; loops)
The plan's brief: a slow frame-drum pulse, a sustained low drone, a breathy flute with the motif in long notes, a bright bell tick
every 8 bars. A (1-8) Em, Em, A/E, A/E, D/E, D/E, Em, Em over an E2-B2 drone. B (9-16) G, D/F#, Em7, A, G, D/F#, C#m7b5, Bm7: the
bass leaves the pedal (a low bowed bass), an oud figure, the flute's slow line, a glass pad. A' (17-24): the motif and its mirror,
a faint choir, the drum busier. C (25-32) A/E, G/E, D/E, Em, A/E, G/E, Bm7/E, Bm7: a harp arpeggio, the motif's last three
notes, the oud and choir back for the last four bars. The sundial: a glockenspiel tick and a dry knock on the downbeat of bars 1, 9,
17 and 25, a step lower each time (B6, A6, F#6, E6), with a faint repeat a bar later. Instruments: bone flute, strings_high,
strings_low (drone), bowbass, glasspad, choir, oud, harp, tar, framedrum, glock, woodblock.

### boss_oracle: The Sand Oracle (the Oracle's battle; loops)
12/8 written as six quarter beats a bar at 132 (pulses on 0, 1.5, 3, 4.5). I (1-2) Cm: frame drums and low brass, the ostinato
from bar 2; played once, rendered as a head before loopStart at the body's gain (the boss_regent construction, here from the
start), so the seam bar 42 -> bar 3 is the tracker's sample-continuous one. A (3-10) Cm, Ab, Fm, G, Cm, Ab, Db, G7. A2 (11-18) Cm,
Ab, Fm, G, Cm, Eb, Db, G7: choir up, the motif doubled, a second frame drum on the off-eighths. B (19-26) the quote: Cm, Eb,
Abmaj7, G, Fm7, Fm6, Cm-G7, Gsus4-G (the raised B over the last G). C (27-34) the climb (Cm, Fm, Gm, Ab), a G7 hemiola (six
quarter stabs against four pulses, timpani roll), the motif fortissimo, G7. R (35-41) the ostinato creeps back, the motif cut
short, a G7 build. M (42) C major. Instruments: oud (ostinato in eighths, the quote's motif, the bent last note), pizz, brass
(melody, stabs, low pedal), horn, strings_high, choir, tar (two), lowdrum, bass.

### Sounds (plan 8.4), `tools/audio/ep5_sfx.py`
Not registered in `sfx_defs.REG`, as Episode 4's: the script masters with `build.master` and writes `assets/audio/sfx/ep5_<id>.wav`
(22.05 kHz mono) and `assets/audio/ambience/ep5_<id>.wav` (16 kHz mono, 10 s, seamless); `--review` draws waveform and spectrogram
sheets into `tools/audio/out/ep5/`. All pack `ep5`, lazy (`LAZY_PREFIXES`).

| id | length | fallback | what it is |
|---|---|---|---|
| `sun_dial` | 1.22 s | `switch_on` | stone grinding a quarter turn on its pivot, a seat-clunk, a small E6/B6 chime |
| `sand_run` | 0.75 s | `shelf_move` | a dry hiss of grains rising into a soft pour |
| `sand_hold` | 0.47 s | `land` | a soft settling crunch thinning to silence |
| `lamp_roll` | 0.95 s | `block_push` | iron wheels rolling on a stone rail, two clunks at the rail joints |
| `sky_turn` | 2.39 s | `combo_start` | Night: a bronze gong swell about A2 that blooms, glass points falling on top |
| `sky_turn_day` | 1.78 s | `combo_start` | Day: a warm brass swell, F#3 major opening dark to bright, a rising fifth (an extra id) |
| `prophecy_read` | 2.27 s | `telegraph` | two star-bells a tritone apart (F#7, C7) over a C2 drone that swells and does not resolve |
| `prophecy_break` | 1.08 s | `glass_break` | glass stars cracking and scattering, then pings that glide upward out of hearing |
| `caravan_bell` | 3.80 s | `crystal_hit` | a small copper bell at D6, harmonic and beat-free partials, a long clean decay |

`sky_turn_night` is an alias of `sky_turn` (a caller that knows the new sky plays `sky_turn_${sky}`). Told apart on purpose
(`pairs.png`): sky_turn against sky_turn_day by pitch and timbre (gong A2 and glass against brass F#3); prophecy_break against
Episode 4's `decree_void` (no paper tear, no fixed arpeggio: rising glides); caravan_bell against `bell_drowned` (centroid 1158 Hz
against 129 Hz, harmonic against beating bronze, dry against underwater). Ambience: `desert_wind` (fallback `ash_wind`): a low
steady wind over open sand, a constant faint grain-hiss, and twice in the loop a gust lifting a sheet of sand off a crest.
`well_hush` is an alias of the core `archive_hush` (plan 2.7).

## Episode 6: three more tracks (E6-audio)

Composed and rendered the same way (same tracker and mix bus, -16 LUFS integrated before encoding, true peak at or under -1 dBFS,
60 ms guard loops). Plan: `docs/EPISODE6_PLAN.md` 8. Files are `assets/audio/music/ep6_<id>.mp3` (+ sidecar), songs
`tools/music/songs/ep6_*.py`; render with `python tools/music/render.py ep6_zephyr ep6_storm_observatory ep6_boss_scribe --wav`.
Like Episodes 4 and 5, they are NOT in `render.py`'s `ALL`, in `build.py`'s `MUSIC_IDS` or in `assets/audio/manifest.json`:
Episode 6 audio reaches the game only through the pack fragment `src/data/ep6/audio.js` (plan 13.3), whose `volume` brings each
decoded MP3 to -16 LUFS (measured -16.44 to -16.45). `python tools/audio/ep6_review.py` decodes each MP3 and draws the loop seam,
the sound pairs and the wind harp's motif (`tools/audio/out/ep6/seams.png`, `pairs.png`, `motif.png`; `levels.json`). No Suno:
the optional Suno `zephyr` of plan 9.5 stays Scott's call.

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `zephyr` | The Windward Docks | G major (Lydian colour on the IV) | 112, 4/4 | 40 | 0.060 s to 85.774 s | 85.87 s | `the_downs` |
| `storm_observatory` | The Windward Causeways | D Dorian | 96, 4/4 | 36 | 0.060 s to 90.060 s | 90.16 s | `court` |
| `boss_scribe` | The Storm Scribe | E minor | 6/8, quarter = 138 (dotted quarter 92) | 80 (2 intro + 78 loop) | 2.609 s to 104.348 s | 104.45 s | `boss_king` |

### The Zephyr tune and the wind harp (`tools/music/songs/ep6_theme.py`)
Eight bars of 4/4 in scale degrees, opening with the complete motif (0 4 5 3, G D E C in G major), its fourth note held over the
bar line into Cmaj7, then lifted an octave by the wind. `zephyr` plays it in G major in its B section; `boss_scribe` quotes it in
E minor, re-barred to 6/8 by `swing68` (one 4/4 bar becomes two 6/8 bars). The module also holds the song-local instruments
(synth.py is untouched). `WindHarp` is an aeolian harp: two strings per course a few cents apart, each a bank of very narrow
two-pole resonators, one per harmonic, excited not by a pluck but by band-limited noise under a slow S-curve swell (a separate
gust of noise per harmonic, so the overtones wander independently). It has no attack: the note swells in as the gust catches the
string (`catch`, the short time constant while the wind holds), sings on its harmonics, and when the gust lets go the same
resonators continue from their exact state with the longer `ring`, so it fades rather than stops. `harmonics=1` moves the voice
onto its overtones (the fundamental a whisper) for the high echoes. `Swell` wraps any instrument in a gust envelope (a drone that
rises and falls), and `Cymbal` is a light suspended cymbal (a soft mallet roll below C4, a stick tap above).
`python tools/music/songs/ep6_theme.py` checks the bars, the motif's intervals (G D E C, exactly 0 +7 +9 +5), the F# over C and
the 6/8 re-barring (one motif note on each pulse, E B C A in E minor).

### How Episode 6 wears the name motif
- **zephyr**: the wind harp, G4 D5 E5 C5, bars 1-2, 5-6 and 33-34: the C enters on beat 4, swells in late and is held over the
  bar line, where it becomes the root of Cmaj7#11. Decoded from the MP3 (`motif.png`), the strongest pitch per beat of bars 1-2
  is 392, 587, 658, then 523 Hz for five beats. In B the Zephyr tune has the same four notes on the wind harp, the flute an octave
  over it. Bar 37 echoes the motif on the wind harp's overtones, an octave up and quiet.
- **storm_observatory**: the low horn, augmented to a bar a note, D3 A3 B3 G3 (the B the Dorian sixth), bars 1-4; the wind harp
  answers each note two beats late on its overtones, D5 A5 B5 G5. A' moves the pair onto G (G3 D4 E4 C4). In C the wind harp
  turns it over, the inverted guise D5 A4 G4 B4, and the horn answers each note low. T brings the horn back for three notes; the
  fourth is left to the chime.
- **boss_scribe**: the brass, G3 D4 E4 C4 from the third of E minor, one note on each 6/8 pulse over two bars, the C held into the
  C chord (bars 3 and 11; doubled by high strings and horn in 19 and 27; fortissimo in 65). In B the Zephyr quote in E minor: its
  motif notes on the wind harp (the town's instrument, E4 B4 C5 A4), the rest on horn and strings, then the brass. In C the motif
  climbs from E, G and A. Bars 79-80, the last before the loop, are E major: the wind harp plays E B C# A in eighths and lets the
  A fall to G#, the major third, held until the loop returns to E minor.

### zephyr: The Windward Docks (ep6_zephyr and ep6_zl_*, zephyr_arrival, isles_return, the Episode 6 credits; loops)
The root region-6 brief for the tracker: a soaring flute, buoyant strings, a bright harp, light cymbals. The sky is in the
instruments, the mode and the space: the harp's sixteenths are stacked fifths (over Cmaj7#11 they climb C G D F# B; the Lydian
scale is stacked fifths), the A pads are open fifths with no third, a wide hall, and a light low end (the bass from bar 9, the
low strings only under the docks). A (1-8) G, Cmaj7#11, Em7, Dsus4-D, G, Cmaj7#11, Am7, Dsus4-D: the motif, the flute's answers,
a soft cymbal roll into bars 1 and 5. A' (9-16) G, D/F#, Em7, Cmaj7#11, G/B, C, Am7, D: the flute soars (F#6 over C in bar 12),
pizzicato and bass enter. B (17-24) the Zephyr tune: G, Cmaj7, Em7, D, C, G/B, Am7-D7, G; strings an octave under the flute, low
strings, cymbal taps on 2 and 4, the harp in broken chords with the third. B' (25-32) C, G/B, Am7, D, Em7, Cmaj7#11, Am7-D7, G:
flute and high strings in octaves, glockenspiel points. T (33-40) the A harmony again, the motif and its echo, the strings
descending B A G F# E F# into bar 1. Instruments: wind harp (two settings), flute, strings_high, strings, strings_low, harp, pizz,
bass, glock, cymbal. Reverb room 0.9, 4.0 s.

### storm_observatory: The Windward Causeways (ep6_obs_f1, ep6_obs_f2; loops)
The plan's brief: a low timpani pulse and rope creaks, a string drone that rises and falls like gusts (`Swell` over strings_low,
two-bar swells, deeper in A' and C), the horn's motif in long notes with the wind harp's echo, and the chime: on bars 1, 9, 17,
25 and 33 two small glass chimes tied on one cord (A6 and D7) are struck together and a third (E7) slips free a beat and a half
later, dry and close. A (1-8) a D pedal under Dm, Am7/D, G/D, C/D, Dm7, C/D, G/D, Am/D. B (9-16) Dm, C, G/B, Am7, Dm, F, G,
Asus4: the bowed bass leaves the pedal, the high strings' slow line with the horn under it, pizzicato off-beats. A' (17-24) G, Dm,
Am, F, Dm, C, G/B, Am: the motif on G. C (25-32) Dm, Am, C, G, Dm, F, Em7, Asus4: the storm; the inverted motif, choir, timpani
eighths, the creaks closer. T (33-36) Dm, Am7/D, G/D, Asus4. Instruments: horn, wind harp (harmonics), strings_high, gust drone,
gust strings, choir, bowbass, pizz, lowdrum, creak, glass.

### boss_scribe: The Storm Scribe (the Scribe's battle; loops)
6/8 written as three quarter beats a bar at 138 (pulses on 0 and 1.5). I (1-2) Em: timpani, snare gusts, the low brass pedal;
played once, rendered as a head before loopStart at the body's gain (the boss_oracle construction), so the seam bar 80 -> bar 3
is the tracker's sample-continuous one. A (3-18) Em, C, Am, B7, Em, C, D, B7 (two bars each): the running string ostinato (fiddle
spiccato in eighths, rain on canvas), pizzicato roots, choir, the brass motif. A2 (19-34) Em, C, D, B7, Em, C, Am, B7: the motif
doubled, the snare busier. B (35-50) the Zephyr quote: Em, Am7, Cmaj7, B7, C, G, Am7-B7, Em. C (51-66) the climb (Em-Am, G-C,
Am-D), a B7 hemiola (63-64, three quarter stabs against two pulses, a timpani roll), the motif fortissimo. R (67-78) C, Am, B7,
Em, C, B7: the rain thins under a held string line, the motif cut short, a B7 build. M (79-80) E major on the wind harp. A snare
roll swells into the second pulse of every other bar (the gusts). Instruments: fiddle ostinato, pizz, brass (melody, stabs, low
pedal), horn, strings_high, wind harp, choir, snare, lowdrum, cymbal, bass.

### Sounds (plan 8.4), `tools/audio/ep6_sfx.py`
Not registered in `sfx_defs.REG`, as Episodes 4 and 5: the script masters with `build.master` and writes
`assets/audio/sfx/ep6_<id>.wav` (22.05 kHz mono) and `assets/audio/ambience/ep6_<id>.wav` (16 kHz mono, seamless); `--review`
draws waveform and spectrogram sheets into `tools/audio/out/ep6/`. All pack `ep6`, lazy (`LAZY_PREFIXES`). The ep6 sfx and
ambience add 1.05 MB, so `qa/audio/manifest.test.mjs`'s total cap moved from 11.5 to 12.5 MB (as Episodes 4 and 5 moved it).

| id | length | fallback | what it is |
|---|---|---|---|
| `gust_carry` | 1.17 s | `jump` | a rising rush of air with a cloth flap (0.5 s), then a low hold of moving air that thins away (one-shot) |
| `gust_land` | 0.43 s | `land` | a falling whoosh, a soft boot thump on a plank |
| `vane_turn` | 1.14 s | `switch_on` | a brass ratchet of six clicks, a post creak and seat, the wind's whistle gliding up a fourth |
| `mooring_catch` | 0.33 s | `door_close` | a rope snapping taut (a low twang and a fibre crack) and a wooden knock |
| `gale_gust` | 1.58 s | `flee` | a broad gust swell that rises and passes, rigging rattling and cloth flapping on it |
| `anchor_set` | 1.05 s | `spear_thrust` | a thrust, a spear driven into planks (a wooden thunk, splinters), a rope pulled tight that rings once |
| `rewrite_read` | 2.03 s | `telegraph` | fast dry quill scratches over paper, a low wind swelling under them on an open fifth that does not resolve |
| `rewrite_break` | 1.30 s | `glass_break` | a quill snapping, paper ripped away on a rising whoosh, scraps fluttering off, one clear tone gliding D5 to A5 |
| `signal_lamp` | 1.61 s | `crystal_hit` | a small glass chime (A6, E7 a moment later), short and beat-free, and a soft flame catching under it |

Told apart on purpose (`pairs.png`): gale_gust against core `thunder` (a continuous broadband swell, centroid 1197 Hz, against a
low boom with cracks, centroid 322 Hz, peak 64 Hz); rewrite_break against Episode 4's `decree_void` and Episode 5's
`prophecy_break` (a paper tear and one rising tone, centroid 864 Hz, against a fixed glass arpeggio at 2490 Hz and rising glass
glides at 4182 Hz); signal_lamp against Episode 5's `caravan_bell` (glass rod partials 1, 2.76, 5.4 at A6 and a 1.6 s decay,
against a copper bell's harmonic partials at D6 ringing 3.8 s). A gust's left-to-right travel is written as a rise and a pass:
the sfx are mono like every other set.

Ambience: `sky_wind` (10 s, fallback `wind_valley`; the Airstair, the town, F1): a high, thin, steady wind over open sky, a faint
rigging hum (two tones whose periods divide the loop) swelling with the wind, once in the loop a far glass chime.
`storm_rumble` (8 s, fallback `moor_wind`; F2, F3, the Eyrie): a low rumbling wind, rain on canvas (fine taps through a taut
sheet), one soft distant thunder roll a loop, so every 8 s.

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
python tools/music/render.py                 # all twenty-two: MP3 + JSON + review images in tools/music/out/
python tools/music/render.py hollow court    # a subset (do NOT pass --help: any flag-only call renders everything. Episode 2: hollow hollowmere fading_road court boss_king; Episode 3: emberpeak first_bell ash_road foundry boss_warden)
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

## Episode 7: three more tracks (E7-audio)

Composed and rendered the same way (same tracker and mix bus, -16 LUFS integrated before encoding, true peak at or under -1 dBFS,
60 ms guard loops). Plan: `docs/EPISODE7_PLAN.md` 8. Files are `assets/audio/music/ep7_<id>.mp3` (+ sidecar), songs
`tools/music/songs/ep7_*.py`; render with `python tools/music/render.py ep7_palehaven ep7_frostbound_vault ep7_boss_phantom --wav`.
Like Episodes 4 to 6, they are NOT in `render.py`'s `ALL`, in `build.py`'s `MUSIC_IDS` or in `assets/audio/manifest.json`:
Episode 7 audio reaches the game only through the pack fragment `src/data/ep7/audio.js` (plan 13.3), whose `volume` brings each
decoded MP3 to -16 LUFS (measured -16.44 on all three). `python tools/audio/ep7_review.py` decodes each MP3 and draws the loop
seams and the bell's motif (`tools/audio/out/ep7/seams.png`, `motif.png`; `levels.json`); `python tools/audio/ep7_sfx.py
--review` draws the sound pairs (`pairs.png`). `verify_decode.py` measured a 0-sample lag in headless Chromium for all three.
No Suno: everything is composed in code.

| id | title | key | BPM / meter | bars | loop | length | fallback |
|---|---|---|---|---|---|---|---|
| `palehaven` | The Thawing Hearth | D Dorian | 72, 4/4 | 28 | 0.060 s to 93.393 s | 93.49 s | `hollowmere` |
| `frostbound_vault` | The Vanishing Steps | A Aeolian | 66, 4/4 | 24 | 0.060 s to 87.333 s | 87.43 s | `hollow` |
| `boss_phantom` | The White Phantom | F minor | 132, 4/4 | 60 | 0.060 s to 109.151 s | 109.25 s | `boss_king` |

### The Palehaven tune, the iceglass bell and the cello (`tools/music/songs/ep7_theme.py`)
Eight bars of 4/4 in scale degrees, opening with the complete motif (0 4 5 3, D A B G in D Dorian, the B the Dorian sixth), its
fourth note held over the bar line and left ringing under the reply (A F E). `palehaven` plays it in D Dorian in its B sections;
`boss_phantom` quotes it in F minor with every value doubled by `tune_aug` (one tune bar becomes two boss bars, so the town's song
keeps its own slow pace, frozen under the drive). The module holds the song-local instruments (synth.py is untouched).
`IceglassBell` is a struck glass bar heard from very far away, the Listening Bell's voice: a soft mallet landing hard (a felt
thump and a 4 ms raised-cosine onset, the upper partials a few ms slower to speak), three inharmonic partials at 1, 2.76 and 5.4
of the fundamental with their own long decays (the fundamental about 4 s), each top partial split into two modes a fraction of
a hertz apart so they beat slowly, the top rolled off and a breath of band noise on the strike for distance. It is the opposite
of Episode 6's attack-less wind harp. `damp` stops the bar by hand a set time after the gate (the stopped bell). `Cello` is a
bowed solo line (a saw with a faint second bow stroke, formants near 250, 600 and 1500 Hz, delayed slow vibrato, bow noise on
the attack); a short bow makes it the boss's spiccato. `MuffledDrum` is a felt-wrapped bass drum with a crunch of snow on top.
`python tools/music/songs/ep7_theme.py` checks the bars, the motif's intervals (D A B G, exactly 0 +7 +9 +5), the B over G,
the held notes against their chords and the boss's re-barring (one motif note each half bar, F C Db Bb in F minor).

### How Episode 7 wears the name motif
- **palehaven**: the iceglass bell, D5 A5 B5 G5, bars 1-2, the G never damped, ringing on while the cello replies under it, A3
  F3 E3. Decoded from the MP3 (`motif.png`), the strongest pitch per beat of bars 1-2 is 587, 880, 988, then 785 Hz for five
  beats. Bar 5 repeats it an octave down and softer, bar 25 brings it back for the turn home. In B and B' the tune has the same
  four notes on the bell, the rest on the cello, then on the piano.
- **frostbound_vault**: the cello, augmented to a bar a note, from the third of the key so the intervals stay exact in A Aeolian:
  C3 G3 A3 F3 (bars 1-4); the iceglass bell answers each note two beats late, two octaves up. B moves the pair onto G (G2 D3 E3
  C3). C states it on C again and holds the F, the fourth note, from bar 20 to the loop: the motif left open. The stopped bell
  (an E6 struck on beat 2 of bars 8, 16 and 24 and damped a third of a second later) is the Keeper's hands on the bronze.
- **boss_phantom**: the high strings with the low brass two octaves under, from the third of F minor: Ab3 Eb4 F4 Db4 in half
  notes, the Db held into the Db chord (bars 1 and 9). In B the Palehaven quote in F minor: its motif notes on the iceglass bell
  (F4 C5 Db5 Bb4, the warm Dorian sixth gone minor), the rest on the high strings with the horn under them. C climbs the motif
  from Ab, Bb and C (each keeping the scale's own sixth) and states it fortissimo. Bars 59-60, the last before the loop, are F
  major: the bell plays F5 C6 D6 Bb5 and lets the Bb fall to A, the major third, ringing until the loop takes it back to F minor.

### palehaven: The Thawing Hearth (ep7_palehaven and ep7_ph_*, doors_reopen, the Episode 7 credits; loops)
The root region-7 brief for the tracker: a warm solo cello, sparse piano, glass bells, airy sustained strings, quiet snow and
aurora with melancholy hope. The cold is in the instruments, the mode and the space, not a stock cliche (no sleigh bells, no wind
effect): an open D-A fifth with no third under the whole A section, the bell far off in a long dark hall (room 0.92, 5 s), the
strings high and thin, a faint glass shimmer every second bar (the aurora). The warmth arrives with the Dorian B when the doors
open in B. A (1-8) the held fifth, the motif and the cello's reply and slow line (F G A, B, down to D). B (9-16) the tune: Dm,
Em7, F, G, G/B, F, Am7-C, Dm; the cello sings it, pads take the third, the piano's rising thirds (beats 3-4 of even bars) are
answered by the bell a bar later. B' (17-24) the tune on the piano, the bell's motif over it, the cello's countermelody, the low
strings warm on the roots: the hearth. T (25-28) Dm, Em7, C, Dm: the motif once more, the cello alone on D. Instruments:
iceglass bell, cello, piano, strings, strings_high, strings_low, glasspad.

### frostbound_vault: The Vanishing Steps (ep7_vault_f1, ep7_vault_f2; loops)
The plan's brief: a low cello drone that never quite resolves (a second cello under ep6's `Swell`: the fifth A2 E3, whose E leans
up to F for one bar in four, and in C the root walks off to F2 and G2 and does not come home before the loop does), the motif on
the cello augmented with the bell's echo, footsteps in snow (the muffled drum on 1 and 3, a lighter step on the and of 4 every
second bar) and the stopped bell every 8 bars. A (1-8) the motif on C, the cello's low answer (5-8). B (9-16) the motif on G,
the high strings very high and thin. C (17-24) the drone walks, a faint choir, the motif on C with its F held to the loop.
Instruments: cello, cello drone, iceglass bell (echo and stopped), strings_high, choir, muffled drum. Room 0.93, 5.5 s.

### boss_phantom: The White Phantom (the Phantom's battle; loops)
4/4 at 132. The drive: the cello section in spiccato eighths (root, root, fifth, root, octave, root, fifth, third), timpani on 1
and 3, bass; the choir pad; the music box: the iceglass bell set short and close (ring 0.8 s), eighths arching over the chord,
the top note ringing longer. A (1-16) Fm, Db, Bbm, C, Fm, Db, Eb, C (two bars each): the strings' motif with its answers.
B (17-32) the Palehaven quote: Fm, Gm7b5, Ab, Bbm, Bbm/Db, Ab, Cm7-Eb, Fm (two bars per tune bar); the music box stops and the
drive thins for it. C (33-48) Fm, Bbm, Db, Eb, Fm, Db, Bbm, C: the motif climbs (33, 37, 41) and lands fortissimo (45), timpani
pickups. R (49-58) C and Db over a C pedal: the strings climb, the choir rises, a timpani roll (57-58). M (59-60) F major on the
bell. A soft cymbal roll lifts into each section. Instruments: cello (spiccato), strings_low, strings_high, brass, horn, iceglass
bell (melody and music box), choir, lowdrum, cymbal (ep6_theme), bass.

### Sounds (plan 8.4), `tools/audio/ep7_sfx.py`
Not registered in `sfx_defs.REG`, as Episodes 4 to 6: the script masters with `build.master` and writes
`assets/audio/sfx/ep7_<id>.wav` (22.05 kHz mono) and `assets/audio/ambience/ep7_<id>.wav` (16 kHz mono, seamless); `--review`
draws waveform and spectrogram sheets and the pairs sheet into `tools/audio/out/ep7/`. All pack `ep7`, lazy (`LAZY_PREFIXES`):
runtime-cached, outside the precache and outside the pack's 1.0 MB code-and-art cap. The ep7 sfx and ambience add 1.12 MB, so
`qa/audio/manifest.test.mjs`'s total cap (12.5 MB, not E7-audio's file) has to move to 13.5 MB, as Episodes 4 to 6 moved it.
The field sounds speak with the score's iceglass bell (the same three partials and slow beat), so a name stone sounds like a
far note of the Listening Bell. The core ids are reused, never redefined: `bell_thirteenth` (the Listening Bell thawed is tuned
to the thirteenth bell), `bell_toll`, `ice`, `name_restore`.

| id | length | fallback | what it is |
|---|---|---|---|
| `stone_hold` | 1.07 s | `crystal_hit` | one iceglass note (D5, the motif's root) and a crackle of ice settling outward, darkening as it spreads |
| `stone_letgo` | 0.89 s | `debuff` | a soft falling sigh of snow, the bell note reversed under it, loose snow sifting |
| `frost_seal` | 1.65 s | `ice` | a rising crackle of ice locking with the creak of ice under stress, then a low glass thump (A3) as it seals |
| `frost_melt` | 1.89 s | `ice` | frost_seal's own render (its seed) backwards: the reverb swells in, the thump comes early, the crackle thins and falls as the ice lets go |
| `rime_bite` | 0.29 s | `debuff` | one pip: a short dry frost crackle and a tiny glass tick on E6 |
| `rime_bite_2` | 0.30 s | `debuff` | the second pip: the same a whole step up (F#6) |
| `rime_bite_3` | 0.28 s | `debuff` | the third pip: two whole steps up (G#6) |
| `rime_freeze` | 0.63 s | `ice` | a hard glassy snap and a short ring of a glass bar (B6) sagging a little as it fades |
| `call_cast` | 1.71 s | `buff` | a warm wordless tone rising D5 to A5 (the motif's first step), the A coming back twice off the far drifts |
| `farewell_read` | 2.13 s | `telegraph` | a long low hush that swells, a thin high whistle over it wavering and sliding flat, unresolved |
| `farewell_break` | 1.85 s | `glass_break` | ice cracking open (a snap, a low split, crackle running off), a warm D major chord rising out of it, settling up into tune |

Told apart on purpose (`pairs.png`): call_cast against core `kept` (two warm tones and an echo, centroid 1004 Hz, against a
bright held chime with rising glides at 2631 Hz; band-profile similarity 0.30); farewell_break against Episode 6's
`rewrite_break`, Episode 5's `prophecy_break` and Episode 4's `decree_void` (a low warm chord out of ice, centroid 347 Hz,
against paper and one tone at 864 Hz, rising glass glides at 4182 Hz and a fixed glass arpeggio at 2490 Hz; similarity 0.69,
0.09, 0.08); rime_freeze against core `ice` (one snap and a single sagging glass ring, against a staggered cluster of crystal
partials lasting a second; 0.54); stone_hold against `stone_name` and `chime_post` (a long iceglass note at 587 Hz with the slow
beat, against a stone knock at 293 Hz and two short wooden strikes at 881 Hz; 0.67, 0.75). The pip pitches read on the tick:
rime_bite's dominant is 1318 Hz, rime_bite_3's 1661 Hz (two whole steps). The doors that thaw (the round door
opening in `keeper_comes`, the iced doors running in `doors_reopen`) play `frost_melt`, the reversed copy plan 8.3 asks for,
rendered by `tools/audio/ep7_sfx.py --only frost_melt` (E7-fixes); `frost_seal` stays the sound of a frost door forming.

Ambience: `snow_wind` (10 s, fallback `moor_wind`; the White Road, Palehaven, the Chart Room's north window at 0.2): a soft
steady wind over snow (lower than `sky_wind`) with a fine snow hiss riding the gusts, a pine creak twice a loop, once a far glass
chime. `vault_hush` (10 s, fallback `archive_hush`; the Vault, the Stillheart): a deep hush, four drips a loop that freeze as
they land (a drop, then a tiny tick of ice), a low hum of ice (two tones whose periods divide the loop), and a far bell-like
groan on glass partials once a loop, so every 10 s (inside the plan's 10 to 14).
