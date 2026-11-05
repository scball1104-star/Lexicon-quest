"""Battle menu by real input: every root command, every sub-menu, targets, Answer against a Decree, an Item, Auto, Flee."""
from driver import in_bounds, overlap

NEW_GAME = """async () => {
  LQ_PACKS.forcePack('ep4'); await LQ_PACKS.ensurePack('ep4');
  LQ_DEBUG.newGameEp4('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game; g.flags.hero_signed = true;
  for (const m of g.party) { m.level = Math.max(m.level, 19); }
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 2, textSpeed: 4, battleCursor: 'last' });
}"""
MENU_GONE = "(() => { const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.menu.state === 'closed' || s.phase !== 'play'; })()"
OPS_DONE = "(() => { const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.opIndex >= s.ops.length; })()"


def start(p, enc, seed=3, can_flee=None):
    """A fight as the start point (set up, not a tested action)."""
    p.js(NEW_GAME)
    p.js("([e, s, f]) => LQ_DEBUG.battle(e, { seed: s, canFlee: f, gameover: false })", [enc, seed, can_flee])


def wait_turn(p, who=None, timeout=25):
    cond = ("(() => { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return true; const d = s.debugState(); "
            "return !['play', 'intro', 'enter'].includes(s.phase) || (d.menu === 'root'" + (f" && d.current === '{who}'" if who else '') + "); })()")
    p.until(cond, f'a command menu for {who or "anyone"}', timeout)
    return p.battle()


def over(p):
    d = p.battle()
    return not d or d.get('phase') not in ('play', 'intro', 'enter')


def grid(d, i):
    rows = d['menuRows']
    return i % rows, i // rows


def cursor_to(p, cmd):
    """Move the root cursor to `cmd` with direction presses, checking each press moves it where the grid says."""
    d = p.battle()
    want = d['menuItems'].index(cmd)
    for _ in range(14):
        d = p.battle()
        i = d['menuIndex']
        if i == want:
            return True
        r, c = grid(d, i)
        wr, wc = grid(d, want)
        press = 'right' if c != wc else ('down' if wr > r else 'up')
        p.act(press)
        n = p.battle()
        if not p.check(n.get('menuIndex') != i, f'{press} moves the root cursor', f'from {d["menuItems"][i]} stayed {n.get("menuIndex")}'):
            return False
    return False


def menu_state(p):
    return p.battle().get('menu')


def expect_menu(p, want, label):
    p.frames(3)
    got = menu_state(p)
    return p.check(got == want, label, f'menu is {got}, want {want}')


def defend(p):
    """Spend a turn with real input: cancel jumps to Defend, confirm takes it; the battle must move on."""
    d = wait_turn(p)
    if over(p):
        return
    who, turns = d['current'], d['partyTurns']
    p.act('cancel')
    p.act('confirm')
    p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.b.state.partyTurns > {turns}; }})()", f'{who} Defend takes the turn', 8)


def to_member(p, who, tries=14):
    for _ in range(tries):
        d = wait_turn(p)
        if over(p):
            return False
        if d.get('current') == who:
            return True
        defend(p)
    return False


def attack_once(p, target=None):
    cursor_to(p, 'attack')
    p.act('confirm')
    expect_menu(p, 'target', 'Attack opens targeting')
    if target:
        p.check(select_target(p, target), 'Attack can reach its target', target)
    p.act('confirm')
    p.until(MENU_GONE, 'Attack leaves the menu', 8)


def select_target(p, uid):
    for d in ('right', 'left', 'up', 'down', 'right', 'left', 'down', 'up'):
        if p.battle().get('target') == uid:
            return True
        p.act(d)
    return p.battle().get('target') == uid


