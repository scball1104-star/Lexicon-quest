"""foundry: "The Ashen Foundry" (foundry_f1, foundry_f2). E phrygian, 88 BPM, 4/4, 32 bars (87.3 s), loops.

An ostinato built from hammer and anvil hits (a sixteenth-note figure on two tuned anvils and a low drum) and a steam
valve hissing every four bars, over a low brass pedal on E that never moves. Above the heat a cold flute plays the name
motif in long notes, augmented: E B C# A, four beats each, the C# a major third against the foundry's F chord (the
Phrygian second) so it rings icy against the warmth.

Form
  A    1-8    Em, Em, F, Em, Em, F, G, F: anvil figure, pedal and steam; the flute enters in bar 5 with the motif
  B    9-16   Am, F, Em, F, Dm, C, F, E: low strings and timpani, the glass pad; the flute stays in long notes
  C    17-24  F, G, F, Em, F, G, Am, E: the heat peaks: brass stabs on the anvil accents, choir, the motif high again
  A'   25-32  Em, Em, F, Em, Em, F, F, E: the foundry cools; the flute's motif once more, then it fades into the loop
"""
from tracker import Song
import e3_theme as T

A = ['Em', 'Em', 'F', 'Em', 'Em', 'F', 'G', 'F']
B = ['Am', 'F', 'Em', 'F', 'Dm', 'C', 'F', 'E']
C = ['F', 'G', 'F', 'Em', 'F', 'G', 'Am', 'E']
A2 = ['Em', 'Em', 'F', 'Em', 'Em', 'F', 'F', 'E']
BARS = A + B + C + A2

# sixteenth slots (0..15) of the bar that carry a strike, with their strengths
FIGURE = {0: 0.85, 3: 0.5, 6: 0.55, 8: 0.7, 10: 0.45, 14: 0.5}


def build():
    s = Song('foundry', bpm=88, beats_per_bar=4, bars=32, key='E phrygian', title='The Ashen Foundry',
             reverb_room=0.82, reverb_damp=0.4, reverb_len=3.0, reverb_level=-9.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.22, delay_level=-20.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    flute = s.track('cold flute', 'flute', volume=-12.0, pan=0.2, reverb=0.55, delay=0.25, role='melody', vel=0.66, gate=1.0)
    anvil = s.track('anvil', 'anvil', volume=-4.0, pan=-0.1, reverb=0.35, role='perc', pitched=False, vel=0.55)
    anvil2 = s.track('anvil low', 'anvil', volume=-6.0, pan=0.15, reverb=0.35, role='perc', pitched=False, vel=0.5)
    drum = s.track('hammer drum', 'lowdrum', volume=-9.0, reverb=0.3, role='perc', vel=0.5)
    steam = s.track('steam valve', 'steam', volume=-4.0, pan=0.3, reverb=0.4, role='perc', pitched=False, vel=0.4)
    pedal = s.track('brass pedal', 'brass', volume=-13.0, reverb=0.4, role='pad', vel=0.4, gate=1.0)
    stab = s.track('brass stabs', 'brass', volume=-10.0, pan=-0.05, reverb=0.35, role='pad', vel=0.7, gate=0.45)
    low = s.track('low strings', 'strings_low', volume=-13.0, reverb=0.4, role='pad', vel=0.46, gate=1.0, width=0.7)
    glass = s.track('glass pad', 'glasspad', volume=-20.0, reverb=0.6, role='pad', vel=0.4, gate=1.0)
    bass = s.track('bass', 'bass', volume=-12.0, reverb=0.05, role='bass', vel=0.58, gate=0.7)
    choir = s.track('choir', 'choir', volume=-19.0, reverb=0.55, role='pad', vel=0.5, gate=1.0)

    # ---- the cold flute: the motif augmented ------------------------------------------------------------------
    flute.seq(bar=5, pattern='e5/4 b5/4 c#6/4 a5/4', vel=0.64)
    flute.seq(bar=9, pattern='f5/4 e5/4 | b5/8', vel=0.66)
    flute.seq(bar=13, pattern='a5/4 g5/4 | f5/4 e5/4', vel=0.66)
    flute.seq(bar=17, pattern='e6/4 b5/4 c#6/4 a5/4', vel=0.78)
    flute.seq(bar=21, pattern='g6/4 f6/4 | e6/8', vel=0.74)
    flute.seq(bar=25, pattern='e5/4 b5/4 c#6/4 a5/4', vel=0.6)
    flute.seq(bar=29, pattern='g5/4 f5/4 | e5/8', vel=0.5)

    # ---- the foundry: ostinato, pedal, steam ---------------------------------------------------------------------------
    for bar in range(1, 33):
        name = BARS[bar - 1]
        ramp = 0.7 if bar <= 2 else (1.0 if bar < 25 else 0.8)
        hi_pitch = 'e5' if bar % 2 else 'b4'
        for slot, v in FIGURE.items():
            t = bs(bar) + slot * 0.25
            if bar <= 2 and slot not in (0, 8):
                continue
            anvil.add(t, hi_pitch if slot in (0, 8, 14) else 'f#5', 0.25, vel=v * ramp)
        if bar >= 3:
            anvil2.add(bs(bar) + 0.75, 'a4', 0.25, vel=0.45 * ramp)
            anvil2.add(bs(bar) + 2.25, 'e4', 0.25, vel=0.4 * ramp)
        if bar >= 3:
            drum.add(bs(bar), 'e2', 0.5, vel=0.6 * ramp)
            drum.add(bs(bar) + 2.0, 'e2', 0.5, vel=0.48 * ramp)
            drum.add(bs(bar) + 3.5, 'e2', 0.5, vel=0.4 * ramp)
        if bar % 4 == 3:
            steam.add(bs(bar) + 2.0, 'e5', 1.6, vel=0.45)
        pedal.add(bs(bar), 'e1' if bar % 2 else 'e2', 4.0, vel=0.38 + (0.1 if 17 <= bar <= 24 else 0.0))
        bass.add(bs(bar), 'e2', 0.75, vel=0.6)
        bass.add(bs(bar) + 1.5, 'e2', 0.5, vel=0.46)
        bass.add(bs(bar) + 2.0, 'e2' if bar % 2 else 'b1', 0.75, vel=0.52)
        if bar >= 9:
            low.chord(bs(bar), T.tones(name, 43, 62)[:3], 4.0, vel=0.5 if bar < 25 else 0.4)
        if 9 <= bar <= 28:
            glass.chord(bs(bar), T.tones(name, 67, 84)[:2], 4.0, vel=0.36)
        if 17 <= bar <= 24:
            choir.chord(bs(bar), T.tones(name, 55, 68)[:3], 4.0, vel=0.5)
            for slot in (0.0, 2.0):
                stab.chord(bs(bar) + slot, T.tones(name, 48, 63)[:3], 0.5, vel=0.8)
    return s
