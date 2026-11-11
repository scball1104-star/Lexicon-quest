# CRITIQUE 8: Episode 6 art, readability, staging and polish

Read-only review, Tuesday 2026-11-10 (Eastern), worktree `D:\lq-ep6` on branch `scott/ep6-design` (HEAD 8ec837d) with
`EP6_LIVE` true. Bar: Chrono Trigger, Lufia II, FF6, with the phone as the bar. Play, pacing and balance are in
`docs/PLAYTEST_REVIEW_8.md` (same sitting, same reviewer).

Sources: the 23 E6-integrate shots in `qa/out/` (phone 2532x1170 first; halved copies in `qa/out/review8/shots/p_*.png`), the
E6-integrate battle frames in `qa/battlescene/out/ep6/` (halved copies `qa/out/review8/shots/b_*.png`), the world previews in
`qa/world/ep6_out/` (`qa/out/review8/shots/vane_pair.png`), the autoplay frames in `qa/out/autoplay/`, and my own frames from
short headless sessions on the phone profile (844x390 at 3x) in `qa/out/review8/play/` (`rp/`, `s6_*`, `s6b_*`, `s8_*`).
Luminance is mean Rec. 709 luma of the named region, 0 to 1, measured by `qa/out/review8/luma.py` on the full phone shot.

Tags: **Fact** (seen or measured, or read in the named source), **Reported** (from a plan, a report or the bot),
**Inference** (my reading, with the check that would settle it). Sizes: **S** hours, **M** about a day, **L** several days or
new art.

## 1. Verdict

Episode 6 is the most readable field mechanic the game has shipped. A live gust lane is a blue band with white chevrons
across pale cloud and you know which way it blows from across the screen (Fact). A vane's state reads at rest (steel disc
and white arrow, or gold disc and gold chevrons on the lanes it turned, Fact). The three Observatory floors are three places
(open plank and glass, brass and navy ducts, storm stone with lamp pools, Fact), the Airstair is a bright day map, the
lightning stays under +0.12 luma (Fact), and the Gust marker, the Aloft feather and the anchor glyphs all clear the phone with
room to spare (Fact). Episode 5's art lessons mostly held. What does not hold: in the Scribe's second and third looks **the
Scribe's own HUD row leaves the Scribe** and sits top-centre, clipped by the Gust pips box, beside the Beacon's row, while the
Compass stands about 10 px from the hero (the CRITIQUE_7 item 2 problem, half fixed); and **the two "Bram holds on" beats
are told, not shown**: Vex "hangs over nothing" while his sprite stands upright on stone beside Bram, and the dock catch is
narrated with the party half off the right edge of the phone. Both S. Nothing here blocks a ship; item 1 is the first to fix.

## 2. Plan 0.1, the art and UX rows: fixed or not

