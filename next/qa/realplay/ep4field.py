"""The Episode 4 field by real input: walking, talking, a chest, stairs, a tide wheel low / mid / high, a pontoon, a forged seal."""
from menus import free, settle

PLACE = """async ([map, x, y, dir, flags]) => {
  LQ_PACKS.forcePack('ep4'); await LQ_PACKS.ensurePack('ep4');
  LQ_DEBUG.newGameEp4('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  g.flags.ep4_started = true; g.flags.ep4_morning_done = true; g.flags.hero_signed = true;
  for (const f of flags) g.flags[f] = true;
  g.map = map; g.pos = { x, y, dir };
  LQ_DEBUG.settings({ textSpeed: 4, autoBattle: true, battleSpeed: 2, equipPrompts: false, rotateHintSeen: true });
  LQ_ENGINE.reset('field');
}"""
PATH = """async ([x, y]) => {
  const f = LQ_ENGINE.scene, L = f.leader;
  const { findPath } = await import(new URL('src/world/pathfind.js', LQ_ENGINE.assets.base || location.href).href);
  return findPath((cx, cy, nx, ny, d) => f.canStep(L, cx, cy, nx, ny, d) === true, [L.tx, L.ty], [x, y], { maxNodes: 20000 });
}"""
DIRV = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}


def place(p, map_id, x, y, d='down', flags=()):
    p.js(PLACE, [map_id, x, y, d, list(flags)])
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition && !!LQ_ENGINE.scene.map && !LQ_ENGINE.scene.loading", 'the field', 15)
    p.frames(20)
    settle(p)


def leader(p):
    return p.js("(() => { const L = LQ_ENGINE.scene.leader; return L ? { x: L.tx, y: L.ty, dir: L.dir, moving: !!L.moving } : null; })()")


def tide(p):
    return p.js("(() => { const t = LQ_ENGINE.scene.tide; return t && t.active ? { levels: { ...t.levels }, washed: [...t.washed], busy: !!t.busy || !!t.anim } : null; })()")


def step(p, d):
    """One tile with this device's own direction control: held until the leader starts the step."""
    a = leader(p)
    want = (a['x'] + DIRV[d][0], a['y'] + DIRV[d][1])
    cond = f"(() => {{ const s = LQ_ENGINE.scene, L = s && s.leader; return !L || s.name !== 'field' || (L.tx === {want[0]} && L.ty === {want[1]}); }})()"
    if p.touch:
        box = p.control_box('dpad')
        x = box['x'] + box['width'] / 2 + DIRV[d][0] * box['width'] * 0.33
        y = box['y'] + box['height'] / 2 + DIRV[d][1] * box['width'] * 0.33
        p._touch('touchStart', x, y)
        p.page.wait_for_function(cond, timeout=5000, polling=8)
        p._touch('touchEnd', x, y)
    else:
        from driver import KEY_FOR
        p.page.keyboard.down(KEY_FOR[d])
        p.page.wait_for_function(cond, timeout=5000, polling=8)
        p.page.keyboard.up(KEY_FOR[d])
    p.until("(() => { const s = LQ_ENGINE.scene; return !s.leader || s.name !== 'field' || !s.leader.moving; })()", 'the step ends', 5)
    p.frames(2)


def walk(p, x, y, label=''):
    """Walk to (x, y) on the live floor, a tile at a time. Fights and scenes that interrupt are played through (Auto is on for this)."""
    for _ in range(6):
        settle_all(p)
        route = p.js(PATH, [x, y])
        if route is None:
            p.check(False, f'a route to ({x},{y}) {label}', leader(p))
            return False
        if not route:
            return True
        broke = False
        for d in route:
            step(p, d)
            if not free(p):
                settle_all(p)
                broke = True
                break
        if not broke:
            l = leader(p)
            if (l['x'], l['y']) == (x, y):
                return True
    return False


def settle_all(p, timeout=60):
    """Back to a free field through dialogs and a fight (rewards by the device's own control)."""
    import time
    t0 = time.time()
    while time.time() - t0 < timeout:
        if free(p):
            return True
        name = p.scene()
        if name == 'battle':
            d = p.battle()
            if d.get('phase') == 'rewards':
                p.act('confirm')
            p.frames(10)
        elif name in ('dialog', 'choice'):
            p.act('confirm')
        elif name == 'shop':
            p.act('cancel')
        else:
            p.frames(4)
    p.check(False, 'the field comes back', p.lite()['scenes'])
    return False


