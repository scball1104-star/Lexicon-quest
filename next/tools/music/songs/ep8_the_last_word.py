"""the_last_word: "Every Name" (CREDITS_EP8, the end title of thirteenth_name). E major, 80 BPM, 4/4, 88 bars (264 s), loops
(two passes cover a long credits). Manifest id `the_last_word`, file ep8_the_last_word.mp3.

The plan's brief (EPISODE8_PLAN 8.1): the credits; the motif on every instrument the series gave it, one after another as the
cast's places pass, joined in the last minute by the full ensemble, ending on the violin alone.

Each episode's motif instrument, as docs/MUSIC.md records it, gets an eight-bar station, in order (the credits' places run the
same way, Willowmere to the First Library): every station opens with the complete motif in E, E B C# A (0 +7 +9 +5), the A held
five beats into the IV chord, then the instrument's own answer (bars 3-4), then the violin reads the name back (bars 5-8,
quiet). Each instrument keeps the gesture its episode gave the motif:
  1 Willowmere   the music box (archive), high and plain, over harp eighths
  2 Hollowmere   the horn (hollowmere: the fourth note landing at last)
  3 Emberpeak    the dulcimer plays E B C# and the A is struck on a bell (emberpeak's missing note, first_bell's bell)
  4 Valewyn      the celesta, the A held across the bar line into Amaj7 (valewyn's held breath)
  5 Saffron      the oud, the A bent down a half step onto G#, the third of E, as the harmony lands on E (saffron's bend)
  6 Zephyr       the wind harp, swelling in, the A held over Amaj7#11 (zephyr's Lydian IV)
  7 Palehaven    the iceglass bell, the A left ringing while Episode 7's cello replies under it (palehaven's reply)
  8 The Library  the violin alone (61-62), then the seven come back one by one, each with one note of the name (63-66)
Then the full ensemble (69-84): the Scriptorium tune (ep8_theme.TUNE) finished, in E, twice, the second time with every motif
instrument on the motif notes; and the coda (85-88): everything falls away and the violin plays the motif alone, lets the A
fall to G#, and ends on E.

Form (station harmony: E, A, C#m7, B7sus4-B, A, E/G#, F#m7-B7sus4, E; even stations open on C#m7)
  I    1-4    E(add9), A, E, Bsus4: strings, harp, a celesta glint
  S1-7 5-60   the seven stations
  S8   61-68  the violin; the roll call; Bsus4-B with a timpani roll
  F    69-84  E, Amaj7, C#m7, F#m7-B7sus4, E/G#, F#m7-A, Amaj7-B7sus4, E (twice): tutti
  C    85-88  the violin alone
"""
from tracker import Song
import ep8_theme as E
import ep5_theme as E5
import ep6_theme as E6
import ep7_theme as E7
import synth

BPM = 80
I_CH = [[(0, 'Eadd9')], [(0, 'A')], [(0, 'E')], [(0, 'Bsus4')]]
ST_ODD = [[(0, 'E')], [(0, 'A')], [(0, 'C#m7')], [(0, 'B7sus4'), (2, 'B')], [(0, 'A')], [(0, 'E/G#')],
          [(0, 'F#m7'), (2, 'B7sus4')], [(0, 'E')]]
ST_EVEN = [[(0, 'C#m7')], [(0, 'A')], [(0, 'E/G#')], [(0, 'Bsus4')], [(0, 'A')], [(0, 'F#m7')], [(0, 'Bsus4'), (2, 'B')],
           [(0, 'E')]]
FIN = [[(0, 'E')], [(0, 'Amaj7')], [(0, 'C#m7')], [(0, 'F#m7'), (2, 'B7sus4')], [(0, 'E/G#')], [(0, 'F#m7'), (2, 'A')],
       [(0, 'Amaj7'), (2, 'B7sus4')], [(0, 'E')]]
C_CH = [[(0, 'E')], [(0, 'A')], [(0, 'E')], [(0, 'E')]]


