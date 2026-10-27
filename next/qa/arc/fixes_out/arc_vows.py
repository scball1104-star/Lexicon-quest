"""H6-fixes (copied from H6-critic's rig, retargeted): the Vows played. At the Pilgrim's Rest (valley campfire) take each vow and break it on purpose (Flee, a potion,
a running step, Mira at 0, a Fury art on Auto), rest again for the broken line; then take No fleeing, carry it through three
Archive F1 fights, come back and rest for the kept box; then No healing items under Auto at low HP (does Auto break it).
python next/qa/arc/out/arc_vows.py --device phone   (--short: offer, confirm, one break, the kept box only)"""
import argparse
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, FIELD, Fail  # noqa: E402

FLAGS = {'cold_open_done': 1, 'intro_done': 1, 'saw_fading_sign': 1, 'signs_fading': 1, 'yard_fight_done': 1, 'met_mael': 1,
         'mira_joined': 1, 'bram_joined': 1, 'hazel_farewell_done': 1, 'garrick_farewell_done': 1, 'left_town': 1, 'valley_arrived': 1,
         'first_fight_done': 1, 'saw_milestone': 1, 'oren_truth': 1, 'hazel_truth': 1, 'garrick_truth': 1, 'mael_truth': 1}
for n in range(1, 13):
    FLAGS[f'toll_{n}'] = 1
G = 'LQ_ENGINE.game'
VOW = "(() => { const v = LQ_ENGINE.game.vow; return v ? { id: v.id, state: v.state, by: v.brokenBy } : null; })()"


class V(NewPlayer):
    def choose(self, options, prefer=None, safe=False):
        return super().choose(options, prefer if prefer is not None else self.want, safe)

    def snap(self, label):
        path = super().snap(label)
        if label.endswith('-kept'):   # H6: the mastery bar fills over about 40 frames after the box is typed
            self.frames(60)
            super().snap(label + '-late')
        return path


def rest(b, vow_name, label):
    """Walk to the campfire and rest; at the offer pick vow_name (or 'No vow')."""
    b.want = ['Just rest', 'Rest', vow_name, 'Take the vow', 'Not now']
    b.snap_rules.update({'Take a vow?': f'{label}-offer', 'Vow kept': f'{label}-kept'})
    b.interact(ent_id='campfire', label='campfire')
    b.settle()
    return b.js(VOW)


def fight(b, enc, opts=None, plan=None, auto=False, label='', snap_break=True):
    b.allow_auto = auto
    b.js("LQ_DEBUG.settings({ autoBattle: %s, battleSpeed: 1 })" % ('true' if auto else 'false'))
    b.battle_plan = plan
    b.js("LQ_DEBUG.battle(%s, %s)" % (json.dumps(enc), json.dumps(opts or {})))
    b.frames(10)
    broke_at = None
    for _ in range(4000):
        sc = b.scene()
        v = b.js(VOW)
        if v and v['state'] == 'broken' and broke_at is None:
            broke_at = b.frame()
            if snap_break:
                b.frames(6)
                b.snap(f'{label}-toast')
                b.frames(30)
                b.snap(f'{label}-toast-late')
        if sc == 'field':
            break
        b.handle()
    b.battle_plan = None
    b.allow_auto = False
    b.js("LQ_DEBUG.settings({ autoBattle: false })")
    b.settle()
    return broke_at


def flee_plan(bot, st):
    bot.js("LQ_DEBUG.battleAct({ type: 'flee' })")
    bot.frames(10)
    return True


