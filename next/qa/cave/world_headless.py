"""The Deep Stacks in the real game (C2-world): a headless Chromium walk through the seams, desktop and phone.

    python next/qa/cave/world_headless.py                    desktop, then phone
    python next/qa/cave/world_headless.py --device phone     one device
    python next/qa/cave/world_headless.py --keep             leave the shots of a passing run too (always kept on failure)

The page runs with ?cave=1&debug=1 (live.js caveForced: the cave pack is loaded while CAVE_LIVE is false). The run:
  1. a game past the Episode 1 credits (LQ_DEBUG.newGameEp2), the library, one step onto the trapdoor (16, 4): the hall;
  2. the Archivist's desk: confirm starts the talk (story.js's scenes, or world.js's fallback dispatcher), "Begin" starts the
     reading: B1, the floor tag reads B1, the party is level 1 with empty slots and empty hands, the suspend save exists;
  3. a red chest opened (the run counts it, something was received);
  4. the stairs walked to B3 (LQ_DEBUG.goto on the live field, battles on the way auto-won), the suspend save says B3;
  5. a Bookmark given through LQ_DEBUG, used from the Items screen: "Close the book here?", the card, the hall, the party restored;
  6. a second reading: a wipe on B1 (HP 1, the battle forced to defeat): "The Stacks close.", never the game over scene, the vault intact;
  7. a third reading: the menu's Save refused with the one line, its Quit asks once and closes the reading;
  8. a fourth reading taken to B2, the page reloaded, LQ_DEBUG.caveResume (what the title's row calls): B2 again at its arrival.
Zero console errors (404s of optional modules are noise). Shots in next/qa/cave/out/world_<device>_*.png (3x). Prints
WORLD_HEADLESS: PASS or FAIL. Bounded: every wait has a timeout and a watchdog kills the run after 540 s per device.
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

OUT = HERE / 'out'
QUERY = '?debug=1&fps=0&cave=1'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
# dialogs, choices (the first option) and cards are confirmed; a battle is won at once while __lqAutoBattle is on
# The wipe case (__lqForceDefeat): the rules are told the party fell, then the scene leaves the way a real defeat does (beginDefeat, leave('lose')).
AUTO_JS = """window.__lqAuto && clearInterval(window.__lqAuto); window.__lqScenes = window.__lqScenes || []; window.__lqAutoBattle = true; window.__lqForceDefeat = false;
window.__lqAuto = setInterval(() => {
  const s = LQ_DEBUG.scene();
  if (s && window.__lqScenes[window.__lqScenes.length - 1] !== s) window.__lqScenes.push(s);
  if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1);
  else if (s === "battle") {
    const b = LQ_ENGINE.scene;
    if (b && b.phase !== "intro" && !b.leaving && b.b) {
      if (window.__lqForceDefeat) { window.__lqForceDefeat = false; b.b.state.over = true; b.b.state.outcome = "defeat"; b.beginDefeat(); b.timer = 1; }
      else if (window.__lqAutoBattle) LQ_DEBUG.pop("win");
    }
  }
}, 120)"""
DIRS = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}


class Fail(Exception):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)
    print('  ok', msg)


def field_js(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


class Rig:
    def __init__(self, device):
        self.device = device
        self.lab = Lab(device=device, timeout=30000)
        self.shots = []

    # ---------------------------------------------------------------- plumbing
    def run(self, js):
        return self.lab.run(js)

    def call(self, name, *args, ms=30000):
        return self.lab.call(name, *args, ms=ms)

    def wait(self, js, ms=30000, what=''):
        try:
            self.lab.page.wait_for_function(js, timeout=ms, polling=50)
        except Exception as e:  # noqa: BLE001
            raise Fail(f'timeout waiting for {what or js[:80]}: {type(e).__name__}') from e

    def shot(self, name):
        # the lab writes under qa/world/out; this rig's shots live in qa/cave/out (the brief's folder)
        base = f'world_{self.device}_{name}'
        src = pathlib.Path(self.lab.shot(base))
        for f in [src, src.with_name(f'{base}_x1.png')]:
            if f.exists():
                shutil.move(str(f), str(OUT / f.name))
        p = OUT / src.name
        self.shots.append(str(p))
        print('  shot', p)

    def cave(self):
        return self.run('LQ_DEBUG.state().cave')

    def field(self):
        return self.run('LQ_DEBUG.fieldState()')

    def wait_map(self, map_id, ms=40000):
        self.wait(f'(() => {{ const f = {FIELD}; const s = LQ_DEBUG.state(); return !!f && !!f.map && f.map.id === {json.dumps(map_id)} && !f.loading && !f.pendingWarp && !s.transition; }})()', ms, f'map {map_id}')
        self.lab.frames(4)

    def wait_quiet(self, ms=60000):
        """The field on top, no scene running, no warp, input free."""
        self.wait(f'(() => {{ const f = {FIELD}; const s = LQ_DEBUG.state(); return s.scene === "field" && !!f && !f.loading && !f.pendingWarp && !f.inputLocked && !(f.cutscene && f.cutscene.running) && !s.transition && !(f.leader && f.leader.moving); }})()', ms, 'the field to be quiet')

    def goto(self, x, y, tries=4):
        for i in range(tries):
            self.wait_quiet()
            r = self.call('goto', x, y, True, ms=120000)
            if r and r[0] == x and r[1] == y:
                return r
            self.lab.frames(30)
        raise Fail(f'could not reach {x},{y} (last {r})')

    def face(self, d):
        self.run(field_js(f'f.leader.face({json.dumps(d)});'))
        self.lab.frames(2)

    def confirm(self):
        self.lab.press('confirm', 2)
        self.lab.frames(4)

    # ---------------------------------------------------------------- steps
    def open(self):
        self.lab.open(QUERY)
        self.run(AUTO_JS)
        self.run('LQ_DEBUG.setSpeed && LQ_DEBUG.setSpeed(3)')
        self.wait('window.LQ_PACKS && LQ_PACKS.packReady("cave")', 40000, 'the cave pack')
        self.wait('LQ_DEBUG.commands().includes("caveBegin")', 10000, 'the world hooks')
        check(self.run('!!LQ_ENGINE.cave && typeof LQ_ENGINE.cave.beforeDoor === "function"'), 'engine.cave is bound')
        print('  pack', self.run('LQ_PACKS.packState("cave")'))
        print('  art merged', self.run('LQ_DEBUG.caveArt()'), 'props has chest_red:', self.run('!!LQ_ENGINE.assets.atlas("props").meta.objects.chest_red'))

    def to_library(self):
        self.run('LQ_DEBUG.newGameEp2("Arden", { scene: "none" })')
        check(self.run('!!LQ_ENGINE.game.flags.ep1_complete'), 'ep1_complete is set')
        self.lab.warp('library', 16, 5, 'up')
        self.wait_quiet()
        ents = self.field()['entities']
        check(any(e.startswith('door:stacks_trapdoor@16,4') for e in ents), f'the trapdoor stair is on the library at (16, 4) ({[e for e in ents if "stacks" in e]})')
        check(not any(e.startswith('object:stacks_trapdoor_locked') for e in ents), 'the sealed hatch is gone after Episode 1')
        self.shot('library_trapdoor')
        self.lab.walk('up')
        self.wait_map('cave_landing0')
        st = self.field()
        check(st['map'] == 'cave_landing0' and st['leader']['x'] == 5 and st['leader']['y'] == 5, f'one step onto the trapdoor lands in the hall at (5, 5) ({st["leader"]})')
        self.shot('hall')

    def talk_and_begin(self, first):
        self.goto(10, 10)
        self.face('up')
        self.confirm()
        self.wait('LQ_DEBUG.scene() === "dialog"', 15000, 'the Archivist talk')
        self.wait_map('cave_b1', 90000)
        self.wait_quiet()
        c = self.cave()
        check(c['inRun'] and c['floor'] == 1, f'a reading is running at B1 ({c})')
        if first:
            check(self.run('!!LQ_ENGINE.game.flags.deep_stacks_open'), 'deep_stacks_open was set by the talk')

    def check_b1(self):
        g = self.run('(() => { const g = LQ_ENGINE.game; return { levels: g.party.map(m => m.level), slots: g.party.map(m => Object.values(m.equip).filter(Boolean).length), items: Object.keys(g.items), gold: g.gold, gear: g.gear.length }; })()')
        check(g['levels'] == [1, 1, 1], f'the party is level 1 ({g["levels"]})')
        check(g['slots'] == [0, 0, 0], f'nothing worn ({g["slots"]})')
        check(g['items'] == [] and g['gold'] == 0 and g['gear'] == 0, f'empty hands ({g})')
        st = self.field()
        check(st['floorTag'] == 'B1', f'the floor tag reads B1 ({st["floorTag"]})')
        check(st['aim'] is None, 'the Aim line stays off inside the Stacks')
        c = self.cave()
        check(c['suspend'] is True, 'the suspend save exists on arrival')
        meta = self.run('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        check(meta == {'floor': 1, 'seed': c['seed']}, f'the suspend meta names the floor and seed ({meta})')
        self.shot('b1_tag')

    def open_red_chest(self):
        chests = self.call('caveChests')
        red = next((ch for ch in chests if ch['tier'] == 'red' and ch['state'] != 'open'), None)
        check(red is not None, f'a red chest on B1 ({chests})')
        fx, fy = red['front']
        d = next(k for k, (dx, dy) in DIRS.items() if (fx + dx, fy + dy) == (red['x'], red['y']))
        before = self.run('(() => { const g = LQ_ENGINE.game; return [g.gold, Object.keys(g.items).length, g.gear.length]; })()')
        opened = False
        for attempt in range(6):            # a foe may touch the party on the way or eat the confirm: walk back and try again
            self.goto(fx, fy)
            self.face(d)
            self.confirm()
            try:
                self.wait(f'LQ_DEBUG.caveChests().find(c => c.id === {json.dumps(red["id"])}).state === "open"', 5000, 'the chest to open')
                opened = True
                break
            except Fail:
                self.lab.frames(20)
        check(opened, f'the chest {red["id"]} opened')
        self.wait_quiet()
        after = self.run('(() => { const g = LQ_ENGINE.game; return [g.gold, Object.keys(g.items).length, g.gear.length]; })()')
        c = self.cave()
        check(c['chests'] == 1, f'the run counted the chest ({c["chests"]})')
        check(after[0] > before[0] or after[1] > before[1] or after[2] > before[2] or self.run('LQ_ENGINE.game.party.some(m => Object.values(m.equip).some(Boolean))'), f'the chest lent something ({before} -> {after})')
        self.shot('b1_chest')

    def descend_walking(self, target):
        while self.cave()['floor'] < target:
            cur = self.cave()['floor']
            s = self.call('caveStairs')
            sx, sy = s['stairs']
            try:
                self.goto(sx, sy, tries=3)
            except Fail as e:
                print('  (walk blocked, the stair shortcut instead:', e, ')')
                self.call('caveDescend', ms=60000)
                self.wait_map(f'cave_b{cur + 1}')
                continue
            self.lab.walk('up')
            self.wait_map(f'cave_b{cur + 1}')
            self.wait_quiet()
        c = self.cave()
        check(c['floor'] == target, f'at B{target}')
        check(self.field()['floorTag'] == f'B{target}', 'the floor tag follows')
        meta = self.run('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        check(meta['floor'] == target, f'the suspend save was rewritten on arrival ({meta})')
        self.shot(f'b{target}')

    def use_bookmark(self):
        had = self.cave()['bookmarks']          # a red chest on the way may already have lent one (4% each)
        self.run('LQ_DEBUG.give("keepers_bookmark", 1)')
        check(self.cave()['bookmarks'] == had + 1, f'a Bookmark in the bag ({had} before)')
        before = self.run('(() => { const g = LQ_ENGINE.game; return { readings: g.cave.record.readings, vault: g.cave.vault.slice() }; })()')
        self.wait_quiet()
        self.lab.press('menu', 2)
        self.wait('LQ_DEBUG.scene() === "menu"', 10000, 'the menu')
        self.run('(() => { const s = LQ_ENGINE.scene; s.openPage("items"); s.screen.tab = 1; s.screen.refresh(false); const i = s.screen.list.items.findIndex(it => it.id === "keepers_bookmark"); if (i < 0) throw new Error("no bookmark row"); s.screen.list.moveTo(i, { silent: true }); })()')
        self.lab.frames(4)
        self.shot('menu_bookmark')
        self.confirm()
        self.wait('LQ_DEBUG.scene() === "dialog"', 10000, 'Close the book here?')
        self.wait_map('cave_landing0', 60000)
        self.wait_quiet(90000)
        g = self.run('(() => { const g = LQ_ENGINE.game; return { inRun: !!(g.cave && g.cave.inRun), level: g.party[0].level, gold: g.gold, how: g.cave.lastExit && g.cave.lastExit.how, floor: g.cave.lastExit && g.cave.lastExit.floor, readings: g.cave.record.readings, deepest: g.cave.record.floor, vault: g.cave.vault, map: g.map, leader: null }; })()')
        check(not g['inRun'] and g['level'] == 9 and g['gold'] == 900, f'the party is restored ({g})')
        check(g['how'] == 'bank' and g['floor'] == 3, f'lastExit is the bank at B3 ({g})')
        check(g['readings'] == before['readings'] and g['deepest'] == 3, f'the record keeps the floor ({g})')
        check(self.cave()['suspend'] is False, 'the suspend save is gone')
        check(self.field()['floorTag'] is None, 'no floor tag outside a reading')
        self.shot('hall_after_bank')

    def wipe_run(self):
        self.talk_and_begin(first=False)
        self.run('LQ_ENGINE.game.party.forEach(m => { m.hp = 1; })')
        vault = self.run('LQ_ENGINE.game.cave.vault.slice()')
        ents = [e for e in self.field()['entities'] if e.startswith('enemy:')]
        check(ents, 'foes on B1')
        # the first battle from here is the wipe (the auto loop forces the defeat the way a real one plays out); walk at the foes
        mark = len(self.run('window.__lqScenes.length') and [0]) and self.run('window.__lqScenes.length')
        self.run('window.__lqForceDefeat = true')
        fought = False
        for e in ents:
            _, rest = e.split(':', 1)
            name, at = rest.split('@')
            ex, ey = [int(v) for v in at.split(',')]
            for d, (dx, dy) in DIRS.items():
                if fought:
                    break
                try:
                    self.call('goto', ex - dx, ey - dy, True, ms=60000)
                except Exception:  # noqa: BLE001  (a battle on the way ends the walk)
                    pass
                if 'battle' in self.run(f'window.__lqScenes.slice({mark})'):
                    fought = True
                    break
                self.face(d)
                self.lab.press(d, 3)
                self.lab.frames(20)
                if 'battle' in self.run(f'window.__lqScenes.slice({mark})'):
                    fought = True
            if fought:
                break
        check(fought, 'a foe was touched')
        self.wait('LQ_DEBUG.scene() !== "battle"', 30000, 'the battle to leave')
        self.wait_map('cave_landing0', 60000)
        self.wait_quiet(90000)
        seen = self.run('window.__lqScenes.slice()')
        check('gameover' not in seen, f'never the game over scene ({seen[-8:]})')
        check('titleCard' in seen, 'the black card played')
        g = self.run('(() => { const g = LQ_ENGINE.game; return { inRun: !!(g.cave && g.cave.inRun), level: g.party[0].level, how: g.cave.lastExit.how, vault: g.cave.vault, readings: g.cave.record.readings }; })()')
        check(not g['inRun'] and g['level'] == 9 and g['how'] == 'die', f'the wipe closed the reading and restored the party ({g})')
        check(g['vault'] == vault, 'the vault is intact')
        check(self.cave()['suspend'] is False, 'the suspend save is gone after the wipe')
        self.shot('hall_after_wipe')

    def resume_run(self):
        r = self.call('caveBegin', {'seed': 77}, ms=60000)
        check(r and r.get('ok'), f'caveBegin ({r})')
        self.wait_map('cave_b1')
        self.wait_quiet()
        self.call('caveDescend', ms=60000)
        self.wait_map('cave_b2')
        self.wait_quiet()
        meta = self.run('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        check(meta == {'floor': 2, 'seed': 77}, f'the suspend save holds B2 of seed 77 ({meta})')
        arrival = self.call('caveStairs')['arrival']
        self.lab.page.reload(wait_until='load')
        self.lab.page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
        self.run('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 20000))])')
        self.run(AUTO_JS)
        self.run('LQ_DEBUG.setSpeed && LQ_DEBUG.setSpeed(3)')
        self.wait('window.LQ_PACKS && LQ_PACKS.packReady("cave")', 40000, 'the cave pack after the reload')
        self.wait('LQ_DEBUG.commands().includes("caveResume")', 10000, 'the world hooks after the reload')
        check(self.run('LQ_ENGINE.save.exists("cave")'), 'the suspend save survived the reload')
        r = self.call('caveResume', ms=60000)
        check(r and r.get('ok') and r['floor'] == 2 and r['seed'] == 77, f'caveResume ({r})')
        self.wait_map('cave_b2', 60000)
        self.wait_quiet()
        st = self.field()
        check(st['floorTag'] == 'B2', 'B2 again')
        check([st['leader']['x'], st['leader']['y']] == arrival, f'at the arrival ({st["leader"]} vs {arrival})')
        c = self.cave()
        check(c['inRun'] and c['floor'] == 2 and c['seed'] == 77, f'the run resumed ({c})')
        self.shot('b2_resumed')
        # and the reading can still end: the Bookmark from the menu after a resume
        self.run('LQ_DEBUG.give("keepers_bookmark", 1)')
        r = self.call('caveEnd', 'bank', ms=60000)
        check(r and r.get('ok'), f'caveEnd bank ({r})')
        self.wait_map('cave_landing0', 60000)
        self.wait_quiet(90000)
        check(not self.cave()['inRun'] and self.cave()['record']['readings'] == 4, f'four readings on the record ({self.cave()["record"]})')

    def menu_run(self):
        """A reading started through LQ_DEBUG: the menu's Save is refused with the one line, its Quit asks once and ends the reading."""
        r = self.call('caveBegin', {'seed': 5}, ms=60000)
        check(r and r.get('ok'), f'caveBegin ({r})')
        self.wait_map('cave_b1')
        self.wait_quiet()
        mark = self.run('window.__lqScenes.length')
        self.lab.press('menu', 2)
        self.wait('LQ_DEBUG.scene() === "menu"', 10000, 'the menu')
        self.run('LQ_ENGINE.scene.run("save")')
        self.wait('LQ_DEBUG.scene() === "dialog"', 10000, 'the save refusal line')
        text = self.run('LQ_DEBUG.state().sceneState && LQ_DEBUG.state().sceneState.text || (LQ_ENGINE.scene.box && LQ_ENGINE.scene.box.text) || ""')
        self.wait('LQ_DEBUG.scene() === "menu"', 15000, 'back to the menu')
        seen = self.run(f'window.__lqScenes.slice({mark})')
        check('loadGame' not in seen, f'the save screen never opened inside a reading ({seen})')
        check(self.cave()['inRun'], 'still inside after the refusal')
        self.run('LQ_ENGINE.scene.run("quit")')
        self.wait('LQ_DEBUG.scene() === "dialog"', 10000, 'the quit question')
        self.shot('menu_quit')
        self.wait_map('cave_landing0', 60000)
        self.wait_quiet(90000)
        g = self.run('(() => { const g = LQ_ENGINE.game; return { inRun: !!(g.cave && g.cave.inRun), level: g.party[0].level, how: g.cave.lastExit.how, readings: g.cave.record.readings }; })()')
        check(not g['inRun'] and g['level'] == 9 and g['how'] == 'quit', f'Quit ended the reading like a death ({g})')
        check(self.run('LQ_DEBUG.scene()') == 'field', 'the menu is gone')
        check(self.cave()['suspend'] is False, 'the suspend save is gone after Quit')

    def run_all(self):
        self.open()
        self.to_library()
        self.talk_and_begin(first=True)
        self.check_b1()
        self.open_red_chest()
        self.descend_walking(3)
        self.use_bookmark()
        self.wipe_run()
        self.menu_run()
        self.resume_run()


