"""W15 before / after shots for PLAYTEST_REVIEW_4 section 4 (the fixes that have no shot in qa/shots.json).

    python next/qa/integrate/w15_shots.py --tag before            # every scenario, desktop and phone
    python next/qa/integrate/w15_shots.py --tag after 1 3 5       # some scenarios

Scenarios (each saves qa/integrate/out/w15_<id>_<tag>_<device>.png, 3x nearest):
  1        the title with an occupied autosave (an Episode 1 credits save, Arden Lv 10), cursor on the Episode 2 row
  1c       (after) the same, Episode 2 confirmed: the guard that names the save it would replace
  2        Mira's Appraise bark on the field ({i:btn_pageL} ... {i:btn_pageR}), touch device on the phone
  2l       Mira's Lantern lesson line (the first box of lantern_get that names the button)
  3        Talk after the Episode 2 credits, in Hollowmere's inn
  3c       (after) the closing card after the Episode 2 credits
  4        (after) Mira's Talk line in mira_joins
  5        the title held upright (portrait device only)
Fails on any console error.
"""
import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA / 'world'))
import fieldlab  # noqa: E402

fieldlab.DEVICES.setdefault('portrait', {'width': 390, 'height': 844, 'dpr': 3, 'mobile': True, 'touch': True})
OUT = HERE / 'out'

READY = "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.engine.hasScene('config') && LQ_DEBUG.commands().includes('newGame')"

SEED_AUTOSAVE = """(async () => {
  const S = await import('/next/src/game/state.js');
  LQ_DEBUG.newGame('Arden', { scene: 'none', party: ['mira', 'bram'], level: 10, gold: 2840, playtime: 1442,
    flags: Object.fromEntries(S.EP1_DONE_FLAGS.map((f) => [f, true])) });
  const g = LQ_ENGINE.game;
  g.counters.credits_rolled = 1;
  S.setPosition(g, 'hero_home', 4, 3, 'down');
  LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
  LQ_ENGINE.game = null;
  LQ_DEBUG.reset('title');
  return true;
})()"""


def shot(lab, sid, tag, device):
    import base64
    import io
    from PIL import Image
    data = lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")')
    im = Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')
    p = OUT / f'w15_{sid}_{tag}_{device}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(p)
    print('  shot', p.name)
    return p


def wait(lab, js, ms=20000):
    lab.page.wait_for_function(js, timeout=ms, polling=30)


def typed(lab, ms=20000):
    wait(lab, "LQ_DEBUG.scene() === 'dialog' && LQ_DEBUG.state().sceneState && LQ_DEBUG.state().sceneState.done", ms)
    lab.frames(4)


def title_to_ep2(lab):
    wait(lab, "LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition")
    lab.frames(20)
    ss = lab.run('LQ_DEBUG.state().sceneState')
    items, idx = ss['items'], ss['index']
    target = items.index('ep2')
    for _ in range(abs(target - idx)):
        lab.press('down' if target > idx else 'up', 1)
        lab.frames(4)
    lab.frames(10)


def dialog_text(lab):
    return lab.run("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'dialog' ? String(s.text || '') : ''; })()") or ''


def touch_device(lab, device):
    if device != 'desktop':
        lab.run("LQ_ENGINE.input._setDevice('touch')")
        lab.frames(2)


def s1(lab, tag, device, confirm=False):
    lab.run(SEED_AUTOSAVE)
    touch_device(lab, device)
    title_to_ep2(lab)
    if not confirm:
        return shot(lab, '1', tag, device)
    lab.press('confirm', 1)
    lab.frames(30)
    return shot(lab, '1c', tag, device)


def field_party(lab, flags, mapid, x, y, d='up'):
    lab.run("LQ_DEBUG.newGame('Arden', { scene: 'none', party: ['mira', 'bram'], flags: %s })" % json.dumps({f: 1 for f in flags}))
    lab.warp(mapid, x, y, d)
    lab.frames(160)          # past the banner
    lab.wait_idle(20000)


