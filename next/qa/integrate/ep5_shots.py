"""Episode 5 shots for qa/shots.json (E5-integrate, docs/EPISODE5_PLAN.md 12, docs/briefs/E5-integrate.md item 4).

Appends the twenty Episode 5 shots of plan 12 to next/qa/shots.json (append only: a shot whose name is already there is left
alone; --replace rewrites these twenty in place). Writes the file back with LF line ends. Then render them with:

    python next/qa/integrate/ep5_shots.py [--replace]
    python next/qa/shots.py --only "<the names it prints>" --device all --timeout 3000

Every shot carries `?pack=ep4,ep5&ep=5` (the developer entry: both packs forced on), so it renders the same before and after
EP5_LIVE is flipped; the one scene that reads the switch (ep5_morning) has the story's GATE opened by the shot itself. Story and
field shots start from LQ_DEBUG.newGameEp5 (the Lv 21 quick-start party, slot 0 on the shots' empty storage), set the story
flags a save would hold at that point, warp, and run the scene (or let the map's enter trigger run it) until the named line is
on screen. Hours are set with LQ_DEBUG.setHour and stones Shoved with LQ_DEBUG.shoveCaster (the field's own rules: the sweep,
the refusal). Battle shots use LQ_DEBUG.battle on the Episode 5 encounters and step the fight until the state worth showing
(the night sky, the Turn, a pinned foretelling, the False Futures) is on screen.
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'
QUERY = '&pack=ep4,ep5&ep=5'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp5')", 'timeout': 60000}
NEW = {'call': 'newGameEp5', 'args': ['Arden', {'slot': 0, 'scene': 'none'}], 'timeout': 60000}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
MORNING = ['ep5_morning_done', 'ep5_started']
SHIP = MORNING + ['ship_boarded', 'ship_arrived']
ROAD = SHIP + ['bram_asked', 'bram_told', 'ship_first_fight_done', 'road_landed', 'saw_glass_flat']
HAVEN = ROAD + ['tent_rested', 'saw_haven', 'haven_arrived']
SEL = HAVEN + ['met_sel', 'moonwell_seen']
LAB = SEL + ['star_reading_done', 'sky_learned', 'gnomon_get', 'lab_entered', 'lab_f1_arrived']
F2 = LAB + ['sel_memory_1', 'plate_f1_open', 'sun_key_found', 'lab_f1_done', 'lab_f2_arrived', 'sel_memory_2']
F3 = F2 + ['vex_gallery_met', 'fifth_list_get', 'star_restored', 'knight_tried', 'knight_defeated', 'lab_f2_done', 'lab_f3_arrived', 'sel_walked_in']
PAGE = F3 + ['landing_shelter', 'landing_truth', 'landing_return']
EYE = PAGE + ['sel_memory_3', 'oracle_door_open', 'oracle_tried', 'oracle_defeated']
CHART = EYE + ['chart_restored', 'fragment5_get']
RESTORED = CHART + ['roads_returned', 'haven_restored']
KEYS = {'gnomon': 1, 'star_letter': 1}


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


def hour(h):
    """The floor's hour as a dial sets it (the sweep and any pan to far sand), waited out."""
    return {'eval': "(async () => { const s = await LQ_DEBUG.setHour(" + json.dumps(h) + "); "
                    "for (let i = 0; i < 200; i++) { await new Promise((r) => setTimeout(r, 40)); const d = LQ_DEBUG.shade(); "
                    "if (d && !d.busy && d.anim == null && LQ_DEBUG.scene() === 'field') return d.hour; } throw new Error('the hour never settled'); })()",
            'timeout': 20000}


def shove(ent_id, d):
    return {'eval': "(async () => { const v = await LQ_DEBUG.shoveCaster(" + json.dumps(ent_id) + ", " + json.dumps(d) + "); "
                    "if (!v || !v.ok) throw new Error('the Shove was refused: ' + JSON.stringify(v && v.why)); return v.to; })()",
            'timeout': 20000}


