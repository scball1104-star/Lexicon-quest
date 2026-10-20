"""Headless end-to-end battle checks (W2-battle-scene).

Boots the game in headless Chromium (same static server as qa/shots.py), drives battles through
LQ_DEBUG.battle / battleUntil / battleAct, saves PNGs to next/qa/battlescene/out/ and fails on any console
error, page error or engine error. Scenarios:

  python next/qa/battlescene/autobattle.py              all scenarios, desktop + phone where marked
  python next/qa/battlescene/autobattle.py --only e2e_win,break --device desktop
  python next/qa/battlescene/autobattle.py --list

Scenarios: start, command, target_preview, break, boss, victory, levelup, flee, e2e_win (Auto at 2x from
start to 'win' in under 60 s wall clock), e2e_lose (scripted defeat), e2e_all (every encounter, fast).
W4-battle-polish adds: stage (one shot per backdrop with the band, baselines and shadows, plus feet zooms),
strip_intro (the mosaic + slice transition at 2-frame steps), strip_impact (1-frame strips of a sword slash,
a spear thrust, Ember, an axe chop and an arrow, zoomed on the target), and _zoom_timeline.png from command.
W6-anim adds anim_enemy (lunge + hurt), anim_cast, anim_death (die_0..2, flash, dissolve), anim_devour,
anim_stance (Echo Warden Mirror -> Bulwark) and anim_party (crit, combo, level-up hop): zoomed strips with the
frame name each actor drew under every tile, failing when a generator frame never reaches the screen.
"""
import argparse
import json
import re
import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}

ADVANCE = 'LQ_DEBUG.advance({})'
WAIT_MENU = "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.menu !== 'closed'"


def bstate(page):
    return page.evaluate('LQ_DEBUG.state().battle')


def advance_until(page, cond, max_frames=4000, step=10):
    """Advance synchronously in steps until cond (JS expr) is true. Returns frames used."""
    used = 0
    while used < max_frames:
        if page.evaluate(cond):
            return used
        page.evaluate(ADVANCE.format(step))
        used += step
    raise RuntimeError(f'condition not met within {max_frames} frames: {cond}')


def shot(page, ctx, suffix):
    path = OUT / f"{ctx['device']}-{ctx['name']}-{suffix}.png"
    page.screenshot(path=str(path))
    ctx['files'].append(str(path))
    return path


# ------------------------------------------------------------------------------------------ scenarios
def sc_start(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 3 })")
    page.evaluate(ADVANCE.format(6)); shot(page, ctx, 'shards06')
    page.evaluate(ADVANCE.format(12)); shot(page, ctx, 'shards18')
    page.evaluate(ADVANCE.format(14)); shot(page, ctx, 'enter32')
    page.evaluate(ADVANCE.format(26)); shot(page, ctx, 'start58')
    assert bstate(page)['phase'] in ('play', 'enter'), bstate(page)


def sc_command(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 3 })")
    advance_until(page, WAIT_MENU)
    page.evaluate(ADVANCE.format(4))
    shot(page, ctx, 'root')
    zoom(page, ctx, 'timeline', (222, 0, 162, 32), 4)
    s = bstate(page)
    assert s['menu'] == 'root', s
    page.evaluate("LQ_DEBUG.press('down')"); page.evaluate(ADVANCE.format(3))
    page.evaluate("LQ_DEBUG.press('confirm')"); page.evaluate(ADVANCE.format(3))
    shot(page, ctx, 'sub')


def sc_target_preview(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 3 })")
    advance_until(page, WAIT_MENU)
    page.evaluate("LQ_DEBUG.press('confirm')"); page.evaluate(ADVANCE.format(4))
    s = bstate(page)
    assert s['menu'] == 'target', s
    shot(page, ctx, 'target')
    page.evaluate("LQ_DEBUG.press('right')"); page.evaluate(ADVANCE.format(4))
    shot(page, ctx, 'target2')


def sc_break(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('f1_mites', { fresh: true, seed: 5 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('hero')")
    advance_until(page, WAIT_MENU + " && LQ_DEBUG.state().battle.current === 'hero'")
    page.evaluate("LQ_DEBUG.battleAct({ type: 'attack', target: 'e0' })")
    page.evaluate(ADVANCE.format(30)); shot(page, ctx, 'strike')
    page.evaluate(ADVANCE.format(16)); shot(page, ctx, 'break')
    page.evaluate(ADVANCE.format(14)); shot(page, ctx, 'break2')
    s = bstate(page)
    e0 = next(u for u in s['units'] if u['uid'] == 'e0')
    assert e0['broken'] or e0['ko'] or e0['hp'] < e0['maxHp'], e0


def sc_boss(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 2 })")
    page.evaluate(ADVANCE.format(70)); shot(page, ctx, 'intro')
    page.evaluate("LQ_DEBUG.battleUntil('telegraph')")
    advance_until(page, WAIT_MENU + " && LQ_DEBUG.state().battle.telegraphs.length > 0", max_frames=3000)
    page.evaluate(ADVANCE.format(4)); shot(page, ctx, 'telegraph')
    page.evaluate("LQ_DEBUG.press('confirm')"); page.evaluate(ADVANCE.format(4))
    shot(page, ctx, 'target')


def sc_victory(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 3, auto: true })")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase === 'victory'", max_frames=6000)
    page.evaluate(ADVANCE.format(20)); shot(page, ctx, 'poses')
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase === 'rewards'")
    page.evaluate(ADVANCE.format(40)); shot(page, ctx, 'rewards')


