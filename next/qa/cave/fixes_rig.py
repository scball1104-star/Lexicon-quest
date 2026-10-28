"""C4-fixes rig: the critique's fixes in the real game, headless Chromium, phone first, then desktop.

    python next/qa/cave/fixes_rig.py                    phone, then desktop
    python next/qa/cave/fixes_rig.py --device phone     one device

The page runs with ?cave=1&debug=1 (the pack forced while CAVE_LIVE is false). Per device:
  4   the hall: Hollis's three rules (rule 3 says a fall takes back this reading's gifts), Begin, B1
  20  (on the way) nothing in the vault on a first reading: no vault question
  1   a stair whose floor the generator refuses (the catalogue band's prefabs emptied in the page): the party stays on B2, the
      line shows, the floor tag reads B2, no engine error and no red panel; the band back, the same stair goes down to B3
  3   a fight on B3 left open: the suspend holds inBattle; the page reloads mid-fight; the title's Resume row (and its layout,
      issue 22); Resume restarts that fight with the party as suspended; won: the suspend drops inBattle, the foe stays gone
  12  the hall with that reading suspended (a slot-0 game standing in the hall): Begin asks "A reading is open below. Abandon
      it?"; Keep it keeps the suspend; asked again, Abandon it starts a new reading
  17  B100 (the run set to B99, the stair down): no Quill chest, the plaque reads plaque_b100; the Binder beaten for real (its
      last phase at 1 HP): no equip prompt before "The Binder comes apart...", the hall's lines, then the Quill's prompt
Shots: next/qa/cave/fixes_out/<device>-fix-NN-name.png (the 384x216 frame at 3x) and <device>-fix-NN-name_page.png (the
whole page, the touch layout on the phone). Prints FIXES_RIG: PASS or FAIL. Bounded: every wait has a timeout; a watchdog
kills the run after 600 s per device.
"""
import json
import os
import pathlib
import shutil
import sys
import threading
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA / 'world'))
sys.path.insert(0, str(QA))
from fieldlab import Lab  # noqa: E402

OUT = HERE / 'fixes_out'
QUERY = '?debug=1&fps=0&cave=1'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
# text boxes are confirmed; a choice is answered only through answer(); battles are won unless __hold is set; cards pass
AUTO_JS = """window.__lqAuto && clearInterval(window.__lqAuto); window.__lqScenes = window.__lqScenes || []; window.__hold = false; window.__lines = window.__lines || [];
window.__lqAuto = setInterval(() => {
  const s = LQ_DEBUG.scene();
  if (s && window.__lqScenes[window.__lqScenes.length - 1] !== s) window.__lqScenes.push(s);
  const top = LQ_ENGINE.scene;
  if (s === "dialog" && top && top.debugState) {
    const d = top.debugState();
    const t = top.box && top.box.text;
    if (t && window.__lines[window.__lines.length - 1] !== t) window.__lines.push(t);
    if (!d.choices && !window.__holdText) LQ_DEBUG.press("confirm", 1);
    else if (d.choices && !top.choiceBox && !d.typing) LQ_DEBUG.press("confirm", 1);
  } else if (s === "titleCard" || s === "choice") { if (!window.__holdText) LQ_DEBUG.press("confirm", 1); }
  else if (s === "battle" && !window.__hold) {
    const b = LQ_ENGINE.scene;
    if (b && b.phase !== "intro" && !b.leaving && b.b) LQ_DEBUG.pop("win");
  }
}, 120)"""
DIRS = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}


class Fail(Exception):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)
    print('  ok', msg)


