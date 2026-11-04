"""sunken_keep: "The Sunken Keep" (ep4_keep_f1, ep4_keep_f2). D Dorian, 80 BPM, 4/4, 32 bars (96 s), loops.
Manifest id `sunken_keep`, file ep4_sunken_keep.mp3.

A drowned dungeon. A slow pulse of plucked low strings on beats 1 and 3, a muffled bell (the Keep's drowned bell, D3
heard through water: lowpassed, wet) every four bars, water-drop percussion (a sine that bends up as it pops), and a
clarinet line that plays the name motif augmented, a bar a note: D4 A4 B4 G4 (degrees 1 5 6 4, the B the Dorian sixth,
sung over G/D, so it rings warm in the dark). In A' a glass pad plays the motif back an octave above, two beats late:
the reflection on the water. In C the clarinet goes under and the harp states the motif plainly, like something seen
at the bottom of a canal.

Form
  A    1-8    Dm, Am7/D, G/D, C/D, Dm, C/D, G/D, Dm: the clarinet motif in long notes (1-4), its answer (5-8)
  B    9-16   F, C/E, Dm, Am, F, G, Em7, A7sus4-A7: the bass moves, strings and a faint choir, the clarinet climbs
  A'   17-24  A again: the clarinet motif and its reflection in the glass pad
  C    25-32  Dm, Em7, Fmaj7, G, Dm, Em7, Fmaj7, A7sus4-A7: the deep; more drops, the harp motif, the clarinet low
"""
import math

import numpy as np

import synth
from tracker import Song
import e3_theme as T


class Drop(synth.Instrument):
    """A water drop: a sine that bends upward as the bubble pops, a soft tick, very short."""
    name = 'drop'
    release = 0.1
    max_len = 0.4

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(0.18 * sr)
        t = np.arange(n) / sr
        f = f0 * (1.0 + 0.85 * (1.0 - np.exp(-t / 0.014)))
        ph = 2.0 * math.pi * np.cumsum(f) / sr
        env = np.exp(-t / 0.028) * (1.0 - np.exp(-t / 0.0007))
        v = np.sin(ph) * env
        tick = synth.filt(synth.noise(n, rng), 'hp', 3000.0, sr, 0.7) * np.exp(-t / 0.0012) * 0.12
        return synth.normalize(v + tick, 0.5 * (0.4 + 0.6 * vel))


A_CH = [[(0, 'Dm')], [(0, 'Am7/D')], [(0, 'G/D')], [(0, 'C/D')], [(0, 'Dm')], [(0, 'C/D')], [(0, 'G/D')], [(0, 'Dm')]]
B_CH = [[(0, 'F')], [(0, 'C/E')], [(0, 'Dm')], [(0, 'Am')], [(0, 'F')], [(0, 'G')], [(0, 'Em7')],
        [(0, 'A7sus4'), (2, 'A7')]]
C_CH = [[(0, 'Dm')], [(0, 'Em7')], [(0, 'Fmaj7')], [(0, 'G')], [(0, 'Dm')], [(0, 'Em7')], [(0, 'Fmaj7')],
        [(0, 'A7sus4'), (2, 'A7')]]
BARS = A_CH + B_CH + A_CH + C_CH
assert len(BARS) == 32
INTENDED = [b[0][1] for b in BARS]

MOTIF_AUG = 'd4/4 | a4/4 | b4/4 | g4/4'
CLAR = {
    5: 'a4/2 g4/1 f4/1', 6: 'e4/3 g4/1', 7: 'f4/1.5 e4/0.5 d4/1 b3/1', 8: 'd4/4',
    9: 'c5/2 a4/1 f4/1', 10: 'g4/3 e4/1', 11: 'f4/1.5 e4/0.5 d4/1 a4/1', 12: 'e5/4',
    13: 'd5/1.5 c5/0.5 a4/2', 14: 'b4/2 d5/2', 15: 'g4/1.5 e4/0.5 b4/2', 16: 'd5/2 c#5/2',
    21: 'f4/2 a4/1 c5/1', 22: 'b4/3 a4/1', 23: 'g4/1.5 f4/0.5 e4/1 d4/1', 24: 'd4/4',
    29: 'a3/4', 30: 'b3/4', 31: 'c4/4', 32: 'd4/2 c#4/2',
}


def segments(bar):
    segs = BARS[bar - 1]
    out = []
    for i, (b, name) in enumerate(segs):
        end = segs[i + 1][0] if i + 1 < len(segs) else 4
        out.append((b, end - b, name))
    return out


