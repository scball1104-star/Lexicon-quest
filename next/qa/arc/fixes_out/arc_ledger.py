"""H6-critic probe: the Ledger and the Aim at two later points (the first is in arc_open.py, after Mael).
  B: just past the Archive door (Archive F1, flags of qa/saves/fixtures/x1_ep1_f1_mid.json plus the H1 flags), via LQ_DEBUG.newGame
  C: after the Episode 1 credits (qa/out/autoplay/desktop-ep1-credits-save.json, this build's bot, 10/27 01:20), via the title
Each: the menu closes (the Aim), the Journal's Quests, the Ledger top, every row walked, the last page. Title counter for C.
python next/qa/arc/out/arc_ledger.py --device phone"""
import argparse
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, NEXT, FIELD  # noqa: E402

H1 = ['cold_open_done', 'yard_fight_done'] + [f'toll_{n}' for n in range(1, 13)]
ROW_JS = "(() => { const j = LQ_ENGINE.scene.screen; const it = j && j.names && j.names.item; return it ? { id: it.id, kept: it.row && it.row.kept, why: it.row && it.row.why, name: it.row && it.row.name, place: it.row && it.row.placeName } : null; })()"


def ledger_pass(b, tag, out):
    b.frames(30)
    b.open_menu()
    b.snap(f'{tag}-menu')
    b.menu_command('journal')
    b.frames(12)
    b.snap(f'{tag}-quests')
    out['quests'] = b.js("(() => { const j = LQ_ENGINE.scene.screen; return j ? { tab: j.tab } : null; })()")
    b.tap('pageL', 6)
    b.frames(8)
    out['ledger'] = b.js('LQ_DEBUG.state().sceneState.screen.ledger')
    b.snap(f'{tag}-ledger')
    rows, shot_kept = [], 0
    for i in range(60):
        b.tap('down', 4)
        r = b.js(ROW_JS)
        if r and (not rows or rows[-1]['id'] != r['id']):
            rows.append(r)
            if r['kept'] and shot_kept < 3 and r['id'] in ('bram', 'oren', 'mira', 'mael', 'pip', 'iris', 'holt', 'hazel', 'garrick'):
                shot_kept += 1
                b.snap(f'{tag}-ledger-{r["id"]}')
    b.snap(f'{tag}-ledger-end')
    out['rows'] = rows
    b.close_menu()
    b.frames(12)
    out['aim'] = b.js('LQ_DEBUG.fieldState().aim')
    out['aim_text'] = b.js("(() => import('/next/src/data/quests.js').then(Q => { const has = (f) => !!LQ_ENGINE.game.flags[f]; const s = Q.currentStep(has, Q.mainQuestFor(has)); return s ? s.aim : null; }))()")
    b.snap(f'{tag}-aim')
    b.frames(300)
    out['aim_after_5s'] = b.js('LQ_DEBUG.fieldState().aim')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    a = ap.parse_args()
    out = {'B': {}, 'C': {}}
    # ---- B: past the Archive door
    fx = json.loads((NEXT / 'qa' / 'saves' / 'fixtures' / 'x1_ep1_f1_mid.json').read_text(encoding='utf-8'))
    flags = {k: 1 for k, v in fx['flags'].items() if v}
    for f in H1 + ['door_truth', 'oren_truth', 'hazel_truth', 'garrick_truth']:
        flags[f] = 1
    b = NewPlayer(a.device, speed=3, tag='-ledgerB', read=False)
    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.js("LQ_DEBUG.newGame('Arden', {scene: 'field', party: ['mira', 'bram'], level: 4, map: 'archive_f1', pos: {x: 9, y: 19, dir: 'right'}, flags: %s})" % json.dumps(flags))
        b.page.wait_for_function(FIELD + ' && !' + FIELD + '.loading && !!' + FIELD + '.map', timeout=20000)
        b.settle()
        b.frames(200)
        b.settle()
        ledger_pass(b, 'B', out['B'])
        out['B']['count'] = b.js("(async () => { const L = await import('/next/src/data/ledger.js'); return L.namesKept(LQ_ENGINE.game.flags); })()")
    finally:
        out['B']['errors'] = b.errors
        b.close()
    # ---- C: after the credits, through the title
    save = NEXT / 'qa' / 'out' / 'autoplay' / 'desktop-ep1-credits-save.json'
    b = NewPlayer(a.device, speed=3, tag='-ledgerC', resume=str(save), read=False)
    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.frames(40)
        out['C']['title'] = b.scene_state()['ss'].get('ledger')
        b.snap('C-title')
        b.title_continue(1)
        b.settle()
        b.frames(200)
        b.settle()
        ledger_pass(b, 'C', out['C'])
        out['C']['count'] = b.js("(async () => { const L = await import('/next/src/data/ledger.js'); return L.namesKept(LQ_ENGINE.game.flags); })()")
        out['C']['flags'] = sorted(k for k, v in b.flags().items() if v)
    finally:
        out['C']['errors'] = b.errors
        b.close()
    write_json(f'{a.device}-arc-ledger.json', out)
    for k in 'BC':
        o = out[k]
        print(k, o.get('count'), o.get('aim'), o.get('aim_text'), o.get('aim_after_5s'), o.get('title'), len(o.get('rows') or []))


if __name__ == '__main__':
    main()
