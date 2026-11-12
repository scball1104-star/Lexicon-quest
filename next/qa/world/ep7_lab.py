"""Episode 7 name stone lab (E7-world): drives the real game (with ?pack=ep7) on the test map ep7_testremember
(src/data/ep7/field/_testremember.js) with REAL input (LQ_DEBUG.press holds an action for n frames, like a thumb), asserts
state through LQ_DEBUG and saves shots in qa/world/ep7_out/<device>_<name>.png (3x) and _x1.png. Never writes qa/world/out.

    python next/qa/world/ep7_lab.py                    # every case, desktop
    python next/qa/world/ep7_lab.py read contrast      # some cases
    python next/qa/world/ep7_lab.py --device phone     # the 844x390 phone (the contrast pairs are measured there)
    python next/qa/world/ep7_lab.py --sheet            # also build the contact sheet next/qa/out/e7_world_contact.png

Cases: read (a read before, mid draw-in and after, the float line), letgo (the third name lets the first go: the far frost
door melts and the camera pans to it), frost (the door shut and melted from one framing), ghost (the ghost trail beside a
held path), stones (a close look at the cairns: dim, lit, guttering; the iceglass plates), dark (dark 0.45: a lamp pool over
every held stone), aurora (tint aurora at dark 0.3 with a lamp pool: the party's floor luma, and the aurora frames measured
pixel by pixel on the real painted layers), whiteout (the tint, the party's floor luma), contrast (three pairs, separately:
ghost trail against fade, held path against fade, snow against fade), perf (stone logic and draw timings). Fails on any
console error.
"""
import base64
import io
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fieldlab  # noqa: E402
from fieldlab import Lab  # noqa: E402

OUT = HERE / 'ep7_out'
SHEET = HERE.parent / 'out' / 'e7_world_contact.png'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep7&dev=71'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')
MAP = 'ep7_testremember'
DEVICE = ['desktop']
RESULTS = {}
SHOTS = []


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def stones(lab):
    return lab.run('LQ_DEBUG.stones()')


def image(data):
    from PIL import Image
    return Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')


