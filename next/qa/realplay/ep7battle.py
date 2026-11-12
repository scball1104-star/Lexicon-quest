"""Episode 7 by real input: the hero's Call cast from the battle menu at a Farewell's target and at a Stilled ally (EPISODE7_PLAN 0.1
and 12, the menu path), and the two bosses played whole with real keys (how they feel to a person, not to the simulator).

The bots act through battleAct and Auto, which skip the menu (Episode 5's blocker: a Tech the menu refused passed every run), and
Call is the first signature skill aimed at one ally and at one whose turns are skipped. Here the fight is set up (the quick start,
call_learned, Lv 30, the White Phantom), then everything is a real key, a finger on the on-screen A button and d-pad, or a tap on
the canvas: Defend until a Farewell is pinned on the hero's turn, Tech, Call, the ally, confirm; or Defend through it until it lands
and Call the Stilled ally. The rules' own events are read back from a read-only tap on perform / runEnemyTurn set up before the
fight: `farewell_broken` with reason 'call', `stilled_end` with reason 'call'.

    python next/qa/realplay/ep7battle.py                       desktop keys, then phone touch (under 10 minutes)
    python next/qa/realplay/ep7battle.py --device phone
    python next/qa/realplay/ep7battle.py --fights 3            also play the Lantern and the Phantom whole with real keys (desktop):
                                                               the careful policy decides, every choice goes in by keys

run.py can also take this module (SEQUENCES / TOUCH_ONLY), as it does ep6battle.py (E7-integrate wires it).
"""
import argparse
import json
import os
import pathlib
import sys
import threading
import time
import traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from battle import MENU_GONE, OPS_DONE, cursor_to, expect_menu, wait_turn  # noqa: E402
from driver import Play, Stuck  # noqa: E402

SETUP = """async ([enc, seed, level, zone]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp7'))) {
    if (Date.now() - t0 > 120000) throw new Error('newGameEp7 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp7('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game; g.flags.call_learned = true;
  for (const m of g.party) m.level = Math.max(m.level, level);
  if (zone) {
    // the whole fights: the simulator's own party for that boss (tools/sim/ep7.mjs LOADOUTS: gear, mastery, bag, flags), so a loss
    // is the input and the play, not a weaker kit than the balance numbers assume
    await import('./tools/sim/ep7.mjs');
    const { LOADOUTS } = await import('./tools/sim/loadouts.mjs'), { memberMax } = await import('./src/game/state.js');
    const L = LOADOUTS[zone];
    for (const m of g.party) {
      const r = L[m.id];
      m.weapon = r.weapon; m.equip = { ...Object.fromEntries(Object.keys(m.equip).map((k) => [k, null])), ...r.equip };
      m.mastery = { ...m.mastery, ...r.mastery }; m.level = level;
      const s = memberMax(m); m.hp = s.hp; m.mp = s.mp;
    }
    g.items = { ...L.inventory };
    if (Array.isArray(L.flags)) for (const f of L.flags) g.flags[f] = true; else Object.assign(g.flags, L.flags || {});
  }
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 2, textSpeed: 4, battleCursor: 'last' });
  LQ_DEBUG.battle(enc, { seed, canFlee: false, gameover: false });
  // read-only: every event the battle emits from here on (the rules' own stream, never an input)
  window.__ev7 = [];
  const b = LQ_ENGINE.scene.b;
  for (const k of ['perform', 'runEnemyTurn']) { const f = b[k]; b[k] = (...a) => { const evs = f(...a); for (const e of evs) window.__ev7.push({ type: e.type, reason: e.reason || null, target: e.target || null, on: e.on }); return evs; }; }
  return true;
}"""
RIME = ("(() => { const s = LQ_ENGINE.scene, S = s.b && s.b.state.rime, h = s.b && s.b.unit('hero');"
        " return { pin: S && S.pin ? S.pin.target : null, stilled: S ? Object.keys(S.stilled) : [], mp: h && h.mp, rime: S ? { ...S.r } : {} }; })()")
SUB = ("(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? { ids: m.sub.items.map(i => i.id), index: m.sub.index, color: m.sub.items.map(i => i.color),"
       " rects: m.sub.items.map((_, i) => m.sub.rowRect(i)), vis: m.sub.items.map((_, i) => m.sub.isVisible(i)), icon: typeof m.sub.items[0].draw === 'function' } : null; })()")