def face(p, d):
    """Turn toward a blocked tile by pressing into it."""
    a = leader(p)
    if a['dir'] == d:
        return
    p.act(d)
    p.frames(3)
    p.check(leader(p)['dir'] == d, f'a press turns the party {d}', leader(p))


def turn_wheel(p, wheel_label):
    """Confirm on the faced wheel, read through its line, wait for the water."""
    t0 = tide(p)
    p.act('confirm')
    p.frames(6)
    settle_all(p)
    p.until("(() => { const t = LQ_ENGINE.scene.tide; return !t || (!t.busy && !t.anim); })()", f'{wheel_label} settles', 10)
    settle_all(p)
    t1 = tide(p)
    p.check(t1['levels'] != t0['levels'], f'{wheel_label} turns the water', (t0, t1))
    return t1


def lane(p):
    """The Flood Road's drowned lane: a wheel, the canal stairs, a pontoon, a chest (docs/MAPS_EP4_A.md 2)."""
    place(p, 'ep4_flood_road', 13, 13, 'down', ['flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane'])
    p.check(free(p), 'the Flood Road is free', p.lite()['scenes'])
    p.shot('lane-start')
    p.check(tide(p)['levels'] == {'l': 1}, 'the lane starts at mid', tide(p))
    face(p, 'right')
    p.shot('lane-wheel')
    t = turn_wheel(p, 'the lane wheel')
    p.check(t['levels'] == {'l': 0}, 'mid to low drains the lane', t)
    p.shot('lane-low')
    walk(p, 15, 13, 'to the sluice stand')
    p.check((leader(p)['x'], leader(p)['y']) == (15, 13), 'the canal stairs reach the stand', leader(p))
    face(p, 'left')
    t = turn_wheel(p, 'the stand wheel')
    p.check(t['levels'] == {'l': 1}, 'low to mid floats the punt', t)
    p.shot('lane-punt')
    walk(p, 15, 12, 'onto the punt')
    p.check((leader(p)['x'], leader(p)['y']) == (15, 12), 'a floating punt carries the party', leader(p))
    p.shot('lane-on-punt')
    walk(p, 15, 10, 'across')
    p.check((leader(p)['x'], leader(p)['y']) == (15, 10), 'the pontoon crossing ends on the far bank', leader(p))
    face(p, 'up')
    n0 = p.js("LQ_ENGINE.game.items.hi_potion || 0")
    p.act('confirm')
    p.frames(10)
    p.shot('lane-chest')
    settle_all(p)
    p.check(p.js("!!LQ_ENGINE.game.opened['ep4_flood_road:chest_punt']"), 'the chest opens', p.js("LQ_ENGINE.game.opened"))
    p.check(p.js("LQ_ENGINE.game.items.hi_potion || 0") == n0 + 2, 'the chest pays', n0)
    walk(p, 15, 13, 'back over the punt')
    face(p, 'left')
    t = turn_wheel(p, 'the stand wheel again')
    p.check(t['levels'] == {'l': 0}, 'the lane drains again', t)
    p.check(walk(p, 20, 15, 'along the dry lane'), 'the dry lane walks')
    p.check(tide(p)['levels'] == {'l': 0}, 'the lane stays low', tide(p))


def seal(p):
    """Keep F1: wh_a low, mid, high, a forged seal washes off for good, the door behind it opens to the walk."""
    place(p, 'ep4_keep_f1', 14, 18, 'right', ['keep_entered', 'keep_f1_arrived'])
    p.js("LQ_DEBUG.give('lock_crank', 1)")
    p.frames(4)
    p.check(free(p), 'Keep F1 is free', p.lite()['scenes'])
    p.check(tide(p)['levels'].get('a') == 0, 'basin a starts low', tide(p))
    p.check('seal_b' not in tide(p)['washed'], 'the seal is on the door', tide(p))
    p.shot('seal-start')
    face(p, 'right')
    t = turn_wheel(p, 'wh_a')
    p.check(t['levels'].get('a') == 1, 'low to mid', t)
    p.shot('seal-mid')
    p.check('seal_b' not in t['washed'], 'mid leaves the seal', t)
    t = turn_wheel(p, 'wh_a')
    p.check(t['levels'].get('a') == 2, 'mid to high', t)
    p.shot('seal-high')
    p.check('seal_b' in t['washed'], 'high water washes the forged seal', t)
    settle_all(p)
    t = turn_wheel(p, 'wh_a')
    p.check(t['levels'].get('a') == 0, 'high to low wraps', t)
    p.check('seal_b' in t['washed'], 'the wash lasts at low water', t)
    p.check(p.js("(LQ_ENGINE.game.washed || {}).ep4_keep_f1 || []") == ['seal_b'] or 'seal_b' in p.js("(LQ_ENGINE.game.washed || {}).ep4_keep_f1 || []"), 'the wash is saved', p.js("LQ_ENGINE.game.washed"))
    p.check(walk(p, 17, 10, 'to the papered door'), 'the canal floor reaches the door')
    p.shot('seal-door')
    p.check(walk(p, 17, 6, 'through the door'), 'the door behind the seal opens to the walk', leader(p))


