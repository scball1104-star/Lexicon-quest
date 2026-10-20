"""Party battle extras (W6-anim): crit wind-up, combo pose and level-up jump, built with the same puppet as
build_party_battle.py (body + posed arm + weapon on a 32x40 cell, facing LEFT).

    extra_frames(c) -> [(suffix, rgba)]   suffixes: <weapon>_crit, <weapon>_combo, <weapon>_levelup for both of
                                          the character's weapons, plus shared combo / levelup (primary weapon)

crit    a bigger wind-up than <weapon>_windup: deeper crouch, the body leans back 2, the weapon cocked fully
        behind the head (bow: a full draw leaning back) with a glint on the hand.
combo   the shared dramatic pose for team arts: low wide stance, weapon raised high, sparkles.
levelup a small jump: the victory pose lifted 3 px with the legs tucked in a stride (the scene adds the hop).
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
import numpy as np
from pix import blank
import build_party_battle as B
import battle_parts as BP


def lift(cell, dy):
    out = blank(*B.CELL)
    out[:B.CELL[1] - dy] = cell[dy:]
    return out


def extra_frames(c):
    body, leg = B.left_body(c)
    sh = {'hero': BP.HERO_SHOULDER, 'mira': BP.MIRA_SHOULDER, 'bram': (0, 0)}[c]

    def S(dx=0, dy=0):
        return (sh[0] + B.lean_dx_at(sh[1], dx), sh[1] + dy)

    def F(x, y, dx=0, dy=0):
        return (x + B.lean_dx_at(y, dx), y + dy)

    crouch2 = B.legs_spread(B.bob_upper(body, 2), c)
    crit_body = B.lean(crouch2, 2)
    combo_body = B.lean(crouch2, -1)
    jump_body = B.legs_spread(body, c)
    out = []
    for w in B.WEAPONS_OF[c]:
        if c == 'bram':
            hi = {'spear': 15, 'axe': 14}[w]
            out += [(f'{w}_crit', B.compose(c, crit_body, None, None, w, 'back', far_hand=F(17, 12, 2, 2), sparkle=True)),
                    (f'{w}_combo', B.compose(c, combo_body, None, None, w, 'up_fwd', weapon_front=True, far_hand=F(4, 14, -1, 2), sparkle=True)),
                    (f'{w}_levelup', lift(B.compose(c, jump_body, None, None, w, 'up', weapon_front=True, far_hand=F(3, hi)), 3))]
        elif w == 'bow':
            out += [(f'{w}_crit', B.compose(c, B.lean(crouch2, 1), S(1, 2), 'fwd', 'bow', 'drawn', sparkle=True)),
                    (f'{w}_combo', B.compose(c, combo_body, S(-1, 2), 'up', 'bow', 'hold', sparkle=True)),
                    (f'{w}_levelup', lift(B.compose(c, jump_body, S(), 'up', 'bow', 'hold'), 3))]
        else:
            out += [(f'{w}_crit', B.compose(c, crit_body, S(2, 2), 'up_back', w, 'back', sparkle=True)),
                    (f'{w}_combo', B.compose(c, combo_body, S(-1, 2), 'up', w, 'up_fwd', sparkle=True)),
                    (f'{w}_levelup', lift(B.compose(c, jump_body, S(), 'up', w, 'up'), 3))]
    pw = B.WEAPONS_OF[c][0]
    d = dict(out)
    out += [('combo', d[f'{pw}_combo']), ('levelup', d[f'{pw}_levelup'])]
    return out


if __name__ == '__main__':
    from pix import contact, OUT
    items = []
    for c in ('hero', 'mira', 'bram'):
        body, _ = B.left_body(c)
        base = dict(B.frames_for(c))
        for w in B.WEAPONS_OF[c]:
            items += [(f'{c}_{w}_windup', base[f'{w}_windup']), (f'{c}_{w}_victory', base[f'{w}_victory'])]
        items += [(f'{c}_{n}', f) for n, f in extra_frames(c) if n not in ('combo', 'levelup')]
    p = os.path.join(OUT, 'anim_party_extras_4x.png')
    contact(items, p, scale=4, cols=10, title='party extras at 4x: windup / victory for reference, then crit, combo, levelup per weapon')
    print(p)
