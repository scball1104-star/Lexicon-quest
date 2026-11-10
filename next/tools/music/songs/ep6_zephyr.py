"""zephyr: "The Windward Docks" (Zephyr Landing and its ep6_zl_* interiors, isles_return, the Episode 6 credits). G major
with the Lydian colour on the IV (Cmaj7#11: the F# over C), 112 BPM, 4/4, 40 bars (85.7 s), loops. Manifest id `zephyr`,
file ep6_zephyr.mp3.

The root region-6 brief, for the tracker: a soaring flute, buoyant strings, a bright harp, light cymbals; an A section of
wonder (open fifths, the harp in sixteenths like rigging in wind), a warmer B section for the docks coming home. The sky is
written with the instruments, the mode and the space, not a stock cliche: the harp's figures are stacked fifths (the
Lydian scale is stacked fifths, so the #11 arrives on its own when the figure climbs from C), the pads are open fifths with
no third in the A section, the reverb is a wide hall with a long pre-delay of air, and the low end stays light (the bass
only from bar 9, the low strings only under the docks).

The name motif is the wind harp's: G D E C on beats 1 to 4 of bar 1, the C swelling in late (the wind harp has no attack:
the string speaks as the gust catches it) and held over the bar line, where it becomes the root of Cmaj7#11. Bars 5 and 33
repeat it; bar 37 echoes it on the wind harp's overtones, an octave up and quiet. In the B section the Zephyr tune
(ep6_theme.TUNE) has the same four notes on the wind harp, the rest on the flute.

Form
  A    1-8    G, Cmaj7#11, Em7, Dsus4-D / G, Cmaj7#11, Am7, Dsus4-D: wonder. The motif (bars 1 and 5), the flute's
              answers (3-4, 7-8), the harp's sixteenths, open-fifth pads, a soft cymbal swell into bars 1 and 5
  A'   9-16   G, D/F#, Em7, Cmaj7#11, G/B, C, Am7, D: the flute soars (the F#6 over C in bar 12); pizzicato and bass enter
  B    17-24  the Zephyr tune: G, Cmaj7, Em7, D, C, G/B, Am7-D7, G: the docks coming home; strings an octave under the
              flute from bar 19, low strings, a light cymbal on 2 and 4, the harp warmer (broken chords with the third)
  B'   25-32  C, G/B, Am7, D, Em7, Cmaj7#11, Am7-D7, G: flute and high strings in octaves, glockenspiel points
  T    33-40  G, Cmaj7#11, Em7, D, G, Cmaj7#11, Am7, D7sus4-D: the motif once more, its echo in harmonics (37), the
              transition back to the opening harmony; the D falls into bar 1
"""
from tracker import Song
import ep6_theme as E

A_CH = [[(0, 'G')], [(0, 'Cmaj7#11')], [(0, 'Em7')], [(0, 'Dsus4'), (2, 'D')],
        [(0, 'G')], [(0, 'Cmaj7#11')], [(0, 'Am7')], [(0, 'Dsus4'), (2, 'D')]]
A2_CH = [[(0, 'G')], [(0, 'D/F#')], [(0, 'Em7')], [(0, 'Cmaj7#11')], [(0, 'G/B')], [(0, 'C')], [(0, 'Am7')], [(0, 'D')]]
B_CH = E.CHORDS_MAJOR
B2_CH = [[(0, 'C')], [(0, 'G/B')], [(0, 'Am7')], [(0, 'D')], [(0, 'Em7')], [(0, 'Cmaj7#11')], [(0, 'Am7'), (2, 'D7')],
         [(0, 'G')]]
T_CH = [[(0, 'G')], [(0, 'Cmaj7#11')], [(0, 'Em7')], [(0, 'D')], [(0, 'G')], [(0, 'Cmaj7#11')], [(0, 'Am7')],
        [(0, 'D7sus4'), (2, 'D')]]
BARS = A_CH + A2_CH + B_CH + B2_CH + T_CH
assert len(BARS) == 40
INTENDED = [b[0][1] for b in BARS]
BEAT = 60.0 / 112.0

MOTIF = ('g4', 'd5', 'e5', 'c5')                 # 0 +7 +9 +5
FLUTE_A = {3: 'r/1 b5/1 a5/0.5 g5/0.5 f#5/1', 4: 'a5/2.5 r/1.5',
           7: 'r/1 c6/1 b5/0.5 a5/0.5 g5/1', 8: 'g5/1 f#5/1.5 r/1.5'}
FLUTE_A2 = ['d5/1.5 g5/0.5 b5/2', 'a5/1.5 f#5/0.5 d5/2', 'e5/1 g5/1 b5/1 d6/1', 'f#6/2 e6/1 d6/1',
            'd6/1.5 b5/0.5 g5/2', 'e5/1 g5/1 c6/1 e6/1', 'd6/1.5 c6/0.5 b5/1 a5/1', 'a5/3 r/1']
TUTTI_B2 = ['e5/1.5 d5/0.5 c5/1 e5/1', 'd5/2 b4/1 d5/1', 'c5/1.5 b4/0.5 a4/1 c5/1', 'a4/3 d5/1',
            'g5/1.5 f#5/0.5 e5/1 b4/1', 'e5/1 f#5/1 g5/1 b5/1', 'a5/1.5 g5/0.5 f#5/1 c5/1', 'b4/3 r/1']


