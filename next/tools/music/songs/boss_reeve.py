"""boss_reeve: "One Short" (the Barrow Reeve). E minor, 132 BPM (quarter), 12/8, 36 bars (98.2 s), loops.

A counting battle. A bar of 12/8 is four groups of three eighths; here the fourth group of every bar is missing from
every instrument, so the drive always stops one short: bone flutes run an eighth-note figure through groups one to three,
two frame drums knock a "bum ba ba" on each of them, a low pulse follows, and the fourth group is silence. The count is
twelve and the thirteenth never comes.

The choir sings the name motif one note short, in minor from the third: G D E (G4 D5 E5), one note to each of the
three groups, and the fourth group, where the C belongs, is the missing beat. It does this every four bars. The one
resolution is at the loop: the last bar is E major, the fourth group is present in every voice, and the choir sings
the motif complete and in the major, E B C# A, so the count finally reaches its end before the track starts over.

Form
  I    1-4    Em: frame drums and the low pulse
  A    5-12   Em Em C D Em G Am B7: bone flutes in the middle register, the choir's three notes every four bars
  A'   13-20  the same, flutes an octave up, timpani on the first group, the choir in thirds
  B    21-28  C G D Em C G D B7: the climax, the choir's three notes every two bars, low strings hits
  A''  29-35  Em Em C D Em Am B7: back to the drive, the flutes thinning, the choir under them
  R    36     E major: the complete count, the complete motif
"""
from tracker import Song
import e3_theme as T

A = ['Em', 'Em', 'C', 'D', 'Em', 'G', 'Am', 'B7']
B = ['C', 'G', 'D', 'Em', 'C', 'G', 'D', 'B7']
BARS = ['Em'] * 4 + A + A + B + ['Em', 'Em', 'C', 'D', 'Em', 'Am', 'B7'] + ['E']
assert len(BARS) == 36

GROUP = 1.5   # beats (quarters) per group of three eighths
FIGS = [[0, 1, 2], [2, 1, 2], [1, 2, 3]]


def build():
    s = Song('boss_reeve', bpm=132, beats_per_bar=6, bars=36, key='E minor', title='One Short',
             reverb_room=0.82, reverb_damp=0.4, reverb_len=3.0, reverb_level=-8.5,
             delay_beats=(0.75, 0.5), delay_feedback=0.25, delay_level=-18.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    fl = s.track('bone flutes', 'boneflute', volume=-11.0, pan=-0.2, reverb=0.35, delay=0.15, role='arp', vel=0.56, gate=0.9, humanize_ms=3)
    fl2 = s.track('bone flutes 2', 'boneflute', volume=-11.0, pan=0.3, reverb=0.35, delay=0.15, role='arp', vel=0.5, gate=0.9, humanize_ms=3)
    choir = s.track('choir', 'choir', volume=-6.0, reverb=0.55, role='melody', vel=0.6, gate=0.95)
    chpad = s.track('choir pad', 'choir', volume=-16.0, reverb=0.6, role='pad', vel=0.36, gate=1.0)
    drum = s.track('frame drum', 'framedrum', volume=-1.0, pan=-0.1, reverb=0.3, role='perc', vel=0.5, humanize_ms=4)
    drum2 = s.track('frame drum high', 'framedrum', volume=-5.0, pan=0.2, reverb=0.3, role='perc', vel=0.4, humanize_ms=4)
    timp = s.track('timpani', 'lowdrum', volume=-5.0, reverb=0.45, role='perc', vel=0.5)
    low = s.track('low strings', 'strings_low', volume=-11.0, reverb=0.4, role='pad', vel=0.4, gate=1.0, width=0.7)
    bass = s.track('bass', 'bass', volume=-10.0, reverb=0.1, role='bass', vel=0.55, gate=0.55)

    for bar in range(1, 37):
        name = BARS[bar - 1]
        last = bar == 36
        groups = 4 if last else 3
        for g in range(groups):
            t0 = bs(bar) + g * GROUP
            # the drive: strong, soft, medium on each group
            drum.add(t0, 'a2', 0.5, vel=0.6 if g == 0 else 0.5)
            drum2.add(t0 + 0.5, 'e3', 0.5, vel=0.3)
            drum2.add(t0 + 1.0, 'c3', 0.5, vel=0.4)
            # bass: root, root, fifth (and the root once more in the last bar)
            r = T.root_note(name, 28)
            bass.add(t0, r if g != 2 else T.fifth_note(name, 35), 1.0, vel=0.6 if g == 0 else 0.46)
            # flutes
            if bar >= 5 and not (bar >= 30 and bar % 2 == 0):
                lo = 64 if (13 <= bar <= 28) else 60
                if bar >= 21 and bar <= 28:
                    lo = 67
                tn = T.tones(name, lo, lo + 24)
                fig = FIGS[g] if g < 3 else [0, 1, 2]
                for i, idx in enumerate(fig):
                    fl.add(t0 + 0.5 * i, tn[idx % len(tn)], 0.5, vel=0.5 + (0.1 if i == 0 else 0.0))
                if bar >= 13 and bar < 29:
                    tn2 = T.tones(name, lo + 12, lo + 36)
                    for i, idx in enumerate(FIGS[(g + 1) % 3] if g < 3 else [0, 1, 2]):
                        fl2.add(t0 + 0.5 * i, tn2[idx % len(tn2)], 0.5, vel=0.4 + (0.08 if i == 0 else 0.0))
        # a held pad and a timpani on the first group
        low.chord(bs(bar), [T.root_note(name, 40), T.fifth_note(name, 47)], 4.4 if not last else 6.0, vel=0.38)
        if 13 <= bar <= 28 or last:
            timp.add(bs(bar), T.root_note(name, 28), 1.0, vel=0.55)
        if bar >= 5:
            chpad.chord(bs(bar), T.tones(name, 55, 68)[:3], 4.4 if not last else 6.0, vel=0.34)

    # ---- the choir: G D E and the missing C, one note to a group ------------------------------------------------------
    def three(bar, lo=0, vel=0.62):
        for g, p in enumerate(('g4', 'd5', 'e5')):
            choir.add(bs(bar) + g * GROUP, p, GROUP, vel=vel)
            if lo:
                choir.add(bs(bar) + g * GROUP, ('b4', 'f#5', 'g5')[g], GROUP, vel=vel * 0.8)
    for bar in (5, 9, 13, 17, 29, 33):
        three(bar, lo=1 if 13 <= bar <= 20 else 0)
    for bar in (21, 23, 25, 27):
        three(bar, lo=1, vel=0.7)
    # the resolution: E major, the motif complete, all four groups
    for g, p in enumerate(('e4', 'b4', 'c#5', 'a4')):
        choir.add(bs(36) + g * GROUP, p, GROUP, vel=0.72)
        choir.add(bs(36) + g * GROUP, ('g#4', 'd#5', 'e5', 'c#5')[g], GROUP, vel=0.5)
    return s
