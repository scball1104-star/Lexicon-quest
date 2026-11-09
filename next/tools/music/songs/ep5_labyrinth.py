"""labyrinth: "The Shifting Dunes" (ep5_lab_f1, ep5_lab_f2). E Dorian over an E pedal, 84 BPM, 4/4, 32 bars (91.4 s),
loops. Manifest id `labyrinth`, file ep5_labyrinth.mp3.

The plan's brief: a slow frame-drum pulse, a sustained low drone, a breathy flute that plays the motif in long notes,
a bright bell tick every 8 bars like a sundial's shadow moving.

The name motif is the flute's, augmented: E4 B4 C#5 A4 (the C# the Dorian sixth), each note six beats long, so the
motif takes six bars and its notes change in the middle of a bar as often as on one: it drifts against the bar line
the way a dune drifts against the path. In A' the high strings answer it with the motif's inverted guise (the
"fading" form, E5 A4 G4 B4), the same notes read in a mirror: the Gallery of False Horizons. The sundial: a glockenspiel
tick and a dry knock on the downbeat of bars 1, 9, 17 and 25, a step lower each time (B6, A6, F#6, E6), the shadow
moving down the dial; the tick a bar after each is a faint repeat (the shadow's edge).

Form
  A    1-8    Em, Em, A/E, A/E, D/E, D/E, Em, Em: the drone, the dum on the downbeat, the flute's motif (bars 1-6)
  B    9-16   G, D/F#, Em7, A, G, D/F#, C#m7b5, Bm7: the bass moves off the pedal, a plucked oud figure, the flute
              sings a slow line, a low bowed bass
  A'   17-24  A over the pedal again, the motif in the flute, its mirror in the high strings, a faint choir
  C    25-32  A/E, G/E, D/E, Em, A/E, G/E, Bm7/E, Bm7: lighter; a harp arpeggio, the flute's last three notes of the
              motif only, the choir and the oud return for the last four bars; Bm7 falls back into Em at bar 1
"""
from tracker import Song
import e3_theme as T
import ep5_theme as E

A_CH = ['Em', 'Em', 'A/E', 'A/E', 'D/E', 'D/E', 'Em', 'Em']
B_CH = ['G', 'D/F#', 'Em7', 'A', 'G', 'D/F#', 'C#m7b5', 'Bm7']
C_CH = ['A/E', 'G/E', 'D/E', 'Em', 'A/E', 'G/E', 'Bm7/E', 'Bm7']
BARS = A_CH + B_CH + A_CH + C_CH
assert len(BARS) == 32

MOTIF_AUG = [(0.0, 'e4'), (6.0, 'b4'), (12.0, 'c#5'), (18.0, 'a4')]          # beats from the bar line of the first bar
MIRROR = [(2.0, 'e5'), (8.0, 'a4'), (14.0, 'g4'), (20.0, 'b4')]            # the inverted guise, two beats behind
FLUTE_A_END = {7: 'r/2 g4/1 f#4/1', 8: 'e4/3 r/1'}
FLUTE_B = {9: 'b4/3 d5/1', 10: 'c#5/2 a4/2', 11: 'b4/4', 12: 'r/1 c#5/1 e5/2',
           13: 'd5/3 b4/1', 14: 'a4/2 f#4/2', 15: 'g4/3 e4/1', 16: 'f#4/3 r/1'}
TICKS = {1: 'b6', 9: 'a6', 17: 'f#6', 25: 'e6'}


def section(bar):
    return 'A' if bar <= 8 else 'B' if bar <= 16 else "A'" if bar <= 24 else 'C'


