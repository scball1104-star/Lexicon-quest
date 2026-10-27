"""Sound effect designs for Lexicon Quest NEXT.

Every effect is a function (g: numpy Generator, v: variant index) -> mono float array at
dsp.RENDER_SR (44.1 kHz). build.py decimates to 22.05 kHz, trims, fades, loudness-normalizes
per group and writes 16-bit WAV. `intent` is copied into assets/audio/README.md so a human can
audit each sound by ear against what it is meant to be.

Groups (loudness targets live in build.py): ui, text, foot, field, story, weapon, impact, magic,
status, big, loot.
"""
from __future__ import annotations

import math

import numpy as np

import dsp
import kit
import sfxr
from dsp import RENDER_SR as SR, ns, note_hz as hz

REG: dict = {}


def sfx(id_, group, intent, variants=1, vary=0.0, max_voices=0, cooldown=None, target=None, tail_db=-54.0, pack="core", fallback=None):
    def deco(fn):
        REG[id_] = dict(id=id_, fn=fn, group=group, intent=intent, variants=variants, vary=vary,
                        max_voices=max_voices, cooldown=cooldown, target=target, tail_db=tail_db, pack=pack, fallback=fallback)
        return fn
    return deco


def M(dur=0.0):
    return dsp.Mix(SR, dur)


def lp(x, f, order=2):
    return dsp.butter(x, "low", f, SR, order)


def hp(x, f, order=2):
    return dsp.butter(x, "high", f, SR, order)


def verb(x, t60=0.6, wet=0.15, bright=0.6, predelay=0.008):
    return dsp.mono(dsp.reverb(x, SR, t60=t60, wet=wet, predelay=predelay, bright=bright))


# ============================================================================ UI

@sfx("cursor", "ui", "Menu cursor move. A 45 ms bright tick (B6 pulse, fast decay) with a tiny click on top. Must stay pleasant when held down for repeat.", target=-21.0, cooldown=0.025, max_voices=2)
def cursor(g, v):
    n = ns(0.045)
    f = dsp.glide(1975.5, 1890.0, n)
    y = dsp.pulse(f, n, SR, 0.25) * dsp.env_exp(n, SR, 0.011, 0.0006)
    y += 0.28 * dsp.sine(f * 2, n, SR) * dsp.env_exp(n, SR, 0.005, 0.0004)
    click = kit.noise_burst(0.004, g, ("high", 3500), 0.0007, 0.0002)
    y[: len(click)] += 0.35 * click
    return lp(y, 7200)


@sfx("confirm", "ui", "Menu confirm. Two-note rising blip E6 then B6 (a fifth up), clean pulse with a sine sparkle an octave above the second note.")
def confirm(g, v):
    m = M()
    m.add(kit.tone(hz("E6"), 0.06, "pulse", 0.25, decay=0.022, attack=0.0008), 0.0, 0.8)
    m.add(kit.tone(hz("B6"), 0.13, "pulse", 0.25, decay=0.045, attack=0.0008), 0.045, 0.9)
    m.add(kit.tone(hz("B7"), 0.10, "sine", decay=0.03, attack=0.001), 0.045, 0.22)
    return lp(m.out, 7500)


@sfx("cancel", "ui", "Menu cancel / back. Descending two-note blip A5 to E5, softer triangle plus thin pulse so it reads as 'back' without scolding.")
def cancel(g, v):
    m = M()
    for f, at, d in ((hz("A5"), 0.0, 0.025), (hz("E5"), 0.04, 0.05)):
        m.add(kit.tone(f, d * 4, "tri", decay=d, attack=0.001), at, 0.8)
        m.add(kit.tone(f, d * 4, "pulse", 0.125, decay=d * 0.8, attack=0.001), at, 0.25)
    return lp(m.out, 5500)


@sfx("buzzer", "ui", "Not allowed / invalid choice. Low 'bu-bu' made of two detuned squares (110 and 116 Hz beating) filtered to 2.4 kHz so it is firm, not harsh.")
def buzzer(g, v):
    m = M()
    for at in (0.0, 0.11):
        n = ns(0.085)
        y = dsp.square(110.0, n, SR) + dsp.square(116.5, n, SR) * 0.8
        y *= kit.gate(0.085, 0.003, 0.02)
        m.add(y, at)
    y = dsp.bq(m.out, "lp", 2400, 1.2, SR)
    return dsp.saturate(y * 0.6, 1.5)


def _text_blip(f):
    n = ns(0.032)
    y = dsp.square(f, n, SR) * 0.7 + dsp.triangle(f, n, SR) * 0.5
    y *= dsp.env_exp(n, SR, 0.012, 0.0025, 0.004)
    return lp(y, 2600)


@sfx("text_blip_low", "text", "Dialogue typewriter blip, low voice (D4, about 294 Hz). 32 ms soft square/triangle; played every 2 to 3 characters.", vary=0.03, max_voices=2, cooldown=0.03, target=-25.0)
def text_blip_low(g, v):
    return _text_blip(hz("D4"))


@sfx("text_blip_mid", "text", "Dialogue blip, mid voice (B4). Default for most speakers.", vary=0.03, max_voices=2, cooldown=0.03, target=-25.0)
def text_blip_mid(g, v):
    return _text_blip(hz("B4"))


@sfx("text_blip_high", "text", "Dialogue blip, high voice (F#5) for children, Mira when excited, small creatures.", vary=0.03, max_voices=2, cooldown=0.03, target=-26.0)
def text_blip_high(g, v):
    return _text_blip(hz("F#5"))


@sfx("menu_open", "ui", "Main menu opens. Quick rising G5-D6-G6 sparkle with a soft upward air swish.")
def menu_open(g, v):
    m = M()
    m.add(kit.blips(["G5", "D6", "G6"], 0.028, 0.12, "pulse", 0.25, decay=0.035), 0.0, 0.8)
    m.add(kit.whoosh(0.16, g, 900, 4200, q=1.2, peak=0.6), 0.0, 0.18)
    return lp(m.out, 8000)


@sfx("menu_close", "ui", "Main menu closes. Mirror of menu_open: G6-D6-G5 falling with a downward swish.")
def menu_close(g, v):
    m = M()
    m.add(kit.blips(["G6", "D6", "G5"], 0.028, 0.12, "pulse", 0.25, decay=0.03), 0.0, 0.8)
    m.add(kit.whoosh(0.14, g, 4000, 900, q=1.2, peak=0.35), 0.0, 0.16)
    return lp(m.out, 8000)


@sfx("equip", "ui", "Equip an item. A short metallic 'shing-clink' (stiff-bar partials at 1.9 kHz) over a small leather/armor thunk.", target=-19.0)
def equip(g, v):
    m = M()
    m.add(kit.metal(1900, 0.5, g, decay=0.16, bright=0.8), 0.012, 0.7)
    m.add(kit.metal(2870, 0.35, g, decay=0.08, bright=0.6), 0.03, 0.35)
    m.add(kit.noise_burst(0.05, g, (2500, 8000), 0.008, 0.0005), 0.0, 0.5)
    m.add(kit.thump(300, 160, 0.08, 0.02, 0.001), 0.0, 0.45)
    return lp(m.out, 9000)


@sfx("buy", "ui", "Purchase / gold spent. Coin 'ka-ching': register click, an sfxr coin pickup (B6 jumping up) and a bright metal shimmer.", target=-18.0)
def buy(g, v):
    m = M()
    m.add(kit.noise_burst(0.02, g, ("high", 3000), 0.003, 0.0003), 0.0, 0.4)
    m.add(sfxr.render(dict(sfxr.PRESETS["pickup_coin"], base_freq=0.6, seed=11)), 0.015, 0.8)
    m.add(kit.metal(3150, 0.45, g, decay=0.12, bright=0.5), 0.07, 0.35)
    return lp(m.out, 9000)


@sfx("coin", "ui", "Gold picked up in the field or from a chest. Classic two-step coin blip (sfxr pickup preset).", target=-19.0)
def coin(g, v):
    return lp(sfxr.render(dict(sfxr.PRESETS["pickup_coin"], seed=5)), 8500)


@sfx("save_chime", "ui", "Save confirmed (short, used in the save menu; the chapel uses the 'save' jingle). Two soft FM chimes C6 then G6 with a gentle room.", target=-19.0, tail_db=-46)
def save_chime(g, v):
    m = M()
    m.add(kit.fm_bell(hz("C6"), 0.8, ratio=3.5, index=2.2, decay=0.36, idx_decay=0.12), 0.0, 0.7)
    m.add(kit.fm_bell(hz("G6"), 0.9, ratio=3.5, index=2.0, decay=0.42, idx_decay=0.12), 0.11, 0.75)
    return verb(m.out, t60=0.8, wet=0.2)


@sfx("emote_pop", "ui", "Emote balloon appears (!, ?, heart). Tiny rising 'bwip' with a click.", target=-21.0)
def emote_pop(g, v):
    n = ns(0.06)
    y = dsp.sine(dsp.glide(620, 1250, n, "exp", 0.6), n, SR) * dsp.env_exp(n, SR, 0.018, 0.001)
    y += 0.3 * dsp.triangle(dsp.glide(620, 1250, n), n, SR) * dsp.env_exp(n, SR, 0.012, 0.001)
    c = kit.noise_burst(0.004, g, ("high", 2500), 0.0008)
    y[: len(c)] += 0.3 * c
    return y


# ============================================================================ FOOTSTEPS (3 variants each, played with pitch variance)

@sfx("footstep_grass", "foot", "Footstep on grass. Soft crunch of blades (band noise 1.8 to 6 kHz with crackle) over a faint heel thud. Quiet; 3 variants.", variants=3, vary=0.06, max_voices=2, cooldown=0.06)
def footstep_grass(g, v):
    m = M()
    m.add(kit.noise_burst(0.09, g, (1800, 6000), 0.022, 0.006), 0.0, 0.7)
    cr = dsp.butter(dsp.crackle(ns(0.07), g, 380, SR, 0.0008), "band", (1500, 7000), SR, 2)
    m.add(cr / (np.abs(cr).max() + 1e-9) * dsp.env_exp(len(cr), SR, 0.025, 0.004), 0.004, 0.5)
    m.add(kit.thump(140 + v * 6, 95, 0.05, 0.015, 0.002), 0.0, 0.12)
    return m.out


