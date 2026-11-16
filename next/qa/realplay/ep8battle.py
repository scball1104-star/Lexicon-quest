"""Episode 8 by real input: Mira's Read Aloud cast from the battle menu at an Unwrite's target, at Mira herself and from a rubbed-out
Magic row, and the hero's Answer at the Last Silence (EPISODE8_PLAN 0.1 and 12, the menu paths); and the Eraser played whole with real
input (how the finale feels to a person, not to the simulator).

The bots act through battleAct and Auto, which skip the menu (Episode 5's blocker: a Tech the menu refused passed every run). Read Aloud
is the first signature skill that may target its own caster and must open from a rubbed Magic row. Here the fight is set up (the quick
start, read_learned, the Last Word loadout at Lv 33, the Eraser), then every game action is a real key, a finger on the on-screen A
button and d-pad, or a tap on the canvas. QA levers (page code, never an input) only set the stage: a rubbed Magic row on Mira before
her turn, the Eraser's HP just over a phase line. The rules' own events are read back from a read-only tap on perform / runEnemyTurn set
up before the fight: `unwrite_broken` with reason 'read', `read`, `silence_broken` with reason 'answer'.

    python next/qa/realplay/ep8battle.py                          desktop keys, then phone touch
    python next/qa/realplay/ep8battle.py --device phone --fights 3 the casts, then the Eraser played whole three times on the phone
                                                                  (the careful policy decides, every choice goes in by the phone's own
                                                                  controls: the d-pad and A)
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

SETUP = """async ([enc, seed, level]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp8'))) {
    if (Date.now() - t0 > 150000) throw new Error('newGameEp8 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp8('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  // the simulator's own party for the Last Word (tools/sim/ep8.mjs LOADOUTS: gear, mastery, bag, flags), so a loss is the input and
  // the play, not a weaker kit than the balance numbers assume
  const { LOADOUTS } = await import('./tools/sim/ep8.mjs'), { memberMax } = await import('./src/game/state.js');
  const L = LOADOUTS.ep8_last_word;
  for (const m of g.party) {
    const r = L[m.id];
    m.weapon = r.weapon; m.equip = { ...Object.fromEntries(Object.keys(m.equip).map((k) => [k, null])), ...r.equip };
    m.mastery = { ...m.mastery, ...r.mastery }; m.level = level;
    const s = memberMax(m); m.hp = s.hp; m.mp = s.mp;
  }
  g.items = { ...L.inventory };
  if (Array.isArray(L.flags)) for (const f of L.flags) g.flags[f] = true; else Object.assign(g.flags, L.flags || {});
  g.flags.read_learned = true;
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 2, textSpeed: 4, battleCursor: 'last' });
  LQ_DEBUG.battle(enc, { seed, canFlee: false, gameover: false });
  // read-only: every event the battle emits from here on (the rules' own stream, never an input)
  window.__ev8 = [];
  const b = LQ_ENGINE.scene.b;
  for (const k of ['perform', 'runEnemyTurn']) { const f = b[k]; b[k] = (...a) => { const evs = f(...a); for (const e of evs) window.__ev8.push({ type: e.type, reason: e.reason || null, target: e.target || null, command: e.command || null, actor: e.actor || null, moved: !!e.moved }); return evs; }; }
  return true;
}"""
ER = ("(() => { const s = LQ_ENGINE.scene, b = s.b, S = b && b.state.erasure, h = b && b.units().find(u => u.id === 'hero'), m = b && b.units().find(u => u.id === 'mira');"
      " const cur = b && b.current(); const f = b && b.living('enemy').find(u => u.charging && u.charging.skill === 'last_silence');"
      " return { pin: S && S.pin ? S.pin.target : null, pinId: S && S.pin ? b.unit(S.pin.target).id : null, cur: cur && cur.id,"
      " unw: S ? Object.keys(S.unwritten) : [], rub: S ? JSON.parse(JSON.stringify(S.rub)) : {}, silence: !!f, mira: m && m.uid, miraMp: m && m.mp, heroMp: h && h.mp,"
      " eraser: (b.units().find(u => u.id === 'eraser') || {}).uid || null }; })()")
SUB = ("(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? { ids: m.sub.items.map(i => i.id), index: m.sub.index, color: m.sub.items.map(i => i.color),"
       " dis: m.sub.items.map(i => !!i.disabled), rects: m.sub.items.map((_, i) => m.sub.rowRect(i)), vis: m.sub.items.map((_, i) => m.sub.isVisible(i)),"
       " icon: m.sub.items.some(i => i.id === 'read_aloud' && typeof i.draw === 'function') } : null; })()")
TARGET = "(() => { const m = LQ_ENGINE.scene.menu; return m.state === 'target' ? { at: m.currentTarget(), ids: m.tInfo.ids.slice() } : null; })()"
BOX = "((uid) => { const a = LQ_ENGINE.scene.actor(uid); return a ? { x: Math.round(a.x - Math.max(24, a.w) / 2), y: Math.round(a.y - Math.max(32, a.h)), w: Math.max(24, a.w), h: Math.max(32, a.h) } : null; })"
EVENTS = "((t) => (window.__ev8 || []).filter(e => e.type === t))"
HELP = "(() => { const s = LQ_ENGINE.scene; return s.menu.helpText || ''; })()"


def start(p, enc='eraser', seed=3, level=33):
    p.boot('&pack=ep8&ep=8')
    p.page.evaluate(SETUP, [enc, seed, level])
    p.until("LQ_DEBUG.scene() === 'battle'", 'the fight starts', 40)


def next_turn(p, d, label, timeout=14):
    turns = d['partyTurns']
    p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.b.state.partyTurns > {turns}; }})()", label, timeout)


def defend_one(p, d):
    p.act('cancel')   # cancel on the root jumps to Defend
    p.act('confirm')
    next_turn(p, d, f'{d.get("current")} defends')


def select_target(p, uid):
    for d in ('right', 'left', 'right', 'left', 'up', 'down', 'right', 'right', 'left', 'left'):
        t = p.js(TARGET)
        if t and t['at'] == uid:
            return True
        p.act(d)
    t = p.js(TARGET)
    return bool(t and t['at'] == uid)


def attack_one(p, d):
    """A plain Attack on the Eraser by real input (its last command becomes Attack: the ink takes it next)."""
    if 'attack' not in d['menuItems'] or not d.get('commands') or 'attack' not in d['commands']:
        return defend_one(p, d)
    cursor_to(p, 'attack')
    p.act('confirm')
    p.frames(3)
    if p.js("LQ_ENGINE.scene.menu.state") == 'target':
        select_target(p, p.js(ER)['eraser'])
        p.act('confirm')
    next_turn(p, d, f'{d.get("current")} attacks')


def to_turn(p, who, cond, act=None, tries=80):
    """Real input (Defend, or `act(p, d)` for some members) until `cond(er)` holds on `who`'s turn. Returns the battle state or None."""
    for _ in range(tries):
        d = wait_turn(p, timeout=60)
        if d.get('phase') != 'play':
            return None
        er = p.js(ER)
        if er['cur'] == who and cond(er):
            return d
        (act or (lambda q, x: defend_one(q, x)))(p, d)
    return None


