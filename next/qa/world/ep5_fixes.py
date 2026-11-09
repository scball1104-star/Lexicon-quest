"""E5-fixes B (field art and maps): before and after frames of every visual change, in the real game, at phone size.

    python next/qa/world/ep5_fixes.py --tag before            # every case, phone 844 x 390
    python next/qa/world/ep5_fixes.py --tag after ship haven  # some cases
    python next/qa/world/ep5_fixes.py --tag after --device desktop

Each case starts from LQ_DEBUG.newGameEp5 (the quick-start party), sets the story flags a save would hold at that beat, warps
and frames the place. Output: qa/world/ep5_out/fixes/<tag>_<device>_<case>.png (the 384 x 216 frame at 3x), _x1.png, and on
the phone _page.png (the whole 844 x 390 screen with the touch controls, halved from the 3x device pixels). It also prints
the luma measures the brief asks for (deck and party, paving under shade, running against firm sand). Fails on any console
error. Never writes to qa/world/out.

Cases: ship (the Saffron Wind's deck at night), haven (Saffron Haven at dusk: the gate on entry, the oasis and the tower),
shade (shade on F1's paving at dawn, the Groove), hours (the road's dial at noon and at dawn), island (the noon stair to the
road's island), spring (spring_return once filled: the rest prompt), vex (vex_gallery's staging on the Star Floor).
"""
import base64
import io
import json
import pathlib
import sys
import threading
import os

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fieldlab  # noqa: E402
from fieldlab import Lab  # noqa: E402

fieldlab.DEVICES.setdefault('portrait', {'width': 375, 'height': 812, 'dpr': 3, 'mobile': True, 'touch': True})

OUT = HERE / 'ep5_out' / 'fixes'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep4,ep5&ep=5&dev=91'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
CFG = {'tag': 'before', 'device': 'phone'}

MORNING = ['ep5_morning_done', 'ep5_started']
SHIP = MORNING + ['ship_boarded', 'ship_arrived']
ROAD = SHIP + ['bram_asked', 'bram_told', 'ship_first_fight_done', 'road_landed', 'saw_glass_flat']
HAVEN = ROAD + ['tent_rested', 'saw_haven', 'haven_arrived']
SEL = HAVEN + ['met_sel', 'moonwell_seen']
LAB = SEL + ['star_reading_done', 'sky_learned', 'gnomon_get', 'lab_entered', 'lab_f1_arrived']
F2 = LAB + ['sel_memory_1', 'plate_f1_open', 'sun_key_found', 'lab_f1_done', 'lab_f2_arrived', 'sel_memory_2']
F3 = F2 + ['vex_gallery_met', 'fifth_list_get', 'star_restored', 'knight_tried', 'knight_defeated', 'lab_f2_done', 'lab_f3_arrived', 'sel_walked_in']
PAGE = F3 + ['landing_shelter', 'landing_truth', 'landing_return', 'sel_memory_3', 'oracle_door_open']
KEYS = {'gnomon': 1, 'star_letter': 1}


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def start(lab, names, items=KEYS):
    lab.call('newGameEp5', 'Arden', {'slot': 0, 'scene': 'none'}, ms=60000)
    its = ' '.join(f'g.items[{json.dumps(k)}] = {v};' for k, v in (items or {}).items())
    lab.run("(async () => { const g = LQ_ENGINE.game; for (const f of " + json.dumps(names) + ") g.flags[f] = true; " + its
            + " const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1; return true; })()")


AUTO = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
        'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 90)')
NOAUTO = 'window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = null'


def idle(lab, ms=90000):
    lab.page.wait_for_function('(() => { const s = LQ_DEBUG.state(); const f = s.sceneState || {}; return s.scene === "field" && !s.transition && !f.locked && !(f.leader && f.leader.moving); })()',
                               timeout=ms, polling=100)


def warp(lab, map_id, x, y, d='down', auto=True):
    lab.warp(map_id, x, y, d)
    if auto:
        lab.run(AUTO)
    lab.frames(90)
    idle(lab)
    lab.frames(150)          # the map banner slides out


def look(lab, x, y):
    lab.run(fjs(f'f.camera.panTo({x} * 16 + 8, {y} * 16 + 8, 0); return true;'))
    lab.frames(3)


def follow(lab):
    lab.run(fjs('f.camera.returnTo(f.leader, 0); return true;'))
    lab.frames(3)


def hour(lab, h):
    lab.run("(async () => { await LQ_DEBUG.setHour(" + json.dumps(h) + "); return true; })()")
    lab.page.wait_for_function("(() => { const d = LQ_DEBUG.shade(); return d && !d.busy && d.anim == null && LQ_DEBUG.scene() === 'field'; })()", timeout=20000, polling=50)
    lab.frames(40)