def build():
    s = Song('ep4_sunken_keep', bpm=80, beats_per_bar=4, bars=32, key='D dorian', title='The Sunken Keep',
             reverb_room=0.9, reverb_damp=0.45, reverb_len=4.8, reverb_level=-7.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.32, delay_level=-14.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=INTENDED)
    bs = s.bar_start

    clar = s.track('clarinet', 'clarinet', volume=-10.0, pan=-0.1, reverb=0.5, delay=0.12, role='melody', vel=0.62, gate=0.97)
    refl = s.track('reflection', 'glasspad', volume=-10.0, pan=0.35, reverb=0.6, delay=0.3, role='melody', vel=0.42, gate=1.0)
    harp = s.track('harp', 'harp', volume=-2.0, pan=0.3, reverb=0.55, delay=0.35, role='melody', vel=0.5)
    pizz = s.track('low pizzicato', 'pizz', volume=-6.0, pan=-0.05, reverb=0.35, role='bass', vel=0.62, gate=0.9)
    bass = s.track('bass', 'bass', volume=-20.0, reverb=0.05, role='bass', vel=0.5, gate=1.0)
    bell = s.track('drowned bell', 'bell', volume=-6.0, pan=0.0, reverb=0.75, role='perc', vel=0.7, lowpass=650.0)
    drop = s.track('drops', Drop(), volume=-12.0, pan=0.3, reverb=0.55, delay=0.25, role='perc', vel=0.5)
    low = s.track('low strings', 'strings_low', volume=-19.0, reverb=0.45, role='pad', vel=0.42, gate=1.0, width=0.6)
    mid = s.track('strings', 'strings', volume=-19.0, reverb=0.55, role='pad', vel=0.4, gate=1.0, width=0.9)
    choir = s.track('choir', 'choir', volume=-19.0, reverb=0.65, role='pad', vel=0.38, gate=1.0)

    # ---- the clarinet: the motif augmented (1-4, 17-20), its answers, the climb, the low line of C -------------------
    clar.seq(bar=1, pattern=MOTIF_AUG, vel=0.6)
    clar.seq(bar=17, pattern=MOTIF_AUG, vel=0.64)
    for bar, pat in CLAR.items():
        clar.seq(bar=bar, pattern=pat, vel=0.62 if bar < 25 else 0.5)
    # the reflection: the motif an octave above (D5 A5 B5 G5), two beats late, in the glass pad (A')
    for i, p in enumerate((74, 81, 83, 79)):
        refl.add(bs(17 + i) + 2, p, 4.0, vel=0.42)
    # C: the harp states the motif plainly, high, twice (Dm, then from C over Fmaj7)
    harp.seq(bar=25, pattern='d5/1 a5/1 b5/1 g5/1', vel=0.5)
    harp.seq(bar=27, pattern='c5/1 g5/1 a5/1 f5/1', vel=0.46)
    harp.seq(bar=26, pattern='r/2 e5/1 b4/1', vel=0.34)
    harp.seq(bar=28, pattern='r/2 d5/1 b4/1', vel=0.34)
    # under it, in the deep (25-32), a slow harp arpeggio in eighths that keeps the floor from going silent
    for bar in range(25, 33):
        for b0, ln, name in segments(bar):
            tt = T.tones(name, 50, 70)
            fig = [tt[0], tt[1], tt[2], tt[3] if len(tt) > 3 else tt[1] + 12]
            for i in range(int(ln * 2)):
                if bar in (25, 27) and i % 2 == 1:
                    continue                    # make room for the motif's quarter notes
                harp.add(bs(bar) + b0 + 0.5 * i, fig[i % 4], 0.5, vel=0.3, gate=2.0)

    # ---- the pulse, the bell, the pads ------------------------------------------------------------------------------------
    for bar in range(1, 33):
        for b0, ln, name in segments(bar):
            r = T.root_note(name, 38)          # D2 .. C#3
            pizz.add(bs(bar) + b0, r, 1.0, vel=0.64)
            if ln == 4:
                p3 = r + 12 if bar % 2 == 0 else T.fifth_note(name, r + 1)
                pizz.add(bs(bar) + 2, p3, 1.0, vel=0.5)
            bass.add(bs(bar) + b0, r, ln, vel=0.48)
            low.chord(bs(bar) + b0, T.tones(name, 45, 62)[:3], ln, vel=0.4 if bar < 9 else 0.46)
            if 9 <= bar <= 16 or bar >= 25:
                mid.chord(bs(bar) + b0, T.tones(name, 57, 72)[:3], ln, vel=0.38)
            if 9 <= bar <= 16 or bar >= 25:
                choir.chord(bs(bar) + b0, T.tones(name, 55, 67)[:3], ln, vel=0.34)
        if bar % 4 == 1:
            bell.add(bs(bar), 'd3', 4.0, vel=0.72 if bar not in (9, 25) else 0.6)
    # bar 16 and bar 32: a soft upper pizz on beat 4 walks into the next bar
    pizz.add(bs(16) + 3, 'c#3', 1.0, vel=0.44)
    pizz.add(bs(32) + 3, 'c#3', 1.0, vel=0.44)

    # ---- water drops: sparse in A, fewer in B, more in the deep (C) ----------------------------------------------------------
    rng = np.random.default_rng(8004)
    scale = [74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93]     # D Dorian, D5 .. A6
    for bar in range(1, 33):
        k = 1 if 9 <= bar <= 16 else (4 if bar >= 25 else 2)
        k += int(rng.random() < 0.35)
        slots = sorted(rng.choice(np.arange(0, 16), size=k, replace=False))
        for sl in slots:
            if sl == 0 and bar % 4 == 1:
                continue                       # leave the bell's downbeat alone
            drop.add(bs(bar) + sl * 0.25 + 0.03 * rng.random(), int(rng.choice(scale)) + 12, 0.1,
                     vel=0.3 + 0.4 * rng.random(), pan=float(rng.uniform(-0.6, 0.6)))
    return s
