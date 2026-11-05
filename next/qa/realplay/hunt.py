"""Where bots never go: mashing, a key held across a change, every list row, a shop, a wipe, the settings that can lock a player out."""
from battle import MENU_GONE, cursor_to, defend, expect_menu, menu_state, over, start, to_member, wait_turn
from driver import in_bounds
from ep4field import face, leader, place, settle_all, step
from menus import field, free, menu_cmd, mode, open_menu

ROAD = ['flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane']


def row_sweep(p):
    """Every row of every list of every member: an enabled row opens targeting (or acts), a greyed one buzzes and stays."""
    start(p, 'e4r_first', 12, False)
    wait_turn(p, timeout=30)
    refill = "for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.mp = u.maxMp; u.fury = 100; }"
    for who in ('hero', 'mira', 'bram'):
        p.js(refill)
        if not p.check(to_member(p, who), f'{who} gets a turn'):
            return
        p.js(refill)
        for cmd in ('tech', 'magic', 'item'):
            if cmd not in p.battle()['menuItems']:
                continue
            cursor_to(p, cmd)
            p.act('confirm')
            if not expect_menu(p, 'sub', f'{who} {cmd} opens'):
                continue
            rows = p.js("LQ_ENGINE.scene.menu.sub.items.map(i => ({ id: i.id, dis: !!i.disabled }))")
            for i, row in enumerate(rows):
                p.check(p.js('LQ_ENGINE.scene.menu.sub.index') == i, f'{cmd} cursor on {row["id"]}', i)
                p.check(p.js("(() => { const m = LQ_ENGINE.scene.menu.sub; return m.isVisible(m.index); })()"), f'{row["id"]} scrolled into view')
                p.act('confirm')
                p.frames(2)
                st = menu_state(p)
                if row['dis']:
                    p.check(st == 'sub', f'{who} greyed {row["id"]} stays on the list', st)
                else:
                    p.check(st == 'target', f'{who} {row["id"]} opens targeting', st)
                    if st == 'target':
                        p.act('cancel')
                        p.frames(2)
                        p.check(menu_state(p) == 'sub', f'cancel from {row["id"]} returns', menu_state(p))
                if i + 1 < len(rows):
                    p.act('down')
            p.act('cancel')
            expect_menu(p, 'root', f'{who} {cmd} closes')
        defend(p)


def target_kinds(p):
    """A revive on a fallen ally; a heal on everyone; a self buff: each by this device's control."""
    start(p, 'e4r_first', 13, False)
    wait_turn(p, timeout=30)
    p.js("(() => { const b = LQ_ENGINE.scene.b, u = b.unit('bram'); u.hp = 0; u.alive = false; u.ko = true; })()")
    p.check(to_member(p, 'mira'), 'Mira gets a turn')
    p.js("LQ_ENGINE.scene.b.unit('mira').mp = 99")
    cursor_to(p, 'item')
    p.act('confirm')
    expect_menu(p, 'sub', 'Item opens')
    rows = p.js("LQ_ENGINE.scene.menu.sub.items.map(i => i.id)")
    i = rows.index('phoenix_feather')
    for _ in range(i):
        p.act('down')
    p.act('confirm')
    expect_menu(p, 'target', 'a feather opens targeting')
    p.shot('feather-target')
    p.check(p.battle()['target'] == 'bram', 'the feather targets the fallen', p.battle()['target'])
    p.act('confirm')
    p.until(MENU_GONE, 'the feather closes the menu', 6)
    p.until("LQ_ENGINE.scene.b.unit('bram').alive || LQ_ENGINE.scene.phase !== 'play'", 'the feather revives', 10)
    # everyone
    p.check(to_member(p, 'mira'), 'Mira again')
    p.js("LQ_ENGINE.scene.b.unit('mira').mp = 99")
    cursor_to(p, 'magic')
    p.act('confirm')
    expect_menu(p, 'sub', 'Magic opens')
    rows = p.js("LQ_ENGINE.scene.menu.sub.items.map(i => i.id)")
    for _ in range(rows.index('mending_rain')):
        p.act('down')
    p.act('confirm')
    expect_menu(p, 'target', 'Mending Rain opens targeting')
    p.shot('rain-target')
    if p.touch:
        a = p.js("(() => { const a = LQ_ENGINE.scene.actors.get('hero'); return { x: a.cx, y: a.cy }; })()")
        p.tap(a['x'], a['y'])
    else:
        p.act('confirm')
    p.until(MENU_GONE, 'Mending Rain confirms', 6)


