"""valewyn: "The Drowned Crown" (Valewyn and its ep4_vw_* interiors, crown_remembers, the Episode 4 credits).
A minor to C major, 90 BPM, 4/4, 32 bars (85.3 s), loops. Manifest id `valewyn`, file ep4_valewyn.mp3.

The root region-4 brief, for the tracker: flowing harp, lyrical strings, soft flute, a celesta like water. Minor and
rain-soft until the B section lifts into C major. The name motif is the celesta's, C G A F, and its last note is held
under the bar line for a whole bar, like a held breath; the F becomes the root of the chord that follows (Fmaj7 in A
minor, F/A in C major), so the breath is let go into the next harmony. The same four pitches are 1 5 6 4 in C major and
b3 b7 1 b6 in A minor: the motif does not change between the sections, the city around it does.

Form
  A    1-8    Am, Fmaj7, C, Gsus4-G / Am, Fmaj7, Dm7, E7sus4-E7: celesta motif (bars 1 and 5), the flute answers
  A'   9-16   Am, Fmaj7, C/G, D/F#, Fmaj7, C/E, Dm7, E7: high strings sing, glass drops of rain, the flute is silent
  B    17-24  C, F/A, G/B, C, F, C/E, Dm7, Gsus4-G: the lift. ep4_theme.TUNE in C major: celesta motif, flute answer
  B'   25-28  C, G/B, Am7, Fmaj7: flute and high strings in octaves, harp in sixteenths, a faint choir
  T    29-32  Dm7, Am/C, Bbmaj7, E7sus4-E7: back under the water; the motif once more, its held F sinking to E
"""
import numpy as np

from tracker import Song
import e3_theme as T
import ep4_theme as V

A_CH = [[(0, 'Am')], [(0, 'Fmaj7')], [(0, 'C')], [(0, 'Gsus4'), (2, 'G')],
        [(0, 'Am')], [(0, 'Fmaj7')], [(0, 'Dm7')], [(0, 'E7sus4'), (2, 'E7')]]
A2_CH = [[(0, 'Am')], [(0, 'Fmaj7')], [(0, 'C/G')], [(0, 'D/F#')],
         [(0, 'Fmaj7')], [(0, 'C/E')], [(0, 'Dm7')], [(0, 'E7')]]
B_CH = [[(0, 'C')], [(0, 'F/A')], [(0, 'G/B')], [(0, 'C')], [(0, 'F')], [(0, 'C/E')], [(0, 'Dm7')],
        [(0, 'Gsus4'), (2, 'G')]]
B2_CH = [[(0, 'C')], [(0, 'G/B')], [(0, 'Am7')], [(0, 'Fmaj7')]]
T_CH = [[(0, 'Dm7')], [(0, 'Am/C')], [(0, 'Bbmaj7')], [(0, 'E7sus4'), (2, 'E7')]]
BARS = A_CH + A2_CH + B_CH + B2_CH + T_CH
assert len(BARS) == 32
INTENDED = [b[0][1] for b in BARS]

FLUTE_A = {2: 'r/3 e5/0.5 f5/0.5', 3: 'g5/1.5 e5/0.5 c5/1 d5/1', 4: 'c5/2 b4/1.5 r/0.5',
           6: 'r/3 c5/0.5 e5/0.5', 7: 'f5/1.5 e5/0.5 d5/1 c5/1', 8: 'a4/2 g#4/1.5 r/0.5'}
STRINGS_A2 = ['e5/3 c5/1', 'a5/2 g5/1 f5/1', 'e5/2 g5/2', 'f#5/3 a5/1',
              'c6/2 b5/1 a5/1', 'g5/2 e5/1 c5/1', 'f5/1.5 e5/0.5 d5/1 c5/1', 'b4/2 g#4/1 b4/1']
TUTTI_B2 = ['e6/3 d6/1', 'd6/2 b5/1 g5/1', 'c6/2 a5/1 e5/1', 'a5/2 g5/1 e5/1']
MOTIF = 'c5/1 g5/1 a5/1 f5/4'          # the held F: four beats, across the bar line


def segments(bar):
    """[(start_beat_in_bar, length, chord)] for one bar."""
    segs = BARS[bar - 1]
    out = []
    for i, (b, name) in enumerate(segs):
        end = segs[i + 1][0] if i + 1 < len(segs) else 4
        out.append((b, end - b, name))
    return out


