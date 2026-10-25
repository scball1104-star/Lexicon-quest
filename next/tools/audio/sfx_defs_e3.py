"""Episode 3 sfx (E3-audio), plan 8.4. Imported at the end of sfx_defs.py, so they register in the same REG.

All ten live in pack "ep3" (fetched when Episode 3 is first entered, never precached) and each names a core
`fallback` the engine plays while the pack has not arrived yet.
"""
import numpy as np

import dsp
import kit
from dsp import RENDER_SR as SR, ns, note_hz as hz
from sfx_defs import sfx, M, lp, verb


@sfx("quench_hiss", "field", "Slag cools / a foe is quenched: a sharp hiss of steam with a crackle of cooling metal, about 0.7 s.", target=-17.0, tail_db=-42, pack="ep3", fallback="splash")
def quench_hiss(g, v):
    m = M()
    d = 0.7
    n = ns(d)
    hiss = dsp.bq_tv(dsp.white(n, g), "bp", dsp.glide(5200, 3000, n, "exp"), 0.8, SR, block=32)
    hiss = hiss / (np.max(np.abs(hiss)) + 1e-12) * dsp.env_exp(n, SR, 0.22, 0.004)
    m.add(hiss, 0.0, 0.75)
    m.add(kit.noise_burst(0.05, g, ("high", 2500), 0.012, 0.0004), 0.0, 0.5)
    for at in (0.06, 0.13, 0.2, 0.31, 0.43):
        m.add(kit.knock([g.uniform(2400, 4200), g.uniform(5200, 7000)], [18, 20], g, 0.04, 0.006), at, g.uniform(0.15, 0.3))
    m.add(dsp.crackle(ns(0.5), g, 90.0, SR), 0.05, 0.25)
    return verb(m.out, 0.3, 0.1, bright=0.8)


@sfx("sluice_turn", "field", "A sluice paddle turns: a wooden clunk of the crank and a water slosh as the gate lifts.", target=-18.0, tail_db=-44, pack="ep3", fallback="block_push")
def sluice_turn(g, v):
    m = M()
    m.add(kit.knock([210, 520, 1150], [9, 10, 9], g, 0.14, 0.05, gains=[1.0, 0.6, 0.3]), 0.0, 0.9)
    m.add(kit.creak(0.28, g, 30, 44, modes=(300, 760, 1400), qs=(9, 10, 8)), 0.02, 0.35)
    m.add(kit.knock([190, 480, 1000], [9, 10, 9], g, 0.12, 0.04), 0.3, 0.7)
    d = 0.5
    n = ns(d)
    sl = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(500, 1100, n, "exp"), 0.9, SR, block=32)
    sl = sl / (np.max(np.abs(sl)) + 1e-12) * kit.gate(d, 0.06, 0.3) * (0.7 + 0.3 * dsp.lfo(7.0, n, SR))
    m.add(sl, 0.12, 0.45)
    m.add(kit.bubbles(0.3, g, count=8, fmin=350, fmax=1100), 0.2, 0.3)
    return verb(m.out, 0.4, 0.12, bright=0.5)


@sfx("water_flow", "field", "Water starts running in a trough: a short rush that settles to a gentle trickle, about 1.3 s.", target=-19.0, tail_db=-42, pack="ep3", fallback="splash")
def water_flow(g, v):
    m = M()
    d = 1.3
    n = ns(d)
    rush = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(1700, 900, n, "exp"), 0.7, SR, block=32)
    env = np.exp(-np.arange(n) / SR / 0.35) * 0.8 + 0.2 * np.clip(np.arange(n) / SR / 0.05, 0, 1)
    rush = rush / (np.max(np.abs(rush)) + 1e-12) * env * kit.gate(d, 0.03, 0.4)
    m.add(rush, 0.0, 0.8)
    m.add(kit.bubbles(1.1, g, count=22, fmin=500, fmax=1700, rise=1.6), 0.1, 0.45)
    m.add(kit.sparkle(0.9, g, density=60.0, fmin=3000, fmax=6500), 0.3, 0.1)
    return verb(m.out, 0.35, 0.1, bright=0.6)


@sfx("wheel_turn", "field", "The waterwheel starts: a long wooden creak, then two slow clacks of the paddles.", target=-18.0, tail_db=-44, pack="ep3", fallback="block_push")
def wheel_turn(g, v):
    m = M()
    m.add(kit.creak(0.75, g, 14, 26, modes=(170, 420, 880), qs=(9, 10, 8)), 0.0, 0.55)
    m.add(kit.grind(0.6, g, band=(120, 520), rough=0.6) * kit.gate(0.6, 0.15, 0.25), 0.05, 0.25)
    for at, gn in ((0.55, 0.9), (1.05, 0.75)):
        m.add(kit.knock([240, 600, 1300], [8, 9, 9], g, 0.14, 0.045, gains=[1.0, 0.55, 0.3]), at, gn)
        m.add(kit.thump(140, 80, 0.12, 0.04, 0.0006), at, 0.35)
    return verb(m.out, 0.45, 0.12, bright=0.5)


@sfx("anvil_strike", "big", "A clean ringing anvil hit: a hard hammer click, the steel ring of the face and a long ring of the horn.", target=-15.0, tail_db=-46, pack="ep3", fallback="hit_heavy")
def anvil_strike(g, v):
    m = M()
    m.add(kit.noise_burst(0.012, g, ("high", 2200), 0.003, 0.0002), 0.0, 0.8)
    m.add(kit.thump(260, 120, 0.1, 0.03, 0.0004), 0.0, 0.5)
    m.add(kit.metal(1180.0, 1.6, g, decay=0.55, bright=1.0), 0.0, 0.65)
    m.add(kit.metal(1763.0, 1.2, g, decay=0.4, bright=0.8), 0.0, 0.3)
    m.add(kit.fm_bell(hz("B5"), 1.4, 2.76, 0.9, decay=0.75, idx_decay=0.08), 0.0, 0.25)
    return verb(m.out, 0.8, 0.18, bright=0.8)