| Episode 5 problem | Episode 6 | Status |
|---|---|---|
| Turn the Sky had no path from the menu (play row, the blocker) | Anchor cast from the Tech list with real keys (desktop and phone d-pad) and with two canvas taps, a Rewrite pinned, `rewrite_broken` read back with reason `anchor` (Fact, `qa/out/review8/play/rp/`, EP6BATTLE PASS 3/3) | Fixed |
| The Day stage was the night stage brightened | Storm look: dark blue sky with rain, sky crop luma 0.49; clear (chart) look: aqua and gold, no rain, 0.73 (Fact, `b_phone-scribe-lightning.png`, `b_phone-scribe-chart.png`). Same eye-of-storm painting under both (Fact); they read as two skies (Inference) | Fixed |
| The Futures on the party's side; Fear's row over the hero | Compass row under its feet, but the Compass's body ends about 10 internal px from Arden; the Beacon's row is above it, not under its feet; the Scribe's own row moves top-centre in the ward and chart looks and is clipped by the Gust pips box (Fact, `p_battle_scribe_ward.png`, `b_phone-scribe-chart.png`) | Not fixed (item 1). Fixed after this review: wave 6e (91851ab, E6-fixes A2: `SCRIBE_ROW`, `LAMP_ROW`, Compass at x 228, test in `qa/battlescene/ep6_scene.test.mjs`); audit 11/10 shots `battle_scribe_ward` desktop and phone show three separate rows |
| Shade read as a carpet | Lanes are a blue band (0.636) with white chevrons (0.957) and moving streaks over cloud (0.883); off-lane is plain cloud (Fact, `p_field_ep6_lane_a.png`). Chevron against plain cloud is only +0.07, which fails WORLD_EP6's own "0.2 above plain cloud" rule, but the chevrons never sit on plain cloud: on the band they are +0.32 (Fact). The rule measures the wrong pair (item 9) | Fixed |
| The deck too dark to read the party | The Airstair is a day map (canvas luma about 0.7, Fact); F3's party floor 0.455 in a lamp pool on the phone frame (Fact), 0.499 at arrival (Reported, MAPS_EP6_B 6) | Fixed |
| The town did not read as itself | Zephyr Landing reads as a sky town: cream paving on cloud, blue and green roofs, gold domes, floating islets, a lane at the edge (Fact, `a_zephyr_arrival.png`). The arrival frame shows neither the board nor the storm; the board frame shows no skyline (Fact, `p_field_ep6_zephyr_board.png`) | Mostly fixed (item 4) |
| Dawn and noon looked the same | Vane authored: steel ring, white arrow; turned: gold disc, arrow swung, the turned lanes take gold chevrons (Fact, `vane_pair.png`, desktop test map; the phone F1 frame shows the same head) | Fixed |
| "Keep this one." shown two beats early | The library frame shows "Arden", the open book and "Keep this one." faint while the box says "in full, the line you know: Keep this one." (Fact, `p_story_cloud_library_page.png`); the three-step order itself I did not see in motion | Not verified (item 5) |
| Vex a pale ghost, party one row under him | `vex_relay`: Vex opaque, the party two rows below, no foe near (Fact, `p_story_vex_relay.png`). `vex_falls`: Vex stands upright on the same row as Bram (Fact, `s8_02.png`) | Fixed at the relay; see item 2 for the fall |
| A stair hidden under the stones | Post B: chevrons drawn over the post, landing cells clear (Fact, `p_field_ep6_post_b.png`) | Fixed |
| Turn the Sky had no menu icon | Anchor: first, gold, a 12 x 12 anchor icon, help "Hold through the gust. Breaks a rewrite." (Fact, `b_phone-gale_engine-anchor-list.png`, realplay `sub.icon` true) | Fixed |
| The bible's payoffs as close-ups | Slip, crew list with the struck twelfth line, Vex's letter with the lifted name, the first page: all close-ups (Fact, the story shots) | Fixed |

## 3. Ten findings, ranked by player impact

1. **MAJOR: the Scribe's HUD row leaves the Scribe in its ward and chart looks; the ward lights crowd the hero.** (S)
   - Where: `p_battle_scribe_ward.png`, `b_phone-scribe-chart.png`; `src/data/ep6/scene.js` `WARD_SPOTS` (line 76) and the
     row placement for the `scribe_ward` and `scribe_chart` looks.
   - Seen (Fact): in the first look the Scribe's row ("8, feather, ?, ?") is top-left over its wing. In the ward and chart
     looks the same row is at about x 590 to 730 of 1266, y 105, over open sky between the Scribe and the Beacon, and its last
     tile runs under the Gust pips box. The Beacon's row ("2, feather, ?, ?") is 50 px below it, above the Beacon. The
     Compass's row is under its feet (good), but its body ends about 50 px (10 internal px) from Arden's sword.
   - Why: phase 2's decision is which light to hit; the player must tell three rows apart and know whose is whose. Today the
     Scribe's row reads as the Beacon's (Inference; the shots settle it for me).
   - Fix: keep the Scribe's row on its own anchor (top-left over the wing, as in look one) in all three looks; Beacon's row
     under its lamp; pull the Compass 12 px left. Add both looks to the row-placement test.

2. **MAJOR: Vex's fall and Bram's dock catch are told over still sprites.** (S to M)
   - Where: `s8_02.png`, `s8_03.png` (my phone frames of `vex_falls`), `p_story_anchor_lesson.png`; `src/data/ep6/story.js`
     `vex_falls` and `anchor_lesson`, the cutscene rope helper (line 20 to 58).
   - Seen (Fact): "Bram sets his spear and throws the line. Vex hangs over nothing on the end of it." while Vex stands upright
     on the causeway stone, one tile from Bram; the rope, if drawn, is not visible at phone scale; no lane snaps. In
     `anchor_lesson` the narration "Bram drives his spear through the planks and catches her wrist" plays with Bram and Mira
     cut by the right edge of the screen.
   - Why: these are the episode's two pictures of its theme ("anchor your people"). CRITIQUE_6 item 3 and CRITIQUE_7 item 7
     asked for payoffs shown, not narrated.
   - Fix: walk Vex onto the broken cloud cell west of the causeway edge (rows 13 to 14) with the rope drawn 2 px pale between
     Bram's hands and Vex, then pull him back; centre the camera on Mira and Bram for the dock catch and slide Mira one tile
     toward the edge before the narration.