@sfx("footstep_stone", "foot", "Footstep on stone (archive floor, plaza). Hard heel click plus a short mid knock and a low thud. 3 variants.", variants=3, vary=0.05, max_voices=2, cooldown=0.06)
def footstep_stone(g, v):
    m = M()
    m.add(kit.noise_burst(0.012, g, ("high", 3200), 0.0022, 0.0003), 0.0, 0.6)
    m.add(kit.knock([820 + 60 * v, 1500, 2400], [3, 5, 6], g, 0.08, 0.014, [1.0, 0.6, 0.3]), 0.001, 0.8)
    m.add(kit.knock([380 + 20 * v, 640], [3, 4], g, 0.07, 0.016, [1.0, 0.5]), 0.0, 0.45)
    m.add(kit.thump(150, 100, 0.06, 0.018, 0.001), 0.0, 0.12)
    return m.out


@sfx("footstep_wood", "foot", "Footstep on wooden floor (interiors). Hollow knock from resonant board modes (250, 610, 1150 Hz). 3 variants.", variants=3, vary=0.05, max_voices=2, cooldown=0.06)
def footstep_wood(g, v):
    m = M()
    base = 240 + 15 * v
    m.add(kit.knock([base * 1.25, base * 2.55, base * 4.7, base * 7.3], [7, 9, 8, 6], g, 0.13, 0.03, [1.0, 0.7, 0.4, 0.15]), 0.0, 0.8)
    m.add(kit.noise_burst(0.01, g, ("high", 2500), 0.002), 0.0, 0.3)
    m.add(kit.thump(150, 100, 0.05, 0.016), 0.0, 0.1)
    return m.out


# ============================================================================ FIELD / DUNGEON

@sfx("door_open", "field", "Wooden door opens: iron latch click, then a short low hinge creak (stick-slip wood resonance). Friendly, not horror.")
def door_open(g, v):
    m = M()
    m.add(kit.metal(2400, 0.08, g, decay=0.015, bright=0.6), 0.0, 0.3)
    m.add(kit.noise_burst(0.02, g, ("high", 2000), 0.003), 0.0, 0.2)
    m.add(kit.creak(0.34, g, 48, 75, modes=(330, 820, 1550), qs=(9, 11, 8)), 0.05, 0.55)
    m.add(kit.whoosh(0.35, g, 300, 900, q=0.8, peak=0.5, kind="pink"), 0.05, 0.12)
    return m.out


@sfx("door_close", "field", "Door shuts: a push of air, a solid wooden thud (90 Hz body) and the latch dropping 40 ms later.")
def door_close(g, v):
    m = M()
    m.add(kit.whoosh(0.12, g, 400, 200, q=0.7, peak=0.7, kind="pink"), 0.0, 0.2)
    m.add(kit.thump(110, 60, 0.25, 0.07, 0.001), 0.1, 0.55)
    m.add(kit.knock([260, 520, 900, 1500], [5, 7, 7, 6], g, 0.16, 0.035, [1.0, 0.7, 0.4, 0.2]), 0.1, 1.0)
    m.add(kit.metal(2200, 0.07, g, decay=0.012), 0.145, 0.35)
    return m.out


@sfx("stairs", "field", "Taking stairs (map transition). Four quick footsteps stepping down in pitch and level, with a little room.")
def stairs(g, v):
    m = M()
    for i in range(4):
        b = 300 * (0.9 ** i)
        st = kit.knock([b, b * 2.4, b * 4.1], [6, 7, 6], g, 0.1, 0.022, [1.0, 0.5, 0.25])
        st = kit.add(st, (kit.thump(130 * 0.93 ** i, 80, 0.06, 0.02), 0.5))
        m.add(st, i * 0.085, 0.9 * (0.86 ** i))
    return verb(m.out, 0.5, 0.12)


@sfx("chest_open", "field", "Treasure chest opens: latch clack, short hinge squeak, then the lid thumping back. The item_get jingle follows.")
def chest_open(g, v):
    m = M()
    m.add(kit.metal(2100, 0.1, g, decay=0.02), 0.0, 0.6)
    m.add(kit.noise_burst(0.02, g, ("high", 2200), 0.003), 0.0, 0.4)
    m.add(kit.creak(0.22, g, 70, 110, modes=(620, 1350, 2300), qs=(10, 12, 9)), 0.06, 0.42)
    m.add(kit.thump(140, 75, 0.2, 0.05), 0.3, 0.9)
    m.add(kit.knock([210, 520, 940], [5, 6, 7], g, 0.12, 0.025, [1.0, 0.5, 0.3]), 0.3, 0.5)
    return m.out


@sfx("pot_break", "field", "Breakable pot shatters: ceramic thump, a spray of glassy shards, grit and a couple of debris clunks.")
def pot_break(g, v):
    m = M()
    m.add(kit.thump(210, 110, 0.12, 0.03, 0.0005), 0.0, 0.7)
    m.add(kit.knock([480, 1130, 1900], [8, 9, 9], g, 0.12, 0.03), 0.0, 0.6)
    m.add(kit.shatter(0.5, g, count=34, fmin=1800, fmax=6500, spread=0.22), 0.005, 0.8)
    for at in (0.12, 0.2, 0.31):
        m.add(kit.knock([g.uniform(350, 700), g.uniform(900, 1500)], [6, 6], g, 0.06, 0.012), at, 0.3)
    return m.out


@sfx("block_push", "field", "Pushing a stone block one tile: heavy stone scrape (grainy band noise), gravel crackle and a low rumble.", target=-19.0)
def block_push(g, v):
    m = M()
    d = 0.5
    env = kit.gate(d, 0.04, 0.16)
    m.add(kit.grind(d, g, (200, 900), 0.85) * env, 0.0, 0.8)
    cr = dsp.butter(dsp.crackle(ns(d), g, 260, SR, 0.0012), "band", (900, 3800), SR, 2)
    m.add(cr / (np.abs(cr).max() + 1e-9) * env, 0.0, 0.35)
    m.add(kit.rumble(d, g, 120, 0.4, 0.05, 0.15), 0.0, 0.7)
    m.add(kit.thump(90, 60, 0.12, 0.04), d - 0.12, 0.35)
    return m.out


@sfx("switch_on", "field", "Floor or wall switch pressed ON: mechanical ka-chunk, then a small rising C6-G6 confirmation chime so the player knows something changed.")
def switch_on(g, v):
    m = M()
    m.add(kit.noise_burst(0.012, g, ("high", 2500), 0.002), 0.0, 0.6)
    m.add(kit.thump(170, 95, 0.1, 0.025), 0.0, 0.8)
    m.add(kit.knock([380, 900], [6, 6], g, 0.08, 0.015), 0.035, 0.5)
    m.add(kit.blips(["C6", "G6"], 0.07, 0.2, "pulse", 0.25, decay=0.05), 0.08, 0.38)
    return m.out


@sfx("switch_off", "field", "Switch released / OFF: the same mechanism with a falling G5-C5 chime.")
def switch_off(g, v):
    m = M()
    m.add(kit.noise_burst(0.012, g, ("high", 2500), 0.002), 0.0, 0.6)
    m.add(kit.thump(160, 90, 0.1, 0.025), 0.0, 0.8)
    m.add(kit.blips(["G5", "C5"], 0.07, 0.2, "pulse", 0.25, decay=0.045), 0.06, 0.34)
    return m.out


@sfx("gate_open", "field", "Heavy gate or portcullis rising: low rumble, stone grinding, a chain rattle (jittered metal clicks) and a final settling thud.", target=-17.0)
def gate_open(g, v):
    m = M()
    d = 1.3
    m.add(kit.rumble(d, g, 160, 0.5, 0.15, 0.35), 0.0, 0.9)
    m.add(kit.grind(d - 0.2, g, (260, 1000), 0.7) * kit.gate(d - 0.2, 0.2, 0.3), 0.05, 0.45)
    t = 0.08
    while t < 1.0:
        m.add(kit.metal(g.uniform(1700, 2600), 0.06, g, decay=0.012, bright=0.7), t, g.uniform(0.12, 0.25))
        t += g.uniform(0.045, 0.085)
    m.add(kit.thump(85, 45, 0.35, 0.1, 0.001), 1.12, 1.0)
    m.add(kit.noise_burst(0.2, g, ("low", 900), 0.05), 1.12, 0.4)
    return m.out


@sfx("door_rumble", "story", "Great stone-and-root door grinding open (Archive seals, the boss door): deep rumble, grinding stone, straining root creaks, falling grit, a final thud. About 1.5 s.", target=-16.0)
def door_rumble(g, v):
    m = M()
    d = 1.3
    m.add(kit.rumble(d, g, 140, 0.6, 0.2, 0.3), 0.0, 1.0)
    m.add(kit.grind(d - 0.25, g, (180, 800), 0.8) * kit.gate(d - 0.25, 0.25, 0.3), 0.08, 0.55)
    for at, r in ((0.12, 38), (0.45, 30), (0.78, 44)):
        m.add(kit.creak(0.35, g, r, r * 1.3, modes=(210, 520, 980), qs=(8, 10, 8)), at, 0.32)
    grit = dsp.butter(dsp.crackle(ns(d), g, 120, SR, 0.002), "band", (1200, 5000), SR, 2)
    m.add(grit / (np.abs(grit).max() + 1e-9) * kit.gate(d, 0.4, 0.4), 0.0, 0.2)
    m.add(kit.thump(70, 38, 0.32, 0.1, 0.001), 1.12, 1.0)
    return verb(m.out, 0.7, 0.14, bright=0.3)


@sfx("door_locked", "field", "Locked door: the handle rattles against the lock three times (metal clicks) with a dull thunk. Tells the player a key is needed.")
def door_locked(g, v):
    m = M()
    for i, at in enumerate((0.0, 0.07, 0.15)):
        m.add(kit.metal(1800 + 150 * i, 0.07, g, decay=0.012, bright=0.7), at, 0.5)
        m.add(kit.thump(150, 100, 0.06, 0.015), at, 0.5)
    m.add(kit.knock([200, 470], [5, 6], g, 0.1, 0.02), 0.15, 0.4)
    return m.out