def battle_until(cond):
    """Step a debug battle until `cond` (JS over `s`, the battle scene, and `b`, its debug state) holds while the command menu is
    open; Defend on the way."""
    js = ("(() => { for (let i = 0; i < 8000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
          "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
          f"if (open && ({cond})) return i; "
          "if (open) LQ_DEBUG.battleAct({ type: 'defend' }); "
          "LQ_DEBUG.advance(5); } return -1; })()")
    return {'eval': js}


def level(n):
    return {'eval': f"(() => {{ for (const m of LQ_ENGINE.game.party) m.level = {n}; return true; }})()"}


# The Sand Oracle into phase 2 (the False Futures): the blow that crosses 72% (ep5_autobattle.py stages it the same way).
ORACLE_TO_FUTURES = (
    "(() => { const O = () => LQ_ENGINE.scene.b.units().find(u => u.alive && u.id === 'oracle'); "
    "for (let i = 0; i < 12000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
    "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
    "if (!open) { LQ_DEBUG.advance(5); continue; } "
    "if (s.b.units().some(u => u.alive && /^future_/.test(u.id))) return i; "
    "const o = O(); if (!o) return -3; o.hp = Math.min(o.hp, Math.floor(o.maxHp * 0.725)); "
    "LQ_DEBUG.battleAct({ type: 'attack', target: o.uid }); LQ_DEBUG.advance(5); } return -1; })()")

