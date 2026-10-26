"""X1-integrate: appends the fifteen shots of docs/EXPANSION1_PLAN.md section 15 to qa/shots.json (idempotent: a shot already there is
replaced, so this file is the one place they are defined).

    python qa/integrate/x1_shots.py            write
    python qa/shots.py --only "*downs*,*loomhouse*,..." --device all     (the names are printed)

Every shot starts from the Episode 2 quick start (all Episode 1 main flags, so first_fight_done and the three regions are open), waits for the
x1 pack, sets the flags its place shows and warps there. Needs the switch on: LQ_X1_LIVE=1 (a local copy of live.js, served in memory) until
X1_LIVE is flipped in src/data/x1/live.js.
"""
import json
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[1] / 'shots.json'

ALL_BARKS = ("const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1;")


def prelude(flags=(), items=None):
    fl = json.dumps(list(flags))
    give = ''
    for k, v in (items or {}).items():
        give += f" g.items[{json.dumps(k)}] = {v};"
    return [
        {"waitFor": "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp2')", "timeout": 20000},
        {"call": "newGameEp2", "args": ["Arden", {"scene": "none"}]},
        {"waitFor": "window.LQ_PACKS && LQ_PACKS.packReady('x1')", "timeout": 40000},
        {"eval": f"(async () => {{ const g = LQ_ENGINE.game; for (const f of {fl}) g.flags[f] = true;{give} {ALL_BARKS} return true; }})()"},
    ]


def story_wait(scene, rx):
    return [
        {"eval": f"(() => {{ LQ_DEBUG.call('scene', {json.dumps(scene)}); return true; }})()"},
        {"eval": ("(async () => { const rx = new RegExp(" + json.dumps(rx) + "); for (let i = 0; i < 2500; i++) { const s = LQ_ENGINE.scene; "
                  "if (s && s.name === 'dialog') { if (!s.typing && rx.test(s.pageText || '')) return i; if (!s.typing || i % 4 === 0) LQ_DEBUG.press('confirm', 1); } "
                  "else if (s && (s.name === 'choice' || s.name === 'titleCard')) LQ_DEBUG.press('confirm', 1); await new Promise(r => setTimeout(r, 40)); } "
                  "throw new Error('the line never showed: ' + rx); })()"), "timeout": 90000},
        {"assert": "LQ_DEBUG.scene() === \"dialog\"", "message": "the line is up"},
    ]


def on_map(m):
    return {"assert": f"(() => {{ const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && f.map && f.map.id === {json.dumps(m)}; }})()", "message": f"the party is on {m}"}


def warp(m, x, y, d='down', frames=150):
    return [{"call": "warp", "args": [m, x, y, d], "timeout": 30000}, {"frames": frames}, on_map(m)]


