"""Episode 5 sun and shade lab (E5-world): drives the real game (with ?pack=ep5) on the shade test maps ep5_testshade and
ep5_testshade_in (src/data/ep5/field/_testshade.js), asserts state through LQ_DEBUG and saves shots in
qa/world/ep5_out/<device>_<name>.png (3x) and _x1.png. Never writes to qa/world/out.

    python next/qa/world/ep5_lab.py                    # every case, desktop
    python next/qa/world/ep5_lab.py hours shove        # some cases
    python next/qa/world/ep5_lab.py --device phone

Cases: hours (the court at noon, dawn, dusk and a frame mid-sweep), shove (the stone up its groove, then dusk: the bridge
to the nook), refuse (the Shove refused over running sand), plate (the plate latching at dusk, the sun gate open), indoor
(the dawn shaft, the pillar Shoved into it, the lamp room before and after the lamp rolls), tint (desert_noon against no
tint: running vs firm sand luma on the frame), perf (shade logic and draw timings; frame rate at 4x CPU throttle on the
current device profile). Fails on any console error.
"""
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fieldlab  # noqa: E402
from fieldlab import Lab  # noqa: E402

OUT = HERE / 'ep5_out'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep5&dev=53'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 100)')
DEVICE = ['desktop']


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def shade(lab):
    return lab.run(fjs('return f && f.shade ? f.shade.debugState() : null;'))


def shot(lab, name):
    OUT.mkdir(parents=True, exist_ok=True)
    data = lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")')
    import base64
    import io
    from PIL import Image
    im = Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')
    stem = f'{DEVICE[0]}_{name}'
    im.save(OUT / f'{stem}_x1.png')
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(OUT / f'{stem}.png')
    if DEVICE[0] == 'phone':
        lab.page.screenshot(path=str(OUT / f'{stem}_page.png'))
    print('  shot', OUT / f'{stem}.png')


def setup(lab, map_id, x, y, d='up', fresh=True):
    if fresh:
        lab.run('LQ_ENGINE.game && (LQ_ENGINE.game.opened = {}, delete LQ_ENGINE.game.flags._t_e5plate)')
    lab.warp(map_id, x, y, d)
    lab.call('party', 'mira', 'bram')
    lab.run(AUTO_JS)
    lab.frames(70)            # the banner slides out


def look(lab, x, y):
    """Center the camera on a tile without moving the party (for a framed shot)."""
    lab.run(fjs(f'f.camera.panTo({x} * 16 + 8, {y} * 16 + 8, 0); return true;'))
    lab.frames(2)


def set_hour(lab, h):
    return lab.call('setHour', h, ms=20000)


def code(lab, x, y):
    return lab.run(fjs(f'return f.map.codeAt({x}, {y});'))


def case_hours(lab):
    setup(lab, 'ep5_testshade', 5, 20, 'up')
    st = shade(lab)
    check(st and st['active'] and st['hour'] == 'noon', 'the court arrives at noon')
    check(code(lab, 12, 18) == 'water', 'noon: the band runs')
    look(lab, 12, 17)
    shot(lab, 'court_noon')
    st = set_hour(lab, 'dawn')
    check(st['hour'] == 'dawn' and code(lab, 12, 18) == 'none', 'dawn: the obelisk bridges the band')
    lab.frames(10)
    look(lab, 12, 17)
    shot(lab, 'court_dawn')
    # a frame in the middle of the sweep to dusk
    lab.run(fjs('f.shade.setHour("dusk"); return true;'))
    lab.frames(13)
    look(lab, 12, 17)
    st = shade(lab)
    check(st['anim'] is not None, 'the sweep is under way')
    shot(lab, 'court_sweep')
    lab.frames(40)
    st = shade(lab)
    check(st['hour'] == 'dusk' and st['anim'] is None, 'dusk: settled')
    look(lab, 12, 17)
    shot(lab, 'court_dusk')
    lab.run(fjs('f.camera.returnTo(f.leader, 0); return true;'))
    lab.frames(2)
    shot(lab, 'court_dusk_party')


