"""The title by real input: the tap gate, the Episode 4 row (inside the New party... list once two or more quick starts
fold into it, #88), ?ep=4, name entry, into the field."""
from driver import in_bounds
from menus import free, settle

SAVE = """async ([slots]) => {
  LQ_PACKS.forcePack('ep4'); await LQ_PACKS.ensurePack('ep4');
  const { serialize, saveMeta } = await import(new URL('src/game/state.js', LQ_ENGINE.assets.base || location.href).href);
  const keep = LQ_ENGINE.game;
  for (const n of slots) {
    LQ_DEBUG.newGameEp4('Arden', { slot: n, scene: 'none' });
    const g = LQ_ENGINE.game;
    LQ_ENGINE.save.save(n, serialize(g), saveMeta(g));
  }
  LQ_ENGINE.game = keep;
  LQ_DEBUG.settings({ rotateHintSeen: true, textSpeed: 4 });
}"""
TITLE_READY = "LQ_DEBUG.scene() === 'title' && !LQ_ENGINE.transition && !!LQ_ENGINE.scene.menu"
ROW_UP = "LQ_DEBUG.scene() === 'title' && LQ_ENGINE.scene.quickStarts().includes('ep4')"
QUICK_OPEN = "LQ_DEBUG.scene() === 'title' && !!LQ_ENGINE.scene.mainMenu && !LQ_ENGINE.scene.busy"


def menu_state(p):
    return p.js("(() => { const s = LQ_ENGINE.scene, m = s.menu; return { items: m.items.map(i => i.id), index: m.index, win: s.win, rows: m.rows, cols: m.columns, rects: m.items.map((_, i) => m.rowRect(i)) }; })()")


def walk(p, row):
    """Walk the menu the title shows now to `row` with direction presses (column major in two columns)."""
    st = menu_state(p)
    want = st['items'].index(row)
    for _ in range(16):
        st = menu_state(p)
        i = st['index']
        if i == want:
            return True
        if st['cols'] > 1 and i // st['rows'] != want // st['rows']:
            p.act('right')
        else:
            p.act('down' if want > i else 'up')
    return menu_state(p)['index'] == want


def to_row(p, row):
    """`row` on the title: walk to it, or to New party... first, open the list with a real confirm, and walk there."""
    if row in menu_state(p)['items']:
        return walk(p, row)
    p.check(walk(p, 'party'), 'the cursor reaches New party...', menu_state(p))
    p.act('confirm')
    p.until(QUICK_OPEN, 'the New party... list opens', 6)
    p.frames(3)
    return walk(p, row)


def seeded_title(p, slots, query='&pack=ep4'):
    p.boot(query)
    p.js(SAVE, [slots])
    p.boot(query, keep=True)
    p.until(TITLE_READY, 'the title', 10)
    p.until(ROW_UP, 'the Episode 4 row appears', 10)
    p.frames(10)


def rows_on_screen(p, label):
    st = menu_state(p)
    p.check(in_bounds(st['win']), f'{label}: the title window on screen', st['win'])
    for r, i in zip(st['rects'], st['items']):
        p.check(in_bounds(r), f'{label}: title row {i} on screen', r)
        p.check(r['x'] >= st['win']['x'] and r['x'] + r['w'] <= st['win']['x'] + st['win']['w'] and r['y'] + r['h'] <= st['win']['y'] + st['win']['h'], f'{label}: title row {i} inside its window', (r, st['win']))
    return st


def name_entry_done(p, slot_label):
    p.until("LQ_DEBUG.scene() === 'nameEntryEp4' && !LQ_ENGINE.transition", f'name entry {slot_label}', 8)
    p.frames(6)
    p.shot('name-entry')
    if p.touch:
        # the check mark on the grid: walk there with real presses
        rect = p.js("(() => { const s = LQ_ENGINE.scene, g = s.grid, i = g.items.findIndex(x => x.id === '✓'); return g.rowRect(i); })()")
        p.check(in_bounds(rect), 'the done glyph on screen', rect)
        p.tap_rect(rect)
    else:
        p.page.keyboard.press('Enter', delay=30)
    p.until("LQ_DEBUG.scene() !== 'nameEntryEp4'", 'name entry ends', 8)
    p.until("LQ_DEBUG.scene() === 'field' || LQ_DEBUG.scene() === 'dialog'", 'the field after name entry', 15)
    p.frames(30)
    settle(p, 40)
    p.check(p.js("LQ_ENGINE.game && LQ_ENGINE.game.flags.ep4_started === true"), 'the Episode 4 morning ran', p.lite()['scenes'])


def row_slot0_free(p):
    """A finished record in Record 1: the row starts at once in the autosave slot."""
    seeded_title(p, [1])
    st = rows_on_screen(p, 'row')
    p.shot('title-rows')
    p.check(to_row(p, 'ep4'), 'the cursor reaches the Episode 4 row', st)
    p.frames(3)
    p.shot('title-ep4')
    p.act('confirm')
    name_entry_done(p, 'after the row')
    p.check(p.js("LQ_ENGINE.game.autosaveSlot") == 0, 'the run takes the free autosave slot', p.js("LQ_ENGINE.game.autosaveSlot"))


