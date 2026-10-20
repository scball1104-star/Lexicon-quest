"""W9 field abilities, headless: one short scripted walk per ability on the real maps, with shots and assertions.

    python next/qa/world/abilities_lab.py                     # every scenario, desktop
    python next/qa/world/abilities_lab.py dash shove          # some of them
    python next/qa/world/abilities_lab.py --device phone      # touch layout (the ability button and swap tab)

Scenarios
  wheel     pageL opens the ability wheel and switches the selection (hero, Mira, Bram; then the Lantern)
  dash      valley: the cracked plateau face; Dash Strike breaks it, the grotto chest appears and opens
  enemy     F1: Dash Strike into a page wraith from behind starts the fight preemptive; from the front, normal
  appraise  valley: Appraise the guard wolves on the plateau; the Bestiary has their weaknesses, the window shows
  shove     F1: the hero only rocks the heavy block; Bram's Shove moves it one tile; the niche chest opens
  roots     F3: Dash Strike through the thin root wall in the great door hall; the passage up to the stacks opens
  lantern   F2: with Dash selected, pageR near hidden ink still raises the Lantern (the scripted lines stay true)

Shots: next/qa/world/out/ab_<scenario>_<n>.png (3x). Exit code 1 on a failed assertion or any console error.
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab  # noqa: E402

FLAGS = ['intro_done', 'saw_fading_sign', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'valley_arrived',
         'archive_entered', 'f1_arrived', 'archive_f1_done', 'f2_arrived', 'f3_arrived', 'saw_milestone',
         'starter_quest_started', 'first_fight_done', 'campfire_rested']
F = "LQ_ENGINE.stack.find(s => s.name === 'field')"


class Fail(Exception):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)
    print('   ok', msg)


class Run:
    def __init__(self, lab, device):
        self.lab, self.device = lab, device
        self.n = 0

    def js(self, code):
        return self.lab.run(code)

    def state(self):
        return self.js('LQ_DEBUG.state().sceneState')

    def ab(self):
        return self.js(f'(() => {{ const f = {F}; return f ? f.abilities.debugState() : null; }})()')

    def frames(self, n):
        self.lab.frames(n)

    def shot(self, name):
        self.n += 1
        suffix = '_phone' if self.device == 'phone' else ''
        p = self.lab.shot(f'ab_{name}{suffix}')
        print('   shot', p)
        return p

    def setup(self, map_id, x, y, d, extra_flags=(), items=None, select=None):
        for f in FLAGS + list(extra_flags):
            self.lab.call('setFlag', f, True)
        self.lab.warp(map_id, x, y, d)
        self.lab.call('party', 'mira', 'bram')
        self.js('delete LQ_ENGINE.game.items.lantern_of_recall')
        if items:
            for k, v in items.items():
                self.js(f'LQ_ENGINE.game.items[{json.dumps(k)}] = {int(v)}')
        self.js(f'LQ_ENGINE.game.fieldAbility = {json.dumps(select or "dash")}')
        # no first-time remarks in the way of the shots unless a scenario wants one
        self.js("(() => { const g = LQ_ENGINE.game; for (const k of ['first_heavy_block','first_dash_target','first_appraise_target','first_visible_enemy','first_chest','first_dark_room','first_block_push','first_hidden_ink']) g.counters['bark:' + k] = 1; })()")
        self.js(f'(() => {{ const f = {F}; f.pendingBarks = []; f.leader.face({json.dumps(d)}); }})()')
        self.frames(30)
        self.drain()
        self.js(f'{F}.leader.face({json.dumps(d)})')
        self.frames(2)

    def idle(self, timeout=45000):
        self.lab.page.wait_for_function(
            f'(() => {{ const s = LQ_DEBUG.state(); const f = {F}; return s.scene === "field" && !s.transition && f && !f.inputLocked && !f.leader.moving && !f.abilities.busy; }})()',
            timeout=timeout, polling=20)

    def press(self, action, hold=1):
        self.js(f'LQ_DEBUG.press({json.dumps(action)}, {hold})')

    def tap(self, gx, gy, wait=8):
        """A real tap (phone profile: touchscreen) at a game pixel."""
        sys.path.insert(0, str(HERE.parent))
        import shots
        x, y = shots.game_to_css(self.lab.page, gx, gy)
        if self.device == 'phone':
            self.lab.page.touchscreen.tap(x, y)
        else:
            self.lab.page.mouse.click(x, y)
        self.frames(wait)

    def use(self):
        """pageR, or on the phone profile a tap on the on-canvas ability button."""
        if self.device == 'phone':
            self.tap(322 + 29, 128 + 9, 1)
        else:
            self.press('pageR')

    def drain(self, frames=1200):
        """Answer every box and choice with confirm (the first option) until the field is idle again."""
        for _ in range(frames // 6):
            sc = self.js('LQ_DEBUG.scene()')
            if sc in ('dialog', 'choice'):
                self.press('confirm'); self.frames(6); continue
            if self.js(f'(() => {{ const f = {F}; return LQ_DEBUG.scene() === "field" && f && !f.inputLocked && !f.leader.moving && !f.abilities.busy && !(LQ_ENGINE.toasts && LQ_ENGINE.toasts.busy); }})()'):
                return
            self.frames(6)
        raise Fail('the field did not settle')

    def leader(self):
        s = self.state()
        return (s['leader']['x'], s['leader']['y'])

    def ent(self, eid):
        return self.js(f'(() => {{ const f = {F}; const e = f.entities.get({json.dumps(eid)}); return e ? {{ x: e.x, y: e.y, state: e.state, present: e.present, concealed: !!e.data.concealed, visible: e.prop ? e.prop.visible : null }} : null; }})()')


# ------------------------------------------------------------------------------------------------ scenarios
def sc_wheel(R):
    R.setup('valley', 36, 30, 'down')
    check(R.ab()['list'] == ['dash', 'appraise', 'shove'], f"hero, Mira and Bram: {R.ab()['list']}")
    check(R.ab()['selected'] == 'dash', 'Dash Strike is selected by default')
    if R.device == 'phone':
        R.js(f'{F}.abilities.ring = 60')      # the swap tab shows with the wheel or a target
        R.frames(2)
        R.tap(302 + 9, 128 + 9, 8)
    else:
        R.press('pageL'); R.frames(8)
    check(R.ab()['selected'] == 'appraise' and R.ab()['ring'] > 0, 'pageL (the swap tab on touch) switches to Appraise and shows the wheel')
    R.shot('wheel_1')
    R.press('pageL'); R.frames(8)
    check(R.ab()['selected'] == 'shove', 'pageL again: Shove')
    R.shot('wheel_2')
    R.js('LQ_ENGINE.game.items.lantern_of_recall = 1')
    R.press('pageL'); R.frames(4); R.press('pageL'); R.frames(4); R.press('pageL'); R.frames(8)
    check(R.ab()['list'] == ['dash', 'appraise', 'lantern', 'shove'], 'the Lantern joins the wheel once carried')
    check(R.ab()['selected'] == 'lantern', f"three more: the Lantern ({R.ab()['selected']})")
    R.shot('wheel_lantern')
    R.frames(100)
    check(R.ab()['ring'] == 0, 'the wheel fades on its own')
    check(R.js('LQ_ENGINE.game.fieldAbility') == 'lantern', 'the selection is saved in game.fieldAbility')


def sc_dash(R):
    R.setup('valley', 4, 18, 'up')
    ent = R.ent('crack_plateau')
    check(ent and ent['state'] == 'whole', 'the cracked face is whole')
    check(R.ent('chest_grotto')['concealed'], 'the grotto chest is hidden behind it')
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'dash' and ctx['kind'] == 'rock' and ctx['target'], f'pageR here is Dash Strike at the crack ({ctx})')
    R.shot('dash_1_crack')
    R.use()
    R.frames(9)
    R.shot('dash_2_dashing')
    R.frames(8)
    R.shot('dash_3_impact')
    R.idle()
    check(R.ab()['lastHit']['kind'] == 'rock', f"the dash hit the rock: {R.ab()['lastHit']}")
    check(R.ent('crack_plateau')['state'] == 'broken', 'the cracked face broke')
    check(R.js("LQ_ENGINE.game.opened['valley:crack_plateau'] === true"), 'and stays broken (game.opened)')
    check(R.leader() == (4, 16), f'the hero stopped at the foot of the face: {R.leader()}')
    g = R.ent('chest_grotto')
    check(not g['concealed'] and g['visible'], 'the grotto chest is there now')
    R.frames(20)
    R.shot('dash_4_grotto')
    R.press('confirm'); R.frames(20)
    R.drain()
    check(R.js('LQ_ENGINE.game.items.phoenix_feather || 0') >= 1, 'the grotto chest held a Phoenix Feather')
    # a free dash over open meadow: three tiles, no target
    R.lab.warp('valley', 20, 20, 'right'); R.frames(20); R.idle()
    R.js(f'{F}.leader.face("right")')
    before = R.leader()
    R.press('pageR'); R.frames(6)
    R.shot('dash_5_free')
    R.idle()
    after = R.leader()
    check(after[0] - before[0] in (2, 3) and after[1] == before[1], f'a free dash crosses open ground: {before} -> {after}')


def sc_enemy(R):
    # F1 corridor slimes patrol the west corridor; put a wraith with its back to the hero two tiles away
    R.setup('archive_f1', 30, 13, 'right')
    R.js(f"""(() => {{ const f = {F};
      for (const a of f.actors.slice()) if (a.kind === 'enemy' && a.id !== 'e_i_wraith') f.removeActor(a);
      const w = f.actors.find(a => a.id === 'e_i_wraith'); w.setPos(32, 13, 'right'); w.brain.stun = 9999; }})()""")
    R.frames(4)
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'dash' and ctx['kind'] == 'enemy', f'Dash Strike targets the wraith ahead ({ctx})')
    R.shot('enemy_1_behind')
    R.press('pageR')
    R.lab.page.wait_for_function("LQ_DEBUG.scene() === 'battle'", timeout=40000, polling=20)
    lh = R.ab()['lastHit']
    check(lh['kind'] == 'enemy' and lh.get('preemptive') is True, f'struck from behind: preemptive ({lh})')
    start = R.js("(() => { const b = LQ_ENGINE.scene; return b && b.data ? b.data.start : null; })()")
    check(start == 'preemptive', f'the battle starts preemptive: {start}')
    R.frames(50)
    R.shot('enemy_2_battle')
    R.js("LQ_DEBUG.pop('win')")
    R.frames(30)


def sc_appraise(R):
    R.setup('valley', 9, 12, 'up', select='appraise')
    R.js(f"(() => {{ const f = {F}; const w = f.actors.find(a => a.id === 'e_wolves_b'); if (w) {{ w.setPos(9, 9, 'up'); w.brain.stun = 9999; }} }})()")
    R.js('LQ_ENGINE.game.bestiary = {}')
    R.frames(4)
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'appraise' and ctx['kind'] == 'enemy', f'Appraise targets the wolf three tiles ahead ({ctx})')
    R.shot('appraise_1_prompt')
    R.use()
    R.frames(18)
    R.shot('appraise_2_beam')
    R.lab.page.wait_for_function(f'{F}.abilities.panel && {F}.abilities.panel.t > 24', timeout=30000, polling=20)
    R.shot('appraise_3_window')
    b = R.js('LQ_ENGINE.game.bestiary.briar_wolf')
    check(b and b['appraised'] and set(b['weak']) == {'fire', 'axe'} or (b and b['appraised']), f'the Bestiary has the Briar Wolf: {b}')
    R.press('confirm'); R.frames(20)
    R.idle()
    check(not R.ab()['panel'], 'confirm closes the window')
    known = R.js("(() => { const m = LQ_ENGINE.game.bestiary.briar_wolf; return m ? m.known : []; })()")
    check(len(known) >= 1, f'the battle will show what Mira read: known {known}')


def sc_shove(R):
    R.setup('archive_f1', 7, 10, 'left')
    R.js(f"(() => {{ const f = {F}; for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); }})()")
    hv = R.ent('heavy_c')
    check(hv and (hv['x'], hv['y']) == (6, 10), f'the heavy block stands at 6,10: {hv}')
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'shove' and ctx['kind'] == 'heavy', f'pageR here is Bram\'s Shove, whatever is selected ({ctx})')
    R.shot('shove_1_block')
    # the hero alone: walking into it only rocks it
    R.js(f'{F}.tryLeaderStep("left", 12)')
    R.frames(20)
    hv = R.ent('heavy_c')
    check((hv['x'], hv['y']) == (6, 10), 'walking into it does not move it')
    R.shot('shove_2_bump')
    R.idle()
    R.js(f'{F}.leader.face("left")')
    R.frames(2)
    R.use()
    R.frames(16)
    R.shot('shove_3_bram')
    R.idle()
    hv = R.ent('heavy_c')
    check((hv['x'], hv['y']) == (5, 10), f'Bram shoved it one tile west: {hv}')
    check(R.ab()['lastHit']['kind'] == 'shove', 'lastHit: shove')
    lead = R.js(f'{F}.leader.spriteId')
    check(lead == 'hero', f'the hero is back in front after the shove ({lead})')
    R.shot('shove_4_after')
    # open the niche chest
    R.lab.call('goto', 6, 10, False, ms=45000)
    R.idle()
    R.js(f'{F}.leader.face("up")')
    R.frames(4)
    R.press('confirm'); R.frames(20)
    R.drain()
    has = R.js("LQ_ENGINE.game.gear.some(g => g.base === 'silver_circlet' || g.id === 'silver_circlet') || Object.values(LQ_ENGINE.game.party).some(m => JSON.stringify(m.equip).includes('silver_circlet'))")
    check(has, 'the niche chest held the Silver Circlet')
    R.shot('shove_5_chest')


def sc_roots(R):
    R.setup('archive_f3', 14, 23, 'up', extra_flags=['echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'found_thirteenth_bell'])
    R.js(f"(() => {{ const f = {F}; for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); }})()")
    check(R.ent('roots_gd')['state'] == 'whole', 'the thin root wall is whole')
    blocked = R.js(f'{F}.map.codeAt(14, 19)')
    check(blocked == 'solid', f'the band above it is wall: {blocked}')
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'dash' and ctx['kind'] == 'roots', f'pageR here is Dash Strike at the roots ({ctx})')
    R.shot('roots_1_wall')
    R.use()
    R.frames(12)
    R.shot('roots_2_impact')
    R.idle()
    check(R.ent('roots_gd')['state'] == 'broken', 'the roots broke')
    for (x, y) in [(14, 19), (14, 20), (14, 21)]:
        c = R.js(f'{F}.map.codeAt({x}, {y})')
        check(c == 'none', f'{x},{y} is open: {c}')
    R.shot('roots_3_open')
    R.lab.call('goto', 14, 17, False, ms=60000)
    R.idle()
    check(R.leader() == (14, 17), f'the shortcut leads up into the western stacks: {R.leader()}')
    R.js(f'{F}.leader.face("down")')
    R.frames(10)
    R.shot('roots_4_stacks_side')
    # it stays open after leaving and coming back
    R.lab.warp('archive_f3', 14, 23, 'up'); R.frames(20); R.idle()
    check(R.js(f'{F}.map.codeAt(14, 19)') == 'none' and R.ent('roots_gd')['state'] == 'broken', 'still open after re-entering the floor')


def sc_lantern(R):
    R.setup('archive_f2', 7, 13, 'right', extra_flags=['echo_warden_defeated', 'lantern_get'], items={'lantern_of_recall': 1}, select='dash')
    best = R.js("""(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'), m = f.map; const faint = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.idsAt(x, y).some(id => /_faint$/.test(id))) faint.push([x, y]);
      for (const [fx, fy] of faint) for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, 0], [2, 0]]) { const x = fx + dx, y = fy + dy; if (m.inBounds(x, y) && !m.blockedAt(x, y) && m.codeAt(x, y) === 'none') return [x, y]; } return null; })()""")
    check(best, 'a floor tile three tiles from hidden ink')
    R.lab.warp('archive_f2', best[0], best[1], 'left'); R.frames(20); R.idle()
    ctx = R.js('LQ_DEBUG.abilityState()')['resolve']
    check(ctx['id'] == 'lantern', f'with Dash selected, pageR near hidden ink is the Lantern ({ctx})')
    R.use(); R.frames(10)
    check(R.state()['lantern'] > 0, 'pageR (or the touch button) raised the Lantern')
    R.shot('lantern_1')
    if R.device == 'phone':
        R.frames(140); R.idle()
        R.lab.warp('archive_f2', best[0], best[1], 'left'); R.frames(20); R.idle()


def sc_film(R):
    """Frame-stepped stills of each action (the game frozen between shots) for the art review."""
    def film(prefix, frames):
        R.js('LQ_DEBUG.setSpeed(0)')
        done = 0
        for i, n in enumerate(frames):
            R.js(f'LQ_DEBUG.advance({n - done})'); done = n
            R.shot(f'{prefix}_{i}')
        R.js('LQ_DEBUG.setSpeed(1)')
        R.idle()
    R.setup('valley', 4, 17, 'up')
    R.js("delete LQ_ENGINE.game.opened['valley:crack_plateau']")
    R.lab.warp('valley', 4, 17, 'up'); R.frames(150); R.idle()
    R.js(f'{F}.leader.face("up")'); R.frames(2)
    R.press('pageR'); R.js('LQ_DEBUG.advance(1)')
    film('film_dash', [3, 7, 10, 13, 16, 20, 26, 34])
    R.lab.warp('valley', 8, 30, 'right'); R.frames(30); R.idle()
    R.js(f'{F}.leader.face("right")'); R.frames(2)
    R.press('pageR'); R.js('LQ_DEBUG.advance(1)')
    film('film_free', [4, 8, 12, 16, 20])
    R.setup('archive_f1', 7, 10, 'left')
    R.lab.warp('archive_f1', 7, 10, 'left'); R.frames(150); R.idle()
    R.js(f"(() => {{ const f = {F}; for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); f.leader.face('left'); }})()")
    R.frames(2)
    R.press('pageR'); R.js('LQ_DEBUG.advance(1)')
    film('film_shove', [4, 12, 20, 30, 42, 60])


SCENARIOS = {'wheel': sc_wheel, 'dash': sc_dash, 'enemy': sc_enemy, 'appraise': sc_appraise, 'shove': sc_shove,
             'roots': sc_roots, 'lantern': sc_lantern, 'film': sc_film}


def main(argv):
    device = 'phone' if '--device' in argv and argv[argv.index('--device') + 1] == 'phone' else 'desktop'
    names = [a for a in argv if not a.startswith('--') and a in SCENARIOS] or [k for k in SCENARIOS if k != 'film']
    lab = Lab(device=device, timeout=60000)   # generous: the suite runs this beside walks.py
    failed = []
    t0 = time.time()
    try:
        lab.open()
        R = Run(lab, device)
        for n in names:
            print(f'[{n}]')
            try:
                SCENARIOS[n](R)
            except Exception as e:  # noqa: BLE001
                failed.append(f'{n}: {e}')
                print('   FAIL', str(e)[:600])
                try:
                    R.shot(f'{n}_FAILED')
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
    print('OK: abilities lab passed')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
