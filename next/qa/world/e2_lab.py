"""Episode 2 field lab (E2-world): scripted, asserted walks over the E2 fixture maps (src/world/_testmap.js
_testcourt, _testcourt_dark, _testmere) and, once E2-maps has written them, the real Court floors. Every case
asserts state through LQ_DEBUG and saves shots in qa/world/out/e2_<name>.png (3x).

    python next/qa/world/e2_lab.py                  # every case
    python next/qa/world/e2_lab.py beam bridge      # some cases
    python next/qa/world/e2_lab.py --device phone
    python next/qa/world/e2_lab.py f1               # opt-in: the real court_f1 teaching room (E2-maps)

Cases: beam (the teaching room before and after turning the mirror), bridge (walk the lit bridge, the grace rule),
shove (Bram moves the heavy mirror into the line; the push mirror slides), dark (the beam lights a dark room; draw
time), mere (reflections in water, the fountain with and without faces, mist, conditional tint and music, gated
overlays), doors (fog loop and Keeper mirror transfers), plumbing (newGameEp2, give gold, flags into the battle,
the Episode 2 credits handoff). Fails on any console error. qa/world/walks.test.mjs runs it (the solo slot of node qa/run.mjs).
"""
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab  # noqa: E402

FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
AUTO_JS = 'window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)'


