"""Episode 6 by real input: Anchor cast from the battle menu with a Rewrite pinned (EPISODE6_PLAN 0.1 and 12, the menu path).

The bots act through battleAct and Auto, which skip the menu (Episode 5's blocker: a target 'none' Tech the menu refused passed
every run). Here the fight is set up (the quick start, anchor_learned, Lv 27, the Storm Scribe), then everything is a real key,
or a finger on the on-screen A button and d-pad, or a tap on the canvas: Defend until a Rewrite is pinned on Bram's turn, Tech,
Anchor, confirm; then Defend on to the Gust, and the `rewrite_broken` event (reason 'anchor') is read back from the battle's own
event stream (a read-only tap on perform / runEnemyTurn set up before the fight).

    python next/qa/realplay/ep6battle.py                 desktop keys, then phone touch (under 5 minutes)
    python next/qa/realplay/ep6battle.py --device phone

run.py can also take this module (SEQUENCES / TOUCH_ONLY), as it does ep5battle.py (E6-integrate wires it).
"""
import argparse
import os
import pathlib
import sys
import threading
import time
import traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from battle import MENU_GONE, OPS_DONE, cursor_to, expect_menu, wait_turn  # noqa: E402
from driver import Play, Stuck  # noqa: E402

SETUP = """async ([enc, seed]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp6'))) {
    if (Date.now() - t0 > 90000) throw new Error('newGameEp6 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp6('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game; g.flags.anchor_learned = true;
  for (const m of g.party) m.level = Math.max(m.level, 27);
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 2, textSpeed: 4, battleCursor: 'last' });
  LQ_DEBUG.battle(enc, { seed, canFlee: false, gameover: false });
  // read-only: every event the battle emits from here on, by type (the rules' own stream, never an input)
  window.__ev6 = [];
  const b = LQ_ENGINE.scene.b;
  for (const k of ['perform', 'runEnemyTurn']) { const f = b[k]; b[k] = (...a) => { const evs = f(...a); for (const e of evs) window.__ev6.push({ type: e.type, reason: e.reason || null }); return evs; }; }
  return true;
}"""
GALE = ("(() => { const s = LQ_ENGINE.scene; const S = s.b && s.b.state.gale; const m = s.b && s.b.unit('bram');"
        " return { pinned: !!(S && S.pinned), gustIn: S && S.gustIn, gusts: S && S.gusts, anchored: !!(S && S.anchored), mp: m && m.mp }; })()")
SUB = ("(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? { ids: m.sub.items.map(i => i.id), index: m.sub.index, color: m.sub.items.map(i => i.color),"
       " rects: m.sub.items.map((_, i) => m.sub.rowRect(i)), vis: m.sub.items.map((_, i) => m.sub.isVisible(i)), icon: typeof m.sub.items[0].draw === 'function' } : null; })()")
BROKEN = "(window.__ev6 || []).filter(e => e.type === 'rewrite_broken').map(e => e.reason)"


def start(p, seed=3):
    p.boot('&pack=ep5,ep6&ep=6')
    p.page.evaluate(SETUP, ['scribe', seed])
    p.until("LQ_DEBUG.scene() === 'battle'", 'the fight starts', 30)


def defend_one(p, d):
    """Spend a turn with real input: cancel jumps the cursor to Defend, confirm takes it (the A button on the phone)."""
    p.act('cancel')
    p.act('confirm')
    p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.b.state.partyTurns > {d['partyTurns']}; }})()", 'Defend takes the turn', 10)


def to_pinned_bram(p):
    """Defend by real input until a Rewrite is pinned and it is Bram's turn. Returns the battle state or None."""
    for _ in range(50):
        d = wait_turn(p, timeout=40)
        if p.js(GALE)['pinned'] and d.get('current') == 'bram':
            return d
        if d.get('phase') not in ('play', None) and d.get('phase') != 'play':
            return None
        defend_one(p, d)
    return None


