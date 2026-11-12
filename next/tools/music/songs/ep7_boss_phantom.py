"""boss_phantom: "The White Phantom" (the Phantom's battle). F minor, 132 BPM, 4/4, 60 bars (109.1 s), loops. Manifest id
`boss_phantom`, file ep7_boss_phantom.mp3.

The plan's brief (8.1): a 4/4 drive, low strings in ostinato, timpani, a choir pad, a high iceglass figure running like a
frozen music box; the B section quotes `palehaven` in minor (the town's own song frozen); a last bar in major on the
iceglass bell before the loop.

The drive is the cello section in spiccato eighths (the song-local cello, short bow: root, root, fifth, root, octave, root,
fifth, minor third), the timpani on 1 and 3 and the synth bass under them. The music box is the iceglass bell set short and
close (ring 0.8 s, little distance): eighths in a high arch over the chord, the top note of each bar ringing longer. The
name motif is the strings', from the third of the key so the intervals stay exact in F minor: Ab3 Eb4 F4 Db4 (0 +7 +9 +5) in
half notes over two bars, the Db held across the bar line into the Db chord, the low brass doubling it two octaves down
(bars 1 and 9). B quotes the Palehaven tune (ep7_theme.TUNE) in F minor, every value doubled by `tune_aug` (one tune bar
becomes two bars here, so the town's song is heard at its own slow pace, frozen under the drive): its motif notes on the
iceglass bell (F4 C5 Db5 Bb4, the warm Dorian sixth gone minor), the rest on the high strings with the horn under them; the
music box stops for it. C climbs the motif from Ab, Bb and C (each keeping the scale's own sixth) with the brass. R builds
on the dominant (C, Db over a C pedal), the choir rising, a timpani roll. M, the last bar pair before the loop, is F major:
the iceglass bell plays the motif in its major guise, F5 C6 D6 Bb5, and lets the Bb fall to A, the major third, held over
an F major chord until the loop takes it back to F minor.

Form (bar: harmony, two bars per chord unless noted)
  A    1-16   Fm, Db, Bbm, C, Fm, Db, Eb, C: the ostinato, timpani, choir, the music box, the strings' motif (1 and 9)
  B    17-32  the Palehaven quote: Fm, Gm7b5, Ab, Bbm, Bbm/Db, Ab, Cm7-Eb, Fm (ep7_theme.CHORDS_MINOR, one tune bar = two)
  C    33-48  Fm, Bbm, Db, Eb, Fm, Db, Bbm, C: the motif climbs from Ab (33), Bb (37) and C (41), fortissimo from Ab (45)
  R    49-58  C, Db, C, Db, C (a C pedal): the build, the timpani roll, the choir rising
  M    59-60  F major: the bell's motif in major, the Bb falling to A
"""
from tracker import Song
import ep7_theme as E
import ep6_theme as E6


def pairs(*names):
    out = []
    for n in names:
        out += [n, n]
    return out


A_CH = pairs('Fm', 'Db', 'Bbm', 'C', 'Fm', 'Db', 'Eb', 'C')
B_CH = []
for segs in E.CHORDS_MINOR:                         # two bars for each 4/4 bar of the tune
    B_CH += [segs[0][1], segs[-1][1]]
C_CH = pairs('Fm', 'Bbm', 'Db', 'Eb', 'Fm', 'Db', 'Bbm', 'C')
R_CH = ['C', 'C', 'Db', 'Db', 'C', 'C', 'Db', 'Db', 'C', 'C']
BARS = A_CH + B_CH + C_CH + R_CH + ['F', 'F']
assert len(BARS) == 60, len(BARS)
BPM = 132


def section(bar):
    return 'A' if bar <= 16 else 'B' if bar <= 32 else 'C' if bar <= 48 else 'R' if bar <= 58 else 'M'


def motif44(track, t0, start, vel, hold=6.0, sixth=9):
    """The motif in half notes over two bars from beat t0, the fourth note held `hold` beats (across the bar line)."""
    for i, (iv, dur) in enumerate(((0, 2.0), (7, 2.0), (sixth, 2.0), (5, hold))):
        track.add(t0 + 2.0 * i, start + iv, dur, vel=vel)