@sfx("door_unlock", "field", "Key turns in a lock: metallic scrape, a firm 'ka-clack', and a tiny bright chime.")
def door_unlock(g, v):
    m = M()
    m.add(kit.noise_burst(0.09, g, (2500, 7000), 0.04, 0.01), 0.0, 0.35)
    m.add(kit.metal(1650, 0.12, g, decay=0.02), 0.09, 0.7)
    m.add(kit.thump(180, 100, 0.07, 0.02), 0.09, 0.6)
    m.add(kit.metal(2300, 0.12, g, decay=0.025), 0.17, 0.6)
    m.add(kit.fm_bell(hz("E7"), 0.4, ratio=3.5, index=1.5, decay=0.15, idx_decay=0.06), 0.22, 0.22)
    return m.out


@sfx("bridge_appear", "field", "Invisible ink bridge materializes: a rising glissando in fifths, gathering sparkles and a soft major chime as it locks in place.", target=-17.0, tail_db=-46)
def bridge_appear(g, v):
    m = M()
    d = 0.8
    n = ns(d)
    env = kit.gate(d, 0.15, 0.15)
    for r, a in ((1.0, 0.6), (1.5, 0.45), (2.0, 0.3)):
        f = dsp.glide(330 * r, 1320 * r, n, "exp", 1.2)
        m.add(dsp.sine(f, n, SR) * env, 0.0, a)
    m.add(kit.sparkle(d, g, 40, 2500, 8000, (0.02, 0.06), fall=0.6), 0.0, 0.35)
    m.add(kit.whoosh(d, g, 500, 3000, q=1.0, peak=0.85), 0.0, 0.18)
    for i, nt in enumerate(("E6", "G#6", "B6")):
        m.add(kit.fm_bell(hz(nt), 0.7, 3.5, 1.6, decay=0.28, idx_decay=0.08), d - 0.02 + i * 0.015, 0.4)
    return verb(m.out, 1.0, 0.26, bright=0.8)


@sfx("lantern_reveal", "field", "Lantern of Recall reveals hidden ink: a low warm swell, then an ascending whole-tone shimmer of bells (C-D-E-F#-G#) and a breath of air. Mysterious, rewarding.", target=-17.0, tail_db=-46)
def lantern_reveal(g, v):
    m = M()
    d = 1.1
    n = ns(d)
    pad = (dsp.sine(hz("D3"), n, SR) + 0.6 * dsp.sine(hz("A3"), n, SR) + 0.35 * dsp.triangle(hz("D4"), n, SR))
    m.add(pad * kit.gate(d, 0.5, 0.6), 0.0, 0.45)
    for i, nt in enumerate(("C6", "D6", "E6", "F#6", "G#6", "C7")):
        m.add(kit.fm_bell(hz(nt), 0.6, 3.0, 1.8, decay=0.24, idx_decay=0.07), 0.2 + i * 0.07, 0.38 + 0.03 * i)
    m.add(kit.whoosh(0.8, g, 800, 5000, q=0.9, peak=0.7, kind="pink"), 0.1, 0.15)
    m.add(kit.sparkle(0.7, g, 25, 3500, 8500, (0.02, 0.05)), 0.35, 0.2)
    return verb(m.out, 1.2, 0.3, bright=0.7)


@sfx("splash", "field", "Water splash (falling into shallows, a stone into the river): noise burst, a water 'plunk', bubbles and fine spray.")
def splash(g, v):
    m = M()
    m.add(kit.noise_burst(0.3, g, ("low", 3200), 0.08, 0.004, kind="pink"), 0.0, 0.8)
    n = ns(0.07)
    m.add(dsp.sine(dsp.glide(240, 700, n, "exp", 0.6), n, SR) * dsp.env_exp(n, SR, 0.025, 0.002), 0.01, 0.5)
    m.add(kit.bubbles(0.45, g, 14, 400, 1600), 0.04, 0.35)
    m.add(kit.noise_burst(0.35, g, ("high", 4000), 0.1, 0.01), 0.02, 0.3)
    return m.out


@sfx("jump", "field", "Hopping down a one-way ledge: a light rising 'hup' chirp with a puff of air.", target=-20.0)
def jump(g, v):
    m = M()
    n = ns(0.16)
    m.add(dsp.sine(dsp.glide(260, 560, n, "exp", 0.8), n, SR) * dsp.env_exp(n, SR, 0.05, 0.004), 0.0, 0.6)
    m.add(dsp.pulse(dsp.glide(260, 560, n, "exp", 0.8), n, SR, 0.4) * dsp.env_exp(n, SR, 0.035, 0.004), 0.0, 0.15)
    m.add(kit.whoosh(0.15, g, 600, 2200, q=1.0, peak=0.4), 0.0, 0.25)
    return lp(m.out, 6000)


@sfx("land", "field", "Landing after a ledge hop: soft thud with a scuff of grit.", target=-21.0)
def land(g, v):
    m = M()
    m.add(kit.thump(140, 80, 0.1, 0.03), 0.0, 0.45)
    m.add(kit.knock([300, 620, 1100], [3, 4, 5], g, 0.1, 0.025, [1.0, 0.6, 0.3]), 0.0, 0.8)
    m.add(kit.noise_burst(0.09, g, (900, 4500), 0.025, 0.002), 0.0, 0.6)
    return m.out


@sfx("fall", "field", "Falling through a pit to the floor below: a descending whistle with rushing air.", target=-18.0)
def fall(g, v):
    m = M()
    d = 0.85
    n = ns(d)
    f = dsp.glide(1400, 180, n, "exp", 0.9)
    m.add(dsp.sine(f, n, SR) * kit.gate(d, 0.02, 0.25), 0.0, 0.5)
    m.add(dsp.triangle(f * 0.5, n, SR) * kit.gate(d, 0.02, 0.25), 0.0, 0.2)
    m.add(kit.whoosh(d, g, 2500, 400, q=0.8, peak=0.5), 0.0, 0.3)
    return m.out


@sfx("brazier_light", "field", "Brazier or torch ignites in a dark room: a 'fwoomp' (rising air plus low thump) settling into a few crackles.", target=-18.0)
def brazier_light(g, v):
    m = M()
    m.add(kit.whoosh(0.35, g, 250, 1800, q=0.9, peak=0.45, kind="pink"), 0.0, 0.7)
    m.add(kit.thump(95, 55, 0.25, 0.08, 0.01), 0.1, 0.7)
    cr = dsp.butter(dsp.crackle(ns(0.6), g, 70, SR, 0.0015), "band", (1500, 6000), SR, 2)
    m.add(cr / (np.abs(cr).max() + 1e-9) * kit.gate(0.6, 0.05, 0.3), 0.15, 0.3)
    m.add(kit.noise_burst(0.6, g, (300, 1500), 0.25, 0.08, kind="pink"), 0.12, 0.25)
    return m.out


@sfx("shelf_move", "field", "Moving bookshelf slides along the floor: heavy wooden scrape, groaning creaks and a settling knock.", target=-18.0)
def shelf_move(g, v):
    m = M()
    d = 0.9
    m.add(kit.grind(d, g, (150, 700), 0.7) * kit.gate(d, 0.08, 0.2), 0.0, 0.7)
    m.add(kit.creak(0.6, g, 30, 42, modes=(240, 610, 1150), qs=(8, 9, 8)), 0.1, 0.45)
    m.add(kit.rumble(d, g, 110, 0.4, 0.08, 0.2), 0.0, 0.6)
    m.add(kit.knock([150, 380, 700], [5, 6, 6], g, 0.15, 0.04), d - 0.08, 0.6)
    return m.out


@sfx("crystal_hit", "field", "Crystal switch struck by a tool: a bright glassy ping (inharmonic plate partials) and a rising two-note shimmer.", target=-18.0, tail_db=-46)
def crystal_hit(g, v):
    m = M()
    m.add(kit.glass(1760, 0.8, g, decay=0.32), 0.0, 0.8)
    m.add(kit.noise_burst(0.01, g, ("high", 4000), 0.002), 0.0, 0.4)
    m.add(kit.fm_bell(hz("A6"), 0.6, 2.0, 1.2, decay=0.22, idx_decay=0.05), 0.09, 0.35)
    m.add(kit.fm_bell(hz("E7"), 0.5, 2.0, 1.2, decay=0.2, idx_decay=0.05), 0.17, 0.3)
    return verb(m.out, 0.7, 0.18, bright=0.9)


# ============================================================================ STORY

@sfx("bell_toll", "story", "One deep bronze church-bell toll, slightly eerie: the Thirteenth Bell. Nominal about A3, hum an octave below, minor-third tierce, slow beating between detuned partials, about 3.5 s decay in a large stone space.", target=-15.0, tail_db=-46)
def bell_toll(g, v):
    y = kit.church_bell(hz("A3"), 3.3, g, decay=1.05, eerie=1.0)
    y = kit.release(y, 0.35)
    y = y * (1.0 + 0.08 * dsp.lfo(0.9, len(y), SR))
    return verb(y, 1.9, 0.3, bright=0.4, predelay=0.02)


@sfx("bell_thirteenth", "big", "The Thirteenth Bell, the cracked bell of the Stacks, as the town hears it (the cold open's thirteenth toll, F1, the Stacks, the credits): one hard strike of a great bronze bell a tritone below the town's twelve (nominal D-sharp 3 against their A3). The crack splits every partial so it beats sour and rattles, and it never sings on: the crack chokes it in under a second, then silence. Core set, under 40 KB (H6, CRITIQUE_ARC 10).", target=-14.5, tail_db=-40)
def bell_thirteenth(g, v):
    f, d, choke = hz("D#3"), 0.84, 0.62
    n = ns(d)
    t = dsp.tvec(n)
    spec = [(0.5, 0.42, 0.50), (1.0, 0.72, 0.36), (1.19, 0.58, 0.30), (1.5, 0.30, 0.24), (2.0, 1.00, 0.27),
            (2.5, 0.40, 0.18), (2.67, 0.38, 0.17), (3.03, 0.30, 0.14), (4.1, 0.24, 0.10), (5.4, 0.15, 0.07), (6.9, 0.09, 0.05)]
    y = np.zeros(n)
    for r, a, dec in spec:
        for split, w in ((0.989, 0.55), (1.014, 0.45)):   # the crack: every partial in two, a sour fast beat
            y += a * w * np.sin(dsp.TAU * f * r * split * t + g.random() * dsp.TAU) * np.exp(-t / dec)
    y *= 1.0 + 0.35 * np.sin(dsp.TAU * 37.0 * t) * np.exp(-t / 0.5)   # the cracked bronze rattles against itself
    strike = dsp.butter(dsp.white(ns(0.05), g), "band", (f * 2.0, min(SR * 0.45, f * 14)), SR, 2)
    y[: len(strike)] += 0.9 * strike * dsp.env_exp(len(strike), SR, 0.012, 0.0004)   # a hard, dry clapper knock
    y *= (1 - np.clip((t - choke) / (d - choke), 0, 1)) ** 2   # choked: it stops short instead of ringing on
    y *= np.clip(t / 0.0015, 0, 1)
    return dsp.mono(dsp.reverb(y, SR, t60=0.7, wet=0.16, predelay=0.012, bright=0.45, extend=False))


