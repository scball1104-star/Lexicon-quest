"""Expansion 1 sfx (X1-audio), plan 10.4. Imported at the end of sfx_defs.py, so they register in the same REG.

All ten live in pack "x1" (fetched with the rest of The Wider Valley, never precached, never core) and each names a core
`fallback` the engine plays while the pack has not arrived yet.
"""
import numpy as np

import dsp
import kit
from dsp import RENDER_SR as SR, ns, note_hz as hz
from sfx_defs import sfx, M, lp, hp, verb


@sfx("slab_slide", "field", "A Barrow slab slides: a heavy stone scrape that swells, drags, and ends on a dull stone thud, about 0.55 s.", target=-17.0, tail_db=-36, pack="x1", fallback="door_rumble")
def slab_slide(g, v):
    m = M()
    d = 0.5
    m.add(kit.grind(d, g, band=(90, 520), rough=0.85) * kit.gate(d, 0.12, 0.2), 0.0, 0.8)
    m.add(kit.grind(d, g, band=(500, 1800), rough=0.9) * kit.gate(d, 0.2, 0.25), 0.02, 0.22)
    m.add(kit.rumble(d, g, fc=120.0, rough=0.5, attack=0.15, release=0.3), 0.0, 0.5)
    m.add(kit.thump(90, 48, 0.2, 0.07, 0.001), d - 0.08, 0.6)
    m.add(kit.knock([140, 330, 700], [8, 9, 8], g, 0.18, 0.06), d - 0.08, 0.4)
    return verb(m.out, 0.5, 0.1, bright=0.35)


@sfx("stone_name", "story", "A standing stone gets its letters back: a low bell-like chime over a soft carving rasp, about 0.9 s.", target=-17.0, tail_db=-30, pack="x1", fallback="name_restore")
def stone_name(g, v):
    m = M()
    n = ns(0.35)
    rasp = dsp.butter(dsp.white(n, g), "band", (1800, 6000), SR, 2)
    chat = np.clip(dsp.smooth_random(n, g, 22.0, SR), 0, None) ** 0.8          # the chisel's stutter
    rasp = rasp / (np.max(np.abs(rasp)) + 1e-12) * chat * kit.gate(0.35, 0.04, 0.15)
    m.add(rasp, 0.0, 0.9)
    m.add(kit.knock([900, 2100], [14, 14], g, 0.04, 0.012), 0.02, 0.25)
    y = kit.church_bell(hz("D4"), 1.0, g, decay=0.42, eerie=0.25)
    m.add(kit.release(y, 0.3), 0.12, 0.6)
    m.add(kit.fm_bell(hz("A5"), 0.7, 2.0, 0.8, decay=0.3, idx_decay=0.08), 0.14, 0.18)
    return verb(m.out, 1.1, 0.2, bright=0.45, predelay=0.012)


def _baa(g, v):
    d = (0.42, 0.36)[v]
    n = ns(d)
    t = np.arange(n) / SR
    base = (330.0, 285.0)[v]
    f0 = base * (1.0 + 0.1 * np.exp(-t / 0.05)) * (1.0 - 0.1 * np.clip((t - 0.3) / 0.4, 0, 1))
    trem = np.sin(2 * np.pi * (26 + 4 * v) * t)                                # the sheep's tremble
    f = f0 * (1.0 + 0.035 * trem)
    src = dsp.saw(f, n, SR) + 0.4 * dsp.white(n, g) * 0.15
    # two nasal formants whose first one opens on "baa"
    f1 = dsp.glide(520, 880, n, "exp", 0.6)
    a = dsp.bq_tv(src, "bp", f1, 6.0, SR, block=32)
    b = dsp.bq_tv(src, "bp", dsp.glide(1250, 1500, n, "exp"), 8.0, SR, block=32)
    c = dsp.butter(src, "band", (2200, 3400), SR, 2)
    y = a * 1.0 + b * 0.55 + c * 0.12
    y = y / (np.max(np.abs(y)) + 1e-12)
    y *= (0.75 + 0.25 * trem) * kit.gate(d, 0.04, 0.14)
    return y


