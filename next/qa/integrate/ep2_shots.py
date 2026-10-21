"""Episode 2 shots for qa/shots.json (E2-integrate, EPISODE2_PLAN 10d task 3).

Appends the twelve Episode 2 shots to next/qa/shots.json (append only: a shot whose name is already there is left
alone; --replace rewrites those twelve in place). Then render them with:

    python next/qa/integrate/ep2_shots.py [--replace]
    python next/qa/shots.py --only "field_fading_road_mist,field_hollow_fountain_faces,field_court_*,story_vex_mirror,battle_other_selves,battle_kept,battle_king_unmasked,story_aurel,story_hollowmere_restored,story_ep2_ending" --device all

Every story shot starts from LQ_DEBUG.newGameEp2 (the Lv 9 Episode 2 party), sets the story flags a save would
hold at that point, warps, runs the scene and advances its dialogue until the named line is on screen.
"""
import argparse
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp2')", 'timeout': 20000}
NEW = {'call': 'newGameEp2', 'args': ['Arden', {'scene': 'none'}]}

# Story flags in the order the episode sets them (a save at a beat holds every flag before it).
ROAD = ['ep2_morning_done', 'ep2_started', 'last_route_started', 'iris_farewell_done', 'crossing_done', 'east_road_arrived',
        'east_first_fight_done', 'saw_old_milestone', 'saw_cairns']
HOLLOW = ROAD + ['waystation_rested', 'saw_court', 'nh_arrived']
COURT = HOLLOW + ['met_elian', 'heard_crisis', 'met_anwen', 'testimony_tovin', 'court_ferry_open', 'court_entered', 'court_f1_arrived']
F2 = COURT + ['mira_memory_1', 'silverglass_lock_lit', 'silverglass_lock_seen', 'court_f1_done', 'court_f2_arrived']
F3 = F2 + ['portraits_started', 'mira_memory_2', 'vex_met', 'other_selves_defeated', 'court_f2_done', 'court_f3_arrived']
VOWS = F3 + ['vow_belonging', 'vow_belonging_seen', 'vow_mercy', 'vow_mercy_seen', 'vow_courage', 'vow_courage_seen',
             'mira_memory_3', 'vow_door_open']
KING = VOWS + ['nameless_king_defeated']
NAMED = KING + ['aurel_named', 'mirror_sigil_get']
RESTORED = NAMED + ['nh_restored']


def flags(names, extra_items=None):
    """Set the story flags; every field remark (BARKS) counts as heard, as it would be by this point of a playthrough,
    so a shot shows the scene and not a first-time tip."""
    items = ' '.join(f'g.items[{json.dumps(k)}] = {v};' for k, v in (extra_items or {}).items())
    return {'eval': "(async () => { const g = LQ_ENGINE.game; for (const f of " + json.dumps(names) + ") g.flags[f] = true; " + items
            + " const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1; return true; })()"}


def warp(map_id, x, y, d='down'):
    return {'call': 'warp', 'args': [map_id, x, y, d], 'timeout': 20000}


def scene(scene_id):
    return {'eval': f"(() => {{ LQ_DEBUG.call('scene', {json.dumps(scene_id)}); return true; }})()"}


def until_line(pattern, timeout=60000):
    """Advance the running scene's dialogue (confirm on finished pages, choices, title cards) until a page
    matching `pattern` is fully typed."""
    js = ("(async () => { const rx = new RegExp(" + json.dumps(pattern) + "); "
          "for (let i = 0; i < 1500; i++) { const s = LQ_ENGINE.scene; "
          "if (s && s.name === 'dialog') { if (!s.typing && rx.test(s.pageText || '')) return i; if (!s.typing || i % 4 === 0) LQ_DEBUG.press('confirm', 1); } "
          "else if (s && (s.name === 'choice' || s.name === 'titleCard')) LQ_DEBUG.press('confirm', 1); "
          "await new Promise(r => setTimeout(r, 40)); } "
          "throw new Error('the line never showed: ' + rx); })()")
    return {'eval': js, 'timeout': timeout}


def on_top(name, why):
    return {'assert': f"LQ_DEBUG.scene() === {json.dumps(name)}", 'message': why}


BATTLE_MENU = ("(() => { for (let i = 0; i < 4000; i++) { const b = LQ_DEBUG.state().battle; "
               "if (b && b.menu !== 'closed' && !b.fast) return i; LQ_DEBUG.advance(5); } return -1; })()")