def tech(p, skill, target_uid=None):
    """Tech > skill > target by real input, from the root; False when any step did not open."""
    cursor_to(p, 'tech')
    p.act('confirm')
    if not expect_menu(p, 'sub', 'Tech opens'):
        return False
    ids = p.js("LQ_ENGINE.scene.menu.sub.items.map(i => i.id)")
    if not p.check(skill in ids, f'{skill} is listed', ids):
        p.act('cancel')
        return False
    for _ in range(ids.index(skill)):
        p.act('down')
    p.act('confirm')
    if not expect_menu(p, 'target', f'{skill} opens targeting'):
        return False
    if target_uid:
        p.check(select_target(p, target_uid), f'{skill} can reach its target', target_uid)
    p.act('confirm')
    p.until(MENU_GONE, f'{skill} confirm closes the menu', 6)
    return True


# ------------------------------------------------------------------------------------- sequences (each one a real-input path)
def root_grid(p):
    """Every cell of the root by direction presses; a greyed row buzzes and stays."""
    d = wait_turn(p, timeout=30)
    p.check(d.get('menu') == 'root', 'the root menu opens by itself', d)
    items = d['menuItems']
    p.check(in_bounds(d['cmdRect']), 'command window on screen', d['cmdRect'])
    for r in d['rootRects']:
        p.check(in_bounds(r), 'root row on screen', r)
    p.shot('root')
    seen = {d['menuIndex']}
    for cmd in items:
        if cmd:
            p.check(cursor_to(p, cmd), f'cursor reaches {cmd}')
            seen.add(p.battle()['menuIndex'])
    p.check(len(seen) >= len([c for c in items if c]), 'every root cell was reached', seen)
    cursor_to(p, 'attack')
    p.act('up')
    n = p.battle()
    r, c = grid(n, n['menuIndex'])
    p.check(c == 0 and r > 0, 'up from Attack wraps to the column bottom', n['menuIndex'])
    p.act('cancel')
    n = p.battle()
    p.check(n['menuItems'][n['menuIndex']] == 'defend', 'cancel on the root goes to Defend', n['menuItems'][n['menuIndex']])
    p.check(n['menu'] == 'root', 'cancel leaves the root open')


def attack_paths(p):
    wait_turn(p)
    cursor_to(p, 'attack')
    p.act('confirm')
    expect_menu(p, 'target', 'Attack opens targeting')
    t0 = p.battle()['target']
    p.check(bool(t0), 'a target is highlighted', t0)
    p.act('right')
    t1 = p.battle()['target']
    p.check(t1 != t0, 'right changes the target', (t0, t1))
    p.act('left')
    p.check(p.battle()['target'] == t0, 'left goes back', p.battle()['target'])
    p.act('cancel')
    expect_menu(p, 'root', 'cancel from Attack targeting returns to the root')
    p.act('confirm')
    expect_menu(p, 'target', 'Attack targeting opens again')
    who = p.battle()['current']
    p.act('confirm')
    p.until(MENU_GONE, 'Attack confirm closes the menu', 6)
    p.check(any(a.startswith(f'{who}:attack') for a in p.battle().get('actions', [])), 'the attack was performed', p.battle().get('actions'))