TARGET = "(() => { const m = LQ_ENGINE.scene.menu; return m.state === 'target' ? { at: m.currentTarget(), ids: m.tInfo.ids.slice() } : null; })()"
BOX = "((uid) => { const a = LQ_ENGINE.scene.actor(uid); return a ? { x: Math.round(a.x - Math.max(24, a.w) / 2), y: Math.round(a.y - Math.max(32, a.h)), w: Math.max(24, a.w), h: Math.max(32, a.h) } : null; })"
EVENTS = "((t) => (window.__ev7 || []).filter(e => e.type === t).map(e => e.reason))"


def start(p, enc='white_phantom', seed=3, level=30, zone=None):
    p.boot('&pack=ep6,ep7&ep=7')
    p.page.evaluate(SETUP, [enc, seed, level, zone])
    p.until("LQ_DEBUG.scene() === 'battle'", 'the fight starts', 30)


def take_turn(p, d, keys):
    """One turn with real input: `keys` (a list of actions) from the root; the battle must move on."""
    turns = d['partyTurns']
    for k in keys:
        p.act(k)
    p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.b.state.partyTurns > {turns}; }})()", f'{d.get("current")} takes the turn', 12)


def defend_one(p, d):
    take_turn(p, d, ['cancel', 'confirm'])   # cancel on the root jumps to Defend, confirm takes it


def to_hero(p, cond, tries=60):
    """Defend by real input until `cond(rime)` holds on the hero's turn. Returns the battle state or None."""
    for _ in range(tries):
        d = wait_turn(p, timeout=40)
        if d.get('phase') != 'play':
            return None
        if d.get('current') == 'hero' and cond(p.js(RIME)):
            return d
        defend_one(p, d)
    return None


def open_call(p, how, d):
    """Tech (keys or a tap), then Call: it must be first, in gold, with its icon, under the cursor. Returns the sub-list state."""
    if how == 'keys':
        p.check(d['menuItems'][d['menuIndex']] == 'tech', f'{how}: the root cursor opens on Tech', d['menuItems'][d['menuIndex']])
        cursor_to(p, 'tech')
        p.act('confirm')
    else:
        p.tap_rect(d['rootRects'][d['menuItems'].index('tech')])
        p.frames(4)
    if not expect_menu(p, 'sub', f'{how}: Tech opens'):
        return None
    p.frames(6)
    sub = p.js(SUB)
    p.check(sub['ids'][0] == 'call_name' and sub['color'][0] == 'gold' and sub['icon'], f'{how}: Call first, in gold, with its icon', sub['ids'][:3])
    return sub


def pick_call(p, how, sub):
    if how == 'keys':
        p.check(sub['index'] == 0, 'keys: Call under the cursor', sub['index'])
        p.act('confirm')
    else:
        if sub['index'] != 0:
            p.tap_rect(sub['rects'][0])
            p.frames(3)
        p.tap_rect(sub['rects'][0])
        p.frames(4)
    return expect_menu(p, 'target', f'{how}: Call asks for its ally')


def confirm_target(p, how, uid):
    t = p.js(TARGET)
    p.check(t and t['at'] == uid, f'{how}: the cursor opens on {uid}', t)
    p.shot(f'{how}-call-target-{uid}')
    if how == 'keys':
        p.act('confirm')
    else:
        box = p.js(BOX + f"('{uid}')")
        p.tap_rect(box)   # the ally is already selected: one tap casts
    p.until(MENU_GONE, f'{how}: Call closes the menu (a refused Tech would buzz and stay)', 6)
    p.until(OPS_DONE, f'{how}: the cast plays', 25)