@sfx("bell_peal", "story", "Willowmere's twelve bells ringing together in celebration: one full round of twelve bells descending a major scale (G6 to C5), then the start of a second round with pairs swapped, as in English change ringing. About 4.5 s.", target=-15.0, tail_db=-46)
def bell_peal(g, v):
    m = M()
    notes = ["G6", "F#6", "E6", "D6", "C6", "B5", "A5", "G5", "F#5", "E5", "D5", "C5"]
    order1 = list(range(12))
    order2 = [1, 0, 3, 2, 5, 4]
    step = 0.15
    t = 0.0
    for i in order1:
        m.add(kit.church_bell(hz(notes[i]), 1.5, g, decay=0.55 + 0.05 * i, eerie=0.0), t, 0.55 + 0.03 * i)
        t += step
    t += step
    for k, i in enumerate(order2):
        m.add(kit.church_bell(hz(notes[i]), 1.6, g, decay=0.6 + 0.05 * i), t, (0.55 + 0.03 * i) * (1 - 0.08 * k))
        t += step
    return verb(m.out, 1.4, 0.24, bright=0.6, predelay=0.02)


@sfx("sign_fade", "story", "A painted sign's name fades away: a soft downward shimmer in a minor color, high tremolo tones sinking and thinning into dust. 0.8 s.", target=-19.0, tail_db=-46)
def sign_fade(g, v):
    m = M()
    d = 0.7
    n = ns(d)
    trem = 1.0 + 0.5 * dsp.lfo(11.0, n, SR)
    for nt, a in (("E6", 0.5), ("G6", 0.4), ("B6", 0.3)):
        f = dsp.glide(hz(nt), hz(nt) * 0.71, n, "exp", 1.3)
        m.add(dsp.sine(f, n, SR) * trem * kit.gate(d, 0.03, 0.55), 0.0, a)
    m.add(kit.sparkle(d, g, 22, 2500, 7000, (0.02, 0.06), fall=0.6), 0.0, 0.25)
    m.add(kit.noise_burst(d, g, (2500, 8000), 0.3, 0.05), 0.0, 0.08)
    return verb(m.out, 0.8, 0.26)


@sfx("name_restore", "story", "A lost name returns: bright upward sparkle on the shared 'name' motif (rising fifth, whole-step lift, falling major third: C6 G6 A6 F6) resolving up to C7, with glitter. 0.9 s.", target=-17.0, tail_db=-46)
def name_restore(g, v):
    m = M()
    for i, nt in enumerate(("C6", "G6", "A6", "F6")):
        m.add(kit.fm_bell(hz(nt), 0.6, 3.0, 1.6, decay=0.22, idx_decay=0.05), i * 0.075, 0.55)
        m.add(kit.tone(hz(nt), 0.25, "pulse", 0.25, decay=0.05), i * 0.075, 0.12)
    m.add(kit.fm_bell(hz("C7"), 0.55, 3.0, 2.0, decay=0.22, idx_decay=0.08), 0.33, 0.6)
    m.add(kit.sparkle(0.6, g, 35, 3000, 8500, (0.02, 0.05), fall=0.8), 0.05, 0.3)
    m.add(kit.whoosh(0.45, g, 1200, 6000, q=1.0, peak=0.8), 0.0, 0.12)
    return verb(m.out, 0.8, 0.22, bright=0.85)


@sfx("ink_gurgle", "story", "Living ink gurgles (ink pools, ink creatures): wet, low, viscous bubbles with a dark slosh. 0.6 s.", target=-18.0)
def ink_gurgle(g, v):
    m = M()
    m.add(kit.bubbles(0.55, g, 9, 90, 260, (0.04, 0.09), rise=1.6), 0.0, 0.9)
    m.add(kit.bubbles(0.5, g, 6, 250, 520, (0.02, 0.05), rise=1.4), 0.05, 0.35)
    slosh = dsp.bq_tv(dsp.brown(ns(0.6), g), "lp", dsp.glide(300, 900, ns(0.6)) * (1 + 0.3 * dsp.smooth_random(ns(0.6), g, 12)), 2.5, SR)
    m.add(slosh / (np.abs(slosh).max() + 1e-9) * kit.gate(0.6, 0.05, 0.25), 0.0, 0.45)
    return lp(m.out, 3000)


@sfx("page_flutter", "story", "A burst of paper pages fluttering (Lost Pages, the Archive): rapid crisp page flaps that thin out over 0.6 s.", target=-18.0)
def page_flutter(g, v):
    m = M()
    t = 0.0
    while t < 0.55:
        m.add(kit.paper_flap(g, SR, g.uniform(0.012, 0.03)), t, g.uniform(0.4, 1.0) * (1 - t / 0.75))
        t += g.uniform(0.012, 0.03) * (1 + 2.5 * t)
    m.add(kit.whoosh(0.5, g, 1500, 700, q=0.8, peak=0.2, kind="pink"), 0.0, 0.25)
    return m.out


@sfx("name_devour", "story", "The Archivore devours a party member's name (its signature move): a dark rushing inhale, a crunch of tearing paper and a sinking, distorted moan.", target=-14.0, tail_db=-46)
def name_devour(g, v):
    m = M()
    inhale = kit.reverse_swell(kit.noise_burst(0.7, g, (300, 3500), 0.25, 0.002, kind="pink"))
    m.add(inhale, 0.0, 0.7)
    tear = np.concatenate([kit.paper_flap(g, SR, g.uniform(0.01, 0.025)) for _ in range(16)])
    m.add(tear / (np.abs(tear).max() + 1e-9), 0.66, 0.55)
    m.add(kit.thump(90, 40, 0.4, 0.12, 0.001), 0.68, 0.9)
    d = 0.7
    n = ns(d)
    f = dsp.glide(320, 70, n, "exp", 0.8)
    moan = dsp.saw(f, n, SR) + dsp.saw(f * 1.06, n, SR)
    moan = dsp.saturate(dsp.butter(moan, "low", 900, SR, 2) * 0.8, 2.5) * kit.gate(d, 0.05, 0.4)
    m.add(moan, 0.7, 0.5)
    return verb(m.out, 1.1, 0.22, bright=0.3)


@sfx("summon", "story", "Something is summoned (the Archivore calls Lost Pages): a low swirling portal swell with chorus, rising glitter and a soft 'whoom'.", target=-16.0, tail_db=-46)
def summon(g, v):
    m = M()
    d = 0.95
    n = ns(d)
    f = 110 * (1 + 0.02 * dsp.lfo(5.5, n, SR))
    sw = dsp.sine(f, n, SR) + dsp.sine(f * 1.5 * 1.004, n, SR) * 0.6 + dsp.saw(f * 2, n, SR) * 0.15
    sw = dsp.chorus(sw, SR, 3.0, 1.3, 0.5)
    m.add(sw * kit.gate(d, 0.4, 0.35), 0.0, 0.6)
    m.add(kit.whoosh(d, g, 200, 2400, q=1.4, peak=0.7, kind="pink"), 0.0, 0.4)
    m.add(kit.sparkle(0.7, g, 30, 2000, 7000, (0.02, 0.06), fall=0.5), 0.35, 0.3)
    m.add(kit.thump(70, 45, 0.35, 0.1), d * 0.72, 0.5)
    return verb(m.out, 1.0, 0.26, bright=0.6)


# ============================================================================ BATTLE: weapons

@sfx("sword_slash", "weapon", "Sword swing: a fast band-passed noise sweep (1.2 to 5.5 kHz 'shwip') with a short metallic edge ring on top. The battle scene layers hit_light / hit_heavy on contact.", variants=2, vary=0.03)
def sword_slash(g, v):
    m = M()
    sw = kit.whoosh(0.2, g, 1200, 5500, q=2.2, peak=0.35)
    m.add(sw, 0.0, 0.9)
    m.add(kit.whoosh(0.18, g, 350, 900, q=1.0, peak=0.4, kind="pink"), 0.0, 0.35)
    m.add(kit.metal(2300 + 140 * v, 0.35, g, decay=0.09, bright=0.8), 0.05, 0.35)
    m.add(kit.metal(3900, 0.2, g, decay=0.05, bright=0.5), 0.055, 0.2)
    return m.out


@sfx("spear_thrust", "weapon", "Spear thrust: a tight noise burst falling 3 kHz to 800 Hz, a pitched 'fwip' glide and a small glint at the tip.", variants=2, vary=0.03)
def spear_thrust(g, v):
    m = M()
    m.add(kit.whoosh(0.13, g, 3200, 800, q=1.8, peak=0.18), 0.0, 0.9)
    n = ns(0.11)
    m.add(dsp.sine(dsp.glide(950, 280, n, "exp", 0.8), n, SR) * dsp.env_exp(n, SR, 0.04, 0.002), 0.0, 0.4)
    m.add(kit.metal(3800 + 200 * v, 0.12, g, decay=0.025, bright=0.4), 0.06, 0.25)
    return m.out


@sfx("staff_hit", "weapon", "Staff strike: a hollow wooden 'thock' (resonant modes 420, 1050, 1720 Hz) on a short low body thump.", variants=2, vary=0.04, target=-16.0)
def staff_hit(g, v):
    m = M()
    m.add(kit.whoosh(0.1, g, 700, 1800, q=1.2, peak=0.5, kind="pink"), 0.0, 0.25)
    m.add(kit.knock([420 + 20 * v, 1050, 1720, 2600], [16, 12, 9, 6], g, 0.26, 0.09, [1.0, 0.5, 0.25, 0.08], exc=0.008), 0.06, 1.0)
    m.add(kit.noise_burst(0.1, g, (500, 2200), 0.03, 0.0015, kind="pink"), 0.06, 0.55)
    m.add(kit.thump(200, 120, 0.12, 0.045), 0.06, 0.4)
    return m.out


