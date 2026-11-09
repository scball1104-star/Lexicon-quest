"""Episode 5 by real input: Turn the Sky cast from the battle menu (E5-fixes A1, PLAYTEST_REVIEW_7 item 1).

The bots act through battleAct and Auto, which skip the menu, so a Tech the menu refused (a skill with no target) passed every
run. Here the fight is set up (the quick start, sky_learned, Lv 24, the fight), then everything is a real key, a finger on the
on-screen A button and d-pad, or a tap on the canvas: Defend until Mira's turn, Tech, Turn the Sky, confirm.
"""
from battle import MENU_GONE, OPS_DONE, cursor_to, expect_menu, to_member, wait_turn

SETUP = """async ([enc, seed]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp5'))) {
    if (Date.now() - t0 > 60000) throw new Error('newGameEp5 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp5('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game; g.flags.sky_learned = true;
  for (const m of g.party) m.level = Math.max(m.level, 24);
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 2, textSpeed: 4, battleCursor: 'last' });
  LQ_DEBUG.battle(enc, { seed, canFlee: false, gameover: false });
  return true;
}"""
SKY = "(() => { const s = LQ_ENGINE.scene; const S = s.b && s.b.state.sky; const m = s.b && s.b.unit('mira'); return { sky: S && S.sky, pinned: !!(S && S.pinned), turnIn: S && S.turnIn, mp: m && m.mp }; })()"
SUB = "(() => { const m = LQ_ENGINE.scene.menu; return m.sub ? { ids: m.sub.items.map(i => i.id), index: m.sub.index, color: m.sub.items.map(i => i.color), rects: m.sub.items.map((_, i) => m.sub.rowRect(i)), vis: m.sub.items.map((_, i) => m.sub.isVisible(i)) } : null; })()"


def start(p, enc, seed=4):
    p.boot('&pack=ep4,ep5&ep=5')
    p.page.evaluate(SETUP, [enc, seed])
    p.until("LQ_DEBUG.scene() === 'battle'", 'the fight starts', 30)


def cast_and_check(p, before, how):
    """After the confirm on Turn the Sky: the menu closes, the action is Mira's Turn the Sky, the sky turns, the MP is paid."""
    p.until(MENU_GONE, f'{how}: Turn the Sky closes the menu (before the fix it buzzed and stayed)', 6)
    p.until(OPS_DONE, f'{how}: the cast plays', 20)
    acts = p.battle().get('actions', [])
    p.check(any(a.startswith('mira:skill:turn_sky') for a in acts), f'{how}: Mira cast Turn the Sky', acts[-4:])
    after = p.js(SKY)
    p.check(after['mp'] <= before['mp'] - 12, f'{how}: 12 MP paid', (before['mp'], after['mp']))
    return after


def turn_sky_keys(p):
    """The deck fight: Defend to Mira's turn, Tech, walk the list to Turn the Sky, confirm (keys, or the A button and d-pad)."""
    start(p, 'e5s_first')
    wait_turn(p, timeout=40)
    if not p.check(to_member(p, 'mira'), 'Mira gets a turn'):
        return
    cursor_to(p, 'tech')
    p.act('confirm')
    if not expect_menu(p, 'sub', 'Tech opens'):
        return
    p.frames(6)
    sub = p.js(SUB)
    if not p.check('turn_sky' in sub['ids'], 'Turn the Sky is listed', sub['ids']):
        return
    for _ in range(14):
        if p.js('LQ_ENGINE.scene.menu.sub.item.id') == 'turn_sky':
            break
        p.act('down')
    p.shot('turn-sky-row')
    before = p.js(SKY)
    p.act('confirm')
    after = cast_and_check(p, before, 'keys')
    p.check(after['sky'] != before['sky'], 'the sky turned', (before['sky'], after['sky']))
    p.shot('turn-sky-cast')


def turn_sky_pinned(p):
    """The Oracle: Defend by real input until a star is read and it is Mira's turn; the Tech list opens on Turn the Sky, first and
    gold; two presses cast it and the reading breaks. Also A2: the reading never lands before Mira has had her turn."""
    start(p, 'oracle', 3)
    for _ in range(40):
        d = wait_turn(p, timeout=40)
        s = p.js(SKY)
        if s['pinned'] and d.get('current') == 'mira':
            break
        p.act('cancel')
        p.act('confirm')
        p.until(f"(() => {{ const s = LQ_ENGINE.scene; return s.name !== 'battle' || s.phase !== 'play' || s.b.state.partyTurns > {d['partyTurns']}; }})()", 'Defend takes the turn', 8)
    d = p.battle()
    if not p.check(p.js(SKY)['pinned'] and d.get('current') == 'mira', 'a star is read and it is Mira\'s turn', d.get('current')):
        return
    fell = p.js("(LQ_ENGINE.scene.b.units().find(u => u.id === 'oracle') || { ai: {} }).ai.fell || 0")
    p.check(fell == 0, 'no reading fell before Mira had a turn (A2)', fell)
    p.check(d['menuItems'][d['menuIndex']] == 'tech', 'the root cursor opens on Tech', d['menuItems'][d['menuIndex']])
    p.shot('pinned-root')
    p.act('confirm')
    expect_menu(p, 'sub', 'Tech opens')
    p.frames(6)
    sub = p.js(SUB)
    p.check(sub['ids'][0] == 'turn_sky' and sub['index'] == 0 and sub['color'][0] == 'gold', 'Turn the Sky first, in gold, under the cursor', sub['ids'][:3])
    p.shot('pinned-tech-list')
    before = p.js(SKY)
    p.act('confirm')
    cast_and_check(p, before, 'pinned')
    p.check(not p.js(SKY)['pinned'], 'the reading breaks', p.js(SKY))
    p.shot('pinned-broken')


def turn_sky_tap(p):
    """Phone: one tap on Tech, a tap on Turn the Sky (it selects), a tap again (it casts): fingers on the canvas only."""
    start(p, 'e5s_first')
    wait_turn(p, timeout=40)
    if not p.check(to_member(p, 'mira'), 'Mira gets a turn'):
        return
    d = p.battle()
    p.tap_rect(d['rootRects'][d['menuItems'].index('tech')])
    p.frames(4)
    if not expect_menu(p, 'sub', 'one tap on Tech opens its list'):
        return
    p.frames(6)
    sub = p.js(SUB)
    i = sub['ids'].index('turn_sky') if 'turn_sky' in sub['ids'] else -1
    if not p.check(i >= 0 and sub['vis'][i], 'Turn the Sky is listed and on screen', sub['ids']):
        return
    before = p.js(SKY)
    if sub['index'] != i:
        p.tap_rect(sub['rects'][i])
        p.frames(3)
        p.check(p.js('LQ_ENGINE.scene.menu.sub.index') == i and p.battle().get('menu') == 'sub', 'the first tap selects the row', p.battle().get('menu'))
    p.tap_rect(sub['rects'][i])
    after = cast_and_check(p, before, 'tap')
    p.check(after['sky'] != before['sky'], 'the sky turned', (before['sky'], after['sky']))
    p.shot('tap-cast')


SEQUENCES = [('turn the sky', turn_sky_keys), ('turn the sky pinned', turn_sky_pinned)]
TOUCH_ONLY = [('turn the sky by tap', turn_sky_tap)]
