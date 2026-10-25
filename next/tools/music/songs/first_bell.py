"""first_bell: "The First Bell" (Emberpeak after the bell is restored, the end of warden_after, the Episode 3 credits).
D major, 104 BPM, 4/4, 32 bars (73.8 s), loops.

The emberpeak tune, complete. The same First Bell theme (e3_theme.py) in major: horn and high strings carry it,
a choir holds the harmony, and a real bell strikes on every downbeat of the A sections (bars 1-8 and 25-32). The
name motif (D A B G) finally gets its fourth note: in bars 1 and 5 of each A section the G is not played by any
melody instrument, it is the bell, struck loud on beat 4 while the voices rest around it.

Form
  A    1-8    horn and high strings, bell on every downbeat, the bell's own G lands the motif (bars 1 and 5)
  A'   9-16   glockenspiel and harp turn the theme over; the bell tolls on every other bar, softer
  B    17-24  Bm, G, D/F#, A, Bm, G, Em7, A: the theme's family climbs to a high E over brass stabs (bar 20)
  A''  25-32  tutti: brass, choir, horn and strings; the bell on every downbeat again, the last one ringing into bar 1
Chords (A): D, D, G, Em7, D, Bm, G, A7sus4.
"""
from tracker import Song
import e3_theme as T

TONIC = 74          # D5 (high strings, glockenspiel); the horn plays an octave under
MODE = 'major'
A_CH = ['D', 'D', 'G', 'Em7', 'D', 'Bm', 'G', 'A7sus4']
B_CH = ['Bm', 'G', 'D/F#', 'A', 'Bm', 'G', 'Em7', 'A']
BARS = A_CH + A_CH + B_CH + A_CH

B_TUNE = ['f#5/1.5 e5/0.5 d5/1 f#5/1', 'b5/2 a5/1 g5/1', 'a5/1 f#5/1 a5/2', 'c#6/2 e6/2',
          'd6/1.5 c#6/0.5 b5/1 a5/1', 'b5/2 g5/1 e5/1', 'g5/1 a5/1 b5/1 d6/1', 'c#6/2 e6/1 a5/1']


