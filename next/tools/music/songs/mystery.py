"""mystery: "The Thirteenth Bell" (story cue). E Phrygian with Lydian color, 64 BPM, 4/4, 12 bars (45 s), loops.

One bell tolls every two bars. Harmony never resolves: Em7sus4 with a 4-3 suspension, Fmaj7#11 over the E
pedal (the Phrygian F and the Lydian B in one chord), Cmaj7/E, Bsus4 to B (a leading-tone dominant left
hanging), Em(add9), and Fmaj7#11 again, so the loop "resolves" only by sliding the half step back to bar 1.
The piano states the name motif on C (all four notes sit inside Fmaj7#11), later the inverted "fading"
guise (E5 A4 G4 B4), and finally only the first three notes: the name fades before it is finished.
"""
from tracker import Song

CHORDS = ['Em7sus4', 'Em7', 'Fmaj7#11/E', 'Fmaj7#11/E', 'Cmaj7/E', 'Cmaj7/E', 'Bsus4/E', 'B/E',
          'Em(add9)', 'Em(add9)', 'Fmaj7#11/E', 'Fmaj7#11/E']


def build():
    s = Song('mystery', bpm=64, beats_per_bar=4, bars=12, key='E phrygian', title='The Thirteenth Bell',
             reverb_room=0.9, reverb_damp=0.3, reverb_len=5.0, reverb_level=-6.0,
             delay_beats=(0.75, 1.0), delay_feedback=0.35, delay_level=-14.0, target_lufs=-16.0,
             intended_chords=CHORDS)

    bell = s.track('bell', 'bell', volume=-8.0, pan=-0.1, reverb=0.5, role='perc', vel=0.8)
    piano = s.track('piano', 'piano', volume=-6.5, pan=0.1, reverb=0.45, delay=0.15, role='melody', vel=0.55, gate=1.0, humanize_ms=8)
    celesta = s.track('celesta', 'celesta', volume=-11.0, pan=0.4, reverb=0.55, delay=0.45, role='arp', vel=0.38, humanize_ms=5)
    strings = s.track('strings', 'strings', volume=-16.0, reverb=0.5, role='pad', vel=0.45, gate=1.0, width=0.8)
    lowstr = s.track('low strings', 'strings_low', volume=-18.5, reverb=0.4, role='pad', vel=0.42, gate=1.0, width=0.4)
    bass = s.track('bass', 'bass', volume=-19.0, reverb=0.05, role='bass', vel=0.45, gate=0.98)

    bs = s.bar_start

    # ---- the bell: every two bars, slightly different weight each time -------------------------------
    for bar, v in ((1, 0.85), (3, 0.72), (5, 0.8), (7, 0.76), (9, 0.84), (11, 0.7)):
        bell.add(bs(bar), 'e3', 1.0, vel=v)

    # ---- piano -------------------------------------------------------------------------------------------
    piano.seq(bar=1, pattern='r/2 e4/1 b4/1 | r/4', vel=0.5)
    piano.seq(bar=3, pattern='c5/1.5 g5/0.5 a5/1 f5/1 | e5/3 r/1', vel=0.58)
    piano.seq(bar=5, pattern='r/1 g4/1 b4/1 d5/1 | e5/2 r/2', vel=0.5)
    piano.seq(bar=7, pattern='r/2 f#5/1 e5/1 | d#5/3 r/1', vel=0.56)
    piano.seq(bar=9, pattern='e5/1.5 a4/0.5 g4/1 b4/1 | r/4', vel=0.56)        # the fading (inverted) guise
    piano.seq(bar=11, pattern='r/2 c5/1 g5/1 | a5/1.5 r/2.5', vel=0.52)       # the name stops short
    # a low left-hand fifth under some bars so the piano is not only treble
    for bar, p in ((3, 'f2'), (5, 'c3'), (9, 'e2'), (11, 'f2')):
        piano.add(bs(bar), p, 3.5, vel=0.38)

    # ---- celesta glints with long echoes -------------------------------------------------------------------
    celesta.seq(bar=2, pattern='r/3 b5/0.5 e6/0.5', vel=0.36)
    celesta.seq(bar=4, pattern='r/2 b5/1 r/1', vel=0.3)
    celesta.seq(bar=6, pattern='r/3 d6/0.5 g6/0.5', vel=0.34)
    celesta.seq(bar=8, pattern='r/2.5 f#6/0.5 r/1', vel=0.3)
    celesta.seq(bar=10, pattern='r/2 e6/1 b6/1', vel=0.34)
    celesta.seq(bar=12, pattern='r/3 b5/1', vel=0.28)

    # ---- strings: suspensions that resolve late or not at all ----------------------------------------------
    st = strings
    st.chord(bs(1), ['e4', 'd5'], 8, vel=0.42)
    st.add(bs(1), 'a4', 4, vel=0.44)
    st.add(bs(2), 'g4', 4, vel=0.4)                    # 4-3 suspension resolves in bar 2
    st.chord(bs(3), ['f4', 'b4', 'e5'], 8, vel=0.46)   # Fmaj7#11 upper structure (F B E)
    st.chord(bs(5), ['g4', 'b4', 'd5'], 8, vel=0.44)
    st.chord(bs(7), ['f#4', 'b4'], 8, vel=0.46)
    st.add(bs(7), 'e5', 4, vel=0.46)
    st.add(bs(8), 'd#5', 4, vel=0.48)                  # sus4 to the leading tone
    st.chord(bs(9), ['e4', 'g4', 'b4', 'f#5'], 8, vel=0.44)
    st.chord(bs(11), ['f4', 'b4', 'e5'], 8, vel=0.46)

    # ---- pedal E in low strings and bass -------------------------------------------------------------------
    for bar in (1, 5, 9):
        lowstr.chord(bs(bar), ['e2', 'b2'], 16, vel=0.42)
    for bar in range(1, 13):
        bass.add(bs(bar), 'e2', 4, vel=0.45 if bar % 2 else 0.36)
    return s
