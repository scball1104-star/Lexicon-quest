# Episode 6: The Skybound Isles

Story bible for Lexicon Quest NEXT, Episode 6: the boarding slip, the Airstair, Zephyr Landing, the Storm Observatory,
the Storm Scribe and the Cloud Library. Written by ep6-designer, Monday 2026-11-09 (Eastern), as a design proposal on
branch `scott/ep6-design`. **Status: PROPOSAL. Nothing here is built.** The production side (ids, maps, gust lanes, the
Gale, loot, music, assets, save rules, the waves and the agent briefs) is in `docs/EPISODE6_PLAN.md`. When built,
everything of Episode 6 lives in the lazy `ep6` pack: the script in `src/data/ep6/story.js`, NPCs in
`src/data/ep6/npcs.js`, quests and party chat in `src/data/ep6/quests.js`, lore, books, banners and inspect lines in
`src/data/ep6/text.js`, and the staging guide in `docs/story/STAGING_EP6.md` (written by E6-story, the shape of
`STAGING_EP5.md`). Nothing of it goes into the core files (plan section 13).

**Sources.** `EPISODE1.md` section 5, `EPISODE2.md` section 5, `EPISODE3.md` section 5, `EPISODE4.md` sections 5 and 6,
`EPISODE5.md` sections 1 (Acts V to VII), 5, 6 and 8, `STAGING_EP5.md`, `RESPONSIBILITY_ARC.md`, `CRITIQUE_7.md`,
`PLAYTEST_REVIEW_7.md`, and the root game's Chapter VI: `CHAPTER_VI_MILESTONE.md`, `rpg-chapter6.js` (the Storm
Observatory's three floors and their names, the rudders, relays and oaths, the Sky Compass Key and Keyhole, the
Breeze-Sheltered Recovery Alcove, the Star-Sail Supply Coffer, the enemy names), `rpg-data.js` line 116 (the region
record: "SKYBOUND ISLES", "Words on the Wind", Captain Aeris, "You soar between floating islands where the winds carry
broken sentences.", "The navigation glyphs are dissolving. Restore the Sky Compass and we can reach the Hollow North.",
the boss THE STORM SCRIBE, the reward Sky Compass, the ending "The airship crosses the clouds. Below lies a land already
half erased."), `rpg-engine.js` (the Storm Scribe's four phases, the False Beacon and Broken Compass, the Signal Beacon of
Lost Flights and its rewards, Aeris's three memories and Pippa Voss, the pilot oaths Anchor, Listen, Return, the chapter
ending "The Sky Remembers"), `rpg-regions-ii.js` (Zephyr Landing and the Windward Docks, the Cloudhouse Inn, Aeris
Flight Provisions, the Galewing Workshop, the Skyport Departure Board, the South Airstair, the witnesses Liora, Bennet and
Suri, the Captain's Brass Skychart, the Windward Flag), `rpg-townsfolk.js` (Ilex, Nova, Piri, Thea, Ren),
`ART_PROMPTS.json` (environments cell 5, bosses cell 5), `SUNO_TRACKS.json` (the region-6 brief), and the older layer
`game.js` (marked LEGACY where used: Vex's "The Empty Seat" scene, "The sky routes are being rewritten. I prefer to choose
where I vanish.", and the Episode 8 scene "The Last Margin"). Tags: **(canon)** comes from those files, **(new)** is
invented here, **(inference)** is a synthesis of canon fragments; every inference is listed in section 8.

**Logline.** Above the sea, a skyport flies by charts that lie. For a month the Storm Scribe has rewritten every course in
the Skybound Isles: beacons give false arrival times, the departure board says ships have landed that never came in, and
a signal apprentice has been struck from every manifest while she keeps a beacon lit inside the storm. The party flies
up because the freed Oracle read that a library above the clouds keeps the hero's first page, and learns the storm was
raised to keep anyone from reaching that page. Bram, who has spent five episodes asking who told them, finally gets an
answer, and the answer comes because he held on.

**Theme question.** Episode 4 asked "what holds when the water rises?" Episode 5 asked "what do you do when you are told
how it ends?" Episode 6 asks **"what do you hold on to when the wind takes the shortest way?"** The Scribe says: the
course. Captain Aeris, a month ago, said: the chart home. Liora says: the board. Vex says: the page, alone, for years.
Bram, without a speech: the people. The canon charter says it first: "Before chasing the horizon, ANCHOR your people."
The episode's answer is Pippa's, in the canon line: "Please remember that we came back for each other."

**Target length.** 60 to 90 minutes first play, planned at about 75 (Episode 5 ran 61 to 86 on the repo's timer; keep the
fights and boxes where it had them): Saffron Haven morning and the berth 3, the Airstair and the first fight 9, Zephyr
Landing 12, Observatory F1 12, F2 with the Gale Engine 13, F3 11, the Storm Scribe 8, the Cloud Library and the ending 7.
Optional content adds 12 to 15 (three side stories, revisits). Budgets: 16 ordinary fights plus the scripted first (Episode
5 had 18 and met its boss on the planned level), at most 12 boxes per main scene (six set pieces excepted), about 200 boxes
on the main path.

**Levels.** Episode 5 ends at Lv 25 (the Sand Oracle at Lv 24, +1,000 EXP after it; about 13,000 to 13,700 EXP at the
credits: Fact, `docs/BATTLE.md` 13.6). A Continue save that fought every placed foe may arrive at Lv 26 (Fact, BATTLE 13.7:
14,021 EXP at the Oracle). The Airstair 25, Observatory F1 25 to 26, F2 26 (near 27, the Gale Engine at 26), F3 27, the
Storm Scribe fought at 27, Lv 28 after it. (`expForLevel`: 25 12,989, 26 14,225, 27 15,524, 28 16,887; Fact, `party.js`
run on 2026-11-09.)

**Whose episode.** Bram's, with a guest. Episode 2 was Mira's hometown; Episode 3 was Bram's mother; Episode 4 was the
hero's signature; Episode 5 was Mira's reading. Episode 6 returns to Bram, the one who asks who told them, and gives him
the boss's central decision (the skill **Anchor**, from the canon pilot oath), the way Episode 3 gave him the Oath and
Episode 5 gave Mira Turn the Sky. The payoff in the hand is the hero's (their first page), the decision in the fight is
Bram's, and the question answered is his. Root Chapter VI is driven by **Captain Aeris** (canon); Aeris is a guest who
flies beside the story, not a fourth party slot (a fourth slot is engine work the budget cannot pay, the same call
Episodes 4 and 5 made for Lyra and Sel). Aeris's own beat is the episode's subtext in one person: a month ago she followed
the chart home and left someone holding the light; on the spire she turns back.

---

## 1. Beat sheet

Scene ids for `src/data/ep6/story.js` are in brackets. Flags are from the plan (section 2.2). Every scene follows the
house wrapper rules (guarded by `SCENE_CONDITIONS`, input locked for its run, registered through `registerStory`). Key
lines are samples in final voice, already inside the box rule (3 lines of 42 characters); the story agent writes the
rest and keeps every main scene at 12 boxes or fewer except `anchor_lesson` (14), `vex_falls` (16), `fifth_voice` (14),
`scribe_after` (18), `cloud_library` (18) and `isles_return` (14). **Staging rule (CRITIQUE_6 item 11, kept):** every
scene walks the party to marks two tiles below and beside the speaker before the first line; nobody is stacked on one
column, nobody stands on a seated or hanging speaker. **Show, do not tell (CRITIQUE_6 item 3):** the five payoffs (the
slip with four seats, the struck manifest, Vex's letter, the restored manifest, the first page) are close-up inserts
through the existing `closeup` page kinds, never narration over an unchanged map. **Payoffs in stages (CRITIQUE_7 item
7):** the first page opens in three steps, and "Keep this one." is the third, never the first thing seen.

**Speaker tags.** The Storm Scribe speaks in capitals (the Archivore, the King, the Warden, the Regent and the Oracle
pattern), tagged "The Scribe". The lost apprentice is "The Signal Apprentice" until Mira reads her name in `fifth_voice`,
then "Pippa" (the speaker-swap mechanism of Episodes 4 and 5: two records, `apprentice_v` and `pippa_t`). Aeris in her
own memories is "Aeris" (she was never struck); the memory voice of the fleet's crew is "A Deckhand".

### Act I: Saffron Haven, the slip with four seats

The first five minutes (RESPONSIBILITY_ARC section 2: control in 20 seconds, a question in 60, a choice with a cost in
3 minutes, a fight in 5), exactly as the player sees them:

| Time | What the player sees and does |
|---|---|
| 0:00 | Fade in on the Dune Lantern Rest at morning. A small grey bird with a silver ribbon on its leg taps at the window. Four boxes. |
| 0:20 | The close-up: a boarding slip, "Zephyr Landing to the Storm Observatory". Four seats: {hero}, Mira, Bram, and a fourth whose name is a black burn. Mira: "Somebody booked us passage. A week ago." |
| 0:35 | Bram: "Four seats. There are three of us." Control. |
| 0:40 to 1:40 | Walk out through Saffron Haven (Sel, Yara, Laleh and Kamal say one line each if spoken to) to the water stairs, where Yara's ship waits. Yara: "North-west to the sea stacks. The skyport hangs off the last one." |
| 1:40 | A fade through one night at sea to dawn under a sea stack with a chain the size of a house going up into cloud. Banner. Control on a stone landing. |
| 2:40 | Mira, on the first rope landing, alone with the hero: "The page is yours. Are you scared of what it says?" The choice: `Yes.` / `No.` |
| 3:30 | A shriek on the wind: two Storm Harriers drop out of the cloud. The first fight, with the Gust marker on the timeline three actions away. |
| 4:40 | The wind gusts mid-fight: the Harriers ride it and act twice; the party, if it braced, holds. Win. The Airstair goes on up. |

1. **The slip** [`ep6_morning`, `ep5_sh_inn`, on enter with `ep5_complete`, counter `credits5_rolled`, `EP6_LIVE`, not
   `ep6_morning_done`, not `tier_1`; sets `ep6_morning_done`, `ep6_started`; gives `boarding_slip`]. (new; canon Piri's
   messenger birds with silver ribbons)
   - Narration: a small grey bird at the shutter, a silver ribbon on its leg. Mira unties it.
   - The close-up `ep6_slip`, mode `burned`: four seat lines, three names, the fourth a lightning burn.
   - Mira: "Somebody booked us passage. A week ago."
   - Bram: "Four seats. There are three of us." Mira: "Then somebody's coming, or somebody's expected."
   - Mira, folding it: "The Oracle said a sky compass finds the page. This says where the compass is."

2. **Saffron farewells** (talk entries, one box each, optional): Sel: "I'm staying. Twenty years of walking to catch up
   on, and all of it's down here." Laleh: "The reading still says a road. I check every night." Kamal: "The water's
   still. That's the best thing water can be." Yara: "Water stairs. I'll have her ready."

3. **Boarding** [`ep6_board`, `ep5_saffron`, the berth object at the water stairs (pack patch, plan section 3); sets
   `ep6_boarded`]. Two boxes, then a fade through dusk, night and dawn (the scene owns the time skip). Yara: "North-west
   to the sea stacks. The skyport hangs off the last one. Up you come."

### Act II: The Airstair

4. **The foot of the stack** [`airstair_foot`, `ep6_airstair`, on enter; sets `airstair_arrived`]. Banner: The Airstair /
   Up to Zephyr Landing. A black sea stack, white water at its foot, rope stairs and plank landings bolted to the rock,
   and a chain with links as tall as a door running up into the cloud. Two boxes.
   - Bram: "That's a chain." Yara: "That's the anchor. The town's on the other end of it." (Yara stays with the ship.)

5. **Mira's question** [`mira_asks`, step trigger on the first rope landing; sets `mira_asked` and `mira_told` or
   `mira_spared`]. The first **truth choice** (the H4 pattern: small and honest, never a locked route). Bram is a landing
   below, out of earshot, arguing with a rope.
   - Mira: "The page is yours. Are you scared of what it says?"
   - Choice: `Yes.` / `No.`
   - Truth (`mira_told`): Mira: "Good. So am I." (a beat) "Now there are two of us not saying so." Bram, from below:
     "Three. I'm being brave about it down here."
   - Kind (`mira_spared`): Mira: "...Okay." She looks at the hero a moment too long. (Changes one line in
     `cloud_library` and one Talk line on the Observatory; plan 7.3.)

6. **The first fight** [`airstair_fight`, step trigger row on the second landing (`if: mira_asked`); scripted battle
   `e6a_first`, no flee; sets `airstair_fight_done`]. A shriek on the wind. Two Storm Harriers fold out of the cloud. The
   battle opens with the **Gust** three actions away: both foes are **Aloft**, so when it gusts they ride it and come round
   sooner, and anyone who did not brace is blown back. The teaching fight for the Gale. No tutorial box.
   - Before: Mira: "Birds that ride the wind. When it gusts, Defend, or it throws us back."
   - Mid-battle (the battle's message when the marker passes): "The wind gusts." The Harriers come round at once.
   - After: Bram: "Birds. Big birds. On a rope. Fine."

7. **The first gust lane** [`first_gust`, step trigger at the third landing, where the stair breaks and a white stream of
   wind runs across the gap to the next ledge; sets `saw_gust`]. The field mechanic's first lesson (plan 5.1). Ilex the
   Windwright (canon) hangs in a harness, mending a joint. One line points at the stream; the ride does the rest.
   - Ilex: "Step in the white and the wind takes you. Mind where it puts you down." (canon Ilex mends skybridge joints)
   - Bark after the first ride (`first_ride`): Bram: "I am never doing that again." (He does it again at once.)

8. **Above the cloud** [`isles_view`, step trigger at the top of the stack; sets `saw_isles`]. The party climbs through
   the cloud into sun. The Skybound Isles: green islands floating in a peach and blue sky, rope bridges strung between
   them, a small airship, and far to the north-east a dark knot of storm around a white spire (environments cell 5).
   `mystery`, softer.
   - Mira: "Islands. Floating." Bram: "Of course they are."
   - The hero emotes `...`. (the hero looks longest at the storm)

### Act III: Zephyr Landing

9. **The Windward Docks** [`zephyr_arrival`, `ep6_zephyr`, on first enter; sets `zephyr_arrived`]. Banner: Zephyr Landing /
   The Windward Docks (canon). Rope bridges, brass domes, cloud gardens, wind chimes tied silent with black thread. The
   Skyport Departure Board (canon) clacks over: every fleet flight shows ARRIVED, and the docks under the board are empty.
   At dock four a woman stands with a folded letter, watching the empty berth.
   - Mira, at the board: "Arrived. All of them. And nobody's here." Bennet, coiling line: "The board's been saying that
     for a month. The Scribe writes the arrivals now." (canon "false arrival times")
   - Bram: "Who's the Scribe?" Bennet: "Keeps the courses, up in the Observatory. Used to."

10. **Dock four** [`liora_dock`, Liora's talk entry at dock four, first time; sets `liora_met`]. Liora the Wind Navigator
    (canon). Three boxes.
    - Liora: "The board says my sister landed here a month ago. I meet every arrival in case the board is right." (canon
      "My sister waited at the wrong dock", turned round: here the sister is the one who did not come)
    - Mira: "What's her name?" Liora opens her mouth, and nothing comes. "...I had it this morning."

11. **Captain Aeris** [`meet_aeris`, Aeris's talk entry at the north dock beside her airship, the Kestrel (new name); sets
    `met_aeris`]. Captain Aeris (canon) sits on a cargo net with a brass compass in her lap. The needle spins and does not
    stop.
    - Aeris: "Your slip says the Observatory. Nobody's flown there in a month. The charts say there's nothing there."
    - Aeris: "This is the Sky Compass. Name a thing and it points to it. Since the storm, it points at everything."
    - Bram: "Who booked our seats?" Aeris: "Somebody who paid in Keeper silver and signed with a burn. My clerk took it."
    - Aeris: "Come to the chart room. If you're going up there, you should see what the Scribe did to my fleet."

12. **The chart room** [`chart_room`, `ep6_zl_charts`, on enter after `met_aeris`; sets `charts_seen`; gives
    `liora_letter`]. Aeris's chart room under the Signal Beacon (canon "Captain's Brass Skychart"). Manifests pinned to
    every wall.
    - The close-up `ep6_manifest`, mode `struck`: the last fleet's crew list, eleven names and one line scratched out so
      hard the paper is thin. Every copy on the wall has the same line gone.
    - Aeris: "My fleet. My last run home. Every manifest has a line struck, and I can't tell you whose. I flew it."
    - Liora, at the door: "It's her. I know it's her. I just can't hold the word." She gives Mira the letter she has
      carried to every arrival. The name on it slides off the paper as Mira reads it, then settles back, faint. Mira:
      "It's still there. Just barely." (the letter is kept for `fifth_voice`)
    - Bram: "Somebody wrote her off the wind." Aeris: "Somebody wrote her off everything."

13. **Anchor your people** [`anchor_lesson`, `ep6_zephyr`, step trigger on the east dock after `charts_seen`; sets
    `anchor_learned`; teaches `anchor_line`]. The set piece of Act III. A gust off the storm hits the dock like a door
    slamming. Mira is lifted off her feet toward the edge; Bram drives his spear through the planks and catches her
    wrist, and holds, while the gust goes over. (Staged as actors and a camera shake; the scene owns every move.)
    - Mira, on her feet again, white: "...Thank you."
    - Bram: "I didn't think. I just held."
    - Aeris: "That's the first line of the charter. 'Before chasing the horizon, anchor your people.'" (canon) "Then
      chase it." She shows him how to set the spear so a gust carries you on instead of off. Learns **Anchor**
      (`skill_learn`, "Bram learned Anchor. The party holds through the next gust, and the wind carries them on.").
    - Bram: "My dad said 'come home after.' Same idea. Fewer ropes."

14. **The east airstair** [`east_gate`, `ep6_zephyr`, step trigger at the east airstair after `anchor_learned`; sets
    `windward_pass`]. The causeway to the Storm Observatory (canon "follow the east airstair"). Aeris gives the Windward
    Pass, a brass token that opens the Observatory's gate.
    - Aeris: "I won't fly into that storm. I flew the shortest way home once and left somebody behind. I'm not ready
      to fly the long way yet."
    - Bram: "When you are, we'll be up there."

### Act IV: The Storm Observatory

**Trim, #86 (CRITIQUE_9 item 6, Scott 2026-11-11: "trim it a bit").** F3's main path went from 41 story boxes to 29; the
beats below are the design, the script is shorter: the arrival is the narration alone (Bram's and Mira's light pair
cut); the Kestrel is one Aeris box ("I followed the chart home once. Not twice. We go the long way."); the Anchor lamp is
the voice alone; in `vex_falls` the gust is staged, not told, the letter's words are on its close-up (one narration box
for the hand, the blank and the open book), Vex's age and "Nobody had ever asked me for anything" are one box, Bram's
"And you said yes." is cut ("So I said yes. I put it above the clouds, where nothing reads."), and the last narration is
Vex's "..." emote; in `fifth_voice` the platform's narration (the crates and the young woman with the lamp are on screen) and Pippa's "You came
back. That's what the light was for." are cut. Every line sections 5
and 6 hold for Episode 7 and 8 (the Keeper's letter, the lifted name, the k, fourteen, the list-writers, above the
clouds, Bram holding on, Pippa's name, the truth choice, the Keyhole) is still said (`qa/content/story_pacing.test.mjs`).

15. **The Windward Causeways** [`obs_f1_arrival`, `ep6_obs_f1`, on enter; sets `obs_entered`, `obs_f1_arrived`]. Banner:
    The Storm Observatory / I. The Windward Causeways (canon). Plank decks and stormglass platforms floating on cloud,
    gust lanes streaming between them, mooring posts with ragged pennants, weathervanes on poles. Floor question (arc
    3.5): who tied every wind chime on the causeways silent?
    - Mira: "Every chime is tied shut. Somebody didn't want the wind heard." Bram: "Then let's listen anyway."

16. **The Shortest Way Home** [`aeris_memory_1`, `ep6_obs_f1`, step trigger at the old signal relay; sets
    `aeris_memory_1`]. (canon memory, re-aimed, section 8; staged as a tinted vignette, the wind replaying a relay's last
    recording.) A month ago: Aeris's fleet in a rising storm, a young apprentice on a beacon deck with a lamp. A voice
    from everywhere at once.
    - The Scribe (memory): "THE SHORTEST COURSE IS WRITTEN. TAKE IT."
    - Aeris (memory): "Turn for home. Follow the chart."
    - The Signal Apprentice (memory): "I've got the light. Go. I'll keep it lit till you come back."
    - Bram, now: "And nobody came back."

17. **The Sky Compass Key** [the gold chest on the upper deck (canon "Sky Compass Key", "collect it from the upper
    balcony"), flag `compass_key_found`]. The lift up sets `obs_f1_done`.

18. **The Hall of Broken Signals** [`obs_f2_arrival`, `ep6_obs_f2`, on enter; sets `obs_f2_arrived`]. Banner: II. The Hall
    of Broken Signals (canon floor, renamed: section 8). A roofed hall of brass relays and speaking tubes, wind ducts
    breathing through grilles in the floor, every relay's dial spun to a wrong number. Two boxes.

19. **The Name Removed From the Crew** [`aeris_memory_2`, `ep6_obs_f2`, step trigger at the manifest relay; sets
    `aeris_memory_2`]. (canon) The relay replays the Scribe at its desk the night the fleet came home short: a quill
    drawing a line through one name, on every manifest at once.
    - The Scribe (memory): "AN EXTRA NAME. A BEACON POINTS AT THE EYE. A BEACON IS A ROAD. STRUCK."
    - A Deckhand (memory): "Captain, the apprentice's lamp is still lit back there." Aeris (memory): "What apprentice?"
    - Mira, now: "She wasn't lost. She was edited."

20. **The empty seat** [`vex_relay`, `ep6_obs_f2`, step trigger at the crown relay; sets `vex_relay_met`,
    `sixth_list_get`]. (new, with the LEGACY "The Empty Seat" as root) Vex Quill, coat torn, both arms inside a relay,
    trying to splice one signal through the storm. The black feather is caught in the grille.
    - Vex: "You got the slip. Good. I booked four. I wasn't sure I'd make the flight."
    - Bram: "You're the fourth seat." Vex: "The sky routes are being rewritten. I prefer to choose where I vanish."
      (LEGACY line, kept)
    - He holds out a list: cheap paper, the cold hand, the seal of the empty book. "Six lists. This one's a month old,
      and it hasn't got a single name on it." It reads, in capitals: THE FIRST PAGE. LET NOTHING REACH THE SHELF.
      Gives `sixth_list`.
    - Mira: "A list with no names." Vex: "It's not hunting a person. It's hunting a page. Guess whose."
    - Bram: "Who asked you to keep the hero? In writing. You said." Vex: "Ask me at the top. If we get to the top."
    - He swings into a duct and the wind takes him up. (Vex's arc warms a fifth notch: E2 took a list, E3 gave a corner,
      E4 signed as a witness, E5 gave a list away, E6 booked the party's seats and will answer.)

21. **The Gale Engine** [`gale_engine`, `ep6_obs_f2` bellows hall, arena trigger; boss intro card; battle `gale_engine`;
    sets `engine_defeated`; the lift trigger sets `obs_f2_done`]. A brass engine the height of a house, fan blades in its
    chest, bellows on its back: the machine that drives the Hall's wind. Name card: THE GALE ENGINE / Keeper of the Broken
    Signals. Intro line (arc 3.6): "It kept the signals turning. Nobody asked what they said." (new; section 8)
    - Bram, the one tip: "When it winds the bellows, I anchor us. Keep me standing."
    - After: Mira: "It was only ever doing what the wind told it." Bram: "So's half this town."

22. **The Sky Sailors' Emergency Locker** [optional, `locker`, F2, side story 2]. (canon locker, now a lane route and three
    logs in any order.) Bram: "Three logs and a locker. Somebody planned to be rescued."

23. **The Eye of the Storm** [`obs_f3_arrival`, `ep6_obs_f3`, on enter; sets `obs_f3_arrived`]. Banner: III. The Eye of the
    Storm (canon). The Observatory's spire climbs through the inside of the storm: slate cloud, a ring of wind running
    round the spire, lightning far off in the wall, and at the very top a small steady light that is not lightning. The
    darkest map of the episode. Two boxes.
    - Bram: "There's a light up there." Mira: "Lightning doesn't stay put."

24. **The Kestrel** [`aeris_turns`, `ep6_obs_f3`, chained after `obs_f3_arrival` on the first landing; sets
    `aeris_came`]. Engines in the storm. The Kestrel comes up through the cloud and noses against the landing; Aeris
    jumps down with a lamp.
    - Aeris: "I followed the chart home once. Not twice."
    - Bram: "Long way, then?" Aeris: "Long way." (She walks with the party as a scene actor from here; she does not
      fight. At each landing she waits by the lamp.)

25. **The three pledges** [`pledge_anchor`, `pledge_listen`, `pledge_return`; each runs when the party reaches a landing's
    signal lamp, after its lane puzzle; in climbing order (the Eye is a climb, where the Well was a descent); each sets its
    flag]. Each landing has a dark signal lamp and a carved line of the pilot charter (canon: "Before chasing the horizon,
    ANCHOR your people. LISTEN for those the charts omit. Finally RETURN for anyone the sky has abandoned."). As the party
    arrives the lamp lights by itself, and the wind carries one line from the top of the spire, live, not a memory. Then
    one line from Aeris. (canon words, lines new)
    - **Anchor:** The Signal Apprentice (far off, on the wind): "Still here. Still lit." Aeris: "She always answered the
      check-call first."
    - **Listen:** The Signal Apprentice: "Somebody's on the stair. I can hear the lamps." Aeris: "Listen for those the
      charts omit. I didn't."
    - **Return:** The Signal Apprentice: "If that's you, Captain, you're late." Aeris: "...I'm late."

26. **Hold on** [`vex_falls`, `ep6_obs_f3`, step trigger on the broken causeway between Listen and Return; sets
    `vex_held`, `asker_known`]. The set piece of Act IV and Bram's beat. Vex is ahead of them on a causeway; a gust lane
    snaps sideways and tears him off the planks. Bram sets his spear and throws the line, and Vex hangs over nothing on
    the end of it. (Staged as actors, a camera tilt and the line drawn by the scene; no field fall for the party.)
    - Vex, hanging: "You want to know who asked. Fine. Pull me up first."
    - Bram pulls. Vex sits on the planks, breathing. He takes a letter from inside his coat.
    - The close-up `ep6_letter`: a short letter in the warm, hurried hand of "Keep this one." It asks the reader to keep a
      child's first page "where no list can read it", and promises "You will be asked for nothing else." Where the
      signature should be, a clean blank, as if the name had been lifted off. Under the blank, the counter-seal: an open
      book with one line.
    - Vex: "A Keeper wrote that. Somebody took the name off the letter. They couldn't take the letter."
    - Mira: "Look at the k." (Ishra's k, Episode 5 section 10.4) Vex: "I know. I've looked at that k for a long time."
    - Vex: "I was fourteen. I mended bindings for the people who write the lists. Nobody had ever asked me for
      anything." (open choice 4)
    - Bram: "And you said yes." Vex: "I said yes. I put it above the clouds, where nothing reads."
    - Bram: "You held on to it for years. Somebody should hold on to you." Vex has nothing to say to that, for once.

27. **The fifth voice** [`fifth_voice`, `ep6_obs_f3`, the beacon platform at the top of the spire, after `pledge_return`;
    sets `pippa_found`, `scribe_door_open`, and `told_aeris` or `kept_from_aeris`]. (canon memory 3 "The Fifth Voice of
    the Fleet", made live) A small platform of stormglass, a ring of empty supply crates, and a young woman in a
    signal-jacket sitting with a lamp in both hands, keeping it lit. She looks up at Aeris and does not know what to call
    herself.
    - The Signal Apprentice: "I held the light. I kept saying my name to stay awake. Then I couldn't find it."
    - Mira takes out Liora's letter. Under the lamp the name holds. Mira reads it: "Pippa. Pippa Voss." Speaker swap:
      "The Signal Apprentice" becomes "Pippa". (canon name)
    - Aeris: "...Pippa. I left you the light." Pippa: "You came back. That's what the light was for."
    - Pippa: "Please remember that we came back for each other." (canon)
    - Then Aeris turns to the hero. "Vex says the storm's hunting a page. Whose?" The **truth choice** (the episode's main
      one): `Mine. It's hunting my page.` / `Nobody's. Let's go.` Truth (`told_aeris`): Aeris is quiet a long time.
      "...Then it picked the wrong captain to scare off." Hidden (`kept_from_aeris`): Aeris: "Fine. Later." Either way the
      episode goes on; Aeris sees the page in the library regardless. The choice changes one line in `cloud_library` and
      Aeris's gift (plan 7.3).
    - The Sky Compass Keyhole (canon) is in the Scribe's door behind the lamp; the Sky Compass Key turns it.

### Act V: The Storm Scribe

28. **The Scribe's Eyrie** [`scribe`, `ep6_obs_eyrie`, trigger row at the entry; boss intro; battle `scribe`]. The top of
    the spire: a round deck open to the storm, a desk of stormglass, and quills hanging in the air writing by themselves.
    Coiled over the desk on cloud-and-ink wings, a beast with electric-blue feathers (bosses cell 5, canon). Name card:
    THE STORM SCRIBE / Writer of Every Course. Intro line (arc 3.6): "It wrote them the shortest way home. They took it."
    - The Scribe: "PASSENGERS: THREE. COURSE: NONE. NOTHING REACHES THE SHELF."
    - The Scribe: "EVERY COURSE IS WRITTEN. I HAVE WRITTEN YOURS." (canon "overwrites every honest flight")
    - Aeris, from the stair: "Who told you to write us out?" The Scribe: "A LIST. IT IS WRITTEN." Bram: "Written's not
      the same as true. Ask a Regent. Ask an Oracle."
    - Choice: `Write us a way up.` / `Hold on, everyone.` (either way, the battle)
    - Bram, the one tip: "When it rewrites the course, I anchor us. Keep me standing."
    - Phase 3 battle message: "The ward tears. Behind the Scribe, a chart in true ink."

29. **Every course** [`scribe_after`, `ep6_obs_eyrie`, after the win; sets `wind_script_restored`, `fragment6_get`,
    `compass_restored`; the encounter sets `scribe_defeated`]. The order matters; the story agent keeps it:
    1. The Scribe settles onto its desk. The quills fall. The Scribe: "I WROTE EVERY COURSE. I NEVER WROTE ONE BACK."
       (a beat) "I WAS TOLD TO KEEP THEM FROM THE SHELF."
    2. Its wings open like sails: the isles' share of the Book, the Wind Script, long banners of sail-cloth unrolling in
       the wind, every name of the realm a line on them. The struck lines write themselves back (`name_restore` flash),
       Pippa's first.
    3. The close-up `ep6_manifest`, mode `restored`: the fleet's crew list with the twelfth line back. Pippa Voss.
    4. Under the hero's line on the cloth, the counter-seal and the line "Keep this one." A sixth fragment, a sixth time.
       Gives `name_fragment_6`. Bram: "Six." Mira: "Six. And this time somebody told us why."
    5. The Sky Compass on Aeris's palm stops spinning. Aeris: "Shelf." (She names it.) The needle swings straight up.
    6. The storm opens over the spire like a lid lifting. Above it, sitting on the top of the cloud, a small round
       building with a dome: a library.
    7. The black feather on the desk. It does not move in the wind. Bram: "He's already up there." Mira: "Or he's waiting
       for a seat."

### Act VI: The Cloud Library

30. **The first page** [`cloud_library`, `ep6_library`, on enter (the Kestrel carries the party up from the Eyrie; the
    fourth seat is Vex's); sets `library_reached`, `first_page_read`]. Banner: The Cloud Library / Above the Storm. A
    Keeper reading room on the top of the cloud: round, open to the sun, shelves of weather logs, a reading desk, and one
    shelf with one page on it, under glass. Vex, Aeris and the party.
    - Vex lifts the glass. "There. Your beginning. Half of it."
    - The close-up `ep6_page` in three steps (CRITIQUE_7 item 7): `name` (the hero's name, written in the warm hand, the
      first time it was ever written); `seal` (the counter-seal under it, the same open book with one line); `torn` (the
      line "Keep this one." in full, and under it the start of another line, torn straight across: "Carried down the
      White Road by").
    - Mira: "That's the first one. Every other copy was made from this."
    - Vex: "Half. I only ever had half. The other half went north with whoever wrote it."
    - (truth path of `mira_asks`) Mira: "You said you were scared. Still?" The hero emotes `...`. Mira: "Me too. It
      helps, saying." (kind path) Mira: "You said you weren't scared." (a beat) "I didn't believe you then either."
    - (truth path of `fifth_voice`) Aeris: "So that's what the storm was for. Glad I didn't know, flying up." (hidden
      path) Aeris: "You knew, on the spire. Fine. I'd have kept it too."
    - Vex sets the glass back over the page. "Where it goes, a list follows. I'm used to being followed. I'll keep it a
      while longer." (open choice 5) Bram: "Then you're coming with us." Vex: "...Ask me at the bottom." He does not
      leave. He sits in the fourth seat on the way down.

### Act VII: The Sky Remembers

31. **The sky remembers** [`isles_return`, `ep6_zephyr`, on arrival at the north dock after `cloud_library` (the Kestrel
    lands); sets `isles_restored`, `pippa_home`]. (canon "Chapter VI Complete - The Sky Remembers") Dawn. The chimes ring
    for the first time. The board clacks: one line, LANDED, DOCK FOUR.
    - Liora is at dock four. Pippa comes down the gangway. Liora drops the letter. "...Pippa." Pippa: "You're at the right
      dock this time."
    - Aeris, on the Kestrel's rail, reads the names of every pilot and passenger the wind tried to forget, one by one,
      Pippa Voss last (canon). The signal towers light across the isles in reply.
    - Aeris gives the hero the gift (plan 7.3: the Kestrel's Wings for the truth path, the Quiet Chime for the hidden
      path; legendary beam, equip prompt). Aeris: "Fly the long way. It's the only one that gets everybody home."
    - Bram: "Ask who told them. Then hold on to who's left. That's two ideas. I'm keeping both."

32. **The ending hook** [`ep6_ending`, `ep6_zephyr`, the roof of the chart tower at night, straight after; sets
    `ep6_complete`]. Vex at the rail with the page under his coat, the party, Aeris, the Sky Compass.
    - Mira, to Aeris: "Can it find the other half?" Aeris: "Name it." Mira: "The other half of the first page." The
      needle swings north and stays.
    - Far to the north, under the moon, a range of white mountains, a pale road climbing into them, and then for a
      breath the road is not there, and then it is (canon "Below lies a land already half erased"; "The Hollow North is
      already disappearing").
    - Mira: "The map's forgetting the north." Bram: "Then we remember it for the map."
    - Vex: "The White Road. I haven't been up it since..." He stops. (Not answered: Episode 7.)
    - End cards: `End of Episode 6` / sub `Words on the Wind`; then `Episode 7: The Vanishing World` / sub (placeholder,
      section 10) `The other half of the page lies north.`

33. **Credits** (`CREDITS_EP6` in the pack's `text.js`, `zephyr` music), then the next morning at the Cloudhouse Inn
    (`ep6_zl_inn`, mark `inn_bed`). Every Zephyr Landing resident has new lines; ships leave on true courses; the chimes
    ring; Saffron Haven, Valewyn, Emberpeak, Hollowmere and Willowmere residents have Episode 6 lines; the end card says
    Episode 7 is not playable yet.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **The Signal Beacon of Lost Flights** (canon witnesses and beacon) | Suri at the beacon tower, after `charts_seen` | Hear Liora (the board's false arrivals, her sister; canon), Bennet (the old rule: an honest captain turns back when a beacon calls, and the Scribe erased the word RETURN from every flight plan; canon) and Suri (the charts were redrawn overnight; canon role, line new, section 8). Then light the beacon from its brass ring on the tower roof (canon "The Fleet Can Hear Again"). No order; any sequence; one talk each. | 2 Hi-Potions, 2 Hi-Ethers and 350 gold (canon two Potions and two Ethers, scaled), the beacon becomes a rest and save point, and +20 Fury at the start of the Storm Scribe fight (`beacon_lit`; canon +20 Focus). The Skyhand Coat (set piece). |
| **The Sky Sailors' Emergency Locker** (canon locker, now a lane route) | Talk hint on F2 | Three flight logs (Departure, Distress, Rescue) lie on F2's side decks, found in any order. The locker sits on a ledge reached only by riding a duct with the side vane turned the way the main route does not need. No order puzzle, no recital. | 400 gold, 2 Hi-Ethers (canon 220 gold and two Ethers, scaled), book `flight_logs` |
| **Piri's Dead Letters** (new, from canon Piri, who "sorts the letters at the landing before the ships depart") | Piri at the post rack by the board, after `zephyr_arrived` | Three letters blown out of the post sack in the storm: one on the Airstair (a ledge reached by a mooring), two on F1 (a dead-end deck behind a vane; a chest behind a Dash-cracked crate). Bring them back; Piri sends them on true courses. In the sack's bottom Piri finds an older one: "Came off a northbound ship years back. Addressed to Willowmere. Nobody flies to Willowmere." He gives it to the hero to carry home (`white_road_letter`, never opened in Episode 6; a seed, section 10.11). | Silver Ribbon (rare unique charm) |

Side quests open once Zephyr Landing is introduced (`zephyr_arrived`; the Beacon from `charts_seen`). Every quest has a
journal entry and a Talk reminder. Cut line: Piri's Dead Letters goes first if the budget tightens (the White Road letter
moves to one line of Piri's talk: "There's one in the bottom of the sack for Willowmere. Fifteen years. Nobody flies
there.").

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9).

### The party in Episode 6

**{hero}** [`hero`]. Silent, through choices, emotes and what others say. The hero signed their name in Valewyn and put
their own star back in the desert; in the isles they find out that the storm is about them, and they have to say so to the
person who paid for it. The beat is small and pointed: the hero tells Aeris the storm is hunting their page (or keeps it,
and is found out anyway). Arc beat: from "I will be where I can be seen" (Episode 5) to "I will own what follows me".
They read their own first page, half of it, and do not get to keep it.

**Mira** [`mira`]. Dry, exact, and the one who reads the names that will not hold: Liora's letter, Pippa's name, the page.
She is nearly blown off a dock in Act III and lets herself be caught, which for Mira is a lot. Her line of the episode is
small: "It's still there. Just barely."

**Bram** [`bram`]. This is his episode. He has asked "Who told them?" since the desert, and in the isles he asks the person
who knows, twice, and gets put off twice. He learns the episode's central skill, **Anchor**, by catching Mira without
thinking, and in the boss fight he is the one who must set it before the Scribe's rewrite lands. On the spire he holds Vex
over nothing on the end of a line, and that, not a question, is what gets the answer. Arc beat: from "ask who told them"
to "hold on, then ask". His unguarded line: "I didn't think. I just held." His father's "Come home after." comes back as
the same idea with fewer ropes.

### The guest

**Captain Aeris** [`aeris`, sprite `npc_aeris`, no portrait by default; plan 9.5] (canon name, title and role; canon
"Captain Aeris alone knows the safe airstairs to the Storm Observatory"). Fifties, weathered, a long aviator's coat with
brass buttons, goggles pushed up into grey-streaked hair, the Sky Compass on a chain. Captain of the airship Kestrel (new
name) and keeper of the Windward Docks' chart room. A month ago she led the fleet home on the Scribe's shortest course and
left her signal apprentice holding a beacon in the storm; the Scribe struck the apprentice's name, so Aeris cannot even
remember whom she left. Dry, practical, quick to give an order and slow to forgive herself. She does not fight: she is a
scene actor who meets the party at the docks, the chart room, the east gate and, from `aeris_turns`, at each landing on
the spire, then flies them to the library. Her beat is turning back. New lines: "I followed the chart home once. Not
twice." "Fly the long way. It's the only one that gets everybody home."

### Zephyr Landing

**Liora the Wind Navigator** [`liora`] (canon). Thirties, a navigator's sash of knotted cords, a letter always in her
hand. Pippa's elder sister (inference, section 8). Meets every arrival at dock four because the board says her sister
landed there. Canon line: "The Storm Scribe replaced our rescue beacons with false arrival times. My sister waited at the
wrong dock until the clouds swallowed her signal." (spoken as her testimony, the sister's wait turned to her own)

**Bennet the Rigging Master** [`bennet`] (canon; carries canon Nova's dock lines and Ren the Sky Watch's, section 8).
Sixties, grey, rope-burned hands, keeps the docks' rigging. Canon line: "Our old rule: an honest captain turns back when a
beacon calls. The Scribe erased the word RETURN from every flight plan." He also keeps the winch at the top of the Airstair
as a peddler stall (shop `winch`).

**Suri the Sky Cartographer** [`suri`] (canon). Twenties, ink to the wrists like Laleh but with a cartographer's
dividers through her braid, gives the Beacon quest. Her canon testimony named the rudder settings (a printed answer);
here she says what she saw: "I drew every chart in this room. Last month they redrew themselves overnight. My own hand,
pointing everyone wrong." (new line, canon role)

**Ilex the Windwright** [`ilex`] (canon). Keeps the Galewing Workshop (the forge, shop `galewing`). Met on the Airstair
mending a joint. Canon lines: "The rigging hums today; there is a change brewing above the islands." "I mend skybridge
joints and check every brass pin twice."

**Nova the Deckhand** [`nova`] (canon). Keeps Aeris Flight Provisions (shop `aeris_provisions`). Canon lines: "Clouds
underfoot make even old sailors nervous at first." "I check the cargo nets when the afternoon winds build."

**Piri the Messenger** [`piri`] (canon). Runs the post rack and the silver-ribboned birds; gives Piri's Dead Letters.
Canon lines: "Letters arrive here tied to birds with silver ribbons." "I sort the letters at the landing before the ships
depart."

**Thea the Cloud Gardener** [`thea`] (canon). Tends the floating gardens on the town's edge. Canon lines: "Flowers float
where the rain catches beneath the wind rails." "The wind chimes are quiet whenever the navigation glyphs fade." (she is
the one who says why the chimes were tied)

**The Cloudhouse Host** [`ep6_innkeeper`, Ledger-excluded] keeps the Cloudhouse Inn (canon inn).

**Pippa Voss, the Signal Apprentice** [voice `apprentice_v`, then `pippa_t` and the record `pippa`, sprite `npc_pippa`,
no portrait] (canon name and role: "PIPPA VOSS, the signal apprentice", "she stayed to keep a beacon alive while the fleet
flew through the storm"). About twenty, a signal-jacket with reflective brass tabs, a hand lamp. Heard on the wind from
F1, found alive on the spire in `fifth_voice`, home at dock four in `isles_return`. After the credits she tends the signal
lights (canon "Pippa Voss still tends the signal lights; every ship is answering them now").

### The Observatory

**The Storm Scribe** [boss `scribe`, field avatar `scribe_avatar`, portrait `scribe` crop] (canon name and look: bosses
cell 5, "winged ink-and-cloud beast, electric blue feathers and hovering runic quills"; nature inference). The Keepers'
Scribe of Winds: a Keeper construct made to keep the isles' share of the Book, which the Keepers wrote on the wind as the
Wind Script (every name of the realm a line on sail-cloth banners that the wind reads aloud), and to write every course in
the isles from it, so a ship could always be steered toward the names waiting for it. A month ago a list in the cold hand
came up the Airstair with no names on it, only an order: THE FIRST PAGE. LET NOTHING REACH THE SHELF. A course is a road;
the Scribe rewrote every course so none led up, gave the beacons false arrival times so no one would search, and when one
beacon kept pointing at the eye of its storm, it struck the beacon's keeper off every manifest. The storm is the Scribe
writing too fast. Not evil: a tool given a bad order, like Moth, the Warden, the Clerk and the Oracle. Speaks in capitals.
Last words: "I WROTE EVERY COURSE. I NEVER WROTE ONE BACK."

**The Gale Engine** (mid-boss, new). The engine of the Hall of Broken Signals: a brass bellows-and-fan machine that drives
the wind through the relays so the Scribe's courses reach every dock. Since the list it has blown only false signals, and
faster.

**The False Beacon and the Broken Compass** (canon: the Storm Script Ward's "False Beacon and Broken Compass"). The
Scribe's phase 2: the Beacon lights a false signal over the Scribe and draws the party's blows to itself (it Covers the
Scribe); the Compass spins the party round on the timeline and hushes the one who can anchor.

### The rival

**Vex Quill** [`vex`, portrait `silver_rogue`] (canon recurring rival). Fifth NEXT appearance. He booked the party's
passage and the fourth seat for himself (the LEGACY empty seat, re-aimed: he booked it), has been trying for a month to
splice a signal through the storm to reach the shelf where he hid the hero's first page, and gives the party the sixth
list, the one with no names. On the spire he is torn off a causeway, Bram holds him, and he answers the question Episode 5
planted: a Keeper asked him, in writing, when he was fourteen. He shows the letter. He keeps the page. He never fights the
party. He rides down in the fourth seat.

### Returning cast

Saffron Haven: Sel, Yara, Laleh, Kamal (one line each in Act I, one after `ep6_complete`). Valewyn, Emberpeak, Hollowmere
and Willowmere residents (by the Keeper mirrors and the new road): one Episode 6 line each after `ep6_started` and after
`ep6_complete`. Holt carries the Willowmere side again: after `ep6_started` "Bram's letter says he's going up a chain to
an island in the sky. I've read it four times. It still says that." After `ep6_complete`: "Letter from Bram. Says he held
on to somebody. Says he didn't think. That's my boy."

---

## 4. Tone guide (what changes from EPISODE5 section 4)

Everything in Episodes 1 to 5 stands: warm first, then the chill; show forgetting, never explain it; names with weight;
short boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **Sky blue and peach by day, slate by storm.** Episode 5 was gold sand and indigo night. Episode 6 is high clean light:
  peach cloud, pale blue sky, white wind, green islands, brass and rope; then the storm, slate and bruise-violet with
  electric blue in the cracks. The town and the storm must look like two worlds a lane apart.
- **Courses, not fates.** Zephyr Landing's sickness is not fatalism (Episode 5) but misdirection: a town that keeps flying
  and keeps arriving nowhere. Show it with motion: a board that clacks ARRIVED over empty docks, ships that go out and
  come back without landing, chimes tied silent, a woman meeting every arrival. Nobody explains "the Scribe rewrites the
  courses"; the board changes while you watch.
- **Holding and letting go.** Use the verbs on purpose: hold, anchor, carry, catch, listen, return, steer, write. The
  Scribe's capitals are about courses and what is written, as the Oracle's were about endings.
- **Bram's hands, not Bram's mouth.** Bram's big moments are physical: the dock, the spear, the line over nothing. Keep his
  lines short and late; let the scene show him holding before he says anything.
- **Humor carriers.** Bram (heights, chains, birds), Bennet, Nova, Vex, Aeris once she starts. Never during a memory,
  never at Pippa's expense, never while someone is hanging over nothing.
- **Aeris's restraint cracks once.** "...I'm late." Keep the rest of her clipped and practical.
- **Names with weight in this episode.** Pippa (read off her sister's letter under her own lamp), Liora (said by her
  sister at the right dock), and the hero's, found written for the first time, half a page, in a hand nobody can name.
- **The responsibility arc, as subtext only.** Nobody says "take responsibility". Aeris turns back. Bram holds. The hero
  tells the person who paid for the storm that it was about them. Vex answers because someone held on to him. The game
  names no real person and credits no teacher or author (RESPONSIBILITY_ARC section 0, decision A).
- **Lightning is quiet on the screen.** The storm's lightning is far off, slow and soft: never a full-screen white flash,
  never more than one flash in four seconds (a phone safety rule, plan 9.3).

---

## 5. The lore added in Episode 6

**The Wind Script.** The Keepers divided the Book of Names "so that no single fire could take it all" (Episode 1). The
isles' share was written on the wind: every name of the realm as a line on long banners of sail-cloth strung between the
islands, read aloud by the wind as it passes (why the winds of the isles "carry broken sentences", canon). A Keeper
construct, the Scribe of Winds (the Storm Scribe), copied every course and manifest from it. The Wind Script is the sixth
fragment.

**A course is written toward a name.** In the isles a ship is steered by a course written toward someone: a dock, a
beacon, a person waiting. That is how the Sky Compass works: name a thing and it points to the line of the Wind Script that
holds it. Strike a name off the wind and no course, no compass and no beacon can find that person, though nothing has
touched them at all. That is how Pippa was lost: not to the storm, but to the manifest.

**Readings turn; courses can be rewritten; a hand can hold.** Episode 4 taught that true ink holds. Episode 5 taught that
a reading is not a record, and can be turned. Episode 6 adds: a course is only ink, and the Scribe can rewrite every one;
what it cannot rewrite is someone holding on to someone. **Hold on, then ask.**

**The Cloud Library.** A small Keeper reading room on the top of the cloud above the isles, where the Keepers kept the
weather logs of every flight. "A library above the clouds" in the freed Oracle's reading. It is not the First Library
(Episode 8); nothing in it is a list.

**The six lists.** Vex now counts six, in one hand under one seal (an open book with nothing written in it): Emberpeak's
(twenty-five years ago), the desert's (twenty), the Hollow's (fifteen), Valewyn's (twelve, renewed a month before
Episode 4), Willowmere's (a month before Episode 1), and the sky's (a month ago, the newest). The sky's list has no names
on it. It hunts a page: THE FIRST PAGE. LET NOTHING REACH THE SHELF. The list-writer has stopped trying to erase the hero
and started trying to find where the hero began.

**The first page.** The page on which the hero's name was first written, in the warm hand, with the counter-seal under it
and "Keep this one." in full: the original that every copy in the six fragments was made from. Half of it. It is torn
across the start of a line: "Carried down the White Road by".

**Who asked Vex.** A Keeper, in the warm hand that writes "Keep this one." and taught Ishra her letters. The letter asks
the reader to keep a child's first page where no list can read it, and promises nothing else will be asked. The signature
has been lifted clean off the paper: the Keeper's own name has been taken (by a list, inference), but the letter could not
be. Vex was fourteen, mending bindings for the people who write the lists, and said yes.

**The counter-seal, a sixth time.** On the Wind Script, under the hero's line, the counter-seal and "Keep this one." On
the first page, the counter-seal again, in the same hand, the first time it was drawn.

### What the player knows by the credits
The list-writer is hunting the hero's beginning now, not only the hero's name. A Keeper, whose own name has been taken,
wrote the hero into the Book the first time, asked a fourteen-year-old binding-mender to hide the page, and wrote "Keep
this one." under every copy since. Vex has kept the hero's first page above the clouds for years, and still keeps it. The
page is half: the other half went north, and the line it tears across says the hero was carried down the White Road. The
Hollow North is fading off the map.

### Held back for later episodes (consistent with the root game)
**Kept for Episode 7:** the warm hand's name and who that Keeper is (inference toward the Court's forgotten Keeper, or
toward Keeper Nox of the Hollow North; never said); the other half of the first page; who carried the hero down the White
Road (inference toward Tess's father, who went north by the White Road: Episode 2; never said); Tess's father himself and
the White Road letter Piri gave the hero; whose name Vex would not hand over in Valewyn (LEGACY "The Name Under Ice": Vex
carves his own name into the frozen road and watches half the letters go; inference: it is his own); why Mara tuned "one
bell down in your valley, once". **Kept for Episode 8:** who writes the lists (root canon: the Eraser, once the First
Keeper, the First Library); why the hero, and what the list-writer wants with their beginning; the mural's eighth star
with no symbol; Vex's "I kept one thing from the Eraser: your beginning. You keep the ending." (LEGACY "The Last Margin",
Episode 8; Episode 6 keeps it possible: Vex still holds the page). The Hollow North and the Frostbound Vault (Episode 7).

---

## 6. What Episode 6 sets up for Episode 7

- **The destination.** The restored Sky Compass, named "the other half of the first page", points north and holds; the
  White Road climbs into mountains that flicker off the map (root region 7, the Hollow North: Keeper Nox, the Frostbound
  Vault, the White Phantom, "The Vanishing World"; bosses cell 6, environments cell 6).
- **The hero's stake.** Six fragments, a first page found and read, half of it, and a line that says someone carried them
  down the White Road.
- **The rival.** Vex has answered who asked, has been held by Bram, keeps the page, and stopped himself on "I haven't been
  up it since...". Episode 7 is the fair place for Vex's own name (the LEGACY "Name Under Ice").
- **The party.** Unchanged: three, each now with a center behind them, Bram twice. Aeris and the Kestrel can fly them north;
  whether she does is Scott's and Stephen's call then. Whether Vex rides with them as a guest is also open.
- **What Episode 8 must still pay.** The Eraser, the First Keeper, the First Library, why the hero, the eighth star, and
  Vex's last margin.

---

## 7. Episode 6 by the numbers (for the writers)

About 32 scenes (keep Episode 6 under 40 built), 8 new named townsfolk (Aeris, Liora, Bennet, Suri, Ilex, Nova, Piri,
Thea) plus Pippa and the voice of the Scribe in memory (and memory extras: deckhands, a younger Aeris), one inn counter
(the Cloudhouse Host), 3 side stories, 3 books (`flight_manifests`, `flight_logs`, `pilot_charter`), 11 banners (Zephyr
Landing's has two states, before and after `isles_restored`), about 35 inspect lines (the departure board in its two
states, the tied chimes and the ringing chimes, the post rack, the signal beacon dark and lit, the Kestrel, the great chain,
the gust lanes, mooring posts, weathervanes, relays, speaking tubes, the duct grilles, the pilot charter's three lines, the
signal lamps, Pippa's crates, the Scribe's desk, the quills, the Wind Script banners, the Cloud Library's shelves and its
glass, the feather). Party chat (Talk) needs a hint for each main step on each map, in the house style, naming the next
action ("Turn the vane, then ride the lane back to the post"), and must name something doable after `ep6_complete` (the
locker, the dead letters, the beacon, Pippa at the signal tower). Four close-up page kinds (plan 9.4).

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** The Skybound Isles; Captain Aeris, the companion the chapter turns on; Zephyr Landing and the
Windward Docks ("An airy skyport of rope bridges, brass observatories and cloud gardens. Wind chimes mark safe crossings
between islands."); the Cloudhouse Inn, Aeris Flight Provisions, the Galewing Workshop, the Skyport Departure Board, the
South Airstair (as the Airstair, the way up from the sea) and the east airstair to the Storm Observatory; the witnesses
Liora (Wind Navigator), Bennet (Rigging Master) and Suri (Sky Cartographer) and their roles, Liora's and Bennet's lines;
the Signal Beacon of Lost Flights, its three testimonies and its rewards (potions, ethers, +20 Focus as +20 Fury); the
townsfolk Ilex, Nova, Piri and Thea and their lines; the Captain's Brass Skychart (as the chart room); the Storm
Observatory's three floors (I The Windward Causeways, III The Eye of the Storm, II renamed below); the sky tile vocabulary
(skyplank, skywalk, stormglass, skybridge, gustlane, cloudbank) and decor (windsock, rotor, windstone, skyflower); the
Breeze-Sheltered Recovery Alcove (the fonts); the Star-Sail Supply Coffer (a chest's name); the Sky Compass Key on F1's
upper deck and the Sky Compass Keyhole; the Sky Sailors' Emergency Locker and its three logs (Departure, Distress, Rescue);
the pilot oaths Anchor, Listen, Return and the Last Pilot Charter's words; the Storm Scribe (name, look from bosses cell 5:
a winged ink-and-cloud beast with electric-blue feathers and hovering runic quills), weak to piercing and resisting ice in
its Wind Script phase, the Storm Script Ward with the False Beacon and the Broken Compass absorbing most damage with a 33%
floor, the True Sky Chart (armor falls, weak to fire, +25 Focus as +25 Fury), the Thunderhead's charged lightning; "The
Storm Scribe replaced our rescue beacons with false arrival times"; "The Scribe erased the word RETURN from every flight
plan"; Pippa Voss, the signal apprentice struck from every manifest while she kept a beacon alive, and her line "I am Pippa.
I held the light. Please remember that we came back for each other." (split across `fifth_voice`); two of Aeris's three
memories by title ("The Name Removed From the Crew", "The Fifth Voice of the Fleet"); the chapter ending "The Sky
Remembers" (Aeris reads the names, Pippa's among them, the signal towers light) and the region ending "The airship crosses
the clouds. Below lies a land already half erased."; the Sky Compass as the chapter's thing to restore; the root enemy names
Gale Sprite, Signal Wraith, Storm-Marked Page, Lightning Manta, Storm Harrier; environments cell 5 (floating islands, a
small airship, bridges over sunlit clouds, sky blue and peach) for the town and its key art; the region-6 Suno brief
(soaring flute, buoyant strings, bright harp, light cymbals, 112 BPM) as the town theme's brief for the in-repo tracker;
the LEGACY Vex scene "The Empty Seat" and his line "The sky routes are being rewritten. I prefer to choose where I vanish."

**Changed, with reasons.**
- **Word and order puzzles are gone** (DESIGN hard rule 2; Episodes 3 to 5 did the same). F1's three wind rudders with a
  printed answer chart (WEST faces SOUTH...), Suri's testimony that names the settings, F2's relay cycling with a diagram
  and its Across/Down word grid, the ordered flight logs, and F3's recited pilot oaths (wrong order resets) are all
  replaced: the floors open by gust lanes and vanes (plan 5.1), the logs are found in any order, and the oaths are the
  spire's three landings in the order of the climb, never an answer to get right.
- **Gust lane damage is gone** (no damage tiles: phone players). Gust lanes carry the party; they never hurt it. The
  beacon's canon reward "gale hazards now inflict only 2 HP instead of 9" becomes a rest point and the Fury bonus.
- **"The Orrery of Broken Signals" becomes "The Hall of Broken Signals".** Expansion 1 owns `orrery*` ids and a map called
  The Orrery, and Episode 5's Armillary Tower already carried the turning-rings image; a third orrery would read as a
  repeat. "Broken Signals" is kept.
- **Aeris's first memory is re-aimed.** Canon "The Captain Who Turned Back" (Aeris abandons a record flight to answer a
  distress call and returns for a single child) is Episode 5's "The Unfinished Caravan" again (a caravan turns back for one
  missing stranger). Here the memory is "The Shortest Way Home": a month ago Aeris did not turn back; she followed the
  Scribe's course home and left the apprentice with the light. Her turn back is live, on the spire (`aeris_turns`).
- **The memories are live by the end.** Canon memory 3 is a radio call replayed. Here Pippa is alive and the third voice is
  her, found on the spire. The fleet's memories are relay recordings the wind replays (the sand kept impressions in
  Episode 5; the isles keep sound).
- **Phases.** Canon has four (Wind Script, Storm Script Ward, True Sky Chart, Thunderhead Finale below 28%). They become
  three: the Thunderhead folds into the True Sky Chart as its charged move, with Haste (Episodes 4 and 5 did the same).
- **The Aeris Flight Oath** (an opening two-turn Aegis, +35 Focus, one automatic intercept of the charged lightning) is not
  a bond: Episode 6 has no bond system. Aeris's gift is the truth path's Kestrel's Wings or the hidden path's Quiet Chime
  (plan 7.3), and the episode's battle answer is Bram's Anchor (from the oath's first word).
- **The Sky Compass** (the canon reward) is a key item the party carries broken from Act III and sees restored in
  `scribe_after`, and the boss guards the sixth fragment of the Book, the Wind Script (the NEXT pattern: every boss guards
  a fragment). The canon "Captain's Brass Skychart" text ("The compass is broken into seven glyphs") is dropped: glyphs to
  collect are a word game by another name.
- **The First Library's order.** Canon's ending says "the First Library had ordered every honest rescue signal replaced
  with a false route". Here the order is the sixth list, in the cold hand under the empty-book seal; the player already knows
  the lists come from the First Library (Episode 2 section 5), so nothing is lost, and the First Library stays Episode 8's
  stage.
- **Liora's sister is Pippa** (inference): canon Liora's "My sister waited at the wrong dock until the clouds swallowed her
  signal" and canon Pippa's beacon are one story told twice; here they are one family.
- **The Cloud Library** is new: the freed Oracle's reading (Episode 5) says "a library above the clouds keeps the first
  page", and root canon puts the First Library at the end of the world (Chapter VIII). They are kept apart on purpose: the
  Cloud Library is a Keepers' weather-log room, small, kind and empty.
- **Vex and the first page.** LEGACY "The Last Margin" (Episode 8) has Vex arrive at the First Library "carrying the first
  page he stole in Willowmere" and say "I kept one thing from the Eraser: your beginning." Episode 5 put the page above the
  clouds. Here Vex took the page at a Keeper's written request (not stole it; the LEGACY verb is softened), hid it above the
  clouds, and keeps it after Episode 6 (open choice 5), so the Episode 8 scene stays possible word for word.
- **Ren the Sky Watch** is folded into Bennet ("I watch the cloudbanks for storms with no horizon" becomes Bennet's), and
  Nova's dock lines are shared with him, so the town keeps eight named townsfolk.
- **The region index.** The root code calls this region index 5 (`s.region===5`), its Suno brief "region-6". NEXT calls it
  Episode 6; nothing in NEXT depends on the root index.
- **Inference:** the Storm Scribe is a Keeper construct (the Scribe of Winds) and the sixth fragment is written on the wind.
  Basis: bosses cell 5 (ink and cloud, runic quills), canon "winds carry broken sentences", "The Scribe's recovered
  star-chart" (a written chart kept by it), Episode 1's division of the Book, and the Moth, Court, Warden, Clerk and Oracle
  pattern.
- **Inference:** the sky's list is a month old and names a page, not people. Basis: canon "the First Library had ordered
  every honest rescue signal replaced with a false route" (an order about routes, not names), Episode 5's reading of the
  first page above the clouds, and Episode 4's "Now they know where you are".
- **Inference:** the warm hand's own name has been taken. Basis: four episodes in which nobody can name the hand; Episode 2's
  forgotten Keeper of the Court (the empty portrait); the list-writer's habit of taking the names of those who could undo it
  (Garrick, the Regent, the Oracle's first student).
- **New:** the boarding slip and its fourth seat; Mira's question on the Airstair; the dock where Bram learns Anchor; the
  Gale battle rule and Anchor; gust lanes, mooring posts and vanes; the Kestrel; the Gale Engine; the sixth list with no
  names; Vex's letter, his age and his yes; Pippa alive on the spire and home at the right dock; the Cloud Library and the
  half page; Piri's Dead Letters and the White Road letter; the north flickering on the map.

**Name collisions to respect.** Episode 2 owns `vow_*`, `testimony_*` for the Hollow witnesses, `vex_mirror`,
`black_feather*`, `rook`; Episode 3 owns the map prefix `pk_`, every `foundry_` and `sand_` id, `oath_*` (so the spire's
landings are `pledge_*`), and the Ash Specter's phase `updraft` (so no `updraft` id here); Episode 4 owns every `ep4_` id,
`principle_*`, `answer`, `strike_roll`, `flood_decree`, `regent_*`, `lyra_*`; Episode 5 owns every `ep5_` id, `sky.js`,
`sky_learned`, `sky_turn*`, `SKY_START`, `turn_sky`, `caravan_compass`, `landing_*`, `sel_memory_*`, `last_prophecy`; X1
owns `star_*_read`, `star_chart`, `star_chime`, `orrery*`; Fine Print owns `countersign`, `witness_seal`, `codicil`,
`errata`, `marginalia`, `strikethrough`. Core sfx `thunder` and ambience `wind_valley` exist (reuse them, never redefine).
Episode 6 uses: map ids `ep6_*`, encounter prefixes `e6a_`, `e6o1_`, `e6o2_`, `e6o3_`, `testimony_liora`,
`testimony_bennet`, `testimony_suri`, `pledge_*`, `aeris_memory_*`, `vex_relay`, `vex_falls`, the skill `anchor_line`
(never bare `anchor`: a layout key in the UI code), the boss moves `rewrite_course`, `full_blast`, `thunderhead`. Full
registry: plan section 2 (grepped 2026-11-09).

---

## 9. Build notes

Reserved for E6-story (wave 6a): what the built script does beyond the beat sheet (deltas only, as EPISODE5 section 9).

Built by E6-story, 2026-11-09 (`src/data/ep6/{flags,npcs,quests,text,story,ledger}.js`, staging in
`docs/story/STAGING_EP6.md`, tests `qa/content/ep6_story.test.mjs` and `ep6_data.test.mjs`). 39 scenes registered (32 main
and chained, 7 side), main path 194 boxes (budget about 200; `ep6_morning` 5, `vex_falls` 15, `scribe_after` 16,
`cloud_library` 16). Deltas from section 1:

- **Under 40 scenes.** `aeris_turns` is chained from `obs_f3_arrival` and `testimony_suri` from `beacon_start` (Suri is
  her own witness, as Kamal was); neither is a registered scene, since no map event starts either.
- **Staging.** Every scene with a speaker outside the party walks the hero to a mark two tiles from the speaker, Mira one
  tile left and Bram one tile right (`X`, `X_m`, `X_b`, listed in STAGING_EP6 section 3). Apart on purpose: `mira_asks`
  (Bram a landing below) and `anchor_lesson` (Mira thrown to the edge, Bram beside her).
- **No twins in town.** Aeris is the record `aeris` on Zephyr Landing; a scene moves the record itself (`spawn('aeris')`)
  and a reload puts her back. Elsewhere she is the spawn `aeris_t`. Her record stands down from `aeris_came` until
  `library_reached` (`AERIS_AWAY`). Yara at the berth and Liora at dock four are their own records too.
- **Bennet keeps two posts**: `bennet` on the docks (the witness) and `bennet_winch` at the Airstair's winch stall (shop
  `winch`), Ledger-excluded as "see bennet".
- **`ep6_board`** does not move the party: two boxes, the tint drops to dusk, and the berth's boat door does the
  crossing. `airstair_foot` opens on one narration box of the night at sea, then dawn lifts to day.
- **`ep6_morning`** keeps the bible's order with the slip open through "Four seats. There are three of us." (silence on
  it); Mira's compass line is the last box, as she folds the slip away.
- **Bram's question at the relay** says the name: "Who asked you to keep {hero}? In writing. You said."
- **The Sky Compass** is given at `east_gate` with the Windward Pass (one narration box), so the party carries it
  spinning; in `scribe_after` it goes still in the bag and the hero holds it out to Aeris, who names the shelf.
- **The pledges** each open on the lamp lighting with its carved line of the charter (canon words), then the voice and
  Aeris's line.
- **`vex_falls`**: the letter is two narration boxes; Vex's fourteen line is two boxes; he walks on up the spire at the
  end. The rope is the pack helper `s.rope` (E6-scene-ui); until it exists the narration says the line holds.
- **The Scribe answers each choice** before the fight with one new line ("EVERY WAY UP IS STRUCK. THAT IS THE COURSE." /
  "NOTHING HOLDS. THE WIND TAKES THE SHORTEST WAY."). The Engine's and the Scribe's intros say their arc lines.
- **`cloud_library`**: the page in three modes; under `torn` the torn line first and "Keep this one." last. Mira's truth
  exchange is the bible's two boxes on each path.
- **`pippa_home`** is set in `ep6_ending` once the spawn `pippa_t` is gone, so the record never doubles her.
- **New flags** `engine_tried`, `scribe_tried` (a retried boss intro is the pan, Bram's tip and the card).
- **Music** has no volume control in the cutscene API, so the "softer" cues play their tracks as is.
- **Talk.** While `EP6_LIVE`, an Episode 5 finisher hears "the Dune Lantern, then the water stairs", and on the Haven's
  maps every older hint is held until the party boards (the Episode 5 morning's fix). The Airstair choice changes one
  Mira line in the F1 banter.

---

## 10. Choices that are Scott's or Stephen's

None of these blocks the build; the default is what the build agents use. Each is one line of why. Either Scott or
Stephen may change any of them; the story is joint.

1. **Whose episode: Bram's, with Captain Aeris as a non-fighting guest.** [default: yes] Bram's second center continues the
   rotation (Mira, Bram, hero, Mira, Bram), and a guest avoids the fourth party slot the engine cannot pay for.
2. **Vex booked the four seats and rides the fourth** (the LEGACY "Empty Seat", re-aimed). [default: yes] It opens the
   episode on a question a player can feel ("four seats, three of us") and pays it off in the last scene without a speech.
3. **Who asked Vex: a Keeper, in the warm hand, whose own name has been lifted off the letter; Vex shows the letter after
   Bram holds him on the spire.** [default: answered this way, the name withheld] It honours Episode 5's promise ("the fair
   place for who asked") while keeping the hand's identity for Episodes 7 and 8.
4. **Vex's one line about himself: "I was fourteen. I mended bindings for the people who write the lists."** [default:
   this line, no place named] It points Vex toward the First Library for Episode 8 without saying the name; cut it to keep
   his past wholly open.
5. **The first page: the top half is found and read in three steps (the name, the seal, "Keep this one." and the torn line
   "Carried down the White Road by"); Vex keeps it; the hero's Ledger row stays unkept.** [default: as written] The payoff
   lands, the LEGACY Episode 8 scene stays possible, and the hero's own keep is saved for the last episode.
6. **The sixth list has no names, only THE FIRST PAGE, and the storm is partly the hero's doing.** [default: yes] It
   raises the stakes without a new villain and gives the main truth choice a real cost to own.
7. **Truth choices: two, Mira on the Airstair ("Are you scared?", one line later) and Aeris on the spire ("Whose page?",
   one line and her gift).** [default: two, small and honest] RESPONSIBILITY_ARC decision D; Episode 5's two landed.
8. **Pippa Voss is Liora's sister, found alive on the spire, home at dock four.** [default: yes] It joins two canon
   fragments into one family and gives the ending a living reunion that is the party's doing, not luck.
9. **Aeris's first memory re-aimed from "turned back for one" to "did not turn back", with her turn on the spire.**
   [default: yes] Episode 5 already told the turn-back story; the inversion gives Aeris a beat of her own.
10. **Renames and drops for canon conflicts:** the Orrery of Broken Signals to the Hall of Broken Signals, pilot oaths as
    `pledge_*` landings, four phases to three, no gust damage, no rudders, relays, word grid, ordered logs or recited
    oaths, Ren folded into Bennet, the Flight Oath bond into a gift and Anchor. [default: as listed] Each follows a hard
    rule, an id collision or an asset fact (section 8).
11. **Small threads touched, not pulled: Sel stays in Saffron Haven (one farewell line); Piri gives the hero an unopened
    letter addressed to Willowmere from the White Road.** [default: yes, neither answered here] Sel's walk was Episode 5's
    ending; the letter seeds Tess's father for Episode 7 without opening it.
12. **Cards.** Episode 6's title card stays as Episode 5 shipped it ("Episode 6: The Skybound Isles / Above the clouds, the
    first page waits."); the end title is "End of Episode 6 / Words on the Wind" (the root title); the Episode 7 card is
    "Episode 7: The Vanishing World / The other half of the page lies north." [default: placeholder] All within 42
    characters and naming only canon places.
13. **Fine Print and Episode 6.** A Fine Print run does not enter Episode 6 (`ep6_morning` needs `not tier_1`). [default:
    base game only] The same call as Episode 4 decision 6 and Episode 5 decision 11.
14. **Aeris has no portrait, and there is no paid art or music** unless Scott approves the optional items (plan 9.5: one
    Runway still for Aeris, one for a painted relay hall, one Suno track). [default: none; the build ships without them]
    Scott's accounts need his own go, and he makes those generations himself.
15. **Shipping.** Episode 6 is built behind `EP6_LIVE` on a build branch; E6-integrate flips it on the branch only after
    the full gate list. Shipping to players stays Scott's or Stephen's explicit word.
