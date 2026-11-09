"""E5-maps-b in the real game: each Labyrinth floor loaded by the field (?pack=ep5), every puzzle solved with the debug
dial and Shove (LQ_DEBUG.setHour / shoveCaster, the rules as in play), the field's own collision read back after each step,
and a frame saved at each state that matters. Fails on any console error or any "unknown ... id" warning.

    python tools/maps/previews/ep5_lab_ingame.py               # desktop
    python tools/maps/previews/ep5_lab_ingame.py --device phone

Frames: tools/maps/out/ep5_lab/<device>_<name>.png (3x) and _x1.png (git-ignored scratch). Uses qa/world/fieldlab.py's
Lab (a local server and headless Chromium) but saves nowhere under qa/.
"""
import base64, io, json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parents[2]
sys.path.insert(0, str(NEXT / 'qa' / 'world'))
from fieldlab import Lab  # noqa: E402

OUT = NEXT / 'tools' / 'maps' / 'out' / 'ep5_lab'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep5&dev=57'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 100)')
DEVICE = ['desktop']
FAILS = []


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        FAILS.append(msg)


def shot(lab, name):
    OUT.mkdir(parents=True, exist_ok=True)
    from PIL import Image
    data = lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")')
    im = Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')
    stem = f'{DEVICE[0]}_{name}'
    im.save(OUT / f'{stem}_x1.png')
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(OUT / f'{stem}.png')
    if DEVICE[0] == 'phone':
        lab.page.screenshot(path=str(OUT / f'{stem}_page.png'))


def flags(lab, *names):
    for n in names:
        lab.call('setFlag', n)


def setup(lab, map_id, x, y, d='up'):
    lab.warp(map_id, x, y, d)
    lab.call('party', 'mira', 'bram')
    lab.run(AUTO_JS)
    lab.frames(80)


def place(lab, x, y, d):
    lab.run(fjs(f'f.leader.setPos({x}, {y}, {json.dumps(d)}); return true;'))
    lab.frames(2)


def look(lab, x, y):
    lab.run(fjs(f'f.camera.panTo({x} * 16 + 8, {y} * 16 + 8, 0); return true;'))
    lab.frames(3)


def code(lab, x, y):
    return lab.run(fjs(f'return f.map.codeAt({x}, {y});'))


def hour(lab, h):
    st = lab.call('setHour', h, ms=20000)
    lab.frames(4)
    return st


def shove(lab, cid, d, at, step):
    """Stand at `at` facing d, Shove cid; then step the leader by `step` (the stone moved away)."""
    place(lab, at[0], at[1], d)
    v = lab.call('shoveCaster', cid, d, ms=20000)
    lab.frames(4)
    return bool(v and v.get('ok'))


def gate_open(lab, gid):
    return lab.run(fjs(f'const e = f.entities.get({json.dumps(gid)}); return !!e && e.state === "open";'))


def f1(lab):
    flags(lab, 'gnomon_get', 'lab_entered', 'lab_f1_arrived', 'bells_started')
    setup(lab, 'ep5_lab_f1', 20, 27)
    st = lab.run(fjs('return f.shade && f.shade.debugState();'))
    check(st and st.get('hour') == 'noon', 'F1 arrives at noon')
    check(code(lab, 24, 17) == 'water', 'F1 noon: the strip runs')
    look(lab, 22, 21); shot(lab, 'f1_arrival_noon')
    hour(lab, 'dawn')
    check(code(lab, 23, 19) == 'none' and code(lab, 24, 17) == 'water', 'F1 dawn: the shadow to the Dune Key, not the crossing')
    look(lab, 24, 18); shot(lab, 'f1_b_dawn')
    hour(lab, 'dusk')
    check(code(lab, 24, 17) == 'none' and code(lab, 23, 19) == 'water', 'F1 dusk: the bridge on row 17')
    look(lab, 24, 18); shot(lab, 'f1_b_dusk')
    ok1 = shove(lab, 'ss_c', 'up', (30, 7), None)
    ok2 = shove(lab, 'ss_c', 'up', (30, 6), None)
    check(ok1 and ok2, 'F1 C: two Shoves up the groove')
    hour(lab, 'dawn')
    check(code(lab, 27, 4) == 'none', 'F1 C dawn: the stone\'s shadow bridges the corridor')
    look(lab, 27, 6); shot(lab, 'f1_c_bridge')
    check(not gate_open(lab, 'gate_d'), 'F1 D: gate_d shut while plt_m boxes the plate in')
    check(shove(lab, 'plt_m', 'up', (11, 19), None), 'F1 D: plt_m Shoved off the plate')
    hour(lab, 'noon'); hour(lab, 'dawn')
    lab.frames(10)
    check(gate_open(lab, 'gate_d'), 'F1 D dawn: the plate lights and gate_d opens')
    look(lab, 7, 16); shot(lab, 'f1_d_latched')
    hour(lab, 'noon')
    check(code(lab, 5, 14) == 'none' and code(lab, 4, 16) == 'water', 'F1 D noon: the colonnade path holds')
    shot(lab, 'f1_d_noon')
    hour(lab, 'dawn')
    check(code(lab, 10, 4) == 'none', 'F1 E dawn: the long shadow to the Sun Key')
    look(lab, 8, 5); shot(lab, 'f1_e_dawn')


