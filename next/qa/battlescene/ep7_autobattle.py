"""Episode 7 battle-scene checks (E7-scene-ui), headless Chromium with the ep7 pack (which brings ep6, ep5 and ep4). Uses the helpers
of autobattle.py and ep5_autobattle.py.

  python next/qa/battlescene/ep7_autobattle.py                       every scenario, desktop + phone
  python next/qa/battlescene/ep7_autobattle.py --only white_phantom --device phone

Scenarios (PNGs in next/qa/battlescene/out/ep7/, zooms of the party window, the timeline and the rows):
  e7w_first      the White Road stage; Rime at 1, 2 and 3 pips (a QA lever sets them), the frosted names measured against their box
                 (at least 0.15 luma above, the phone rule), a Frozen turn filmed (the crack, FROZEN floating, the frosted heads);
                 the Defend row's help; Auto to the end
  e7v2_mixed     the Hall of Borrowed Light stage with three foes: every row clear of every body; Auto to the end
  e7v3_pages     the Sanctum stage and its aurora (the frame steps measured on the stage canvas); Auto to the end
  pale_lantern   the card and its arc line, the cold lamp glow, Borrowed Light pinned (the ribbon, the frost name under the timeline),
                 the hero's Tech list opening on Call in gold, the cursor on the pin's target, Call cast, the break filmed; the hood
                 opening and the Wisps; Auto to the end
  white_phantom  the card, the Farewell pinned and broken by Call, a farewell landed (the ice shell, the snowflake on the timeline,
                 "Mira is Stilled."), Call on the Stilled ally; the Ward (the doors, the Gate and the Letter in their slots, rows under
                 their feet); the thaw (the warm grade measured: at least 0.10 above the frozen grade); each look with its row over
                 the crown; Auto to the end
Every scenario checks each foe's weakness row against every body and fails on any console error.
"""
import argparse
import json
import sys
import time
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import autobattle as ab  # noqa: E402
import ep5_autobattle as e5  # noqa: E402
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out' / 'ep7'
ab.OUT = OUT
e5.OUT = OUT
ADV = ab.ADVANCE
DEVICES = {k: v for k, v in ab.DEVICES.items() if k in ('desktop', 'phone')}
RV = "(LQ_ENGINE.scene.rime7 || null)"


def setup(page, enc, seed, level=30, flags=None):
    page.evaluate("for (const k of ['ep4', 'ep5', 'ep6', 'ep7']) LQ_PACKS.forcePack(k); LQ_PACKS.ensurePack('ep7'); true")
    page.wait_for_function("LQ_PACKS.packReady && LQ_PACKS.packReady('ep7') && !!LQ_DEBUG.newGameEp7", timeout=90000)
    page.evaluate("LQ_DEBUG.newGameEp7('Arden', { slot: 1, scene: 'none' })")
    page.wait_for_function("LQ_ENGINE.game && LQ_ENGINE.game.party && LQ_ENGINE.game.party.length === 3", timeout=60000)
    page.evaluate("(() => { const g = LQ_ENGINE.game; g.flags.call_learned = true; for (const f of %s) g.flags[f] = true; })()" % json.dumps(flags or []))
    page.evaluate(f"(() => {{ for (const m of LQ_ENGINE.game.party) m.level = Math.max(m.level, {level}); }})()")
    page.evaluate("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1, battleCursor: 'last' })")
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ seed: {seed}, canFlee: false }})")
    ab.advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase !== 'intro'", max_frames=400, step=2)
    # a pack stage: wait on usedAsset, never on `painted` (Episode 5's lesson)
    ab.advance_until(page, "!!(LQ_ENGINE.scene.backdropLayer && LQ_ENGINE.scene.backdropLayer.usedAsset)", max_frames=600, step=10)
    if not page.evaluate(RV + " !== null"):
        raise AssertionError('no Rime view: the battle has no cold foe or the scene module did not register')


def act(page, action):
    page.evaluate(f"LQ_DEBUG.battleAct({json.dumps(action)})")


def menu_open(page):
    ab.advance_until(page, ab.WAIT_MENU + " || ['rewards', 'victory', 'defeat'].includes(LQ_DEBUG.state().battle.phase)", max_frames=4000, step=4)