@sfx("axe_chop", "weapon", "Axe chop: a heavy low whoosh into a chunky impact (95 Hz thump, crunchy mid noise, a splinter crackle).", variants=2, vary=0.03, target=-16.0)
def axe_chop(g, v):
    m = M()
    m.add(kit.whoosh(0.13, g, 300, 1500, q=1.0, peak=0.75, kind="pink"), 0.0, 0.5)
    m.add(kit.thump(95, 50, 0.22, 0.06, 0.001), 0.1, 0.6)
    crunch = dsp.saturate(kit.noise_burst(0.12, g, (500, 2600), 0.04, 0.001), 2.0)
    m.add(crunch, 0.1, 0.85)
    m.add(kit.knock([310, 720, 1300], [5, 6, 6], g, 0.12, 0.03, [1.0, 0.6, 0.3]), 0.1, 0.45)
    cr = dsp.butter(dsp.crackle(ns(0.1), g, 300, SR, 0.0007), "band", (1500, 6000), SR, 2)
    m.add(cr / (np.abs(cr).max() + 1e-9) * dsp.env_exp(len(cr), SR, 0.03), 0.105, 0.3)
    return m.out


@sfx("bow_shot", "weapon", "Bow shot: bowstring twang (Karplus-Strong at A2 with a slight pitch drop), a release snap and the arrow's high whoosh.", variants=2, vary=0.03)
def bow_shot(g, v):
    m = M()
    s = kit.karplus(110.0 * (1 + 0.02 * v), 0.45, g, t60=0.35, bright=0.75, pick=0.13)
    m.add(s, 0.0, 0.8)
    m.add(kit.noise_burst(0.015, g, ("high", 2000), 0.003), 0.0, 0.45)
    m.add(kit.whoosh(0.2, g, 6500, 2000, q=1.6, peak=0.3), 0.02, 0.45)
    return m.out


# ============================================================================ BATTLE: impacts

@sfx("hit_light", "impact", "Ordinary hit landing: a punchy band-noise smack (1.2 to 4 kHz) over a quick 200 Hz thump. Short and clean so rapid hits stay readable.", variants=3, vary=0.05, max_voices=4, target=-16.0)
def hit_light(g, v):
    m = M()
    m.add(kit.noise_burst(0.09, g, (1000, 4200), 0.026, 0.0005), 0.0, 0.9)
    m.add(kit.noise_burst(0.07, g, (450, 1300), 0.02, 0.0005), 0.0, 0.5)
    m.add(kit.thump(200 + 15 * v, 95, 0.12, 0.03, 0.0005), 0.0, 0.5)
    m.add(kit.noise_burst(0.005, g, ("high", 4000), 0.001), 0.0, 0.4)
    return dsp.saturate(m.out * 0.8, 1.6)


@sfx("hit_heavy", "impact", "Heavy hit: low boom (90 to 40 Hz) with saturation, a crunchy mid smack and a short room tail. Pairs with 2 to 4 frames of hit-stop.", variants=2, vary=0.04, max_voices=3)
def hit_heavy(g, v):
    m = M()
    m.add(kit.thump(95 + 8 * v, 40, 0.4, 0.13, 0.0005), 0.0, 0.42)
    m.add(kit.thump(300, 140, 0.16, 0.055, 0.0005), 0.0, 0.6)
    m.add(kit.noise_burst(0.2, g, (500, 3000), 0.065, 0.0005), 0.0, 1.0)
    m.add(kit.noise_burst(0.12, g, (250, 900), 0.05, 0.0005, kind="pink"), 0.0, 0.6)
    m.add(kit.knock([420, 900, 1500], [4, 5, 5], g, 0.14, 0.045, [1.0, 0.7, 0.4]), 0.0, 0.8)
    m.add(kit.noise_burst(0.006, g, ("high", 3500), 0.0012), 0.0, 0.6)
    y = dsp.saturate(m.out * 0.9, 2.2)
    return verb(y, 0.35, 0.1, bright=0.4)


@sfx("crit", "impact", "Critical hit: a heavy hit core plus a bright metallic 'shing' (2.6 kHz partials), a sharp crack and a quick rising ting. Clearly bigger than hit_heavy.", target=-13.0, max_voices=2)
def crit(g, v):
    m = M()
    m.add(kit.thump(110, 42, 0.35, 0.11, 0.0005), 0.0, 0.75)
    m.add(kit.thump(360, 160, 0.12, 0.04, 0.0005), 0.0, 0.5)
    m.add(kit.noise_burst(0.14, g, (500, 4000), 0.045, 0.0005), 0.0, 1.0)
    m.add(kit.noise_burst(0.01, g, ("high", 5000), 0.002), 0.0, 0.7)
    m.add(kit.metal(2600, 0.6, g, decay=0.16, bright=1.0), 0.01, 0.55)
    n = ns(0.12)
    m.add(dsp.pulse(dsp.glide(2400, 3300, n), n, SR, 0.25) * dsp.env_exp(n, SR, 0.04, 0.001), 0.02, 0.18)
    y = dsp.saturate(m.out * 0.9, 1.8)
    return verb(y, 0.5, 0.12, bright=0.7)


@sfx("miss", "impact", "Attack misses: an airy whoosh passing by with a small falling 'fwip'. Deliberately light.", target=-20.0)
def miss(g, v):
    m = M()
    m.add(kit.whoosh(0.2, g, 2200, 650, q=1.4, peak=0.4), 0.0, 1.0)
    n = ns(0.1)
    m.add(dsp.sine(dsp.glide(650, 380, n), n, SR) * dsp.env_exp(n, SR, 0.03, 0.003), 0.03, 0.25)
    return m.out


@sfx("defend", "impact", "Defend command / blocked hit: a shield clank (metal partials around 900 Hz) on a solid thunk.", target=-17.0)
def defend(g, v):
    m = M()
    m.add(kit.metal(880, 0.4, g, decay=0.12, bright=0.9), 0.0, 0.8)
    m.add(kit.thump(160, 80, 0.12, 0.03, 0.0005), 0.0, 0.7)
    m.add(kit.noise_burst(0.03, g, (1500, 6000), 0.006), 0.0, 0.4)
    return m.out


@sfx("enemy_die", "big", "Enemy defeated: the classic SNES dissolve. Noise crushed to a falling sample rate (8 kHz to 300 Hz), a short descending pulse arpeggio and a soft low poof.", target=-15.0)
def enemy_die(g, v):
    m = M()
    d = 0.75
    n = ns(d)
    nz = dsp.sample_hold(dsp.white(n, g), dsp.glide(9000, 300, n, "exp"), SR)
    nz = dsp.butter(nz, "low", 6000, SR, 2) * kit.gate(d, 0.005, 0.5)
    m.add(nz, 0.0, 0.7)
    m.add(kit.blips(["C6", "G5", "E5", "C5", "G4"], 0.05, 0.12, "pulse", 0.25, decay=0.035), 0.0, 0.3)
    m.add(kit.thump(120, 55, 0.2, 0.06), 0.0, 0.5)
    return m.out


@sfx("boss_die", "big", "Boss defeated: a chain of growing explosions, then a long collapsing dissolve with phasing and a final deep boom into a big room tail. About 3.2 s.", target=-13.0, tail_db=-46)
def boss_die(g, v):
    m = M()
    times = (0.0, 0.33, 0.58, 0.78, 0.95, 1.12)
    for i, at in enumerate(times):
        e = sfxr.render(dict(sfxr.PRESETS["explosion"], base_freq=0.22 - 0.012 * i, env_sustain=0.25 + 0.02 * i, seed=40 + i))
        m.add(e, at, 0.45 + 0.08 * i)
        m.add(kit.thump(85 - 4 * i, 38, 0.4, 0.12), at, 0.5 + 0.06 * i)
    d = 1.5
    n = ns(d)
    nz = dsp.sample_hold(dsp.white(n, g), dsp.glide(7000, 200, n, "exp"), SR)
    nz = dsp.chorus(dsp.butter(nz, "low", 5000, SR, 2), SR, 3.0, 0.6, 0.5) * kit.gate(d, 0.2, 0.9)
    m.add(nz, 1.2, 0.6)
    m.add(kit.thump(60, 30, 1.0, 0.35, 0.002), 1.25, 1.0)
    m.add(kit.rumble(1.4, g, 150, 0.5, 0.1, 0.9), 1.2, 0.6)
    return verb(m.out, 1.5, 0.2, bright=0.4)


@sfx("encounter", "big", "Battle starts (screen swirl): a rising swirl (vibrato pulse 200 to 1200 Hz plus a resonant noise sweep) that bursts into a crash and low boom. Urgent, 1 s.", target=-14.0)
def encounter(g, v):
    m = M()
    d = 0.45
    n = ns(d)
    f = dsp.glide(200, 1250, n, "exp", 1.4) * (1 + 0.06 * dsp.lfo(16, n, SR))
    duty = 0.3 + 0.2 * dsp.lfo(7, n, SR)
    sw = dsp.pulse(f, n, SR, duty) * kit.gate(d, 0.08, 0.03)
    m.add(lp(sw, 5000), 0.0, 0.45)
    nz = dsp.bq_tv(dsp.white(n, g), "bp", dsp.glide(300, 5500, n, "exp", 1.3), 4.0, SR) * kit.gate(d, 0.1, 0.02)
    m.add(nz / (np.abs(nz).max() + 1e-9), 0.0, 0.5)
    m.add(kit.noise_burst(0.6, g, ("low", 7000), 0.12, 0.001), d, 0.8)
    m.add(kit.thump(90, 38, 0.5, 0.15, 0.0005), d, 1.0)
    m.add(kit.shatter(0.5, g, 22, 2500, 7000, 0.18), d, 0.35)
    return verb(m.out, 0.7, 0.14, bright=0.6)


@sfx("flee", "big", "Party flees: a quick pitter-patter of six running steps fading away, with a light rising whoosh.", target=-17.0)
def flee(g, v):
    m = M()
    for i in range(7):
        b = 700 * (0.95 ** i)
        st = kit.add(kit.knock([b, b * 2.1], [4, 5], g, 0.06, 0.012), (kit.noise_burst(0.03, g, (1500, 5000), 0.008), 0.5))
        m.add(st, i * 0.06, 0.5 * (0.84 ** i))
    m.add(kit.whoosh(0.5, g, 600, 2600, q=1.0, peak=0.6), 0.0, 0.45)
    return m.out