def build():
    s = Song('ep7_boss_phantom', bpm=BPM, beats_per_bar=4, bars=60, key='F minor', title='The White Phantom',
             reverb_room=0.88, reverb_damp=0.45, reverb_len=3.6, reverb_level=-9.5, delay_beats=(0.75, 0.5),
             delay_feedback=0.22, delay_level=-21.0, target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS)
    bs = s.bar_start

    osti = s.track('cello ostinato', E.Cello(bow=0.02, warmth=0.45, vib=0.03), volume=-6.0, pan=-0.2, reverb=0.25,
                   role='arp', vel=0.55, humanize_ms=3, vel_jitter=0.04, gate=0.45)
    lowstr = s.track('low strings', 'strings_low', volume=-15.0, reverb=0.35, role='pad', vel=0.5, gate=1.0, width=0.8)
    hi = s.track('high strings', 'strings_high', volume=-8.0, pan=0.15, reverb=0.4, role='melody', vel=0.62, gate=0.98,
                 width=0.6)
    brass = s.track('low brass', 'brass', volume=-10.0, pan=0.05, reverb=0.32, role='melody', vel=0.7, gate=0.95)
    horn = s.track('horn', 'horn', volume=-10.0, pan=-0.2, reverb=0.4, role='melody', vel=0.6, gate=0.95)
    box = s.track('music box', E.IceglassBell(ring=0.8, beat=0.7, mallet=0.8, far=0.15), volume=-13.0, pan=0.3,
                  reverb=0.35, delay=0.15, role='arp', vel=0.5, gate=1.0)
    bell = s.track('iceglass bell', E.IceglassBell(ring=3.4, beat=0.55, mallet=0.75, far=0.4), volume=-4.0, pan=0.2,
                   reverb=0.5, delay=0.15, role='melody', vel=0.74, gate=1.0)
    choir = s.track('choir', 'choir', volume=-14.0, reverb=0.55, role='pad', vel=0.5, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-9.0, reverb=0.3, role='perc', vel=0.68, humanize_ms=2, vel_jitter=0.04)
    cym = s.track('cymbal', E6.Cymbal(), volume=-20.0, pan=-0.2, reverb=0.35, role='perc', pitched=False, vel=0.6)
    bass = s.track('bass', 'bass', volume=-12.0, reverb=0.05, role='bass', vel=0.6, gate=0.8)

    # ---- the drive ----------------------------------------------------------------------------------------------------
    for bar in range(1, 61):
        name = BARS[bar - 1]
        sec = section(bar)
        if sec == 'M':
            continue
        quote = sec == 'B'
        r = E.root_note(name, 41)                                       # F2 .. E3
        third = r + (3 if E.parse(name)[1].count((E.parse(name)[0] + 3) % 12) else 4)
        if sec == 'R':
            r = 48                                                      # the C pedal
            third = 51 if name == 'C' else 53
        fig = [r, r, r + 7, r, r + 12, r, r + 7, third]
        for i, p in enumerate(fig):
            v = 0.52 + (0.12 if i in (0, 4) else 0.0) - (0.08 if quote else 0.0) + (0.05 if sec in ('C', 'R') else 0.0)
            osti.add(bs(bar) + 0.5 * i, p, 0.5, vel=v)
        lowstr.chord(bs(bar), [r - 12, r - 5] if not quote else [r - 12], 4.0, vel=0.46 if not quote else 0.4)
        tr = r if r <= 45 else r - 12                                    # timpani F2 or lower
        timp.add(bs(bar), tr, 1.0, vel=0.7 if bar % 2 else 0.6)
        if not quote:
            timp.add(bs(bar) + 2.0, E.fifth_note(name, 36) if sec != 'R' else 43, 1.0, vel=0.5)
        if sec == 'C':
            for off in (3.0, 3.5):
                timp.add(bs(bar) + off, tr, 0.5, vel=0.4)
        bass.add(bs(bar), r - 12, 1.5, vel=0.6)
        bass.add(bs(bar) + 2.0, r - 12, 1.5, vel=0.5 if not quote else 0.42)
        choir.chord(bs(bar), E.tones(name, 55, 70)[:3] if sec != 'R' else E.tones(name, 58 + (bar - 49) // 2, 75)[:3],
                    4.0, vel=0.42 if sec == 'A' else 0.36 if quote else 0.5 + (0.03 * (bar - 49) if sec == 'R' else 0.0))
        # the music box: high eighths arching over the chord (not under the quote)
        if not quote:
            tt = E.tones(name, 84, 100)
            arch = [tt[0], tt[1], tt[2], tt[min(3, len(tt) - 1)], tt[min(4, len(tt) - 1)], tt[2], tt[1], tt[min(3, len(tt) - 1)]]
            for i, p in enumerate(arch):
                box.add(bs(bar) + 0.5 * i, p, 0.5 if i != 4 else 1.5, vel=0.42 + (0.1 if i == 4 else 0.0))
        if bar in (16, 32, 48, 58):
            cym.add(bs(bar) + 2.0, 'c3', 2.0, vel=0.6)

    # ---- A: the strings' motif, the Db held into the Db chord ------------------------------------------------------------
    for bar in (1, 9):
        motif44(hi, bs(bar), 56, 0.66)                                  # Ab3 Eb4 F4 Db4
        motif44(brass, bs(bar), 44, 0.62)                               # two octaves down
        hi.seq(bar=bar + 4, pattern='c5/2 bb4/2 | ab4/1 g4/1 f4/2', vel=0.56)   # an answer over Bbm
        hi.seq(bar=bar + 6, pattern='g4/3 e4/1 | c5/4', vel=0.56)
    # ---- B: the Palehaven tune, frozen ----------------------------------------------------------------------------------
    for t, p, dur, motif in E.tune_aug(65, 'aeolian', first_bar=17):
        if motif:
            bell.add(t, p, dur, vel=0.78)                               # F4 C5 Db5 Bb4 on the iceglass bell
            hi.add(t, p + 12, dur, vel=0.34)
            continue
        hi.add(t, p + 12, dur, vel=0.6)
        horn.add(t, p, dur, vel=0.52)
    # ---- C: the motif climbs, then fortissimo -----------------------------------------------------------------------------
    for bar, start, sixth in ((33, 56, 9), (37, 58, 9), (41, 60, 8)):   # Ab3 (Eb F Db), Bb3 (F G Eb), C4 (G Ab F)
        motif44(hi, bs(bar), start, 0.68, hold=4.0, sixth=sixth)
        motif44(brass, bs(bar), start - 12, 0.7, hold=4.0, sixth=sixth)
        motif44(horn, bs(bar), start - 12, 0.58, hold=4.0, sixth=sixth)
    motif44(hi, bs(45), 68, 0.8, hold=6.0)                               # Ab4 Eb5 F5 Db5
    motif44(brass, bs(45), 56, 0.84, hold=6.0)
    motif44(horn, bs(45), 44, 0.7, hold=6.0)
    # ---- R: the build on the dominant ------------------------------------------------------------------------------------
    hi.seq(bar=49, pattern='c5/4 | db5/4 | c5/4 | db5/2 e5/2 | f5/4 | g5/4 | ab5/4 | g5/4', vel=0.56)
    brass.seq(bar=55, pattern='c3/4 | c3/4 | c3/2 e3/2 | g3/4', vel=0.66)
    for bar in (57, 58):
        for i in range(16):
            timp.add(bs(bar) + 0.25 * i, 'c2', 0.25, vel=0.3 + 0.025 * i + 0.08 * (bar - 57))
    # ---- M: F major, the bell's motif in major, the Bb falling to A -------------------------------------------------------
    for i, (p, dur) in enumerate((('f5', 1.0), ('c6', 1.0), ('d6', 1.0), ('bb5', 1.0))):
        bell.add(bs(59) + i, p, dur, vel=0.8)
    bell.add(bs(60), 'a5', 4.0, vel=0.76)                                # the major third, ringing into the loop
    hi.chord(bs(59), ['f4', 'a4', 'c5'], 8.0, vel=0.42)
    choir.chord(bs(59), ['f4', 'a4', 'c5'], 8.0, vel=0.4)
    lowstr.chord(bs(59), ['f2', 'c3'], 8.0, vel=0.42)
    bass.add(bs(59), 'f1', 8.0, vel=0.42)
    timp.add(bs(59), 'f2', 1.0, vel=0.46)
    return s