def after_cast(p, before, how):
    """The confirm on Anchor: the menu closes, Bram cast Anchor, the MP is paid, the party is Anchored; then Defend on to the Gust
    and read back the Rewrite's break (reason 'anchor')."""
    p.until(MENU_GONE, f'{how}: Anchor closes the menu (a refused Tech would buzz and stay)', 6)
    p.until(OPS_DONE, f'{how}: the cast plays', 25)
    acts = p.battle().get('actions', [])
    p.check(any(a.startswith('bram:skill:anchor_line') for a in acts), f'{how}: Bram cast Anchor', acts[-4:])
    g = p.js(GALE)
    p.check(g['mp'] <= before['mp'] - 14, f'{how}: 14 MP paid', (before['mp'], g['mp']))
    p.check(g['anchored'] or 'anchor' in p.js(BROKEN), f'{how}: the party is Anchored (or the Gust already fell on it)', g)
    for _ in range(12):
        if 'anchor' in p.js(BROKEN):
            break
        d = wait_turn(p, timeout=40)
        if d.get('phase') != 'play':
            break
        defend_one(p, d)
    p.until("(window.__ev6 || []).some(e => e.type === 'rewrite_broken')", f'{how}: the Gust falls on the pinned Rewrite', 30)
    broken = p.js(BROKEN)
    p.check(broken[:1] == ['anchor'], f'{how}: rewrite_broken read back, reason anchor', broken)
    p.until(OPS_DONE, f'{how}: the break plays', 25)
    p.shot(f'{how}-broken')


def anchor_keys(p):
    """Keys (desktop) or the on-screen d-pad and A (phone): the root opens on Tech, Anchor first in gold, one confirm casts it."""
    start(p)
    d = to_pinned_bram(p)
    if not p.check(d is not None, 'a Rewrite is pinned on Bram\'s turn'):
        return
    p.check(d['menuItems'][d['menuIndex']] == 'tech', 'the root cursor opens on Tech', d['menuItems'][d['menuIndex']])
    p.shot('pinned-root')
    cursor_to(p, 'tech')
    p.act('confirm')
    if not expect_menu(p, 'sub', 'Tech opens'):
        return
    p.frames(6)
    sub = p.js(SUB)
    p.check(sub['ids'][0] == 'anchor_line' and sub['index'] == 0 and sub['color'][0] == 'gold' and sub['icon'], 'Anchor first, in gold, with its icon, under the cursor', sub['ids'][:3])
    p.shot('pinned-tech-list')
    before = p.js(GALE)
    p.act('confirm')
    after_cast(p, before, 'keys')


def anchor_tap(p):
    """Phone: a tap on Tech, a tap on Anchor (already selected: the tap casts). Fingers on the canvas only."""
    start(p, 5)
    d = to_pinned_bram(p)
    if not p.check(d is not None, 'a Rewrite is pinned on Bram\'s turn'):
        return
    p.tap_rect(d['rootRects'][d['menuItems'].index('tech')])
    p.frames(4)
    if not expect_menu(p, 'sub', 'one tap on Tech opens its list'):
        return
    p.frames(6)
    sub = p.js(SUB)
    i = sub['ids'].index('anchor_line') if 'anchor_line' in sub['ids'] else -1
    if not p.check(i == 0 and sub['vis'][i], 'Anchor is first and on screen', sub['ids']):
        return
    before = p.js(GALE)
    if sub['index'] != i:
        p.tap_rect(sub['rects'][i])
        p.frames(3)
    p.tap_rect(sub['rects'][i])
    after_cast(p, before, 'tap')


SEQUENCES = [('anchor rewrite keys', anchor_keys)]
TOUCH_ONLY = [('anchor rewrite tap', anchor_tap)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--timeout', type=int, default=600)
    args = ap.parse_args()
    timer = threading.Timer(args.timeout, lambda: (print(f'FAIL: ep6battle exceeded {args.timeout} s', flush=True), os._exit(3)))
    timer.daemon = True
    timer.start()
    bad = 0
    for device in [d for d in args.device.split(',') if d]:
        p = Play(device)
        try:
            seqs = SEQUENCES + (TOUCH_ONLY if p.touch else [])
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
    print('EP6BATTLE: ' + ('PASS' if not bad else f'FAIL ({bad})'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