def sub_paths(p, member, cmd):
    """Open a sub-list, walk it, cancel it, open it, go to target and back, confirm."""
    if not p.check(to_member(p, member), f'{member} gets a turn for {cmd}'):
        return
    d = p.battle()
    if not p.check(cmd in d['menuItems'], f'{cmd} is on {member} root', d['menuItems']):
        return
    cursor_to(p, cmd)
    p.act('confirm')
    expect_menu(p, 'sub', f'{cmd} opens its list')
    p.shot(f'{member}-{cmd}-sub')
    sub = p.js("(() => { const m = LQ_ENGINE.scene.menu; return { n: m.sub.items.length, rows: m.sub.rows, w: m.subRect, ids: m.sub.items.map(i => i.id), dis: m.sub.items.map(i => !!i.disabled) }; })()")
    p.check(in_bounds(sub['w']), f'{cmd} list window on screen', sub['w'])
    if sub['n'] > 1:
        p.act('down')
        i = p.js('LQ_ENGINE.scene.menu.sub.index')
        p.check(i == 1, f'down moves the {cmd} list', i)
        p.act('up')
    if sub['n'] > sub['rows']:
        # the last row by real presses, with the list scrolled to it
        for _ in range(sub['n'] - 1):
            p.act('down')
        last = p.js("(() => { const m = LQ_ENGINE.scene.menu.sub; return { i: m.index, vis: m.isVisible(m.index) }; })()")
        p.check(last['i'] == sub['n'] - 1 and last['vis'], f'the last {cmd} row is reachable and visible', last)
        p.shot(f'{member}-{cmd}-bottom')
        for _ in range(sub['n'] - 1):
            p.act('up')
    p.act('cancel')
    expect_menu(p, 'root', f'cancel closes the {cmd} list')
    p.check(p.battle()['menuItems'][p.battle()['menuIndex']] == cmd, f'the root cursor stays on {cmd}', p.battle()['menuIndex'])
    p.act('confirm')
    expect_menu(p, 'sub', f'{cmd} opens again')
    pick = next((i for i, x in enumerate(sub['dis']) if not x), None)
    if pick is None:
        p.act('cancel')
        return
    for _ in range(pick):
        p.act('down')
    p.act('confirm')
    p.frames(3)
    if menu_state(p) == 'target':
        p.act('cancel')
        expect_menu(p, 'sub', f'cancel from {cmd} targeting returns to the list')
        p.act('confirm')
        expect_menu(p, 'target', f'{cmd} targeting opens again')
        p.act('confirm')
    p.until(MENU_GONE, f'{cmd} confirm closes the menu', 6)
    wait_turn(p)
    p.check(p.js('LQ_DEBUG.errors().length') == 0, f'{cmd} ran clean')


def item_use(p):
    start(p, 'e4r_first', 5, True)
    wait_turn(p, timeout=30)
    if not p.check(to_member(p, 'hero'), 'hero gets a turn'):
        return
    p.js("LQ_ENGINE.scene.b.unit('hero').hp = 30")
    cursor_to(p, 'item')
    p.act('confirm')
    expect_menu(p, 'sub', 'Item opens the bag')
    p.shot('item-sub')
    sub = p.js("LQ_ENGINE.scene.menu.sub.items.map(i => ({ id: i.id, dis: !!i.disabled, right: i.right }))")
    i = next((k for k, x in enumerate(sub) if x['id'] in ('potion', 'hi_potion')), None)
    if not p.check(i is not None, 'a healing item in the bag', sub):
        p.act('cancel')
        return
    item = sub[i]['id']
    for _ in range(i):
        p.act('down')
    p.act('confirm')
    expect_menu(p, 'target', 'an item opens targeting')
    p.check(bool(p.battle()['target']), 'an ally is the default target', p.battle()['target'])
    p.shot('item-target')
    hp0 = p.js("LQ_ENGINE.scene.b.unit('hero').hp")
    p.act('confirm')
    p.until("LQ_ENGINE.scene.menu.state === 'closed'", 'Item confirm closes the menu', 6)
    p.until(OPS_DONE, 'the item plays out', 10)
    hp1 = p.js("LQ_ENGINE.scene.b.unit('hero').hp")
    p.check(hp1 > hp0, f'{item} heals', (hp0, hp1))
    used = p.js("LQ_ENGINE.scene.b.state.itemsUsed")
    p.check(used.get(item) == 1, f'{item} is spent', used)


def swap_path(p):
    start(p, 'e4r_first', 6, True)
    wait_turn(p, timeout=30)
    for who in ('hero', 'mira', 'bram'):
        if not to_member(p, who):
            continue
        d = p.battle()
        if 'swap' not in d['menuItems']:
            continue
        w0 = p.js(f"LQ_ENGINE.scene.b.unit('{who}').weapon")
        turns = d['partyTurns']
        cursor_to(p, 'swap')
        p.act('confirm')
        p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.b.state.partyTurns > {turns}; }})()", f'{who} Swap takes the turn', 6)
        wait_turn(p)
        w1 = p.js(f"LQ_ENGINE.scene.b.unit('{who}').weapon")
        p.check(w0 != w1, f'{who} Swap changes the weapon', (w0, w1))
        return
    p.check(False, 'no member had Swap')