def steer(member):
    """`member` Attacks every turn (so the Unwrite picks them: the most rubbed), everyone else Defends."""
    def act(p, d):
        er = p.js(ER)
        if er['cur'] == member and not (er['rub'].get(d['current']) or []):
            attack_one(p, d)
        else:
            defend_one(p, d)
    return act


def open_read(p, how, d, sig=True):
    """Magic (keys or a tap), then Read Aloud: first and gold when it floats (`sig`), lit; under the cursor or tapped. Returns the sub."""
    items = d['menuItems']
    if how == 'keys':
        if sig:
            p.check(items[d['menuIndex']] == 'magic', f'{how}: the root cursor opens on Magic', items[d['menuIndex']])
        cursor_to(p, 'magic')
        p.act('confirm')
    else:
        r = d['rootRects'][items.index('magic')]
        if d['menuIndex'] != items.index('magic'):
            p.tap_rect(r)
            p.frames(3)
        if p.js("LQ_ENGINE.scene.menu.state") == 'root':
            p.tap_rect(r)
        p.frames(4)
    if not expect_menu(p, 'sub', f'{how}: Magic opens'):
        return None
    p.frames(6)
    sub = p.js(SUB)
    i = sub['ids'].index('read_aloud') if 'read_aloud' in sub['ids'] else -1
    p.check(i >= 0 and not sub['dis'][i] and sub['icon'], f'{how}: Read Aloud listed, lit, with its icon', sub['ids'][:4])
    if sig:
        p.check(i == 0 and sub['color'][0] == 'gold', f'{how}: Read Aloud first, in gold', (sub['ids'][:3], sub['color'][:3]))
    return sub


