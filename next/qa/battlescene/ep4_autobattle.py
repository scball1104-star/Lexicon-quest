"""Episode 4 battle-scene checks (E4-scene-ui), headless Chromium with ?pack=ep4. Uses the helpers of autobattle.py.

  python next/qa/battlescene/ep4_autobattle.py                       every scenario, desktop + phone (+ portrait where marked)
  python next/qa/battlescene/ep4_autobattle.py --only paper_regent --device phone

Scenarios (PNGs in next/qa/battlescene/out/ep4/, a filmstrip per effect):
  e4r_first     the stage (ep4_flood_road), the seal pips at command time, Stamp, the announced Runoff (the scroll), Mira's
                Ember voids it ("VOIDED", the torn paper), then Auto to the end
  barrister     the card (THE INKBOUND BARRISTER / Counsel for the Forgery) with the arc line, pips, Objection announced,
                voided by fire; the witness takes the stand at 50%; Auto to the end
  paper_regent  the card, look 1 (Forged Edicts), the crossing into Royal Ward filmed (pages peel, look 2, the writs rise,
                the ward halo), both writs struck down (the ward tears, look 3 True Charter), Strike from the Roll on the
                hero (the seal over the head and on the timeline slot), Answer by the hero filmed (the signature stroke,
                the Break), the hero's guard, then Auto to the end
The party is the Episode 4 quick start (LQ_DEBUG.newGameEp4) with the Witness Book signed (Answer learned).
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

OUT = HERE / 'out' / 'ep4'
ab.OUT = OUT
ADV = ab.ADVANCE
DEVICES = ab.DEVICES


def setup(page, enc, seed, level=None):
    page.evaluate("LQ_PACKS.forcePack('ep4')")
    page.evaluate("LQ_PACKS.ensurePack('ep4')")
    page.wait_for_function("LQ_PACKS.packReady && LQ_PACKS.packReady('ep4')", timeout=20000)
    page.evaluate("LQ_DEBUG.newGameEp4('Arden', { slot: 1, scene: 'none' })")
    page.evaluate("LQ_ENGINE.game.flags.hero_signed = true")
    if level:
        page.evaluate(f"(() => {{ for (const m of LQ_ENGINE.game.party) m.level = {level}; }})()")
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ seed: {seed}, canFlee: false }})")
    ab.advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase !== 'intro'", max_frames=400, step=2)


def unit(js):
    return f"LQ_ENGINE.scene.b.units().find(u => u.alive && ({js}))"


def act(page, action):
    page.evaluate(f"LQ_DEBUG.battleAct({json.dumps(action)})")


def until_member(page, who, turns=12):
    return ab._defend_until(page, f"LQ_DEBUG.state().battle.current === '{who}'", turns=turns)


def pips_zoom(page, ctx, uid_js, name):
    """A 4x zoom round the foe's weakness row (with its seal pips)."""
    r = page.evaluate(f"(() => {{ const a = LQ_ENGINE.scene.actor({uid_js}); return a ? [a.cx, Math.round(a.y)] : null; }})()")
    if r:
        x = max(0, min(384 - 150, r[0] - 75)); y = max(0, min(216 - 60, r[1] - 40))
        ab.zoom(page, ctx, f"{ctx['device']}_{name}", (x, y, 150, 60), scale=4)


def sc_e4r_first(page, ctx):
    setup(page, 'e4r_first', 3)
    page.evaluate(ADV.format(40))
    ab.shot(page, ctx, 'stage')
    bloom = unit("u.id === 'ink_bloom'")
    assert ab._defend_until(page, f"{bloom} && {bloom}.heat >= 1", turns=8), 'the Bloom never stamped'
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'pips_command')
    pips_zoom(page, ctx, f"{bloom}.uid", 'e4r_pips')
    page.evaluate(f"{bloom}.heat = 2")
    announced = ab._defend_until(page, "LQ_ENGINE.scene.telegraphs.size > 0", turns=8)
    if announced:
        page.evaluate(ADV.format(4))
        ab.shot(page, ctx, 'decree_command')
        pips_zoom(page, ctx, f"{unit('u.charging')}.uid", 'e4r_announced')
    assert until_member(page, 'mira'), 'no Mira turn'
    anyfoe = unit("u.side === 'enemy'")
    uid = page.evaluate(f"({bloom} || {anyfoe}).uid")
    act(page, {'type': 'skill', 'skill': 'ember', 'target': uid})
    ab.filmstrip(page, ctx, 'void', 12, 5, full=True)
    seals = page.evaluate(f"LQ_ENGINE.scene.b.unit('{uid}').heat")
    assert seals == 0, seals
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    ctx['note'] = f"pips; decree {'announced' if announced else 'not reached'}; voided by Ember; auto {result}"


