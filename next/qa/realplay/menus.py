"""The field and pause menu by real input: open, every page, equip a piece, close, Save, quit, Load."""
from driver import in_bounds

# A field with nothing running: the Valewyn inn (Episode 4), past the opening scenes.
FIELD = """async () => {
  LQ_PACKS.forcePack('ep4'); await LQ_PACKS.ensurePack('ep4');
  LQ_DEBUG.newGameEp4('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  for (const f of ['ep4_started', 'ep4_morning_done', 'ep4_opening_done', 'saw_valewyn', 'first_fight_done', 'e4_first_fight_done']) g.flags[f] = true;
  g.flags.hero_signed = true;
  g.map = 'ep4_flood_road'; g.pos = { x: 3, y: 15, dir: 'right' };
  LQ_DEBUG.settings({ textSpeed: 4, autoBattle: false, battleSpeed: 2, equipPrompts: false, rotateHintSeen: true });
  LQ_ENGINE.reset('field');
}"""


def field(p):
    p.js(FIELD)
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition && !!LQ_ENGINE.scene.map", 'the field', 15)
    p.frames(30)
    settle(p)


def free(p):
    """The field takes input: no scene over it, no cutscene."""
    return p.js("(() => { const f = LQ_ENGINE.scene; return !!(f && f.name === 'field' && !LQ_ENGINE.transition && !f.inputLocked && !(f.cutscene && f.cutscene.running)); })()")


def settle(p, timeout=30):
    """Press through whatever dialog is up, until the field is free."""
    import time
    t0 = time.time()
    while time.time() - t0 < timeout:
        if free(p):
            return True
        name = p.scene()
        if name == 'dialog':
            p.act('confirm')
        elif name == 'choice':
            p.act('confirm')
        else:
            p.frames(4)
    return False


def open_menu(p):
    p.act('menu')
    p.until("LQ_DEBUG.scene() === 'menu' && LQ_ENGINE.scene.anim.k >= 1", 'the menu opens', 6)


def menu_cmd(p, cmd):
    """Walk the command list with direction presses to `cmd`."""
    ids = p.js("LQ_ENGINE.scene.commands.items.map(i => i.id)")
    want = ids.index(cmd)
    cols = p.js("LQ_ENGINE.scene.commands.columns")
    rows = p.js("LQ_ENGINE.scene.commands.rows")
    for _ in range(16):
        i = p.js("LQ_ENGINE.scene.commands.index")
        if i == want:
            return True
        if cols > 1 and i // rows != want // rows:
            p.act('right')
        else:
            p.act('down' if want > i else 'up')
        if p.js("LQ_ENGINE.scene.commands.index") == i:
            p.check(False, f'a direction moves the menu cursor toward {cmd}', i)
            return False
    return False


def mode(p):
    return p.js("LQ_ENGINE.scene.mode")


def back_to_commands(p):
    for _ in range(6):
        if p.scene() == 'menu' and mode(p) == 'commands':
            return True
        p.act('cancel')
        p.frames(3)
    return p.scene() == 'menu' and mode(p) == 'commands'


def open_close(p):
    field(p)
    p.check(free(p), 'the field is free', p.lite()['scenes'])
    for how in ('cancel', 'menu', 'cancel'):
        open_menu(p)
        p.shot('menu-open')
        p.act(how)
        p.until("LQ_DEBUG.scene() === 'field'", f'{how} closes the menu', 6)


def every_row(p):
    field(p)
    open_menu(p)
    d = p.js("(() => { const m = LQ_ENGINE.scene, c = m.commands; return { items: c.items.map(i => i.id), rects: c.items.map((_, i) => c.rowRect(i)), dis: c.items.map(i => !!i.disabled) }; })()")
    for r, id_ in zip(d['rects'], d['items']):
        p.check(in_bounds(r), f'menu row {id_} on screen', r)
    for id_, dis in zip(d['items'], d['dis']):
        p.check(menu_cmd(p, id_), f'the cursor reaches {id_}')
        p.check(p.js("LQ_ENGINE.scene.commands.item.id") == id_, f'{id_} is highlighted')
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'field'", 'cancel closes the menu', 6)


def pick_member(p, i=0):
    """Commands that want a member: the picker, then a member."""
    p.frames(3)
    p.check(mode(p) == 'members', 'a member command opens the picker', mode(p))
    for _ in range(i):
        p.act('down')
    p.act('confirm')
    p.frames(3)
    p.check(mode(p) == 'screen', 'a member opens the page', mode(p))


