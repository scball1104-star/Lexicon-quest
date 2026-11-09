"""Episode 4 shots for qa/shots.json (E4-integrate, docs/EPISODE4_PLAN.md 12, docs/briefs/E4-integrate.md item 4).

Appends the eighteen Episode 4 shots of plan 12 to next/qa/shots.json (append only: a shot whose name is already there is
left alone; --replace rewrites these eighteen in place). Then render them with:

    python next/qa/integrate/ep4_shots.py [--replace]
    python next/qa/shots.py --only "<the names it prints>" --device all --timeout 3000

Every shot carries `?pack=ep4&ep=4` (the developer entry: the pack is forced on and the story's switch opens), so it renders
the same before and after EP4_LIVE is flipped. Story and field shots start from LQ_DEBUG.newGameEp4 (the Lv 17 quick-start
party, slot 0 on the shots' empty storage), set the story flags a save would hold at that point, warp, and run the scene (or
let the map's enter trigger run it) until the named line is on screen. Wheels turn as the player turns them (the first turn
reads the wheel's text). Battle shots use LQ_DEBUG.battle on the Episode 4 encounters and step the fight until the state
worth showing is on screen.
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'
QUERY = '&pack=ep4&ep=4'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp4')", 'timeout': 30000}
NEW = {'call': 'newGameEp4', 'args': ['Arden', {'slot': 0, 'scene': 'none'}]}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
MORNING = ['ep4_morning_done', 'ep4_started']
ROAD = MORNING + ['east_road_open', 'flood_road_arrived', 'flood_first_fight_done', 'saw_flood_lane']
ROAD2 = ROAD + ['ferry_rested', 'saw_valewyn']
TOWN = ROAD2 + ['vw_arrived', 'saw_statue']
KEEP = TOWN + ['met_regent', 'lyra_truth', 'met_joss', 'keep_ferry_open', 'keep_entered', 'keep_f1_arrived']
F2 = KEEP + ['lyra_memory_1', 'seal_key_found', 'tidegate_open', 'keep_f1_done', 'keep_f2_arrived', 'lyra_memory_2']
F3 = F2 + ['vex_archive_met', 'barrister_tried', 'barrister_defeated', 'keep_f2_done', 'keep_f3_arrived']
GATE = F3 + ['principle_voice', 'principle_truth', 'principle_mercy', 'lyra_memory_3', 'petition_gate_open']
WON = GATE + ['hero_signed', 'paper_regent_tried', 'paper_regent_defeated']
NAMED = WON + ['lyra_named', 'charter_restored', 'fragment4_get']
RESTORED = NAMED + ['tide_bell_rung', 'vw_restored']
CRANK = {'lock_crank': 1}


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


def turn(wheel):
    """Turn a lock wheel as the player does: the first turn reads the wheel's text (closed here), then the water moves.
    turnWheel is fired and forgotten; the step waits until the basin's level has changed and the bands have settled."""
    js = ("(async () => { const id = " + json.dumps(wheel) + "; const lv = () => { const t = LQ_DEBUG.tide(); return t && t.active ? JSON.stringify(t.levels) : null; }; "
          "const before = lv(); LQ_DEBUG.turnWheel(id); "
          "for (let i = 0; i < 200; i++) { await new Promise((r) => setTimeout(r, 40)); const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { if (!s.typing) LQ_DEBUG.press('confirm', 1); continue; } "
          "const t = LQ_DEBUG.tide(); if (t && lv() !== before && !t.busy && t.anim == null) return t.levels; } "
          "throw new Error('the wheel never turned: ' + id); })()")
    return {'eval': js, 'timeout': 20000}


def battle_until(cond):
    """Step a debug battle until `cond` (JS over `s`, the battle scene) holds while the command menu is open; Defend on the way."""
    js = ("(() => { for (let i = 0; i < 8000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
          "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
          f"if (open && ({cond})) return i; "
          "if (open) LQ_DEBUG.battleAct({ type: 'defend' }); "
          "LQ_DEBUG.advance(5); } return -1; })()")
    return {'eval': js}