SHOTS = [
    {'name': 'field_fading_road_mist', 'note': 'E2: the Fading Stretch, mist over the cairn path (east_road)',
     'steps': [READY, NEW, flags(ROAD), warp('east_road', 23, 16, 'right'), {'frames': 260},
               on_top('field', 'field_fading_road_mist: the field is on top')]},
    {'name': 'field_hollow_fountain_faces', 'note': 'E2: fountain_faces, three faces in the water and the hero a smudge',
     'steps': [READY, NEW, flags(HOLLOW), warp('nameless_hollow', 22, 22, 'up'), {'frames': 200}, scene('fountain_faces'),
               until_line('a smudge on the water'), on_top('dialog', 'field_hollow_fountain_faces: the narration is up')]},
    {'name': 'field_court_f1_beam_teach', 'note': 'E2: F1 teaching room, mir_b turned, the beam in rec_b, gate_b open (snap -start: the splash west)',
     'steps': [READY, NEW, flags(COURT), warp('court_f1', 18, 19, 'left'), {'frames': 260}, {'snap': 'start'},
               {'call': 'turnMirror', 'args': ['mir_b']}, {'frames': 120},
               {'assert': "LQ_DEBUG.call('beams').litReceptors.includes('rec_b')", 'message': 'rec_b is lit'}]},
    {'name': 'field_court_f2_bridge', 'note': 'E2: F2 north gallery, m_n1 turned, the party on the lit glass bridge over the moat',
     'steps': [READY, NEW, flags(F2), warp('court_f2', 23, 5, 'right'), {'frames': 240},
               {'call': 'turnMirror', 'args': ['m_n1']}, {'frames': 30}, {'call': 'walk', 'args': ['right right right'], 'timeout': 20000},
               {'frames': 90}]},
    {'name': 'field_court_f3_dark_beam', 'note': 'E2: F3 Belonging wing (dark 0.6), the beam the only light, rec_belonging lit',
     'steps': [READY, NEW, flags(F3 + ['vow_belonging_seen']), warp('court_f3', 8, 17, 'up'), {'frames': 240},
               {'call': 'turnMirror', 'args': ['m_w1']}, {'call': 'turnMirror', 'args': ['m_w2']}, {'call': 'turnMirror', 'args': ['m_w3']},
               {'frames': 120}]},
    {'name': 'story_vex_mirror', 'note': 'E2: vex_mirror, Vex Quill in the corridor glass (story)',
     'steps': [READY, NEW, flags(F2 + ['portraits_started', 'mira_memory_2']), warp('court_f2', 3, 14, 'up'), {'frames': 200},
               scene('vex_mirror'), until_line('Yours has no face'), on_top('dialog', 'story_vex_mirror: Vex speaks')]},
    {'name': 'battle_other_selves', 'note': 'E2: the Other Selves, the Mirrored Combo announced (silver bracket on the timeline)',
     'steps': [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['other_selves', {'fresh': True, 'seed': 1}]}, {'advance': 60},
               {'call': 'battleUntil', 'args': ['mirror']}, {'eval': BATTLE_MENU}, {'advance': 4},
               {'assert': "LQ_DEBUG.state().battle.telegraphs.length > 0", 'message': 'a Mirrored Combo is telegraphed'}]},
    {'name': 'battle_kept', 'note': 'E2: the Nameless King, a party member Kept in a mirror shard',
     'steps': [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['nameless_king', {'fresh': True, 'seed': 3}]}, {'advance': 60},
               {'call': 'battleUntil', 'args': ['kept']}, {'eval': BATTLE_MENU}, {'advance': 30},
               {'assert': "LQ_ENGINE.scene.b.units().some(u => u.side === 'party' && u.statuses && u.statuses.kept)", 'message': 'someone is Kept'}]},
    {'name': 'battle_king_unmasked', 'note': 'E2: the Nameless King, phase 3 (Aurel Unmasked)',
     'steps': [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': ['nameless_king', {'fresh': True, 'seed': 3}]}, {'advance': 60},
               {'call': 'battleUntil', 'args': ['phase3']}, {'eval': BATTLE_MENU}, {'advance': 30},
               {'assert': "(() => { const k = LQ_ENGINE.scene.b.units().find(u => u.boss); return !!(k && k.ai && k.ai.phase >= 2); })()", 'message': 'the King is unmasked'}]},
    {'name': 'story_aurel', 'note': 'E2: king_after, the King named Aurel, Elian beside him (story)',
     'steps': [READY, NEW, flags(KING), warp('court_throne', 12, 12, 'up'),           # king_after runs on entry
               until_line('^Elian\\.$'), on_top('dialog', 'story_aurel: Aurel speaks')]},
    {'name': 'story_hollowmere_restored', 'note': 'E2: hollowmere_restored, the signs lettered, Mira at the fountain rim (story)',
     'steps': [READY, NEW, flags(NAMED), warp('nameless_hollow', 24, 21, 'down'),
               until_line("from Hollowmere"), on_top('dialog', 'story_hollowmere_restored: Mira speaks')]},
    {'name': 'story_ep2_ending', 'note': 'E2: ep2_ending, night in Hollowmere, the hero\'s faint reflection (story)',
     'steps': [READY, NEW, flags(RESTORED), warp('nameless_hollow', 22, 21, 'up'), {'frames': 120}, scene('ep2_ending'),
               until_line('Your reflection is there now'), on_top('dialog', 'story_ep2_ending: the narration is up')]},
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
