# W5-systems: equip prompts, legendary toasts, lantern prompt, battle touch rows, smarter bot

**Owned paths:** `next/src/world/**`, `next/src/scenes/{field,battle,menu,gameover,dialog,shop,inn}.js`,
`next/src/game/**`, `next/src/ui/**`, `next/src/battle/scene/**`, `next/qa/autoplay.py`, `next/qa/autoplay_grid.mjs`,
`next/qa/world/**`, `next/qa/ui/**`, `next/qa/battlescene/**`, `next/qa/integrate/**`, `next/docs/{WORLD,UI,BATTLE_SCENE}.md`.

Read `next/docs/PLAYTEST_REVIEW_1.md` fully (section 3 is the key finding: the bot, and so a careless player,
never equips the gear it finds and never refills MP), the W4b report's leftovers (battle command and game-over
menus still have keyboard-sized rows on touch; battle help window should mention Auto and Speed), then
`docs/UI.md`, `docs/WORLD.md`, `docs/BATTLE_SCENE.md`. The story/maps agent is working in parallel on
`src/data/**` and `qa/content|maps`; do not touch those.

## Deliverables
1. **Equip prompt on pickup:** when a chest, drop or scene grants equipment that any party member can equip and
   `equipDelta` is positive on a non-empty-stat line, show a dialog choice "Equip the Iron Pike on Bram?" with
   Yes / Later (first eligible member; if two are eligible, offer both names). Yes equips through
   `src/game/inventory.js` and shows the stat arrows in a toast. Battle drops ask after the rewards window. A
   config toggle "Equip prompts: on/off".
2. **Legendary and rare toasts:** `engine.toasts.received` shows the item name in its rarity color, and legendary
   items get the rarity beam sprite for 1.5 s plus `drop_legendary`; rare gets `drop_rare`.
3. **Lantern prompt:** when the player holds the Lantern of Recall and stands within 2 tiles of unrevealed hidden
   ink, the field shows the interaction prompt with the pageR button glyph bobbing over the hero (touch shows a
   small "Lantern" button in the touch overlay while it applies). The Items screen description of the lantern
   names the button.
4. **Battle touch:** command list and sub-lists use the phone row height from `List` (`TOUCH_ROW_H`) with
   tap-to-select and second-tap confirm; targeting by tap on the unit; the help window, when idle with no
   telegraph, appends "{i:btn_start} Auto  {i:btn_pageR} Speed" (device glyphs; touch shows two small buttons
   instead). Game-over menu rows likewise.
5. **Fonts and MP:** make `font` events (and the chapel bell) restore MP as well as HP (verify), and show the
   "Rest here?" choice before healing, with the save prompt after. Ensure the `safe: true` landmark rule covers
   fonts the story agent adds.
6. **Bot:** `qa/autoplay.py` runs `menu_optimize_all()` after every chest-bearing room and after each floor, uses
   Ethers when a caster is under 30% MP outside battle, and rests at any font it passes when HP < 60%. Then
   re-run the full desktop autoplay and report game overs (expect F3 game overs to drop to 0 or 1 with the
   story agent's encounter swap; if they do not, say so with the save state).
7. **Pit tell:** before the first pit on F3, a single page particle drifts down into it when the player enters the
   room (one-shot, `particles` hook keyed to a map `ambientFx` entry the maps agent can set; default off).

Keep `node next/qa/run.mjs` green; add tests for the equip prompt decision function (pure) and the toast rarity
mapping. Verify by shots (desktop + phone) you view, and by the autoplay run. Report with image paths and the
autoplay timing/game-over table.
