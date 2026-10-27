"""H6-fixes (copied from H6-critic's rig, retargeted to the fixed text): the first five minutes as a new player (New Game to Mael, then the Journal and Hazel's farewell).
    python next/qa/arc/out/arc_open.py --device phone
Writes qa/arc/out/<device>-arc-open-*.png, <device>-arc-open.json (events, beats), <device>-arc-after-mael-game.json."""
import argparse
import json
import sys
import pathlib
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, FIELD, ARC, Fail  # noqa: E402
import autoplay  # noqa: E402

PREFER = {
    'phone': ['counted thirteen', "can't remember", 'Like a stone', "I'll go", 'No.'],
    'desktop': ['counted thirteen', "Oren's Ovens", 'Not much', "I'll go", 'Yes.'],
}
TOLL_STEPS = [[12, 34], [12, 32], [12, 30], [12, 28], [8, 24], [8, 22], [8, 20], [8, 18], [12, 14], [12, 12], [12, 10], [12, 8]]
TOP = (12, 6)
CAPTION = "(() => { const f = " + FIELD + "; const a = f.frame - 36; return { fframe: f.frame, line: a >= 0 && a < 210 }; })()"


class P(NewPlayer):
    def choose(self, options, prefer=None, safe=False):
        return super().choose(options, prefer if prefer is not None else self.default_prefer, safe)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    ap.add_argument('--speed', type=float, default=3)
    a = ap.parse_args()
    dev = a.device
    b = P(dev, speed=a.speed, tag='-open')
    b.default_prefer = PREFER[dev]
    b.snap_rules = {
        "Up, up.": 'open-05-hazel-wake', 'counted thirteen': 'open-06-wake-choice', 'What did my sign': 'open-07-oren-ask',
        'Then it': 'open-08-oren-after', 'Oren. That': 'open-08-oren-after', 'Something black and wet': 'open-09-slime-drop',
        'Good swing': 'open-11-oren-after-fight', 'Did you sleep at all': 'open-12-mael-first', 'Twelve bells up there': 'open-13-mael-saying', 'zzz': 'open-05a-zzz',
        'Town Register': 'open-14-register', 'In Aethelgard': 'open-04-card', 'Are you frightened': 'open-17-hazel-ask',
        'Nor I.': 'open-12b-mael-reply', 'Then you are the only one': 'open-12b-mael-reply',
    }
    ep = autoplay.Episode(b, side=False)
    out = {'device': dev, 'speed': a.speed}
    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.ev('title_ready')
        out['boot_wall_s'] = round(time.time() - b.t0, 2)
        b.frames(90)
        b.snap('open-01-title')
        b.frames(90)
        ss = b.scene_state()['ss'] or {}
        out['title_state'] = ss
        b.pick(0, ss.get('index') or 0)
        b.ev('new_game')
        b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntry' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        b.frames(30)
        b.snap('open-02-name')
        for _ in range(8):
            b.page.keyboard.press('Backspace')
        b.page.keyboard.type('Arden', delay=60)
        b.frames(20)
        b.page.keyboard.press('Enter')
        if dev == 'phone':
            b.page.touchscreen.tap(4, 386)   # the player's thumb is back on the glass: the touch controls show again
        b.ev('name_done', touch=b.js('LQ_DEBUG.view().touchMode'))
        on_tower = "(() => { const f = " + FIELD + "; return LQ_DEBUG.scene() === 'field' && !!(f && f.map && f.map.id === 'bell_tower'); })()"
        b.page.wait_for_function(on_tower, timeout=30000, polling=20)
        b.ev('tower_shown')
        b.snap('open-03a-tower-first')
        f = b.settle()
        b.ev('control', cap=b.js(CAPTION))
        b.snap('open-03-tower-control')
        b.frames(60)
        b.snap('open-03b-tower-1s')
        out['caption_at_control'] = b.js(CAPTION)
        for n, (x, y) in enumerate(TOLL_STEPS, start=1):
            b.walk_to([(x, y + 1)], label=f'pre_toll_{n}')
            b.hold_dir('up', 1)
            b.frames(24)
            cap = b.js(CAPTION)
            b.ev(f'toll_{n}', cap=cap, flag=b.flag(f'toll_{n}'))
            if n in (1, 2, 6, 7, 12):
                b.snap(f'open-03c-toll{n:02d}')
            b.settle()
            if not b.flag(f'toll_{n}'):
                raise Fail(f'toll_{n} did not fire')
        b.walk_to([(TOP[0], TOP[1] + 1)], label='pre_top')
        b.hold_dir('up', 1)
        b.ev('thirteenth_step')
        b.frames(70)
        b.snap('open-03d-thirteenth-pan')
        b.frames(80)
        b.snap('open-03e-silence')
        at_home = "(() => { const f = " + FIELD + "; return LQ_DEBUG.scene() === 'field' && !!(f && f.map && f.map.id === 'hero_home'); })()"
        for _ in range(2000):
            if b.js(at_home):
                break
            b.handle()
        b.ev('home_shown')
        b.settle()
        b.ev('home_control', intro=b.flag('intro_done'))
        b.snap('open-06b-home-control')
        b.through('home_exit')
        b.ev('willowmere_arrive')
        b.settle()
        b.ev('after_sign', truth=b.flag('oren_truth'), lie=b.flag('oren_lie'))
        b.snap('open-08b-after-sign')
        b.walk_to([(12, 16)], label='yard lane')
        b.settle()
        b.ev('yard_done', done=b.flag('yard_fight_done'))
        ep.talk('mael')
        b.ev('met_mael', done=b.flag('met_mael'), touch=b.js('LQ_DEBUG.view().touchMode'))
        b.frames(20)
        out['aim_after_mael'] = b.js('LQ_DEBUG.fieldState().aim')
        b.snap('open-15-aim-after-mael')
        # the Journal: Quests, then the Ledger, Hazel's row, Oren's row
        b.open_menu()
        b.snap('open-16a-menu')
        b.menu_command('journal')
        b.frames(12)
        b.snap('open-16b-journal-quests')
        b.tap('pageL', 6)
        b.frames(8)
        out['ledger_top'] = b.js('LQ_DEBUG.state().sceneState.screen')
        b.snap('open-16c-ledger')
        rows = []
        for i in range(12):
            b.tap('down', 4)
            led = b.js("(() => { const s = LQ_ENGINE.scene; const j = s.screen; return j && j.names && j.names.item ? { id: j.names.item.id, row: j.names.item } : null; })()")
            rows.append(led)
            if led and led.get('id') == 'oren':
                b.snap('open-16d-ledger-oren')
        out['ledger_walk'] = rows
        b.close_menu()
        b.frames(10)
        out['aim_after_menu'] = b.js('LQ_DEBUG.fieldState().aim')
        b.snap('open-16e-aim-after-menu')
        b.ev('journal_done')
        # Hazel's farewell (a Name Truth pair, in the real flow)
        b.through('door_home')
        ep.talk('hazel')
        b.ev('hazel_done', truth=b.flag('hazel_truth'), lie=b.flag('hazel_lie'))
        write_json(f'{dev}-arc-after-mael-game.json', b.game())
        out['result'] = 'ok'
    except Exception as ex:  # noqa: BLE001
        out['result'] = f'FAIL {type(ex).__name__}: {ex}'
        b.snap('open-zz-fail')
        print('FAIL', ex, flush=True)
    finally:
        out['events'] = b.events
        out['boxes'] = b.boxes
        out['errors'] = b.errors
        out['battles'] = b.battles
        out['view'] = b.js('LQ_DEBUG.view()')
        out['flags'] = sorted(k for k, v in (b.flags() or {}).items() if v)
        write_json(f'{dev}-arc-open.json', out)
        b.close()
    print(out['result'])


if __name__ == '__main__':
    main()
