"""Shared material for the Episode 8 tracks (E8-audio): the Scriptorium tune, written once in scale degrees, the song-local solo
violin, and the per-episode motif instruments the credits track calls on.

`scriptorium_town` (ep8_scriptorium_town.py) plays the tune in G: in its A sections every phrase stops a beat early (the
unfinished signs: `tune(..., finished=False)` drops each phrase's last note and leaves its beats silent), and in B the violin
finishes them. `boss_eraser` (ep8_boss_eraser.py) quotes it in C minor with its phrases cut off harder (the Eraser rubs out the
last two notes of every phrase). `the_last_word` (ep8_the_last_word.py) plays it whole in E major in its finale.

The tune opens with the complete name motif, degrees 0 4 5 3 (G D E C, exactly 0 +7 +9 +5), the C held five beats, into bar 2,
over the harpsichord. Eight bars of 4/4, four two-bar phrases; degrees 0-based from the tonic in the major scale (7 = the
octave). The A sections of the town sit in G Lydian (the raised fourth, C#, is in the harmony: A/G, the Lydian II over the
tonic pedal), and their melody never sings a C at all, because every C in the tune is a phrase's last note: the unfinished
phrases leave the fourth degree unsaid, the finished ones land on the natural C over Cmaj7. The town is Lydian until its
signs are finished.

The violin (`Violin`) is song-local (synth.py is not E8-audio's file): a bowed string that sounds like someone reading aloud.
  - the bow: a band-limited saw (the Helmholtz motion) whose level and brightness follow a bow-pressure curve, a slow S-curve
    swell into the note (`swell` seconds) and, on long notes, a gentle rise and fall through the note (messa di voce), so a
    held note breathes like a spoken vowel without being one (no formant sweep, no vocal filter)
  - vibrato that arrives after the note starts (`vib_delay`, then a half-second ramp), light (`vib` semitones) and a little
    uneven in rate, never on very short notes
  - a soft rosin noise on the attack: a grainy band of high noise (the hair catching the string), gone in about 80 ms, and a
    faint continuing bow hiss tied to the pressure
  - a violin body: the air resonance near 280 Hz, the main wood resonance near 470 Hz, a dip near 1.4 kHz and the bridge
    hill near 2.6 kHz; a tiny pitch settle on the attack (a few cents)
It is set apart on purpose from core `fiddle` (fast attack, nasal 1.1 kHz formant, immediate vibrato), core `strings_high`
(five detuned saws: a section, not a soloist) and Episode 7's cello (an octave and a half lower, dark formants): see
`python tools/music/songs/ep8_theme.py --preview` (tools/audio/out/ep8/violin_preview.png).
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # tools/music, for a direct run
import synth  # noqa: E402
import lullaby as L  # noqa: E402
import ep6_theme as E6  # noqa: E402  (chord helpers only: parse, tones, root_note; ep6_theme is not changed)

# (bar offset, beat, degree, duration in beats): four two-bar phrases
TUNE = [
    (0, 0.0, 0, 1), (0, 1.0, 4, 1), (0, 2.0, 5, 1), (0, 3.0, 3, 5),             # the motif G D E C; the C held into bar 2
    (2, 0.0, 4, 1.5), (2, 1.5, 5, 0.5), (2, 2.0, 6, 1), (2, 3.0, 7, 1),          # D E F# G
    (3, 0.0, 5, 2), (3, 2.0, 4, 1), (3, 3.0, 3, 1),                             # E D, the C (the phrase's last word)
    (4, 0.0, 7, 1), (4, 1.0, 6, 1), (4, 2.0, 5, 1), (4, 3.0, 4, 1),             # G F# E D
    (5, 0.0, 2, 1.5), (5, 1.5, 1, 0.5), (5, 2.0, 2, 1), (5, 3.0, 3, 1),          # B A B, the C
    (6, 0.0, 5, 1), (6, 1.0, 4, 1), (6, 2.0, 2, 1), (6, 3.0, 1, 1),             # E D B A
    (7, 0.0, 0, 4),                                                            # G, home
]
MOTIF = {(0, 0.0), (0, 1.0), (0, 2.0), (0, 3.0)}     # the four motif notes
HELD = (0, 3.0)                                       # the held fourth note
PHRASE_END = {(0, 3.0), (3, 3.0), (5, 3.0), (7, 0.0)}   # each phrase's last note: what the unfinished signs leave unsaid
# per bar of the finished tune in G major (the B sections), [(beat, chord)]
CHORDS_FINISHED = [[(0, 'G')], [(0, 'Cmaj7')], [(0, 'Em7')], [(0, 'Am7'), (2, 'D7sus4')], [(0, 'G/B')], [(0, 'Am7'), (2, 'C')],
                   [(0, 'Cmaj7'), (2, 'D7sus4')], [(0, 'G')]]
# the unfinished tune in G Lydian (the A sections): the Lydian II over the tonic, and no C natural anywhere
CHORDS_LYDIAN = [[(0, 'G')], [(0, 'A/G')], [(0, 'Em7')], [(0, 'A/G')], [(0, 'G/B')], [(0, 'Bm7')], [(0, 'Em7'), (2, 'A/G')],
                 [(0, 'Dsus4')]]

parse = E6.parse
tones = E6.tones
root_note = E6.root_note
fifth_note = E6.fifth_note


def tune(tonic, mode, first_bar=1, finished=True, cut=1):
    """[(bar, beat, midi, dur, is_motif)] in 4/4, bars numbered from first_bar. finished=False drops each phrase's last note
    (cut=1) or its last two notes (cut=2, the Eraser's cut), leaving the beats silent."""
    out = []
    drop = set()
    if not finished:
        keys = [(b, beat) for b, beat, _, _ in TUNE]
        for end in PHRASE_END:
            i = keys.index(end)
            for k in range(cut):
                if i - k >= 0:
                    drop.add(keys[i - k])
    for b, beat, d, dur in TUNE:
        if (b, beat) in drop:
            continue
        out.append((first_bar + b, beat, L.pitch(tonic, mode, d), dur, (b, beat) in MOTIF))
    return out


# ------------------------------------------------------------------------------------------------ the violin

class Violin(synth.Instrument):
    """A solo violin read aloud (the module docstring).

    swell:     seconds for the bow pressure to bloom into the note (an S-curve)
    vib:       vibrato depth in semitones once it has arrived; vib_delay seconds before it starts, then a 0.45 s ramp
    breath:    0..1, how much a long note rises and falls through its length (messa di voce)
    rosin:     0..1, the grain of rosin on the attack
    bright:    0..1, how far the pressure opens the tone
    """
    name = 'violin'

    def __init__(self, swell=0.2, vib=0.13, vib_delay=0.32, breath=0.5, rosin=0.6, bright=0.6, release=0.28):
        self.swell = swell
        self.vib = vib
        self.vib_delay = vib_delay
        self.breath = breath
        self.rosin = rosin
        self.bright = bright
        self.release = release

    def pressure(self, n_gate, n, sr, vel):
        """The bow-pressure curve over the note (0..1), with the bow lift after the gate."""
        t = np.arange(n) / sr
        gate = n_gate / sr
        sw = max(0.02, self.swell * (1.25 - 0.45 * vel))
        x = np.clip(t / sw, 0.0, 1.0)
        rise = x * x * (3.0 - 2.0 * x)
        p = rise.copy()
        if gate > 0.9:                                   # a long note breathes: up through the middle, easing at the end
            u = np.clip(t / gate, 0.0, 1.0)
            p *= 1.0 - self.breath * 0.22 + self.breath * 0.22 * np.sin(math.pi * u) ** 1.2
        lift = np.where(t < gate, 1.0, np.exp(-(t - gate) / max(0.02, self.release * 0.35)))
        return p * lift

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        n = n_gate + int(self.release * sr)
        t = np.arange(n) / sr
        pr = self.pressure(n_gate, n, sr, vel)
        depth = self.vib * (0.6 + 0.4 * vel) if gate_s > 0.38 else 0.0
        rate = 5.6 + rng.uniform(-0.3, 0.3)
        f = synth.vibrato(n, sr, f0, rate=rate, depth_semi=depth, delay=self.vib_delay, ramp=0.45, phase=rng.uniform(0, 6.283))
        wob = 1.0 + 0.0012 * np.sin(2 * math.pi * 0.7 * t + rng.uniform(0, 6.283))          # an uneven hand
        f = f * wob * 2.0 ** (-0.1 / 12.0 * np.exp(-t / 0.05))                              # a tiny settle on the attack
        v = synth.osc('saw', f, sr) + 0.18 * synth.osc('sine', f, sr)
        amt = np.clip(pr ** 1.4 * (0.45 + 0.55 * vel) * (0.5 + 0.5 * self.bright), 0.0, 1.0)
        v = synth.morph_lp(v, sr, 1500.0 + 1.2 * f0, 4200.0 + 2.2 * f0, amt, q=0.7)
        # the body: air (280), main wood (470), the nasal dip (1.4 k) and the bridge hill (2.6 k)
        v = synth.filt(v, 'peak', 280.0, sr, q=3.0, gain_db=5.0)
        v = synth.filt(v, 'peak', 470.0, sr, q=2.4, gain_db=4.0)
        v = synth.filt(v, 'peak', 1400.0, sr, q=1.8, gain_db=-3.5)
        v = synth.filt(v, 'peak', 2600.0, sr, q=1.1, gain_db=5.0)
        v = synth.filt(v, 'hp', max(120.0, f0 * 0.55), sr, 0.7)
        v = v / (np.abs(v).max() + 1e-9)
        # rosin on the attack: grains of high noise as the hair catches, gone in about 80 ms; then a faint bow hiss
        grains = np.clip((np.abs(synth.filt(synth.noise(n, rng), 'lp', 180, sr)) * 5.0) ** 2, 0, 1)
        hair = synth.filt(synth.noise(n, rng), 'bp', 4200.0, sr, q=0.8)
        hair = hair / (np.abs(hair).max() + 1e-9)
        att = np.exp(-t / 0.08) * np.clip(t / 0.003, 0, 1)
        rosin = hair * (grains * att * self.rosin * (0.35 + 0.4 * vel) + 0.03 * pr)
        y = v * pr + 0.4 * rosin
        y = synth.fade_edges(y, sr, 0.5, 20.0)
        return synth.normalize(y, 0.5 * (0.45 + 0.55 * vel))


# ------------------------------------------------------------------------------------------------ the series' instruments

def episode_instruments():
    """The motif's instrument in each episode (docs/MUSIC.md), in order, as (episode, label, instrument factory, octave
    offset from the E4 motif, settings). Built lazily so importing this module stays cheap."""
    import ep5_theme as E5
    import ep7_theme as E7
    return [
        (1, 'music box (archive, Episode 1)', lambda: synth.make('musicbox'), 2),
        (2, 'horn (hollowmere, Episode 2)', lambda: synth.make('horn'), 0),
        (3, 'dulcimer, the fourth note on a bell (first_bell, Episode 3)', lambda: synth.make('dulcimer'), 1),
        (4, 'celesta, the fourth note held across the bar line (valewyn, Episode 4)', lambda: synth.make('celesta'), 1),
        (5, 'oud, the fourth note bent onto the third (saffron, Episode 5)', lambda: E5.Oud(decay=1.6, bend=-1.0, bend_delay=1.1,
                                                                                          bend_time=0.35), 0),
        (6, 'wind harp (zephyr, Episode 6)', lambda: E6.WindHarp(swell=0.3, ring=1.4), 0),
        (7, 'iceglass bell (palehaven, Episode 7)', lambda: E7.IceglassBell(ring=4.2, beat=0.5, mallet=0.7, far=0.5), 1),
        (8, 'solo violin (Episode 8)', lambda: Violin(), 0),
    ]


def check():
    for b in range(8):
        tot = sum(dur for bb, beat, d, dur in TUNE if bb == b)
        if b not in (0, 1):                     # bar 0 carries the held C into bar 1
            assert abs(tot - 4.0) < 1e-9, (b, tot)
    assert abs(sum(d for bb, _, _, d in TUNE if bb in (0, 1)) - 8.0) < 1e-9
    assert [d for bb, beat, d, dur in TUNE if (bb, beat) in MOTIF] == [0, 4, 5, 3]
    m = [p for _, _, p, _, mo in tune(67, 'major') if mo]
    assert [x - m[0] for x in m] == [0, 7, 9, 5], m
    assert [x % 12 for x in m] == [7, 2, 4, 0], 'G D E C'
    # the unfinished tune never sings a C (the Lydian A sections have C# in the harmony); every dropped note is a phrase end
    un = tune(67, 'major', finished=False)
    assert all(p % 12 != 0 for _, _, p, _, _ in un), 'no C natural in the unfinished phrases'
    assert len(un) == len(TUNE) - len(PHRASE_END)
    assert [p % 12 for _, _, p, _, mo in un if mo] == [7, 2, 4], 'the motif stops on its third note: G D E'
    cut2 = tune(60, 'aeolian', finished=False, cut=2)
    assert len(cut2) == len(TUNE) - 2 * len(PHRASE_END)
    # chord tables parse; the held C is a tone of Cmaj7; no C natural in the Lydian table
    for bars in (CHORDS_FINISHED, CHORDS_LYDIAN):
        assert len(bars) == 8
        for segs in bars:
            for _, c in segs:
                parse(c)
    assert all(0 not in parse(c)[1] for segs in CHORDS_LYDIAN for _, c in segs), 'the Lydian table has no C natural'
    assert any(1 in parse(c)[1] for segs in CHORDS_LYDIAN for _, c in segs), 'C# (the Lydian fourth) is in the harmony'
    assert 0 in parse(CHORDS_FINISHED[1][0][1])[1]
    for bar, beat, p, dur, _ in tune(67, 'major', 0):
        if dur >= 2 and beat + dur <= 4:
            assert p % 12 in parse(CHORDS_FINISHED[bar][0][1])[1], (bar, beat, p)
    return True


# ------------------------------------------------------------------------------------------------ the preview sheet

def preview(out_dir):
    """Render the motif G4 D5 E5 C5 (88 BPM, the C held two beats) on the violin and on the instruments it must be told apart
    from, and draw spectrograms, envelopes and the violin's pitch track (violin_preview.png); WAVs beside it."""
    import struct
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import ep5_theme as E5
    import ep7_theme as E7
    from theory import freq
    sr = 44100
    spb = 60.0 / 88.0
    notes = [(0, 67, 1), (1, 74, 1), (2, 76, 1), (3, 72, 2)]
    cast = [('violin (ep8, song-local)', Violin(), 0), ('core strings_high', synth.make('strings_high'), 0),
            ('core fiddle', synth.make('fiddle'), 0), ('ep7 cello (an octave down)', E7.Cello(), -12),
            ('ep6 wind harp', E6.WindHarp(), 0), ('ep5 oud', E5.Oud(), 0),
            ('ep7 iceglass bell', E7.IceglassBell(), 12), ('core music box (ep1)', synth.make('musicbox'), 12)]
    os.makedirs(out_dir, exist_ok=True)
    fig, ax = plt.subplots(len(cast), 2, figsize=(13, 2.2 * len(cast)), gridspec_kw={'width_ratios': [3, 1.3]})
    rows = []
    for i, (label, inst, octv) in enumerate(cast):
        total = int((5 * spb + 2.5) * sr)
        y = np.zeros(total)
        for k, (beat, m, dur) in enumerate(notes):
            rng = np.random.default_rng(1000 + 17 * i + k)
            a = inst.render(freq(m + octv), dur * spb * 0.96, 0.7, sr, rng)
            a = a.mean(axis=1) if a.ndim > 1 else a
            s0 = int(beat * spb * sr)
            e0 = min(total, s0 + len(a))
            y[s0:e0] += a[:e0 - s0]
        y = y / (np.abs(y).max() + 1e-9) * 0.7
        pcm = (y * 32767).astype('<i2').tobytes()
        with open(os.path.join(out_dir, 'violin_preview_%d.wav' % i), 'wb') as f:
            f.write(b'RIFF' + struct.pack('<I', 36 + len(pcm)) + b'WAVE')
            f.write(b'fmt ' + struct.pack('<IHHIIHH', 16, 1, 1, sr, sr * 2, 2, 16))
            f.write(b'data' + struct.pack('<I', len(pcm)) + pcm)
        ax[i][0].specgram(y + 1e-7, NFFT=2048, Fs=sr, noverlap=1536, cmap='magma', vmin=-120)
        ax[i][0].set_ylim(0, 8000)
        ax[i][0].set_title(label, fontsize=9, loc='left')
        hop = int(0.01 * sr)
        env = np.array([np.sqrt((y[j:j + hop] ** 2).mean()) for j in range(0, len(y) - hop, hop)])
        tt = np.arange(len(env)) * 0.01
        ax[i][1].plot(tt, 20 * np.log10(env + 1e-6), lw=0.8)
        ax[i][1].set_ylim(-60, 0)
        ax[i][1].set_title('level (dB) over the motif', fontsize=8)
        # attack: time to reach 90 percent of the first note's peak; and the spectral centroid of the held C
        first = env[:int(spb / 0.01)]
        att = float(np.argmax(first >= 0.9 * first.max()) * 0.01) if first.max() > 0 else 0.0
        seg = y[int(3 * spb * sr):int(4.5 * spb * sr)]
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        fr = np.fft.rfftfreq(len(seg), 1.0 / sr)
        cen = float((fr * S ** 2).sum() / ((S ** 2).sum() + 1e-12))
        rows.append((label, round(att, 3), round(cen)))
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, 'violin_preview.png'), dpi=72)
    plt.close(fig)
    # the violin's pitch track over the held C (vibrato arriving late) and its rosin attack, zoomed
    inst = Violin()
    a = inst.render(freq(72), 2 * spb, 0.7, sr, np.random.default_rng(5))
    hop = 256
    win = 4096
    track = []
    for j in range(0, len(a) - win, hop):
        seg = a[j:j + win] * np.hanning(win)
        S = np.abs(np.fft.rfft(seg, 8 * win))
        fr = np.fft.rfftfreq(8 * win, 1.0 / sr)
        band = (fr > 480) & (fr < 580)
        track.append(fr[band][np.argmax(S[band])])
    fig, ax = plt.subplots(1, 2, figsize=(12, 3))
    ax[0].plot(np.arange(len(track)) * hop / sr, 1200 * np.log2(np.array(track) / freq(72)), lw=0.9)
    ax[0].set_title('violin C5 held two beats: pitch (cents from C5); the vibrato arrives after %.2f s' % inst.vib_delay, fontsize=9)
    ax[0].set_ylim(-40, 40)
    k = int(0.15 * sr)
    ax[1].plot(np.arange(k) / sr * 1000, a[:k], lw=0.5)
    ax[1].set_title('the first 150 ms: the bow-pressure swell and the rosin grain', fontsize=9)
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, 'violin_detail.png'), dpi=72)
    plt.close(fig)
    return rows


if __name__ == '__main__':
    print('ep8 theme check', check())
    if '--preview' in sys.argv:
        here = os.path.dirname(os.path.abspath(__file__))
        out = os.path.join(os.path.dirname(os.path.dirname(here)), 'audio', 'out', 'ep8')
        for r in preview(out):
            print('  %-30s attack to 90%% %.3f s   centroid of the held C %5d Hz' % r)
        print('wrote', os.path.join(out, 'violin_preview.png'))
