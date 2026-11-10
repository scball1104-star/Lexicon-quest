"""Episode 6 shots for qa/shots.json (E6-integrate, docs/EPISODE6_PLAN.md 12, docs/briefs/E6-integrate.md item 5).

Appends the twenty-three Episode 6 shots of plan 12 to next/qa/shots.json (append only: a shot whose name is already there is
left alone; --replace rewrites these in place). Writes the file back with LF line ends and counts its CR bytes before and after
(both must be zero: Episode 4's generator once rewrote the file with CRLF). Then render them with:

    python next/qa/integrate/ep6_shots.py [--replace]
    python next/qa/shots.py --only "<the names it prints>" --device all --timeout 3000

Every shot carries `?pack=ep5,ep6&ep=6` (the developer entry: both packs forced on, the story's switch opened once the maps are
listed), so it renders the same before and after EP6_LIVE is flipped; the morning scene also opens the story's GATE itself.
Story and field shots start from LQ_DEBUG.newGameEp6 (the Lv 25 quick-start party, slot 0 on the shots' empty storage), set the
story flags a save would hold at that point, warp, and run the scene (or let the map's enter trigger run it) until the named line
is on screen. Battle shots use LQ_DEBUG.battle on the Episode 6 encounters and step the fight until the state worth showing (the
Gust marker, a pinned Rewrite, the Storm Script Ward) is on screen.
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'
QUERY = '&pack=ep5,ep6&ep=6'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp6')", 'timeout': 90000}
NEW = {'call': 'newGameEp6', 'args': ['Arden', {'slot': 0, 'scene': 'none'}], 'timeout': 90000}
GATE_ON = {'eval': "(async () => { (await import('./src/data/ep6/story.js')).GATE.live = true; return true; })()"}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
MORNING = ['ep6_morning_done', 'ep6_started']
AIR = MORNING + ['ep6_boarded', 'airstair_arrived']
GUST = AIR + ['mira_asked', 'mira_told', 'airstair_fight_done', 'saw_gust']
TOWN = GUST + ['saw_isles', 'zephyr_arrived', 'liora_met', 'met_aeris']
CHARTS = TOWN + ['charts_seen']
F1 = CHARTS + ['anchor_learned', 'windward_pass', 'obs_entered', 'obs_f1_arrived']
F2 = F1 + ['aeris_memory_1', 'compass_key_found', 'obs_f1_done', 'obs_f2_arrived', 'aeris_memory_2']
F3 = F2 + ['vex_relay_met', 'sixth_list_get', 'engine_tried', 'engine_defeated', 'obs_f2_done', 'obs_f3_arrived', 'aeris_came']
FALL = F3 + ['pledge_anchor', 'pledge_listen']
BEACON = FALL + ['vex_held', 'asker_known', 'pledge_return']
EYRIE = BEACON + ['pippa_found', 'told_aeris', 'scribe_door_open', 'scribe_tried', 'scribe_defeated']
LIBRARY = EYRIE + ['wind_script_restored', 'fragment6_get', 'compass_restored']
HOME = LIBRARY + ['library_reached', 'first_page_read']
ENDING = HOME + ['isles_restored']
KEYS = {'boarding_slip': 1, 'compass_key': 1}


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


def vane(vane_id):
    """A vane turned as confirm would (the swing, then any pan to far lanes), waited out."""
    return {'eval': "(async () => { const r = await LQ_DEBUG.turnVane(" + json.dumps(vane_id) + "); if (!r || !r.ok) throw new Error('the vane was refused'); "
                    "for (let i = 0; i < 200; i++) { await new Promise((ok) => setTimeout(ok, 40)); const w = LQ_DEBUG.wind(); "
                    "if (w && !w.busy && w.anim == null && LQ_DEBUG.scene() === 'field') return w.turned; } throw new Error('the vane never settled'); })()",
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


def fight(enc, seed):
    return [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': [enc, {'seed': seed, 'noElite': True, 'canFlee': False}]}, {'advance': 60}]


# The Storm Scribe into phase 2 (the Storm Script Ward): the blow that crosses 68% (as ep5_shots.py stages the Oracle's Futures).
SCRIBE_TO_WARD = (
    "(() => { const S = () => LQ_ENGINE.scene.b.units().find(u => u.alive && u.id === 'scribe'); "
    "for (let i = 0; i < 12000; i++) { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return -2; "
    "const b = LQ_DEBUG.state().battle; const open = b && b.menu !== 'closed' && !b.fast; "
    "if (!open) { LQ_DEBUG.advance(5); continue; } "
    "if (s.b.units().some(u => u.alive && (u.id === 'false_beacon' || u.id === 'broken_compass'))) return i; "
    "const o = S(); if (!o) return -3; o.hp = Math.min(o.hp, Math.floor(o.maxHp * 0.685)); "
    "LQ_DEBUG.battleAct({ type: 'attack', target: o.uid }); LQ_DEBUG.advance(5); } return -1; })()")
GALE = 'LQ_ENGINE.scene.b.state.gale'

SHOTS = [
    {'name': 'story_ep6_morning_slip', 'note': 'E6: ep6_morning, the boarding slip close-up in the Dune Lantern Rest: four seats, three of us (story)',
     'steps': [READY, GATE_ON, {'call': 'newGameEp6', 'args': ['Arden', {'slot': 0}], 'timeout': 90000}, until_line('Four seats. There are three of us'),
               on_top('dialog', 'story_ep6_morning_slip: Bram counts the seats')]},
    {'name': 'story_mira_asks', 'note': "E6: mira_asks, the first rope landing of the Airstair: Mira's question, the first truth choice (story)",
     'steps': [READY, NEW, flags(AIR, KEYS), warp('ep6_airstair', 14, 38, 'left'), {'frames': 160}, scene('mira_asks'),
               until_line('Are you scared of what it says'), on_top('dialog', 'story_mira_asks: Mira asks')]},
    {'name': 'battle_airstair_first_gust', 'note': 'E6: the Airstair teaching fight: two Storm Harriers Aloft, the Gust marker three actions out',
     'steps': [READY, NEW] + fight('e6a_first', 1) + [battle_until(f"{GALE} && {GALE}.gustIn <= 3"), {'advance': 4},
               {'assert': f"!!{GALE}", 'message': 'the fight has a Gale'}]},
    {'name': 'battle_gale_gust', 'note': 'E6: an F1 fight after the Gust has fallen: the party blown back, the marker reset',
     'steps': [READY, NEW, level(26)] + fight('e6o1_harriers', 2) + [battle_until(f"{GALE} && {GALE}.gusts >= 1"), {'advance': 4},
               {'assert': f"{GALE}.gusts >= 1", 'message': 'a Gust has fallen'}]},
    {'name': 'field_ep6_lane_a', 'note': "E6: the Airstair's third landing: lane A streaming white across the gap to the east ledge",
     'steps': [READY, NEW, flags(GUST, KEYS), warp('ep6_airstair', 4, 24, 'right'), {'frames': 260},
               {'assert': "LQ_DEBUG.wind().active && LQ_DEBUG.wind().live > 0", 'message': 'the lanes are live'}]},
    {'name': 'field_ep6_post_b', 'note': 'E6: lane B on the Airstair: the mooring post with its pennant, the side ledge and its chest',
     'steps': [READY, NEW, flags(GUST, KEYS), warp('ep6_airstair', 15, 15, 'up'), {'frames': 260},
               on_top('field', 'field_ep6_post_b: the field is on top')]},
    {'name': 'field_ep6_zephyr_board', 'note': 'E6: Zephyr Landing, the board plaza: the departure board, the tied chimes, the storm on the skyline',
     'steps': [READY, NEW, flags(TOWN, KEYS), warp('ep6_zephyr', 22, 19, 'up'), {'frames': 260},
               on_top('field', 'field_ep6_zephyr_board: the field is on top')]},
    {'name': 'story_chart_room_manifest', 'note': 'E6: chart_room, the struck manifest close-up: eleven names and one line scratched out (story)',
     'steps': [READY, NEW, flags(TOWN, KEYS), warp('ep6_zl_charts', 9, 12, 'up'), {'frames': 160}, scene('chart_room'),
               until_line('eleven names'), on_top('dialog', 'story_chart_room_manifest: the manifest')]},
    {'name': 'story_anchor_lesson', 'note': 'E6: anchor_lesson, the east dock: Bram drives his spear through the planks and holds Mira (story)',
     'steps': [READY, NEW, flags(CHARTS, KEYS), warp('ep6_zephyr', 42, 16, 'right'), {'frames': 160}, scene('anchor_lesson'),
               until_line('Bram drives his spear'), on_top('dialog', 'story_anchor_lesson: Bram holds')]},
    {'name': 'field_ep6_obs_f1_vane', 'note': "E6: F1 the Windward Causeways: vane_c turned, the boardwalk's lane blowing west to the relay deck",
     'steps': [READY, NEW, flags(F1, KEYS), warp('ep6_obs_f1', 35, 7, 'up'), {'frames': 200}, vane('vane_c'), {'frames': 60},
               {'assert': "LQ_DEBUG.wind().turned.includes('a')", 'message': 'group a is turned'}]},
    {'name': 'field_ep6_obs_f2_ducts', 'note': 'E6: F2 the Hall of Broken Signals: the fan vane, the ducts through the grilles, the dark hall',
     'steps': [READY, NEW, flags(F2, KEYS), warp('ep6_obs_f2', 9, 18, 'up'), {'frames': 260},
               on_top('field', 'field_ep6_obs_f2_ducts: the field is on top')]},
    {'name': 'story_vex_relay', 'note': 'E6: vex_relay, the crown relay: Vex with both arms in the relay, the sixth list (story)',
     'steps': [READY, NEW, flags(F2, KEYS), warp('ep6_obs_f2', 20, 7, 'up'), {'frames': 160}, scene('vex_relay'),
               until_line('Six lists'), on_top('dialog', 'story_vex_relay: Vex shows the list')]},
    {'name': 'battle_gale_engine', 'note': 'E6: the Gale Engine in the bellows hall, the Gust marker on its timeline',
     'steps': [READY, NEW, flags(['anchor_learned']), level(26)] + fight('gale_engine', 3) + [battle_until('b.round >= 2'), {'advance': 4},
               {'assert': "LQ_DEBUG.scene() === 'battle'", 'message': 'in the fight'}]},
    {'name': 'field_ep6_obs_f3_ring', 'note': 'E6: F3 the Eye of the Storm: the Anchor ring round its block, the post, the dark lamp, lightning off the cloud',
     'steps': [READY, NEW, flags(F3, KEYS), warp('ep6_obs_f3', 16, 32, 'up'), {'frames': 260},
               on_top('field', 'field_ep6_obs_f3_ring: the field is on top')]},
    {'name': 'story_vex_falls_letter', 'note': "E6: vex_falls, the broken causeway: the letter close-up, a Keeper's warm hand (story)",
     'steps': [READY, NEW, flags(FALL, KEYS), warp('ep6_obs_f3', 17, 16, 'up'), {'frames': 160}, scene('vex_falls'),
               until_line('A short letter in a warm, hurried hand'), on_top('dialog', 'story_vex_falls_letter: the letter')]},
    {'name': 'story_fifth_voice', 'note': 'E6: fifth_voice, the beacon platform: Mira reads the name off the letter, Pippa Voss (story)',
     'steps': [READY, NEW, flags(BEACON, {**KEYS, 'liora_letter': 1}), warp('ep6_obs_f3', 22, 4, 'left'), {'frames': 160}, scene('fifth_voice'),
               until_line('Pippa. Pippa Voss.'), on_top('dialog', 'story_fifth_voice: the name')]},
    {'name': 'battle_scribe_rewrite', 'note': 'E6: the Storm Scribe rewrites the course: a Rewrite pinned to the Gust marker, Bram able to Anchor',
     'steps': [READY, NEW, flags(['anchor_learned']), level(27)] + fight('scribe', 6) + [battle_until(f"{GALE} && !!{GALE}.pinned"), {'advance': 4},
               {'assert': f"!!{GALE}.pinned", 'message': 'a Rewrite is pinned'}]},
    {'name': 'battle_scribe_ward', 'note': 'E6: the Storm Scribe, phase 2: the Storm Script Ward with the False Beacon and the Broken Compass',
     'steps': [READY, NEW, flags(['anchor_learned']), level(27)] + fight('scribe', 6) + [{'eval': SCRIBE_TO_WARD}, {'advance': 90},
               {'assert': "LQ_ENGINE.scene.b.units().some(u => u.alive && (u.id === 'false_beacon' || u.id === 'broken_compass'))", 'message': 'the ward lights are up'}]},
    {'name': 'story_scribe_after_script', 'note': 'E6: scribe_after, the Wind Script unrolls: every name of the realm on the sail-cloth (story)',
     'steps': [READY, NEW, flags(EYRIE, KEYS), warp('ep6_obs_eyrie', 11, 17, 'up'),           # scribe_after runs on entry
               until_line('every name of the realm'), on_top('dialog', 'story_scribe_after_script: the Wind Script')]},
    {'name': 'story_cloud_library_page', 'note': 'E6: cloud_library, the first page under glass, torn: Keep this one. (story)',
     'steps': [READY, NEW, flags(LIBRARY, KEYS), warp('ep6_library', 10, 11, 'up'),           # cloud_library runs on entry
               until_line('Keep this one'), on_top('dialog', 'story_cloud_library_page: the page')]},
    {'name': 'story_isles_return', 'note': 'E6: isles_return, dawn over Zephyr Landing: the chimes ring, LANDED, DOCK FOUR (story)',
     'steps': [READY, NEW, flags(HOME, KEYS), warp('ep6_zephyr', 22, 5, 'down'),               # isles_return runs on entry
               until_line('the chimes of Zephyr Landing ring'), on_top('dialog', 'story_isles_return: the chimes')]},
    {'name': 'story_ep6_ending', 'note': 'E6: ep6_ending, the chart tower roof at night: the needle swings north, and stays (story)',
     'steps': [READY, NEW, flags(ENDING, KEYS), warp('ep6_zephyr', 12, 4, 'up'), {'frames': 160}, scene('ep6_ending'),
               until_line('The needle swings north'), on_top('dialog', 'story_ep6_ending: the needle')]},
    {'name': 'ui_title_ep6', 'note': 'E6: the title with an Episode 5 finish in slot 0: the Episode 6 row offered, its help line beside it',
     'steps': [READY,
               {'eval': "(async () => { await LQ_DEBUG.newGameEp6('Arden', { slot: 0, scene: 'none' }); const g = LQ_ENGINE.game; "
                        "const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 36000, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) }; "
                        "LQ_ENGINE.save.save(0, JSON.parse(JSON.stringify(g)), meta); LQ_ENGINE.game = null; LQ_ENGINE.reset('title'); return true; })()", 'timeout': 90000},
               {'waitFor': "LQ_DEBUG.scene() === 'title' && LQ_ENGINE.scene.menu && LQ_ENGINE.scene.menu.items.some((i) => i.id === 'ep6')", 'timeout': 30000},
               {'eval': "(() => { const m = LQ_ENGINE.scene.menu; m.index = m.items.findIndex((i) => i.id === 'ep6'); return m.index; })()"},
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
    SPEC.write_bytes(out)
    print(f'added {len(added)}: {", ".join(added) or "-"}; replaced {len(replaced)}')
    print(f'CR bytes in qa/shots.json: {cr0} before, {out.count(b"\\r")} after')
    print('--only ' + ','.join(s['name'] for s in SHOTS))


if __name__ == '__main__':
    main()