@sfx("sheep_baa", "field", "A mild baa from a sheep, two variants: a trembling nasal saw through two moving formants, about 0.4 s.", variants=2, vary=0.04, target=-18.0, tail_db=-42, pack="x1", fallback="emote_pop")
def sheep_baa(g, v):
    return verb(_baa(g, v), 0.3, 0.07, bright=0.5)


@sfx("loom_clack", "field", "Tamsin's loom: two wooden clacks of the beater and a whisper of thread, about 0.5 s.", target=-18.0, tail_db=-44, pack="x1", fallback="shelf_move")
def loom_clack(g, v):
    m = M()
    m.add(kit.knock([260, 640, 1400], [10, 11, 9], g, 0.16, 0.05, gains=[1.0, 0.6, 0.3]), 0.0, 0.9)
    m.add(kit.knock([240, 590, 1250], [10, 11, 9], g, 0.16, 0.05, gains=[1.0, 0.6, 0.3]), 0.17, 0.75)
    n = ns(0.3)
    th = dsp.butter(dsp.white(n, g), "band", (3500, 9000), SR, 2)
    th = th / (np.max(np.abs(th)) + 1e-12) * kit.gate(0.3, 0.06, 0.18) * (0.6 + 0.4 * np.abs(dsp.smooth_random(n, g, 30.0, SR)))
    m.add(th, 0.05, 0.12)
    return verb(m.out, 0.3, 0.08, bright=0.45)


@sfx("wheel_groan", "field", "The millrace wheel turns again: a long wooden groan, a drip, then a steady wooden clack that settles into a rhythm, about 1.6 s.", target=-18.0, tail_db=-36, pack="x1", fallback="block_push")
def wheel_groan(g, v):
    m = M()
    m.add(kit.creak(0.7, g, 12, 24, modes=(120, 300, 680), qs=(9, 10, 8)), 0.0, 0.8)
    m.add(kit.grind(0.6, g, band=(90, 420), rough=0.6) * kit.gate(0.6, 0.2, 0.2), 0.05, 0.25)
    k = ns(0.2)
    drip = dsp.sine(dsp.glide(1500, 720, k, "exp"), k, SR) * dsp.env_exp(k, SR, 0.035, 0.0015)
    m.add(drip, 0.62, 0.22)
    m.add(kit.bubbles(0.2, g, count=3, fmin=700, fmax=1300), 0.68, 0.2)
    t = 0.82
    gap = 0.3
    gn = 0.5
    while t < 1.42:
        m.add(kit.knock([230, 580, 1250], [8, 9, 9], g, 0.14, 0.045, gains=[1.0, 0.55, 0.3]), t, gn)
        m.add(kit.thump(130, 78, 0.12, 0.04, 0.0006), t, 0.18)
        t += gap
        gap = max(0.2, gap * 0.8)
        gn = min(0.85, gn + 0.1)
    return verb(m.out, 0.5, 0.12, bright=0.45)


@sfx("star_chime", "magic", "A dark star wakes: a three-note glass chime, ascending (D6 F#6 A6), with a little sparkle, about 0.8 s.", target=-16.0, tail_db=-34, pack="x1", fallback="save_chime")
def star_chime(g, v):
    m = M()
    for i, nt in enumerate(("D6", "F#6", "A6")):
        m.add(kit.glass(hz(nt), 0.7 - 0.08 * i, g, decay=0.3), 0.1 * i, 0.55 + 0.1 * i)
        m.add(kit.fm_bell(hz(nt) * 2, 0.35, 3.0, 0.8, decay=0.1, idx_decay=0.04), 0.1 * i, 0.12)
    m.add(kit.sparkle(0.5, g, density=30.0, fmin=4000, fmax=9500, decay=(0.02, 0.07), fall=1.2), 0.2, 0.14)
    return verb(m.out, 0.9, 0.2, bright=0.85)


