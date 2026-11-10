"""Episode 6 battle-scene checks (E6-scene-ui), headless Chromium with ?pack=ep5,ep6. Uses the helpers of autobattle.py and
ep5_autobattle.py.

  python next/qa/battlescene/ep6_autobattle.py                       every scenario, desktop + phone
  python next/qa/battlescene/ep6_autobattle.py --only scribe --device phone

Scenarios (PNGs in next/qa/battlescene/out/ep6/, filmstrips and 4x zooms of the timeline and the rows):
  e6a_first    the Airstair stage, two Aloft Harriers, the Gust 3 actions away: the gauge and the marker; the first Gust filmed
               (the streaks, the heads sliding); Auto to the end
  e6o1_mixed   the Causeways: a grounded wolf and an Aloft wraith in one group (the feather on one row only); a Gust filmed
  gale_engine  the relays: the card and its arc line, the brass gauge at 3 (the bellows), Full Blast pinned (the red star on the
               marker), Bram's Tech list opening on Anchor in gold, Anchor cast, the blast broken at the Gust (filmed); the vents and
               the sprites riding out; Auto to the end
  scribe       the Eyrie in the storm grade (rain, a lightning flash); the Rewrite pinned (the red quill), Anchor, the break filmed
               (rewrite_break read back); the ward (the Beacon and the Compass in their spots, the lamplight ring); the ward torn
               (the clear grade cross-fade measured); the True Sky Chart look; Auto to the end
Every scenario measures the Aloft badge and the Gust marker against their boxes (Rec.709 luma on the screen, the 844x390 rule of
CRITIQUE_6 item 1: at least 0.15 above) and checks each foe's weakness row stays clear of every body.
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

OUT = HERE / 'out' / 'ep6'
ab.OUT = OUT
e5.OUT = OUT
ADV = ab.ADVANCE
DEVICES = {k: v for k, v in ab.DEVICES.items() if k in ('desktop', 'phone')}
GV = "(LQ_ENGINE.scene.gale6 || null)"


def setup(page, enc, seed, level=None, flags=None):
    page.evaluate("LQ_PACKS.forcePack('ep4'); LQ_PACKS.forcePack('ep5'); LQ_PACKS.forcePack('ep6')")
    page.evaluate("LQ_PACKS.ensurePack('ep6')")
    page.wait_for_function("LQ_PACKS.packReady && LQ_PACKS.packReady('ep6') && !!LQ_DEBUG.newGameEp6", timeout=60000)
    page.evaluate("LQ_DEBUG.newGameEp6('Arden', { slot: 1, scene: 'none' })")
    page.evaluate("(() => { const g = LQ_ENGINE.game; g.flags.anchor_learned = true; for (const f of %s) g.flags[f] = true; g.items.ballast_stone = 2; })()" % json.dumps(flags or []))
    if level:
        page.evaluate(f"(() => {{ for (const m of LQ_ENGINE.game.party) m.level = {level}; }})()")
    page.evaluate("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1, battleCursor: 'last' })")
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ seed: {seed}, canFlee: false }})")
    ab.advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase !== 'intro'", max_frames=400, step=2)
    # the painted stage arrives a few frames later (a pack file): wait on usedAsset, never on `painted` (E5's lesson)
    ab.advance_until(page, "!!(LQ_ENGINE.scene.backdropLayer && LQ_ENGINE.scene.backdropLayer.usedAsset)", max_frames=600, step=10)


def gale(page):
    return page.evaluate(f"(() => {{ const g = {GV}; return g && {{ gustIn: g.gustIn, every: g.every, pinned: g.pinned, slides: g.slides.length }}; }})()")


def act(page, action):
    page.evaluate(f"LQ_DEBUG.battleAct({json.dumps(action)})")


def menu_open(page):
    ab.advance_until(page, ab.WAIT_MENU + " || ['rewards', 'victory', 'defeat'].includes(LQ_DEBUG.state().battle.phase)", max_frames=3000, step=4)


def defend_until(page, js, turns=30, prep=None):
    """Party Defends (enemies act) until `js` holds at a party menu. True when it did. `prep`: a QA lever run before each turn."""
    for _ in range(turns):
        menu_open(page)
        if page.evaluate(js):
            return True
        if page.evaluate("LQ_DEBUG.state().battle.phase !== 'play'"):
            return False
        if prep:
            page.evaluate(prep)
        act(page, {'type': 'defend'})
    menu_open(page)
    return bool(page.evaluate(js))


# QA lever: the Engine, blown back by every Gust while the party braces, comes to the front of the line each turn
LEVER_ENGINE = "(() => { const b = LQ_ENGINE.scene.b, u = b.units().find(x => x.id === 'gale_engine'); if (u && !b.state.gale.pinned) u.next = b.state.now; })()"


def gust_near(page, n=1):
    """QA lever: the Gust falls after `n` more actions (the rules' Gale and the scene's view together)."""
    page.evaluate(f"(() => {{ const s = LQ_ENGINE.scene; s.b.state.gale.gustIn = {n}; s.gale6.gustIn = {n}; }})()")


MEASURE = """(() => {
  const s = LQ_ENGINE.scene, gv = s.gale6;
  if (!gv) return null;
  const rows = s._gale6Rows ? [...s._gale6Rows.entries()].map(([uid, p]) => ({ uid, x: p.rect.x, y: p.rect.y, w: p.rect.w, place: p.place || null, aloft: p.know && p.know.reflect === 'aloft' })) : [];
  const bodies = [...s.actors.values()].filter(a => !a.dead && !a.ko && a.side !== 'marker').map(a => ({ uid: a.uid, id: a.id, side: a.side, x: Math.round(a.x - a.w / 2), y: Math.round(a.y - a.h), w: a.w, h: a.h }));
  return { rows, bodies, gustIn: gv.gustIn, order: s.timeline.length, pinned: !!gv.pinned };
})()"""


def measure(page, ctx, tag):
    """The Aloft badges and the Gust marker against their boxes (game pixels read from a screenshot), and every row clear of
    every body (a row may sit in a foe's own feet band: the bottom 15% of its frame; the Scribe's phone row, place 'band', keeps
    its one anchor over its own wing in every look, E6-fixes A2, and must stay left of the timeline and its Gust gauge)."""
    from PIL import Image
    m = page.evaluate(MEASURE)
    if not m:
        return None
    touch = page.evaluate("LQ_ENGINE.scene.menu.touch")   # desktop rows sit at the feet (the core anchor): head and chest only
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, k = v['cssX'], v['cssY'], v['cssScale']
    p = OUT / '_measure.png'
    page.screenshot(path=str(p))
    im = Image.open(p).convert('RGB')
    dpr = im.width / page.viewport_size['width']

    def mean(gx, gy, gw, gh):
        vals = [e5.lum(im.getpixel((int((x0 + (gx + i + 0.5) * k) * dpr), int((y0 + (gy + j + 0.5) * k) * dpr))))
                for j in range(gh) for i in range(gw)]
        return sum(vals) / len(vals)

    out = {'badges': [], 'marker': None}
    for r in m['rows']:
        if not r['aloft']:
            continue
        bx, by = r['x'] + 15 + 2, r['y'] + 1     # the badge tile (10 x 10) inside its 12 x 12 slot
        badge = mean(bx + 2, by + 2, 6, 6)
        box = (mean(bx - 1, by - 1, 12, 1) + mean(bx - 1, by + 10, 12, 1)) / 2
        out['badges'].append({'uid': r['uid'], 'badge': round(badge, 3), 'box': round(box, 3), 'gap': round(badge - box, 3)})
    at = max(1, min(int(m['gustIn']), 7))
    sx = 228 + 19 + (at - 1) * 18
    disc = mean(sx + 4, 6 + 4, 10, 10)
    tile = (mean(sx + 1, 6, 16, 1) + mean(sx + 1, 6 + 17, 16, 1)) / 2
    out['marker'] = {'slot': at, 'disc': round(disc, 3), 'box': round(tile, 3), 'gap': round(disc - tile, 3)}
    clash = []
    for r in m['rows']:
        if r.get('place') == 'band' and r['x'] + r['w'] > 224:
            clash.append((r['uid'], 'the timeline and its gauge'))
        for b in m['bodies']:
            if r.get('place') == 'band' and b['uid'] == r['uid']:
                continue
            feet = int(b['h'] * (0.85 if touch else 0.55)) if b['uid'] == r['uid'] else b['h']
            top = {'x': b['x'], 'y': b['y'], 'w': b['w'], 'h': feet}
            if r['x'] < top['x'] + top['w'] and top['x'] < r['x'] + r['w'] and r['y'] < top['y'] + top['h'] and top['y'] < r['y'] + 14:
                clash.append((r['uid'], b['id']))
    out['clash'] = clash
    im.close()
    p.unlink()
    ctx.setdefault('measures', []).append({tag: out})
    return out


def check(meas, ctx, need_badge=True):
    if not meas:
        raise AssertionError('no Gale view')
    if need_badge and not meas['badges']:
        raise AssertionError('no Aloft badge measured')
    for b in meas['badges']:
        if b['gap'] < 0.15:
            raise AssertionError(f"Aloft badge contrast {b}")
    if meas['marker']['gap'] < 0.15:
        raise AssertionError(f"Gust marker contrast {meas['marker']}")
    if meas['clash']:
        raise AssertionError(f"a weakness row crosses a body: {meas['clash']}")
    ctx['note'] += f" badge {min([b['gap'] for b in meas['badges']] or [0]):.2f} marker {meas['marker']['gap']:.2f};"


def stage_luma(page, rows=118):
    """Mean luma of the stage layer's sky rows (the backdrop canvas itself, no units)."""
    return page.evaluate(f"""(() => {{ const bl = LQ_ENGINE.scene.backdropLayer; const d = bl.ctx.getImageData(0, 0, bl.w, {rows}).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4) / 255; }})()""")