def build():
    s = Song('ep4_valewyn', bpm=90, beats_per_bar=4, bars=32, key='A minor', title='The Drowned Crown',
             reverb_room=0.88, reverb_damp=0.35, reverb_len=4.0, reverb_level=-7.5,
             delay_beats=(0.75, 0.5), delay_feedback=0.3, delay_level=-15.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=INTENDED)
    bs = s.bar_start

    cel = s.track('celesta', 'celesta', volume=-6.0, pan=0.25, reverb=0.5, delay=0.3, role='melody', vel=0.68, gate=1.0)
    flute = s.track('flute', 'flute', volume=-9.0, pan=-0.15, reverb=0.42, delay=0.1, role='melody', vel=0.62, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-6.0, pan=0.1, reverb=0.45, role='melody', vel=0.56, gate=1.02, width=0.6)
    harp = s.track('harp', 'harp', volume=-4.0, pan=-0.3, reverb=0.4, role='arp', humanize_ms=5, vel_jitter=0.04, vel=0.44)
    glass = s.track('rain glass', 'glass', volume=-17.0, pan=0.45, reverb=0.6, delay=0.35, role='perc', vel=0.3)
    mid = s.track('strings', 'strings', volume=-18.0, reverb=0.5, role='pad', vel=0.42, gate=1.0, width=0.9)
    low = s.track('low strings', 'strings_low', volume=-19.0, reverb=0.4, role='pad', vel=0.44, gate=1.0, width=0.6)
    choir = s.track('choir', 'choir', volume=-20.0, reverb=0.6, role='pad', vel=0.4, gate=1.0)
    bass = s.track('bass', 'bass', volume=-17.0, reverb=0.05, role='bass', vel=0.52, gate=0.92)

    # ---- A: the celesta motif with its held note, the flute answers ----------------------------------------------
    for bar in (1, 5):
        cel.seq(bar=bar, pattern=MOTIF, vel=0.7)
    for bar, pat in FLUTE_A.items():
        flute.seq(bar=bar, pattern=pat, vel=0.6)
    # ---- A': the strings sing, the flute rests -----------------------------------------------------------------------
    for i, pat in enumerate(STRINGS_A2):
        hi.seq(bar=9 + i, pattern=pat, vel=0.58 + (0.04 if i in (3, 4) else 0.0))
    # ---- B: the lift; the theme in C major (celesta motif, flute answer, strings an octave under from bar 19) -------
    for bar, beat, p, dur, motif in V.tune(72, 'major', 17):
        if motif:
            cel.add(bs(bar) + beat, p, dur, vel=0.74)
            continue
        flute.add(bs(bar) + beat, p, dur, vel=0.64)
        if bar >= 19:
            hi.add(bs(bar) + beat, p - 12, dur, vel=0.46)
    # ---- B': flute and strings in octaves ------------------------------------------------------------------------------
    for i, pat in enumerate(TUTTI_B2):
        flute.seq(bar=25 + i, pattern=pat, vel=0.66)
        hi.seq(bar=25 + i, pattern=pat.replace('6', '#').replace('5', '4').replace('#', '5'), vel=0.6)
    # ---- T: the motif once more; its held F sinks to E, then Bbmaj7 and the dominant ------------------------------------
    cel.seq(bar=29, pattern='c5/1 g5/1 a5/1 f5/3', vel=0.62)
    flute.seq(bar=30, pattern='r/2 e5/2', vel=0.5)
    flute.seq(bar=31, pattern='f5/2 d5/1 a4/1', vel=0.52)
    flute.seq(bar=32, pattern='a4/2 g#4/2', vel=0.5)
    hi.seq(bar=31, pattern='d5/4 | b4/2 g#4/2', vel=0.4)

    # ---- accompaniment ------------------------------------------------------------------------------------------------
    rain = np.random.default_rng(4004)
    for bar in range(1, 33):
        in_b = 17 <= bar <= 28
        for b0, ln, name in segments(bar):
            low_v = 0.0 if bar < 9 else (0.44 if not in_b else 0.5)
            mid.chord(bs(bar) + b0, T.tones(name, 57, 72)[:3], ln, vel=0.38 if bar < 17 else (0.48 if bar < 29 else 0.4))
            if low_v:
                low.chord(bs(bar) + b0, T.tones(name, 43, 60)[:3], ln, vel=low_v)
            if 17 <= bar <= 28:
                choir.chord(bs(bar) + b0, T.tones(name, 55, 69)[:3], ln, vel=0.34 if bar < 25 else 0.46)
            r = T.root_note(name, 33)
            bass.add(bs(bar) + b0, r, min(ln, 2.0), vel=0.5 if not in_b else 0.56)
            if ln == 4:
                bass.add(bs(bar) + 2, T.fifth_note(name, 38) if bar % 2 else r + 12, 2.0, vel=0.42)
        # harp: a flowing arpeggio, root below then the chord climbing and falling (eighths; sixteenths in B')
        for b0, ln, name in segments(bar):
            tt = T.tones(name, 52, 81)
            root = T.root_note(name, 40)
            up = tt[:5]
            fig = [root] + up + up[-2:0:-1]
            step = 0.25 if 25 <= bar <= 28 else 0.5
            n = int(round(ln / step))
            for i in range(n):
                p = fig[i % len(fig)]
                v = 0.42 + (0.07 if i == 0 else 0.0) + (0.04 if in_b else 0.0)
                harp.add(bs(bar) + b0 + i * step, p, step, vel=v, gate=2.2)
        # rain: two or three glass drops a bar outside the lift, high chord tones on the off-sixteenths
        if not in_b or bar in (24, 28):
            name = segments(bar)[0][2]
            hi_t = T.tones(name, 84, 100)
            k = 2 + (bar % 3 == 0)
            slots = sorted(rain.choice(np.arange(1, 16, 2), size=k, replace=False))
            for sl in slots:
                glass.add(bs(bar) + sl * 0.25, int(rain.choice(hi_t)), 0.25, vel=0.22 + 0.1 * rain.random())
    return s