def sc_levelup(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_slimes', { fresh: true, seed: 4, level: 1, fast: 'end' })")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase === 'rewards'", max_frames=6000)
    page.evaluate(ADVANCE.format(30)); shot(page, ctx, 'drops')
    page.evaluate(ADVANCE.format(40)); shot(page, ctx, 'rewards')
    page.evaluate("LQ_DEBUG.press('confirm')"); page.evaluate(ADVANCE.format(12))
    s = bstate(page)
    assert s['rewards'] and s['rewards']['page'] == 'level', s
    shot(page, ctx, 'level')
    page.evaluate("LQ_DEBUG.press('confirm')"); page.evaluate(ADVANCE.format(12))
    s = bstate(page)
    if s and s.get('rewards') and s['rewards']['page'] in ('level', 'mastery'):
        shot(page, ctx, 'level2')


def sc_flee(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 9 })")
    advance_until(page, WAIT_MENU)
    # Flee is the last root command: press up once from the top (lists wrap).
    page.evaluate("LQ_DEBUG.press('up')"); page.evaluate(ADVANCE.format(3))
    shot(page, ctx, 'menu')
    for _ in range(40):
        s = bstate(page)
        if not s or s.get('phase') == 'flee':
            break
        if s['menu'] != 'closed':
            page.evaluate("LQ_DEBUG.battleAct({ type: 'flee' })")
        page.evaluate(ADVANCE.format(20))
    page.evaluate(ADVANCE.format(14)); shot(page, ctx, 'dash')
    page.evaluate(ADVANCE.format(120))
    r = page.evaluate('LQ_DEBUG.battleResult()')
    assert r == 'flee', r


def filmstrip(page, ctx, name, frames, step, cols=6, full=False):
    """Advance `step` frames `frames` times, saving a stitched strip of the game area at 2x."""
    from PIL import Image
    tiles = []
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, w, h = int(v['cssX']), int(v['cssY']), int(v['cssW']), int(v['cssH'])
    for i in range(frames):
        page.evaluate(ADVANCE.format(step))
        p = OUT / f'_strip_{i}.png'
        page.screenshot(path=str(p))
        im = Image.open(p)
        tile = im.crop((x0, y0, x0 + w, y0 + h)).resize((384 * 2, 216 * 2), Image.NEAREST)
        tiles.append(tile if full else tile.crop((0, 40, 768, 310)))
        im.close()
        p.unlink()
    cols = 4
    th = tiles[0].height
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 384 * 2 + (cols - 1) * 4, rows * th + (rows - 1) * 4), (20, 16, 30))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * (384 * 2 + 4), (i // cols) * (th + 4)))
    path = OUT / f"{ctx['device']}-{ctx['name']}-{name}.png"
    sheet.save(path)
    ctx['files'].append(str(path))


def zoom(page, ctx, name, region, scale=4):
    """Save a nearest-neighbour zoom of a GAME-pixel region (x, y, w, h) of the current frame as _zoom_<name>.png."""
    from PIL import Image
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, k = v['cssX'], v['cssY'], v['cssScale']
    p = OUT / '_zoom_tmp.png'
    page.screenshot(path=str(p))
    im = Image.open(p)
    gx, gy, gw, gh = region
    crop = im.crop((int(x0 + gx * k), int(y0 + gy * k), int(x0 + (gx + gw) * k), int(y0 + (gy + gh) * k)))
    crop = crop.resize((gw * scale, gh * scale), Image.NEAREST)
    im.close(); p.unlink()
    path = OUT / f'_zoom_{name}.png'
    crop.save(path)
    ctx['files'].append(str(path))
    return path


def micro_strip(page, ctx, name, frames, step, region, scale=3, cols=4):
    """Advance `step` frames `frames` times, keeping a `scale`x zoom of a GAME-pixel region each time; stitched grid."""
    from PIL import Image
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, k = v['cssX'], v['cssY'], v['cssScale']
    gx, gy, gw, gh = region
    tiles = []
    kicks = ctx.setdefault('kicks', [])
    for i in range(frames):
        page.evaluate(ADVANCE.format(step))
        st = bstate(page)
        if st and st.get('kick'):
            kicks.append((st['kick']['x'], st['kick']['y'], st.get('hitstop', 0)))
        p = OUT / '_strip_tmp.png'
        page.screenshot(path=str(p))
        im = Image.open(p)
        crop = im.crop((int(x0 + gx * k), int(y0 + gy * k), int(x0 + (gx + gw) * k), int(y0 + (gy + gh) * k)))
        tiles.append(crop.resize((gw * scale, gh * scale), Image.NEAREST))
        im.close(); p.unlink()
    tw, th = tiles[0].size
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw + (cols - 1) * 4, rows * th + (rows - 1) * 4), (20, 16, 30))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
    path = OUT / f"{ctx['device']}-{ctx['name']}-{name}.png"
    sheet.save(path)
    ctx['files'].append(str(path))
    return path


