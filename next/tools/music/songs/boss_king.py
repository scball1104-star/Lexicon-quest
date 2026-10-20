"""boss_king: "The Nameless King" (the King's battle). C minor, 6/8 at 132 BPM (quarter-note pulse, so the
dotted quarter is 88), 88 bars (120 s), loops.

Harpsichord ostinato, low strings driving long-short, brass stabs, choir. The name motif is in the brass from
the third (Eb Bb C, the minor-mode guise), and it never gets its fourth note: where the Ab belongs a brass
stab and a timpani hit land instead. That is the King: a song with its last word struck out.

The B section is the Hollow's lullaby (lullaby.py) turned into a minor-key march, the father's song as a
weapon: the same degrees in C minor (raised seventh over the dominant), re-barred to the 6/8 lilt, brass and
strings in octaves over snare and timpani, a stab on every missing fourth note. Before the loop, a short
major statement: the lullaby in C major on the Hollow's own music box and celesta (the man under the glass),
then the ostinato creeps back and the dominant builds into bar 1.

Form (bar: chords)
  I    1-4    Cm pedal, harpsichord alone, low strings and timpani join, G7
  A    5-20   Cm, Ab, Fm, G7, Cm, Db, Bb, G-G7: brass motif + stab (Cm, Fm, Cm, and the major-shaped F C D over Bb)
  A2   21-28  Cm, Ab, Fm, G7, Cm, Db, G7sus4, G7: choir, the motif higher
  B    29-52  the lullaby march (lullaby bars 1-24): Cm, Ab/C, Fm, Fm7, Eb, Dm7b5, G, Cm ... G7
  C    53-68  rising sequence of the motif (Cm, Db, Eb, Fm), a G7b9 hemiola pedal, the motif fortissimo, Ab, G7
  M    69-76  C major: the lullaby's motif and mirror on music box and celesta (C, C6, F, Fmaj7 x2)
  R    77-88  Cm ostinato returns, Ab, Fm with the minor motif in the strings, G7 build into bar 1
"""
from tracker import Song
import synth
import lullaby as L

CH = {
    'Cm': (0, (0, 3, 7)), 'Ab': (8, (0, 4, 7)), 'Fm': (5, (0, 3, 7)), 'Fm7': (5, (0, 3, 7, 10)),
    'G7': (7, (0, 4, 7, 10)), 'G': (7, (0, 4, 7)), 'Db': (1, (0, 4, 7)), 'Bb': (10, (0, 4, 7)),
    'G7sus4': (7, (0, 5, 7, 10)), 'Eb': (3, (0, 4, 7)), 'Dm7b5': (2, (0, 3, 6, 10)), 'Ab/C': (8, (0, 4, 7)),
    'C': (0, (0, 4, 7)), 'C6': (0, (0, 4, 7, 9)), 'F': (5, (0, 4, 7)), 'Fmaj7': (5, (0, 4, 7, 11)),
    'G7b9': (7, (0, 4, 7, 10, 13)),
}
BASS_PC = {'Ab/C': 0}

MARCH_CHORD = {(0, '5'): 'Cm', (0, '6'): 'Ab/C', (3, '5'): 'Fm', (3, '7'): 'Fm7', (2, '5'): 'Eb',
               (1, '7'): 'Dm7b5', (4, '5'): 'G', (4, '7'): 'G7'}

BARS = (['Cm', 'Cm', 'Cm', 'G7'] +
        ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G7', 'G7', 'Cm', 'Cm', 'Db', 'Db', 'Bb', 'Bb', 'G', 'G7'] +
        ['Cm', 'Ab', 'Fm', 'G7', 'Cm', 'Db', 'G7sus4', 'G7'] +
        [MARCH_CHORD[L.CHORDS[k]] for k in range(24)] +
        ['Cm', 'Cm', 'Db', 'Db', 'Eb', 'Eb', 'Fm', 'Fm', 'G7b9', 'G7b9', 'G7b9', 'G7b9', 'Cm', 'Cm', 'Ab', 'G7'] +
        ['C', 'C6', 'F', 'Fmaj7', 'C', 'C6', 'F', 'Fmaj7'] +
        ['Cm', 'Cm', 'Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G7', 'G7', 'G7', 'G7'])
assert len(BARS) == 88, len(BARS)

MARCH_FROM, M_FROM = 29, 69


def pcs(name):
    root, ivs = CH[name]
    return [(root + iv) % 12 for iv in ivs]


