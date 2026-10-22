"""Autoplay: a headless bot that plays Lexicon Quest NEXT: Episode 1 from New Game to the credits, and
Episode 2 ("The Town Without a Name") from an Episode 1 credits save or from the title's Episode 2 entry
(newGameEp2) to the Episode 2 credits.

It observes through LQ_DEBUG (state, the live field snapshot) and acts through the input layer
(LQ_DEBUG.press injects actions for a number of logic frames; --keys sends real keyboard events instead).
It pathfinds on the maps' static walk model (tools/maps/mapcheck.mjs via qa/autoplay_grid.mjs) with the
live field overlaid (actors, opened gates, pushed blocks, broken pots, revealed ink), talks to NPCs, reads
signs, opens chests, solves the push-block, switch, crystal and Lantern puzzles by their documented
solutions (docs/MAPS.md), buys at the shops, rests at the inn when hurt, saves and reloads at three points,
fights every visible enemy on its way with Auto battle at 2x, and reaches the credits. Upkeep (W5, PLAYTEST 3):
it answers the equip prompt with Yes / the first name, runs Equip -> Optimize for everyone after every chest it
opens and at the end of each floor (`maintain`), drinks Ethers through the Items screen when a member is under
30% MP outside battle, and rests at any Keeper's font on its map when someone is under 60% HP.

    python next/qa/autoplay.py                       desktop profile
    python next/qa/autoplay.py --device phone        phone profile (844x390 @3, touch)
    python next/qa/autoplay.py --keys                real keyboard events instead of injected actions
    python next/qa/autoplay.py --speed 3             engine time scale (default 2)
    python next/qa/autoplay.py --wrong-order         visit every map and talk to everyone before/after each main flag
    python next/qa/autoplay.py --until stacks        stop after the named main step (quests.js step ids)
    python next/qa/autoplay.py --no-side             skip the optional side quests and secrets
    python next/qa/autoplay.py --hollow              W13: also play the optional Whisperwood Hollow right after the
                                                     Lantern (out to the valley, the dungeon and the Briar Alpha, back
                                                     to F3); off by default so the gate run does not grow. Writes
                                                     <device>-hollow-* files.

Episode 2 (E2-integrate, EPISODE2_PLAN 10d). The Episode 1 run writes <device>-ep1-credits-save.json: the
autosave the game writes as the party wakes at home after the Episode 1 credits. The Episode 2 run either loads
that save through the title's Continue (--start save, the default) or picks the title's "Episode 2" entry, which
calls newGameEp2 (--start new). It then plays the morning, the crossing, the Fading Road, the Hollow, the three
Court floors (the beam puzzles from the maps' own solutions: tools/maps/mapcheck.mjs beams), the Other Selves,
the Nameless King and the ending to the Episode 2 credits, with the Fountain of Faces, the Last Route, Nico's
Crowns and A Letter Answered on the way (not with --no-side).

    python next/qa/autoplay.py --episode 2                       from <device>-ep1-credits-save.json
    python next/qa/autoplay.py --episode 2 --start new           the title's Episode 2 entry (newGameEp2)
    python next/qa/autoplay.py --episode 2 --resume <game.json>  any saved game (e.g. <device>-ep2-last-game.json)

Output (next/qa/out/autoplay/): <device>-NNNN-<label>.png every 30 s and on every map change,
<device>-dialog.log (every dialogue line), <device>-report.json (timing table, battles, warnings).
Episode 2 runs write <device>-ep2-* files instead. Exit code 1 on any console error, page error, engine error,
crash, or softlock (no progress for 90 s).
"""
import argparse
import collections
import json
import pathlib
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent
sys.path.insert(0, str(HERE))
import shots  # noqa: E402  (static server over the repo root, CALL_JS)

OUT = HERE / 'out' / 'autoplay'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}
KEY_FOR = {'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight', 'confirm': 'KeyZ', 'cancel': 'KeyX',
           'menu': 'KeyC', 'run': 'ShiftLeft', 'pageL': 'KeyQ', 'pageR': 'KeyE', 'start': 'Enter'}
DIRS = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}
OPP = {'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'}
WALK, RUN = 12, 8
SOFTLOCK_S = 90
SHOT_EVERY_S = 30
MAIN_FLAGS = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
              'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete']
MAP_IDS = ['hero_home', 'willowmere', 'inn', 'item_shop', 'smithy', 'library', 'chapel', 'bakery', 'valley',
           'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss']
EP2_MAIN_FLAGS = ['ep2_started', 'crossing_done', 'east_road_arrived', 'east_first_fight_done', 'nh_arrived', 'met_elian',
                  'heard_crisis', 'met_anwen', 'court_ferry_open', 'court_entered', 'court_f1_done', 'vex_met',
                  'other_selves_defeated', 'court_f2_done', 'vow_door_open', 'nameless_king_defeated', 'aurel_named',
                  'nh_restored', 'ep2_complete']

# Live field snapshot (observation only).
FIELD_JS = """() => {
  const E = window.LQ_ENGINE; if (!E) return null;
  const f = (E.stack || []).find(s => s.name === 'field');
  if (!f || !f.map) return null;
  const L = f.leader;
  const ents = [];
  for (const e of f.entities.values()) {
    if (!e.present) continue;
    ents.push({ id: e.id, type: e.type, x: e.x, y: e.y, cells: e.cells, state: e.state,
      blocked: e.cells.map(([x, y]) => !!f.map.blockedAt(x, y)), to: e.ev.to || null, on: e.ev.on || null,
      script: e.ev.script || null, item: e.ev.item || null, key: e.ev.key || null, kind: e.ev.kind || null,
      doorAt: e.prop && e.prop.doorAt ? e.prop.doorAt : null, hidden: !!(e.data && e.data.ink),
      opens: e.state === 'broken' && e.ev.opens ? e.ev.opens.filter(([x, y]) => f.map.collisionAt(x, y) === 'none') : null });
  }
  const actors = f.actors.map(a => ({ id: a.id, kind: a.kind, x: a.tx, y: a.ty, solid: a.solid, dir: a.dir, moving: a.moving,
    fighting: !!(a.data && a.data.fighting), mode: a.brain && a.brain.mode || null }));
  // E2: glass bridges, lit (walkable) or dim (a pit) right now
  const bridges = f.glass && f.glass.bridges ? [...f.glass.bridges.values()].map(b => [b.x, b.y, !!b.lit]) : [];
  return { map: f.map.id, frame: f.frame, leader: L ? { x: L.tx, y: L.ty, dir: L.dir, moving: L.moving } : null,
    locked: f.inputLocked, warp: !!f.pendingWarp, loading: !!f.loading, running: f.cutscene ? f.cutscene.running : null,
    lantern: f.lantern, ents, actors, bridges, dead: !!f.dead, transition: !!E.transition, prompt: f.prompt ? f.prompt.ent.id : null,
    busy: !!(f.abilities && f.abilities.busy) };
}"""

SCENE_LIST_JS = "(() => { const s = LQ_ENGINE.scene; const l = s && s.list; return l ? l.items.map(i => ({ id: i.id, price: i.price, disabled: !!i.disabled })) : null; })()"


class Fail(Exception):
    pass


class Softlock(Fail):
    pass