def f2(lab):
    flags(lab, 'lab_f1_done', 'lab_f2_arrived')
    setup(lab, 'ep5_lab_f2', 8, 17)
    st = lab.run(fjs('return f.shade && f.shade.debugState();'))
    check(st and st.get('hour') == 'dawn', 'F2 arrives at dawn')
    check(code(lab, 13, 13) == 'water', 'F2 dawn: the lower shaft runs')
    look(lab, 8, 12); shot(lab, 'f2_shafts_dawn')
    ok = shove(lab, 'pl_b', 'up', (14, 16), None) and shove(lab, 'pl_b', 'up', (14, 15), None)
    check(ok, 'F2 B: pl_b Shoved up into the shaft')
    check(code(lab, 13, 13) == 'none', 'F2 B: the shaft behind the pillar holds')
    look(lab, 8, 12); shot(lab, 'f2_b_pillar')
    hour(lab, 'noon')
    check(code(lab, 13, 13) == 'water', 'F2 B noon: the oculus runs the door cell')
    shot(lab, 'f2_b_noon')
    hour(lab, 'dusk')
    check(code(lab, 13, 13) == 'water' and code(lab, 12, 9) == 'none', 'F2 dusk: the lower shaft runs, the niche cell holds')
    shot(lab, 'f2_b_dusk')
    check(code(lab, 35, 8) == 'none', 'F2 D dusk: K1 holds under its pillar\'s shade')
    look(lab, 34, 11); shot(lab, 'f2_d_dusk')
    ok = shove(lab, 'pl_d', 'down', (36, 12), None) and shove(lab, 'pl_d', 'down', (36, 13), None)
    check(ok, 'F2 D: pl_d Shoved down into K2')
    hour(lab, 'dawn')
    check(code(lab, 33, 15) == 'none' and code(lab, 35, 8) == 'water', 'F2 D dawn: K2 holds, K1 runs')
    look(lab, 34, 12); shot(lab, 'f2_d_dawn')
    flags(lab, 'knight_defeated')
    look(lab, 22, 15); shot(lab, 'f2_e_hall')


def f3(lab):
    flags(lab, 'lab_f2_done', 'lab_f3_arrived', 'sel_walked_in', 'oracle_door_open')
    setup(lab, 'ep5_lab_f3', 16, 3, 'down')
    st = lab.run(fjs('return f.shade && f.shade.debugState();'))
    check(st and st.get('hour') == 'night', 'F3 arrives at night')
    check(code(lab, 15, 12) == 'water', 'F3 Shelter: the moat runs in the lamp\'s light')
    look(lab, 16, 12); shot(lab, 'f3_shelter_lit')
    ok = all(shove(lab, 'lamp_s', 'right', (x, 11), None) for x in (16, 17, 18))
    check(ok, 'F3 Shelter: lamp_s rolled east three times')
    check(code(lab, 15, 12) == 'none', 'F3 Shelter: the dark holds the moat')
    shot(lab, 'f3_shelter_dark')
    check(code(lab, 16, 21) == 'water', 'F3 Truth: the column runs')
    ok = shove(lab, 'ss_t', 'right', (13, 20), None) and shove(lab, 'ss_t', 'right', (14, 20), None)
    check(ok and code(lab, 16, 21) == 'none' and code(lab, 16, 22) == 'none', 'F3 Truth: the stone\'s line shadow down the column')
    look(lab, 16, 22); shot(lab, 'f3_truth')
    check(not gate_open(lab, 'gate_r'), 'F3 Return: the moon gate shut')
    ok = shove(lab, 'lamp_r2', 'right', (17, 29), None) and shove(lab, 'lamp_r2', 'right', (18, 29), None)
    lab.frames(10)
    check(ok and gate_open(lab, 'gate_r'), 'F3 Return: lamp_r2 out of reach, the plate shaded, the gate opens')
    look(lab, 16, 31); shot(lab, 'f3_return')


def eye(lab):
    flags(lab, 'oracle_door_open')
    setup(lab, 'ep5_lab_oracle', 11, 16)
    look(lab, 11, 10); shot(lab, 'eye_before')


def main(argv):
    if '--device' in argv:
        DEVICE[0] = argv[argv.index('--device') + 1]
    lab = Lab(device=DEVICE[0])
    try:
        lab.open(QUERY)
        lab.run('LQ_DEBUG.ensurePack ? LQ_DEBUG.ensurePack("ep5") : null')
        for fn in (f1, f2, f3, eye):
            print(fn.__name__)
            fn(lab)
        unknown = [l for l in lab.logs if 'unknown' in l.lower()]
        check(not lab.errors, 'no console errors' + ('' if not lab.errors else ': ' + ' | '.join(lab.errors[:4])))
        check(not unknown, 'no unknown id warnings' + ('' if not unknown else ': ' + ' | '.join(unknown[:6])))
    finally:
        lab.close()
    print('FAILED %d' % len(FAILS) if FAILS else 'ALL OK')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main(sys.argv)
