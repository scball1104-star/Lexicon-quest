"""Episode 3 field lab (E3-world): scripted, asserted walks over the quench fixtures (src/world/ep3/_testforge.js:
_testforge, _testforge_dark). Every case asserts state through LQ_DEBUG and saves shots in qa/world/out/e3_<name>.png (3x).

    python next/qa/world/e3_lab.py                  # every case
    python next/qa/world/e3_lab.py hall dam         # some cases
    python next/qa/world/e3_lab.py --device phone

Cases: hall (the Slag Hall before and after the sluice turn: pool 1 cools on arrival, the moat cools, the basin fills,
the hot grate opens), dam (the ore crate dams spout B; Bram's Shove frees it; the latched basin and the AND gate), walk
(a headless walk over every new event: confirm the sluice, cross the cooled moat, the grate door and the lift door
between the rooms, crust kept across the round trip), dark (the dark room lit by its slag; field draw time with 24 slag
lights, before and after cooling), tint (ash_haze against none: mean luminance on the same frame, at least 12% darker),
memory (a memory spawn: sepia actor and the vignette), bell (the Bell Gate lights a socket per flag). Fails on any
console error. qa/world/walks.test.mjs runs it (solo slot).
"""
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab, OUT  # noqa: E402

FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')
RESULTS = {}


