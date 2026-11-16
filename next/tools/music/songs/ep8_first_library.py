"""first_library: "The Catalog of Lost Lives" (ep8_library_f1, ep8_library_f2). D Dorian, 76 BPM, 4/4, 28 bars (88.4 s), loops.
Manifest id `first_library`, file ep8_first_library.mp3.

The plan's brief (EPISODE8_PLAN 8.1): a harpsichord ostinato like pages turning, low pads, the motif on the violin in long notes
answered by the celesta two beats late; every 8 bars one instrument drops out for a bar and comes back (filed away, read back).

The ostinato: three beats of eighths over the chord, then on beat 4 four sixteenths that rise and fall back (a page lifted and
turned), every bar. The motif is the violin's, augmented to a bar a note: D4 A4 B4 G4 (bars 1-4; the B the Dorian sixth, sung
over G/B), the celesta answering each note two beats late two octaves up (D6 A6 B6 G6), quieter, in the hall's echo. B moves
the pair onto G (G4 D5 E5 C5, bars 9-12). C turns it over: the inverted guise D5 A4 G4 B4 (bars 17-20), the celesta still two
beats behind, the name read back from the other side of the page. The dropouts, one instrument for one bar each and back on the
next downbeat: the harpsichord in bar 8, the low pads in bar 16, the pizzicato heartbeat and the bass in bar 24.

Form
  A    1-8    Dm, Am7, G/B, G, Dm, F, C, Asus4: the motif on D and its echo, then the violin's slow line
  B    9-16   G, Dm, C, Am7, Dm, Em7, F, Asus4: the motif on G, the high strings very quiet above
  C    17-24  Dm, F/A, C, G, Dm, C, Em7, Asus4: the motif inverted, a faint choir, the violin climbing to A5 and down
  T    25-28  Dm, C/D, G/D, Asus4/D: the violin rests; the harpsichord and the echoes alone, into bar 1
"""
from tracker import Song
import ep8_theme as E

BPM = 76
A_CH = ['Dm', 'Am7', 'G/B', 'G', 'Dm', 'F', 'C', 'Asus4']
B_CH = ['G', 'Dm', 'C', 'Am7', 'Dm', 'Em7', 'F', 'Asus4']
C_CH = ['Dm', 'F/A', 'C', 'G', 'Dm', 'C', 'Em7', 'Asus4']
T_CH = ['Dm', 'C/D', 'G/D', 'Asus4/D']
BARS = A_CH + B_CH + C_CH + T_CH
assert len(BARS) == 28
MOTIF_D = (62, 69, 71, 67)              # D4 A4 B4 G4: 0 +7 +9 +5
MOTIF_G = (67, 74, 76, 72)              # G4 D5 E5 C5
MOTIF_INV = (74, 67, 65, 71)            # D5 A4 G4 B4: the inverted guise 0 -7 -9 -5
DROP = {8: 'harpsichord', 16: 'low pads', 24: 'heartbeat'}


def section(bar):
    return 'A' if bar <= 8 else 'B' if bar <= 16 else 'C' if bar <= 24 else 'T'


