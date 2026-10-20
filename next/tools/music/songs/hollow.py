"""hollow: "The Unwritten Square" (the Hollow, its interiors, memory scenes). A Dorian, 84 BPM, 3/4, 32 bars
(68.6 s), loops.

A lullaby waltz (the tune lives in lullaby.py). Music box and celesta trade the "reflected melody": every
phrase is answered by its mirror inversion. The name motif (A E F#, degrees 1 5 6) always stops after its
third note: where the D belongs there is a rest, and in bar 30 the F# is simply held. Muted piano keeps the
waltz, soft strings and a glassy pad shimmer underneath.

Form
  A     1-8   music box asks (the motif, A E F#), celesta answers in mirror (A D C); falling phrase, rising answer
  A'    9-16  the roles swap (celesta asks, music box answers), soft strings enter
  B     17-24 the tune climbs over C, D, Em, D7, Bm7, Am, D, Em7 (a Dorian half cadence on v)
  coda  25-32 the motif twice; the second time the F# hangs, then the mirror drifts down over D7 into bar 1
Chords: Am, Am6, D, D7, C, Bm7, Em, Am / ... / C, D, Em, D7, Bm7, Am, D, Em7 / Am, Am6, D, D7 x2.
"""
from tracker import Song
import lullaby as L

TONIC_LEAD = 81     # A5: degree 0 of the melody (music box / celesta)
TONIC = 57          # A3: accompaniment reference
MODE = 'dorian'


def pc_chord(bar, tonic=TONIC):
    return [L.pitch(tonic, MODE, d) for d in L.chord_degrees(bar)]


def chord_label(bar):
    names = {0: 'Am', 1: 'Bm', 2: 'C', 3: 'D', 4: 'Em'}
    root, kind = L.CHORDS[bar - 1]
    lab = names[root]
    if kind == '6':
        lab += '6'
    elif kind == '7':
        lab += '7'
    return lab


def build():
    chords = [chord_label(b) for b in range(1, 33)]
    s = Song('hollow', bpm=84, beats_per_bar=3, bars=32, key='A dorian', title='The Unwritten Square',
             reverb_room=0.86, reverb_damp=0.35, reverb_len=3.8, reverb_level=-7.0,
             delay_beats=(1.5, 1.0), delay_feedback=0.28, delay_level=-15.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=chords)
    bs = s.bar_start

    musicbox = s.track('music box', 'musicbox', volume=-6.0, pan=0.25, reverb=0.45, delay=0.35, role='melody', vel=0.7, gate=0.95, humanize_ms=4)
    celesta = s.track('celesta', 'celesta', volume=-6.5, pan=-0.25, reverb=0.5, delay=0.3, role='melody', vel=0.66, gate=0.92, humanize_ms=5)
    piano = s.track('muted piano', 'piano_muted', volume=-9.5, pan=0.05, reverb=0.3, role='arp', vel=0.5, gate=0.9, humanize_ms=7, vel_jitter=0.03)
    strings = s.track('soft strings', 'strings', volume=-20.0, reverb=0.45, role='pad', vel=0.42, gate=1.0, width=0.8)
    lowstr = s.track('low strings', 'strings_low', volume=-22.0, reverb=0.35, role='pad', vel=0.4, gate=1.0, width=0.5)
    glass = s.track('glass pad', 'glasspad', volume=-19.5, reverb=0.6, role='pad', vel=0.5, gate=1.0)

    # ---- melody: P on one instrument, its mirror on the other -----------------------------------
    owner = {}
    for bar in range(1, 33):
        lead_is_box = not (9 <= bar <= 16)
        owner[bar] = lead_is_box
    for bar, beat, d, dur, role in L.phrase_notes(1, 32, complete=False):
        box_plays = (role == 'P') == owner[bar]
        tr = musicbox if box_plays else celesta
        v = 0.7 if role == 'P' else 0.62
        if bar >= 29:
            v -= 0.06
        tr.add(bs(bar) + beat, L.pitch(TONIC_LEAD, MODE, d), dur, vel=v)
    # a faint music-box echo of the first two notes as the loop turns over (bar 32 beat 3)
    musicbox.add(bs(32) + 2.0, L.pitch(TONIC_LEAD - 12, MODE, 0), 0.5, vel=0.34)
    musicbox.add(bs(32) + 2.5, L.pitch(TONIC_LEAD - 12, MODE, 4), 0.5, vel=0.3)

    # ---- muted piano: the waltz (bass on 1, two chord tones on 2 and 3) ----------------------------
    for bar in range(1, 33):
        tones = L.chord_degrees(bar)
        root = L.pitch(45, MODE, tones[0])            # A2 .. D3, E drops to E2
        if root > 50:
            root -= 12
        upper = [L.pitch(TONIC, MODE, d) for d in tones[1:]]
        upper = sorted(p + 12 if p < 60 else (p - 12 if p > 71 else p) for p in upper)  # C4 .. B4
        v = 0.5 if bar % 2 else 0.44
        if 25 <= bar <= 32:
            v -= 0.05
        piano.add(bs(bar), root, 1.0, vel=v + 0.04)
        if bar in (8, 16, 24, 32):
            piano.chord(bs(bar) + 1, upper[:3], 2.0, vel=v - 0.06)
        else:
            piano.chord(bs(bar) + 1, upper[:2], 1.0, vel=v - 0.08)
            piano.chord(bs(bar) + 2, upper[:2], 1.0, vel=v - 0.12)

    # ---- soft strings from A' on; low strings in B ------------------------------------------------
    for bar in range(9, 33):
        tones = L.chord_degrees(bar)
        voicing = sorted(L.pitch(TONIC + 12, MODE, d) for d in tones[:3])
        v = 0.4 if bar < 17 else (0.48 if bar < 25 else 0.36)
        strings.chord(bs(bar), voicing, 3.0, vel=v)
    for bar in range(17, 25):
        root = L.CHORDS[bar - 1][0]
        lowstr.chord(bs(bar), [L.pitch(33, MODE, root), L.pitch(33, MODE, root + 4)], 3.0, vel=0.42)

    # ---- glass pad: a high open fifth on the tonic every four bars (rests in B) -------------------
    for bar, notes in ((1, ('a5', 'e6')), (5, ('c6', 'g6')), (9, ('a5', 'e6')), (13, ('b5', 'f#6')),
                       (25, ('a5', 'e6')), (29, ('a5', 'f#6'))):
        glass.chord(bs(bar), list(notes), 9.0, vel=0.45)
    glass.chord(bs(17), ['g5', 'd6'], 6.0, vel=0.35)
    glass.chord(bs(23), ['a5', 'd6'], 6.0, vel=0.35)
    return s