def to_end(page, ctx):
    page.evaluate("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    ab.advance_until(page, "LQ_DEBUG.state().battle == null || ['rewards', 'victory', 'defeat'].includes(LQ_DEBUG.state().battle.phase)", max_frames=60000, step=60)


# ------------------------------------------------------------------------------------------ scenarios
def sc_first(page, ctx):
    setup(page, 'e6a_first', 3, level=25)
    menu_open(page)
    g = gale(page)
    if not g or g['gustIn'] != 3:
        raise AssertionError(f'the first Gust is 3 actions away: {g}')
    page.evaluate(ADV.format(40))
    ab.shot(page, ctx, 'open')
    e5.tl_zoom(page, ctx, 'open')
    e5.rows_zoom(page, ctx, 'open')
    check(measure(page, ctx, 'open'), ctx)
    gust_near(page, 1)
    act(page, {'type': 'defend'})
    e5.filmstrip(page, ctx, 'gust', 12, 4)
    ab.advance_until(page, "LQ_ENGINE.scene.gale6.slides.length > 0", max_frames=300, step=1)
    e5.tl_zoom(page, ctx, 'slide')
    menu_open(page)
    ab.shot(page, ctx, 'after-gust')
    to_end(page, ctx)


def sc_mixed(page, ctx):
    setup(page, 'e6o1_mixed', 4, level=25)
    menu_open(page)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'open')
    e5.rows_zoom(page, ctx, 'open')
    m = measure(page, ctx, 'open')
    check(m, ctx)
    aloft = page.evaluate("[...LQ_ENGINE.scene.actors.values()].filter(a => a.side === 'enemy').map(a => [a.id, !!a.aloft6])")
    if sorted(aloft) != sorted([['squall_wolf', False], ['signal_wraith', True]]):
        raise AssertionError(f'one Aloft, one grounded: {aloft}')
    ctx['note'] += f' aloft {aloft};'
    gust_near(page, 1)
    act(page, {'type': 'defend'})
    e5.filmstrip(page, ctx, 'gust', 8, 5)
    to_end(page, ctx)


