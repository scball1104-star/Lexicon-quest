"""Episode 5 battle-scene checks (E5-scene-ui), headless Chromium with ?pack=ep4,ep5. Uses the helpers of autobattle.py.

  python next/qa/battlescene/ep5_autobattle.py                       every scenario, desktop + phone (+ portrait where marked)
  python next/qa/battlescene/ep5_autobattle.py --only oracle --device phone

Scenarios (PNGs in next/qa/battlescene/out/ep5/, a filmstrip per effect, 4x zooms of the timeline and the rows):
  e5s_first     Night, the Turn 4 actions away: the stage by night, both sun foes Exposed (pale cracked shields, the sun badge),
                the marker slot and the head disc; the natural Turn filmed (the cross-fade to Day, the shields close); Day with
                both foes Ascendant (the glow); Auto to the end
  e5r_mixed     a sun foe and a star foe under one sky: one Exposed, one Ascendant; Mira's Turn the Sky filmed; the swap
  mirage_knight the card with its arc line; Mirror Turn on a natural Turn (the glint); Turn the Sky catches it Exposed; the Double
                steps out at 50%; the Knight and its Double under one sky; Auto to the end
  oracle        the card, the Read Sky look; the Last Prophecy pinned (the named head and red star on the marker, the red star
                over the member, Mira's Tech list opening on Turn the Sky in gold); Turn the Sky breaks it (filmed); False
                Futures (filmed: the cracked mask, the Futures rising, the Veil closing); both Futures down (the Veil tears, the
                True Horizon look); Auto to the end
Every scenario also measures the sky badge and the marker against the box they sit on (Rec.709 luma, the 844x390 rule of
CRITIQUE_6 item 1: at least 0.15 above) and checks each foe's weakness row stays clear of its body (CRITIQUE_6 item 2).
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

OUT = HERE / 'out' / 'ep5'
ab.OUT = OUT
ADV = ab.ADVANCE
DEVICES = ab.DEVICES
SKY = "(LQ_ENGINE.scene.sky5 || null)"


def setup(page, enc, seed, level=None, hour=None):
    page.evaluate("LQ_PACKS.forcePack('ep4'); LQ_PACKS.forcePack('ep5')")
    page.evaluate("LQ_PACKS.ensurePack('ep5')")
    page.wait_for_function("LQ_PACKS.packReady && LQ_PACKS.packReady('ep5') && !!LQ_DEBUG.newGameEp5", timeout=30000)
    page.evaluate("LQ_DEBUG.newGameEp5('Arden', { slot: 1, scene: 'none' })")
    page.evaluate("LQ_ENGINE.game.flags.sky_learned = true")
    if level:
        page.evaluate(f"(() => {{ for (const m of LQ_ENGINE.game.party) m.level = {level}; }})()")
    if hour:
        page.evaluate(f"import('./src/data/ep5/sky.js').then(m => m.setFieldHour('{hour}'))")
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ seed: {seed}, canFlee: false }})")
    ab.advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase !== 'intro'", max_frames=400, step=2)


def unit(js):
    return f"LQ_ENGINE.scene.b.units().find(u => u.alive && ({js}))"


def act(page, action):
    page.evaluate(f"LQ_DEBUG.battleAct({json.dumps(action)})")


def until_member(page, who, turns=12):
    return ab._defend_until(page, f"LQ_DEBUG.state().battle.current === '{who}'", turns=turns)


def sky(page):
    return page.evaluate(f"(() => {{ const s = {SKY}; return s && {{ sky: s.sky, turnIn: s.turnIn, k: s.k, pinned: s.pinned }}; }})()")


def sides(page):
    return page.evaluate("[...LQ_ENGINE.scene.actors.values()].filter(a => a.side === 'enemy' && !a.dead && a.skySide).map(a => [a.id, !!a.skyExposed])")


def near_turn(page, n=1):
    """QA lever: the Turn falls after `n` more actions (the rules' sky and the scene's view together)."""
    page.evaluate(f"(() => {{ const s = LQ_ENGINE.scene; s.b.state.sky.turnIn = {n}; s.sky5.turnIn = {n}; }})()")


def zoom(page, ctx, name, region, scale=4):
    """autobattle.zoom, in device pixels (the phone profiles shoot at dpr 3)."""
    from PIL import Image
    v = page.evaluate('LQ_DEBUG.view()')
    p = OUT / '_zoom_tmp.png'
    page.screenshot(path=str(p))
    im = Image.open(p)
    d = im.width / page.viewport_size['width']
    x0, y0, k = v['cssX'] * d, v['cssY'] * d, v['cssScale'] * d
    gx, gy, gw, gh = region
    crop = im.crop((int(x0 + gx * k), int(y0 + gy * k), int(x0 + (gx + gw) * k), int(y0 + (gy + gh) * k))).resize((gw * scale, gh * scale), Image.NEAREST)
    im.close(); p.unlink()
    path = OUT / f'_zoom_{name}.png'
    crop.save(path)
    ctx['files'].append(str(path))
    return path


def filmstrip(page, ctx, name, frames, step, full=True):
    """autobattle.filmstrip in device pixels (the phone profiles shoot at dpr 3): `frames` tiles `step` frames apart, 2x."""
    from PIL import Image
    tiles = []
    v = page.evaluate('LQ_DEBUG.view()')
    for i in range(frames):
        page.evaluate(ADV.format(step))
        p = OUT / f'_strip_{i}.png'
        page.screenshot(path=str(p))
        im = Image.open(p)
        d = im.width / page.viewport_size['width']
        x0, y0, w, h = v['cssX'] * d, v['cssY'] * d, v['cssW'] * d, v['cssH'] * d
        tile = im.crop((int(x0), int(y0), int(x0 + w), int(y0 + h))).resize((768, 432), Image.NEAREST)
        tiles.append(tile if full else tile.crop((0, 40, 768, 310)))
        im.close()
        p.unlink()
    cols, th = 4, tiles[0].height
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 768 + (cols - 1) * 4, rows * th + (rows - 1) * 4), (20, 16, 30))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 772, (i // cols) * (th + 4)))
    path = OUT / f"{ctx['device']}-{ctx['name']}-{name}.png"
    sheet.save(path)
    ctx['files'].append(str(path))


def tl_zoom(page, ctx, name):
    zoom(page, ctx, f"{ctx['device']}_{name}_timeline", (222, 0, 162, 44), scale=4)


def rows_zoom(page, ctx, name):
    zoom(page, ctx, f"{ctx['device']}_{name}_rows", (0, 20, 230, 132), scale=3)


MEASURE = """(() => {
  const s = LQ_ENGINE.scene, sv = s.sky5;
  if (!sv) return null;
  const rows = s._sky5Rows ? [...s._sky5Rows.entries()].map(([uid, p]) => ({ uid, x: p.rect.x, y: p.rect.y, w: p.rect.w })) : [];
  const bodies = [...s.actors.values()].filter(a => a.side === 'enemy' && !a.dead).map(a => ({ uid: a.uid, id: a.id, x: Math.round(a.x - a.w / 2), y: Math.round(a.y - a.h), w: a.w, h: a.h, boss: a.boss }));
  return { rows, bodies, turnIn: sv.turnIn, order: s.timeline.length, pinned: !!sv.pinned };
})()"""


def lum(px):
    r, g, b = [c / 255.0 for c in px[:3]]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def measure(page, ctx, tag):
    """Badge and marker against their boxes (game pixels from a screenshot), and each row clear of its foe's body."""
    from PIL import Image
    m = page.evaluate(MEASURE)
    if not m:
        return None
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, k = v['cssX'], v['cssY'], v['cssScale']
    p = OUT / '_measure.png'
    page.screenshot(path=str(p))
    im = Image.open(p).convert('RGB')
    dpr = im.width / page.viewport_size['width']     # the screenshot is in device pixels, the view in CSS pixels

    def mean(gx, gy, gw, gh):
        vals = []
        for j in range(gh):
            for i in range(gw):
                vals.append(lum(im.getpixel((int((x0 + (gx + i + 0.5) * k) * dpr), int((y0 + (gy + j + 0.5) * k) * dpr)))))
        return sum(vals) / len(vals)

    out = {'badges': [], 'marker': None}
    for r in m['rows']:
        bx, by = r['x'] + 15 + 2, r['y'] + 1     # the badge tile (10 x 10); the badge is its inner 8 x 8
        badge = mean(bx + 1, by + 1, 8, 8)
        ring = []
        for i in range(12):
            ring.append(mean(bx - 1 + i, by - 1, 1, 1)); ring.append(mean(bx - 1 + i, by + 10, 1, 1))
        box = sum(ring) / len(ring)
        out['badges'].append({'uid': r['uid'], 'badge': round(badge, 3), 'box': round(box, 3), 'gap': round(badge - box, 3)})
    at = max(1, min(int(m['turnIn']), 7))
    sx = 228 + (0 if at == 0 else 19 + (at - 1) * 18)
    if m['pinned']:
        disc = mean(sx + 4, 6, 10, 1)              # the red ring's top edge (the head inside is the member's own)
        tile = mean(sx + 2, 6 + 3, 1, 12)          # the dark red tile inside the ring, left of the head
    else:
        disc = mean(sx + 4, 6 + 4, 10, 10)
        tile = (mean(sx, 6, 18, 1) + mean(sx, 6 + 17, 18, 1)) / 2
    out['marker'] = {'slot': at, 'disc': round(disc, 3), 'box': round(tile, 3), 'gap': round(disc - tile, 3)}
    clash = []
    for r in m['rows']:
        b = next((b for b in m['bodies'] if b['uid'] == r['uid']), None)
        if not b:
            continue
        # the head and chest: the top 55% of the frame (a row may sit at the feet, inside the frame's bottom band)
        top = {'x': b['x'], 'y': b['y'], 'w': b['w'], 'h': int(b['h'] * 0.55)}
        if r['x'] < top['x'] + top['w'] and top['x'] < r['x'] + r['w'] and r['y'] < top['y'] + top['h'] and top['y'] < r['y'] + 14:
            clash.append((b['id'], r, top))
    out['clash'] = clash
    im.close()
    p.unlink()
    ctx.setdefault('measures', []).append({tag: out})
    return out