def current(page):
    return page.evaluate("(() => { const u = LQ_ENGINE.scene.b.current(); return u ? u.id : null; })()")


def play_until(page, js, turns=40, action=None):
    """Party acts (`action(page)` or Defend), enemies act, until `js` holds at a party menu. True when it did."""
    for _ in range(turns):
        menu_open(page)
        if page.evaluate(js):
            return True
        if page.evaluate("LQ_DEBUG.state().battle.phase !== 'play'"):
            return False
        act(page, action(page) if action else {'type': 'defend'})
    menu_open(page)
    return bool(page.evaluate(js))


def sturdy(page):
    """QA lever: the party cannot fall (the scenario films a state, not a result)."""
    page.evaluate("(() => { for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.maxHp = Math.max(u.maxHp, 9999); u.hp = u.maxHp; } })()")


GAME_LUMA = """((x, y, w, h) => { const c = LQ_ENGINE.renderer.canvas, g = c.getContext('2d'); const k = c.width / 384;
  const d = g.getImageData(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))).data;
  const L = (v) => v / 255; let s = 0, n = 0, mx = 0;
  for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * L(d[i]) + 0.7152 * L(d[i + 1]) + 0.0722 * L(d[i + 2]); s += l; n++; if (l > mx) mx = l; }
  return { mean: s / n, max: mx }; })"""


def luma(page, x, y, w, h):
    return page.evaluate(f"({GAME_LUMA})({x}, {y}, {w}, {h})")


def name_contrast(page, ctx, tag):
    """Each party row's name against its box (game pixels of the last frame): the brightest third of the name's pixels against the
    box beside it. A frosted name must stay at least 0.15 above its box (CRITIQUE_6 item 1's rule, plan 6.3)."""
    rows = page.evaluate("""(() => { const s = LQ_ENGINE.scene, rv = s.rime7; return s.party().map((a, i) => ({ i, id: a.id, name: a.name,
      rime: rv.r[a.uid] || 0, frozen: !!rv.frozen[a.uid], stilled: !!rv.stilled[a.uid] })); })()""")
    out = []
    for r in rows:
        y = 152 + 5 + r['i'] * 17 + 3
        w = page.evaluate(f"LQ_ENGINE.renderer.measure({json.dumps(r['name'])})")
        txt = luma(page, 160, y, w, 8)
        box = luma(page, 160 + w + 2, y + 9, 6, 2)
        out.append({**r, 'name_max': round(txt['max'], 3), 'box': round(box['mean'], 3), 'gap': round(txt['max'] - box['mean'], 3)})
    ctx.setdefault('measures', []).append({tag: out})
    for o in out:
        if o['gap'] < 0.15:
            raise AssertionError(f'{tag}: a name too close to its box {o}')
    ctx['note'] += f" {tag} name gap min {min(o['gap'] for o in out):.2f};"
    return out


ROWS = """(() => { const s = LQ_ENGINE.scene, touch = s.menu.touch;
  const uids = [...s.actors.values()].filter(a => a.side === 'enemy' && !a.dead).map(a => a.uid);
  let plan = s.planEnemyRows(uids, touch, null, 23);
  // as draw() does with the menu open: desktop rows that had to lift are placed the way the phone places them
  if (!touch && uids.length > 1 && [...plan.values()].some(p => p.lift > 0)) plan = s.planEnemyRows(uids, touch, null, 23, true);
  const rows = [...plan.entries()].map(([uid, p]) => ({ uid, id: s.actor(uid).id, x: p.rect.x, y: p.rect.y, w: p.rect.w, place: p.place || null }));
  const bodies = [...s.actors.values()].filter(a => !a.dead && !a.ko).map(a => ({ uid: a.uid, id: a.id, side: a.side, x: Math.round(a.homeX - a.w / 2), y: Math.round(a.homeY - a.h), w: a.w, h: a.h }));
  return { rows, bodies, touch }; })()"""