def shot(lab, name, label=None):
    OUT.mkdir(parents=True, exist_ok=True)
    im = image(lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")'))
    stem = f'{DEVICE[0]}_{name}'
    im.save(OUT / f'{stem}_x1.png')
    from PIL import Image
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(OUT / f'{stem}.png')
    if DEVICE[0] == 'phone':
        lab.page.screenshot(path=str(OUT / f'{stem}_page.png'))
    print('  shot', OUT / f'{stem}.png')
    SHOTS.append((label or name, OUT / f'{stem}_x1.png'))
    return im


def setup(lab, x, y, d='up', auto=True, held=None):
    for fl in ('ep7_started', 'mira_joined', 'bram_joined'):
        lab.call('setFlag', fl, True)
    lab.warp(MAP, x, y, d)
    lab.call('party', 'mira', 'bram')
    lab.page.wait_for_function('LQ_DEBUG.commands().includes("stones") && LQ_DEBUG.stones() && LQ_DEBUG.stones().active', timeout=20000, polling=16)
    if auto:
        lab.run(AUTO_JS)
    else:
        lab.run('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = null')
    lab.frames(80)            # the banner slides out
    if held is not None:
        lab.run(f'LQ_DEBUG.holdStones({json.dumps(held)})')
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


def cell_pixels(im, cam, cx, cy):
    px, py = int(cx * 16 - cam[0]), int(cy * 16 - cam[1])
    return [lum(im.getpixel((px + i, py + j))) for j in range(16) for i in range(16)
            if 0 <= px + i < im.width and 0 <= py + j < im.height]


def stats(vals):
    n = max(1, len(vals))
    m = sum(vals) / n
    sd = (sum((v - m) ** 2 for v in vals) / n) ** 0.5
    return m, sd


def camera(lab):
    return lab.run(fjs('return [f.camera.x, f.camera.y, f.lighting.tintName, f.lighting.dark];'))


def read_now(lab):
    lab.press('confirm', 1)


# ---------------------------------------------------------------- cases
def case_read(lab):
    setup(lab, 6, 14, 'up', auto=False)
    look(lab, 10, 15)
    shot(lab, 'read_before', 'a read: before')
    back(lab)
    read_now(lab)
    lab.frames(9)
    look(lab, 10, 15)
    shot(lab, 'read_mid', 'mid draw-in (frame 9 of 16)')
    back(lab)
    lab.run(AUTO_JS)
    wait(lab, '(() => { const s = LQ_DEBUG.stones(); return s && s.anim === null && !s.busy; })()')
    st = stones(lab)
    check(st['held'] == ['d', 'a'], f'held d and a ({st["held"]})')
    check(st['lastRead']['ms'] < 1, f'the read recomputes in {st["lastRead"]["ms"]} ms')
    lab.frames(10)
    look(lab, 10, 15)
    shot(lab, 'read_after', 'after: the road and its prints')
    back(lab)
    lab.frames(90)
    RESULTS['read'] = {'held': st['held'], 'ms': st['lastRead']['ms']}


def case_letgo(lab):
    setup(lab, 13, 15, 'up', auto=False, held=['d', 'a'])
    shot(lab, 'letgo_before', 'held d, a: the oldest gutters')
    read_now(lab)
    wait(lab, '(() => { const s = LQ_DEBUG.stones(); return s && s.held.join("") === "ac"; })()')
    # the pan: wait until the camera is over the door (29, 15), then shoot
    wait(lab, fjs("return f.camera.x >= 150;"), ms=8000)     # the camera clamps at the map edge (x 160)
    lab.frames(14)
    shot(lab, 'letgo_pan', 'c lets d go: the pan to the far door')
    lab.run(AUTO_JS)
    wait(lab, '(() => { const s = LQ_DEBUG.stones(); return s && !s.busy; })()')
    lab.frames(120)
    st = stones(lab)
    check(st['lastRead']['letGo'] == ['d'] and st['lastRead']['far'] == 1, 'd let go, and the far door was revealed')
    check(st['solidFrost'] == 0, 'the door melted')


def case_frost(lab):
    setup(lab, 26, 17, 'up', held=['d', 'a'])
    look(lab, 28, 15)
    shot(lab, 'frost_shut', 'frost door: held shut')
    lab.run('LQ_DEBUG.holdStones(["a", "c"])')
    lab.frames(4)
    look(lab, 28, 15)
    shot(lab, 'frost_melted', 'frost door: melted')
    back(lab)
    st = stones(lab)
    check(st['solidFrost'] == 0, 'melted')


def case_ghost(lab):
    setup(lab, 15, 14, 'up', held=['b', 'c'])
    look(lab, 15, 12)
    shot(lab, 'ghost_beside_held', 'ghost trail (a) beside held paths (b, c)')
    back(lab)


def case_stones(lab):
    setup(lab, 15, 13, 'up', held=['a', 'b'])
    look(lab, 14, 13)
    lab.run(fjs('f.frame = 30 * 7; return true;'))
    lab.frames(1)
    shot(lab, 'stones_close', 'cairns: b lit, a guttering, c dim')
    back(lab)
    setup(lab, 26, 15, 'up', held=['c', 'd'])
    look(lab, 26, 14)
    shot(lab, 'plates_close', 'iceglass plates: c guttering, d lit')
    back(lab)


def case_dark(lab):
    setup(lab, 13, 16, 'up', held=['d', 'a'])
    lab.run(fjs('f.lighting.setDark(0.45); return true;'))
    lab.frames(6)
    look(lab, 11, 15)
    im = shot(lab, 'dark_lamps', 'dark 0.45: a lamp pool over each held stone')
    back(lab)
    RESULTS['dark'] = {'lights': lab.run(fjs('return f.stones.lights().length;'))}
    check(RESULTS['dark']['lights'] >= 3, 'a lamp pool over each held cairn, and light along the held path')
    lab.run(fjs('f.lighting.setDark(0); return true;'))


def case_aurora(lab):
    setup(lab, 16, 15, 'up', held=['b', 'c'])
    lab.run(fjs('f.map.mod.lighting = { tint: "aurora", dark: 0.3, aurora: { y0: 0, y1: 9 } }; f.lighting.setTint("aurora", 0); '
                'f.lighting.setDark(0.3); f.stones.aurora = null; return true;'))
    lab.frames(4)
    look(lab, 16, 10)
    im = shot(lab, 'aurora_lamp', 'tint aurora, dark 0.3, lamp pools')
    look(lab, 12, 5)
    shot(lab, 'aurora_band', 'the aurora band overhead (rows 0 to 9)')
    back(lab)
    lab.frames(2)
    im = image(lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")'))
    cam = camera(lab)
    check(cam[2] == 'aurora', 'the aurora tint is on')
    floor = stats(cell_pixels(im, cam, 15, 15) + cell_pixels(im, cam, 17, 15))[0]
    print(f'  party floor luma {floor:.3f} under aurora at dark 0.3')
    check(floor >= 0.22, f'the party floor at or above 0.22 ({floor:.3f})')
    # the painted aurora frames, composited over a mid-grey and over black: the largest per-pixel luma change between frames
    worst = lab.run(fjs('''
        const A = f.stones.aurora; if (!A) return null;
        const W = A.layers[0].w, H = A.layers[0].h, c = document.createElement("canvas"); c.width = W; c.height = H;
        const g = c.getContext("2d", { willReadFrequently: true }); let worst = 0;
        for (const bg of ["#000000", "#808080", "#ffffff"]) {
          const lum = [];
          for (let k = 0; k < 3; k++) { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.drawImage(A.layers[k].canvas, 0, 0);
            const d = g.getImageData(0, 0, W, H).data, L = new Float32Array(W * H);
            for (let i = 0; i < W * H; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255; lum.push(L); }
          for (let k = 0; k < 3; k++) { const a = lum[k], b = lum[(k + 1) % 3]; for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i])); }
        }
        return worst;'''))
    print(f'  aurora: worst per-pixel luma change between frames {worst:.4f} (over black, grey and white)')
    check(worst is not None and worst <= 0.05, f'never more than +0.05 luma between aurora frames ({worst})')
    fr = []
    for _ in range(4):
        fr.append(lab.run('LQ_DEBUG.stones().aurora'))
        lab.frames(30)
    print('  aurora frames seen 30 frames apart:', fr)
    check(len(set(fr)) >= 2, 'the aurora steps on its 30-frame clock')
    lab.run(fjs('f.map.mod.lighting = { tint: "none", dark: 0 }; f.lighting.setTint("none", 0); f.lighting.setDark(0); f.stones.aurora = null; return true;'))
    RESULTS['aurora'] = {'floor': round(floor, 3), 'worstFrameLuma': round(worst, 4)}


def case_whiteout(lab):
    setup(lab, 16, 15, 'up', held=['b', 'c'])
    lab.run(fjs('f.lighting.setTint("whiteout", 0); return true;'))
    lab.frames(4)
    im = shot(lab, 'whiteout', 'tint whiteout (the road scene)')
    cam = camera(lab)
    floor = stats(cell_pixels(im, cam, 15, 15) + cell_pixels(im, cam, 17, 15))[0]
    fade = stats(cell_pixels(im, cam, 9, 12))[0]
    print(f'  whiteout: party floor luma {floor:.3f}, fade {fade:.3f}')
    check(floor >= 0.22, f'the party floor at or above 0.22 ({floor:.3f})')
    lab.run(fjs('f.lighting.setTint("none", 0); return true;'))
    RESULTS['whiteout'] = {'floor': round(floor, 3), 'fade': round(fade, 3)}


def case_contrast(lab):
    setup(lab, 15, 14, 'up', held=['b', 'c'])
    look(lab, 15, 14)
    im = shot(lab, 'contrast', 'contrast framing')
    cam = camera(lab)
    fadev = []
    for cx, cy in ((9, 12), (10, 12), (11, 13), (8, 17), (10, 18), (21, 13)):
        fadev += cell_pixels(im, cam, cx, cy)
    fade, fade_sd = stats(fadev)
    # ghost trail: the print pixels of unheld path a (x 7..12, row 15): pixels clearly off the fade
    ghost = [v for cx in range(7, 13) for v in cell_pixels(im, cam, cx, 15) if v < fade - 0.03]
    g_mean = stats(ghost)[0]
    # held path: b (column 16, rows 5..10) and c (row 16, x 20..24), whole cells
    heldv = []
    for cy in range(5, 11):
        heldv += cell_pixels(im, cam, 16, cy)
    for cx in range(20, 25):
        heldv += cell_pixels(im, cam, cx, 16)
    h_mean, h_sd = stats(heldv)
    snowv = []
    for cx, cy in ((14, 17), (17, 18), (18, 12), (3, 14), (4, 18), (14, 2)):
        snowv += cell_pixels(im, cam, cx, cy)
    s_mean, s_sd = stats(snowv)
    print(f'  fade {fade:.3f} (sd {fade_sd:.3f}); ghost prints {g_mean:.3f} ({len(ghost)} px): fade - ghost {fade - g_mean:.3f}')
    print(f'  held path {h_mean:.3f} (sd {h_sd:.3f}): fade - held {fade - h_mean:.3f}; snow {s_mean:.3f} (sd {s_sd:.3f}): fade - snow {fade - s_mean:.3f}')
    check(len(ghost) >= 6 * 6, f'every unheld path cell carries prints ({len(ghost)} px)')
    check(fade - g_mean >= 0.08, f'the ghost trail at least 0.08 luma below the fade ({fade - g_mean:.3f})')
    check(fade - h_mean >= 0.2 and h_sd >= 0.015, f'the held path at least 0.2 below the fade and textured ({fade - h_mean:.3f}, sd {h_sd:.3f})')
    check(fade - s_mean >= 0.1 and s_sd >= 0.015, f'the snow at least 0.1 below the fade and textured ({fade - s_mean:.3f}, sd {s_sd:.3f})')
    check(fade_sd < 0.02, f'the fade is flat (sd {fade_sd:.3f}): never shading, never prints, never snow')
    RESULTS['contrast'] = {'fade': round(fade, 3), 'fadeSd': round(fade_sd, 3), 'ghost': round(g_mean, 3), 'held': round(h_mean, 3),
                           'heldSd': round(h_sd, 3), 'snow': round(s_mean, 3), 'snowSd': round(s_sd, 3),
                           'fadeMinusGhost': round(fade - g_mean, 3), 'fadeMinusHeld': round(fade - h_mean, 3), 'fadeMinusSnow': round(fade - s_mean, 3)}
    back(lab)


def case_perf(lab):
    setup(lab, 13, 15, 'up', held=['d', 'a'])
    lab.run(fjs('f.stones.stats.maxDrawMs = 0; f.stones.stats.maxUpdateMs = 0; return true;'))
    read_now(lab)
    lab.frames(40)
    lab.press('down', 60)
    lab.frames(90)
    st = stones(lab)
    print(f'  stones update max {st["maxUpdateMs"]} ms, draw max {st["maxDrawMs"]} ms, read {st["readMs"]} ms, reset {st["resetMs"]} ms')
    check(st['maxUpdateMs'] + st['maxDrawMs'] < 3, 'stone logic and drawing under 3 ms a frame')
    check(st['readMs'] < 1, 'a read under 1 ms of recompute')
    RESULTS['perf'] = {'updateMs': st['maxUpdateMs'], 'drawMs': st['maxDrawMs'], 'readMs': st['readMs'], 'resetMs': st['resetMs']}


CASES = {'read': case_read, 'letgo': case_letgo, 'frost': case_frost, 'ghost': case_ghost, 'stones': case_stones,
         'dark': case_dark, 'aurora': case_aurora, 'whiteout': case_whiteout, 'contrast': case_contrast, 'perf': case_perf}


def contact_sheet():
    """Every shot of this run, 2x, four across, a label under each: next/qa/out/e7_world_contact.png."""
    from PIL import Image, ImageDraw
    if not SHOTS:
        return
    tiles = [(label, Image.open(p).convert('RGB')) for label, p in SHOTS]
    w, h = 384 * 2, 216 * 2
    cols = 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (w + 12) + 12, rows * (h + 34) + 44), (18, 20, 30))
    d = ImageDraw.Draw(sheet)
    d.text((12, 12), 'E7-world: name stones on ep7_testremember (stand-in art until E7-tiles lands). ' + DEVICE[0], fill=(230, 230, 240))
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
    lab = Lab(device=DEVICE[0])
    code = 0
    try:
        lab.open(QUERY)
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
    return code


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
