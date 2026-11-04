# E4-fixes: two passes from critic-6 and play-critic-6 (wave 4f)

Source reviews: `docs/CRITIQUE_6.md` (C#) and `docs/PLAYTEST_REVIEW_6.md` (P#). Read both, `docs/briefs/COMMON.md`,
and the protect lists in each before you touch anything. The protect lists win over any fix here.

Two agents run at once with disjoint paths. Neither runs git. Neither runs `build_pwa.py` or `sync-manifest`; the
orchestrator does that once at the end. No em dashes. Every command bounded with a timeout. One browser job at a time.

## E4-fixes-A (play and battle UX)

Owns: `src/` (core and `src/data/ep4/` except map files), `qa/` tests, `tools/sim/`, `qa/integrate/story_time.py`,
`docs/BATTLE.md`, `docs/story/STAGING_EP4.md` only for the two text items below.

1. P1: an Episode 4 save must never be lost when the pack fails to load. Land on a real map (or stay on the title with
   a message), and never autosave on Test Town. `src/scenes/field.js` ~147-159, `src/game/packFallback.js`. Add a test.
2. P2: Answer is found. Generalise the Tempered Oath float in `src/battle/scene/menu.js` so a pack can name its own
   signature Tech (Answer during the Strike from the Roll). Add a test.
3. P3: quick-start players get Episode 4 audio (13 "unknown audio id" warnings). `src/data/ep4/index.js`,
   `src/game/packs.js`. Add a test that the quick start registers the ep4 audio ids.
4. P4: Enter must not map to both confirm and Auto (`src/core/input.js` ~27). Pick the smallest change that keeps
   every existing control documented in the game's help and tests; say what you chose.
5. P5 pacing: count tide puzzles by decisions, not clicks, in `story_time.py`; remove one `e4k3_watch` and one
   `e4k3_decrees` group from the F3 path so the Regent is met at Lv 20 (P7). Rerun the sim and the timer.
6. C1: decree seal pips readable on a phone: unlit seals need a visible outline, the lit one a bright fill.
   `src/data/ep4/scene.js`.
7. C2: phone Barrister weakness row sits under its feet like desktop (`planEnemyRows`, `src/scenes/battle.js` ~829).
8. C13: phone Regent fight prints the action name twice and the help bar floats mid-screen.
9. C4: wheel level mark and tide post water line readable at rest (draw-side if in code; if art-only, leave to B and say so).
10. P8: Barrister data matches `EPISODE4_PLAN.md` and Mira's "Burn the paper" tip (fire must not be resisted unless the
    plan says so; if the plan and the tip disagree, follow the plan and report the tip as a story question).
11. P10: stray colon in the broken-decree message. P9: the Witness Book "under water" line in a dry room: propose the
    smallest wording fix in your report and in STAGING_EP4.md section 4 as PENDING Scott/Stephen; do not change the
    shipped line.
- Any core byte must be paid for by core trims (`qa/pwa/budget_ratchet.json`). Run `node qa/run.mjs`, the root gate,
  `simulate --check`, and `mapcheck --pack ep4` before reporting.

## E4-fixes-B (art and maps)

Owns: `tools/art/`, `assets/sprites/ep4_*`, `assets/ui/ep4_*`, `assets/tiles/ep4*`, `assets/backdrops/ep4_*`,
`src/data/maps/ep4_*` (dressing only: props and tint, never walkability, events, or warps), `docs/MAPS_EP4_*.md`.

1. C6: F3 reads as a drowned court, not the brightest map in the episode. Darken and cool its tint/palette.
2. C7: Keep F1 gets its own palette (not Episode 3's lilac) and a dressing pass of props.
3. C8: field foes on keep floors get a dark outline, not a rim in their own colour.
4. C9: Lockjaw Crab reads as a crab: claws forward, not antennae.
5. C10: Lyra's portrait reads about fifty: grey in the hair, some age lines. Keep her face and palette otherwise.
6. C14: Gutter Phantom's cast glow is gold per its recipe (fix the colour mask).
7. C15: Royal Ward writs read as hazards, larger or with a stronger outline.
8. C4 if art-side: bolder wheel marks and post water lines in the tiles.
- After any map change, `node tools/maps/ep4_check.mjs` and `node tools/maps/mapcheck.mjs --pack ep4` must stay clean,
  and `qa/maps/ep4_b_maps.test.mjs` green. Render before and after stills for each item into `qa/out/fixes6/`.

## Not in this wave (proposals for the report)

C3 close-up inserts for the three payoffs, C5 new keep battle backdrops, C11 party staging over Vex, C12 Barrister
look vs story, and the story cuts in P (crown_remembers, vex_archive). These need Scott and Stephen.

## Report

Under 400 words: what changed per item with file paths, what you skipped and why, and the gate results.