def rows_check(page, ctx, tag):
    """Every foe's row against every body (its own: head and chest only; the Phantom's row over its crown keeps off its frame),
    and the Gate and the Letter at least 12 px from any party sprite."""
    m = page.evaluate(ROWS)
    clash = []
    for r in m['rows']:
        for b in m['bodies']:
            if b['uid'] == r['uid'] and r['place'] == 'band':
                continue
            own = 0.7 if r['id'] in ('closed_gate', 'lost_letter', 'snow_wisp') else (0.85 if m['touch'] else 0.55)   # the adds: their feet band
            # another foe: never its head or chest (its feet band, the bottom 30%, is where the desktop rows of a big group stand);
            # a party member: never at all
            feet = int(b['h'] * own) if b['uid'] == r['uid'] else int(b['h'] * 0.7) if b['side'] == 'enemy' else b['h']
            if r['x'] < b['x'] + b['w'] and b['x'] < r['x'] + r['w'] and r['y'] < b['y'] + feet and b['y'] < r['y'] + 14:
                if b['side'] == 'enemy' and b['uid'] != r['uid'] and b['id'] == 'white_phantom' and r['id'] in ('closed_gate', 'lost_letter'):
                    continue   # the adds stand in front of the Phantom's hem: their rows under their own feet cross its cloak, never a face
                clash.append((r['id'], b['id']))
    party_left = min(b['x'] for b in m['bodies'] if b['side'] == 'party')
    for b in m['bodies']:
        if b['id'] in ('closed_gate', 'lost_letter') and party_left - (b['x'] + b['w']) < 12:
            clash.append((b['id'], 'within 12 px of the party'))
    ctx.setdefault('measures', []).append({tag: m})
    if clash:
        raise AssertionError(f'{tag}: rows cross bodies {clash}')
    return m


def stage_luma(page, rows=118):
    return page.evaluate(f"""(() => {{ const bl = LQ_ENGINE.scene.backdropLayer; const d = bl.ctx.getImageData(0, 0, bl.w, {rows}).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4) / 255; }})()""")


def to_end(page, ctx):
    page.evaluate("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    ab.advance_until(page, "LQ_DEBUG.state().battle == null || ['rewards', 'victory', 'defeat'].includes(LQ_DEBUG.state().battle.phase)", max_frames=80000, step=60)
    ctx['note'] += f" end {page.evaluate('LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase')};"


def zooms(page, ctx, name):
    e5.zoom(page, ctx, f"{ctx['device']}_{name}_party", (130, 150, 254, 64), scale=4)
    e5.tl_zoom(page, ctx, name)


def set_rime(page, levels):
    """QA lever: members' Rime (the rules' count and the scene's view together)."""
    page.evaluate("((lv) => { const s = LQ_ENGINE.scene; for (const [id, n] of Object.entries(lv)) { const u = s.b.unit(id); s.b.state.rime.r[u.uid] = n; s.rime7.r[u.uid] = n; } })(%s)" % json.dumps(levels))


# ------------------------------------------------------------------------------------------ scenarios
def sc_e7w_first(page, ctx):
    setup(page, 'e7w_first', 3, level=28)
    sturdy(page)
    menu_open(page)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'open')
    for lv in (1, 2, 3):
        set_rime(page, {'hero': max(0, lv - 1), 'mira': lv, 'bram': min(3, lv)})
        page.evaluate(ADV.format(2))
        zooms(page, ctx, f'rime{lv}')
        name_contrast(page, ctx, f'rime{lv}')
    ab.shot(page, ctx, 'rime3')
    set_rime(page, {'hero': 0, 'mira': 0, 'bram': 0})
    # the Defend row's help
    page.keyboard.press('KeyX')
    page.evaluate(ADV.format(4))
    h = page.evaluate("LQ_ENGINE.scene.menu.helpText")
    if h != 'Shake off the cold.':
        raise AssertionError(f'the Defend help in a Rime battle: {h!r}')
    # a Frozen turn: the party swaps (never Defends) until a member Freezes
    page.evaluate("LQ_ENGINE.__frz = 0; (() => { const s = LQ_ENGINE.scene, f = s.runOp; s.runOp = function (op) { if (op.op === 'rime7Frozen') LQ_ENGINE.__frz++; return f.call(this, op); }; })()")
    for _ in range(40):
        menu_open(page)
        set_rime(page, {'hero': 2, 'mira': 2, 'bram': 2})   # QA lever: one cold hit from Frozen
        if page.evaluate("LQ_DEBUG.state().battle.phase !== 'play'"):
            break
        if page.evaluate("LQ_ENGINE.__frz > 0"):
            break
        act(page, {'type': 'swap'})
        ab.advance_until(page, "LQ_ENGINE.__frz > 0 || " + ab.WAIT_MENU, max_frames=3000, step=1)
        if page.evaluate("LQ_ENGINE.__frz > 0"):
            e5.filmstrip(page, ctx, 'frozen', 8, 5)
            break
    if not page.evaluate("LQ_ENGINE.__frz > 0"):
        raise AssertionError('nobody Froze')
    menu_open(page)
    if page.evaluate("Object.keys(LQ_ENGINE.scene.rime7.frozen).length > 0"):
        zooms(page, ctx, 'frozen')
        name_contrast(page, ctx, 'frozen')
    ab.shot(page, ctx, 'frozen')
    to_end(page, ctx)


