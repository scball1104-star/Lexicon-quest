# X1-world: Appraise on objects, quest EXP, the link allowlist, small checks (X1 wave W2)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 5, `docs/EXPANSION_RECONCILIATION.md` (the decision log; it wins), `docs/EXPANSION1_PLAN.md` sections 3.2, 6.2, 11 (your contract), `docs/WORLD.md` (abilities,
section 1c; breakables and `behind`), `src/world/abilities.js` (`appraiseTarget`, `appraise`, `lastHit`), `src/world/events.js` (`behind`,
`breakBreakable`), `src/world/cutscene.js` (`give`) and `tools/maps/mapcheck.mjs` (the breakable and `behind` modeling). The Episode 2
expansion uses the same Appraise feature and the same quest-EXP primitive (`docs/EXPANSION2_PLAN.md` section 15): you build the **one** contract for both; they build none.

## Items, in order

1. **Appraise on objects** (plan 11.1). An `object` event with `appraise: true` is an Appraise target: `appraiseTarget` (pure, node-tested) scans
   objects as well as enemies (at the **existing Appraise range**: read the constant in `abilities.js` and report it, since the two plans guessed 5 and 3; line of sight as for enemies, never through a wall); `appraise()` plays the existing
   tag-in, lens beam and reticle, then shows the object's `appraiseText` lines in the window instead of a bestiary entry, then
   `markOpened(game, mapId, id)`; any event with `behind: 'appraise:<object id>'` appears with the existing sparkle (the form the Episode 2 plan
   also uses; a plain `behind: '<id>'` keeps meaning a breakable). Saved per save. First-time bark `first_appraise_object` (bark only if the text
   id exists). A confirm press on an object with `appraise` and `text` still reads its text when Appraise is not the selected ability.
2. **`give('exp', n)`** (plan 11.3, the only quest-EXP primitive of both expansions; scenes call `await s.give('exp', n)`) in `src/world/cutscene.js`: grants `n` EXP to every living party member through `grantExp()` (`party.js`),
   shows "The party gains n EXP.", plays the `level_up` jingle and the existing level-up lines when a member levels (reuse the victory window's
   helper if importable, else one message box per level-up). Never scaled; idempotent only through the caller's flag guard. Node-tested (pure helper); a test proves
   `give('gold', n)` and `give(itemId, qty)` are unchanged.
3. **`mapcheck`**: treat an `appraise` object as an unlocker like a breakable (the `behind: 'appraise:<id>'` target is reachable once a cell within
   range in line with the object is reachable); a fixture map proves it.
4. **The link allowlist** (plan 11.4): `tools/maps/x1_links.json`, seeded from plan 3.2 and 4.10 with every cross-link whose target map will not
   exist when its source map is built (`{ from, to, cell }`); `mapcheck check` reports a missing target that is in the list as a warning and any
   other missing target as an error; an entry whose target now exists is ignored, so nobody edits the file after you. X1-maps-hub writes the test
   that every listed target exists.
5. **Small checks** (report; fix only in your files if broken): (a) a `pit` area event with `to` pointing at **another map** (the Terrace's drop, the
   hay chute) transfers, lands facing the given direction, and does not damage the party; if it only supports same-map targets, extend it, and
   make a `pit` with an `if` flag respect it; (b) a `door` or exit event with `if` hides and disables correctly when its flag is off (the new
   gates depend on it), and a solid `object` with `ifNot` stops blocking the moment its flag is set; (c) `ambientFx: ['motes']` over an area is
   cheap on a 72 x 36 field map (draw under 0.3 ms extra).
6. **Tests** `qa/world/x1_*`: the Appraise contract (target selection, wall blocking, the reveal, persistence across a save and load, `lastHit`
   shape), `give('exp')`, the mapcheck fixture, the allowlist, the pit and door checks. A fieldlab shot (`qa/world/fieldlab.py`) of Appraise on a
   scarecrow-like object before and after.
7. **`docs/WORLD.md`**: a short "Expansion 1" section with the `appraise` field and `give('exp')` contracts.

## Rules

- Owned paths (the Episode 2 world agent edits some of these later, after P1b; never together): `src/world/abilities.js`, `src/world/events.js`, `src/world/cutscene.js` (the `give('exp')` branch only), `tools/maps/mapcheck.mjs`,
  `tools/maps/x1_links.json`, `qa/world/x1_*`, `docs/WORLD.md` (one section). Do not edit `src/scenes/field.js` unless a check in item 5 proves it
  must (say so in the report).
- Pure modules stay pure. No timers in puzzles. No git, no em dashes, bounded commands, one browser job at a time.
- Verify: `node qa/run.mjs world maps`; the fieldlab shot viewed.
- Report under 400 words: the exact `appraise` event fields and the `behind` form, the bark and text ids X1-story must supply, the `give('exp')`
  signature, what items 5a to 5c found, test counts, shot paths.
