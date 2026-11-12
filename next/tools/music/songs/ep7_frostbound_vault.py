"""frostbound_vault: "The Vanishing Steps" (ep7_vault_f1, ep7_vault_f2). A Aeolian, 66 BPM, 4/4, 24 bars (87.3 s), loops.
Manifest id `frostbound_vault`, file ep7_frostbound_vault.mp3.

The plan's brief (8.1): a low cello drone that never quite resolves, the motif on the cello in long augmented notes, the
iceglass bell answering it two beats late, a slow pulse of a muffled bass drum like footsteps in snow, and every 8 bars a
single bell note that is cut off before it decays (the stopped bell: the Keeper's hands on the bronze).

The drone is a second cello under a slow swell (ep6_theme.Swell): the fifth A2 E3, whose E leans up to F for a bar in every
four (the minor sixth, never answered), and in C the root itself walks off A (F2, then G2) and does not come home before the
loop does. The name motif is the cello's, augmented to a bar a note, from the third of the key so the intervals stay exact
inside A Aeolian: C3 G3 A3 F3 (0 +7 +9 +5), bars 1-4, the bell answering each note two beats late two octaves up (C5 G5 A5
F5). B moves the pair onto G (G2 D3 E3 C3, the bell G4 D5 E5 C5). C states it on C again and holds the F, the fourth note,
for five bars: the motif left open. The stopped bell is an E6 struck on beat 2 of bars 8, 16 and 24 and stopped by hand a
third of a second later. The footsteps are the muffled drum on beats 1 and 3 (A1), with a lighter step on the "and" of 4
in every second bar (someone a step behind).

Form
  A    1-8    Am drone (F in bar 4 and 8): the motif and its echo, the cello's low answer (5-8), the footsteps, the stopped bell
  B    9-16   the motif on G, high strings breathing very high and thin, the drone's F in 12 and 16
  C    17-24  the drone walks F2 then G2, a faint choir, the motif on C with its F held from bar 20 to the loop, the bell
"""
from tracker import Song
import ep7_theme as E
import ep6_theme as E6

BARS = ['Am', 'Am', 'Am', 'F', 'Am', 'Am', 'Am', 'F',
        'Am', 'Am', 'Am', 'F', 'Am', 'Am', 'Am', 'F',
        'Am', 'Am', 'F', 'F', 'G', 'G', 'F', 'Am']
assert len(BARS) == 24
BPM = 66
MOTIF_C = (48, 55, 57, 53)                 # C3 G3 A3 F3: 0 +7 +9 +5 (exact inside A Aeolian)
MOTIF_G = (43, 50, 52, 48)                 # G2 D3 E3 C3
STOPPED = (8, 16, 24)                       # the stopped bell, beat 2 of these bars
CELLO_LOW = 'e3/4 | d3/4 | c3/2 b2/2 | c3/4'   # bars 5-8: the cello's low answer, never landing on A


def section(bar):
    return 'A' if bar <= 8 else 'B' if bar <= 16 else 'C'


def build():
    s = Song('ep7_frostbound_vault', bpm=BPM, beats_per_bar=4, bars=24, key='A aeolian', title='The Vanishing Steps',
             reverb_room=0.93, reverb_damp=0.55, reverb_len=5.5, reverb_level=-6.5,
             delay_beats=(2.0, 1.5), delay_feedback=0.25, delay_level=-19.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    cello = s.track('cello', E.Cello(bow=0.3, warmth=0.75, vib=0.1), volume=-3.0, pan=-0.1, reverb=0.45, role='melody',
                    vel=0.62, gate=0.98)
    echo = s.track('iceglass bell', E.IceglassBell(ring=4.6, beat=0.45, mallet=0.55, far=0.85), volume=-5.0, pan=0.3,
                   reverb=0.7, delay=0.3, role='melody', vel=0.6, gate=1.0)
    stopped = s.track('stopped bell', E.IceglassBell(ring=4.0, beat=0.5, mallet=0.85, far=0.4, damp=0.3), volume=-6.0,
                      pan=-0.25, reverb=0.3, role='perc', vel=0.66, gate=1.0)
    drone = s.track('cello drone', E6.Swell(E.Cello(bow=0.6, warmth=0.9, vib=0.06), depth=0.5, power=1.3), volume=-9.0,
                    reverb=0.5, role='bass', vel=0.5, gate=1.0)
    hi = s.track('high strings', 'strings_high', volume=-21.0, pan=0.15, reverb=0.7, role='pad', vel=0.34, gate=1.0,
                 width=1.0)
    choir = s.track('choir', 'choir', volume=-24.0, reverb=0.7, role='pad', vel=0.38, gate=1.0)
    drum = s.track('muffled drum', E.MuffledDrum(), volume=-8.0, pan=0.05, reverb=0.35, role='perc', vel=0.55,
                   humanize_ms=6, vel_jitter=0.05)

    def motif_with_echo(bar, notes, vel=0.62, echo_vel=0.58, hold=4.0):
        """The cello augmented (a whole bar a note), the bell two beats late, two octaves up."""
        for i, p in enumerate(notes):
            last = i == 3
            cello.add(bs(bar + i), p, 4.0 if not last else hold, vel=vel + (0.05 if i == 2 else 0.0))
            echo.add(bs(bar + i) + 2.0, p + 24, 2.0, vel=echo_vel)

    # ---- the motif --------------------------------------------------------------------------------------------------
    motif_with_echo(1, MOTIF_C, 0.6, 0.56)
    cello.seq(bar=5, pattern=CELLO_LOW, vel=0.54)
    motif_with_echo(9, MOTIF_G, 0.62, 0.56)
    cello.seq(bar=13, pattern='a2/4 | b2/4 | c3/2 d3/2 | e3/4', vel=0.54)
    motif_with_echo(17, MOTIF_C, 0.62, 0.58, hold=20.0)                 # C: the F held from bar 20 to the loop
    echo.add(bs(22) + 2.0, 'c6', 2.0, vel=0.44)                          # the bell alone over the held F (C over F)
    for bar in STOPPED:
        stopped.add(bs(bar) + 1.0, 'e6', 0.12, vel=0.7)                 # struck, then stopped by hand

    # ---- accompaniment ------------------------------------------------------------------------------------------------
    for bar in range(1, 25):
        sec = section(bar)
        name = BARS[bar - 1]
        root = {'Am': 'a2', 'F': 'f2', 'G': 'g2'}[name] if sec == 'C' else 'a2'
        top = 'f3' if name == 'F' else 'e3' if root == 'a2' else 'd3'
        drone.chord(bs(bar), [root, top], 4.0, vel=0.5 + (0.04 if sec == 'C' else 0.0))
        # footsteps in snow: beats 1 and 3, a lighter step on the and of 4 every second bar
        drum.add(bs(bar), 'a1', 1.0, vel=0.58)
        drum.add(bs(bar) + 2.0, 'a1', 1.0, vel=0.48)
        if bar % 2 == 0:
            drum.add(bs(bar) + 3.5, 'a1', 0.5, vel=0.3)
        if sec == 'B' and bar % 2 == 1:
            hi.chord(bs(bar), ['e6', 'a6'] if bar % 4 == 1 else ['f6', 'c7'], 8.0, vel=0.32)
        if sec == 'C' and bar % 2 == 1:
            choir.chord(bs(bar), E.tones(name, 57, 70)[:3], 8.0, vel=0.36)
            hi.add(bs(bar), 'e6', 8.0, vel=0.28)
    return s
