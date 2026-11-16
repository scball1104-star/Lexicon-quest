"""Episode 8 battle-scene shots and readability measures (E8-scene-ui), headless Chromium with the ep8 pack (which brings ep3 to ep7).
Uses the helpers of autobattle.py. QA levers (page code) set the stage; LQ_DEBUG.battleAct plays the turns (the menu paths are proved by
ep8_menu_cast.test.mjs and qa/realplay/ep8battle.py, never here).

  python next/qa/battlescene/ep8_shots.py                       every scenario, desktop + phone
  python next/qa/battlescene/ep8_shots.py --only eraser --device phone

Scenarios (PNGs in next/qa/battlescene/out/ep8/, zooms of the party window, the timeline, the rows and the menu):
  eraser   the card and its arc line; the Closed Book with its row over the hood; an Unwrite pinned on Mira (the grey ribbon on the stage
           and under the timeline, the hint line); her Magic list opening on Read Aloud in gold with its icon; the read filmed; a rubbed
           Attack row and a rubbed Magic row (smudged, the pips, the crumbs under the names, the smudged timeline heads) measured on the
           phone (the word at least 0.15 luma off its box); the Rejected Truths (Grief and Change in their slots, rows under their feet,
           12 px clear of the party); the Keeper Remembers on the gold grade (measured: at least 0.10 above the violet); the Last Silence
           (the white-out measured: under +0.15 luma; the charge bar over the Eraser's row; the hero's Tech list on Answer in gold)
  sentry   the card, the Sentry's row under its feet, an Unwrite pinned
Every scenario checks the Eraser's row stays on one anchor across the four looks and fails on any console error.
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
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out' / 'ep8'
ab.OUT = OUT
ADV = ab.ADVANCE
DEVICES = {k: v for k, v in ab.DEVICES.items() if k in ('desktop', 'phone')}

SETUP = """async ([enc, seed, level]) => {
  for (const k of ['ep4', 'ep5', 'ep6', 'ep7', 'ep8']) LQ_PACKS.forcePack(k);
  LQ_PACKS.ensurePack('ep8');
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp8'))) {
    if (Date.now() - t0 > 150000) throw new Error('newGameEp8 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp8('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  const { LOADOUTS } = await import('./tools/sim/ep8.mjs'), { memberMax } = await import('./src/game/state.js');
  const L = LOADOUTS[enc === 'eraser' ? 'ep8_last_word' : 'ep8_library_f2'];
  for (const m of g.party) {
    const r = L[m.id];
    m.weapon = r.weapon; m.equip = { ...Object.fromEntries(Object.keys(m.equip).map((k) => [k, null])), ...r.equip };
    m.mastery = { ...m.mastery, ...r.mastery }; m.level = level;
    const s = memberMax(m); m.hp = s.hp; m.mp = s.mp;
  }
  g.items = { ...L.inventory };
  for (const f of L.flags || []) g.flags[f] = true;
  g.flags.read_learned = true;
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1, battleCursor: 'last' });
  LQ_DEBUG.setSpeed(0);
  LQ_DEBUG.battle(enc, { seed, canFlee: false });
  return true;
}"""
STURDY = "(() => { for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.maxHp = Math.max(u.maxHp, 9999); u.hp = u.maxHp; } })()"
CUR = "(() => { const u = LQ_ENGINE.scene.b.current(); return u ? u.id : null; })()"
ER = "(LQ_ENGINE.scene.b.state.erasure || null)"
UID = "((id) => (LQ_ENGINE.scene.b.units().find(u => u.id === id) || {}).uid)"
GAME_LUMA = """((x, y, w, h) => { const c = LQ_ENGINE.renderer.canvas, g = c.getContext('2d'); const k = c.width / 384;
  const d = g.getImageData(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))).data;
  const L = (v) => v / 255; let s = 0, n = 0, mx = 0, mn = 1;
  for (let i = 0; i < d.length; i += 4) { const l = 0.299 * L(d[i]) + 0.587 * L(d[i + 1]) + 0.114 * L(d[i + 2]); s += l; n++; if (l > mx) mx = l; if (l < mn) mn = l; }
  return { mean: s / n, max: mx, min: mn }; })"""


def setup(page, enc, seed, level=33):
    page.evaluate(SETUP, [enc, seed, level])
    ab.advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase !== 'intro'", max_frames=400, step=2)
    ab.advance_until(page, "!!(LQ_ENGINE.scene.backdropLayer && LQ_ENGINE.scene.backdropLayer.usedAsset)", max_frames=600, step=10)
    if not page.evaluate("!!LQ_ENGINE.scene.er8"):
        raise AssertionError('no Erasure view: the battle has no erasing foe or the scene module did not register')


def luma(page, x, y, w, h):
    return page.evaluate(f"({GAME_LUMA})({x}, {y}, {w}, {h})")


def act(page, action):
    page.evaluate(f"LQ_DEBUG.battleAct({json.dumps(action)})")


def menu_open(page):
    ab.advance_until(page, ab.WAIT_MENU + " || ['rewards', 'victory', 'defeat'].includes(LQ_DEBUG.state().battle.phase)", max_frames=6000, step=4)


def play_until(page, js, turns=40, action=None):
    for _ in range(turns):
        menu_open(page)
        if page.evaluate(js):
            return True
        if page.evaluate("LQ_DEBUG.state().battle.phase !== 'play'"):
            return False
        act(page, action(page) if action else {'type': 'defend'})
    menu_open(page)
    return bool(page.evaluate(js))


def careful(page):
    return page.evaluate("(async () => { const { partyAction } = await import('./src/battle/ai.js'); return partyAction(LQ_ENGINE.scene.b, 'competent') || { type: 'defend' }; })()")


def zoom(page, ctx, name, region, scale=4):
    """autobattle.zoom, in device pixels (the phone shoots at dpr 3)."""
    from PIL import Image
    v = page.evaluate('LQ_DEBUG.view()')
    p = OUT / '_zoom_tmp.png'
    page.screenshot(path=str(p))
    im = Image.open(p)
    d = im.width / page.viewport_size['width']
    x0, y0, k = v['cssX'] * d, v['cssY'] * d, v['cssScale'] * d
    gx, gy, gw, gh = region
    crop = im.crop((int(x0 + gx * k), int(y0 + gy * k), int(x0 + (gx + gw) * k), int(y0 + (gy + gh) * k))).resize((gw * scale, gh * scale), Image.NEAREST)
    im.close(); p.unlink()
    path = OUT / f'_zoom_{name}.png'
    crop.save(path)
    ctx['files'].append(str(path))
    return path


def shot(page, ctx, tag):
    return ab.shot(page, ctx, tag)


ROWS = """(() => { const s = LQ_ENGINE.scene, touch = s.menu.touch;
  const uids = [...s.actors.values()].filter(a => a.side === 'enemy' && !a.dead).map(a => a.uid);
  const plan = s.planEnemyRows(uids, touch, null, 23);
  const rows = [...plan.entries()].map(([uid, p]) => ({ uid, id: s.actor(uid).id, x: p.rect.x, y: p.rect.y, w: p.rect.w, place: p.place || null, homeX: s.actor(uid).homeX, homeY: s.actor(uid).homeY }));
  const bodies = [...s.actors.values()].filter(a => !a.dead && !a.ko).map(a => ({ uid: a.uid, id: a.id, side: a.side, x: Math.round(a.homeX - a.w / 2), y: Math.round(a.homeY - a.h), w: a.w, h: a.h }));
  return { rows, bodies, touch }; })()"""


def rows_check(page, ctx, tag):
    """Each foe's row against every party body; Grief and Change (bodies and rows) at least 12 px from the party; rows never overlap."""
    m = page.evaluate(ROWS)
    bad = []
    party = [b for b in m['bodies'] if b['side'] == 'party']
    left = min(b['x'] + (b['w'] - 24) // 2 for b in party)
    for r in m['rows']:
        for b in party:
            if r['x'] < b['x'] + b['w'] and b['x'] < r['x'] + r['w'] and r['y'] < b['y'] + b['h'] and b['y'] < r['y'] + 14:
                bad.append((r['id'], 'party'))
        if r['id'] in ('truth_grief', 'truth_change') and left - (r['x'] + r['w']) < 12:
            bad.append((r['id'], 'row within 12 px of the party'))
    for b in m['bodies']:
        if b['id'] in ('truth_grief', 'truth_change') and left - (b['x'] + b['w']) < 12:
            bad.append((b['id'], f"body within 12 px of the party ({left - (b['x'] + b['w'])})"))
    rs = m['rows']
    for i in range(len(rs)):
        for j in range(i + 1, len(rs)):
            a, c = rs[i], rs[j]
            if a['x'] < c['x'] + c['w'] and c['x'] < a['x'] + a['w'] and a['y'] < c['y'] + 14 and c['y'] < a['y'] + 14:
                bad.append((a['id'], c['id'], 'rows overlap'))
    ctx.setdefault('measures', []).append({tag: m})
    if bad:
        raise AssertionError(f'{tag}: {bad}')
    return m


def eraser_row(page):
    m = page.evaluate(ROWS)
    r = [x for x in m['rows'] if x['id'] == 'eraser']
    return (r[0]['x'] - r[0]['homeX'], r[0]['y'] - r[0]['homeY']) if r else None


def stage_luma(page, rows=118):
    return page.evaluate(f"""(() => {{ const bl = LQ_ENGINE.scene.backdropLayer; const d = bl.ctx.getImageData(0, 0, bl.w, {rows}).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; return s / (d.length / 4) / 255; }})()""")


def smudge_measure(page, ctx, tag):
    """The rubbed rows of the open root menu: the word's brightest pixels against its box (at least 0.15) and the pips."""
    rows = page.evaluate("""(() => { const M = LQ_ENGINE.scene.menu, L = M.root; return L.items.map((it, i) => ({ i, id: it.id, rub: it.rub8 || null,
      label: it.label, rr: L.rowRect(i), tx: L.textX ?? 2, dy: L.textDy, w: LQ_ENGINE.renderer.measure(String(it.label || '')) })).filter(x => x.rub); })()""")
    out = []
    for r in rows:
        x, y = r['rr']['x'] + r['tx'], r['rr']['y'] + 1 + r['dy']
        word = luma(page, x, y, r['w'], 8)
        box = luma(page, r['rr']['x'] + 1, r['rr']['y'] + r['rr']['h'] - 2 if r['rr']['h'] > 12 else y + 9, 4, 1)
        box2 = luma(page, x + r['w'] + 3, y + 1, 3, 3)
        b = min(box['mean'], box2['mean'])
        out.append({'id': r['id'], 'word_max': round(word['max'], 3), 'box': round(b, 3), 'gap': round(word['max'] - b, 3), 'rub': r['rub']})
    ctx.setdefault('measures', []).append({tag: out})
    ctx['note'] += f" {tag} smudge gaps {[o['gap'] for o in out]};"
    for o in out:
        if o['gap'] < 0.15:
            raise AssertionError(f'{tag}: a smudged row too close to its box {o}')
    return out


def zooms(page, ctx, name):
    zoom(page, ctx, f"{ctx['device']}_{name}_party", (130, 150, 254, 64), scale=4)
    zoom(page, ctx, f"{ctx['device']}_{name}_timeline", (222, 0, 162, 44), scale=4)


def menu_zoom(page, ctx, name):
    zoom(page, ctx, f"{ctx['device']}_{name}_menu", (0, 40, 200, 176), scale=3)


def key(page, k, frames=6):
    page.keyboard.press(k)
    page.evaluate(ADV.format(frames))


# ------------------------------------------------------------------------------------------ scenarios
def sc_eraser(page, ctx):
    setup(page, 'eraser', 3)
    page.evaluate(STURDY)
    page.evaluate(ADV.format(20))
    shot(page, ctx, 'card')
    menu_open(page)
    anchors = [('eraser', eraser_row(page))]
    rows_check(page, ctx, 'look1')
    zoom(page, ctx, f"{ctx['device']}_look1_rows", (0, 0, 230, 152), scale=3)
    shot(page, ctx, 'look1')
    # 1. an Unwrite pinned on Mira (Mira attacks, so her Attack is what the ink takes and the pin picks her)
    steer = lambda p: ({'type': 'attack', 'target': p.evaluate(UID + "('eraser')")} if p.evaluate(CUR) == 'mira' else {'type': 'defend'})
    ok = play_until(page, f"(() => {{ const S = {ER}; return !!(S && S.pin) && LQ_ENGINE.scene.b.current().id === 'mira' && !S.unwritten[LQ_ENGINE.scene.b.current().uid]; }})()", turns=40, action=steer)
    if not ok:
        raise AssertionError('no Unwrite pinned at Mira\'s turn')
    page.evaluate(ADV.format(30))
    shot(page, ctx, 'pin')
    zooms(page, ctx, 'pin')
    zoom(page, ctx, f"{ctx['device']}_pin_stage", (60, 20, 324, 132), scale=3)
    m = page.evaluate("(() => { const M = LQ_ENGINE.scene.menu; return { item: M.root && M.root.item.id, help: [...LQ_ENGINE.scene.telegraphs.values()].map(t => t.text) }; })()")
    ctx['note'] += f" pin line {m['help'][:1]};"
    if m['item'] != 'magic':
        raise AssertionError(f'Mira\'s root does not open on Magic: {m}')
    key(page, 'KeyZ')
    sub = page.evaluate("(() => { const M = LQ_ENGINE.scene.menu; return M.sub ? { ids: M.sub.items.map(i => i.id), color: M.sub.items[0].color, index: M.sub.index } : null; })()")
    if not sub or sub['ids'][0] != 'read_aloud' or sub['color'] != 'gold':
        raise AssertionError(f'Read Aloud is not first in gold: {sub}')
    page.evaluate(ADV.format(10))
    menu_zoom(page, ctx, 'read_list')
    shot(page, ctx, 'read-list')
    key(page, 'KeyZ')
    shot(page, ctx, 'read-target')
    key(page, 'KeyZ', 2)
    ab.filmstrip(page, ctx, 'read', 8, 6)
    ab.advance_until(page, f"!({ER}.pin)", max_frames=900, step=4)
    # 2. rubbed rows: a QA lever rubs Bram's Attack and Mira's Magic (the counts as the rule sets them), then Bram's turn
    page.evaluate(f"""(() => {{ const b = LQ_ENGINE.scene.b, S = b.state.erasure; const m = b.units().find(u => u.id === 'mira'), br = b.units().find(u => u.id === 'bram');
      S.rub[br.uid] = [{{ cmd: 'attack', left: 2 }}, {{ cmd: 'item', left: 1 }}]; S.rub[m.uid] = [{{ cmd: 'magic', left: 2 }}]; S.last[br.uid] = 'attack'; return true; }})()""")
    play_until(page, "LQ_ENGINE.scene.b.current().id === 'bram'", turns=4)
    page.evaluate(ADV.format(12))
    shot(page, ctx, 'rubbed')
    zooms(page, ctx, 'rubbed')
    menu_zoom(page, ctx, 'rubbed_root')
    smudge_measure(page, ctx, 'rubbed')
    # the help of a rubbed row under the cursor
    page.evaluate("(() => { const M = LQ_ENGINE.scene.menu; M.root.moveTo(M.root.items.findIndex(x => x.id === 'attack')); M.showHelp = true; M.syncHelp(); })()")
    page.evaluate(ADV.format(4))
    shot(page, ctx, 'rubbed-help')
    act(page, {'type': 'defend'})
    # 3. the Rejected Truths: QA lever, the Eraser just over its 70% lock, then the careful policy until both stand
    page.evaluate("(() => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'eraser'); u.hp = Math.floor(u.maxHp * 0.70) + 6; })()")
    play_until(page, "LQ_ENGINE.scene.b.units().some(u => u.id === 'truth_change' && u.alive)", turns=14, action=careful)
    page.evaluate(ADV.format(40))
    menu_open(page)
    shot(page, ctx, 'truths')
    zoom(page, ctx, f"{ctx['device']}_truths_rows", (0, 0, 300, 152), scale=3)
    rows_check(page, ctx, 'truths')
    anchors.append(('eraser_truths', eraser_row(page)))
    violet = stage_luma(page)
    # 4. the Keeper Remembers: both Truths at 1 HP, the careful policy breaks the ward; the gold grade cross-fades in
    page.evaluate("(() => { for (const u of LQ_ENGINE.scene.b.units()) if ((u.id === 'truth_grief' || u.id === 'truth_change') && u.alive) { u.hp = 1; u.shields = 0; } })()")
    play_until(page, "!LQ_ENGINE.scene.b.units().some(u => (u.id === 'truth_grief' || u.id === 'truth_change') && u.alive)", turns=14, action=careful)
    ab.advance_until(page, "LQ_ENGINE.scene.st8 && LQ_ENGINE.scene.st8.k >= 1", max_frames=900, step=10)
    menu_open(page)
    gold = stage_luma(page)
    ctx['note'] += f" stage sky luma violet {violet:.3f} gold {gold:.3f};"
    if gold - violet < 0.10:
        raise AssertionError(f'the gold grade is not 0.10 above the violet ({violet:.3f} -> {gold:.3f})')
    shot(page, ctx, 'remembers')
    rows_check(page, ctx, 'remembers')
    anchors.append(('eraser_remembers', eraser_row(page)))
    # 5. the Last Silence: the Eraser just over 26%, the careful policy until it charges on the hero's turn
    page.evaluate("(() => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'eraser'); u.hp = Math.floor(u.maxHp * 0.26) + 6; })()")
    ok = play_until(page, "LQ_ENGINE.scene.b.current().id === 'hero' && LQ_ENGINE.scene.b.living('enemy').some(u => u.charging && u.charging.skill === 'last_silence')", turns=20, action=careful)
    if not ok:
        raise AssertionError('no Last Silence on the hero\'s turn')
    before = luma(page, 0, 0, 384, 150)['mean']
    ab.advance_until(page, "LQ_ENGINE.scene.st8 && LQ_ENGINE.scene.st8.wk >= 1", max_frames=600, step=6)
    page.evaluate(ADV.format(6))
    shot(page, ctx, 'silence')
    zoom(page, ctx, f"{ctx['device']}_silence_row", (0, 0, 230, 60), scale=4)
    zooms(page, ctx, 'silence')
    wk = page.evaluate("({ wk: LQ_ENGINE.scene.st8.wk, a: LQ_ENGINE.scene.st8.white.alpha })")
    ctx['note'] += f" white-out alpha {wk['a'] * wk['wk']:.3f} (cap 0.15);"
    if wk['a'] * wk['wk'] > 0.15 + 1e-6:
        raise AssertionError(f'the white-out over its cap {wk}')
    anchors.append(('eraser_silence', eraser_row(page)))
    rows_check(page, ctx, 'silence')
    key(page, 'KeyZ') if page.evaluate("LQ_ENGINE.scene.menu.root.item.id") == 'tech' else None
    sub = page.evaluate("(() => { const M = LQ_ENGINE.scene.menu; return M.sub ? { ids: M.sub.items.map(i => i.id), color: M.sub.items[0].color } : null; })()")
    if not sub or sub['ids'][0] != 'answer' or sub['color'] != 'gold':
        raise AssertionError(f'Answer is not first in gold: {sub}')
    page.evaluate(ADV.format(8))
    menu_zoom(page, ctx, 'answer_list')
    shot(page, ctx, 'answer-list')
    ctx['note'] += f" anchors {anchors}; stage before dim {before:.3f};"
    if len({a[1] for a in anchors}) != 1:
        raise AssertionError(f"the Eraser's row moved between looks: {anchors}")


def sc_sentry(page, ctx):
    setup(page, 'unnamed_sentry', 3, level=32)
    page.evaluate(STURDY)
    page.evaluate(ADV.format(20))
    shot(page, ctx, 'card')
    menu_open(page)
    rows_check(page, ctx, 'sentry')
    zoom(page, ctx, f"{ctx['device']}_sentry_rows", (0, 0, 300, 152), scale=3)
    play_until(page, f"!!({ER} && {ER}.pin)", turns=20)
    page.evaluate(ADV.format(30))
    shot(page, ctx, 'pin')
    rows_check(page, ctx, 'sentry-pin')


SCENARIOS = {'eraser': sc_eraser, 'sentry': sc_sentry}


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
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep8&ep=8'
    report, failures = [], 0
    from playwright.sync_api import sync_playwright, Error as PwError
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname, dev in DEVICES.items():
            if args.device and dname not in args.device.split(','):
                continue
            context = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                          is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
            context.set_default_timeout(60000)
            for name in names:
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
                    SCENARIOS[name](page, ctx)
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
                    status, detail = 'FAIL', errors[0][:300]
                failures += status != 'ok'
                print(f"{status:<5} {dname:<8} {name:<8} {time.time() - t0:6.1f} s {ctx['note'][:600]} {detail}", flush=True)
                report.append({**ctx, 'status': status, 'detail': detail, 'errors': errors[:5]})
                page.close()
            context.close()
        browser.close()
    (OUT / 'report.json').write_text(json.dumps(report, indent=1, default=str), encoding='utf-8')
    server.shutdown()
    print('EP8_SHOTS: ' + ('PASS' if not failures else f'FAIL ({failures})'))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
