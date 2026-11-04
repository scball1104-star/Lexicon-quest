"""boss_regent: "The Paper Regent" (the Regent's battle). F minor, 6/8 felt as two dotted quarters (written as three
quarter beats per bar at 132, so the pulse is 88 a minute), 80 bars (109.1 s), loops. Manifest id `boss_regent`, file
ep4_boss_regent.mp3.

Timpani and low brass on the two accents of every bar, a harp ostinato under everything, choir pads. The name motif is
in the brass from the third of the key, Ab Eb F Db, the same shape the celesta sings in `valewyn` (C G A F from the
third of A minor), and like the celesta's its last note is held across the bar line; here a wax-stamp thud (timpani and
a dry woodblock) lands where the held note ends. In B the city's own song is quoted in minor (ep4_theme.TUNE re-barred
to 6/8, F minor, the raised leading tone over the last dominant): the town's tune turned into law. The last bar before
the loop is F major, the motif in its tonic guise (F C D Bb) on the celesta and horn: the true charter, one bar long.

Form (bar: harmony)
  I    1-4    Fm: the harp ostinato alone, low brass and timpani from bar 3
  A    5-20   Fm, Db, Bbm, C, Fm, Db, Eb, C7 (two bars each): the brass motif every four bars, its held Db stamped
  A2   21-36  Fm, Db, Bbm, C, Fm, Gb, Eb, C: choir and horn, the motif doubled an octave up by the high strings
  B    37-52  the Valewyn quote: Fm, Bbm/Db, Cm/Eb, Fm, Bbm, Fm/Ab, Gm7b5, Csus4-C (two bars each)
  C    53-68  the motif climbs (Fm, Eb, Gb, Ab), a C7 hemiola (three stabs a bar), the motif fortissimo, Db, C7
  R    69-79  the ostinato creeps back (Fm, Db, Bbm, C7), the motif cut short, a timpani roll builds on C7
  M    80     F major: one bar of light, then the loop
"""
import synth
from tracker import Song
import e3_theme as T
import ep4_theme as V

A_CH = ['Fm', 'Fm', 'Db', 'Db', 'Bbm', 'Bbm', 'C', 'C', 'Fm', 'Fm', 'Db', 'Db', 'Eb', 'Eb', 'C7', 'C7']
A2_CH = ['Fm', 'Fm', 'Db', 'Db', 'Bbm', 'Bbm', 'C', 'C', 'Fm', 'Fm', 'Gb', 'Gb', 'Eb', 'Eb', 'C', 'C']
B_CH = [c for c in V.CHORDS_MINOR[:-1] for _ in (0, 1)] + ['Csus4', 'C']
C_CH = ['Fm', 'Fm', 'Eb', 'Eb', 'Gb', 'Gb', 'Ab', 'Ab', 'C7', 'C7', 'C7', 'C7', 'Fm', 'Fm', 'Db', 'C7']
R_CH = ['Fm', 'Fm', 'Db', 'Db', 'Bbm', 'Bbm', 'C7', 'C7', 'C7', 'C7', 'C7']
BARS = ['Fm'] * 4 + A_CH + A2_CH + B_CH + C_CH + R_CH + ['F']
assert len(BARS) == 80, len(BARS)
BPB = 3.0
PULSES = (0.0, 1.5)


def motif68(track, bar, start, vel, hold=4.5):
    """The motif in 6/8: two notes a bar on the pulses, the fourth note held `hold` beats (across the bar line)."""
    a, b, c, d = start, start + 7, start + 9, start + 5
    t0 = (bar - 1) * BPB
    track.add(t0, a, 1.5, vel=vel)
    track.add(t0 + 1.5, b, 1.5, vel=vel)
    track.add(t0 + 3.0, c, 1.5, vel=vel)
    track.add(t0 + 4.5, d, hold, vel=vel)