# The Paper Regent into phase 3 as ep4_autobattle.py stages it (the blow over 70%, both writs struck at 1 HP), then Defend until
# Strike from the Roll is announced on the hero with the hero to act; then the hero Answers it.
REGENT_TO_ANSWER = (
    "(() => { const s0 = LQ_ENGINE.scene; const R = () => s0.b.units().find(u => u.alive && u.id === 'paper_regent'); "
    "for (let i = 0; i < 12000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
    "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
    "if (!open) { LQ_DEBUG.advance(5); continue; } "
    "const r = R(); if (!r) return -3; const ph = r.ai.phase || 0; "
    "const writs = s.b.units().filter(u => u.alive && /^writ_/.test(u.id)); "
    "if (ph === 0) { r.hp = Math.floor(r.maxHp * 0.705); LQ_DEBUG.battleAct({ type: 'attack', target: r.uid }); } "
    "else if (writs.length) { writs.forEach(w => { w.hp = 1; }); LQ_DEBUG.battleAct({ type: 'attack', target: writs[0].uid }); } "
    "else if ([...s.telegraphs.values()].some(t => t.skill === 'strike_roll') && b.current === 'hero') { "
    "  const h = s.b.unit('hero'); h.mp = Math.max(h.mp, 30); r.hp = r.maxHp; LQ_DEBUG.battleAct({ type: 'skill', skill: 'answer', target: r.uid }); return i; } "
    "else LQ_DEBUG.battleAct({ type: 'defend' }); "
    "LQ_DEBUG.advance(5); } return -1; })()")