EP1_MID = ['intro_done', 'saw_fading_sign', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'valley_arrived',
           'saw_milestone', 'archive_entered', 'f1_arrived', 'first_fight_done']


def s2(lab, tag, device):
    field_party(lab, EP1_MID, 'archive_f1', 20, 27)
    touch_device(lab, device)
    lab.run("(LQ_ENGINE.stack.find((s) => s.name === 'field').bark('first_appraise_target'), true)")
    typed(lab)
    return shot(lab, '2', tag, device)


def s2l(lab, tag, device):
    # The Lantern lesson as lantern_get speaks it (ep1.js): the box that names the button.
    lab.run("LQ_DEBUG.newGame('Arden', { scene: 'none', party: ['mira', 'bram'], flags: %s })" % json.dumps({f: 1 for f in EP1_MID + ['archive_f1_done', 'f2_arrived', 'echo_warden_defeated']}))
    lab.warp('archive_f2', None, None, 'up')
    lab.frames(160)
    lab.wait_idle(20000)
    touch_device(lab, device)
    lab.run("(LQ_DEBUG.call('scene', 'lantern_get'), true)")
    for _ in range(400):
        st = lab.run('LQ_DEBUG.state()')
        ss = st.get('sceneState') or {}
        if st.get('scene') == 'dialog' and 'Lantern with' in dialog_text(lab):
            break
        if st.get('scene') in ('dialog', 'choice', 'titleCard') and (st.get('scene') != 'dialog' or ss.get('done')):
            lab.press('confirm', 1)
        lab.frames(6)
    typed(lab)
    return shot(lab, '2l', tag, device)


EP2_DONE = """(async () => {
  const Q = await import('/next/src/data/quests.js');
  const g = LQ_ENGINE.game;
  for (const st of Q.MAIN_QUEST_EP2.steps) for (const f of [st.done].flat().filter(Boolean)) g.flags[f] = true;
  for (const f of ['nh_restored', 'aurel_named', 'ep2_complete', 'ep2_started', 'ep2_morning_done']) g.flags[f] = true;
  g.counters.credits2_rolled = 1;
  return Object.keys(g.flags).length;
})()"""


def ep2_done(lab):
    lab.run("LQ_DEBUG.newGameEp2('Arden', { scene: 'none' })")
    lab.run(EP2_DONE)


def s3(lab, tag, device):
    ep2_done(lab)
    lab.warp('nh_inn', None, None, 'down')
    lab.frames(160)
    lab.wait_idle(20000)
    touch_device(lab, device)
    lab.run("""(async () => { const Q = await import('/next/src/data/quests.js'); const D = await import('/next/src/ui/dialog.js');
      const g = LQ_ENGINE.game; const c = Q.partyChat((f) => !!g.flags[f], g.map);
      D.sayLines(LQ_ENGINE, [...c.lines, ...c.side, ...c.banter].map((l) => ({ who: l.who, text: l.text }))); return true; })()""")
    typed(lab)
    return shot(lab, '3', tag, device)


def s3c(lab, tag, device):
    ep2_done(lab)
    lab.run('LQ_ENGINE.game.counters.credits2_rolled = 0')
    lab.warp('nameless_hollow', None, None, 'down')
    for _ in range(600):
        st = lab.run('LQ_DEBUG.state()')
        if st.get('scene') == 'titleCard':
            break
        if st.get('scene') == 'credits':
            lab.press('start', 1)
        lab.frames(6)
    lab.frames(60)
    return shot(lab, '3c', tag, device)