def flee_tries(p, one):
    for _ in range(12):
        wait_turn(p)
        if over(p):
            break
        one(p.battle())
        p.until(MENU_GONE, 'Flee closes the menu', 6)
        p.until(OPS_DONE, 'Flee resolves', 15)
    p.until("LQ_DEBUG.scene() !== 'battle'", 'Flee leaves the fight', 15)
    p.check(p.js("LQ_DEBUG.battleResult()") == 'flee', 'the fight ends in flee', p.js("LQ_DEBUG.battleResult()"))


def flee_path(p):
    start(p, 'e4r_hounds', 4, True)
    d = wait_turn(p, timeout=30)
    if p.touch:
        p.check(bool(d.get('helpBtns')), 'FLEE, AUTO, x2 are in the help window', d.get('helpBtns'))

        def one(d):
            b = d['helpBtns']['flee']
            p.tap_rect(b)
            p.check(p.battle()['fleeArmed'] > 0, 'the first FLEE tap arms it', p.battle()['fleeArmed'])
            p.tap_rect(b)
    else:
        p.check('flee' in d['menuItems'], 'Flee is on the root', d['menuItems'])

        def one(d):
            cursor_to(p, 'flee')
            p.act('confirm')
    flee_tries(p, one)


def flee_refused(p):
    start(p, 'barrister', 4, False)
    d = wait_turn(p, timeout=40)
    if p.touch:
        b = d['helpBtns']['flee']
        p.tap_rect(b)
        p.frames(3)
        p.check(p.battle().get('menu') == 'root', 'a greyed FLEE leaves the root open')
        p.check(bool(p.js("LQ_ENGINE.scene.menu.helpText")), 'a greyed FLEE says why', p.js("LQ_ENGINE.scene.menu.helpText"))
        return
    cmds = p.js("LQ_ENGINE.scene.menu.root.items.map(i => ({ id: i.id, dis: !!i.disabled }))")
    fl = next((c for c in cmds if c['id'] == 'flee'), None)
    if p.check(fl is not None and fl['dis'], 'Flee is greyed in a boss fight', fl):
        cursor_to(p, 'flee')
        p.act('confirm')
        p.frames(6)
        p.check(p.battle().get('menu') == 'root', 'a greyed Flee stays on the root', p.battle().get('menu'))
        h = p.js("LQ_ENGINE.scene.menu.helpText")
        p.check(bool(h), 'a greyed Flee says why', h)


def auto_toggle(p):
    if p.touch:
        p.tap_rect(p.battle()['helpBtns']['auto'])
    else:
        p.act('start')
    p.frames(3)


def speed_toggle(p):
    if p.touch:
        p.tap_rect(p.battle()['helpBtns']['speed'])
    else:
        p.act('pageR')
    p.frames(3)


def auto_path(p):
    """Auto on closes the menu and plays; off brings the menu back, with this device's own control."""
    start(p, 'e4r_first', 7, True)
    wait_turn(p, timeout=30)
    auto_toggle(p)
    d = p.battle()
    p.check(d.get('auto') is True, 'Auto turns on', d.get('auto'))
    p.frames(3)
    p.check(p.battle().get('menu') == 'closed', 'Auto closes the menu', p.battle().get('menu'))
    t0 = p.battle()['partyTurns']
    p.until(f"LQ_ENGINE.scene.name !== 'battle' || LQ_ENGINE.scene.b.state.partyTurns > {t0}", 'Auto plays a turn', 25)
    if over(p):
        return
    auto_toggle(p)
    p.check(p.battle().get('auto') is False, 'Auto turns off', p.battle().get('auto'))
    d = wait_turn(p)
    if over(p):
        return
    p.check(d.get('menu') == 'root', 'the menu comes back after Auto off', d.get('menu'))
    s0 = d['speed']
    speed_toggle(p)
    p.check(p.battle()['speed'] != s0, 'the speed toggles', p.battle()['speed'])
    speed_toggle(p)
    p.check(p.battle()['speed'] == s0, 'the speed toggles back', p.battle()['speed'])
    if not p.touch:
        # B on Auto's beat also stops it
        auto_toggle(p)
        p.page.keyboard.down('KeyX')
        p.until("!LQ_ENGINE.settings.autoBattle || LQ_ENGINE.scene.name !== 'battle' || LQ_ENGINE.scene.phase !== 'play'", 'X stops Auto', 15)
        p.page.keyboard.up('KeyX')
        d = wait_turn(p)
        p.check(over(p) or d.get('menu') == 'root', 'the menu is back after X stopped Auto', d.get('menu'))