def mash_battle(p):
    """Z held down in a rhythm through a whole fight: no stuck state, the fight ends, the field or the caller gets it back."""
    start(p, 'e4r_first', 14, False)
    p.js("for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'enemy') u.hp = Math.min(u.hp, 60)")
    for _ in range(420):
        if p.scene() != 'battle':
            break
        if p.touch:
            p.press_control('a', None, 1)
        else:
            p.page.keyboard.press('KeyZ', delay=12)
            p.page.wait_for_timeout(8)
    p.until("LQ_DEBUG.scene() !== 'battle'", 'mashing A ends the fight', 20)
    p.check(p.js("LQ_DEBUG.battleResult()") in ('win', 'lose'), 'the mashed fight ended', p.js("LQ_DEBUG.battleResult()"))


def mash_wheel(p):
    """A and MENU mashed at a wheel while the water moves: it settles, nothing is left locked."""
    place(p, 'ep4_flood_road', 13, 13, 'right', ROAD)
    face(p, 'right')
    for i in range(40):
        if p.scene() != 'field':
            if p.scene() == 'menu':
                p.act('cancel')
            elif p.scene() in ('dialog', 'choice'):
                p.act('confirm')
            p.frames(2)
            continue
        if p.touch:
            p.press_control('a' if i % 3 else 'menu', None, 1)
        else:
            p.page.keyboard.press('KeyZ' if i % 3 else 'KeyC', delay=12)
    p.frames(30)
    for _ in range(12):
        if p.scene() == 'menu':
            p.act('cancel')
            p.frames(10)
        elif p.scene() in ('dialog', 'choice'):
            p.act('confirm')
        else:
            p.frames(10)
    settle_all(p)
    p.until("(() => { const t = LQ_ENGINE.scene.tide; return !t.busy && !t.anim; })()", 'the water settles after mashing', 10)
    p.check(free(p), 'the field is free after mashing a wheel', p.lite()['scenes'])
    l = leader(p)
    step(p, 'down')
    p.check(leader(p) != l, 'the party moves after mashing', l)


def menu_mid_walk(p):
    """MENU tapped mid-step while walking: the menu opens at the next tile, not never."""
    place(p, 'ep4_flood_road', 3, 15, 'right', ROAD)
    for tries in range(3):
        if p.touch:
            box = p.control_box('dpad')
            x, y = box['x'] + box['width'] / 2 + box['width'] * 0.33, box['y'] + box['height'] / 2
            m = p.control_box('menu')
            d = {'x': x, 'y': y, 'id': 1, 'radiusX': 6, 'radiusY': 6, 'force': 1}
            b = {'x': m['x'] + m['width'] / 2, 'y': m['y'] + m['height'] / 2, 'id': 2, 'radiusX': 6, 'radiusY': 6, 'force': 1}
            s = p._cdp()
            s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [d]})
            p.until("LQ_ENGINE.scene.leader.moving", 'the walk starts', 3)
            s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [d, b]})
            s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [d]})
            p.frames(12)
            s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            p.page.keyboard.down('ArrowRight')
            p.until("LQ_ENGINE.scene.leader.moving", 'the walk starts', 3)
            p.frames(2)
            p.page.keyboard.press('KeyC', delay=20)
            p.frames(24)
            p.page.keyboard.up('ArrowRight')
        p.frames(8)
        got = p.scene()
        if got == 'menu':
            break
    p.check(got == 'menu', 'MENU tapped mid-step opens the menu', got)
    if got == 'menu':
        p.act('cancel')
        p.until("LQ_DEBUG.scene() === 'field'", 'and it closes', 5)