def sc_stage(page, ctx):
    """The stage per backdrop (valley, archive F1, deep archive F3, boss) with the command menu open, plus feet zooms."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    used = []
    for enc, tag in [('valley_pack', 'valley'), ('f1_wraith', 'archive'), ('f3_mixed', 'deep'), ('archivore', 'boss')]:
        page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ fresh: true, seed: 3 }})")
        advance_until(page, WAIT_MENU)
        page.evaluate(ADVANCE.format(4))
        shot(page, ctx, tag)
        s = bstate(page)
        assert s['stage'] and s['stage']['band'], s.get('stage')
        used.append(f"{tag}:{'asset' if s['stage']['asset'] else 'fallback'}@{s['stage']['band']['y']}")
        zoom(page, ctx, f'stage_{tag}_feet', (0, 100, 384, 56), 3)
    ctx['note'] = ' '.join(used)


def sc_breathe(page, ctx):
    """Grounded enemies breathe (1 px top squash on alternate beats): two zooms 36 frames apart must differ, feet must not move."""
    from PIL import ImageChops
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_pack', { fresh: true, seed: 3 })")
    # a command menu with no enemy HUD rows showing (shield badges flash and expire, which would read as motion)
    advance_until(page, WAIT_MENU + " && LQ_DEBUG.state().battle.rows === 0", step=5)
    region = (0, 80, 260, 70)
    a = zoom(page, ctx, 'breathe_a', region, 3)
    page.evaluate(ADVANCE.format(36))
    b = zoom(page, ctx, 'breathe_b', region, 3)
    from PIL import Image
    ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    diff = ImageChops.difference(ia, ib).getbbox()
    assert diff, 'no breathing: the two frames are identical'
    # feet rows (game y 146..150) must be identical: the squash settles the top, never the feet
    fy0, fy1 = (146 - region[1]) * 3, (150 - region[1]) * 3
    feet = ImageChops.difference(ia.crop((0, fy0, ia.width, fy1)), ib.crop((0, fy0, ib.width, fy1))).getbbox()
    assert feet is None, f'feet moved: {feet}'
    ctx['note'] = f'breathe diff bbox {diff}'


def sc_strip_intro(page, ctx):
    """Mosaic + slice transition, 2-frame steps, from a field snapshot when the dev field is available."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    try:
        page.evaluate("LQ_DEBUG.push('_devField')")
        page.evaluate(ADVANCE.format(30))
        ctx['note'] = 'from _devField'
    except Exception:  # noqa: BLE001 - the dev field is optional; the title works as a snapshot too
        ctx['note'] = 'from title'
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 3 })")
    filmstrip(page, ctx, 'slices', 16, 2, full=True)
    s = bstate(page)
    assert s['phase'] in ('enter', 'play'), s['phase']


def _act_when(page, uid, action):
    """Fast-forward to `uid`'s command, then perform `action` (a 'target' of '*' = the first living foe)."""
    page.evaluate(f"LQ_DEBUG.battleUntil('{uid}')")
    advance_until(page, WAIT_MENU + f" && LQ_DEBUG.state().battle.current === '{uid}'")
    if action.get('target') == '*':
        uid2, _x = _living_foe(page)
        action = {**action, 'target': uid2}
    page.evaluate('LQ_DEBUG.battleAct(' + json.dumps(action) + ')')


def _living_foe(page):
    s = bstate(page)
    foe = next(u for u in s['units'] if u['uid'].startswith('e') and not u['ko'] and not u['dead'])
    return foe['uid'], foe['x']


