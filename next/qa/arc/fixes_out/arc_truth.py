"""H6-critic: Name Truth choices played both ways (Garrick, the Archive door, Quill; Oren, Mael and Hazel are played in
arc_open.py, phone = the lie, desktop = the truth), the remembered lines that are scenes (Oren's starter, Mael's letter east,
the door under the golden page), two floor endings (F1 bell, F3 boss door) and two boss intros (Echo Warden, Archivore).
One page, LQ_DEBUG.newGame per case. python next/qa/arc/out/arc_truth.py --device phone"""
import argparse
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, FIELD  # noqa: E402
import autoplay  # noqa: E402

H1 = {'cold_open_done': 1, 'yard_fight_done': 1, **{f'toll_{n}': 1 for n in range(1, 13)}}
TOWN = {**H1, 'intro_done': 1, 'saw_fading_sign': 1, 'signs_fading': 1, 'met_mael': 1, 'mira_joined': 1, 'bram_joined': 1}
VALLEY = {**TOWN, 'hazel_farewell_done': 1, 'garrick_farewell_done': 1, 'left_town': 1, 'valley_arrived': 1, 'first_fight_done': 1,
          'saw_milestone': 1, 'campfire_rested': 1}
ARCH = {**VALLEY, 'archive_entered': 1, 'f1_arrived': 1, 'lost_bridge_started': 1}
EP1_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated',
            'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete', 'signs_fading', 'saw_fading_sign',
            'hazel_farewell_done', 'garrick_farewell_done', 'valley_arrived', 'saw_milestone', 'f1_arrived', 'f2_arrived', 'f3_arrived',
            'found_thirteenth_bell', 'first_fight_done', 'campfire_rested', 'archive_key_found', 'stacks_key_found', 'returned_home', 'hal_returned']


class T(NewPlayer):
    def choose(self, options, prefer=None, safe=False):
        return super().choose(options, prefer if prefer is not None else self.want, safe)


def start(b, flags, map_id, pos, level=4, items=None, party=('mira', 'bram')):
    b.js("LQ_DEBUG.newGame('Arden', {scene: 'field', party: %s, level: %d, gold: 300, items: %s, map: %s, pos: {x: %d, y: %d, dir: %s}, flags: %s})"
         % (json.dumps(list(party)), level, json.dumps(items or {'potion': 3}), json.dumps(map_id), pos[0], pos[1], json.dumps(pos[2]), json.dumps(flags)))
    b.page.wait_for_function(FIELD + ' && !' + FIELD + '.loading && !!' + FIELD + '.map && ' + FIELD + ".map.id === " + json.dumps(map_id), timeout=20000)
    b.frames(30)
    b.settle()
    b.frames(170)
    b.settle()