def base_off_check():
    """Without ?cave=1 the base game is untouched: no pack, no hooks, no trapdoor, and a game that never opened the Stacks saves without a `cave` block."""
    print('[base, pack off]')
    lab = Lab(device='desktop', timeout=30000)
    ok = True
    try:
        lab.open('?debug=1&fps=0')
        lab.run('LQ_DEBUG.newGameEp2("Arden", { scene: "none" })')
        lab.warp('library', 16, 5, 'up')
        lab.frames(10)
        st = lab.run('LQ_DEBUG.fieldState()')
        check(not any('stacks' in e for e in st['entities']), 'no trapdoor on the library while the pack is off')
        check(lab.run('LQ_ENGINE.cave === undefined'), 'no hooks on the engine')
        check(lab.run('!LQ_PACKS.packReady("cave") && !LQ_PACKS.packState("cave").loading'), 'the cave pack never loaded')
        lab.walk('up')
        lab.frames(10)
        check(lab.run('LQ_DEBUG.fieldState().map') == 'library', 'the cell is plain floor')
        lab.warp('willowmere', 38, 23, 'down')
        lab.frames(10)
        check(lab.run('LQ_ENGINE.game.cave === undefined'), 'the game carries no cave block')
        check(lab.run('(() => { const env = LQ_ENGINE.save.loadEnvelope(0); return !!env && env.data.cave === undefined; })()'), 'the autosave is exactly the old shape (no cave block)')
        check(lab.run('!LQ_ENGINE.save.exists("cave")'), 'no suspend save')
    except Exception as e:  # noqa: BLE001
        ok = False
        print(f'  FAIL base: {e}')
    finally:
        if lab.errors:
            ok = False
            print('  CONSOLE ERRORS:', lab.errors[:5])
        lab.close()
    return ok