def _foe_region(page, w=150, h=100):
    _uid, x = _living_foe(page)
    return (max(0, min(384 - w, int(x) - w // 2)), 156 - h, w, h)


def sc_strip_impact(page, ctx):
    """1-frame strips around the hit, zoomed 3x on the target: slash, thrust, Ember, chop, arrow."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('f1_slimes', { fresh: true, seed: 5, level: 3 })")
    page.evaluate(ADVANCE.format(60))
    _act_when(page, 'hero', {'type': 'attack', 'target': '*'})
    page.evaluate(ADVANCE.format(18))          # ready 6 + step-in 8 + wind-up 6: the arc starts about now
    micro_strip(page, ctx, 'slash', 16, 1, _foe_region(page))
    _act_when(page, 'bram', {'type': 'attack', 'target': '*'})
    page.evaluate(ADVANCE.format(18))
    micro_strip(page, ctx, 'thrust', 16, 1, _foe_region(page))
    _act_when(page, 'mira', {'type': 'skill', 'skill': 'ember', 'target': '*'})
    page.evaluate(ADVANCE.format(20))          # cast wind-up 22
    micro_strip(page, ctx, 'ember', 16, 1, _foe_region(page))
    _act_when(page, 'hero', {'type': 'swap'})
    _act_when(page, 'hero', {'type': 'attack', 'target': '*'})
    page.evaluate(ADVANCE.format(18))
    micro_strip(page, ctx, 'chop', 16, 1, _foe_region(page))
    _act_when(page, 'mira', {'type': 'swap'})
    _act_when(page, 'mira', {'type': 'attack', 'target': '*'})
    page.evaluate(ADVANCE.format(12))          # ready 6 + bow draw 8: the arrow is in flight
    micro_strip(page, ctx, 'arrow', 16, 1, (0, 56, 384, 100), scale=2)
    s = bstate(page)
    assert not s.get('lastInvalid'), s.get('lastInvalid')
    kicked = [k for k in ctx['kicks'] if k[0]]
    assert kicked, 'no camera kick was seen during the hits'
    assert all(k[0] == -1 for k in kicked), f'kick should point at the enemy side: {kicked[:4]}'
    ctx['note'] = f'{len(kicked)} kicked frames, hitstop seen {max(k[2] for k in ctx["kicks"])}'


def sc_reduce_motion(page, ctx):
    """reduceMotion: a plain mosaic + white fade intro, no camera kick, no slow motion; still no errors."""
    page.evaluate("LQ_DEBUG.settings({ reduceMotion: true })")
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('f1_mites', { fresh: true, seed: 5 })")
    page.evaluate(ADVANCE.format(12)); shot(page, ctx, 'intro12')
    advance_until(page, WAIT_MENU)
    _act_when(page, 'hero', {'type': 'attack', 'target': '*'})
    ctx['kicks'] = []
    micro_strip(page, ctx, 'hit', 24, 1, _foe_region(page))
    assert all(k[0] == 0 and k[1] == 0 for k in ctx['kicks']), ctx['kicks'][:6]
    page.evaluate("LQ_DEBUG.settings({ reduceMotion: false })")


def sc_strip_attack(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_slimes', { fresh: true, seed: 5 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('hero')")
    advance_until(page, WAIT_MENU + " && LQ_DEBUG.state().battle.current === 'hero'")
    page.evaluate("LQ_DEBUG.battleAct({ type: 'attack', target: 'e0' })")
    filmstrip(page, ctx, 'hero_attack', 12, 4)
    page.evaluate("LQ_DEBUG.battleUntil('mira')")
    advance_until(page, WAIT_MENU + " && LQ_DEBUG.state().battle.current === 'mira'")
    page.evaluate("LQ_DEBUG.battleAct({ type: 'skill', skill: 'ember', target: 'e1' })")
    filmstrip(page, ctx, 'mira_ember', 12, 5)
    page.evaluate("LQ_DEBUG.battleUntil('bram')")
    advance_until(page, WAIT_MENU + " && LQ_DEBUG.state().battle.current === 'bram'")
    page.evaluate("LQ_DEBUG.battleAct({ type: 'skill', skill: 'lunge', target: 'e2' })")
    filmstrip(page, ctx, 'bram_lunge', 12, 4)


def sc_strip_enemy(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 2 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('enemy')")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.current && LQ_DEBUG.state().battle.current[0] === 'e' && !LQ_DEBUG.state().battle.fast", max_frames=600, step=2)
    filmstrip(page, ctx, 'enemy_turn', 12, 4, full=True)
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 3 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('enemy')")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.current && LQ_DEBUG.state().battle.current[0] === 'e' && !LQ_DEBUG.state().battle.fast", max_frames=600, step=2)
    filmstrip(page, ctx, 'boss_turn', 12, 5, full=True)


def sc_boss_phase(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 4 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('phase2')")
    advance_until(page, WAIT_MENU + " && !LQ_DEBUG.state().battle.fast", max_frames=4000, step=10)
    page.evaluate(ADVANCE.format(2)); shot(page, ctx, 'pages')
    # Let the boss act once more at normal speed and film it (Feast / Ink Storm / pages).
    page.evaluate("LQ_DEBUG.battleUntil('enemy')")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.current && LQ_DEBUG.state().battle.current[0] === 'e' && !LQ_DEBUG.state().battle.fast", max_frames=600, step=2)
    filmstrip(page, ctx, 'phase2_turn', 12, 6, full=True)


def sc_party_ko(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 2, level: 3 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('enemy')")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.current && LQ_DEBUG.state().battle.current[0] === 'e' && !LQ_DEBUG.state().battle.fast", max_frames=600, step=2)
    filmstrip(page, ctx, 'boss_hit', 12, 6, full=True)
    page.evaluate("LQ_DEBUG.battleUntil('ko')")
    advance_until(page, "(() => { const s = LQ_DEBUG.state().battle; return !s || s.units.some(u => u.ko && !u.uid.startsWith('e')); })()", max_frames=4000, step=10)
    page.evaluate(ADVANCE.format(20)); shot(page, ctx, 'ko')


def sc_strip_death(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('f1_slimes', { fresh: true, seed: 5, level: 15 })")
    page.evaluate(ADVANCE.format(60))
    # W6-anim: the hero's own swings film the kill (the last strip is kept). The old swap-then-Heavy-Chop route
    # let the level-15 allies wipe the room during the fast-forward, so the hero's second turn never came.
    uid, _x = _living_foe(page)
    for _ in range(3):
        _act_when(page, 'hero', {'type': 'attack', 'target': uid})
        filmstrip(page, ctx, 'kill', 12, 6)
        foe = next(u for u in bstate(page)['units'] if u['uid'] == uid)
        if foe['ko'] or foe['dead']:
            break
    assert foe['ko'] or foe['dead'], foe


def sc_e2e_win(page, ctx):
    page.evaluate("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    t0 = time.time()
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 11 })")
    last = None
    while time.time() - t0 < 70:
        s = bstate(page)
        key = (s['phase'], s['menu'], s['current'], s['round']) if s else None
        if key != last:
            print(f'      t={time.time() - t0:5.1f}s state={key}', flush=True)
            last = key
        if page.evaluate("LQ_DEBUG.battleResult() === 'win'"):
            break
        page.wait_for_timeout(250)
    dt = time.time() - t0
    ctx['note'] = f'auto 2x valley_wolves won in {dt:.1f} s'
    assert dt < 60, dt
    assert page.evaluate("LQ_DEBUG.scene()") != 'battle'
    page.evaluate("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")


def sc_e2e_lose(page, ctx):
    page.evaluate("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    t0 = time.time()
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 1, level: 1, fast: 'over' })")
    page.wait_for_function("LQ_DEBUG.battleResult() === 'lose'", timeout=60000, polling=100)
    ctx['note'] = f'scripted defeat in {time.time() - t0:.1f} s'
    page.evaluate("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")


def sc_e2e_all(page, ctx):
    encs = page.evaluate("Object.keys(LQ_DEBUG.state().game ? {} : {})")
    ids = ['valley_wolves', 'valley_slimes', 'valley_scarab', 'valley_mixed', 'valley_pack', 'f1_slimes', 'f1_mites', 'f1_wraith',
           'f1_mixed', 'f2_golem', 'f2_wraiths', 'f2_mites', 'f2_mixed', 'echo_warden', 'f3_ink', 'f3_golem', 'f3_wraiths', 'f3_mixed', 'archivore']
    void = encs
    results = {}
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    for i, enc in enumerate(ids):
        page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ fresh: true, seed: {i + 1}, fast: 'over', forceElite: {str(i % 4 == 1).lower()} }})")
        frames = advance_until(page, "LQ_DEBUG.battleResult() !== null", max_frames=20000, step=40)
        results[enc] = (page.evaluate('LQ_DEBUG.battleResult()'), frames)
        errs = page.evaluate('LQ_DEBUG.errors()')
        if errs:
            raise RuntimeError(f'{enc}: engine errors {errs}')
    ctx['note'] = ' '.join(f"{k}:{v[0]}" for k, v in results.items())
    bad = [k for k, v in results.items() if v[0] not in ('win', 'lose')]
    assert not bad, bad


def tail_filmstrip(page, ctx, name, cond, step=8, keep=12, max_frames=6000):
    """Advance `step` frames at a time, keeping the last `keep` crops; stop when cond (JS) is true."""
    from PIL import Image
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, w, h = int(v['cssX']), int(v['cssY']), int(v['cssW']), int(v['cssH'])
    ring = []
    used = 0
    while used < max_frames:
        page.evaluate(ADVANCE.format(step)); used += step
        p = OUT / '_tail.png'
        page.screenshot(path=str(p))
        im = Image.open(p)
        ring.append(im.crop((x0, y0, x0 + w, y0 + h)).resize((384 * 2, 216 * 2), Image.NEAREST))
        im.close()
        if len(ring) > keep:
            ring.pop(0)
        if page.evaluate(cond):
            break
    cols = 4
    th = ring[0].height
    rows = (len(ring) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 384 * 2 + (cols - 1) * 4, rows * th + (rows - 1) * 4), (20, 16, 30))
    for i, t in enumerate(ring):
        sheet.paste(t, ((i % cols) * (384 * 2 + 4), (i // cols) * (th + 4)))
    path = OUT / f"{ctx['device']}-{ctx['name']}-{name}.png"
    sheet.save(path)
    ctx['files'].append(str(path))


def sc_combo(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 3 })")
    # Play Defend until the hero's turn offers a Combo (partners next in line, MP in hand).
    for _ in range(30):
        advance_until(page, WAIT_MENU)
        s = bstate(page)
        if s['combos']:
            break
        page.evaluate("LQ_DEBUG.battleAct({ type: 'defend' })")
    else:
        raise RuntimeError('no combo offered in 30 turns')
    skill = s['combos'][0]
    action = {'type': 'combo', 'skill': skill}
    if skill != 'thorn_bulwark':
        action['target'] = 'e0'
    page.evaluate('LQ_DEBUG.battleAct(' + json.dumps(action) + ')')
    filmstrip(page, ctx, skill, 12, 8, full=True)
    s = bstate(page)
    assert not s.get('lastInvalid'), s.get('lastInvalid')
    ctx['note'] = f'combo {skill}'


def sc_boss_death(page, ctx):
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 6 })")
    page.evaluate(ADVANCE.format(60))
    page.evaluate("LQ_DEBUG.battleUntil('phase3')")
    advance_until(page, WAIT_MENU + " && !LQ_DEBUG.state().battle.fast", max_frames=6000, step=10)
    page.evaluate("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    tail_filmstrip(page, ctx, 'death', "(() => { const b = LQ_DEBUG.state().battle; return !b || b.phase === 'victory' || b.phase === 'defeat'; })()", step=10, keep=12, max_frames=9000)
    page.evaluate(ADVANCE.format(30)); shot(page, ctx, 'after')
    page.evaluate("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")



# ------------------------------------------------------------------------------------------ W6-anim strips
# Each strip is a zoomed grid of game frames around one actor plus the frame NAME the actor drew in each tile
# (read back from LQ_ENGINE), so the run fails when a generator frame never reaches the screen.
ACTORS_JS = """(() => { const s = LQ_ENGINE.scene; if (!s || !s.actors) return [];
  return [...s.actors.values()].map((a) => { const f = a.dead ? null : (a.side === 'enemy' ? a.enemyFrame() : a.partyFrame());
    return { uid: a.uid, id: a.id, side: a.side, pose: a.pose, stance: a.stance || null, ko: a.ko, dead: a.dead,
      x: Math.round(a.x), y: Math.round(a.y), w: a.w, h: a.h, frame: f ? f.name : null }; }); })()"""


def actors(page):
    return page.evaluate(ACTORS_JS)


def actor(page, pred):
    return next((a for a in actors(page) if pred(a)), None)


def until_actor(page, pred, max_frames=900, step=1):
    used = 0
    while used <= max_frames:
        a = actor(page, pred)
        if a:
            return a
        page.evaluate(ADVANCE.format(step))
        used += step
    return None


def region_of(a, pad=18, top=14, scale_w=1.0):
    w = int(a['w'] * scale_w) + pad * 2
    h = a['h'] + top + 10
    x = max(0, min(384 - w, a['x'] - w // 2))
    y = max(0, min(216 - h, a['y'] - a['h'] - top))
    return (x, y, min(w, 384), min(h, 216))


def anim_strip(page, ctx, name, frames, step, region, uid, scale=3, cols=6):
    """micro_strip that also records the frame name `uid` drew in every tile (written under the strip)."""
    from PIL import Image, ImageDraw
    v = page.evaluate('LQ_DEBUG.view()')
    x0, y0, k = v['cssX'], v['cssY'], v['cssScale']
    gx, gy, gw, gh = region
    tiles, names = [], []
    for i in range(frames):
        page.evaluate(ADVANCE.format(step))
        a = actor(page, lambda a: a['uid'] == uid)
        names.append(a['frame'] if a else None)
        p = OUT / '_strip_tmp.png'
        page.screenshot(path=str(p))
        im = Image.open(p)
        crop = im.crop((int(x0 + gx * k), int(y0 + gy * k), int(x0 + (gx + gw) * k), int(y0 + (gy + gh) * k)))
        tiles.append(crop.resize((gw * scale, gh * scale), Image.NEAREST))
        im.close(); p.unlink()
    tw, th = tiles[0].size
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw + (cols - 1) * 4, rows * (th + 14) + (rows - 1) * 4), (20, 16, 30))
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(tiles):
        x, y = (i % cols) * (tw + 4), (i // cols) * (th + 18)
        sheet.paste(t, (x, y))
        d.text((x + 3, y + th + 1), f'{i * step + step}f  {names[i] or "-"}', fill=(235, 235, 210))
    path = OUT / f"{ctx['device']}-{ctx['name']}-{name}.png"
    sheet.save(path)
    ctx['files'].append(str(path))
    return names


def _enemy_turns_until(page, pred, turns=14):
    """Fast-forward to enemy turns until an enemy actor matches pred during one; returns that actor or None."""
    for _ in range(turns):
        page.evaluate("LQ_DEBUG.battleUntil('enemy')")
        advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.current && LQ_DEBUG.state().battle.current[0] === 'e' && !LQ_DEBUG.state().battle.fast", max_frames=3000, step=2)
        used = 0
        while used < 400:
            a = actor(page, pred)
            if a:
                return a
            page.evaluate(ADVANCE.format(1)); used += 1
            s = bstate(page)
            if not s or s.get('phase') != 'play' or (s.get('menu') and s['menu'] != 'closed'):
                break
    return None


def sc_anim_enemy(page, ctx):
    """An enemy lunge (attack frame) and the party member's hurt, then the enemy's own hurt frame under a hit."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_wolves', { fresh: true, seed: 2 })")
    page.evaluate(ADVANCE.format(60))
    a = _enemy_turns_until(page, lambda a: a['side'] == 'enemy' and a['pose'] == 'attack')
    assert a, 'no enemy lunge seen'
    names = anim_strip(page, ctx, 'lunge', 12, 2, (0, 44, 384, 120), a['uid'], scale=2, cols=4)
    assert 'briar_wolf_attack' in names, names
    page.evaluate("LQ_DEBUG.battle('f1_slimes', { fresh: true, seed: 5 })")
    page.evaluate(ADVANCE.format(60))
    _act_when(page, 'hero', {'type': 'attack', 'target': 'e0'})
    a = until_actor(page, lambda a: a['uid'] == 'e0' and a['pose'] == 'hurt', 300)
    assert a, 'e0 never hurt'
    names = anim_strip(page, ctx, 'hurt', 12, 2, region_of(a), 'e0')
    assert any(n and n.endswith('_hurt') for n in names), names
    ctx['note'] = f'lunge + hurt frames: {sorted(set(n for n in names if n))}'


def sc_anim_cast(page, ctx):
    """A caster's spell (cast frame with the glow) in the deep archive."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('f3_ink', { fresh: true, seed: 3, level: 9 })")
    page.evaluate(ADVANCE.format(60))
    a = _enemy_turns_until(page, lambda a: a['side'] == 'enemy' and a['pose'] == 'cast' and (a['frame'] or '').endswith('_cast'))
    assert a, 'no enemy cast frame seen'
    names = anim_strip(page, ctx, 'cast', 12, 2, region_of(a, pad=24, top=20), a['uid'])
    assert any(n and n.endswith('_cast') for n in names), names
    ctx['note'] = f"{a['id']}: {sorted(set(n for n in names if n))}"


def sc_anim_death(page, ctx):
    """die_0..2 crumble, the white flash and the dissolve, 2 frames a tile."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('f1_slimes', { fresh: true, seed: 5, level: 15 })")
    page.evaluate(ADVANCE.format(60))
    a = None
    for _ in range(3):
        _act_when(page, 'hero', {'type': 'attack', 'target': '*'})
        a = until_actor(page, lambda a: a['side'] == 'enemy' and a['pose'] == 'die' and not a['dead'], 240)
        if a:
            break
    assert a, 'no enemy entered the die pose'
    names = anim_strip(page, ctx, 'die', 18, 2, region_of(a), a['uid'])
    for k in range(3):
        assert any(n and n.endswith(f'_die_{k}') for n in names), names


def sc_anim_devour(page, ctx):
    """The Archivore's devour: eye swells, tendrils reach (several enemy turns until it devours)."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 2, level: 9 })")
    page.evaluate(ADVANCE.format(60))
    a = _enemy_turns_until(page, lambda a: a['id'] == 'archivore' and a['pose'] == 'devour', turns=24)
    if not a:
        # devour depends on the boss AI's dice: show the cast (ink inhale) instead and say so
        a = _enemy_turns_until(page, lambda a: a['id'] == 'archivore' and a['pose'] == 'cast', turns=6)
        assert a, 'the Archivore never cast or devoured'
        ctx['note'] = 'no devour within 24 enemy turns: filmed its cast'
    names = anim_strip(page, ctx, 'devour', 12, 3, region_of(a, pad=10, top=12), a['uid'], scale=2, cols=4)
    assert any(n and (n.endswith('_devour') or n.endswith('_cast')) for n in names), names
    ctx.setdefault('note', f'frames: {sorted(set(n for n in names if n))}')


def sc_anim_stance(page, ctx):
    """Echo Warden: the opening Mirror stance, then the swap to Bulwark (charged shield, then the new set)."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('echo_warden', { fresh: true, seed: 3, level: 8 })")
    a = until_actor(page, lambda a: a['id'] == 'echo_warden' and a['stance'] == 'mirror', 300)
    assert a, 'the Warden never took its Mirror stance'
    names0 = anim_strip(page, ctx, 'mirror', 6, 6, region_of(a, pad=16, top=16), a['uid'])
    a = _enemy_turns_until(page, lambda a: a['id'] == 'echo_warden' and a['stance'] == 'bulwark', turns=12)
    assert a, 'no stance swap within 12 enemy turns'
    names = anim_strip(page, ctx, 'swap', 12, 3, region_of(a, pad=16, top=16), a['uid'])
    assert any(n and n.startswith('echo_warden_mirror') for n in names0), names0
    assert any(n and n.startswith('echo_warden_bulwark') for n in names), names
    ctx['note'] = f'mirror {sorted(set(n for n in names0 if n))} -> {sorted(set(n for n in names if n))}'