def run_case(b, out, name, flags, map_id, pos, act, want=(), snaps=None, level=4, items=None, auto=False):
    b.boxes = []
    b.snapped = set()
    b.snap_rules = {k: f'{name}-{v}' for k, v in (snaps or {}).items()}
    b.want = list(want)
    b.allow_auto = auto
    b.js("LQ_DEBUG.settings({ autoBattle: %s, battleSpeed: %d })" % ('true' if auto else 'false', 2 if auto else 1))
    rec = {'case': name}
    try:
        start(b, flags, map_id, pos, level=level, items=items)
        act(b)
        b.settle()
        rec['result'] = 'ok'
    except Exception as ex:  # noqa: BLE001
        rec['result'] = f'FAIL {type(ex).__name__}: {ex}'
        b.snap(f'{name}-zz-fail')
        print('  FAIL', name, ex, flush=True)
    rec['boxes'] = [{'who': x['who'], 'text': ' / '.join(x['lines']), 'n': x['n'], 'choices': x['choices']} for x in b.boxes]
    rec['flags'] = sorted(k for k, v in (b.flags() or {}).items() if v and (k.endswith('_truth') or k.endswith('_lie')))
    rec['items'] = b.items()
    out['cases'].append(rec)
    b.allow_auto = False
    print(' ', name, rec['result'], rec['flags'], flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    b = T(a.device, speed=3, tag='-truth', read=True)
    ep = autoplay.Episode(b, side=False)
    out = {'device': a.device, 'cases': []}
    only = set(a.only.split(',')) if a.only else None

    def want(n):
        return only is None or n in only

    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        for side, pick in (('truth', 0), ('lie', 1)):
            g_opts = ['He lost your name', 'He was fine'][pick]
            if want('garrick'):
                run_case(b, out, f'garrick-{side}', TOWN, 'smithy', (10, 8, 'up'), lambda b: ep.talk('garrick'), want=[g_opts, 'Yes'],
                         snaps={'Holt came by': 'ask', 'A moment. ...Then': 'answer', 'Good.': 'answer'})
            if want('quill'):
                q = ['Forgotten', 'sharp as ever'][pick]
                run_case(b, out, f'quill-{side}', {k: v for k, v in VALLEY.items() if k != 'lost_bridge_started'}, 'valley', (38, 23, 'right'),
                         lambda b: ep.talk('quill'), want=[q, 'Yes'], snaps={'Is it going?': 'ask', 'The last word. Of course': 'answer', 'Sharp as ever. Good': 'answer'})
            if want('door'):
                d = ["didn't hear me", 'Old door'][pick]
                run_case(b, out, f'door-{side}', VALLEY, 'valley', (34, 9, 'up'), lambda b: b.walk_to([(36, 7)], label='door step'),
                         want=[d], snaps={'SPEAK, AND BE KEPT': 'carving', "Wasn't it": 'ask', 'Then we say it for you': 'answer', 'Old door. Yes': 'answer'})
        # remembered lines that are scenes
        if want('oren_mem'):
            for side in ('truth', 'lie'):
                run_case(b, out, f'oren-mem-{side}', {**VALLEY, 'starter_quest_started': 1, 'starter_found': 1, f'oren_{side}': 1}, 'bakery', (7, 7, 'up'),
                         lambda b: ep.talk('oren'), want=['Yes'], snaps={'That morning, with the sign': 'memory'})
        if want('mael_mem'):
            for side in ('truth', 'lie'):
                fl = {**H1, **{f: 1 for f in EP1_DONE}, f'mael_{side}': 1, 'ep2_started': 1}
                run_case(b, out, f'mael-mem-{side}', fl, 'willowmere', (24, 19, 'up'), lambda b: b.js("void LQ_DEBUG.scene('ep2_mael')"),
                         want=['East, then', 'Yes'], snaps={'that first morning': 'memory'})
        # floor endings
        if want('floors'):
            run_case(b, out, 'floor-f1', ARCH, 'archive_f1', (31, 6, 'up'), lambda b: b.walk_to([(31, 4)], label='bell row'),
                     snaps={"That's the sound from last night": 'toll', 'Nobody is down there': 'end'})
            run_case(b, out, 'floor-f3', {**ARCH, 'archive_f1_done': 1, 'echo_warden_defeated': 1, 'lantern_get': 1, 'archive_f2_done': 1,
                                          'f2_arrived': 1, 'f3_arrived': 1, 'stacks_key_found': 1}, 'archive_f3', (19, 23, 'up'),
                     lambda b: b.interact(ent_id='boss_door', label='boss door'), want=["Let's go"], items={'potion': 3, 'stacks_key': 1},
                     snaps={'Behind it, something is chewing': 'ink', 'Why would it stop': 'end'})
        # boss intros (Auto at Lv 30 wins them; the door's memory follows the Archivore)
        if want('bosses'):
            run_case(b, out, 'boss-warden', {**ARCH, 'archive_f1_done': 1, 'f2_arrived': 1}, 'archive_f2', (4, 18, 'up'),
                     lambda b: b.walk_to([(4, 16)], label='warden row'), level=30, auto=True,
                     snaps={'WHO COMES': 'first', 'ECHO WARDEN': 'card', 'keep... their names': 'after'})
            for side in ('truth', 'lie'):
                fl = {**ARCH, 'archive_f1_done': 1, 'echo_warden_defeated': 1, 'lantern_get': 1, 'archive_f2_done': 1, 'f2_arrived': 1, 'f3_arrived': 1,
                      'stacks_key_found': 1, 'boss_door_open': 1, f'door_{side}': 1}
                run_case(b, out, f'boss-archivore-{side}', fl, 'archive_boss', (12, 16, 'up'),
                         lambda b: (b.settle(), b.js("void LQ_DEBUG.scene('archivore')") if not b.flag('archivore_defeated') and b.scene() == 'field' else None),
                         level=30, auto=True, want=['Yes'],
                         snaps={'Pages drift': 'first', 'NEXT ON THE LIST': 'list', 'THE ARCHIVORE': 'card', 'at the door': 'memory', "It wasn't the door": 'memory'})
    finally:
        out['errors'] = b.errors
        write_json(f'{a.device}-arc-truth{"-" + a.only.replace(",", "_") if a.only else ""}.json', out)
        b.close()


if __name__ == '__main__':
    main()