def check_measure(meas, ctx, need_badge=True):
    if not meas:
        raise AssertionError('no sky view')
    if need_badge:
        assert meas['badges'], 'no badge measured (no row shown)'
        for b in meas['badges']:
            assert b['gap'] >= 0.15, f"badge contrast {b}"
    assert meas['marker']['gap'] >= 0.15, f"marker contrast {meas['marker']}"
    assert not meas['clash'], f"a weakness row across a body: {meas['clash']}"


def command_shot(page, ctx, name):
    ab._rows_all(page)
    page.evaluate(ADV.format(4))
    ab.shot(page, ctx, name)
    meas = measure(page, ctx, name)
    return meas


def sc_e5s_first(page, ctx):
    setup(page, 'e5s_first', 3)
    s = sky(page)
    assert s and s['sky'] == 'night' and s['turnIn'] == 4, s
    assert ab._player(page)
    meas = command_shot(page, ctx, 'night_command')
    check_measure(meas, ctx)
    tl_zoom(page, ctx, 'night')
    rows_zoom(page, ctx, 'night')
    sd = sides(page)
    assert all(e for _, e in sd), f'both sun foes Exposed by night: {sd}'
    # defend until the Turn is one action away, then film it
    turned = False
    for _ in range(8):
        if not ab._player(page):
            break
        if sky(page)['turnIn'] <= 1:
            near_turn(page)
            page.evaluate("LQ_DEBUG.battleAct({ type: 'defend' })")
            ab.advance_until(page, "LQ_ENGINE.scene.sky5.goal === 1 || " + ab.WAIT_PLAYER, max_frames=3000, step=1)
            filmstrip(page, ctx, 'turn_to_day', 12, 3, full=True)
            turned = True
            break
        page.evaluate("LQ_DEBUG.battleAct({ type: 'defend' })")
    assert turned, 'never reached the Turn'
    assert ab._player(page)
    assert sky(page)['sky'] == 'day', sky(page)
    meas = command_shot(page, ctx, 'day_command')
    check_measure(meas, ctx)
    tl_zoom(page, ctx, 'day')
    rows_zoom(page, ctx, 'day')
    sd = sides(page)
    assert not any(e for _, e in sd), f'both Ascendant by day: {sd}'
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    ctx['note'] = f"night->day; badges {[b['gap'] for b in meas['badges']]}; marker {meas['marker']['gap']}; auto {result}"