def alt_keys(p):
    """The other keys printed on the keyboard map: Space, Escape, Tab, W A S D, Backspace."""
    if p.touch:
        return
    field(p)
    p.key('Tab')
    p.until("LQ_DEBUG.scene() === 'menu'", 'Tab opens the menu', 5)
    p.frames(12)
    p.key('KeyS')
    p.check(p.js("LQ_ENGINE.scene.commands.index") == 1, 'S moves down', p.js("LQ_ENGINE.scene.commands.index"))
    p.key('KeyW')
    p.check(p.js("LQ_ENGINE.scene.commands.index") == 0, 'W moves up')
    p.key('Space')
    p.frames(3)
    p.check(mode(p) == 'screen', 'Space confirms', mode(p))
    p.key('Backspace')
    p.frames(3)
    p.check(mode(p) == 'commands', 'Backspace cancels', mode(p))
    p.key('Escape')
    p.until("LQ_DEBUG.scene() === 'field'", 'Escape closes the menu', 5)
    p.key('Enter')
    p.frames(4)
    p.check(p.scene() == 'field', 'Enter on nothing stays on the field', p.scene())


def blur_held(p):
    """A key held as the window loses focus must not walk on by itself."""
    if p.touch:
        return
    place(p, 'ep4_flood_road', 3, 15, 'right', ROAD)
    p.page.keyboard.down('ArrowRight')
    p.until("LQ_ENGINE.scene.leader.moving", 'the walk starts', 3)
    p.js("window.dispatchEvent(new Event('blur'))")
    p.frames(30)
    a = leader(p)
    p.frames(30)
    p.check(leader(p)['x'] == a['x'], 'a blur stops the walk', (a, leader(p)))
    p.page.keyboard.up('ArrowRight')


def shop(p):
    """Hale's stall: buy with a quantity, sell, leave, by this device's control."""
    place(p, 'ep4_flood_road', 40, 18, 'up', ROAD)
    face(p, 'up')
    p.act('confirm')
    for _ in range(30):
        if p.scene() == 'shop':
            break
        if p.scene() == 'dialog':
            p.act('confirm')
        p.frames(3)
    if not p.check(p.scene() == 'shop', 'the shop opens', p.lite()['scenes']):
        return
    p.frames(10)
    p.shot('shop')
    gold = p.js("LQ_ENGINE.game.gold")
    if p.touch:
        p.tap(12 + 22, 16)     # Buy, already the command: a tap confirms it
    else:
        p.act('confirm')
    p.frames(4)
    p.check(p.js("LQ_ENGINE.scene.focus") == 'list', 'Buy opens the list', p.js("LQ_ENGINE.scene.focus"))
    p.shot('shop-list')
    p.act('confirm')
    p.frames(4)
    if p.js("!!LQ_ENGINE.scene.qty"):
        p.act('right')
        p.frames(2)
        p.shot('shop-qty')
        p.act('confirm')
        p.frames(4)
    p.check(p.js("LQ_ENGINE.game.gold") < gold, 'buying spends gold', p.js("LQ_ENGINE.game.gold"))
    p.check(p.js("!LQ_ENGINE.scene.qty"), 'the quantity box closes')
    p.act('cancel')
    p.frames(3)
    p.check(p.js("LQ_ENGINE.scene.focus") == 'cmds', 'cancel returns to the commands', p.js("LQ_ENGINE.scene.focus"))
    if p.touch:
        p.tap(12 + 46 + 22, 16)
        p.frames(3)
        p.check(p.js("LQ_ENGINE.scene.cmd") == 1, 'a tap selects Sell', p.js("LQ_ENGINE.scene.cmd"))
    else:
        p.act('right')
    p.frames(3)
    p.shot('shop-sell')
    p.act('cancel')
    p.until("LQ_DEBUG.scene() !== 'shop'", 'the shop closes', 5)
    settle_all(p)
    p.check(free(p), 'the field comes back after the shop', p.lite()['scenes'])