def shot(lab, name):
    from PIL import Image
    OUT.mkdir(parents=True, exist_ok=True)
    data = lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")')
    im = Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')
    stem = f"{CFG['tag']}_{CFG['device']}_{name}"
    im.save(OUT / f'{stem}_x1.png')
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(OUT / f'{stem}.png')
    if CFG['device'] in ('phone', 'portrait'):
        raw = lab.page.screenshot()
        pg = Image.open(io.BytesIO(raw)).convert('RGB')
        pg.resize((pg.width // 2, pg.height // 2), Image.LANCZOS).save(OUT / f'{stem}_page.png')
    print('  shot', OUT / f'{stem}.png', flush=True)
    return im


LUMA = ('(boxes) => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); const c = LQ_ENGINE.renderer.canvas; const g = c.getContext("2d"); '
        'const k = c.width / LQ_ENGINE.renderer.W; return boxes.map(([x, y, w, h]) => { const [sx, sy] = f.camera.toScreen(x * 16, y * 16); '
        'const d = g.getImageData(Math.round(sx * k), Math.round(sy * k), Math.max(1, Math.round(w * 16 * k)), Math.max(1, Math.round(h * 16 * k))).data; let s = 0; '
        'for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return Math.round(s / (d.length / 4) / 255 * 1000) / 1000; }); }')


def luma(lab, boxes):
    """Mean Rec. 709 luma of tile boxes [x, y, w, h] (tiles) on the live frame (sRGB values, as CRITIQUE_7 measures)."""
    return lab.page.evaluate(LUMA, boxes)


def actor_luma(lab, ids):
    """Mean luma of the opaque pixels of each party member's body (feet up 22 px, 12 wide) on the live frame."""
    js = ('(ids) => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); const c = LQ_ENGINE.renderer.canvas; const g = c.getContext("2d"); '
          'const k = c.width / LQ_ENGINE.renderer.W; const all = [f.leader, ...f.followers]; return ids.map((id, n) => { const a = all[n]; if (!a) return null; '
          'const [sx, sy] = f.camera.toScreen(a.feetX - 6, a.feetY - 22); const d = g.getImageData(Math.round(sx * k), Math.round(sy * k), Math.round(12 * k), Math.round(20 * k)).data; '
          'let s = 0, m = 0; for (let i = 0; i < d.length; i += 4) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; m++; } return Math.round(s / m / 255 * 1000) / 1000; }); }')
    return lab.page.evaluate(js, ids)


# ---------------------------------------------------------------------------------------------------------------- cases
def case_ship(lab):
    start(lab, SHIP)
    warp(lab, 'ep5_ship', 5, 7, 'right')
    lab.run(fjs('f.leader.setPos(12, 6, "right"); if (f.followers[0]) f.followers[0].setPos(11, 6, "right"); if (f.followers[1]) f.followers[1].setPos(10, 6, "right"); return true;'))
    lab.frames(30)
    follow(lab)
    look(lab, 12, 6)
    deck = luma(lab, [[3, 4, 10, 6], [14, 4, 7, 6]])
    party = actor_luma(lab, ['hero', 'mira', 'bram'])
    print(f'  deck luma (aft, fore) {deck}; party body luma {party}')
    shot(lab, 'ship')
    look(lab, 18, 6)
    shot(lab, 'ship_bow')
    # after the deck fight: dawn, the darkness gone with the night
    lab.run('(() => { LQ_ENGINE.game.flags.ship_first_fight_done = true; LQ_ENGINE.game.flags.bram_asked = true; return true; })()')
    warp(lab, 'ep5_ship', 12, 6, 'right')
    print('  dawn deck luma', luma(lab, [[3, 4, 10, 6]]), 'dark', lab.run(fjs('return f.lighting.dark;')), 'tint', lab.run(fjs('return f.lighting.tintName;')))
    shot(lab, 'ship_dawn')


def case_haven(lab):
    start(lab, SEL)
    warp(lab, 'ep5_saffron', 21, 30, 'up')
    follow(lab)
    shot(lab, 'haven_gate')
    print('  gate plaza paving luma', luma(lab, [[19, 26, 6, 3]]))
    lab.run(fjs('f.leader.setPos(21, 24, "up"); return true;'))
    lab.frames(20)
    follow(lab)
    shot(lab, 'haven_plaza')
    look(lab, 26, 11)
    shot(lab, 'haven_oasis')
    print('  tower court paving luma', luma(lab, [[19, 10, 3, 2]]))


def case_shade(lab):
    start(lab, LAB)
    warp(lab, 'ep5_lab_f1', 23, 18, 'down')
    hour(lab, 'dawn')
    look(lab, 23, 17)
    shot(lab, 'shade_f1b_dawn')
    print('  F1 B dawn: shaded paving, lit paving', luma(lab, [[16, 17, 3, 1], [16, 15, 3, 1]]))
    hour(lab, 'dusk')
    look(lab, 23, 17)
    shot(lab, 'shade_f1b_dusk')


def case_hours(lab):
    start(lab, ROAD)
    warp(lab, 'ep5_caravan_road', 14, 11, 'up')
    look(lab, 17, 12)
    shot(lab, 'road_noon')
    print('  noon: unshaded sand patch, paving', luma(lab, [[19, 16, 2, 2], [10, 13, 2, 1]]))
    hour(lab, 'dawn')
    look(lab, 17, 12)
    shot(lab, 'road_dawn')
    print('  dawn: unshaded sand patch, paving', luma(lab, [[19, 16, 2, 2], [10, 13, 2, 1]]))
    print('  dawn: running sand, the firm bridge (row 13)', luma(lab, [[18, 16, 3, 1], [18, 13, 3, 1]]))
    hour(lab, 'dusk')
    look(lab, 17, 12)
    shot(lab, 'road_dusk')
    print('  dusk: unshaded sand patch, paving', luma(lab, [[19, 16, 2, 2], [10, 13, 2, 1]]))


def case_island(lab):
    start(lab, ROAD)
    warp(lab, 'ep5_caravan_road', 15, 8, 'right')
    look(lab, 18, 8)
    shot(lab, 'road_island_noon')


def case_spring(lab):
    start(lab, PAGE)
    warp(lab, 'ep5_lab_f3', 13, 32, 'left')
    lab.run(NOAUTO)
    look(lab, 13, 32)
    shot(lab, 'spring_return')
    st = lab.run(fjs('const e = f.entities.get("spring_return_full"); return e ? { present: e.present, safe: !!e.ev.safe, rest: !!e.ev.rest } : null;'))
    print('  spring_return_full', st)
    lab.press('confirm', 1)
    lab.page.wait_for_function('LQ_DEBUG.scene() === "dialog"', timeout=10000, polling=50)
    for _ in range(4):
        lab.frames(40)
        txt = lab.run('(LQ_ENGINE.scene && LQ_ENGINE.scene.pageText) || ""')
        if 'Rest here' in txt:
            break
        lab.press('confirm', 1)
    lab.frames(30)
    print('  box:', lab.run('(LQ_ENGINE.scene && LQ_ENGINE.scene.pageText) || ""'))
    shot(lab, 'spring_return_prompt')


def case_vex(lab):
    start(lab, F2)
    warp(lab, 'ep5_lab_f2', 21, 6, 'right')
    lab.run(NOAUTO)
    lab.run("(() => { LQ_DEBUG.call('scene', 'vex_gallery'); return true; })()")
    js = ("(async () => { const rx = /Every night it looks for you/; for (let i = 0; i < 1500; i++) { const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { if (!s.typing && rx.test(s.pageText || '')) return i; if (!s.typing || i % 4 === 0) LQ_DEBUG.press('confirm', 1); } "
          "else if (s && (s.name === 'choice' || s.name === 'titleCard')) LQ_DEBUG.press('confirm', 1); "
          "await new Promise(r => setTimeout(r, 40)); } throw new Error('the line never showed'); })()")
    lab.page.evaluate(js)
    lab.frames(10)
    pos = lab.run(fjs('const c = f.cutscene; const out = {}; for (const id of ["hero", "mira", "bram", "vex"]) { const a = c && c.actor ? c.actor(id) : null; if (a) out[id] = [a.tx, a.ty]; } '
                      'out.e_c = (f.entities.get("e_c") || {}).present; return out;'))
    print('  staged', pos)
    shot(lab, 'vex_staging')


CASES = {'ship': case_ship, 'haven': case_haven, 'shade': case_shade, 'hours': case_hours, 'island': case_island,
         'spring': case_spring, 'vex': case_vex}


def main(argv):
    if '--tag' in argv:
        i = argv.index('--tag'); CFG['tag'] = argv[i + 1]; del argv[i:i + 2]
    if '--device' in argv:
        i = argv.index('--device'); CFG['device'] = argv[i + 1]; del argv[i:i + 2]
    t = threading.Timer(600, lambda: (print('FAIL: ep5_fixes.py over 600 s', flush=True), os._exit(3)))
    t.daemon = True
    t.start()
    names = argv or list(CASES)
    bad = 0
    for n in names:
        print(n, flush=True)
        lab = Lab(device=CFG['device'])
        try:
            lab.open(QUERY)
            lab.page.wait_for_function("LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp5')", timeout=60000)
            CASES[n](lab)
            if lab.errors:
                bad += 1
                print('  console errors:\n    ' + '\n    '.join(lab.errors[:6]))
            warns = sorted({l for l in lab.logs if l.startswith('warning') and 'unknown' in l})
            if warns:
                print('  warnings:\n    ' + '\n    '.join(warns[:8]))
        except Exception as e:  # noqa: BLE001
            bad += 1
            print('  FAIL', n, str(e)[:400])
        finally:
            lab.close()
    print('ALL OK' if not bad else f'{bad} FAILED')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