def case_shove(lab):
    setup(lab, 'ep5_testshade', 23, 9, 'up')
    look(lab, 24, 6)
    shot(lab, 'groove_before')
    for k in range(3):
        v = lab.call('shoveCaster', 'ss_c', 'up', ms=20000)
        check(v and v['ok'], f'shove {k + 1}')
        lab.run(fjs('f.leader.setPos(f.leader.tx, f.leader.ty - 1, "up"); return true;'))
    st = set_hour(lab, 'dusk')
    check(st['pos']['ss_c'] == '23,5', 'the stone at the head of its groove')
    check(all(code(lab, x, 5) == 'none' for x in (25, 26, 27)), 'dusk: the stone\'s shadow bridges the band to the nook door')
    lab.frames(10)
    look(lab, 25, 6)
    shot(lab, 'groove_after_dusk')


def case_refuse(lab):
    setup(lab, 'ep5_testshade', 30, 16, 'down')
    lab.walk('down')
    lab.frames(10)
    check(lab.run(fjs('return [f.leader.tx, f.leader.ty];')) == [30, 17], 'the party stands on the block\'s 1-cell shade')
    lab.run(fjs('f.leader.dir = "down"; f.lockInput(); f.shade.shoveWith(f.abilities, { target: f.entities.get("blk_r") }).then(() => f.unlockInput()); return true;'))
    lab.frames(24)
    look(lab, 30, 17)
    shot(lab, 'refuse')
    lab.frames(60)
    st = shade(lab)
    check(st['refusals'] == 1 and st['pos']['blk_r'] == '30,18', 'refused: the block did not budge')


def case_plate(lab):
    setup(lab, 'ep5_testshade', 17, 23, 'up')
    look(lab, 30, 21)
    shot(lab, 'plate_noon')
    st = set_hour(lab, 'dusk')
    lab.frames(40)
    check('plate_d:on' in st['plates'] and st['latched'] == ['plate_d'], 'the plate latched at dusk')
    check(lab.run(fjs('return f.entities.get("gate_d").state;')) == 'open', 'the sun gate stands open')
    look(lab, 30, 21)
    shot(lab, 'plate_dusk_latched')
    st = set_hour(lab, 'noon')
    lab.frames(20)
    check(lab.run(fjs('return f.entities.get("gate_d").state;')) == 'open', 'noon again: still open (latched)')
    lab.warp('ep5_testshade', 5, 20, 'up')
    lab.frames(10)
    st = shade(lab)
    check(st['latched'] == ['plate_d'] and st['hour'] == 'noon', 'after re-entry: latched, the hour back at noon')


def case_indoor(lab):
    setup(lab, 'ep5_testshade_in', 11, 11, 'up')
    st = shade(lab)
    check(st['hour'] == 'dawn' and code(lab, 10, 8) == 'water', 'the hall at dawn: the shaft runs the row')
    look(lab, 9, 8)
    shot(lab, 'hall_dawn')
    for k in range(2):
        v = lab.call('shoveCaster', 'pl_b', 'up', ms=20000)
        check(v and v['ok'], f'pillar shove {k + 1}')
        lab.run(fjs('f.leader.setPos(f.leader.tx, f.leader.ty - 1, "up"); return true;'))
    lab.frames(10)
    check(code(lab, 10, 8) == 'none' and code(lab, 12, 8) == 'water', 'the pillar shades the west of the shaft')
    look(lab, 9, 8)
    shot(lab, 'hall_pillar')
    lab.warp('ep5_testshade_in', 21, 14, 'right')
    lab.frames(20)
    look(lab, 22, 11)
    shot(lab, 'lamp_before')
    v = lab.call('shoveCaster', 'lamp_a', 'right', ms=20000)
    check(v and v['ok'], 'the lamp rolls east')
    lab.frames(10)
    check(all(code(lab, 19, y) == 'none' for y in (11, 12, 13)), 'column 19 falls dark and holds')
    look(lab, 22, 11)
    shot(lab, 'lamp_after')


LUMA = ('(cells) => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); const c = LQ_ENGINE.renderer.canvas; const g = c.getContext("2d"); '
        'const k = c.width / LQ_ENGINE.renderer.W; return cells.map(([x, y]) => { const [sx, sy] = f.camera.toScreen(x * 16, y * 16); '
        'const d = g.getImageData(Math.round((sx + 3) * k), Math.round((sy + 3) * k), Math.round(10 * k), Math.round(10 * k)).data; let s = 0; '
        'for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4) / 255; }); }')