def station_chords(k):
    """Station k (1..7): its eight bars of harmony, with each episode's own colour on bar 2."""
    ch = [list(b) for b in (ST_ODD if k % 2 else ST_EVEN)]
    if k == 4:
        ch[1] = [(0, 'Amaj7')]
    if k == 5:
        ch[1] = [(0, 'E')]                     # the oud's A is a suspension: it bends onto G#, the third of E
    if k == 6:
        ch[1] = [(0, 'Amaj7#11')]
    return ch


BARS = list(I_CH)
for k in range(1, 8):
    BARS += station_chords(k)
BARS += [[(0, 'E')], [(0, 'A')], [(0, 'C#m7')], [(0, 'A')], [(0, 'E/G#')], [(0, 'F#m7')], [(0, 'Bsus4')], [(0, 'B')]]
BARS += FIN + FIN + C_CH
assert len(BARS) == 88, len(BARS)
INTENDED = [b[0][1] for b in BARS]
MOTIF = (64, 71, 73, 69)                   # E4 B4 C#5 A4: 0 +7 +9 +5
ANSWER = [(0.0, 68, 1.5), (1.5, 66, 0.5), (2.0, 68, 1.0), (3.0, 71, 1.0), (4.0, 69, 2.0), (6.0, 66, 2.0)]   # bars 3-4
READ = 'c#5/2 b4/1 a4/1 | g#4/3 b4/1 | a4/2 f#4/2 | e4/4'                                                  # the violin, bars 5-8


def station_start(k):
    return 5 + 8 * (k - 1)


def segments(bar):
    segs = BARS[bar - 1]
    return [(b, (segs[i + 1][0] if i + 1 < len(segs) else 4) - b, name) for i, (b, name) in enumerate(segs)]


def section(bar):
    if bar <= 4:
        return 'I'
    if bar <= 60:
        return 'S'
    if bar <= 68:
        return 'S8'
    if bar <= 84:
        return 'F'
    return 'C'