def sc_engine(page, ctx):
    setup(page, 'gale_engine', 6, level=26)
    page.evaluate(ADV.format(20))
    ab.shot(page, ctx, 'card')
    menu_open(page)
    g = gale(page)
    if g['every'] != 3:
        raise AssertionError(f'the bellows: the Gust every 3 ({g})')
    e5.tl_zoom(page, ctx, 'bellows')
    if not defend_until(page, "!!(LQ_ENGINE.scene.gale6.pinned && LQ_DEBUG.state().battle.current === 'bram')", turns=40, prep=LEVER_ENGINE):
        raise AssertionError('Full Blast never pinned on Bram\'s turn')
    page.evaluate(ADV.format(10))
    ab.shot(page, ctx, 'blast-pinned')
    e5.tl_zoom(page, ctx, 'blast-pinned')
    check(measure(page, ctx, 'pinned'), ctx, need_badge=False)
    # the Tech list by keys: the root cursor is on Tech, Anchor first in gold
    ab._press(page, 'KeyZ')
    page.evaluate(ADV.format(6))
    sub = page.evaluate("(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? m.sub.items.map(i => [i.id, i.color]) : null; })()")
    if not sub or sub[0] != ['anchor_line', 'gold']:
        raise AssertionError(f'Anchor first, in gold: {sub}')
    ab.shot(page, ctx, 'anchor-list')
    e5.zoom(page, ctx, f"{ctx['device']}_engine_anchor_row", (0, 40, 200, 120), scale=3)
    ab._press(page, 'KeyZ')
    e5.filmstrip(page, ctx, 'anchor-cast', 8, 5)
    ab.advance_until(page, "LQ_ENGINE.scene.b.state.gale.held > 0 || !LQ_ENGINE.scene.b.state.gale.pinned", max_frames=6000, step=2)
    e5.filmstrip(page, ctx, 'blast-broken', 12, 4)
    held = page.evaluate("LQ_ENGINE.scene.b.state.gale.held")
    ctx['note'] += f' held {held};'
    page.evaluate("(() => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'gale_engine'); u.hp = Math.floor(u.maxHp * 0.52); })()")
    menu_open(page)
    act(page, {'type': 'attack', 'target': page.evaluate("LQ_ENGINE.scene.b.units().find(x => x.id === 'gale_engine').uid")})
    e5.filmstrip(page, ctx, 'vents', 12, 6)
    menu_open(page)
    ab.shot(page, ctx, 'sprites')
    check(measure(page, ctx, 'sprites'), ctx)
    to_end(page, ctx)