def answer_decree(p):
    """Episode 4: a Decree announced on a foe, Answer by Tech voids it and Breaks the foe."""
    start(p, 'e4r_first', 3, False)
    wait_turn(p, timeout=30)
    bloom = "LQ_ENGINE.scene.b.units().find(u => u.alive && u.id === 'ink_bloom')"
    p.js(f"{bloom}.heat = 2")
    p.js("LQ_ENGINE.scene.b.unit('hero').mp = 60")
    ok = False
    for _ in range(14):
        d = wait_turn(p)
        if over(p):
            break
        if p.js("LQ_ENGINE.scene.telegraphs.size") and d.get('current') == 'hero':
            ok = True
            break
        p.js(f"(() => {{ const b = {bloom}; if (b) b.heat = 2; }})()")
        defend(p)
    if not p.check(ok, 'a Decree is up on the hero turn'):
        return
    p.shot('decree-root')
    uid = p.js(f"({bloom}).uid")
    if not tech(p, 'answer', uid):
        return
    p.until(f"LQ_ENGINE.scene.name !== 'battle' || (LQ_ENGINE.scene.b.unit('{uid}').heat === 0 && LQ_ENGINE.scene.opIndex >= LQ_ENGINE.scene.ops.length)", 'Answer voids the seals', 10)
    p.check(p.js(f"LQ_ENGINE.scene.b.unit('{uid}').charging") in (None, False), 'the decree is cancelled')
    p.check(p.js("LQ_ENGINE.scene.telegraphs.size") == 0, 'the telegraph is gone')
    p.check(p.js(f"LQ_ENGINE.scene.b.unit('{uid}').broken") is True, 'a pending decree answered Breaks the foe')
    p.shot('decree-voided')