def build():
    s = Song('ep8_the_last_word', bpm=BPM, beats_per_bar=4, bars=88, key='E major', title='Every Name',
             reverb_room=0.9, reverb_damp=0.42, reverb_len=4.6, reverb_level=-7.5, delay_beats=(0.75, 1.0),
             delay_feedback=0.26, delay_level=-19.0, target_lufs=-16.0, true_peak_trim=True, intended_chords=INTENDED)
    bs = s.bar_start

    violin = s.track('violin', E.Violin(swell=0.26, vib=0.13, vib_delay=0.38, breath=0.65), volume=-4.0, pan=-0.05,
                     reverb=0.45, delay=0.05, role='melody', vel=0.62, gate=0.97)
    box = s.track('music box (E1)', 'musicbox', volume=-7.0, pan=0.25, reverb=0.5, delay=0.2, role='melody', vel=0.6)
    horn = s.track('horn (E2)', 'horn', volume=-7.5, pan=-0.2, reverb=0.45, role='melody', vel=0.6, gate=0.95)
    dulc = s.track('dulcimer (E3)', 'dulcimer', volume=1.0, pan=0.2, reverb=0.4, role='melody', vel=0.62)
    bell = s.track('bell (E3)', 'bell', volume=-3.0, pan=0.1, reverb=0.5, role='melody', vel=0.7)
    cel = s.track('celesta (E4)', 'celesta', volume=-7.0, pan=0.3, reverb=0.5, delay=0.2, role='melody', vel=0.6, gate=1.0)
    oud = s.track('oud (E5)', E5.Oud(decay=1.6), volume=0.0, pan=-0.15, reverb=0.35, role='melody', vel=0.64)
    oudb = s.track('oud bend (E5)', E5.Oud(decay=2.2, bend=-1.0, bend_delay=1.1, bend_time=0.35), volume=0.0, pan=-0.15,
                   reverb=0.35, role='melody', vel=0.66)
    wind = s.track('wind harp (E6)', E6.WindHarp(swell=0.3, ring=1.4), volume=-5.0, pan=0.15, reverb=0.55, role='melody',
                   vel=0.64, gate=1.0)
    ice = s.track('iceglass bell (E7)', E7.IceglassBell(ring=4.2, beat=0.5, mallet=0.7, far=0.5), volume=-5.0, pan=0.18,
                  reverb=0.55, delay=0.15, role='melody', vel=0.7, gate=1.0)
    cello = s.track('cello (E7)', E7.Cello(bow=0.14, warmth=0.6), volume=-7.0, pan=-0.12, reverb=0.4, role='melody', vel=0.56,
                    gate=0.97)
    strings = s.track('strings', 'strings', volume=-16.0, reverb=0.55, role='pad', vel=0.42, gate=1.0)
    hi = s.track('high strings', 'strings_high', volume=-13.0, pan=0.12, reverb=0.5, role='melody', vel=0.5, gate=0.98)
    low = s.track('low strings', 'strings_low', volume=-17.0, reverb=0.45, role='bass', vel=0.44, gate=1.0, width=0.7)
    harp = s.track('harp', 'harp', volume=-15.0, pan=-0.25, reverb=0.45, role='arp', vel=0.48)
    choir = s.track('choir', 'choir', volume=-17.0, reverb=0.65, role='pad', vel=0.42, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-13.0, reverb=0.35, role='perc', vel=0.55)
    cym = s.track('cymbal', E6.Cymbal(), volume=-21.0, pan=-0.2, reverb=0.4, role='perc', pitched=False, vel=0.55)
    bass = s.track('bass', 'bass', volume=-18.0, reverb=0.05, role='bass', vel=0.5, gate=0.9)

    def motif(track, bar, octave=0, vel=0.66, last=None, hold=5.0):
        for i, p in enumerate(MOTIF):
            t = last if (i == 3 and last is not None) else track
            t.add(bs(bar) + i, p + octave, 1.0 if i < 3 else hold, vel=vel)

    def answer(track, bar, octave=0, vel=0.6):
        for b0, p, d in ANSWER:
            track.add(bs(bar) + b0, p + octave, d, vel=vel)

    # ---- I: the end title -------------------------------------------------------------------------------------------------
    cel.seq(bar=2, pattern='r/2 e6/1 b6/1 | g#6/4', vel=0.4)
    # ---- the seven stations ------------------------------------------------------------------------------------------------
    plan = [(box, 24, None), (horn, 0, None), (dulc, 12, bell), (cel, 12, None), (oud, 0, oudb), (wind, 0, None), (ice, 12, None)]
    for k, (inst, octv, last) in enumerate(plan, start=1):
        b = station_start(k)
        if k == 3:
            motif(dulc, b, 12, last=None, hold=1.0)                        # E B C# on the dulcimer ...
            dulc.notes.pop()                                                # ... and the A is not the dulcimer's
            bell.add(bs(b) + 3, 57, 5.0, vel=0.74)                          # A3 struck on the bell
        elif k == 5:
            motif(oud, b, 0, last=oudb, hold=5.0)                           # the A bends onto G#
        else:
            motif(inst, b, octv, vel=0.68 if k != 1 else 0.6)
        answer(inst if k != 5 else oud, b + 2, octv if k != 3 else 12)
        violin.seq(bar=b + 4, pattern=READ, vel=0.5)
        # the high strings hold the fourth note under the station's instrument (in Saffron they sigh A to G# with the bend)
        if k == 5:
            hi.seq(bar=b, beat=4, pattern='a4/2.5 g#4/2.5', vel=0.36)
        else:
            hi.add(bs(b) + 3, 69, 5.0, vel=0.3 if k != 3 else 0.36)
        if k == 7:
            cello.seq(bar=b + 1, pattern='r/1 b3/0.5 g#3/0.5 f#3/2', vel=0.56)   # palehaven's reply, under the ringing A
        if k == 1:
            for bar in range(b, b + 8):
                for i in range(8):
                    tt = E.tones(BARS[bar - 1][0][1], 52, 76)
                    harp.add(bs(bar) + 0.5 * i, tt[[0, 2, 1, 3, 4, 3, 2, 1][i] % len(tt)], 0.5, vel=0.42)
    # ---- S8: the violin, then the roll call -----------------------------------------------------------------------------------
    motif(violin, 61, 12, vel=0.7)                                          # E5 B5 C#6 A5
    violin.seq(bar=63, pattern='c#6/2 b5/1 a5/1 | g#5/3 b5/1 | a5/2 f#5/2 | e5/2 f#5/1 g#5/1 | a5/4 | b5/4', vel=0.64)
    call = [(box, 88), (horn, 64), (dulc, 76), (cel, 76), (oud, 64), (wind, 64), (ice, 76)]
    for i, (tr, p) in enumerate(call):                                      # each name, one note, every other beat
        tr.add(bs(63) + 2.0 * i, p, 2.0 if tr is not ice else 4.0, vel=0.5)
    for i in range(16):
        timp.add(bs(68) + 0.25 * i, 'b1', 0.25, vel=0.25 + 0.025 * i)
    # ---- F: the finished tune, tutti, twice --------------------------------------------------------------------------------
    for first, octv in ((69, 0), (77, 12)):
        for bar, beat, p, dur, mo in E.tune(64, 'major', first):
            violin.add(bs(bar) + beat, p + octv, dur, vel=0.72)
            hi.add(bs(bar) + beat, p + (12 if octv == 0 else 0), dur, vel=0.5 if octv == 0 else 0.4)
            if octv == 0:
                horn.add(bs(bar) + beat, p - 12, dur, vel=0.5)
            if mo and octv:
                for tr, o in ((box, 24), (cel, 12), (ice, 12), (dulc, 12)):
                    tr.add(bs(bar) + beat, p + o, dur, vel=0.3)
        timp.add(bs(first), 'e2', 1.0, vel=0.62)
        cym.add(bs(first) - 2.0, 'c3', 2.0, vel=0.35)
    # ---- C: the violin alone ------------------------------------------------------------------------------------------------
    violin.seq(bar=85, pattern='e5/1 b5/1 c#6/1 a5/1 | a5/2 g#5/2 | b4/2 g#4/2 | e4/4', vel=0.6)

    # ---- the bed ---------------------------------------------------------------------------------------------------------------
    for bar in range(1, 89):
        sec = section(bar)
        if sec == 'C':
            continue
        full = sec == 'F'
        for b0, ln, name in segments(bar):
            t0 = bs(bar) + b0
            strings.chord(t0, E.tones(name, 52, 68)[:4], ln, vel=0.4 if not full else 0.48)
            r = E.root_note(name, 40)
            low.add(t0, r - 12 if r >= 52 else r, ln, vel=0.4 if not full else 0.5)
            if sec != 'I' or bar > 2:
                bass.add(t0, (r - 12 if r >= 52 else r) - 12, min(ln, 2.0) * 0.9, vel=0.42 if not full else 0.52)
            if full:
                choir.chord(t0, E.tones(name, 57, 72)[:3], ln, vel=0.44)
                tt = E.tones(name, 52, 80)
                for i in range(int(ln * 2)):
                    harp.add(t0 + 0.5 * i, tt[[0, 2, 4, 3, 5, 4, 2, 1][i % 8] % len(tt)], 0.5, vel=0.46)
        if sec == 'I':
            for i in range(8):
                tt = E.tones(BARS[bar - 1][0][1], 52, 76)
                harp.add(bs(bar) + 0.5 * i, tt[[0, 2, 1, 3, 4, 3, 2, 1][i] % len(tt)], 0.5, vel=0.38)
        if full and bar % 2 == 1:
            timp.add(bs(bar) + 2.0, 'b1' if bar % 4 == 3 else 'e2', 1.0, vel=0.42)
    return s