3. **MINOR: F2's duct lanes are the weakest lanes on the phone.** (S)
   - Where: `p_field_ep6_obs_f2_ducts.png`; `src/data/ep6/field/art.js` duct drawing.
   - Seen (Fact): a duct is a grey grate (0.287) on the dark void (0.10); its chevron is a small pale "<" inside the grate
     bars, about half the visual weight of a cloud lane's. The floor (0.255) is about as bright as the duct.
   - Fix: draw the duct chevrons in the cloud lanes' white with the dark trailing edge, one per cell, and a faint blue bed
     under the bars so a live duct differs from a dead one by colour too.

4. **MINOR: Zephyr Landing's one image is never one frame.** (S)
   - Where: `a_zephyr_arrival.png`, `p_field_ep6_zephyr_board.png`; `src/data/maps/ep6_zephyr.js`.
   - Seen (Fact): arrival shows the causeway, two houses and islets under the banner; the board plaza frame shows the board,
     roofs and cloud; the storm shows only at the top-right edge in `p_story_isles_return.png`.
   - Fix: start the party two rows further north so the board is in the arrival frame, and put the storm cloud object on the
     plaza's north-east skyline inside the 844x390 crop.

5. **MINOR: the first page names its line "in full" while the line is still faint.** (S)
   - Where: `p_story_cloud_library_page.png`; `src/data/ep6/pages.js` (the first-page modes), `story.js` `cloud_library`.
   - Seen (Fact): "Keep this one." and the line under it are drawn at low alpha on the parchment while the box reads "And
     above the tear, in full, the line you know: Keep this one." No party sprite is visible in the frame.
   - Fix: hold the box until the line's fade completes (or make step three draw the line at full alpha at once), and check
     the party's mark is inside the frame under the close-up. Settle: a frame 1 s after this box opens.

6. **MINOR: F3 is the darkest floor by 0.003, and its walkways are the brightest stone in the Observatory.** (S)
   - Where: MAPS_EP6_B section 6 (Reported: F3 0.199 whole map against F2 0.202; walkable 0.355 against 0.244);
     `p_field_ep6_obs_f3_ring.png` (Fact: F3 frame 0.254 at the lamp, unlit stone 0.349).
   - Why: the plan's "F3 the dark one" holds on paper; on the screen F3 reads as pale lavender stone in a dark storm, and F2
     reads darker (Inference).
   - Fix: one value step down on unlit `spire_stone` (about 0.333 to 0.27), keeping the party floor gate at 0.22. Re-measure.

7. **NIT: the two Harriers' rows sit in two places.** (S)
   - Where: `p_battle_airstair_first_gust.png`. Seen (Fact): the left Harrier's row is above its head, the right Harrier's row
     under its feet. Both are on the foes' side and nothing is misread, but the eye has to look twice.
   - Fix: one rule per encounter (both above, or both under), as the row test already measures.

8. **NIT: the painted islands in the Airstair's upper sky have soft, noisy edges at phone scale.** (S)
   - Where: `p_field_ep6_post_b.png` top-left. Seen (Fact): the island sprites cut from the painted cell show stray pale
     pixels and a fuzzy outline against the cloud, unlike the crisp tile art beside them.
   - Fix: re-cut with a hard alpha threshold and a 1 px dark outline (DESIGN 2.3, pixel integrity).

9. **NIT: the chevron contrast rule measures the wrong pair.** (S, qa)
   - Where: `docs/WORLD_EP6.md` 4 ("chevron fill at least 0.2 luma above plain cloud"), `ep6_lab.py contrast`. Seen (Fact):
     chevron 0.957 against cloud 0.883 is +0.07 (the integrate "+0.08"), but the chevron always sits on the band (0.636).
   - Fix: measure chevron against band and band against cloud; do not brighten the art to pass the old rule.

10. **NIT: a mooring post reads as a bollard, not yet as a stop.** (S)
    - Where: `p_field_ep6_post_b.png`, `vane_pair.png`. Seen (Fact): a dark post with a red pennant on the lane. Mira's "Grab
      the post. The wind lets go." teaches it on the Airstair (Fact, log), so the second post is understood (Inference).
    - Fix (optional): a small pale ring on the lane cell around the post's foot, so it reads as "the lane ends here".

## 4. Also seen, below the line

- The Scribe reads as a shape in all three looks: the dark blue raptor with gold and ice, the ward with its orange ring, the
  pale crystal chart look on the aqua and gold sky (Fact). With the Tech list open on the phone the Gale Engine's body is
  behind the window (Fact, `b_phone-gale_engine-anchor-list.png`); acceptable while choosing.
