"""Episode 4 tide lab (E4-world): drives the real game (with ?pack=ep4) on the tide test map ep4_testtide
(src/data/ep4/field/_testtide.js), asserts state through LQ_DEBUG and saves shots in qa/world/out/ep4_<name>.png (3x)
and ep4_<name>_x1.png.

    python next/qa/world/ep4_lab.py                    # every case, desktop
    python next/qa/world/ep4_lab.py levels wash         # some cases
    python next/qa/world/ep4_lab.py --device phone

Cases: levels (basin b at low, mid and high: grounded pontoons, the bridge, the flooded walkway; plus a frame mid-rise),
wash (basin a: the papered door at mid, the red cloud at high, washed and drained at low, the open door), gate (the
floodgate lifting at high and staying open at low), lane (the 2-level farm wheel: the lane drained), tint (flood_grey
against none on the same frame), perf (apply and update timings, field frame cost). Fails on any console error.
"""
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab, OUT  # noqa: E402

FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep4&dev=41'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 100)')


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def tide(lab):
    return lab.run(fjs('return f && f.tide ? f.tide.debugState() : null;'))


def shot(lab, name):
    print('  shot', lab.shot('ep4_' + name))


def setup(lab, x, y, d='up', fresh=True):
    if fresh:
        lab.run('LQ_ENGINE.game && (LQ_ENGINE.game.washed = {}, LQ_ENGINE.game.opened = {}, delete LQ_ENGINE.game.flags._t_tidegate)')
    lab.warp('ep4_testtide', x, y, d)
    lab.run('LQ_ENGINE.game.items.lock_crank = 1, LQ_ENGINE.game.counters["read:ep4_lock_wheel"] = 1, LQ_ENGINE.game.counters["read:ep4_farm_wheel"] = 1')
    lab.call('party', 'mira', 'bram')
    lab.frames(70)            # the banner slides out


def turn(lab, wid):
    return lab.call('turnWheel', wid, ms=20000)


def look(lab, x, y):
    """Center the camera on a tile without moving the party (for a framed shot)."""
    lab.run(fjs(f'f.camera.panTo({x} * 16 + 8, {y} * 16 + 8, 0); return true;'))
    lab.frames(1)


def case_levels(lab):
    setup(lab, 20, 15, 'up')
    st = tide(lab)
    check(st and st['active'] and st['levels'] == {'a': 1, 'b': 0, 'c': 1}, 'start levels a mid, b low, c mid')
    check('24,9' in st['grounded'], 'b low: the pontoons sit on the canal floor')
    look(lab, 24, 8)
    shot(lab, 'b_low')
    st = turn(lab, 'wh_b')
    check(st['levels']['b'] == 1 and '24,9' in st['floats'], 'b mid: the pontoons float')
    lab.frames(30)
    look(lab, 24, 8)
    shot(lab, 'b_mid')
    # a frame in the middle of the rise to high
    lab.run(fjs('f.lockInput(); f.tide.turn(f.entities.get("wh_b")).then(() => f.unlockInput()); return true;'))
    lab.frames(12)
    look(lab, 24, 8)
    st = tide(lab)
    check(st['anim'] is not None and st['drawn'] < st['water'], 'the water arrives band by band')
    shot(lab, 'b_rising')
    lab.frames(40)
    st = tide(lab)
    check(st['levels']['b'] == 2 and st['drawn'] == st['water'], 'b high: settled')
    lab.frames(120)
    look(lab, 24, 8)
    shot(lab, 'b_high')


def case_wash(lab):
    setup(lab, 5, 13, 'up')
    look(lab, 9, 7)
    shot(lab, 'a_mid_papered')
    st = turn(lab, 'wh_a')
    check(st['levels']['a'] == 2, 'a high')
    lab.frames(22)
    look(lab, 9, 7)
    shot(lab, 'a_high_washing')
    lab.run(AUTO_JS)
    lab.frames(90)
    st = tide(lab)
    check(st['washed'] == ['seal_a'], 'the seal washed off and is saved')
    look(lab, 9, 7)
    shot(lab, 'a_high_washed')
    turn(lab, 'wh_a')
    lab.frames(30)
    look(lab, 9, 7)
    st = tide(lab)
    check(st['levels']['a'] == 0, 'a low')
    shot(lab, 'a_low_open')
    code = lab.run(fjs('return [f.map.codeAt(8, 3), f.map.codeAt(8, 4), f.entities.get("g_paper").state];'))
    check(code == ['none', 'none', 'open'], 'the canal door is open and the canal floor dry')
    # reload: back on the map, the seal stays washed, the water back at mid
    lab.warp('ep4_testtide', 16, 15, 'up')
    lab.frames(10)
    st = tide(lab)
    check(st['washed'] == ['seal_a'] and st['levels']['a'] == 1, 'after re-entry: washed kept, level reset to mid')