class Rig:
    def __init__(self, device):
        self.device = device
        self.lab = Lab(device=device, timeout=30000)
        self.n = 0
        self.shots = []
        self.seed = 4100   # fixed game seeds: the readings (and their floors) are the same on every run

    def run(self, js):
        return self.lab.run(js)

    def call(self, name, *args, ms=30000):
        return self.lab.call(name, *args, ms=ms)

    def wait(self, js, ms=30000, what=''):
        try:
            self.lab.page.wait_for_function(js, timeout=ms, polling=50)
        except Exception as e:  # noqa: BLE001
            raise Fail(f'timeout waiting for {what or js[:80]}: {type(e).__name__}') from e

    def shot(self, name, page=False):
        self.n += 1
        base = f'{self.device}-fix-{self.n:02d}-{name}'
        src = pathlib.Path(self.lab.shot(base))
        for f in [src, src.with_name(f'{base}_x1.png')]:
            if f.exists():
                shutil.move(str(f), str(OUT / f.name))
        self.shots.append(str(OUT / src.name))
        if page:
            p = pathlib.Path(self.lab.screenshot(base))
            shutil.move(str(p), str(OUT / p.name))
            self.shots.append(str(OUT / p.name))
        print('  shot', OUT / src.name, '(+page)' if page else '')

    def cave(self):
        return self.run('LQ_DEBUG.state().cave')

    def field(self):
        return self.run('LQ_DEBUG.fieldState()')

    def wait_map(self, map_id, ms=40000):
        self.wait(f'(() => {{ const f = {FIELD}; const s = LQ_DEBUG.state(); return !!f && !!f.map && f.map.id === {json.dumps(map_id)} && !f.loading && !f.pendingWarp && !s.transition; }})()', ms, f'map {map_id}')
        self.lab.frames(4)

    def wait_quiet(self, ms=60000):
        self.wait(f'(() => {{ const f = {FIELD}; const s = LQ_DEBUG.state(); return s.scene === "field" && !!f && !f.loading && !f.pendingWarp && !f.inputLocked && !(f.cutscene && f.cutscene.running) && !s.transition && !(f.leader && f.leader.moving); }})()', ms, 'the field to be quiet')

    def wait_dialog(self, text_part, ms=30000):
        """Until a dialog box (fully typed) shows text containing text_part."""
        self.wait(f'(() => {{ const s = LQ_ENGINE.scene; return LQ_DEBUG.scene() === "dialog" && s && s.box && String(s.box.text).includes({json.dumps(text_part)}) && !s.debugState().typing; }})()', ms, f'the line "{text_part}"')
        self.lab.frames(6)

    def wait_choices(self, first_label, ms=30000):
        self.wait(f'(() => {{ const s = LQ_ENGINE.scene; return LQ_DEBUG.scene() === "dialog" && s && s.choiceBox && s.choices && s.choices[0] === {json.dumps(first_label)}; }})()', ms, f'the choices {first_label}')
        self.lab.frames(6)

    def answer(self, i):
        for _ in range(i):
            self.lab.press('down', 2)
            self.lab.frames(6)
        self.lab.press('confirm', 2)
        self.lab.frames(8)

    def goto(self, x, y, tries=4):
        r = None
        for _ in range(tries):
            self.wait_quiet()
            r = self.call('goto', x, y, True, ms=120000)
            if r and r[0] == x and r[1] == y:
                return r
            self.lab.frames(30)
        raise Fail(f'could not reach {x},{y} (last {r})')

    def face(self, d):
        self.run(f'(() => {{ const f = {FIELD}; f.leader.face({json.dumps(d)}); }})()')
        self.lab.frames(2)

    def engine_errors(self):
        return self.run('(LQ_ENGINE.errors || []).map(e => e.msg)')

    def open(self, reload=False):
        if reload:
            self.lab.page.reload(wait_until='load')
            self.lab.page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
            self.run('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 20000))])')
        else:
            self.lab.open(QUERY)
        self.run(AUTO_JS)
        self.run('LQ_DEBUG.setSpeed && LQ_DEBUG.setSpeed(3)')
        self.wait('window.LQ_PACKS && LQ_PACKS.packReady("cave")', 40000, 'the cave pack')
        self.wait('LQ_DEBUG.commands().includes("caveBegin")', 10000, 'the world hooks')

    def to_hall(self):
        # a fresh game past Episode 1 on a fresh field (what Continue does: the field never keeps an older game)
        self.seed += 1
        self.run(f'LQ_DEBUG.newGameEp2("Arden", {{ scene: "none", seed: {self.seed} }}); LQ_ENGINE.reset("field", {{ map: "library", x: 16, y: 5, dir: "up" }})')
        self.wait_map('library')
        self.wait_quiet()
        self.lab.walk('up')
        self.wait_map('cave_landing0')
        self.wait_quiet()

    def talk(self):
        self.goto(10, 10)
        self.face('up')
        self.lab.press('confirm', 2)
        self.lab.frames(6)

    # ---------------------------------------------------------------- the steps
    def step_rules_and_begin(self):
        print(' [4] the hall: the three rules, Begin')
        self.to_hall()
        self.run('window.__holdText = true')
        self.talk()
        for part, name in [('Keeper, once', None), ('level one, empty hands', None), ('A blue chest gives', None), ("take back this reading's gifts", 'rule3')]:
            self.wait_dialog(part)
            if name:
                self.shot(name, page=True)
            self.lab.press('confirm', 2)
            self.lab.frames(6)
        self.run('window.__holdText = false')
        self.wait_choices('Begin')
        self.answer(0)
        self.wait_choices('Go down')
        self.answer(0)
        self.wait_map('cave_b1', 90000)
        self.wait_quiet()
        c = self.cave()
        check(c['inRun'] and c['floor'] == 1, f'B1 ({c["floor"]})')
        seen = self.run('window.__lines.slice()')
        check(not any('vault came down' in l for l in seen), 'a first reading (empty vault): no vault question')

    def step_refused_stair(self):
        print(' [1] a refused stair')
        self.run('(async () => { const G = await import(new URL("src/data/cave/gen.js", location.href).href); const P = await import(new URL("src/data/cave/prefabs.js", location.href).href); window.__savedPrefabs = P.PREFAB_SETS.catalogue; G.registerBand("catalogue", { prefabs: [] }); })()')
        self.lab.frames(4)
        self.walk_stairs(1)                     # B2 was built at the start: down to B2 (its next floor is refused and skipped)
        check(self.cave()['floor'] == 2, 'on B2 (built before the band broke)')
        s = self.call('caveStairs')
        sx, sy = s['stairs']
        self.run('window.__holdText = true')
        try:
            self.goto(sx, sy, tries=3)
            self.lab.walk('up')
        except Fail as e:
            print('  (the walk was blocked, the stair hook straight:', e, ')')
            check(self.call('caveDescend', ms=60000) is None, 'the stair refused')
        self.wait_dialog('The stair goes down into nothing')
        st = self.field()
        c = self.cave()
        check(st['map'] == 'cave_b2' and c['floor'] == 2, f'the party and the run stay on B2 ({st["map"]}, run B{c["floor"]})')
        check(st['floorTag'] == 'B2', f'the floor tag reads B2 ({st["floorTag"]})')
        check(self.engine_errors() == [], f'no engine error, no red panel ({self.engine_errors()})')
        self.shot('stair_refused', page=True)
        self.run('window.__holdText = false')
        self.lab.press('confirm', 2)
        self.wait_quiet()
        self.run('(async () => { const G = await import(new URL("src/data/cave/gen.js", location.href).href); G.registerBand("catalogue", { prefabs: window.__savedPrefabs }); })()')
        self.lab.frames(4)
        self.lab.walk('down')
        self.wait_quiet()
        try:
            self.goto(sx, sy, tries=3)
            self.lab.walk('up')
        except Fail:
            self.call('caveDescend', ms=60000)
        self.wait_map('cave_b3', 60000)
        self.wait_quiet()
        check(self.cave()['floor'] == 3 and self.field()['floorTag'] == 'B3', 'the band whole again: the same stair goes down to B3')

    def walk_stairs(self, cur):
        s = self.call('caveStairs')
        sx, sy = s['stairs']
        try:
            self.goto(sx, sy, tries=3)
            self.lab.walk('up')
        except Fail:
            self.call('caveDescend', ms=60000)
        self.wait_map(f'cave_b{cur + 1}', 60000)
        self.wait_quiet()

    def step_suspend_in_fight(self):
        print(' [3] a fight left open, the page closed, Resume')
        ents = [e for e in self.field()['entities'] if e.startswith('enemy:')]
        check(ents, f'foes on B3 ({len(ents)})')
        self.run('window.__hold = true')
        mark = self.run('window.__lqScenes.length')
        fought = False
        for e in ents:
            name, at = e.split(':', 1)[1].split('@')
            ex, ey = [int(v) for v in at.split(',')]
            for d, (dx, dy) in DIRS.items():
                try:
                    self.call('goto', ex - dx, ey - dy, True, ms=60000)
                except Exception:  # noqa: BLE001
                    pass
                if self.run('LQ_DEBUG.scene()') == 'battle':
                    fought = True
                    break
                self.face(d)
                self.lab.press(d, 3)
                self.lab.frames(24)
                if self.run('LQ_DEBUG.scene()') == 'battle':
                    fought = True
                    break
            if fought:
                break
        check(fought, 'a fight started')
        self.wait('LQ_ENGINE.scene && LQ_ENGINE.scene.name === "battle" && LQ_ENGINE.scene.phase !== "intro"', 30000, 'the battle to settle')
        self.lab.frames(30)
        env = self.run('(() => { const e = LQ_ENGINE.save.loadEnvelope("cave"); return { inBattle: e.data.cave.run.inBattle || null, gone: e.data.cave.run.gone || null, hp: e.data.party.map(m => m.hp), floor: e.meta.cave.floor }; })()')
        check(env['inBattle'] and env['inBattle']['floor'] == 3, f'the suspend holds the fight ({env["inBattle"]})')
        check(self.run('LQ_ENGINE.game.cave.run.inBattle === undefined'), 'the live game does not carry the mark')
        foe = env['inBattle']['foe']
        self.shot('fight_open', page=True)
        # close the tab mid-fight: reload, the title
        self.open(reload=True)
        self.wait('LQ_DEBUG.scene() === "title"', 30000, 'the title')
        self.lab.frames(40)
        rows = self.run('LQ_ENGINE.scene.menu.items.map(i => i.label)')
        check(any(r.startswith('Resume the Deep Stacks (B3)') for r in rows), f'the title offers Resume B3 ({rows})')
        win = self.run('LQ_ENGINE.scene.win')
        sub_bottom = self.run('(() => { const t = LQ_ENGINE.scene; return Math.max(4, Math.min(26, t.win.y - 87)) + 58 + 3 + 24; })()')
        check(sub_bottom <= win['y'], f'the menu window ({win}) sits below the subtitle (bottom {sub_bottom}) (issue 22)')
        self.shot('title_resume', page=True)
        i = rows.index(next(r for r in rows if r.startswith('Resume the Deep Stacks')))
        self.run(f'LQ_ENGINE.scene.menu.moveTo({i})')
        self.lab.frames(4)
        self.run('window.__hold = true')
        self.lab.press('confirm', 2)
        self.wait('LQ_DEBUG.scene() === "battle" && LQ_ENGINE.scene.phase !== "intro"', 60000, 'the fight to restart')
        self.lab.frames(30)
        hp = self.run('LQ_ENGINE.game.party.map(m => m.hp)')
        check(hp == env['hp'], f'the party as suspended ({hp} vs {env["hp"]})')
        check(self.run('LQ_ENGINE.scene.units.filter(u => u.side === "enemy").every(u => u.hp === u.maxHp)'), 'the foes at full HP (the fight from its start)')
        self.shot('fight_restarted', page=True)
        self.run('window.__hold = false')
        self.wait_quiet(60000)
        env2 = self.run('(() => { const e = LQ_ENGINE.save.loadEnvelope("cave"); return { inBattle: e.data.cave.run.inBattle || null, gone: e.data.cave.run.gone || null }; })()')
        check(env2['inBattle'] is None and foe in env2['gone']['ids'], f'won: no inBattle, the foe is gone in the suspend ({env2})')
        check(not any(e.startswith(f'enemy:{foe}@') for e in self.field()['entities']), 'and gone from the floor')
        self.shot('fight_won')

    def step_abandon(self):
        print(' [12] the hall with a reading suspended')
        before = self.run('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        # a slot-0 game standing in the hall (what Continue loads), the suspend file untouched
        self.to_hall()
        check(self.run('LQ_ENGINE.save.exists("cave")'), 'the suspend is still on disk')
        self.run('LQ_DEBUG.setFlag("deep_stacks_open")')
        self.talk()
        self.wait_choices('Begin')
        self.answer(0)
        self.wait_choices('Abandon it')
        self.shot('abandon_ask', page=True)
        self.run('window.__holdText = true')
        self.answer(1)
        self.wait_dialog('Then it waits where you left it')
        self.shot('abandon_kept', page=True)
        self.run('window.__holdText = false')
        self.lab.press('confirm', 2)
        self.wait_quiet()
        after = self.run('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        check(after == before and not self.cave()['inRun'], f'Keep it kept the suspended reading ({after})')
        self.talk()
        self.wait_choices('Begin')
        self.answer(0)
        self.wait_choices('Abandon it')
        self.answer(0)
        self.wait_choices('Go down')
        self.answer(0)
        self.wait_map('cave_b1', 90000)
        self.wait_quiet()
        now = self.run('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        check(now['floor'] == 1 and now['seed'] != before['seed'], f'Abandon it: a new reading on B1 ({now})')

    def step_b100(self):
        print(' [17] B100')
        self.run('(async () => { const g = LQ_ENGINE.game; const S = await import(new URL("src/game/state.js", location.href).href); g.party.forEach(m => { m.level = 60; }); S.heal(g, { full: true }); g.cave.run.floor = 99; })()')
        self.lab.frames(4)
        self.call('caveDescend', ms=60000)
        self.wait_map('cave_b100', 60000)
        self.wait_quiet()
        ents = self.field()['entities']
        check(not any('quill_chest' in e for e in ents), 'no Quill chest on B100')
        self.goto(13, 18)
        self.face('up')
        self.run('window.__holdText = true')
        self.lab.press('confirm', 2)
        self.wait_dialog('THE BINDING')
        self.shot('b100_plaque', page=True)
        self.run('window.__holdText = false')
        self.lab.press('confirm', 2)
        self.wait_quiet()
        # the fight: the Binder in its last phase at 1 HP, so the party beats it for real (drops, the flag, the rewards)
        self.run('window.__hold = true; window.__lines = []')
        try:
            self.call('goto', 12, 10, True, ms=15000)   # the step row starts the scene: the walk never settles while it runs
        except Exception:  # noqa: BLE001
            pass
        self.wait('LQ_DEBUG.scene() === "battle" && LQ_ENGINE.scene.phase !== "intro"', 90000, 'the Binder')
        self.lab.frames(20)
        self.run('(() => { const s = LQ_ENGINE.scene; const u = s.b.units().find(x => x.id === "binder"); u.ai.phase = 2; u.hp = 1; s.menu.close(); s.fast = "over"; })()')
        self.wait('LQ_DEBUG.scene() !== "battle"', 120000, 'the Binder to fall')
        self.run('window.__hold = false')
        self.run('window.__holdText = true')
        self.wait_dialog('The Binder comes apart', 90000)
        seen = self.run('window.__lines.slice()')
        check(not any(l.startswith('Equip the') for l in seen), f'no equip prompt before the Binder\'s last line ({seen[-4:]})')
        self.shot('binder_cleared', page=True)
        self.run('window.__holdText = false')
        self.lab.press('confirm', 2)
        self.wait_map('cave_landing0', 90000)
        self.wait('LQ_DEBUG.scene() === "dialog" && LQ_ENGINE.scene.choices && String(LQ_ENGINE.scene.box.text).includes("Quill") && window.__lines.some(l => l.startsWith("Equip") && l.includes("Quill"))', 90000, "the Quill's equip prompt")
        lines = self.run('window.__lines.slice()')
        i_clear = max(i for i, l in enumerate(lines) if 'Binder comes apart' in l)
        i_hall = max(i for i, l in enumerate(lines) if 'The Binder is bound' in l)
        i_quill = max(i for i, l in enumerate(lines) if 'Quill' in l and l.startswith('Equip'))
        check(i_clear < i_hall < i_quill, f'order: the Binder\'s line, the hall\'s, then the Quill ({i_clear}, {i_hall}, {i_quill})')
        check(not any("the The" in l for l in lines), 'no "the The" in a prompt (issue 14)')
        self.lab.frames(10)
        self.shot('quill_prompt', page=True)
        self.answer(0)
        self.wait_quiet(60000)
        check(self.run('LQ_ENGINE.game.cave.vault.includes("cave_binders_quill") && LQ_ENGINE.game.flags.deep_stacks_cleared'), 'the Quill is in the vault, the Stacks are cleared')

    def run_all(self):
        self.open()
        self.step_rules_and_begin()
        self.step_refused_stair()
        self.step_suspend_in_fight()
        self.step_abandon()
        self.step_b100()


def main(argv):
    devices = ['phone', 'desktop']
    if '--device' in argv:
        devices = [argv[argv.index('--device') + 1]]
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog = threading.Timer(600 * len(devices) + 60, lambda: (print('FIXES_RIG: FAIL watchdog'), os._exit(2)))
    watchdog.daemon = True
    watchdog.start()
    failed = []
    for device in devices:
        print(f'[{device}]')
        rig = Rig(device)
        t0 = time.time()
        try:
            rig.run_all()
        except Exception as e:  # noqa: BLE001
            failed.append(device)
            print(f'  FAIL {device}: {e}')
            try:
                rig.shot('fail', page=True)
                print('  scenes seen:', rig.run('window.__lqScenes ? window.__lqScenes.slice(-12) : null'))
                print('  lines seen:', rig.run('window.__lines ? window.__lines.slice(-6) : null'))
            except Exception:  # noqa: BLE001
                pass
        finally:
            if rig.lab.errors:
                failed.append(f'{device}-console')
                print('  CONSOLE ERRORS:')
                for err in rig.lab.errors[:20]:
                    print('   ', err[:600])
            print(f'  {time.time() - t0:.1f} s')
            rig.lab.close()
    watchdog.cancel()
    print('FIXES_RIG:', 'FAIL ' + ','.join(failed) if failed else 'PASS')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