def sc_scribe(page, ctx):
    setup(page, 'scribe', 3, level=27)
    page.evaluate(ADV.format(20))
    ab.shot(page, ctx, 'card')
    menu_open(page)
    storm = stage_luma(page)
    page.evaluate("(() => { const w = LQ_ENGINE.scene.wx6; w.next = 1; })()")
    page.evaluate(ADV.format(3))
    ab.shot(page, ctx, 'lightning')
    if not defend_until(page, "!!(LQ_ENGINE.scene.gale6.pinned && LQ_DEBUG.state().battle.current === 'bram')", turns=30):
        raise AssertionError('no Rewrite pinned on Bram\'s turn')
    page.evaluate(ADV.format(10))
    ab.shot(page, ctx, 'rewrite-pinned')
    e5.tl_zoom(page, ctx, 'rewrite-pinned')
    help_txt = page.evaluate("LQ_ENGINE.scene.helpView(LQ_ENGINE.renderer).text")
    if 'Bram can anchor.' not in help_txt:
        raise AssertionError(f'the line names Bram: {help_txt}')
    check(measure(page, ctx, 'pinned'), ctx)
    act(page, {'type': 'skill', 'skill': 'anchor_line'})
    ab.advance_until(page, "LQ_ENGINE.scene.b.state.gale.held > 0", max_frames=6000, step=2)
    e5.filmstrip(page, ctx, 'rewrite-broken', 12, 4)
    # the ward: the Scribe to its first lock
    page.evaluate("(() => { const u = LQ_ENGINE.scene.b.units().find(x => x.id === 'scribe'); u.hp = Math.floor(u.maxHp * 0.68) + 2; })()")
    menu_open(page)
    act(page, {'type': 'attack', 'target': page.evaluate("LQ_ENGINE.scene.b.units().find(x => x.id === 'scribe').uid")})
    e5.filmstrip(page, ctx, 'ward', 12, 7)
    menu_open(page)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'ward')
    e5.rows_zoom(page, ctx, 'ward')
    check(measure(page, ctx, 'ward'), ctx)
    spots = page.evaluate("[...LQ_ENGINE.scene.actors.values()].filter(a => ['false_beacon', 'broken_compass'].includes(a.id)).map(a => [a.id, a.x, a.y])")
    ctx['note'] += f' lights {spots};'
    # tear the ward: both lights down
    page.evaluate("(() => { for (const u of LQ_ENGINE.scene.b.units()) if (['false_beacon', 'broken_compass'].includes(u.id)) u.hp = 1; })()")
    for _ in range(2):
        menu_open(page)
        tgt = page.evaluate("(LQ_ENGINE.scene.b.units().find(x => x.alive && ['false_beacon', 'broken_compass'].includes(x.id)) || {}).uid || null")
        if not tgt:
            break
        act(page, {'type': 'attack', 'target': tgt})
        ab.advance_until(page, "LQ_ENGINE.scene.opIndex >= LQ_ENGINE.scene.ops.length || LQ_DEBUG.state().battle.phase !== 'play'", max_frames=3000, step=4)
    e5.filmstrip(page, ctx, 'ward-tear', 12, 8)
    ab.advance_until(page, "LQ_ENGINE.scene.wx6 && LQ_ENGINE.scene.wx6.k >= 1", max_frames=600, step=5)
    clear = stage_luma(page)
    ctx['note'] += f' storm {storm:.3f} clear {clear:.3f};'
    if clear - storm < 0.12:
        raise AssertionError(f'the clear grade is not 0.12 over the storm ({storm:.3f} -> {clear:.3f})')
    menu_open(page)
    page.evaluate(ADV.format(30))
    ab.shot(page, ctx, 'chart')
    check(measure(page, ctx, 'chart'), ctx)
    to_end(page, ctx)