def case_gate(lab):
    setup(lab, 20, 15, 'up')
    turn(lab, 'wh_b')
    lab.run(AUTO_JS)
    lab.run(fjs('f.lockInput(); f.tide.turn(f.entities.get("wh_b")).then(() => f.unlockInput()); return true;'))
    lab.frames(78)
    shot(lab, 'gate_lifting')
    lab.frames(120)
    st = tide(lab)
    check('fg_b:on' in st['gates'] and st['latched'] == ['fg_b'], 'the floodgate lifted and latched')
    turn(lab, 'wh_b')
    lab.frames(40)
    st = tide(lab)
    check(st['levels']['b'] == 0 and 'fg_b:on' in st['gates'], 'low again: the floodgate stays open')
    look(lab, 22, 7)
    shot(lab, 'gate_open_low')


def case_lane(lab):
    setup(lab, 6, 14, 'down')
    look(lab, 16, 18)
    shot(lab, 'c_mid')
    st = turn(lab, 'wh_c')
    lab.frames(30)
    look(lab, 16, 18)
    check(st['levels']['c'] == 0 and '17,18' in st['grounded'], 'the lane drains, the punt grounds')
    shot(lab, 'c_low')


def case_tint(lab):
    setup(lab, 20, 15, 'up')
    turn(lab, 'wh_b')
    lab.frames(30)
    lum = 'const c = LQ_ENGINE.renderer.canvas; const g = c.getContext("2d"); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4) / 255;'
    lab.run(fjs('f.lighting.setTint(null, 0); return true;'))
    lab.frames(3)
    a = lab.run(f'(() => {{ {lum} }})()')
    lab.run(fjs('f.lighting.setTint("flood_grey", 0); return true;'))
    lab.frames(3)
    b = lab.run(f'(() => {{ {lum} }})()')
    shot(lab, 'tint_flood_grey')
    print(f'  luminance none {a:.4f}, flood_grey {b:.4f}, {100 * (1 - b / a):.1f}% darker')
    check(b <= a * 0.9, 'flood_grey at least 10% darker than none')


def case_perf(lab):
    setup(lab, 20, 15, 'up')
    for _ in range(3):
        turn(lab, 'wh_b')
    lab.frames(30)
    st = tide(lab)
    print(f"  apply {st['applyMs']} ms (max {st['maxApplyMs']}), update {st['updateMs']} ms")
    check(st['maxApplyMs'] < 2, 'a level change recomputes under 2 ms')
    ms = lab.run(fjs('const t0 = performance.now(); for (let i = 0; i < 60; i++) f.tide.update(); const u = (performance.now() - t0) / 60; '
                     'const r = LQ_ENGINE.renderer; const t1 = performance.now(); for (let i = 0; i < 30; i++) f.draw(r); return [u, (performance.now() - t1) / 30];'))
    print(f'  tide update {ms[0]:.3f} ms, whole field draw {ms[1]:.3f} ms')
    check(ms[0] < 3, 'tide logic under 3 ms a frame')


CASES = {'levels': case_levels, 'wash': case_wash, 'gate': case_gate, 'lane': case_lane, 'tint': case_tint, 'perf': case_perf}


def main(argv):
    device = 'desktop'
    if '--device' in argv:
        i = argv.index('--device'); device = argv[i + 1]; del argv[i:i + 2]
    names = argv or list(CASES)
    lab = Lab(device=device)
    bad = 0
    try:
        lab.open(QUERY)
        lab.page.wait_for_function('window.LQ_DEBUG && LQ_DEBUG.commands && true', timeout=20000)
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
    finally:
        lab.close()
    print('ALL OK' if not bad else f'{bad} FAILED')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
