# Chapter II — The Court of Mirrors (October 12, 2026)

## Scope and completion

This is a substantive content milestone built *on top of* the Tactical Compass Edition, without resetting existing browser saves or affecting `classic.html`. The Court of Mirrors replaces the region-one (index 1) generic dungeon/town generator; the remaining six regions still use their existing generated maps. The game remains a development-quality RPG, **not** an equivalent of Lufia II or Chrono Trigger.

### Story arc: Nameless Hollow → Hollowmere

1. Clear the Rootbound Archive (Chapter I) to unlock Nameless Hollow. Enter town; speak to **Mayor Elian** to learn that residents cannot remember their town's name.
2. Optional town subplot: listen to **Lena**, **Tovin** and **Sister Anwen** and return to the **Fountain of Faces**. One-time reward: **90 gold, two Ethers** and **+20 Focus in the Chapter II guardian battle**.
3. Enter the Court of Mirrors. On the **Silverglass Antechamber** floor, read the inscription and rotate West, North and South mirrors to **East, South and West** respectively. Their beam opens a *physical* choke-point gate. Obtain the Mirror Key and descend.
4. In the **Hall of Other Selves**, restore the full **across-and-down Mirror-Word Crossword** to open the gate. Optional: interact with the three portraits in chronological order **Child → Keeper → King** to unlock a cache with **140 gold and two Ethers**.
5. On **The Unnamed Throne** floor, awaken the three royal vows **Belonging, Mercy, Courage** to open the bridge, then use the Mirror Key at the king's keyhole.
6. Throughout the Court, speak with **Mira's three memory echoes**. Completing her storyline awards an **opening Aegis ward (two turns) and 40 Focus** against the king. All scenes and progress persist in v3 saves.
7. Fight **The Nameless King**: veiled first phase, reflected second phase, unmasked final phase. The King calls two false reflections at about two-thirds HP; while either remains, the Mirror Ward absorbs 80% of incoming damage and keeps the king from dying, including through Resonance. Defeat both echoes to expose the King and his fire weakness. His charged attacks accelerate in the final phase; Piercing Thrust interrupts them.
8. Completing the encounter triggers an **on-screen story resolution**, reveals the King as **Aurel**, restores **Hollowmere**, and records the First Library conspiracy in the journal. Emberpeak becomes available, as before.

### Player-facing improvements

- Unique three-floor hand-authored layout with real lock-and-key choke points, original story and journal entries, side content, and distinct dungeon atmosphere.
- Quest compass guides the active puzzle rather than showing a generic lever objective.
- Region-specific sidebar progress for the town witnesses, mirror lenses and royal vows.
- Lens orientation icons rendered on the exploration canvas; relevant interaction feedback displays direction and objective.
- Boss-phase notices state explicitly which enemy to defeat and why.
- Existing touch, keyboard and mouse controls preserved. New authored environments reuse installed asset atlases and soundtrack; no unlicensed new external art is included.

### Integrity and validation

- `node verify-rpg.cjs` — **995 checks** of crossword geometry, all eight regions, navigation, scripted campaign strategy, saves and progression.
- `node verify-ui.cjs` — existing UI smoke coverage.
- `node qa/willowmere-test.cjs` — **89 checks** of Chapter I.
- `node qa/tactical-combat-test.cjs` — base combat and mastery tests.
- `node qa/court-of-mirrors-test.cjs` — **120 checks** of Chapter II map reachability, gates, optional quest rewards, puzzles, companion arc, boss transitions, save compatibility and story resolution.
- `node qa/sw-test.cjs` — offline asset list and caching behavior; now includes `rpg-chapter2.js` with a fresh cache key.
- Synthetic Chrome Desktop (1440px) and Mobile (390px) boot/layout checks passed with no horizontal overflow; local synthetic context cannot verify hosted artwork/audio or Safari saves.

### Deployment

Unzip the edition package into a local folder and publish that **folder's contents** as the root of the *existing* Netlify site, retaining its current URL, or commit complete contents into the existing GitHub repository and connect the site to the branch. The source repository was found empty during this work and was **not updated**. The live site was **not updated**. Export browser saves before any deployment; keep the same HTTPS origin.

### Next development priorities

1. **Emberpeak/Chapter III**: unique mine and forge maps, fire/heat field tools, interacting multi-step mechanisms, a set-piece Cinder Warden boss, and a Bram-centered storyline.
2. **Story presentation**: chapter transitions with staged dialogue, expressions, and art-backed scenes; replace text-only story panels progressively.
3. **Combat and progression**: battle-state persistence, enemy pattern variety, more substantial gear choice, disciplined tuning of XP/MP/damage, and clearer skill tooltips.
4. **World readability**: replace remaining generated towns and repeated layout templates; implement map signage, destination waypoints, context-sensitive navigation.
5. **Production QA**: automated full-browser functional tests with actual network assets, iPhone/iPad Safari smoke tests, save migration and recovery, audio UX, accessibility and player onboarding.
