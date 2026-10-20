"""hollowmere: "Hollowmere" (the town after `nh_restored`, the end of `king_after`, the Episode 2 credits).
D major, 84 BPM, 3/4, 32 bars (68.6 s), loops.

The Hollow's lullaby (lullaby.py) brought into the light: the same tune and the same mirrored answers, now in
D major with full strings, horn and glockenspiel, and the name motif's fourth note finally lands (D A B G,
1-5-6-4). The horn sings the motif first; in the coda the Hollow's music box plays it once more, complete.

Form
  A     1-8   horn asks (D A B G), celesta answers in mirror (D G F# A); strings take the falling phrase
  A'    9-16  high strings lead with the glockenspiel an octave up, the horn holds a countermelody
  B     17-24 the climb (F#m, G, A, Gmaj7, Em7, D, G, A7), timpani and pizzicato lift it
  coda  25-32 horn and strings in octaves, the music box's complete motif, the mirror lands on A over Gmaj7
Chords: D, D6, G, Gmaj7, F#m, Em7, A, D / ... / F#m, G, A, Gmaj7, Em7, D, G, A7 / D, D6, G, Gmaj7 x2.
"""
from tracker import Song
import lullaby as L

MODE = 'major'
LEAD = 74       # D5
HORN = 62       # D4
LOW = 50        # D3


def chord_label(bar):
    names = {0: 'D', 1: 'Em', 2: 'F#m', 3: 'G', 4: 'A'}
    root, kind = L.CHORDS[bar - 1]
    lab = names[root]
    if kind == '6':
        lab += '6'
    elif kind == '7':
        lab += {0: 'maj7', 1: '7', 2: '7', 3: 'maj7', 4: '7'}[root]
    return lab