def sc_e5r_mixed(page, ctx):
    setup(page, 'e5r_mixed', 5, hour='noon')
    assert ab._player(page)
    meas = command_shot(page, ctx, 'mixed_day')
    check_measure(meas, ctx)
    rows_zoom(page, ctx, 'mixed_day')
    tl_zoom(page, ctx, 'mixed_day')
    sd = dict(sides(page))
    assert sd.get('dune_stalker') is False and sd.get('starsilt') is True, sd
    assert until_member(page, 'mira'), 'no Mira turn'
    page.evaluate("LQ_ENGINE.scene.b.unit('mira').mp = Math.max(LQ_ENGINE.scene.b.unit('mira').mp, 40)")
    act(page, {'type': 'skill', 'skill': 'turn_sky'})
    filmstrip(page, ctx, 'turn_sky', 12, 5, full=True)
    assert ab._player(page)
    meas = command_shot(page, ctx, 'mixed_night')
    check_measure(meas, ctx)
    rows_zoom(page, ctx, 'mixed_night')
    sd = dict(sides(page))
    assert sd.get('dune_stalker') is True and sd.get('starsilt') is False, sd
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    ctx['note'] = f"day: stalker Ascendant, starsilt Exposed; Turn the Sky swapped them; auto {result}"


def card_shots(page, ctx):
    page.evaluate(ADV.format(8)); ab.shot(page, ctx, 'entrance')
    page.evaluate(ADV.format(30)); ab.shot(page, ctx, 'card')
    return page.evaluate("(() => { const s = LQ_ENGINE.scene; return s.bossIntro ? { name: s.bossIntro.name, sub: s.bossIntro.sub, help: s.help.text } : null; })()")


