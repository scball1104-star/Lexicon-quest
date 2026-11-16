"""Episode 8 pop-up book lab (E8-world): drives the real game (with ?pack=ep8) on the test map ep8_testbooks
(src/data/ep8/field/_testbooks.js) with REAL input (LQ_DEBUG.press holds an action for n frames, like a thumb), asserts state
through LQ_DEBUG and saves shots in qa/world/ep8_out/<device>_<name>.png (3x) and _x1.png. Never writes qa/world/out.
Chromium launches with fieldlab.GPU_ARGS (a phone draws on its GPU; software canvas reads about 40% slow) and prints
fieldlab.GPU_JS.

    python next/qa/world/ep8_lab.py                      # every case, the 844x390 phone
    python next/qa/world/ep8_lab.py shut bridge          # some cases
    python next/qa/world/ep8_lab.py --device desktop
    python next/qa/world/ep8_lab.py --sheet              # also build the contact sheet next/qa/out/e8_world_contact.png

Cases: shut (a book shut, close), ghost (the dotted ghost on void and on floor), bridge (a read with real keys: before, mid
open, after; the party walks onto it), wall (pages standing on floor), pair (P open, Q read: the swap, mid fold and after),
contrast (the readability pairs of plan 5.1 measured separately on the frame: page against void, void against floor, ghost
against void and against floor, a standing wall against the floor beside it), tints (rubout and violet: the party's floor
luma), motes (the three painted frames measured pixel by pixel on the real canvas, the mote draw time), perf (book logic and
draw timings). Fails on any console error.
"""
import base64
import io
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fieldlab  # noqa: E402
from fieldlab import Lab, DEVICES, GPU_ARGS, GPU_JS, OUT as FL_OUT  # noqa: E402

OUT = HERE / 'ep8_out'
SHEET = HERE.parent / 'out' / 'e8_world_contact.png'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep8'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')
MAP = 'ep8_testbooks'
DEVICE = ['phone']
RESULTS = {}
SHOTS = []


class GpuLab(Lab):
    """fieldlab.Lab, launched with GPU_ARGS (the timing rule of AGENTS.md)."""

    def __init__(self, device='phone', headless=True, timeout=25000):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.server = fieldlab.shots.start_server()
        self.port = self.server.server_address[1]
        dev = DEVICES[device]
        self.browser = self.pw.chromium.launch(headless=headless, args=GPU_ARGS)
        self.ctx = self.browser.new_context(viewport={'width': dev['width'], 'height': dev['height']},
                                            device_scale_factor=dev['dpr'], is_mobile=dev.get('mobile', False),
                                            has_touch=dev.get('touch', False))
        self.page = self.ctx.new_page()
        self.errors, self.noise, self.logs = [], [], []
        self.page.on('console', self._on_console)
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}\n{getattr(e, "stack", "")}'))
        self.timeout = timeout


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def books(lab):
    return lab.run('LQ_DEBUG.books()')


def image(data):
    from PIL import Image
    return Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')