def items_page(p):
    field(p)
    p.js("(() => { const m = LQ_ENGINE.game.party[0]; m.hp = 40; LQ_DEBUG.give('potion', 3); })()")
    open_menu(p)
    menu_cmd(p, 'items')
    p.act('confirm')
    p.frames(3)
    p.check(mode(p) == 'screen', 'Items opens', mode(p))
    p.shot('items')
    n0 = p.js("LQ_ENGINE.game.items.potion")
    hp0 = p.js("LQ_ENGINE.game.party[0].hp")
    p.act('confirm')
    p.frames(3)
    p.check(p.js("!!LQ_ENGINE.scene.screen.picker"), 'an item asks who', p.ss())
    p.shot('items-picker')
    p.act('confirm')
    p.frames(6)
    p.check(p.js("LQ_ENGINE.game.party[0].hp") > hp0, 'the item heals in the field', hp0)
    p.check(p.js("LQ_ENGINE.game.items.potion") == n0 - 1, 'the item count falls')
    p.act('cancel')
    p.frames(3)
    p.check(p.js("!LQ_ENGINE.scene.screen.picker"), 'cancel closes the picker')
    # Key Items: the second tab, with this device's own control
    if p.touch:
        hit = p.js("[LQ_ENGINE.scene.screen.tab]")[0]
        p.tap(340, 14)
        p.frames(3)
        p.check(p.js("LQ_ENGINE.scene.screen.tab") != hit, 'a tap on the tab strip turns to Key Items', p.js("LQ_ENGINE.scene.screen.tab"))
    else:
        p.act('pageR')
        p.check(p.js("LQ_ENGINE.scene.screen.tab") == 1, 'E turns to Key Items', p.js("LQ_ENGINE.scene.screen.tab"))
    p.shot('items-key')
    if p.js("LQ_ENGINE.scene.screen.tab") == 1:
        p.act('confirm')
        p.frames(3)
        p.check(p.scene() == 'menu', 'a key item reads, nothing else')
        if p.touch:
            p.tap(30, 14)
            p.frames(3)
            p.check(p.js("LQ_ENGINE.scene.screen.tab") == 0, 'a tap on the left of the strip turns back', p.js("LQ_ENGINE.scene.screen.tab"))
        else:
            p.act('pageL')
            p.check(p.js("LQ_ENGINE.scene.screen.tab") == 0, 'Q turns back')
    p.act('cancel')
    p.frames(3)
    p.check(mode(p) == 'commands', 'cancel leaves Items', mode(p))
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'field'", 'the menu closes after Items', 6)


def skills_status(p):
    field(p)
    open_menu(p)
    for cmd in ('tech', 'magic', 'status'):
        menu_cmd(p, cmd)
        p.act('confirm')
        pick_member(p, 1 if cmd == 'magic' else 0)
        p.shot(f'page-{cmd}')
        if cmd == 'status':
            i0 = p.js("LQ_ENGINE.scene.memberIndex")
            p.act('right')
            p.frames(3)
            p.check(p.js("LQ_ENGINE.scene.memberIndex") != i0, 'Right turns to the next member', p.js("LQ_ENGINE.scene.memberIndex"))
            p.act('left')
        p.act('cancel')
        p.frames(3)
        ok = back_to_commands(p)
        p.check(ok, f'{cmd} backs out to the commands', mode(p))