SCENARIOS = {
    'e6a_first': (sc_first, ['desktop', 'phone']),
    'e6o1_mixed': (sc_mixed, ['desktop', 'phone']),
    'gale_engine': (sc_engine, ['desktop', 'phone']),
    'scribe': (sc_scribe, ['desktop', 'phone']),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='')
    ap.add_argument('--timeout', type=int, default=1200)
    args = ap.parse_args()
    names = [n.strip() for n in args.only.split(',') if n.strip()] or list(SCENARIOS)
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(args.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep5,ep6'
    report, failures = [], 0
    from playwright.sync_api import sync_playwright
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
                page.on('console', lambda m, errors=errors: errors.append(f'console.error: {m.text}') if m.type == 'error' and '404' not in m.text else None)
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
                    errors.extend(f'engine: {e["msg"]}' for e in errs or [])
                except Exception as e:  # noqa: BLE001
                    status, detail = 'FAIL', str(e).splitlines()[0][:300]
                    try:
                        page.screenshot(path=str(OUT / f'{dname}-{name}-FAILED.png'))
                    except Exception:  # noqa: BLE001
                        pass
                if errors:
                    status = 'FAIL'
                    detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:4])
                failures += status != 'ok'
                print(f'{status:<4} {dname:<8} {name:<12} {int((time.time() - t0) * 1000):>6} ms  {ctx["note"]}  {detail}', flush=True)
                report.append({'device': dname, 'scenario': name, 'status': status, 'detail': detail, 'note': ctx['note'], 'files': ctx['files'],
                               'measures': ctx.get('measures', [])})
                page.close()
            context.close()
        browser.close()
    server.shutdown()
    (OUT / 'report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    print(f'\n{len(report) - failures}/{len(report)} scenarios ok; PNGs in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
