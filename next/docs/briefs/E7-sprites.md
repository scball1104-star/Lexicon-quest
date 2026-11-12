# E7-sprites: NPCs, enemies, the Pale Lantern, the White Phantom, the Closed Gate and the Lost Letter, portraits (wave 7b, beside E7-tiles and E7-world)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/story/EPISODE7.md` section 3 (looks),
`docs/EPISODE7_PLAN.md` 0.1, 6.2, 6.4, 6.5, 9.0 and 9.2 (your contract), `docs/PWA_PACKS.md` (pack atlases `<id>_npcs`,
`<id>_enemies_battle`, `<id>_enemies_field`, `<id>_bosses_battle`, `<id>_portraits`, `<id>_heads` merge into the base
atlases at runtime), `docs/CRITIQUE_6.md` items 8, 9, 10, 12 and 15, `docs/CRITIQUE_7.md` item 2, `docs/CRITIQUE_8.md`
item 1 (the Scribe's row left the Scribe in its later looks), and the Episode 6 scripts `tools/art/sprites/ep6_*.py` (the
recolor recipes, the Scribe's looks, the Beacon and the Compass).

## Owned paths

`tools/art/sprites/chars/ep7_*`, `tools/art/sprites/ep7_*.py` (+ one line in `build_all.py`), `assets/sprites/ep7_*`,
`assets/ui/ep7_heads.*`, `qa/core/ep7_sprites*`. Prefixed files only; never rewrite a base atlas.

## Outputs (items, in order)

1. **NPC specs** (`chars/ep7_*`): Nox (`npc_keeper`: seventies, small and straight-backed, long blue Keeper's coat with
   frost on the hem, white hair pinned up, ink on her right hand, a lamp), the young Keeper (`npc_keeper_young`, a girl in a
   blue coat) and the grown Keeper of memories 2 and 3 (`npc_keeper_mid`), the Keeper's mother (`npc_keeper_mother`, a lamp
   in an open gate), Marten (`npc_courier_m`: fifties, courier's coat with a brass post badge, a ready grin, snow to the
   knees), Bryn (forties, guard's fur hood, a lantern staff), Eira (thirties, leather apron, a lens on a cord), Sol
   (twenties, twine round both wrists, a pack of stakes), Maera (fifties, a basket of winter moss), Torr (sixties, ink-blue
   fingers, a ledger), Mirael (forties, a physician's bag, a frost-grey scarf); the North Watchkeeper as an innkeeper
   recolor. Ages must read (CRITIQUE_6 item 10): white hair for Nox, grey for Torr.
2. **Enemy battle sprites**, the seven of 6.2, each from its listed `enemies.webp` cell (or the Lost Page sprite), recolored
   to snow white, ice blue, pine black and aurora violet so none reads as its Episode 6 cousin; **cell 7 as painted** for
   the Frostbound Revenant (it is the icy skeletal phantom the cell was drawn as); a dark outline and a cool rim on every foe;
   derived frames (idle, attack, hurt, cast where used, die); field sprites with the same outline and rim, **checked on each
   floor at phone scale, on snow, on the fade and on frost brick**, not on the sheet background (CRITIQUE_6 item 8).
3. **The Pale Lantern** (cell 1: frost white and ice blue, a great lantern drawn into the hood where the glow was, its light
   cold blue).
4. **The White Phantom**: three looks (Outer Frost as painted; the Frozen Ward with the cloak spread like a door, a gate and
   letters frozen into it behind, the crown frosted; Thawlight with frost cracking off in plates, the crown dripping, a warm
   light in the chest) from `bosses.webp` cell 6 at 1x, plus `phantom_avatar` (front and back, standing over the heart). A
   readable focal point at phone size. Do not touch bosses cell 7 (held).
5. **The Closed Gate and the Lost Letter**: one small new sprite each (an iron-and-ice gate on a post with a frozen lock,
   about 44 x 56; a folded letter in a shell of ice with a broken seal, about 40 x 36), each with a ground shadow, sized to
   stand in front-row foe slots beside the Phantom with their HUD rows under their own feet and at least 12 internal px from
   any party sprite (CRITIQUE_7 item 2, CRITIQUE_8 item 1). **Give E7-scene-ui one HUD anchor per Phantom look that stays
   over the crown in all three** (the Scribe's row wandered in its later looks).
6. **Portraits**: `phantom` crop readable at 48 in `ep7_portraits` (the antler crown, an eye socket, a cloak edge). Nox has
   none (plan 9.5); do not use `hooded_sage` (held for the First Keeper).
7. **Timeline heads** for every new foe in `ep7_heads` (the scene draws a party head's frost; do not bake it).

## Done when

Every id is in its pack atlas; contact sheets at 4x are viewed; the side-by-side check (the Phantom, the Lantern and the
Frostbound Revenant beside the Storm Scribe, the Lightning Manta and the Sand Oracle) shows six different beings; phone-scale
crops of every field enemy on each floor's mock are viewed; `node qa/run.mjs core pwa` is green with the initial download
unmoved.

## Tests to run

`python tools/art/sprites/build_all.py` (your one line); `verify.py`; `node qa/core/sync-manifest.mjs --pack ep7`; `node
qa/run.mjs core pwa`. Tests you add: every frame name the scene and the field ask for exists; every look id the boss's
phases name exists (so `enterPhase` can forward it); every look has its HUD anchor.

## Traps

- **Boss phase changes forward `sprite` in `ai.js` `enterPhase`**: name your three look ids exactly as E7-battle's phases
  do (`white_phantom`, `white_phantom_ward`, `white_phantom_thaw` unless E7-battle's report says otherwise), or the Phantom
  never changes look.
- **`assets/ep7_manifest.json` is generated**; the orchestrator must `git add` it at wave close: say so.
- Field foes camouflage on snow and the fade: the rim and outline are not optional; check them on the real floor art.
- Cell 7 was recolored violet for Episode 6's Lightning Manta; as painted it must not read as that manta: check them side
  by side.
- No non-integer scaling of pixel art.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; targeted renders; no paid generation.

## Report (under 400 words)

Ids, frame names the scene uses, look ids per phase and their HUD anchors, preview paths, what fell back, and the manifest
note.
