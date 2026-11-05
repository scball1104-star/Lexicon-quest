"""One whole boss fight by real input: the Inkbound Barrister, from walking onto the trigger to the field after the win."""
import time

from battle import MENU_GONE, cursor_to, defend, expect_menu, over, select_target, wait_turn
from ep4field import leader, place, settle_all, step
from menus import free

FLAGS = ['keep_entered', 'keep_f1_arrived', 'keep_f1_done', 'keep_f2_arrived', 'tide_key_f2']
UNITS = "LQ_ENGINE.scene.b.units().filter(u => u.alive).map(u => ({ uid: u.uid, id: u.id, side: u.side, hp: u.hp, maxHp: u.maxHp, mp: u.mp, heat: u.heat || 0, charging: u.charging ? u.charging.skill : null }))"


def use(p, cmd, entry, target):
    """Root > Tech / Magic / Item > row > target, every step a press. False when the row is not there or is greyed (the menu is left on the root)."""
    cursor_to(p, cmd)
    p.act('confirm')
    if not expect_menu(p, 'sub', f'{cmd} opens in the boss fight'):
        return False
    rows = p.js("LQ_ENGINE.scene.menu.sub.items.map(i => ({ id: i.id, dis: !!i.disabled }))")
    i = next((k for k, r in enumerate(rows) if r['id'] == entry and not r['dis']), None)
    if i is None:
        p.act('cancel')
        p.frames(3)
        return False
    for _ in range(i):
        p.act('down')
    p.act('confirm')
    if not expect_menu(p, 'target', f'{entry} opens targeting'):
        return False
    if target:
        p.check(select_target(p, target), f'{entry} reaches its target', target)
    p.act('confirm')
    p.until(MENU_GONE, f'{entry} closes the menu', 8)
    return True


def turn(p, log):
    """One party turn: heal first, void a decree, else hit."""
    d = p.battle()
    who = d['current']
    units = p.js(UNITS)
    party = [u for u in units if u['side'] == 'party']
    foes = [u for u in units if u['side'] == 'enemy']
    boss = next((f for f in foes if f['id'] == 'barrister'), foes[0])
    witness = next((f for f in foes if f['id'] != 'barrister'), None)
    low = sorted(party, key=lambda u: u['hp'] / u['maxHp'])[0]
    decree = next((f for f in foes if f['charging'] or f['heat'] >= 2), None)
    done = False
    if low['hp'] / low['maxHp'] < 0.5:
        if who == 'mira':
            done = use(p, 'magic', 'mend', low['uid'])
        if not done:
            done = use(p, 'item', 'hi_potion', low['uid'])
    if not done and decree and who == 'mira':
        done = use(p, 'magic', 'ember', decree['uid'])
    if not done and decree and who == 'hero':
        done = use(p, 'tech', 'answer', decree['uid'])
    if not done and who == 'mira':
        done = use(p, 'magic', 'ember', (witness or boss)['uid'])
    if not done:
        cursor_to(p, 'attack')
        p.act('confirm')
        expect_menu(p, 'target', 'Attack targets')
        select_target(p, (witness or boss)['uid'])
        p.act('confirm')
        p.until(MENU_GONE, 'Attack closes the menu', 8)
    log.append(who)


def barrister(p):
    place(p, 'ep4_keep_f2', 20, 22, 'up', FLAGS)
    p.js("for (const m of LQ_ENGINE.game.party) { m.level = Math.max(m.level, 20); } LQ_DEBUG.settings({ autoBattle: false })")
    p.js("LQ_DEBUG.give('hi_potion', 6)")
    p.frames(60)
    settle_all(p)
    p.check(free(p), 'the arena is free', p.lite()['scenes'])
    p.shot('boss-arena')
    for _ in range(4):
        if not free(p):
            break
        step(p, 'up')
    t0 = time.time()
    while time.time() - t0 < 60 and p.scene() != 'battle':
        if p.scene() == 'dialog':
            p.act('confirm')
        p.frames(4)
    p.check(p.scene() == 'battle', 'the trigger, the scene and the card lead to the fight', (p.lite()['scenes'], leader(p)))
    if p.scene() != 'battle':
        return
    p.shot('boss-card')
    wait_turn(p, timeout=30)
    p.shot('boss-first-turn')
    log = []
    witness = False
    for _ in range(90):
        d = wait_turn(p, timeout=30)
        if over(p):
            break
        witness = witness or p.js("LQ_ENGINE.scene.b.units().some(u => u.alive && u.id === 'barrister_witness')")
        turn(p, log)
    d = p.battle()
    p.check(witness, 'the witness took the stand', log[:5])
    p.check(d.get('result') == 'win' or d.get('phase') in ('victory', 'rewards'), 'the Barrister falls to real input', (d.get('phase'), d.get('result'), len(log)))
    p.shot('boss-won')
    print(f'    the fight took {len(log)} party turns, round {d.get("round")}', flush=True)
    settle_all(p, 90)
    p.check(p.js("!!LQ_ENGINE.game.flags.barrister_defeated"), 'the win is on the record')
    p.check(free(p), 'the field comes back after the boss', p.lite()['scenes'])
    p.shot('boss-after')


SEQUENCES = [('barrister', barrister)]
TOUCH_ONLY = []