SHOTS = [
    {'name': 'field_ep4_flood_lane_mid', 'note': 'E4: the Flood Road, the drowned lane at mid: the road under water, the punt floating by the sluice wheel',
     'steps': [READY, NEW, flags(ROAD), warp('ep4_flood_road', 13, 13, 'right'), {'frames': 260},
               on_top('field', 'field_ep4_flood_lane_mid: the field is on top')]},
    {'name': 'field_ep4_flood_lane_low', 'note': 'E4: the drowned lane drained (wh_lane to low): the road walks on east, the punt sits in the ditch',
     'steps': [READY, NEW, flags(ROAD), warp('ep4_flood_road', 13, 13, 'right'), {'frames': 200}, turn('wh_lane'), {'frames': 60},
               {'assert': "LQ_DEBUG.tide().levels.l === 0", 'message': 'the lane is low'}]},
    {'name': 'field_ep4_valewyn_plaza', 'note': 'E4: Valewyn, the Drowned Crown Plaza in the rain: the faceless statue, the flood board, the canals',
     'steps': [READY, NEW, flags(TOWN + ['met_regent']), warp('ep4_valewyn', 21, 22, 'up'), {'frames': 260},
               on_top('field', 'field_ep4_valewyn_plaza: the field is on top')]},
    {'name': 'field_ep4_keep_f1_papered_high', 'note': 'E4: F1 Tidegate Causeway, basin a at high: the water over the papered door, the forged seal washing off in red',
     'steps': [READY, NEW, flags(KEEP, CRANK), warp('ep4_keep_f1', 16, 17, 'left'), {'frames': 200}, turn('wh_a'), turn('wh_a'), {'frames': 30},
               {'assert': "LQ_DEBUG.tide().levels.a === 2", 'message': 'basin a is high'}]},
    {'name': 'field_ep4_keep_f1_pontoons_mid', 'note': 'E4: F1 the Pontoons at mid: the moored pontoons floating level with the walkways',
     'steps': [READY, NEW, flags(KEEP, CRANK), warp('ep4_keep_f1', 29, 13, 'up'), {'frames': 200}, turn('wh_b'), {'frames': 60},
               {'assert': "LQ_DEBUG.tide().levels.b === 1", 'message': 'basin b is mid'}]},
    {'name': 'field_ep4_keep_f2_stacks_high', 'note': 'E4: F2 Archives Below Water, the Stacks at high: book crates up to the gallery, lanterns on chains',
     'steps': [READY, NEW, flags(F2, CRANK), warp('ep4_keep_f2', 10, 16, 'down'), {'frames': 200}, turn('wh_a'), {'frames': 60},
               {'assert': "LQ_DEBUG.tide().levels.a === 2", 'message': 'the Stacks are high'}]},
    {'name': 'field_ep4_keep_f3_dark', 'note': 'E4: F3 Court of Witnesses, the hub at dark 0.3: the Petition Gate with no stone rung',
     'steps': [READY, NEW, flags(F3, CRANK), warp('ep4_keep_f3', 22, 15, 'up'), {'frames': 260},
               on_top('field', 'field_ep4_keep_f3_dark: the field is on top')]},
    {'name': 'story_ep4_morning', 'note': 'E4: ep4_morning, Ada at the Coal Lantern hearth with the decree that will not dry (story)',
     'steps': [READY, {'call': 'newGameEp4', 'args': ['Arden', {'slot': 0}]}, until_line('Three days on the road'),
               on_top('dialog', 'story_ep4_morning: Ada speaks')]},
    {'name': 'story_regent_hall', 'note': 'E4: regent_hall, the Regent at the long table, her ink sliding off the page (story)',
     'steps': [READY, NEW, flags(TOWN), warp('ep4_vw_palace', 9, 12, 'up'), {'frames': 160}, scene('regent_hall'),
               until_line('I write OPEN'), on_top('dialog', 'story_regent_hall: the Regent speaks')]},
    {'name': 'story_vex_archive', 'note': 'E4: vex_archive, Vex in the dry chair under the glass dome (story)',
     'steps': [READY, NEW, flags(F2, CRANK), warp('ep4_keep_f2', 29, 3, 'up'), {'frames': 160}, scene('vex_archive'),
               until_line('Four lists. One hand'), on_top('dialog', 'story_vex_archive: Vex speaks')]},
    {'name': 'story_witness_book', 'note': 'E4: witness_book, the hero signs the drowned Witness Book and the name holds (story)',
     'steps': [READY, NEW, flags(GATE, CRANK), warp('ep4_keep_f3', 22, 8, 'up'), {'frames': 160}, scene('witness_book'),
               until_line('It held. Down here'), on_top('dialog', 'story_witness_book: Mira reads the signature')]},
    {'name': 'battle_decree_pips', 'note': 'E4: the Flood Road teaching fight, the Ink Bloom stamped: its seal pips on the foe row',
     'steps': [READY, NEW, {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['e4r_first', {'seed': 1, 'noElite': True, 'canFlee': False}]}, {'advance': 60},
               battle_until("s.b.units().some((u) => u.side === 'enemy' && u.alive && u.heat > 0)"), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.units().some((u) => u.side === 'enemy' && u.heat > 0)", 'message': 'a foe has stamped'}]},
    {'name': 'battle_barrister', 'note': 'E4: the Inkbound Barrister, two seals stamped toward its Objection',
     'steps': [READY, NEW, {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['barrister', {'seed': 2, 'canFlee': False}]}, {'advance': 60},
               battle_until("s.b.units().some((u) => u.boss && u.alive && u.heat >= 2)"), {'advance': 4},
               {'assert': "LQ_ENGINE.scene.b.units().some((u) => u.boss && u.heat >= 2)", 'message': 'the Barrister is stamping'}]},
    {'name': 'battle_regent_answer', 'note': 'E4: the Paper Regent, phase 3: Strike from the Roll announced on the hero, the hero Answers it',
     'steps': [READY, NEW, flags(['hero_signed']), {'eval': 'LQ_DEBUG.setSpeed(0)'},
               {'eval': "(() => { for (const m of LQ_ENGINE.game.party) m.level = 20; return true; })()"},
               {'call': 'battle', 'args': ['paper_regent', {'seed': 5, 'canFlee': False}]}, {'advance': 60},
               {'eval': REGENT_TO_ANSWER}, {'advance': 30},
               {'assert': "LQ_DEBUG.scene() === 'battle'", 'message': 'still in the fight'}]},
    # The two keep stages a real fight had not shown (stages_11_5.md: seen only in mock_stage): an ordinary F1 fight on the
    # Tidegate Causeway and an F3 fight in the Court of Witnesses (scene.js moves the zone's backdrop to ep4_witness).
    {'name': 'battle_ep4_causeway', 'note': 'E4: an F1 Tidegate Causeway fight on its painted stage: the party and the Watch read clearly',
     'steps': [READY, NEW, {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['e4k1_watch', {'seed': 3, 'noElite': True, 'canFlee': False}]}, {'advance': 60},
               battle_until('true'), {'waitFor': "LQ_ENGINE.scene.name === 'battle' && LQ_ENGINE.scene.backdropLayer.usedAsset", 'timeout': 20000}, {'advance': 4},
               {'assert': "LQ_ENGINE.scene.name === 'battle' && LQ_ENGINE.scene.backdropLayer.key === 'ep4_keep' && LQ_ENGINE.scene.backdropLayer.usedAsset",'message': 'the Causeway stage is up'}]},
    {'name': 'battle_ep4_witness', 'note': 'E4: an F3 Court of Witnesses fight on its own painted stage, the Decrees pack stamping',
     'steps': [READY, NEW, {'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['e4k3_decrees', {'seed': 4, 'noElite': True, 'canFlee': False}]}, {'advance': 60},
               battle_until('true'), {'waitFor': "LQ_ENGINE.scene.name === 'battle' && LQ_ENGINE.scene.backdropLayer.usedAsset", 'timeout': 20000}, {'advance': 4},
               {'assert': "LQ_ENGINE.scene.name === 'battle' && LQ_ENGINE.scene.backdropLayer.key === 'ep4_witness' && LQ_ENGINE.scene.backdropLayer.usedAsset",'message': 'the Witness stage is up'}]},
    {'name': 'story_regent_after', 'note': 'E4: regent_after, the line under the counter-seal reads at last (story)',
     'steps': [READY, NEW, flags(WON, CRANK), warp('ep4_keep_crown', 11, 12, 'up'),             # regent_after runs on entry
               until_line('"Keep this one\\."'), on_top('dialog', 'story_regent_after: Mira reads the line')]},
    {'name': 'story_crown_remembers', 'note': 'E4: crown_remembers, Lyra on the statue steps, the gates open (story)',
     'steps': [READY, NEW, flags(NAMED, CRANK), warp('ep4_valewyn', 29, 4, 'down'),             # crown_remembers runs on entry
               until_line('I am Lyra, Regent of Valewyn'), on_top('dialog', 'story_crown_remembers: Lyra speaks')]},
    {'name': 'story_ep4_ending', 'note': 'E4: ep4_ending, Valewyn at night, the letter in stars and the voice over the sand (story)',
     'steps': [READY, NEW, flags(RESTORED, CRANK), warp('ep4_valewyn', 21, 22, 'up'), {'frames': 160}, scene('ep4_ending'),
               until_line("That's not a bell"), on_top('dialog', 'story_ep4_ending: Mira hears it')]},
    {'name': 'ui_title_ep4', 'note': 'E4: the title with an Episode 3 finish in slot 0: the Episode 4 row offered, its help line beside it',
     'steps': [READY,
               {'eval': "(() => { LQ_DEBUG.newGameEp4('Arden', { slot: 0, scene: 'none' }); const g = LQ_ENGINE.game; "
                        "const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 28800, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) }; "
                        "LQ_ENGINE.save.save(0, JSON.parse(JSON.stringify(g)), meta); LQ_ENGINE.game = null; LQ_ENGINE.reset('title'); return true; })()"},
               {'waitFor': "LQ_DEBUG.scene() === 'title' && LQ_ENGINE.scene.menu && LQ_ENGINE.scene.menu.items.some((i) => i.id === 'ep4')", 'timeout': 20000},
               {'eval': "(() => { const m = LQ_ENGINE.scene.menu; m.index = m.items.findIndex((i) => i.id === 'ep4'); return m.index; })()"},
               {'frames': 90}]},
]
for _s in SHOTS:
    _s['query'] = QUERY


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
