"""X1-world, headless: the three live pieces of the shared engine work on the real field, with shots.

    python next/qa/world/x1_lab.py                      # every scenario
    python next/qa/world/x1_lab.py appraise exp pit     # some of them

Scenarios
  appraise  a scarecrow-like Appraise object injected into the valley's meadow (the real maps do not hold one until the Wider
            Valley lands): the prompt over it, the lens beam, Mira's lines in the window, then the hidden chest appears
            (sparkle), stays after a re-enter, and opens
  exp       s.give('exp', n) through the live cutscene API: the toast, then the level-up jingle and box when a member levels
  pit       the fall a `pit` area event hands to a OTHER map (FieldScene.fallInPit): lands there facing the given way,
            nobody loses HP

Shots: next/qa/world/out/x1_<scenario>_<n>.png (3x). Exit code 1 on a failed assertion or any console error.
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab  # noqa: E402
from abilities_lab import Run, check, Fail, F  # noqa: E402

INJECT = """(async () => {
  const st = await import('/next/src/game/story.js');
  st.registerStory({ lines: {
    x1lab_patch_appraise: [{ who: 'mira', text: 'Eleven pockets, and ten of them sewn shut.' }, { who: 'mira', text: 'Somebody left the eleventh open on purpose.' }],
    x1lab_patch_text: 'A scarecrow in a farmer\\'s coat. Somebody mended it with care.' } });
  const m = await import('/next/src/data/maps/valley.js');
  const ev = m.default.events;
  if (!ev.some((e) => e.id === 'x1lab_scarecrow')) {
    ev.push({ id: 'x1lab_scarecrow', type: 'object', x: 40, y: 10, sprite: 'signboard', appraise: true, appraiseText: 'x1lab_patch_appraise', text: 'x1lab_patch_text' });
    ev.push({ id: 'x1lab_chest', type: 'chest', x: 42, y: 11, tier: 'iron', item: 'hi_potion', behind: 'appraise:x1lab_scarecrow' });
  }
  return ev.length;
})()"""


class Lab2(Run):
    def snap(self, name):
        self.n += 1
        suffix = '_phone' if self.device == 'phone' else ''
        p = self.lab.shot(f'x1_{name}{suffix}')
        print('   shot', p)
        return p

    def dialog_open(self, timeout=15000):
        self.lab.page.wait_for_function('LQ_DEBUG.scene() === "dialog"', timeout=timeout, polling=30)


def sc_appraise(R):
    R.js(INJECT)
    R.setup('valley', 36, 10, 'right', select='appraise')
    R.js("(() => { const g = LQ_ENGINE.game; g.counters['bark:first_appraise_object'] = 1; })()")
    ent = R.ent('x1lab_scarecrow')
    check(ent and ent['present'], 'the scarecrow is on the map')
    check(R.ent('x1lab_chest')['concealed'], 'the chest behind it is hidden')
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'appraise' and ctx['kind'] == 'object' and ctx['target'] and ctx['at'] == [40, 10], f'pageR here is Appraise on the object ({ctx})')
    R.frames(12)
    R.snap('appraise_1_before')
    R.use()
    R.frames(20)
    R.snap('appraise_2_beam')
    R.dialog_open()
    R.frames(80)
    R.snap('appraise_3_window')
    check(R.js("LQ_ENGINE.game.opened['valley:x1lab_scarecrow'] === true"), 'markOpened(game, valley, x1lab_scarecrow)')
    R.press('confirm'); R.frames(30)
    R.press('confirm'); R.frames(8)
    R.drain()
    R.frames(20)
    R.snap('appraise_4_after')
    g = R.ent('x1lab_chest')
    check(not g['concealed'] and g['visible'], 'the chest has appeared')
    hit = R.ab()['lastHit']
    check(hit['kind'] == 'appraise' and hit['object'] == 'x1lab_scarecrow' and hit['revealed'] == ['x1lab_chest'], f'lastHit: {hit}')
    check(R.js('Object.keys(LQ_ENGINE.game.bestiary || {}).length') == 0, 'no bestiary entry was written')
    # leave and come back: the chest is still there (saved per save)
    R.lab.warp('valley', 36, 12, 'right'); R.frames(20); R.idle()
    check(not R.ent('x1lab_chest')['concealed'], 'after re-entering the map the chest is still revealed')
    R.js(f'{F}.leader.face("right")')
    # a confirm press on the scarecrow still reads its text when Appraise is not selected
    R.js('LQ_ENGINE.game.fieldAbility = "dash"')
    R.lab.warp('valley', 39, 10, 'right'); R.frames(20); R.idle()
    R.press('confirm'); R.frames(10)
    R.dialog_open()
    check(R.js('LQ_DEBUG.scene()') == 'dialog', 'confirm on the scarecrow opens its text')
    R.snap('appraise_5_text')
    R.drain()


def sc_exp(R):
    R.setup('valley', 36, 30, 'down')
    before = R.js('LQ_ENGINE.game.party.map(m => ({ id: m.id, exp: m.exp, level: m.level }))')
    need = R.js('(async () => { const p = await import("/next/src/data/party.js"); const m = LQ_ENGINE.game.party[0]; return p.expForLevel(m.level + 1) - m.exp; })()')
    amount = need + 2                      # enough to level the hero (and maybe more)
    R.js(f'(() => {{ window.__giveDone = false; {F}.cutscene.api.give("exp", {amount}).then(() => {{ window.__giveDone = true; }}); }})()')
    R.frames(30)
    R.snap('exp_1_toast')
    R.lab.page.wait_for_function('LQ_DEBUG.scene() === "dialog"', timeout=20000, polling=30)
    R.frames(70)
    R.snap('exp_2_levelup')
    R.drain()
    R.lab.page.wait_for_function('window.__giveDone === true', timeout=20000, polling=50)
    after = R.js('LQ_ENGINE.game.party.map(m => ({ id: m.id, exp: m.exp, level: m.level }))')
    for b, a in zip(before, after):
        check(a['exp'] == b['exp'] + amount, f"{a['id']} gained exactly {amount} EXP ({b['exp']} -> {a['exp']})")
    check(after[0]['level'] > before[0]['level'], f"the hero leveled ({before[0]['level']} -> {after[0]['level']})")


def sc_pit(R):
    R.setup('valley', 36, 30, 'down')
    hp = R.js('LQ_ENGINE.game.party.map(m => m.hp)')
    R.js(f"{F}.fallInPit(['archive_f1', 30, 13, 'left'])")
    R.lab.page.wait_for_function('(() => { const f = ' + F + '; return f && f.map && f.map.id === "archive_f1" && !f.pendingWarp && !f.loading; })()', timeout=30000, polling=50)
    R.frames(20)
    s = R.state()
    check(s['leader']['x'] == 30 and s['leader']['y'] == 13, f"landed on the given cell: {s['leader']}")
    check(R.js(f'{F}.leader.dir') == 'left', 'facing the given direction')
    check(R.js('LQ_ENGINE.game.party.map(m => m.hp)') == hp, 'nobody lost HP')
    R.snap('pit_1_landed')


SCENARIOS = {'appraise': sc_appraise, 'exp': sc_exp, 'pit': sc_pit}


def main(argv):
    names = [a for a in argv if a in SCENARIOS] or list(SCENARIOS)
    t0 = time.time()
    failed = []
    lab = Lab('desktop')
    try:
        lab.open()
        R = Lab2(lab, 'desktop')
        for n in names:
            print(f'[{n}]')
            try:
                SCENARIOS[n](R)
            except Exception as e:  # noqa: BLE001
                failed.append(f'{n}: {e}')
                print('   FAIL', str(e)[:600])
                try:
                    R.snap(f'{n}_FAILED')
                except Exception:  # noqa: BLE001
                    pass
    finally:
        errs = list(lab.errors)
        lab.close()
    for e in errs:
        print('CONSOLE', e[:600])
    print(f'done in {time.time() - t0:.1f}s: {len(names) - len(failed)}/{len(names)} scenarios passed, {len(errs)} console errors')
    if failed or errs:
        for f in failed:
            print('FAILED', f)
        return 1
    print('OK: x1 lab passed')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