def build():
    s = Song('ep8_first_library', bpm=BPM, beats_per_bar=4, bars=28, key='D dorian', title='The Catalog of Lost Lives',
             reverb_room=0.92, reverb_damp=0.45, reverb_len=5.0, reverb_level=-7.5, delay_beats=(1.5, 2.0),
             delay_feedback=0.3, delay_level=-17.0, target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS)
    bs = s.bar_start

    violin = s.track('violin', E.Violin(swell=0.38, vib=0.12, vib_delay=0.45, breath=0.75, rosin=0.5), volume=-5.0,
                     pan=-0.1, reverb=0.5, role='melody', vel=0.62, gate=0.97)
    echo = s.track('celesta echo', 'celesta', volume=-11.0, pan=0.35, reverb=0.7, delay=0.35, role='melody', vel=0.42, gate=1.0)
    harp = s.track('harpsichord', 'harpsichord', volume=-8.5, pan=0.2, reverb=0.35, role='arp', vel=0.48, gate=0.8,
                   humanize_ms=3)
    lowpad = s.track('low pads', 'strings_low', volume=-15.0, reverb=0.5, role='pad', vel=0.42, gate=1.0, width=0.9)
    glass = s.track('glass pad', 'glasspad', volume=-22.0, pan=-0.2, reverb=0.7, role='pad', vel=0.36, gate=1.0)
    hi = s.track('high strings', 'strings_high', volume=-23.0, pan=0.15, reverb=0.65, role='pad', vel=0.32, gate=1.0)
    choir = s.track('choir', 'choir', volume=-23.0, reverb=0.7, role='pad', vel=0.34, gate=1.0)
    pizz = s.track('pizzicato', 'pizz', volume=-17.0, pan=-0.25, reverb=0.4, role='bass', vel=0.46)
    bass = s.track('bass', 'bass', volume=-18.0, reverb=0.05, role='bass', vel=0.46, gate=0.9)

    def motif(first, notes, vel=0.64):
        for i, p in enumerate(notes):
            violin.add(bs(first + i), p, 4.0, vel=vel + (0.04 if i == 3 else 0.0))
            echo.add(bs(first + i) + 2.0, p + 24, 2.0, vel=0.4)               # two beats late, two octaves up

    motif(1, MOTIF_D)
    violin.seq(bar=5, pattern='f4/4 | a4/2 c5/2 | e5/3 d5/1 | d5/2 e5/1 d5/1', vel=0.58)
    motif(9, MOTIF_G, 0.66)
    violin.seq(bar=13, pattern='a4/3 f4/1 | g4/2 b4/2 | c5/4 | e5/2 d5/2', vel=0.6)
    motif(17, MOTIF_INV, 0.66)
    violin.seq(bar=21, pattern='a4/2 d5/2 | e5/2 g5/2 | a5/3 g5/1 | e5/4', vel=0.64)
    echo.seq(bar=21, beat=3, pattern='d6/2 | r/2 g6/2 | r/2 b6/2 | r/2 a6/2', vel=0.36)
    # T: the echoes alone (the celesta reading the last line back), the violin rests
    echo.seq(bar=25, pattern='r/2 d6/2 | r/2 e6/1 c6/1 | r/2 b5/2', vel=0.36)

    for bar in range(1, 29):
        name = BARS[bar - 1]
        sec = section(bar)
        t0 = bs(bar)
        tt = E.tones(name, 50, 77)
        # the harpsichord: eighths for three beats, then the page turning (four sixteenths up and back)
        if DROP.get(bar) != 'harpsichord':
            fig = [tt[0], tt[2], tt[1], tt[3], tt[2], tt[1]]
            for i, p in enumerate(fig):
                harp.add(t0 + 0.5 * i, p, 0.5, vel=0.46 + (0.08 if i in (0, 4) else 0.0))
            top = [x for x in tt if x >= tt[2]][:4]
            turn = [top[0], top[1], top[min(3, len(top) - 1)], top[min(2, len(top) - 1)]]
            for i, p in enumerate(turn):
                harp.add(t0 + 3.0 + 0.25 * i, p, 0.25, vel=0.4 + 0.05 * (i == 2))
        if DROP.get(bar) != 'low pads':
            lowpad.chord(t0, [E.root_note(name, 38), E.root_note(name, 38) + 7], 4.0, vel=0.42)
            glass.chord(t0, E.tones(name, 57, 72)[:3], 4.0, vel=0.34)
        if DROP.get(bar) != 'heartbeat':
            r = E.root_note(name, 38)
            pizz.add(t0, r + 12, 1.0, vel=0.44)
            pizz.add(t0 + 2.0, E.fifth_note(name, 45), 1.0, vel=0.36)
            bass.add(t0, r - 12 if r >= 36 else r, 3.5, vel=0.42)
        if sec == 'B':
            hi.add(t0, E.tones(name, 76, 88)[0], 4.0, vel=0.3)
        if sec == 'C' and bar >= 19:
            choir.chord(t0, E.tones(name, 57, 70)[:3], 4.0, vel=0.32)
    return s
