"""boss_scribe: "The Storm Scribe" (the Scribe's battle). E minor, 6/8 at dotted quarter 92 (written as three quarter beats a
bar at 138, so the pulses fall on beats 0 and 1.5), 80 bars: 2 intro bars played once, then a 78-bar loop (101.7 s).
Manifest id `boss_scribe`, file ep6_boss_scribe.mp3.

The plan's brief (8.1): a 6/8 drive, snare and timpani on the gusts, low brass, a running string ostinato like rain on
canvas, choir pads; the B section quotes `zephyr` in minor (the town's own song written as a storm); a last major bar on
the wind harp before the loop.

The name motif is the brass's, from the third of the key, G D E C (exactly 0 +7 +9 +5): one note on each pulse of two
bars, the C held across the bar line, where it becomes the root of the next chord (C), the way the wind harp's C did in
`zephyr`. A2 doubles it (high strings an octave up, horn an octave down). B quotes the Zephyr tune (ep6_theme.TUNE) in E
minor, re-barred to 6/8 by `swing68` (one 4/4 bar of the tune becomes two bars of 6/8): its motif notes on the wind harp
(the town's instrument, E4 B4 C5 A4), the rest on horn and strings, then on the brass. C climbs the motif from E, G and A
(each statement keeps the scale's own sixth), a B7 hemiola (three quarter-note stabs against two pulses), and the motif
fortissimo. The last two bars before the loop are E major: the wind harp states the motif in its tonic guise, E B C# A,
and lets the A fall to G#, the major third: the town's song landing in the light, once, before the storm takes it back.

Form (bar: harmony, two 6/8 bars per chord unless noted)
  I    1-2    Em: timpani and snare gusts, the low brass pedal (played once, before loopStart)
  A    3-18   Em, C, Am, B7, Em, C, D, B7: the ostinato (rain), the brass motif (bars 3 and 11), choir
  A2   19-34  Em, C, D, B7, Em, C, Am, B7: the motif doubled (19 and 27), the snare busier
  B    35-50  the Zephyr quote in E minor: Em, Am7, Cmaj7, B7, C, G, Am7-B7, Em
  C    51-66  the climb: Em-Am (from E), G-C (from G), Am-D (from A), B7 hemiola (63-64), the motif fortissimo (65-66)
  R    67-78  C, Am, B7, Em, C, B7: the ostinato creeps back, the motif cut short (71-72), a timpani roll builds on B7
  M    79-80  E major: the wind harp's motif, its A falling to G#
"""
import copy
import math

import numpy as np

from tracker import Song, GUARD_SAMPLES
import ep6_theme as E

BPB = 3.0
PULSES = (0.0, 1.5)
INTRO_BARS = 2


def pairs(*names):
    out = []
    for n in names:
        out += [n, n]
    return out