def tones_in(name, lo, hi):
    """Chord tones of `name` with lo <= midi < hi, sorted."""
    return sorted(p for p in range(lo, hi) if p % 12 in pcs(name))


def root_pitch(name, lo):
    pc = BASS_PC.get(name, CH[name][0])
    return lo + (pc - lo) % 12


# ------------------------------------------------------------------------------- the march
def march_bar(lbar):
    """The lullaby's bar `lbar` re-barred to 6/8: [(onset, beats, degree)], plus the onset of a stab when
    the motif's fourth note belongs in this bar (None otherwise)."""
    raw = [n for b, r, n in L.PHRASES if b == lbar][0]
    stab = None
    on, notes = 0.0, []
    for d, dur in raw:
        if d in (L.FOURTH, L.FOURTH_R):
            stab = on
        elif d is not None:
            notes.append((on, dur, d))
        on += dur
    shape = tuple(o for o, _, _ in notes)
    if shape == (0.0, 1.0):
        new = [(0.0, 1.5), (1.5, 1.5)]
    elif shape == (0.0, 2.0):
        new = [(0.0, 1.5), (1.5, 1.5)]
    elif shape == (0.0, 1.0, 2.0):
        new = [(0.0, 1.0), (1.0, 0.5), (1.5, 1.5)]
    elif shape == (1.0, 2.0):
        new = [(1.5, 1.0), (2.5, 0.5)]
    elif shape == (0.0,):
        new = [(0.0, 1.5 if (stab is not None or notes[0][1] < 3) else 3.0)]
    else:
        raise ValueError(shape)
    if stab is not None:
        stab = 1.5
    return [(o, d, n[2]) for (o, d), n in zip(new, notes)], stab


def march_pitch(tonic, degree, chord):
    p = L.pitch(tonic, 'aeolian', degree)
    if chord in ('G', 'G7') and p % 12 == 10:   # raised seventh over the dominant
        p += 1
    return p