def pick_read(p, how, sub):
    i = sub['ids'].index('read_aloud')
    if how == 'keys':
        for _ in range(12):
            s = p.js(SUB)
            if s['index'] == i:
                break
            p.act('down' if s['index'] < i else 'up')
        p.act('confirm')
    else:
        if sub['index'] != i:
            p.tap_rect(sub['rects'][i])
            p.frames(3)
        p.tap_rect(sub['rects'][i])
        p.frames(4)
    return expect_menu(p, 'target', f'{how}: Read Aloud asks for its ally')


def confirm_target(p, how, uid, label):
    t = p.js(TARGET)
    if not (t and t['at'] == uid):
        if how == 'keys':
            select_target(p, uid)
        else:
            p.tap_rect(p.js(BOX + f"('{uid}')"))
            p.frames(3)
    t = p.js(TARGET)
    p.check(t and t['at'] == uid, f'{how}: the cursor on {uid}', t)
    p.shot(f'{how}-{label}-target')
    if how == 'keys':
        p.act('confirm')
    else:
        p.tap_rect(p.js(BOX + f"('{uid}')"))   # already selected: one tap casts
    p.until(MENU_GONE, f'{how}: the cast closes the menu (a refused skill would buzz and stay)', 8)
    p.until(OPS_DONE, f'{how}: the cast plays', 30)


def read_case(p, how, seed, label, who):
    """`who`: 'other' (the pin on Bram, the cursor opens on it) or 'self' (the pin on Mira)."""
    start(p, seed=seed)
    p.js(STURDY)
    member = 'bram' if who == 'other' else 'mira'
    d = to_turn(p, 'mira', lambda e: e['pinId'] == member and e['mira'] not in e['unw'], act=steer(member))
    if not p.check(d is not None, f'{how}: an Unwrite pinned on {member} at Mira\'s turn'):
        return
    pin = p.js(ER)['pin']
    p.shot(f'{how}-{label}-pinned')
    sub = open_read(p, how, d)
    if not sub or not pick_read(p, how, sub):
        return
    t = p.js(TARGET)
    p.check(t and t['at'] == pin, f'{how}: the cursor opens on the pin\'s target {pin}', t)
    mp0 = p.js(ER)['miraMp']
    confirm_target(p, how, pin, label)
    acts = p.battle().get('actions', [])
    p.check(any(a.startswith(p.js(ER)['mira'] + ':skill:read_aloud>' + pin) for a in acts), f'{how}: Mira cast Read Aloud on {pin}', acts[-3:])
    p.check(p.js(ER)['miraMp'] <= mp0 - 12, f'{how}: 12 MP paid', (mp0, p.js(ER)['miraMp']))
    broken = p.js(EVENTS + "('unwrite_broken')")
    p.check(any(e['reason'] == 'read' and e['target'] == pin for e in broken), f'{how}: unwrite_broken read back, reason read', broken)
    p.shot(f'{how}-{label}-broken')


RUB_MAGIC = """(() => { const b = LQ_ENGINE.scene.b, S = b.state.erasure, m = b.units().find(u => u.id === 'mira');
  S.rub[m.uid] = [{ cmd: 'magic', left: 2 }]; S.last[m.uid] = 'magic'; if (LQ_ENGINE.scene.er8) LQ_ENGINE.scene.er8.rub[m.uid] = [{ cmd: 'magic', left: 2 }]; return m.uid; })()"""