@sfx("orrery_hum", "magic", "The Orrery aligned: a soft sustained brass hum (D3 with its fifth) with a slow shimmer on top, about 0.9 s.", target=-17.0, tail_db=-30, pack="x1", fallback="lantern_reveal")
def orrery_hum(g, v):
    d = 0.82
    n = ns(d)
    t = np.arange(n) / SR
    vib = 1.0 + 0.004 * np.sin(2 * np.pi * 4.6 * t)
    f = hz("D3") * vib
    y = dsp.saw(f, n, SR) + 0.8 * dsp.saw(f * 1.003, n, SR, 0.31) + 0.35 * dsp.saw(f * 1.5, n, SR, 0.6)
    cut = dsp.glide(380, 1500, n, "exp", 0.6)
    y = dsp.bq_tv(y, "lp", cut, 0.8, SR, block=32)
    y = y / (np.max(np.abs(y)) + 1e-12) * kit.gate(d, 0.28, 0.4)
    m = M()
    m.add(y, 0.0, 0.8)
    shim = dsp.sine(hz("A5"), n, SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.3 * t)) + 0.6 * dsp.sine(hz("D6") * 1.002, n, SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t + 1.0))
    m.add(shim * kit.gate(d, 0.4, 0.4), 0.0, 0.1)
    m.add(kit.sparkle(d, g, density=14.0, fmin=3500, fmax=8000, decay=(0.04, 0.1)) * kit.gate(d, 0.4, 0.4), 0.0, 0.08)
    return verb(m.out, 0.9, 0.2, bright=0.5)


@sfx("hive_buzz", "field", "Yarrow's hives: a warm low hum with a few bees passing close, about 0.6 s.", target=-18.0, tail_db=-34, pack="x1", fallback="page_flutter")
def hive_buzz(g, v):
    m = M()
    d = 0.6
    n = ns(d)
    t = np.arange(n) / SR
    f = 118.0 * (1 + 0.012 * dsp.smooth_random(n, g, 3.0, SR))
    hum = dsp.saw(f, n, SR) + 0.6 * dsp.saw(f * 2.003, n, SR, 0.2)
    hum = lp(hum, 700, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 7.0 * t))
    m.add(hum / (np.max(np.abs(hum)) + 1e-12) * kit.gate(d, 0.12, 0.2), 0.0, 0.55)
    for at, f0, f1, dur in ((0.04, 240, 330, 0.3), (0.2, 310, 230, 0.3), (0.32, 260, 360, 0.26)):
        k = ns(dur)
        tt = np.arange(k) / SR
        ff = dsp.glide(f0, f1, k, "exp") * (1 + 0.06 * np.sin(2 * np.pi * 34 * tt))
        bee = dsp.saw(ff, k, SR) + 0.5 * dsp.saw(ff * 2.01, k, SR, 0.4)
        bee = dsp.butter(bee, "band", (400, 2600), SR, 2) * np.sin(np.pi * tt / dur) ** 1.2
        m.add(bee / (np.max(np.abs(bee)) + 1e-12), at, 0.3)
    return verb(m.out, 0.35, 0.08, bright=0.5)


@sfx("windmill_creak", "field", "The Windmill's sails: a slow wooden creak with a sweep of air as a sail passes, about 0.8 s.", target=-18.0, tail_db=-30, pack="x1", fallback="door_open")
def windmill_creak(g, v):
    m = M()
    m.add(kit.creak(0.78, g, 14, 22, modes=(105, 250, 540, 1100), qs=(9, 10, 9, 8)), 0.0, 0.85)
    m.add(kit.whoosh(0.7, g, 250, 900, q=0.9, peak=0.5, kind="pink"), 0.04, 0.35)
    m.add(kit.knock([180, 420], [10, 10], g, 0.1, 0.035), 0.72, 0.3)
    return verb(m.out, 0.6, 0.12, bright=0.4)


@sfx("chime_post", "field", "A soft wooden wind chime on a post, two variants: three hollow wooden tubes struck by the wind, ringing briefly, about 0.4 s.", variants=2, vary=0.03, target=-19.0, tail_db=-44, pack="x1", fallback="crystal_hit")
def chime_post(g, v):
    m = M()
    notes = (("D5", "A5", "F#5"), ("E5", "B5", "G5"))[v]
    times = ((0.0, 0.09, 0.2), (0.0, 0.07, 0.17))[v]
    for nt, at in zip(notes, times):
        f = hz(nt)
        m.add(kit.knock([f, f * 2.76, f * 5.4], [45, 30, 20], g, 0.4, 0.09, gains=[1.0, 0.3, 0.1]), at, 0.8 - 0.1 * at)
        m.add(kit.noise_burst(0.01, g, ("high", 1500), 0.002, 0.0003), at, 0.2)
    return verb(m.out, 0.5, 0.12, bright=0.55)