def build():
    s = Song('boss_king', bpm=132, beats_per_bar=3, bars=88, key='C minor', title='The Nameless King',
             reverb_room=0.84, reverb_damp=0.35, reverb_len=3.0, reverb_level=-9.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.25, delay_level=-17.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    harpsi = s.track('harpsichord', 'harpsichord', volume=-3.0, pan=-0.2, reverb=0.22, role='arp', vel=0.7, gate=0.8, humanize_ms=2)
    spicc = synth.StringsPad(attack=0.018, detune=6.0, dark=900.0, bright=2800.0, sub=0.15, release=0.14)
    spicc.name = 'strings_low'
    lows = s.track('low strings', spicc, volume=-8.5, reverb=0.25, role='bass', vel=0.7, gate=0.7, width=0.6)
    bass = s.track('bass', 'bass', volume=-12.0, reverb=0.05, role='bass', vel=0.62, gate=0.85)
    brass = s.track('brass', 'brass', volume=-7.5, pan=0.1, reverb=0.32, role='melody', vel=0.8, gate=0.92)
    stab = s.track('brass stabs', 'brass', volume=-10.5, pan=-0.05, reverb=0.35, role='pad', vel=0.85, gate=0.5)
    horn = s.track('horn', 'horn', volume=-10.0, pan=-0.25, reverb=0.38, role='melody', vel=0.7, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-11.0, pan=0.15, reverb=0.38, role='melody', vel=0.68, gate=0.98, width=0.6)
    choir = s.track('choir', 'choir', volume=-12.5, reverb=0.5, role='pad', vel=0.62, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-10.5, reverb=0.3, role='perc', vel=0.7)
    snare = s.track('snare', 'snare', volume=-9.0, pan=0.1, reverb=0.25, role='perc', pitched=False, vel=0.6, vel_jitter=0.04, humanize_ms=3)
    musicbox = s.track('music box', 'musicbox', volume=-2.5, pan=0.25, reverb=0.5, delay=0.35, role='melody', vel=0.66)
    celesta = s.track('celesta', 'celesta', volume=-3.0, pan=-0.25, reverb=0.5, delay=0.3, role='melody', vel=0.62)
    harp = s.track('harp', 'harp', volume=1.0, pan=-0.3, reverb=0.4, role='arp', humanize_ms=5)
    pad = s.track('strings', 'strings', volume=-11.0, reverb=0.45, role='pad', vel=0.5, gate=1.0, width=0.9)

    def stab_chord(bar, beat, name, v=0.85, dur=0.5):
        stab.chord(bs(bar) + beat, tones_in(name, 53, 67)[:4], dur, vel=v)

    # ---- harpsichord ostinato: a descending top line over a repeated pedal tone (not in M) ------------------
    for bar in range(1, 89):
        if M_FROM <= bar < M_FROM + 8:
            continue
        name = BARS[bar - 1]
        top = tones_in(name, 66, 79)[-3:]
        ped = root_pitch(name, 55)
        fig = [top[2], ped, top[1], ped, top[0], ped]
        v = 0.62 if bar < 5 else 0.72
        if MARCH_FROM <= bar < MARCH_FROM + 24:
            v = 0.6
        if 77 <= bar <= 80:
            v = 0.5 + 0.03 * (bar - 77)
        for i, p in enumerate(fig):
            harpsi.add(bs(bar) + 0.5 * i, p, 0.5, vel=v + (0.08 if i in (0, 3) else 0.0))

    # ---- low strings and bass: long-short long-short on the root ------------------------------------------
    for bar in range(3, 89):
        if M_FROM <= bar < M_FROM + 8:
            continue
        name = BARS[bar - 1]
        r = root_pitch(name, 36)
        v = 0.66 if bar >= 5 else 0.55
        if 77 <= bar <= 80:
            v = 0.5
        for on, d, p in ((0.0, 1.0, r), (1.0, 0.5, r), (1.5, 1.0, r + 12 if bar % 2 else r + 7), (2.5, 0.5, r)):
            lows.add(bs(bar) + on, p, d, vel=v + (0.08 if on in (0.0, 1.5) else 0.0))
        if bar >= 5 and not (77 <= bar <= 80):
            bass.add(bs(bar), r - 12 if r - 12 >= 28 else r, 1.5, vel=0.62)
            bass.add(bs(bar) + 1.5, r - 12 if r - 12 >= 28 else r, 1.5, vel=0.55)

    # ---- timpani: the pulse in A and the march, rolls into the climaxes -----------------------------------
    for bar in list(range(5, 29)) + list(range(53, 61)):
        name = BARS[bar - 1]
        r = root_pitch(name, 36)
        timp.add(bs(bar), r if r <= 43 else r - 12, 1.0, vel=0.62)
        if bar % 2 == 0:
            timp.add(bs(bar) + 1.5, root_pitch('G', 31), 1.0, vel=0.5)
    timp.add(bs(4), 'g1', 1.0, vel=0.7)
    timp.add(bs(4) + 1.5, 'g1', 1.0, vel=0.6)

    def roll(bar_from, bar_to, pitch, v0, v1):
        n = int((bar_to - bar_from + 1) * 3 / 0.25)
        for i in range(n):
            timp.add(bs(bar_from) + i * 0.25, pitch, 0.25, vel=v0 + (v1 - v0) * i / max(1, n - 1))

    roll(61, 64, 'g1', 0.35, 0.8)
    roll(85, 88, 'g1', 0.3, 0.85)

    # ---- intro: choir swell; brass motif in A and A2, each with its stab where the fourth note belongs ------
    choir.chord(bs(3), ['c4', 'eb4', 'g4'], 6.0, vel=0.45)
    motif = [(5, 'eb4 bb4 c5', brass), (9, 'ab4 eb5 f5', brass), (13, 'eb4 bb4 c5', brass),
             (17, 'f4 c5 d5', horn), (21, 'eb4 bb4 c5', brass), (23, 'ab4 eb5 f5', brass),
             (25, 'g4 d5 eb5', brass)]
    for bar, notes, tr in motif:
        stab_name = BARS[bar]          # the chord of the bar where the fourth note belongs
        a, b, c = notes.split()
        tr.seq(bar=bar, pattern='%s/1.5 %s/1.5 | %s/1.5' % (a, b, c), vel=0.82)
        stab_chord(bar + 1, 1.5, stab_name, v=0.92)
        timp.add(bs(bar + 1) + 1.5, root_pitch(stab_name, 36) if root_pitch(stab_name, 36) <= 43 else root_pitch(stab_name, 36) - 12, 1.0, vel=0.85)
    # the high strings: one answer per motif (lullaby fragments, falling)
    hi.seq(bar=7, pattern='c5/1.5 bb4/1.5 | ab4/3', vel=0.6)
    hi.seq(bar=11, pattern='d5/1 eb5/0.5 d5/1.5 | b4/3', vel=0.62)
    hi.seq(bar=15, pattern='db5/1.5 c5/1.5 | ab4/3', vel=0.62)
    hi.seq(bar=19, pattern='b4/1.5 c5/1.5 | d5/1.5 f5/1.5', vel=0.66)
    hi.seq(bar=27, pattern='c5/3 | b4/1.5 d5/1.5', vel=0.7)
    horn.seq(bar=27, pattern='g4/3 | g4/1.5 f4/1.5', vel=0.66)
    # brass stabs on the strong chord changes of A
    for bar in (7, 11, 15, 19, 20):
        stab_chord(bar, 0.0, BARS[bar - 1], v=0.78)
    for bar in range(21, 29):
        choir.chord(bs(bar), tones_in(BARS[bar - 1], 55, 68)[:3], 3.0, vel=0.55)

    # ---- B: the lullaby march (lullaby bars 1-24 -> bars 29-52) ------------------------------------------
    roles = {}
    for b, r, _ in L.PHRASES:
        roles[b] = r
    for lbar in range(1, 25):
        bar = MARCH_FROM + lbar - 1
        name = BARS[bar - 1]
        notes, st = march_bar(lbar)
        for on, d, deg in notes:
            if roles[lbar] == 'P':
                brass.add(bs(bar) + on, march_pitch(60, deg, name), d, vel=0.82)
                hi.add(bs(bar) + on, march_pitch(72, deg, name), d, vel=0.66)
            else:
                horn.add(bs(bar) + on, march_pitch(60, deg, name), d, vel=0.74)
                hi.add(bs(bar) + on, march_pitch(72, deg, name), d, vel=0.62)
        if st is not None:
            stab_chord(bar, st, name, v=0.95)
            timp.add(bs(bar) + st, root_pitch(name, 36) if root_pitch(name, 36) <= 43 else root_pitch(name, 36) - 12, 1.0, vel=0.9)
        # snare: the march (accents on the dotted quarters), a roll before each 8-bar phrase
        for i in range(6):
            v = (0.82, 0.32, 0.46, 0.74, 0.32, 0.5)[i]
            snare.add(bs(bar) + 0.5 * i, 'c4', 0.5, vel=v)
        if lbar in (8, 16, 24):
            for i in range(6):
                snare.add(bs(bar) + 1.5 + 0.25 * i, 'c4', 0.25, vel=0.4 + 0.07 * i)
        if lbar >= 9:
            choir.chord(bs(bar), tones_in(name, 55, 68)[:3], 3.0, vel=0.5 if lbar < 17 else 0.6)

    # ---- C: the rising sequence, the G7b9 hemiola, the motif fortissimo ------------------------------------
    for bar, notes, name in ((53, 'eb4 bb4 c5', 'Cm'), (55, 'f4 c5 db5', 'Db'), (57, 'g4 d5 eb5', 'Eb'),
                             (59, 'ab4 eb5 f5', 'Fm')):
        a, b, c = notes.split()
        brass.seq(bar=bar, pattern='%s/1.5 %s/1.5 | %s/1.5' % (a, b, c), vel=0.84)
        hi.seq(bar=bar, pattern='%s/1.5 %s/1.5 | %s/1.5' % tuple(n[:-1] + str(int(n[-1]) + 1) for n in (a, b, c)), vel=0.6)
        stab_chord(bar + 1, 1.5, name, v=0.95)
        for i in range(6):
            snare.add(bs(bar) + 0.5 * i, 'c4', 0.5, vel=(0.7, 0.3, 0.4, 0.62, 0.3, 0.42)[i])
            snare.add(bs(bar + 1) + 0.5 * i, 'c4', 0.5, vel=(0.7, 0.3, 0.4, 0.62, 0.3, 0.42)[i])
    for bar in range(61, 65):
        for k in range(3):   # hemiola: three quarter-note stabs against the 6/8
            stab_chord(bar, float(k), 'G7b9', v=0.7 + 0.05 * (bar - 61), dur=0.45)
        choir.chord(bs(bar), ['g3', 'b3', 'f4', 'ab4'], 3.0, vel=0.55 + 0.05 * (bar - 61))
        hi.seq(bar=bar, pattern='ab5/0.5 g5/0.5 ab5/0.5 g5/0.5 ab5/0.5 g5/0.5', vel=0.5 + 0.05 * (bar - 61))
        for i in range(12):
            snare.add(bs(bar) + 0.25 * i, 'c4', 0.25, vel=0.25 + 0.03 * (bar - 61) + 0.02 * (i % 3 == 0))
    brass.seq(bar=65, pattern='eb4/1.5 bb4/1.5 | c5/1.5', vel=0.95)
    horn.seq(bar=65, pattern='g4/1.5 d5/1.5 | eb5/1.5', vel=0.85)
    hi.seq(bar=65, pattern='eb5/1.5 bb5/1.5 | c6/1.5', vel=0.8)
    stab_chord(66, 1.5, 'Ab', v=1.0)
    timp.add(bs(66) + 1.5, 'ab1', 1.0, vel=0.95)
    for bar in (65, 66, 67, 68):
        choir.chord(bs(bar), tones_in(BARS[bar - 1], 55, 68)[:3], 3.0, vel=0.66)
    hi.seq(bar=67, pattern='c5/1.5 ab4/1.5 | b4/1.5 d5/1.5', vel=0.7)
    stab_chord(67, 0.0, 'Ab', v=0.85)
    stab_chord(68, 0.0, 'G7', v=0.85)
    stab_chord(68, 1.5, 'G7', v=0.75)
    timp.add(bs(67), 'ab1', 1.0, vel=0.8)
    timp.add(bs(68), 'g1', 1.0, vel=0.8)

    # ---- M: the man under the glass (C major, the lullaby's motif and mirror) --------------------------------
    for lbar, bar in ((1, 69), (2, 70), (3, 71), (4, 72), (29, 73), (30, 74), (31, 75), (32, 76)):
        for b, beat, d, dur, role in L.phrase_notes(lbar, lbar, complete=False):
            tr = musicbox if role == 'P' else celesta
            tr.add(bs(bar) + beat, L.pitch(72, 'major', d), dur, vel=0.62 if role == 'P' else 0.56)
    for bar in range(M_FROM, M_FROM + 8):
        name = BARS[bar - 1]
        pad.chord(bs(bar), tones_in(name, 55, 68)[:3], 3.0, vel=0.42)
        r = root_pitch(name, 36)
        harp.add(bs(bar), r + 12, 1.5, vel=0.5, gate=1.6)
        up = tones_in(name, 55, 72)
        for i, p in enumerate([up[1], up[2], up[-1], up[2]]):
            harp.add(bs(bar) + 1.0 + 0.5 * i, p, 0.5, vel=0.44, gate=1.6)
    choir.chord(bs(73), ['c4', 'e4', 'g4'], 6.0, vel=0.36)

    # ---- R: the ostinato creeps back; the minor motif in the strings; the dominant builds into bar 1 ---------
    for bar in range(77, 81):
        pad.chord(bs(bar), ['c4', 'eb4', 'g4'], 3.0, vel=0.38)
    hi.seq(bar=81, pattern='c5/1.5 g5/1.5 | ab5/3', vel=0.62)        # 0 4 5 in C minor: the motif, minor and cut short
    hi.seq(bar=83, pattern='f5/1.5 c5/1.5 | ab4/3', vel=0.66)
    for bar in range(81, 85):
        choir.chord(bs(bar), tones_in(BARS[bar - 1], 55, 68)[:3], 3.0, vel=0.48 + 0.04 * (bar - 81))
    stab_chord(81, 0.0, 'Ab', v=0.8)
    stab_chord(83, 0.0, 'Fm', v=0.82)
    for bar in range(85, 89):
        for k in range(3):
            stab_chord(bar, float(k), 'G7', v=0.72 + 0.06 * (bar - 85), dur=0.45)
        choir.chord(bs(bar), ['g3', 'b3', 'd4', 'f4'], 3.0, vel=0.58 + 0.05 * (bar - 85))
        for i in range(12):
            snare.add(bs(bar) + 0.25 * i, 'c4', 0.25, vel=0.22 + 0.06 * (bar - 85) + 0.03 * (i % 3 == 0))
    brass.seq(bar=85, pattern='g4/3 | ab4/3 | b4/3 | d5/1.5 r/1.5', vel=0.8)
    hi.seq(bar=85, pattern='g5/3 | ab5/3 | b5/3 | d6/1.5 r/1.5', vel=0.66)
    return s