@sfx("telegraph", "big", "Danger telegraph (an enemy readies a big move one turn ahead): an ominous low tritone swell (detuned saws), a reversed-cymbal rush and a heartbeat double-thump.", target=-16.0)
def telegraph(g, v):
    m = M()
    d = 1.0
    n = ns(d)
    sw = dsp.saw(hz("D2"), n, SR) + dsp.saw(hz("D2") * 1.008, n, SR) + 0.8 * dsp.saw(hz("G#2"), n, SR)
    sw = dsp.bq_tv(sw, "lp", dsp.glide(200, 1400, n, "exp"), 2.0, SR) * kit.gate(d, 0.6, 0.25)
    m.add(sw / (np.abs(sw).max() + 1e-9), 0.0, 0.55)
    cym = kit.reverse_swell(kit.noise_burst(0.7, g, ("high", 3000), 0.25, 0.001))
    m.add(cym, 0.25, 0.35)
    m.add(kit.thump(70, 45, 0.18, 0.06), 0.95, 0.9)
    m.add(kit.thump(70, 45, 0.18, 0.06), 1.15, 0.7)
    return m.out


# ============================================================================ BATTLE: magic

@sfx("fire", "magic", "Fire spell: a rising 'fwoosh', dense crackling (filtered impulse noise) and a low rumbling body.", vary=0.04)
def fire(g, v):
    m = M()
    d = 0.95
    n = ns(d)
    m.add(kit.whoosh(0.5, g, 250, 2500, q=0.9, peak=0.4, kind="pink"), 0.0, 0.7)
    cr = dsp.butter(dsp.crackle(n, g, 900, SR, 0.0012), "band", (900, 6000), SR, 2)
    m.add(cr / (np.abs(cr).max() + 1e-9) * kit.gate(d, 0.08, 0.45), 0.0, 0.55)
    m.add(kit.rumble(d, g, 260, 0.6, 0.06, 0.5), 0.0, 0.7)
    m.add(kit.thump(80, 50, 0.4, 0.15, 0.03), 0.02, 0.4)
    return m.out


@sfx("ice", "magic", "Ice spell: a crisp crack as ice forms, then a cluster of high glassy partials with a fast shimmer (tremolo) and a cold hiss.", vary=0.04, tail_db=-46)
def ice(g, v):
    m = M()
    m.add(kit.noise_burst(0.05, g, (700, 3000), 0.012, 0.0005), 0.0, 0.6)
    m.add(kit.thump(300, 150, 0.06, 0.02), 0.0, 0.4)
    base = [1568, 2093, 2349, 2637, 3136, 3520]
    for i in range(6):
        at = 0.03 + i * 0.05 + g.uniform(0, 0.02)
        gl = kit.glass(base[(i * 4 + v) % 6], 0.7, g, decay=0.22 + 0.04 * i)
        gl *= 1.0 + 0.35 * dsp.lfo(17 + i, len(gl), SR)
        m.add(gl, at, 0.45)
    m.add(kit.noise_burst(0.7, g, ("high", 5000), 0.22, 0.05), 0.0, 0.18)
    return verb(m.out, 0.8, 0.2, bright=0.9)


@sfx("thunder", "magic", "Thunder spell: an instant broadband crack with a falling 'zzap', then a rolling low rumble tail. 1.6 s.", target=-13.0, tail_db=-46)
def thunder(g, v):
    m = M()
    m.add(kit.noise_burst(0.04, g, None, 0.008, 0.0002), 0.0, 1.0)
    cr = dsp.crackle(ns(0.08), g, 2500, SR, 0.0005)
    m.add(cr / (np.abs(cr).max() + 1e-9), 0.0, 0.6)
    n = ns(0.1)
    m.add(dsp.saw(dsp.glide(3000, 180, n, "exp", 0.6), n, SR) * dsp.env_exp(n, SR, 0.04, 0.0005), 0.0, 0.35)
    m.add(kit.rumble(1.25, g, 280, 0.8, 0.05, 0.85), 0.03, 0.9)
    roll = dsp.butter(dsp.white(ns(1.2), g), "band", (300, 1800), SR, 2) * np.abs(dsp.smooth_random(ns(1.2), g, 7.0, SR)) ** 1.5
    roll *= kit.gate(1.2, 0.02, 0.8)
    m.add(roll / (np.abs(roll).max() + 1e-9), 0.03, 0.45)
    m.add(kit.thump(55, 32, 0.7, 0.25, 0.003), 0.02, 0.7)
    return verb(m.out, 1.1, 0.16, bright=0.4)


@sfx("heal", "magic", "Healing: a rising G-major arpeggio (G5 B5 D6 G6 B6) of soft chorused sine/triangle tones with a little sparkle and a warm room.", target=-17.0, tail_db=-46)
def heal(g, v):
    m = M()
    for i, nt in enumerate(("G5", "B5", "D6", "G6", "B6")):
        m.add(kit.chorus_tone(hz(nt), 0.7, "sine", 7.0, decay=0.22, attack=0.006, mix_tri=0.35), i * 0.07, 0.55)
    m.add(kit.sparkle(0.7, g, 24, 3000, 8000, (0.02, 0.05)), 0.15, 0.18)
    return verb(m.out, 1.0, 0.26, bright=0.8)


@sfx("revive", "magic", "Revive (Phoenix Feather): a longer majestic rising arpeggio over a swelling fifth, wings of air and a bright bell at the top.", target=-16.0, tail_db=-46)
def revive(g, v):
    m = M()
    d = 1.0
    n = ns(d)
    pad = dsp.sine(hz("D4"), n, SR) + 0.7 * dsp.sine(hz("A4"), n, SR) + 0.4 * dsp.triangle(hz("D5"), n, SR)
    m.add(pad * kit.gate(d, 0.5, 0.4), 0.0, 0.35)
    for i, nt in enumerate(("D5", "F#5", "A5", "D6", "F#6", "A6")):
        m.add(kit.chorus_tone(hz(nt), 0.6, "sine", 6.0, decay=0.2, mix_tri=0.3), 0.1 + i * 0.08, 0.5)
    m.add(kit.fm_bell(hz("D7"), 0.7, 3.5, 2.0, decay=0.28, idx_decay=0.08), 0.6, 0.45)
    m.add(kit.whoosh(0.8, g, 500, 4000, q=0.8, peak=0.65, kind="pink"), 0.0, 0.3)
    return verb(m.out, 1.1, 0.26, bright=0.8)


@sfx("item_use", "magic", "Using a potion or tonic: two quick glugs (bubbly bloops) and a soft rising chime.", target=-18.0)
def item_use(g, v):
    m = M()
    for at, f in ((0.0, 260), (0.13, 300)):
        k = ns(0.09)
        m.add(dsp.sine(dsp.glide(f, f * 2.2, k, "exp", 0.5), k, SR) * dsp.env_exp(k, SR, 0.03, 0.004), at, 0.7)
        m.add(kit.noise_burst(0.07, g, (400, 1600), 0.02, 0.005, kind="pink"), at, 0.25)
    m.add(kit.blips(["E6", "A6"], 0.07, 0.25, "sine", decay=0.07, attack=0.003), 0.28, 0.45)
    return verb(m.out, 0.5, 0.14)


@sfx("buff", "status", "Positive status (Protect, Haste, Focus): a rising shimmer of a fifth-and-octave chord into a bright ding.", tail_db=-46)
def buff(g, v):
    m = M()
    d = 0.4
    n = ns(d)
    for r, a in ((1.0, 0.5), (1.5, 0.4), (2.0, 0.3)):
        m.add(dsp.sine(dsp.glide(480 * r, 960 * r, n, "exp"), n, SR) * kit.gate(d, 0.05, 0.08), 0.0, a)
    m.add(kit.fm_bell(hz("E7"), 0.6, 3.5, 1.8, decay=0.22, idx_decay=0.05), d - 0.03, 0.5)
    m.add(kit.sparkle(0.45, g, 26, 3000, 8000, (0.02, 0.05)), 0.2, 0.2)
    return verb(m.out, 0.7, 0.2, bright=0.8)


@sfx("debuff", "status", "Negative status (Blind, Silence, stat down): a descending detuned wobble with deepening vibrato into a dull low note.")
def debuff(g, v):
    d = 0.7
    n = ns(d)
    vib = 1 + dsp.lfo(7.0, n, SR, 0.035, delay=0.0, fade=0.4)
    f = dsp.glide(700, 230, n, "exp", 0.8) * vib
    y = dsp.saw(f, n, SR) + dsp.saw(f * 1.06, n, SR)
    y = dsp.bq_tv(y, "lp", dsp.glide(2400, 500, n, "exp"), 1.5, SR) * kit.gate(d, 0.01, 0.3)
    return y


@sfx("poison", "status", "Poison: sickly low bubbles and a sinking detuned tritone.")
def poison(g, v):
    m = M()
    m.add(kit.bubbles(0.6, g, 9, 180, 520, (0.03, 0.07), rise=1.7), 0.0, 0.8)
    d = 0.6
    n = ns(d)
    for f0 in (420.0, 594.0):
        m.add(dsp.pulse(dsp.glide(f0, f0 * 0.75, n, "exp"), n, SR, 0.125) * kit.gate(d, 0.02, 0.3), 0.0, 0.18)
    return lp(m.out, 3500)


@sfx("stun", "status", "Stun: little stars circling the head, a wobbling three-note high 'tweedle' (fast vibrato sines).")
def stun(g, v):
    m = M()
    for i, nt in enumerate(("E6", "C6", "G5", "E6", "C6")):
        n = ns(0.12)
        f = hz(nt) * (1 + 0.03 * dsp.lfo(14, n, SR))
        m.add(dsp.sine(f, n, SR) * kit.gate(0.12, 0.005, 0.06), i * 0.11, 0.6 - 0.05 * i)
    return verb(m.out, 0.5, 0.15, bright=0.8)