def sc_e7v2_mixed(page, ctx):
    setup(page, 'e7v2_mixed', 2, level=30)
    sturdy(page)
    menu_open(page)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'open')
    rows_check(page, ctx, 'open')
    e5.rows_zoom(page, ctx, 'open')
    to_end(page, ctx)


def sc_e7v3_pages(page, ctx):
    setup(page, 'e7v3_pages', 4, level=30)
    sturdy(page)
    menu_open(page)
    # the aurora: three frames, one every 30; the sky's mean luma (the layer over the stage) between them
    vals = []
    for i in range(4):
        page.evaluate(ADV.format(30))
        vals.append(luma(page, 0, 0, 384, 110)['mean'])
    steps = [abs(vals[i + 1] - vals[i]) for i in range(3)]
    ctx['note'] += f" aurora sky luma {[round(v, 3) for v in vals]} steps {[round(s, 4) for s in steps]};"
    if max(steps) > 0.05:
        raise AssertionError(f'aurora step over +0.05 luma: {steps}')
    ab.shot(page, ctx, 'aurora')
    rows_check(page, ctx, 'open')
    to_end(page, ctx)


def call_by_keys(page, ctx, tag, want_target=None):
    """The hero's menu: Tech opens on Call in gold, the cursor on the pin's target (or the Stilled ally); confirm casts. Keys only."""
    menu_open(page)
    m = page.evaluate("(() => { const M = LQ_ENGINE.scene.menu; return { state: M.state, item: M.root && M.root.item.id }; })()")
    if m['item'] != 'tech':
        raise AssertionError(f'{tag}: the root does not open on Tech: {m}')
    page.keyboard.press('KeyZ'); page.evaluate(ADV.format(6))
    sub = page.evaluate("(() => { const M = LQ_ENGINE.scene.menu; return M.sub ? { ids: M.sub.items.map(i => i.id), color: M.sub.items[0].color, index: M.sub.index } : null; })()")
    if not sub or sub['ids'][0] != 'call_name' or sub['color'] != 'gold' or sub['index'] != 0:
        raise AssertionError(f'{tag}: Call is not first in gold: {sub}')
    page.evaluate(ADV.format(10))
    e5.zoom(page, ctx, f"{ctx['device']}_{tag}_tech", (0, 40, 200, 176), scale=3)
    page.keyboard.press('KeyZ'); page.evaluate(ADV.format(6))
    t = page.evaluate("LQ_ENGINE.scene.menu.state === 'target' ? LQ_ENGINE.scene.menu.currentTarget() : null")
    if want_target and t != want_target:
        raise AssertionError(f'{tag}: the cursor opens on {t}, not {want_target}')
    page.evaluate(ADV.format(10))
    ab.shot(page, ctx, f'{tag}-target')
    page.keyboard.press('KeyZ'); page.evaluate(ADV.format(2))
    return t