def answer_strike(p):
    """The Regent's Strike from the Roll: the root opens on Tech, Answer floats first in gold under the cursor, a confirm answers it."""
    start(p, 'paper_regent', 5, False)
    wait_turn(p, timeout=40)
    R = "LQ_ENGINE.scene.b.units().find(u => u.alive && u.id === 'paper_regent')"
    heal = "for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party' && u.alive) { u.hp = u.maxHp; u.mp = Math.max(u.mp, 40); }"
    writs = "LQ_ENGINE.scene.b.units().filter(u => u.alive && /^writ_/.test(u.id)).map(u => u.uid)"
    strike_up = "[...LQ_ENGINE.scene.telegraphs.values()].some(t => t.skill === 'strike_roll')"
    p.js(f"(() => {{ const r = {R}; r.hp = Math.floor(r.maxHp * 0.705); }})()")
    for _ in range(50):
        d = wait_turn(p)
        if over(p):
            break
        p.js(heal)
        if p.js(strike_up) and d.get('current') == 'hero':
            break
        w = p.js(writs)
        phase = p.js(f"({R}).ai.phase || 0")
        if w:
            p.js(f"LQ_ENGINE.scene.b.unit('{w[0]}').hp = 1")
            attack_once(p, w[0])
        elif phase == 0:
            attack_once(p, p.js(f"({R}).uid"))
        else:
            p.js(f"(() => {{ const r = {R}; r.hp = r.maxHp; }})()")
            defend(p)
    d = p.battle()
    named = p.js(strike_up)
    if not p.check(named and d.get('current') == 'hero', 'Strike from the Roll is up on the hero turn', (named, d.get('current'))):
        return
    p.check(d['menuItems'][d['menuIndex']] == 'tech', 'the root opens on Tech', d['menuItems'][d['menuIndex']])
    p.shot('strike-root')
    p.act('confirm')
    expect_menu(p, 'sub', 'Tech opens')
    top = p.js("(() => { const m = LQ_ENGINE.scene.menu.sub, it = m.items[0]; return { id: it.id, color: it.color, dis: !!it.disabled, index: m.index }; })()")
    p.check(top['id'] == 'answer' and top['color'] == 'gold' and top['index'] == 0 and not top['dis'], 'Answer floats first, gold, enabled, under the cursor', top)
    p.shot('strike-answer-gold')
    p.act('confirm')
    expect_menu(p, 'target', 'Answer opens targeting')
    uid = p.js(f"({R}).uid")
    p.check(select_target(p, uid), 'Answer can target the Regent', uid)
    p.act('confirm')
    p.until(MENU_GONE, 'Answer confirm closes the menu', 6)
    p.until(OPS_DONE, 'Answer plays out', 12)
    p.check(p.js(f"LQ_ENGINE.scene.b.unit('{uid}').charging") in (None, False), 'the Strike is cancelled')
    p.check(p.js("LQ_ENGINE.scene.b.unit('hero').answerGuard !== undefined"), 'the hero is guarded')
    p.shot('strike-answered')


def fury_combo(p):
    """Fury and Combo: sub-lists that are usually greyed."""
    start(p, 'e4r_first', 9, False)
    wait_turn(p, timeout=30)
    # state for the rows; the turn's commands are read as the menu opens, so the rows light on the next turn
    p.js("for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.fury = 100; u.mp = 60; }")
    defend(p)
    d = wait_turn(p)
    p.js("for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.fury = 100; u.mp = 60; }")
    cmds = p.js("LQ_ENGINE.scene.menu.root.items.map(i => ({ id: i.id, dis: !!i.disabled }))")
    for cmd in ('fury', 'combo'):
        c = next((x for x in cmds if x['id'] == cmd), None)
        if not p.check(c is not None, f'{cmd} is on the root', cmds):
            continue
        cursor_to(p, cmd)
        p.act('confirm')
        if c['dis']:
            p.frames(3)
            p.check(menu_state(p) == 'root', f'a greyed {cmd} stays on the root', menu_state(p))
            continue
        expect_menu(p, 'sub', f'{cmd} opens its list')
        p.shot(f'{cmd}-sub')
        p.act('cancel')
        expect_menu(p, 'root', f'cancel closes {cmd}')