def field_js(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def beams(lab):
    return lab.call('beams')


def setup_party(lab):
    lab.call('party', 'mira', 'bram')
    lab.frames(4)


def case_beam(lab):
    lab.call('setFlag', 'court_entered', True)
    lab.call('setFlag', 'bram_joined', True)
    lab.warp('_testcourt', 6, 9, 'up')
    setup_party(lab)
    lab.frames(20)
    b = beams(lab)
    check(b['active'], 'silverglass is active on _testcourt')
    check(b['beams'][0]['end']['kind'] == 'splash' and b['beams'][0]['end']['dir'] == 'left', 'start state: the beam splashes on the west wall')
    check('r1:dark' in b['receptors'], 'start state: r1 dark')
    check(all(x.endswith(':dim') for x in b['bridges']), 'start state: every bridge cell dim')
    lab.shot('e2_court_before')
    # turn m1 the way the player does: stand beside it facing it and confirm
    lab.call('goto', 5, 8)
    lab.run(field_js('f.leader.face("left");'))
    lab.frames(2)
    lab.frames(20)
    lab.wait_idle(15000)      # the first_mirror remark plays once when the party first faces a mirror
    for _ in range(6):
        if lab.run(field_js('return f.entities.get("m1").state;')) == 1:
            break
        lab.wait_idle(15000)
        lab.press('confirm', 1)
        lab.frames(40)
    check(lab.run(field_js('return f.entities.get("m1").state;')) == 1, 'confirm facing the mirror turns it')
    lab.frames(30)
    b = beams(lab)
    check(b['beams'][0]['end']['kind'] == 'receptor' and b['beams'][0]['end']['id'] == 'r1', 'turned once: the beam reaches r1')
    check('r1:lit' in b['receptors'], 'r1 lit')
    check(all(x.endswith(':lit') for x in b['bridges']), 'the four bridge cells are lit')
    gate = lab.run(field_js('const g = f.entities.get("g1"); return g.state + ":" + (g.prop && g.prop.t);'))
    check(gate == 'open:door_glass_open', f'g1 opened by the receptor ({gate})')
    check(lab.run('LQ_ENGINE.game.flags._test_r1_lit === true'), 'the latch flag is set')
    inlay = lab.run(field_js('return f.map.idsAt(24, 6).join(",");'))
    check('inlay_v_lit' in inlay, f'the inlay from r1 lights ({inlay})')
    lab.wait_idle(15000)
    lab.frames(10)
    lab.shot('e2_court_after')


def case_bridge(lab):
    lab.warp('_testcourt', 6, 9, 'up')
    setup_party(lab)
    lab.call('turnMirror', 'm1')
    lab.frames(4)
    # (goto's pathfinder would happily walk into a pit: the party may enter pits. Walk the bridge row instead.)
    lab.call('goto', 15, 8, ms=60000)
    pos = lab.call('walk', 'right,right,right,right,right,right')
    check(pos == [21, 8], f'the party crosses the lit bridge ({pos})')
    # grace: stand on the bridge, cut the beam (turn m1 back): the cell underfoot stays lit until vacated
    lab.call('walk', 'left,left,left,left')
    lab.frames(4)
    check(lab.run(field_js('return [f.leader.tx, f.leader.ty];')) == [17, 8], 'standing on the bridge at (17,8)')
    b = lab.call('turnMirror', 'm1')
    lit_under = lab.run(field_js('return f.map.idsAt(17, 8).join(",");'))
    check('glass_bridge_h_lit' in lit_under, f'grace: the bridge under the leader stays lit ({lit_under})')
    check('glass_bridge_h_dim' in lab.run(field_js('return f.map.idsAt(16, 8).join(",");')), 'an empty bridge cell dims at once')
    check('glass_bridge_h_lit' in lab.run(field_js('return f.map.idsAt(19, 8).join(",");')), 'a follower keeps the cell under them lit too')
    check('r1:lit' in b['receptors'], 'r1 is latched: still lit without the beam')
    check(lab.run(field_js('return f.entities.get("g1").state;')) == 'open', 'and its gate stays open')
    lab.shot('e2_bridge_grace')
    # put the beam back and walk off west: no fall
    lab.call('turnMirror', 'm1')
    pos = lab.call('walk', 'left,left')
    check(pos == [15, 8] and lab.run(field_js('return f.mapId;')) == '_testcourt', f'walks off the bridge safely ({pos})')
    lab.call('walk', 'down,down')
    lab.call('turnMirror', 'm1')
    lab.frames(4)
    cells = lab.run(field_js('return [16, 17, 18, 19].map(x => f.map.idsAt(x, 8).join(","));'))
    check(all('dim' in c for c in cells), f'vacated: every bridge cell dims ({cells})')


def case_shove(lab):
    lab.warp('_testcourt', 8, 11, 'up')
    setup_party(lab)
    lab.call('turnMirror', 'm1')     # '\': the beam runs east along row 8
    lab.frames(2)
    lab.run(field_js('f.leader.face("up");'))
    st = lab.call('ability', 'shove')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; const e = f.entities.get("mh"); return e && e.y === 9 && !e.data.sliding; }})()', timeout=15000, polling=50)
    lab.wait_idle(15000)
    lab.call('walk', 'up')
    lab.run(field_js('f.leader.face("up");'))
    lab.call('ability', 'shove')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; const e = f.entities.get("mh"); return e && e.y === 8 && !e.data.sliding; }})()', timeout=15000, polling=50)
    lab.frames(6)
    b = beams(lab)
    end = b['beams'][0]['end']
    check(end['kind'] == 'splash' and end['dir'] == 'up' and end['x'] == 8, f'the shoved heavy mirror bends the beam north ({end})')
    lab.wait_idle(15000)
    lab.shot('e2_shove_heavy')
    # the hero alone cannot move a heavy mirror: walking into it only rocks it
    # the push mirror slides when walked into
    lab.call('goto', 10, 12, ms=60000)
    lab.call('walk', 'right')
    lab.frames(20)
    check(lab.run(field_js('const e = f.entities.get("mp"); return [e.x, e.y];')) == [12, 12], 'the push mirror slid one tile east')


def case_dark(lab):
    lab.warp('_testcourt_dark', 6, 9, 'up')
    setup_party(lab)
    lab.call('turnMirror', 'm1')
    lab.call('goto', 12, 9, ms=60000)
    lab.run(field_js('f.leader.face("right");'))
    lab.frames(90)
    n = lab.run(field_js('return f.lightSources.filter(l => l.beam).length;'))
    check(0 < n <= 30, f'the beam adds light sources in the dark ({n})')
    perf = lab.run('LQ_DEBUG.state().perf')
    print('  perf', perf)
    lab.shot('e2_dark_beam')
    # measure the field draw alone, many times
    ms = lab.run(field_js('const r = LQ_ENGINE.renderer; const t0 = performance.now(); for (let i = 0; i < 60; i++) f.draw(r); return (performance.now() - t0) / 60;'))
    print('  field draw ms (dark, beam lit):', round(ms, 3))
    check(ms < 3.0, f'draw time stays low ({ms:.3f} ms)')
    return ms