# ================================================================================================ driver
class Bot:
    def __init__(self, device='desktop', speed=2, keys=False, name='Arden', headless=True, resume=None, tag='', query=''):
        from playwright.sync_api import sync_playwright
        self.device = device + tag          # output prefix (the wrong-order sweep and Episode 2 keep their own files)
        self.query = query                  # extra URL params (Episode 2's title entry: &ep=2)
        self.speed = speed
        self.keys = keys
        self.hero = name
        self.pw = sync_playwright().start()
        self.server = shots.start_server()
        dev = DEVICES[device]
        self.browser = self.pw.chromium.launch(headless=headless, args=['--autoplay-policy=no-user-gesture-required'])
        self.ctx = self.browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                                            is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
        self.ctx.set_default_timeout(30000)
        self.page = self.ctx.new_page()
        seed = ''
        if resume:
            data = json.loads(pathlib.Path(resume).read_text(encoding='utf-8'))
            env = {'v': 1, 'savedAt': int(time.time() * 1000), 'meta': {'name': data.get('heroName'), 'level': data['party'][0]['level'], 'map': data['map'],
                   'playtime': data.get('playtime', 0), 'chapter': data.get('chapter', 1), 'gold': data.get('gold'), 'party': [m['id'] for m in data['party']]}, 'data': data}
            seed = 'localStorage.setItem("lq-next-slot-1", ' + json.dumps(json.dumps(env)) + ');'
            name = data.get('heroName') or name
        self.resume = resume
        self.hero = name
        self.page.add_init_script('(() => { try { localStorage.clear(); ' + seed + ' } catch (e) {} })()')
        self.errors, self.warnings, self.console = [], [], []
        self.page.on('console', self._on_console)
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        self.grids = {}
        self.gated = {}         # map id -> the flags its gated overlays depend on (autoplay_grid.mjs)
        self.shot_n = 0
        self.last_shot = 0
        self.t0 = time.time()
        self.progress_sig = None
        self.progress_at = time.time()
        self.dialog_seen = set()
        self.dialog_log = []
        self.battles = []
        self.gameovers = 0
        self.timing = []        # [{step, map, game_s, wall_s}]
        self.notes = []
        self.last_map = None
        self.battle_seen = None
        OUT.mkdir(parents=True, exist_ok=True)
        self.dialog_file = open(OUT / f'{self.device}-dialog.log', 'a', encoding='utf-8')
        self.dialog_file.write(f'=== run {time.strftime("%Y-%m-%d %H:%M:%S")} speed {speed} keys {keys} ===\n')

    # ------------------------------------------------------------------ plumbing
    def _on_console(self, msg):
        text = msg.text
        self.console.append(f'{msg.type}: {text}')
        if msg.type == 'error':
            loc = msg.location.get('url', '') if isinstance(msg.location, dict) else ''
            self.errors.append(f'console.error: {text} {loc}'.strip())
        elif msg.type == 'warning':
            self.warnings.append(text)

    def open(self):
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/next/index.html?debug=1&fps=0{self.query}', wait_until='load')
        self.page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
        self.page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 30000))])')
        self.js(f'LQ_DEBUG.setSpeed({self.speed})')
        # Player-facing settings a speedrunner would pick: instant text, Auto battle at 2x.
        self.js("LQ_DEBUG.settings({ textSpeed: 4, battleSpeed: 2, autoBattle: true })")
        return self

    def close(self):
        try:
            self.dialog_file.close()
        except Exception:
            pass
        for fn in (self.ctx.close, self.browser.close, self.pw.stop, self.server.shutdown):
            try:
                fn()
            except Exception:
                pass

    def js(self, expr):
        return self.page.evaluate(expr)

    def call(self, name, *args, ms=20000):
        return self.page.evaluate(shots.CALL_JS, [name, list(args), ms])

    def state(self):
        return self.js('LQ_DEBUG.state()')

    def scene(self):
        return self.js('LQ_DEBUG.scene()')

    def scene_state(self):
        return self.js('(() => { const s = LQ_DEBUG.state(); return { scene: s.scene, scenes: s.scenes, ss: s.sceneState, transition: s.transition, errors: s.errors }; })()')

    def game(self):
        return self.js('LQ_DEBUG.state().game')

    def flag(self, f):
        return bool(self.js(f'!!(LQ_ENGINE.game && LQ_ENGINE.game.flags[{json.dumps(f)}])'))

    def flags(self):
        return self.js('LQ_ENGINE.game ? LQ_ENGINE.game.flags : {}') or {}

    def items(self):
        return self.js('LQ_ENGINE.game ? LQ_ENGINE.game.items : {}') or {}

    def opened(self, map_id, ent_id):
        return bool(self.js(f'!!(LQ_ENGINE.game && LQ_ENGINE.game.opened[{json.dumps(map_id + ":" + ent_id)}])'))

    def field(self):
        return self.page.evaluate(FIELD_JS)

    def frame(self):
        return self.js('LQ_ENGINE.frame')

    def frames(self, n, timeout=20000):
        start = self.frame()
        self.page.wait_for_function(f'LQ_ENGINE.frame >= {start + int(n)}', timeout=timeout, polling=10)

    # ------------------------------------------------------------------ input
    def press(self, action, frames=1):
        """Hold an action for `frames` logic frames (injected into the input layer, or a real key)."""
        if self.keys and action in KEY_FOR:
            self.page.keyboard.down(KEY_FOR[action])
            self.page.wait_for_timeout(max(8, frames * 1000 / 60 / self.speed))
            self.page.keyboard.up(KEY_FOR[action])
        else:
            self.js(f'LQ_DEBUG.press({json.dumps(action)}, {int(frames)})')

    def tap(self, action, gap=4):
        self.press(action, 1)
        self.frames(gap)

    def hold_dir(self, d, steps, run=True):
        """Hold a direction for exactly `steps` tiles: the first step of a walk lasts dur-1 frames (the field
        updates the party once more on the frame a step starts), so a held direction chains step k at
        frame dur*k-(dur+1); holding dur*(n-1)+1 frames gives exactly n steps."""
        dur = RUN if run else WALK
        frames = dur * (steps - 1) + 1
        if self.keys:
            self.page.keyboard.down(KEY_FOR['run']) if run else None
            self.page.keyboard.down(KEY_FOR[d])
            self.page.wait_for_timeout(max(8, frames * 1000 / 60 / self.speed))
            self.page.keyboard.up(KEY_FOR[d])
            if run:
                self.page.keyboard.up(KEY_FOR['run'])
        else:
            self.js(f'(() => {{ if ({"true" if run else "false"}) LQ_DEBUG.press("run", {frames + 2}); LQ_DEBUG.press({json.dumps(d)}, {frames}); }})()')

    # ------------------------------------------------------------------ bookkeeping
    def shot(self, label):
        self.shot_n += 1
        path = OUT / f'{self.device}-{self.shot_n:04d}-{label}.png'
        try:
            self.page.screenshot(path=str(path))
        except Exception as e:  # never let a screenshot kill the run
            self.notes.append(f'screenshot failed: {e}')
        self.last_shot = time.time()
        return path

    def check_errors(self):
        eng = self.js('LQ_DEBUG.errors().map(e => e.msg)')
        if eng:
            self.errors.extend(f'engine: {m}' for m in eng if f'engine: {m}' not in self.errors)
        if self.errors:
            self.shot('error')
            raise Fail('errors: ' + ' | '.join(self.errors[:5]))

    def progress(self, sig):
        now = time.time()
        if sig != self.progress_sig:
            self.progress_sig = sig
            self.progress_at = now
        elif now - self.progress_at > SOFTLOCK_S:
            self.shot('softlock')
            raise Softlock(f'no progress for {SOFTLOCK_S} s: {sig}')
        if now - self.last_shot > SHOT_EVERY_S:
            self.shot('tick')

    def log_dialog(self, ss):
        inst, text = self.js("(() => { const s = LQ_ENGINE.scene; if (!s || s.name !== 'dialog') return [0, '']; "
                             "s.__botId = s.__botId || (window.__botDialogN = (window.__botDialogN || 0) + 1); "
                             "return [s.__botId, s.pageText ? s.pageText.replace(/\\n/g, ' ') : '']; })()")
        key = (inst, ss.get('box'), ss.get('page'), text)
        if key in self.dialog_seen or not text:
            return
        self.dialog_seen.add(key)
        who = ss.get('speaker') or '(narration)'
        line = f'[{self.cur_map or "-"}] {who}: {text}'
        self.dialog_log.append(line)
        self.dialog_file.write(line + '\n')
        self.dialog_file.flush()

    @property
    def cur_map(self):
        return self.last_map

    def mark(self, step):
        g = self.game() or {}
        self.timing.append({'step': step, 'map': g.get('map'), 'game_s': round(g.get('playtime', 0), 1), 'wall_s': round(time.time() - self.t0, 1),
                            'level': (g.get('party') or [{}])[0].get('level'), 'gold': g.get('gold')})
        print(f'  == {step:<22} game {g.get("playtime", 0) / 60:5.1f} min  wall {(time.time() - self.t0) / 60:5.1f} min  Lv {(g.get("party") or [{}])[0].get("level")}  {g.get("gold")} G', flush=True)

    # ------------------------------------------------------------------ overlay scenes
    def choose(self, options, prefer=None, safe=False):
        """Index to pick for a choice list. `prefer`: an index, a substring, or a list of substrings tried in
        order (the first that matches any option wins), so one call can answer a run of different prompts."""
        opts = [str(o) for o in options]
        if prefer is not None:
            if isinstance(prefer, int):
                return max(0, min(len(opts) - 1, prefer))
            for want in (prefer if isinstance(prefer, (list, tuple)) else [prefer]):
                for i, o in enumerate(opts):
                    if str(want).lower() in o.lower():
                        return i
        if safe:
            for i, o in enumerate(opts):
                if any(k in o.lower() for k in ('not ', 'stay', 'keep', 'later', 'no', 'maybe')):
                    return i
            return len(opts) - 1
        return 0

    def pick(self, index, current):
        steps = index - (current or 0)
        for _ in range(abs(steps)):
            self.tap('down' if steps > 0 else 'up', 3)
        self.tap('confirm', 2)

    def handle(self, prefer=None, safe=False, allow_shop=False):
        """One step of generic overlay handling. Returns the scene name seen."""
        st = self.scene_state()
        sc, ss = st['scene'], st.get('ss') or {}
        if st['errors']:
            self.check_errors()
        if self.last_map is None or (sc == 'field' and ss.get('map') and ss.get('map') != self.last_map):
            if ss.get('map'):
                self.last_map = ss['map']
                self.shot(self.last_map)
        if sc == 'dialog':
            self.log_dialog(ss)
            if ss.get('typing'):
                self.tap('confirm', 2)
            elif ss.get('choices') and ss.get('choiceIndex') is not None:
                self.pick(self.choose(ss['choices'], prefer, safe), ss['choiceIndex'])
            elif ss.get('choices'):
                self.frames(2)
            else:
                self.tap('confirm', 2)
            sig = ('dialog', ss.get('speaker'), ss.get('box'), ss.get('page'), ss.get('shown'))
        elif sc == 'choice':
            self.pick(self.choose(ss.get('options') or [], prefer, safe), ss.get('index'))
            sig = ('choice', tuple(ss.get('options') or []))
        elif sc == 'titleCard':
            self.frames(6)
            self.tap('confirm', 4)
            sig = ('titleCard', ss.get('text'), ss.get('phase'))
        elif sc == 'battle':
            b = self.js('LQ_DEBUG.state().battle') or {}
            self.js('LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })')
            if b.get('phase') == 'rewards':
                self.tap('confirm', 6)
            else:
                self.frames(10)
            if self.battle_seen is None:
                info = self.js("(() => { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle' || !s.b) return {}; "
                               "return { enc: s.data ? s.data.encounterId : null, elite: s.b.units().some(u => u.side === 'enemy' && u.elite && u.elite.length) }; })()") or {}
                self.battle_seen = {'start': time.time(), 'rounds': 0, 'enc': info.get('enc'), 'elite': bool(info.get('elite')),
                                    'level': ((self.game() or {}).get('party') or [{}])[0].get('level')}
            self.battle_seen['rounds'] = max(self.battle_seen['rounds'], b.get('round') or 0)
            sig = ('battle', b.get('phase'), b.get('round'), b.get('current'), tuple((u.get('uid'), u.get('hp')) for u in (b.get('units') or [])))
        elif sc == 'gameover':
            self.gameovers += 1
            self.notes.append(f'game over #{self.gameovers} (retry)')
            print('  !! game over, retrying', flush=True)
            self.page.wait_for_function("LQ_DEBUG.state().sceneState && LQ_DEBUG.state().sceneState.t >= 2.6", timeout=20000, polling=50)
            self.tap('confirm', 4)
            self.pick(0, (self.scene_state().get('ss') or {}).get('index') or 0)
            self.page.wait_for_function("LQ_DEBUG.scene() === 'field'", timeout=20000, polling=50)
            sig = ('gameover', self.gameovers)
        elif sc == 'credits':
            self.press('confirm', 120)
            self.frames(30)
            sig = ('credits', ss.get('y'))
        elif sc == 'inn':
            self.frames(4)
            sig = ('inn',)
        elif sc in ('shop', 'menu', 'config', 'loadGame') and not allow_shop:
            # Not where the plan wanted to be: back out.
            self.tap('cancel', 4)
            sig = (sc, 'cancel', time.time() // 2)
        elif sc == 'title':
            sig = ('title',)
        elif sc == 'field':
            if self.battle_seen:
                self.battles.append({'map': self.last_map, 'rounds': self.battle_seen['rounds'], 'wall_s': round(time.time() - self.battle_seen['start'], 1),
                                     'enc': self.battle_seen.get('enc'), 'elite': self.battle_seen.get('elite'), 'level': self.battle_seen.get('level')})
                self.battle_seen = None
            f = self.field() or {}
            L = f.get('leader') or {}
            sig = ('field', f.get('map'), L.get('x'), L.get('y'), f.get('locked'), f.get('running'), f.get('warp'), len(self.flags()), self.js('LQ_ENGINE.frame') // 180)
            self.frames(2)
        else:
            self.frames(4)
            sig = (sc, time.time() // 3)
        self.progress(sig)
        return sc

    def settle(self, prefer=None, safe=False, max_s=600):
        """Run overlay handling until the field is idle (no cutscene, no transition, leader standing)."""
        t0 = time.time()
        calm = 0
        while time.time() - t0 < max_s:
            sc = self.handle(prefer, safe)
            if sc != 'field':
                calm = 0
                continue
            f = self.field()
            if f and not f['locked'] and not f['warp'] and not f['loading'] and not f['running'] and not f['transition'] and f['leader'] and not f['leader']['moving'] and f['frame'] >= 14:
                calm += 1
                if calm >= 2:
                    return f
            else:
                calm = 0
        raise Softlock('settle timed out')

    # ------------------------------------------------------------------ walk model
    def grid(self, map_id):
        """The static walk model of a map as the save's flags see it: gated overlays (Garrick's planks, the
        Hollow's lettered signs) are present only when their flags hold. One cached grid per combination."""
        have = {k for k, v in (self.flags() or {}).items() if v}
        gated = self.gated.get(map_id)
        key = (map_id, tuple(sorted(f for f in gated if f in have))) if gated is not None else None
        if key is None or key not in self.grids:
            args = ['node', str(HERE / 'autoplay_grid.mjs'), map_id, '--flags=' + ','.join(sorted(have))]
            r = subprocess.run(args, capture_output=True, text=True, timeout=60, cwd=str(NEXT))
            if r.returncode != 0:
                raise Fail(f'grid {map_id}: {r.stderr[-400:]}')
            g = json.loads(r.stdout)
            g['by_id'] = {e['id']: e for e in g['events']}
            self.gated[map_id] = g.get('gated') or []
            key = (map_id, tuple(sorted(f for f in self.gated[map_id] if f in have)))
            self.grids[key] = g
        return self.grids[key]

    def model(self, f, fight=False, goal=None, allow_pits=False, extra_block=(), ignore=()):
        """Walkability for the current field: returns (passable(x,y,dir), enemy cells). `ignore` = entity ids
        whose cells are not obstacles (a block the planner is about to push)."""
        g = self.grid(f['map'])
        W, H, code, faint = g['W'], g['H'], g['code'], g['faint']
        gm = self.game() or {}
        opened = gm.get('opened') or {}
        blocked, avoid, enemies, unblocked = set(extra_block), set(), set(), set()
        for e in f['ents']:
            if e['id'] in ignore:
                continue
            cells = [tuple(c) for c in e['cells']]
            for c, b in zip(cells, e['blocked']):
                if b:
                    blocked.add(c)
                elif e['type'] in ('door', 'gate', 'locked_door'):
                    unblocked.add(c)        # a doorway cut into a wall face: the static grid calls it solid
            if e.get('opens'):
                unblocked.update(tuple(c) for c in e['opens'])      # W9: a broken crack carved these cells to floor
            if e['type'] == 'door' or (e['type'] in ('gate', 'locked_door') and e['state'] == 'open' and e['to']) or e['type'] == 'ferry':
                for c in cells:
                    avoid.add(c)
            if e['type'] == 'trigger' and e['on'] != 'enter' and e['script'] in ('south_gate',) and not fight:
                pass
        for ex in g['exits']:
            for j in range(ex.get('h', 1)):
                for i in range(ex.get('w', 1)):
                    avoid.add((ex['x'] + i, ex['y'] + j))
        for a in f['actors']:
            if a['kind'] == 'party':
                continue
            if a['kind'] == 'enemy':
                enemies.add((a['x'], a['y']))
                if not fight:
                    blocked.add((a['x'], a['y']))
            elif a['solid']:
                blocked.add((a['x'], a['y']))
        goal_t = tuple(goal) if goal else None
        # E2 glass bridges: a lit one is floor, a dim one is a pit, whatever the static grid says
        lit_bridges = {(x, y) for x, y, lit in f.get('bridges') or [] if lit}
        dim_bridges = {(x, y) for x, y, lit in f.get('bridges') or [] if not lit}

        def passable(x, y, d):
            if not (0 <= x < W and 0 <= y < H):
                return False
            if (x, y) in blocked and (x, y) != goal_t:
                return False
            if (x, y) in avoid and (x, y) != goal_t:
                return False
            if (x, y) in unblocked:
                return True
            if (x, y) in lit_bridges:
                return True
            if (x, y) in dim_bridges:
                return allow_pits or (x, y) == goal_t
            c = code[y][x]
            if faint[y][x]:
                return bool(opened.get(f'{f["map"]}:ink:{x},{y}'))
            if c == 'none':
                return True
            if c == 'pit':
                return allow_pits or (x, y) == goal_t
            if c in ('ledge_s', 'ledge_e', 'ledge_w'):
                return d == {'ledge_s': 'down', 'ledge_e': 'right', 'ledge_w': 'left'}[c]
            return False
        return passable, enemies

    def bfs(self, start, goals, passable, stop_at_enemy=None):
        """Shortest path (list of dirs) from start to any goal tile. Enemy cells end a path (contact)."""
        start = tuple(start)
        goals = {tuple(g) for g in goals}
        if start in goals:
            return []
        came = {start: None}
        q = collections.deque([start])
        while q:
            x, y = q.popleft()
            for d, (dx, dy) in DIRS.items():
                n = (x + dx, y + dy)
                if n in came or not passable(n[0], n[1], d):
                    continue
                came[n] = ((x, y), d)
                if n in goals:
                    path = []
                    cur = n
                    while came[cur]:
                        prev, dd = came[cur]
                        path.append(dd)
                        cur = prev
                    return path[::-1]
                if stop_at_enemy and n in stop_at_enemy:
                    continue
                q.append(n)
        return None

    def walk_to(self, goals, fight=False, allow_pits=False, label='', max_replans=40, prefer=None):
        """Walk the leader to one of the goal tiles. Returns the field snapshot on arrival."""
        goals = [tuple(g) for g in goals]
        map0 = None
        for attempt in range(max_replans):
            f = self.settle(prefer=prefer)
            if map0 is None:
                map0 = f['map']
            if f['map'] != map0:
                return f                                     # a door, exit or pit took us somewhere else
            L = (f['leader']['x'], f['leader']['y'])
            if L in goals:
                return f
            passable, enemies = self.model(f, fight=fight, goal=goals[0] if len(goals) == 1 else None, allow_pits=allow_pits)
            path = self.bfs(L, goals, passable, stop_at_enemy=enemies if fight else None)
            if path is None:
                # a wandering NPC (a dog in a doorway) can close the only way for a while: wait it out
                if attempt >= 4:
                    raise Fail(f'no route to {goals} on {f["map"]} from {L} ({label})')
                self.frames(45)
                continue
            # Execute straight segments, verifying after each one.
            i = 0
            ok = True
            while i < len(path):
                d = path[i]
                n = 1
                while i + n < len(path) and path[i + n] == d:
                    n += 1
                n = min(n, 10)
                here = self.field()
                if not here or here['locked'] or here['warp'] or here['running']:
                    ok = False
                    break
                hx, hy = here['leader']['x'], here['leader']['y']
                self.hold_dir(d, n, run=True)
                self.frames(n * RUN + 3)
                self.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !f || !f.leader || !f.leader.moving || f.inputLocked; })()", timeout=15000, polling=10)
                after = self.field()
                if not after or after['map'] != f['map']:
                    return self.settle(prefer=prefer)      # a door, exit or pit took us somewhere else
                ex, ey = hx + DIRS[d][0] * n, hy + DIRS[d][1] * n
                ax, ay = after['leader']['x'], after['leader']['y']
                if abs(ax - hx) + abs(ay - hy) > n + 1:
                    return self.settle(prefer=prefer)      # a same-map door or pit moved us: the caller re-aims
                if (ax, ay) != (ex, ey):
                    ok = False
                    break
                i += n
            if ok:
                f = self.settle(prefer=prefer)
                lx, ly = f['leader']['x'], f['leader']['y']
                if f['map'] != map0 or (lx, ly) in goals:
                    return f
                if abs(lx - ex) + abs(ly - ey) > 1:
                    return f                                 # a door on the goal tile moved us after the check
            self.progress(('walk', f['map'], L, attempt))
        raise Fail(f'could not reach {goals} on {f["map"]} ({label})')

    # ------------------------------------------------------------------ interaction
    def ent(self, f, ent_id):
        for e in f['ents']:
            if e['id'] == ent_id:
                return e
        return None

    def actor(self, f, actor_id):
        for a in f['actors']:
            if a['id'] == actor_id:
                return a
        return None

    def stand_spots(self, f, cells, solid_target):
        """Candidate (tile, dir) pairs from which confirm reaches one of the target cells."""
        g = self.grid(f['map'])
        passable, _ = self.model(f)
        out = []
        for (cx, cy) in cells:
            for d, (dx, dy) in DIRS.items():
                sx, sy = cx - dx, cy - dy   # stand here facing d toward the cell
                if passable(sx, sy, d) and (sx, sy) not in cells:
                    out.append(((sx, sy), d))
                elif 0 <= sy < g['H'] and 0 <= sx < g['W'] and g['code'][sy][sx] == 'counter':
                    s2 = (sx - dx, sy - dy)
                    if passable(s2[0], s2[1], d):
                        out.append((s2, d))
        return out

    def face(self, d):
        f = self.field()
        if f['leader']['dir'] == d:
            return
        x, y = f['leader']['x'] + DIRS[d][0], f['leader']['y'] + DIRS[d][1]
        passable, _ = self.model(f)
        if not passable(x, y, d):
            self.tap(d, 3)            # bumps: turns without moving
            return
        # the faced tile is open floor (a non-solid prop, a doorway): step back and forth so the last step faces d
        o = OPP[d]
        sx, sy = f['leader']['x'], f['leader']['y']
        ox, oy = sx + DIRS[o][0], sy + DIRS[o][1]
        if passable(ox, oy, o):
            self.hold_dir(o, 1, run=False)
            self.frames(WALK + 2)
            self.hold_dir(d, 1, run=False)
            self.frames(WALK + 2)
            g = self.field()['leader']
            if (g['x'], g['y']) != (sx, sy):
                raise Fail(f'face {d}: ended on {g["x"]},{g["y"]} instead of {sx},{sy}')
        else:
            raise Fail(f'face {d}: the faced tile is walkable and nothing is behind us to step back to (at {sx},{sy} on {f["map"]}; {getattr(self, "last_interact", None)})')

    def interact(self, ent_id=None, actor_id=None, prefer=None, safe=False, label=''):
        """Walk next to an entity or actor, face it, press confirm, and settle through whatever follows."""
        f = self.settle()
        target = None
        if actor_id:
            a = self.actor(f, actor_id)
            if a:
                target = [(a['x'], a['y'])]
        if target is None and ent_id:
            e = self.ent(f, ent_id)
            if not e:
                raise Fail(f'no entity {ent_id} on {f["map"]} ({label})')
            target = [tuple(c) for c in e['cells']]
        if target is None:
            raise Fail(f'nothing to interact with ({ent_id or actor_id}) on {f["map"]}')
        spots = self.stand_spots(f, target, True)
        if not spots:
            raise Fail(f'no tile to stand on next to {ent_id or actor_id} on {f["map"]}')
        passable, _ = self.model(f)
        L = (f['leader']['x'], f['leader']['y'])
        ranked = []
        for spot, d in spots:
            p = self.bfs(L, [spot], passable)
            if p is None:
                continue
            faced = (spot[0] + DIRS[d][0], spot[1] + DIRS[d][1])
            opp = (spot[0] - DIRS[d][0], spot[1] - DIRS[d][1])
            # a solid target: bumping it turns us (reliable). A walkable one (a letter on the floor, a doorway
            # cell): we must arrive moving toward it, or be able to step back and forth behind it.
            if not passable(faced[0], faced[1], d):
                turn = 0
            elif p and p[-1] == d:
                turn = 0
            elif passable(opp[0], opp[1], OPP[d]):
                turn = 2
            else:
                turn = 50
            ranked.append((len(p) + turn, spot, d))
        if not ranked:
            near = [(a['id'], a['x'], a['y']) for a in f['actors'] if a['kind'] != 'party' and abs(a['x'] - L[0]) + abs(a['y'] - L[1]) <= 3]
            raise Fail(f'cannot reach {ent_id or actor_id} on {f["map"]} ({label}) from {L}; spots {spots}; actors nearby {near}')
        ranked.sort(key=lambda t: t[0])
        # Try the spots best first: a walkable target (a letter on the floor) can only be faced from a tile that
        # lets us arrive moving toward it or step back behind it; when a spot turns out not to, take the next.
        last_err = None
        for _, spot, d in ranked[:4]:
            self.last_interact = {'target': ent_id or actor_id, 'spot': spot, 'dir': d, 'from': L}
            f = self.walk_to([spot], label=label or (ent_id or actor_id))
            # NPCs wander: re-check where it is now and re-aim.
            if actor_id:
                a = self.actor(f, actor_id)
                if a and (a['x'], a['y']) not in [(spot[0] + dx, spot[1] + dy) for dx, dy in DIRS.values()] + [(spot[0] + 2 * dx, spot[1] + 2 * dy) for dx, dy in DIRS.values()]:
                    return self.interact(ent_id=ent_id, actor_id=actor_id, prefer=prefer, safe=safe, label=label)
                if a:
                    d = self.dir_toward(spot, (a['x'], a['y']))
            try:
                self.face(d)
            except Fail as e:
                last_err = e
                self.notes.append(f'face retry at {spot} {d}: {e}')
                continue
            before = self.frame()
            self.tap('confirm', 3)
            self.settle(prefer=prefer, safe=safe)
            return before
        raise Fail(f'could not face {ent_id or actor_id} on {f["map"]} ({label}): {last_err}')

    @staticmethod
    def dir_toward(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        if abs(dx) >= abs(dy) and dx != 0:
            return 'right' if dx > 0 else 'left'
        return 'down' if dy > 0 else 'up'

    def through(self, ent_id, label='', exact=True):
        """Step onto a door / exit / stairs entity and wait for the new map. exact=False: a door to another map
        whose arrival scene moves the party at once (the throne room's great mirror): the map change is enough."""
        f = self.settle()
        e = self.ent(f, ent_id)
        if not e:
            raise Fail(f'no door {ent_id} on {f["map"]}')
        if e['type'] == 'locked_door' and e['state'] != 'open':
            self.interact(ent_id=ent_id, label=f'unlock {ent_id}')      # the key turns on confirm
            f = self.settle()
            e = self.ent(f, ent_id)
            if e['state'] != 'open':
                raise Fail(f'{ent_id} stayed locked (key {e.get("key")}, carried {self.items().get(e.get("key") or "", 0)})')
        cell = tuple(e['doorAt']) if e.get('doorAt') else tuple(e['cells'][0])
        to = e['to']
        f = self.settle()
        if (f['leader']['x'], f['leader']['y']) == cell:
            # landed on the door cell itself (an interior's exit): a door fires on stepping onto it, so step off first
            passable, _ = self.model(f)
            for d, (dx, dy) in DIRS.items():
                if passable(cell[0] + dx, cell[1] + dy, d):
                    self.hold_dir(d, 1, run=False)
                    self.frames(WALK + 4)
                    break
        self.walk_to([cell], label=label or ent_id)
        if to and not exact and to[0] != f['map']:
            # walk_to may already have settled through the arrival scene (and anything it chains): any other map will do
            self.page.wait_for_function(f"(() => {{ const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id !== {json.dumps(f['map'])} && !f.loading; }})()", timeout=30000, polling=20)
        elif to:
            # the far side may be on this map (a notch) or another one: wait until the party stands on it
            self.page.wait_for_function(f"(() => {{ const f = LQ_ENGINE.stack.find(s => s.name === 'field'); if (!f || !f.map || f.loading || f.pendingWarp || !f.leader) return false; "
                                        f"const to = {json.dumps(to)}; return f.map.id === to[0] && f.leader.tx === to[1] && f.leader.ty === to[2]; }})()", timeout=30000, polling=20)
        return self.settle()

    def exit_to(self, cell, label=''):
        f = self.settle()
        old = f['map']
        self.walk_to([tuple(cell)], label=label)
        self.page.wait_for_function(f"(() => {{ const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && f.map && f.map.id !== {json.dumps(old)} && !f.loading; }})()", timeout=30000, polling=20)
        return self.settle()

    def expect_map(self, map_id):
        f = self.settle()
        if f['map'] != map_id:
            raise Fail(f'expected to be on {map_id}, on {f["map"]}')
        return f

    # ------------------------------------------------------------------ puzzles
    def push_block(self, block_id, target, label=''):
        """Push one block to a target cell (single-box Sokoban search over the live walk model)."""
        for attempt in range(6):
            f = self.settle()
            e = self.ent(f, block_id)
            if not e:
                raise Fail(f'no block {block_id}')
            bpos = (e['x'], e['y'])
            if bpos == tuple(target):
                return
            passable, _ = self.model(f, ignore={block_id})
            cells_blocked = set()

            def free(x, y, d, box):
                return (x, y) != box and passable(x, y, d)
            # state: (box, player)
            L = (f['leader']['x'], f['leader']['y'])
            start = (bpos, L)
            came = {start: None}
            q = collections.deque([start])
            found = None
            while q and found is None:
                box, pl = q.popleft()
                # player reachability around the box
                seen = {pl}
                qq = collections.deque([pl])
                while qq:
                    x, y = qq.popleft()
                    for d, (dx, dy) in DIRS.items():
                        n = (x + dx, y + dy)
                        if n in seen or n == box or not passable(n[0], n[1], d):
                            continue
                        seen.add(n)
                        qq.append(n)
                for d, (dx, dy) in DIRS.items():
                    behind = (box[0] - dx, box[1] - dy)
                    dest = (box[0] + dx, box[1] + dy)
                    if behind not in seen:
                        continue
                    if not passable(dest[0], dest[1], d) or dest in cells_blocked and dest != box:
                        continue
                    ns = (dest, box)
                    if ns in came:
                        continue
                    came[ns] = ((box, pl), d, behind)
                    if dest == tuple(target):
                        found = ns
                        break
                    q.append(ns)
            if found is None:
                raise Fail(f'no push plan for {block_id} to {target} ({label})')
            plan = []
            cur = found
            while came[cur]:
                prev, d, behind = came[cur]
                plan.append((behind, d))
                cur = prev
            plan.reverse()
            for behind, d in plan:
                self.walk_to([behind], label=f'push {block_id}')
                f = self.settle()
                e = self.ent(f, block_id)
                before = (e['x'], e['y'])
                self.tap(d, 1)       # one frame: turns toward the block and pushes it exactly one tile
                self.frames(20)
                f = self.settle()
                e = self.ent(f, block_id)
                if (e['x'], e['y']) == before:
                    self.tap(d, 1)   # the first frame only turned us (we were not facing it yet)
                    self.frames(20)
                    f = self.settle()
                    e = self.ent(f, block_id)
                if abs(e['x'] - before[0]) + abs(e['y'] - before[1]) != 1:
                    break            # off plan: search again from the live state
            f = self.settle()
            e = self.ent(f, block_id)
            if e and (e['x'], e['y']) == tuple(target):
                return
        raise Fail(f'block {block_id} did not reach {target}')

    def raise_lantern(self):
        f = self.settle()
        if not (self.items().get('lantern_of_recall')):
            raise Fail('no lantern to raise')
        self.tap('pageR', 2)
        self.frames(130)
        self.settle()

    def reveal_near(self, cells, label=''):
        """Stand within reach of faint ink cells and raise the Lantern until they are revealed."""
        for attempt in range(6):
            f = self.settle()
            # done when no faint tile is left on any of the target cells (a 16x32 glyph only owns its top cell)
            left = self.page.evaluate("(cells) => cells.filter(([x, y]) => LQ_ENGINE.scene.map.idsAt(x, y).some(id => /_faint$/.test(id)))", [list(c) for c in cells])
            if not left:
                return
            passable, _ = self.model(f)
            cx = sum(c[0] for c in cells) / len(cells)
            cy = sum(c[1] for c in cells) / len(cells)
            g = self.grid(f['map'])
            spots = []
            for y in range(g['H']):
                for x in range(g['W']):
                    if abs(x - cx) + abs(y - cy) <= 4 and passable(x, y, 'down') and not g['faint'][y][x]:
                        spots.append((x, y))
            if not spots:
                raise Fail(f'no spot near ink {cells} ({label})')
            L = (f['leader']['x'], f['leader']['y'])
            routes = {s: self.bfs(L, [s], passable) for s in spots}
            reachable = [s for s in spots if routes[s] is not None]
            if not reachable:
                raise Fail(f'no reachable spot near ink {cells} ({label})')
            reachable.sort(key=lambda s: (len(routes[s]), abs(s[0] - cx) + abs(s[1] - cy)))
            self.walk_to([reachable[0]], label=f'ink {label}')
            self.raise_lantern()
        raise Fail(f'ink at {cells} did not reveal ({label})')

    # ------------------------------------------------------------------ menus and shops
    def open_menu(self):
        self.settle()
        self.tap('menu', 6)
        self.page.wait_for_function("LQ_DEBUG.scene() === 'menu'", timeout=10000, polling=20)
        self.frames(8)

    def close_menu(self):
        for _ in range(8):
            sc = self.scene()
            if sc == 'field':
                return
            self.tap('cancel', 6)
        self.settle()

    def menu_command(self, cmd):
        """Move the command cursor to a command id and confirm it."""
        ids = ['items', 'tech', 'magic', 'equip', 'status', 'journal', 'talk', 'config', 'save', 'quit']
        geo = self.js("(() => { const s = LQ_ENGINE.scene; const l = s && s.commands; return l ? { cm: !!l.columnMajor, cols: l.columns || 1, rows: l.rows } : null; })()") or {}
        if geo.get('cm') and geo.get('cols', 1) > 1:
            # touch layout (phone): two columns of five, column major; up / down wrap inside a column
            R = geo['rows']
            want = ids.index(cmd)
            for _ in range(16):
                cur = ids.index((self.scene_state()['ss'] or {}).get('command') or 'items')
                if cur == want:
                    break
                if cur // R != want // R:
                    self.tap('right' if want // R > cur // R else 'left', 3)
                else:
                    self.tap('down' if want % R > cur % R else 'up', 3)
            self.tap('confirm', 2)
            self.frames(6)
            return
        ss = self.scene_state()['ss'] or {}
        cur = ids.index(ss.get('command') or 'items')
        self.pick(ids.index(cmd), cur)
        self.frames(6)

    def menu_talk(self):
        self.open_menu()
        self.menu_command('talk')
        for _ in range(60):
            sc = self.handle()
            if sc == 'menu' and (self.scene_state()['ss'] or {}).get('mode') == 'commands':
                break
        self.close_menu()

    def menu_journal(self):
        self.open_menu()
        self.menu_command('journal')
        self.frames(10)
        self.shot('journal')
        self.close_menu()

    def menu_optimize_all(self):
        """Equip -> each member -> Optimize (the real screens)."""
        g = self.game()
        n = len(g['party'])
        for i in range(n):
            self.open_menu()
            self.menu_command('equip')
            self.frames(4)
            self.pick(i, (self.scene_state()['ss'] or {}).get('member') or 0)     # member picker
            self.frames(6)
            keys = self.js(f"(() => {{ const s = LQ_ENGINE.scene; return s.screen && s.screen.slots ? s.screen.slots.items.map(i => i.id) : []; }})()")
            if 'optimize' in keys:
                self.pick(keys.index('optimize'), 0)
                self.frames(8)
            self.close_menu()

    def menu_save(self, slot):
        """Menu -> Save -> slot (1..3), overwriting if needed."""
        self.open_menu()
        self.menu_command('save')
        self.page.wait_for_function("LQ_DEBUG.scene() === 'loadGame'", timeout=10000, polling=20)
        self.frames(6)
        ss = self.scene_state()['ss'] or {}
        slots = [s['slot'] for s in ss.get('slots', [])]
        self.pick(slots.index(slot), ss.get('index') or 0)
        for _ in range(40):
            st = self.scene_state()
            if st['scene'] == 'choice':
                self.pick(0, (st['ss'] or {}).get('index') or 0)      # Overwrite
            elif st['scene'] == 'menu':
                break
            self.frames(6)
        self.close_menu()
        env = self.js(f'LQ_ENGINE.save.loadEnvelope({slot})')
        if not env:
            raise Fail(f'save to slot {slot} did not write')
        return env

    def quit_to_title(self):
        self.open_menu()
        self.menu_command('quit')
        for _ in range(40):
            st = self.scene_state()
            if st['scene'] == 'choice':
                self.pick(0, (st['ss'] or {}).get('index') or 0)
            if st['scene'] == 'title':
                break
            self.frames(6)
        self.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        self.frames(10)

    def title_continue(self, slot):
        """Title -> Continue -> pick a record (real presses)."""
        ss = self.scene_state()['ss'] or {}
        self.pick(1, ss.get('index') or 0)                               # Continue
        self.page.wait_for_function("LQ_DEBUG.scene() === 'loadGame'", timeout=10000, polling=20)
        self.frames(6)
        ss = self.scene_state()['ss'] or {}
        slots = [s['slot'] for s in ss.get('slots', [])]
        self.pick(slots.index(slot), ss.get('index') or 0)
        self.page.wait_for_function("LQ_DEBUG.scene() === 'field'", timeout=30000, polling=30)
        return self.settle()

    def round_trip(self, slot, label):
        """Save to a slot, quit to the title, load it back, and compare the state."""
        before = self.game()
        self.menu_save(slot)
        self.quit_to_title()
        self.shot('title_after_quit')
        self.title_continue(slot)
        after = self.game()
        diffs = []
        for k in ('map', 'flags', 'items', 'gold', 'heroName'):
            if json.dumps(before.get(k), sort_keys=True) != json.dumps(after.get(k), sort_keys=True):
                diffs.append(k)
        if (before['pos']['x'], before['pos']['y']) != (after['pos']['x'], after['pos']['y']):
            diffs.append('pos')
        if [m['id'] for m in before['party']] != [m['id'] for m in after['party']]:
            diffs.append('party')
        if diffs:
            raise Fail(f'save/load round trip {label} changed {diffs}')
        self.notes.append(f'round trip ok: slot {slot} at {label} ({after["map"]} {after["pos"]["x"]},{after["pos"]["y"]})')
        print(f'  round trip ok: slot {slot} ({label})', flush=True)

    def shop_buy(self, wants):
        """Inside the shop scene: buy each (item id, qty) that is listed and affordable, then leave."""
        bought = []
        self.page.wait_for_function("LQ_DEBUG.scene() === 'shop'", timeout=10000, polling=20)
        self.frames(6)
        for item, qty in wants:
            ss = self.scene_state()['ss'] or {}
            if ss.get('focus') != 'cmds':
                self.tap('cancel', 6)
            ss = self.scene_state()['ss'] or {}
            if ss.get('cmd') != 'Buy':
                for _ in range(3):
                    if (self.scene_state()['ss'] or {}).get('cmd') == 'Buy':
                        break
                    self.tap('left', 4)
            self.tap('confirm', 6)        # into the list
            listing = self.js(SCENE_LIST_JS) or []
            ids = [i['id'] for i in listing]
            if item not in ids:
                self.tap('cancel', 6)
                continue
            price = listing[ids.index(item)]['price'] or 0
            gold = self.game()['gold']
            n = min(qty, gold // max(1, price))
            if n <= 0:
                self.tap('cancel', 6)
                continue
            ss = self.scene_state()['ss'] or {}
            self.pick(ids.index(item), ss.get('index') or 0)
            self.frames(6)
            ss = self.scene_state()['ss'] or {}
            if ss.get('qty') is not None:
                for _ in range(n - 1):
                    self.tap('right', 3)
                self.tap('confirm', 8)
            else:
                for _ in range(n - 1):        # equipment: one confirm buys one (no quantity window)
                    self.tap('confirm', 8)
            self.frames(6)
            spent = gold - self.game()['gold']
            got = spent // max(1, price)
            if got:
                bought.append((item, got))
            self.tap('cancel', 6)         # back to the command strip
        # Leave: cancel from the command strip leaves the shop.
        for _ in range(6):
            if self.scene() != 'shop':
                break
            ss = self.scene_state()['ss'] or {}
            if ss.get('focus') != 'cmds':
                self.tap('cancel', 6)
            else:
                self.tap('cancel', 8)
        self.settle()
        return bought

    def visit_shop(self, npc, wants):
        """Talk to a shopkeeper (lines first), then buy inside the real shop UI."""
        self.settle()
        f = self.field()
        a = self.actor(f, npc)
        if not a:
            return []
        self.interact_no_settle(actor_id=npc)
        bought = []
        calm = 0
        for _ in range(80):
            sc = self.handle(allow_shop=True)
            if sc == 'shop':
                bought = self.shop_buy(wants)
                break
            # the shop is pushed right after the last line closes: the field shows for a frame in between
            calm = calm + 1 if sc == 'field' and not (self.field() or {}).get('locked') else 0
            if calm >= 4:
                break
        self.settle()
        if bought:
            print(f'  bought {bought}', flush=True)
        return bought

    def interact_no_settle(self, ent_id=None, actor_id=None):
        f = self.settle()
        target = None
        if actor_id:
            a = self.actor(f, actor_id)
            if a:
                target = [(a['x'], a['y'])]
        if target is None and ent_id:
            e = self.ent(f, ent_id)
            target = [tuple(c) for c in e['cells']]
        spots = self.stand_spots(f, target, True)
        passable, _ = self.model(f)
        L = (f['leader']['x'], f['leader']['y'])
        best = None
        for spot, d in spots:
            p = self.bfs(L, [spot], passable)
            if p is None:
                continue
            if best is None or len(p) < best[0]:
                best = (len(p), spot, d)
        if best is None:
            raise Fail(f'cannot reach {ent_id or actor_id}')
        _, spot, d = best
        f = self.walk_to([spot])
        if actor_id:
            a = self.actor(f, actor_id)
            if a:
                d = self.dir_toward(spot, (a['x'], a['y']))
        self.face(d)
        self.tap('confirm', 3)

    def rest_at_inn(self, keeper='hob'):
        self.interact_no_settle(actor_id=keeper)
        calm = 0
        for _ in range(80):
            sc = self.handle(prefer='Rest')
            calm = calm + 1 if sc == 'field' and not (self.field() or {}).get('locked') else 0
            if calm >= 4:
                break
        self.settle()

    def party_vitals(self):
        """[{id, hp, maxHp, mp, maxMp, level}] with the real stat formula (equipment included)."""
        return self.js("(async () => { const { memberStats } = await import('./src/battle/rules.js'); "
                       "return LQ_ENGINE.game.party.map(m => { const s = memberStats(m); return { id: m.id, hp: m.hp, maxHp: s.maxHp, mp: m.mp, maxMp: s.maxMp, level: m.level }; }); })()")

    def grid_pick(self, index, current, columns=2):
        """Move the cursor in a multi-column List from `current` to `index` and confirm."""
        r0, c0 = (current or 0) // columns, (current or 0) % columns
        r1, c1 = index // columns, index % columns
        for _ in range(abs(r1 - r0)):
            self.tap('down' if r1 > r0 else 'up', 3)
        for _ in range(abs(c1 - c0)):
            self.tap('right' if c1 > c0 else 'left', 3)
        self.tap('confirm', 2)

    def menu_use_item(self, item, member_index):
        """Menu -> Items -> the item -> a member, through the real screens. Returns True when it was used."""
        self.open_menu()
        self.menu_command('items')
        self.frames(6)
        ids = self.js("(() => { const s = LQ_ENGINE.scene; return s.screen && s.screen.list ? s.screen.list.items.map(i => i.id) : []; })()")
        if item not in ids:
            self.close_menu()
            return False
        ss = (self.scene_state()['ss'] or {}).get('screen') or {}
        before = self.items().get(item, 0)
        self.grid_pick(ids.index(item), ss.get('index') or 0, columns=2)
        self.frames(6)
        if not ((self.scene_state()['ss'] or {}).get('screen') or {}).get('picker'):
            self.close_menu()
            return False
        self.pick(member_index, 0)
        self.frames(10)
        self.close_menu()
        return self.items().get(item, 0) < before

    def top_up_mp(self, frac=0.3):
        """Ethers for anyone under `frac` of their MP (casters first), as long as Ethers remain."""
        used = []
        for _ in range(6):
            # Ethers first; Episode 2's Hi-Ethers once they are gone
            have = self.items()
            potion = 'ether' if have.get('ether', 0) > 0 else 'hi_ether' if have.get('hi_ether', 0) > 0 else None
            if not potion:
                break
            vit = self.party_vitals()
            low = [(i, v) for i, v in enumerate(vit) if v['maxMp'] > 0 and v['mp'] < v['maxMp'] * frac]
            if not low:
                break
            low.sort(key=lambda iv: (iv[1]['id'] != 'mira', iv[1]['mp'] / max(1, iv[1]['maxMp'])))
            i, v = low[0]
            if not self.menu_use_item(potion, i):
                break
            used.append(v['id'])
        if used:
            print(f'  ethers: {used}', flush=True)
            self.notes.append(f'ethers used on {used} ({self.last_map})')
        return used

    def rest_at_font(self, ent_id, label='font'):
        """Rest at a Keeper's font (Rest, then decline the save prompt)."""
        self.interact(ent_id=ent_id, prefer=['Rest', 'Not now'], label=label)
        self.settle(prefer=['Not now'])

    def maybe_rest_at_fonts(self, frac=0.6):
        """Rest at a font on this map when anyone is under `frac` HP (or a caster is out of MP)."""
        f = self.settle()
        fonts = [e['id'] for e in f['ents'] if e['type'] == 'font']
        if not fonts:
            return False
        vit = self.party_vitals()
        hurt = any(v['hp'] < v['maxHp'] * frac for v in vit) or any(v['maxMp'] > 0 and v['mp'] < v['maxMp'] * 0.3 for v in vit)
        if not hurt:
            return False
        try:
            self.rest_at_font(fonts[0], label=f'rest {fonts[0]}')
        except Fail as e:
            self.notes.append(f'font {fonts[0]} unreachable: {e}')
            return False
        self.notes.append(f'rested at {fonts[0]} on {f["map"]}')
        print(f'  rested at {fonts[0]}', flush=True)
        return True

    def maintain(self, label=''):
        """Upkeep between rooms: Optimize for everyone, Ethers for low casters, a font when hurt."""
        self.menu_optimize_all()
        self.top_up_mp()
        self.maybe_rest_at_fonts()

    def hp_fraction(self):
        g = self.game()
        return self.js("(() => { const g = LQ_ENGINE.game; return g.party.map(m => m.hp / (globalThis.__LQ_memberStats ? 1 : 1)); })()") and min(
            m['hp'] / max(1, m.get('maxHp') or self.js(f"(() => {{ const m = LQ_ENGINE.game.party[{i}]; return m.maxHp || m.hp; }})()")) for i, m in enumerate(g['party']))

    def party_hp(self):
        """[(id, hp, maxHp)] using the battle stat provider the UI uses."""
        return self.js("(() => { const g = LQ_ENGINE.game; return g.party.map(m => { let mx = m.maxHp; try { const s = LQ_DEBUG.state(); } catch (e) {} return [m.id, m.hp, mx || m.hp, m.level]; }); })()")

    # ------------------------------------------------------------------ fighting
    def hunt(self, limit=12, label=''):
        """Fight every reachable visible enemy on the current map (walk into them)."""
        for _ in range(limit):
            f = self.settle()
            enemies = [a for a in f['actors'] if a['kind'] == 'enemy' and not a['fighting']]
            if not enemies:
                return
            passable, ecells = self.model(f, fight=True)
            L = (f['leader']['x'], f['leader']['y'])
            best = None
            for a in enemies:
                p = self.bfs(L, [(a['x'], a['y'])], passable, stop_at_enemy=ecells)
                if p is not None and (best is None or len(p) < len(best[1])):
                    best = (a, p)
            if best is None:
                return
            a = best[0]
            before = len(self.battles)
            try:
                self.walk_to([(a['x'], a['y'])], fight=True, label=f'hunt {a["id"]}', max_replans=8)
            except Fail:
                pass
            self.settle()
            if len(self.battles) == before:
                # the enemy moved; try again from the top (bounded by limit)
                continue

    # ------------------------------------------------------------------ Episode 2: silverglass, Shove, Dash
    def beam_solutions(self, map_id):
        """The map's own beam solutions (tools/maps/mapcheck.mjs beams): for each receptor and glass bridge, the
        mirror states and heavy-mirror cells of the first configuration the walk found that lights it."""
        key = ('beams', map_id)
        if key not in self.grids:
            r = subprocess.run(['node', str(NEXT / 'tools' / 'maps' / 'mapcheck.mjs'), 'beams', map_id], capture_output=True, text=True, timeout=120, cwd=str(NEXT))
            if r.returncode != 0:
                raise Fail(f'beams {map_id}: {r.stderr[-400:]}')
            data = json.loads(r.stdout)
            sols = {}
            for s in data.get('solved') or []:
                sols[s.get('receptor') or s.get('bridge')] = {'states': s.get('states') or {}, 'positions': s.get('positions') or {}}
            self.grids[key] = sols
        return self.grids[key]

    def reachable_spot(self, f, cells):
        """(path length, spot, dir) of the nearest tile from which confirm reaches one of `cells`, or None."""
        passable, _ = self.model(f)
        L = (f['leader']['x'], f['leader']['y'])
        best = None
        for spot, d in self.stand_spots(f, cells, True):
            p = self.bfs(L, [spot], passable)
            if p is not None and (best is None or len(p) < best[0]):
                best = (len(p), spot, d)
        return best

    def solve_beam(self, map_id, goal, skip=(), label=''):
        """Light a receptor or a bridge ('bridge x,y') with the map's solution: shove the heavy mirrors to their cells,
        then turn every mirror the party can reach to its state, nearest first, looking again after each turn (a
        turn can lay the bridge to the next mirror). Mirrors in `skip` are left as they are."""
        sol = self.beam_solutions(map_id).get(goal)
        if not sol:
            raise Fail(f'no beam solution for {goal} on {map_id}')
        for mid, cell in sol['positions'].items():
            self.shove_to(mid, tuple(cell), label=f'{label} {mid}')
        targets = {m: s for m, s in sol['states'].items() if m not in skip}
        turned = 0
        for _ in range(4 * len(targets) + 6):
            f = self.settle()
            todo = []
            for m, s in targets.items():
                e = self.ent(f, m)
                if e and int(e['state'] or 0) != int(s):
                    todo.append(m)
            if not todo:
                self.notes.append(f'beam {goal} on {map_id}: {turned} turns')
                return f
            best = None
            for m in todo:
                e = self.ent(f, m)
                r = self.reachable_spot(f, [(e['x'], e['y'])])
                if r and (best is None or r[0] < best[0]):
                    best = (r[0], m)
            if best is None:
                raise Fail(f'beam {goal} on {map_id}: no reachable mirror among {todo} ({label})')
            self.interact(ent_id=best[1], label=f'turn {best[1]}')
            turned += 1
        raise Fail(f'beam {goal} on {map_id}: mirrors did not settle ({label})')

    def press_ability(self, settle_frames=40):
        """pageR (the field ability that fits what the leader faces), then wait for it to finish."""
        self.tap('pageR', 2)
        self.frames(6)
        self.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !f || !f.abilities || !f.abilities.busy; })()", timeout=20000, polling=20)
        self.frames(settle_frames)
        return self.settle()

    def shove_to(self, ent_id, target, label=''):
        """Bram's Shove (W9): push a heavy block or mirror one tile per shove, in a straight line, to `target`."""
        for _ in range(12):
            f = self.settle()
            e = self.ent(f, ent_id)
            if not e:
                raise Fail(f'no heavy {ent_id} ({label})')
            pos = (e['x'], e['y'])
            if pos == tuple(target):
                return
            dx, dy = target[0] - pos[0], target[1] - pos[1]
            if dx and dy:
                raise Fail(f'{ent_id} at {pos} is not in line with {target} ({label})')
            d = ('right' if dx > 0 else 'left') if dx else ('down' if dy > 0 else 'up')
            behind = (pos[0] - DIRS[d][0], pos[1] - DIRS[d][1])
            self.walk_to([behind], label=f'shove {ent_id}')
            self.face(d)
            self.press_ability()
            f = self.settle()
            e = self.ent(f, ent_id)
            if (e['x'], e['y']) == pos:
                self.notes.append(f'shove {ent_id} {d} from {pos} did not move it')
                self.press_ability()
        f = self.settle()
        e = self.ent(f, ent_id)
        if (e['x'], e['y']) != tuple(target):
            raise Fail(f'{ent_id} did not reach {target} ({label}); at {(e["x"], e["y"])}')

    def dash_break(self, ent_id, label=''):
        """Dash Strike (W9) into a cracked rock or glass pane: stand next to it, face it, pageR."""
        for _ in range(3):
            f = self.settle()
            e = self.ent(f, ent_id)
            if not e or e['state'] == 'broken':
                return True
            r = self.reachable_spot(f, [tuple(c) for c in e['cells']])
            if not r:
                raise Fail(f'no spot to dash at {ent_id} ({label})')
            _, spot, d = r
            self.walk_to([spot], label=f'dash {ent_id}')
            self.face(d)
            self.press_ability()
        f = self.settle()
        e = self.ent(f, ent_id)
        return not e or e['state'] == 'broken'

    def rest_at_fire(self, ent_id, prefer=None):
        """A campfire object with `rest` (the Waystation): its scene, then the rest flow."""
        self.interact(ent_id=ent_id, prefer=prefer or ['Rest', 'Not now'], label=f'rest {ent_id}')
        self.settle(prefer=['Not now'])


# ================================================================================================ the plan
class Episode:
    def __init__(self, bot, side=True, until=None, hollow=False):
        self.b = bot
        self.side = side
        self.until = until
        self.hollow_on = hollow             # W13: visit Whisperwood Hollow after the Lantern (--hollow)

    def done(self, step_id):
        return self.until == step_id

    # ---- helpers
    def has(self, f):
        return self.b.flag(f)

    def ensure_map(self, map_id):
        f = self.b.settle()
        if f['map'] != map_id:
            raise Fail(f'plan expected {map_id} but the party is on {f["map"]}')
        return f

    def ensure_any(self):
        return self.b.settle()

    def chest(self, ent_id):
        """Open a chest (the equip prompt answers itself in settle), then Optimize everyone."""
        b = self.b
        f = b.settle()
        if b.opened(f['map'], ent_id) or not b.ent(f, ent_id):
            return False
        b.interact(ent_id=ent_id, label=f'chest {ent_id}')
        b.menu_optimize_all()
        return True

    def sign(self, ent_id):
        b = self.b
        f = b.settle()
        if b.ent(f, ent_id):
            b.interact(ent_id=ent_id, label=f'sign {ent_id}')

    def talk(self, npc, prefer=None, safe=False):
        b = self.b
        f = b.settle()
        if b.actor(f, npc):
            b.interact(actor_id=npc, prefer=prefer, safe=safe, label=f'talk {npc}')
            return True
        return False

    # ---- phases
    def title_to_bed(self):
        b = self.b
        if b.scene() != 'title':
            return
        b.shot('title')
        if b.resume:
            b.title_continue(1)
            b.notes.append(f'resumed from {b.resume}')
            b.mark('resume')
            return
        ss = b.scene_state()['ss'] or {}
        b.pick(0, ss.get('index') or 0)                 # New Game
        b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntry' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        b.frames(10)
        # Clear the default and type the name on the real keyboard (name entry listens to key events).
        for _ in range(8):
            b.page.keyboard.press('Backspace')
        b.page.keyboard.type(b.hero, delay=30)
        b.frames(6)
        b.shot('name_entry')
        b.page.keyboard.press('Enter')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'prologue'", timeout=20000, polling=30)
        b.frames(40)
        b.shot('prologue')
        # Read each card for a moment, then advance it.
        for _ in range(12):
            if b.scene() != 'prologue':
                break
            b.frames(40)
            b.tap('confirm', 6)
        b.page.wait_for_function("LQ_DEBUG.scene() === 'field'", timeout=30000, polling=30)
        b.settle()
        if (b.game() or {}).get('heroName') != b.hero:
            raise Fail(f'hero name is {(b.game() or {}).get("heroName")!r}, typed {b.hero!r}')
        b.mark('wake')

    def town_morning(self):
        b = self.b
        if self.has('met_mael'):
            return
        self.ensure_map('hero_home')
        if not self.has('intro_done'):
            b.settle()                                          # wake_up runs on entry
        if not self.has('intro_done'):
            raise Fail('wake_up did not set intro_done')
        self.sign('home_blanket')
        self.talk('hazel')
        b.through('home_exit')
        self.ensure_map('willowmere')
        b.settle()                                              # fading_sign fires on the landing tile
        if not self.has('saw_fading_sign'):
            raise Fail('fading_sign did not run on the doorstep')
        b.mark('find_mael')
        self.sign('sign_bakery')
        self.talk('mael')                                        # mael_intro
        if not self.has('met_mael'):
            raise Fail('mael_intro did not set met_mael')

    def town_errands(self):
        """Side quests that are cheap before leaving: Tess, Wick, the Duke, Oren, the starter, Nella, Hazel."""
        b = self.b
        if not self.side or self.has('left_town'):
            return
        self.ensure_map('willowmere')
        if not self.has('tess_quest_started'):
            self.talk('tess')
        if not self.has('wick_quest_started'):
            self.talk('wick')
        if self.has('wick_quest_started') and not self.has('wick_tag_found'):
            b.interact(ent_id='duck_nest', label='duck nest')
        if self.has('wick_tag_found') and not self.has('wick_tag_done'):
            self.talk('wick')
        if not self.has('nella_quest_started'):
            self.talk('nella')
        self.sign('well')
        if not self.has('starter_quest_started'):
            b.through('door_bakery')
            self.ensure_map('bakery')
            self.talk('oren')
            self.sign('bakery_crock')
            b.through('bakery_exit')
        if self.has('starter_quest_started') and not self.has('starter_found'):
            self.ensure_map('willowmere')
            b.through('door_smithy')
            self.ensure_map('smithy')
            self.talk('starter_dough')
            b.through('smithy_exit')
        if self.has('starter_found') and not self.has('starter_done'):
            self.ensure_map('willowmere')
            b.through('door_bakery')
            self.talk('oren')
            b.through('bakery_exit')
        if self.has('met_mael') and not self.has('hazel_farewell_done'):
            self.ensure_map('willowmere')
            b.through('door_home')
            self.talk('hazel')
            b.through('home_exit')

    def library(self):
        b = self.b
        if self.has('mira_joined'):
            return
        self.ensure_map('willowmere')
        self.sign('sign_library')
        b.through('door_library')
        self.ensure_map('library')
        b.settle()                                              # mira_joins runs on entry
        if not self.has('mira_joined'):
            self.talk('mira')
        if not self.has('mira_joined'):
            raise Fail('mira_joins did not set mira_joined')
        b.mark('south_gate')
        b.interact(ent_id='book_tales', label='book')
        b.through('library_exit')

    def south_gate(self):
        b = self.b
        if self.has('bram_joined'):
            return
        self.ensure_map('willowmere')
        self.sign('notice_board')
        b.walk_to([(20, 28), (21, 28)], label='gate_inner')      # the trigger row
        b.settle()
        if not self.has('bram_joined'):
            self.talk('bram')
        if not self.has('bram_joined'):
            raise Fail('south_gate did not add Bram')
        b.mark('to_archive')

    def outfit(self):
        """Garrick's farewell and shop, the item shop, the chapel save, the inn if hurt, Talk and Journal."""
        b = self.b
        if self.has('left_town'):
            return
        self.ensure_map('willowmere')
        b.menu_talk()
        b.menu_journal()
        if not self.has('garrick_farewell_done'):
            b.through('door_smithy')
            self.ensure_map('smithy')
            self.talk('garrick')                                 # garrick_farewell (hatchet)
            b.visit_shop('garrick', [('leather_vest', 1), ('leather_hood', 1)])
            b.through('smithy_exit')
        self.ensure_map('willowmere')
        b.through('door_shop')
        self.ensure_map('item_shop')
        b.visit_shop('pell', [('potion', 3)])
        b.through('shop_exit')
        b.menu_optimize_all()
        # chapel: save bell -> save page (slot 1), then the save/load round trip
        self.ensure_map('willowmere')
        b.through('door_chapel')
        self.ensure_map('chapel')
        self.talk('pip')
        b.interact_no_settle(ent_id='save_bell')
        self.save_from_bell(1)
        b.close_menu()
        b.round_trip(1, 'town')
        self.ensure_map('chapel')
        b.through('chapel_exit')
        hp = b.js("(() => LQ_ENGINE.game.party.map(m => m.hp))()")
        if min(hp) < 40:
            self.ensure_map('willowmere')
            b.through('door_inn')
            b.rest_at_inn()
            b.through('inn_exit')

    def save_from_bell(self, slot):
        """The chapel bell already pushed the menu on its save page: pick the slot."""
        b = self.b
        for _ in range(120):
            st = b.scene_state()
            if st['scene'] == 'loadGame':
                break
            b.handle(allow_shop=True)
        st = b.scene_state()
        if st['scene'] != 'loadGame':
            raise Fail('the chapel bell did not open the save page')
        ss = st['ss'] or {}
        slots = [s['slot'] for s in ss.get('slots', [])]
        b.pick(slots.index(slot), ss.get('index') or 0)
        for _ in range(40):
            st = b.scene_state()
            if st['scene'] == 'choice':
                b.pick(0, (st['ss'] or {}).get('index') or 0)
            elif st['scene'] == 'menu':
                break
            b.frames(6)

    def leave_town(self):
        b = self.b
        if self.has('left_town'):
            return
        self.ensure_map('willowmere')
        b.walk_to([(20, 29), (21, 29)], label='leave_town')
        b.settle()
        if not self.has('left_town'):
            raise Fail('leave_town did not set left_town')

    def valley(self):
        b = self.b
        if self.has('archive_entered'):
            return
        f = b.settle()
        if f['map'] == 'willowmere':
            b.exit_to((20, 31), label='to valley')
        self.ensure_map('valley')
        b.settle()
        b.mark('valley')
        if self.side:
            self.chest('chest_hollow')
        self.sign('bridge_plaque')
        b.hunt(limit=4, label='valley road')
        if not self.has('saw_milestone'):
            b.interact(ent_id='milestone', label='milestone')
        self.talk('quill')
        b.visit_shop('penny', [('potion', 2)])
        if self.side and self.has('nella_quest_started') and not self.has('ferry_bell_found'):
            b.interact(ent_id='prop_ferry_bell', label='ferry bell')
        self.sign('ferry_post')
        b.hunt(limit=6, label='valley north')
        b.top_up_mp()
        b.walk_to([(36, 7)], label='door_step')
        b.settle()
        if not self.has('archive_entered'):
            raise Fail('archive_door did not open the Archive')
        b.through('archive_entrance')
        self.ensure_map('archive_f1')
        b.mark('catalog_halls')

    def f1(self):
        b = self.b
        if self.has('archive_f1_done'):
            return
        self.ensure_map('archive_f1')
        b.settle()
        self.sign('catalog_drawers')
        b.interact(ent_id='catalog_ledger', label='ledger')
        self.chest('chest_b')
        # letter 1 and the hidden cell
        if self.side and not self.has('tess_letter_1_found'):
            b.interact(ent_id='prop_letter', label='letter 1')
        if self.side:
            b.through('hole_e')
            self.chest('chest_f')
            b.through('notch_f')
        # the key: pot room C (break the pots in the way, push the block west 4 and north 2)
        if b.items().get('archive_key', 0) == 0 and not b.opened('archive_f1', 'chest_d'):
            b.hunt(limit=3, label='pot room')
            for pot in ('pot_c4', 'pot_c1', 'pot_c2', 'pot_c3', 'pot_c5', 'pot_c6', 'pot_c8'):
                f = b.settle()
                e = b.ent(f, pot)
                if e and e['state'] == 'whole':
                    b.interact(ent_id=pot, label=pot)
            b.push_block('block_c', (4, 11), label='plate C')
            b.through('gate_c')
            self.chest('chest_d')
            b.through('notch_d')
        # the plate room H: two blocks onto two plates
        b.walk_to([(31, 26), (32, 26), (30, 26)], label='room H')
        b.hunt(limit=2, label='room H')
        b.push_block('block_h1', (28, 22), label='plate H1')
        b.push_block('block_h2', (35, 22), label='plate H2')
        b.through('gate_h')
        b.hunt(limit=5, label='east wing')
        self.chest('chest_i')
        b.interact(ent_id='keeper_journal_1', label='journal 1')
        b.through('keydoor_i')
        b.walk_to([(31, 4)], label='bell landing')
        b.settle()
        if not self.has('archive_f1_done'):
            raise Fail('archive_f1_bell did not set archive_f1_done')
        b.mark('warden')
        b.maintain('end of F1')
        b.through('stairs_f2')
        self.ensure_map('archive_f2')

    def f2(self):
        b = self.b
        if self.has('archive_f2_done'):
            return
        self.ensure_map('archive_f2')
        b.settle()
        self.sign('reading_desk')
        b.interact(ent_id='readers_oath', label='oath')
        # east wing first (start: east doorway open)
        if self.side:
            b.walk_to([(28, 22)], label='east wing')
            b.hunt(limit=3, label='east wing')
            self.chest('chest_eg')
            if not self.has('tess_letter_2_found'):
                b.interact(ent_id='prop_letter', label='letter 2')
            b.walk_to([(20, 15)], label='hub')
        # toggle the hub switch so the west doorway opens
        f = b.settle()
        sw = b.ent(f, 'switch_hub')
        if sw and sw['state'] != 'on':
            b.interact(ent_id='switch_hub', label='hub switch')
        b.walk_to([(12, 22)], label='west wing')
        b.hunt(limit=3, label='west wing')
        self.chest('chest_wg')
        b.interact(ent_id='keeper_journal_2', label='journal 2')
        b.maintain('before the warden')
        for attempt in range(5):
            if self.has('echo_warden_defeated'):
                break
            if attempt:
                # a loss put us back at the F2 entrance with full HP: level a little, then walk in again
                b.notes.append(f'Echo Warden attempt {attempt + 1}')
                b.hunt(limit=3, label='before the warden again')
                f = b.settle()
                sw = b.ent(f, 'switch_hub')
                if sw and sw['state'] != 'on':
                    b.interact(ent_id='switch_hub', label='hub switch again')
            b.walk_to([(4, 16), (5, 16)], label='warden trigger')
            b.settle()
        if not self.has('echo_warden_defeated'):
            raise Fail('the Echo Warden fight did not resolve in 5 attempts')
        b.mark('lantern')
        if not self.has('lantern_get'):
            b.interact(ent_id='lantern_pedestal', label='lantern')
            if not self.has('lantern_get'):
                raise Fail('lantern_get did not run')
        b.mark('galleries')
        # reveal the bridge back into the hub (beside the pedestal), read the wall, cross
        g = b.grid('archive_f2')
        faint = [(x, y) for y in range(g['H']) for x in range(g['W']) if g['faint'][y][x] and 'bridge' in g['faint'][y][x]]
        west = [c for c in faint if c[0] < 12]
        east = [c for c in faint if c[0] > 25]
        b.reveal_near(west, label='west bridge')
        self.sign('hidden_ink_1')
        b.walk_to([(20, 13)], label='hub via ink bridge')
        b.reveal_near(east, label='east bridge')
        b.walk_to([(34, 13), (34, 14), (35, 14)], label='f2 exit trigger')
        b.settle()
        self.sign('hidden_ink_2')
        if not self.has('archive_f2_done'):
            raise Fail('archive_f2_exit did not set archive_f2_done')
        b.round_trip(2, 'F2 after the lantern')
        self.ensure_map('archive_f2')
        b.mark('stacks')
        b.maintain('end of F2')
        b.through('stairs_f3')
        self.ensure_map('archive_f3')

    def hollow(self):
        """W13 (--hollow): the optional Whisperwood Hollow, at the time the game points at it (Bram's nudge after the
        Lantern, so the Alpha is the base tier, not an Elder). From the F3 landing: back up through F2, F1's back-stair
        and out to the valley; the root arch at the pool; the hidden bridge (Lantern); the hollow's wolves and Blot;
        the braziers; the iron chest; the block onto the plate; the shrine; the Briar Alpha; the pilgrims' stone; the
        gold chest; then back through the Archive to the F3 landing, where the route goes on. Asserts hollow_cleared
        and Thornwake (the Alpha's unique drop) in the party's gear."""
        b = self.b
        if not self.hollow_on or self.has('hollow_cleared') or not self.has('lantern_get') or self.has('boss_door_open'):
            return
        f = b.settle()
        start_map = f['map']
        # out of the Archive
        if f['map'] == 'archive_f3':
            b.through('stairs_f2')
        self.ensure_map('archive_f2')
        b.through('stairs_f1')
        self.ensure_map('archive_f1')
        b.through('shortcut_b')                                  # the Keepers' back-stair to the entrance hall
        b.through('exit_valley')
        self.ensure_map('valley')
        b.mark('hollow')
        b.walk_to([(51, 28)], fight=True, label='to the root arch')
        b.through('hollow_mouth')
        self.ensure_map('whisperwood_hollow')
        b.settle()                                               # hollow_entry: the pool, the piles, Mira's nudge
        if not self.has('hollow_found'):
            raise Fail('hollow_entry did not set hollow_found')
        # the lost bridge: five cells of hidden ink across the pool
        b.reveal_near([(5, 16), (6, 16), (7, 16), (8, 16), (9, 16)], label='lost bridge')
        b.walk_to([(10, 16)], fight=True, label='over the lost bridge')
        b.hunt(limit=6, label='the hollow')
        for br in ('brazier_m1', 'brazier_m2'):
            f = b.settle()
            e = b.ent(f, br)
            if e and e['state'] != 'lit':
                b.interact(ent_id=br, label=br)
        self.chest('chest_bay')
        b.maintain('the hollow')
        # the block: down two, then east four onto the plate (the root column blocks the straight push)
        b.push_block('block_m', (18, 16), label='hollow plate')
        b.through('gate_b')
        self.ensure_map('whisperwood_hollow')
        b.rest_at_font('hollow_shrine', label='the pilgrims shrine')
        for attempt in range(4):
            b.walk_to([(20, 7)], label='the Alpha den')         # alpha_trig: hollow_alpha, the fight, hollow_after
            b.settle(max_s=900)
            if self.has('briar_alpha_defeated'):
                break
            # a loss returns the party to the shrine (the game over return point): rest and go again
            b.notes.append(f'Briar Alpha attempt {attempt + 1}')
            self.ensure_map('whisperwood_hollow')
            b.rest_at_font('hollow_shrine', label='shrine again')
        if not self.has('hollow_cleared'):
            raise Fail('the Briar Alpha fight did not resolve (hollow_cleared not set)')
        self.chest('chest_alpha')
        thorn = b.js("(() => { const g = LQ_ENGINE.game; const worn = g.party.flatMap(m => Object.values(m.equip || {})); "
                     "return [...g.gear, ...worn].some(it => it && (it === 'thornwake' || it.base === 'thornwake')); })()")
        if not thorn:
            raise Fail('no Thornwake after the Briar Alpha')
        b.notes.append(f"Whisperwood Hollow cleared at Lv {b.game()['party'][0]['level']}: Thornwake in hand, both chests opened")
        b.menu_optimize_all()
        # back to the route: the hollow, the valley, the Archive door, F1's back-stair, F2, the F3 landing
        b.through('notch_b')
        b.through('hollow_exit')
        self.ensure_map('valley')
        b.walk_to([(36, 6)], fight=True, label='back to the Archive door')
        b.through('archive_entrance')
        self.ensure_map('archive_f1')
        b.through('shortcut_j')
        b.through('stairs_f2')
        self.ensure_map('archive_f2')
        if start_map == 'archive_f3':
            b.through('stairs_f3')
            self.ensure_map('archive_f3')
        b.mark('stacks')

    def f3(self):
        b = self.b
        if self.has('boss_door_open'):
            return
        self.ensure_map('archive_f3')
        b.settle()
        # western stacks: braziers, the letter, enemies
        b.walk_to([(5, 11)], label='west stacks')
        for br in ('brazier_ws1', 'brazier_ws2'):
            f = b.settle()
            e = b.ent(f, br)
            if e and e['state'] != 'lit':
                b.interact(ent_id=br, label=br)
        b.hunt(limit=4, label='west stacks')
        if self.side and not self.has('tess_letter_3_found'):
            b.interact(ent_id='prop_letter', label='letter 3')
        # the bell hollow
        if not self.has('found_thirteenth_bell'):
            b.walk_to([(5, 22), (6, 22)], label='bell hollow')
            b.settle()
            if not self.has('found_thirteenth_bell'):
                raise Fail('thirteenth_bell did not run')
            self.sign('thirteenth_bell_prop')
        # the crystal room and the key
        if not self.has('stacks_key_found'):
            b.walk_to([(20, 14)], label='crystal room')
            b.hunt(limit=2, label='crystal room')
            for c in ('crystal_a', 'crystal_b', 'crystal_c'):
                f = b.settle()
                e = b.ent(f, c)
                if e and e['state'] != 'on':
                    b.interact(ent_id=c, label=c)
            b.through('gate_bk')
            self.chest('chest_key')
            b.interact(ent_id='keeper_journal_3', label='journal 3')
            self.sign('broken_chronicle')
            b.through('notch_bk')
        # optional: the pit room cache (fall in, the gold chest, the First Quill behind hidden ink, climb back)
        if self.side and not b.opened('archive_f3', 'chest_quill'):
            try:
                b.walk_to([(31, 12)], fight=True, label='pit room')                    # on the floor between the pits
                b.walk_to([(32, 12)], fight=True, label='drop into the cache', allow_pits=True)   # a pit tile: fall on purpose
            except Fail as e:
                b.notes.append(f'pit room approach: {e}')
            f = b.settle()
            if f['map'] == 'archive_f3' and f['leader']['y'] >= 22:
                try:
                    self.chest('chest_cache')
                    g = b.grid('archive_f3')
                    faint = [(x, y) for y in range(22, g['H']) for x in range(g['W']) if g['faint'][y][x] and 'bridge' in g['faint'][y][x]]
                    b.reveal_near(faint, label='cache bridge')
                    self.chest('chest_quill')
                except Fail as e:
                    b.notes.append(f'cache loot skipped: {e}')
                b.through('cache_up')                                                   # the only way out: stairs to the pit room
        f = b.settle()
        if f['map'] == 'archive_f3' and f['leader']['y'] >= 22 and f['leader']['x'] >= 29:
            b.through('cache_up')
        b.maintain('F3 before the great door hall')
        # the great door hall: font, journal, the door
        b.walk_to([(23, 24)], fight=True, label='great door hall')
        b.hunt(limit=3, label='great door hall')
        b.menu_optimize_all()
        b.rest_at_font('keeper_font', label='font')
        self.sign('boss_door_plate')
        self.sign('hidden_ink_3')
        g = b.grid('archive_f3')
        ink3 = [(17, 20), (17, 21)]
        b.reveal_near(ink3, label='door ink')
        self.sign('hidden_ink_3')
        if b.game()['party'][0]['level'] < 7:
            b.notes.append(f"level {b.game()['party'][0]['level']} before the boss door: hunting the stacks again")
            b.through('shortcut_f1')
            b.through('shortcut_f3')
            b.hunt(limit=8, label='re-hunt F3')
            b.rest_at_font('keeper_font', label='font again')
        b.round_trip(3, 'before the boss')
        self.ensure_map('archive_f3')
        b.interact(ent_id='boss_door', prefer="Let's go", label='boss door')
        if not self.has('boss_door_open'):
            raise Fail('boss_door did not open')
        b.mark('archivore')

    def boss(self):
        b = self.b
        if self.has('archivore_defeated'):
            return
        for attempt in range(5):
            f = b.settle()
            if f['map'] == 'archive_f3':
                b.through('boss_passage')
            self.ensure_map('archive_boss')
            b.settle(max_s=900)                                  # the Archivore scene, the fight, the aftermath
            if self.has('archivore_defeated'):
                break
            # a loss reloads the chamber (full HP) and the scene replays on entry; step out, drink, come back
            b.notes.append(f'Archivore attempt {attempt + 1}')
            b.through('back_to_f3')
            b.rest_at_font('keeper_font', label='font before the boss again')
            b.hunt(limit=3, label='before the boss again')
            b.maintain('before the boss again')
        if not self.has('archivore_defeated'):
            raise Fail('the Archivore fight did not resolve in 5 attempts')
        b.mark('go_home')

    def go_home(self):
        b = self.b
        if self.has('ep1_complete'):
            return
        f = b.settle()
        if f['map'] == 'archive_boss':
            b.through('root_passage_exit')
        self.ensure_map('valley')
        if self.side and self.has('lantern_get') and not b.opened('valley', 'chest_whisperwood'):
            try:
                b.walk_to([(52, 31)], fight=True, label='whisperwood')           # the bank before the ink bridge
                b.reveal_near([(53, 31), (54, 31), (55, 31)], label='whisperwood bridge')
                self.chest('chest_whisperwood')
            except Fail as e:
                b.notes.append(f'whisperwood secret skipped: {e}')
        if self.has('nella_bell_done'):
            b.interact(ent_id='ferry_post', prefer='Ring', label='ferry')
        else:
            b.exit_to((0, 33), label='valley exit')
        # arriving in Willowmere runs return_to_willowmere, ending_hook and the credits, then loads hero_home
        b.settle(max_s=900)
        if not self.has('ep1_complete'):
            raise Fail('ep1_complete was not set after the return')
        for _ in range(400):
            sc = b.handle()
            if sc == 'field' and (b.field() or {}).get('map') == 'hero_home' and not (b.field() or {}).get('locked'):
                break
        b.settle()
        # The autosave the game wrote as the party woke at home after the credits: the "Episode 1 credits save"
        # the Episode 2 run starts from (python qa/autoplay.py --episode 2).
        env = b.js('LQ_ENGINE.save.loadEnvelope(0)')
        if env and env.get('data') and (env['data'].get('flags') or {}).get('ep1_complete'):
            (OUT / f'{b.device}-ep1-credits-save.json').write_text(json.dumps(env['data']), encoding='utf-8')
            b.notes.append(f'credits save written: {b.device}-ep1-credits-save.json ({env["data"].get("map")}, Lv {env["data"]["party"][0]["level"]})')
        else:
            b.notes.append('no autosave with ep1_complete after the credits')
        b.mark('epilogue')

    def epilogue(self):
        b = self.b
        if not self.has('ep1_complete'):
            return
        self.ensure_map('hero_home')
        self.talk('hazel')
        self.sign('home_doorframe')
        if self.side:
            b.through('home_exit')
            self.ensure_map('willowmere')
            self.talk('mael')
            if self.has('tess_letter_3_found') and not self.has('tess_quest_done'):
                self.talk('tess')
            if self.has('ferry_bell_found') and not self.has('nella_bell_done'):
                self.talk('nella')
            b.through('door_bakery')
            self.talk('hal')
            b.through('bakery_exit')

    def run(self):
        b = self.b
        b.mark('boot')
        phases = [('wake', self.title_to_bed), ('find_mael', self.town_morning), ('errands', self.town_errands), ('find_mira', self.library),
                  ('south_gate', self.south_gate), ('outfit', self.outfit), ('to_archive', self.leave_town), ('valley', self.valley),
                  ('catalog_halls', self.f1), ('galleries', self.f2), ('hollow', self.hollow), ('stacks', self.f3), ('archivore', self.boss), ('go_home', self.go_home),
                  ('epilogue', self.epilogue)]
        for step_id, fn in phases:
            print(f'-- {step_id}', flush=True)
            fn()
            if b.resume and step_id == 'wake':
                b.resume = None          # loaded: from here on the plan runs as usual
                self.ensure_any()
            b.check_errors()
            if self.until == step_id:
                print(f'stopping after {step_id} (--until)', flush=True)
                return


# ================================================================================================ Episode 2
class Episode2(Episode):
    """Episode 2, "The Town Without a Name" (docs/story/EPISODE2.md, STAGING_EP2.md, MAPS.md section 6): from the
    morning after the Episode 1 credits to the Episode 2 credits in Hollowmere's inn. Every phase is guarded by
    its flags, so a run resumed from any save skips what is done. Beam puzzles use the maps' own solutions
    (Bot.solve_beam); fights are Auto at 2x, every visible enemy on the way."""

    # Gear the bot buys, best first (shop_buy skips what is not listed or not affordable).
    TIER3 = [('steel_cuirass', 2), ('sage_robe', 1), ('steel_helm', 2), ('moon_circlet', 1), ('strider_boots', 1)]
    TIER4 = [('mere_pike', 1), ('mirror_rod', 1), ('silverglass_blade', 1), ('silver_mail', 2), ('mirrorweave_robe', 1),
             ('glass_helm', 2), ('mirror_circlet', 1)]

    def __init__(self, bot, side=True, until=None, start='save'):
        super().__init__(bot, side=side, until=until)
        self.start = start

    def level(self):
        return (self.b.game() or {}).get('party', [{}])[0].get('level')

    def where(self):
        return self.b.settle()['map']

    # ---- phases
    def title_start(self):
        """Title -> Continue on the Episode 1 credits save (record 1), or Title -> Episode 2 -> name -> home."""
        b = self.b
        if b.scene() != 'title':
            return
        b.shot('title')
        ss = b.scene_state()['ss'] or {}
        items = ss.get('items') or []
        if 'ep2' not in items:
            raise Fail(f'the title does not offer Episode 2 (items {items}; ep2 {ss.get("ep2")})')
        if b.resume:
            b.title_continue(1)
            b.notes.append(f'resumed from {b.resume}')
            b.mark('resume')
            return
        b.pick(items.index('ep2'), ss.get('index') or 0)
        b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp2' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        b.frames(10)
        for _ in range(8):
            b.page.keyboard.press('Backspace')
        b.page.keyboard.type(b.hero, delay=30)
        b.frames(6)
        b.shot('name_entry_ep2')
        b.page.keyboard.press('Enter')
        b.page.wait_for_function("LQ_DEBUG.state().scenes.includes('field')", timeout=30000, polling=30)
        b.frames(30)
        b.shot('ep2_card')
        b.settle()
        g = b.game() or {}
        if g.get('heroName') != b.hero:
            raise Fail(f'hero name is {g.get("heroName")!r}, typed {b.hero!r}')
        b.mark('ep2_new_game')

    def morning(self):
        b = self.b
        if self.has('ep2_started'):
            return
        f = b.settle()
        if f['map'] == 'hero_home':
            if not self.has('ep2_morning_done'):
                raise Fail('ep2_morning did not run at home')
            self.talk('hazel')
            b.through('home_exit')
        self.ensure_map('willowmere')
        b.mark('ep2_mael')
        self.talk('mael')                                            # ep2_mael: the letter
        if not self.has('ep2_started'):
            raise Fail('ep2_mael did not set ep2_started')
        if not b.items().get('mael_letter'):
            raise Fail('ep2_mael did not give mael_letter')

    def farewells(self):
        """Optional Act I beats: Tess (The Last Route), Iris, the smithy note. Cheap and in town."""
        b = self.b
        if not self.side or self.has('crossing_done'):
            return
        self.ensure_map('willowmere')
        if not self.has('last_route_started'):
            self.talk('tess')
        # (smithy_ford_note sits on the smithy's door cell: facing it reads it, a step more walks in; not read here)
        if not self.has('iris_farewell_done'):
            b.through('door_library')
            self.ensure_map('library')
            self.talk('iris')
            b.through('library_exit')
        b.menu_talk()
        b.menu_journal()

    def crossing(self):
        b = self.b
        if self.has('crossing_done'):
            return
        f = b.settle()
        if f['map'] == 'willowmere':
            b.exit_to((20, 31), label='to the valley')
        self.ensure_map('valley')
        b.mark('crossing')
        self.sign('ford_wrack')
        b.walk_to([(43, y) for y in range(16, 20)] + [(44, y) for y in range(16, 20)], label='crossing_trig')
        b.settle()
        if not self.has('crossing_done'):
            raise Fail('garrick_crossing did not set crossing_done')
        self.sign('garrick_rail')
        b.exit_to((59, 16), label='the east road')
        self.ensure_map('east_road')
        b.mark('fading_road')

    def east_road(self):
        b = self.b
        if self.has('nh_arrived'):
            return
        self.ensure_map('east_road')
        b.settle()                                                   # east_road_arrival
        if not self.has('east_road_arrived'):
            raise Fail('east_road_arrival did not run')
        self.sign('east_signpost')
        if not self.has('east_first_fight_done'):
            for attempt in range(4):
                b.walk_to([(6, 16), (6, 17)], label='first fight cut')
                b.settle()
                if self.has('east_first_fight_done'):
                    break
                b.notes.append(f'east_first_fight attempt {attempt + 1}')
                b.walk_to([(3, 16), (3, 17)], label='back from the cut')
            if not self.has('east_first_fight_done'):
                raise Fail('east_first_fight did not resolve')
        b.hunt(limit=3, label='bank road')
        if self.side and not b.opened('east_road', 'chest_clearing'):
            try:
                if b.dash_break('crack_clearing', label='clearing'):
                    b.hunt(limit=2, label='clearing')
                    self.chest('chest_clearing')
                else:
                    b.notes.append('the clearing crack did not break')
            except Fail as e:
                b.notes.append(f'clearing skipped: {e}')
        if not self.has('saw_old_milestone'):
            b.interact(ent_id='old_milestone', label='old milestone')
        b.top_up_mp()
        b.walk_to([(19, 16)], label='fog_start')
        b.settle()
        if not self.has('saw_cairns'):
            raise Fail('fading_stretch did not run at fog_start')
        self.sign('cairn_sign')
        b.hunt(limit=1, label='fog guard')
        b.walk_to([(40, 16), (40, 17)], label='fog_end')
        if self.has('fog_looped'):
            b.notes.append('the fog looped the bot (it left the cairn corridor)')
        b.mark('waystation')
        if not self.has('waystation_rested'):
            b.rest_at_fire('waystation_fire', prefer=['Mira, that tune?', 'Rest', 'Not now'])
        self.chest('chest_toll')
        self.sign('toll_board')
        b.visit_shop('penny_e', [('hi_potion', 2)])
        b.hunt(limit=3, label='waystation')
        b.maintain('waystation')
        if b.party_vitals() and min(v['hp'] / max(1, v['maxHp']) for v in b.party_vitals()) < 0.6:
            b.rest_at_fire('waystation_fire')
        b.walk_to([(52, 13), (53, 13), (54, 13), (52, 14), (53, 14), (54, 14)], label='mere_view')
        b.settle()
        if not self.has('saw_court'):
            raise Fail('mere_view did not run on the rise')
        if self.side and not b.opened('east_road', 'chest_reeds'):
            try:
                self.reed_island()
            except Fail as e:
                b.notes.append(f'reed island skipped: {e}')
        b.hunt(limit=2, label='mere shore')
        b.exit_to((63, 16), label='to the Hollow')
        self.ensure_map('nameless_hollow')
        b.mark('nameless_hollow')

    def reed_island(self):
        """The heavy block on the causeway (W9 Shove): shove it aside, then the iron chest on the reed island."""
        b = self.b
        f = b.settle()
        e = b.ent(f, 'heavy_shore')
        if not e:
            return
        if not b.reachable_spot(f, [(59, 8)]):
            for d in ('left', 'right', 'up', 'down'):
                tgt = (e['x'] + DIRS[d][0], e['y'] + DIRS[d][1])
                behind = (e['x'] - DIRS[d][0], e['y'] - DIRS[d][1])
                passable, _ = b.model(f)
                if passable(tgt[0], tgt[1], d) and b.bfs((f['leader']['x'], f['leader']['y']), [behind], passable) is not None:
                    b.shove_to('heavy_shore', tgt, label='causeway block')
                    break
        self.chest('chest_reeds')

    def hollow(self):
        """The Nameless Hollow: Elian at the fountain, the hall, Anwen, the ferry; shops; the Fountain of Faces."""
        b = self.b
        if self.has('court_entered'):
            return
        self.ensure_map('nameless_hollow')
        b.settle()                                                   # nh_arrival
        if not self.has('nh_arrived'):
            raise Fail('nh_arrival did not run')
        self.sign('gate_sign')
        if not self.has('met_elian'):
            b.walk_to([(x, 20) for x in range(19, 25)] + [(19, 18), (24, 18)], label='fountain ring')
            b.settle()
            if not self.has('met_elian'):
                raise Fail('fountain_faces did not set met_elian')
        self.sign('proclamation')
        self.sign('plinth')
        if not self.has('heard_crisis'):
            b.through('door_hall')
            self.ensure_map('nh_hall')
            b.walk_to([(9, 12), (10, 12), (11, 12)], label='hall_trig')
            b.settle()
            if not self.has('heard_crisis'):
                raise Fail('elian_hall did not set heard_crisis')
            b.interact(ent_id='nh_ledger_book', label='ledger')
            b.through('hall_exit')
        self.ensure_map('nameless_hollow')
        if not self.has('met_anwen'):
            b.through('door_chapel')
            self.ensure_map('nh_chapel')
            b.walk_to([(8, 11), (9, 11), (10, 11)], label='anwen_trig')
            b.settle()
            if not self.has('met_anwen'):
                raise Fail('anwen_register did not set met_anwen')
            self.sign('register')
            b.interact_no_settle(ent_id='save_bell')
            self.save_from_bell(1)
            b.close_menu()
            b.round_trip(1, 'the Hollow chapel')
            self.ensure_map('nh_chapel')
            b.through('chapel_exit')
        self.ensure_map('nameless_hollow')
        if not self.has('court_ferry_open'):
            self.talk('tovin')
            if not self.has('court_ferry_open'):
                raise Fail('tovin_ferry did not open the ferry')
        b.mark('outfit_hollow')
        self.shop_hollow(self.TIER3)
        if self.side:
            self.fountain_quest()
            if not self.has('satchel_found'):
                b.through('door_inn')
                self.ensure_map('nh_inn')
                b.interact(ent_id='lost_property', label='lost property')
                b.through('inn_exit')
        self.inn_if_hurt()
        self.ensure_map('nameless_hollow')
        b.interact(ent_id='ferry_court', prefer='Ring', label='ferry to the Court')
        self.ensure_map('court_f1')
        b.settle()                                                   # court_crossing
        if not self.has('court_entered'):
            raise Fail('court_crossing did not set court_entered')
        b.mark('court_f1')

    def shop_hollow(self, wants, salves=0):
        """Vessa's smithy (armour, later the tier 4 list), then Fitch (Silver Salves once the Court is open)."""
        b = self.b
        self.ensure_map('nameless_hollow')
        b.through('door_smithy')
        self.ensure_map('nh_smithy')
        b.visit_shop('vessa', wants)
        b.through('smithy_exit')
        b.menu_optimize_all()
        if salves:
            self.ensure_map('nameless_hollow')
            b.through('door_shop')
            self.ensure_map('nh_shop')
            b.visit_shop('fitch', [('silver_salve', salves), ('hi_potion', 2)])
            b.through('shop_exit')
        self.ensure_map('nameless_hollow')

    def inn_if_hurt(self, frac=0.7):
        b = self.b
        vit = b.party_vitals()
        if not vit or min(v['hp'] / max(1, v['maxHp']) for v in vit) >= frac:
            return
        self.ensure_map('nameless_hollow')
        b.through('door_inn')
        self.ensure_map('nh_inn')
        b.rest_at_inn('wren')
        b.through('inn_exit')

    def fountain_quest(self):
        """The Fountain of Faces: Orla, Lena, Anwen (Tovin testified at the pier), then the fountain itself."""
        b = self.b
        if self.has('fountain_done'):
            return
        self.ensure_map('nameless_hollow')
        if not self.has('fountain_started'):
            self.talk('orla')
        if self.has('fountain_started') and not self.has('testimony_lena'):
            self.talk('lena')
        if self.has('fountain_started') and not self.has('testimony_anwen'):
            b.through('door_chapel')
            self.ensure_map('nh_chapel')
            self.talk('anwen')
            b.through('chapel_exit')
            self.ensure_map('nameless_hollow')
        b.interact(ent_id='fountain_obj', label='the fountain')
        if not self.has('fountain_done'):
            b.notes.append('the Fountain of Faces did not complete (witnesses: ' + ', '.join(
                f for f in ('fountain_started', 'testimony_lena', 'testimony_tovin', 'testimony_anwen') if self.has(f)) + ')')

    def court_f1(self):
        b = self.b
        if self.has('court_f1_done'):
            return
        f = b.settle()
        if f['map'] == 'nameless_hollow':
            b.interact(ent_id='ferry_court', prefer='Ring', label='ferry to the Court')
        self.ensure_map('court_f1')
        if not self.has('court_f1_arrived'):
            f = b.settle()
            if f['leader']['y'] > 23:
                b.through('great_door_in')
            b.walk_to([(19, 21), (20, 21)], label='arrival_trig')
            b.settle()
            if not self.has('court_f1_arrived'):
                raise Fail('court_f1_arrival did not run at the great door')
        # B: the teaching room. One mirror, one receptor, the gate to the east wing.
        if b.items().get('glass_key', 0) == 0 and not b.opened('court_f1', 'chest_key1'):
            f = b.settle()
            if f['leader']['y'] > 23:
                b.through('great_door_in')
            b.solve_beam('court_f1', 'rec_b', label='teaching room')
            f = b.settle()
            if (b.ent(f, 'rec_b') or {}).get('state') != 'lit':
                raise Fail('rec_b did not light')
            b.through('gate_b')
            b.hunt(limit=4, label='east wing')
            self.chest('chest_key1')
            self.chest('chest_d')
            if self.side and not b.opened('court_f1', 'chest_helm'):
                try:
                    if b.dash_break('pane_d', label='cracked pane'):
                        self.chest('chest_helm')
                    else:
                        b.notes.append('the cracked pane did not break')
                except Fail as e:
                    b.notes.append(f'Merewarden Helm skipped: {e}')
            b.maintain('east wing')
            b.through('notch_b')
        # C, N, E: the Silverglass Lock (three lenses, a block in the corridor)
        if not self.has('silverglass_lock_lit'):
            f = b.settle()
            in_west = f['leader']['x'] <= 11 and f['leader']['y'] <= 15      # C, or N's west end
            if not in_west and f['leader']['y'] >= 17:
                b.hunt(limit=2, label='antechamber')
                b.through('door_c')
            b.hunt(limit=3, label='lens hall')
            self.chest('chest_c')
            b.hunt(limit=2, label='north corridor')
            f = b.settle()
            blk = b.ent(f, 'block_n')
            if blk and blk['y'] == 13:
                try:
                    b.push_block('block_n', (blk['x'], 12), label='out of the beam (north)')
                except Fail:
                    b.push_block('block_n', (blk['x'], 14), label='out of the beam (south)')
            b.solve_beam('court_f1', 'rec_lock', label='silverglass lock')
            b.settle()
            if not self.has('silverglass_lock_lit'):
                raise Fail('the Silverglass Lock did not light')
        if not self.has('mira_memory_1'):
            b.walk_to([(16, 9), (17, 9)], label='mira_window_trig')
            b.settle()
        b.hunt(limit=2, label='stairs hall')
        self.chest('chest_e')
        b.maintain('end of F1')
        b.through('gate_lock')
        b.walk_to([(19, 2), (20, 2)], label='stairs_trig')
        b.settle()
        if not self.has('court_f1_done'):
            raise Fail('court_f1_stairs did not set court_f1_done')
        b.through('stairs_f2')
        self.ensure_map('court_f2')
        b.mark('court_f2')

    def court_f2(self):
        b = self.b
        if self.has('court_f2_done'):
            return
        self.ensure_map('court_f2')
        b.settle()                                                   # court_f2_arrival
        if not self.has('other_selves_defeated'):
            if not b.opened('court_f2', 'door_w') and (b.ent(b.settle(), 'door_w') or {}).get('state') != 'open':
                self.f2_galleries()
            self.f2_west_wing()
        b.walk_to([(9, 12)], label='arena stair')
        b.settle()
        if not self.has('court_f2_done'):
            raise Fail('court_f2_stairs did not set court_f2_done')
        b.mark('court_f3')

    def f2_galleries(self):
        b = self.b
        if self.side:
            if not self.has('portrait_child_seen'):
                b.interact(ent_id='portrait_child', label='portrait child')
            self.chest('chest_alcove')
        b.hunt(limit=2, label='north gallery')
        b.solve_beam('court_f2', 'bridge 25,5', skip=('m_e1', 'm_i1'), label='moat bridge')
        b.hunt(limit=4, label='east gallery')
        self.chest('chest_key2')
        if self.side:
            try:
                if not self.has('portrait_keeper_seen'):
                    b.interact(ent_id='portrait_keeper', label='portrait keeper')
                self.chest('chest_keeper')
            except Fail as e:
                b.notes.append(f'keeper alcove skipped: {e}')
        b.solve_beam('court_f2', 'bridge 28,12', skip=('m_i1',), label='bridge to the island')
        if not self.has('mira_memory_2'):
            b.walk_to([(22, 11), (22, 12), (22, 13)], label='pool_trig')
            b.settle()
        self.chest('chest_island')
        b.solve_beam('court_f2', 'bridge 21,15', label='bridge to the south gallery')
        b.walk_to([(21, 19), (21, 20), (21, 21)], fight=True, label='south gallery')
        b.hunt(limit=4, label='south gallery')
        if self.side:
            if not self.has('portrait_king_seen'):
                b.interact(ent_id='portrait_king', label='portrait king')
            if self.has('remembrance_open'):
                self.chest('chest_remembrance')
                f = b.settle()
                if b.ent(f, 'cache_ledger'):
                    b.interact(ent_id='cache_ledger', label='court ledger')
        b.maintain('south gallery')
        b.through('door_w')

    def f2_west_wing(self):
        b = self.b
        b.hunt(limit=2, label='west wing')
        b.maintain('west wing')
        f = b.settle()
        if b.ent(f, 'font_f2'):
            b.rest_at_font('font_f2', label='font F2')
            b.round_trip(2, 'F2 west wing')
            self.ensure_map('court_f2')
        if not self.has('vex_met'):
            b.walk_to([(2, 18), (3, 18)], label='vex_trig')
            b.settle()
            if not self.has('vex_met'):
                raise Fail('vex_mirror did not run')
        for attempt in range(5):
            if self.has('other_selves_defeated'):
                break
            if attempt:
                b.notes.append(f'Other Selves attempt {attempt + 1}')
                b.maintain('before the Other Selves again')
                f = b.settle()
                if b.ent(f, 'font_f2'):
                    b.rest_at_font('font_f2', label='font F2 again')
            b.mark('other_selves')
            b.walk_to([(7, y) for y in range(11, 17)], label='selves_trig')
            b.settle(max_s=900)
        if not self.has('other_selves_defeated'):
            raise Fail('the Other Selves did not fall in 5 attempts')

    def hollow_trip(self):
        """After the Other Selves: the mirror shortcut to the F1 landing, the ferry home, Vessa's tier 4 stock,
        Fitch's Silver Salves, Nico, the inn; then the ferry and the F1 mirror back down to F2."""
        b = self.b
        if not self.side or self.has('court_f3_arrived') or not self.has('court_f2_done'):
            return
        f = b.settle()
        if f['map'] == 'court_f2':
            b.through('mirror_f2_short')
        self.ensure_map('court_f1')
        b.interact(ent_id='ferry_home', prefer='Ring', label='ferry home')
        self.ensure_map('nameless_hollow')
        b.mark('hollow_trip')
        self.shop_hollow(self.TIER4, salves=3)
        if not self.has('nico_crowns_started'):
            self.talk('nico')
        if not self.has('fountain_done'):
            self.fountain_quest()
        self.inn_if_hurt(0.95)
        self.ensure_map('nameless_hollow')
        b.interact(ent_id='ferry_court', prefer='Ring', label='ferry back')
        self.ensure_map('court_f1')
        b.through('mirror_f1_f2')
        self.ensure_map('court_f2')

    def court_f3(self):
        b = self.b
        if self.has('vow_door_open'):
            return
        f = b.settle()
        if f['map'] == 'court_f2':
            b.through('stairs_f3')
        self.ensure_map('court_f3')
        b.settle()                                                   # court_f3_arrival
        if not self.has('court_f3_arrived'):
            raise Fail('court_f3_arrival did not run')
        # West: Belonging, in the dark
        if not self.has('vow_belonging'):
            b.hunt(limit=2, label='belonging wing')
            b.solve_beam('court_f3', 'rec_belonging', label='belonging')
            b.settle()
            if not self.has('vow_belonging'):
                raise Fail('rec_belonging did not latch')
        if self.side:
            self.chest('chest_crown')
        # East: Mercy, the bridge over the chasm
        if not self.has('vow_mercy'):
            b.hunt(limit=2, label='mercy wing')
            b.solve_beam('court_f3', 'rec_mercy', label='mercy')
            b.settle()
            if not self.has('vow_mercy'):
                raise Fail('rec_mercy did not latch')
            b.hunt(limit=2, label='mercy wing north')
            if self.side:
                self.chest('chest_e')
        b.maintain('after mercy')
        # South: Courage, Bram's Shove
        if not self.has('vow_courage'):
            f = b.settle()
            if f['leader']['y'] < 24:
                b.through('notch_south')
            b.hunt(limit=3, label='courage wing')
            b.solve_beam('court_f3', 'rec_courage', label='courage')
            b.settle()
            if not self.has('vow_courage'):
                raise Fail('rec_courage did not latch')
            if self.side and not b.opened('court_f3', 'chest_hollowcrown'):
                try:
                    b.walk_to([(30, 28)], label='courage east end')
                    b.reveal_near([(31, 28), (32, 28)], label='courage ink bridge')
                    self.chest('chest_hollowcrown')
                    self.sign('court_note')
                except Fail as e:
                    b.notes.append(f'Hollowcrown cache skipped: {e}')
            f = b.settle()
            if f['leader']['y'] >= 24:
                b.through('south_door')
        b.hunt(limit=4, label='hub sweep')
        b.maintain('before the vow door')
        b.walk_to([(21, 15), (22, 15)], label='vow_door_trig')
        b.settle()
        if not self.has('vow_door_open'):
            raise Fail('vow_door did not run')
        b.mark('antechamber')

    def antechamber(self):
        b = self.b
        if self.has('nameless_king_defeated'):
            return
        f = b.settle()
        if f['map'] == 'court_f3' and f['leader']['y'] > 12:
            b.through('door_vow')
        self.ensure_map('court_f3')
        if self.side and not self.has('black_feather_found'):
            b.interact(ent_id='feather_obj', label='black feather')
        self.chest('chest_ta')
        b.maintain('antechamber')
        b.rest_at_font('font_f3', label='font F3')
        b.round_trip(3, 'before the King')
        f = self.ensure_map('court_f3')
        # EPISODE2_PLAN 11: a save written mid-dungeon reloads with latched receptors and opened doors intact
        lit = [r for r in ('rec_belonging', 'rec_mercy', 'rec_courage') if (b.ent(f, r) or {}).get('state') == 'lit']
        if len(lit) != 3 or (b.ent(f, 'door_vow') or {}).get('state') != 'open':
            raise Fail(f'after the reload the vows lit {lit} and the vow door is {(b.ent(f, "door_vow") or {}).get("state")}')
        b.notes.append('reload at the antechamber: three latched receptors lit, the vow door open')

    def king(self):
        b = self.b
        if self.has('aurel_named'):
            return
        for attempt in range(5):
            f = b.settle()
            if f['map'] == 'court_f3':
                if f['leader']['y'] > 12:
                    b.through('door_vow')
                b.through('throne_door')
            self.ensure_map('court_throne')
            if attempt == 0:
                b.mark('nameless_king')
            b.walk_to([(x, 15) for x in range(4, 20)], label='king_trig')
            b.settle(max_s=1200)                                     # the scene, the fight, king_after
            if self.has('aurel_named'):
                break
            b.notes.append(f'Nameless King attempt {attempt + 1} (Lv {self.level()})')
            f = b.settle()
            if f['map'] == 'court_throne':
                b.through('throne_exit')
            self.ensure_map('court_f3')
            b.rest_at_font('font_f3', label='font before the King again')
            b.maintain('before the King again')
        if not self.has('aurel_named'):
            raise Fail('the Nameless King did not fall in 5 attempts')
        b.mark('hollowmere')

    def ending(self):
        b = self.b
        if self.has('ep2_complete'):
            return
        f = b.settle()
        if f['map'] == 'court_throne':
            b.through('mirror_exit', exact=False)                    # hollowmere_restored walks the party off the landing
        b.settle(max_s=900)                                          # hollowmere_restored, ep2_ending, the credits
        if not self.has('ep2_complete'):
            raise Fail(f'ep2_complete was not set (on {b.settle()["map"]})')
        for _ in range(400):
            sc = b.handle()
            fs = b.field() or {}
            if sc == 'field' and fs.get('map') == 'nh_inn' and not fs.get('locked'):
                break
        f = b.settle()
        if f['map'] != 'nh_inn':
            raise Fail(f'after the Episode 2 credits the party woke on {f["map"]}, not nh_inn')
        if not (b.game() or {}).get('counters', {}).get('credits2_rolled'):
            raise Fail('credits2_rolled was not counted')
        b.mark('ep2_credits_done')

    def epilogue2(self):
        """After the credits: Elian's letter, Nico's crown, the chapel mirror to Willowmere, Mael and Tess."""
        b = self.b
        if not self.side or not self.has('ep2_complete'):
            return
        self.ensure_map('nh_inn')
        f = b.settle()
        if f['leader']['x'] >= 13:
            b.through('inn_down')                                    # the guest room is up the inn's stair
        self.talk('wren')
        b.through('inn_exit')
        self.ensure_map('nameless_hollow')
        if not self.has('letter_answer_started'):
            b.through('door_hall')
            self.talk('elian')
            b.through('hall_exit')
            self.ensure_map('nameless_hollow')
        if self.has('paper_crown_found') and not self.has('nico_crowns_done'):
            self.talk('nico')
        self.talk('aurel')
        b.through('door_chapel')
        self.ensure_map('nh_chapel')
        b.through('mirror_nh_wm')
        self.ensure_map('chapel')
        b.through('chapel_exit')
        self.ensure_map('willowmere')
        if self.has('letter_answer_started') and not self.has('letter_answer_done'):
            self.talk('mael')
        if self.has('satchel_found') and not self.has('last_route_done'):
            self.talk('tess')
        b.mark('ep2_epilogue')

    def run(self):
        b = self.b
        b.mark('boot')
        phases = [('ep2_start', self.title_start), ('ep2_morning', self.morning), ('ep2_farewells', self.farewells),
                  ('crossing', self.crossing), ('fading_road', self.east_road), ('nameless_hollow', self.hollow),
                  ('court_f1', self.court_f1), ('court_f2', self.court_f2), ('hollow_trip', self.hollow_trip),
                  ('court_f3', self.court_f3), ('antechamber', self.antechamber), ('king', self.king),
                  ('hollowmere', self.ending), ('epilogue2', self.epilogue2)]
        for step_id, fn in phases:
            print(f'-- {step_id}', flush=True)
            fn()
            if b.resume and step_id == 'ep2_start':
                b.resume = None
                self.ensure_any()
            b.check_errors()
            if self.until == step_id:
                print(f'stopping after {step_id} (--until)', flush=True)
                return


# ================================================================================================ wrong order
def wrong_order(bot):
    """For every prefix of the main flags: a fresh game with those flags, every map, every NPC and sign."""
    b = bot
    report = []
    for n in range(0, len(MAIN_FLAGS)):
        flags = {f: True for f in MAIN_FLAGS[:n]}
        if 'ep1_complete' in flags:
            continue    # that rolls the credits on every field entry
        party = ['mira'] if flags.get('mira_joined') else []
        if flags.get('bram_joined'):
            party.append('bram')
        print(f'-- wrong-order pass {n}: {MAIN_FLAGS[n - 1] if n else "no flags"} ({len(flags)} flags)', flush=True)
        for map_id in MAP_IDS:
            if map_id == 'willowmere' and flags.get('archivore_defeated'):
                continue    # the return scene plays out and ends the episode
            b.js(f"LQ_DEBUG.newGame({json.dumps(b.hero)}, {{ scene: 'none', party: {json.dumps(party)}, level: {2 + n}, gold: 200, flags: {json.dumps(flags)}, items: {{ potion: 3, lantern_of_recall: {1 if flags.get('lantern_get') else 0} }} }})")
            b.call('warp', map_id, None, None, 'down', ms=30000)
            b.last_map = None
            try:
                f = b.settle(safe=True, max_s=180)
            except Softlock as e:
                report.append(f'{map_id} @{n}: softlock on entry ({e})')
                continue
            # remove the visible enemies so the sweep never turns into a fight
            b.js("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); if (f) for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); })()")
            targets = [(a['id'], 'actor') for a in f['actors'] if a['kind'] == 'npc'] + [(e['id'], 'ent') for e in f['ents'] if e['type'] in ('sign', 'book', 'object') and not e.get('hidden')]
            for tid, kind in targets:
                before = len(b.dialog_log)
                try:
                    if kind == 'actor':
                        b.interact(actor_id=tid, safe=True, label=f'wrong-order {map_id}')
                    else:
                        b.interact(ent_id=tid, safe=True, label=f'wrong-order {map_id}')
                except Fail as e:
                    report.append(f'{map_id} @{n} {tid}: {str(e)[:160]}')
                    try:
                        b.settle(safe=True, max_s=60)
                    except Fail:
                        pass
                    continue
                if len(b.dialog_log) == before:
                    report.append(f'{map_id} @{n} {tid}: no dialogue opened')
                for line in b.dialog_log[before:]:
                    if '(' in line and line.rstrip().endswith(')') and ': (' in line and line.count(' ') < 6:
                        report.append(f'{map_id} @{n} {tid}: placeholder text {line}')
                if (b.field() or {}).get('map') != map_id:
                    break
            b.check_errors()
    return report


# ================================================================================================ main
def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop', choices=list(DEVICES))
    ap.add_argument('--speed', type=float, default=2)
    ap.add_argument('--keys', action='store_true', help='real keyboard events instead of injected actions')
    ap.add_argument('--name', default='Arden')
    ap.add_argument('--until', default=None)
    ap.add_argument('--no-side', action='store_true')
    ap.add_argument('--hollow', action='store_true', help='W13: also play Whisperwood Hollow after the Lantern (Episode 1; off by default)')
    ap.add_argument('--wrong-order', action='store_true')
    ap.add_argument('--headed', action='store_true')
    ap.add_argument('--resume', default=None, help='a <device>-last-game.json from an earlier run: seeded as record 1 and loaded through Continue')
    ap.add_argument('--episode', type=int, default=1, choices=[1, 2])
    ap.add_argument('--start', default='save', choices=['save', 'new'],
                    help='Episode 2: load the Episode 1 credits save (save) or use the title\'s Episode 2 entry (new)')
    a = ap.parse_args(argv)
    shots.watchdog(3 * 3600)
    tag, query, resume = ('-wo' if a.wrong_order else '-hollow' if a.hollow and a.episode == 1 else ''), '', a.resume
    if a.episode == 2:
        tag = '-ep2' + ('-new' if a.start == 'new' and not a.resume else '')
        if a.start == 'new' and not a.resume:
            query = '&ep=2'                   # the title offers Episode 2 without a finished save (title.js ep2Offer)
        elif not resume:
            resume = str(OUT / f'{a.device}-ep1-credits-save.json')
            if not pathlib.Path(resume).exists():
                print(f'no Episode 1 credits save at {resume}: run the Episode 1 autoplay first, or use --start new')
                return 2
    bot = Bot(a.device, speed=a.speed, keys=a.keys, name=a.name, headless=not a.headed, resume=resume, tag=tag, query=query)
    status, detail, wrong = 'ok', '', []
    try:
        bot.open()
        if a.wrong_order:
            wrong = wrong_order(bot)
        elif a.episode == 2:
            Episode2(bot, side=not a.no_side, until=a.until, start=a.start).run()
        else:
            Episode(bot, side=not a.no_side, until=a.until, hollow=a.hollow).run()
        bot.check_errors()
    except Fail as e:
        status, detail = 'FAIL', str(e)
        try:
            bot.shot('fail')
        except Exception:
            pass
    except Exception as e:  # crash: still write the report
        status, detail = 'CRASH', f'{type(e).__name__}: {e}'
        try:
            bot.shot('crash')
        except Exception:
            pass
    finally:
        try:
            eng = bot.js('LQ_DEBUG.errors().map(e => e.msg)') or []
        except Exception:
            eng = []
        report = {
            'device': bot.device, 'status': status, 'detail': detail, 'speed': a.speed, 'keys': a.keys,
            'timing': bot.timing, 'battles': bot.battles, 'gameovers': bot.gameovers, 'notes': bot.notes,
            'errors': bot.errors + [f'engine: {m}' for m in eng], 'warnings': sorted(set(bot.warnings)), 'wrongOrder': wrong,
            'dialogLines': len(bot.dialog_log), 'wall_s': round(time.time() - bot.t0, 1),
        }
        (OUT / f'{bot.device}-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        try:
            g = bot.game()
            if g:
                (OUT / f'{bot.device}-last-game.json').write_text(json.dumps(g), encoding='utf-8')
        except Exception:
            pass
        bot.close()
    print()
    print('timing (game minutes per segment):')
    prev = None
    for t in bot.timing:
        if prev:
            print(f'  {prev["step"]:<16} -> {t["step"]:<16} {(t["game_s"] - prev["game_s"]) / 60:6.1f} min   (wall {(t["wall_s"] - prev["wall_s"]) / 60:5.1f})')
        prev = t
    print(f'battles: {len(bot.battles)}  game overs: {bot.gameovers}  dialogue lines: {len(bot.dialog_log)}')
    for n in bot.notes:
        print('  note:', n)
    if wrong:
        print('wrong-order findings:')
        for w in wrong:
            print('  ', w)
    if bot.warnings:
        print('console warnings:')
        for w in sorted(set(bot.warnings))[:40]:
            print('  ', w[:200])
    print(f'{status} {detail}')
    return 0 if status == 'ok' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
