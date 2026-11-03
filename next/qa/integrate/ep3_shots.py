"""Episode 3 shots for qa/shots.json (E3-integrate, docs/briefs/E3-integrate.md item 4).

Appends the fifteen Episode 3 shots to next/qa/shots.json (append only: a shot whose name is already there is left alone;
--replace rewrites those fifteen in place). Then render them with:

    python next/qa/integrate/ep3_shots.py [--replace]
    python next/qa/shots.py --only "<the names it prints>" --device all --timeout 3000

Every story and field shot starts from LQ_DEBUG.newGameEp3 (the Lv 13 quick-start party, slot 0 on the shots' empty
storage), sets the story flags a save would hold at that point, warps, and runs the scene (or lets the map's enter trigger
run it) until the named line is on screen. Battle shots use LQ_DEBUG.battle on the Episode 3 encounters (the zone's
party, Tempered Oath known in the Foundry) and step the fight with Defend until the state worth showing is on screen.
Until EP3_LIVE is flipped, run shots.py with LQ_EP3_LIVE=1 (qa/shots.py serves episodes.js with the switch on).
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp3')", 'timeout': 20000}
NEW = {'call': 'newGameEp3', 'args': ['Arden', {'slot': 0, 'scene': 'none'}]}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
MORNING = ['ep3_morning_done', 'ep3_started']
ROAD = MORNING + ['sand_gate_open', 'sand_road_arrived']
ROAD2 = ROAD + ['sand_first_fight_done', 'saw_slag', 'carters_rested', 'saw_emberpeak']
TOWN = ROAD2 + ['pk_arrived', 'met_veyra', 'saw_memorial']
F1 = TOWN + ['met_ilya', 'foundry_open', 'forge_relit', 'foundry_entered', 'foundry_f1_arrived', 'bram_memory_1']
F2 = F1 + ['lift_wheel_lit', 'lift_wheel_seen', 'crucible_hook_found', 'ash_key_f1', 'foundry_f1_done', 'foundry_f2_arrived', 'bram_memory_2']
F3 = F2 + ['bellows_specter_tried', 'bellows_specter_defeated', 'foundry_f2_done', 'foundry_f3_arrived']
OATHS = F3 + ['vex_furnace_met', 'oath_hand', 'oath_heart', 'oath_home']
GATE = OATHS + ['bram_memory_3', 'mara_read', 'bell_gate_open']
WARDEN = GATE + ['cinder_warden_tried', 'cinder_warden_defeated']
NAMED = WARDEN + ['clapper_get', 'garrick_named', 'mara_named', 'leaf_get']
RESTORED = NAMED + ['first_bell_rung', 'pk_restored']


def flags(names, extra_items=None):
    """Set the story flags; every field remark (BARKS) counts as heard, as it would be by this point of a playthrough."""
    items = ' '.join(f'g.items[{json.dumps(k)}] = {v};' for k, v in (extra_items or {}).items())
    return {'eval': "(async () => { const g = LQ_ENGINE.game; for (const f of " + json.dumps(names) + ") g.flags[f] = true; " + items
            + " const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1; return true; })()"}


def warp(map_id, x, y, d='down'):
    return {'call': 'warp', 'args': [map_id, x, y, d], 'timeout': 20000}


def scene(scene_id):
    return {'eval': f"(() => {{ LQ_DEBUG.call('scene', {json.dumps(scene_id)}); return true; }})()"}


def until_line(pattern, timeout=60000):
    """Advance the running scene's dialogue (confirm on finished pages, choices, title cards) until a page matching
    `pattern` is fully typed."""
    js = ("(async () => { const rx = new RegExp(" + json.dumps(pattern) + "); "
          "for (let i = 0; i < 1500; i++) { const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { if (!s.typing && rx.test(s.pageText || '')) return i; if (!s.typing || i % 4 === 0) LQ_DEBUG.press('confirm', 1); } "
          "else if (s && (s.name === 'choice' || s.name === 'titleCard')) LQ_DEBUG.press('confirm', 1); "
          "await new Promise(r => setTimeout(r, 40)); } "
          "throw new Error('the line never showed: ' + rx); })()")
    return {'eval': js, 'timeout': timeout}


def on_top(name, why):
    return {'assert': f"LQ_DEBUG.scene() === {json.dumps(name)}", 'message': why}


def turn(sluice):
    """Turn a sluice as the player does: the first confirm reads the paddle's text (closed here), the next one turns it.
    turnSluice is fired and forgotten (it resolves after the paddle animation, which waits on frames the step would block)."""
    js = ("(async () => { const id = " + json.dumps(sluice) + "; const q = () => { const d = LQ_DEBUG.quench(); return d && d.sluices ? d.sluices.find((x) => x.startsWith(id + '@')) : null; }; "
          "const before = q(); LQ_DEBUG.turnSluice(id); let read = false; "
          "for (let i = 0; i < 150; i++) { await new Promise((r) => setTimeout(r, 40)); const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { read = true; LQ_DEBUG.press('confirm', 1); continue; } "
          "const now = q(); if (now && now !== before) return now; if (read && now) { read = false; LQ_DEBUG.turnSluice(id); } } "
          "throw new Error('the sluice never turned: ' + id); })()")
    return {'eval': js, 'timeout': 20000}


def battle_until(cond, act='defend'):
    """Step a debug battle until `cond` (JS over `s`, the battle scene) holds while the command menu is open. Each party turn
    on the way: Defend, or `act` = 'oath' (Bram's Tempered Oath when it is his turn, Defend for the others)."""
    pick = ("(u && u.id === 'bram' && !(u.statuses && u.statuses.oath)) ? { type: 'skill', skill: 'tempered_oath', target: u.uid } : { type: 'defend' }"
            if act == 'oath' else "{ type: 'defend' }")
    js = ("(() => { for (let i = 0; i < 8000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
          "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
          f"if (open && ({cond})) return i; "
          f"if (open) {{ const u = s.b.current(); LQ_DEBUG.battleAct({pick}); }} "
          "LQ_DEBUG.advance(5); } return -1; })()")
    return {'eval': js}


SHOTS = [
    {'name': 'field_sand_road_slag', 'note': 'E3: the Old Sand Road, the paddle turned: the stream crosses the slag river and the cooling front runs north and south',
     'steps': [READY, NEW, flags(ROAD2), warp('sand_road', 16, 21, 'left'), {'frames': 240}, turn('sl_road'), {'frames': 40},
               {'assert': "((LQ_ENGINE.game.quenched || {}).sand_road || []).length > 0", 'message': 'the slag river is cooling'}]},
    {'name': 'field_emberpeak_square', 'note': 'E3: Emberpeak, Bellows Square under the ash: the memorial with its plates, the coolant station, the foundry face',
     'steps': [READY, NEW, flags(TOWN + ['met_ilya', 'foundry_open']), warp('emberpeak', 17, 17, 'up'), {'frames': 260},
               on_top('field', 'field_emberpeak_square: the field is on top')]},
    {'name': 'field_foundry_f1_quench', 'note': 'E3: F1 Slag Hall, sl_b turned: water down the trough, the east pool crusting (snap -start: the west pool cooled at load)',
     'steps': [READY, NEW, flags(F1), warp('foundry_f1', 20, 19, 'up'), {'frames': 260}, {'snap': 'start'}, turn('sl_b'), {'frames': 50},
               {'assert': "((LQ_ENGINE.game.quenched || {}).foundry_f1 || []).length > 0", 'message': 'crust on F1'}]},
    {'name': 'field_foundry_f2_hot_gate', 'note': 'E3: F2 Bell Gallery, sl_g turned: bs_b2 full and the hot grate hg_b2 opening in steam',
     'steps': [READY, NEW, flags(F2), warp('foundry_f2', 8, 8, 'up'), {'frames': 260}, turn('sl_g'), {'frames': 70}]},
    {'name': 'field_foundry_f3_dark', 'note': 'E3: F3 hub at dark 0.5, the slag the only light, the Bell Gate with no oath struck',
     'steps': [READY, NEW, flags(F3), warp('foundry_f3', 21, 17, 'up'), {'frames': 260},
               on_top('field', 'field_foundry_f3_dark: the field is on top')]},
    {'name': 'story_ep3_morning', 'note': 'E3: ep3_morning, the Smith by the guest-room table, Bram reaching for the name (story)',
     'steps': [READY, {'call': 'newGameEp3', 'args': ['Arden', {'slot': 0}]}, until_line("Dad, I can't"), on_top('dialog', 'story_ep3_morning: Bram speaks')]},
    {'name': 'story_vex_furnace', 'note': 'E3: vex_furnace, Vex unburned on the furnace ledge (story)',
     'steps': [READY, NEW, flags(F3 + ['oath_heart']), warp('foundry_f3', 40, 6, 'up'), {'frames': 200}, scene('vex_furnace'),
               until_line('I burn excuses'), on_top('dialog', 'story_vex_furnace: Vex speaks')]},
    {'name': 'story_bram_memory_3', 'note': 'E3: bram_memory_3, the founder\'s stamp under the ash on the Bell Gate (story)',
     'steps': [READY, NEW, flags(OATHS), warp('foundry_f3', 21, 15, 'up'), {'frames': 200}, scene('bram_memory_3'),
               until_line('Her name is Mara'), on_top('dialog', 'story_bram_memory_3: Bram reads the name')]},
    {'name': 'battle_heat_pips', 'note': 'E3: the sand road teaching fight, the Cinder Beetle stoked: its Heat pips on the foe row',
     'steps': [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['sr_first', {'fresh': True, 'seed': 1, 'noElite': True}]}, {'advance': 60},
               battle_until("s.b.units().some((u) => u.side === 'enemy' && u.alive && u.heat > 0)"), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.units().some((u) => u.side === 'enemy' && u.heat > 0)", 'message': 'a foe has Heat'}]},
    {'name': 'battle_bellows_specter', 'note': 'E3: the Bellows Specter, stoked twice, its Heat showing',
     'steps': [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['bellows_specter', {'fresh': True, 'seed': 2}]}, {'advance': 60},
               battle_until("s.b.units().some((u) => u.boss && u.alive && u.heat >= 2)"), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.units().some((u) => u.boss && u.heat >= 2)", 'message': 'the Specter is hot'}]},
    {'name': 'battle_warden_oath', 'note': 'E3: the Cinder Warden, Bram under Tempered Oath (the oath ring on his row)',
     'steps': [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['cinder_warden', {'fresh': True, 'seed': 3}]}, {'advance': 60},
               battle_until("s.b.units().some((u) => u.id === 'bram' && u.statuses && u.statuses.oath)", act='oath'), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.units().some((u) => u.id === 'bram' && u.statuses && u.statuses.oath)", 'message': 'Bram holds the oath'}]},
    {'name': 'story_warden_after', 'note': 'E3: warden_after, the leaf reforged: Bram says his father\'s name (story)',
     'steps': [READY, NEW, flags(WARDEN), warp('foundry_heart', 12, 12, 'up'),           # warden_after runs on entry
               until_line('^Garrick\\.$'), on_top('dialog', 'story_warden_after: Bram says the name')]},
    {'name': 'story_first_bell', 'note': 'E3: first_bell, the town gathered under the bell tower, Rusk calls the name (story)',
     'steps': [READY, NEW, flags(NAMED), warp('emberpeak', 19, 8, 'down'),               # first_bell runs on entry
               until_line('Watch of Emberpeak says'), on_top('dialog', 'story_first_bell: Rusk speaks')]},
    {'name': 'story_ep3_ending', 'note': 'E3: ep3_ending, Emberpeak at night, the courier with the running seal (story)',
     'steps': [READY, NEW, flags(RESTORED), warp('emberpeak', 5, 13, 'down'), {'frames': 160}, scene('ep3_ending'),
               until_line('The seal won'), on_top('dialog', 'story_ep3_ending: the courier speaks')]},
    {'name': 'ui_title_ep3', 'note': 'E3: the title with an Episode 2 finish in slot 0: the Episode 3 row offered (EP3_LIVE)',
     'steps': [READY,
               {'eval': "(() => { LQ_DEBUG.newGameEp3('Arden', { slot: 0, scene: 'none' }); const g = LQ_ENGINE.game; "
                        "const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 21600, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) }; "
                        "LQ_ENGINE.save.save(0, JSON.parse(JSON.stringify(g)), meta); LQ_ENGINE.game = null; LQ_ENGINE.reset('title'); return true; })()"},
               {'waitFor': "LQ_DEBUG.scene() === 'title' && ((LQ_DEBUG.state().sceneState || {}).items || []).includes('ep3')", 'timeout': 20000},
               {'frames': 90}]},
]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--replace', action='store_true', help='rewrite these shots if they are already in shots.json')
    a = ap.parse_args()
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
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
    SPEC.write_text(json.dumps(spec, indent=1, ensure_ascii=True) + '\n', encoding='utf-8')
    print(f'added {len(added)}: {", ".join(added) or "-"}; replaced {len(replaced)}')
    print('--only ' + ','.join(s['name'] for s in SHOTS))


if __name__ == '__main__':
    main()
