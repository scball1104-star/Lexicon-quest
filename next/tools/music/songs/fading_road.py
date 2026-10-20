"""fading_road: "The Fading Road" (east_road). E minor turning to G major, 96 BPM, 4/4, 36 bars (90 s), loops.

A travel theme: flute over pizzicato and a walking bass, glass bells glinting, a light shaker. Every eight bars
one instrument drops out for two bars and comes back (the road forgetting and remembering):
pizzicato in bars 13-14, the walking bass in 21-22, the flute in 27-28 (the glass bells remember its motif for
it), the bells and shaker in 33-34.

The flute opens with the name motif from G (G D E C, the motif's natural-minor guise starting on the third),
over Em7 to Cmaj7; in the G major half it is the tonic's own 1-5-6-4.

Form
  A   1-8   Em7, Cmaj7, Am7, B7sus4-B7, Em, Cmaj7, Am7-D, G        (flute theme, motif in bar 1)
  A'  9-16  Em, Cmaj7, Am7, B7, Em, C, Am7-D7, G                    (strings enter; pizzicato forgets 13-14)
  B   17-24 G, C/E, Em7, Cmaj7, G/B, C, Am7, D7sus4-D7             (the motif in G; the bass forgets 21-22)
  B'  25-32 G, D/F#, Em7, C, Am7, Bm7, Cmaj7, D                     (the flute forgets 27-28, bells remember)
  T   33-36 Cmaj7, Am7, B7sus4, B7                                  (the mist: the bells forget; B7 back to Em)
"""
from tracker import Song
from theory import midi

CH = {  # chord name -> (root pitch class, intervals)
    'Em7': (4, (0, 3, 7, 10)), 'Em': (4, (0, 3, 7)), 'Cmaj7': (0, (0, 4, 7, 11)), 'C': (0, (0, 4, 7)),
    'Am7': (9, (0, 3, 7, 10)), 'B7sus4': (11, (0, 5, 7, 10)), 'B7': (11, (0, 4, 7, 10)), 'D': (2, (0, 4, 7)),
    'D7': (2, (0, 4, 7, 10)), 'G': (7, (0, 4, 7)), 'C/E': (0, (0, 4, 7)), 'G/B': (7, (0, 4, 7)),
    'D7sus4': (2, (0, 5, 7, 10)), 'D/F#': (2, (0, 4, 7)), 'Bm7': (11, (0, 3, 7, 10)),
}
BASS_NOTE = {'C/E': 4, 'G/B': 11, 'D/F#': 6}   # inversions: the bass walks from these
BARS = [
    'Em7', 'Cmaj7', 'Am7', 'B7sus4 B7', 'Em', 'Cmaj7', 'Am7 D', 'G',
    'Em', 'Cmaj7', 'Am7', 'B7', 'Em', 'C', 'Am7 D7', 'G',
    'G', 'C/E', 'Em7', 'Cmaj7', 'G/B', 'C', 'Am7', 'D7sus4 D7',
    'G', 'D/F#', 'Em7', 'C', 'Am7', 'Bm7', 'Cmaj7', 'D',
    'Cmaj7', 'Am7', 'B7sus4', 'B7',
]
SCALE = {4, 6, 7, 9, 11, 0, 2}   # E minor / G major

