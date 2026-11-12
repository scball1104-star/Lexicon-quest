"""palehaven: "The Thawing Hearth" (Palehaven and its ep7_ph_* interiors, doors_reopen, the Episode 7 credits). D Dorian,
72 BPM, 4/4, 28 bars (93.3 s), loops. Manifest id `palehaven`, file ep7_palehaven.mp3.

The root region-7 brief, for the tracker: a warm solo cello, sparse piano, glass bells, airy sustained strings, quiet snow
and aurora with melancholy hope. An A section of stillness (the cello alone over a held string fifth), a warmer B section
where the piano and the bells answer each other like doors opening. The cold is written with the instruments, the mode and
the space, not a stock cliche (no sleigh bells, no wind effect): an open fifth with no third under the whole A section, the
iceglass bell far off in a long dark hall, the strings high and thin, and the warmth only arriving with the Dorian sixth (the
B natural) when the doors open in B. Then the hearth: the piano, a third in the pads, the low strings.

The name motif is the iceglass bell's: D5 A5 B5 G5 on beats 1 to 4 of bar 1, the G left ringing on (the bell is never
damped) into bar 2, where the cello replies under it, A3 F3 E3. Bar 5 repeats it softer, an octave lower; bar 25 brings it
back for the turn home. In the B sections the Palehaven tune (ep7_theme.TUNE) has the same four notes on the bell, the rest
on the cello (B) and then on the piano (B'), the bell and the piano trading short answers between the phrases.

Form
  A    1-8    the D-A fifth held by the strings (no third): the motif on the bell (1, 5), the cello's reply and its slow line
              (F G A, the B, then down to D); a glass shimmer high up (the aurora) every second bar
  B    9-16   the tune: Dm, Em7, F, G, G/B, F, Am7-C, Dm: the bell's motif, the cello's tune, pads with the third, the piano's
              rising answers (beats 3-4 of even bars) and the bell answering the piano a bar later
  B'   17-24  the tune on the piano, the bell's motif over it, the cello a countermelody under, high strings, the low
              strings warm on the roots: the hearth
  T    25-28  Dm, Em7, C, Dm: the motif once more on the bell, the cello alone again on D, the fifth returns into bar 1
"""
from tracker import Song
import ep7_theme as E

A_CH = [[(0, 'D5')]] * 8
B_CH = E.CHORDS_DORIAN
T_CH = [[(0, 'Dm')], [(0, 'Em7')], [(0, 'C')], [(0, 'Dm')]]
BARS = A_CH + B_CH + B_CH + T_CH
assert len(BARS) == 28
INTENDED = [b[0][1] for b in BARS]
BPM = 72

MOTIF = ('d5', 'a5', 'b5', 'g5')                 # 0 +7 +9 +5
REPLY = 'r/1 a3/0.5 f3/0.5 e3/2'                 # the cello's reply under the ringing G (bar 2)
CELLO_A = {3: 'f3/2 g3/1 a3/1', 4: 'b3/3 a3/1', 6: 'r/1 a3/0.5 g3/0.5 f3/2', 7: 'g3/1.5 f3/0.5 e3/2', 8: 'd3/4'}
PIANO_ANSWER = {10: 'a4 c5 e5', 12: 'b4 d5 g5', 14: 'c5 e5 a5', 16: 'd5 f5 a5'}   # rising thirds, beats 3 to 4
BELL_ANSWER = {11: 'e6', 13: 'g6', 15: 'a6', 17: 'd6'}                            # the bell answers, beat 2 of the next bar
COUNTER = ['f3/4', 'g3/4', 'a3/4', 'b3/4', 'd4/2 b3/2', 'a3/4', 'c4/2 e4/2', 'f3/2 a3/2']   # the cello under the piano (B')


def segments(bar):
    segs = BARS[bar - 1]
    return [(b, (segs[i + 1][0] if i + 1 < len(segs) else 4) - b, name) for i, (b, name) in enumerate(segs)]


def section(bar):
    return 'A' if bar <= 8 else 'B' if bar <= 16 else "B'" if bar <= 24 else 'T'


