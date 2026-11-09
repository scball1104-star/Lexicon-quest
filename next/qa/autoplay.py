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
    python next/qa/autoplay.py --tier 1                          Fine Print: Episode 1 from a carried Episode 2 record
                                                                 (the title's row; <device>-tier1-* files; docs/TIER.md)

Episode 4 (E4-integrate, EPISODE4_PLAN 12): the same two starts from <device>-ep3-credits-save.json (built from the last finished
Episode 3 game): Continue on it in record 1, or the title's "Episode 4: new party" with it in slot 0. Tide locks follow the map
agents' solutions (docs/MAPS_EP4_A.md, MAPS_EP4_B.md) on the field's live water. Writes <device>-ep4-* files.

    python next/qa/autoplay.py --episode 4 [--start new] [--device phone]

Episode 5 (E5-integrate, EPISODE5_PLAN 12): the same two starts from <device>-ep4-credits-save.json (built from the last finished
Episode 4 game): Continue on it in record 1, or the title's "Episode 5: new party" with it in slot 0. Sun and shade follow the map
agents' solutions (docs/MAPS_EP5_A.md, MAPS_EP5_B.md): dials set by hour name, stones and lamps Shoved, on the field's live sand.
The Sand Oracle's prophecies are logged with how each ended. Writes <device>-ep5-* files.

    python next/qa/autoplay.py --episode 5 [--start new] [--device phone]

Output (next/qa/out/autoplay/): <device>-NNNN-<label>.png every 30 s and on every map change,
<device>-dialog.log (every dialogue line), <device>-report.json (timing table, battles, warnings).
Episode 2 runs write <device>-ep2-* files instead. Exit code 1 on any console error, page error, engine error,
crash, or softlock (no progress for 90 s).
"""
import argparse
import collections
import json
import os
import pathlib
import re
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
MAIN_FLAGS = ['cold_open_done', 'intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
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
      opens: e.state === 'broken' && e.ev.opens ? e.ev.opens.filter(([x, y]) => f.map.collisionAt(x, y) === 'none') : null,
      home: e.type === 'standstone' || e.type === 'lampcart' ? [e.ev.x, e.ev.y] : null });
  }
  const actors = f.actors.map(a => ({ id: a.id, kind: a.kind, x: a.tx, y: a.ty, solid: a.solid, dir: a.dir, moving: a.moving,
    fighting: !!(a.data && a.data.fighting), mode: a.brain && a.brain.mode || null }));
  // E2: glass bridges, lit (walkable) or dim (a pit) right now
  const bridges = f.glass && f.glass.bridges ? [...f.glass.bridges.values()].map(b => [b.x, b.y, !!b.lit]) : [];
  // E3: crusted slag cells (walkable, whatever the static grid says) as [x, y]
  const crust = f.quench && f.quench.crust ? [...f.quench.crust].map(i => [i % f.map.w, Math.floor(i / f.map.w)]) : [];
  // E4: the tide's live floor: every basin cell and every cell it overrides, with the collision it has now
  let tide = null;
  const T = f.tide;
  if (T && T.active && T.m) {
    const W = f.map.w, cells = [], seen = new Set();
    const add = (i) => { if (seen.has(i)) return; seen.add(i); const x = i % W, y = Math.floor(i / W); cells.push([x, y, f.map.collisionAt(x, y)]); };
    for (let i = 0; i < T.m.basinAt.length; i++) if (T.m.basinAt[i] >= 0) add(i);
    for (const i of T.over.keys()) add(i);
    const starts = {};
    for (const id of T.m.ids) starts[id] = T.m.basins[id].start;
    tide = { levels: { ...T.levels }, starts, wheels: Object.fromEntries(T.m.wheels.map(w => [w.id, w.b])), cells,
      washed: [...T.washed].sort(), latched: [...T.latched].sort(), busy: !!T.busy || !!T.anim };
  }
  // E5: sun and shade: every sand cell with the collision it has now (running sand is water), the hour and the latched plates
  let shade = null;
  const S = f.shade;
  if (S && S.active && S.m && S.mapRef === f.map) {
    const W = f.map.w, cells = [];
    for (let i = 0; i < S.m.N; i++) if (S.m.sand[i]) { const x = i % W, y = Math.floor(i / W); cells.push([x, y, f.map.collisionAt(x, y)]); }
    shade = { hour: S.hour, start: S.m.hour, cells, latched: [...S.latched].sort(), busy: !!S.busy || !!S.anim || !!S.revealing };
  }
  return { map: f.map.id, frame: f.frame, leader: L ? { x: L.tx, y: L.ty, dir: L.dir, moving: L.moving } : null,
    locked: f.inputLocked, warp: !!f.pendingWarp, loading: !!f.loading, running: f.cutscene ? f.cutscene.running : null,
    lantern: f.lantern, ents, actors, bridges, crust, tide, shade, dead: !!f.dead, transition: !!E.transition, prompt: f.prompt ? f.prompt.ent.id : null,
    busy: !!(f.abilities && f.abilities.busy) };
}"""

SCENE_LIST_JS = "(() => { const s = LQ_ENGINE.scene; const l = s && s.list; return l ? l.items.map(i => ({ id: i.id, price: i.price, disabled: !!i.disabled })) : null; })()"


class Fail(Exception):
    pass


class Softlock(Fail):
    pass


# ================================================================================================ driver
class Bot:
    def __init__(self, device='desktop', speed=2, keys=False, name='Arden', headless=True, resume=None, tag='', query='', x1=False, seed_slot=1, ep3=None):
        from playwright.sync_api import sync_playwright
        self.x1 = x1                        # X1 (The Wider Valley) switched on in a local copy: live.js served with X1_LIVE true, grids built in the ON state
        os.environ['LQ_X1_LIVE'] = '1' if x1 else '0'      # the page is served live.js forced on or off, whatever the file on disk says
        if ep3 is not None:
            os.environ['LQ_EP3_LIVE'] = '1' if ep3 else '0'  # Episode 3: episodes.js served with EP3_LIVE forced (a local copy of the switch)
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
            seed = f'localStorage.setItem("lq-next-slot-{int(seed_slot)}", ' + json.dumps(json.dumps(env)) + ');'
            name = data.get('heroName') or name
        self.resume = resume
        self.hero = name
        # once per tab: a quit to the title is in-app, but a reload must not wipe what the run saved (the slot checks read it)
        self.page.add_init_script('(() => { try { if (sessionStorage.getItem("lq-bot-seeded")) return; sessionStorage.setItem("lq-bot-seeded", "1"); localStorage.clear(); ' + seed + ' } catch (e) {} })()')
        self.errors, self.warnings, self.console = [], [], []
        self.page.on('console', self._on_console)
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        self.grids = {}
        self.gated = {}         # map id -> the flags its gated overlays depend on (autoplay_grid.mjs)
        self.revealed = {}      # map id -> cells a Lantern reveal made floor (the static grid still has them as pits)
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
        try:
            self.dialog_file.write(f'## mark {step} {round(g.get("playtime", 0), 1)}' + chr(10))     # story_time.py: pages between two marks
        except Exception:
            pass
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
            if f and not f['locked'] and not f['warp'] and not f['loading'] and not f['running'] and not f['transition'] and f['leader'] and not f['leader']['moving'] and f['frame'] >= 14                     and not (f.get('tide') or {}).get('busy') and not (f.get('shade') or {}).get('busy'):
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
            env = dict(os.environ)
            if self.x1:
                # the five hub maps are gated by x1On() at module level: show them in the ON state (qa/maps/x1_baseline/force_on.mjs)
                args[1:1] = ['--import', (NEXT / 'qa' / 'maps' / 'x1_baseline' / 'force_on.mjs').as_uri()]
                env['LQ_X1_ON'] = 'all'
            r = subprocess.run(args, capture_output=True, text=True, timeout=60, cwd=str(NEXT), env=env)
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
                elif e['type'] in ('door', 'gate', 'locked_door') or e.get('doorAt'):
                    unblocked.add(c)        # a doorway cut into a wall face (or E5's gangway prop): the static grid calls it solid
            if e.get('opens'):
                unblocked.update(tuple(c) for c in e['opens'])      # W9: a broken crack carved these cells to floor
            if e['type'] == 'door' or (e['type'] in ('gate', 'locked_door') and e['state'] == 'open' and e['to']) or e['type'] == 'ferry':
                for c in cells:
                    avoid.add(c)
            if e['type'] == 'pit' and not allow_pits:
                for c in cells:
                    # E5-fixes A8: a pit under a revealed ink bridge (the Starwright Bow's keeper_marks) no longer drops you
                    if c in self.revealed.get(f['map'], ()) or opened.get(f'{f["map"]}:ink:{c[0]},{c[1]}'):
                        continue
                    avoid.add(c)            # E3: the fan shaft on F2 drops to F1
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
        crust = {(x, y) for x, y in f.get('crust') or []}
        live = {(x, y): c for x, y, c in ((f.get('tide') or {}).get('cells') or [])}     # E4: water, floats, seals right now
        live.update({(x, y): c for x, y, c in ((f.get('shade') or {}).get('cells') or [])})   # E5: running sand is water right now
        revealed = self.revealed.get(f['map'], set())       # E5-fixes A8: a faint bridge the Lantern lit (the Starwright Bow's)

        def passable(x, y, d):
            if not (0 <= x < W and 0 <= y < H):
                return False
            if (x, y) in blocked and (x, y) != goal_t:
                return False
            if (x, y) in avoid and (x, y) != goal_t:
                return False
            if (x, y) in unblocked:
                return True
            if (x, y) in lit_bridges or (x, y) in crust or (x, y) in revealed:
                return True
            if (x, y) in dim_bridges:
                return allow_pits or (x, y) == goal_t
            c = live.get((x, y)) or code[y][x]
            if faint[y][x]:
                return bool(opened.get(f'{f["map"]}:ink:{x},{y}'))
            if c == 'none':
                return True
            if c == 'pit':
                # a revealed ink bridge over a pit (saved as opened ink) is floor, whatever the static grid says
                return allow_pits or (x, y) == goal_t or bool(opened.get(f'{f["map"]}:ink:{x},{y}'))
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
        for _ in range(3):
            if passable(ox, oy, o):
                break
            # a wanderer (an enemy, an NPC) can stand on the cell behind for a moment: give it time to move on
            self.frames(40)
            f = self.field()
            passable, _ = self.model(f)
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

    def interact(self, ent_id=None, actor_id=None, prefer=None, safe=False, label='', _retry=True):
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
            if _retry:
                # an enemy standing in the one corridor that leads to it: fight it, then look again
                self.hunt(limit=4, label='clear the way')
                return self.interact(ent_id=ent_id, actor_id=actor_id, prefer=prefer, safe=safe, label=label, _retry=False)
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
        if _retry:
            self.hunt(limit=4, label='clear the way')
            return self.interact(ent_id=ent_id, actor_id=actor_id, prefer=prefer, safe=safe, label=label, _retry=False)
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
        spare = [tuple(c) for c in e['cells'][1:]]        # a door more than one cell wide (a 2 x 2 stair foot): any cell fires it
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
        try:
            self.walk_to([cell], label=label or ent_id)
        except Fail:
            for alt in spare:
                try:
                    self.walk_to([alt], label=label or ent_id)
                    break
                except Fail:
                    continue
            else:
                raise
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
                # rebuild the walk model for these cells from the live map: a revealed bridge over a pit is floor now, though
                # the static grid (and no ink flag, on some maps) still calls it a pit (PLAYTEST_REVIEW_7 item 5)
                live = self.page.evaluate("(cells) => cells.filter(([x, y]) => LQ_ENGINE.scene.map.idsAt(x, y).some(id => /bridge.*_revealed$/.test(id)))", [list(c) for c in cells])
                self.revealed.setdefault(f['map'], set()).update((x, y) for x, y in live)
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
        self.climb_tower()

    def climb_tower(self):
        """From the hand-off into the cold open to waking at home (New Game and, with --tier 1, Fine Print's Begin)."""
        b = self.b
        # H1: the prologue scene is only a hand-off now. The field opens on the bell tower stair (the cold open,
        # "The Thirteenth Toll"): twelve toll steps, each a step trigger that holds the hero while the bell rings
        # and the name shows, then the thirteenth at the top, black, one card, and the engine carries the game home.
        on_tower = "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return LQ_DEBUG.scene() === 'field' && !!(f && f.map && f.map.id === 'bell_tower'); })()"
        b.page.wait_for_function(on_tower, timeout=30000, polling=30)
        f = b.settle()
        if (b.game() or {}).get('heroName') != b.hero:
            raise Fail(f'hero name is {(b.game() or {}).get("heroName")!r}, typed {b.hero!r}')
        b.mark('cold_open')                                      # control: the hero can move
        b.shot('cold_open')
        steps = {e['script']: tuple(e['cells'][0]) for e in f['ents'] if e['type'] == 'trigger' and e['script']}
        for n in range(1, 13):
            cell = steps.get(f'toll_{n}')
            if not cell:
                raise Fail(f'bell_tower has no trigger for toll_{n}')
            b.walk_to([cell], label=f'toll_{n}')
            b.settle()                                           # the toll scene holds the hero while the bell rings
            if not self.has(f'toll_{n}'):
                raise Fail(f'toll_{n} did not fire on its step {cell}')
            if n == 1:
                b.mark('first_toll')
            if n == 7:
                b.shot('seventh_toll')
        top = steps.get('thirteenth_toll')
        if not top:
            raise Fail('bell_tower has no thirteenth_toll trigger')
        # the step onto the top cell runs thirteenth_toll; walk_to's own settle plays through the silence, the black
        # and the card (handle skips a title card with confirm), and the engine's hand-off lands the party at home
        b.walk_to([top], label='thirteenth_toll')
        at_home = "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return LQ_DEBUG.scene() === 'field' && !!(f && f.map && f.map.id === 'hero_home'); })()"
        for _ in range(400):
            if b.js(at_home):
                break
            b.handle()
        else:
            raise Fail('the cold open never handed the game to hero_home')
        if not self.has('cold_open_done'):
            raise Fail('thirteenth_toll did not set cold_open_done')
        b.settle()                                               # wake_up runs on entry
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
        # H1: the fading sign's choice is remembered: the desktop run tells Oren the truth, the phone run the kind lie
        oren = ["can't remember"] if b.device.startswith('phone') else ["Oren's Ovens"]
        b.settle(prefer=oren)                                   # fading_sign fires on the landing tile
        if not self.has('saw_fading_sign'):
            raise Fail('fading_sign did not run on the doorstep')
        if not (self.has('oren_truth') or self.has('oren_lie')):
            raise Fail('fading_sign did not remember the Oren choice')
        b.mark('oren_choice')
        # H1: the yard slime blocks the lane to Lantern Square (a one-column cut at x 12); the generic battle
        # handler wins it with Auto battle, then Oren's line, then yard_fight_done
        b.walk_to([(12, 16)], label='yard lane')
        b.settle()
        if not self.has('yard_fight_done'):
            raise Fail('yard_slime did not set yard_fight_done')
        b.mark('yard_fight')
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
        west = [c for c in faint if c[0] < 12 and c[1] >= 10]      # X1: the Reader's Alcove bridge (10..12, 7) is not the route; the regular route skips it
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


# ================================================================================================ Fine Print (tier_1)
# H7-hard-road (docs/TIER.md): `--tier 1` plays Episode 1 on Fine Print from a carried record. The record is the Episode 3 quick
# start's party (LQ_DEBUG.newGameEp3: Lv 13, the Episode 2 finish kit, ep2_complete), written to record 2 as a finished save; the
# title's Fine Print row carries it (record ask, then Begin) into a run that saves to the autosave, the cold open plays, Mira and
# Bram join from reserve at their own scenes, and the rest is the regular Episode 1 route on the tier's foes. Writes
# <device>-tier1-* files; the report's notes give the party's level at each main step and the legendaries held at the end.
TIER_RECORD_SLOT = 2
TIER_SEED_JS = """(name) => {
  LQ_DEBUG.newGameEp3(name, { slot: %d, scene: 'none' });
  const g = LQ_ENGINE.game;
  const meta = { name: g.heroName, level: g.party[0].level, map: g.map, playtime: 21600, chapter: g.chapter, gold: g.gold, party: g.party.map((m) => m.id) };
  const ok = LQ_ENGINE.save.save(%d, JSON.parse(JSON.stringify(g)), meta);
  LQ_ENGINE.game = null;
  LQ_ENGINE.reset('title');
  return ok;
}""" % (TIER_RECORD_SLOT, TIER_RECORD_SLOT)


class TierEpisode(Episode):
    def title_to_bed(self):
        b = self.b
        if b.scene() != 'title':
            return
        if not b.js(f'({TIER_SEED_JS})({json.dumps(b.hero)})'):
            raise Fail('could not write the carried record')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && ((LQ_DEBUG.state().sceneState || {}).items || []).includes('tier')", timeout=30000, polling=50)
        b.frames(10)
        b.shot('tier_title')
        ss = b.scene_state()['ss'] or {}
        b.pick(ss['items'].index('tier'), ss.get('index') or 0)            # Fine Print
        b.page.wait_for_function("LQ_DEBUG.scene() === 'finePrint'", timeout=10000, polling=20)
        b.frames(8)
        st = b.scene_state()['ss'] or {}
        if st.get('step') != 'pick' or TIER_RECORD_SLOT not in (st.get('ids') or []):
            raise Fail(f'the Fine Print ask does not offer record {TIER_RECORD_SLOT}: {st}')
        b.shot('tier_ask')
        b.pick(st['ids'].index(TIER_RECORD_SLOT), st.get('index') or 0)
        b.frames(8)
        st = b.scene_state()['ss'] or {}
        if st.get('step') != 'terms' or 'begin' not in (st.get('ids') or []):
            raise Fail(f'the Fine Print terms do not offer Begin: {st}')
        b.shot('tier_terms')
        b.pick(st['ids'].index('begin'), st.get('index') or 0)
        g = None
        for _ in range(200):
            g = b.game()
            if g and g.get('tier') == 1:
                break
            b.frames(6)
        if not g or g.get('tier') != 1 or not (g.get('flags') or {}).get('tier_1'):
            raise Fail('Begin did not start a tier_1 game')
        if [m['id'] for m in g['party']] != ['hero'] or [m['id'] for m in g['reserve']] != ['mira', 'bram']:
            raise Fail(f'the carry: party {[m["id"] for m in g["party"]]}, reserve {[m["id"] for m in g["reserve"]]}')
        b.notes.append(f'tier: carried {b.hero} Lv {g["party"][0]["level"]} with Mira Lv {g["reserve"][0]["level"]} and Bram Lv {g["reserve"][1]["level"]} '
                       f'in reserve, {g["gold"]} gold, run saves to slot {g.get("autosaveSlot")}')
        self.climb_tower()

    def run(self):
        b = self.b
        seen = set()
        orig = b.mark

        def mark(step):
            orig(step)
            g = b.game() or {}
            party = g.get('party') or []
            if party and step not in seen:
                seen.add(step)
                b.notes.append(f'tier level at {step}: ' + ', '.join(f'{m["id"]} {m["level"]}' for m in party))
        b.mark = mark
        try:
            super().run()
        finally:
            b.mark = orig
        g = b.game() or {}
        held = [it for m in (g.get('party') or []) + (g.get('reserve') or []) for it in (m.get('equip') or {}).values() if isinstance(it, dict)]
        held += list(g.get('gear') or [])
        legend = sorted({it.get('base') for it in held if it.get('rarity') == 'legendary' and it.get('base')})
        fl = g.get('flags') or {}
        b.notes.append(f'tier end: tier_1={bool(fl.get("tier_1"))} ep1_complete={bool(fl.get("ep1_complete"))}, {len(b.battles)} battles, '
                       f'{b.gameovers} game overs, legendaries held: {", ".join(legend) or "none"}')


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


# ================================================================================================ Episode 3
EP3_MAIN_FLAGS = ['ep3_started', 'sand_gate_open', 'sand_road_arrived', 'sand_first_fight_done', 'pk_arrived', 'met_veyra', 'met_ilya',
                  'foundry_entered', 'foundry_f1_done', 'bellows_specter_defeated', 'foundry_f2_done', 'vex_furnace_met', 'bell_gate_open',
                  'cinder_warden_defeated', 'garrick_named', 'pk_restored', 'ep3_complete']
EP3_SLOTS = (0, 1, 2, 3)
SLOT_JS = "(n) => { try { return localStorage.getItem('lq-next-slot-' + n); } catch (e) { return null; } }"


def ep3_fixture(device):
    """The Episode 2 credits save (EPISODE3_PLAN 10.7): <device>-ep2-credits-save.json when an Episode 2 run left one, else built
    from the newest finished Episode 2 game (<device>-ep2-last-game.json, else the desktop one) by putting the party where the
    Episode 2 credits wake it: nh_inn, inn_bed, facing down. Returns the path."""
    path = OUT / f'{device}-ep2-credits-save.json'
    if path.exists():
        return path
    for src in (OUT / f'{device}-ep2-last-game.json', OUT / 'desktop-ep2-last-game.json'):
        if src.exists():
            g = json.loads(src.read_text(encoding='utf-8'))
            if not (g.get('flags') or {}).get('ep2_complete') or not (g.get('counters') or {}).get('credits2_rolled'):
                continue
            g['map'] = 'nh_inn'
            g['pos'] = {'x': 17, 'y': 7, 'dir': 'down'}
            g['autosaveSlot'] = 0
            path.write_text(json.dumps(g), encoding='utf-8')
            return path
    raise Fail('no finished Episode 2 game to build the credits save from: run python qa/autoplay.py --episode 2 first')


class Episode3(Episode):
    """Episode 3, "The Forge of Ash" (docs/story/EPISODE3.md, STAGING_EP3.md, MAPS.md section 8): from the morning after the
    Episode 2 credits (Continue on the credits save, or the title's Episode 3 quick start) to the Episode 3 credits in the
    Coal Lantern Inn. Quench puzzles use the maps' own solutions (tools/maps/mapcheck.mjs quench, Bot.solve_quench); fights are
    Auto at 2x, every visible enemy on the way. The quick start is checked to write no save slot it does not own."""

    TIER5 = [('ashsteel_helm', 1), ('cinder_boots', 1)]          # the simulator's foundry_f1 row; gold is kept for tier 6
    TIER6 = [('tempered_sword', 1), ('forge_axe', 1), ('heartforge_pike', 1), ('founders_rod', 1), ('bellwire_bow', 1),
             ('tempered_mail', 2), ('ashweave_robe', 1), ('forge_helm', 2)]

    def __init__(self, bot, side=True, until=None, start='save'):
        super().__init__(bot, side=side, until=until)
        self.start = start
        self.slots0 = {}            # slot -> raw localStorage value before the run (the quick start must not touch them)
        self.run_slot = None        # the slot this run owns (its autosave)

    def level(self):
        return (self.b.game() or {}).get('party', [{}])[0].get('level')

    # The level each zone is cleared at on the simulator's 80% route (tools/sim/simulate.mjs): the bot stops seeking out optional
    # fights once the party is there, so it meets the Warden at the plan's Lv 16 (fights that come to it are still fought).
    ZONE_LV = {'sand_road': 14, 'foundry_f1': 15, 'foundry_f2': 16, 'foundry_f3': 16}

    def hunt(self, limit, label):
        f = self.b.settle()
        if (self.level() or 0) >= self.ZONE_LV.get(f['map'], 99):
            return
        self.b.hunt(limit=limit, label=label)

    def slot_raw(self, n):
        return self.b.page.evaluate(SLOT_JS, n)

    # ---- quench
    def quench_solutions(self, map_id):
        b = self.b
        key = ('quench', map_id)
        if key not in b.grids:
            r = subprocess.run(['node', str(NEXT / 'tools' / 'maps' / 'mapcheck.mjs'), 'quench', map_id], capture_output=True, text=True, timeout=180, cwd=str(NEXT))
            if r.returncode != 0:
                raise Fail(f'quench {map_id}: {r.stderr[-400:]}')
            data = json.loads(r.stdout)
            b.grids[key] = {s['label']: {'states': s.get('states') or {}, 'blocks': s.get('blocks') or {}} for s in data.get('solved') or []}
        return b.grids[key]

    def quench_done(self, f, goal):
        """A basin goal ('basin bs_c') is done when the basin is full; a crust goal ('crust x,y') when that cell is crust."""
        kind, what = goal.split(' ', 1)
        if kind == 'basin':
            e = self.b.ent(f, what)
            return bool(e) and e.get('state') in ('on', 'full', 1, True)
        x, y = (int(v) for v in what.split(','))
        return [x, y] in (f.get('crust') or [])

    def solve_quench(self, map_id, goal, blocks=True, label=''):
        """Fill a basin or cool a pool with the map's solution: shove the crates to their cells (blocks=False: leave them),
        then turn every sluice the party can reach to its state, nearest first, looking again after each turn (a fresh
        crust can be the floor to the next paddle). Waits for the cooling front."""
        b = self.b
        f = b.settle()
        if self.quench_done(f, goal):
            return f
        sol = self.quench_solutions(map_id).get(goal)
        if not sol:
            raise Fail(f'no quench solution for {goal} on {map_id}')
        if blocks:
            for bid, cell in sol['blocks'].items():
                e = b.ent(b.settle(), bid)
                if e and (e['x'], e['y']) != tuple(cell):
                    b.shove_to(bid, tuple(cell), label=f'{label} {bid}')
        turned = 0
        for _ in range(4 * len(sol['states']) + 6):
            f = b.settle()
            todo = [m for m, s in sol['states'].items() if (b.ent(f, m) or {}).get('state') is not None and int(b.ent(f, m)['state'] or 0) != int(s)]
            if not todo:
                break
            best = None
            for m in todo:
                e = b.ent(f, m)
                r = b.reachable_spot(f, [(e['x'], e['y'])])
                if r and (best is None or r[0] < best[0]):
                    best = (r[0], m)
            if best is None:
                if not getattr(self, '_cleared', None) == (map_id, goal):
                    self._cleared = (map_id, goal)              # a guard in the only corridor (a foe that never moves): fight it
                    b.hunt(limit=3, label=f'clear the way to {todo}')
                    continue
                raise Fail(f'quench {goal} on {map_id}: no reachable sluice among {todo} ({label})')
            b.interact(ent_id=best[1], label=f'turn {best[1]}')
            turned += 1
        for _ in range(30):                     # the cooling front: two frames a ring, then the basin's script
            f = b.settle()
            if self.quench_done(f, goal):
                b.notes.append(f'quench {goal} on {map_id}: {turned} turns')
                return f
            b.frames(20)
        raise Fail(f'quench {goal} on {map_id} did not happen after {turned} turns ({label})')

    def strike(self, ent_id, flag):
        b = self.b
        if self.has(flag):
            return
        b.interact(ent_id=ent_id, label=f'strike {ent_id}')
        b.settle()
        if not self.has(flag):
            raise Fail(f'{ent_id} did not set {flag}')

    def trigger(self, cells, flag, label, max_s=600):
        b = self.b
        if self.has(flag):
            return
        b.walk_to(cells, label=label)
        b.settle(max_s=max_s)
        if not self.has(flag):
            raise Fail(f'{label} did not set {flag}')

    def inn_if_hurt(self, frac=0.7):
        b = self.b
        vit = b.party_vitals()
        if not vit or min(v['hp'] / max(1, v['maxHp']) for v in vit) >= frac:
            return
        f = b.settle()
        if f['map'] != 'emberpeak':
            return
        b.through('door_pk_inn')
        self.ensure_map('pk_inn')
        b.rest_at_inn('bess')
        b.through('inn_exit')

    def round_trip(self, label):
        """Save to this run's own slot only, quit, load it back (Bot.round_trip), and check the Episode 3 world state came back."""
        b = self.b
        before = b.field() or {}
        b.round_trip(self.run_slot or 1, label)
        after = b.settle()
        lost = sorted({tuple(c) for c in before.get('crust') or []} - {tuple(c) for c in after.get('crust') or []})
        if lost:
            raise Fail(f'after the reload at {label} {len(lost)} crust cells were gone (e.g. {lost[:3]})')
        full = lambda f: sorted(e['id'] for e in f['ents'] if e['type'] == 'basin' and e.get('state') == 'on')
        opened = lambda f: sorted(e['id'] for e in f['ents'] if e['type'] in ('gate', 'locked_door') and e.get('state') == 'open')
        if full(before) != full(after) or not set(opened(before)) <= set(opened(after)):
            raise Fail(f'after the reload at {label}: basins {full(before)} -> {full(after)}, gates {opened(before)} -> {opened(after)}')
        b.notes.append(f'reload at {label}: {len(after.get("crust") or [])} crust cells, basins {full(after)}, gates {opened(after)} intact')

    # ---- phases
    def title_start(self):
        """Title -> Continue on the Episode 2 credits save (record 1), or Title -> Episode 3 -> the slot notice -> Start ->
        name -> the inn. The quick start's slot choice is answered with real key presses."""
        b = self.b
        if b.scene() != 'title':
            return
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.frames(10)
        for n in EP3_SLOTS:
            self.slots0[n] = self.slot_raw(n)
        b.shot('title')
        ss = b.scene_state()['ss'] or {}
        items = ss.get('items') or []
        if b.resume and self.start == 'save':
            b.title_continue(1)
            self.run_slot = 1
            b.notes.append(f'resumed from {b.resume} (record 1)')
            b.mark('resume')
            return
        if 'ep3' not in items:
            raise Fail(f'the title does not offer Episode 3 (items {items})')
        b.shot('title_ep3')
        # real key presses all the way: the row, the slot notice (Back is the default), Start
        idx = ss.get('index') or 0
        want = items.index('ep3')
        for _ in range(abs(want - idx)):
            b.page.keyboard.press('ArrowDown' if want > idx else 'ArrowUp')
            b.frames(4)
        b.page.keyboard.press('KeyZ')
        b.frames(10)
        st = b.scene_state()['ss'] or {}
        guard = st.get('guard')
        if self.slots0.get(0) is not None:
            if not guard or guard.get('options') != ['back', 'start']:
                raise Fail(f'slot 0 is taken but the quick start showed no slot notice: {guard}')
            b.notes.append(f'quick start notice: {guard.get("line")!r}')
            b.shot('ep3_slot_notice')
            b.page.keyboard.press('ArrowDown')
            b.frames(4)
            b.page.keyboard.press('KeyZ')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp3' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        b.frames(10)
        for _ in range(8):
            b.page.keyboard.press('Backspace')
        b.page.keyboard.type(b.hero, delay=30)
        b.frames(6)
        b.shot('name_entry_ep3')
        b.page.keyboard.press('Enter')
        b.page.wait_for_function("LQ_DEBUG.state().scenes.includes('field')", timeout=30000, polling=30)
        b.frames(30)
        g = b.game() or {}
        if g.get('heroName') != b.hero:
            raise Fail(f'hero name is {g.get("heroName")!r}, typed {b.hero!r}')
        self.run_slot = g.get('autosaveSlot')
        b.notes.append(f'quick start: the run saves to slot {self.run_slot} (slot 0 was {"taken" if self.slots0.get(0) else "empty"})')
        if self.slots0.get(0) is not None and self.run_slot == 0:
            raise Fail('the quick start took slot 0 although it holds another game')
        b.mark('ep3_new_game')

    def check_slots(self, label):
        """The quick start never writes a slot it does not own (plan 10.3): every slot that held something before the run is
        byte for byte what it was; every slot but the run's own is still empty if it was."""
        if self.start != 'new':
            return
        for n in EP3_SLOTS:
            if n == self.run_slot:
                continue
            now = self.slot_raw(n)
            if now != self.slots0.get(n):
                raise Fail(f'{label}: slot {n} changed during the Episode 3 quick-start run (the run owns slot {self.run_slot})')
        self.b.notes.append(f'slots checked at {label}: only slot {self.run_slot} was written')

    def morning(self):
        b = self.b
        if self.has('sand_gate_open'):
            b.mark('ep3_morning')   # the morning now fades to the east gate and plays the gate scene
            return
        f = b.settle()
        if not self.has('ep3_started'):
            raise Fail(f'ep3_morning did not run (on {f["map"]})')
        b.mark('ep3_morning')
        b.shot('ep3_morning_after')
        if f['map'] == 'nh_inn':
            if f['leader']['x'] >= 13:
                b.through('inn_down')
            if self.side:
                self.talk('wren')
            b.through('inn_exit')
        self.ensure_map('nameless_hollow')
        if self.side:
            self.talk('aurel')
        b.menu_talk()
        self.check_slots('the morning')

    def sand_gate(self):
        b = self.b
        if self.has('sand_road_arrived'):
            return
        self.ensure_map('nameless_hollow')
        self.trigger([(40, 26), (40, 27)], 'sand_gate_open', 'sand_gate_trig')
        if b.items().get('quench_flask', 0) < 3:
            raise Fail(f'sand_gate gave {b.items().get("quench_flask", 0)} Quench Flasks')
        b.through('sand_gate_exit')
        self.ensure_map('sand_road')
        b.settle()
        if not self.has('sand_road_arrived'):
            raise Fail('sand_road_arrival did not run')
        b.mark('sand_road')

    def sand_road(self):
        b = self.b
        if self.has('pk_arrived'):
            return
        self.ensure_map('sand_road')
        if not self.has('sand_first_fight_done'):
            for attempt in range(4):
                b.walk_to([(6, 22), (6, 23)], label='first_fight_trig')
                b.settle()
                if self.has('sand_first_fight_done'):
                    break
                b.notes.append(f'sand_first_fight attempt {attempt + 1}')
                b.walk_to([(3, 22), (3, 23)], label='back from the column')
            if not self.has('sand_first_fight_done'):
                raise Fail('sand_first_fight did not resolve')
            b.mark('first_fight_done')
        if self.side:
            self.sign('sand_milestone')
            self.chest('chest_shore')
        self.hunt(2, label='road west')
        if not self.has('saw_slag'):
            b.walk_to([(16, 21), (16, 20), (16, 22)], label='slag_trig')
            b.settle()
            if not self.has('saw_slag'):
                raise Fail('slag_crossing did not run at the slag tongue')
        self.solve_quench('sand_road', 'crust 18,20', label='the slag river')
        if self.side and not b.opened('sand_road', 'chest_grotto'):
            try:
                if b.dash_break('crack_boulder', label='grotto'):
                    self.chest('chest_grotto')
                else:
                    b.notes.append('the grotto boulder did not break')
            except Fail as e:
                b.notes.append(f'grotto skipped: {e}')
        self.hunt(3, label='ash hills')
        if not self.has('carters_rested'):
            b.rest_at_fire('carters_fire', prefer=['What was she like?', 'Rest', 'Not now'])
        b.visit_shop('penny_s', [('hi_potion', 2), ('quench_flask', 2)])
        b.maintain('shelter')
        self.hunt(3, label='the rise')
        self.trigger([(44, 6), (44, 7)], 'saw_emberpeak', 'ash_view_trig')
        if self.side:
            self.sign('rise_sign')
        b.exit_to((51, 6), label='to Emberpeak')
        self.ensure_map('emberpeak')
        b.settle()
        if not self.has('pk_arrived'):
            raise Fail('pk_arrival did not run')
        b.mark('emberpeak')

    def emberpeak(self):
        b = self.b
        if self.has('foundry_entered'):
            return
        self.ensure_map('emberpeak')
        self.trigger([(x, 18) for x in range(13, 27)], 'met_veyra', 'veyra_trig')
        if not self.has('saw_memorial'):
            b.interact(ent_id='memorial', label='the memorial')
        if not self.has('met_ilya'):
            b.through('door_pk_bellhouse')
            self.ensure_map('pk_bellhouse')
            self.trigger([(8, 11), (9, 11), (10, 11)], 'met_ilya', 'ilya_trig')
            if not b.items().get('lift_key'):
                raise Fail('ilya_bellhouse did not give the lift key')
            if self.side and not self.has('testimony_ilya'):
                pass                                                 # Ilya's testimony waits for Veyra's ask (coolant_start)
            b.interact_no_settle(ent_id='save_bell')
            self.save_from_bell(self.run_slot or 1)
            b.close_menu()
            b.through('bellhouse_exit')
        self.ensure_map('emberpeak')
        if self.side:
            self.coolant()
        if not self.has('forge_relit'):
            b.through('door_pk_smithy')
            self.ensure_map('pk_smithy')
            self.talk('garrick_e')
            if not self.has('forge_relit'):
                b.notes.append('garrick_forge did not set forge_relit')
            if self.side and self.has('coolant_started') and not self.has('testimony_sella'):
                self.talk('sella')
            b.visit_shop('sella', self.TIER5)
            b.through('smithy_exit')
            b.menu_optimize_all()
        self.ensure_map('emberpeak')
        b.through('door_pk_shop')
        self.ensure_map('pk_shop')
        b.visit_shop('taro', [('hi_potion', 3), ('quench_flask', 2), ('hi_ether', 1)])
        b.through('shop_exit')
        if self.side and self.has('coolant_started') and not self.has('coolant_done'):
            self.coolant()
        self.inn_if_hurt(0.8)
        self.ensure_map('emberpeak')
        b.mark('foundry_gate')
        b.interact(ent_id='foundry_door', label='the foundry gate')
        if not self.has('foundry_entered'):
            raise Fail('foundry_gate did not set foundry_entered')
        f = b.settle()
        if f['map'] == 'emberpeak':
            b.through('foundry_lift', exact=False)
        self.ensure_map('foundry_f1')
        b.settle()
        if not self.has('foundry_f1_arrived'):
            raise Fail('foundry_f1_arrival did not run')
        b.mark('foundry_f1')

    def save_from_bell(self, slot):
        """The save bell's prompt (the menu's Save page): this run's own slot."""
        b = self.b
        for _ in range(60):
            st = b.scene_state()
            sc, ss = st['scene'], st.get('ss') or {}
            if sc == 'loadGame':
                slots = [s['slot'] for s in ss.get('slots', [])]
                if slot not in slots:
                    raise Fail(f'the save page offers {slots}, not slot {slot}')
                b.pick(slots.index(slot), ss.get('index') or 0)
                for _ in range(40):
                    st = b.scene_state()
                    if st['scene'] == 'choice':
                        b.pick(0, (st['ss'] or {}).get('index') or 0)
                    elif st['scene'] != 'loadGame':
                        break
                    b.frames(6)
                b.notes.append(f'saved at the bell to slot {slot}')
                return
            if sc == 'field' and not (b.field() or {}).get('locked'):
                b.notes.append('the save bell asked nothing')
                return
            b.handle(prefer=['Save', 'Yes'])
        raise Fail('the save bell never opened the save page')

    def coolant(self):
        """The Coolant Station: Veyra's ask, Ilya, Harl and Sella, the valve."""
        b = self.b
        if self.has('coolant_done'):
            return
        f = b.settle()
        if f['map'] != 'emberpeak':
            return
        if not self.has('coolant_started'):
            self.talk('veyra')
        if not self.has('coolant_started'):
            b.notes.append('Veyra did not start the Coolant Station')
            return
        if not self.has('testimony_harl'):
            self.talk('harl')
        if not self.has('testimony_ilya'):
            b.through('door_pk_bellhouse')
            self.talk('ilya')
            b.through('bellhouse_exit')
        if not self.has('testimony_sella'):
            b.through('door_pk_smithy')
            self.talk('sella')
            b.through('smithy_exit')
        self.ensure_map('emberpeak')
        if all(self.has(t) for t in ('testimony_ilya', 'testimony_harl', 'testimony_sella')):
            b.interact(ent_id='coolant_obj', label='the coolant station')
            if not self.has('coolant_done'):
                b.notes.append('the coolant station did not complete')

    def foundry_f1(self):
        b = self.b
        if self.has('foundry_f1_done'):
            return
        self.ensure_map('foundry_f1')
        b.mark('liftworks')
        # B, the Slag Hall: the start '/' has cooled pool 1 (the ledge chest); '\' cools pool 2, the way east
        if self.side:
            try:
                self.solve_quench('foundry_f1', 'crust 15,17', label='pool 1')
                self.chest('chest_ledge')
            except Fail as e:
                b.notes.append(f'ledge chest skipped: {e}')
        self.solve_quench('foundry_f1', 'crust 24,17', label='pool 2')
        self.hunt(3, label='ore lines')
        # C, the Ore Lines: the crate dams the cistern; shove it out of the trough, the basin cools the hot grate (Ash Key)
        if not b.items().get('ash_key') and not self.has('ash_key_f1'):
            self.solve_quench('foundry_f1', 'basin bs_c', label='ore lines')
            self.hunt(2, label='key alcove')
            self.chest('chest_key')
        if self.side and self.has('sand_started'):
            self.chest('chest_hopper')
        b.maintain('ore lines')
        # D, the old shaft: the Ash Key door, Bram's first memory, the span to the balcony
        if not self.has('crucible_hook_found'):
            f = b.settle()
            if f['leader']['y'] > 18 or f['leader']['x'] > 9:
                b.through('door_d')
            if not self.has('bram_memory_1'):
                self.trigger([(4, y) for y in range(12, 16)] + [(5, y) for y in range(12, 16)], 'bram_memory_1', 'shaft_trig')
            self.hunt(3, label='shaft')
            self.solve_quench('foundry_f1', 'crust 10,7', label='the span')
            if self.side and not b.opened('foundry_f1', 'chest_boots'):
                try:
                    if b.dash_break('crack_d', label='shaft crack'):
                        self.chest('chest_boots')
                except Fail as e:
                    b.notes.append(f'Ashwalker Boots skipped: {e}')
            self.hunt(2, label='balcony')
            self.chest('chest_hook')
            if not self.has('crucible_hook_found'):
                raise Fail('the balcony chest did not give the Crucible Hook')
        # E to the wheel: '\' at the balcony spout, '\' at the east paddle, down column 36 to the waterwheel
        self.solve_quench('foundry_f1', 'basin bs_wheel', blocks=False, label='the wheel')
        b.settle()
        if not self.has('lift_wheel_lit'):
            raise Fail('the waterwheel did not latch lift_wheel_lit')
        self.hunt(3, label='wheelhouse')
        if self.side:
            self.chest('chest_f')
        b.maintain('end of F1')
        self.trigger([(31, 23), (32, 23)], 'foundry_f1_done', 'lift_trig')
        f = b.settle()
        if f['map'] == 'foundry_f1':
            b.through('gate_lift', exact=False)
        self.ensure_map('foundry_f2')
        b.settle()
        if not self.has('foundry_f2_arrived'):
            raise Fail('foundry_f2_arrival did not run')
        b.mark('foundry_f2')

    def foundry_f2(self):
        b = self.b
        if self.has('foundry_f2_done'):
            return
        self.ensure_map('foundry_f2')
        if not self.has('bram_memory_2'):
            self.trigger([(x, 14) for x in range(3, 12)], 'bram_memory_2', 'bell_trig2')
        self.hunt(2, label='bell gallery')
        if self.side:
            try:
                self.solve_quench('foundry_f2', 'basin bs_b1', label='alcove')
                self.chest('chest_alcove')
            except Fail as e:
                b.notes.append(f'alcove skipped: {e}')
        self.solve_quench('foundry_f2', 'basin bs_b2', label='the way to C')
        self.hunt(2, label='records')
        if self.side and not self.has('ledger_found'):
            try:
                f = b.settle()
                e = b.ent(f, 'ledger_obj')
                r = b.reachable_spot(f, [(e['x'], e['y'])])
                if r:
                    b.walk_to([r[1]], label='ledger')
                    b.face(r[2])
                    b.raise_lantern()
                    b.settle()
                if not self.has('ledger_found'):
                    b.interact(ent_id='ledger_obj', label='ledger')
                if self.has('ledger_found'):
                    self.chest('chest_cache')
                    f = b.settle()
                    if b.ent(f, 'book_ledger'):
                        b.interact(ent_id='book_ledger', label='foundry ledger')
                else:
                    b.notes.append('the ledger did not answer the Lantern')
            except Fail as e:
                b.notes.append(f'ledger skipped: {e}')
        self.solve_quench('foundry_f2', 'basin bs_d', label='the long channel')
        self.hunt(4, label='long channel')
        self.chest('chest_key2')
        self.chest('chest_d2')
        b.maintain('long channel')
        f = b.settle()
        if b.ent(f, 'font_fo2b'):
            try:
                b.rest_at_font('font_fo2b', label='font F2')
            except Fail as e:
                b.notes.append(f'font F2 skipped: {e}')
        self.round_trip('F2 font room')
        self.ensure_map('foundry_f2')
        self.check_slots('F2')
        self.hunt(2, label='fan approach')
        b.through('door_e')
        for attempt in range(5):
            if self.has('bellows_specter_defeated'):
                break
            if attempt:
                b.notes.append(f'Bellows Specter attempt {attempt + 1} (Lv {self.level()})')
                b.maintain('before the Specter again')
            b.mark('bellows_specter')
            b.walk_to([(x, 18) for x in range(14, 26)], label='specter_trig')
            b.settle(max_s=900)
        if not self.has('bellows_specter_defeated'):
            raise Fail('the Bellows Specter did not fall in 5 attempts')
        self.trigger([(18, 16), (19, 16), (20, 16)], 'foundry_f2_done', 'shaft_stairs_trig')
        f = b.settle()
        if f['map'] == 'foundry_f2':
            b.through('stairs_f3')
        self.ensure_map('foundry_f3')
        b.settle()
        if not self.has('foundry_f3_arrived'):
            raise Fail('foundry_f3_arrival did not run')
        b.mark('foundry_f3')

    def town_trip(self):
        """After the Galleries: the F3 lift up to the Liftworks, the ore lift home, Sella's tier 6 steel (the forge is lit), Taro,
        the inn; then down again: the ore lift, the Liftworks lift to the Galleries and the shaft stair under the still fan."""
        b = self.b
        if not self.has('foundry_f3_arrived') or self.has('oath_hand') or self.has('oath_heart') or self.has('oath_home'):
            return
        if getattr(self, '_tripped', False):
            return
        self._tripped = True
        f = b.settle()
        self.ensure_map('foundry_f3')
        b.through('lift_f3_short', exact=False)
        self.ensure_map('foundry_f1')
        b.through('lift_home', exact=False)
        self.ensure_map('emberpeak')
        b.mark('town_trip')
        b.through('door_pk_smithy')
        self.ensure_map('pk_smithy')
        b.visit_shop('sella', [('heartforge_pike', 1), ('founders_rod', 1), ('soot_hood', 1)])     # the simulator's foundry_f3 row
        b.through('smithy_exit')
        b.menu_optimize_all()
        b.through('door_pk_shop')
        b.visit_shop('taro', [('hi_potion', 3), ('quench_flask', 3), ('phoenix_feather', 1)])
        b.through('shop_exit')
        self.inn_if_hurt(0.95)
        self.ensure_map('emberpeak')
        b.through('foundry_lift', exact=False)
        self.ensure_map('foundry_f1')
        b.through('gate_lift', exact=False)
        self.ensure_map('foundry_f2')
        b.through('stairs_f3', exact=False)
        self.ensure_map('foundry_f3')

    def foundry_f3(self):
        b = self.b
        if self.has('bell_gate_open'):
            return
        self.ensure_map('foundry_f3')
        # The Heart (east): two hot gates, then the anvil and the furnace where Vex waits
        if not self.has('oath_heart') or not self.has('vex_furnace_met'):
            self.hunt(2, label='heart wing')
            self.solve_quench('foundry_f3', 'basin bs_k1', blocks=False, label='heart gate 1')
            self.hunt(2, label='heart wing 2')
            self.solve_quench('foundry_f3', 'basin bs_k2', blocks=False, label='heart gate 2')
            self.strike('anvil_heart', 'oath_heart')
            if not self.has('vex_furnace_met'):
                self.trigger([(39, 4), (40, 4), (41, 4)], 'vex_furnace_met', 'vex_trig')
            if self.side:
                self.sign('vex_feather')
        b.maintain('after the heart')
        # The Hand (west): pool 1, pool 3 (the chest), pool 2 (the anvil)
        if not self.has('oath_hand'):
            self.hunt(2, label='hand wing')
            self.solve_quench('foundry_f3', 'crust 11,17', blocks=False, label='hand pool 1')
            if self.side and not b.opened('foundry_f3', 'chest_hand'):
                try:
                    b.frames(80)                                     # the start '/' at sl_h2 runs on into pool 3, the south bank
                    self.chest('chest_hand')
                except Fail as e:
                    b.notes.append(f'hand chest skipped: {e}')
            self.solve_quench('foundry_f3', 'crust 8,11', blocks=False, label='hand pool 2')
            self.hunt(2, label='hand bank')
            self.strike('anvil_hand', 'oath_hand')
        b.maintain('after the hand')
        # The Home (south), an order puzzle: turn sl_home first (the water cools the plug in the crate's slot), then shove
        # the crate up twice over the cooled plug into the corner; the dammed junction runs the water into the anvil's lake
        if not self.has('oath_home'):
            self.hunt(2, label='home wing')
            self.solve_quench('foundry_f3', 'crust 22,27', blocks=False, label='home plug')
            self.solve_quench('foundry_f3', 'crust 23,28', label='home lake')
            self.hunt(2, label='home ring')
            self.strike('anvil_home', 'oath_home')
            if self.side and not b.opened('foundry_f3', 'chest_blade'):
                try:
                    b.reveal_near([(9, 28)], label='home ink bridge')
                    self.chest('chest_blade')
                except Fail as e:
                    b.notes.append(f'Tempered Lexicon Blade skipped: {e}')
        self.hunt(3, label='hub sweep')
        b.maintain('before the bell gate')
        self.trigger([(20, 14), (21, 14), (22, 14)], 'bell_gate_open', 'gate_trig', max_s=900)
        b.mark('bell_gate')

    def warden(self):
        b = self.b
        if self.has('cinder_warden_defeated'):
            return
        f = b.settle()
        self.ensure_map('foundry_f3')
        self.hunt(2, label='antechamber')
        self.chest('chest_ante')
        b.maintain('antechamber')
        b.rest_at_font('font_fo3', label='font F3')
        self.round_trip('before the Warden')
        self.ensure_map('foundry_f3')
        for attempt in range(5):
            f = b.settle()
            if f['map'] == 'foundry_f3':
                b.through('door_heart')
            self.ensure_map('foundry_heart')
            if attempt == 0:
                b.mark('cinder_warden')
            b.notes.append(f'Cinder Warden attempt {attempt + 1}: Lv {self.level()}')
            b.walk_to([(x, 14) for x in range(2, 22)], label='warden_trig')
            b.settle(max_s=1500)                                     # the scene, the fight, warden_after
            if self.has('cinder_warden_defeated'):
                break
            f = b.settle()
            if f['map'] == 'foundry_heart':
                b.through('heart_exit')
            self.ensure_map('foundry_f3')
            b.rest_at_font('font_fo3', label='font before the Warden again')
            b.maintain('before the Warden again')
        if not self.has('cinder_warden_defeated'):
            raise Fail('the Cinder Warden did not fall in 5 attempts')
        b.settle(max_s=900)
        if not self.has('garrick_named'):
            raise Fail('warden_after did not set garrick_named')
        b.mark('warden_after')

    def first_bell(self):
        b = self.b
        if self.has('ep3_complete'):
            return
        f = b.settle()
        if f['map'] == 'foundry_heart':
            b.through('lift_heart_up', exact=False)
        b.settle(max_s=900)                                          # first_bell, ep3_ending, the credits
        if not self.has('ep3_complete'):
            raise Fail(f'ep3_complete was not set (on {b.settle()["map"]})')
        for _ in range(500):
            sc = b.handle()
            fs = b.field() or {}
            if sc == 'field' and fs.get('map') == 'pk_inn' and not fs.get('locked'):
                break
        f = b.settle()
        if f['map'] != 'pk_inn':
            raise Fail(f'after the Episode 3 credits the party woke on {f["map"]}, not pk_inn')
        if not (b.game() or {}).get('counters', {}).get('credits3_rolled'):
            raise Fail('credits3_rolled was not counted')
        b.mark('ep3_credits_done')
        self.check_slots('the credits')

    def epilogue3(self):
        b = self.b
        if not self.side or not self.has('ep3_complete'):
            return
        self.ensure_map('pk_inn')
        f = b.settle()
        if f['leader']['x'] >= 13:
            b.through('inn_down')
        self.talk('bess')
        b.through('inn_exit')
        self.ensure_map('emberpeak')
        self.talk('rusk')
        b.menu_talk()
        b.mark('ep3_epilogue')

    def run(self):
        b = self.b
        b.mark('boot')
        phases = [('ep3_start', self.title_start), ('ep3_morning', self.morning), ('sand_gate', self.sand_gate), ('sand_road', self.sand_road),
                  ('emberpeak', self.emberpeak), ('foundry_f1', self.foundry_f1), ('foundry_f2', self.foundry_f2), ('town_trip', self.town_trip), ('foundry_f3', self.foundry_f3),
                  ('warden', self.warden), ('first_bell', self.first_bell), ('epilogue3', self.epilogue3)]
        for step_id, fn in phases:
            print(f'-- {step_id}', flush=True)
            fn()
            if b.resume and step_id == 'ep3_start':
                b.resume = None
                self.ensure_any()
            b.check_errors()
            if self.until == step_id:
                print(f'stopping after {step_id} (--until)', flush=True)
                return
        self.check_slots('the end')


def ep4_fixture(device):
    """The Episode 3 credits save (EPISODE4_PLAN 10.2): built from the newest finished Episode 3 game (<device>-ep3-last-game.json,
    else the desktop one) by putting the party where the Episode 3 credits wake it: pk_inn, inn_bed (17, 7), facing down.
    Written to <device>-ep3-credits-save.json. Returns the path."""
    path = OUT / f'{device}-ep3-credits-save.json'
    if path.exists():
        return path
    for src in (OUT / f'{device}-ep3-last-game.json', OUT / 'desktop-ep3-last-game.json'):
        if src.exists():
            g = json.loads(src.read_text(encoding='utf-8'))
            if not (g.get('flags') or {}).get('ep3_complete') or not (g.get('counters') or {}).get('credits3_rolled'):
                continue
            if any(k.startswith('ep4_') for k, v in (g.get('flags') or {}).items() if v):
                continue
            g['map'] = 'pk_inn'
            g['pos'] = {'x': 17, 'y': 7, 'dir': 'down'}
            g['autosaveSlot'] = 1
            path.write_text(json.dumps(g), encoding='utf-8')
            return path
    raise Fail('no finished Episode 3 game to build the credits save from: run python qa/autoplay.py --episode 3 first')


class Episode4(Episode3):
    """Episode 4, "The Sunken Keep" (docs/story/EPISODE4.md, STAGING_EP4.md, MAPS_EP4_A.md, MAPS_EP4_B.md): from the morning after
    the Episode 3 credits (Continue on the credits save, or the title's Episode 4 quick start) to the Episode 4 credits and the
    wake in the Floodwatch Inn. Tide locks follow the map agents' reported solutions: a wheel is turned until its basin shows
    the wanted level (Episode4.level_to), and the bot walks on the field's live collision (the tide's water, floats and seals,
    FIELD_JS `tide`). Fights are Auto at 2x. The quick start is checked to write no save slot it does not own."""

    # The level each zone is left at on the plan's route (EPISODE4_PLAN 6.1): optional fights stop once the party is there,
    # so the Paper Regent is met at Lv 20 (fights that come to the party are still fought).
    ZONE_LV = {'ep4_flood_road': 18, 'ep4_keep_f1': 19, 'ep4_keep_f2': 19, 'ep4_keep_f3': 20}
    # ...by EXP, not level, so a Continue run (the Episode 3 bot finished about 750 EXP over the plan) and the quick start (5,600)
    # both meet the Regent near the plan's 7,727 to 8,000: the simulator's zone ends (tools/sim/ep4.mjs, EPISODE4_PLAN 6.1)
    ZONE_EXP = {'ep4_flood_road': 6038, 'ep4_keep_f1': 6853, 'ep4_keep_f2': 7500, 'ep4_keep_f3': 7900}

    def hunt(self, limit, label):
        f = self.b.settle()
        exp = ((self.b.game() or {}).get('party') or [{}])[0].get('exp') or 0
        if exp >= self.ZONE_EXP.get(f['map'], 10 ** 9):
            return
        self.b.hunt(limit=limit, label=label)

    TIER7 = [('riverguard_plate', 2), ('scribes_robe', 1), ('riverguard_helm', 2), ('oilskin_hood', 1)]
    TIER8 = [('crownguard_helm', 1), ('crownguard_sword', 1), ('riverguard_halberd', 1), ('charter_rod', 1), ('crownguard_mail', 1)]

    def __init__(self, bot, side=True, until=None, start='save'):
        super().__init__(bot, side=side, until=until, start=start)
        self.turns = collections.Counter()     # puzzle label -> wheel turns (story_time.py reads the notes)

    # ---- tide
    def tide(self, f=None):
        f = f or self.b.settle()
        t = f.get('tide')
        if not t:
            raise Fail(f'no tide on {f["map"]}')
        return t

    def level_to(self, wheel, level, label=''):
        """Turn `wheel` until its basin stands at `level` (low 0, mid 1, high 2), walking to it on the live floor."""
        b = self.b
        for _ in range(5):
            f = b.settle()
            t = self.tide(f)
            basin = (t.get('wheels') or {}).get(wheel)
            if basin is None:
                raise Fail(f'no wheel {wheel} on {f["map"]} ({label})')
            if int(t['levels'][basin]) == int(level):
                return f
            before = int(t['levels'][basin])
            b.interact(ent_id=wheel, label=f'turn {wheel} ({label})')
            after = int(self.tide()['levels'][basin])
            if after == before:
                raise Fail(f'{wheel} did not turn (basin {basin} still at {before}; {label})')
            self.turns[label or wheel] += 1
        raise Fail(f'{wheel}: basin did not reach level {level} ({label})')

    def basin_to(self, basin, level, label=''):
        """Turn whichever wheel of `basin` the party can reach (nearest first) until the basin stands at `level`."""
        b = self.b
        for _ in range(5):
            f = b.settle()
            t = self.tide(f)
            if int(t['levels'][basin]) == int(level):
                return f
            best = None
            for w, bb in (t.get('wheels') or {}).items():
                e = b.ent(f, w)
                if bb != basin or not e:
                    continue
                r = b.reachable_spot(f, [(e['x'], e['y'])])
                if r and (best is None or r[0] < best[0]):
                    best = (r[0], w)
            if best is None:
                raise Fail(f'no reachable wheel of basin {basin} on {f["map"]} ({label})')
            self._turn_once(best[1], label)
        f = b.settle()
        if int(self.tide(f)['levels'][basin]) != int(level):
            raise Fail(f'basin {basin} did not reach level {level} ({label})')
        return f

    def _turn_once(self, wheel, label):
        b = self.b
        b.interact(ent_id=wheel, label=f'turn {wheel} ({label})')
        self.turns[label or wheel] += 1

    TIDE_DRIVEN = ('pontoon', 'forgery', 'floodgate')

    def plan_to(self, f, goals, label=''):
        """The fewest-turn wheel plan from where the party stands to any of `goals` (qa/integrate/ep4_tideplan.mjs, the pure tide
        rule over every level state), on the bot's live model of everything the tide does not drive."""
        b = self.b
        t = self.tide(f)
        solid, opn, avoid = set(), set(), set()
        for e in f['ents']:
            cells = [tuple(c) for c in e['cells']]
            if e['type'] in self.TIDE_DRIVEN:
                continue
            for c, bl in zip(cells, e['blocked']):
                if bl:
                    solid.add(c)
                elif e['type'] in ('door', 'gate', 'locked_door'):
                    opn.add(c)
            if e.get('opens'):
                opn.update(tuple(c) for c in e['opens'])
            if e['type'] == 'door' or (e['type'] in ('gate', 'locked_door') and e['state'] == 'open' and e['to']) or e['type'] == 'pit':
                avoid.update(cells)
            if e['type'] == 'block':
                solid.update(cells)
        for a in f['actors']:
            if a['kind'] not in ('party', 'enemy') and a['solid']:
                solid.add((a['x'], a['y']))
        g = b.grid(f['map'])
        for ex in g['exits']:
            for j in range(ex.get('h', 1)):
                for i in range(ex.get('w', 1)):
                    avoid.add((ex['x'] + i, ex['y'] + j))
        dams = [tuple(e['cells'][0]) for e in f['ents'] if e['type'] == 'block']
        flags = sorted(k for k, v in (b.flags() or {}).items() if v)
        req = {'map': f['map'], 'levels': t['levels'], 'washed': t.get('washed') or [], 'latched': t.get('latched') or [], 'dams': dams,
               'pos': [f['leader']['x'], f['leader']['y']], 'goals': [list(c) for c in goals], 'solid': [list(c) for c in solid],
               'open': [list(c) for c in opn], 'avoid': [list(c) for c in avoid - set(goals)], 'flags': flags}
        r = subprocess.run(['node', str(HERE / 'integrate' / 'ep4_tideplan.mjs')], input=json.dumps(req), capture_output=True, text=True, timeout=120, cwd=str(NEXT))
        if r.returncode != 0:
            raise Fail(f'tide plan {f["map"]}: {r.stderr[-400:]}')
        out = json.loads(r.stdout)
        if not out.get('ok'):
            raise Fail(f'no tide plan on {f["map"]} to {sorted(goals)[:4]} from {req["pos"]} at {t["levels"]} ({label}): {out}')
        return out['plan']

    def reach(self, cells, label='', adjacent=False):
        """Make `cells` reachable (or, adjacent=True, a cell beside them): turn the wheels the plan names, standing where it
        says, then leave the walk to the caller."""
        b = self.b
        cells = [tuple(c) for c in cells]
        goals = set(cells)
        if adjacent:
            goals = {(x + dx, y + dy) for x, y in cells for dx, dy in DIRS.values()} - set(cells)
        for attempt in range(3):
            f = b.settle()
            passable, _ = b.model(f)
            L = (f['leader']['x'], f['leader']['y'])
            if L in goals or b.bfs(L, goals, passable) is not None:
                return f
            plan = self.plan_to(f, goals, label)
            if not plan:
                b.hunt(limit=3, label=f'clear the way ({label})')       # reachable by the tide rule: something on the field stands in the way
                continue
            for step in plan:
                b.walk_to([tuple(step['stand'])], label=f'stand at {step["wheel"]} ({label})')
                b.face(step['face'])
                b.tap('confirm', 3)
                b.settle()
                self.turns[label or step['wheel']] += 1
                lv = int(self.tide()['levels'][step['basin']])
                if lv != int(step['level']):
                    b.notes.append(f'tide plan {label}: {step["wheel"]} gave level {lv}, planned {step["level"]}')
                    break
        f = b.settle()
        passable, _ = b.model(f)
        if b.bfs((f['leader']['x'], f['leader']['y']), goals, passable) is None:
            raise Fail(f'{label}: still cannot reach {sorted(goals)[:4]} on {f["map"]} after the tide plan')
        return f

    def reach_ent(self, ent_id, label=''):
        f = self.b.settle()
        e = self.b.ent(f, ent_id)
        if not e:
            raise Fail(f'no {ent_id} on {f["map"]} ({label})')
        return self.reach([tuple(c) for c in e['cells']], label=label or ent_id, adjacent=True)

    def try_sign(self, ent_id):
        try:
            self.sign(ent_id)
        except Fail as e:
            self.b.notes.append(f'sign {ent_id} skipped: {e}')

    def puzzle_done(self, label):
        n = self.turns.pop(label, 0)
        if n:
            self.b.notes.append(f'tide {label}: {n} turns')

    def walk(self, cells, label):
        return self.b.walk_to([tuple(c) for c in cells], label=label)

    def round_trip(self, label):
        """Save to this run's own slot only, quit, load it back, and check the Episode 4 world state came back: washed seals,
        latched floodgates and opened doors kept, every basin at its start level (EPISODE4_PLAN 12, saves)."""
        b = self.b
        before = b.field() or {}
        tb = before.get('tide') or {}
        b.round_trip(self.run_slot or 1, label)
        after = b.settle()
        ta = after.get('tide') or {}
        if sorted(tb.get('washed') or []) != sorted(ta.get('washed') or []):
            raise Fail(f'after the reload at {label}: washed {tb.get("washed")} -> {ta.get("washed")}')
        if not set(tb.get('latched') or []) <= set(ta.get('latched') or []):
            raise Fail(f'after the reload at {label}: latched {tb.get("latched")} -> {ta.get("latched")}')
        opened = lambda f: sorted(e['id'] for e in f['ents'] if e['type'] in ('gate', 'locked_door') and e.get('state') == 'open')
        if not set(opened(before)) <= set(opened(after)):
            raise Fail(f'after the reload at {label}: doors {opened(before)} -> {opened(after)}')
        starts = ta.get('starts') or {}
        if ta and any(int(ta['levels'][k]) != int(starts.get(k, ta['levels'][k])) for k in ta.get('levels') or {}):
            raise Fail(f'after the reload at {label}: levels {ta.get("levels")} are not the start levels {starts}')
        b.notes.append(f'reload at {label}: washed {ta.get("washed")}, latched {ta.get("latched")}, levels {ta.get("levels")}, doors {opened(after)}')

    def inn_if_hurt(self, frac=0.7):
        b = self.b
        vit = b.party_vitals()
        if not vit or min(v['hp'] / max(1, v['maxHp']) for v in vit) >= frac:
            return
        f = b.settle()
        if f['map'] != 'ep4_valewyn':
            return
        b.through('door_vw_inn')
        self.ensure_map('ep4_vw_inn')
        b.rest_at_inn('ep4_innkeeper')
        b.through('inn_exit', exact=False)

    # ---- phases
    def title_start(self):
        """Title -> Continue on the Episode 3 credits save (record 1), or Title -> Episode 4: new party -> the slot notice ->
        Start -> name -> the inn. The quick start's row and slot notice are answered with real key presses."""
        b = self.b
        if b.scene() != 'title':
            return
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.frames(10)
        for n in EP3_SLOTS:
            self.slots0[n] = self.slot_raw(n)
        if b.resume and self.start == 'save':
            b.shot('title')
            b.title_continue(1)
            self.run_slot = 1
            b.notes.append(f'resumed from {b.resume} (record 1)')
            b.mark('resume')
            return
        # the pack loads behind the title and adds its row (hooks.js HOOKS.title -> title.js offerRow)
        b.page.wait_for_function("(() => { const s = LQ_ENGINE.scene; return !!(s && s.menu && s.menu.items.some(i => i.id === 'ep4')); })()", timeout=30000, polling=50)
        b.frames(6)
        ss = b.scene_state()['ss'] or {}
        items = ss.get('items') or [i['id'] for i in (b.js("LQ_ENGINE.scene.menu.items.map(i => ({ id: i.id }))") or [])]
        if 'ep4' not in items:
            raise Fail(f'the title does not offer Episode 4 (items {items})')
        b.shot('title_ep4')
        idx = b.js('LQ_ENGINE.scene.menu.index') or 0
        want = items.index('ep4')
        cols = b.js('LQ_ENGINE.scene.menu.columns') or 1
        rows = b.js('LQ_ENGINE.scene.menu.rows') or len(items)
        for _ in range(12):
            idx = b.js('LQ_ENGINE.scene.menu.index') or 0
            if idx == want:
                break
            if cols > 1 and idx // rows != want // rows:
                b.page.keyboard.press('ArrowRight' if want // rows > idx // rows else 'ArrowLeft')
            else:
                b.page.keyboard.press('ArrowDown' if want > idx else 'ArrowUp')
            b.frames(4)
        b.page.keyboard.press('KeyZ')
        b.frames(10)
        if self.slots0.get(0) is not None:
            b.page.wait_for_function("LQ_DEBUG.scene() === 'ep4Ask'", timeout=10000, polling=30)
            st = b.scene_state()['ss'] or {}
            if st.get('options') != ['back', 'start']:
                raise Fail(f'slot 0 is taken but the quick start showed no slot notice: {st}')
            b.notes.append(f'quick start notice: {st.get("notice")!r}')
            b.shot('ep4_slot_notice')
            b.page.keyboard.press('ArrowDown')
            b.frames(4)
            b.page.keyboard.press('KeyZ')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp4' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        b.frames(10)
        for _ in range(8):
            b.page.keyboard.press('Backspace')
        b.page.keyboard.type(b.hero, delay=30)
        b.frames(6)
        b.shot('name_entry_ep4')
        b.page.keyboard.press('Enter')
        b.page.wait_for_function("LQ_DEBUG.state().scenes.includes('field')", timeout=30000, polling=30)
        b.frames(30)
        g = b.game() or {}
        if g.get('heroName') != b.hero:
            raise Fail(f'hero name is {g.get("heroName")!r}, typed {b.hero!r}')
        self.run_slot = g.get('autosaveSlot')
        b.notes.append(f'quick start: the run saves to slot {self.run_slot} (slot 0 was {"taken" if self.slots0.get(0) else "empty"})')
        if self.slots0.get(0) is not None and self.run_slot == 0:
            raise Fail('the quick start took slot 0 although it holds another game')
        b.mark('ep4_new_game')

    def morning(self):
        b = self.b
        f = b.settle()
        if not self.has('ep4_started'):
            raise Fail(f'ep4_morning did not run (on {f["map"]})')
        b.mark('ep4_morning')
        if not b.items().get('running_decree'):
            raise Fail('ep4_morning did not give the Running Decree')
        if f['map'] == 'pk_inn':
            if f['leader']['x'] >= 13:
                b.through('inn_down')
            if self.side:
                self.talk('bess')
            b.through('inn_exit')
        self.ensure_map('emberpeak')
        if self.side:
            self.talk('rusk')
        b.menu_talk()
        self.check_slots('the morning')

    def east_road(self):
        b = self.b
        if self.has('flood_road_arrived'):
            return
        self.ensure_map('emberpeak')
        self.trigger([(36, 14), (36, 15)], 'east_road_open', 'east_road_trig')
        b.through('east_road_down')
        self.ensure_map('ep4_flood_road')
        b.settle()
        if not self.has('flood_road_arrived'):
            raise Fail('flood_road_arrival did not run')
        b.mark('flood_road')

    def flood_road(self):
        b = self.b
        if self.has('vw_arrived'):
            return
        self.ensure_map('ep4_flood_road')
        if not self.has('flood_first_fight_done'):
            for attempt in range(4):
                b.walk_to([(7, y) for y in range(6, 18)], label='first_fight_trig')
                b.settle()
                if self.has('flood_first_fight_done'):
                    break
                b.notes.append(f'flood_first_fight attempt {attempt + 1}')
                b.walk_to([(4, 15), (4, 14), (5, 15)], label='back from the column')
            if not self.has('flood_first_fight_done'):
                raise Fail('flood_first_fight did not resolve')
            b.mark('first_fight_done')
        if self.side:
            self.try_sign('broken_cart')
        self.trigger([(12, y) for y in range(13, 17)], 'saw_flood_lane', 'lane_trig')
        # the drowned lane: wh_lane mid -> low (the road), then up to the stand, low -> mid (the punt to the chest), mid -> low
        self.level_to('wh_lane', 0, label='the drowned lane')
        if self.side and not b.opened('ep4_flood_road', 'chest_punt'):
            try:
                self.walk([(15, 13)], 'the sluice stand')                # up the canal stair (15, 14) while the lane is dry
                self.level_to('wh_lane', 1, label='the drowned lane')
                self.chest('chest_punt')
                self.level_to('wh_lane', 0, label='the drowned lane')
            except Fail as e:
                b.notes.append(f'punt chest skipped: {e}')
                self.level_to('wh_lane', 0, label='the drowned lane')
        self.puzzle_done('the drowned lane')
        self.walk([(27, 15), (27, 16), (28, 15)], 'east of the lane')
        self.hunt(2, label='the dry banks')
        if self.side and not b.opened('ep4_flood_road', 'chest_grotto_fr'):
            try:
                if b.dash_break('crack_boulder_fr', label='grotto'):
                    self.chest('chest_grotto_fr')
            except Fail as e:
                b.notes.append(f'grotto skipped: {e}')
        if not self.has('ferry_rested'):
            b.rest_at_fire('ferry_fire', prefer=['What happened here?', 'Rest', 'Not now'])
        b.visit_shop('hale', [('hi_potion', 2), ('lamp_oil', 2)])
        b.maintain('the landing')
        self.hunt(2, label='the bluff')
        self.trigger([(44, y) for y in range(6, 9)], 'saw_valewyn', 'vw_view_trig')
        if self.side:
            try:
                b.interact(ent_id='pot_bluff', label='pot on the bluff')
            except Fail as e:
                b.notes.append(f'bluff pot skipped: {e}')
        b.through('ferry_vw', exact=False)
        self.ensure_map('ep4_valewyn')
        b.settle()
        if not self.has('vw_arrived'):
            raise Fail('vw_arrival did not run')
        b.mark('valewyn')

    def valewyn(self):
        b = self.b
        if self.has('keep_entered'):
            return
        self.ensure_map('ep4_valewyn')
        if self.side and not self.has('saw_statue'):
            b.interact(ent_id='statue', label='the statue')
        if not self.has('met_regent'):
            b.through('door_vw_palace')
            self.ensure_map('ep4_vw_palace')
            self.trigger([(x, 11) for x in range(1, 11)], 'met_regent', 'regent_trig')
            b.mark('regent_hall')
            b.interact_no_settle(ent_id='save_bell_vw')
            self.save_from_bell(self.run_slot or 1)
            b.close_menu()
            b.through('palace_exit')
        self.ensure_map('ep4_valewyn')
        if not self.has('met_joss'):
            self.talk('joss')
            if not self.has('met_joss') or not b.items().get('lock_crank'):
                raise Fail('joss_locks did not give the Lockwright\'s Crank')
            b.mark('joss')
        b.through('door_vw_forge')
        self.ensure_map('ep4_vw_forge')
        b.visit_shop('ep4_smith', self.TIER7)
        b.through('forge_exit', exact=False) if b.ent(b.settle(), 'forge_exit') else b.exit_to((8, 10), label='forge door')
        b.menu_optimize_all()
        self.ensure_map('ep4_valewyn')
        b.through('door_vw_shop')
        self.ensure_map('ep4_vw_shop')
        b.visit_shop('linn', [('hi_potion', 3), ('lamp_oil', 2), ('hi_ether', 1)])
        b.through('shop_exit', exact=False) if b.ent(b.settle(), 'shop_exit') else b.exit_to((7, 10), label='shop door')
        self.ensure_map('ep4_valewyn')
        self.inn_if_hurt(0.8)
        self.ensure_map('ep4_valewyn')
        if not self.has('keep_ferry_open'):
            b.interact(ent_id='keep_ferry_obj', label='the keep ferry')
            if not self.has('keep_ferry_open'):
                raise Fail('keep_ferry did not set keep_ferry_open')
        b.mark('keep_ferry')
        b.through('keep_boat', exact=False)
        self.ensure_map('ep4_keep_f1')
        b.settle()
        if not self.has('keep_f1_arrived'):
            raise Fail('keep_f1_arrival did not run')
        b.mark('keep_f1')

    def keep_f1(self):
        b = self.b
        if self.has('keep_f1_done'):
            return
        self.ensure_map('ep4_keep_f1')
        # B, the Papered Door: high washes seal_b, low again to walk the canal floor through the door
        if 'seal_b' not in (self.tide().get('washed') or []):
            self.level_to('wh_a', 2, label='F1 papered door')
            if 'seal_b' not in (self.tide().get('washed') or []):
                raise Fail('high water in basin a did not wash seal_b')
            self.level_to('wh_a', 0, label='F1 papered door')
        self.puzzle_done('F1 papered door')
        if self.side:
            self.chest('chest_x')
        # C, the Pontoons: mid floats them; the tide key
        self.hunt(2, label='pontoons')
        if not b.opened('ep4_keep_f1', 'chest_tide_key'):
            self.level_to('wh_b', 1, label='F1 pontoons')
            self.chest('chest_tide_key')
        self.puzzle_done('F1 pontoons')
        # E and F: high from the east bank lifts the tidegate (latched) and floats pt_e to the gallery: the Sunken Seal Key
        if not self.has('tidegate_open') or not b.opened('ep4_keep_f1', 'chest_seal_key'):
            self.level_to('wh_b2', 2, label='F1 gallery and tidegate')
            if not self.has('tidegate_open'):
                raise Fail('high water in basin b did not latch the tidegate')
            self.hunt(2, label='gallery')
            self.chest('chest_seal_key')
            if not b.items().get('seal_key'):
                raise Fail('the north gallery chest did not give the Sunken Seal Key')
            self.level_to('wh_b2', 1, label='F1 gallery and tidegate')
        self.puzzle_done('F1 gallery and tidegate')
        b.maintain('F1 pontoons')
        # D, the Audience Hall (the first memory) behind the tide key door: back west at mid, then b low for the channel later
        if not self.has('lyra_memory_1'):
            self.walk([(28, 15), (28, 14), (29, 15)], 'west bank')
            self.level_to('wh_b', 0, label='F1 channel')
            b.through('door_d')
            self.trigger([(x, 14) for x in range(1, 9)], 'lyra_memory_1', 'memory1_trig')
            self.hunt(3, label='audience hall')
            if self.side and not b.opened('ep4_keep_f1', 'chest_boots'):
                try:
                    if b.dash_break('crack_d', label='audience crack'):
                        self.chest('chest_boots')
                except Fail as e:
                    b.notes.append(f'Tidewalker Boots skipped: {e}')
            b.maintain('audience hall')
        f = b.settle()
        if b.ent(f, 'font_k1'):
            try:
                b.rest_at_font('font_k1', label='font F1')
            except Fail as e:
                b.notes.append(f'font F1 skipped: {e}')
        self.round_trip('F1 water gate')
        self.ensure_map('ep4_keep_f1')
        self.check_slots('F1')
        # F: the channel floor at low, north through the latched tidegate to the lift
        self.level_to('wh_b', 0, label='F1 channel')
        self.puzzle_done('F1 channel')
        self.hunt(2, label='lift landing')
        if self.side:
            self.chest('chest_f')
        b.maintain('end of F1')
        self.trigger([(33, 2), (34, 2)], 'keep_f1_done', 'lift_trig')
        f = b.settle()
        if f['map'] == 'ep4_keep_f1':
            b.through('lift_f2', exact=False)
        self.ensure_map('ep4_keep_f2')
        b.settle()
        if not self.has('keep_f2_arrived'):
            raise Fail('keep_f2_arrival did not run')
        b.mark('keep_f2')

    def keep_f2(self):
        b = self.b
        if self.has('keep_f2_done'):
            return
        self.ensure_map('ep4_keep_f2')
        # every goal by the tide plan from wherever the party stands (MAPS_EP4_B section 2 is the authored solution)
        self.hunt(2, label='stacks')
        if not self.has('lyra_memory_2'):
            rail = [(16, y) for y in range(6, 12)]
            self.reach(rail, label='F2 stacks')
            self.trigger(rail, 'lyra_memory_2', 'memory2_trig')
        self.puzzle_done('F2 stacks')
        if self.side and not b.opened('ep4_keep_f2', 'chest_gallery'):
            try:
                self.reach_ent('chest_gallery', label='F2 stacks gallery')
                self.chest('chest_gallery')
            except Fail as e:
                b.notes.append(f'stacks gallery skipped: {e}')
            self.puzzle_done('F2 stacks gallery')
        if not self.has('vex_archive_met'):
            dome = [(x, 3) for x in range(27, 32)]
            self.reach(dome, label='F2 two locks')
            self.trigger(dome, 'vex_archive_met', 'vex_trig')
            b.mark('vex_archive')
        if not b.opened('ep4_keep_f2', 'chest_tide_key'):
            self.reach_ent('chest_tide_key', label='F2 two locks')
            self.chest('chest_tide_key')
        if 'seal_d' not in (self.tide().get('washed') or []):
            raise Fail('the key room was reached with seal_d unwashed')
        self.puzzle_done('F2 two locks')
        self.hunt(3, label='two locks')
        b.maintain('two locks')
        if self.side and not b.opened('ep4_keep_f2', 'chest_approach'):
            try:
                self.reach_ent('chest_approach', label='F2 approach')
                self.chest('chest_approach')
            except Fail as e:
                b.notes.append(f'approach chest skipped: {e}')
        self.reach_ent('door_e', label='F2 approach')
        self.puzzle_done('F2 approach')
        self.hunt(2, label='approach')
        b.through('door_e')
        f = b.settle()
        if b.ent(f, 'font_k2b'):
            try:
                b.rest_at_font('font_k2b', label='font F2')
            except Fail as e:
                b.notes.append(f'font F2 skipped: {e}')
        self.round_trip('F2 court approach')
        self.ensure_map('ep4_keep_f2')
        self.check_slots('F2')
        for attempt in range(5):
            if self.has('barrister_defeated'):
                break
            if attempt:
                b.notes.append(f'Barrister attempt {attempt + 1} (Lv {self.level()})')
                b.maintain('before the Barrister again')
            b.mark('barrister')
            arena = [(x, 20) for x in range(18, 24)]
            self.reach(arena, label='F2 court')
            b.walk_to(arena, label='barrister_trig')
            b.settle(max_s=900)
        if not self.has('barrister_defeated'):
            raise Fail('the Inkbound Barrister did not fall in 5 attempts')
        self.trigger([(20, 15), (21, 15)], 'keep_f2_done', 'stair_trig')
        f = b.settle()
        if f['map'] == 'ep4_keep_f2':
            b.through('stairs_f3', exact=False)
        self.ensure_map('ep4_keep_f3')
        b.settle()
        if not self.has('keep_f3_arrived'):
            raise Fail('keep_f3_arrival did not run')
        b.mark('keep_f3')

    def town_trip(self):
        """After the Archives: the F3 boat to F1's Water Gate, the boat to Valewyn, two tier 8 pieces at the forge (plan 7.6),
        the Provisioner, the inn; then the Keep ferry and F1's boat... back: the F1 boat lands at the Water Gate, F3 is reached
        again by F1's lift, F2's stair foot and F2's court stair (the boats only go one way)."""
        b = self.b
        if not self.has('keep_f3_arrived') or getattr(self, '_tripped', False) or self.has('lyra_memory_3'):
            return
        self._tripped = True
        self.ensure_map('ep4_keep_f3')
        b.through('boat_f3_short', exact=False)
        self.ensure_map('ep4_keep_f1')
        b.through('boat_vw', exact=False)
        self.ensure_map('ep4_valewyn')
        b.mark('town_trip')
        b.through('door_vw_forge')
        b.visit_shop('ep4_smith', self.TIER8)
        b.through('forge_exit', exact=False) if b.ent(b.settle(), 'forge_exit') else b.exit_to((8, 10), label='forge door')
        b.menu_optimize_all()
        b.through('door_vw_shop')
        b.visit_shop('linn', [('hi_potion', 3), ('lamp_oil', 2), ('phoenix_feather', 1)])
        b.through('shop_exit', exact=False) if b.ent(b.settle(), 'shop_exit') else b.exit_to((7, 10), label='shop door')
        self.inn_if_hurt(0.95)
        self.ensure_map('ep4_valewyn')
        b.through('keep_boat', exact=False)
        self.ensure_map('ep4_keep_f1')
        # back down: F1's channel at low through the latched tidegate to the lift, F2's stair foot to the court stair
        self.level_to('wh_a', 0, label='return')
        self.level_to('wh_b', 0, label='return')
        self.turns.pop('return', None)
        b.through('lift_f2', exact=False)
        self.ensure_map('ep4_keep_f2')
        b.through('stairs_f3', exact=False)
        self.ensure_map('ep4_keep_f3')

    def keep_f3(self):
        b = self.b
        if self.has('hero_signed'):
            return
        self.ensure_map('ep4_keep_f3')
        if self.side:
            self.try_sign('principles_sign')
        # Voice (west): causeway at low, mid floats the pontoons to the island (the tide plan finds the turns)
        if not self.has('principle_voice'):
            self.hunt(2, label='voice wing')
            self.reach_ent('stone_voice', label='F3 Voice')
            self.strike('stone_voice', 'principle_voice')
            self.puzzle_done('F3 Voice')
        b.maintain('after the voice')
        # Truth (east): Shove the dam out of the culvert (the water's only way in), then mid and high wash both seals
        if not self.has('principle_truth'):
            self.hunt(2, label='truth wing')
            f = b.settle()
            e = b.ent(f, 'dam_t')
            if e and (e['x'], e['y']) == (38, 8):
                self.reach([(39, 8)], label='F3 Truth')
                b.shove_to('dam_t', (37, 8), label='the culvert dam')
                self.turns['F3 Truth'] += 1
            self.reach_ent('stone_truth', label='F3 Truth')
            washed = self.tide().get('washed') or []
            if 'seal_t1' not in washed or 'seal_t2' not in washed:
                b.notes.append(f'Truth stone reached with washed {washed}')
            self.strike('stone_truth', 'principle_truth')
            if self.side and not b.opened('ep4_keep_f3', 'chest_alcove'):
                try:
                    self.reach_ent('chest_alcove', label='F3 Truth')
                    self.chest('chest_alcove')
                except Fail as e:
                    b.notes.append(f'alcove chest skipped: {e}')
            self.puzzle_done('F3 Truth')
        b.maintain('after the truth')
        # Mercy (south): high floats the boats to the island; the stone; the Lantern bridge to the spear (optional)
        if not self.has('principle_mercy'):
            self.hunt(2, label='mercy wing')
            self.reach_ent('stone_mercy', label='F3 Mercy')
            if self.side and not b.opened('ep4_keep_f3', 'chest_spear'):
                try:
                    b.reveal_near([(5, 28), (6, 28), (7, 28)], label='mercy ink bridge')
                    self.chest('chest_spear')
                except Fail as e:
                    b.notes.append(f'Tidewarden Spear skipped: {e}')
            self.strike('stone_mercy', 'principle_mercy')
            self.puzzle_done('F3 Mercy')
        b.maintain('before the petition gate')
        self.reach([(22, 12)], label='F3 back to the hub')
        self.turns.pop('F3 back to the hub', None)
        self.hunt(3, label='hub sweep')
        self.trigger([(22, 12)], 'hero_signed', 'gate_trig', max_s=900)
        if not self.has('hero_signed'):
            raise Fail('witness_book did not set hero_signed')
        b.mark('witness_book')

    def regent(self):
        b = self.b
        if self.has('paper_regent_defeated'):
            return
        self.ensure_map('ep4_keep_f3')
        if self.side:
            self.chest('chest_ante')
        b.maintain('antechamber')
        b.rest_at_font('font_k3', label='font F3')
        self.round_trip('before the Paper Regent')
        self.ensure_map('ep4_keep_f3')
        for attempt in range(5):
            f = b.settle()
            if f['map'] == 'ep4_keep_f3':
                b.through('door_throne', exact=False)
            self.ensure_map('ep4_keep_crown')
            if attempt == 0:
                b.mark('paper_regent')
            b.notes.append(f'Paper Regent attempt {attempt + 1}: Lv {self.level()}')
            b.walk_to([(x, 14) for x in range(1, 23)], label='regent_trig')
            b.settle(max_s=1500)                                     # the scene, the fight, regent_after
            if self.has('paper_regent_defeated'):
                break
            f = b.settle()
            if f['map'] == 'ep4_keep_crown':
                b.through('crown_exit')
            self.ensure_map('ep4_keep_f3')
            b.rest_at_font('font_k3', label='font before the Regent again')
            b.maintain('before the Regent again')
        if not self.has('paper_regent_defeated'):
            raise Fail('the Paper Regent did not fall in 5 attempts')
        b.settle(max_s=900)
        if not self.has('lyra_named') or not b.items().get('name_fragment_4'):
            raise Fail('regent_after did not name Lyra and give the fourth fragment')
        b.mark('regent_after')

    def ending(self):
        b = self.b
        if self.has('ep4_complete') and (b.game() or {}).get('counters', {}).get('credits4_rolled'):
            return
        f = b.settle()
        if f['map'] == 'ep4_keep_crown':
            b.through('boat_crown_out', exact=False)
        b.settle(max_s=900)                                          # crown_remembers, ep4_ending, the credits
        if not self.has('ep4_complete'):
            raise Fail(f'ep4_complete was not set (on {b.settle()["map"]})')
        for _ in range(500):
            sc = b.handle()
            fs = b.field() or {}
            if sc == 'field' and fs.get('map') == 'ep4_vw_inn' and not fs.get('locked'):
                break
        f = b.settle()
        if f['map'] != 'ep4_vw_inn':
            raise Fail(f'after the Episode 4 credits the party woke on {f["map"]}, not ep4_vw_inn')
        if not (b.game() or {}).get('counters', {}).get('credits4_rolled'):
            raise Fail('credits4_rolled was not counted')
        b.mark('ep4_credits_done')
        self.check_slots('the credits')

    def epilogue4(self):
        b = self.b
        if not self.side or not self.has('ep4_complete'):
            return
        f = self.ensure_map('ep4_vw_inn')
        if f['leader']['x'] >= 13:
            b.through('inn_down')
        self.talk('ep4_innkeeper')
        b.through('inn_exit', exact=False) if b.ent(b.settle(), 'inn_exit') else b.exit_to((10, 11), label='inn door')
        self.ensure_map('ep4_valewyn')
        self.talk('vance')
        b.menu_talk()
        b.mark('ep4_epilogue')

    def run(self):
        b = self.b
        b.mark('boot')
        phases = [('ep4_start', self.title_start), ('ep4_morning', self.morning), ('east_road', self.east_road), ('flood_road', self.flood_road),
                  ('valewyn', self.valewyn), ('keep_f1', self.keep_f1), ('keep_f2', self.keep_f2), ('town_trip', self.town_trip),
                  ('keep_f3', self.keep_f3), ('regent', self.regent), ('ending', self.ending), ('epilogue4', self.epilogue4)]
        for step_id, fn in phases:
            print(f'-- {step_id}', flush=True)
            if step_id == 'ep4_morning' and self.has('east_road_open'):
                continue                                          # a resumed game past the morning
            fn()
            if b.resume and step_id == 'ep4_start':
                b.resume = None
                self.ensure_any()
            b.check_errors()
            if self.until == step_id:
                print(f'stopping after {step_id} (--until)', flush=True)
                return
        self.check_slots('the end')


# ================================================================================================ Episode 5
def ep5_fixture(device):
    """The Episode 4 credits save (EPISODE5_PLAN 10.2): built from the newest finished Episode 4 game (<device>-ep4-last-game.json,
    else the desktop one) by putting the party where the Episode 4 credits wake it: ep4_vw_inn, inn_bed (17, 7), facing down.
    Written to <device>-ep4-credits-save.json. Returns the path."""
    path = OUT / f'{device}-ep4-credits-save.json'
    if path.exists():
        return path
    for src in (OUT / f'{device}-ep4-last-game.json', OUT / 'desktop-ep4-last-game.json'):
        if src.exists():
            g = json.loads(src.read_text(encoding='utf-8'))
            if not (g.get('flags') or {}).get('ep4_complete') or not (g.get('counters') or {}).get('credits4_rolled'):
                continue
            if any(k in EP5_FLAG_HINTS for k, v in (g.get('flags') or {}).items() if v):
                continue
            g['map'] = 'ep4_vw_inn'
            g['pos'] = {'x': 17, 'y': 7, 'dir': 'down'}
            g['autosaveSlot'] = 1
            path.write_text(json.dumps(g), encoding='utf-8')
            return path
    raise Fail('no finished Episode 4 game to build the credits save from: run python qa/autoplay.py --episode 4 first')


EP5_FLAG_HINTS = ('ep5_started', 'ep5_morning_done', 'ship_boarded')
# QA only: a RULE_EXT entry that records the Turning Sky as each battle opens (the start sky and the field hour it read: open
# item 2 of E5-integrate) and every foretelling event (pinned, broken by Turn the Sky or a Break, gone with the Oracle, landed).
SKY_LOG_JS = """(async () => {
  const R = await import('./src/battle/rules.js');
  if (R.RULE_EXT.some((h) => h && h.id === 'qa_sky_log')) return true;
  window.__lqSky = window.__lqSky || [];
  R.RULE_EXT.push({ id: 'qa_sky_log', start(ctx) {
    const st = ctx.state || {}, S = st.sky || null, o = st.options || {}, enc = o.encounterId || o.encounter || o.id || null;
    window.__lqSky.push({ type: 'start', enc, sky: S ? S.sky : null, turnIn: S ? S.turnIn : null, hour: S ? S.hour : null });
    if (typeof ctx.emit !== 'function' || ctx.__qaSky) return;
    ctx.__qaSky = true;
    const emit = ctx.emit.bind(ctx);
    ctx.emit = (ev) => {
      if (ev && typeof ev.type === 'string' && /^foretell/.test(ev.type)) {
        let mira = null;
        try { const m = (typeof ctx.all === 'function' ? ctx.all() : []).find((u) => u.id === 'mira'); if (m) mira = { alive: !!m.alive, mp: m.mp, st: Object.keys(m.statuses || {}) }; } catch (e) {}
        window.__lqSky.push({ type: ev.type, enc, reason: ev.reason || null, moved: !!ev.moved, skill: ev.skill || null, mira });
      }
      return emit(ev);
    };
  } });
  return true;
})()"""


class Episode5(Episode4):
    """Episode 5, "The Last Prophecy" (docs/story/EPISODE5.md, STAGING_EP5.md, MAPS_EP5_A.md, MAPS_EP5_B.md): from the morning after
    the Episode 4 credits (Continue on the credits save, or the title's Episode 5 quick start) to the Episode 5 credits and the
    wake in the Dune Lantern Rest. Sun and shade follow the map agents' reported solutions: a dial is set to an hour by name
    (Episode5.set_hour) and stones and lamps are Shoved along their grooves (Bot.shove_to), walking on the field's live
    collision (running sand is water, FIELD_JS `shade`). Fights are Auto at 2x. Each foretelling of the Sand Oracle is recorded
    with how it ended (Turn the Sky, a Break, landed). The quick start is checked to write no save slot it does not own, and
    no run may log an "unknown ... id" warning."""

    # The EXP each zone is left at on the plan's route (EPISODE5_PLAN 6.1, from the quick start's 8,900): optional fights stop
    # there, so a Continue run (an Episode 4 save arrives at Lv 22) and the quick start both meet the Oracle near Lv 24.
    ZONE_EXP = {'ep5_caravan_road': 9640, 'ep5_lab_f1': 10720, 'ep5_lab_f2': 11500, 'ep5_lab_f3': 12100}
    T9 = [('dunewalker_mail', 1), ('starweave_robe', 1)]
    T10 = [('copperwind_sword', 1), ('armillary_rod', 1)]
    CAP = {'dawn': 'Dawn', 'noon': 'Noon', 'dusk': 'Dusk'}

    def __init__(self, bot, side=True, until=None, start='save'):
        super().__init__(bot, side=side, until=until, start=start)
        self.decisions = collections.Counter()     # puzzle label -> hours chosen + Shove sequences (story_time.py reads the notes)

    # ---- sun and shade
    def shade(self, f=None):
        f = f or self.b.settle()
        return f.get('shade') or {}

    def set_hour(self, dial, hour, label=''):
        """Set the floor's hour at `dial` by name (the dial asks Dawn / Noon / Dusk), walking to it on the live floor."""
        b = self.b
        for attempt in range(3):
            f = b.settle()
            sh = self.shade(f)
            if not sh:
                raise Fail(f'no sun and shade on {f["map"]} ({label})')
            if sh.get('hour') == hour:
                return f
            # the dial's Dawn / Noon / Dusk list takes its first presses only once it is open: wait for it, then pick by name
            b.interact_no_settle(ent_id=dial)
            try:
                b.page.wait_for_function("LQ_DEBUG.scene() === 'choice' && !LQ_DEBUG.state().transition", timeout=8000, polling=20)
                b.frames(12)
                ss = b.scene_state().get('ss') or {}
                b.pick(b.choose(ss.get('options') or [], [self.CAP[hour]]), ss.get('index'))
            except Exception as e:
                b.notes.append(f'{dial}: no hour list ({e.__class__.__name__})')
            f = b.settle()
            if self.shade(f).get('hour') == hour:
                self.decisions[label or dial] += 1
                return f
            b.notes.append(f'{dial}: asked for {hour}, the hour is {self.shade(f).get("hour")} (attempt {attempt + 1})')
        raise Fail(f'{dial} did not set the hour to {hour} ({label})')

    def shove(self, ent_id, target, label=''):
        """One Shove sequence (Bram's Shove, one cell a press) along the stone's or lamp's groove: one decision."""
        f = self.b.settle()
        e = self.b.ent(f, ent_id)
        if e and (e['x'], e['y']) == tuple(target):
            return
        self.b.shove_to(ent_id, target, label=label or ent_id)
        self.decisions[label or ent_id] += 1

    def puzzle_done(self, label):
        n = self.decisions.pop(label, 0)
        if n:
            self.b.notes.append(f'shade {label}: {n} decisions')

    def walk(self, cells, label):
        """Walk to one of `cells`; a foe standing in the only corridor (a Labyrinth guard, back after a reload) is fought first."""
        b = self.b
        cells = [tuple(c) for c in cells]
        try:
            return b.walk_to(cells, label=label)
        except Fail as e:
            b.notes.append(f'{label}: {str(e)[:60]}; fighting through')
            b.hunt(limit=3, label=f'clear the way ({label})')
            return b.walk_to(cells, fight=True, label=label)

    def trigger(self, cells, flag, label, max_s=600):
        if self.has(flag):
            return
        self.walk(cells, label)
        self.b.settle(max_s=max_s)
        if not self.has(flag):
            raise Fail(f'{label} did not set {flag}')

    def round_trip(self, label):
        """Save to this run's own slot only, quit, load it back, and check the Episode 5 world state came back (EPISODE5_PLAN 12,
        saves): latched plates and opened doors kept, the floor at its start hour, every stone and lamp on its authored cell."""
        b = self.b
        before = b.field() or {}
        sb = before.get('shade') or {}
        b.round_trip(self.run_slot or 1, label)
        after = b.settle()
        sa = after.get('shade') or {}
        if not set(sb.get('latched') or []) <= set(sa.get('latched') or []):
            raise Fail(f'after the reload at {label}: latched {sb.get("latched")} -> {sa.get("latched")}')
        opened = lambda f: sorted(e['id'] for e in f['ents'] if e['type'] in ('gate', 'locked_door') and e.get('state') == 'open')
        if not set(opened(before)) <= set(opened(after)):
            raise Fail(f'after the reload at {label}: doors {opened(before)} -> {opened(after)}')
        if sa and sa.get('hour') != sa.get('start'):
            raise Fail(f'after the reload at {label}: the hour is {sa.get("hour")}, not the start hour {sa.get("start")}')
        moved = [(e['id'], (e['x'], e['y']), tuple(e['home'])) for e in after['ents'] if e.get('home') and (e['x'], e['y']) != tuple(e['home'])]
        if moved:
            raise Fail(f'after the reload at {label}: stones or lamps off their authored cells {moved}')
        b.notes.append(f'reload at {label}: hour {sa.get("hour")} (start {sa.get("start")}), latched {sa.get("latched")}, doors {opened(after)}')

    def inn_if_hurt(self, frac=0.7):
        b = self.b
        vit = b.party_vitals()
        if not vit or min(v['hp'] / max(1, v['maxHp']) for v in vit) >= frac:
            return
        f = b.settle()
        if f['map'] != 'ep5_saffron':
            return
        b.through('door_inn')
        self.ensure_map('ep5_sh_inn')
        b.rest_at_inn('ep5_innkeeper')
        b.through('inn_exit', exact=False)

    def ethers(self):
        it = self.b.items()
        return (it.get('ether') or 0) + (it.get('hi_ether') or 0)

    def keep(self, label='', reserve=4, frac=0.3):
        """Upkeep (Bot.maintain) that keeps `reserve` Ethers back for the Sand Oracle, whose foretellings only Mira's MP answers
        (Turn the Sky, 12 MP), and whose Eye has no font: Optimize, Ethers only above the reserve, a font on this map when hurt."""
        b = self.b
        b.menu_optimize_all()
        if self.ethers() > reserve:
            b.top_up_mp(frac)
        b.maybe_rest_at_fonts()

    def sky_log(self):
        return self.b.js('window.__lqSky || []') or []

    # ---- phases
    def title_start(self):
        """Title -> Continue on the Episode 4 credits save (record 1), or Title -> Episode 5: new party -> the slot notice ->
        Start -> name -> the inn. The quick start's row and slot notice are answered with real key presses."""
        b = self.b
        if b.scene() != 'title':
            return
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.frames(10)
        for n in EP3_SLOTS:
            self.slots0[n] = self.slot_raw(n)
        if b.resume and self.start == 'save':
            b.shot('title')
            b.title_continue(1)
            self.run_slot = 1
            b.notes.append(f'resumed from {b.resume} (record 1)')
            b.mark('resume')
            return
        b.page.wait_for_function("(() => { const s = LQ_ENGINE.scene; return !!(s && s.menu && s.menu.items.some(i => i.id === 'ep5')); })()", timeout=60000, polling=50)
        b.frames(6)
        items = [i['id'] for i in (b.js("LQ_ENGINE.scene.menu.items.map(i => ({ id: i.id }))") or [])]
        if 'ep5' not in items:
            raise Fail(f'the title does not offer Episode 5 (items {items})')
        b.shot('title_ep5')
        want = items.index('ep5')
        cols = b.js('LQ_ENGINE.scene.menu.columns') or 1
        rows = b.js('LQ_ENGINE.scene.menu.rows') or len(items)
        for _ in range(12):
            idx = b.js('LQ_ENGINE.scene.menu.index') or 0
            if idx == want:
                break
            if cols > 1 and idx // rows != want // rows:
                b.page.keyboard.press('ArrowRight' if want // rows > idx // rows else 'ArrowLeft')
            else:
                b.page.keyboard.press('ArrowDown' if want > idx else 'ArrowUp')
            b.frames(4)
        b.page.keyboard.press('KeyZ')
        b.frames(10)
        if self.slots0.get(0) is not None:
            b.page.wait_for_function("LQ_DEBUG.scene() === 'ep5Ask'", timeout=10000, polling=30)
            st = b.scene_state()['ss'] or {}
            if st.get('options') != ['back', 'start']:
                raise Fail(f'slot 0 is taken but the quick start showed no slot notice: {st}')
            b.notes.append(f'quick start notice: {st.get("notice")!r}')
            b.shot('ep5_slot_notice')
            b.page.keyboard.press('ArrowDown')
            b.frames(4)
            b.page.keyboard.press('KeyZ')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp5' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        b.frames(10)
        for _ in range(8):
            b.page.keyboard.press('Backspace')
        b.page.keyboard.type(b.hero, delay=30)
        b.frames(6)
        b.shot('name_entry_ep5')
        b.page.keyboard.press('Enter')
        b.page.wait_for_function("LQ_DEBUG.state().scenes.includes('field')", timeout=60000, polling=30)
        b.frames(30)
        g = b.game() or {}
        if g.get('heroName') != b.hero:
            raise Fail(f'hero name is {g.get("heroName")!r}, typed {b.hero!r}')
        self.run_slot = g.get('autosaveSlot')
        b.notes.append(f'quick start: the run saves to slot {self.run_slot} (slot 0 was {"taken" if self.slots0.get(0) else "empty"})')
        if self.slots0.get(0) is not None and self.run_slot == 0:
            raise Fail('the quick start took slot 0 although it holds another game')
        # PLAYTEST_REVIEW_6 fix 3: both packs' sounds are in the manifest before the fade in
        missing = b.js("(() => { const a = LQ_ENGINE.audio, m = a.manifest || (a.real && a.real.manifest) || {}; "
                       "const has = (k, id) => !!((m[k] || {})[id]); return ['valewyn:music', 'saffron:music', 'labyrinth:music', 'sun_dial:sfx', 'sky_turn:sfx']"
                       ".filter((s) => { const [id, k] = s.split(':'); return !has(k, id); }); })()")
        if missing:
            raise Fail(f'the quick start party is missing sounds {missing}')
        b.mark('ep5_new_game')

    def morning(self):
        b = self.b
        f = b.settle()
        if not self.has('ep5_started'):
            raise Fail(f'ep5_morning did not run (on {f["map"]} at {f["leader"]})')
        b.mark('ep5_morning')
        if not b.items().get('star_letter'):
            raise Fail('ep5_morning did not give the star letter')
        g = b.game() or {}
        b.notes.append(f'Episode 5 arrival: Lv {self.level()}, {(g.get("party") or [{}])[0].get("exp")} EXP, {g.get("gold")} G '
                       f'({"the quick start" if self.start == "new" else "the Episode 4 save"})')
        if f['map'] == 'ep4_vw_inn':
            if f['leader']['x'] >= 13:
                b.through('inn_down')
            if self.side:
                self.talk('ep4_innkeeper')
            b.through('inn_exit', exact=False)
        self.ensure_map('ep4_valewyn')
        b.menu_talk()
        self.check_slots('the morning')

    def berth(self):
        b = self.b
        if self.has('ship_arrived'):
            return
        self.ensure_map('ep4_valewyn')
        if self.side:
            self.talk('ada')
        if not self.has('ship_boarded'):
            self.trigger([(32, 31)], 'ship_boarded', 'berth_trig')         # down the gangway (the berth object answers confirm too)
        b.mark('berth')
        if b.settle()['map'] == 'ep4_valewyn':
            b.through('berth_sail', exact=False)
        self.ensure_map('ep5_ship')
        b.settle()
        if not self.has('ship_arrived'):
            raise Fail('ship_night did not run')
        b.mark('ship')

    def ship(self):
        b = self.b
        if self.has('ship_first_fight_done'):
            return
        self.ensure_map('ep5_ship')
        self.trigger([(21, y) for y in range(3, 11)], 'bram_asked', 'bow_trig')
        b.notes.append(f'ship_bram: {"truth (bram_told)" if self.has("bram_told") else "kind (bram_spared)"}')
        self.trigger([(14, y) for y in range(3, 11)], 'ship_first_fight_done', 'fight_row', max_s=900)
        b.mark('first_fight_done')
        b.through('gangway_down', exact=False)
        self.ensure_map('ep5_caravan_road')
        b.settle()
        if not self.has('road_landed'):
            raise Fail('road_landing did not run')
        b.mark('caravan_road')

    def road(self):
        b = self.b
        if self.has('haven_arrived'):
            return
        self.ensure_map('ep5_caravan_road')
        if self.side:
            self.chest('chest_jetty')
        self.trigger([(12, y) for y in range(0, 28)], 'saw_glass_flat', 'road_trig')
        self.hunt(2, label='the jetty road')
        # the island chest at noon (the start hour): the stones' noon shadows are its stair
        if self.side and not (b.opened('ep5_caravan_road', 'chest_isle') or b.opened('ep5_caravan_road', 'chest_isle_bell')):
            try:
                self.set_hour('dial_road', 'noon', label='the Glass Flat')
                self.chest('chest_isle_bell' if self.has('bells_started') else 'chest_isle')
            except Fail as e:
                b.notes.append(f'island chest skipped: {e}')
        # dawn: the obelisk's long shadow is the bridge across the flat
        self.set_hour('dial_road', 'dawn', label='the Glass Flat')
        self.walk([(24, 13), (24, 14), (25, 13)], 'across the Glass Flat')
        self.puzzle_done('the Glass Flat')
        if not self.has('tent_rested'):
            b.rest_at_fire('tent_fire', prefer=['Why is the road empty?', 'Rest', 'Not now'])
        b.visit_shop('omar', [('hourglass_sand', 2)])
        self.keep('the shade tent')
        self.hunt(3, label='the road east')
        if self.side and not b.opened('ep5_caravan_road', 'chest_cistern'):
            try:
                if b.dash_break('crack_cistern', label='cistern'):
                    self.chest('chest_cistern')
            except Fail as e:
                b.notes.append(f'cistern skipped: {e}')
        self.trigger([(44, y) for y in range(6, 28)], 'saw_haven', 'haven_view_trig')
        b.exit_to((51, 7), label='to the Haven')
        self.ensure_map('ep5_saffron')
        b.settle()
        if not self.has('haven_arrived'):
            raise Fail('haven_arrival did not run')
        b.mark('saffron')

    def haven(self):
        b = self.b
        if self.has('gnomon_get'):
            return
        self.ensure_map('ep5_saffron')
        if not self.has('met_sel'):
            self.talk('sel')
            if not self.has('met_sel'):
                raise Fail('meet_sel did not set met_sel')
            b.mark('met_sel')
        if self.side and not self.has('moonwell_seen'):
            try:
                b.interact(ent_id='moonwell', label='the Moonwell')
            except Fail as e:
                b.notes.append(f'Moonwell skipped: {e}')
        b.through('door_smithy')
        self.ensure_map('ep5_sh_smithy')
        b.visit_shop('hassan', self.T9)
        b.through('smithy_exit', exact=False)
        b.menu_optimize_all()
        self.ensure_map('ep5_saffron')
        b.through('door_shop')
        self.ensure_map('ep5_sh_shop')
        b.visit_shop('yasmin', [('hi_potion', 2), ('ether', 4), ('hi_ether', 1)])
        b.through('shop_exit', exact=False)
        self.ensure_map('ep5_saffron')
        if not self.has('star_reading_done'):
            b.through('door_tower')
            self.ensure_map('ep5_sh_observatory')
            self.trigger([(x, 11) for x in range(1, 11)], 'star_reading_done', 'reading_trig', max_s=900)
            if not self.has('sky_learned'):
                raise Fail('star_reading did not teach Turn the Sky')
            b.mark('star_reading')
            b.interact_no_settle(ent_id='save_bell_tower')
            self.save_from_bell(self.run_slot or 1)
            b.close_menu()
            b.through('tower_exit', exact=False)
        self.ensure_map('ep5_saffron')
        self.inn_if_hurt(0.8)
        self.ensure_map('ep5_saffron')
        self.trigger([(21, 4), (22, 4)], 'gnomon_get', 'gate_trig')
        b.mark('sel_gate')
        b.through('north_door', exact=False)
        self.ensure_map('ep5_lab_f1')
        b.settle()
        if not self.has('lab_f1_arrived'):
            raise Fail('lab_f1_arrival did not run')
        b.mark('lab_f1')

    def lab_f1(self):
        b = self.b
        if self.has('lab_f1_done'):
            return
        self.ensure_map('ep5_lab_f1')
        if self.side:
            self.chest('chest_a')
        # B, Two Shadows: dawn for the Dune Key on the strip, dusk to walk row 17 east
        if not b.opened('ep5_lab_f1', 'chest_dune'):
            self.set_hour('dial_a', 'dawn', label='F1 two shadows')
            self.chest('chest_dune')
        self.hunt(2, label='two shadows')
        if not self.has('sel_memory_1'):
            self.set_hour('dial_a', 'dusk', label='F1 two shadows')
            self.walk([(27, 17)], 'east along row 17')
            self.puzzle_done('F1 two shadows')
            if self.side and not b.opened('ep5_lab_f1', 'chest_b'):
                try:
                    self.chest('chest_b')
                except Fail as e:
                    b.notes.append(f'chest_b skipped: {e}')
            # C, the Groove: Shove ss_c up twice, then dawn: its long shadow west along row 4 into the camp court
            self.hunt(2, label='the groove')
            self.shove('ss_c', (30, 4), label='F1 the groove')
            self.set_hour('dial_b', 'dawn', label='F1 the groove')
            self.trigger([(24, y) for y in range(3, 11)], 'sel_memory_1', 'memory1_trig')
            self.puzzle_done('F1 the groove')
        self.keep('the camp court')
        # D, the Sun Plate: the Dune Key door, Shove plt_m up, dawn latches the plate (the sun gate), noon for the colonnade path
        if not self.has('plate_f1_open'):
            self.hunt(2, label='the corridor')
            b.through('door_d')
            self.shove('plt_m', (11, 17), label='F1 the sun plate')
            self.set_hour('dial_c', 'dawn', label='F1 the sun plate')
            if not self.has('plate_f1_open'):
                raise Fail('dawn on plate_d did not latch plate_f1_open')
        self.set_hour('dial_c', 'noon', label='F1 the sun plate')
        self.puzzle_done('F1 the sun plate')
        self.hunt(2, label='the sun plate')
        if not b.opened('ep5_lab_f1', 'chest_wraps'):
            try:
                if b.dash_break('crack_d', label='the cracked base'):
                    self.chest('chest_wraps')
                    if self.has('bells_started'):
                        self.chest('chest_bell3')
            except Fail as e:
                b.notes.append(f'Nomad Wraps skipped: {e}')
        self.keep('the sun plate')
        self.round_trip('F1 the sun plate')
        self.ensure_map('ep5_lab_f1')
        self.check_slots('F1')
        # E, the Far Court: west along row 14 at noon, through the latched sun gate; dawn for the Nomad Sun Key
        self.walk([(3, 14)], 'the colonnade path')
        self.walk([(3, 12), (3, 11), (3, 10)], 'through the sun gate')
        self.hunt(2, label='the far court')
        if not b.opened('ep5_lab_f1', 'chest_sunkey'):
            self.set_hour('dial_d', 'dawn', label='F1 the far court')
            self.chest('chest_sunkey')
            if not b.items().get('sun_key'):
                raise Fail('the far court chest did not give the Nomad Sun Key')
        if self.side:
            try:
                self.set_hour('dial_d', 'dusk', label='F1 the far court')
                self.chest('chest_bell2' if self.has('bells_started') else 'chest_bell2_alt')
            except Fail as e:
                b.notes.append(f'far court second chest skipped: {e}')
        self.puzzle_done('F1 the far court')
        self.hunt(2, label='the stair')
        self.keep('end of F1')
        self.trigger([(13, 2)], 'lab_f1_done', 'stair_trig')
        f = b.settle()
        if f['map'] == 'ep5_lab_f1':
            b.through('stair_f2', exact=False)
        self.ensure_map('ep5_lab_f2')
        b.settle()
        if not self.has('lab_f2_arrived'):
            raise Fail('lab_f2_arrival did not run')
        b.mark('lab_f2')

    def lab_f2(self):
        b = self.b
        if self.has('lab_f2_done'):
            return
        self.ensure_map('ep5_lab_f2')
        # B, the Long Shafts: Shove pl_b up twice into the dawn shaft; through the walk gap into the middle
        if not self.has('sel_memory_2'):
            self.shove('pl_b', (14, 13), label='F2 the long shafts')
            self.hunt(2, label='the long shafts')
            self.trigger([(x, 8) for x in range(2, 8)], 'sel_memory_2', 'memory2_trig')
            self.puzzle_done('F2 the long shafts')
        if not self.has('vex_gallery_met'):
            self.trigger([(19, y) for y in range(3, 9)], 'vex_gallery_met', 'vex_trig', max_s=900)
            b.notes.append(f'vex_gallery: {"truth (star_restored)" if self.has("star_restored") else "hidden (star_hidden)"}')
            b.mark('vex_gallery')
        self.hunt(2, label='the star floor')
        # D, Two Windows: dusk through the K1 door cell; Shove pl_d down twice; dawn through the K2 door cell to the second key
        if not b.opened('ep5_lab_f2', 'chest_key'):
            self.set_hour('dial_u', 'dusk', label='F2 two windows')
            self.walk([(35, 9), (35, 10)], 'through the K1 door cell')
            self.hunt(2, label='two windows')
            self.shove('pl_d', (36, 15), label='F2 two windows')
            self.set_hour('dial_m', 'dawn', label='F2 two windows')
            self.walk([(33, 17), (33, 18)], 'through the K2 door cell')
            self.chest('chest_key')
            self.puzzle_done('F2 two windows')
        self.keep('two windows')
        self.hunt(3, label='the approach')
        if self.side and not b.opened('ep5_lab_f2', 'chest_ap'):
            try:
                self.chest('chest_ap')
            except Fail as e:
                b.notes.append(f'approach chest skipped: {e}')
        b.through('door_e')
        f = b.settle()
        if b.ent(f, 'font_l2b'):
            try:
                b.rest_at_font('font_l2b', label='font F2')
            except Fail as e:
                b.notes.append(f'font F2 skipped: {e}')
        self.round_trip('F2 mirror hall')
        self.ensure_map('ep5_lab_f2')
        self.check_slots('F2')
        for attempt in range(5):
            if self.has('knight_defeated'):
                break
            if attempt:
                b.notes.append(f'Mirage Knight attempt {attempt + 1} (Lv {self.level()})')
                self.keep('before the Knight again')
            b.mark('mirage_knight')
            b.walk_to([(x, 15) for x in range(18, 28)], label='knight_trig')
            b.settle(max_s=900)
        if not self.has('knight_defeated'):
            raise Fail('the Mirage Knight did not fall in 5 attempts')
        self.trigger([(22, 12)], 'lab_f2_done', 'stair_trig')

    def town_trip(self):
        """After the Gallery: the F2 lift to F1's Oasis Gate, out to the Haven's north gate, the two tier 10 pieces at the
        Copperwind (plan 7.6; the simulator's lab_f3 row), the inn if hurt; then the north door, F1's lift to F2, the F3 stair."""
        b = self.b
        if not self.has('lab_f2_done') or getattr(self, '_tripped', False) or self.has('lab_f3_arrived'):
            return
        self._tripped = True
        self.ensure_map('ep5_lab_f2')
        b.through('lift_f2_short', exact=False)
        self.ensure_map('ep5_lab_f1')
        b.through('to_haven', exact=False)
        self.ensure_map('ep5_saffron')
        b.mark('town_trip')
        b.through('door_smithy')
        b.visit_shop('hassan', self.T10)
        b.through('smithy_exit', exact=False)
        b.menu_optimize_all()
        self.ensure_map('ep5_saffron')
        b.through('door_shop')
        b.visit_shop('yasmin', [('ether', 6), ('hi_ether', 2), ('hi_potion', 2)])
        b.through('shop_exit', exact=False)
        self.inn_if_hurt(0.95)
        self.ensure_map('ep5_saffron')
        b.through('north_door', exact=False)
        self.ensure_map('ep5_lab_f1')
        b.through('lift_f1', exact=False)
        self.ensure_map('ep5_lab_f2')
        b.through('stairs_f3', exact=False)
        self.ensure_map('ep5_lab_f3')
        b.settle()
        if not self.has('lab_f3_arrived'):
            raise Fail('lab_f3_arrival did not run')
        b.mark('lab_f3')

    def lab_f3(self):
        b = self.b
        if self.has('oracle_door_open'):
            return
        f = b.settle()
        if f['map'] == 'ep5_lab_f2':
            b.through('stairs_f3', exact=False)
            self.ensure_map('ep5_lab_f3')
            b.settle()
            b.mark('lab_f3')
        self.ensure_map('ep5_lab_f3')
        if not self.has('sel_walked_in'):
            raise Fail('sel_walks_in did not run')
        # Shelter: roll the lamp east off the moat, cross in the dark
        if not self.has('landing_shelter'):
            if b.settle()['leader']['y'] < 9:
                b.through('down_shelter')
            self.shove('lamp_s', (20, 11), label='F3 shelter')
            self.hunt(2, label='shelter')
            self.trigger([(x, 14) for x in range(14, 19)], 'landing_shelter', 'shelter_trig')
            self.puzzle_done('F3 shelter')
        # Truth: put the stone between the lamp and the moat
        if not self.has('landing_truth'):
            b.through('down_truth')
            self.hunt(2, label='truth')
            self.shove('ss_t', (16, 20), label='F3 truth')
            self.trigger([(x, 24) for x in range(14, 19)], 'landing_truth', 'truth_trig')
            self.puzzle_done('F3 truth')
            if self.side and not b.opened('ep5_lab_f3', 'chest_bow'):
                try:
                    b.reveal_near([(7, 24)], label='the faint bridge')
                    self.chest('chest_bow')
                except Fail as e:
                    b.notes.append(f'Starwright Bow skipped: {e}')
        self.keep('after the truth')
        # Return: roll the second lamp east, the moon plate falls dark and latches, the moon gate opens
        if not self.has('landing_return'):
            b.through('down_return')
            self.hunt(2, label='return')
            self.shove('lamp_r2', (20, 29), label='F3 return')
            f = b.settle()
            if 'plate_r' not in (self.shade(f).get('latched') or []):
                b.notes.append(f'plate_r not latched after the lamp (latched {self.shade(f).get("latched")})')
            self.trigger([(16, 32)], 'landing_return', 'return_trig', max_s=900)
            self.puzzle_done('F3 return')
        b.settle(max_s=900)
        if not self.has('oracle_door_open'):
            raise Fail('sel_memory_3 did not open the Sun Keyhole')
        b.mark('sel_memory_3')

    def oracle(self):
        b = self.b
        if self.has('oracle_defeated'):
            return
        f = b.settle()
        if f['map'] == 'ep5_lab_f3':
            if b.ent(f, 'down_keyhole') and f['leader']['y'] < 35:
                b.through('down_keyhole')
            if self.side:
                self.chest('chest_hourglass')
            self.keep('the keyhole', reserve=0, frac=0.9)      # Mira walks into the Eye with her MP for Turn the Sky
            b.notes.append(f'into the Eye with {self.ethers()} Ethers, Mira MP {[(v["mp"], v["maxMp"]) for v in b.party_vitals() if v["id"] == "mira"]}')
            self.round_trip('before the Sand Oracle')
            self.ensure_map('ep5_lab_f3')
        for attempt in range(5):
            f = b.settle()
            if f['map'] == 'ep5_lab_f3':
                b.through('door_oracle', exact=False)
            self.ensure_map('ep5_lab_oracle')
            if attempt == 0:
                b.mark('sand_oracle')
            b.notes.append(f'Sand Oracle attempt {attempt + 1}: Lv {self.level()}')
            b.walk_to([(x, 13) for x in range(1, 23)], label='oracle_trig')
            b.settle(max_s=1500)
            if self.has('oracle_defeated'):
                break
            f = b.settle()
            if f['map'] == 'ep5_lab_oracle':
                b.through('eye_exit')
            self.ensure_map('ep5_lab_f3')
            self.keep('before the Oracle again')
        if not self.has('oracle_defeated'):
            raise Fail('the Sand Oracle did not fall in 5 attempts')
        b.settle(max_s=900)
        if not self.has('chart_restored') or not b.items().get('name_fragment_5'):
            raise Fail('oracle_after did not restore the chart and give the fifth fragment')
        b.mark('oracle_after')
        log = self.sky_log()
        ended = collections.Counter(e.get('reason') or 'landed' for e in log if e.get('type') in ('foretell_broken', 'foretell_fall') and e.get('enc') == 'oracle')
        read = sum(1 for e in log if e.get('type') == 'foretell' and not e.get('moved') and e.get('enc') == 'oracle')
        b.notes.append(f'Sand Oracle prophecies: {read} read; ended {dict(ended)} (turned = Turn the Sky, break = a Break, gone = the Oracle fell, landed = it struck)')
        landed = [e.get('mira') for e in log if e.get('type') == 'foretell_fall' and e.get('enc') == 'oracle']
        if landed:
            b.notes.append(f'Mira as each landed foretelling fell: {landed[:12]}')

    def ending(self):
        b = self.b
        if self.has('ep5_complete') and (b.game() or {}).get('counters', {}).get('credits5_rolled'):
            return
        f = b.settle()
        if f['map'] == 'ep5_lab_oracle':
            b.through('lift_out', exact=False)
        b.settle(max_s=900)                                          # every_road, ep5_ending, the credits
        if not self.has('ep5_complete'):
            raise Fail(f'ep5_complete was not set (on {b.settle()["map"]})')
        for _ in range(500):
            sc = b.handle()
            fs = b.field() or {}
            if sc == 'field' and fs.get('map') == 'ep5_sh_inn' and not fs.get('locked'):
                break
        f = b.settle()
        if f['map'] != 'ep5_sh_inn':
            raise Fail(f'after the Episode 5 credits the party woke on {f["map"]}, not ep5_sh_inn')
        if not (b.game() or {}).get('counters', {}).get('credits5_rolled'):
            raise Fail('credits5_rolled was not counted')
        b.mark('ep5_credits_done')
        self.check_slots('the credits')

    def epilogue5(self):
        b = self.b
        if not self.side or not self.has('ep5_complete'):
            return
        f = self.ensure_map('ep5_sh_inn')
        if f['leader']['x'] >= 13:
            b.through('inn_down')
        self.talk('ep5_innkeeper')
        b.through('inn_exit', exact=False) if b.ent(b.settle(), 'inn_exit') else b.exit_to((10, 11), label='inn door')
        self.ensure_map('ep5_saffron')
        self.talk('yara')
        b.menu_talk()
        b.mark('ep5_epilogue')

    def run(self):
        b = self.b
        b.mark('boot')
        phases = [('ep5_start', self.title_start), ('ep5_morning', self.morning), ('berth', self.berth), ('ship', self.ship),
                  ('road', self.road), ('haven', self.haven), ('lab_f1', self.lab_f1), ('lab_f2', self.lab_f2), ('town_trip', self.town_trip),
                  ('lab_f3', self.lab_f3), ('oracle', self.oracle), ('ending', self.ending), ('epilogue5', self.epilogue5)]
        for step_id, fn in phases:
            print(f'-- {step_id}', flush=True)
            if step_id == 'ep5_morning' and self.has('ship_boarded'):
                continue                                          # a resumed game past the morning
            fn()
            if step_id == 'ep5_start':
                b.js(SKY_LOG_JS)
            if b.resume and step_id == 'ep5_start':
                b.resume = None
                self.ensure_any()
            b.check_errors()
            if self.until == step_id:
                print(f'stopping after {step_id} (--until)', flush=True)
                return
        self.check_slots('the end')
        starts = [e for e in self.sky_log() if e.get('type') == 'start']
        b.notes.append('battle skies: ' + ', '.join(f'{e.get("enc")} {e.get("sky")}@{e.get("hour")}' for e in starts[:30]))
        bad = sorted({w for w in b.warnings if re.search(r'unknown .*\bid\b|unknown (object|target|sprite|map|item|npc|encounter|scene)|no actor|no path|no scene', w, re.I)})
        if bad:
            raise Fail(f'{len(bad)} unknown-id or staging warnings: {bad[:6]}')
        b.notes.append('warnings: no "unknown ... id", "no actor", "no path" or "no scene" line in the run')


# ================================================================================================ the Deep Stacks (C3-sim-bot)
CAVE_OUT = HERE / 'cave' / 'out'
CAVE_JS = 'LQ_DEBUG.state().cave'
CAVE_CHEAP_TILES = 24          # --cave-chests cheap: a red chest only when the detour to it and on to the stairs is at most this many tiles


class CaveRoute:
    """The Deep Stacks from the library (docs/DEEP_STACKS_PLAN.md 11, docs/briefs/C3-sim-bot.md 3), on a page with ?cave=1.

    A game past the Episode 1 credits (LQ_DEBUG.newGameEp2 with the run's seed, as the Episode 2 bot starts), the library,
    the trapdoor, Hollis's offer (Begin, Go down), then floor by floor with the real walk model: the floor's grid is the
    generated module rebuilt in Node from the reading's seed (qa/autoplay_grid.mjs --cave), every reachable foe is fought by
    the generic battle handler (Auto battle), the blue chest always and red chests when the detour is cheap, the equip prompt
    answered Yes, upkeep through the real menu (Feathers, Potions, Ethers, Optimize), and the stairs walked. At or after
    floor `target` the reading is banked with a Keeper's Bookmark from the Items screen; without one the bot goes on to the
    next landing (which lends one). Then a second reading: Optimize equips the vault, B5 is reached with a vault unique worn.
    A wipe is recorded and a new reading started (at most `readings` in all). resume=True instead: B7, a new tab, the
    title's "Resume the Deep Stacks (B7)" row, B7 again at its arrival.
    Writes qa/cave/out/bot_<device>_s<seed>.json and prints CAVE_BOT: <json> as its last line."""

    def __init__(self, bot, target=30, seed=1, readings=3, again=5, resume=False, chests='all'):
        self.b = bot
        self.cheap = CAVE_CHEAP_TILES if chests == 'cheap' else 10 ** 6     # 'all': every reachable chest, the simulator's policy
        self.target = target
        self.seed = seed
        self.readings = readings
        self.again = again
        self.resume_test = resume
        self.floors = []            # per floor: {reading, floor, game_s, wall_s, fights, chests, level, hp}
        self.wipes = []
        self.banked = None
        self.second = None
        self.events = []
        self.reading = 0
        self.fight_count = 0

    # ---------------------------------------------------------------- views
    def cave(self):
        return self.b.js(CAVE_JS) or {}

    def stairs(self):
        return self.b.call('caveStairs') or {}

    def vitals(self):
        return self.b.party_vitals()

    def note(self, text):
        self.events.append(text)
        print('  cave:', text, flush=True)

    def cave_grid(self, map_id):
        """Prime the bot's grid cache for a Deep Stacks map: the generated floor of THIS reading (the ids repeat per reading)."""
        b = self.b
        c = self.cave()
        seed = c.get('seed') or 0
        key = ('cave', map_id, seed)
        if key not in b.grids:
            args = ['node', str(HERE / 'autoplay_grid.mjs'), map_id, f'--cave={seed}', '--vault=' + ','.join(c.get('vault') or [])]
            r = subprocess.run(args, capture_output=True, text=True, timeout=60, cwd=str(NEXT))
            if r.returncode != 0:
                raise Fail(f'grid {map_id} (seed {seed}): {r.stderr[-400:]}')
            g = json.loads(r.stdout)
            g['by_id'] = {e['id']: e for e in g['events']}
            b.grids[key] = g
        b.gated[map_id] = []
        b.grids[(map_id, ())] = b.grids[key]       # what Bot.grid() looks up for this map from now on
        return b.grids[key]

    def on_cave_map(self):
        f = self.b.settle()
        if f['map'].startswith('cave_'):
            self.cave_grid(f['map'])
        return f

    # ---------------------------------------------------------------- the way in
    def wait_pack(self):
        b = self.b
        b.page.wait_for_function('window.LQ_PACKS && LQ_PACKS.packReady("cave")', timeout=60000, polling=100)
        b.page.wait_for_function('LQ_DEBUG.commands().includes("caveBegin")', timeout=20000, polling=100)

    def new_game(self):
        b = self.b
        self.wait_pack()
        b.js(f'LQ_DEBUG.newGameEp2({json.dumps(b.hero)}, {{ scene: "none", seed: {int(self.seed)} }})')
        if not b.flag('ep1_complete'):
            raise Fail('newGameEp2 did not set ep1_complete')
        # the library door's arrival (library.js start): the bot walks to the trapdoor from there
        b.js('LQ_DEBUG.warp("library", 10, 13, "up")')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'field'", timeout=30000, polling=30)
        b.settle()
        b.mark('cave_library')

    def to_hall(self):
        b = self.b
        f = b.settle()
        if f['map'] == 'cave_landing0':
            return f
        if f['map'] != 'library':
            raise Fail(f'expected the library, on {f["map"]}')
        door = next((e for e in f['ents'] if e['id'] == 'stacks_trapdoor'), None)
        if not door:
            raise Fail(f'no trapdoor stair in the library ({[e["id"] for e in f["ents"] if "stacks" in e["id"]]})')
        b.shot('cave_trapdoor')
        # the trapdoor is on the mezzanine: up the library's inner stair (a same-map stair at 12,2 -> 15,2), then onto it
        if (f['leader']['x'], f['leader']['y']) != (15, 2) and not (f['leader']['x'] >= 15 and f['leader']['y'] <= 9):
            b.through('library_up', label='the mezzanine stair')
        b.walk_to([tuple(door['cells'][0])], label='the trapdoor')
        b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === 'cave_landing0' && !f.loading; })()", timeout=30000, polling=30)
        f = self.on_cave_map()
        b.shot('cave_hall')
        return f

    def begin(self):
        """Hollis's desk: the first talk (rules, offer) or the offer; Begin, Go down. Lands on B1 of a new reading."""
        b = self.b
        f = self.to_hall()
        self.cave_grid('cave_landing0')
        before = self.cave()
        desk = next((e for e in f['ents'] if e['id'] in ('stacks_desk', 'archivist_fallback')), None)
        if desk:
            b.interact(ent_id=desk['id'], prefer=['Begin', 'Go down'], label='Hollis')
        elif b.actor(f, 'hollis'):
            b.interact(actor_id='hollis', prefer=['Begin', 'Go down'], label='Hollis')
        else:
            raise Fail('no Hollis and no desk in the hall')
        b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === 'cave_b1' && !f.loading; })()", timeout=60000, polling=50)
        f = self.on_cave_map()
        c = self.cave()
        if not c.get('inRun') or c.get('floor') != 1:
            raise Fail(f'the reading did not start ({c})')
        self.reading += 1
        lv = [m['level'] for m in self.vitals()]
        if lv != [1, 1, 1]:
            raise Fail(f'the party is not level 1 on B1 ({lv})')
        if (b.js('LQ_DEBUG.fieldState().floorTag')) != 'B1':
            raise Fail('the floor tag does not read B1')
        self.note(f'reading {self.reading}: seed {c.get("seed")}, vault {c.get("vault")} (record before {before.get("record")})')
        b.mark(f'cave_r{self.reading}_b1')
        return f

    # ---------------------------------------------------------------- upkeep (the real menu)
    def menu_safe(self, label, fn, *args):
        """A menu errand that a chasing foe can interrupt (the Menu press lands as a battle starts): settle and try once more,
        then skip it this time. Only timeouts are caught; anything else is a real failure."""
        for attempt in range(2):
            try:
                return fn(*args)
            except Exception as e:  # noqa: BLE001  (Playwright's TimeoutError)
                if 'Timeout' not in type(e).__name__:
                    raise
                self.note(f'{label}: the menu did not come up ({type(e).__name__}); {"settle and retry" if attempt == 0 else "skipped"}')
                for _ in range(3):
                    try:
                        self.b.close_menu()
                        self.b.settle()
                        break
                    except Exception:  # noqa: BLE001
                        self.b.frames(30)
        return False

    def mira_heals(self, below=0.6, reserve=0.25):
        """Menu -> Magic -> Mira -> Mend (Mending Rain for two or more) on anyone under `below`, while she keeps `reserve` of her
        MP: the descent simulator's field policy (tools/sim/cave.mjs fieldCare), through the real screens. Returns the casts."""
        b = self.b
        vit = self.vitals()
        mi = next((i for i, v in enumerate(vit) if v['id'] == 'mira'), None)
        hurt = lambda vs: [i for i, v in enumerate(vs) if 0 < v['hp'] < v['maxHp'] * below]
        if mi is None or vit[mi]['hp'] <= 0 or not hurt(vit) or vit[mi]['mp'] - 4 < vit[mi]['maxMp'] * reserve:
            return 0
        SCR = "(() => { const sc = LQ_ENGINE.scene && LQ_ENGINE.scene.screen; if (!sc || !sc.list) return null; return { ids: sc.list.items.map(i => i.id), dis: sc.list.items.map(i => !!i.disabled), index: sc.list.index, picker: sc.picker ? sc.picker.list.index : null }; })()"
        b.open_menu()
        b.menu_command('magic')
        b.frames(4)
        b.pick(mi, (b.scene_state()['ss'] or {}).get('member') or 0)
        b.frames(6)
        casts = 0
        for _ in range(8):
            vit = self.vitals()
            h = sorted(hurt(vit), key=lambda i: vit[i]['hp'] / max(1, vit[i]['maxHp']))
            m = vit[mi]
            if not h or m['hp'] <= 0:
                break
            sc = b.js(SCR)
            if not sc:
                break
            want = 'mending_rain' if len(h) >= 2 and 'mending_rain' in sc['ids'] and not sc['dis'][sc['ids'].index('mending_rain')] else 'mend'
            cost = 10 if want == 'mending_rain' else 4
            if want not in sc['ids'] or sc['dis'][sc['ids'].index(want)] or m['mp'] - cost < m['maxMp'] * reserve:
                break
            if sc['picker'] is not None:
                b.tap('cancel', 4)                          # back to the list (the picker belongs to the last spell)
                sc = b.js(SCR) or sc
            b.pick(sc['ids'].index(want), sc['index'])      # the spell: opens the member picker
            b.frames(6)
            sc = b.js(SCR) or {}
            if sc.get('picker') is None:
                break
            b.pick(h[0], sc['picker'])
            b.frames(12)
            casts += 1
        b.close_menu()
        if casts:
            print(f'  mend x{casts}', flush=True)
        return casts

    def care(self):
        """Between fights: a Feather for a fallen member, Mira's Mend above a quarter of her MP for anyone under 60%, a Potion
        for anyone still under 45%, an Ether for Mira under 30% (the descent simulator's field policy, by the real menu)."""
        b = self.b
        for _ in range(3):
            vit = self.vitals()
            down = [i for i, v in enumerate(vit) if v['hp'] <= 0]
            if down and b.items().get('phoenix_feather', 0) > 0:
                if not self.menu_safe('feather', b.menu_use_item, 'phoenix_feather', down[0]):
                    break
                continue
            break
        self.menu_safe('mend', self.mira_heals)
        for _ in range(4):
            vit = self.vitals()
            down = [i for i, v in enumerate(vit) if v['hp'] <= 0]
            items = b.items()
            if down and items.get('phoenix_feather', 0) > 0:
                if not self.menu_safe('feather', b.menu_use_item, 'phoenix_feather', down[0]):
                    break
                continue
            rich = items.get('potion', 0) + items.get('hi_potion', 0) > 6            # a full bag tops up sooner (the sim's FIELD)
            low = sorted([(v['hp'] / max(1, v['maxHp']), i, v) for i, v in enumerate(vit) if 0 < v['hp'] < v['maxHp'] * (0.7 if rich else 0.45)])
            if low:
                _, i, v = low[0]
                pid = 'hi_potion' if v['maxHp'] - v['hp'] > 150 and items.get('hi_potion', 0) > 0 else 'potion' if items.get('potion', 0) > 0 else 'hi_potion' if items.get('hi_potion', 0) > 0 else None
                if pid and self.menu_safe('potion', b.menu_use_item, pid, i):
                    continue
            break
        # an Ether for Mira only (her MP is the party's healing; the hero's and Bram's techs can wait), as the simulator does
        vit = self.vitals()
        mi = next((i for i, v in enumerate(vit) if v['id'] == 'mira'), None)
        items = b.items()
        if mi is not None and vit[mi]['hp'] > 0 and vit[mi]['mp'] < vit[mi]['maxMp'] * 0.3:
            eid = 'hi_ether' if vit[mi]['maxMp'] - vit[mi]['mp'] > 30 and items.get('hi_ether', 0) > 0 else 'ether' if items.get('ether', 0) > 0 else 'hi_ether' if items.get('hi_ether', 0) > 0 else None
            if eid:
                self.menu_safe('ether', b.menu_use_item, eid, mi)

    # ---------------------------------------------------------------- one floor
    def path_len(self, f, start, goals):
        passable, ecells = self.b.model(f, fight=True)
        p = self.b.bfs(start, [tuple(g) for g in goals], passable, stop_at_enemy=ecells)
        return None if p is None else len(p)

    def fight_all(self, label):
        """Every reachable visible foe on the floor (Bot.hunt's walk into each, care after every fight)."""
        b = self.b
        fights = 0
        for _ in range(16):
            f = b.settle()
            foes = [a for a in f['actors'] if a['kind'] == 'enemy' and not a['fighting']]
            if not foes:
                break
            before = len(b.battles)
            b.hunt(limit=1, label=label)
            f = b.settle()
            if len(b.battles) > before:
                fights += len(b.battles) - before
                if not self.cave().get('inRun'):
                    return fights                  # a wipe: the Stacks closed
                self.care()
            elif not [a for a in f['actors'] if a['kind'] == 'enemy' and not a['fighting']]:
                break
            else:
                # a foe nobody can reach (behind another, on a ledge): move on after one more look
                passable, ecells = b.model(f, fight=True)
                L = (f['leader']['x'], f['leader']['y'])
                if all(b.bfs(L, [(a['x'], a['y'])], passable, stop_at_enemy=ecells) is None for a in f['actors'] if a['kind'] == 'enemy'):
                    break
        return fights

    def open_chests(self):
        """The blue chest always, red ones when the detour is cheap (the stairs room is where the bot is going)."""
        b = self.b
        opened = 0
        for _ in range(6):
            f = b.settle()
            if not self.cave().get('inRun'):
                return opened
            chests = [c for c in (b.call('caveChests') or []) if c['state'] != 'open']
            if not chests:
                break
            st = self.stairs()
            sx, sy = st['stairs']
            L = (f['leader']['x'], f['leader']['y'])
            direct = self.path_len(f, L, [(sx, sy)]) or 0
            best = None
            for c in chests:
                to_c = self.path_len(f, L, [tuple(c['front'])])
                if to_c is None:
                    continue
                on = self.path_len(f, tuple(c['front']), [(sx, sy)]) or 0
                detour = to_c + on - direct
                if c['tier'] == 'blue' or detour <= self.cheap or st.get('landing'):
                    if best is None or detour < best[0]:
                        best = (detour, c)
            if not best:
                break
            c = best[1]
            fought = len(b.battles)
            try:
                b.interact(ent_id=c['id'], label=f'chest {c["id"]}')
            except Fail as e:
                self.note(f'chest {c["id"]} skipped: {e}')
                break
            opened += 1
            if len(b.battles) > fought and self.cave().get('inRun'):
                self.care()                     # a guard or a chaser caught the party on the way: upkeep before the next room
            if c['tier'] == 'blue':
                self.note(f'blue chest on B{self.cave().get("floor")}: blues {self.cave().get("blues")}')
        return opened

    def descend(self):
        """Clear the floor the way the bot plays it, then the stairs. Returns the new floor (0 after a wipe)."""
        b = self.b
        c = self.cave()
        floor = c['floor']
        t0 = (b.game() or {}).get('playtime', 0)
        w0 = time.time()
        f = self.on_cave_map()
        # the foes the floor places against the foes standing on arrival (a reading after another one in the same session
        # finds the earlier reading's defeated foe ids still marked gone by the field: reported, not worked around)
        placed = sum(1 for e in self.cave_grid(f['map'])['events'] if e.get('type') == 'enemy')
        present = sum(1 for a in f['actors'] if a['kind'] == 'enemy')
        if present < placed:
            self.note(f'B{floor} (reading {self.reading}): {placed} foes placed, {present} on arrival')
        fights = self.fight_all(f'B{floor}')
        chests = 0
        if self.cave().get('inRun'):
            chests = self.open_chests()
            fights += self.fight_all(f'B{floor} again')        # a chest's guard, a wanderer that came back
        if not self.cave().get('inRun'):
            self.wipe(floor)
            return 0
        if floor % 3 == 0 or chests:
            self.menu_safe('optimize', b.menu_optimize_all)
        self.care()
        vit = self.vitals()
        row = {'reading': self.reading, 'floor': floor, 'fights': fights, 'chests': chests, 'foes_placed': placed, 'foes_present': present,
               'level': round(sum(v['level'] for v in vit) / len(vit), 1),
               'hp': round(sum(max(0, v['hp']) for v in vit) / max(1, sum(v['maxHp'] for v in vit)), 2)}
        if floor >= 100:
            self.floors.append({**row, 'game_s': 0, 'wall_s': round(time.time() - w0, 1)})
            return floor
        st = self.stairs()
        sx, sy = st['stairs']
        f = b.settle()
        door = next((e for e in f['ents'] if e['type'] == 'door' and e.get('to') and str(e['to'][0]).startswith('cave_b')), None)
        cell = tuple(door['cells'][0]) if door else (sx, sy - 1)
        for attempt in range(4):
            try:
                b.walk_to([cell], fight=True, label=f'B{floor} stairs')
            except Fail as e:
                self.note(f'B{floor} stairs walk: {e}')
                self.fight_all(f'B{floor} stairs clear')
            if self.cave().get('floor') != floor or not self.cave().get('inRun'):
                break
            f = b.settle()
        if not self.cave().get('inRun'):
            self.wipe(floor)
            return 0
        if self.cave().get('floor') == floor:
            raise Fail(f'B{floor}: could not take the stairs at {cell}')
        b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && !f.loading && !f.pendingWarp; })()", timeout=30000, polling=30)
        self.on_cave_map()
        self.fight_count += fights
        row.update({'game_s': round((b.game() or {}).get('playtime', 0) - t0, 1), 'wall_s': round(time.time() - w0, 1)})
        self.floors.append(row)
        nf = self.cave().get('floor')
        print(f'  B{floor} -> B{nf}: {fights} fights, {chests} chests, Lv {row["level"]}, HP {int(row["hp"] * 100)}%, {row["game_s"] / 60:.1f} game min, {row["wall_s"]:.0f} s wall', flush=True)
        if nf % 10 == 0:
            b.shot(f'cave_b{nf}_landing')
        return nf

    def wipe(self, floor):
        b = self.b
        b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === 'cave_landing0' && !f.loading; })()", timeout=90000, polling=50)
        b.settle()
        c = self.cave()
        last = c.get('lastExit') or {}
        if last.get('how') != 'die':
            raise Fail(f'the Stacks closed but lastExit is {last}')
        self.wipes.append({'reading': self.reading, 'floor': floor, 'lost': last.get('lost')})
        self.note(f'wipe on B{floor} (reading {self.reading}); lost {last.get("lost")}')
        b.shot(f'cave_wipe_b{floor}')

    # ---------------------------------------------------------------- the way out
    def bank(self):
        """Items -> Key items -> the Keeper's Bookmark -> Close it."""
        b = self.b
        c = self.cave()
        floor = c['floor']
        b.open_menu()
        b.menu_command('items')
        b.frames(6)
        b.tap('pageR', 6)
        ids = b.js("(() => { const s = LQ_ENGINE.scene; return s.screen && s.screen.list ? s.screen.list.items.map(i => i.id) : []; })()")
        if 'keepers_bookmark' not in ids:
            b.close_menu()
            raise Fail(f'no Bookmark row on the key items tab ({ids})')
        ss = (b.scene_state()['ss'] or {}).get('screen') or {}
        b.shot('cave_bookmark')
        b.grid_pick(ids.index('keepers_bookmark'), ss.get('index') or 0, columns=2)
        b.page.wait_for_function("LQ_DEBUG.scene() === 'dialog'", timeout=15000, polling=30)     # "Close the book here?"
        for _ in range(400):
            b.handle(prefer=['Close it'])
            if b.js("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === 'cave_landing0' && !f.loading; })()"):
                break
        b.settle(prefer=['Close it'])
        c = self.cave()
        last = c.get('lastExit') or {}
        if c.get('inRun') or last.get('how') != 'bank':
            raise Fail(f'the Bookmark did not bank the reading ({c})')
        lv = [m['level'] for m in self.vitals()]
        self.banked = {'reading': self.reading, 'floor': floor, 'blues': last.get('blues'), 'vault': c.get('vault'), 'levels': lv}
        self.note(f'banked on B{floor}: blues {last.get("blues")}, vault {c.get("vault")}, party back at Lv {lv}')
        b.shot('cave_banked')

    def second_reading(self):
        """Re-enter with the vault: Optimize equips it on B1; B`again` with a vault unique worn."""
        b = self.b
        vault = self.cave().get('vault') or []
        self.begin()
        self.menu_safe('optimize', b.menu_optimize_all)
        worn = self.worn_uniques(vault)
        self.note(f'second reading: vault {vault}, worn on B1 {worn}')
        while self.cave().get('floor', 0) < self.again:
            if not self.descend():
                break
        c = self.cave()
        worn2 = self.worn_uniques(vault)
        self.second = {'vault': vault, 'wornB1': worn, 'floor': c.get('floor'), 'worn': worn2, 'inRun': c.get('inRun')}
        b.shot(f'cave_second_b{c.get("floor")}')
        if vault and not worn2:
            raise Fail(f'B{c.get("floor")} of the second reading with no vault unique worn (vault {vault})')

    def worn_uniques(self, vault):
        return self.b.js(f"(() => {{ const v = {json.dumps(vault)}; const out = []; for (const m of LQ_ENGINE.game.party) for (const [k, it] of Object.entries(m.equip)) {{ const id = it && (typeof it === 'string' ? it : it.base); if (id && v.includes(id)) out.push(m.id + ':' + id); }} return out; }})()")

    # ---------------------------------------------------------------- resume
    def resume_check(self, at=7):
        """B`at`, then a new tab on the same storage, the title's Resume row, B`at` again at its arrival."""
        b = self.b
        while self.cave().get('floor', 0) < at:
            if not self.descend():
                raise Fail('a wipe before the resume floor')
        st = self.stairs()
        arrival = st.get('arrival')
        seed = self.cave().get('seed')
        meta = b.js('LQ_ENGINE.save.loadEnvelope("cave").meta.cave')
        if not meta or meta.get('floor') != at:
            raise Fail(f'the suspend save does not hold B{at} ({meta})')
        old = b.page
        page = b.ctx.new_page()           # no init script on this tab: the storage (the suspend save) is kept, as after closing the game
        page.on('console', b._on_console)
        page.on('pageerror', lambda e: b.errors.append(f'pageerror: {e}'))
        page.goto(f'http://127.0.0.1:{b.server.server_port}/next/index.html?debug=1&fps=0{b.query}', wait_until='load')
        old.close()
        b.page = page
        b.page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
        b.page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 30000))])')
        b.js(f'LQ_DEBUG.setSpeed({b.speed})')
        b.js("LQ_DEBUG.settings({ textSpeed: 4, battleSpeed: 2, autoBattle: true })")
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title'", timeout=30000, polling=50)
        b.frames(20)
        ss = b.scene_state()['ss'] or {}
        items = ss.get('items') or []
        b.shot('cave_title_resume')
        if 'stacks' not in items:
            raise Fail(f'the title offers no Resume row ({items})')
        label = b.js("(() => { const s = LQ_ENGINE.scene; const it = s.list ? s.list.items.find(i => i.id === 'stacks') : null; return it ? it.label : null; })()")
        b.pick(items.index('stacks'), ss.get('index') or 0)
        b.page.wait_for_function(f"(() => {{ const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === 'cave_b{at}' && !f.loading; }})()", timeout=60000, polling=50)
        f = self.on_cave_map()
        c = self.cave()
        here = [f['leader']['x'], f['leader']['y']]
        tag = b.js('LQ_DEBUG.fieldState().floorTag')
        ok = c.get('inRun') and c.get('floor') == at and c.get('seed') == seed and here == arrival and tag == f'B{at}'
        self.resumed = {'label': label, 'floor': c.get('floor'), 'seed': c.get('seed'), 'at': here, 'arrival': arrival, 'tag': tag, 'ok': bool(ok)}
        self.note(f'resume: {self.resumed}')
        b.shot(f'cave_resumed_b{at}')
        if not ok:
            raise Fail(f'the resume did not land on B{at} at its arrival ({self.resumed})')
        b.mark(f'cave_resumed_b{at}')

    # ---------------------------------------------------------------- the run
    def run(self):
        b = self.b
        self.new_game()
        self.begin()
        if self.resume_test:
            self.resume_check(7)
            return
        while True:
            c = self.cave()
            if not c.get('inRun'):
                if self.reading >= self.readings:
                    self.note(f'{self.readings} readings without reaching B{self.target}')
                    break
                if self.wipes and self.wipes[-1]['reading'] == self.reading:
                    # the field remembers the last reading's defeated foe ids per map id (field.js dungeonGone), so a reading
                    # begun on the same field finds the floors it cleared empty: the bot starts a fresh field in the hall, as a
                    # player who quits and continues would (reported as a bug; the vault reading after a bank keeps the field)
                    hall = self.cave_grid('cave_landing0')
                    ps = (hall.get('marks') or {}).get('party_stop') or [10, 10]
                    # engine.reset makes a new field scene (LQ_DEBUG.warp would reuse the live one through warpTo)
                    b.js(f'LQ_ENGINE.reset("field", {{ map: "cave_landing0", x: {int(ps[0])}, y: {int(ps[1])}, dir: "up" }})')
                    b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === 'cave_landing0' && !f.loading; })()", timeout=30000, polling=50)
                    self.note('a fresh field in the hall after the wipe (the dungeonGone carry-over)')
                self.begin()
                continue
            floor = c['floor']
            if floor >= self.target and c.get('bookmarks', 0) > 0:
                try:
                    self.bank()
                except Exception as e:  # noqa: BLE001  (a foe's touch can take the Menu press: settle, then once more)
                    if 'Timeout' not in type(e).__name__ or not self.cave().get('inRun'):
                        raise
                    self.note(f'bank: the menu did not come up ({type(e).__name__}); once more')
                    b.close_menu()
                    b.settle()
                    self.bank()
                break
            if floor >= 100:
                self.note('B100 reached')
                break
            self.descend()
            b.check_errors()
        if self.banked:
            self.second_reading()

    def report(self):
        rows = [r for r in self.floors if r.get('game_s')]
        return {
            'seed': self.seed, 'target': self.target, 'readings': self.reading, 'floors': len(rows), 'fights': self.fight_count,
            'wipes': self.wipes, 'banked': self.banked, 'second': self.second, 'resumed': getattr(self, 'resumed', None),
            'deepest': max([r['floor'] for r in self.floors] + [0]),
            'game_min_per_floor': round(sum(r['game_s'] for r in rows) / max(1, len(rows)) / 60, 2),
            'wall_s_per_floor': round(sum(r['wall_s'] for r in rows) / max(1, len(rows)), 1),
            'per_floor': self.floors, 'events': self.events,
        }


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
    ap.add_argument('--all-fights', action='store_true', help='Episode 5: no EXP cap on optional fights (every hunt runs; output tagged -all; PLAYTEST_REVIEW_7 item 3)')
    ap.add_argument('--hollow', action='store_true', help='W13: also play Whisperwood Hollow after the Lantern (Episode 1; off by default)')
    ap.add_argument('--wrong-order', action='store_true')
    ap.add_argument('--headed', action='store_true')
    ap.add_argument('--resume', default=None, help='a <device>-last-game.json from an earlier run: seeded as record 1 and loaded through Continue')
    ap.add_argument('--episode', type=int, default=1, choices=[1, 2, 3, 4, 5],
                    help='3: Episode 3 (E3-integrate); --start save = Continue on the Episode 2 credits save in record 1, new = the quick start with that save in slot 0; '
                         '4: Episode 4 (E4-integrate), the same two starts from the Episode 3 credits save; '
                         '5: Episode 5 (E5-integrate), the same two starts from the Episode 4 credits save')
    ap.add_argument('--tier', type=int, default=None, choices=[1], help='Fine Print (tier_1): Episode 1 from a carried Episode 2 record (docs/TIER.md)')
    ap.add_argument('--phases', default=None, help='complete route: run only these phases (comma list; qa/integrate/autoplay_x1.py PHASES), after --resume loads')
    ap.add_argument('--x1', action='store_true', help='X1 (The Wider Valley) on in a local copy (live.js served with X1_LIVE true); the regular route then proves the main path is unchanged')
    ap.add_argument('--route', default='regular', choices=['regular', 'complete'],
                    help='Episode 1: regular = the main path (unchanged bot); complete = the completionist route through the expansion (implies --x1)')
    ap.add_argument('--start', default='save', choices=['save', 'new'],
                    help='Episode 2: load the Episode 1 credits save (save) or use the title\'s Episode 2 entry (new)')
    ap.add_argument('--cave', type=int, nargs='?', const=30, default=None,
                    help='the Deep Stacks (C3-sim-bot): descend to floor N (default 30), bank, re-enter to B5 with a vault unique worn')
    ap.add_argument('--cave-resume', action='store_true', help='the Deep Stacks: B7, a new tab, the title\'s Resume row, B7 again')
    ap.add_argument('--seeds', type=int, default=10, help='--cave: how many game seeds (from --seed0)')
    ap.add_argument('--seed0', type=int, default=1, help='--cave: the first game seed')
    ap.add_argument('--jobs', type=int, default=1, help='--cave: seeds run in this many parallel child processes')
    ap.add_argument('--cave-chests', default='all', choices=['all', 'cheap'], help='--cave: every reachable chest (the policy of the simulator) or only cheap detours')
    a = ap.parse_args(argv)
    if a.cave is not None or a.cave_resume:
        return cave_main(a)
    shots.watchdog(5 * 3600 if a.route == 'complete' else 3 * 3600)
    if a.route == 'complete':
        a.x1 = True
    tag, query, resume = ('-wo' if a.wrong_order else '-hollow' if a.hollow and a.episode == 1 else ''), '', a.resume
    if a.episode == 1 and a.route == 'complete':
        tag = '-complete'
    elif a.x1:
        tag += '-x1'
    if a.tier:
        tag, resume = '-tier1', None
    if a.episode == 2 and not a.tier:
        tag = '-ep2' + ('-new' if a.start == 'new' and not a.resume else '')
        if a.start == 'new' and not a.resume:
            query = '&ep=2'                   # the title offers Episode 2 without a finished save (title.js ep2Offer)
        elif not resume:
            resume = str(OUT / f'{a.device}-ep1-credits-save.json')
            if not pathlib.Path(resume).exists():
                print(f'no Episode 1 credits save at {resume}: run the Episode 1 autoplay first, or use --start new')
                return 2
    seed_slot, ep3 = 1, None
    if a.episode == 4 and not a.tier:
        tag, ep3 = '-ep4' + ('-new' if a.start == 'new' else ''), True
        os.environ['LQ_EP4_LIVE'] = '1'      # episodes.js served with EP4_LIVE forced on (a local copy of the switch)
        if not resume:
            try:
                resume = str(ep4_fixture(a.device))
            except Fail as e:
                print(e)
                return 2
        if a.start == 'new':
            seed_slot = 0                     # slot 0 holds a finished game: the quick start must take slot 1 and touch nothing else
    if a.episode == 5 and not a.tier:
        tag, ep3 = '-ep5' + ('-new' if a.start == 'new' else '') + ('-all' if a.all_fights else ''), True
        os.environ['LQ_EP4_LIVE'] = '1'
        os.environ['LQ_EP5_LIVE'] = '1'      # episodes.js served with EP5_LIVE forced on (a local copy of the switch)
        if not resume:
            try:
                resume = str(ep5_fixture(a.device))
            except Fail as e:
                print(e)
                return 2
        if a.start == 'new':
            seed_slot = 0                     # slot 0 holds a finished game: the quick start must take slot 1 and touch nothing else
    if a.episode == 3 and not a.tier:
        tag, ep3 = '-ep3' + ('-new' if a.start == 'new' else ''), True
        if not resume:
            try:
                resume = str(ep3_fixture(a.device))
            except Fail as e:
                print(e)
                return 2
        if a.start == 'new':
            seed_slot = 0                     # slot 0 holds a finished game: the quick start must take slot 1 and touch nothing else
    bot = Bot(a.device, speed=a.speed, keys=a.keys, name=a.name, headless=not a.headed, resume=resume, tag=tag, query=query, x1=a.x1, seed_slot=seed_slot, ep3=ep3)
    status, detail, wrong = 'ok', '', []
    try:
        bot.open()
        if a.wrong_order:
            wrong = wrong_order(bot)
        elif a.tier:
            TierEpisode(bot, side=not a.no_side, until=a.until, hollow=a.hollow).run()
        elif a.episode == 2:
            Episode2(bot, side=not a.no_side, until=a.until, start=a.start).run()
        elif a.episode == 3:
            Episode3(bot, side=not a.no_side, until=a.until, start=a.start).run()
        elif a.episode == 4:
            Episode4(bot, side=not a.no_side, until=a.until, start=a.start).run()
        elif a.episode == 5:
            ep = Episode5(bot, side=not a.no_side, until=a.until, start=a.start)
            if a.all_fights:
                ep.ZONE_EXP = {}
            ep.run()
        elif a.route == 'complete':
            sys.path.insert(0, str(HERE / 'integrate'))
            import autoplay_x1
            Route = autoplay_x1.build(sys.modules[__name__])
            Route(bot, side=not a.no_side, until=a.until, hollow=a.hollow, phases=a.phases.split(',') if a.phases else None, resumed=bool(resume)).run()
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
        import traceback
        traceback.print_exc()
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


