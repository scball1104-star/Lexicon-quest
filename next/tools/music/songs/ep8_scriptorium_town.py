"""scriptorium_town: "The Unfinished Street" (the Scriptorium and its ep8_sc_* interiors, first_word, last_page,
scriptorium_open). G Lydian, 88 BPM, 4/4, 34 bars (92.7 s), loops. Manifest id `scriptorium_town`, file
ep8_scriptorium_town.mp3.

The root region-8 brief, for the tracker: celesta, harpsichord, solo violin, deep luminous pads and a gentle orchestral pulse;
an immense library and recovered wisdom; 88 BPM. The plan's twist (EPISODE8_PLAN 8.1): the A sections' phrases stop a beat
early (the unfinished signs of the street); the B sections let the violin finish them.

The name motif is the violin's: G4 D5 E5 C5, the C held five beats over the harpsichord (bars 17-18 and 25-26, the finished
tune of ep8_theme.TUNE). In A and A' the same tune runs unfinished (ep8_theme.tune(finished=False)): every phrase's last note
is left out and its beats are silent in the melody, so the motif stops on its third note, G D E, and where the C belongs the
celesta lets fall a quiet C#6, the Lydian fourth, the wrong word for the gap. The A harmony is G Lydian (A/G, the Lydian II,
over the tonic pedal; no C natural anywhere in A); B turns the C# back into C and lands it over Cmaj7. The town is Lydian until
its signs are finished.

Form
  A    1-8    G, A/G, Em7, A/G, G/B, Bm7, Em7-A/G, Dsus4: the unfinished tune on the violin, the harpsichord's eighths (pages
              in a scribe's hand), the glass pad and strings, the pulse (pizzicato on 1 and 3, a soft drum every two bars)
  A'   9-16   the same, the celesta answering in the gaps a third above, the high strings in
  B    17-24  G, Cmaj7, Em7, Am7-D7sus4, G/B, Am7-C, Cmaj7-D7sus4, G: the tune finished, the low strings, the bass walking
  B'   25-32  the finished tune an octave up, the celesta doubling the motif, the choir's breath under the held C
  T    33-34  G, Dsus4: the celesta plays G D E and stops (the street unfinished again), into bar 1
"""
from tracker import Song
import ep8_theme as E

BPM = 88
T_CH = [[(0, 'G')], [(0, 'Dsus4')]]
BARS = E.CHORDS_LYDIAN + E.CHORDS_LYDIAN + E.CHORDS_FINISHED + E.CHORDS_FINISHED + T_CH
assert len(BARS) == 34
INTENDED = [b[0][1] for b in BARS]
GAPS = ((0, 3.0), (3, 3.0), (5, 3.0))                # (bar offset, beat) of each unfinished phrase's missing C


def segments(bar):
    segs = BARS[bar - 1]
    return [(b, (segs[i + 1][0] if i + 1 < len(segs) else 4) - b, name) for i, (b, name) in enumerate(segs)]


def section(bar):
    return 'A' if bar <= 8 else "A'" if bar <= 16 else 'B' if bar <= 24 else "B'" if bar <= 32 else 'T'