FLUTE = [
    'g5/1.5 d6/0.5 e6/2', 'c6/2 b5/1 g5/1', 'a5/1.5 b5/0.5 c6/1 e6/1', 'e6/2 d#6/1.5 r/0.5',
    'g5/1.5 d6/0.5 e6/1 g6/1', 'g6/1.5 f#6/0.5 e6/2', 'c6/1 b5/1 a5/1 f#5/1', 'g5/3 r/1',
    'g5/1 d6/1 e6/1.5 d6/0.5', 'c6/1 e6/1 g6/1 r/0.5 f#6/0.5', 'e6/2 c6/1 a5/1', 'b5/1 d#6/1 f#6/1 a6/0.5 r/0.5',
    'g6/2 e6/1 b5/1', 'c6/1.5 d6/0.5 e6/1 g6/1', 'e6/1.5 d6/0.5 c6/1 a5/1', 'b5/2 g5/1 r/1',
    'g5/1.5 d6/0.5 e6/2', 'c6/2 d6/1 e6/1', 'g6/1.5 f#6/0.5 e6/1 d6/1', 'e6/2 b5/1.5 r/0.5',
    'd6/1.5 c6/0.5 b5/1 g5/1', 'a5/1 c6/1 e6/2', 'g6/1 f#6/0.5 e6/0.5 e6/1 c6/1', 'd6/2 c6/1.5 r/0.5',
    'b5/1.5 d6/0.5 g6/2', 'f#6/1.5 e6/0.5 d6/2', None, None,
    'a5/1 c6/1 e6/1 g6/1', 'f#6/2 d6/1 b5/1', 'e6/1.5 d6/0.5 c6/1 b5/1', 'a5/3 r/1',
    'e5/1.5 b5/0.5 g5/2', 'c6/1.5 b5/0.5 a5/2', 'a5/1 b5/1 e6/2', 'd#6/3 r/1',
]


def chords_of(bar):
    names = BARS[bar - 1].split()
    if len(names) == 1:
        return [(0.0, 4.0, names[0])]
    return [(0.0, 2.0, names[0]), (2.0, 2.0, names[1])]


def bass_root(name):
    """The sounding bass note of a chord (inversion-aware), C2 .. B2."""
    pc = BASS_NOTE.get(name, CH[name][0])
    return 36 + pc % 12


def chord_pcs(name):
    root, ivs = CH[name]
    return {(root + iv) % 12 for iv in ivs}


def walking_bass(bar):
    """Four quarter notes: the bass note, two chord tones walking toward the next bass note, then a
    diatonic (or leading-tone) step into it."""
    cs = chords_of(bar)
    target = bass_root(chords_of(bar % 36 + 1)[0][2])
    if len(cs) == 1:
        name = cs[0][2]
        r = bass_root(name)
        tones = chord_pcs(name)
        step = 1 if target >= r else -1
        line, p = [r], r
        while len(line) < 3:
            p += step
            if p % 12 in tones and p >= 33:
                line.append(p)
            elif p < 33:
                step, p = 1, r
    else:
        a, b = cs[0][2], cs[1][2]
        ra, rb = bass_root(a), bass_root(b)
        mid = ra + 7 if ra + 7 <= 47 else ra - 5
        line = [ra, mid, rb]
    prev = line[-1]
    cands = [target + d for d in (-2, -1, 1, 2)]
    cands = [c for c in cands if ((c % 12) in SCALE or c == target - 1) and c != prev]
    line.append(min(cands, key=lambda c: ((c % 12) not in SCALE, abs(c - prev))))
    return line