def sc_anim_party(page, ctx):
    """Party extras in the real renderer: crit and combo poses on all three, then the level-up hop."""
    page.evaluate("LQ_DEBUG.setSpeed(0)")
    page.evaluate("LQ_DEBUG.battle('valley_slimes', { fresh: true, seed: 4, level: 1 })")
    advance_until(page, WAIT_MENU)
    seen = []
    ps = [a for a in actors(page) if a['side'] == 'party']
    x0 = max(0, min(a['x'] for a in ps) - 24); y0 = max(0, min(a['y'] - a['h'] for a in ps) - 12)
    box = (x0, y0, min(384 - x0, max(a['x'] for a in ps) + 24 - x0), min(216 - y0, max(a['y'] for a in ps) + 8 - y0))
    for pose in ('crit', 'combo'):
        page.evaluate("(() => { for (const a of LQ_ENGINE.scene.actors.values()) if (a.side === 'party') a.setPose('%s'); })()" % pose)
        page.evaluate(ADVANCE.format(1))
        seen += [a['frame'] for a in actors(page) if a['side'] == 'party']
        zoom(page, ctx, f'party_{pose}', box, 4)
    assert all(any(n and n.endswith(s) for n in seen) for s in ('_crit', '_combo')), seen
    page.evaluate("LQ_DEBUG.battle('valley_slimes', { fresh: true, seed: 4, level: 1, fast: 'end' })")
    advance_until(page, "LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase === 'rewards'", max_frames=6000)
    page.evaluate(ADVANCE.format(70))
    page.evaluate("LQ_DEBUG.press('confirm')")
    uid = page.evaluate("(() => { const R = LQ_ENGINE.scene.rewards; const p = R && R.pages[R.index + 1]; return p && p.uid; })()") or 'hero'
    names = anim_strip(page, ctx, 'levelup', 12, 2, (box[0], max(0, box[1] - 10), box[2], box[3] + 10), uid, scale=3, cols=6)
    s = bstate(page)
    assert s['rewards'] and s['rewards']['page'] == 'level', s
    assert any(n and n.endswith('_levelup') for n in names), names
    ctx['note'] = f'{uid} level-up frames: {sorted(set(n for n in names if n))}'