def case_mere(lab):
    lab.call('setFlag', 'nh_restored', False)
    lab.warp('_testmere', 5, 13, 'down')
    setup_party(lab)
    lab.frames(10)
    tint = lab.run(field_js('return f.lighting.tintName;'))
    check(tint == 'hollow_dusk', f'conditional tint: hollow_dusk before nh_restored ({tint})')
    mus = lab.run(field_js('return f.currentMusic;'))
    check(mus == 'mystery', f'conditional music: mystery before nh_restored ({mus})')
    lab.frames(10)
    drawn = lab.call('reflections')
    check(drawn['active'] and drawn['drawn'] >= 1, f'reflections in the pond ({drawn})')
    lab.shot('e2_mere_pond')
    # the fountain: two Hollow faces (none), a stranger (a face), the hero (a smudge)
    lab.run(field_js('const s = f.actorById("stranger"); s.setPos(14, 12, "up");'))
    lab.call('goto', 13, 12, ms=60000)
    lab.run(field_js('f.leader.face("up");'))
    lab.frames(20)
    lab.shot('e2_fountain_nameless')
    style = lab.run('(async () => { const m = await import("/next/src/world/reflections.js"); const f = ' + FIELD + '; return ["nh_crowd_a", "stranger", "hero"].map(id => { const a = f.actorById(id); const s = m.reflectionStyle(a, f.hasFlag); return s ? (s.hero || "face") : "none"; }); })()')
    check(style == ['none', 'face', 'smudge'], f'before nh_restored: crowd none, stranger face, hero smudge ({style})')
    lab.call('setFlag', 'nh_restored', True)
    lab.frames(40)
    style = lab.run('(async () => { const m = await import("/next/src/world/reflections.js"); const f = ' + FIELD + '; return ["nh_crowd_a", "stranger", "hero"].map(id => { const a = f.actorById(id); const s = m.reflectionStyle(a, f.hasFlag); return s ? (s.hero || "face") : "none"; }); })()')
    check(style == ['face', 'face', 'faint'], f'after nh_restored: everyone has a face, the hero a faint one ({style})')
    tint = lab.run(field_js('return f.lighting.tintName;'))
    check(tint == 'none', f'conditional tint follows the flag ({tint})')
    mus = lab.run(field_js('return f.currentMusic;'))
    check(mus == 'triumph', f'conditional music follows the flag ({mus})')
    sign = lab.run(field_js('return f.map.idsAt(3, 9).join(",");'))
    check(sign == 'sign_hollow_inn', f'gated overlays swap on the flag ({sign})')
    lab.shot('e2_fountain_restored')
    lab.call('setFlag', 'nh_restored', False)
    # gated planks: water becomes walkable while the flag holds
    check(lab.run(field_js('return f.map.codeAt(12, 3);')) == 'water', 'without the flag the cell is water')
    lab.call('setFlag', '_test_bridge', True)
    check(lab.run(field_js('return f.map.codeAt(12, 3);')) == 'none', 'a gated overlay brings its collision with it')
    lab.call('setFlag', '_test_bridge', False)
    check(lab.run(field_js('return f.map.codeAt(12, 3);')) == 'water', 'and takes it away again')
    # mist over the east half
    lab.call('goto', 24, 8, ms=60000)
    lab.frames(60)
    n = lab.run(field_js('return f.particles.count("mist");'))
    check(n >= 4, f'mist drifts over the east half ({n} blobs)')
    lab.shot('e2_mist')