def card_shots(page, ctx):
    page.evaluate(ADV.format(8)); ab.shot(page, ctx, 'entrance')
    page.evaluate(ADV.format(30)); ab.shot(page, ctx, 'card')
    return page.evaluate("(() => { const s = LQ_ENGINE.scene; return s.bossIntro ? { name: s.bossIntro.name, sub: s.bossIntro.sub, help: s.help.text } : null; })()")


def sc_barrister(page, ctx):
    setup(page, 'barrister', 4, level=19)
    card = card_shots(page, ctx)
    assert card and card['name'] == 'THE INKBOUND BARRISTER' and card['sub'] == 'Counsel for the Forgery', card
    assert 'Nobody argued back' in (card['help'] or ''), card
    B = unit("u.id === 'barrister'")
    assert ab._player(page)
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'pips_command')
    pips_zoom(page, ctx, f"{B}.uid", 'barrister_pips')
    page.evaluate(f"{B}.heat = 2")
    announced = ab._defend_until(page, "LQ_ENGINE.scene.telegraphs.size > 0", turns=8)
    if announced:
        page.evaluate(ADV.format(6))
        ab.shot(page, ctx, 'objection_command')
    assert until_member(page, 'mira'), 'no Mira turn'
    act(page, {'type': 'skill', 'skill': 'ember', 'target': page.evaluate(f"{B}.uid")})
    ab.filmstrip(page, ctx, 'void', 12, 5, full=True)
    # the witness at 50%: HP set just above it, one blow
    assert ab._player(page)
    page.evaluate(f"(() => {{ const b = {B}; b.hp = Math.floor(b.maxHp * 0.51); }})()")
    act(page, {'type': 'attack', 'target': page.evaluate(f"{B}.uid")})
    ab.advance_until(page, "LQ_ENGINE.scene.b.units().some(u => u.alive && u.id === 'barrister_witness') || " + ab.WAIT_PLAYER, max_frames=3000, step=1)
    page.evaluate(ADV.format(14))
    ab.shot(page, ctx, 'witness')
    witness = page.evaluate("LQ_ENGINE.scene.b.units().some(u => u.alive && u.id === 'barrister_witness')")
    assert ab._player(page)
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'witness_command')
    page.evaluate(f"{B}.hp = Math.min({B}.hp, 400)")
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    ctx['note'] = f"card {card['name']} / {card['sub']}; objection {'announced' if announced else '-'}; witness {witness}; auto {result}"


def phase_film(page, ctx, name):
    ab.advance_until(page, "!!(LQ_ENGINE.scene.banner && LQ_ENGINE.scene.banner.style === 'phase')", max_frames=3000, step=1)
    ab.filmstrip(page, ctx, name, 12, 5, full=True)