def cast_on_pin(p, how, seed):
    start(p, seed=seed)
    d = to_hero(p, lambda s: s['pin'])
    if not p.check(d is not None, f'{how}: a Farewell is pinned on the hero\'s turn'):
        return
    pin = p.js(RIME)['pin']
    p.shot(f'{how}-pinned')
    sub = open_call(p, how, d)
    if not sub or not pick_call(p, how, sub):
        return
    mp0 = p.js(RIME)['mp']
    confirm_target(p, how, pin)
    acts = p.battle().get('actions', [])
    p.check(any(a.startswith('hero:skill:call_name>' + pin) for a in acts), f'{how}: the hero cast Call on {pin}', acts[-3:])
    p.check(p.js(RIME)['mp'] <= mp0 - 12, f'{how}: 12 MP paid', (mp0, p.js(RIME)['mp']))
    broken = p.js(EVENTS + "('farewell_broken')")
    p.check('call' in broken, f'{how}: farewell_broken read back, reason call', broken)
    p.shot(f'{how}-broken')


def cast_on_stilled(p, how, seed):
    start(p, seed=seed)
    d = to_hero(p, lambda s: s['stilled'] and not s['pin'])
    if not p.check(d is not None, f'{how}: an ally is Stilled on the hero\'s turn'):
        return
    still = p.js(RIME)['stilled'][0]
    p.shot(f'{how}-stilled')
    sub = open_call(p, how, d)
    if not sub or not pick_call(p, how, sub):
        return
    confirm_target(p, how, still)
    ends = p.js(EVENTS + "('stilled_end')")
    p.check('call' in ends, f'{how}: stilled_end read back, reason call', ends)
    p.check(still not in p.js(RIME)['stilled'], f'{how}: {still} is back', p.js(RIME))
    p.shot(f'{how}-back')


def pin_keys(p):
    cast_on_pin(p, 'keys', 3)


def pin_tap(p):
    cast_on_pin(p, 'tap', 5)


def stilled_keys(p):
    cast_on_stilled(p, 'keys', 3)


def stilled_tap(p):
    cast_on_stilled(p, 'tap', 4)


# ------------------------------------------------------------------------------------- a whole boss by real keys (how it feels)
# The careful policy (the simulator's own) decides each turn; every choice is entered with real keys through the menu. A loss here
# where the simulator wins is an input or menu problem, or a timing one, never a policy one.


def select_target(p, uid, tries=10):
    for d in ('right', 'left', 'right', 'left', 'up', 'down', 'right', 'right', 'left', 'left'):
        t = p.js(TARGET)
        if t and t['at'] == uid:
            return True
        p.act(d)
    t = p.js(TARGET)
    return bool(t and t['at'] == uid)


DECIDE = """(async () => { const { partyAction } = await import('./src/battle/ai.js'); const b = LQ_ENGINE.scene.b, u = b.current();
  const a = partyAction(b, 'competent') || { type: 'defend' };
  const cmd = a.type === 'combo' ? 'combo' : a.type === 'item' ? 'item' : a.type === 'skill'
    ? (b.commands(u).find((c) => c.id !== 'combo' && (c.list || []).some((e) => e.skill === a.skill)) || {}).id : null;
  return { ...a, cmd }; })()"""
SUBIDX = "(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? { ids: m.sub.items.map(i => i.id), index: m.sub.index } : null; })()"


def next_turn(p, d, label):
    turns = d['partyTurns']
    p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.b.state.partyTurns > {turns}; }})()", label, 12)


def by_keys(p, d, a):
    """Enter action `a` (the careful policy's own choice) with real keys through the menu. Returns its label."""
    t = a['type']
    if t == 'defend':
        defend_one(p, d)
        return 'defend'
    root = 'attack' if t == 'attack' else 'swap' if t == 'swap' else a.get('cmd')
    if not root or root not in d['menuItems']:
        defend_one(p, d)
        return 'defend*'
    cursor_to(p, root)
    p.act('confirm')
    if t in ('skill', 'combo', 'item'):
        if not expect_menu(p, 'sub', f'{root} opens'):
            return 'stuck'
        want = a.get('skill') or a.get('item')
        for _ in range(30):
            sub = p.js(SUBIDX)
            if not sub or sub['ids'][sub['index']] == want:
                break
            p.act('down' if sub['ids'].index(want) > sub['index'] else 'up')
        p.act('confirm')
        p.frames(3)
    if p.js("LQ_ENGINE.scene.menu.state") == 'target':
        if a.get('target'):
            select_target(p, a['target'])
        p.act('confirm')
    next_turn(p, d, f'{t} takes the turn')
    return a.get('skill') or a.get('item') or t