SCENARIOS = {
    'start': (sc_start, ['desktop', 'phone']),
    'stage': (sc_stage, ['desktop']),
    'strip_intro': (sc_strip_intro, ['desktop']),
    'breathe': (sc_breathe, ['desktop']),
    'reduce_motion': (sc_reduce_motion, ['desktop']),
    'strip_impact': (sc_strip_impact, ['desktop']),
    'command': (sc_command, ['desktop', 'phone']),
    'target_preview': (sc_target_preview, ['desktop', 'phone']),
    'break': (sc_break, ['desktop']),
    'boss': (sc_boss, ['desktop', 'phone']),
    'victory': (sc_victory, ['desktop']),
    'levelup': (sc_levelup, ['desktop']),
    'flee': (sc_flee, ['desktop']),
    'strip_attack': (sc_strip_attack, ['desktop']),
    'strip_enemy': (sc_strip_enemy, ['desktop']),
    'strip_death': (sc_strip_death, ['desktop']),
    'boss_phase': (sc_boss_phase, ['desktop']),
    'party_ko': (sc_party_ko, ['desktop']),
    'combo': (sc_combo, ['desktop']),
    'boss_death': (sc_boss_death, ['desktop']),
    'e2e_win': (sc_e2e_win, ['desktop']),
    'e2e_lose': (sc_e2e_lose, ['desktop']),
    'e2e_all': (sc_e2e_all, ['desktop']),
    'anim_enemy': (sc_anim_enemy, ['desktop']),
    'anim_cast': (sc_anim_cast, ['desktop']),
    'anim_death': (sc_anim_death, ['desktop']),
    'anim_devour': (sc_anim_devour, ['desktop']),
    'anim_stance': (sc_anim_stance, ['desktop']),
    'anim_party': (sc_anim_party, ['desktop']),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--timeout', type=int, default=900)
    args = ap.parse_args()
    if args.list:
        for k, (_, devs) in SCENARIOS.items():
            print(f'  {k:<16} {",".join(devs)}')
        return 0
    names = [n.strip() for n in args.only.split(',') if n.strip()] or list(SCENARIOS)
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(args.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7'
    report = []
    failures = 0
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
                missing = []
                def on_console(msg, errors=errors, ctx_ref=None):
                    if msg.type != 'error':
                        return
                    loc = msg.location.get('url', '') if isinstance(msg.location, dict) else ''
                    # Missing scene modules of other agents (registry.js probes them) are not battle errors.
                    if '404' in msg.text and re.search(r'src/(scenes/(?!battle)|ui/)[A-Za-z_/]+\.js', loc):
                        missing.append(loc.rsplit('/', 1)[-1])
                        return
                    errors.append(f'console.error: {msg.text} {loc}'.strip())
                page.on('console', on_console)
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
                except Exception as e:  # noqa: BLE001 - any failure is a failed scenario
                    status, detail = 'FAIL', str(e).splitlines()[0][:300]
                    try:
                        page.screenshot(path=str(OUT / f'{dname}-{name}-FAILED.png'))
                    except PwError:
                        pass
                if errors and status == 'ok':
                    status = 'FAIL'
                if errors:
                    detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:4])
                if status != 'ok':
                    failures += 1
                miss = f' (missing scenes ignored: {",".join(sorted(set(missing)))})' if missing else ''
                print(f'{status:<4} {dname:<8} {name:<16} {int((time.time() - t0) * 1000):>6} ms  {ctx["note"]}  {detail}{miss}', flush=True)
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