def cave_main(a):
    """--cave N / --cave-resume: one seed in this process, or every seed in child processes (--jobs), then the summary."""
    CAVE_OUT.mkdir(parents=True, exist_ok=True)
    seeds = [a.seed0] if a.cave_resume else list(range(a.seed0, a.seed0 + max(1, a.seeds)))
    prof = '_cheap' if a.cave_chests == 'cheap' else ''
    if len(seeds) > 1:
        import concurrent.futures

        def child(seed):
            log = CAVE_OUT / f'bot_{a.device}{prof}_s{seed}.log'
            args = [sys.executable, str(pathlib.Path(__file__).resolve()), '--cave', str(a.cave), '--seeds', '1', '--seed0', str(seed),
                    '--device', a.device, '--speed', str(a.speed), '--name', a.name, '--cave-chests', a.cave_chests]
            with open(log, 'w', encoding='utf-8') as fh:
                try:
                    r = subprocess.run(args, stdout=fh, stderr=subprocess.STDOUT, timeout=4 * 3600, cwd=str(NEXT))
                    return seed, r.returncode
                except subprocess.TimeoutExpired:
                    return seed, 'timeout'
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
            codes = dict(ex.map(child, seeds))
        return cave_summary(a, seeds, codes)
    seed = seeds[0]
    shots.watchdog(3 * 3600)
    tag = f'-cave-resume-s{seed}' if a.cave_resume else f'-cave{prof}-s{seed}'
    bot = Bot(a.device, speed=a.speed, keys=a.keys, name=a.name, headless=not a.headed, tag=tag, query='&cave=1')
    route = CaveRoute(bot, target=a.cave or 30, seed=seed, resume=a.cave_resume, chests=a.cave_chests)
    status, detail = 'ok', ''
    rep = {}
    try:
        bot.open()
        route.run()
        bot.check_errors()
    except Fail as e:
        status, detail = 'FAIL', str(e)
        try:
            bot.shot('fail')
        except Exception:
            pass
    except Exception as e:  # crash: still write the report
        status, detail = 'CRASH', f'{type(e).__name__}: {e}'
        import traceback
        traceback.print_exc()
        try:
            bot.shot('crash')
        except Exception:
            pass
    finally:
        try:
            eng = bot.js('LQ_DEBUG.errors().map(e => e.msg)') or []
        except Exception:
            eng = []
        rep = {'device': a.device, 'status': status, 'detail': detail, 'speed': a.speed, **route.report(),
               'softlocks': 1 if ('no progress' in detail or 'settle timed out' in detail) else 0,
               'errors': bot.errors + [f'engine: {m}' for m in eng], 'warnings': sorted(set(bot.warnings))[:40],
               'battles': bot.battles, 'timing': bot.timing, 'wall_s': round(time.time() - bot.t0, 1)}
        name = f'bot_{a.device}_resume.json' if a.cave_resume else f'bot_{a.device}{prof}_s{seed}.json'
        (CAVE_OUT / name).write_text(json.dumps(rep, indent=1), encoding='utf-8')
        bot.close()
    short = {k: rep.get(k) for k in ('device', 'seed', 'status', 'detail', 'floors', 'fights', 'deepest', 'readings', 'game_min_per_floor', 'wall_s_per_floor', 'softlocks')}
    short.update({'wipes': len(rep.get('wipes') or []), 'errors': len(rep.get('errors') or []), 'banked': (rep.get('banked') or {}).get('floor'),
                  'second': rep.get('second'), 'resumed': rep.get('resumed')})
    print('CAVE_BOT: ' + json.dumps(short), flush=True)
    return 0 if status == 'ok' else 1