def build():
    s = Song('first_bell', bpm=104, beats_per_bar=4, bars=32, key='D major', title='The First Bell',
             reverb_room=0.86, reverb_damp=0.3, reverb_len=3.6, reverb_level=-8.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.25, delay_level=-17.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    horn = s.track('horn', 'horn', volume=-9.0, pan=-0.2, reverb=0.4, role='melody', vel=0.7, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-3.0, pan=0.1, reverb=0.4, role='melody', vel=0.62, gate=0.98, width=0.6)
    brass = s.track('brass', 'brass', volume=-9.0, pan=0.05, reverb=0.35, role='melody', vel=0.7, gate=0.9)
    glock = s.track('glockenspiel', 'glock', volume=-8.0, pan=0.35, reverb=0.4, delay=0.15, role='melody', vel=0.55, humanize_ms=3)
    harp = s.track('harp', 'harp', volume=-3.0, pan=-0.35, reverb=0.35, role='arp', humanize_ms=6, vel_jitter=0.04, vel=0.5)
    bell = s.track('bell', 'bell', volume=-1.0, pan=0.0, reverb=0.55, role='perc', vel=0.7)
    mid = s.track('strings', 'strings', volume=-16.0, reverb=0.45, role='pad', vel=0.46, gate=1.0, width=0.9)
    low = s.track('low strings', 'strings_low', volume=-17.0, reverb=0.35, role='pad', vel=0.5, gate=1.0, width=0.6)
    choir = s.track('choir', 'choir', volume=-13.0, reverb=0.55, role='pad', vel=0.5, gate=1.0)
    bass = s.track('bass', 'bass', volume=-15.0, reverb=0.05, role='bass', vel=0.58, gate=0.9)
    timp = s.track('timpani', 'lowdrum', volume=-13.0, reverb=0.35, role='perc', vel=0.55)

    def bell_hits(bar_from, bar_to, every=1, v=0.72):
        for bar in range(bar_from, bar_to + 1):
            if (bar - bar_from) % every:
                continue
            name = BARS[bar - 1]
            p = T.root_note(name.split('/')[0] if '/' not in name else name, 45)
            bell.add(bs(bar), p, 3.5, vel=v)

    # ---- A: horn + strings carry the theme; the fourth note is the bell's -------------------------------------
    for bar, beat, p, dur, fourth in T.theme(TONIC, MODE, 1):
        if fourth:
            bell.add(bs(bar) + beat, 'g3', 3.5, vel=0.95)         # the G of D A B G, struck on the bell
            continue
        horn.add(bs(bar) + beat, p - 12, dur, vel=0.72)
        hi.add(bs(bar) + beat, p, dur, vel=0.6)
    bell_hits(1, 8)
    # ---- A': strings and glockenspiel, the bell on every other bar -------------------------------------------------
    for bar, beat, p, dur, fourth in T.theme(TONIC, MODE, 9):
        if fourth:
            bell.add(bs(bar) + beat, 'g3', 3.0, vel=0.8)
            continue
        hi.add(bs(bar) + beat, p, dur, vel=0.66)
        glock.add(bs(bar) + beat, p + 12, min(dur, 1.0), vel=0.5)
        if beat in (0.0, 2.0):
            horn.add(bs(bar) + beat, p - 17 if p > 76 else p - 10, dur, vel=0.5)
    bell_hits(9, 16, every=2, v=0.55)
    # ---- B: the climb over brass stabs --------------------------------------------------------------------------------
    for i, pat in enumerate(B_TUNE):
        hi.seq(bar=17 + i, pattern=pat, vel=0.7)
        brass.seq(bar=17 + i, pattern=pat.replace('5', '4').replace('6', '5'), vel=0.68)
        glock.seq(bar=17 + i, pattern=pat.replace('5', '6').replace('4', '5'), vel=0.4)
    for bar in (20, 24):
        brass.chord(bs(bar) + 2, T.tones(BARS[bar - 1], 55, 70)[:4], 1.5, vel=0.8)
        timp.add(bs(bar) + 2, T.root_note(BARS[bar - 1], 33), 1.0, vel=0.8)
    bell_hits(17, 24, every=4, v=0.6)
    # ---- A'': tutti -----------------------------------------------------------------------------------------------------
    for bar, beat, p, dur, fourth in T.theme(TONIC, MODE, 25):
        if fourth:
            bell.add(bs(bar) + beat, 'g3', 3.5, vel=1.0)
            continue
        horn.add(bs(bar) + beat, p - 12, dur, vel=0.8)
        hi.add(bs(bar) + beat, p, dur, vel=0.66)
        brass.add(bs(bar) + beat, p - 12, dur, vel=0.62)
        glock.add(bs(bar) + beat, p + 12, min(dur, 1.0), vel=0.5)
    bell_hits(25, 32, v=0.8)

    # ---- accompaniment ------------------------------------------------------------------------------------------------------
    for bar in range(1, 33):
        name = BARS[bar - 1]
        low.chord(bs(bar), T.tones(name, 43, 62)[:3], 4.0, vel=0.48)
        mid.chord(bs(bar), T.tones(name, 57, 72)[:3], 4.0, vel=0.42 if bar < 17 else 0.5)
        if bar >= 5:
            choir.chord(bs(bar), T.tones(name, 55, 68)[:3], 4.0, vel=0.46 if bar < 25 else 0.58)
        r = T.root_note(name, 31)
        bass.add(bs(bar), r, 2.0, vel=0.58)
        bass.add(bs(bar) + 2, T.fifth_note(name, 38), 1.0, vel=0.46)
        bass.add(bs(bar) + 3, r + 12 if r < 43 else r, 0.9, vel=0.42)
        if bar % 4 == 1 or bar >= 25:
            timp.add(bs(bar), T.root_note(name, 29), 1.0, vel=0.55 if bar < 25 else 0.65)
        if bar >= 9:
            t = T.tones(name, 50, 70)
            fig = [t[0], t[1], t[2], t[1]]
            for i, p in enumerate(fig):
                harp.add(bs(bar) + 1.0 + 0.5 * i if bar % 2 else bs(bar) + 2.0 + 0.5 * i, p, 0.5, vel=0.44, gate=1.6)
    return s