def touch_rows(p):
    """Phone: one tap on a root row; two taps on a list row; a tap on a foe; a tap on the command window cancels."""
    start(p, 'e4r_first', 3, True)
    d = wait_turn(p, timeout=30)
    v = p.js('LQ_DEBUG.view()')
    p.shot('touch-root')
    p.check(d.get('touch') is True, 'the touch layout is on', d.get('touch'))
    rects = d['rootRects']
    for r, cmd in zip(rects, d['menuItems']):
        if cmd:
            p.check(in_bounds(r), f'{cmd} row on the canvas', r)
    for name in ('dpad', 'a', 'b', 'menu', 'run'):
        box = p.control_box(name)
        if not box:
            continue
        g = {'x': (box['x'] - v['cssX']) / v['cssScale'], 'y': (box['y'] - v['cssY']) / v['cssScale'], 'w': box['width'] / v['cssScale'], 'h': box['height'] / v['cssScale']}
        for r, cmd in zip(rects, d['menuItems']):
            if cmd:
                p.check(not overlap(g, r), f'{name} control clear of {cmd}', (g, r))
    i = d['menuItems'].index('tech')
    p.tap_rect(rects[i])
    p.frames(4)
    expect_menu(p, 'sub', 'one tap on Tech opens its list')
    p.shot('touch-tech-sub')
    sub = p.js("(() => { const m = LQ_ENGINE.scene.menu; return { rects: m.sub.items.map((_, i) => m.sub.rowRect(i)), vis: m.sub.items.map((_, i) => m.sub.isVisible(i)), dis: m.sub.items.map(i => !!i.disabled), win: m.subRect, n: m.sub.items.length, rows: m.sub.rows }; })()")
    p.check(in_bounds(sub['win']), 'the sub window is on the canvas', sub['win'])
    pick = next((k for k, x in enumerate(sub['dis']) if not x and sub['vis'][k]), None)
    if pick is not None:
        idx = p.js('LQ_ENGINE.scene.menu.sub.index')
        p.tap_rect(sub['rects'][pick])
        if pick != idx:
            p.check(p.js('LQ_ENGINE.scene.menu.sub.index') == pick, 'a tap selects a list row', pick)
            p.tap_rect(sub['rects'][pick])
        p.frames(3)
        expect_menu(p, 'target', 'a tap on the selected row goes to targeting')
        p.shot('touch-target')
        win = p.battle()['cmdRect']
        p.tap(win['x'] + 40, win['y'] + 30)
        p.frames(3)
        expect_menu(p, 'sub', 'a tap on the command window cancels targeting')
    p.act('cancel')
    expect_menu(p, 'root', 'B closes the list')
    d = p.battle()
    i = d['menuItems'].index('attack')
    turns = d['partyTurns']
    p.tap_rect(d['rootRects'][i])
    p.frames(3)
    expect_menu(p, 'target', 'one tap on Attack targets')
    uid = p.battle()['target']
    box = p.js(f"(() => {{ const a = LQ_ENGINE.scene.actors.get('{uid}'); return {{ x: a.cx, y: a.cy }}; }})()")
    p.tap(box['x'], box['y'])
    p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.b.state.partyTurns > {turns} || s.menu.state === 'closed'; }})()", 'a tap on the highlighted foe confirms', 5)


def rewards(p):
    """Win a fight by real input and leave the rewards with this device's own control."""
    start(p, 'e4r_first', 11, True)
    p.js("for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'enemy') u.hp = 1")
    for _ in range(40):
        d = wait_turn(p)
        if over(p):
            break
        foe = next((u['uid'] for u in d['units'] if not u['dead'] and not u['ko'] and u['uid'] not in ('hero', 'mira', 'bram')), None)
        attack_once(p, foe)
    p.until("LQ_ENGINE.scene.name !== 'battle' || LQ_ENGINE.scene.phase === 'rewards'", 'the rewards screen', 15)
    p.frames(40)
    p.shot('rewards')
    for _ in range(20):
        d = p.battle()
        if not d:
            break
        if d.get('phase') == 'rewards':
            if p.touch:
                p.tap(192, 108)
            else:
                p.act('confirm')
        p.frames(14)
    p.until("LQ_DEBUG.scene() !== 'battle'", 'the rewards close', 10)
    p.check(p.js("LQ_DEBUG.battleResult()") == 'win', 'the fight ends in a win', p.js("LQ_DEBUG.battleResult()"))


def walk_root_commands(p):
    start(p, 'e4r_first', 3, True)
    root_grid(p)
    attack_paths(p)
    sub_paths(p, 'hero', 'tech')
    sub_paths(p, 'mira', 'magic')
    defend(p)


SEQUENCES = [('root and turns', walk_root_commands), ('item', item_use), ('swap', swap_path), ('flee', flee_path), ('flee refused', flee_refused),
             ('auto', auto_path), ('answer a decree', answer_decree), ('answer the strike', answer_strike), ('fury and combo', fury_combo), ('rewards', rewards)]
TOUCH_ONLY = [('rows by finger', touch_rows)]