def build():
    s = Song('ep8_scriptorium_town', bpm=BPM, beats_per_bar=4, bars=34, key='G lydian', title='The Unfinished Street',
             reverb_room=0.9, reverb_damp=0.42, reverb_len=4.4, reverb_level=-8.0, delay_beats=(0.75, 1.0),
             delay_feedback=0.26, delay_level=-18.0, target_lufs=-16.0, true_peak_trim=True, intended_chords=INTENDED)
    bs = s.bar_start

    violin = s.track('violin', E.Violin(swell=0.2, vib=0.13, breath=0.55), volume=-5.0, pan=-0.08, reverb=0.42, delay=0.06,
                     role='melody', vel=0.66, gate=0.97)
    harp = s.track('harpsichord', 'harpsichord', volume=-7.5, pan=0.24, reverb=0.3, role='arp', vel=0.5, gate=0.85,
                   humanize_ms=3)
    cel = s.track('celesta', 'celesta', volume=-8.5, pan=0.3, reverb=0.55, delay=0.25, role='melody', vel=0.5, gate=1.0)
    pad = s.track('glass pad', 'glasspad', volume=-19.0, pan=-0.15, reverb=0.7, role='pad', vel=0.4, gate=1.0)
    strings = s.track('strings', 'strings', volume=-17.0, reverb=0.55, role='pad', vel=0.42, gate=1.0, width=1.0)
    hi = s.track('high strings', 'strings_high', volume=-21.0, pan=0.12, reverb=0.6, role='pad', vel=0.36, gate=1.0)
    low = s.track('low strings', 'strings_low', volume=-19.0, reverb=0.4, role='bass', vel=0.44, gate=1.0, width=0.7)
    choir = s.track('choir', 'choir', volume=-24.0, reverb=0.65, role='pad', vel=0.38, gate=1.0)
    pizz = s.track('pizzicato', 'pizz', volume=-17.0, pan=-0.22, reverb=0.35, role='bass', vel=0.5)
    drum = s.track('soft drum', 'lowdrum', volume=-20.0, reverb=0.4, role='perc', vel=0.45)
    bass = s.track('bass', 'bass', volume=-19.0, reverb=0.05, role='bass', vel=0.5, gate=0.9)

    # ---- the tune: unfinished in A and A', finished in B and B' ----------------------------------------------------------
    for first, finished, octave, vel in ((1, False, 0, 0.64), (9, False, 0, 0.66), (17, True, 0, 0.7), (25, True, 12, 0.68)):
        for bar, beat, p, dur, mo in E.tune(67, 'major', first, finished=finished):
            violin.add(bs(bar) + beat, p + octave, dur, vel=vel + (0.04 if mo else 0.0))
    for first in (1, 9):                         # the celesta's C# where the C belongs (quiet, a question)
        for off, beat in GAPS:
            cel.add(bs(first + off) + beat, 'c#6', 1.5, vel=0.32 if first == 1 else 0.38)
    # A': the celesta answers in the gaps, a third above the violin's last sung note
    for bar, pat in ((10, 'r/1 a5/0.5 b5/0.5 e6/2'), (12, 'r/3 f#6/1'), (14, 'r/3 e6/1'), (16, 'b5/1 a5/1 f#5/2')):
        cel.seq(bar=bar, pattern=pat, vel=0.4)
    # B': the celesta doubles the motif two octaves over the violin's first statement
    for i, (nm, d) in enumerate((('g6', 1), ('d7', 1), ('e7', 1), ('c7', 3))):
        cel.add(bs(25) + i, nm, d, vel=0.44)
    choir.chord(bs(25) + 3.0, ['e4', 'g4', 'c5'], 5.0, vel=0.36)
    # T: the street unfinished again: the celesta plays G D E and stops
    for i, nm in enumerate(('g5', 'd6', 'e6')):
        cel.add(bs(33) + i, nm, 1.0 if i < 2 else 2.0, vel=0.44)

    # ---- accompaniment -------------------------------------------------------------------------------------------------
    for bar in range(1, 35):
        sec = section(bar)
        for b0, ln, name in segments(bar):
            t0 = bs(bar) + b0
            tt = E.tones(name, 55, 80)
            # the harpsichord: eighths over the chord, a scribe's hand (low-high arch, the top on the and of 2)
            arch = [tt[0], tt[2], tt[1], tt[min(4, len(tt) - 1)], tt[min(3, len(tt) - 1)], tt[2], tt[1], tt[2]]
            for i in range(int(ln * 2)):
                v = 0.46 + (0.08 if i % 4 == 0 else 0.0) - (0.06 if sec == 'T' else 0.0)
                harp.add(t0 + 0.5 * i, arch[i % 8], 0.5, vel=v)
            pad.chord(t0, E.tones(name, 60, 76)[:4], ln, vel=0.36 if sec in ('A', 'T') else 0.42)
            strings.chord(t0, E.tones(name, 52, 67)[:3], ln, vel=0.36 if sec in ('A', "A'", 'T') else 0.44)
            r = E.root_note(name, 43)                                   # G2 .. F#3
            pizz.add(t0, r, 1.0, vel=0.5)
            if ln >= 3:
                pizz.add(t0 + 2.0, r + 7 if r + 7 < 55 else r - 5, 1.0, vel=0.42)
            if sec in ('B', "B'", 'T'):
                low.add(t0, r - 12, ln, vel=0.42 if sec == 'B' else 0.48)
                bass.add(t0, r - 12, min(ln, 2.0) * 0.9, vel=0.5)
                if ln >= 4:
                    bass.add(t0 + 2.0, E.fifth_note(name, 36), 1.8, vel=0.42)
            elif sec in ('A', "A'"):
                bass.add(t0, r - 12, ln, vel=0.4)
        if sec == "A'" or sec == "B'":
            top = E.tones(BARS[bar - 1][0][1], 74, 86)
            hi.add(bs(bar), top[0], 4.0, vel=0.32)
        if bar % 2 == 1 and sec != 'T':
            drum.add(bs(bar), 'g1', 1.0, vel=0.42 if sec in ('A', "A'") else 0.5)
    drum.add(bs(34) + 2.0, 'd2', 1.0, vel=0.36)
    return s