EP1 = ['first_fight_done', 'archive_f1_done', 'lantern_get', 'archivore_defeated', 'ep1_complete', 'hal_returned']
SHOTS = [
    {"name": "field_downs_thornfold", "note": "X1: Thornfold from the town lane: cottages, the Loom House, the well, the sheep fold, a drystone wall, the Stones' rise on the horizon",
     "steps": prelude(EP1 + ['downs_arrived', 'thornfold_arrived']) + warp('x1_downs', 36, 23, 'up')},
    {"name": "field_downs_stones", "note": "X1: the ring of twelve standing stones lettered again (stones_lettered), the cairn at the middle, the thirteenth slab apart",
     "steps": prelude(EP1 + ['downs_arrived', 'thornfold_arrived', 'stones_seen', 'rollcall_started', 'stones_lettered']) + warp('x1_downs', 14, 12, 'up')},
    {"name": "interior_loomhouse", "note": "X1: Tamsin's Loom House: the great loom, the spinning wheel, the hearth font, the sampler",
     "steps": prelude(EP1 + ['downs_arrived']) + warp('x1_loomhouse', 7, 8, 'up', 90)},
    {"name": "dungeon_barrow_slabs", "note": "X1: the Barrow's Long Hall after the floor switch: the Ossuary slab closed, the Ewe Chamber's slab drawn back",
     "steps": prelude(EP1 + ['barrow_entered']) + warp('x1_barrow', 15, 12, 'up', 90) + [{"press": "confirm", "frames": 2}, {"frames": 70},
        {"assert": "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const e = f.entities.get('sw_slab'); return e && e.state === 'on'; })()", "message": "the slab switch is on"}]},
    {"name": "story_rollcall_stones", "note": "X1: rollcall_stones, the hero says the last name and the stone takes its letters",
     "steps": prelude(EP1 + ['downs_arrived', 'thornfold_arrived', 'stones_seen', 'rollcall_started', 'roll_found', 'copy_found']) + warp('x1_downs', 14, 12, 'up', 60) + story_wait('rollcall_stones', 'Say it and be kept')},
    {"name": "battle_barrow_reeve", "note": "X1: the Barrow Reeve, a counting boss before the Barrow's niches",
     "steps": [{"waitFor": "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp2')", "timeout": 20000},
               {"waitFor": "window.LQ_PACKS && LQ_PACKS.packReady('x1') || (LQ_PACKS && LQ_PACKS.ensurePack('x1').then(() => true))", "timeout": 40000},
               {"eval": "LQ_DEBUG.setSpeed(0)"}, {"call": "battle", "args": ["barrow_reeve", {"fresh": True, "seed": 1}], "timeout": 40000}, {"advance": 150},
               {"assert": "LQ_DEBUG.scene() === 'battle'", "message": "the Reeve fight is on"}]},
    {"name": "field_terrace_orrery", "note": "X1: the Keepers' Terrace in front of the Orrery: the dome, the court, the lawns, the broken beacon behind",
     "steps": prelude(EP1 + ['terrace_arrived']) + warp('x1_terrace', 32, 11, 'up')},
    {"name": "dungeon_cellar_route", "note": "X1: the Cellar's Constellation Floor from the entry platform with the Lantern raised: the faint ink route to the dais",
     "steps": prelude(EP1 + ['stars_started', 'star_1_read', 'star_2_read', 'star_3_read', 'orrery_aligned', 'cellar_entered', 'terrace_arrived']) + warp('x1_cellar', 12, 9, 'up', 90)
        + [{"call": "lantern"}, {"frames": 150},
           {"assert": "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return f.map.idsAt(12, 7).some(id => /_revealed$/.test(id)); })()", "message": "the route is lit"}]},
    {"name": "field_millrace_mill", "note": "X1: Hal's mill and its wheel, the mill door open, the pond bed and the weir behind (the wheel is turning: mill_turning)",
     "steps": prelude(EP1 + ['millrace_arrived', 'mill_started', 'mill_turning']) + warp('x1_millrace', 29, 16, 'up')},
    {"name": "dungeon_culvert_plates", "note": "X1: the Weir Culvert's Drain Hall: the light block pushed onto its plate (the plate is down), the heavy block waiting at the second",
     "steps": prelude(EP1 + ['culvert_entered']) + warp('x1_culvert', 8, 15, 'right', 90) + [{"eval": "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); return true; })()"}, {"press": "right", "frames": 420}, {"frames": 450},
        {"assert": "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const e = f.entities.get('plate_b1'); return e && e.state === 'down'; })()", "message": "the first plate is down"}]},
    {"name": "story_mill_done", "note": "X1: mill_done, Hal and Oren at the mill door, the wheel turning",
     "steps": prelude(EP1 + ['millrace_arrived', 'mill_started', 'pin_found', 'mill_turning']) + warp('x1_millrace', 28, 16, 'up', 60) + story_wait('mill_done', 'It is turning')},
    {"name": "battle_millstone_golem", "note": "X1: the Millstone Golem in the Sluice Chamber",
     "steps": [{"waitFor": "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp2')", "timeout": 20000},
               {"waitFor": "window.LQ_PACKS && LQ_PACKS.packReady('x1') || (LQ_PACKS && LQ_PACKS.ensurePack('x1').then(() => true))", "timeout": 40000},
               {"eval": "LQ_DEBUG.setSpeed(0)"}, {"call": "battle", "args": ["millstone_golem", {"fresh": True, "seed": 1}], "timeout": 40000}, {"advance": 150},
               {"assert": "LQ_DEBUG.scene() === 'battle'", "message": "the Golem fight is on"}]},
    {"name": "field_valley_cleft", "note": "X1: the valley's north cleft with the Lantern raised: the ink bridge across to the Keepers' stair",
     "steps": prelude(EP1 + ['cleft_seen']) + warp('valley', 21, 9, 'up', 90)
        + [{"call": "lantern"}, {"frames": 150},
           {"assert": "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return f.map.idsAt(21, 7).some(id => /_revealed$/.test(id)); })()", "message": "the bridge is revealed"}]},
    {"name": "field_highmoor_tower", "note": "X1: the High Moor's Watchtower and Odo's turf hut in the crag, the tower yard and the star mark at its foot",
     "steps": prelude(EP1 + ['moor_arrived', 'odo_met', 'stars_started']) + warp('x1_highmoor', 48, 14, 'up')},
    {"name": "field_larchhill_windmill", "note": "X1: Larchhill's Windmill on its mound, the ladder, the cider press and the hives of Yarrow's apiary",
     "steps": prelude(EP1 + ['larchhill_arrived', 'yarrow_met']) + warp('x1_larchhill', 53, 32, 'up')},
]

# battle shots: the quick start's party is Lv 9 (the sim's loadout for Episode 2); the fights are the plan's two optional bosses
# (battle shots need no map, only the pack's encounters registered)


def main():
    d = json.loads(SPEC.read_text(encoding='utf-8'))
    names = {s['name'] for s in SHOTS}
    d['shots'] = [s for s in d['shots'] if s['name'] not in names] + SHOTS
    SPEC.write_text(json.dumps(d, indent=1, ensure_ascii=True) + '\n', encoding='utf-8')
    print('wrote', len(SHOTS), 'X1 shots;', len(d['shots']), 'in all')
    print(','.join(s['name'] for s in SHOTS))


if __name__ == '__main__':
    main()