@sfx("break", "big", "Shield BREAK (weakness hits removed every shield): glass-shatter noise with dozens of shards, a falling metallic 'pshing' and a deep thump. Must feel like a reward.", target=-13.0)
def break_(g, v):
    m = M()
    m.add(kit.thump(75, 38, 0.45, 0.14, 0.0005), 0.0, 0.75)
    m.add(kit.thump(300, 140, 0.1, 0.035, 0.0005), 0.0, 0.45)
    m.add(kit.noise_burst(0.08, g, (800, 6000), 0.02, 0.0003), 0.0, 0.9)
    m.add(kit.shatter(0.75, g, 48, 2500, 8500, 0.32), 0.0, 0.9)
    d = 0.4
    n = ns(d)
    for r in (1.0, 1.41, 2.13):
        m.add(dsp.sine(dsp.glide(2400 * r, 900 * r, n, "exp", 0.7), n, SR) * dsp.env_exp(n, SR, 0.12, 0.001), 0.02, 0.18)
    return verb(m.out, 0.7, 0.14, bright=0.8)


@sfx("fury_ready", "magic", "Fury gauge full: a charging PWM sweep rising 200 Hz to 1.6 kHz with quickening tremolo, then a bright C7 ding.", tail_db=-46)
def fury_ready(g, v):
    m = M()
    d = 0.45
    n = ns(d)
    f = dsp.glide(200, 1600, n, "exp", 1.3)
    trem = 1 + 0.4 * dsp.sine(dsp.glide(8, 30, n), n, SR)
    y = dsp.pulse(f, n, SR, 0.3 + 0.18 * dsp.lfo(5, n, SR)) * trem * kit.gate(d, 0.06, 0.02)
    m.add(lp(y, 5000), 0.0, 0.5)
    m.add(kit.fm_bell(hz("C7"), 0.8, 3.5, 2.2, decay=0.25, idx_decay=0.06), d, 0.6)
    m.add(kit.tone(hz("C7"), 0.3, "pulse", 0.25, decay=0.07), d, 0.2)
    return verb(m.out, 0.7, 0.16, bright=0.8)


@sfx("fury_art", "big", "Fury art unleashed: sub boom and rising rush into a bright brass-like C major chord stab with a crash and a long room.", target=-13.0, tail_db=-46)
def fury_art(g, v):
    m = M()
    m.add(kit.whoosh(0.32, g, 200, 4000, q=0.9, peak=0.95, kind="pink"), 0.0, 0.6)
    m.add(kit.thump(65, 32, 0.6, 0.22, 0.003), 0.3, 1.0)
    d = 0.8
    n = ns(d)
    chord = sum(dsp.supersaw(hz(nt), n, SR, 3, 10.0, g) for nt in ("C4", "G4", "C5", "E5", "G5"))
    chord = dsp.bq_tv(chord, "lp", 600 + 4500 * np.exp(-dsp.tvec(n) / 0.12), 1.0, SR) * dsp.env_exp(n, SR, 0.35, 0.004)
    m.add(chord / (np.abs(chord).max() + 1e-9), 0.3, 0.6)
    m.add(kit.noise_burst(0.8, g, ("high", 3000), 0.22, 0.002), 0.3, 0.35)
    return verb(m.out, 1.2, 0.22, bright=0.6)


@sfx("combo_start", "magic", "Combo tech begins (two or three heroes act together): two bright 'ching' pings (E6, B6) that then ring together over a rising swirl.", tail_db=-46)
def combo_start(g, v):
    m = M()
    m.add(kit.metal(hz("E6"), 0.6, g, decay=0.18, bright=0.6), 0.0, 0.5)
    m.add(kit.metal(hz("B6"), 0.6, g, decay=0.18, bright=0.6), 0.12, 0.5)
    m.add(kit.metal(hz("E6"), 0.7, g, decay=0.25, bright=0.6), 0.27, 0.4)
    m.add(kit.metal(hz("B6"), 0.7, g, decay=0.25, bright=0.6), 0.27, 0.4)
    d = 0.6
    n = ns(d)
    f = dsp.glide(300, 1200, n, "exp") * (1 + 0.05 * dsp.lfo(9, n, SR))
    m.add(dsp.sine(f, n, SR) * kit.gate(d, 0.1, 0.2), 0.0, 0.3)
    return verb(m.out, 0.7, 0.18, bright=0.8)


@sfx("level_up_sparkle", "magic", "Sparkles over a hero who levels up (under the level_up jingle): glitter of random 2 to 8 kHz pings thinning out, after a small upward swish.", tail_db=-46)
def level_up_sparkle(g, v):
    m = M()
    m.add(kit.whoosh(0.3, g, 1500, 6000, q=1.0, peak=0.6), 0.0, 0.3)
    m.add(kit.sparkle(0.85, g, 42, 2000, 8500, (0.03, 0.08), fall=1.6), 0.05, 0.9)
    return verb(m.out, 0.7, 0.22, bright=0.9)


# ============================================================================ LOOT (Diablo-style rarity sounds)

@sfx("drop_common", "loot", "Common item drop: a single soft plucked 'plink' (E6) and a tiny landing tap.", target=-18.0)
def drop_common(g, v):
    m = M()
    m.add(kit.karplus(hz("E6"), 0.45, g, t60=0.3, bright=0.3), 0.0, 0.7)
    m.add(kit.tone(hz("E6"), 0.3, "sine", decay=0.09, attack=0.002), 0.0, 0.35)
    m.add(kit.thump(240, 140, 0.05, 0.015), 0.0, 0.25)
    return m.out


@sfx("drop_magic", "loot", "Magic (blue) item drop: two bright chorused plinks E6 then B6 with a cool shimmer.", tail_db=-46)
def drop_magic(g, v):
    m = M()
    m.add(kit.karplus(hz("E6"), 0.5, g, t60=0.3, bright=0.6), 0.0, 0.6)
    m.add(kit.karplus(hz("B6"), 0.6, g, t60=0.35, bright=0.6), 0.08, 0.6)
    m.add(kit.chorus_tone(hz("B6"), 0.5, "sine", 9.0, decay=0.16), 0.08, 0.3)
    return verb(m.out, 0.7, 0.18, bright=0.8)


@sfx("drop_rare", "loot", "Rare (gold) item drop: a three-note E major arpeggio of bells (E6 G#6 B6) with sparkle.", target=-15.0, tail_db=-46)
def drop_rare(g, v):
    m = M()
    for i, nt in enumerate(("E6", "G#6", "B6")):
        m.add(kit.fm_bell(hz(nt), 0.8, 3.5, 2.0, decay=0.3, idx_decay=0.07), i * 0.075, 0.55)
        m.add(kit.karplus(hz(nt), 0.4, g, t60=0.3, bright=0.7), i * 0.075, 0.3)
    m.add(kit.sparkle(0.6, g, 30, 3000, 8500, (0.02, 0.06)), 0.2, 0.25)
    return verb(m.out, 0.9, 0.22, bright=0.85)


@sfx("drop_legendary", "loot", "Legendary (orange) drop: a deep boom under a bright bell chord (E5 B5 E6 G#6 B6 F#7) struck together, a rising shimmer and a long glittering tail. Unmistakable.", target=-13.0, tail_db=-46)
def drop_legendary(g, v):
    m = M()
    m.add(kit.thump(60, 34, 0.7, 0.25, 0.002), 0.0, 0.9)
    for i, nt in enumerate(("E5", "B5", "E6", "G#6", "B6", "F#7")):
        m.add(kit.fm_bell(hz(nt), 1.6, 3.5, 2.6, decay=0.6 - 0.05 * i, idx_decay=0.12), 0.01 * i, 0.5)
    m.add(kit.church_bell(hz("E5"), 1.6, g, decay=0.8), 0.0, 0.35)
    m.add(kit.whoosh(0.9, g, 1500, 7000, q=0.9, peak=0.5), 0.05, 0.2)
    m.add(kit.sparkle(1.25, g, 45, 3000, 9000, (0.03, 0.08), fall=1.3), 0.1, 0.35)
    return verb(m.out, 1.4, 0.28, bright=0.85, predelay=0.015)


# ============================================================================ EPISODE 2 (E2-audio)
# Silverglass: mirrors, beams, glass bridges, the ferry, Lena's clocktower, the Other Selves and Kept.

@sfx("mirror_turn", "field", "A mirror rotates a quarter turn on its stone base: a soft stone grind with a detent click, then a high glassy ring as the pane settles (C7 over E7).", target=-18.0, tail_db=-42)
def mirror_turn(g, v):
    m = M()
    d = 0.26
    gr = kit.grind(d, g, band=(280, 1300), rough=0.7) * kit.gate(d, 0.04, 0.08)
    m.add(lp(gr, 2600), 0.0, 0.75)
    m.add(kit.rumble(d, g, fc=140, rough=0.4, attack=0.03, release=0.1), 0.0, 0.25)
    m.add(kit.knock([620, 1480, 2900], [9, 10, 11], g, 0.08, 0.012), d - 0.01, 0.45)
    m.add(kit.glass(hz("C7"), 0.34, g, decay=0.16), d + 0.005, 0.42)
    m.add(kit.glass(hz("E7"), 0.28, g, decay=0.12), d + 0.03, 0.22)
    return verb(m.out, 0.6, 0.16, bright=0.85)


@sfx("beam_hit", "field", "A light receptor lights for the first time: a bright crystal chime (G6 glass plate plus a B6 bell) with a rising shimmer of glints sweeping up to the top.", target=-17.0, tail_db=-44)
def beam_hit(g, v):
    m = M()
    m.add(kit.glass(hz("G6"), 0.5, g, decay=0.24), 0.0, 0.7)
    m.add(kit.fm_bell(hz("B6"), 0.45, 3.0, 1.4, decay=0.16, idx_decay=0.05), 0.012, 0.42)
    m.add(kit.noise_burst(0.012, g, ("high", 5000), 0.002), 0.0, 0.3)
    d = 0.36
    n = ns(d)
    for r, a in ((1.0, 0.3), (1.5, 0.18)):
        f = dsp.glide(1900 * r, 4600 * r, n, "exp", 0.8)
        m.add(dsp.sine(f, n, SR) * kit.gate(d, 0.05, 0.3) * (1 + 0.4 * dsp.lfo(17.0, n, SR)), 0.06, a)
    m.add(kit.sparkle(0.38, g, 30, 3500, 8500, (0.015, 0.04), fall=0.7), 0.06, 0.22)
    return verb(m.out, 0.55, 0.2, bright=0.9)