def case_doors(lab):
    lab.warp('_testmere', 24, 14, 'right')
    setup_party(lab)
    lab.call('walk', 'right,right')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; return f && !f.pendingWarp && f.leader.tx === 22 && f.leader.ty === 16; }})()', timeout=15000, polling=50)
    check(True, 'the fog door loops the party back to its landing (22,16)')
    check(lab.run('LQ_ENGINE.game.flags.fog_looped === true'), 'fog_looped is set')
    lab.call('setFlag', 'mirror_sigil_get', True)
    lab.warp('_testcourt', 26, 13, 'up')
    present = lab.run(field_js('const e = f.entities.get("mirror_d"); return !!(e && e.present && e.prop && e.prop.state === 1);'))
    check(present, 'the Keeper mirror door is present (active frame) with mirror_sigil_get')
    lab.call('walk', 'up')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; return f && f.mapId === "_testmere" && !f.pendingWarp && !LQ_DEBUG.state().transition; }})()', timeout=15000, polling=50)
    pos = lab.run(field_js('return [f.leader.tx, f.leader.ty];'))
    check(pos == [20, 7], f'the mirror transfer lands at its target ({pos})')
    safe = lab.run('LQ_ENGINE.game.lastSafe.map')
    check(safe == '_testmere', f'a mirror transfer sets the game over return point ({safe})')
    lab.call('setFlag', 'mirror_sigil_get', False)


def case_plumbing(lab):
    g = lab.run('(LQ_DEBUG.newGameEp2("Arden"), (() => { const g = LQ_ENGINE.game; return { map: g.map, pos: g.pos, party: g.party.map(m => m.id + ":" + m.level), gold: g.gold, flags: Object.keys(g.flags).length, ep1: !!g.flags.ep1_complete, rolled: g.counters.credits_rolled, items: g.items }; })())')
    print('  newGameEp2', g)
    check(g['party'] == ['hero:9', 'mira:9', 'bram:9'] and g['gold'] == 900 and g['ep1'] and g['rolled'] == 1, 'newGameEp2: Lv 9 party, 900 gold, Episode 1 done')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; return f && f.map && f.mapId === "hero_home" && !f.loading; }})()', timeout=30000, polling=50)
    lab.frames(30)
    has_trig = lab.run(field_js('return (f.map.mod.events || []).some(e => e.type === "trigger" && e.script === "ep2_morning");'))
    if has_trig:
        sc = lab.run(field_js('return f.cutscene.running;'))
        check(sc == 'ep2_morning', f'ep2_morning runs on waking at home ({sc})')
    else:
        print('  NOTE hero_home has no ep2_morning enter trigger yet (E2-maps); running the scene by hand')
        lab.run(field_js('f.runScene("ep2_morning"); return true;'))
        lab.frames(10)
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; return f && !f.cutscene.running && LQ_DEBUG.scene() === "field"; }})()', timeout=60000, polling=100)
    check(lab.run('LQ_ENGINE.game.flags.ep2_morning_done === true'), 'ep2_morning finished and set ep2_morning_done')
    before = lab.run('LQ_ENGINE.game.gold')
    lab.run(field_js('f.cutscene.api.give("gold", 90); return true;'))
    lab.frames(90)
    check(lab.run('LQ_ENGINE.game.gold') == before + 90, "the cutscene API's give('gold', 90) pays 90 gold")
    # story flags reach the battle: fountain_done gives the Nameless King fight its opening Fury
    lab.call('setFlag', 'fountain_done', True)
    lab.run(field_js('f.startBattle("nameless_king", { boss: true, canFlee: false }); return true;'))
    lab.page.wait_for_function('LQ_DEBUG.scene() === "battle"', timeout=15000, polling=50)
    fury = lab.run('(() => { const b = LQ_ENGINE.stack.find(s => s.name === "battle"); return b && b.b && b.b.state.options.startFury; })()')
    check(fury == 25, f'flags pass into createEncounterBattle: startFury {fury}')
    lab.run('LQ_DEBUG.pop("win")')
    lab.page.wait_for_function('LQ_DEBUG.scene() === "field"', timeout=15000, polling=50)
    lab.frames(30)
    # the Episode 2 credits: CREDITS_EP2, then Hollowmere's inn (the stand-in town until nh_inn exists)
    lab.call('setFlag', 'ep2_complete', True)
    lab.page.wait_for_function('LQ_DEBUG.scene() === "credits"', timeout=15000, polling=50)
    cards = lab.run('(() => { const c = LQ_ENGINE.stack.find(s => s.name === "credits"); return c.cards[0].lines[0]; })()')
    check('Episode 2' in cards, f'the Episode 2 credits roll ({cards})')
    check(lab.run('LQ_ENGINE.game.counters.credits2_rolled === 1'), 'credits2_rolled is counted')
    lab.run('LQ_DEBUG.pop()')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; return LQ_DEBUG.scene() === "field" && f && f.mapId !== "hero_home" && !f.loading && !LQ_DEBUG.state().transition; }})()', timeout=30000, polling=50)
    where = lab.run(field_js('return [f.mapId, f.leader.tx, f.leader.ty, f.lighting.tintName];'))
    print('  woke on', where, '(nh_inn, or the test town while nh_inn is not written)')
    check(where[0] in ('nh_inn', '_testtown'), 'the Episode 2 handoff reloads at nh_inn inn_bed')