def cave_summary(a, seeds, codes):
    """Merge the seeds' reports into qa/cave/out/bot_<device>_summary.json and .md."""
    prof = '_cheap' if getattr(a, 'cave_chests', 'all') == 'cheap' else ''
    reps = []
    for s in seeds:
        f = CAVE_OUT / f'bot_{a.device}{prof}_s{s}.json'
        reps.append(json.loads(f.read_text(encoding='utf-8')) if f.exists() else {'seed': s, 'status': f'no report ({codes.get(s)})'})
    ok = [r for r in reps if r.get('status') == 'ok']
    floors = sum(r.get('floors', 0) for r in reps)

    def row(r):
        banked = r.get('banked') or {}
        second = r.get('second') or {}
        return (f'| {r.get("seed")} | {r.get("status")} | {r.get("deepest", 0)} | {r.get("floors", 0)} | {r.get("fights", 0)} | {len(r.get("wipes") or [])} | '
                f'{banked.get("floor", "-")} | {", ".join(banked.get("blues") or []) or "-"} | {"; ".join(second.get("worn") or []) or "-"} | '
                f'{r.get("game_min_per_floor", 0)} | {r.get("wall_s_per_floor", 0)} | {len(r.get("errors") or [])} | {r.get("softlocks", 0)} |')
    lines = [f'# Deep Stacks bot ({a.device}, --cave {a.cave}, chests {getattr(a, "cave_chests", "all")}, seeds {seeds[0]} to {seeds[-1]})', '',
             'Written by `python qa/autoplay.py --cave` (C3-sim-bot). Game minutes are engine time (text instant, battles at 2x).', '',
             '| seed | status | deepest | floors | fights | wipes | banked on | blues kept | worn on the second reading | game min / floor | wall s / floor | console errors | softlocks |',
             '|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    lines += [row(r) for r in reps]
    lines += ['', f'{len(ok)} of {len(reps)} seeds ok; {floors} floors; {sum(r.get("fights", 0) for r in reps)} fights; '
              f'{sum(len(r.get("wipes") or []) for r in reps)} wipes; {sum(len(r.get("errors") or []) for r in reps)} console errors; '
              f'{sum(r.get("softlocks", 0) for r in reps)} softlocks.', '']
    md = '\n'.join(lines)
    (CAVE_OUT / f'bot_{a.device}{prof}_summary.md').write_text(md, encoding='utf-8')
    (CAVE_OUT / f'bot_{a.device}{prof}_summary.json').write_text(json.dumps(reps, indent=1), encoding='utf-8')
    print(md)
    return 0 if len(ok) == len(reps) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
