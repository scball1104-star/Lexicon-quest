"""emberpeak: "Bellows Square" (the town before the bell: emberpeak and its pk_* interiors). D dorian, 104 BPM, 4/4,
32 bars (73.8 s), loops.

The First Bell theme (e3_theme.py), muted. Low strings, a hammered dulcimer, measured anvil strikes, brass held
back to a soft pedal. The town has lost its bell, so the music has a hole in it: on the downbeat of every fourth bar
(1, 5, 9, ...) where a toll would fall, the bass, anvil and timpani all rest. And the name motif (D A B, degrees 0 4 5
of D dorian) is played by the dulcimer with the fourth note replaced by a rest, every time.

Form
  A    1-8    dulcimer plays the theme with the fourth note missing (bars 2 and 6); strings_low pad; anvil on beat 3
  A'   9-16   the theme on high strings, the dulcimer turns to a quiet arpeggio under it; the same hole in the motif
  B    17-24  Bb, F, Gm, Dm / Bb, F, Gm, A: the dulcimer's own tune climbs, a soft horn pedal, a faint choir
  A''  25-32  the theme thins out again; in bars 29-30 the motif stops on its third note and the pad hangs open
Chords (A): Dm, Dm, C, G, Dm, Am, G, Dm (A'' ends on A, so the loop falls back into Dm).
"""
from tracker import Song
import e3_theme as T

TONIC = 74          # D5
MODE = 'dorian'
A_CH = ['Dm', 'Dm', 'C', 'G', 'Dm', 'Am', 'G', 'Dm']
B_CH = ['Bb', 'F', 'Gm', 'Dm', 'Bb', 'F', 'Gm', 'A']
BARS = A_CH + A_CH + B_CH + A_CH[:-1] + ['A']

B_TUNE = ['f5/2 d5/1 f5/1', 'a5/2 c6/2', 'bb5/1.5 a5/0.5 g5/1 f5/1', 'd5/4',
          'f5/2 g5/1 a5/1', 'c6/2 a5/1 f5/1', 'g5/1.5 bb5/0.5 a5/2', 'g5/1 e5/1 c#5/1 a4/1']