def rubbed_case(p, how, seed):
    """A QA lever rubs out Mira's Magic before her turn (the stage, not an input); she opens the rubbed row and Reads herself back."""
    start(p, seed=seed)
    p.js(STURDY)
    d = to_turn(p, 'hero', lambda e: not e['pin'] and e['mira'] not in e['unw'])
    if not p.check(d is not None, f'{how}: the hero\'s turn with nothing pinned'):
        return
    mira = p.js(RUB_MAGIC)
    defend_one(p, d)
    d = to_turn(p, 'mira', lambda e: 'magic' in [x['cmd'] for x in e['rub'].get(e['mira'], [])], tries=6)
    if not p.check(d is not None, f'{how}: Mira\'s turn with her Magic rubbed out'):
        return
    p.frames(6)
    p.shot(f'{how}-rubbed-row')
    items = d['menuItems']
    i = items.index('magic')
    row = p.js("(() => { const it = LQ_ENGINE.scene.menu.root.items.find(x => x.id === 'magic'); return { help: it.help, rub: it.rub8 || null, dis: !!it.disabled }; })()")
    p.check(row['rub'] and not row['dis'] and 'Rubbed out. Try something else.' in (row['help'] or ''), f'{how}: the rubbed Magic row: smudged, open, says why', row)
    if how == 'keys':
        cursor_to(p, 'magic')
        help_line = p.js(HELP)
        p.check('Rubbed out. Try something else.' in help_line, f'{how}: the help line under the cursor', help_line)
        p.act('confirm')
    else:
        p.tap_rect(d['rootRects'][i])   # the root's rows take one tap
        p.frames(4)
    if not expect_menu(p, 'sub', f'{how}: the rubbed Magic row opens'):
        return
    sub = p.js(SUB)
    lit = [x for x, dis in zip(sub['ids'], sub['dis']) if not dis]
    p.check(lit == ['read_aloud'] and len(sub['ids']) > 1, f'{how}: only Read Aloud lit, every other spell greyed', lit)
    p.check(sub['ids'][0] == 'read_aloud' and sub['index'] == 0 and sub['vis'][0], f'{how}: Read Aloud first, under the cursor, on screen', (sub['ids'][:2], sub['index']))
    p.shot(f'{how}-rubbed-list')
    if not pick_read(p, how, sub):
        return
    confirm_target(p, how, mira, 'rubbed')
    reads = p.js(EVENTS + "('read')")
    p.check(any(e['target'] == mira for e in reads), f'{how}: read back on Mira', reads)
    ends = p.js(EVENTS + "('rub_end')")
    p.check(any(e['target'] == mira and e['command'] == 'magic' and e['reason'] == 'read' for e in ends), f'{how}: her Magic comes back', ends)


DECIDE = """(async () => { const { partyAction } = await import('./src/battle/ai.js'); const b = LQ_ENGINE.scene.b, u = b.current();
  const a = partyAction(b, 'competent') || { type: 'defend' };
  const cmd = a.type === 'combo' ? 'combo' : a.type === 'item' ? 'item' : a.type === 'skill'
    ? (b.commands(u).find((c) => c.id !== 'combo' && (c.list || []).some((e) => e.skill === a.skill)) || {}).id : null;
  return { ...a, cmd }; })()"""
SUBIDX = "(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? { ids: m.sub.items.map(i => i.id), index: m.sub.index } : null; })()"


def by_input(p, d, a):
    """Enter action `a` (the careful policy's own choice) with this device's real controls through the menu. Returns its label."""
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
    next_turn(p, d, f'{t} takes the turn', 20)
    return a.get('skill') or a.get('item') or t


def careful(p, d):
    by_input(p, d, p.js(DECIDE))


LEVER_HP = "((share) => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'eraser'); u.hp = Math.floor(u.maxHp * share) + 6; return u.hp; })"
STURDY = "(() => { for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.maxHp = Math.max(u.maxHp, 9999); u.hp = u.maxHp; } return true; })()"
ADDS_LOW = "(() => { for (const u of LQ_ENGINE.scene.b.units()) if ((u.id === 'truth_grief' || u.id === 'truth_change') && u.alive) { u.hp = 1; u.shields = 0; } return true; })()"


