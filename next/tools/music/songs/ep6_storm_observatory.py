"""storm_observatory: "The Windward Causeways" (ep6_obs_f1 and ep6_obs_f2). D Dorian, 96 BPM, 4/4, 36 bars (90.0 s),
loops. Manifest id `storm_observatory`, file ep6_storm_observatory.mp3.

The plan's brief (8.1): a low pulse of timpani and a rope-creak percussion, a sustained string drone that rises and falls
like gusts, the motif on low horn in long notes, the wind harp answering it in harmonics, and a dry chime every 8 bars
(the tied chimes, one slipping free).

The name motif is the horn's, augmented to a whole bar a note: D3 A3 B3 G3 (the B natural is the Dorian sixth), bars
1-4; the wind harp answers every note two beats late on its overtones, D5 A5 B5 G5, so each horn note is caught by the
wind half a bar after it is played. A' (17-20) moves the pair onto G (G3 D4 E4 C4, the same intervals inside the mode).
In C (25-28) the wind harp turns the motif over, the inverted guise D5 A4 G4 B4, the course read backwards in a storm.
T (33-35) brings the horn back for three notes only; the fourth is left to the chime.

The chime: on the downbeat of bars 1, 9, 17, 25 and 33 two small glass chimes are struck together (A6 and D7, tied on
one cord) and a third (E7) slips free a beat and a half later, a little flat, struck again by the wind and not by a hand.
Dry (almost no reverb): it is close, the rest of the track is far away.

Form (bar: harmony)
  A    1-8    Dm, Am7/D, G/D, C/D, Dm7, C/D, G/D, Am/D: the D pedal; the horn's motif and its echo; timpani on 1 and 3
  B    9-16   Dm, C, G/B, Am7, Dm, F, G, Asus4: the bass leaves the pedal; high strings' slow line; pizzicato off-beats
  A'   17-24  G, Dm, Am, F, Dm, C, G/B, Am: the motif on G, its echo; the gust drones deeper
  C    25-32  Dm, Am, C, G, Dm, F, Em7, Asus4: the storm; the motif inverted on the wind harp, the horn answers; choir,
              timpani in eighths, the creaks closer
  T    33-36  Dm, Am7/D, G/D, Asus4: the horn's first three notes, the chime; Asus4 falls back into bar 1
"""
from tracker import Song
import ep6_theme as E

BARS = ['Dm', 'Am7/D', 'G/D', 'C/D', 'Dm7', 'C/D', 'G/D', 'Am/D',
        'Dm', 'C', 'G/B', 'Am7', 'Dm', 'F', 'G', 'Asus4',
        'G', 'Dm', 'Am', 'F', 'Dm', 'C', 'G/B', 'Am',
        'Dm', 'Am', 'C', 'G', 'Dm', 'F', 'Em7', 'Asus4',
        'Dm', 'Am7/D', 'G/D', 'Asus4']
assert len(BARS) == 36
MOTIF_D = (50, 57, 59, 55)                 # D3 A3 B3 G3: 0 +7 +9 +5
MOTIF_G = (55, 62, 64, 60)                 # G3 D4 E4 C4
INVERTED = (74, 69, 67, 71)                # D5 A4 G4 B4: 0 -5 -7 -3 from the top, the inverted guise (0 -7 -9 -5)
HI_B = ['a4/4', 'g4/4', 'b4/4', 'c5/2 b4/2', 'a4/4', 'a4/2 c5/2', 'b4/2 d5/2', 'e5/4']


def section(bar):
    return 'A' if bar <= 8 else 'B' if bar <= 16 else "A'" if bar <= 24 else 'C' if bar <= 32 else 'T'


