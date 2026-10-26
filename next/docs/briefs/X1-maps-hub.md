# X1-maps-hub: the edits to the valley, the town and the Archive; the link check; the listing (X1 wave W5)

The eleven new maps exist; this agent connects them to the world. It is the riskiest agent of the build because it edits five
maps that have tests, saves and two other episodes standing on them. Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` sections 3 and 4 (`touches`, late-ready rebuild),
`docs/MAPS.md` (sections 1 to 4 and 6.2: how the Episode 2 edits to `valley` and `willowmere` were done and tested),
`docs/EXPANSION1_PLAN.md` sections 3, 4.10, 4.11, 6.1, 12 and 16 (your contract), `docs/story/STAGING_X1.md`, `docs/maps/X1_*.md` (the four
maps agents' exact cells) and `src/data/maps/valley.js` top to bottom (its pine and gully filters are the pattern to follow). The Episode 2
expansion's map agents edit other maps (`east_road`, `nameless_hollow`, `nh_chapel`, the Court) after P1b; nothing else edits these five files.

## Items, in order

1. **Baseline first.** Before the first edit: dump the resolved module of `valley`, `willowmere`, `archive_f1`, `archive_f2`, `archive_f3`
   (`mapcheck dump`) into `qa/maps/x1_baseline/<id>.json`, and record `mapcheck walk` reachability sets for each under the Episode 1,
   Episode 2 (`ep2_started,crossing_done`) and Episode 3 (`ep3_started`) flag sets. These files are the test oracle; never regenerate them
   after an edit.
2. **The edits of 4.10**, each wrapped so that with `X1_LIVE` false (or its region off in `X1_REGIONS`) the module resolves to exactly the
   baseline: events and overlays are spread in conditionally (`...(x1On('west') ? [...] : [])`), decor and pine filters likewise. Import from
   `../x1/live.js`.
   - valley: the west door and the drovers' gate (west); the south track, the fallen oak (`ifNot: archive_f1_done`) and the door
     (`if: archive_f1_done`) (south); the cleft, the ink bridge, the stair, the sign and the trigger and the **two** valley star marks (north; the
     third mark is on the moor); the far Watchtower decal `x1_far_tower` on the north skyline (moor); the pasture stray `stray_4` (west); the two
     secrets; the marks. Pine filters keep the notch, the track and the west exit clear and drop the pine at (19, 7); nothing solid lands on any
     existing arrival, font or mark cell.
   - willowmere: the west gate (door, gate object, posts), Wick's hole and its chest; the mark.
   - archive_f1, f2, f3: the three return-trip alcoves of 4.10 (carved into unused wall fill, `depth()` applied, the existing critical path and
     every existing mark untouched). The F2 note names the stair only if the north region is on.
3. **Cross-links**: every door in plan 3.2 now has both halves; `tools/maps/x1_links.json` is not edited, but a test asserts that every listed
   target now exists. Walk each loop on foot in the test (town, Downs, valley, town; Downs, Drovers' Road, Millrace, valley, Downs; Downs,
   Larchhill Road, Larchhill, Millrace; and the moor's stile to the Terrace).
4. **Tests `qa/maps/x1_hub.test.mjs`** (also: with the switch off, or on but the `x1` pack not registered, each of the five maps resolves to exactly the baseline; after the pack registers late the next load shows the additions; see XP-packs section 4): baseline diff (only the listed additions appear: events, overlays, decor, marks, exits); walk diff
   (every previously reachable cell and every existing mark still reachable under the three flag sets); no solid cell on any arrival, font,
   bell or mark; the first-fight trigger still covers column 7 and the drovers' gate blocks the west door until `first_fight_done`; the cleft
   bridge is a pit until the Lantern; the fallen oak blocks the south track until `archive_f1_done`; every secret chest reachable by its ability
   and not before; each region switch removes exactly its additions; the arrival cells of every new door land on walkable cells facing away from
   the door (both directions).
5. **The listing**: set `X1_MAPS_LISTED = true` in `src/data/x1/encounters.js` (the one line you edit outside your paths) once `qa/maps` is green
   with all eleven maps, so `qa/maps` iterates the new zones.
6. **Previews** of the five edited maps with the new marks and the cleft (`tools/maps/preview.py`), viewed; `docs/maps/X1_HUB.md` with the exact
   cells and a before/after list; a pointer section in `docs/MAPS.md` that links `X1_WEST`, `X1_SOUTH`, `X1_NORTH`, `X1_WILD` and `X1_HUB`.

## Rules

- Owned paths: `src/data/maps/valley.js`, `willowmere.js`, `archive_f1.js`, `archive_f2.js`, `archive_f3.js`, `qa/maps/x1_hub.test.mjs`,
  `qa/maps/x1_baseline/**`, `docs/maps/X1_HUB.md`, `docs/MAPS.md` (one section), previews of the five edited maps (`tools/maps/previews/valley*`,
  `willowmere*`, `archive_f*` with an `x1` tag in the name), and the one line above.
- **No existing event id, mark, overlay or exit is renamed, moved or removed. No existing tile or decor placement changes except a pine dropped
  from a new gap.** Any change to an existing line needs a sentence in the report.
- Run no autoplay and no browser job beyond previews; X1-integrate does that. No git, no em dashes, bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `node qa/run.mjs maps world content`; the Episode 2 and 3 map tests unchanged and green; every
  preview viewed.
- Report under 400 words: the exact cells added, the baseline diff summary, anything that surprised you in the old maps, the line you flipped,
  test counts.