def sc_pale_lantern(page, ctx):
    setup(page, 'pale_lantern', 2, level=29)
    sturdy(page)
    page.evaluate(ADV.format(20))
    ab.shot(page, ctx, 'card')
    play_until(page, "!!(LQ_ENGINE.scene.b.state.rime.pin) && LQ_ENGINE.scene.b.current().id === 'hero'", turns=30)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'borrow')
    zooms(page, ctx, 'borrow')
    pin = page.evaluate("LQ_ENGINE.scene.b.state.rime.pin.target")
    call_by_keys(page, ctx, 'call', pin)
    e5.filmstrip(page, ctx, 'break', 8, 6)
    ab.advance_until(page, "!LQ_ENGINE.scene.b.state.rime.pin", max_frames=600, step=4)
    menu_open(page)
    ab.shot(page, ctx, 'broken')
    # the hood: QA lever, the Lantern's HP just over half, then a hit
    page.evaluate("(() => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'pale_lantern'); u.hp = Math.floor(u.maxHp * 0.5) + 5; })()")
    play_until(page, "LQ_ENGINE.scene.b.units().some(u => u.id === 'snow_wisp')", turns=12,
               action=lambda p: {'type': 'attack', 'target': p.evaluate("LQ_ENGINE.scene.b.units().find(x => x.id === 'pale_lantern').uid")})
    page.evaluate(ADV.format(20))
    ab.shot(page, ctx, 'wisps')
    rows_check(page, ctx, 'wisps')
    to_end(page, ctx)


def sc_white_phantom(page, ctx):
    setup(page, 'white_phantom', 3, level=30)
    sturdy(page)
    page.evaluate(ADV.format(20))
    ab.shot(page, ctx, 'card')
    menu_open(page)
    rows_check(page, ctx, 'look1')
    e5.rows_zoom(page, ctx, 'look1')
    xs = [page.evaluate(ROWS)['rows'][0]]
    # 1. a Farewell pinned, broken by Call (keys)
    play_until(page, "!!(LQ_ENGINE.scene.b.state.rime.pin) && LQ_ENGINE.scene.b.current().id === 'hero'", turns=30)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'farewell')
    zooms(page, ctx, 'farewell')
    help_line = page.evaluate("(() => { const s = LQ_ENGINE.scene; return [...s.telegraphs.values()].map(t => t.text); })()")
    ctx['note'] += f" pin line {help_line[:1]};"
    pin = page.evaluate("LQ_ENGINE.scene.b.state.rime.pin.target")
    call_by_keys(page, ctx, 'call', pin)
    e5.filmstrip(page, ctx, 'break', 8, 6)
    ab.advance_until(page, "!LQ_ENGINE.scene.b.state.rime.pin", max_frames=600, step=4)
    # 2. a farewell landed: the hero Defends through the next pin
    landed = play_until(page, "Object.keys(LQ_ENGINE.scene.b.state.rime.stilled).length > 0 && LQ_ENGINE.scene.b.current().id === 'hero'", turns=40)
    if not landed:
        raise AssertionError('no farewell landed')
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'stilled')
    zooms(page, ctx, 'stilled')
    name_contrast(page, ctx, 'stilled')
    still = page.evaluate("Object.keys(LQ_ENGINE.scene.b.state.rime.stilled)[0]")
    call_by_keys(page, ctx, 'call-stilled', still)
    ab.advance_until(page, "Object.keys(LQ_ENGINE.scene.b.state.rime.stilled).length === 0", max_frames=900, step=4)
    menu_open(page)
    ab.shot(page, ctx, 'back')
    # 3. the Ward: QA lever, the Phantom just over its 68% lock, then attacks until the Gate and the Letter stand
    page.evaluate("(() => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'white_phantom'); u.hp = Math.floor(u.maxHp * 0.68) + 10; u.shields = 99; })()")
    boss = lambda p: {'type': 'attack', 'target': p.evaluate("LQ_ENGINE.scene.b.units().find(x => x.id === 'white_phantom').uid")}
    play_until(page, "LQ_ENGINE.scene.b.units().some(u => u.id === 'lost_letter' && u.alive)", turns=12, action=boss)
    page.evaluate(ADV.format(40))
    ab.shot(page, ctx, 'ward')
    e5.rows_zoom(page, ctx, 'ward')
    m = rows_check(page, ctx, 'ward')
    xs.append([r for r in m['rows'] if r['id'] == 'white_phantom'][0])
    frozen = stage_luma(page)
    # 4. the thaw: QA lever, both adds at 1 HP, then attacks on them
    page.evaluate("(() => { for (const u of LQ_ENGINE.scene.b.units()) if (u.id === 'closed_gate' || u.id === 'lost_letter') { u.hp = 1; u.shields = 0; } })()")
    add = lambda p: {'type': 'attack', 'target': p.evaluate("(LQ_ENGINE.scene.b.units().find(x => (x.id === 'closed_gate' || x.id === 'lost_letter') && x.alive) || LQ_ENGINE.scene.b.units().find(x => x.side === 'enemy' && x.alive)).uid")}
    play_until(page, "!LQ_ENGINE.scene.b.units().some(u => (u.id === 'closed_gate' || u.id === 'lost_letter') && u.alive)", turns=12, action=add)
    e5.filmstrip(page, ctx, 'thaw', 8, 6)
    ab.advance_until(page, "LQ_ENGINE.scene.st7 && LQ_ENGINE.scene.st7.k >= 1", max_frames=900, step=10)
    menu_open(page)
    thaw = stage_luma(page)
    ctx['note'] += f" stage sky luma frozen {frozen:.3f} thaw {thaw:.3f};"
    if thaw - frozen < 0.10:
        raise AssertionError(f'the thaw grade is not 0.10 above the frozen one ({frozen:.3f} -> {thaw:.3f})')
    page.evaluate(ADV.format(20))
    ab.shot(page, ctx, 'thaw')
    m = rows_check(page, ctx, 'look3')
    xs.append([r for r in m['rows'] if r['id'] == 'white_phantom'][0])
    e5.rows_zoom(page, ctx, 'look3')
    looks = page.evaluate("LQ_ENGINE.scene.actors.get(LQ_ENGINE.scene.b.units().find(x => x.id === 'white_phantom').uid).artId")
    ctx['note'] += f" look {looks};"
    if len({(r['x'], r['y']) for r in xs}) != 1:
        raise AssertionError(f"the Phantom's row moved between looks: {xs}")
    to_end(page, ctx)


