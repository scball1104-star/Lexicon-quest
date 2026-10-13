# Chapter VII — Frostbound Vault Edition

Development build: October 13, 2026. Extends the complete Storm Observatory Edition. Seven regions now have authored chapter content; Chapter VIII (First Library) remains a generated campaign scaffold awaiting a complete authored finale.

## Narrative and town

Palehaven, in the Hollow North, is afflicted by disappearing paths and the refusal to acknowledge people who have left or died. Keeper Nox sealed the Frostbound Vault to suppress the memories that caused her grief. The White Phantom has exploited that protective impulse, freezing the names of the absent as if stillness were safety.

**Optional Palehaven story:** Speak with **Mirael** (physician), **Oren** (crystal surveyor) and **Eira** (last lantern keeper), then interact with the **Hearth of Returning Names** in the square. This grants two Potions and two Ethers, reduces first-entry black frost damage from **9 HP to 2 HP per living party member**, and adds **+20 Focus** against the White Phantom. The reward can only be earned once.

## Three authored 27 × 21 dungeon floors

1. **The Vanishing Steps.** A series of interconnected western galleries leads to a single locked eastern bridge. Sun beacons rotate through OFF (0), SUNRISE (1), NOON (2), DUSK (3). Set **WEST → SUNRISE**, **NORTH → NOON**, **SOUTH → DUSK** to illuminate the bridge; dangerous black frost visually becomes icepath. Recover the **Stillheart Crystal Key** from the northern balcony and ascend on the east side.
2. **The Hall of Borrowed Light.** Cycle light lenses through DARK (0), RECEIVE (1), REFLECT (2): **WEST → RECEIVE**, **CROWN → REFLECT**, **SOUTH → RECEIVE**. Also complete the intersecting **Frostbound Names Crossword**. Both must be completed; either order works. For an optional cache, read witnesses in order **OPEN THE DOOR → SHARE THE FLAME → CALL THE LOST**, then open the Keeper Emergency Reliquary to collect **240 gold and 2 Ethers**, only once.
3. **The Stillheart Sanctum.** Speak the keeper promises in order **SHELTER → REMEMBER → RETURN** to open the eastern bridge; use the Stillheart Crystal Key at the guardian lock. Nox's three memory scenes—one per dungeon floor—restore her brother **Corin** to the story and grant a two-round opening Aegis ward, **+35 Focus**, and one automatic charged-blizzard interruption.

### The White Phantom

A four-phase tactical boss, separate from dungeon-only crossword mechanics:

- **Outer Frost:** armored and weak to fire.
- **Frozen Ward:** activates under 68% HP; two memory shadows appear (Closed Gate and Lost Letter). Boss damage is strongly reduced and HP is floored at 33% until both shadows are defeated.
- **Thawlight:** ward drops, armor decreases, fire weakness exposed; party gains 25 Focus.
- **Stillheart Blizzard:** triggers under 28% HP; charged blizzard attacks intensify. Piercing Thrust can interrupt, while Aegis/Defend protect the party. Nox can automatically cancel one charged attack if her three memories were recovered.

**Ending:** Nox reads Corin's letter publicly; the northern pathways reappear. The recovered keeper records reveal that the First Library commanded the North to erase anyone who knew the First Keeper's true name. The party heads to **Chapter VIII: the First Library**.

## Experience improvements

- New winter dungeon tiles: `icewall`, `frostbrick`, `icepath`, `iceglass`, `icebridge`, `blackfrost`. Animated glints, crystal seams, black-frost streaks and lit glass bridges use existing canvas rendering; `icewall` remains impassable.
- Frost beacon and lens state panels are drawn on the map, and quest progress / next actions appear in the sidebar.
- Town focus, guide and local notice board updated for Palehaven witnesses and the optional Returning Hearth.
- Existing keyboard, mouse and touch controls remain, along with resident wandering, interiors, music, and save compatibility.

## Verified checks

- Campaign: **1,053** passing geometry, crossword, combat, save and full eight-region campaign checks.
- Chapter VII: **123** dedicated checks, including route/gate reachability, reversed crossover puzzle order, one-time frost damage, town reward non-farmability, boss phases and closing narrative.
- All earlier authored chapter, combat, indoor navigation, citizens, environment, UI, and offline-cache checks pass via `netlify.toml`.
- **Synthetic desktop and mobile Chromium render checks passed**, including location rendering, field canvas presence, no uncaught JavaScript errors, and no horizontal overflow. These load source scripts into an in-memory page because this environment blocks local HTTP/file URL navigation. Images linked relative to the hosted URL do not load in that isolated preview; host-delivered sprites, actual iPhone Safari and Netlify deployment still need real-device validation.

## Deploy to the existing Netlify site

Extract the ZIP. Publish **the contents of the extracted root** (which includes `index.html`) to the existing Netlify site, keeping the URL `forgotten-words.netlify.app`. The package includes all previous game assets, music, scripts and tests. The service-worker key is now `lexicon-quest-frostbound-v41`; hosted clients may need to reload once or twice for the new offline cache. Version **3** saved games remain compatible. Export critical saves before deploying.

Not yet a production-quality 15–20 hour handcrafted JRPG. Chapter VIII still needs a fully authored finale, and art still needs original per-region animation, deeper staging, camera layering and direct playtesting.