def build():
    s = Song('ep6_storm_observatory', bpm=96, beats_per_bar=4, bars=36, key='D dorian', title='The Windward Causeways',
             reverb_room=0.88, reverb_damp=0.45, reverb_len=4.5, reverb_level=-8.0,
             delay_beats=(1.0, 0.75), delay_feedback=0.3, delay_level=-19.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    horn = s.track('horn', 'horn', volume=-4.0, pan=-0.15, reverb=0.45, role='melody', vel=0.66, gate=0.97)
    echo = s.track('wind harp (harmonics)', E.WindHarp(swell=0.45, ring=1.6, catch=0.3, harmonics=1.0, air=0.04),
                   volume=-7.0, pan=0.35, reverb=0.6, delay=0.3, role='melody', vel=0.6, gate=0.98)
    hi = s.track('high strings', 'strings_high', volume=-11.0, pan=0.1, reverb=0.55, role='melody', vel=0.44, gate=1.02,
                 width=0.8)
    drone = s.track('gust drone', E.Swell('strings_low', depth=0.7, power=1.4), volume=-14.5, reverb=0.5, role='pad',
                    vel=0.5, gate=1.0, width=1.0)
    air = s.track('gust strings', E.Swell('strings', depth=0.85, power=2.0), volume=-19.0, reverb=0.65, role='pad',
                  vel=0.42, gate=1.0, width=1.0)
    choir = s.track('choir', 'choir', volume=-19.0, reverb=0.6, role='pad', vel=0.45, gate=1.0)
    bass = s.track('bowed bass', 'bowbass', volume=-17.0, reverb=0.2, role='bass', vel=0.5, gate=0.95)
    pizz = s.track('pizzicato', 'pizz', volume=-15.0, pan=-0.3, reverb=0.35, role='arp', vel=0.45, gate=0.6)
    timp = s.track('timpani', 'lowdrum', volume=-10.0, pan=0.05, reverb=0.35, role='perc', vel=0.55, humanize_ms=3,
                   vel_jitter=0.04)
    creak = s.track('rope creak', 'creak', volume=-17.0, pan=0.45, reverb=0.3, role='perc', vel=0.5, humanize_ms=8,
                    vel_jitter=0.08)
    chime = s.track('chimes', 'glass', volume=-13.0, pan=-0.4, reverb=0.08, role='perc', vel=0.5)

    def motif_with_echo(bar, notes, vel=0.66, echo_vel=0.6, count=4, hold=4.0):
        """The horn augmented (a whole bar a note), the wind harp two beats late on its overtones, two octaves up."""
        for i, p in enumerate(notes[:count]):
            last = i == count - 1
            horn.add(bs(bar + i), p, 4.0 if not last else hold, vel=vel + (0.04 if i == 2 else 0.0))
            echo.add(bs(bar + i) + 2.0, p + 24, 3.6 if not last else 5.5, vel=echo_vel)

    # ---- the motif ---------------------------------------------------------------------------------------------------
    motif_with_echo(1, MOTIF_D, 0.64, 0.58)
    motif_with_echo(17, MOTIF_G, 0.68, 0.6)
    for i, p in enumerate(INVERTED):                                   # C: the wind harp turns the motif over
        echo.add(bs(25 + i), p, 3.6, vel=0.66)
        horn.add(bs(25 + i) + 2.0, p - 24, 2.0, vel=0.5)              # and the horn answers it, low and short
    motif_with_echo(33, MOTIF_D, 0.58, 0.52, count=3, hold=7.5)                  # T: three notes; the fourth is the chime's
    # A and A' second halves: the horn holds long tones under the strings, the wind harp touches them
    horn.seq(bar=5, pattern='f3/4 | e3/4 | d3/4 | e3/4', vel=0.48)
    horn.seq(bar=21, pattern='f3/4 | e3/4 | d3/4 | c3/2 e3/2', vel=0.5)
    for bar, p in ((6, 76), (8, 72), (22, 79), (24, 76)):
        echo.add(bs(bar) + 2.0, p, 3.0, vel=0.42)
    # ---- B: the high strings' slow line --------------------------------------------------------------------------
    for i, pat in enumerate(HI_B):
        hi.seq(bar=9 + i, pattern=pat, vel=0.52)
    hi.seq(bar=29, pattern='f5/4 | e5/2 d5/2 | e5/4', vel=0.5)
    # B and the end of C: the horn under the strings in long tones (it never leaves; the wind harp only visits)
    horn.seq(bar=9, pattern='a3/4 | g3/4 | g3/4 | e3/4 | f3/4 | f3/4 | g3/4 | e3/4', vel=0.5)
    horn.seq(bar=29, pattern='d4/4 | c4/4 | b3/4 | a3/4', vel=0.56)
    for bar, p in ((10, 79), (12, 76), (14, 81), (16, 76)):
        echo.add(bs(bar) + 2.0, p, 3.0, vel=0.4)                      # the wind harp touches the line, two beats late

    # ---- accompaniment ----------------------------------------------------------------------------------------------
    for bar in range(1, 37):
        sec = section(bar)
        name = BARS[bar - 1]
        storm = sec == 'C'
        pedal = sec in ('A', 'T')
        r = 38 if pedal else E.root_note(name, 36)                    # D2, or the chord's bass C2 .. B2
        # the gust drone: two-bar swells on odd bars (root and fifth, low), deeper in A' and C
        if bar % 2 == 1:
            nxt = BARS[bar] if bar < 36 else BARS[0]
            two = [38, 45] if pedal else [r, r + 7]
            drone.chord(bs(bar), two, 8.0 if (pedal or name == nxt) else 4.0, vel=0.5 if not storm else 0.58)
            if not (pedal or name == nxt):
                drone.chord(bs(bar + 1), [E.root_note(nxt, 36), E.root_note(nxt, 36) + 7], 4.0, vel=0.48)
        # the high gust: one swell a bar, chord tones in the middle
        air.chord(bs(bar), E.tones(name, 57, 74)[:3], 4.0, vel=0.38 + (0.08 if sec in ("A'", 'C') else 0.0))
        if storm:
            choir.chord(bs(bar), E.tones(name, 52, 69)[:3], 4.0, vel=0.42)
        if not pedal:
            bass.add(bs(bar), r, 3.5, vel=0.48 if not storm else 0.54)
        else:
            bass.add(bs(bar), 38, 3.8, vel=0.42)
        # pizzicato off-beats in B and C (the deck boards under the wind)
        if sec in ('B', 'C'):
            tt = E.tones(name, 50, 67)
            for k, off in enumerate((0.5, 1.5, 2.5, 3.5)):
                pizz.add(bs(bar) + off, tt[(k * 2 + bar) % len(tt)], 0.5, vel=0.4 + (0.06 if off == 2.5 else 0.0))
        # timpani: the low pulse on 1 and 3; eighths building in C; a short roll into bars 9, 17, 25, 33
        tp = 'd2' if pedal or name.startswith('D') else 'a1'
        timp.add(bs(bar), tp, 1.0, vel=0.58 if bar % 4 == 1 else 0.5)
        timp.add(bs(bar) + 2.0, 'a1', 1.0, vel=0.42)
        if storm:
            for off in (1.0, 1.5, 3.0, 3.5):
                timp.add(bs(bar) + off, tp, 0.5, vel=0.3 + 0.06 * (off % 1 == 0))
        if bar in (8, 16, 24, 32):
            for k in range(8):
                timp.add(bs(bar) + 3.0 + k * 0.125, 'a1', 0.125, vel=0.25 + 0.04 * k)
        # rope creak: the lines taking the strain of a gust (sparse, closer in the storm)
        if bar % 2 == 0 or storm:
            creak.add(bs(bar) + (2.5 if bar % 4 == 2 else 3.5), 'c4', 1.0, vel=0.45 + (0.12 if storm else 0.0))
        if storm and bar % 2 == 1:
            creak.add(bs(bar) + 1.25, 'c4', 0.75, vel=0.4)
        # the chime: two tied chimes struck together, the third slipping free a beat and a half later, a little flat
        if bar in (1, 9, 17, 25, 33):
            chime.add(bs(bar), 'a6', 2.0, vel=0.52)
            chime.add(bs(bar), 'd7', 2.0, vel=0.46)
            chime.add(bs(bar) + 1.5, 'e7', 2.0, vel=0.38)
    return s