SCENARIOS = {
    'e7w_first': (sc_e7w_first, ('desktop', 'phone')),
    'e7v2_mixed': (sc_e7v2_mixed, ('desktop', 'phone')),
    'e7v3_pages': (sc_e7v3_pages, ('desktop', 'phone')),
    'pale_lantern': (sc_pale_lantern, ('desktop', 'phone')),
    'white_phantom': (sc_white_phantom, ('desktop', 'phone')),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='')
    ap.add_argument('--timeout', type=int, default=1500)
    args = ap.parse_args()
    names = [n.strip() for n in args.only.split(',') if n.strip()] or list(SCENARIOS)
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(args.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep6,ep7'
    report, failures = [], 0
    from playwright.sync_api import sync_playwright, Error as PwError
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname, dev in DEVICES.items():
            if args.device and dname not in args.device.split(','):
                continue
            context = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                          is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
            context.set_default_timeout(30000)
            for name in names:
                fn, devs = SCENARIOS[name]
                if dname not in devs:
                    continue
                page = context.new_page()
                page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
                errors = []
                page.on('console', lambda msg, errors=errors: errors.append(f'console.error: {msg.text}') if msg.type == 'error' and '404' not in msg.text else None)
                page.on('pageerror', lambda e, errors=errors: errors.append(f'pageerror: {e}'))
                ctx = {'device': dname, 'name': name, 'files': [], 'note': ''}
                t0 = time.time()
                status, detail = 'ok', ''
                try:
                    page.goto(base, wait_until='load')
                    page.wait_for_function('window.LQ_DEBUG && true', timeout=20000)
                    page.evaluate('LQ_DEBUG.ready()')
                    fn(page, ctx)
                    errs = page.evaluate('LQ_DEBUG.errors()')
                    if errs:
                        errors.extend(f'engine: {e["msg"]}' for e in errs)
                except Exception as e:  # noqa: BLE001
                    status, detail = 'FAIL', str(e).splitlines()[0][:400]
                    try:
                        page.screenshot(path=str(OUT / f'{dname}-{name}-FAILED.png'))
                    except PwError:
                        pass
                if errors and status == 'ok':
                    status = 'FAIL'
                if errors:
                    detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:4])
                failures += status != 'ok'
                print(f'{status:<4} {dname:<8} {name:<14} {int((time.time() - t0) * 1000):>7} ms {ctx["note"]} {detail}', flush=True)
                report.append({'device': dname, 'scenario': name, 'status': status, 'detail': detail, 'note': ctx['note'], 'files': ctx['files'],
                               'measures': ctx.get('measures', [])})
                page.close()
            context.close()
        browser.close()
    server.shutdown()
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'\n{len(report) - failures}/{len(report)} scenarios ok; PNGs in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
