"""saffron: "The Moonwell Caravanserai" (Saffron Haven and its ep5_sh_* interiors, haven_arrival, every_road, the
Episode 5 credits). D minor (the harmonic minor's raised C# only in the dominant), 92 BPM, 4/4, 32 bars (83.5 s), loops.
Manifest id `saffron`, file ep5_saffron.mp3.

The root region-5 brief, for the tracker: plucked strings in an oud-like register, hand percussion, a breathy flute,
spacious string pads. Night-quiet A sections, a warmer B section for the caravans. The desert is in the instruments and
the mode, not in a scale run: the harmonic minor's augmented second (Bb to C#) never sounds as a melodic step; C# appears
only as the leading tone inside the A7 chord and the flute's climb to it.

The name motif is the oud's: F C D Bb, from the third of D minor (the same four pitches are 1 5 6 4 in F major), and its
fourth note is bent down a half step onto A, the fifth of the key, as the bar line passes and the harmony under it
moves to Bbmaj7: the held Bb was the chord's root, the bent A its major seventh. A town that sighs at the end of every
phrase. In the B section the tune (ep5_theme.TUNE, F major) has the same four notes, held, not bent: the caravans.

Form
  A    1-8    Dm, Bbmaj7, Gm, A7sus4-A7 / Dm, Bbmaj7, Gm7-Em7b5, A7sus4-A7: the oud motif (bars 1 and 5) and its bend,
              the flute (a breathy, ney-like bone flute) answers; frame drum on the downbeat only; a few stars (glass)
  A'   9-16   Dm, Gm/D, Bb, A7, Dm, F/C, Gm, Gm7-C7: the flute's long night melody, the oud walks in eighths
  B    17-24  F, Gm7, Bbmaj7, C, Dm7, Gm, F-Gm7, Csus4-C: the Saffron tune, oud motif, flute answer, strings an octave
              under from bar 19, the caravan rhythm on the frame drums and a shaker
  B'   25-28  Bb, F/A, Gm, A7: flute and high strings in octaves, back toward D minor
  T    29-32  Dm, Bbmaj7, Gm6, A7sus4-A7: the motif once more on the oud, bent; quiet; the A7 falls into bar 1
"""
import numpy as np

from tracker import Song
import e3_theme as T
import ep5_theme as E

A_CH = [[(0, 'Dm')], [(0, 'Bbmaj7')], [(0, 'Gm')], [(0, 'A7sus4'), (2, 'A7')],
        [(0, 'Dm')], [(0, 'Bbmaj7')], [(0, 'Gm7'), (2, 'Em7b5')], [(0, 'A7sus4'), (2, 'A7')]]
A2_CH = [[(0, 'Dm')], [(0, 'Gm/D')], [(0, 'Bb')], [(0, 'A7')],
         [(0, 'Dm')], [(0, 'F/C')], [(0, 'Gm')], [(0, 'Gm7'), (2, 'C7')]]
B_CH = E.CHORDS_MAJOR
B2_CH = [[(0, 'Bb')], [(0, 'F/A')], [(0, 'Gm')], [(0, 'A7')]]
T_CH = [[(0, 'Dm')], [(0, 'Bbmaj7')], [(0, 'Gm6')], [(0, 'A7sus4'), (2, 'A7')]]
BARS = A_CH + A2_CH + B_CH + B2_CH + T_CH
assert len(BARS) == 32
INTENDED = [b[0][1] for b in BARS]
BEAT = 60.0 / 92.0

# the motif on the oud: F C D on beats 1-3, Bb on beat 4 held into the next bar, where it bends to A
MOTIF_HEAD = 'f4/1 c5/1 d5/1'
FLUTE_A = {3: 'r/1 d5/1.5 c5/0.5 bb4/1', 4: 'a4/2 r/0.5 g4/0.5 f4/0.5 e4/0.5',
           7: 'bb4/1.5 a4/0.5 g4/1 bb4/1', 8: 'a4/2.5 r/0.5 c#5/0.5 e5/0.5'}
FLUTE_A2 = ['f5/2 e5/1 d5/1', 'd5/1.5 bb4/0.5 g4/1.5 r/0.5', 'f4/1 bb4/1 d5/1 f5/1', 'e5/2 c#5/1 a4/0.5 r/0.5',
            'd5/1.5 e5/0.5 f5/1 a5/1', 'g5/2 f5/1 c5/0.5 r/0.5', 'd5/1.5 c5/0.5 bb4/1 g4/1', 'bb4/2 c5/1 e5/0.5 r/0.5']
TUTTI_B2 = ['d5/3 f5/1', 'c5/2 a4/1 c5/1', 'bb4/1.5 a4/0.5 g4/1 d5/1', 'c#5/2 a4/2']


def segments(bar):
    """[(start_beat_in_bar, length, chord)] for one bar."""
    segs = BARS[bar - 1]
    out = []
    for i, (b, name) in enumerate(segs):
        end = segs[i + 1][0] if i + 1 < len(segs) else 4
        out.append((b, end - b, name))
    return out


