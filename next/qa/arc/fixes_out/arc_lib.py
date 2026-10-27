"""H6-critic harness (scratch, qa/arc/out only). A 'new player' on top of qa/autoplay.py's Bot:
default settings (text speed 2, manual battle, 1x), walking not running, a reading pause on every page
(3.5 words a second, at least 0.75 s), a think pause on every choice and battle command, title cards
left to play. Time is logic frames (60 a game second), so the engine speed-up does not change it.
All output (shots, logs, dialog) goes to qa/arc/out. Nothing else is written."""
import json
import pathlib
import sys
import time

NEXT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(NEXT / 'qa'))
import autoplay  # noqa: E402

ARC = pathlib.Path(__file__).resolve().parent
autoplay.OUT = ARC              # Bot writes its dialog log and shots here, never into qa/out
autoplay.RUN = autoplay.WALK    # walk_to waits a walking step, not a running one
Bot, Fail, Softlock = autoplay.Bot, autoplay.Fail, autoplay.Softlock

READ_WPS = 3.5
READ_MIN = 45
THINK = 120
CMD_THINK = 75
REWARD_READ = 120


class NewPlayer(Bot):
    def __init__(self, device, speed=3, tag='', resume=None, settings=None, read=True):
        super().__init__(device=device, speed=speed, tag='-arc' + tag, x1=True, resume=resume)
        self.user_settings = settings or {}
        self.read = read
        self.read_keys = set()
        self.events = []          # [{f, kind, ...}]
        self.snap_rules = {}      # substring -> label (shot once, when the page is fully typed)
        self.snapped = set()
        self.cmd_keys = set()
        self.reward_keys = set()
        self.battle_plan = None   # callable(bot, b) -> True if it acted
        self.boxes = []

    # ------------------------------------------------------------------ boot
    def open(self):
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/next/index.html?debug=1&fps=0{self.query}', wait_until='load')
        self.page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
        self.page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 30000))])')
        self.js(f'LQ_DEBUG.setSpeed({self.speed})')
        if self.user_settings:
            self.js(f'LQ_DEBUG.settings({json.dumps(self.user_settings)})')
        if self.device.startswith('phone'):
            # a real phone shows the touch controls: headless Chromium reports a fine pointer, so touch once (the left bar)
            self.page.touchscreen.tap(4, 386)
            self.frames(10)
        return self

    def hold_dir(self, d, steps, run=False):
        return super().hold_dir(d, steps, run=False)

    def frames(self, n, timeout=60000):
        return super().frames(n, timeout=timeout)

    def ev(self, kind, **kw):
        e = {'f': self.frame(), 'wall': round(time.time() - self.t0, 2), 'kind': kind, **kw}
        self.events.append(e)
        return e

    def snap(self, label):
        path = ARC / f'{self.device}-{label}.png'
        try:
            self.page.screenshot(path=str(path))
        except Exception as ex:  # noqa: BLE001
            self.notes.append(f'snap failed {label}: {ex}')
        return path

    # ------------------------------------------------------------------ the new player's hands
    def handle(self, prefer=None, safe=False, allow_shop=False):
        st = self.scene_state()
        sc, ss = st['scene'], st.get('ss') or {}
        if sc == 'dialog':
            self.log_dialog(ss)
            inst = self.js("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'dialog' ? (s.__botId || 0) : 0; })()")
            key = (inst, ss.get('box'), ss.get('page'))
            if ss.get('typing'):
                self.frames(3)
                self.progress(('dialog-typing', key, ss.get('shown')))
                return sc
            pt = self.js("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'dialog' && s.pageText ? s.pageText : ''; })()") or ''
            lines = pt.split(chr(10)) if pt else []
            text = ' '.join(lines)
            if key not in self.read_keys:
                self.read_keys.add(key)
                self.boxes.append({'f': self.frame(), 'who': ss.get('speaker'), 'lines': lines, 'n': len(lines), 'choices': ss.get('choices')})
                self.ev('box', who=ss.get('speaker'), text=text, choices=ss.get('choices'))
                for sub, label in self.snap_rules.items():
                    if sub in text and label not in self.snapped:
                        self.snapped.add(label)
                        self.frames(4)
                        self.snap(label)
                if self.read:
                    words = max(1, len(text.split()))
                    self.frames(max(READ_MIN, int(60 * words / READ_WPS)))
                    if ss.get('choices'):
                        self.frames(THINK)
            if ss.get('choices') and ss.get('choiceIndex') is not None:
                i = self.choose(ss['choices'], prefer, safe)
                self.ev('choice', options=ss['choices'], picked=ss['choices'][i])
                self.pick(i, ss['choiceIndex'])
            elif ss.get('choices'):
                self.frames(2)
            else:
                self.tap('confirm', 2)
            self.progress(('dialog', key))
            return sc
        if sc == 'titleCard':
            k = ('card', ss.get('text'))
            if k not in self.read_keys:
                self.read_keys.add(k)
                self.ev('card', text=ss.get('text'))
                for sub, label in self.snap_rules.items():
                    if ss.get('text') and sub in ss.get('text') and label not in self.snapped:
                        self.snapped.add(label)
                        self.frames(40)
                        self.snap(label)
            self.frames(6)
            self.progress(('titleCard', ss.get('text'), ss.get('phase'), self.frame() // 60))
            return sc
        if sc == 'battle':
            b = self.js('LQ_DEBUG.state().battle') or {}
            if not getattr(self, 'allow_auto', False) and self.js('LQ_ENGINE.settings.autoBattle'):
                self.js('LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })')   # the base handler may have switched Auto on in a race
            if self.battle_seen is None or 'f0' not in self.battle_seen:
                self.battle_seen = {'start': time.time(), 'f0': self.frame(), 'rounds': 0}
                self.ev('battle_start', enc=self.js("(() => { const s = LQ_ENGINE.scene; return s && s.data ? s.data.encounterId : null; })()"))
            self.battle_seen['rounds'] = max(self.battle_seen['rounds'], b.get('round') or 0)
            if b.get('phase') == 'rewards':
                rk = ('rw', (b.get('rewards') or {}).get('index'))
                if rk not in self.reward_keys:
                    self.reward_keys.add(rk)
                    self.ev('rewards', page=(b.get('rewards') or {}).get('page'))
                    if not getattr(self, 'reward_snapped', False):
                        self.reward_snapped = True
                        self.frames(20)
                        self.snap('battle-rewards')
                    self.frames(REWARD_READ if self.read else 6)
                self.tap('confirm', 6)
            elif b.get('menu') and b.get('menu') != 'closed' and not b.get('auto'):
                ck = (b.get('partyTurns'), b.get('current'))
                if ck not in self.cmd_keys:
                    self.cmd_keys.add(ck)
                    self.ev('command', unit=b.get('current'), items=b.get('menuItems'), index=b.get('menuIndex'))
                    if getattr(self, 'battle_snaps', 0) < 2:
                        self.battle_snaps = getattr(self, 'battle_snaps', 0) + 1
                        self.frames(20)
                        self.snap(f'battle-cmd{self.battle_snaps}')
                    if self.read:
                        self.frames(CMD_THINK)
                if not (self.battle_plan and self.battle_plan(self, b)):
                    self.tap('confirm', 12)
            else:
                self.frames(6)
            sig = ('battle', b.get('phase'), b.get('round'), b.get('current'), b.get('menu'), tuple((u.get('uid'), u.get('hp')) for u in (b.get('units') or [])))
            self.progress(sig)
            return sc
        if sc == 'field' and self.battle_seen:
            self.ev('battle_end', rounds=self.battle_seen['rounds'], frames=self.frame() - self.battle_seen.get('f0', self.frame()))
        return super().handle(prefer, safe, allow_shop)


def write_json(name, data):
    (ARC / name).write_text(json.dumps(data, indent=1), encoding='utf-8')


FIELD = "LQ_ENGINE.stack.find(s => s.name === 'field')"
