# Common brief for every NEXT agent

You are one specialist on a multi-agent team rebuilding **Lexicon Quest** (Scott Ball's SNES-style JRPG) to
professional quality. Repo: `D:\LexiconQuest` (git). The new game lives in `D:\LexiconQuest\next\`.
Scott is away for a week; nobody will answer questions. Use your judgment, write down assumptions in your report.

1. **Read `next/DESIGN.md` fully first.** It is the contract. Then read your own brief.
2. **Ownership.** Create or modify files ONLY inside the paths your brief lists as owned. You may READ anything
   in the repo (the old game at the repo root is a rich source of story text, data and art).
   Other agents are writing other folders of `next/` at the same time. Never delete or rewrite their files.
3. **No git commands at all** (no status/add/commit/stash/checkout). The orchestrator merges.
4. **No em dashes** (U+2014) in anything: player text, docs, comments. Use commas, colons, periods or " - ".
5. Tools: Git Bash, Python 3.12 (Pillow, numpy), Node 24, Playwright for Python with Chromium (headless).
   No network downloads, no new packages. Bound every long command with a timeout.
6. Put scratch/preview output in an `out/` folder inside your owned tools folder (it is git-ignored).
7. **Look at your own work.** For anything visual, render PNG previews at 3x or 4x nearest-neighbor and view
   them with the Read tool. Iterate until a professional pixel artist / game designer would sign off. Compare
   against the quality of Chrono Trigger, Lufia II, Final Fantasy VI, Secret of Mana. Do not stop at "it works".
8. This is a long task. Take the time to do it properly (hours are fine). Prefer depth and polish over breadth
   when you must choose, but deliver every item on your list at least at a solid level.
9. **Final report** (your last message, under 450 words): what you built, key files, how you verified it
   (with the preview image paths), known gaps, and exact contracts other agents must know (APIs, ids, formats).
   If you believe DESIGN.md should change, propose the exact change in the report instead of editing it.

## Shared canonical ids (use exactly these)

- Party: `hero` (player-named; sword + axe), `mira` (staff + bow), `bram` (spear + axe).
- Enemies (source cell in `../assets/art/enemies.webp`, 4x2 grid, cell index row-major):
  `ink_slime` (cell 0), `page_wraith` (cell 1, sepia/ink recolor), `briar_wolf` (cell 2, brown/green recolor),
  `moss_scarab` (cell 3, original colors), `bookmite` (cell 3, sepia/ink recolor, smaller),
  `tome_golem` (cell 4), `ink_wraith` (cell 7, dark ink recolor), `echo_warden` (cell 5, mini-boss),
  `lost_page` (boss add, original small sprite), `archivore` (`bosses.webp` cell 0, Episode 1 boss).
  Zones: valley = briar_wolf, moss_scarab, ink_slime. Archive F1 = ink_slime, page_wraith, bookmite.
  F2 = page_wraith, tome_golem, bookmite + echo_warden. F3 = ink_wraith, tome_golem, page_wraith + archivore.
- NPC sprite ids: `npc_elder` (Elder Mael), `npc_tess`, `npc_baker` (Oren), `npc_ferry` (Nella),
  `npc_innkeeper`, `npc_shopkeeper`, `npc_smith`, `npc_child_a`, `npc_child_b`, `npc_guard`, `npc_old_woman`,
  `npc_farmer`, `npc_scholar`, `npc_parent` (the hero's guardian), `npc_bellkeeper`, `animal_cat`,
  `animal_dog`, `animal_chicken`, `animal_duck`.
- Portrait ids: `hero`, `mira`, `bram`, `mael` (+ any others the sprites agent can source; documented in its report).
- Map ids: `hero_home`, `willowmere`, `inn`, `item_shop`, `smithy`, `library`, `chapel`, `bakery`, `valley`,
  `archive_f1`, `archive_f2`, `archive_f3`, `archive_boss`.
- Main story flags: `intro_done`, `met_mael`, `mira_joined`, `bram_joined`, `left_town`, `archive_entered`,
  `archive_f1_done`, `echo_warden_defeated`, `lantern_get`, `archive_f2_done`, `boss_door_open`,
  `archivore_defeated`, `ep1_complete`.
- Key items: `lantern_of_recall`, `archive_key` (small key, counted), `stacks_key` (boss key),
  `tess_letter_1`, `tess_letter_2`, `tess_letter_3`, `name_fragment_1`.
- Music ids: `title willowmere valley archive battle boss_archivore mystery sorrow triumph victory gameover`.

## Bitmap font format (`assets/ui/font*.json`)
```json
{"image":"font.png","lineHeight":11,"baseline":8,"spaceAdvance":3,
 "glyphs":{"A":[x,y,w,h,xoff,yoff,advance]},"kerning":{"AV":-1}}
```
`yoff` is relative to the top of the line box; `advance` is the pen advance in pixels. Glyphs are drawn in
white on transparent so code can tint them. Shadow is drawn by code (1 px down-right, dark ink).

## Expansion agents (X1-*, X2-*, XP-packs)

If your brief is named `X1-*`, `X2-*` or `XP-packs`, also read `docs/EXPANSION_RECONCILIATION.md` (the decision log) before your plan: where a plan or a brief disagrees with it, it wins. The build order, the wave tables and the launch prompts
are in `docs/EXPANSION_SCHEDULE.md`. Your owned paths are disjoint from every other agent in your wave; never edit a single-writer file that is not in your brief, and never run beside an agent the schedule says must not run with you.