def sc_paper_regent(page, ctx):
    d = ctx['device']
    setup(page, 'paper_regent', 5, level=20)
    card = card_shots(page, ctx)
    assert card and card['name'] == 'THE PAPER REGENT' and card['sub'] == 'Keeper of the Seal', card
    assert 'Nobody read it' in (card['help'] or ''), card
    R = unit("u.id === 'paper_regent'")
    art = "[...LQ_ENGINE.scene.actors.values()].find(a => a.id === 'paper_regent').stem"
    assert ab._player(page)
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'look1')
    looks = [page.evaluate(art)]
    # Royal Ward: the blow that crosses 70%
    page.evaluate(f"(() => {{ const r = {R}; r.hp = Math.floor(r.maxHp * 0.705); }})()")
    act(page, {'type': 'attack', 'target': page.evaluate(f"{R}.uid")})
    phase_film(page, ctx, 'ward_unfold')
    assert ab._player(page)
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'look2_ward')
    looks.append(page.evaluate(art))
    assert page.evaluate("[...LQ_ENGINE.scene.actors.values()].find(a => a.id === 'paper_regent').ward"), 'no ward halo'
    # both writs down; the last one tears the ward
    writs = "LQ_ENGINE.scene.b.units().filter(u => u.alive && /^writ_/.test(u.id)).map(u => u.uid)"
    page.evaluate(f"{writs}.forEach(uid => {{ LQ_ENGINE.scene.b.unit(uid).hp = 1; }})")
    torn = False
    for _ in range(12):
        if not ab._player(page):
            break
        left = page.evaluate(writs)
        if not left:
            break
        act(page, {'type': 'attack', 'target': left[0]})
        if len(left) == 1:
            phase_film(page, ctx, 'ward_tear')
            torn = True
            break
    assert torn, 'never struck the last writ'
    assert ab._player(page)
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'look3_charter')
    looks.append(page.evaluate(art))
    assert looks == ['paper_regent', 'paper_regent_ward', 'paper_regent_charter'], looks
    # Strike from the Roll on the hero, with the hero to act
    page.evaluate(f"{R}.hp = {R}.maxHp")
    strike = "[...LQ_ENGINE.scene.telegraphs.values()].some(t => t.skill === 'strike_roll') && LQ_DEBUG.state().battle.current === 'hero'"
    assert ab._defend_until(page, strike, turns=30), 'no Strike from the Roll with the hero to act'
    page.evaluate("LQ_ENGINE.scene.b.unit('hero').mp = Math.max(LQ_ENGINE.scene.b.unit('hero').mp, 30)")
    page.evaluate(ADV.format(6))
    ab.shot(page, ctx, 'strike_named')
    if d == 'desktop':
        ab.zoom(page, ctx, 'desktop_regent_timeline', (230, 0, 154, 30), scale=4)
    named = page.evaluate("!!LQ_ENGINE.scene.actor('hero').statuses.named")
    assert named, 'the hero is not marked'
    act(page, {'type': 'skill', 'skill': 'answer', 'target': page.evaluate(f"{R}.uid")})
    ab.filmstrip(page, ctx, 'answer', 16, 5, full=True)
    broke = page.evaluate(f"{R}.broken")
    assert ab._player(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, 'after_answer')
    guard = page.evaluate("!!LQ_ENGINE.scene.actor('hero').statuses.answered")
    page.evaluate(f"{R}.hp = Math.min({R}.hp, 300)")
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    ctx['note'] = f"card ok; looks {','.join(looks)}; ward torn; named; Answer broke {broke}; guard {guard}; auto {result}"


SCENARIOS = {
    'e4r_first': (sc_e4r_first, ['desktop', 'phone']),
    'barrister': (sc_barrister, ['desktop', 'phone']),
    'paper_regent': (sc_paper_regent, ['desktop', 'phone', 'portrait']),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='')
    ap.add_argument('--timeout', type=int, default=900)
    args = ap.parse_args()
    names = [n.strip() for n in args.only.split(',') if n.strip()] or list(SCENARIOS)
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(args.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep4'
    report, failures = [], 0
    from playwright.sync_api import sync_playwright, Error as PwError
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname, dev in DEVICES.items():
            if args.device and dname not in args.device.split(','):
                continue
            context = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                          is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
            context.set_default_timeout(20000)
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
                    page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
                    page.evaluate('LQ_DEBUG.ready()')
                    fn(page, ctx)
                    errs = page.evaluate('LQ_DEBUG.errors()')
                    if errs:
                        errors.extend(f'engine: {e["msg"]}' for e in errs)
                except Exception as e:  # noqa: BLE001
                    status, detail = 'FAIL', str(e).splitlines()[0][:300]
                    try:
                        page.screenshot(path=str(OUT / f'{dname}-{name}-FAILED.png'))
                    except PwError:
                        pass
                if errors and status == 'ok':
                    status = 'FAIL'
                if errors:
                    detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:4])
                failures += status != 'ok'
                print(f'{status:<4} {dname:<8} {name:<14} {int((time.time() - t0) * 1000):>6} ms  {ctx["note"]}  {detail}', flush=True)
                report.append({'device': dname, 'scenario': name, 'status': status, 'detail': detail, 'note': ctx['note'], 'files': ctx['files']})
                page.close()
            context.close()
        browser.close()
    server.shutdown()
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'\n{len(report) - failures}/{len(report)} scenarios ok; PNGs in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
