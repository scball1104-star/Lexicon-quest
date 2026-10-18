# W5-story-maps: pacing, clarity and the missing beats (content + maps)

**Owned paths:** `next/src/data/story/**`, `next/src/data/npcs.js`, `next/src/data/quests.js`,
`next/src/data/text.js`, `next/src/data/maps/**`, `next/qa/content/**`, `next/qa/maps/**`, `next/docs/story/**`,
`next/docs/MAPS.md`, `next/tools/maps/previews/**`.

Read `next/docs/PLAYTEST_REVIEW_1.md` fully (it is the brief behind this brief), then `docs/story/STAGING.md`
section 1 (the cutscene API; nothing new is being added, so stage boss intros with camera.panTo, shake, flash,
music, title and say), `docs/MAPS.md` (event vocabulary: `font` events with `safe: true`, `enemy` events with
`move`, flag-conditioned events via `if`/`ifNot`, `object` events with `script`), and the current content tests.
Keep the voice (Mira precise and dry, Bram warm and blunt, Mael gentle) and the rules (no em dashes, 3 lines of
42 chars per box, ASCII only). The systems agent is working in parallel on `src/world`, `src/ui`, `src/game`,
`src/scenes` and the bot; do not touch those.

## Deliverables
1. **Side quest gating:** Tess, Wick and Nella start their quests only after `bram_joined` (before that they have
   a normal line that hints something is on their mind). Oren's starter can stay early. Update journal text if
   needed.
2. **A teaching fight by minute five:** on the valley road right outside the gate, `e_wolves_a` becomes a `chase`
   enemy at (14,33) and a one-time scene `first_fight` fires on the road: a wolf pack cuts the party off; Mira
   (one box) says Appraise shows a foe's weak points; Bram (one box) says a Lunge breaks a charging foe. Then
   `battle('valley_wolves', {canFlee:false})`, then one short exchange. Unavoidable, 4 boxes total, no tutorial
   signage.
3. **Bark fix:** the "it moves when we move" bark must fire on `archive_f1` (first visible dungeon enemy), not in
   the valley; the valley gets a different first-enemy bark ("Wolves. They will come to us.").
4. **Clarity lines:** (a) Talk hint for the F1 step after the key puzzle says the key is in the west wing and the
   locked door is east; (b) a plaque near the F3 crystals: "Three lights, one door"; (c) `lantern_get` and the
   Talk hint for the F2 bridges name the button: "Raise the lantern with {i:btn_pageR}" (the UI renders the
   device glyph); (d) Quill gets a second line about the pool past the pines where the pilgrims lost a bridge
   (the Whisperwood secret).
5. **Keeper's font before the Warden:** a `font` event (`safe: true`, heals, save prompt) in the F2 stairs room
   near (35,12), with a two-line inspect text. And a second font or bell is NOT added anywhere else.
6. **Shortcut:** `shortcut_f1` opens when `archive_f1_done` is set (event `if` flag), so a town revisit is cheap.
7. **F3 mix:** swap `e_cor_wraiths` (the unavoidable `f3_wraiths` patrol at (5,20)) with `e_ws_ink_b` (the `f3_ink`
   guard at (3,14)); zone plan counts stay identical; `qa/maps` enemy-count test must still pass.
8. **Boss intros:** in `echo_warden` and `archivore`: camera pans to the boss (40 frames), one beat of silence
   (`music(null)`), a `title` card with the boss name and an epithet, shake + flash, then `music('boss_archivore')`
   (Warden: 'battle') just before `battle(...)`. Keep the existing dialogue.
9. **Reward and return:** after the Archivore, the fragment pickup already exists; make sure `give('lanternheart')`
   (the legendary) happens in the post-boss scene with its own line from Mira, so the player sees the legendary
   toast (the systems agent is making legendary toasts glow).
10. **Campfire at the Pilgrim's Rest:** an `object` event at the campfire in `valley` running `campfire_rest`
    (once): the party sits, one choice ("Ask Bram about Emberpeak" / "Ask Mira about the Archive" / "Just rest"),
    a short answer per choice (3 boxes), then full heal and the save prompt text ("Rest here?" handled by the
    font-style flow: use `give`-free primitives; set flag `campfire_rested`). Later visits: a one-box rest offer
    only.
11. Re-render the previews you touch; keep `node next/qa/run.mjs` content and maps suites green; add tests for
    the gating and the new scene ids.

Report with the scene ids added, the lines quoted for the clarity items, and the test results.