A_CH = pairs('Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'B7')
A2_CH = pairs('Em', 'C', 'D', 'B7', 'Em', 'C', 'Am', 'B7')
B_CH = []
for i, segs in enumerate(E.CHORDS_MINOR):              # two 6/8 bars for each 4/4 bar of the tune
    B_CH += [segs[0][1], segs[-1][1]]
C_CH = pairs('Em', 'Am', 'G', 'C', 'Am', 'D', 'B7', 'Em')
R_CH = pairs('C', 'Am', 'B7', 'Em', 'C', 'B7')
BARS = ['Em'] * INTRO_BARS + A_CH + A2_CH + B_CH + C_CH + R_CH + ['E', 'E']
assert len(BARS) == 80, len(BARS)
SONG_KW = dict(reverb_room=0.86, reverb_damp=0.4, reverb_len=3.4, reverb_level=-9.5, delay_beats=(0.5, 0.75),
               delay_feedback=0.22, delay_level=-20.0)


class IntroLoopSong(Song):
    """The loop body (this Song) with a once-only intro placed before loopStart, both at the body's gain; the intro's last
    60 ms fade out under the body's ramped guard (the copy of the loop end), so the first entry and every loop seam stay
    sample-continuous. The construction of ep5_boss_oracle.IntroLoopSong (from ep4_boss_regent), copied song-locally."""

    intro_beats = INTRO_BARS * BPB

    def render(self, verbose=True):
        Song.render(self, verbose)
        body = self.audio
        intro = self.intro
        intro.target_lufs = 0.0
        intro.render(verbose=False)                                   # pass 1: measure the intro's own loudness
        intro.target_lufs = intro.stats['pre_lufs'] + self.stats['gain_db']
        head = intro.render(verbose=False)                            # pass 2: at the body's gain
        n = int(round(intro.beat_to_sec(self.intro_beats) * self.sr))
        g = GUARD_SAMPLES
        fade = 0.5 + 0.5 * np.cos(np.linspace(0.0, math.pi, g))
        joint = head[n - g:n] * fade[:, None] + body[:g]
        self.audio = np.concatenate([head[:n - g], joint, body[g:]], axis=0)
        self.loop_start_sample = n
        self.loop_end_sample = n - g + self.loop_end_sample
        self.stats['intro_s'] = n / self.sr
        self.stats['intro_gain_db'] = intro.stats['gain_db']
        self.stats['duration'] = self.audio.shape[0] / self.sr
        if verbose:
            print('  intro once: %.3f s before loopStart, rendered at the body gain %.2f dB' % (n / self.sr, self.stats['gain_db']))
        return self.audio


def build():
    """Composed on its 80 written bars (compose), then split: bars 1..2 into the intro, 3..80 into the loop."""
    src = compose()
    off = INTRO_BARS * BPB
    body = IntroLoopSong('ep6_boss_scribe', bpm=138, beats_per_bar=BPB, bars=80 - INTRO_BARS, key='E minor',
                         title='The Storm Scribe', target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS[INTRO_BARS:],
                         **SONG_KW)
    intro = Song('ep6_boss_scribe_intro', bpm=138, beats_per_bar=BPB, bars=INTRO_BARS, key='E minor',
                 title='The Storm Scribe (intro)', ends=True, ring_out=1.0, target_lufs=-16.0,
                 intended_chords=BARS[:INTRO_BARS], **SONG_KW)
    for tr in src.tracks:
        for dst, keep, shift in ((body, lambda n: n.t >= off, off), (intro, lambda n: n.t < off, 0.0)):
            t = copy.copy(tr)
            t.song = dst
            t.notes = []
            for n in tr.notes:
                if keep(n):
                    m = copy.copy(n)
                    m.t = n.t - shift
                    t.notes.append(m)
            dst.tracks.append(t)
    body.intro = intro
    return body


def motif68(track, bar, start, vel, hold=4.5, sixth=9):
    """The motif in 6/8: one note on each pulse of two bars, the fourth held `hold` beats (across the bar line)."""
    t0 = (bar - 1) * BPB
    for i, (iv, dur) in enumerate(((0, 1.5), (7, 1.5), (sixth, 1.5), (5, hold))):
        track.add(t0 + 1.5 * i, start + iv, dur, vel=vel)


def compose():
    s = Song('ep6_boss_scribe', bpm=138, beats_per_bar=BPB, bars=80, key='E minor', title='The Storm Scribe',
             target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS, **SONG_KW)
    bs = s.bar_start

    rain = s.track('string ostinato', 'fiddle', volume=-12.0, pan=-0.25, reverb=0.3, role='arp', vel=0.5, humanize_ms=3,
                   vel_jitter=0.04, gate=0.42)
    pizz = s.track('pizzicato', 'pizz', volume=-14.0, pan=0.25, reverb=0.25, role='arp', vel=0.5, gate=0.6)
    brass = s.track('brass', 'brass', volume=-5.0, pan=0.1, reverb=0.32, role='melody', vel=0.8, gate=0.95)
    stab = s.track('brass stabs', 'brass', volume=-10.0, pan=-0.05, reverb=0.35, role='pad', vel=0.8, gate=0.5)
    pedal = s.track('low brass', 'brass', volume=-11.0, reverb=0.3, role='pad', vel=0.52, gate=0.9)
    horn = s.track('horn', 'horn', volume=-8.0, pan=-0.25, reverb=0.4, role='melody', vel=0.7, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-9.0, pan=0.15, reverb=0.4, role='melody', vel=0.62, gate=0.98,
                 width=0.6)
    wind = s.track('wind harp', E.WindHarp(swell=0.14, ring=1.0, catch=0.12, air=0.03), volume=-2.0, pan=0.2, reverb=0.45,
                   delay=0.15, role='melody', vel=0.74, gate=0.98)
    choir = s.track('choir', 'choir', volume=-13.0, reverb=0.5, role='pad', vel=0.56, gate=1.0)
    snare = s.track('snare', 'snare', volume=-9.0, pan=0.12, reverb=0.3, role='perc', pitched=False, vel=0.5,
                    humanize_ms=3, vel_jitter=0.05)
    timp = s.track('timpani', 'lowdrum', volume=-10.0, reverb=0.3, role='perc', vel=0.7)
    cym = s.track('cymbal', E.Cymbal(), volume=-20.0, pan=-0.2, reverb=0.35, role='perc', pitched=False, vel=0.6)
    bass = s.track('bass', 'bass', volume=-11.0, reverb=0.05, role='bass', vel=0.6, gate=0.8)

    # ---- the drive: rain on the eighths, timpani and low brass on the pulses, snare on the gusts ----------------------
    for bar in range(1, 81):
        name = BARS[bar - 1]
        sec = ('I' if bar <= 2 else 'A' if bar <= 18 else 'A2' if bar <= 34 else 'B' if bar <= 50 else 'C' if bar <= 66
               else 'R' if bar <= 78 else 'M')
        quiet = 67 <= bar <= 70
        if sec == 'M':
            continue
        r = E.root_note(name, 52)                                       # E3 .. D#4
        tt = E.tones(name, r, r + 13)
        third, fifth = tt[1], E.fifth_note(name, r)
        fig = [r, fifth, third + 12 if third + 12 < r + 19 else third, fifth, r + 12, fifth]   # six eighths, rain
        if bar >= 2:
            for i, p in enumerate(fig):
                v = 0.5 + (0.12 if i in (0, 3) else 0.0) - (0.04 if quiet else 0.0) + (0.04 if sec == 'C' else 0.0)
                rain.add(bs(bar) + 0.5 * i, p, 0.5, vel=v)
        if bar >= 3 and not quiet and sec != 'B':
            for i in (0, 3):
                pizz.add(bs(bar) + 0.5 * i, r - 12, 0.5, vel=0.5)
        r2 = E.root_note(name, 40)                                      # E2 .. D#3
        if not quiet:
            pedal.add(bs(bar), r2, 2.8, vel=0.5 if bar < 3 else 0.56)
            timp.add(bs(bar), r2 if r2 <= 47 else r2 - 12, 1.0, vel=0.66 if bar % 2 else 0.56)
            timp.add(bs(bar) + 1.5, E.fifth_note(name, 35), 1.0, vel=0.46)
            bass.add(bs(bar), r2 - 12, 1.5, vel=0.6)
            bass.add(bs(bar) + 1.5, r2 - 12, 1.5, vel=0.5)
        else:
            bass.add(bs(bar), r2 - 12, 3.0, vel=0.5)
            pedal.add(bs(bar), r2, 3.0, vel=0.44)
            timp.add(bs(bar), r2 if r2 <= 47 else r2 - 12, 1.0, vel=0.44)
        # the gusts: a snare swell (a soft roll rising into the second pulse) every second bar, flams in between
        if bar % 2 == 0 and not quiet:
            for k in range(6):
                snare.add(bs(bar) + 0.5 + 0.166 * k, 'c4', 0.16, vel=0.2 + 0.07 * k + (0.06 if sec in ('A2', 'C') else 0.0))
        elif bar >= 3 and not quiet:
            snare.add(bs(bar) + 1.5, 'c4', 0.5, vel=0.42 + (0.1 if sec in ('A2', 'C') else 0.0))
            if sec in ('A2', 'C'):
                snare.add(bs(bar) + 2.5, 'c4', 0.5, vel=0.3)
        if bar >= 3:
            choir.chord(bs(bar), E.tones(name, 55, 68)[:3], 3.0, vel=(0.42 if sec == 'A' else 0.52 if not quiet else 0.5))
        if bar in (2, 18, 34, 50, 66):
            cym.add(bs(bar), 'c3', 3.0, vel=0.6)                        # the wind lifting into the next section

    # ---- A and A2: the motif in the brass, its held C becoming the root of the next chord -------------------------------
    for bar in (3, 11):
        motif68(brass, bar, 55, 0.84)                                   # G3 D4 E4 C4
        stab.chord(bs(bar + 3) + 1.5, E.tones('C', 55, 68)[:3], 1.0, vel=0.7)
        hi.seq(t=bs(bar + 4), pattern='c6/1.5 b5/1.5 a5/3', vel=0.52)    # an answer as the held note lets go
    for bar in (19, 27):
        motif68(brass, bar, 55, 0.86)
        motif68(hi, bar, 67, 0.6)
        motif68(horn, bar, 43, 0.66)
        stab.chord(bs(bar + 3) + 1.5, E.tones('C', 55, 68)[:3], 0.8, vel=0.78)
        stab.chord(bs(bar + 3) + 2.5, E.tones('C', 55, 68)[:3], 0.5, vel=0.7)
    for bar in (7, 15, 23, 31):                                         # the dominant answers in the strings
        hi.seq(t=bs(bar), pattern='d#5/1.5 f#5/1.5 b5/3', vel=0.5)

    # ---- B: the Zephyr tune in E minor, re-barred to 6/8 ------------------------------------------------------------
    for t, p, dur, motif in E.tune68(64, 'aeolian', first_bar=35, beats_per_bar=BPB):
        bar = int(t // BPB) + 1
        if motif:
            wind.add(t, p, dur + (1.5 if dur >= 1.5 * 2 else 0.0), vel=0.78)   # E4 B4 C5 A4, the town's instrument
            horn.add(t, p - 12, dur, vel=0.4)
            continue
        if bar < 43:
            horn.add(t, p, dur, vel=0.72)
            hi.add(t, p + 12, dur, vel=0.56)
        else:
            brass.add(t, p, dur, vel=0.82)
            hi.add(t, p + 12, dur, vel=0.64)
            horn.add(t, p - 12, dur, vel=0.6)
    for bar in (42, 48):
        stab.chord(bs(bar) + 1.5, E.tones('B7', 54, 68)[:3], 0.8, vel=0.72)

    # ---- C: the motif climbs (E, G, A), the hemiola, the motif fortissimo ---------------------------------------------
    for bar, start, sixth in ((51, 52, 8), (55, 55, 9), (59, 57, 9)):     # E3 (B C A), G3 (D E C), A3 (E F# D)
        motif68(brass, bar, start, 0.86, hold=6.0, sixth=sixth)
        motif68(hi, bar, start + 12, 0.6, hold=6.0, sixth=sixth)
        motif68(horn, bar, start - 12, 0.66, hold=6.0, sixth=sixth)
    for bar in (63, 64):
        for k in range(3):                                               # hemiola: three quarter stabs against two pulses
            stab.chord(bs(bar) + k, E.tones('B7', 51, 66)[:4], 0.6, vel=0.72 + 0.06 * (bar - 63))
        for i in range(12):
            timp.add(bs(bar) + 0.25 * i, 'b1', 0.25, vel=0.28 + 0.04 * (bar - 63) + 0.03 * (i % 2 == 0))
    motif68(brass, 65, 55, 0.98, hold=4.5)
    motif68(hi, 65, 67, 0.82, hold=4.5)
    motif68(horn, 65, 43, 0.86, hold=4.5)

    # ---- R: the ostinato creeps back; the motif cut short; the B7 build --------------------------------------------------
    hi.seq(t=bs(67), pattern='e5/3 | c5/3 | e5/3 | d#5/3', vel=0.5)       # the strings hold the line while the rain thins
    hi.seq(t=bs(71), pattern='g5/1.5 d6/1.5 e6/3', vel=0.52)            # no fourth note
    hi.seq(t=bs(73), pattern='e5/1.5 b5/1.5 c6/3', vel=0.56)
    for bar in range(75, 79):
        for k in range(3):
            stab.chord(bs(bar) + k, E.tones('B7', 51, 66)[:4], 0.5, vel=0.56 + 0.06 * (bar - 75))
        for i in range(12):
            timp.add(bs(bar) + 0.25 * i, 'b1', 0.25, vel=0.24 + 0.05 * (bar - 75) + 0.03 * (i % 2 == 0))
    cym.add(bs(78), 'c3', 3.0, vel=0.7)

    # ---- M: E major, the wind harp's motif in its tonic guise, the A falling to G# ------------------------------------------
    for i, (p, at, dur) in enumerate((('e4', 0.0, 0.5), ('b4', 0.5, 0.5), ('c#5', 1.0, 0.5), ('a4', 1.5, 1.5))):
        wind.add(bs(79) + at, p, dur, vel=0.82)
    wind.add(bs(80), 'g#4', 3.0, vel=0.78)                               # the major third, held into the loop
    hi.add(bs(79), 'e5', 3.0, vel=0.42)
    hi.add(bs(80), 'g#5', 3.0, vel=0.4)
    choir.chord(bs(79), ['e4', 'g#4', 'b4'], 6.0, vel=0.42)
    horn.chord(bs(79), ['e3', 'b3'], 6.0, vel=0.46)
    pedal.add(bs(79), 'e2', 6.0, vel=0.4)
    bass.add(bs(79), 'e1', 6.0, vel=0.46)
    timp.add(bs(79), 'e2', 1.0, vel=0.5)
    return s
