# E3-scene-ui: the battle scene, title and credits for Episode 3 (wave 17d, run 9 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.4 and 7, `docs/EPISODE3_PLAN.md` 6.3 to 6.5, 9.3 and 10 (your contract),
`docs/CRITIQUE_4.md` items 1, 10 and 11, `docs/PLAYTEST_REVIEW_4.md` fixes 1, 6 and 9, and the E3-battle, E3-sprites
and E3-saves reports.

## Items, in order

1. **Backdrops** per zone (`ash_road`, `foundry`, `crucible`, `heartforge`) in `BACKDROP_ASSETS` and `backdropKey`.
2. **Heat presentation**: three flame pips per Heat foe, visible while commands are chosen, under the feet or above
   the head (never across a body, never under the touch command window); the flare announce; "Quenched!" with steam.
3. **Tempered Oath presentation**: Bram's stance (a ring of light), the redirect arrows, the Last Hammer rung off Bram
   (`oath_ring`, a bell-shaped flash) and the Break that follows.
4. **The Warden**: the three looks swapped at phase changes with a crack fx; the coils' entrance; the Molten Shell
   halo; boss intro cards THE BELLOWS SPECTER and THE CINDER WARDEN (the W5 style).
5. **Title**: the "Episode 3: new party" row from `episodeOffers` with its help line and E3-saves' slot picker (notice,
   refusal); credits accept `CREDITS_EP3`; the end card; journal and bestiary pages hold Episode 3 content (check
   overflow on the phone).

## Rules

- Owned paths: `src/battle/scene/**`, `src/scenes/battle.js`, `src/battle/fx.js`, `src/ui/**`, `src/scenes/title.js`
  (the Episode 3 row and picker UI only), `src/scenes/credits.js`, `src/scenes/menu.js`, `qa/battlescene/**`,
  `qa/ui/**`.
- The phone is the bar: every new element checked on the 844x390 profile and in portrait. No git, no em dashes,
  bounded commands, one browser job at a time.
- Verify: `node qa/run.mjs battlescene ui`; `python qa/battlescene/autobattle.py` on `sr_first`, `bellows_specter` and
  `cinder_warden`; shots of Heat pips at command time, an Oath turn, each Warden look, the title with and without a free
  slot, desktop and phone.
- Report under 400 words: what draws where, shot paths, test counts, anything the integrator must wire.