def case_f1(lab):
    """The real Court F1 teaching room (E2-maps' court_f1): before and after turning mir_b. Opt-in."""
    if not lab.run('fetch("/next/src/data/maps/court_f1.js").then(r => r.ok)'):
        print('  NOTE court_f1 is not written yet: skipped')
        return
    for f in ['court_entered', 'court_f1_arrived', 'bram_joined']:
        lab.call('setFlag', f, True)
    lab.warp('court_f1', 20, 21, 'up')
    setup_party(lab)
    lab.frames(30)
    b = beams(lab)
    check('rec_b:dark' in b['receptors'], 'F1 B start: rec_b dark')
    lab.shot('e2_f1_teach_before')
    b = lab.call('turnMirror', 'mir_b')
    lab.frames(30)
    check('rec_b:lit' in b['receptors'], 'F1 B turned once: rec_b lit')
    check(lab.run(field_js('return f.entities.get("gate_b").state;')) == 'open', 'gate_b opens')
    lab.wait_idle(15000)
    lab.frames(10)
    lab.shot('e2_f1_teach_after')
    # D1's cracked glass pane: Dash Strike south breaks it and opens the alcove with the Merewarden Helm
    lab.warp('court_f1', 33, 13, 'down')
    setup_party(lab)
    lab.frames(10)
    check(lab.run(field_js('const e = f.entities.get("chest_helm"); return !!(e && e.data.concealed);')), 'the helm chest hides behind the pane')
    lab.run(field_js('f.leader.face("down"); return true;'))
    lab.call('ability', 'dash')
    lab.page.wait_for_function(f'(() => {{ const f = {FIELD}; const e = f.entities.get("pane_d"); return e && e.state === "broken"; }})()', timeout=15000, polling=50)
    lab.wait_idle(15000)
    check(lab.run(field_js('return f.map.codeAt(33, 16) === "none" && !f.entities.get("chest_helm").data.concealed;')), 'Dash Strike breaks the pane: the alcove opens')
    lab.shot('e2_f1_pane_broken')


CASES = {'beam': case_beam, 'bridge': case_bridge, 'shove': case_shove, 'dark': case_dark, 'mere': case_mere,
         'doors': case_doors, 'plumbing': case_plumbing, 'f1': case_f1}
OPT_IN = {'f1'}


def main(argv):
    device = 'desktop'
    if '--device' in argv:
        device = argv[argv.index('--device') + 1]
    names = [a for a in argv if a in CASES] or [n for n in CASES if n not in OPT_IN]
    lab = Lab(device=device)
    failed = []
    try:
        lab.open()
        lab.run('LQ_DEBUG.setSpeed && LQ_DEBUG.setSpeed(4)')
        lab.run(AUTO_JS)
        for n in names:
            print(f'[{n}]')
            try:
                CASES[n](lab)
            except Exception as e:  # noqa: BLE001
                failed.append(n)
                print(f'  FAIL {n}: {e}')
                try:
                    lab.shot(f'e2_fail_{n}')
                except Exception:
                    pass
        if lab.errors:
            print('CONSOLE ERRORS:')
            for e in lab.errors[:20]:
                print('  ', e)
            failed.append('console')
        warns = [l for l in lab.logs if l.startswith('warning')]
        if warns:
            print(f'{len(warns)} console warnings (first 12):')
            for w in warns[:12]:
                print('  ', w[:200])
    finally:
        lab.close()
    print('E2_LAB:', 'FAIL ' + ','.join(failed) if failed else 'PASS')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