def segments(bar):
    """[(start_beat_in_bar, length, chord)] for one bar."""
    segs = BARS[bar - 1]
    return [(b, (segs[i + 1][0] if i + 1 < len(segs) else 4) - b, name) for i, (b, name) in enumerate(segs)]


def section(bar):
    return 'A' if bar <= 8 else "A'" if bar <= 16 else 'B' if bar <= 24 else "B'" if bar <= 32 else 'T'


def build():
    s = Song('ep6_zephyr', bpm=112, beats_per_bar=4, bars=40, key='G major', title='The Windward Docks',
             reverb_room=0.9, reverb_damp=0.25, reverb_len=4.0, reverb_level=-8.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.3, delay_level=-16.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=INTENDED)
    bs = s.bar_start

    wind = s.track('wind harp', E.WindHarp(swell=0.3, ring=1.2, catch=0.2), volume=-3.5, pan=0.12, reverb=0.45, delay=0.15,
                   role='melody', vel=0.74, gate=0.98)
    echo = s.track('wind harp (harmonics)', E.WindHarp(swell=0.4, ring=1.4, catch=0.25, harmonics=1.0), volume=-8.0,
                   pan=-0.35, reverb=0.6, delay=0.25, role='melody', vel=0.55, gate=0.98)
    flute = s.track('flute', 'flute', volume=-5.0, pan=-0.1, reverb=0.42, delay=0.14, role='melody', vel=0.66, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-11.0, pan=0.15, reverb=0.5, role='melody', vel=0.5, gate=1.02,
                 width=0.7)
    harp = s.track('harp', E.synth.make('harp', decay=1.6, brightness=0.62), volume=-12.5, pan=0.3, reverb=0.35,
                   delay=0.08, role='arp', vel=0.5, humanize_ms=4, vel_jitter=0.05, gate=0.9)
    pizz = s.track('pizzicato', 'pizz', volume=-15.0, pan=-0.3, reverb=0.3, role='arp', vel=0.5, gate=0.6)
    pad = s.track('strings', 'strings', volume=-17.0, reverb=0.6, role='pad', vel=0.42, gate=1.0, width=1.0)
    low = s.track('low strings', 'strings_low', volume=-19.0, reverb=0.45, role='pad', vel=0.42, gate=1.0, width=0.7)
    bass = s.track('bass', 'bass', volume=-19.0, reverb=0.05, role='bass', vel=0.5, gate=0.85)
    glock = s.track('glockenspiel', 'glock', volume=-21.0, pan=0.35, reverb=0.55, delay=0.3, role='perc', vel=0.35)
    cym = s.track('cymbal', E.Cymbal(), volume=-24.0, pan=0.25, reverb=0.35, role='perc', pitched=False, vel=0.5,
                  humanize_ms=3, vel_jitter=0.05)

    def motif(bar, vel=0.74, track=None, octave=0):
        """The wind harp's motif: G D E on beats 1-3, C on beat 4 held across the bar line (bars `bar` and `bar`+1)."""
        tr = track or wind
        for i, (nm, dur) in enumerate(zip(MOTIF, (1.0, 1.0, 1.0, 4.5))):
            n0 = len(tr.notes)
            tr.add(bs(bar) + i, nm, dur, vel=vel * (1.06 if i == 3 else 1.0))
            tr.notes[n0].midi += 12 * octave

    # ---- A: wonder. The motif and the flute's answers -----------------------------------------------------------
    motif(1, 0.76)
    motif(5, 0.72)
    for bar, pat in FLUTE_A.items():
        flute.seq(bar=bar, pattern=pat, vel=0.6)
    # ---- A': the flute soars ----------------------------------------------------------------------------------------
    for i, pat in enumerate(FLUTE_A2):
        flute.seq(bar=9 + i, pattern=pat, vel=0.64 + (0.05 if i in (3, 5) else 0.0))
    hi.seq(bar=13, pattern='g4/4 | g4/4 | e4/4 | f#4/4', vel=0.36)
    # ---- B: the Zephyr tune, the docks coming home ------------------------------------------------------------------
    for bar, beat, p, dur, mo in E.tune(67, 'major', 17):            # G4 ...
        if mo:
            wind.add(bs(bar) + beat, p, dur + (0.5 if (bar, beat) == (17, 3.0) else 0.0), vel=0.78)
            flute.add(bs(bar) + beat, p + 12, dur, vel=0.34)           # the flute breathing an octave over the wind harp
            continue
        if (bar - 17, beat) in ((3, 0.0), (7, 0.0)):
            dur -= 0.5                                                # the flute breathes at the phrase ends
        flute.add(bs(bar) + beat, p + 12, dur, vel=0.66)
        if bar >= 19:
            hi.add(bs(bar) + beat, p, dur, vel=0.46)                  # the strings an octave under the flute
    # ---- B': flute and high strings in octaves ------------------------------------------------------------------------
    for i, pat in enumerate(TUTTI_B2):
        flute.seq(bar=25 + i, pattern=pat, vel=0.66)
        n0 = len(hi.notes)
        hi.seq(bar=25 + i, pattern=pat, vel=0.54)
        for nn in hi.notes[n0:]:
            nn.midi -= 12
    # ---- T: the motif once more, then its echo on the overtones ------------------------------------------------------
    motif(33, 0.68)
    motif(37, 0.6, track=echo, octave=1)
    hi.seq(bar=35, pattern='b4/4 | a4/4 | g4/4 | f#4/4 | e4/4 | f#4/4', vel=0.42)   # the strings descend toward bar 1
    flute.seq(bar=35, pattern='r/2 b5/1 a5/1', vel=0.5)
    flute.seq(bar=36, pattern='a5/2 r/2', vel=0.46)
    flute.seq(bar=39, pattern='r/2 e5/1 d5/1', vel=0.44)
    flute.seq(bar=40, pattern='d5/2 r/2', vel=0.4)

    # ---- accompaniment ----------------------------------------------------------------------------------------------
    for bar in range(1, 41):
        sec = section(bar)
        warm = sec in ('B', "B'")
        for b0, ln, name in segments(bar):
            r3 = E.root_note(name, 43)                                 # G2 .. F#3
            root = E.parse(name)[0]
            rt = 48 + (root - 48) % 12                                  # chord root C3 .. B3
            if warm:
                pad.chord(bs(bar) + b0, E.tones(name, 55, 72)[:4], ln, vel=0.46)
                low.chord(bs(bar) + b0, [r3, r3 + 7], ln, vel=0.44)
            else:
                # open fifths: root, fifth, ninth; no third (the sky is open)
                pad.chord(bs(bar) + b0, [rt, rt + 7, rt + 14], ln, vel=0.38 if sec == 'A' else 0.46 if sec == 'T' else 0.42)
            if sec != 'A':
                bass.add(bs(bar) + b0, r3, min(ln, 2.0) if warm else min(ln, 3.0), vel=0.5 if warm else 0.44)
                if ln == 4 and warm:
                    bass.add(bs(bar) + 2.0, r3 + 7 if r3 + 7 <= 55 else r3 - 5, 1.5, vel=0.42)
        # the harp: sixteenths in stacked fifths (rigging in the wind), broken chords with the third under the docks
        for b0, ln, name in segments(bar):
            root, pcs, _ = E.parse(name)
            rt = 55 + (root - 55) % 12                                 # G3 .. F#4
            third = 4 if (root + 4) % 12 in pcs else 3 if (root + 3) % 12 in pcs else 5     # sus4: the fourth
            if warm:
                cell = [rt, rt + 7, rt + 12 + third, rt + 12, rt + 19, rt + 12, rt + 12 + third, rt + 7]
            elif (root + 6) % 12 in pcs:
                # Cmaj7#11: the stacked fifths climb on to the #11 and the seventh (C G D F# B), the Lydian sky
                cell = [rt, rt + 7, rt + 14, rt + 18, rt + 23, rt + 18, rt + 14, rt + 7]
            else:
                # root, fifth, ninth, then the third an octave up and the fifth over it: wide, open, airborne
                cell = [rt, rt + 7, rt + 14, rt + 12 + third, rt + 19, rt + 12 + third, rt + 14, rt + 7]
            for i in range(int(ln * 4)):
                at = b0 + 0.25 * i
                if sec == 'A' and bar in (1, 5) and at < 1.0:
                    continue                                            # the motif's first beat stands alone
                v = 0.42 + (0.1 if i % 4 == 0 else 0.0) + (0.04 if i % 2 == 0 else 0.0)
                harp.add(bs(bar) + at, cell[i % 8], 0.3, vel=v * (0.85 if sec == 'T' and bar >= 37 else 1.0))
        # buoyant strings: pizzicato on the off-beats in A' and B
        if sec in ("A'", 'B'):
            for b0, ln, name in segments(bar):
                tt = E.tones(name, 55, 72)
                for off in (1.0, 2.5, 3.0):
                    if b0 <= off < b0 + ln:
                        pizz.add(bs(bar) + off, tt[int(off * 2) % len(tt)], 0.5, vel=0.42 + (0.08 if off == 1.0 else 0.0))
        # light cymbals: a soft roll into bars 1, 5, 9, 17, 25, 33; light taps on 2 and 4 under the docks
        if bar in (4, 8, 16, 24, 32, 40):
            cym.add(bs(bar) + 2.0, 'c3', 2.0, vel=0.5 if bar not in (16, 24) else 0.6)
        if warm:
            for off in (1.0, 3.0):
                cym.add(bs(bar) + off, 'c5', 0.25, vel=0.34)
        # glockenspiel points in B': the top of the chord on the off-beat
        if sec == "B'" and bar % 2 == 1:
            name = segments(bar)[0][2]
            top = E.tones(name, 79, 96)
            glock.add(bs(bar) + 1.5, top[-1], 0.5, vel=0.32)
            glock.add(bs(bar) + 3.5, top[len(top) // 2], 0.5, vel=0.26)
    return s