@sfx("bell_first", "big", "The First Bell: a very large bronze bell, struck once, long decay, about 35 cents flat of D so Ilya's line is true. Hum an octave below, minor-third tierce, slow beating.", target=-14.5, tail_db=-48, pack="ep3", fallback="bell_toll")
def bell_first(g, v):
    f = hz("D3") * 2 ** (-35 / 1200)
    y = kit.church_bell(f, 6.5, g, decay=1.7, eerie=0.55)
    y = kit.release(y, 0.4)
    y = y * (1.0 + 0.06 * dsp.lfo(0.7, len(y), SR))
    return verb(y, 2.6, 0.32, bright=0.4, predelay=0.025)


@sfx("furnace_roar", "big", "The Heartforge, the hottest furnace: a low roar that swells and holds, about 2 s, a rasp of flame on top.", target=-15.0, tail_db=-42, pack="ep3", fallback="door_rumble")
def furnace_roar(g, v):
    m = M()
    d = 2.0
    n = ns(d)
    m.add(kit.rumble(d, g, fc=210.0, rough=0.7, attack=0.8, release=0.7), 0.0, 0.9)
    fl = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(500, 1500, n, "exp", 0.7), 0.7, SR, block=32)
    fl = fl / (np.max(np.abs(fl)) + 1e-12) * kit.gate(d, 0.9, 0.7) * (0.6 + 0.4 * np.abs(dsp.smooth_random(n, g, 14.0, SR)))
    m.add(fl, 0.0, 0.5)
    m.add(dsp.crackle(ns(1.6), g, 70.0, SR), 0.3, 0.3)
    m.add(kit.thump(60, 40, 0.5, 0.16, 0.02), 0.5, 0.4)
    return m.out


@sfx("hammer_charge", "magic", "The Last Hammer telegraph: a rising metallic whine that tightens to a ringing point, about 1.4 s.", target=-15.5, tail_db=-42, pack="ep3", fallback="telegraph")
def hammer_charge(g, v):
    m = M()
    d = 1.4
    n = ns(d)
    t = np.arange(n) / SR
    f = dsp.glide(260, 1900, n, "exp", 1.6)
    whine = dsp.saw(f, n, SR) * 0.5 + dsp.sine(f * 2.76, n, SR) * 0.3 + dsp.sine(f * 5.4, n, SR) * 0.12
    whine = lp(whine, 6500, 2)
    env = np.clip(t / 1.1, 0, 1) ** 1.8 * np.clip((d - t) / 0.05, 0, 1)
    m.add(whine * env * (1 + 0.18 * np.sin(2 * np.pi * np.cumsum(dsp.glide(5, 22, n)) / SR)), 0.0, 0.6)
    m.add(dsp.butter(dsp.white(n, g), "band", (2500, 7500), SR, 2) * env, 0.0, 0.2)
    m.add(kit.metal(1900.0, 0.4, g, decay=0.25), d - 0.1, 0.5)
    return verb(m.out, 0.4, 0.1, bright=0.8)


@sfx("oath_ring", "magic", "Tempered Oath turns the hammer: a bell-like clang with a shimmer of high partials over a warm low ring.", target=-15.0, tail_db=-44, pack="ep3", fallback="crystal_hit")
def oath_ring(g, v):
    m = M()
    m.add(kit.noise_burst(0.01, g, ("high", 2500), 0.003, 0.0002), 0.0, 0.5)
    m.add(kit.fm_bell(hz("D5"), 1.8, 2.0, 1.6, decay=0.9, idx_decay=0.12), 0.0, 0.5)
    m.add(kit.fm_bell(hz("A5"), 1.5, 3.0, 1.2, decay=0.7, idx_decay=0.1), 0.01, 0.35)
    m.add(kit.metal(hz("D6"), 1.2, g, decay=0.45, bright=1.1), 0.0, 0.35)
    m.add(kit.sparkle(1.4, g, density=45.0, fmin=4000, fmax=9000, fall=1.4), 0.1, 0.18)
    m.add(kit.church_bell(hz("D4"), 1.8, g, decay=0.6), 0.0, 0.25)
    return verb(m.out, 0.9, 0.2, bright=0.85)


@sfx("lift_rumble", "field", "Ore lifts: a chain rattle (links running over a drum) over a low rumble, about 1.6 s.", target=-17.5, tail_db=-42, pack="ep3", fallback="door_rumble")
def lift_rumble(g, v):
    m = M()
    d = 1.6
    m.add(kit.rumble(d, g, fc=160.0, rough=0.5, attack=0.2, release=0.5), 0.0, 0.9)
    t = 0.0
    while t < d - 0.2:
        m.add(kit.knock([g.uniform(1500, 2400), g.uniform(3500, 5200)], [14, 16], g, 0.035, 0.007), t, g.uniform(0.2, 0.4))
        t += g.uniform(0.045, 0.085)
    m.add(kit.grind(d, g, band=(200, 800), rough=0.7) * kit.gate(d, 0.2, 0.4), 0.0, 0.3)
    return verb(m.out, 0.5, 0.12, bright=0.4)