def case_tint(lab):
    setup(lab, 'ep5_testshade', 21, 15, 'up')     # the party well away from the cells measured
    look(lab, 29, 17)
    out = {}
    for t in ('none', 'desert_noon'):
        lab.run(fjs(f'f.lighting.setTint("{t}", 0); return true;'))
        lab.frames(3)
        run_l, firm_l, pave_l = lab.page.evaluate(LUMA, [[27, 17], [30, 17], [29, 15]])
        out[t] = (run_l, firm_l, pave_l)
        print(f'  {t}: running {run_l:.3f}, firm in shade {firm_l:.3f}, pavement {pave_l:.3f}, running - firm {run_l - firm_l:.3f}')
        shot(lab, f'tint_{t}')
    a = out['none'][0] - out['none'][1]
    b = out['desert_noon'][0] - out['desert_noon'][1]
    check(a >= 0.25, f'running vs firm sand at no tint: {a:.3f} (at least 0.25)')
    check(b >= a * 0.9, f'desert_noon keeps {100 * b / a:.0f}% of that contrast (at least 90%)')


def case_perf(lab):
    setup(lab, 'ep5_testshade', 5, 20, 'up')
    for h in ('dawn', 'dusk', 'noon'):
        set_hour(lab, h)
    lab.frames(20)
    st = shade(lab)
    print(f"  apply {st['applyMs']} ms (max {st['maxApplyMs']}), paint {st['paintMs']} ms, update {st['updateMs']} ms (max {st['maxUpdateMs']})")
    check(st['maxApplyMs'] < 1, 'an hour change recomputes under 1 ms')
    ms = lab.run(fjs('const r = LQ_ENGINE.renderer; const t0 = performance.now(); for (let i = 0; i < 120; i++) f.shade.update(); const u = (performance.now() - t0) / 120; '
                     'const t1 = performance.now(); for (let i = 0; i < 120; i++) f.shade.drawLow(r, i / 60); const dl = (performance.now() - t1) / 120; '
                     'const t2 = performance.now(); for (let i = 0; i < 30; i++) f.draw(r); return [u, dl, (performance.now() - t2) / 30];'))
    print(f'  shade update {ms[0]:.3f} ms, shade draw {ms[1]:.3f} ms, whole field draw {ms[2]:.3f} ms')
    check(ms[0] < 3, 'shade logic under 3 ms a frame')
    check(ms[1] < 1, 'shade drawing under 1 ms a frame')
    # the frame rate on this device profile at 4x CPU throttle, idle and through a sweep
    cdp = lab.page.context.new_cdp_session(lab.page)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    try:
        fps = lab.page.evaluate('''async () => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); const run = (ms) => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last;
            const tick = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(tick); else res([n * 1000 / (t - t0), worst]); }; requestAnimationFrame(tick); });
            const idle = await run(1500); f.shade.setHour("dawn"); const sweep = await run(600); return [idle, sweep]; }''')
    finally:
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    (fi, wi), (fs, ws) = fps
    print(f'  4x CPU throttle: idle {fi:.1f} fps (worst frame {wi:.1f} ms), during the sweep {fs:.1f} fps (worst {ws:.1f} ms)')
    check(fs >= 50, 'the sweep holds about 60 fps at 4x throttle')


CASES = {'hours': case_hours, 'shove': case_shove, 'refuse': case_refuse, 'plate': case_plate, 'indoor': case_indoor, 'tint': case_tint, 'perf': case_perf}


def main(argv):
    device = 'desktop'
    if '--device' in argv:
        i = argv.index('--device'); device = argv[i + 1]; del argv[i:i + 2]
    DEVICE[0] = device
    names = argv or list(CASES)
    lab = Lab(device=device)
    bad = 0
    try:
        lab.open(QUERY)
        lab.page.wait_for_function('window.LQ_DEBUG && LQ_DEBUG.commands && true', timeout=20000)
        lab.page.wait_for_function('LQ_DEBUG.commands().includes("setHour") || (window.LQ_EP5 && true)', timeout=30000)
        for n in names:
            print(n)
            try:
                CASES[n](lab)
            except Exception as e:  # noqa: BLE001
                bad += 1
                print('  FAIL', n, e)
        if lab.errors:
            bad += 1
            print('console errors:\n  ' + '\n  '.join(lab.errors[:10]))
        if lab.noise:
            print('404 noise:', ', '.join(sorted(set(lab.noise))[:8]))
        warns = [l for l in lab.logs if l.startswith('warning') and ('ep5' in l or 'shade' in l or 'unknown' in l)]
        if warns:
            print('warnings:\n  ' + '\n  '.join(sorted(set(warns))[:12]))
    finally:
        lab.close()
    print('ALL OK' if not bad else f'{bad} FAILED')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