def answer_case(p, how, seed):
    """QA levers walk the Eraser to his last phase (HP just over each line; Grief and Change at 1 HP); the careful policy plays every turn
    by real input; on the hero's turn with the Last Silence charging the hero answers it: Tech, Answer first in gold, the Eraser."""
    start(p, seed=seed)
    p.js(STURDY)
    p.js(LEVER_HP + '(0.70)')
    d = to_turn(p, 'hero', lambda e: p.js("LQ_ENGINE.scene.b.units().some(u => u.id === 'truth_grief')"), act=lambda q, x: careful(q, x), tries=30)
    if not p.check(d is not None, f'{how}: the ward rises'):
        return
    p.js(ADDS_LOW)
    d = to_turn(p, 'hero', lambda e: not p.js("LQ_ENGINE.scene.b.units().some(u => (u.id === 'truth_grief' || u.id === 'truth_change') && u.alive)"),
                act=lambda q, x: careful(q, x), tries=30)
    if not p.check(d is not None, f'{how}: the ward breaks'):
        return
    p.js(LEVER_HP + '(0.26)')
    d = to_turn(p, 'hero', lambda e: e['silence'], act=lambda q, x: careful(q, x), tries=40)
    if not p.check(d is not None, f'{how}: the Last Silence charges on the hero\'s turn'):
        return
    p.frames(8)
    p.shot(f'{how}-silence')
    items = d['menuItems']
    p.check(items[d['menuIndex']] == 'tech', f'{how}: the root cursor opens on Tech', items[d['menuIndex']])
    if how == 'keys':
        cursor_to(p, 'tech')
        p.act('confirm')
    else:
        p.tap_rect(d['rootRects'][items.index('tech')])
        p.frames(4)
    if not expect_menu(p, 'sub', f'{how}: Tech opens'):
        return
    sub = p.js(SUB)
    p.check(sub['ids'][0] == 'answer' and sub['color'][0] == 'gold' and not sub['dis'][0], f'{how}: Answer first, in gold, lit', (sub['ids'][:3], sub['color'][:2]))
    p.shot(f'{how}-answer-list')
    if how == 'keys':
        p.act('confirm')
    else:
        if sub['index'] != 0:
            p.tap_rect(sub['rects'][0])
            p.frames(3)
        p.tap_rect(sub['rects'][0])
        p.frames(4)
    if p.js("LQ_ENGINE.scene.menu.state") == 'target':
        er = p.js(ER)['eraser']
        if how == 'keys':
            select_target(p, er)
            p.act('confirm')
        else:
            t = p.js(TARGET)
            if not (t and t['at'] == er):
                p.tap_rect(p.js(BOX + f"('{er}')"))
                p.frames(3)
            p.tap_rect(p.js(BOX + f"('{er}')"))
    p.until(MENU_GONE, f'{how}: Answer closes the menu', 8)
    p.until(OPS_DONE, f'{how}: Answer plays', 30)
    sb = p.js(EVENTS + "('silence_broken')")
    p.check(any(e['reason'] == 'answer' for e in sb), f'{how}: silence_broken read back, reason answer', sb)
    p.shot(f'{how}-answered')