def whole_fight(p, enc, seed, level):
    zone = 'ep7_stillheart' if enc == 'white_phantom' else 'ep7_vault_f2'
    start(p, enc, seed, level, zone)
    hp0 = p.js("LQ_ENGINE.scene.b.units().filter(u => u.side === 'party').reduce((a, u) => a + u.maxHp, 0)")
    counts = {}
    t0 = time.time()
    for _ in range(200):
        d = wait_turn(p, timeout=60)
        if d.get('phase') != 'play':
            break
        k = by_keys(p, d, p.js(DECIDE))
        counts[k] = counts.get(k, 0) + 1
    p.until("(() => { const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play'; })()", 'the fight ends', 60)
    res = p.js("(() => { const s = LQ_ENGINE.scene; const b = s.b; if (!b) return null; const r = b.result(); const party = b.units().filter(u => u.side === 'party');"
               " return { outcome: r && r.outcome, rounds: Math.round(10 * b.state.partyTurns / 3) / 10, hp: party.reduce((a, u) => a + Math.max(0, u.hp), 0), ko: party.filter(u => !u.alive).length }; })()")
    ev = {k: p.js(EVENTS + f"('{k}')") for k in ('farewell', 'farewell_broken', 'farewell_land', 'frozen', 'stilled_end')}
    out = {'enc': enc, 'seed': seed, 'level': level, **(res or {}), 'hp_lost_pct': round(100 * (1 - (res or {}).get('hp', 0) / max(1, hp0))) if res else None,
           'pins': len(ev['farewell']), 'broken_by_call': ev['farewell_broken'].count('call'), 'landed': len(ev['farewell_land']),
           'frozen': len(ev['frozen']), 'secs': round(time.time() - t0), 'pressed': counts}
    print('    FIGHT ' + json.dumps(out), flush=True)
    p.findings.append(out)
    return out


SEQUENCES = [('call farewell keys', pin_keys), ('call stilled keys', stilled_keys)]
TOUCH_ONLY = [('call farewell tap', pin_tap), ('call stilled tap', stilled_tap)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--fights', type=int, default=0, help='whole boss fights by real keys per boss (desktop)')
    ap.add_argument('--timeout', type=int, default=1500)
    args = ap.parse_args()
    timer = threading.Timer(args.timeout, lambda: (print(f'FAIL: ep7battle exceeded {args.timeout} s', flush=True), os._exit(3)))
    timer.daemon = True
    timer.start()
    bad = 0
    fights = []
    for device in [d for d in args.device.split(',') if d]:
        p = Play(device)
        try:
            seqs = SEQUENCES + (TOUCH_ONLY if p.touch else [])
            if args.fights and not p.touch:
                for i in range(args.fights):
                    seqs.append((f'lantern by keys {i + 1}', lambda q, i=i: fights.append(whole_fight(q, 'pale_lantern', 11 + i, 29))))
                    seqs.append((f'phantom by keys {i + 1}', lambda q, i=i: fights.append(whole_fight(q, 'white_phantom', 21 + i, 30))))
            for name, fn in seqs:
                t0, n0, status, detail = time.time(), len(p.checks), 'ok', ''
                p.errors.clear()
                try:
                    fn(p)
                except Stuck as e:
                    status, detail = 'STUCK', str(e)
                except Exception:  # noqa: BLE001
                    status, detail = 'ERROR', traceback.format_exc()[-600:]
                fails = [c for c in p.checks[n0:] if not c['ok']]
                errs = list(p.errors) + p.engine_errors()
                calls = p.guard_calls()
                if status == 'ok' and (fails or errs or calls):
                    status = 'FAIL'
                bad += status != 'ok'
                print(f'{status:<5} {device:<8} {name:<22} {len(p.checks) - n0:>3} checks {time.time() - t0:>6.1f} s  {detail[:200]}', flush=True)
                for c in fails:
                    print(f'        {c["label"]}: {c["detail"][:160]}', flush=True)
                for e in (errs + [f'automation call: {c}' for c in calls])[:5]:
                    print(f'        {e[:200]}', flush=True)
        finally:
            p.close()
    if fights:
        print('FIGHTS: ' + json.dumps(fights))
    print('EP7BATTLE: ' + ('PASS' if not bad else f'FAIL ({bad})'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