def build():
    s = Song('emberpeak', bpm=104, beats_per_bar=4, bars=32, key='D dorian', title='Bellows Square',
             reverb_room=0.86, reverb_damp=0.4, reverb_len=3.6, reverb_level=-8.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.25, delay_level=-18.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    dulc = s.track('dulcimer', 'dulcimer', volume=-4.0, pan=0.15, reverb=0.3, delay=0.2, role='melody', vel=0.66, gate=0.95, humanize_ms=5)
    arp = s.track('dulcimer arp', 'dulcimer', volume=-3.0, pan=-0.3, reverb=0.35, delay=0.25, role='arp', vel=0.4, gate=0.9, humanize_ms=6, vel_jitter=0.03)
    hi = s.track('high strings', 'strings_high', volume=-8.0, pan=0.1, reverb=0.45, role='melody', vel=0.5, gate=0.98, width=0.6)
    low = s.track('low strings', 'strings_low', volume=-21.0, reverb=0.4, role='pad', vel=0.42, gate=1.0, width=0.7)
    mid = s.track('strings', 'strings', volume=-22.0, reverb=0.45, role='pad', vel=0.4, gate=1.0, width=0.9)
    bass = s.track('bass', 'bass', volume=-18.0, reverb=0.05, role='bass', vel=0.55, gate=0.9)
    anvil = s.track('anvil', 'anvil', volume=-14.0, pan=-0.1, reverb=0.4, role='perc', pitched=False, vel=0.5)
    timp = s.track('timpani', 'lowdrum', volume=-13.0, reverb=0.35, role='perc', vel=0.5)
    horn = s.track('horn', 'horn', volume=-13.0, pan=-0.2, reverb=0.45, role='pad', vel=0.4, gate=1.0)
    choir = s.track('choir', 'choir', volume=-21.0, reverb=0.55, role='pad', vel=0.4, gate=1.0)

    def toll_bar(bar):
        return bar % 4 == 1

    # ---- melody: the theme, always without its fourth note; A'' is the same, thinner ------------------------------
    for bar, beat, p, dur, fourth in T.theme(TONIC, MODE, 1, drop_fourth=True):
        dulc.add(bs(bar) + beat, p, dur * 0.95 if dur < 2 else dur, vel=0.7)
    for bar, beat, p, dur, fourth in T.theme(TONIC, MODE, 9, drop_fourth=True):
        hi.add(bs(bar) + beat, p - 12 if p > 80 else p, dur, vel=0.5)
        if beat == 0.0 or beat == 2.0:
            dulc.add(bs(bar) + beat, p - 12, dur, vel=0.4)
    for bar, beat, p, dur, fourth in T.theme(TONIC, MODE, 25, drop_fourth=True):
        if bar >= 31:
            continue
        # the motif in bars 29-30 stops on its third note and the pad hangs
        dulc.add(bs(bar) + beat, p, dur if bar < 29 else 1.0, vel=0.62 - 0.03 * (bar - 25))
    dulc.add(bs(31), 'a5', 2.0, vel=0.42)
    dulc.add(bs(32) + 2.0, 'e5', 2.0, vel=0.34)

    for i, pat in enumerate(B_TUNE):
        dulc.seq(bar=17 + i, pattern=pat, vel=0.7)
    hi.seq(bar=21, pattern='d6/4 | c6/4 | bb5/2 a5/2 | c#6/4', vel=0.44)

    # ---- accompaniment ---------------------------------------------------------------------------------------------
    for bar in range(1, 33):
        name = BARS[bar - 1]
        low.chord(bs(bar), T.tones(name, 43, 62)[:3], 4.0, vel=0.38 if bar < 9 else 0.46)
        if bar >= 9:
            mid.chord(bs(bar), T.tones(name, 57, 72)[:3], 4.0, vel=0.34 if bar < 17 else 0.42)
        # bass: beat 1 unless a toll should fall; then it comes in on beat 2
        r = T.root_note(name, 31)
        if toll_bar(bar):
            bass.add(bs(bar) + 1, r, 1.0, vel=0.5)
            bass.add(bs(bar) + 3, T.fifth_note(name, 38), 1.0, vel=0.42)
        else:
            bass.add(bs(bar), r, 1.5, vel=0.58)
            bass.add(bs(bar) + 2, r, 1.0, vel=0.46)
            bass.add(bs(bar) + 3, T.fifth_note(name, 38), 1.0, vel=0.4)
        # the anvil: a measured strike on beat 3 every bar, and on beat 1 except where the bell should toll
        anvil.add(bs(bar) + 2, 'd5', 0.5, vel=0.42)
        if not toll_bar(bar) and bar % 2 == 0:
            anvil.add(bs(bar), 'a4', 0.5, vel=0.55)
        # timpani under B and the last A
        if (17 <= bar <= 24 or bar >= 27) and not toll_bar(bar):
            timp.add(bs(bar), T.root_note(name, 29), 1.0, vel=0.46)
    # dulcimer arpeggio under A' and A''
    for bar in list(range(9, 17)) + list(range(25, 31)):
        name = BARS[bar - 1]
        t = T.tones(name, 50, 70)
        fig = [t[0], t[1], t[2], t[1], t[0], t[1], t[2], t[3] if len(t) > 3 else t[1]]
        for i, p in enumerate(fig):
            arp.add(bs(bar) + 0.5 * i, p, 0.5, vel=0.38 + (0.06 if i % 4 == 0 else 0.0))
    for bar in range(17, 25):
        name = BARS[bar - 1]
        if bar >= 21:
            horn.add(bs(bar), T.tones(name, 50, 62)[0] + 12, 4.0, vel=0.38 + 0.02 * (bar - 21))
        choir.chord(bs(bar), T.tones(name, 55, 68)[:3], 4.0, vel=0.34)
    for bar in range(29, 33):
        horn.add(bs(bar), 'd4' if bar < 32 else 'e4', 4.0, vel=0.34)
    return s