# ------------------------------------------------------------------------------------- the Eraser whole by real input (how it feels)
def whole_fight(p, seed, level=33):
    start(p, 'eraser', seed, level)
    hp0 = p.js("LQ_ENGINE.scene.b.units().filter(u => u.side === 'party').reduce((a, u) => a + u.maxHp, 0)")
    counts = {}
    t0 = time.time()
    for _ in range(260):
        d = wait_turn(p, timeout=90)
        if d.get('phase') != 'play':
            break
        k = by_input(p, d, p.js(DECIDE))
        counts[k] = counts.get(k, 0) + 1
    p.until("(() => { const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play'; })()", 'the fight ends', 90)
    res = p.js("(() => { const s = LQ_ENGINE.scene; const b = s.b; if (!b) return null; const r = b.result(); const party = b.units().filter(u => u.side === 'party');"
               " return { outcome: r && r.outcome, rounds: Math.round(10 * b.state.partyTurns / 3) / 10, hp: party.reduce((a, u) => a + Math.max(0, u.hp), 0), ko: party.filter(u => !u.alive).length }; })()")
    ev = {k: p.js(EVENTS + f"('{k}')") for k in ('unwrite_pin', 'unwrite_broken', 'unwrite_land', 'silence_broken', 'rub')}
    sil = p.js("(window.__ev8 || []).filter(e => e.type === 'telegraph').length")
    out = {'seed': seed, 'level': level, 'device': p.device, **(res or {}),
           'hp_lost_pct': round(100 * (1 - (res or {}).get('hp', 0) / max(1, hp0))) if res else None,
           'pins': len([e for e in ev['unwrite_pin'] if not e.get('moved')]), 'read_back': sum(1 for e in ev['unwrite_broken'] if e['reason'] == 'read'),
           'landed': len(ev['unwrite_land']), 'answered': sum(1 for e in ev['silence_broken'] if e['reason'] == 'answer'),
           'silence_broke': sum(1 for e in ev['silence_broken'] if e['reason'] == 'break'), 'rubs': len(ev['rub']), 'telegraphs': sil,
           'secs': round(time.time() - t0), 'pressed': counts}
    print('    FIGHT ' + json.dumps(out), flush=True)
    p.findings.append(out)
    return out


SEQUENCES = [('read pin keys', lambda p: read_case(p, 'keys', 3, 'pin', 'other')),
             ('read self keys', lambda p: read_case(p, 'keys', 4, 'self', 'self')),
             ('read rubbed keys', lambda p: rubbed_case(p, 'keys', 5)),
             ('answer keys', lambda p: answer_case(p, 'keys', 6))]
TOUCH_ONLY = [('read pin tap', lambda p: read_case(p, 'tap', 3, 'pin', 'other')),
              ('read self tap', lambda p: read_case(p, 'tap', 8, 'self', 'self')),
              ('read rubbed tap', lambda p: rubbed_case(p, 'tap', 9)),
              ('answer tap', lambda p: answer_case(p, 'tap', 10))]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--fights', type=int, default=0, help='whole Eraser fights by real input per device')
    ap.add_argument('--only-fights', action='store_true', help='skip the casts')
    ap.add_argument('--seed0', type=int, default=31)
    ap.add_argument('--only', default='', help='run only the sequences whose name has this text')
    ap.add_argument('--timeout', type=int, default=2400)
    args = ap.parse_args()
    timer = threading.Timer(args.timeout, lambda: (print(f'FAIL: ep8battle exceeded {args.timeout} s', flush=True), os._exit(3)))
    timer.daemon = True
    timer.start()
    bad = 0
    fights = []
    for device in [d for d in args.device.split(',') if d]:
        p = Play(device, tag='-ep8')
        try:
            seqs = [] if args.only_fights else SEQUENCES + (TOUCH_ONLY if p.touch else [])
            if args.only:
                seqs = [x for x in seqs if args.only in x[0]]
            for i in range(args.fights):
                seqs.append((f'eraser whole {i + 1}', lambda q, i=i: fights.append(whole_fight(q, args.seed0 + i))))
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
                print(f'{status:<5} {device:<8} {name:<20} {len(p.checks) - n0:>3} checks {time.time() - t0:>6.1f} s  {detail[:200]}', flush=True)
                for c in fails:
                    print(f'        {c["label"]}: {c["detail"][:160]}', flush=True)
                for e in (errs + [f'automation call: {c}' for c in calls])[:5]:
                    print(f'        {e[:200]}', flush=True)
        finally:
            p.close()
    if fights:
        wins = sum(1 for f in fights if f.get('outcome') == 'victory')
        print('FIGHTS: ' + json.dumps(fights))
        print(f'ERASER BY REAL INPUT: {wins} won, {len(fights) - wins} lost of {len(fights)}')
    print('EP8BATTLE: ' + ('PASS' if not bad else f'FAIL ({bad})'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