def build():
    s = Song('fading_road', bpm=96, beats_per_bar=4, bars=36, key='E minor', title='The Fading Road',
             reverb_room=0.8, reverb_damp=0.35, reverb_len=2.8, reverb_level=-8.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.3, delay_level=-13.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=[b for b in BARS])
    bs = s.bar_start

    flute = s.track('flute', 'flute', volume=-6.5, pan=0.05, reverb=0.32, delay=0.12, role='melody', vel=0.7, gate=0.94, humanize_ms=5)
    pizz = s.track('pizzicato', 'pizz', volume=-7.5, pan=-0.3, reverb=0.25, role='arp', vel=0.5, humanize_ms=6, vel_jitter=0.04)
    bass = s.track('walking bass', 'bass', volume=-9.5, reverb=0.06, role='bass', vel=0.6, gate=0.72, humanize_ms=4)
    bells = s.track('glass bells', 'glass', volume=-9.5, pan=0.4, reverb=0.55, delay=0.45, role='perc', vel=0.5, humanize_ms=4)
    strings = s.track('strings', 'strings', volume=-18.0, reverb=0.45, role='pad', vel=0.45, gate=1.0, width=0.9)
    shaker = s.track('shaker', 'shaker', volume=-13.0, pan=0.2, reverb=0.15, role='perc', pitched=False, vel=0.5, vel_jitter=0.06, humanize_ms=5)

    # ---- flute ---------------------------------------------------------------------------------
    for bar, pat in enumerate(FLUTE, start=1):
        if pat:
            v = 0.66 if bar in (33, 34, 35, 36) else 0.72
            flute.seq(bar=bar, pattern=pat, vel=v)

    # ---- walking bass (forgets bars 21-22: one long held root, then walks again) ------------------
    for bar in range(1, 37):
        if bar in (21, 22):
            continue
        for i, p in enumerate(walking_bass(bar)):
            bass.add(bs(bar) + i, p, 1.0, vel=0.64 if i == 0 else 0.54)
    bass.add(bs(20) + 3, bass_root('G/B') + 0, 1.0, vel=0.5)

    # ---- pizzicato: off-beat dyads (forgets bars 13-14) ------------------------------------------
    for bar in range(1, 37):
        if bar in (13, 14):
            continue
        for start, dur, name in chords_of(bar):
            root, ivs = CH[name]
            tones = sorted(55 + (root + iv - 55) % 12 for iv in ivs[1:3])      # 3rd and 5th, G3 .. F#4
            for off in (1.0, 3.0):
                if start <= off < start + dur:
                    pizz.chord(bs(bar) + off, tones, 0.5, vel=0.5 if off == 1.0 else 0.44)
        if bar % 4 == 0 and bar not in (12, 36):
            pizz.add(bs(bar) + 3.5, 'b3', 0.5, vel=0.36)

    # ---- glass bells: glints every bar or two; in 27-28 they carry the flute's motif -----------------
    glints = {1: [(2.5, 'b6')], 3: [(3.5, 'e7')], 5: [(2.5, 'g6'), (3.0, 'd7')], 7: [(1.5, 'a6')],
              9: [(2.5, 'b6')], 11: [(3.5, 'c7')], 13: [(1.5, 'g6'), (2.5, 'b6')], 15: [(3.5, 'f#6')],
              17: [(2.5, 'd7')], 18: [(3.5, 'g7')], 19: [(2.5, 'b6')], 20: [(3.5, 'e7')], 21: [(2.5, 'g6')],
              23: [(1.5, 'c7')], 24: [(3.5, 'a6')], 25: [(2.5, 'd7')], 26: [(3.5, 'a6')],
              29: [(3.5, 'e7')], 30: [(2.5, 'f#7')], 31: [(1.5, 'g6'), (3.5, 'e7')], 32: [(2.5, 'a6')],
              35: [(2.5, 'b6')], 36: [(1.5, 'f#7'), (3.5, 'd#7')]}
    for bar, hits in glints.items():
        for beat, p in hits:
            bells.add(bs(bar) + beat, p, 0.5, vel=0.42)
    bells.seq(bar=27, pattern='g6/1.5 d7/0.5 e7/2 | c7/2 b6/1 g6/1', vel=0.62)

    # ---- strings from bar 9 (soft), fuller in G; alone with the flute in the mist ----------------
    for bar in range(9, 37):
        for start, dur, name in chords_of(bar):
            root, ivs = CH[name]
            voicing = sorted(60 + (root + iv - 60) % 12 for iv in ivs[:3])
            v = 0.42 if bar < 17 else (0.5 if bar < 33 else 0.46)
            strings.chord(bs(bar) + start, voicing, dur, vel=v)

    # ---- shaker: eighths, gone in the mist (33-34) ---------------------------------------------------
    for bar in range(1, 37):
        if bar in (33, 34):
            continue
        for i in range(8):
            v = 0.5 if i % 2 == 0 else 0.34
            if i in (2, 6):
                v = 0.42
            shaker.add(bs(bar) + 0.5 * i, 'c4', 0.25, vel=v * (0.8 if bar in (35, 36) else 1.0))
    return s
