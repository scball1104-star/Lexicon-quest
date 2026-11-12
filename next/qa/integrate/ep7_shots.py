"""Episode 7 shots for qa/shots.json (E7-integrate, docs/EPISODE7_PLAN.md 12, docs/briefs/E7-integrate.md item 5).

Appends the twenty-four Episode 7 shots of plan 12 to next/qa/shots.json (append only: a shot whose name is already there is
left alone; --replace rewrites these in place). Writes the file back with LF line ends and counts its CR bytes before and after
(both must be zero: Episode 4's generator once rewrote the file with CRLF). Then render them with:

    python next/qa/integrate/ep7_shots.py [--replace]
    python next/qa/shots.py --only "<the names it prints>" --device all --timeout 3400

Every shot carries `?pack=ep6,ep7&ep=7` (the developer entry: both packs forced on), so it renders the same before and after
EP7_LIVE is flipped; the morning shot also opens the story's GATE itself. Story and field shots start from LQ_DEBUG.newGameEp7 (the
Lv 28 quick-start party, slot 0 on the shots' empty storage), set the story flags a save would hold at that point (every field
remark heard), warp, and run the scene (or let the map's enter trigger run it) until the named line is on screen. Stone shots set
the holds with LQ_DEBUG.holdStones / readStone (E7-world's levers). Battle shots use LQ_DEBUG.battle on the Episode 7 encounters
and step the fight until the state worth showing (Rime pips, a Frozen member, a pinned Farewell or Borrowed Light, the Ward, the
thaw) is on screen, as scene-ui's qa/battlescene/ep7_autobattle.py stages them.
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'
QUERY = '&pack=ep6,ep7&ep=7'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp7')", 'timeout': 120000}
NEW = {'call': 'newGameEp7', 'args': ['Arden', {'slot': 0, 'scene': 'none'}], 'timeout': 120000}
GATE_ON = {'eval': "(async () => { (await import('./src/data/ep7/story.js')).GATE.live = true; return true; })()"}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
MORNING = ['ep7_morning_done', 'ep7_started']
ROAD = MORNING + ['ep7_boarded', 'road_arrived']
WALL = ROAD + ['told_vex', 'valewyn_list_get', 'vex_carved', 'road_fight_done']
STONE = WALL + ['first_stone_read']
CALL = STONE + ['call_learned']
WAY = CALL + ['saw_sevens', 'saw_palehaven']
TOWN = WAY + ['palehaven_arrived']
KEEPER = TOWN + ['met_keeper']
VAULT = KEEPER + ['keeper_told', 'vault_open', 'vault_entered', 'vault_f1_arrived']
F2 = VAULT + ['keeper_memory_1', 'stillheart_key_found', 'vault_f1_done', 'vault_f2_arrived', 'keeper_memory_2']
F3 = F2 + ['bell_found', 'lantern_tried', 'lantern_defeated', 'vault_f2_done', 'vault_f3_arrived', 'keeper_memory_3']
DOOR = F3 + ['told_nox', 'keeper_came', 'stillheart_open']
AFTER = DOOR + ['phantom_tried', 'phantom_defeated']
PAGE = AFTER + ['fragment7_get', 'seventh_list_get', 'stillheart_restored']
REOPEN = PAGE + ['marten_named', 'nox_named', 'page_whole']
ENDING = REOPEN + ['letter_sent', 'vex_name_whole', 'doors_reopened']
KEYS = {'white_road_letter': 1}


def flags(names, extra_items=None):
    """Set the story flags; every field remark (BARKS) counts as heard, as it would be by this point of a playthrough."""
    items = ' '.join(f'g.items[{json.dumps(k)}] = {v};' for k, v in (extra_items or {}).items())
    return {'eval': "(async () => { const g = LQ_ENGINE.game; for (const f of " + json.dumps(names) + ") g.flags[f] = true; " + items
            + " const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1; return true; })()"}


def warp(map_id, x, y, d='down'):
    return {'call': 'warp', 'args': [map_id, x, y, d], 'timeout': 30000}


def scene(scene_id):
    return {'eval': f"(() => {{ LQ_DEBUG.call('scene', {json.dumps(scene_id)}); return true; }})()"}


def until_line(pattern, timeout=60000):
    """Advance the running scene's dialogue (confirm on finished pages, choices take their first answer, title cards) until a
    page matching `pattern` is fully typed."""
    js = ("(async () => { const rx = new RegExp(" + json.dumps(pattern) + "); "
          "for (let i = 0; i < 1500; i++) { const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { if (!s.typing && rx.test(s.pageText || '')) return i; if (!s.typing || i % 4 === 0) LQ_DEBUG.press('confirm', 1); } "
          "else if (s && (s.name === 'choice' || s.name === 'titleCard')) LQ_DEBUG.press('confirm', 1); "
          "await new Promise(r => setTimeout(r, 40)); } "
          "throw new Error('the line never showed: ' + rx); })()")
    return {'eval': js, 'timeout': timeout}


def on_top(name, why):
    return {'assert': f"LQ_DEBUG.scene() === {json.dumps(name)}", 'message': why}


def hold(order):
    """The stone holds set directly, oldest first (E7-world's lab lever: no sound, no animation)."""
    return {'eval': f"(() => {{ LQ_DEBUG.holdStones({json.dumps(order)}); return true; }})()"}


def read_stone(cairn):
    """A read as confirm on that cairn would (the draw-in), waited out."""
    return {'eval': "(async () => { const r = await LQ_DEBUG.readStone(" + json.dumps(cairn) + "); if (!r || !r.ok) throw new Error('the read was refused'); "
                    "for (let i = 0; i < 200; i++) { await new Promise((ok) => setTimeout(ok, 40)); const s = LQ_DEBUG.stones(); "
                    "if (s && !s.busy && !s.anim && LQ_DEBUG.scene() === 'field') return s.held; } throw new Error('the read never settled'); })()",
            'timeout': 20000}


def battle_until(cond):
    """Step a debug battle until `cond` (JS over `s`, the battle scene, `R`, its Rime state, and `b`, its debug state) holds while
    the command menu is open; Defend on the way."""
    js = ("(() => { for (let i = 0; i < 8000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle' || !s.b) return -2; "
          "const R = s.b.state.rime || {}; const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
          f"if (open && ({cond})) return i; "
          "if (open) LQ_DEBUG.battleAct({ type: 'defend' }); "
          "LQ_DEBUG.advance(5); } return -1; })()")
    return {'eval': js}


def battle_swap_until(cond):
    """As battle_until, but the party never Defends (a swap each turn), so the cold builds until someone Freezes."""
    js = ("(() => { for (let i = 0; i < 8000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle' || !s.b) return -2; "
          "const R = s.b.state.rime || {}; const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
          f"if (({cond})) return i; "
          "if (open) LQ_DEBUG.battleAct({ type: 'swap' }); "
          "LQ_DEBUG.advance(5); } return -1; })()")
    return {'eval': js}


def level(n):
    return {'eval': f"(() => {{ for (const m of LQ_ENGINE.game.party) m.level = {n}; LQ_ENGINE.game.flags.call_learned = true; return true; }})()"}


def fight(enc, seed):
    return [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': [enc, {'seed': seed, 'noElite': True, 'canFlee': False}]}, {'advance': 60}]


# The White Phantom into phase 2 (the Ward: the Closed Gate and the Lost Letter): the blow that crosses its 68% lock.
PHANTOM_TO_WARD = (
    "(() => { const P = () => LQ_ENGINE.scene.b.units().find(u => u.alive && u.id === 'white_phantom'); "
    "for (let i = 0; i < 12000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
    "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
    "if (!open) { LQ_DEBUG.advance(5); continue; } "
    "if (s.b.units().some(u => u.alive && (u.id === 'closed_gate' || u.id === 'lost_letter'))) return i; "
    "const o = P(); if (!o) return -3; o.hp = Math.min(o.hp, Math.floor(o.maxHp * 0.685)); o.shields = 99; "
    "LQ_DEBUG.battleAct({ type: 'attack', target: o.uid }); LQ_DEBUG.advance(5); } return -1; })()")
# the Ward's two adds at 1 HP, then attacks on them until both are down and the thaw grade has begun
WARD_TO_THAW = (
    "(() => { const adds = () => LQ_ENGINE.scene.b.units().filter(u => u.alive && (u.id === 'closed_gate' || u.id === 'lost_letter')); "
    "for (const u of adds()) { u.hp = 1; u.shields = 0; } "
    "for (let i = 0; i < 12000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
    "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
    "if (!adds().length && s.st7 && s.st7.k >= 1) return i; "
    "if (!open) { LQ_DEBUG.advance(5); continue; } "
    "const t = adds()[0] || s.b.units().find(u => u.side === 'enemy' && u.alive); if (!t) return -3; "
    "LQ_DEBUG.battleAct({ type: 'attack', target: t.uid }); LQ_DEBUG.advance(5); } return -1; })()")
PIN = 'R.pin && s.b.current().id === "hero"'

SHOTS = [
    {'name': 'story_ep7_morning_chart', 'note': 'E7: ep7_morning in the Chart Room, the fading chart close-up: a valley last night, paper now (story)',
     'steps': [READY, GATE_ON, {'call': 'newGameEp7', 'args': ['Arden', {'slot': 0}], 'timeout': 120000}, until_line("That was a valley last night"),
               on_top('dialog', 'story_ep7_morning_chart: Aeris over the chart')]},
    {'name': 'story_name_under_ice', 'note': "E7: name_under_ice, the Traveler's Wall: Vex cuts VEX QUILL and the letters go white (story)",
     'steps': [READY, NEW, flags(ROAD, KEYS), warp('ep7_white_road', 13, 67, 'up'), {'frames': 160}, scene('name_under_ice'),
               until_line('He cuts VEX QUILL into the ice'), on_top('dialog', 'story_name_under_ice: the carving')]},
    {'name': 'battle_road_first_rime', 'note': 'E7: the White Road teaching fight: two Rime Wolves, the frost pips on the party row',
     'steps': [READY, NEW, level(28)] + fight('e7w_first', 3) + [battle_swap_until("open && Object.values(R.r || {}).some(v => v >= 1)"), {'advance': 4},
               {'assert': "!!LQ_ENGINE.scene.b.state.rime", 'message': 'the fight has Rime'}]},
    {'name': 'battle_rime_frozen', 'note': 'E7: a member Frozen at three pips (the crack, FROZEN, the frosted heads), the party never Defending',
     'steps': [READY, NEW, level(28)] + fight('e7w_first', 3) + [battle_swap_until("Object.keys(R.frozen || {}).length > 0"), {'advance': 20},
               {'assert': "Object.keys(LQ_ENGINE.scene.b.state.rime.frozen).length > 0", 'message': 'a member is Frozen'}]},
    {'name': 'field_ep7_gap_a', 'note': "E7: Gap A from the west spur: Asta's cairn, the eight-pace fade and its ghost trail, the far spur",
     'steps': [READY, NEW, flags(STONE, KEYS), warp('ep7_white_road', 12, 47, 'down'), {'frames': 260},
               {'assert': "LQ_DEBUG.stones() && LQ_DEBUG.stones().active", 'message': 'the stones are active'}]},
    {'name': 'field_ep7_gap_b_two', 'note': "E7: Gap B with two names held: Asta behind (the oldest, guttering) and Bo's path to the ledge",
     'steps': [READY, NEW, flags(CALL, KEYS), warp('ep7_white_road', 19, 39, 'left'), {'frames': 200}, hold(['a', 'b']), {'frames': 90},
               {'assert': "JSON.stringify(LQ_DEBUG.stones().held) === '[\"a\",\"b\"]'", 'message': 'Asta and Bo are held'}]},
    {'name': 'story_whiteout', 'note': 'E7: whiteout on the high stretch: the world white, Mira and Bram fading a step away (story)',
     'steps': [READY, NEW, flags(STONE, KEYS), warp('ep7_white_road', 16, 30, 'up'), {'frames': 160}, scene('whiteout'),
               until_line("I can't see you"), {'frames': 60}, on_top('dialog', 'story_whiteout: Mira in the white')]},
    {'name': 'story_waystation_tally', 'note': "E7: waystation, the courier's tally close-up: every seventh stroke crossed (story)",
     'steps': [READY, NEW, flags(CALL, KEYS), warp('ep7_waystation', 7, 7, 'up'), {'frames': 160}, scene('waystation'),
               until_line('Every seventh one is crossed'), on_top('dialog', 'story_waystation_tally: the tally')]},
    {'name': 'field_ep7_palehaven_hearth', 'note': 'E7: Palehaven, the square: the cold Hearth of Returning Names, the iced doors, the Watch',
     'steps': [READY, NEW, flags(KEEPER, KEYS), warp('ep7_palehaven', 22, 21, 'up'), {'frames': 260},
               on_top('field', 'field_ep7_palehaven_hearth: the field is on top')]},
    {'name': 'story_meet_keeper', 'note': 'E7: meet_keeper, the square: the Keeper lighting her lamp by hand (story)',
     'steps': [READY, NEW, flags(TOWN, KEYS), warp('ep7_palehaven', 24, 15, 'up'), {'frames': 160}, scene('meet_keeper'),
               until_line('Nobody comes up the road'), on_top('dialog', 'story_meet_keeper: the Keeper')]},
    {'name': 'field_ep7_vault_f1_reread', 'note': "E7: F1 the Vanishing Steps: Arvo read again on the gate landing, Liesl now the oldest",
     'steps': [READY, NEW, flags(VAULT + ['keeper_memory_1'], KEYS), warp('ep7_vault_f1', 28, 15, 'up'), {'frames': 200}, hold(['a', 'l']),
               read_stone('ns_arvo_3'), {'frames': 60},
               {'assert': "JSON.stringify(LQ_DEBUG.stones().held) === '[\"l\",\"a\"]'", 'message': 'Liesl then Arvo'}]},
    {'name': 'field_ep7_vault_f2_grip', 'note': "E7: F2 the Hall of Borrowed Light: Dagny's lamp by the frozen arch, Hakon read, the dark hall",
     'steps': [READY, NEW, flags(F2, KEYS), warp('ep7_vault_f2', 12, 17, 'left'), {'frames': 200}, read_stone('ns_hakon'), {'frames': 60},
               {'assert': "JSON.stringify(LQ_DEBUG.stones().held) === '[\"d\",\"h\"]'", 'message': 'Dagny then Hakon'}]},
    {'name': 'story_listening_bell', 'note': "E7: listening_bell, the bell bay: the maker's tag close-up, Mara of the First Bell (story)",
     'steps': [READY, NEW, flags(F2, KEYS), warp('ep7_vault_f2', 21, 8, 'right'), {'frames': 160}, scene('listening_bell'),
               until_line('Good hands. Mara of the First Bell'), on_top('dialog', 'story_listening_bell: the tag')]},
    {'name': 'battle_pale_lantern_borrow', 'note': "E7: the Pale Lantern pins Borrowed Light on an ally: the ribbon, the hero's turn to Call",
     'steps': [READY, NEW, level(29)] + fight('pale_lantern', 2) + [battle_until(PIN), {'advance': 30},
               {'assert': "!!LQ_ENGINE.scene.b.state.rime.pin", 'message': 'Borrowed Light is pinned'}]},
    {'name': 'field_ep7_vault_f3_remember', 'note': 'E7: F3 the Stillheart Sanctum, Remember: Anders through the pillar gap, the aurora overhead',
     'steps': [READY, NEW, flags(F3, KEYS), warp('ep7_vault_f3', 13, 21, 'up'), {'frames': 200}, hold(['y', 'g']), read_stone('ns_anders'),
               {'frames': 90}, {'assert': "JSON.stringify(LQ_DEBUG.stones().held) === '[\"g\",\"a\"]'", 'message': 'Greta then Anders'}]},
    {'name': 'story_keeper_comes', 'note': 'E7: keeper_comes, the Remember landing: the Keeper with her lamp, the blanket with a name (story)',
     'steps': [READY, NEW, flags(F3, KEYS), warp('ep7_vault_f3', 21, 21, 'up'), {'frames': 160}, scene('keeper_comes'),
               until_line('Wrapped in a blanket with your name on it'), on_top('dialog', 'story_keeper_comes: the Keeper')]},
    {'name': 'battle_phantom_farewell', 'note': "E7: the White Phantom pins a Farewell on an ally: the ribbon, the hero's turn to Call",
     'steps': [READY, NEW, level(30)] + fight('white_phantom', 3) + [battle_until(PIN), {'advance': 30},
               {'assert': "!!LQ_ENGINE.scene.b.state.rime.pin", 'message': 'a Farewell is pinned'}]},
    {'name': 'battle_phantom_ward', 'note': 'E7: the White Phantom, phase 2: the Closed Gate and the Lost Letter in the front row',
     'steps': [READY, NEW, level(30)] + fight('white_phantom', 3) + [{'eval': PHANTOM_TO_WARD}, {'advance': 90},
               {'assert': "LQ_ENGINE.scene.b.units().some(u => u.alive && (u.id === 'closed_gate' || u.id === 'lost_letter'))", 'message': 'the Ward is up'}]},
    {'name': 'battle_phantom_thaw', 'note': 'E7: the White Phantom, phase 3: the Ward broken, the stage thawing warm',
     'steps': [READY, NEW, level(30)] + fight('white_phantom', 3) + [{'eval': PHANTOM_TO_WARD}, {'advance': 60}, {'eval': WARD_TO_THAW}, {'advance': 60},
               {'assert': "LQ_ENGINE.scene.name === 'battle' && LQ_ENGINE.scene.st7 && LQ_ENGINE.scene.st7.k >= 1", 'message': 'the thaw has begun'}]},
    {'name': 'story_phantom_after_list', 'note': 'E7: phantom_after, the seventh list frozen into the floor: the North, and a page (story)',
     'steps': [READY, NEW, flags(AFTER, KEYS), warp('ep7_stillheart', 16, 14, 'up'),          # phantom_after runs on entry
               until_line('LET IT FORGET EVERY SOUL'), on_top('dialog', 'story_phantom_after_list: the seventh list')]},
    {'name': 'story_whole_page_signed', 'note': 'E7: whole_page at the hearth: the page signed, and Mira reads the name, Nox (story)',
     'steps': [READY, NEW, flags(PAGE, KEYS), warp('ep7_palehaven', 31, 7, 'down'),            # whole_page runs on entry
               until_line('^Nox\\.$'), on_top('dialog', 'story_whole_page_signed: the name')]},
    {'name': 'story_doors_reopen', 'note': "E7: doors_reopen at dawn: the White Road letter's address come back, TESS, AT WILLOWMERE (story)",
     'steps': [READY, NEW, flags(REOPEN, KEYS), warp('ep7_palehaven', 31, 7, 'down'),          # doors_reopen runs on entry
               until_line('TESS, AT WILLOWMERE'), on_top('dialog', 'story_doors_reopen: the letter')]},
    {'name': 'story_ep7_ending', 'note': 'E7: ep7_ending, the broken roof at night: the stair of written light unrolls (story)',
     'steps': [READY, NEW, flags(ENDING, KEYS), warp('ep7_stillheart', 16, 15, 'up'),          # ep7_ending runs on entry
               until_line('a stair of written light'), on_top('dialog', 'story_ep7_ending: the stair')]},
    {'name': 'ui_title_ep7', 'note': 'E7: the title with an Episode 6 finish in slot 0: the Episode 7 row offered, its help line beside it',
     'steps': [READY,
               {'eval': "(async () => { await LQ_DEBUG.newGameEp7('Arden', { slot: 0, scene: 'none' }); const g = LQ_ENGINE.game; "
                        "for (const f of ['ep7_started', 'ep7_morning_done']) delete g.flags[f]; "
                        "const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 36000, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) }; "
                        "LQ_ENGINE.save.save(0, JSON.parse(JSON.stringify(g)), meta); LQ_ENGINE.game = null; LQ_ENGINE.reset('title'); return true; })()", 'timeout': 120000},
               {'waitFor': "LQ_DEBUG.scene() === 'title' && !!LQ_ENGINE.scene.menu && ((LQ_ENGINE.scene.quickStarts && LQ_ENGINE.scene.quickStarts().includes('ep7')) || LQ_ENGINE.scene.menu.items.some(i => i.id === 'ep7'))", 'timeout': 60000},
               {'eval': "(() => { const s = LQ_ENGINE.scene; if (s.showQuickStart) s.showQuickStart('ep7'); return true; })()"},
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
