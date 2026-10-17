# Episode One refinement

Based on current main `7ad44d69029d106e2912ca1ee6d495b22a62697f`.
This is an incremental review branch, not a replacement game build.

## Playable changes

- Exploration uses requestAnimationFrame, with idle frame skipping and no hidden-tab painting. Movement can animate on display frames while ambient animation retains its slower cadence. A bounded offscreen terrain/architecture cache is reused during fractional camera motion, and rebuilt for map, viewport or DPR changes. Field and interior canvases use devicePixelRatio.
- Party turns run in descending speed, followed by the existing enemy phase. Default speed is Hero 14, Mira 12, Bram 10. Axes cost 3 speed; boots can change initiative. The timeline displays the resulting order.
- Mira gains Briar Venom: 4 MP, three enemy phases of poison. Bram gains Rally: 5 MP, 25% extra party weapon damage for two enemy phases. Armor Break can stun ordinary foes for one action, followed by two phases of stun recovery; guardians resist stun. Burn, Chill, Aegis and existing mastery remain.
- Gear has independent charm, mantle and boots slots. Enchanted equipment has secondary stats. Old one-stat charms still work. Equipment transfers remove the old holder, equipped items cannot be sold, and combat prevents equipment switching. Weapon selection, including Axe, is now also in Gear & Loot.
- Tess waits near Willowmere’s south square. Read one undelivered letter on each Archive floor and return all three for Wayfarer Boots. The quest accepts letters found before meeting Tess, checks inventory capacity, and pays only once.
- Oren the Baker and Nella the Ferrymender have stories and post-guardian dialogue.
- The Archivore’s Lost Pages have distinct fire/pierce weaknesses. Surviving pages feed it on eligible even rounds, announced in its intent. Clearing the pages removes its additional armor, exposes a fire weakness and grants Focus. Lingering damage triggers the same phase transitions as direct attacks.

## Preservation

Professional battle backgrounds, enemy/boss sheets, title key-art and portraits are preserved. No creature canvas overlay was restored. The WebAudio effects layer, title music, music-on default, Echo Warden trials and single Wayfinder remain. Existing version-3 saves load without a schema migration.

## Verification

Run `node qa/run-gate.cjs` from the repository. It executes the exact command in netlify.toml: 35 test commands, including the new render, combat and story suites. The complete gate passed after each milestone and after integration. Existing turn-position test fixtures now explicitly mark prior actors as having acted; bell-witness tests distinguish the original witnesses from the new town residents.

The Pages workflow previously ran independently of the quality workflow. It now runs the exact deploy gate before uploading, so a failed gate prevents publishing.

`qa/episode-one-browser.py` exercises desktop and mobile DPR, field rendering, weapon selection, boots, poison, Rally, professional monster art and overflow. The Episode One Browser Review workflow runs it on this branch and relevant pull requests and retains screenshots. Local Chromium installation was unavailable in the development environment; browser results must be checked in that workflow before treating visual verification as complete.

## Scope and limits

Speed currently orders companions within the party phase; it does not interleave enemies with allies. Terrain caching does not cache dynamic props, characters or lighting. This is a substantial Episode One development pass, not a claim of finished Lufia II/Chrono Trigger production quality. Touch-device feel, pacing, visual quality and encounter balance still need human playtesting.