def potion_plan(bot, st):
    uid = st.get('current')
    bot.js("LQ_DEBUG.battleAct({ type: 'item', item: 'potion', target: %s })" % json.dumps(uid))
    bot.frames(10)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    ap.add_argument('--short', action='store_true')
    a = ap.parse_args()
    dev = a.device
    b = V(dev, speed=3, tag='-vows', read=True)
    b.want = []
    b.snap_rules = {
        'Stand in every fight': 'v-confirm-noflee', "You ran. Fair enough": 'v-broken-noflee', "You needed it": 'v-broken-noheal',
        "Legs are for that": 'v-broken-walk', "I fell. I'm up again": 'v-broken-mira', 'You let it out': 'v-broken-fury',
        'Not one step back': 'v-kept-line', 'A warm fire on a long road': 'v-fireside', 'Walk every step': 'v-confirm-walk',
        'Old guard habit': 'v-intro',
    }
    out = {'device': dev, 'steps': []}

    def step(name, **kw):
        out['steps'].append({'step': name, 'f': b.frame(), **kw})
        print(' ', name, kw, flush=True)

    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.js("LQ_DEBUG.newGame('Arden', {scene: 'field', party: ['mira', 'bram'], level: 3, gold: 200, items: {potion: 6, ether: 2}, map: 'valley', pos: {x: 37, y: 23, dir: 'right'}, flags: %s, hp: 0.7})" % json.dumps(FLAGS))
        b.page.wait_for_function(FIELD + ' && !' + FIELD + '.loading && !!' + FIELD + '.map', timeout=20000)
        b.settle()
        b.frames(200)
        b.settle()
        # 1. No fleeing, broken by Flee
        v = rest(b, 'No fleeing', 'v1')
        offer = [x for x in b.boxes if x['lines'] and x['lines'][0].startswith('Take a vow')]
        step('took', vow=v, offer_lines=offer[:1])
        br = fight(b, 'valley_wolves', {'canFlee': True}, plan=flee_plan, label='v-break-noflee')
        step('flee', broke=br, vow=b.js(VOW))
        b.js("LQ_DEBUG.state().sceneState")
        if a.short:
            v = rest(b, 'No fleeing', 'v2')
            step('took again', vow=v)
        else:
            # 2. No healing items, broken by a potion in battle
            v = rest(b, 'No healing items', 'v2')
            step('took', vow=v)
            br = fight(b, 'valley_wolves', {}, plan=potion_plan, label='v-break-noheal')
            step('potion', broke=br, vow=b.js(VOW))
            # 3. Walk the road, broken by one running step
            v = rest(b, 'Walk the road', 'v3')
            step('took', vow=v)
            f = b.field()
            b.js('(() => { LQ_DEBUG.press("run", 14); LQ_DEBUG.press("left", 12); })()')
            for _ in range(20):
                b.frames(3)
                if (b.js(VOW) or {}).get('state') == 'broken':
                    b.frames(4)
                    b.snap('v-break-walk-toast')
                    break
            b.settle()
            step('ran', vow=b.js(VOW))
            # 4. Mira stands, broken when she falls (Auto, Mira at 1 HP)
            v = rest(b, 'Mira stands', 'v4')
            step('took', vow=v)
            for k in range(4):
                b.js(G + ".party.find(m => m.id === 'mira').hp = 1")
                br = fight(b, 'valley_pack', {}, auto=True, label=f'v-break-mira{k}')
                if (b.js(VOW) or {}).get('state') == 'broken':
                    break
            step('mira fell', vow=b.js(VOW))
            # 5. No Fury, broken by Auto spending a Fury art
            v = rest(b, 'No Fury', 'v5')
            step('took', vow=v)
            for k in range(3):
                b.js(G + ".party.forEach(m => { m.fury = 100; })")
                br = fight(b, 'valley_wolves', {}, auto=True, label=f'v-break-fury{k}')
                if (b.js(VOW) or {}).get('state') == 'broken':
                    break
            step('fury', vow=b.js(VOW))
            # 6. keep one: No fleeing through three Archive F1 fights, then rest
            v = rest(b, 'No fleeing', 'v6')
            step('took keep', vow=v)
        before = b.js(G + ".party.map(m => [m.id, m.weapon, JSON.stringify(m.mastery)])")
        b.js("LQ_DEBUG.warp('archive_f1', 9, 19, 'right')")
        b.frames(60)
        b.settle()
        for enc in ['f1_slimes', 'f1_mites', 'f1_mixed']:
            fight(b, enc, {}, label='v-keep', snap_break=False)
        step('F1 fights', vow=b.js(VOW), battles=b.js(G + '.counters.battles'))
        b.js("LQ_DEBUG.warp('valley', 37, 23, 'right')")
        b.frames(60)
        b.settle()
        b.frames(200)
        b.settle()
        v = rest(b, 'No vow', 'v7')
        after = b.js(G + ".party.map(m => [m.id, m.weapon, JSON.stringify(m.mastery)])")
        step('kept', vow=v, kept=b.js(G + '.vowsKept'), before=before, after=after)
        # the reward on the Status screen
        b.open_menu()
        b.menu_command('status')
        b.frames(12)
        b.snap('v-status')
        b.close_menu()
        if not a.short:
            # 7. Auto at low HP under No healing items
            v = rest(b, 'No healing items', 'v8')
            b.js(G + ".party.forEach(m => { m.hp = Math.max(1, Math.round(m.hp * 0.25)); })")
            br = fight(b, 'valley_pack', {}, auto=True, label='v-auto-noheal')
            step('auto low hp', broke=br, vow=b.js(VOW))
        out['result'] = 'ok'
    except Exception as ex:  # noqa: BLE001
        out['result'] = f'FAIL {type(ex).__name__}: {ex}'
        b.snap('v-zz-fail')
        print('FAIL', ex, flush=True)
    finally:
        out['boxes'] = b.boxes
        out['errors'] = b.errors
        out['events'] = [e for e in b.events if e['kind'] in ('box', 'choice', 'battle_start', 'battle_end')]
        write_json(f'{dev}-arc-vows.json', out)
        b.close()
    print(out['result'])


if __name__ == '__main__':
    main()