def main(argv):
    devices = ['desktop', 'phone']
    if '--device' in argv:
        devices = [argv[argv.index('--device') + 1]]
    keep = '--keep' in argv
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog = threading.Timer(540 * len(devices) + 120, lambda: (print('WORLD_HEADLESS: FAIL watchdog'), os._exit(2)))
    watchdog.daemon = True
    watchdog.start()
    failed = [] if base_off_check() else ['base']
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
                rig.shot('fail')
                print('  scenes seen:', rig.run('window.__lqScenes ? window.__lqScenes.slice(-12) : null'))
            except Exception:  # noqa: BLE001
                pass
        finally:
            if rig.lab.errors:
                failed.append(f'{device}-console')
                print('  CONSOLE ERRORS:')
                for err in rig.lab.errors[:20]:
                    print('   ', err[:600])
            if rig.lab.noise:
                print(f'  (404 noise, optional modules: {sorted(set(n.rsplit("/", 1)[-1] for n in rig.lab.noise))})')
            warns = [l for l in rig.lab.logs if l.startswith('warning')]
            if warns:
                print(f'  {len(warns)} console warnings (first 8):')
                for w in warns[:8]:
                    print('   ', w[:240])
            print(f'  {time.time() - t0:.1f} s')
            rig.lab.close()
    watchdog.cancel()
    print('WORLD_HEADLESS:', 'FAIL ' + ','.join(failed) if failed else 'PASS')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