def wipe(p):
    """A real wipe: Game Over, Retry by this device's control, back on the field."""
    place(p, 'ep4_flood_road', 3, 15, 'right', ROAD)
    p.js("LQ_DEBUG.settings({ autoBattle: false })")
    p.js("LQ_ENGINE.game.lastSafe = { map: 'ep4_flood_road', pos: { x: 3, y: 15, dir: 'right' } }")
    p.js("LQ_DEBUG.battle('barrister', { seed: 3, gameover: true, canFlee: false })")
    p.until("LQ_DEBUG.scene() === 'battle' && LQ_ENGINE.scene.phase === 'play'", 'the fight starts', 20)
    p.js("for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') u.hp = 1")
    for _ in range(20):
        wait_turn(p, timeout=30)
        if over(p):
            break
        defend(p)
    p.until("LQ_DEBUG.scene() === 'gameover'", 'the wipe reaches Game Over', 30)
    p.until("LQ_ENGINE.scene.name === 'gameover' && LQ_ENGINE.scene.t >= 2.7", 'the Game Over menu', 8)
    p.frames(6)
    p.shot('gameover')
    p.check(in_bounds(p.ss()['win']), 'the Game Over window on screen', p.ss())
    i = p.ss()['index']
    p.act('down')
    p.check(p.ss()['index'] != i, 'down walks Game Over', p.ss()['index'])
    p.act('up')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition", 'Retry reaches the field', 10)
    p.js("LQ_DEBUG.settings({ autoBattle: false })")
    p.frames(30)
    settle_all(p)
    p.check(free(p), 'the field is free after Retry', p.lite()['scenes'])


def touch_off(p):
    """Config > Touch controls > Off on a phone: the player must still be able to get them back."""
    if not p.touch:
        return
    field(p)
    open_menu(p)
    menu_cmd(p, 'config')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'config'", 'Config opens', 5)
    for _ in range(14):
        if p.ss()['key'] == 'touchControls':
            break
        p.act('down')
    p.act('right')
    p.act('right')
    p.frames(4)
    st = p.ss()
    p.check(st['key'] == 'touchControls', 'the row is reached', st)
    p.shot('touch-off')
    gone = p.js("LQ_ENGINE.settings.touchControls") == 'off'
    vis = p.js("LQ_ENGINE.touch.visible")
    print(f'    touchControls {p.js("LQ_ENGINE.settings.touchControls")} visible {vis}', flush=True)
    if gone:
        # the only thing a phone still has is the glass
        v = p.js('LQ_DEBUG.view()')
        x, y = v['screenW'] / 2 if 'screenW' in v else 300, 300
        p._touch('touchStart', x, y)
        p.frames(3)
        p._touch('touchEnd', x, y)
        p.frames(6)
        p.check(p.js("LQ_ENGINE.touch.visible"), 'a touch on the glass brings the controls back (a phone has no other way)', p.js("LQ_ENGINE.settings.touchControls"))


def ability_button(p):
    """Q switches the field ability."""
    if p.touch:
        return    # its button only shows beside a target
    place(p, 'ep4_flood_road', 3, 15, 'right', ROAD)
    a0 = p.js("LQ_ENGINE.scene.abilities.selected()")
    p.act('pageL')
    p.frames(3)
    p.check(p.js("LQ_ENGINE.scene.abilities.selected()") != a0, 'the ability switches', a0)


SEQUENCES = [('row sweep', row_sweep), ('target kinds', target_kinds), ('mash battle', mash_battle), ('mash wheel', mash_wheel), ('menu mid walk', menu_mid_walk),
             ('alt keys', alt_keys), ('blur held', blur_held), ('shop', shop), ('wipe', wipe), ('touch off', touch_off), ('ability', ability_button)]
TOUCH_ONLY = []