def build():
    chords = [chord_label(b) for b in range(1, 33)]
    s = Song('hollowmere', bpm=84, beats_per_bar=3, bars=32, key='D major', title='Hollowmere',
             reverb_room=0.84, reverb_damp=0.3, reverb_len=3.4, reverb_level=-7.5,
             delay_beats=(1.5, 1.0), delay_feedback=0.25, delay_level=-16.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=chords)
    bs = s.bar_start

    hi = s.track('high strings', 'strings_high', volume=-8.5, pan=0.1, reverb=0.4, role='melody', vel=0.66, gate=0.98, width=0.6)
    horn = s.track('horn', 'horn', volume=-8.0, pan=-0.2, reverb=0.4, role='melody', vel=0.68, gate=0.95)
    celesta = s.track('celesta', 'celesta', volume=-8.5, pan=0.3, reverb=0.45, delay=0.2, role='melody', vel=0.62, humanize_ms=4)
    glock = s.track('glockenspiel', 'glock', volume=-10.0, pan=0.35, reverb=0.4, delay=0.15, role='melody', vel=0.55, humanize_ms=3)
    musicbox = s.track('music box', 'musicbox', volume=-9.0, pan=0.2, reverb=0.45, delay=0.3, role='melody', vel=0.66)
    harp = s.track('harp', 'harp', volume=-5.0, pan=-0.35, reverb=0.35, role='arp', humanize_ms=6, vel_jitter=0.04)
    strings = s.track('strings', 'strings', volume=-17.0, reverb=0.45, role='pad', vel=0.5, gate=1.0, width=0.9)
    lowstr = s.track('low strings', 'strings_low', volume=-17.0, reverb=0.35, role='pad', vel=0.52, gate=1.0, width=0.6)
    bass = s.track('bass', 'bass', volume=-15.0, reverb=0.05, role='bass', vel=0.55, gate=0.9)
    pizz = s.track('pizzicato', 'pizz', volume=-11.0, pan=0.25, reverb=0.3, role='perc', vel=0.45)
    choir = s.track('choir', 'choir', volume=-18.0, reverb=0.55, role='pad', vel=0.5, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-13.0, reverb=0.35, role='perc', vel=0.6)

    # ---- the melody, complete -----------------------------------------------------------------------
    def voices(bar, role):
        if bar <= 8:
            if role == 'P':
                return [(horn, HORN, 0.7)] if bar <= 2 else [(hi, LEAD, 0.64)]
            return [(celesta, LEAD, 0.62)] + ([(glock, LEAD + 12, 0.45)] if bar >= 7 else [])
        if bar <= 24:
            if role == 'P':
                return [(hi, LEAD, 0.68), (glock, LEAD + 12, 0.5)] if bar <= 16 else [(hi, LEAD, 0.72)]
            return [(celesta, LEAD, 0.64)] + ([(glock, LEAD + 12, 0.48)] if bar >= 17 else [(hi, LEAD, 0.46)])
        # coda
        if role == 'P':
            if bar <= 26:
                return [(horn, HORN, 0.74), (hi, LEAD, 0.66)]
            return [(musicbox, LEAD + 12, 0.66), (glock, LEAD + 12, 0.42), (hi, LEAD, 0.6)]
        return [(hi, LEAD, 0.66), (celesta, LEAD, 0.55)]

    for bar, beat, d, dur, role in L.phrase_notes(1, 32, complete=True):
        for tr, tonic, v in voices(bar, role):
            tr.add(bs(bar) + beat, L.pitch(tonic, MODE, d), dur, vel=v)

    # ---- horn countermelody in A' and B (long chord tones, a third or sixth under the tune) ----------
    counter = {9: 'f#4', 10: 'f#4', 11: 'b4', 12: 'a4', 13: 'a4', 14: 'g4', 15: 'e4', 16: 'f#4',
               17: 'a4', 18: 'b4', 19: 'c#5', 20: 'b4', 21: 'g4', 22: 'f#4', 23: 'b4', 24: 'a4'}
    for bar, p in counter.items():
        horn.add(bs(bar), p, 3.0, vel=0.4 if bar < 17 else 0.46)

    # ---- harp: the waltz as an arpeggio (root on 1, chord tones in eighths on 2 and 3) -------------------
    for bar in range(1, 33):
        tones = L.chord_degrees(bar)
        root = L.pitch(LOW - 12, MODE, tones[0])
        if root > 45:
            root -= 12
        up = [L.pitch(LOW, MODE, d) for d in tones[1:]] + [L.pitch(LOW + 12, MODE, tones[0])]
        v = 0.5 if bar < 17 else 0.56
        harp.add(bs(bar), root + 12, 1.0, vel=v + 0.05, gate=1.6)
        fig = [up[0], up[1], up[-1], up[1]]
        for i, p in enumerate(fig):
            harp.add(bs(bar) + 1 + 0.5 * i, p, 0.5, vel=v - 0.04 + (0.05 if i == 2 else 0.0), gate=1.6)

    # ---- strings, low strings, bass, pizzicato ------------------------------------------------------------
    for bar in range(1, 33):
        tones = L.chord_degrees(bar)
        root_deg = tones[0]
        voicing = sorted(L.pitch(LOW + 12, MODE, d) for d in tones[:3])
        strings.chord(bs(bar), voicing, 3.0, vel=0.42 if bar <= 8 else 0.5)
        r = L.pitch(LOW - 12, MODE, root_deg)
        if r > 45:
            r -= 12
        if bar >= 9:
            lowstr.chord(bs(bar), [r + 12, r + 19], 3.0, vel=0.5)
        bass.add(bs(bar), r, 2.0, vel=0.55)
        if 17 <= bar <= 24:
            pizz.add(bs(bar) + 1, r + 24, 0.5, vel=0.42)
            pizz.add(bs(bar) + 2, r + 19, 0.5, vel=0.36)

    # ---- choir in the coda; timpani marks the sections and rolls into the loop ----------------------------
    for bar in range(25, 33):
        tones = L.chord_degrees(bar)
        choir.chord(bs(bar), sorted(L.pitch(LOW + 12, MODE, d) for d in tones[:3]), 3.0, vel=0.48)
    for bar, v in ((1, 0.55), (9, 0.5), (17, 0.62), (21, 0.5), (25, 0.66)):
        timp.add(bs(bar), 'd2', 1.0, vel=v)
    timp.add(bs(24), 'a1', 1.0, vel=0.5)
    for i in range(6):   # a soft roll on A into bar 1
        timp.add(bs(32) + 1.5 + i * 0.25, 'a1', 0.25, vel=0.3 + 0.04 * i)
    return s