def grab(lab):
    return image(lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")'))


def shot(lab, name, label=None):
    OUT.mkdir(parents=True, exist_ok=True)
    im = grab(lab)
    stem = f'{DEVICE[0]}_{name}'
    im.save(OUT / f'{stem}_x1.png')
    from PIL import Image
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(OUT / f'{stem}.png')
    if DEVICE[0] == 'phone':
        lab.page.screenshot(path=str(OUT / f'{stem}_page.png'))
    print('  shot', OUT / f'{stem}.png')
    SHOTS.append((label or name, OUT / f'{stem}_x1.png'))
    return im


def setup(lab, x, y, d='up', auto=True, state=None):
    for fl in ('ep8_started', 'mira_joined', 'bram_joined'):
        lab.call('setFlag', fl, True)
    lab.warp(MAP, x, y, d)
    lab.call('party', 'mira', 'bram')
    lab.page.wait_for_function('LQ_DEBUG.commands().includes("books") && LQ_DEBUG.books() && LQ_DEBUG.books().active', timeout=20000, polling=16)
    lab.run(AUTO_JS if auto else 'window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = null')
    lab.frames(170)           # the banner slides out
    if state is not None:
        lab.run(f'LQ_DEBUG.setBooks({json.dumps(state)})')
        lab.frames(2)


def look(lab, x, y):
    """Center the camera on a tile without moving the party (for a framed shot)."""
    lab.run(fjs(f'f.camera.panTo({x} * 16 + 8, {y} * 16 + 8, 0); return true;'))
    lab.frames(2)


def back(lab):
    lab.run(fjs('f.camera.returnTo(f.leader, 0); return true;'))
    lab.frames(2)


def wait(lab, js, ms=15000):
    lab.page.wait_for_function(js, timeout=ms, polling=16)


def lum(px):
    r, g, b = px
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255


def cell_px(im, cam, cx, cy, inset=0):
    px, py = int(cx * 16 - cam[0]), int(cy * 16 - cam[1])
    out = []
    for j in range(inset, 16 - inset):
        for i in range(inset, 16 - inset):
            if 0 <= px + i < im.width and 0 <= py + j < im.height:
                out.append(im.getpixel((px + i, py + j)))
    return out


def mean(vals):
    return sum(vals) / max(1, len(vals))


def sd(vals):
    m = mean(vals)
    return (sum((v - m) ** 2 for v in vals) / max(1, len(vals))) ** 0.5


def camera(lab):
    return lab.run(fjs('return [f.camera.x, f.camera.y, f.lighting.tintName, f.lighting.dark];'))


def face(lab, d):
    lab.run(fjs(f'f.leader.dir = "{d}"; return true;'))
    lab.frames(2)


# ---------------------------------------------------------------- cases
def case_shut(lab):
    setup(lab, 7, 18, 'up', state='------')
    look(lab, 5, 14)
    shot(lab, 'book_shut', 'a book shut (A at the gap, K on the floor)')
    back(lab)
    st = books(lab)
    check(st['state'] == '------', 'all shut')
    check(all(e['frame'] in (0, 4, 8, 12) for e in st['events']), 'every book on its shut frame')


def case_ghost(lab):
    setup(lab, 3, 13, 'up', state='------')
    lab.frames(4)
    st = books(lab)
    check(st['ghost'] and st['ghost']['mode'] == 'open' and st['ghost']['book'] == 'a', 'facing A: the ghost of its pages over the void')
    look(lab, 4, 11)
    shot(lab, 'ghost_void', 'the ghost on void (facing A from the south)')
    back(lab)
    setup(lab, 6, 17, 'up', state='------')
    lab.frames(4)
    st = books(lab)
    check(st['ghost'] and st['ghost']['book'] == 'k', 'facing K: the ghost on floor')
    look(lab, 6, 15)
    shot(lab, 'ghost_floor', 'the ghost on floor (facing K from the south)')
    back(lab)


def case_bridge(lab):
    setup(lab, 3, 13, 'up', auto=False, state='------')
    look(lab, 4, 11)
    shot(lab, 'bridge_before', 'a read: before')
    back(lab)
    lab.press('confirm', 1)
    lab.frames(8)
    look(lab, 4, 11)
    shot(lab, 'bridge_mid', 'mid open (frame 8 of 16)')
    back(lab)
    lab.run(AUTO_JS)
    wait(lab, '(() => { const s = LQ_DEBUG.books(); return s && s.anim === null && !s.busy; })()')
    st = books(lab)
    check(st['state'][0] == 'n', f'A open north ({st["describe"]})')
    check(st['lastRead']['ms'] < 1, f'the read recomputes in {st["lastRead"]["ms"]} ms')
    lab.frames(30)
    look(lab, 4, 11)
    shot(lab, 'bridge_open', 'open as a bridge, the Willowmere model on it')
    back(lab)
    # real keys: round the book and up onto the bridge
    for d, n in (('left', 1), ('up', 2), ('right', 1), ('up', 2)):
        for _ in range(n):
            lab.press(d, 10)
            lab.frames(14)
    lab.frames(30)
    pos = lab.run(fjs('return [f.leader.tx, f.leader.ty];'))
    check(pos == [3, 9], f'the party walked onto the bridge ({pos})')
    look(lab, 4, 10)
    shot(lab, 'bridge_walk', 'the party on the bridge over the void')
    back(lab)
    lab.frames(60)


def case_wall(lab):
    setup(lab, 7, 19, 'up', state={'k': 'n'})
    look(lab, 6, 15)
    shot(lab, 'wall_open', 'open as a wall (K\'s pages standing on the floor)')
    back(lab)
    st = books(lab)
    check(st['walls'] == 6, f'six wall cells ({st["walls"]})')


def case_pair(lab):
    setup(lab, 16, 5, 'right', auto=False, state={'p': 'e'})
    look(lab, 15, 5)
    shot(lab, 'pair_before', 'a pair: P stands, the party faces Q from the island')
    back(lab)
    lab.press('confirm', 1)
    lab.frames(7)
    look(lab, 15, 5)
    shot(lab, 'pair_mid', 'Q opening, P folding (frame 7)')
    back(lab)
    lab.run(AUTO_JS)
    wait(lab, '(() => { const s = LQ_DEBUG.books(); return s && !s.busy && s.anim === null; })()')
    lab.frames(40)
    st = books(lab)
    check(st['open']['q'] == 'e' and st['open']['p'] == '-', f'Q stands, P folded ({st["describe"]})')
    look(lab, 15, 5)
    shot(lab, 'pair_after', 'Q stands, P folded')
    back(lab)
    lab.frames(60)


def case_contrast(lab):
    # A open over the void, K's pages a wall on floor, the camera on both; then the ghosts
    setup(lab, 1, 13, 'up', state={'a': 'n', 'k': 'n'})
    lab.run('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = null')
    look(lab, 5, 12)
    lab.run(fjs('f.frame = 0; return true;'))
    lab.frames(1)
    im = shot(lab, 'contrast', 'contrast framing: a bridge (A), a wall (K), the void, the floor')
    cam = camera(lab)
    void = [lum(p) for c in ((6, 9), (7, 9), (8, 9), (6, 8), (1, 9), (2, 9)) for p in cell_px(im, cam, *c)]
    page = [lum(p) for cy in (8, 9, 10) for cx in (3, 4) for p in cell_px(im, cam, cx, cy, inset=2)]
    floor = [lum(p) for c in ((2, 14), (1, 16), (4, 18), (2, 19), (5, 14)) for p in cell_px(im, cam, *c)]
    wall = [lum(p) for cy in (13, 14, 15) for cx in (6, 7) for p in cell_px(im, cam, cx, cy, inset=1)]
    v, pg, fl, wl = mean(void), mean(page), mean(floor), mean(wall)
    wall_px = mean([abs(x - fl) for x in wall])
    print(f'  void {v:.3f} (sd {sd(void):.3f}); page {pg:.3f}: page - void {pg - v:.3f}')
    print(f'  floor {fl:.3f} (sd {sd(floor):.3f}): floor - void {fl - v:.3f}; wall {wl:.3f}: wall - floor {wl - fl:.3f}, per pixel {wall_px:.3f}')
    check(pg - v >= 0.35, f'page against void at least 0.35 ({pg - v:.3f})')
    check(fl - v >= 0.12, f'void at least 0.12 below the floor ({fl - v:.3f})')
    check(sd(void) < 0.02, f'the void is flat (sd {sd(void):.3f}): never texture')
    check(sd(floor) >= 0.015, f'the floor is textured (sd {sd(floor):.3f})')
    check(wl - fl >= 0.15, f'a standing wall at least 0.15 above the floor beside it ({wl - fl:.3f})')
    RESULTS['contrast'] = {'void': round(v, 3), 'page': round(pg, 3), 'floor': round(fl, 3), 'wall': round(wl, 3),
                           'pageMinusVoid': round(pg - v, 3), 'floorMinusVoid': round(fl - v, 3), 'wallMinusFloor': round(wl - fl, 3)}

    def ghost_pixels(im, cam, cells, under):
        gold, dark = [], []
        for cx, cy in cells:
            for (r, g, b) in cell_px(im, cam, cx, cy):
                if r > 200 and g > 160 and b < 170 and r - b > 60:
                    gold.append(lum((r, g, b)))
                elif r < 80 and g < 50 and b < 40 and r >= b:
                    dark.append(lum((r, g, b)))
        return gold, dark
    # the ghost over void: facing A shut from the south
    setup(lab, 3, 13, 'up', auto=False, state='------')
    lab.frames(4)
    look(lab, 4, 11)
    im = shot(lab, 'contrast_ghost_void', 'contrast framing: the ghost on void')
    cam = camera(lab)
    gold, dark = ghost_pixels(im, cam, [(x, y) for x in (3, 4) for y in (8, 9, 10, 11)], 'void')
    gv = mean(gold) - v
    print(f'  ghost on void: {len(gold)} gold px, mean {mean(gold):.3f}: ghost - void {gv:.3f}')
    check(len(gold) >= 40, f'the ghost dots are there ({len(gold)} px)')
    check(gv >= 0.15, f'the ghost against void at least 0.15 ({gv:.3f})')
    # the ghost over floor: facing K shut from the south
    setup(lab, 6, 17, 'up', auto=False, state='------')
    lab.frames(4)
    look(lab, 6, 14)
    im = shot(lab, 'contrast_ghost_floor', 'contrast framing: the ghost on floor')
    cam = camera(lab)
    gold, dark = ghost_pixels(im, cam, [(x, y) for x in (6, 7) for y in (13, 14, 15)], 'floor')
    outline = gold + dark
    gf = mean([abs(x - fl) for x in outline])
    print(f'  ghost on floor: {len(gold)} gold + {len(dark)} dark px: gold - floor {mean(gold) - fl:.3f}, floor - dark {fl - mean(dark):.3f}, outline mean |diff| {gf:.3f}')
    check(len(dark) >= 20, f'the ghost dots carry their dark edge on floor ({len(dark)} px)')
    check(gf >= 0.15, f'the ghost outline against floor at least 0.15 ({gf:.3f})')
    RESULTS['contrast'].update({'ghostMinusVoid': round(gv, 3), 'ghostOutlineVsFloor': round(gf, 3),
                                'ghostGoldMinusFloor': round(mean(gold) - fl, 3), 'floorMinusGhostDark': round(fl - mean(dark), 3)})


def case_tints(lab):
    out = {}
    for tint, dark in (('rubout', 0), ('violet', 0.2)):
        setup(lab, 4, 17, 'up', state='------')
        lab.run(fjs(f'f.lighting.setTint("{tint}", 0); f.lighting.setDark({dark}); return true;'))
        lab.frames(4)
        im = shot(lab, f'tint_{tint}', f'tint {tint}, dark {dark}')
        cam = camera(lab)
        check(cam[2] == tint, f'the {tint} tint is on')
        floor = mean([lum(p) for c in ((3, 17), (5, 17), (3, 18), (5, 18), (4, 16)) for p in cell_px(im, cam, *c)])
        print(f'  {tint} (dark {dark}): party floor luma {floor:.3f}')
        check(floor >= 0.22, f'the party floor at or above 0.22 under {tint} ({floor:.3f})')
        out[tint] = round(floor, 3)
        lab.run(fjs('f.lighting.setTint("none", 0); f.lighting.setDark(0); return true;'))
    RESULTS['tints'] = out


def case_motes(lab):
    setup(lab, 4, 17, 'up', state='------')
    worst = lab.run(fjs('''
        const T = f.books.ensureTiles(); const S = T.motes[0].w;
        const c = document.createElement("canvas"); c.width = S; c.height = S;
        const g = c.getContext("2d", { willReadFrequently: true }); let worst = 0;
        for (const bg of ["#2a1d4e", "#000000", "#808080"]) {
          const lum = [];
          for (let k = 0; k < 3; k++) { g.globalCompositeOperation = "source-over"; g.fillStyle = bg; g.fillRect(0, 0, S, S);
            g.globalCompositeOperation = "lighter"; g.drawImage(T.motes[k].canvas, 0, 0); g.globalCompositeOperation = "source-over";
            const d = g.getImageData(0, 0, S, S).data, L = new Float32Array(S * S);
            for (let i = 0; i < S * S; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255; lum.push(L); }
          for (let k = 0; k < 3; k++) { const a = lum[k], b = lum[(k + 1) % 3]; for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i])); }
        }
        return worst;'''))
    print(f'  motes: worst per-pixel luma change between frames {worst:.4f} (over the void, black and grey)')
    check(worst is not None and worst <= 0.03 + 1e-6, f'never more than +0.03 luma between mote frames ({worst})')
    fr = []
    for _ in range(4):
        fr.append(books(lab)['moteFrame'])
        lab.frames(30)
    print('  mote frames seen 30 frames apart:', fr)
    check(len(set(fr)) >= 2, 'the motes step on their 30-frame clock')
    lab.run(fjs('f.books.stats.maxMoteMs = 0; return true;'))
    look(lab, 12, 12)          # a screen of void: the most mote cells
    lab.frames(60)
    ms = books(lab)['maxMoteMs']
    print(f'  mote layer: worst {ms} ms a frame over a screen of void')
    check(ms < 0.5, f'the mote layer under 0.5 ms ({ms})')
    back(lab)
    RESULTS['motes'] = {'worstFrameLuma': round(worst, 4), 'maxMs': ms}


def case_perf(lab):
    setup(lab, 3, 13, 'up', state='------')
    lab.run(fjs('f.books.stats.maxDrawMs = 0; f.books.stats.maxUpdateMs = 0; return true;'))
    lab.press('confirm', 1)
    lab.frames(40)
    lab.press('down', 40)
    lab.frames(60)
    st = books(lab)
    print(f'  books update max {st["maxUpdateMs"]} ms, draw max {st["maxDrawMs"]} ms, read {st["readMs"]} ms, reset {st["resetMs"]} ms')
    check(st['maxUpdateMs'] + st['maxDrawMs'] < 3, 'book logic and drawing under 3 ms a frame')
    check(st['readMs'] < 1, 'a read under 1 ms of recompute')
    RESULTS['perf'] = {'updateMs': st['maxUpdateMs'], 'drawMs': st['maxDrawMs'], 'readMs': st['readMs'], 'resetMs': st['resetMs']}


CASES = {'shut': case_shut, 'ghost': case_ghost, 'bridge': case_bridge, 'wall': case_wall, 'pair': case_pair,
         'contrast': case_contrast, 'tints': case_tints, 'motes': case_motes, 'perf': case_perf}


def contact_sheet():
    from PIL import Image, ImageDraw
    if not SHOTS:
        return
    tiles = [(label, Image.open(p).convert('RGB')) for label, p in SHOTS]
    w, h = 384 * 2, 216 * 2
    cols = 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (w + 12) + 12, rows * (h + 34) + 44), (18, 20, 30))
    d = ImageDraw.Draw(sheet)
    d.text((12, 12), 'E8-world: pop-up books on ep8_testbooks (stand-in art until E8-tiles lands). ' + DEVICE[0], fill=(230, 230, 240))
    for k, (label, im) in enumerate(tiles):
        x, y = 12 + (k % cols) * (w + 12), 40 + (k // cols) * (h + 34)
        sheet.paste(im.resize((w, h), Image.NEAREST), (x, y))
        d.text((x, y + h + 6), label, fill=(220, 224, 236))
    SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(SHEET)
    print('  contact sheet', SHEET)


def main(argv):
    if '--device' in argv:
        i = argv.index('--device')
        DEVICE[0] = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    sheet = '--sheet' in argv
    argv = [a for a in argv if a != '--sheet']
    names = argv or list(CASES)
    lab = GpuLab(device=DEVICE[0])
    code = 0
    try:
        lab.open(QUERY)
        print('  renderer:', lab.run(GPU_JS))
        lab.page.wait_for_function('window.LQ_DEBUG && LQ_DEBUG.commands && true', timeout=20000)
        for n in names:
            print('case', n)
            CASES[n](lab)
        if lab.errors:
            print('console errors:')
            for e in lab.errors:
                print('  ', e)
            code = 1
        print(json.dumps(RESULTS))
        if sheet:
            contact_sheet()
    except Exception as e:  # noqa: BLE001
        print('FAILED', e)
        for l in lab.logs[-30:]:
            print('   log', l)
        code = 1
    finally:
        lab.close()
    print('E8_LAB: PASS' if code == 0 else 'E8_LAB: FAIL')
    return code


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
