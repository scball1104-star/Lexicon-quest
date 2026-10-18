# W4-world-polish: light, night, life, fairness

**Owned paths:** `next/src/world/**`, `next/src/scenes/field.js`, `next/src/scenes/gameover.js`,
`next/src/data/shops.js`, `next/src/data/maps/**`, `next/src/data/story/ep1.js` (only the specific additions
below), `next/qa/world/**`, `next/qa/maps/**`, `next/docs/WORLD.md`, `next/docs/MAPS.md`.

Read `next/docs/CRITIQUE_1.md` (C7, C14, C17) and `next/docs/PLAYTEST.md` section 7, then `docs/WORLD.md`.
The art agent is adding, in parallel, archive wall-face variants, a `pillar` object, a pit rim and a flat void
tile; the maps can adopt them when they land (ids in its report; use them if present, otherwise leave as is).

## Deliverables
1. **Lighting (C7):** replace overlapping alpha discs with a dithered radial falloff (Bayer-ordered rings, 3 to
   4 bands) composed with max blend into one light layer per frame; lantern/brazier light slightly warm; the
   party's light in dark rooms slightly cool. Cache the stamps.
2. **Night (PLAYTEST):** make the night tint read as night: deeper indigo, lower saturation, lamp posts lit
   (lamp `lit` frame + glow) and windows lit after dusk; fireflies at dusk/night in the valley and town gardens.
3. **Ambient life (C17):** leaves drifting in the valley, motes in the library, dust and ink drips in the Archive,
   chimney smoke from houses, birds that take off when the party nears (simple 2-frame sprite, optional),
   grass that sways on step. Keep draw under 1 ms.
4. **Game over fairness (PLAYTEST):** retry returns the party to the last **save bell or floor landmark**
   (the stairs they came down, or the Lantern pedestal on F2) rather than the floor entrance; implement as
   `lastSafe` updates on stairs/bell/pedestal events. Fix the asymmetric black band on the game over screen (C14).
5. **Whisperwood hint:** add one sign or one villager line (`ep1.js lines` plus a map sign event, in the content
   voice, no em dashes) that hints at the hollow tree cache; keep the content tests green.
6. **Smithy before the Archive:** adjust `shops.js` so one meaningful upgrade (a Bronze Spear or a Leather
   Cap) is affordable with the gold a player has after the valley; keep the simulator's economy assumptions
   (report what you changed).
7. **Pit rims and Archive depth in maps:** when the art agent's new ids exist, place pillars in the F1 hall and F3
   stacks, and swap the void fill; otherwise skip and say so.

Verify with `python next/qa/shots.py --only field_*,story_*` (desktop and phone), targeted new shots for night
and the dark Archive, `node next/qa/run.mjs` green, and a `python next/qa/autoplay.py` desktop run to prove
nothing regressed. Report with image paths.
