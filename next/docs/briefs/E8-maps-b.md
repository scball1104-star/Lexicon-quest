# E8-maps-b: the First Library's three floors and the Last Word (wave 8c)

Build the closed half of Episode 8: the dungeon and the boss floor.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 and 5.3, `docs/MAPS.md`, plan `docs/EPISODE8_PLAN.md` sections
2.1, 2.4, 4.4 to 4.8, 4.10, 4.11, 5.4 and 5.5 (your contract), `docs/story/EPISODE8.md` Acts IV and V, `docs/story/STAGING_EP8.md`,
`docs/WORLD_EP8.md`, E8-tiles' report, E8-battle's zone plans, the built Episode 7 Vault maps as your models
(`src/data/maps/ep7_vault_*.js`, `ep7_stillheart.js`), PLAYTEST_REVIEW_8 items 2, 3 and 9.

## Owned paths

`src/data/maps/ep8_library_f1.js`, `ep8_library_f2.js`, `ep8_library_f3.js`, `ep8_last_word.js`, `qa/maps/ep8_b_*`,
`docs/MAPS_EP8_B.md`, `tools/maps/previews/ep8_library_*`, `ep8_last_word*`, and the one `EP8_MAPS_LISTED` line in
`src/data/ep8/encounters.js`.

## Outputs (items, in order)

1. **`ep8_library_f1`** (40 x 30): plan 4.5, four decisions (B 2, C 1, E 1), one optional; the Restoring Fountain; the Original
   Ink Key on the northern shelf; the Hollow and Emberpeak realm books; the two-way lift.
2. **`ep8_library_f2`** (40 x 30, dark 0.3): plan 4.6, the palimpsest pairs with one starting open (`start`), four decisions (B
   2, C 2), the Archive behind a pair the main route never needs, three evidence chests, the Valewyn and desert realm books, the
   Sentry's arena with a fountain before it, the two-way lift.
3. **`ep8_library_f3`** (34 x 40): plan 4.7, SEE, SHELTER, CHOOSE (four decisions; CHOOSE with two correct routes), the Lantern
   book to the Quill of Return, the isles and North realm books, the Charter, the keyhole door; **brighter than F1** with the
   party's sprites at least 0.12 luma off the page white.
4. **`ep8_last_word`** (28 x 24): plan 4.8, the dais, the lectern, the great book, the first shelf, the star dome, Vex's gallery
   stair and stop marks, the post-fight doors.
5. **Every lift two-way from the first build**; every shortcut lands on ground beside a font (plan 5.4).
6. **`docs/MAPS_EP8_B.md`**: exact cells, the book solutions per puzzle (both CHOOSE routes), decision counts, camera margins,
   enemy placements, chests and contents, each font's cell (for the bot's rests).
7. **Previews**, every book state that matters on every floor, **viewed**; then flip `EP8_MAPS_LISTED` to true.
8. **Tests** `qa/maps/ep8_b_*`: the critical path through all four maps with books; no stranding; every chest reachable;
   no loop home; both CHOOSE routes reach the keyhole; lifts both ways; the camera rule; the decision count against 4.10.

## Done when

`node tools/maps/mapcheck.mjs check` is clean; every preview viewed; `node qa/run.mjs maps` green; `EP8_MAPS_LISTED` true.

## Tests to run

`node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py` on each map; `node qa/run.mjs maps`.

## Traps

- **Pairs strand players easily.** Run the breadth-first check on every pair; a pair swap that closes a bridge under the party
  is refused by the rule, but a swap that leaves the party on an island with no book in reach is your bug.
- **The inversion is F2's only:** no pairs on F1; F3 reuses them only as plan 4.7 says.
- **Realm books are flavor:** never make a route depend on knowing which realm a book is (DESIGN hard rule 2).
- **The F3 brightness gate:** bright white pages can wash out sprites on the phone; measure.
- **Episode 6's one-way lift** (PLAYTEST_REVIEW_8 item 2) must not recur.
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command.

## Report (under 400 words)

Map sizes, book solutions, decision counts, F3's luma numbers, camera margins, fonts' cells, previews viewed (paths), and any
change to plan 4 and why.