def sc_mirage_knight(page, ctx):
    setup(page, 'mirage_knight', 4, level=23)
    card = card_shots(page, ctx)
    assert card and card['name'] == 'THE MIRAGE KNIGHT' and card['sub'] == 'Warden of False Horizons', card
    assert 'better horizon' in (card['help'] or ''), card
    K = unit("u.id === 'mirage_knight'")
    assert ab._player(page)
    meas = command_shot(page, ctx, 'knight_day')
    check_measure(meas, ctx)
    rows_zoom(page, ctx, 'knight_day')
    # a natural Turn: the Knight turns its mirror (the glint); the Turn is brought to this action (QA lever)
    page.evaluate(ADV.format(120))   # the card has gone
    page.evaluate(f"{K}.hp = {K}.maxHp")
    near_turn(page)
    page.evaluate("LQ_DEBUG.battleAct({ type: 'defend' })")
    ab.advance_until(page, "LQ_ENGINE.scene.log.some(l => /mirror/.test(l)) || " + ab.WAIT_PLAYER, max_frames=3000, step=1)
    filmstrip(page, ctx, 'mirror_turn', 12, 3, full=True)
    glint = page.evaluate("LQ_ENGINE.scene.log.some(l => /mirror/.test(l))")
    assert glint, 'no natural Turn reached'
    assert ab._player(page)
    assert dict(sides(page)).get('mirage_knight') is False, 'the Knight mirrored: Ascendant'
    # Turn the Sky catches it
    assert until_member(page, 'mira'), 'no Mira turn'
    page.evaluate("LQ_ENGINE.scene.b.unit('mira').mp = Math.max(LQ_ENGINE.scene.b.unit('mira').mp, 40)")
    act(page, {'type': 'skill', 'skill': 'turn_sky'})
    filmstrip(page, ctx, 'caught', 12, 5, full=True)
    assert ab._player(page)
    caught = dict(sides(page)).get('mirage_knight')
    meas = command_shot(page, ctx, 'knight_caught')
    check_measure(meas, ctx)
    rows_zoom(page, ctx, 'knight_caught')
    # the Double at 50%
    page.evaluate(f"(() => {{ const k = {K}; k.hp = Math.floor(k.maxHp * 0.51); }})()")
    act(page, {'type': 'attack', 'target': page.evaluate(f"{K}.uid")})
    ab.advance_until(page, "LQ_ENGINE.scene.b.units().some(u => u.alive && u.id === 'mirage_double') || " + ab.WAIT_PLAYER, max_frames=3000, step=1)
    filmstrip(page, ctx, 'double', 16, 8, full=True)
    assert ab._player(page)
    meas = command_shot(page, ctx, 'knight_double')
    check_measure(meas, ctx)
    rows_zoom(page, ctx, 'knight_double')
    sd = dict(sides(page))
    assert 'mirage_double' in sd and sd['mirage_double'] != sd['mirage_knight'], f'one of the two Exposed: {sd}'
    page.evaluate(f"{K}.hp = Math.min({K}.hp, 300)")
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    ctx['note'] = f"card ok; mirror glint; caught Exposed {caught}; double {sd}; auto {result}"