@sfx("glass_bridge", "field", "Glass bridge cells light up: a sustained glassy swell about 0.6 s long (E6, B6, E7 with a shimmering tremolo and a breath of air), rising in and settling out.", target=-18.0, tail_db=-42)
def glass_bridge(g, v):
    m = M()
    d = 0.5
    n = ns(d)
    env = kit.gate(d, 0.2, 0.22)
    shimmer = 1.0 + 0.25 * dsp.lfo(9.0, n, SR)
    for nt, a, det in (("E6", 0.5, 1.0), ("B6", 0.36, 1.002), ("E7", 0.2, 0.998), ("G#7", 0.08, 1.0)):
        f = hz(nt) * det
        y = dsp.sine(f, n, SR) + 0.3 * dsp.sine(f * 2.32, n, SR) * np.exp(-dsp.tvec(n, SR) / 0.25)
        m.add(y * env * shimmer, 0.0, a)
    m.add(kit.whoosh(d, g, 1500, 6000, q=1.2, peak=0.5), 0.0, 0.08)
    m.add(kit.glass(hz("B6"), 0.2, g, decay=0.09), d - 0.12, 0.18)
    return verb(m.out, 0.55, 0.22, bright=0.85)


@sfx("glass_break", "field", "A pane shatters (Dash through a glass pane; the great mirror cracking): a sharp crack, a dense spray of glass shards and a tinkling tail of falling slivers.", target=-16.0, tail_db=-48)
def glass_break(g, v):
    m = M()
    m.add(kit.noise_burst(0.03, g, ("high", 2500), 0.006, 0.0003), 0.0, 0.9)
    m.add(kit.thump(260, 120, 0.08, 0.02, 0.0005), 0.0, 0.35)
    m.add(kit.shatter(0.45, g, count=60, fmin=2400, fmax=8000, spread=0.18), 0.003, 0.85)
    tail = dsp.Mix(SR, 0.6)
    for i in range(18):
        at = 0.1 + (g.random() ** 1.6) * 0.38
        f = math.exp(g.uniform(math.log(2800), math.log(7500)))
        tail.add(kit.glass(f, 0.12, g, decay=0.03), at, g.uniform(0.25, 0.7) * (1 - at))
    m.add(tail.out, 0.0, 0.45)
    return verb(m.out, 0.45, 0.14, bright=0.9)


@sfx("mirror_step", "field", "Stepping through a mirror door: a quick whoosh through a shimmering comb of glassy resonances, a soft swish in and out.", target=-19.0, tail_db=-44)
def mirror_step(g, v):
    d = 0.36
    n = ns(d)
    w = kit.whoosh(d, g, 500, 3800, q=1.1, peak=0.45, kind="pink")
    # the shimmering filter: glassy resonances, amplitude-trembling
    res = dsp.resonator(w * 0.3, [1318.5, 1975.5, 2637.0, 3951.0], [30, 34, 38, 40], [1.0, 0.7, 0.5, 0.3], SR)
    res = res / (np.max(np.abs(res)) + 1e-12) * (1 + 0.35 * dsp.lfo(14.0, n, SR))
    y = 0.75 * w + 0.45 * res
    y = y + 0.12 * kit.sparkle(d, g, 25, 3000, 8000, (0.01, 0.03))[:n]
    return verb(lp(y, 9000), 0.4, 0.16, bright=0.8)


@sfx("ferry_oars", "field", "Tovin's ferry: two slow oar strokes (a wooden oarlock knock, the blade pulling through water with a swirl and small bubbles), the second a little softer.", target=-19.0, tail_db=-44)
def ferry_oars(g, v):
    m = M()
    for k, at in enumerate((0.0, 0.46)):
        a = 1.0 if k == 0 else 0.82
        m.add(kit.knock([210, 520, 980], [8, 9, 8], g, 0.1, 0.03), at, 0.35 * a)
        m.add(kit.creak(0.09, g, 40, 55, modes=(300, 760, 1400), qs=(9, 10, 9)), at + 0.02, 0.12 * a)
        d = 0.36
        n = ns(d)
        sw = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(380, 1100, n, "exp"), 1.4, SR, block=32)
        sw = sw / (np.max(np.abs(sw)) + 1e-12) * kit.gate(d, 0.12, 0.25) * (1 + 0.3 * dsp.smooth_random(n, g, 18.0, SR))
        m.add(sw, at + 0.06, 0.55 * a)
        m.add(kit.bubbles(0.3, g, 9, 350, 1200), at + 0.16, 0.28 * a)
        m.add(kit.noise_burst(0.15, g, (1500, 5000), 0.04, 0.01), at + 0.34, 0.1 * a)   # drips off the blade
    return verb(lp(m.out, 7000), 0.35, 0.1, bright=0.6)


@sfx("clock_chime", "story", "Lena's clocktower: a small tower chime striking two notes, E5 then C5 (a falling major third), warm and slightly distant.", target=-17.0, tail_db=-40)
def clock_chime(g, v):
    m = M()
    m.add(kit.church_bell(hz("E5"), 0.62, g, decay=0.3, eerie=0.0), 0.0, 0.7)
    m.add(kit.church_bell(hz("C5"), 0.66, g, decay=0.32, eerie=0.0), 0.34, 0.75)
    return verb(m.out, 0.6, 0.22, bright=0.55, predelay=0.02)


@sfx("reflection_out", "story", "The Other Selves step out of their mirrors: a reversed glass shimmer swelling up into a low thud, with a cold glint on the impact.", target=-16.0, tail_db=-44)
def reflection_out(g, v):
    m = M()
    sh = dsp.Mix(SR, 0.6)
    for nt, a in (("D6", 0.6), ("A6", 0.45), ("Eb7", 0.3), ("F6", 0.35)):
        sh.add(kit.glass(hz(nt), 0.55, g, decay=0.2), 0.0, a)
    sh.add(kit.sparkle(0.5, g, 30, 3000, 8000, (0.02, 0.06)), 0.0, 0.3)
    rev = verb(sh.out[:, 0] if sh.out.ndim == 2 else sh.out, 0.6, 0.35, bright=0.8)[: ns(0.45)]
    swell = kit.reverse_swell(rev)
    m.add(swell / (np.max(np.abs(swell)) + 1e-12), 0.0, 0.7)
    hit = len(swell) / SR
    m.add(kit.thump(110, 42, 0.26, 0.08, 0.001), hit - 0.01, 0.9)
    m.add(kit.noise_burst(0.05, g, ("low", 600), 0.015), hit - 0.01, 0.3)
    m.add(kit.glass(hz("D7"), 0.25, g, decay=0.07), hit, 0.2)
    return verb(m.out, 0.4, 0.12, bright=0.6)


@sfx("kept", "status", "A party member is Kept (glassed over): a thin frost crackle spreading and thickening, a rising glassy whine, then a crisp seal as the glass closes.", target=-16.5, tail_db=-44)
def kept(g, v):
    m = M()
    d = 0.45
    n = ns(d)
    dens = dsp.glide(60, 900, n, "exp", 1.2)
    cr = np.zeros(n)
    pos = 0
    while pos < n:
        cr[pos] = g.uniform(0.3, 1.0) * (1 if g.random() < 0.5 else -1)
        pos += max(1, int(SR / dens[min(pos, n - 1)] * g.uniform(0.4, 1.6)))
    cr = dsp.bq(dsp.bq(cr, "hp", 2500, 0.7, SR), "bp", 5200, 0.8, SR)
    cr = cr / (np.max(np.abs(cr)) + 1e-12) * kit.gate(d, 0.05, 0.02)
    m.add(cr, 0.0, 0.5)
    f = dsp.glide(1200, 2600, n, "exp", 0.9)
    m.add((dsp.sine(f, n, SR) + 0.3 * dsp.sine(f * 2.32, n, SR)) * kit.gate(d, 0.3, 0.03), 0.0, 0.2)
    m.add(kit.glass(hz("A6"), 0.26, g, decay=0.08), d, 0.55)
    m.add(kit.knock([1700, 3300, 5100], [14, 16, 18], g, 0.06, 0.008), d, 0.4)
    m.add(kit.thump(200, 140, 0.08, 0.025, 0.0005), d, 0.25)
    return verb(m.out, 0.35, 0.14, bright=0.85)


@sfx("kept_break", "status", "Kept ends: the glass bursts in a bright shatter, then a breath of relief (a soft airy exhale) under a small rising two-note chime.", target=-16.0, tail_db=-44)
def kept_break(g, v):
    m = M()
    m.add(kit.noise_burst(0.02, g, ("high", 3000), 0.004, 0.0003), 0.0, 0.7)
    m.add(kit.shatter(0.4, g, count=44, fmin=3000, fmax=8500, spread=0.14), 0.002, 0.75)
    d = 0.42
    n = ns(d)
    br = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(1400, 700, n, "exp"), 0.9, SR, block=32)
    br = br / (np.max(np.abs(br)) + 1e-12) * kit.gate(d, 0.12, 0.3)
    br = dsp.bq(br, "peak", 1100, 1.5, SR, 4.0)
    m.add(br, 0.16, 0.42)
    m.add(kit.fm_bell(hz("E6"), 0.4, 3.0, 1.2, decay=0.13, idx_decay=0.04), 0.2, 0.3)
    m.add(kit.fm_bell(hz("A6"), 0.36, 3.0, 1.2, decay=0.13, idx_decay=0.04), 0.28, 0.3)
    return verb(m.out, 0.4, 0.15, bright=0.8)


# ============================================================================ PACKS
# Per-episode sfx packs (precache budget). Everything not listed is 'core': Episode 1, UI, battle and field basics.
# Membership is by grep of the ids referenced by Episode 2 only data and scenes (the Silverglass world, Tovin's
# ferry, Lena's clocktower, the Other Selves). glass_break, kept and kept_break are referenced by shared battle and
# skill code, so they stay core. A pack that has not arrived is never an error: the runtime skips quietly.
EP2_PACK = ("mirror_turn", "beam_hit", "glass_bridge", "mirror_step", "ferry_oars", "clock_chime", "reflection_out")
for _id in EP2_PACK:
    REG[_id]["pack"] = "ep2"

import sfx_defs_e3  # noqa: E402,F401  (Episode 3 sfx, pack "ep3"; registers into REG)
import sfx_defs_x1  # noqa: E402,F401  (Expansion 1 sfx, pack "x1"; registers into REG)