def equip_piece(p):
    field(p)
    uid = p.js("LQ_DEBUG.give('longsword', 1)")
    open_menu(p)
    menu_cmd(p, 'equip')
    p.act('confirm')
    pick_member(p, 0)
    p.shot('equip')
    st = p.js("LQ_ENGINE.scene.screen.debugState()")
    p.check(st['focus'] == 'slots', 'Equip opens on the slots', st)
    worn0 = p.js("LQ_ENGINE.game.party[0].equip.sword")
    p.check(p.js("LQ_ENGINE.scene.screen.slots.item.key") == 'sword', 'the sword slot is first', st)
    p.act('confirm')
    p.frames(3)
    p.check(p.js("LQ_ENGINE.scene.screen.focus") == 'cands', 'a slot opens its candidates', p.js("LQ_ENGINE.scene.screen.focus"))
    cands = p.js("LQ_ENGINE.scene.screen.cands.items.map(c => ({ id: c.id, label: c.label, uid: c.uid }))")
    p.shot('equip-cands')
    i = next((k for k, c in enumerate(cands) if c.get('uid') == uid), None)
    if p.check(i is not None, 'the new sword is a candidate', cands):
        for _ in range(i):
            p.act('down')
        p.act('confirm')
        p.frames(3)
        p.check(p.js("LQ_ENGINE.scene.screen.focus") == 'slots', 'equipping returns to the slots', p.js("LQ_ENGINE.scene.screen.focus"))
        p.check(p.js("LQ_ENGINE.game.party[0].equip.sword") != worn0, 'the sword changed', p.js("LQ_ENGINE.game.party[0].equip.sword"))
        p.shot('equip-done')
    # Optimize and Remove All are at the bottom of a scrolled list
    n = p.js("LQ_ENGINE.scene.screen.slots.items.length")
    for _ in range(n):
        if p.js("LQ_ENGINE.scene.screen.slots.item.id") == 'optimize':
            break
        p.act('down')
    p.check(p.js("(() => { const s = LQ_ENGINE.scene.screen.slots; return s.item.id === 'optimize' && s.isVisible(s.index); })()"), 'Optimize is reachable and visible')
    p.shot('equip-optimize')
    p.act('confirm')
    p.frames(3)
    p.check(p.js("!!LQ_ENGINE.scene.screen.note"), 'Optimize answers', p.ss())
    if not p.touch:
        p.act('pageR')
        p.check(p.js("LQ_ENGINE.scene.screen.member.id") == 'mira', 'E turns to the next member', p.js("LQ_ENGINE.scene.screen.member.id"))
    p.act('cancel')
    p.frames(3)
    p.check(mode(p) in ('members', 'commands'), 'cancel leaves Equip', mode(p))
    p.check(back_to_commands(p), 'Equip backs out to the commands', mode(p))


def journal_page(p):
    field(p)
    open_menu(p)
    menu_cmd(p, 'journal')
    p.act('confirm')
    p.frames(3)
    p.check(mode(p) == 'screen', 'Journal opens', mode(p))
    p.shot('journal-quests')
    for want, name in ((1, 'bestiary'), (2, 'ledger'), (0, 'quests')):
        if p.touch:
            p.tap(340, 14)
        else:
            p.act('pageR')
        p.frames(3)
        p.check(p.js("LQ_ENGINE.scene.screen.tab") == want, f'the {name} tab turns', p.js("LQ_ENGINE.scene.screen.tab"))
        p.shot(f'journal-{name}')
        if want == 2:
            i0 = p.js("LQ_ENGINE.scene.screen.names.index")
            p.act('down')
            p.check(p.js("LQ_ENGINE.scene.screen.names.index") != i0, 'down walks the Ledger', i0)
        if want == 1:
            p.act('down')
            p.check(p.js("LQ_ENGINE.scene.screen.beasts.index") == 1, 'down walks the Bestiary')
    # cancel out of each tab
    for tab in (1, 2, 0):
        if p.touch:
            p.tap(340, 14) if tab else p.tap(30, 14)
        else:
            p.act('pageR') if tab else p.act('pageL')
        p.frames(3)
        if tab == 1:
            p.act('cancel')
            p.frames(3)
            p.check(mode(p) == 'commands', 'cancel leaves the Journal from the Bestiary', mode(p))
            p.act('confirm')
            p.frames(3)
            p.check(mode(p) == 'screen', 'Journal reopens', mode(p))
            break
    p.act('cancel')
    p.frames(3)
    p.check(mode(p) == 'commands', 'cancel leaves the Journal', mode(p))


def config_page(p):
    field(p)
    open_menu(p)
    menu_cmd(p, 'config')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'config'", 'Config opens', 5)
    p.shot('config')
    n = p.js("LQ_ENGINE.scene.list.items.length")
    # every row by down, both ends
    seen = []
    for i in range(n):
        st = p.ss()
        seen.append(st['key'])
        vis = p.js("(() => { const l = LQ_ENGINE.scene.list; return l.isVisible(l.index) && l.rowRect(l.index).y + l.rowH <= 186; })()")
        p.check(vis, f'config row {st["key"]} visible when selected', st)
        if st['key'] == 'textSpeed':
            v0 = st['value']
            p.act('left')
            p.check(p.ss()['value'] != v0, 'Left changes a choice', p.ss()['value'])
            p.act('right')
            p.check(p.ss()['value'] == v0, 'Right changes it back', p.ss()['value'])
        if st['key'] == 'master':
            v0 = st['value']
            p.act('left')
            p.check(p.ss()['value'] < v0, 'Left lowers a slider', p.ss()['value'])
            p.act('right')
        p.act('down')
    p.check(len(set(seen)) == n, 'every config row was reached', seen)
    p.check(p.ss()['index'] == 0, 'down from the last row wraps to the top', p.ss()['index'])
    p.act('up')
    p.check(p.ss()['key'] == 'reset', 'up from the top wraps to Reset', p.ss()['key'])
    p.shot('config-bottom')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'choice'", 'Reset asks', 5)
    p.frames(8)   # the box takes no press during its 5-frame opening (ui/choice.js)
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'config'", 'Reset cancel', 5)
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'menu'", 'Config closes', 5)
    p.frames(3)
    p.check(mode(p) == 'commands', 'Config returns to the commands', mode(p))