def phase_film(page, ctx, name, cond="!!(LQ_ENGINE.scene.banner && LQ_ENGINE.scene.banner.style === 'phase')"):
    ab.advance_until(page, cond, max_frames=3000, step=1)
    filmstrip(page, ctx, name, 16, 8, full=True)


def sc_oracle(page, ctx):
    d = ctx['device']
    setup(page, 'oracle', 6, level=24)
    card = card_shots(page, ctx)
    assert card and card['name'] == 'THE SAND ORACLE' and card['sub'] == 'Reader of Every Road', card
    assert 'stopped walking' in (card['help'] or ''), card
    O = unit("u.id === 'oracle'")
    art = "[...LQ_ENGINE.scene.actors.values()].find(a => a.id === 'oracle').stem"
    assert ab._player(page)
    meas = command_shot(page, ctx, 'look1')
    check_measure(meas, ctx)
    looks = [page.evaluate(art)]
    # the Last Prophecy pinned, with Mira to act
    pinned = "!!(LQ_ENGINE.scene.b.state.sky.pinned)"
    ok = False
    for _ in range(40):
        if not ab._player(page):
            break
        page.evaluate(f"{O}.hp = Math.max({O}.hp, Math.floor({O}.maxHp * 0.9))")
        if page.evaluate(pinned):
            if page.evaluate("LQ_DEBUG.state().battle.current === 'mira'"):
                ok = True
                break
            # hold the reading until Mira acts (an Hourglass, as QA): the marker steps back, the foretelling stays pinned
            page.evaluate("(() => { const s = LQ_ENGINE.scene; s.b.state.sky.turnIn = Math.max(s.b.state.sky.turnIn, 3); })()")
        page.evaluate("LQ_DEBUG.battleAct({ type: 'defend' })")
    assert ok, 'no foretelling pinned with Mira to act'
    page.evaluate("LQ_ENGINE.scene.b.unit('mira').mp = Math.max(LQ_ENGINE.scene.b.unit('mira').mp, 40)")
    page.evaluate("(() => { const s = LQ_ENGINE.scene; s.menu.open(s.b.current()); })()")
    page.evaluate(ADV.format(6))
    root = page.evaluate("LQ_ENGINE.scene.menu.root.item.id")
    ab.shot(page, ctx, 'prophecy_pinned')
    meas = measure(page, ctx, 'prophecy_pinned')
    check_measure(meas, ctx, need_badge=False)
    tl_zoom(page, ctx, 'prophecy')
    page.evaluate("(() => { const m = LQ_ENGINE.scene.menu; m.openSub(m.root.items.find(i => i.id === 'tech').cmd); })()")
    page.evaluate(ADV.format(4))
    first = page.evaluate("(() => { const it = LQ_ENGINE.scene.menu.sub.items[0]; return [it.id, it.color]; })()")
    ab.shot(page, ctx, 'prophecy_tech')
    assert root == 'tech' and first == ['turn_sky', 'gold'], (root, first)
    help_text = page.evaluate("LQ_ENGINE.scene.helpView(LQ_ENGINE.renderer).text")
    act(page, {'type': 'skill', 'skill': 'turn_sky'})
    filmstrip(page, ctx, 'prophecy_break', 16, 4, full=True)
    broke = page.evaluate(f"{O}.broken")
    log = page.evaluate("LQ_ENGINE.scene.log.slice()")
    assert any('The words change. The Oracle is broken.' in l for l in log), log
    assert not any('is BROKEN' in l for l in log[-3:]), log
    # False Futures: the blow that crosses 72%
    assert ab._player(page)
    page.evaluate(f"(() => {{ const o = {O}; o.hp = Math.floor(o.maxHp * 0.725); }})()")
    phase2 = "LQ_ENGINE.scene.b.units().some(u => u.id === 'oracle' && u.ai.phase >= 1)"
    for _ in range(8):   # a blind or a miss: strike again until the blow lands
        page.evaluate(f"(() => {{ const o = {O}; o.hp = Math.min(o.hp, Math.floor(o.maxHp * 0.725)); }})()")
        act(page, {'type': 'attack', 'target': page.evaluate(f"{O}.uid")})
        if page.evaluate(phase2):
            break
        assert ab._player(page)
    phase_film(page, ctx, 'futures_rise')
    assert ab._player(page)
    meas = command_shot(page, ctx, 'look2_veil')
    check_measure(meas, ctx)
    looks.append(page.evaluate(art))
    assert page.evaluate("[...LQ_ENGINE.scene.actors.values()].find(a => a.id === 'oracle').veil5"), 'no Veil drawn'
    fut = "LQ_ENGINE.scene.b.units().filter(u => u.alive && /^future_/.test(u.id)).map(u => u.uid)"
    page.evaluate(f"{fut}.forEach(uid => {{ LQ_ENGINE.scene.b.unit(uid).hp = 1; }})")
    torn = False
    for _ in range(14):
        if not ab._player(page):
            break
        left = page.evaluate(fut)
        if not left:
            break
        act(page, {'type': 'attack', 'target': left[0]})
        if len(left) == 1:
            tears = "LQ_ENGINE.scene.log.some(l => /Veil tears/.test(l))"
            ab.advance_until(page, tears + " || " + ab.WAIT_PLAYER, max_frames=4000, step=1)
            if page.evaluate(tears):
                filmstrip(page, ctx, 'veil_tear', 12, 6, full=True)
                torn = True
                break
    assert torn, 'never struck the last Future'
    assert ab._player(page)
    meas = command_shot(page, ctx, 'look3_true')
    check_measure(meas, ctx)
    looks.append(page.evaluate(art))
    assert looks == ['oracle', 'oracle_futures', 'oracle_true'], looks
    # the once-per-save hint: Mira under Turn the Sky's MP in the Oracle's fight
    assert until_member(page, 'mira'), 'no Mira turn for the hint'
    page.evaluate("LQ_ENGINE.scene.b.unit('mira').mp = 15")
    act(page, {'type': 'skill', 'skill': 'turn_sky'})
    ab.advance_until(page, "LQ_ENGINE.scene.log.some(l => /Keep something back/.test(l)) || " + ab.WAIT_PLAYER, max_frames=3000, step=2)
    ab.shot(page, ctx, 'low_mp_hint')
    hint = page.evaluate("[LQ_ENGINE.scene.log.some(l => /Keep something back/.test(l)), LQ_ENGINE.scene.b.state.hint]")
    assert hint == [True, 'hint_sky_mp'], hint
    page.evaluate(f"{O}.hp = Math.min({O}.hp, 300)")
    result = ab._auto_to_end(page, ctx)
    assert result == 'win', result
    flag = page.evaluate("!!LQ_ENGINE.game.flags.hint_sky_mp")
    assert flag, 'the hint flag is saved with the win'
    ctx['note'] = f"{d}: low-MP hint once; card ok; looks {','.join(looks)}; pinned (Tech {first}); broke {broke}; help '{help_text[:70]}'; auto {result}"


SCENARIOS = {
    'e5s_first': (sc_e5s_first, ['desktop', 'phone']),
    'e5r_mixed': (sc_e5r_mixed, ['desktop', 'phone']),
    'mirage_knight': (sc_mirage_knight, ['desktop', 'phone']),
    'oracle': (sc_oracle, ['desktop', 'phone', 'portrait']),
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
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep4,ep5'
    report, failures = [], 0
    from playwright.sync_api import sync_playwright, Error as PwError
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
                    page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
                    page.evaluate('LQ_DEBUG.ready()')
                    fn(page, ctx)
                    errs = page.evaluate('LQ_DEBUG.errors()')
                    if errs:
                        errors.extend(f'engine: {e["msg"]}' for e in errs)
                except Exception as e:  # noqa: BLE001
                    status, detail = 'FAIL', str(e).splitlines()[0][:400]
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
                report.append({'device': dname, 'scenario': name, 'status': status, 'detail': detail, 'note': ctx['note'],
                               'files': ctx['files'], 'measures': ctx.get('measures', [])})
                page.close()
            context.close()
        browser.close()
    server.shutdown()
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'\n{len(report) - failures}/{len(report)} scenarios ok; PNGs in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
