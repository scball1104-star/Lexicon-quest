"""Episode 8 shots for qa/shots.json (E8-integrate, docs/EPISODE8_PLAN.md 12, docs/briefs/E8-integrate.md item 5).

Appends the thirty Episode 8 shots of plan 12 to next/qa/shots.json (append only: a shot whose name is already there is left
alone; --replace rewrites these in place). Writes the file back with LF line ends and counts its CR bytes before and after (both
must be zero). Then render them with:

    python next/qa/integrate/ep8_shots.py [--replace]
    python next/qa/shots.py --only "<the names it prints>" --device all --timeout 3400

Every shot carries `?pack=ep7,ep8&ep=8` (the developer entry: both packs forced on), so it renders the same before and after
EP8_LIVE is flipped; the morning shot also opens the story's GATE itself. Story and field shots start from LQ_DEBUG.newGameEp8 (the
Lv 31 quick-start party, slot 0 on the shots' empty storage), set the story flags a save would hold at that point (every field
remark heard), warp, and run the scene (or let the map's enter trigger run it) until the named line is on screen. Book shots read
with LQ_DEBUG.readBook / setBooks (E8-world's levers). Battle shots use LQ_DEBUG.battle on the Episode 8 encounters with the
simulator's Last Word loadout (tools/sim/ep8.mjs LOADOUTS) and step the fight until the state worth showing (a rub, a rubbed row,
an Unwrite pinned, the Rejected Truths, the Keeper Remembers, the Last Silence) is on screen, as scene-ui's
qa/battlescene/ep8_shots.py stages them.
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'
QUERY = '&pack=ep7,ep8&ep=8'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp8')", 'timeout': 150000}
NEW = {'call': 'newGameEp8', 'args': ['Arden', {'slot': 0, 'scene': 'none'}], 'timeout': 150000}
GATE_ON = {'eval': "(async () => { (await import('./src/data/ep8/story.js')).GATE.live = true; return true; })()"}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
MORNING = ['ep8_morning_done', 'ep8_started']
STAIR = MORNING + ['afraid_yes', 'ep8_roofed', 'stair_arrived']
BOOK = STAIR + ['first_rub_done', 'first_book_read']
SEEN = BOOK + ['eraser_seen']
ARR = SEEN + ['saw_scriptorium', 'scriptorium_arrived']
READ = ARR + ['read_learned']
CARD = READ + ['librarian_met', 'card_read']
LIB = CARD + ['told_elowen', 'elowen_met', 'library_open', 'library_entered', 'lib_f1_arrived']
F2 = LIB + ['keeper_memory_a', 'ink_key_found', 'library_f1_done', 'lib_f2_arrived', 'keeper_memory_b']
F3 = F2 + ['sentry_tried', 'sentry_defeated', 'library_f2_done', 'lib_f3_arrived']
NAME = F3 + ['keeper_memory_c', 'beginning_seen']
LW = NAME + ['name_told']
AFTER = LW + ['eraser_tried', 'vex_arrived', 'answered_yes', 'eraser_defeated']
NAMED = AFTER + ['lexicon_restored', 'fragment8_get', 'keeper_named']
ENDED = NAMED + ['ending_return']
SHELVED = ENDED + ['page_shelved', 'night_read', 'eighth_star', 'hero_kept']
SOPEN = SHELVED + ['scriptorium_open']
HOME = SOPEN + ['told_hazel', 'home_reached']
TOLLS = HOME + [f'ep8_toll_{n}' for n in range(1, 13)]
BARKS8 = ['first_open', 'first_wall', 'first_side', 'first_pair', 'would_fold']


def flags(names, extra_items=None):
    """Set the story flags; every field remark (BARKS and the book barks) counts as heard, as it would be by this point."""
    items = ' '.join(f'g.items[{json.dumps(k)}] = {v};' for k, v in (extra_items or {}).items())
    return {'eval': "(async () => { const g = LQ_ENGINE.game; for (const f of " + json.dumps(names) + ") g.flags[f] = true; " + items
            + " const { BARKS } = await import('./src/data/text.js'); for (const k of [...Object.keys(BARKS), ..." + json.dumps(BARKS8)
            + "]) g.counters['bark:' + k] = 1; return true; })()"}


def warp(map_id, x, y, d='down'):
    return {'call': 'warp', 'args': [map_id, x, y, d], 'timeout': 30000}


def scene(scene_id):
    return {'eval': f"(() => {{ LQ_DEBUG.call('scene', {json.dumps(scene_id)}); return true; }})()"}


def until_line(pattern, timeout=60000):
    """Advance the running scene's dialogue (confirm on finished pages, choices take their first answer, title cards) until a
    page matching `pattern` (its whitespace folded to single spaces) is fully typed."""
    js = ("(async () => { const rx = new RegExp(" + json.dumps(pattern) + "); "
          "for (let i = 0; i < 1500; i++) { const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { if (!s.typing && rx.test((s.pageText || '').replace(/\\s+/g, ' '))) return i; if (!s.typing || i % 4 === 0) LQ_DEBUG.press('confirm', 1); } "
          "else if (s && (s.name === 'choice' || s.name === 'titleCard')) LQ_DEBUG.press('confirm', 1); "
          "await new Promise(r => setTimeout(r, 40)); } "
          "throw new Error('the line never showed: ' + rx); })()")
    return {'eval': js, 'timeout': timeout}


def on_top(name, why):
    return {'assert': f"LQ_DEBUG.scene() === {json.dumps(name)}", 'message': why}


def books_set(state):
    """The books set directly (E8-world's lab lever: no sound, no animation)."""
    return {'eval': f"(() => {{ LQ_DEBUG.setBooks({json.dumps(state)}); return true; }})()"}


def read_book(book):
    """A read as confirm on that book would, from where the leader stands (the open), waited out."""
    return {'eval': "(async () => { const r = await LQ_DEBUG.readBook(" + json.dumps(book) + "); if (!r || !r.ok) throw new Error('the read was refused: ' + JSON.stringify(r && r.state && r.state.lastRead)); "
                    "for (let i = 0; i < 200; i++) { await new Promise((ok) => setTimeout(ok, 40)); const s = LQ_DEBUG.books(); "
                    "if (s && !s.busy && s.anim == null && LQ_DEBUG.scene() === 'field') return s.describe; } throw new Error('the read never settled'); })()",
            'timeout': 20000}


def books_are(want, why):
    return {'assert': "(() => { const o = LQ_DEBUG.books().open, w = " + json.dumps(want) + "; return Object.keys(w).every((k) => o[k] === w[k]); })()",
            'message': why}


# The fight, with the simulator's party for the Last Word (or the Library, for the Stair and the Sentry) at a level, the party
# made sturdy (a staged shot never loses), Auto off; window.__pa is the careful policy (the competent party action).
SETUP = """(async () => {
  const g = LQ_ENGINE.game;
  const { LOADOUTS } = await import('./tools/sim/ep8.mjs'), { memberMax } = await import('./src/game/state.js');
  const L = LOADOUTS[%s];
  for (const m of g.party) {
    const r = L[m.id];
    m.weapon = r.weapon; m.equip = { ...Object.fromEntries(Object.keys(m.equip).map((k) => [k, null])), ...r.equip };
    m.mastery = { ...m.mastery, ...r.mastery }; m.level = %d;
    const s = memberMax(m); m.hp = s.hp; m.mp = s.mp;
  }
  g.items = { ...L.inventory };
  for (const f of L.flags || []) g.flags[f] = true;
  g.flags.read_learned = true;
  window.__pa = (await import('./src/battle/ai.js')).partyAction;
  LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1, battleCursor: 'last' });
  return true;
})()"""
STURDY = {'eval': "(() => { for (const u of LQ_ENGINE.scene.b.units()) if (u.side === 'party') { u.maxHp = Math.max(u.maxHp, 9999); u.hp = u.maxHp; } return true; })()"}


def fight(enc, seed, loadout='ep8_last_word', lv=33):
    return [{'eval': SETUP % (json.dumps(loadout), lv), 'timeout': 60000}, {'eval': 'LQ_DEBUG.setSpeed(0)'},
            {'call': 'battle', 'args': [enc, {'seed': seed, 'noElite': True, 'canFlee': False}]}, {'advance': 90}, STURDY]


def battle_until(cond, act='defend'):
    """Step a debug battle until `cond` (JS over `s`, the battle scene, `S`, its Erasure state, `b`, its debug state, and `open`,
    the command menu waiting) holds; on the way each party turn takes `act`: 'defend', 'attack' (the first living foe) or 'careful'
    (the competent party policy)."""
    acts = {'defend': "({ type: 'defend' })",
            'attack': "({ type: 'attack', target: s.b.units().find(u => u.side === 'enemy' && u.alive).uid })",
            'careful': "(window.__pa(s.b, 'competent') || { type: 'defend' })"}
    js = ("(() => { for (let i = 0; i < 8000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle' || !s.b) return -2; "
          "const S = s.b.state.erasure || { rub: {}, unwritten: {} }; const b = LQ_DEBUG.state().battle; const open = !!(b && b.menu !== 'closed' && !b.fast); "
          f"if (({cond})) return i; "
          f"if (open) LQ_DEBUG.battleAct({acts[act]}); "
          "LQ_DEBUG.advance(5); } return -1; })()")
    return {'eval': js}


ERASER = "s.b.units().find(u => u.id === 'eraser')"
TRUTHS = "s.b.units().filter(u => (u.id === 'truth_grief' || u.id === 'truth_change') && u.alive)"
TO_TRUTHS = [{'eval': f"(() => {{ const s = LQ_ENGINE.scene; const u = {ERASER}; u.hp = Math.floor(u.maxHp * 0.70) + 6; return true; }})()"},
             battle_until(f"{TRUTHS}.length > 0 && open", 'careful'), {'advance': 40}]
TO_REMEMBERS = [{'eval': f"(() => {{ const s = LQ_ENGINE.scene; for (const u of {TRUTHS}) {{ u.hp = 1; u.shields = 0; }} return true; }})()"},
                battle_until(f"{TRUTHS}.length === 0 && s.st8 && s.st8.k >= 1 && open", 'careful'), {'advance': 20}]
TO_SILENCE = [{'eval': f"(() => {{ const s = LQ_ENGINE.scene; const u = {ERASER}; u.hp = Math.floor(u.maxHp * 0.26) + 6; return true; }})()"},
              battle_until("open && s.b.current().id === 'hero' && s.b.living('enemy').some(u => u.charging && u.charging.skill === 'last_silence')", 'careful'),
              {'advance': 30}]

SHOTS = [
    {'name': 'story_ep8_morning_note', 'note': "E8: ep8_morning in the Keeper's Watch, Vex's note close-up: Gone up first (story)",
     'steps': [READY, GATE_ON, {'call': 'newGameEp8', 'args': ['Arden', {'slot': 0}], 'timeout': 150000}, until_line('A folded scrap'),
               on_top('dialog', "story_ep8_morning_note: Vex's note")]},
    {'name': 'story_ep8_roof', 'note': 'E8: ep8_roof, the Stillheart roof by day: Aeris by the Kestrel, Nox at the first step (story)',
     'steps': [READY, NEW, flags(MORNING), warp('ep7_stillheart', 16, 15, 'up'),        # ep8_roof runs on entry
               until_line('Are you frightened'), on_top('dialog', 'story_ep8_roof: Nox at the stair')]},
    {'name': 'battle_stair_first_rub', 'note': "E8: the Stair's teaching fight (two Index Hounds): a party command rubbed out, the smudge and its pips",
     'steps': [READY, NEW, flags(STAIR)] + fight('e8s_first', 3, 'ep8_stair', 31) + [battle_until("Object.values(S.rub || {}).some((r) => r && r.length)", 'attack'),
               {'advance': 30}, {'assert': "Object.values(LQ_ENGINE.scene.b.state.erasure.rub).some((r) => r && r.length)", 'message': 'a command is rubbed out'}]},
    {'name': 'battle_rubbed_row', 'note': "E8: a member's turn with a rubbed row in the command menu (smudged, greyed, its help)",
     'steps': [READY, NEW, flags(STAIR)] + fight('e8s_first', 3, 'ep8_stair', 31) + [battle_until("open && ((S.rub || {})[s.b.current().uid] || []).length > 0", 'attack'),
               {'advance': 12}, {'assert': "((LQ_ENGINE.scene.b.state.erasure.rub || {})[LQ_ENGINE.scene.b.current().uid] || []).length > 0", 'message': 'the member at the menu has a rubbed row'}]},
    {'name': 'field_ep8_gap_a', 'note': 'E8: Gap A on the Stair: the Willowmere book read from the south, its pages a bridge, the willow standing up',
     'steps': [READY, NEW, flags(BOOK), warp('ep8_stair', 15, 45, 'up'), {'frames': 200}, read_book('pb_willow'), {'frames': 40},
               books_are({'a': 'n'}, 'the willow is open north')]},
    {'name': 'field_ep8_gap_c_wall', 'note': "E8: Gap C from the reading desk: the book open south, a bridge over the lower void and a wall of pages on the island",
     'steps': [READY, NEW, flags(SEEN), warp('ep8_stair', 15, 27, 'up'), {'frames': 220}, books_are({'c': 's'}, 'Gap C stands open south (authored)')]},
    {'name': 'story_rubbed_steps', 'note': 'E8: rubbed_steps by the reading desk: the faceless figure walking down, the steps going blank (story)',
     'steps': [READY, NEW, flags(BOOK), warp('ep8_stair', 15, 28, 'up'), {'frames': 160}, scene('rubbed_steps'),
               until_line('goes blank behind'), on_top('dialog', 'story_rubbed_steps: the figure')]},
    {'name': 'story_south_margin', 'note': 'E8: south_margin, the top gate: the Scriptorium below and the First Library filling the sky (story)',
     'steps': [READY, NEW, flags(SEEN), warp('ep8_stair', 17, 12, 'up'), {'frames': 160}, scene('south_margin'),
               until_line('Below the gate, a street of book towers'), on_top('dialog', 'story_south_margin: the Library')]},
    {'name': 'story_first_word', 'note': "E8: first_word in the square: Meya's one word lifting off with the half-signs (story)",
     'steps': [READY, NEW, flags(ARR), warp('ep8_scriptorium', 23, 26, 'up'), {'frames': 160}, scene('first_word'),
               until_line('word goes with them'), on_top('dialog', 'story_first_word: the word rubbed out')]},
    {'name': 'story_meet_librarian_card', 'note': "E8: meet_librarian at the Index, the reader's card close-up with the desk's stamp (story)",
     'steps': [READY, NEW, flags(READ), warp('ep8_sc_index', 9, 12, 'up'), {'frames': 160}, scene('meet_librarian'),
               until_line('Mira reads her card'), on_top('dialog', 'story_meet_librarian_card: the card')]},
    {'name': 'story_elowen_seal', 'note': "E8: elowen_scriptorium at the register house: the blanket tag, a key across an open book (story)",
     'steps': [READY, NEW, flags(CARD), warp('ep8_scriptorium', 18, 23, 'up'), {'frames': 160}, scene('elowen_scriptorium'),
               until_line('Grey infirmary blankets'), on_top('dialog', 'story_elowen_seal: the tag')]},
    {'name': 'field_ep8_library_f1_crossing', 'note': 'E8: F1 the Catalog of Lost Lives: book a read from the gallery, its bridge to the island',
     'steps': [READY, NEW, flags(LIB + ['keeper_memory_a']), warp('ep8_library_f1', 21, 19, 'up'), {'frames': 220}, read_book('pb_a'), {'frames': 40},
               books_are({'a': 'n'}, 'book a is open north')]},
    {'name': 'field_ep8_library_f2_pair', 'note': 'E8: F2 the Palimpsest Galleries: the pair, w read on the island and Valewyn folding behind',
     'steps': [READY, NEW, flags(F2), warp('ep8_library_f2', 13, 11, 'up'), {'frames': 220}, books_set({'v': 'e'}), {'frames': 20}, read_book('pb_w'),
               {'frames': 40}, books_are({'w': 'n', 'v': '-'}, 'w open north, Valewyn folded')]},
    {'name': 'battle_sentry_unwrite', 'note': "E8: the Unnamed Sentry pins an Unwrite on a member: the grey ribbon, the hint line, Mira's turn to read",
     'steps': [READY, NEW, flags(F2)] + fight('unnamed_sentry', 3, 'ep8_library_f2', 32) + [battle_until('open && !!S.pin', 'attack'), {'advance': 30},
               {'assert': "!!LQ_ENGINE.scene.b.state.erasure.pin", 'message': 'an Unwrite is pinned'}]},
    {'name': 'field_ep8_library_f3_choose', 'note': 'E8: F3 the Unwritten Page, CHOOSE: the two books, either one reaching the keyhole',
     'steps': [READY, NEW, flags(NAME), warp('ep8_library_f3', 17, 15, 'up'), {'frames': 240},
               on_top('field', 'field_ep8_library_f3_choose: the field is on top')]},
    {'name': 'story_keeper_memory_c', 'note': 'E8: keeper_memory_c on the first landing: the infirmary, a young Keeper says a name (story)',
     'steps': [READY, NEW, flags(F3), warp('ep8_library_f3', 17, 33, 'up'), {'frames': 160}, scene('keeper_memory_c'),
               until_line('A young Keeper in a bed by the window'), on_top('dialog', 'story_keeper_memory_c: the infirmary')]},
    {'name': 'story_the_name', 'note': 'E8: the_name at the keyhole: Nox says the name (story)',
     'steps': [READY, NEW, flags(NAME), warp('ep8_library_f3', 17, 10, 'up'), {'frames': 160}, scene('the_name'),
               until_line("It's their first name"), on_top('dialog', 'story_the_name: Nox')]},
    {'name': 'story_last_margin', 'note': 'E8: eraser, the Last Word: Vex up the gallery stair with the first page, whole (story)',
     'steps': [READY, NEW, flags(LW), warp('ep8_last_word', 14, 18, 'up'), {'frames': 160}, scene('eraser'),
               until_line('Mended your bindings'), on_top('dialog', 'story_last_margin: Vex')]},
    {'name': 'battle_eraser_unwrite', 'note': "E8: the Eraser (the Closed Book) pins an Unwrite: the ribbon, the hint line, Mira's turn to read",
     'steps': [READY, NEW, flags(LW)] + fight('eraser', 3) + [battle_until("open && !!S.pin && s.b.current().id === 'mira'", 'attack'), {'advance': 30},
               {'assert': "!!LQ_ENGINE.scene.b.state.erasure.pin", 'message': 'an Unwrite is pinned'}]},
    {'name': 'battle_eraser_ward', 'note': 'E8: the Eraser, the Rejected Truths: Grief and Change in the front row, rows under their feet',
     'steps': [READY, NEW, flags(LW)] + fight('eraser', 3) + TO_TRUTHS +
              [{'assert': "LQ_ENGINE.scene.b.units().some(u => (u.id === 'truth_grief' || u.id === 'truth_change') && u.alive)", 'message': 'the Truths stand'}]},
    {'name': 'battle_eraser_remembers', 'note': 'E8: the Eraser, the Keeper Remembers: the Truths broken, the stage on its gold grade',
     'steps': [READY, NEW, flags(LW)] + fight('eraser', 3) + TO_TRUTHS + TO_REMEMBERS +
              [{'assert': "LQ_ENGINE.scene.st8 && LQ_ENGINE.scene.st8.k >= 1", 'message': 'the gold grade is in'}]},
    {'name': 'battle_eraser_silence', 'note': "E8: the Eraser, the Last Silence charging on the hero's turn: the dim, the charge bar, Answer",
     'steps': [READY, NEW, flags(LW)] + fight('eraser', 3) + TO_SILENCE +
              [{'assert': "LQ_ENGINE.scene.b.living('enemy').some(u => u.charging && u.charging.skill === 'last_silence')", 'message': 'the Last Silence charges'}]},
    {'name': 'story_eraser_after', 'note': "E8: eraser_after: the white face cracks, the old man under it (story)",
     'steps': [READY, NEW, flags(AFTER), warp('ep8_last_word', 14, 14, 'up'),               # eraser_after runs on entry
               until_line("Under it is an old man's face"), on_top('dialog', 'story_eraser_after: the face')]},
    {'name': 'story_last_choice', 'note': 'E8: last_choice at the lectern: How do they go back? (story)',
     'steps': [READY, NEW, flags(NAMED), warp('ep8_last_word', 14, 14, 'up'),               # last_choice runs on entry
               until_line('How do they go back'), on_top('dialog', 'story_last_choice: the question')]},
    {'name': 'story_last_page_star', 'note': 'E8: last_page, the dome: the eighth star lights and takes a sign (story)',
     'steps': [READY, NEW, flags(ENDED), warp('ep8_last_word', 14, 14, 'up'),               # last_page runs on entry
               until_line('the eighth star lights'), on_top('dialog', 'story_last_page_star: the star')]},
    {'name': 'story_scriptorium_open', 'note': 'E8: scriptorium_open at dusk: every half-word finishes, the candles lit (story)',
     'steps': [READY, NEW, flags(SHELVED), warp('ep8_scriptorium', 23, 9, 'down'),          # scriptorium_open runs on entry
               until_line('Every half-word on every sign finishes itself'), on_top('dialog', 'story_scriptorium_open: the signs')]},
    {'name': 'story_home_hazel', 'note': 'E8: home, the door of the house at dusk: Hazel asks (story)',
     'steps': [READY, NEW, flags(SOPEN), warp('ep8_scriptorium', 23, 31, 'down'), {'frames': 160}, scene('home'),
               until_line('Did you find them'), on_top('dialog', 'story_home_hazel: Hazel')]},
    {'name': 'story_thirteenth_name', 'note': "E8: thirteenth_name on the bell night: the thirteenth bell, the hero's name (story)",
     'steps': [READY, NEW, flags(TOLLS), warp('ep8_bell_night', 12, 7, 'up'),               # the twelve tolled: the thirteenth runs on entry
               {'waitFor': "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const c = f && f.er8f && f.er8f.cap; return !!(c && c.gold); })()", 'timeout': 30000},
               {'frames': 40}, {'assert': "LQ_ENGINE.game.flags.ep8_toll_12 && !LQ_ENGINE.game.flags.ep8_complete", 'message': 'the thirteenth is tolling, the name shown'}]},
    {'name': 'ui_credits_ep8', 'note': "E8: the whole game's credits (CREDITS_EP8) scrolling",
     'steps': [READY, NEW, flags(TOLLS + ['ep8_complete']), {'frames': 5},
               {'eval': "(async () => { const { CREDITS_HANDOFF } = await import('./src/game/story.js'); const h = CREDITS_HANDOFF[8]; "
                        "if (!h) throw new Error('no CREDITS_HANDOFF[8]'); LQ_DEBUG.engine.push('credits', { cards: h.cards, music: h.music, episode: 8 }); return true; })()"},
               {'frames': 260}, on_top('credits', 'ui_credits_ep8: the credits')]},
    {'name': 'ui_title_ep8', 'note': 'E8: the title with an Episode 7 finish in slot 0: the Episode 8 row offered, its help line beside it',
     'steps': [READY,
               {'eval': "(async () => { await LQ_DEBUG.newGameEp8('Arden', { slot: 0, scene: 'none' }); const g = LQ_ENGINE.game; "
                        "for (const f of ['ep8_started', 'ep8_morning_done']) delete g.flags[f]; "
                        "const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 36000, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) }; "
                        "LQ_ENGINE.save.save(0, JSON.parse(JSON.stringify(g)), meta); LQ_ENGINE.game = null; LQ_ENGINE.reset('title'); return true; })()", 'timeout': 150000},
               {'waitFor': "LQ_DEBUG.scene() === 'title' && !!LQ_ENGINE.scene.menu && ((LQ_ENGINE.scene.quickStarts && LQ_ENGINE.scene.quickStarts().includes('ep8')) || LQ_ENGINE.scene.menu.items.some(i => i.id === 'ep8'))", 'timeout': 60000},
               {'eval': "(() => { const s = LQ_ENGINE.scene; if (s.showQuickStart) s.showQuickStart('ep8'); return true; })()"},
               {'frames': 90}]},
]
for _s in SHOTS:
    _s['query'] = QUERY


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--replace', action='store_true', help='rewrite these shots if they are already in shots.json')
    a = ap.parse_args()
    raw = SPEC.read_bytes()
    cr0 = raw.count(b'\r')
    spec = json.loads(raw.decode('utf-8'))
    names = [s['name'] for s in spec['shots']]
    added, replaced = [], []
    for shot in SHOTS:
        if shot['name'] in names:
            if a.replace:
                spec['shots'][names.index(shot['name'])] = shot
                replaced.append(shot['name'])
            continue
        spec['shots'].append(shot)
        added.append(shot['name'])
    out = (json.dumps(spec, indent=1, ensure_ascii=True) + '\n').encode('utf-8')     # LF, as the file is
    if not a.replace and not added:
        print('nothing to add')
    else:
        SPEC.write_bytes(out)
    print(f'added {len(added)}: {", ".join(added) or "-"}; replaced {len(replaced)}')
    print(f'CR bytes in qa/shots.json: {cr0} before, {out.count(chr(13).encode())} after')
    print('--only ' + ','.join(s['name'] for s in SHOTS))


if __name__ == '__main__':
    main()