def s4(lab, tag, device):
    lab.run("LQ_DEBUG.newGame('Arden', { scene: 'none', party: [], flags: { intro_done: 1, saw_fading_sign: 1, met_mael: 1 }, banner: false })")
    touch_device(lab, device)
    lab.warp('library', 10, 13, 'up')
    for _ in range(600):
        st = lab.run('LQ_DEBUG.state()')
        ss = st.get('sceneState') or {}
        if st.get('scene') == 'dialog' and 'Talk' in dialog_text(lab):
            break
        if st.get('scene') in ('dialog', 'choice', 'titleCard') and (st.get('scene') != 'dialog' or ss.get('done')):
            lab.press('confirm', 1)
        lab.frames(6)
    typed(lab)
    return shot(lab, '4', tag, device)


def s5(lab, tag, device):
    lab.run("localStorage.clear(); LQ_DEBUG.reset('title')")
    wait(lab, "LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition")
    lab.frames(40)
    return shot(lab, '5', tag, device)


def s7(lab, tag, device):
    # the arrival: the banner holds the floor's name on screen before Mira's first window (the before is the qa/shots.py
    # story_f1_arrival from before W15: the window cut the banner in half)
    lab.run("LQ_DEBUG.newGame('Arden', { scene: 'none', party: ['mira', 'bram'], flags: %s })" % json.dumps({f: 1 for f in ['intro_done', 'saw_fading_sign', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'valley_arrived', 'saw_milestone', 'archive_entered']}))
    touch_device(lab, device)
    lab.run("(LQ_DEBUG.call('warp', 'archive_f1', 20, 27, 'up'), true)")
    wait(lab, "(() => { const f = LQ_ENGINE.stack.find((s) => s.name === 'field'); return f && f.mapId === 'archive_f1' && f.banner.t >= 70; })()")
    return shot(lab, '7', tag, device)


def s10(lab, tag, device):
    # one tap on A in the name grid. The before rebuilds the old start (the name box filled with "Hero", which is what
    # the scene did when it was given no name); the after is the real New Game entry (a dim "Hero" placeholder).
    lab.run("LQ_DEBUG.reset('nameEntry', %s)" % ("{ name: 'Hero' }" if tag == 'before' else '{}'))
    wait(lab, "LQ_DEBUG.scene() === 'nameEntry' && !LQ_DEBUG.state().transition")
    touch_device(lab, device)
    lab.frames(10)
    shot(lab, '10rest', tag, device)
    lab.run('LQ_ENGINE.scene.grid.moveTo(0)')
    lab.press('confirm', 1)
    lab.frames(10)
    print('  name now', lab.run('LQ_DEBUG.state().sceneState.value'))
    return shot(lab, '10', tag, device)


SCEN = {'1': s1, '7': s7, '10': s10, '1c': lambda lab, t, d: s1(lab, t, d, True), '2': s2, '2l': s2l, '3': s3, '3c': s3c, '4': s4, '5': s5}
AFTER_ONLY = {'1c', '3c', '4'}


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', default='after')
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('ids', nargs='*')
    a = ap.parse_args(argv)
    ids = a.ids or [k for k in SCEN if k != '5' and (a.tag != 'before' or k not in AFTER_ONLY)]
    OUT.mkdir(parents=True, exist_ok=True)
    errors = []
    for device in a.device.split(','):
        lab = fieldlab.Lab(device=device)
        try:
            lab.open('?debug=1&fps=0')
            wait(lab, READY)
            for sid in ids:
                if sid == '5' and device != 'portrait':
                    continue
                print(f'{device} {sid}', flush=True)
                lab.run("try { localStorage.clear(); } catch (e) {} LQ_DEBUG.reset('title')")
                lab.frames(10)
                SCEN[sid](lab, a.tag, device)
                lab.run("(() => { const s = LQ_ENGINE.stack; while (s.length > 1 && ['dialog', 'choice', 'titleCard', 'credits', 'menu'].includes(LQ_DEBUG.scene())) LQ_ENGINE.pop(); return true; })()")
            errors += [f'{device}: {e}' for e in lab.errors]
        finally:
            lab.close()
    if errors:
        print('\n'.join(errors))
        print('W15_SHOTS: FAIL')
        return 1
    print('W15_SHOTS: OK, zero console errors')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