- The steel anchor over a Defending member and the gold anchor over an Anchored party show only when the Gust is 2 actions
  away or less (Fact, `scene.js` line 21, 503). They read at phone scale (Fact).
- Field foes: F3's manta 0.252 on stone 0.349 with a shadow, F2's wraith 0.313 on 0.255 floor, the Airstair wolf 0.385 on
  plank 0.497 (Fact): all visible. I saw no foe on open cloud.
- Lightning on the test map: peak +0.114 luma over cloud cells only, 65% of that frame (Fact, `desktop_storm_flash.png`
  against `_noflash`); once in 4 s and off under reduceMotion (Reported, WORLD_EP6 5).
- `qa/out/*-story_vex_relay-FAILED.png` are stale frames from an earlier integrate run (Fact: mtime older than the passing
  `story_vex_relay` shots).
- The telegraph box for a Rewrite wraps short of FLEE / AUTO / x2 on the phone; nothing is covered (Fact, realplay
  `phone-001-pinned-root.png`).
- The blocked-pack landing (an Episode 6 save with every `ep6` file blocked) shows Emberpeak with no toast visible 4 s after
  the load (Fact, `s6b_blocked_landed.png`); the Episode 5 review accepted the same landing.

## 5. Protect these

- **The lane at a glance**: blue band, white chevrons with a dark trailing edge, moving streaks, plain cloud off lane. Do not
  brighten the chevrons to pass item 9's old rule.
- **The vane head**: steel and white for authored, gold for turned, and gold chevrons on the lanes it turned.
- **The three floors**: plank and stormglass on open cloud; brass slats and navy ducts; storm stone, lamp pools, the ring.
- **The Airstair as a day map**, with the chain running up the middle.
- **The Gust marker** (white spiral disc on the timeline, luma 0.708 on 0.097 ink, Fact), the pips box, the Aloft feather, and
  the steel and gold anchors.
- **Anchor in the Tech list**: first, gold, its icon, "Hold through the gust. Breaks a rewrite."
- **The Scribe's three looks** and the storm and clear grades.
- **The close-ups**: the slip with the burned fourth seat, the crew list with the thinned twelfth line, Vex's letter with the
  lifted name and the open book seal.
- **Vex at the relay**: opaque, the party two rows below.
- **The quick-start title row** "Episode 6: new party" and its help "A ready party at Lv 25. Your own save stays under
  Continue." (Fact, `p_ui_title_ep6.png`).

## 6. Top 10 to fix

| # | Fix | Where | Size |
|---|---|---|---|
| 1 | The Scribe's row stays over its wing in all three looks; Beacon's row under its lamp; Compass 12 px left; both looks in the row test | `src/data/ep6/scene.js` `WARD_SPOTS`, row anchors; `qa/battlescene/ep6_scene.test.mjs` | S |
| 2 | Show Vex hanging over the cloud on a visible rope; frame the dock catch with Mira and Bram centred | `src/data/ep6/story.js` `vex_falls`, `anchor_lesson`; the cutscene rope helper | S to M |
| 3 | Duct chevrons in white with the trailing edge, a blue bed under live ducts | `src/data/ep6/field/art.js` | S |
| 4 | The board in Zephyr's arrival frame; the storm on the plaza's skyline | `src/data/maps/ep6_zephyr.js` | S |
| 5 | The first page's line at full alpha before "in full" is said; the party's mark in frame | `src/data/ep6/pages.js`, `story.js` `cloud_library` | S |
| 6 | Unlit F3 stone one value step darker, party floor kept at 0.22 or more | `src/data/ep6/field/storm.js` or the F3 tiles | S |
| 7 | One HUD row rule per encounter (both Harriers alike) | `src/data/ep6/scene.js` row placement | S |
| 8 | Re-cut the painted islands with hard alpha and an outline | `tools/art/backdrops` (ep6 islands), `assets/*/ep6_*` | S |
| 9 | Measure chevron against band and band against cloud | `docs/WORLD_EP6.md` 4, the `ep6_lab.py contrast` check | S |
| 10 | (Optional) a pale ring at a post's foot | `src/data/ep6/field/art.js` | S |

**Verdict.** On the field Episode 6 reads the way the plan asked: the wind is a thing you can see and aim, the vane tells you
what it did, and the Observatory climbs through three different places. The battle HUD carried the Episode 5 fixes, with one
slip: the Scribe's row wanders in its later looks and the ward's lights crowd the hero. The story's two catches are still
words over standing sprites. All ten are S; fix items 1 and 2 first.
