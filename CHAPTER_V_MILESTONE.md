# Chapter V - Oracle Labyrinth Edition

Development release, October 13 2026. This release builds on the Eight Towns Art Edition; all eight realms remain present and Chapters I-IV are preserved.

## What is playable

- Saffron Haven: Nomad Sel, three caravan witnesses (Yara, Kamal, Nasrin), and a Moonwell optional quest. Hear each testimony and interact with the Moonwell to receive 100 gold, two Ethers, and reduced shifting-sand damage.
- Floor 1 - Shifting Dunes: align three wind vanes. West = East (1), North = South (2), South = West (3). A single physical gate at the eastern chokepoint opens. Obtain the Nomad Sun Key in the upper gallery.
- Floor 2 - Gallery of False Horizons: cycle mirage lenses Oasis = True (1), Sky = False (2), Stars = True (1). Complete the full across/down crossword as well. Both conditions, in either order, open the true-horizon gate. Optional puzzle: interact with Departure, Crossing, Arrival chronicles in order to open a reliquary worth 200 gold and two Ethers.
- Floor 3 - Well of Tomorrow: activate Shelter (1), Truth (2), Return (3) in order. Cross the returning gate, then use the Sun Key at the northern guardian lock.
- Story: three short interactive Sel memory scenes, one per floor. Finding all three grants an opening combat ward, +35 Focus, and an automatic charged-sandstorm interrupt. Moonwell restoration adds +20 Focus on the boss.
- Guardian: Sand Oracle shifts through veiled future, false futures, exposed horizon, and charged final storm phases. The two false futures must fall before damage can progress below 34% of boss maximum HP. Its exposed elemental weakness is ice. The final scene previews Zephyr Landing and traces the erasures back to the First Library.

## Controls and save format

Desktop: WASD / arrows to move, E / Space to interact, click-to-walk, in-battle number keys or buttons. Mobile: touch directional controls and tappable landmarks. Save format remains version 3 and existing saves are accepted without migration.

## QA

- Full campaign simulator: 1,031 checks passed, including all eight bosses and gate reachability.
- Chapter V-specific: 130 checks passed. Coverage: town witnesses, Moonwell rewards, floor geometry, gate bypass, one-time quicksand hazard, wind vanes, crossword/lenses solved in either order, optional chronicles/cache, vow order, Sel memories, all boss phases, and save compatibility.
- All previous dedicated chapter tests, tactical combat, interiors, townsfolk, town-art, UI smoke, and offline cache tests passed in the release's Netlify test command.
- Focused desktop Chromium screenshots successfully rendered Saffron Haven and floors 1 and 2 with no JavaScript errors or horizontal overflow in those checks.
- The extended Chromium screenshot sweep timed out before finishing all floors and the mobile visual check. Real iPhone interaction and the live Netlify deploy have not been verified. Test on production before treating this as fully validated.

## Deploy

Use the contents of the root-level ZIP in your existing Netlify site. Do not upload the parent folder; index.html must appear at the site root. This package does not automatically publish. Service-worker cache key has been bumped to oracle-labyrinth-v39. If production appears stale after deployment, refresh or clear the site's cached offline version.

## Next priority

Chapter VI - Skybound Isles / Storm Observatory, then stronger bespoke sprites, environmental depth, traversal transitions, and richer cutscene presentation across all five authored chapters. The current art and depth are still substantially short of Lufia II / Chrono Trigger standards.