SHOTS = [
    {'name': 'story_ep5_morning_letter', 'note': 'E5: ep5_morning, the star letter close-up at the Floodwatch Inn: three names last night, two this morning (story)',
     'steps': [READY, {'eval': "(async () => { (await import('./src/data/ep5/story.js')).GATE.live = true; return true; })()"},
               {'call': 'newGameEp5', 'args': ['Arden', {'slot': 0}], 'timeout': 60000}, until_line('Last night it had three names'),
               on_top('dialog', 'story_ep5_morning_letter: Mira reads the letter')]},
    {'name': 'story_ship_bram', 'note': "E5: ship_bram, Bram at the bow of the Saffron Wind at night: the first truth choice (story)",
     'steps': [READY, NEW, flags(SHIP, KEYS), warp('ep5_ship', 20, 6, 'right'), {'frames': 160}, scene('ship_bram'),
               until_line("Mira won't tell me whose name went"), on_top('dialog', 'story_ship_bram: Bram asks')]},
    {'name': 'battle_ship_first_night', 'note': 'E5: the deck fight under a Night sky: both sun-things Exposed, the Turn marker 4 actions away',
     'steps': [READY, NEW, {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['e5s_first', {'seed': 1, 'noElite': True, 'canFlee': False}]}, {'advance': 60},
               battle_until("s.b.state.sky && s.b.state.sky.sky === 'night'"), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.state.sky.sky === 'night'", 'message': 'the sky is night'}]},
    {'name': 'battle_sky_turn', 'note': 'E5: the deck fight after the Turn: Day, the foes glowing gold and Ascendant',
     'steps': [READY, NEW, {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['e5s_first', {'seed': 1, 'noElite': True, 'canFlee': False}]}, {'advance': 60},
               battle_until("s.b.state.sky && s.b.state.sky.turns >= 1"), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.state.sky.sky === 'day'", 'message': 'the sky has turned to day'}]},
    {'name': 'field_ep5_glass_flat_noon', 'note': 'E5: the Caravan Road, the Glass Flat at noon: running sand, the dial, the obelisk and its short shadow',
     'steps': [READY, NEW, flags(ROAD, KEYS), warp('ep5_caravan_road', 16, 12, 'right'), {'frames': 260},
               {'assert': "LQ_DEBUG.shade().hour === 'noon'", 'message': 'noon on the flat'}]},
    {'name': 'field_ep5_glass_flat_dawn', 'note': "E5: the Glass Flat at dawn: the obelisk's long shadow lies across the flat, the bridge",
     'steps': [READY, NEW, flags(ROAD, KEYS), warp('ep5_caravan_road', 16, 12, 'right'), {'frames': 200}, hour('dawn'), {'frames': 60},
               {'assert': "LQ_DEBUG.shade().hour === 'dawn'", 'message': 'dawn on the flat'}]},
    {'name': 'field_ep5_saffron_dusk', 'note': 'E5: Saffron Haven at dusk: the oasis, copper domes, the armillary turning over it all',
     'steps': [READY, NEW, flags(SEL, KEYS), warp('ep5_saffron', 21, 20, 'up'), {'frames': 260},
               on_top('field', 'field_ep5_saffron_dusk: the field is on top')]},
    {'name': 'story_star_reading', 'note': 'E5: star_reading, the prophecy rises in the Armillary Tower: WHEN THE LAST NIGHT TURNS (story)',
     'steps': [READY, NEW, flags(SEL, KEYS), warp('ep5_sh_observatory', 9, 12, 'up'), {'frames': 160}, scene('star_reading'),
               until_line('WHEN THE LAST NIGHT TURNS'), on_top('dialog', 'story_star_reading: Nasrin reads it')]},
    {'name': 'field_ep5_lab_f1_shove', 'note': "E5: F1 the Groove: the stone Shoved up its groove, dawn: its long shadow west along the corridor",
     'steps': [READY, NEW, flags(LAB, KEYS), warp('ep5_lab_f1', 30, 8, 'up'), {'frames': 200}, shove('ss_c', 'up'), {'frames': 20},
               {'eval': "(async () => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); f.leader.setPos(30, 7, 'up'); return true; })()"},
               shove('ss_c', 'up'), hour('dawn'), {'frames': 60},
               {'assert': "LQ_DEBUG.shade().pos.ss_c === '30,4' && LQ_DEBUG.shade().hour === 'dawn'", 'message': 'the stone is home at the top and the hour is dawn'}]},
    {'name': 'field_ep5_lab_f2_shafts', 'note': 'E5: F2 Gallery of False Horizons at dawn: the window shafts across the long hall, light the barrier',
     'steps': [READY, NEW, flags(F2, KEYS), warp('ep5_lab_f2', 13, 17, 'up'), {'frames': 260},
               {'assert': "LQ_DEBUG.shade().hour === 'dawn'", 'message': 'dawn in the gallery'}]},
    {'name': 'story_vex_gallery', 'note': "E5: vex_gallery, Vex on the star floor, moving the hero's star into a painted horizon (story)",
     'steps': [READY, NEW, flags(F2, KEYS), warp('ep5_lab_f2', 21, 6, 'right'), {'frames': 160}, scene('vex_gallery'),
               until_line('Every night it looks for you'), on_top('dialog', 'story_vex_gallery: Vex speaks')]},
    {'name': 'battle_mirage_knight', 'note': 'E5: the Mirage Knight, its mirror shield showing the other sky',
     'steps': [READY, NEW, level(23), {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['mirage_knight', {'seed': 3, 'canFlee': False}]}, {'advance': 60},
               battle_until("b.round >= 2"), {'advance': 4},
               {'assert': "LQ_DEBUG.scene() === 'battle'", 'message': 'in the fight'}]},
    {'name': 'field_ep5_lab_f3_lamps', 'note': 'E5: F3 the Well of Tomorrow at night: the Shelter landing, a sun-lamp on its rail, the dark moat',
     'steps': [READY, NEW, flags(F3, KEYS), warp('ep5_lab_f3', 12, 11, 'right'), {'frames': 260},
               on_top('field', 'field_ep5_lab_f3_lamps: the field is on top')]},
    {'name': 'story_sel_memory_3_page', 'note': "E5: sel_memory_3, Ishra's page under the last spring: The future is not a single answer (story)",
     'steps': [READY, NEW, flags(PAGE, KEYS), warp('ep5_lab_f3', 14, 32, 'down'), {'frames': 160}, scene('sel_memory_3'),
               until_line('The future is not a single answer'), on_top('dialog', 'story_sel_memory_3_page: Sel reads it')]},
    {'name': 'battle_oracle_prophecy', 'note': "E5: the Sand Oracle reads the Last Prophecy: a foretelling pinned to the Turn marker",
     'steps': [READY, NEW, flags(['sky_learned']), level(24), {'eval': 'LQ_DEBUG.setSpeed(0)'},
               {'call': 'battle', 'args': ['oracle', {'seed': 6, 'canFlee': False}]}, {'advance': 60},
               battle_until("s.b.state.sky && !!s.b.state.sky.pinned"), {'advance': 4},
               {'assert': "!!LQ_ENGINE.scene.b.state.sky.pinned", 'message': 'a foretelling is pinned'}]},
    {'name': 'battle_oracle_futures', 'note': 'E5: the Sand Oracle, phase 2: the Mirage Veil and the two False Futures',
     'steps': [READY, NEW, flags(['sky_learned']), level(24), {'eval': 'LQ_DEBUG.setSpeed(0)'},
               {'call': 'battle', 'args': ['oracle', {'seed': 6, 'canFlee': False}]}, {'advance': 60},
               {'eval': ORACLE_TO_FUTURES}, {'advance': 90},
               {'assert': "LQ_ENGINE.scene.b.units().some(u => u.alive && /^future_/.test(u.id))", 'message': 'the Futures are up'}]},
    {'name': 'story_oracle_after_chart', 'note': 'E5: oracle_after, the Star Chart restored: twenty years of struck stars light again (story)',
     'steps': [READY, NEW, flags(EYE, KEYS), warp('ep5_lab_oracle', 11, 17, 'up'),         # oracle_after runs on entry
               until_line('Twenty years of struck stars'), on_top('dialog', 'story_oracle_after_chart: the chart lights')]},
    {'name': 'story_every_road', 'note': "E5: every_road, dawn at the north gate: a caravan walks in, and Yara knows its leader (story)",
     'steps': [READY, NEW, flags(CHART, KEYS), warp('ep5_saffron', 21, 6, 'down'),          # every_road runs on entry
               until_line(r'\.\.\.Father\?'), on_top('dialog', 'story_every_road: Yara speaks')]},
    {'name': 'story_ep5_ending', 'note': 'E5: ep5_ending, the freed armillary writes a road over the Haven: A LIBRARY ABOVE THE CLOUDS (story)',
     'steps': [READY, NEW, flags(RESTORED, KEYS), warp('ep5_saffron', 21, 10, 'up'), {'frames': 160}, scene('ep5_ending'),
               until_line('A LIBRARY ABOVE THE CLOUDS'), on_top('dialog', 'story_ep5_ending: Laleh reads it')]},
    {'name': 'ui_title_ep5', 'note': 'E5: the title with an Episode 4 finish in slot 0: the Episode 5 row offered, its help line beside it',
     'steps': [READY,
               {'eval': "(async () => { await LQ_DEBUG.newGameEp5('Arden', { slot: 0, scene: 'none' }); const g = LQ_ENGINE.game; "
                        "const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 36000, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) }; "
                        "LQ_ENGINE.save.save(0, JSON.parse(JSON.stringify(g)), meta); LQ_ENGINE.game = null; LQ_ENGINE.reset('title'); return true; })()", 'timeout': 60000},
               {'waitFor': "LQ_DEBUG.scene() === 'title' && LQ_ENGINE.scene.menu && LQ_ENGINE.scene.menu.items.some((i) => i.id === 'ep5')", 'timeout': 30000},
               {'eval': "(() => { const m = LQ_ENGINE.scene.menu; m.index = m.items.findIndex((i) => i.id === 'ep5'); return m.index; })()"},
               {'frames': 90}]},
]
for _s in SHOTS:
    _s['query'] = QUERY


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--replace', action='store_true', help='rewrite these shots if they are already in shots.json')
    a = ap.parse_args()
    raw = SPEC.read_bytes()
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
    SPEC.write_bytes((json.dumps(spec, indent=1, ensure_ascii=True) + '\n').encode('utf-8'))     # LF, as the file is
    print(f'added {len(added)}: {", ".join(added) or "-"}; replaced {len(replaced)}')
    print('--only ' + ','.join(s['name'] for s in SHOTS))


if __name__ == '__main__':
    main()