def talk_page(p):
    field(p)
    open_menu(p)
    menu_cmd(p, 'talk')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'dialog'", 'Talk opens a dialog', 6)
    p.shot('talk')
    for _ in range(30):
        if p.scene() != 'dialog':
            break
        p.act('confirm')
        p.frames(2)
    p.until("LQ_DEBUG.scene() === 'menu' && LQ_ENGINE.scene.mode === 'commands'", 'Talk returns to the commands', 6)


def save_load(p):
    field(p)
    open_menu(p)
    menu_cmd(p, 'save')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'loadGame'", 'Save opens', 5)
    p.shot('save')
    st = p.ss()
    p.check(st['mode'] == 'save', 'the Save screen', st)
    # three records, Up / Down walk them
    i0 = st['index']
    p.act('down')
    p.check(p.ss()['index'] != i0, 'down walks the records', p.ss()['index'])
    p.act('up')
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'menu'", 'cancel leaves Save', 5)
    p.frames(3)
    p.check(mode(p) == 'commands', 'Save returns to the commands', mode(p))
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'loadGame'", 'Save opens again', 5)
    p.act('down')
    p.act('confirm')
    p.frames(6)
    if p.scene() == 'choice':
        p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'menu' && LQ_ENGINE.scene.mode === 'commands'", 'the save writes and returns', 8)
    slot = p.js("LQ_ENGINE.save.list(true).filter(s => s.exists).map(s => s.slot)")
    p.check(2 in slot, 'record 2 holds the save', slot)
    # Overwrite asks
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'loadGame'", 'Save opens a third time', 5)
    while p.ss()['index'] != next(i for i, s in enumerate(p.ss()['slots']) if s['slot'] == 2):
        p.act('down')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'choice'", 'overwriting asks', 5)
    p.frames(8)
    p.shot('save-overwrite')
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'loadGame' && !LQ_ENGINE.scene.busy", 'Keep it returns to the records', 5)
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'menu'", 'back to the menu', 5)
    p.frames(3)
    # Quit to the title and Continue
    menu_cmd(p, 'quit')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'choice'", 'Quit asks', 5)
    p.frames(8)
    p.shot('quit-choice')
    p.act('cancel')
    p.until("LQ_DEBUG.scene() === 'menu' && LQ_ENGINE.scene.mode === 'commands'", 'Stay returns', 5)
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'choice'", 'Quit asks again', 5)
    p.frames(8)
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'title' && !LQ_ENGINE.transition", 'the title', 8)
    p.frames(20)
    items = p.js("LQ_ENGINE.scene.menu.items.map(i => i.id)")
    p.check('continue' in items, 'Continue is on the title', items)
    for _ in range(8):
        if p.js("LQ_ENGINE.scene.menu.item.id") == 'continue':
            break
        p.act('down')
    p.shot('title-continue')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'loadGame'", 'Load opens', 5)
    p.shot('load')
    st = p.ss()
    p.check(st['mode'] == 'load', 'the Load screen', st)
    for _ in range(6):
        cur = p.ss()
        if cur['slots'][cur['index']]['slot'] == 2:
            break
        p.act('down')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition", 'the save loads into the field', 12)
    p.frames(20)
    settle(p)
    p.check(p.js("LQ_ENGINE.game.map") == 'ep4_flood_road', 'the save comes back on its map', p.js("LQ_ENGINE.game.map"))
    p.check(free(p), 'the field is free after a load', p.lite()['scenes'])


SEQUENCES = [('open and close', open_close), ('every row', every_row), ('items', items_page), ('tech magic status', skills_status), ('equip', equip_piece),
             ('journal', journal_page), ('config', config_page), ('talk', talk_page), ('save and load', save_load)]
TOUCH_ONLY = []