def build():
    s = Song('ep5_labyrinth', bpm=84, beats_per_bar=4, bars=32, key='E dorian', title='The Shifting Dunes',
             reverb_room=0.9, reverb_damp=0.35, reverb_len=4.5, reverb_level=-7.0,
             delay_beats=(1.5, 1.0), delay_feedback=0.32, delay_level=-16.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    flute = s.track('flute', 'boneflute', volume=-5.0, pan=-0.1, reverb=0.5, delay=0.2, role='melody', vel=0.64, gate=0.97)
    mirror = s.track('high strings', 'strings_high', volume=-12.0, pan=0.3, reverb=0.6, delay=0.25, role='melody', vel=0.48,
                     gate=1.0, width=0.7)
    drone = s.track('drone', 'strings_low', volume=-13.0, reverb=0.45, role='pad', vel=0.5, gate=1.0, width=0.8)
    bow = s.track('bowed bass', 'bowbass', volume=-21.0, reverb=0.3, role='bass', vel=0.46, gate=1.0)
    pad = s.track('glass pad', 'glasspad', volume=-20.0, reverb=0.6, role='pad', vel=0.42, gate=1.0)
    choir = s.track('choir', 'choir', volume=-23.0, reverb=0.65, role='pad', vel=0.38, gate=1.0)
    oud = s.track('oud', E.Oud(decay=1.3, brightness=0.55, body=1.2), volume=-6.0, pan=0.25, reverb=0.35, delay=0.18,
                  role='arp', vel=0.5, humanize_ms=7, vel_jitter=0.05, gate=0.85)
    oud.volume = -2.0
    harp = s.track('harp', 'harp', volume=-10.0, pan=-0.3, reverb=0.5, role='arp', vel=0.4, humanize_ms=4)
    drum = s.track('frame drum', E.Tar(), volume=-6.0, reverb=0.35, role='perc', pitched=False, vel=0.6, humanize_ms=4)
    low = s.track('low drum', 'framedrum', volume=-12.0, reverb=0.4, role='perc', pitched=False, vel=0.5)
    tick = s.track('sundial bell', 'glock', volume=-8.0, pan=0.35, reverb=0.55, delay=0.3, role='perc', vel=0.6)
    knock = s.track('sundial knock', 'woodblock', volume=-2.0, pan=0.35, reverb=0.4, role='perc', pitched=False, vel=0.5)

    # ---- the motif, augmented: six beats a note, drifting across the bar lines ------------------------------------------
    for start, vel in ((1, 0.66), (17, 0.7)):
        for off, p in MOTIF_AUG:
            flute.add(bs(start) + off, p, 5.5, vel=vel)
    for bar, pat in FLUTE_A_END.items():
        flute.seq(bar=bar, pattern=pat, vel=0.58)
        flute.seq(bar=bar + 16, pattern=pat, vel=0.6)
    # ---- A': the mirror (the motif inverted, two beats behind, in the high strings) ------------------------------------
    for off, p in MIRROR:
        mirror.add(bs(17) + off, p, 5.5, vel=0.5)
    # ---- B: the flute's slow line -------------------------------------------------------------------------------------
    for bar, pat in FLUTE_B.items():
        flute.seq(bar=bar, pattern=pat, vel=0.6)
    # ---- C: only the last three notes of the motif, quiet (its first note never comes back before the loop) -------------
    flute.add(bs(26) + 0.0, 'b4', 3.5, vel=0.5)
    flute.add(bs(27) + 0.0, 'c#5', 3.5, vel=0.48)
    flute.add(bs(28) + 0.0, 'a4', 7.0, vel=0.44)
    mirror.seq(bar=30, pattern='e5/4 | d5/2 b4/2 | a4/4', vel=0.36)

    # ---- the ground: drone, drum, oud, harp ------------------------------------------------------------------------------
    for bar in range(1, 33):
        sec = section(bar)
        name = BARS[bar - 1]
        pedal = sec in ('A', "A'", 'C') and bar != 32
        if pedal and (bar - 1) % 4 == 0:
            drone.chord(bs(bar), ['e2', 'b2'], 16.0 if bar != 29 else 12.0, vel=0.5)
        if not pedal:
            drone.chord(bs(bar), T.tones(name, 40, 55)[:2], 4.0, vel=0.46)
        if sec == 'B' or bar == 32:
            bow.add(bs(bar), T.root_note(name, 28), 4.0, vel=0.5)
        if sec != 'A' or bar >= 3:
            pad.chord(bs(bar), T.tones(name, 64, 79)[:3], 4.0, vel=0.38 if sec != 'A' else 0.34)
        if sec in ("A'", 'C'):
            choir.chord(bs(bar), T.tones(name, 55, 69)[:3], 4.0, vel=0.34 if bar < 29 else 0.4)
        # the drum: footsteps in sand. A: the dum on 1; B: 1 and 3; A': 1, 2.5, 3 and a tek; C: the dum on 1
        hits = {'A': ((0.0, 'a2', 0.6), (3.5, 'e5', 0.18)),
                'B': ((0.0, 'a2', 0.6), (2.0, 'a2', 0.46), (3.5, 'e5', 0.22)),
                "A'": ((0.0, 'a2', 0.64), (1.5, 'e5', 0.24), (2.5, 'a2', 0.4), (3.0, 'a2', 0.52), (3.5, 'e5', 0.28)),
                'C': ((0.0, 'a2', 0.54), (2.0, 'a2', 0.36), (3.5, 'e5', 0.2))}[sec]
        for off, p, v in hits:
            drum.add(bs(bar) + off, p, 0.5, vel=v)
        if bar % 4 == 1:
            low.add(bs(bar), 'e2', 1.0, vel=0.5)
        # the oud: a plucked figure in B and A' (root, fifth, the ninth, the octave), sparse
        if sec in ('B', "A'") or bar >= 29:
            r = T.root_note(name, 52) if sec == 'B' or bar == 32 else 52  # E3 pedal in A' and C
            fifth = T.fifth_note(name, r)
            fig = [(0.0, r, 0.56), (1.0, fifth, 0.4), (1.5, r + 14, 0.36), (2.5, r + 12, 0.42), (3.0, fifth, 0.36)]
            for off, p, v in fig:
                oud.add(bs(bar) + off, p, 0.75, vel=v * (0.8 if sec == 'C' else 1.0))
        # the harp: a slow arpeggio in C (and under the last bars of A)
        if sec == 'C' or bar in (7, 8):
            tt = T.tones(name, 52, 81)
            fig = (tt[:4] + tt[1:3][::-1])
            for i in range(8):
                harp.add(bs(bar) + 0.5 * i, fig[i % len(fig)], 0.5, vel=0.36 + (0.06 if i == 0 else 0.0), gate=2.0)
    # ---- the sundial: a bright tick every 8 bars, a step lower each time, and its faint repeat a bar later --------------
    for bar, p in TICKS.items():
        tick.add(bs(bar), p, 1.0, vel=0.66)
        knock.add(bs(bar), 'c5', 0.3, vel=0.5)
        tick.add(bs(bar + 1), p, 1.0, vel=0.24)
    return s