def build():
    s = Song('ep7_palehaven', bpm=BPM, beats_per_bar=4, bars=28, key='D dorian', title='The Thawing Hearth',
             reverb_room=0.92, reverb_damp=0.5, reverb_len=5.0, reverb_level=-7.0,
             delay_beats=(1.5, 1.0), delay_feedback=0.28, delay_level=-17.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=INTENDED)
    bs = s.bar_start

    bell = s.track('iceglass bell', E.IceglassBell(ring=4.2, beat=0.5, mallet=0.7, far=0.55), volume=-4.0, pan=0.18,
                   reverb=0.6, delay=0.2, role='melody', vel=0.74, gate=1.0)
    cello = s.track('cello', E.Cello(bow=0.14, warmth=0.6), volume=-3.5, pan=-0.12, reverb=0.4, role='melody', vel=0.62,
                    gate=0.97)
    piano = s.track('piano', 'piano', volume=-7.5, pan=0.08, reverb=0.45, delay=0.1, role='melody', vel=0.56, gate=0.95)
    fifth = s.track('held fifth', 'strings', volume=-15.0, reverb=0.6, role='pad', vel=0.4, gate=1.0, width=1.0)
    hi = s.track('high strings', 'strings_high', volume=-17.0, pan=0.12, reverb=0.65, role='pad', vel=0.38, gate=1.0,
                 width=0.9)
    low = s.track('low strings', 'strings_low', volume=-19.0, reverb=0.45, role='bass', vel=0.42, gate=1.0, width=0.7)
    aurora = s.track('aurora', 'glasspad', volume=-25.0, pan=-0.3, reverb=0.7, delay=0.3, role='pad', vel=0.35, gate=1.0)

    def motif(bar, vel=0.74, octave=0):
        """The bell's motif: D A B on beats 1-3, G on beat 4, left to ring (the bell is never damped)."""
        for i, nm in enumerate(MOTIF):
            n0 = len(bell.notes)
            bell.add(bs(bar) + i, nm, 1.0 if i < 3 else 2.0, vel=vel * (1.05 if i == 3 else 1.0))
            bell.notes[n0].midi += 12 * octave

    # ---- A: stillness. The bell's motif, the cello alone over the held fifth ---------------------------------------
    motif(1, 0.76)
    cello.seq(bar=2, pattern=REPLY, vel=0.58)
    motif(5, 0.62, octave=-1)
    cello.seq(bar=6, pattern=CELLO_A[6], vel=0.6)
    for bar in (3, 4, 7, 8):
        cello.seq(bar=bar, pattern=CELLO_A[bar], vel=0.6 + (0.05 if bar == 4 else 0.0))
    # ---- B: the tune, the cello and the bell; the piano and the bell answer each other -------------------------------
    for bar, beat, p, dur, mo in E.tune(62, 'dorian', 9):              # D4 ...
        if mo:
            bell.add(bs(bar) + beat, p + 12, dur, vel=0.72)
            continue
        cello.add(bs(bar) + beat, p - 12, dur, vel=0.64)
    for bar, notes in PIANO_ANSWER.items():
        for k, nm in enumerate(notes.split()):
            piano.add(bs(bar) + 2.0 + 0.5 * k, nm, 2.0 - 0.5 * k, vel=0.46 + 0.04 * k)
    for bar, nm in BELL_ANSWER.items():
        bell.add(bs(bar) + 1.0, nm, 1.0, vel=0.5)
    # ---- B': the tune on the piano, the bell's motif over it, the cello under ---------------------------------------
    for bar, beat, p, dur, mo in E.tune(62, 'dorian', 17):
        if mo:
            bell.add(bs(bar) + beat, p + 12, dur, vel=0.68)
            piano.add(bs(bar) + beat, p, dur, vel=0.4)                   # the piano breathes the motif under the bell
            continue
        piano.add(bs(bar) + beat, p + 12 if bar >= 21 else p, dur, vel=0.6)
    for i, pat in enumerate(COUNTER):
        cello.seq(bar=17 + i, pattern=pat, vel=0.56)
    hi.seq(bar=19, pattern='a5/4 | b5/4 | d6/4 | c6/2 b5/2 | a5/4 | c6/4', vel=0.36)
    # ---- T: the motif once more; the cello alone on D ----------------------------------------------------------------
    motif(25, 0.68)
    cello.seq(bar=26, pattern='r/1 a3/0.5 f3/0.5 e3/2 | c3/2 g3/2 | d3/3 a2/1', vel=0.56)

    # ---- accompaniment -----------------------------------------------------------------------------------------------
    for bar in range(1, 29):
        sec = section(bar)
        for b0, ln, name in segments(bar):
            if sec in ('A', 'T') and name in ('D5', 'Dm'):
                fifth.chord(bs(bar) + b0, ['d3', 'a3'], ln, vel=0.4)    # the held fifth, no third
                continue
            warm = sec == "B'"
            fifth.chord(bs(bar) + b0, E.tones(name, 55, 70)[:3], ln, vel=0.4 if not warm else 0.46)
            if sec != 'A':
                low.add(bs(bar) + b0, E.root_note(name, 38), ln, vel=0.38 if sec == 'B' else 0.46)
        # the aurora: a high glass shimmer, an open fifth, every second bar of A and T (quiet, slow to arrive)
        if sec in ('A', 'T') and bar % 2 == 1:
            aurora.chord(bs(bar) + 1.0, ['a5', 'e6'], 6.5, vel=0.32)
        if sec == 'A' and bar in (3, 7):
            hi.add(bs(bar), 'a5', 8.0, vel=0.3)                            # the strings airy over the cello
        # the piano in B': sparse low roots on 1, a fifth on 3 (the hearth)
        if sec == "B'":
            for b0, ln, name in segments(bar):
                r = E.root_note(name, 38)
                piano.add(bs(bar) + b0, r, min(ln, 2.0), vel=0.4)
                if ln >= 3:
                    piano.add(bs(bar) + b0 + 2.0, r + 7, 2.0, vel=0.34)
    return s