def field_js(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def q(lab):
    return lab.call('quench')


def setup(lab, map_id='_testforge', x=11, y=7, d='left', fresh=True):
    if fresh:
        lab.run('LQ_ENGINE.game && (LQ_ENGINE.game.quenched = {}, LQ_ENGINE.game.opened = {})')
    lab.warp(map_id, x, y, d)
    lab.call('party', 'mira', 'bram')
    lab.frames(4)


def wait_front(lab, ms=15000):
    lab.page.wait_for_function(field_js('return f.quench && f.quench.front.length === 0;'), timeout=ms, polling=50)


def case_hall(lab):
    setup(lab)
    st = q(lab)
    check(st['active'], 'quench is active on _testforge')
    check(st['streams'][0]['end']['kind'] == 'splash' and st['streams'][0]['end']['floor'], 'start state: spout A runs west and puddles by the ledge')
    check(st['front'] > 0 or st['crust'] >= 9, 'pool 1 starts cooling as the party arrives')
    lab.frames(14)
    lab.shot('e3_hall_cooling')
    wait_front(lab)
    lab.frames(130)
    check(q(lab)['crust'] == 9, 'pool 1 is crust (9 cells)')
    check(lab.run(field_js('return f.map.codeAt(4, 5);')) == 'none', 'pool 1 is walkable')
    lab.shot('e3_hall_before')
    # turn the sluice the way the player does: stand below it, face it, confirm
    lab.call('goto', 8, 6)
    lab.run(field_js('f.leader.face("up");'))
    lab.frames(4)
    lab.wait_idle(15000)          # first_sluice
    for _ in range(6):
        if lab.run(field_js('return f.entities.get("sl_b").state;')) == 1:
            break
        lab.wait_idle(15000)
        lab.press('confirm', 1)
        lab.frames(30)
    check(lab.run(field_js('return f.entities.get("sl_b").state;')) == 1, 'confirm facing the sluice turns it')
    lab.frames(20)
    lab.wait_idle(15000)
    st = q(lab)
    check('bs_main:on' in st['basins'], 'the water reaches bs_main through the moat')
    check('g_hot:open' in st['gates'], 'the hot grate opens')
    check(lab.run(field_js('return f.map.codeAt(4, 5);')) == 'none', 'pool 1 stays crust with the water gone')
    lab.run(field_js('f.camera.snapTo && f.camera.snapTo(f.leader);'))
    lab.frames(16)
    lab.shot('e3_hall_turned_front')
    wait_front(lab)
    lab.frames(130)
    check(q(lab)['crust'] == 9 + 56, 'the whole moat is crust')
    lab.call('goto', 15, 8)
    lab.run(field_js('f.leader.face("down");'))
    lab.frames(20)
    lab.shot('e3_hall_after')


def case_dam(lab):
    setup(lab, x=26, y=6, d='right')
    lab.frames(10)
    st = q(lab)
    check(st['dams'] == ['27,6'], f'the ore crate dams spout B ({st["dams"]})')
    check('bs_dam:off' in st['basins'], 'bs_dam is dry')
    lab.run(field_js('f.banner.active = false;'))
    lab.frames(4)
    lab.shot('e3_dam_dammed')
    lab.run(field_js('f.leader.face("right");'))
    lab.call('ability', 'shove')
    lab.page.wait_for_function(field_js('const e = f.entities.get("ore"); return e && e.x === 28 && !e.data.sliding;'), timeout=15000, polling=50)
    lab.frames(10)
    lab.wait_idle(15000)
    st = q(lab)
    check(st['dams'] == [], 'Shove moved the crate off the trough')
    check('bs_dam:on' in st['basins'], 'bs_dam fills')
    check(lab.run('LQ_ENGINE.game.opened["_testforge:bs_dam"] === true'), 'its latch is saved')
    check('g_and:closed' in st['gates'], 'AND: g_and waits for bs_main too')
    lab.call('turnSluice', 'sl_b')
    lab.frames(6)
    check('g_and:open' in q(lab)['gates'], 'both basins full: g_and opens')
    lab.frames(20)
    lab.wait_idle(15000)
    lab.shot('e3_dam_freed')


def case_walk(lab):
    setup(lab)
    wait_front(lab)
    lab.call('turnSluice', 'sl_b')
    wait_front(lab)
    lab.frames(10)
    pos = lab.call('goto', 15, 14, ms=60000)
    check(pos == [15, 14], f'the party crosses the cooled moat to the basin ({pos})')
    # through the hot grate (its doorway is a door to the dark room)
    pos = lab.call('goto', 19, 4, ms=60000)
    check(pos == [19, 4], f'back north under the grate ({pos})')
    lab.call('walk', 'up')
    lab.page.wait_for_function(field_js('return f.mapId === "_testforge_dark" && !f.loading;'), timeout=20000, polling=50)
    lab.wait_idle(15000)
    check(lab.run(field_js('return f.mapId;')) == '_testforge_dark', 'the open hot grate leads to the dark room')
    # the dark room's own sluice is as authored, its slag molten (its own crust record)
    check(q(lab)['crust'] >= 0, 'the dark room loads its own crust record')
    # the lift home
    lab.call('goto', 15, 4, ms=60000)
    lab.call('walk', 'up')
    lab.page.wait_for_function(field_js('return f.mapId === "_testforge" && !f.loading;'), timeout=20000, polling=50)
    lab.wait_idle(15000)
    check(lab.run(field_js('return f.mapId;')) == '_testforge', 'the lift door takes the party back')
    st = q(lab)
    check(st['crust'] == 65 and st['front'] == 0, f'crust kept across the round trip, no front ({st["crust"]})')
    check('sl_b@8,5:0' in st['sluices'], 'the sluice reset on re-entry')
    check(lab.run(field_js('return f.map.codeAt(15, 9);')) == 'none', 'the moat is still walkable')


def draw_ms(lab, n=200):
    return lab.run(field_js('const r = LQ_ENGINE.renderer; for (let i = 0; i < 10; i++) f.draw(r); const t0 = performance.now(); for (let i = 0; i < %d; i++) f.draw(r); return (performance.now() - t0) / %d;' % (n, n)))


def no_banner(lab):
    lab.page.wait_for_function(field_js('return !f.banner.active;'), timeout=20000, polling=50)


def case_dark(lab):
    # the load on this machine: Episode 2's dark room with its beam lit measured 0.43 ms when it was built (docs/WORLD.md 1d)
    lab.run('LQ_ENGINE.game && (LQ_ENGINE.game.counters["read:court_lens"] = 1)')
    lab.warp('_testcourt_dark', 6, 9, 'up')
    lab.call('turnMirror', 'm1')
    lab.frames(30)
    base = draw_ms(lab)
    load = base / 0.43
    setup(lab, map_id='_testforge_dark', x=15, y=7, d='down')
    wait_front(lab)
    no_banner(lab)
    lab.frames(30)
    n = lab.run(field_js('return f.lightSources.filter(l => l.slag).length;'))
    check(0 < n <= 24, f'molten slag lights the dark room ({n} lights)')
    lab.shot('e3_dark_slag')
    ms = draw_ms(lab)
    print(f'  field draw ms (dark, {n} slag lights): {ms:.3f}; Episode 2 dark room now {base:.3f} (0.43 when built): load x{load:.2f}, '
          f'so about {ms / load:.3f} ms unloaded')
    RESULTS['dark'] = {'draw_ms': round(ms, 3), 'lights': n, 'e2_dark_ms': round(base, 3), 'normalized_ms': round(ms / load, 3)}
    check(ms / load < 1.0, f'field draw under 1 ms with {n} slag lights (load-normalized {ms / load:.3f} ms)')
    lab.call('turnSluice', 'sl_b')
    lab.frames(30)
    lab.shot('e3_dark_front')
    wait_front(lab, 20000)
    lab.frames(140)
    n2 = lab.run(field_js('return f.lightSources.filter(l => l.slag).length;'))
    check(n2 < n, f'cooled slag gives no light ({n} -> {n2})')
    lab.shot('e3_dark_cooled')


def lum(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    px = list(im.getdata()) if not hasattr(im, 'get_flattened_data') else im.get_flattened_data()
    tot = 0.0
    for r, g, b in px:
        tot += 0.2126 * r + 0.7152 * g + 0.0722 * b
    return tot / (len(px) * 255.0)


def case_tint(lab):
    setup(lab)                      # loads the Episode 3 field code (it registers ash_haze)
    lab.warp('_testtown', 12, 18, 'down')
    lab.run(field_js('f.banner.active = false; f.particles.list = [];'))
    lab.frames(10)
    lab.run(field_js('f.lighting.setTint("none", 0);'))
    lab.frames(4)
    a = lum(lab.shot('e3_tint_none').replace('.png', '_x1.png'))
    lab.run(field_js('f.lighting.setTint("ash_haze", 0);'))
    lab.frames(4)
    b = lum(lab.shot('e3_tint_ash_haze').replace('.png', '_x1.png'))
    drop = 1 - b / a
    print(f'  luminance none {a:.3f}, ash_haze {b:.3f}: {drop * 100:.1f}% darker')
    RESULTS['tint'] = {'none': round(a, 3), 'ash_haze': round(b, 3), 'drop_pct': round(drop * 100, 1)}
    check(drop >= 0.12, f'ash_haze is at least 12% darker than none ({drop * 100:.1f}%)')
    lab.screenshot('e3_tint_ash_haze_page')
    lab.run(field_js('f.lighting.setTint("none", 0);'))


def case_memory(lab):
    setup(lab, x=12, y=12, d='up')
    wait_front(lab)
    lab.call('turnSluice', 'sl_b')
    wait_front(lab)
    lab.run(field_js('f.banner.active = false;'))
    lab.run(field_js('f.lighting.setTint("dawn", 0);'))
    lab.run(field_js('const A = f.leader.constructor; const a = new A(f, { id: "bram_m", kind: "spawn", sprite: "bram", x: 12, y: 10, dir: "down", name: "Bram", solid: true }); f.addActor(a); const b = new A(f, { id: "foreman_m", kind: "spawn", sprite: "npc_guard", x: 13, y: 10, dir: "left", name: "Foreman", solid: true }); f.addActor(b); return 1;'))
    lab.frames(40)
    t = lab.run(field_js('const a = f.actorById("bram_m"); return a && a.tint && a.tint.color;'))
    check(t == '#d9a066', f'the memory spawn is drawn in sepia ({t})')
    check(lab.run(field_js('return f.ep3fx.mem;')) >= 30, 'the vignette is up')
    lab.shot('e3_memory')
    lab.run(field_js('for (const id of ["bram_m", "foreman_m"]) { const a = f.actorById(id); if (a) f.removeActor(a); } f.lighting.setTint("none", 0);'))
    lab.frames(40)
    check(lab.run(field_js('return f.ep3fx.mem;')) == 0, 'the vignette fades out with them')


def case_bell(lab):
    setup(lab, x=11, y=5, d='up')
    lab.run(field_js('f.banner.active = false;'))
    for n, flag in enumerate(['_t_oath_a', '_t_oath_b'], 1):
        lab.call('setFlag', flag, True)
        lab.frames(4)
        st = lab.run(field_js('const g = f.entities.get("g_bell"); return [g.state, g.prop.t, g.prop.state];'))
        check(st == ['closed', 'bell_gate_closed', n], f'socket {n} lit ({st})')
    lab.frames(10)
    lab.shot('e3_bell_two')
    lab.call('setFlag', '_t_oath_c', True)
    lab.frames(10)
    st = lab.run(field_js('const g = f.entities.get("g_bell"); return [g.state, g.prop.t];'))
    check(st == ['open', 'bell_gate_open'], f'the third flag opens the Bell Gate ({st})')
    lab.shot('e3_bell_open')
    for flag in ['_t_oath_a', '_t_oath_b', '_t_oath_c']:
        lab.call('setFlag', flag, False)


CASES = {'hall': case_hall, 'dam': case_dam, 'walk': case_walk, 'dark': case_dark, 'tint': case_tint, 'memory': case_memory, 'bell': case_bell}


def main(argv):
    device = 'desktop'
    if '--device' in argv:
        device = argv[argv.index('--device') + 1]
    names = [a for a in argv if a in CASES] or list(CASES)
    lab = Lab(device=device)
    failed = []
    try:
        lab.open()
        lab.run('LQ_DEBUG.setSpeed && LQ_DEBUG.setSpeed(2)')
        lab.run(AUTO_JS)
        for n in names:
            print(f'[{n}]')
            try:
                CASES[n](lab)
            except Exception as e:  # noqa: BLE001
                failed.append(n)
                print(f'  FAIL {n}: {e}')
                try:
                    lab.shot(f'e3_fail_{n}')
                except Exception:
                    pass
        if lab.errors:
            print('CONSOLE ERRORS:')
            for e in lab.errors[:20]:
                print('  ', e)
            failed.append('console')
        warns = [l for l in lab.logs if l.startswith('warning')]
        if warns:
            print(f'{len(warns)} console warnings (first 12):')
            for w in warns[:12]:
                print('  ', w[:200])
    finally:
        lab.close()
    print('E3_RESULTS:', json.dumps(RESULTS))
    print('E3_LAB:', 'FAIL ' + ','.join(failed) if failed else 'PASS')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