def section(bar):
    return 'A' if bar <= 8 else "A'" if bar <= 16 else 'B' if bar <= 24 else "B'" if bar <= 28 else 'T'


def build():
    s = Song('ep5_saffron', bpm=92, beats_per_bar=4, bars=32, key='D minor', title='The Moonwell Caravanserai',
             reverb_room=0.9, reverb_damp=0.3, reverb_len=4.2, reverb_level=-8.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.28, delay_level=-17.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=INTENDED)
    bs = s.bar_start

    oud = s.track('oud', E.Oud(decay=1.7), volume=3.5, pan=0.18, reverb=0.32, delay=0.12, role='melody', vel=0.72, gate=0.95)
    # the bent fourth note: the same oud, a longer-ringing string, bent down a semitone just after the bar line
    bent = s.track('oud (bent)', E.Oud(decay=6.0, bend=-1.0, bend_delay=BEAT + 0.12, bend_time=0.34),
                   volume=5.0, pan=0.18, reverb=0.34, delay=0.12, role='melody', vel=0.74, gate=1.0)
    walk = s.track('oud walk', E.Oud(decay=1.1, brightness=0.55, body=1.2), volume=-5.0, pan=-0.28, reverb=0.25,
                   role='arp', vel=0.5, humanize_ms=6, vel_jitter=0.05, gate=0.85)
    ney = s.track('flute', 'boneflute', volume=-6.0, pan=-0.12, reverb=0.45, delay=0.15, role='melody', vel=0.62, gate=0.96)
    hi = s.track('high strings', 'strings_high', volume=-10.0, pan=0.12, reverb=0.5, role='melody', vel=0.52, gate=1.02, width=0.7)
    pad = s.track('strings', 'strings', volume=-17.0, reverb=0.6, role='pad', vel=0.4, gate=1.0, width=1.0)
    low = s.track('low strings', 'strings_low', volume=-19.0, reverb=0.45, role='pad', vel=0.42, gate=1.0, width=0.7)
    bass = s.track('bass', 'bass', volume=-18.0, reverb=0.05, role='bass', vel=0.5, gate=0.9)
    tar = s.track('frame drum', E.Tar(), volume=-9.0, pan=-0.08, reverb=0.22, role='perc', pitched=False, vel=0.6,
                  humanize_ms=4, vel_jitter=0.05)
    shaker = s.track('shaker', 'shaker', volume=-20.0, pan=0.3, reverb=0.15, role='perc', pitched=False, vel=0.5,
                     humanize_ms=5, vel_jitter=0.08)
    stars = s.track('stars', 'glass', volume=-19.0, pan=0.4, reverb=0.65, delay=0.4, role='perc', vel=0.3)

    def motif_bent(bar, vel=0.74, octave=0):
        """The oud motif: F C D, then Bb held across the bar line and bent down to A (bars `bar` and `bar`+1)."""
        oud.seq(bar=bar, pattern=MOTIF_HEAD, vel=vel)
        if octave:
            for nn in oud.notes[-3:]:
                nn.midi += 12 * octave
        bent.add(bs(bar) + 3.0, 70 + 12 * octave, 4.0, vel=vel)       # Bb4, ringing into the next bar, bent to A4

    # ---- A: night. The oud motif and its bend; the flute answers --------------------------------------------------
    motif_bent(1, 0.74)
    motif_bent(5, 0.72)
    for bar in (2, 6, 30):                                             # the strings sigh with the bend: F to E (the #11)
        hi.seq(bar=bar, pattern='f4/1.5 e4/2.5', vel=0.46 if bar != 30 else 0.4)
    for bar, pat in FLUTE_A.items():
        ney.seq(bar=bar, pattern=pat, vel=0.6)
    # ---- A': the flute's long night melody ------------------------------------------------------------------------
    for i, pat in enumerate(FLUTE_A2):
        ney.seq(bar=9 + i, pattern=pat, vel=0.62 + (0.04 if i in (4, 5) else 0.0))
    hi.seq(bar=13, pattern='a4/4 | c5/4 | bb4/4 | g4/2 bb4/2', vel=0.36)
    # ---- B: the Saffron tune in F major (oud motif, held, then the flute; strings under from bar 19) --------------------
    for bar, beat, p, dur, motif in E.tune(65 + 12, 'major', 17):    # F5 ...
        if motif:
            oud.add(bs(bar) + beat, p - 12, dur, vel=0.78)           # the oud, F4 C5 D5 Bb4, the Bb held, not bent
            ney.add(bs(bar) + beat, p - 12, dur, vel=0.42)           # the flute breathing with it
            continue
        if (bar - 17, beat) in ((3, 0.0), (7, 2.0)):
            dur -= 0.5                                                 # the flute breathes at the phrase ends
        ney.add(bs(bar) + beat, p - 12, dur, vel=0.66)
        if bar >= 19:
            hi.add(bs(bar) + beat, p - 24, dur, vel=0.46)
    # ---- B': flute and high strings in octaves ---------------------------------------------------------------------
    for i, pat in enumerate(TUTTI_B2):
        ney.seq(bar=25 + i, pattern=pat, vel=0.66)
        n0 = len(hi.notes)
        hi.seq(bar=25 + i, pattern=pat, vel=0.56)
        for nn in hi.notes[n0:]:
            nn.midi -= 12                                              # an octave under the flute
    # ---- T: the motif once more, bent, quiet ---------------------------------------------------------------------------
    motif_bent(29, 0.64)
    ney.seq(bar=31, pattern='r/1 g4/1.5 f4/0.5 e4/1', vel=0.48)
    ney.seq(bar=32, pattern='e4/2 r/2', vel=0.42)

    # ---- accompaniment ----------------------------------------------------------------------------------------------
    sky = np.random.default_rng(5005)
    for bar in range(1, 33):
        sec = section(bar)
        warm = sec in ('B', "B'")
        for b0, ln, name in segments(bar):
            pad.chord(bs(bar) + b0, T.tones(name, 57, 72)[:3], ln, vel=0.4 if sec in ('A', 'T') else (0.46 if warm else 0.4))
            if sec not in ('A', 'T'):
                low.chord(bs(bar) + b0, T.tones(name, 43, 57)[:2], ln, vel=0.4 if not warm else 0.48)
            elif b0 == 0:
                low.chord(bs(bar), [38, 45], 4.0, vel=0.44)            # the night's drone: D2 and A2 under everything
            r = T.root_note(name, 38)                                  # D2 .. C#3
            if sec != 'A':
                bass.add(bs(bar) + b0, r, min(ln, 2.0), vel=0.46 if not warm else 0.54)
                if ln == 4 and warm:
                    bass.add(bs(bar) + 2.5, T.fifth_note(name, 38), 1.5, vel=0.4)
        # the oud walk: root and fifth in A and T (two plucks), eighths from A', the caravan figure in B
        for b0, ln, name in segments(bar):
            r = T.root_note(name, 50)                                  # D3 .. C#4
            tt = T.tones(name, 50, 70)
            fifth = T.fifth_note(name, r)
            if sec in ('A', 'T'):
                walk.add(bs(bar) + b0, r, 1.0, vel=0.46)
                if ln >= 2:
                    walk.add(bs(bar) + b0 + 1.5, fifth, 1.0, vel=0.36)
                if ln == 4:
                    walk.add(bs(bar) + 3.0, r + 12, 1.0, vel=0.32)
            elif sec == "A'":
                fig = [r, fifth, r + 12, fifth, tt[min(2, len(tt) - 1)], fifth, r + 12, fifth]
                for i in range(int(ln * 2)):
                    walk.add(bs(bar) + b0 + 0.5 * i, fig[i % 8], 0.5, vel=0.42 + (0.08 if i % 4 == 0 else 0.0))
            else:
                fig = [(0.0, r, 0.6), (0.75, r, 0.4), (1.0, fifth, 0.5), (1.5, r + 12, 0.5), (2.0, r, 0.55),
                       (2.75, r, 0.38), (3.0, fifth, 0.48), (3.5, tt[min(1, len(tt) - 1)] + 12, 0.42)]
                for off, p, v in fig:
                    if b0 <= off < b0 + ln:
                        walk.add(bs(bar) + off, p, 0.5, vel=v)
        # hand percussion: the downbeat only at night, the caravan's walk in B
        if sec == 'A':
            tar.add(bs(bar), 'a2', 0.5, vel=0.5 if bar >= 3 else 0.4)
            if bar >= 3:
                tar.add(bs(bar) + 2.5, 'e5', 0.25, vel=0.22)
        elif sec == 'T':
            tar.add(bs(bar), 'a2', 0.5, vel=0.46)
        elif sec == "A'":
            for off, p, v in ((0.0, 'a2', 0.56), (1.5, 'e5', 0.3), (2.0, 'a2', 0.42), (3.0, 'e5', 0.34), (3.5, 'e5', 0.22)):
                tar.add(bs(bar) + off, p, 0.25, vel=v)
        else:
            for off, p, v in ((0.0, 'a2', 0.64), (1.0, 'e5', 0.36), (1.5, 'a2', 0.44), (2.0, 'a2', 0.54),
                              (3.0, 'e5', 0.42), (3.5, 'e5', 0.26)):
                tar.add(bs(bar) + off, p, 0.25, vel=v)
            for i in range(8):
                shaker.add(bs(bar) + 0.5 * i, 'c6', 0.25, vel=0.34 + (0.12 if i % 2 else 0.0))
        # stars: two or three glass points a bar at night, high chord tones on the off-sixteenths
        if sec in ('A', 'T') or bar in (12, 16):
            name = segments(bar)[0][2]
            hi_t = T.tones(name, 86, 100)
            k = 2 + (bar % 3 == 0)
            slots = sorted(sky.choice(np.arange(1, 16, 2), size=k, replace=False))
            for sl in slots:
                stars.add(bs(bar) + sl * 0.25, int(sky.choice(hi_t)), 0.25, vel=0.2 + 0.1 * sky.random())
    return s