def talk(p):
    place(p, 'ep4_flood_road', 41, 19, 'right', ['flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane'])
    p.check(free(p), 'the fire is free', p.lite()['scenes'])
    face(p, 'right')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'dialog'", 'Nilo answers', 6)
    p.shot('talk')
    settle_all(p)
    p.check(free(p), 'the talk ends', p.lite()['scenes'])


def stairs(p):
    """Up and down a map change on foot: the ladder foot back to Emberpeak and the door back down."""
    place(p, 'ep4_flood_road', 2, 15, 'left', ['flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane', 'east_road_open'])
    p.check(free(p), 'the ladder foot is free', p.lite()['scenes'])
    walk(p, 1, 15)
    route = leader(p)
    p.hold('left', 20)
    p.until("LQ_ENGINE.game.map === 'emberpeak' && LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition", 'the ladder leads up to Emberpeak', 10)
    settle_all(p)
    p.shot('stairs-up')
    p.check(p.js("LQ_ENGINE.game.map") == 'emberpeak', 'on Emberpeak', route)
    # and down again: the rope ladder door
    l = leader(p)
    p.hold('right', 40)
    p.until("LQ_ENGINE.game.map === 'ep4_flood_road' && LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition", 'the ladder leads down', 10)
    settle_all(p)
    p.check(free(p), 'the field is free after the stairs', (l, p.lite()['scenes']))


def hold_and_press(p):
    """A player leaning on the d-pad against a chest or a person and pressing A: the press must count."""
    place(p, 'ep4_flood_road', 40, 18, 'left', ['flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane'])
    if p.touch:
        box, a = p.control_box('dpad'), p.control_box('a')
        d = {'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2 - box['width'] * 0.33, 'id': 1, 'radiusX': 6, 'radiusY': 6, 'force': 1}
        b = {'x': a['x'] + a['width'] / 2, 'y': a['y'] + a['height'] / 2, 'id': 2, 'radiusX': 6, 'radiusY': 6, 'force': 1}
        s = p._cdp()
        s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [d]})
        p.frames(24)
        s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [d, b]})
        p.frames(6)
        s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [d]})
        p.frames(10)
        got = p.scene()
        s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        p.page.keyboard.down('ArrowUp')
        p.frames(24)
        p.page.keyboard.press('KeyZ', delay=40)
        p.frames(10)
        got = p.scene()
        p.page.keyboard.up('ArrowUp')
    p.frames(6)
    p.shot('hold-and-press')
    p.check(got == 'dialog', 'A while holding toward a person talks', got)
    settle_all(p)
    # the same with MENU while the party is held against a wall
    place(p, 'ep4_flood_road', 40, 18, 'up', ['flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane'])
    if p.touch:
        box, m = p.control_box('dpad'), p.control_box('menu')
        d = {'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2 - box['width'] * 0.33, 'id': 1, 'radiusX': 6, 'radiusY': 6, 'force': 1}
        b = {'x': m['x'] + m['width'] / 2, 'y': m['y'] + m['height'] / 2, 'id': 2, 'radiusX': 6, 'radiusY': 6, 'force': 1}
        s = p._cdp()
        s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [d]})
        p.frames(24)
        s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [d, b]})
        p.frames(6)
        s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [d]})
        p.frames(10)
        got = p.scene()
        s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        p.page.keyboard.down('ArrowUp')
        p.frames(24)
        p.page.keyboard.press('KeyC', delay=40)
        p.frames(10)
        got = p.scene()
        p.page.keyboard.up('ArrowUp')
    p.check(got == 'menu', 'MENU while holding against a blocker opens the menu', got)


SEQUENCES = [('lane', lane), ('seal', seal), ('talk', talk), ('stairs', stairs), ('hold and press', hold_and_press)]
TOUCH_ONLY = []
