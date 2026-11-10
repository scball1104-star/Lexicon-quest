"""Episode 6 gust lane lab (E6-world): drives the real game (with ?pack=ep6) on the test maps ep6_testwind and ep6_testring
(src/data/ep6/field/_testwind.js) with REAL held input (LQ_DEBUG.press holds an action for n frames, like a thumb), asserts
state through LQ_DEBUG and saves shots in qa/world/ep6_out/<device>_<name>.png (3x) and _x1.png. Never writes qa/world/out.

    python next/qa/world/ep6_lab.py                    # every case, desktop
    python next/qa/world/ep6_lab.py ride vane          # some cases
    python next/qa/world/ep6_lab.py --device phone

Cases: ride (lane A before, mid-ride and after, the direction held through the ride and 40 frames past it: one landing cell,
no extra step), post (the ride stops on the post; step off), vane (both states of group a from the same framing; the swing;
the refusal on the post with Mira's line), ring (the storm ring mid-ride and at its post), storm (the storm tint with a lamp
pool: the party's floor luma; the lightning peak measured by drawing one frame without and one at the peak of a flash),
contrast (the chevrons against the lane band they sit on, and the band against plain cloud), duct (the same lanes as
F2's ducts: the duct chevrons against the duct bed), perf (wind logic and draw timings). Fails on any console error.
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

OUT = HERE / 'ep6_out'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep6&dev=61'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')
DEVICE = ['desktop']
RESULTS = {}


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def fjs(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def wind(lab):
    return lab.run('LQ_DEBUG.wind()')


def leader(lab):
    return lab.run(fjs('return [f.leader.tx, f.leader.ty, f.leader.moving];'))


def image(data):
    from PIL import Image
    return Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')


def shot(lab, name):
    OUT.mkdir(parents=True, exist_ok=True)
    im = image(lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")'))
    stem = f'{DEVICE[0]}_{name}'
    im.save(OUT / f'{stem}_x1.png')
    from PIL import Image
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(OUT / f'{stem}.png')
    if DEVICE[0] == 'phone':
        lab.page.screenshot(path=str(OUT / f'{stem}_page.png'))
    print('  shot', OUT / f'{stem}.png')
    return im


def setup(lab, map_id, x, y, d='up', auto=True):
    for fl in ('ep6_started', 'mira_joined', 'bram_joined'):
        lab.call('setFlag', fl, True)
    lab.warp(map_id, x, y, d)
    lab.call('party', 'mira', 'bram')
    if auto:
        lab.run(AUTO_JS)
    else:
        lab.run('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = null')
    lab.frames(80)            # the banner slides out


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


def mean_luma(im, x0, y0, w, h):
    vals = [lum(im.getpixel((x, y))) for y in range(max(0, y0), min(im.height, y0 + h)) for x in range(max(0, x0), min(im.width, x0 + w))]
    return sum(vals) / max(1, len(vals))


# ---------------------------------------------------------------- cases
def case_ride(lab):
    setup(lab, 'ep6_testwind', 6, 19, 'right')
    st = wind(lab)
    check(st and st['active'] and st['live'] == 62, 'the test map is live: 62 lane cells in the authored state')
    look(lab, 9, 19)
    shot(lab, 'ride_before')
    back(lab)
    lab.press('right', 170)                       # a thumb on the pad, held through the whole ride and well past it
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && w.riding; })()')
    lab.frames(18)
    shot(lab, 'ride_mid')
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && !w.riding && !w.settling; })()')
    at = leader(lab)
    check(at[:2] == [13, 19], f'landed on 13,19 ({at})')
    lab.frames(40)
    at = leader(lab)
    st = wind(lab)
    check(at[:2] == [13, 19] and not at[2], f'still on 13,19 with the key held 40 frames on: no extra step ({at}, hold {st["hold"]})')
    check(st['lastRide']['stop'] == 'land' and len(st['lastRide']['path']) == 7, 'the ride: 6 lane cells, then the deck')
    lab.frames(80)                                # the key comes up; Bram's first_ride bark is auto-confirmed
    shot(lab, 'ride_after')
    RESULTS['ride'] = {'path': st['lastRide']['path'], 'hold': st['hold']}


def case_post(lab):
    setup(lab, 'ep6_testwind', 3, 17, 'up')
    lab.press('up', 120)
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && w.rides >= 0 && w.lastRide && !w.riding; })()')
    lab.frames(30)
    at = leader(lab)
    check(at[:2] == [3, 13], f'the post holds the party on 3,13 ({at})')
    look(lab, 3, 12)
    shot(lab, 'post')
    back(lab)
    lab.frames(60)
    lab.press('left', 6)
    lab.frames(30)
    check(leader(lab)[:2] == [2, 13], 'stepped off the post onto the ledge')


def case_vane(lab):
    setup(lab, 'ep6_testwind', 22, 10, 'left', auto=False)
    look(lab, 23, 8)
    im_a = shot(lab, 'vane_authored')
    back(lab)
    lab.press('confirm', 1)
    lab.frames(8)
    look(lab, 23, 8)
    shot(lab, 'vane_swing')
    back(lab)
    lab.run(AUTO_JS)
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && w.turned.length === 1 && w.anim === null && !w.busy; })()')
    lab.frames(90)
    st = wind(lab)
    check(st['vanes'][0]['arrow'] == 'right' and st['vanes'][1]['arrow'] == 'right', 'both vanes of group a point right (lane K)')
    look(lab, 23, 8)
    im_b = shot(lab, 'vane_turned')
    back(lab)
    check(im_a.tobytes() != im_b.tobytes(), 'the two states look different from the same framing')
    # the refusal: turn back first (so lane G runs again), ride up to mo_g, face vane_a2, confirm
    lab.call('turnVane', 'vane_a', ms=20000)
    lab.frames(40)
    lab.call('warp', 'ep6_testwind', 25, 10, 'up', ms=30000)
    lab.frames(80)
    lab.press('up', 60)
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && w.lastRide && !w.riding; })()')
    lab.frames(70)
    check(leader(lab)[:2] == [25, 7], 'on the post mo_g')
    lab.run('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = null')
    lab.press('left', 1)
    lab.frames(4)
    lab.press('confirm', 1)
    lab.frames(40)
    shot(lab, 'vane_refused')
    st = wind(lab)
    check(st['refusals'] >= 1 and st['turned'] == [], f'refused (refusals {st["refusals"]}), nothing turned')
    lab.run(AUTO_JS)
    lab.frames(60)


def case_ring(lab):
    setup(lab, 'ep6_testring', 9, 11, 'up')
    lab.press('up', 100)
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && w.riding; })()')
    lab.frames(40)
    shot(lab, 'ring_mid')
    wait(lab, '(() => { const w = LQ_DEBUG.wind(); return w && !w.riding && !w.settling; })()', ms=20000)
    lab.frames(60)
    at = leader(lab)
    check(at[:2] == [12, 7], f'the ring carries the party round to its post ({at})')
    look(lab, 10, 8)
    shot(lab, 'ring_post')
    back(lab)


def case_storm(lab):
    setup(lab, 'ep6_testring', 14, 7, 'down')
    lab.frames(30)
    im = shot(lab, 'storm_lamp')
    cam = lab.run(fjs('return [f.camera.x, f.camera.y, f.lighting.tintName, f.lighting.dark];'))
    check(cam[2] == 'storm', 'the storm tint is on')
    # the party's floor: the deck cells left and right of the leader (14,7): 13,7 and 15,7
    vals = []
    for cx in (13, 15):
        px, py = int(cx * 16 - cam[0]), int(7 * 16 - cam[1])
        vals.append(mean_luma(im, px, py + 10, 16, 6))
    floor = sum(vals) / len(vals)
    print(f'  party floor luma {floor:.3f} (cells 13,7 and 15,7, lower rows)')
    check(floor >= 0.22, f'the party floor at or above 0.22 ({floor:.3f})')
    # lightning: draw a frame with no flash and one at the peak, synchronously, and compare
    pair = lab.run(fjs('''
        const r = LQ_ENGINE.renderer, keep = f.frame;
        f.frame = 100; f.draw(r); const a = r.canvas.toDataURL("image/png"); const la = f.wind.lastFlash;
        f.frame = 242; f.draw(r); const b = r.canvas.toDataURL("image/png"); const lb = f.wind.lastFlash;
        f.frame = keep; return [a, b, la, lb];'''))
    a, b = image(pair[0]), image(pair[1])
    print('  flash', pair[2], pair[3])
    from PIL import Image
    b.resize((b.width * 3, b.height * 3), Image.NEAREST).save(OUT / f'{DEVICE[0]}_storm_flash.png')
    a.resize((a.width * 3, a.height * 3), Image.NEAREST).save(OUT / f'{DEVICE[0]}_storm_noflash.png')
    peak, mean_d, n = 0.0, 0.0, 0
    pa, pb = a.load(), b.load()
    for y in range(a.height):
        for x in range(a.width):
            d = lum(pb[x, y]) - lum(pa[x, y])
            peak = max(peak, d)
            if d > 0.005:
                mean_d += d
                n += 1
    print(f'  lightning: peak +{peak:.4f} luma, {n} px lifted, mean +{(mean_d / max(1, n)):.4f}')
    check(pair[3] and pair[3]['level'] > 0.99, 'frame 242 is a flash peak')
    check(peak <= 0.125, f'lightning peak at most +0.12 luma (+{peak:.4f}, 8-bit rounding allowed)')
    check(n > 0, 'the flash lifted the far cloud')
    RESULTS['storm'] = {'floor': round(floor, 3), 'flashPeak': round(peak, 4), 'flashPixels': n}


def case_contrast(lab):
    setup(lab, 'ep6_testwind', 6, 20, 'up')
    look(lab, 9, 19)
    im = shot(lab, 'contrast')
    cam = lab.run(fjs('return [f.camera.x, f.camera.y];'))
    # chevron cells on lane A (row 19): (x + y) even; the chevron box is 7x7 at +4..+10 of the cell
    chev = []
    for cx in range(7, 13):
        if (cx + 19) % 2:
            continue
        px, py = int(cx * 16 - cam[0]) + 4, int(19 * 16 - cam[1]) + 4
        box = sorted((lum(im.getpixel((px + i, py + j))) for j in range(7) for i in range(7)), reverse=True)
        chev.append(sum(box[:13]) / 13)      # the chevron's fill pixels (13 of 49)
    cloud = []
    for cx, cy in ((8, 21), (10, 21), (9, 22), (11, 15)):
        px, py = int(cx * 16 - cam[0]), int(cy * 16 - cam[1])
        cloud.append(mean_luma(im, px, py, 16, 16))
    bed = []
    for cx in range(7, 13):
        if (cx + 19) % 2 == 0:
            continue
        px, py = int(cx * 16 - cam[0]), int(19 * 16 - cam[1])
        bed.append(mean_luma(im, px, py, 16, 16))
    c, k, l = sum(chev) / len(chev), sum(cloud) / len(cloud), sum(bed) / len(bed)
    print(f'  chevron fill luma {c:.3f}, lane bed {l:.3f}, plain cloud {k:.3f}: chevron - bed {c - l:.3f}, cloud - bed {k - l:.3f}')
    # two pairs, never chevron against plain cloud (CRITIQUE_8 item 9: a chevron always sits on its band, and E6-tiles' cloud
    # is a pale sunlit white nothing can stand 0.2 above): the chevron against the band it sits on (plan 5.1's 0.2 floor),
    # and the band against plain cloud (the lane reads across the screen: at least 0.15 apart, the band the darker)
    check(c - l >= 0.2, f'the chevrons stand at least 0.2 luma above the lane band ({c - l:.3f})')
    check(k - l >= 0.15, f'the lane band sits at least 0.15 luma below plain cloud ({k - l:.3f})')
    RESULTS['contrast'] = {'chevron': round(c, 3), 'bed': round(l, 3), 'cloud': round(k, 3),
                           'chevronOverBand': round(c - l, 3), 'cloudOverBand': round(k - l, 3)}


def case_duct(lab):
    # the same lanes drawn as F2's ducts (wind.kind 'duct'): a lab-only switch of the test map's kind, then back
    setup(lab, 'ep6_testwind', 6, 20, 'up')
    lab.run(fjs('f.map.mod.wind.kind = "duct"; f.glass.reset(); return true;'))
    lab.frames(4)
    look(lab, 9, 18)
    im = shot(lab, 'duct')
    cam = lab.run(fjs('return [f.camera.x, f.camera.y];'))
    # a duct takes a chevron on every cell (CRITIQUE_8 item 3), the 7x7 code chevron at +5..+11 of the cell, over a blue bed
    chev, bed = [], []
    for cx in range(7, 13):
        px, py = int(cx * 16 - cam[0]), int(19 * 16 - cam[1])
        box = sorted((lum(im.getpixel((px + 5 + i, py + 5 + j))) for j in range(7) for i in range(7)), reverse=True)
        chev.append(sum(box[:13]) / 13)
        bed.append(mean_luma(im, px, py, 16, 16))
    c, l = sum(chev) / len(chev), sum(bed) / len(bed)
    print(f'  duct chevron fill luma {c:.3f}, duct bed {l:.3f}: chevron - bed {c - l:.3f}')
    check(c - l >= 0.2, f'the duct chevrons stand at least 0.2 luma above the duct bed ({c - l:.3f})')
    RESULTS['duct'] = {'chevron': round(c, 3), 'bed': round(l, 3)}
    lab.run(fjs('f.map.mod.wind.kind = "open"; f.glass.reset(); return true;'))
    back(lab)


def case_perf(lab):
    setup(lab, 'ep6_testwind', 6, 19, 'right')
    lab.run(fjs('f.wind.stats.maxDrawMs = 0; f.wind.stats.maxUpdateMs = 0; return true;'))
    lab.press('right', 90)
    lab.frames(120)
    st = wind(lab)
    print(f'  wind update max {st["maxUpdateMs"]} ms, draw max {st["maxDrawMs"]} ms, ride {st["rideMs"]} ms')
    check(st['maxUpdateMs'] < 3 and st['maxDrawMs'] < 3, 'wind logic and drawing under 3 ms a frame')
    RESULTS['perf'] = {'updateMs': st['maxUpdateMs'], 'drawMs': st['maxDrawMs'], 'rideMs': st['rideMs']}


CASES = {'ride': case_ride, 'post': case_post, 'vane': case_vane, 'ring': case_ring, 'storm': case_storm,
         'contrast': case_contrast, 'duct': case_duct, 'perf': case_perf}


def main(argv):
    if '--device' in argv:
        i = argv.index('--device')
        DEVICE[0] = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    names = argv or list(CASES)
    lab = Lab(device=DEVICE[0])
    code = 0
    try:
        lab.open(QUERY)
        lab.page.wait_for_function('window.LQ_DEBUG && LQ_DEBUG.commands && true', timeout=20000)
        lab.page.wait_for_function('LQ_DEBUG.commands().includes("wind") || (window.LQ_EP6 && true)', timeout=40000)
        for n in names:
            print('case', n)
            CASES[n](lab)
        if lab.errors:
            print('console errors:')
            for e in lab.errors:
                print('  ', e)
            code = 1
        print(json.dumps(RESULTS))
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
