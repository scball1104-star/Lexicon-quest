"""3x battle-stage mocks of the five Wider Valley stages with the real sprites at the real layout slots (the same renderer as mock_stage.py,
with the x1 backdrops added; stand-in Episode 1 foes until X1-sprites lands its own).

    python x1_mock_stage.py                 # out/mock_stage_x1_<name>_3x.png for every stage
    python x1_mock_stage.py moor barrow
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mock_stage as M

M.SETUPS.update({
    'x1_downs': ('x1_battle_downs', ['briar_wolf', 'moss_scarab', 'briar_wolf'], 0.0),
    'x1_moor': ('x1_battle_moor', ['briar_wolf', 'ink_wraith', 'moss_scarab'], 0.0),
    'x1_barrow': ('x1_battle_barrow', ['page_wraith', 'page_wraith', 'bookmite'], 0.0),
    'x1_larchhill': ('x1_battle_larchhill', ['moss_scarab', 'briar_wolf', 'moss_scarab'], 0.0),
    'x1_culvert': ('x1_battle_culvert', ['ink_slime', 'tome_golem', 'ink_wraith'], 0.0),
})

if __name__ == '__main__':
    names = ['x1_' + a if not a.startswith('x1_') else a for a in sys.argv[1:]] or [k for k in M.SETUPS if k.startswith('x1_')]
    spr = M.Sprites(os.path.join(M.NEXT, 'assets', 'sprites'))
    os.makedirs(M.OUT, exist_ok=True)
    for n in names:
        M.render(n, spr)