def row_notice(p):
    """The autosave taken: Back is the default, Start picks the next record."""
    seeded_title(p, [0, 1])
    to_row(p, 'ep4')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'ep4Ask'", 'the notice', 6)
    p.frames(4)
    p.shot('title-notice')
    p.act('cancel')
    p.until(TITLE_READY + " && !LQ_ENGINE.scene.busy", 'cancel returns to the title', 6)
    p.frames(3)
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'ep4Ask'", 'the notice again', 6)
    p.frames(14)    # the box opens first
    p.act('confirm')
    p.until(TITLE_READY + " && !LQ_ENGINE.scene.busy", 'Back returns to the title', 6)
    p.frames(3)
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'ep4Ask'", 'a third time', 6)
    p.frames(14)    # the box opens first
    p.act('down')
    p.check(p.ss().get('index') == 1, 'down reaches Start', p.ss())
    p.act('confirm')
    name_entry_done(p, 'after Start')
    p.check(p.js("LQ_ENGINE.game.autosaveSlot") == 2, 'the run takes the next free record', p.js("LQ_ENGINE.game.autosaveSlot"))


def row_refused(p):
    seeded_title(p, [0, 1, 2, 3])
    to_row(p, 'ep4')
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'ep4Ask'", 'the refusal', 6)
    p.frames(4)
    p.shot('title-refusal')
    p.check(p.ss().get('options') == ['back'], 'only Back', p.ss())
    p.act('confirm')
    p.until(TITLE_READY + " && !LQ_ENGINE.scene.busy", 'Back returns to the title', 6)
    p.frames(3)
    p.check(menu_state(p)['items'][menu_state(p)['index']] == 'ep4', 'the cursor stays on the row')


def quick_start_url(p):
    """?ep=4 with no save at all."""
    p.boot('&ep=4')
    p.js("LQ_DEBUG.settings({ rotateHintSeen: true, textSpeed: 4 })")
    p.until(TITLE_READY, 'the title', 10)
    p.until(ROW_UP, 'the Episode 4 row under ?ep=4', 12)
    p.frames(6)
    rows_on_screen(p, 'ep=4')
    p.shot('title-url')
    p.check(to_row(p, 'ep4'), 'the cursor reaches the row')
    p.act('confirm')
    name_entry_done(p, 'under ?ep=4')


def rotate_card(p):
    """Portrait: the turn-the-phone card takes one touch and nothing else."""
    if p.device != 'portrait':
        return
    p.boot('')
    p.until(TITLE_READY, 'the title', 10)
    p.frames(10)
    p.check(p.js("!!LQ_ENGINE.scene.rotateShown"), 'the card is up', p.js("LQ_ENGINE.scene.rotateShown"))
    p.shot('rotate-card')
    p.act('confirm')
    p.frames(4)
    p.check(p.js("!LQ_ENGINE.scene.rotateShown"), 'one press clears the card')
    p.check(p.scene() == 'title', 'the press does not reach the menu', p.scene())


def tap_rows(p):
    """Phone: a tap selects, a tap on the selected row confirms; New party... opens its list, a tap outside closes it."""
    seeded_title(p, [1])
    st = rows_on_screen(p, 'tap')
    if 'ep4' not in st['items']:
        j = st['items'].index('party')
        p.tap_rect(st['rects'][j])
        p.frames(3)
        p.check(menu_state(p)['index'] == j, 'a tap selects New party...', menu_state(p)['index'])
        p.tap_rect(st['rects'][j])
        p.until(QUICK_OPEN, 'a second tap opens the list', 6)
        p.frames(3)
        st = rows_on_screen(p, 'quick list')
        p.shot('title-quick-list')
        # a tap well clear of the list closes it, and the cursor is back on the row
        p.tap_rect({'x': 4, 'y': 4, 'w': 20, 'h': 12})
        p.frames(4)
        p.check(not p.js("!!LQ_ENGINE.scene.mainMenu") and menu_state(p)['items'][menu_state(p)['index']] == 'party', 'a tap outside closes the list', menu_state(p))
        p.tap_rect(rows_on_screen(p, 'tap')['rects'][j])
        p.until(QUICK_OPEN, 'one tap on the highlighted row opens it again', 6)
        p.frames(3)
        st = rows_on_screen(p, 'quick list')
    i = st['items'].index('ep4')
    p.tap_rect(st['rects'][i])
    p.frames(3)
    p.check(menu_state(p)['index'] == i, 'a tap selects the Episode 4 row', menu_state(p)['index'])
    p.tap_rect(st['rects'][i])
    name_entry_done(p, 'after two taps')


def tap_gate(p):
    """The real boot of a player: no debug, the tap gate, then the title."""
    page = p.ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(f'http://127.0.0.1:{p.server.server_port}/next/index.html?seed=7', wait_until='load')
    page.wait_for_function('window.LQ_ENGINE && LQ_ENGINE.assets && LQ_ENGINE.loaded !== undefined', timeout=30000)
    page.wait_for_function("document.title !== undefined && (LQ_ENGINE.gateOpen || LQ_ENGINE.waitingGate || LQ_ENGINE.loaded)", timeout=30000)
    page.wait_for_timeout(1500)
    before = page.evaluate("(LQ_ENGINE.stack || []).map(s => s.name)")
    if p.touch:
        x, y = p.dev['width'] / 2, p.dev['height'] / 2
        page.touchscreen.tap(x, y)
    else:
        page.keyboard.press('KeyZ', delay=40)
    try:
        page.wait_for_function("(LQ_ENGINE.stack || []).some(s => s.name === 'title')", timeout=20000)
        ok = True
    except Exception:  # noqa: BLE001
        ok = False
    p.check(ok, 'one press passes the tap gate to the title', before)
    p.check(not errs, 'the real boot ran clean', errs[:3])
    page.close()


SEQUENCES = [('tap gate', tap_gate), ('row with slot 0 free', row_slot0_free), ('row notice', row_notice), ('row refused', row_refused), ('quick start url', quick_start_url), ('rotate card', rotate_card)]
TOUCH_ONLY = [('tap rows', tap_rows)]