def build():
    s = Song('ep4_boss_regent', bpm=132, beats_per_bar=BPB, bars=80, key='F minor', title='The Paper Regent',
             reverb_room=0.84, reverb_damp=0.4, reverb_len=3.0, reverb_level=-9.5,
             delay_beats=(0.75, 0.5), delay_feedback=0.22, delay_level=-20.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    spicc = synth.StringsPad(attack=0.018, detune=6.0, dark=900.0, bright=2800.0, sub=0.15, release=0.14)
    spicc.name = 'strings_low'
    lows = s.track('spiccato strings', spicc, volume=-11.0, reverb=0.25, role='bass', vel=0.62, gate=0.6, width=0.6)
    harp = s.track('harp ostinato', 'harp', volume=-4.0, pan=-0.3, reverb=0.35, role='arp', vel=0.5, humanize_ms=3)
    brass = s.track('brass', 'brass', volume=-6.0, pan=0.1, reverb=0.32, role='melody', vel=0.8, gate=0.95)
    stab = s.track('brass stabs', 'brass', volume=-10.0, pan=-0.05, reverb=0.35, role='pad', vel=0.82, gate=0.5)
    pedal = s.track('low brass', 'brass', volume=-10.0, reverb=0.35, role='pad', vel=0.52, gate=0.9)
    horn = s.track('horn', 'horn', volume=-8.0, pan=-0.25, reverb=0.4, role='melody', vel=0.7, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-9.0, pan=0.15, reverb=0.4, role='melody', vel=0.62, gate=0.98, width=0.6)
    choir = s.track('choir', 'choir', volume=-11.0, reverb=0.5, role='pad', vel=0.56, gate=1.0)
    cel = s.track('celesta', 'celesta', volume=-9.0, pan=0.3, reverb=0.5, delay=0.25, role='melody', vel=0.6, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-10.0, reverb=0.3, role='perc', vel=0.7)
    wood = s.track('stamp', 'woodblock', volume=-1.0, pan=0.05, reverb=0.3, role='perc', pitched=False, vel=0.7)
    bass = s.track('bass', 'bass', volume=-11.0, reverb=0.05, role='bass', vel=0.6, gate=0.8)

    def stamp(bar, beat=0.0, v=0.9):
        timp.add(bs(bar) + beat, 'f2', 1.0, vel=v)
        wood.add(bs(bar) + beat, 'c4', 0.3, vel=v)
        wood.add(bs(bar) + beat + 0.04, 'g3', 0.3, vel=v * 0.6)

    # ---- the drive: harp ostinato, spiccato strings and bass on the 6/8 pulses, timpani and low brass -----------------
    for bar in range(1, 81):
        name = BARS[bar - 1]
        r = T.root_note(name, 41)              # F2 .. E3
        tt = T.tones(name, 53, 74)
        fig = [tt[0], tt[1], tt[2], tt[3] if len(tt) > 3 else tt[2] + 5, tt[2], tt[1]]
        quiet = 69 <= bar <= 74
        hv = 0.46 if (bar <= 4 or quiet) else 0.48
        for i, p in enumerate(fig):
            harp.add(bs(bar) + 0.5 * i, p, 0.5, vel=hv + (0.08 if i in (0, 3) else 0.0), gate=1.8)
        in_hemiola = 61 <= bar <= 64 or 75 <= bar <= 79
        if bar >= 3 and bar != 80:
            # the spiccato drive: full from A, a soft pulse (accents only) under the intro and the quiet return
            soft = bar < 5 or quiet
            for i in range(6):
                if soft and i not in (0, 3):
                    continue
                p = r if i in (0, 1, 3, 4) else (r + 7 if i == 2 else r + 12)
                lows.add(bs(bar) + 0.5 * i, p, 0.5, vel=(0.42 if soft else 0.6) + (0.1 if i in (0, 3) else 0.0))
        if bar >= 5 and not quiet and bar != 80:
            bass.add(bs(bar), r - 12, 1.5, vel=0.62)
            bass.add(bs(bar) + 1.5, r - 12, 1.5, vel=0.52)
        elif quiet:
            bass.add(bs(bar), r - 12, 3.0, vel=0.44)
        if bar >= 3 and not quiet and not in_hemiola and bar != 80:
            timp.add(bs(bar), r - 12 if r - 12 >= 33 else r, 1.0, vel=0.45 if bar < 5 else 0.72)
            timp.add(bs(bar) + 1.5, T.fifth_note(name, 36), 1.0, vel=0.4 if bar < 5 else 0.56)
        if bar >= 3 and not quiet and bar != 80:
            pedal.add(bs(bar), T.root_note(name, 29), 1.5, vel=0.5 if bar < 5 else 0.56)
            if 21 <= bar <= 68:
                pedal.add(bs(bar) + 1.5, T.root_note(name, 29), 1.2, vel=0.46)
        if bar >= 5:
            choir.chord(bs(bar), T.tones(name, 55, 68)[:3], 3.0,
                        vel=0.36 if bar < 21 else (0.52 if bar < 69 else 0.4 + 0.02 * max(0, bar - 72)))

    # ---- A and A2: the motif in the brass; its held Db ends in a stamp; the strings answer ---------------------------------
    for bar in (5, 9, 13, 17):
        motif68(brass, bar, 68, 0.84)            # Ab4 Eb5 F5 Db5
        stamp(bar + 3, 0.0, 0.85)
        top = T.tones(BARS[bar + 2], 72, 87)[::-1][:3]
        hi.add(bs(bar + 3), top[0], 1.5, vel=0.56)
        hi.add(bs(bar + 3) + 1.5, top[1], 1.0, vel=0.52)
        hi.add(bs(bar + 3) + 2.5, top[2], 0.5, vel=0.5)
    for bar in (21, 25, 29, 33):
        motif68(brass, bar, 68, 0.86)
        motif68(hi, bar, 80, 0.6)
        motif68(horn, bar, 56, 0.66)
        stamp(bar + 3, 0.0, 0.92)
        stab.chord(bs(bar + 3) + 1.5, T.tones(BARS[bar + 2], 55, 68)[:3], 0.6, vel=0.78)

    # ---- B: the Valewyn quote in F minor ----------------------------------------------------------------------------------------
    for t, p, dur, motif in V.tune68(65, 'aeolian', first_bar=37, beats_per_bar=BPB, raise_last=True):
        bar = int(t // BPB) + 1
        if motif:
            brass.add(t, p, dur, vel=0.8)
            cel.add(t, p + 12, min(dur, 3.0), vel=0.5)
            continue
        if bar < 45:
            horn.add(t, p, dur, vel=0.72)
            hi.add(t, p + 12, dur, vel=0.56)
        else:
            brass.add(t, p, dur, vel=0.82)
            hi.add(t, p + 12, dur, vel=0.64)
            horn.add(t, p - 12, dur, vel=0.62)
    stamp(40, 1.5, 0.7)                          # where the held Bb ends
    for bar in (44, 48, 52):
        stab.chord(bs(bar) + 1.5, T.tones(BARS[bar - 1], 55, 68)[:3], 0.6, vel=0.7)

    # ---- C: the motif climbs, the hemiola, the motif fortissimo -----------------------------------------------------------------
    for bar, start in ((53, 68), (55, 70), (57, 73), (59, 75)):      # Ab4, Bb4, Db5, Eb5
        motif68(brass, bar, start, 0.86, hold=1.5)
        motif68(hi, bar, start + 12, 0.6, hold=1.5)
        motif68(horn, bar, start - 12, 0.66, hold=1.5)
        stab.chord(bs(bar + 1) + 1.5, T.tones(BARS[bar], 55, 68)[:3], 0.6, vel=0.84)
    for bar in range(61, 65):
        for k in range(3):                       # hemiola: three quarter-note stabs against the two pulses
            stab.chord(bs(bar) + k, T.tones('C7', 52, 67)[:4], 0.5, vel=0.7 + 0.05 * (bar - 61))
        for i in range(12):
            timp.add(bs(bar) + 0.25 * i, 'c2', 0.25, vel=0.26 + 0.03 * (bar - 61) + 0.03 * (i % 2 == 0))
    motif68(brass, 65, 68, 0.98)
    motif68(hi, 65, 80, 0.8)
    motif68(horn, 65, 56, 0.86)
    stamp(68, 0.0, 1.0)
    stab.chord(bs(68) + 1.5, T.tones('C7', 52, 67)[:4], 0.6, vel=0.9)

    # ---- R: the ostinato creeps back; the motif cut short; the C7 build ---------------------------------------------------------
    hi.seq(bar=71, pattern='ab4/1.5 eb5/1.5 | f5/3', vel=0.5)    # no fourth note
    hi.seq(bar=73, pattern='f4/1.5 c5/1.5 | db5/3', vel=0.54)
    for bar in range(75, 80):
        for k in range(3):
            stab.chord(bs(bar) + k, T.tones('C7', 52, 67)[:4], 0.5, vel=0.6 + 0.07 * (bar - 75))
        for i in range(12):
            timp.add(bs(bar) + 0.25 * i, 'c2', 0.25, vel=0.24 + 0.06 * (bar - 75) + 0.03 * (i % 2 == 0))
        choir.chord(bs(bar), ['g3', 'bb3', 'e4'], 3.0, vel=0.46 + 0.04 * (bar - 75))

    # ---- M: F major, the motif in its tonic guise on the celesta and horn ---------------------------------------------------------
    cel.seq(bar=80, pattern='f5/0.5 c6/0.5 d6/0.5 bb5/1.5', vel=0.72)
    horn.seq(bar=80, pattern='f4/0.5 c5/0.5 d5/0.5 bb4/1.5', vel=0.66)
    hi.seq(bar=80, pattern='a5/3', vel=0.56)
    timp.add(bs(80), 'f2', 1.0, vel=0.6)
    pedal.add(bs(80), 'f2', 3.0, vel=0.4)
    bass.add(bs(80), 'f1', 3.0, vel=0.5)
    return s
