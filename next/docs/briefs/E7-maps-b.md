# E7-maps-b: the Frostbound Vault's three floors and the Stillheart (wave 7c, beside E7-maps-a and E7-audio)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE7_PLAN.md` sections
0.1, 4, 4.5 to 4.11 and 5 (your contract), `docs/story/STAGING_EP7.md`, `docs/WORLD_EP7.md`, `docs/PLAYTEST_REVIEW_8.md`
items 2, 3 and 9 (the one-way lift, the loop home, the bot that never rested), and the E7-tiles, E7-world, E7-story and
E7-battle reports. Model the files on `src/data/maps/ep6_obs_f1.js` to `ep6_obs_eyrie.js`.

## Owned paths

`src/data/maps/ep7_vault_f1.js`, `ep7_vault_f2.js`, `ep7_vault_f3.js`, `ep7_stillheart.js`, `qa/maps/ep7_b_*`,
`docs/MAPS_EP7_B.md`, `tools/maps/previews/ep7_vault_*`, `ep7_stillheart*`, and the one `EP7_MAPS_LISTED` line in
`src/data/ep7/encounters.js`.

## Outputs (items, in order)

1. **The four maps** of plan 4.6 to 4.9 with every mark, event, enemy count, chest, font, lift and inspect id from the
   pack's `text.js`; each floor's `remember` block (5 stones at most); F2's `start: ['d']` grip and its frost doors `D` and
   `R`; F2's lamp pools over held stones (E7-world draws them; you place the stones where the pools read); F3's hidden stone
   in Keeper ink (`lantern: true`) to the Road Home; the round door (`stillheart_open`) and the inner grate
   (`stillheart_key`); the Stillheart's heart, page block, the two doors back (`nave_down`, `square_return`) and the ending
   marks.
2. **The decision budget** (plan 4.10), exact: F1 **4** (B 2, C 2; the balcony 0), F2 **3** (B 2, C 1), F3 **5** (Shelter 1,
   Remember 2, Return 2; the round door 0); optional F1 1, F2 2. A floor that needs more takes them from another floor of the
   table only by agreement with E7-maps-a in your reports, never adds. Print each floor's count from `ep7_check.mjs`.
3. **No loop home** (PLAYTEST_REVIEW_8 item 3): the shortest critical-path solution of every floor never re-reads a stone
   more than 6 cells behind the party and walks at most 1.3 times the straight route; F2's grip lets go *forward* (the two
   stones that release Dagny are the paths onward).
4. **Two-way lifts from the first build** (PLAYTEST_REVIEW_8 item 2): `lift_f1_up` (F1 basin to F2's Lamp Gallery) and
   `lift_f2_down` (F2 to F1's basin), both `if: vault_f2_done`; F3's first-landing stair back to F2. Each shortcut lands on
   ground next to a font and needs no stone.
5. **The gold line** (plan 7.6): the main-path chests exactly as listed (F1's Winterwatch Provision Cache 1,500; F2's Lamp
   Gallery chest 1,200); E7-battle's `economy7` reads them. Report any change.
6. **The camera rule and the staging:** every focus mark at least 12 tiles from the map's sides and 7 from its top and
   bottom; `bell_stop` two rows below the tag; `keeper_stair` and `keeper_wait_1` to `_3` on ground beside each landing's
   stone; the Stillheart's `party_stop` with the Phantom and the heart framed together on the phone.
7. **Darkness:** F2 dark 0.45 with the held-stone pools; F3 under the `aurora` tint with mean luma between F1's and F2's and
   the party's floor at or above 0.22 on the phone (the quiet floor, not the darkest).
8. **Tests** `qa/maps/ep7_b_*`: the critical path from F1's basin to the Stillheart through E7-world's state search, with
   F2 starting held; every chest reachable in some state; no state strands the party; the reload-home test (a save on each
   floor reloads with authored holds and the party on ground); the lifts both ways; marks inside the camera rule.
9. **Previews** (each floor in the states that matter: F1 B and C before and after; F2's grip held and released, the
   Reliquary pair; F3 each landing; the Stillheart before and after `phantom_defeated` and at night), viewed;
   `docs/MAPS_EP7_B.md` with exact cells, each font's cell (the bot rests at every one: PLAYTEST_REVIEW_8 item 9), each
   floor's decision count and the route as read and step sequences for the autoplay bot. Then flip `EP7_MAPS_LISTED` to
   true once the critical path test passes.

## Done when

`node tools/maps/mapcheck.mjs check` is clean, the critical path test passes with the decision counts at or under the
table, every preview has been viewed until it reads like a shipped SNES dungeon, `node qa/run.mjs maps world` is green, and
`EP7_MAPS_LISTED` is true.

## Tests to run

`node tools/maps/mapcheck.mjs check`; `node tools/maps/ep7_check.mjs`; `python tools/maps/preview.py` on your maps at scale
2; `node qa/run.mjs maps world`.

## Traps

- **A frost door under the party** is refused by the rule, but a map can still trap the party behind a door it froze: the
  state search must show the way back from every state. Do not rely on Talk to get a player out.
- **Stones:** at most 5 per map; no cell in two paths or two doors; no actor, trigger or enemy on a path or frost cell.
- **The bell lesson.** Every font and save point uses its own Episode 7 text key.
- **The bot rests.** Put every font where the bot's static grid can reach it without crossing a path cell, or say in
  `MAPS_EP7_B.md` which read the bot needs first.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; restore `qa/world/out` if a suite rewrote it.

## Report (under 400 words)

Marks that differ from the plan, each floor's decision count and route, the lifts, the gold chests, enemy and chest tables,
the darkness numbers, preview paths, and the `EP7_MAPS_LISTED` flip.
