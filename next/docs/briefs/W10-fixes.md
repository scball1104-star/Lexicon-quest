# W10-fixes: Episode 1 fix pass from PLAYTEST_REVIEW_2

**Owned paths:** `next/src/data/**`, `next/src/battle/ai.js` (Auto policy only), `next/qa/content/**`, `next/qa/maps/**`,
`next/qa/battle/**`, `next/tools/sim/**`, `next/docs/story/**`, `next/docs/MAPS.md`, `next/docs/BATTLE.md`,
`next/tools/maps/previews/**`. Nobody else is coding. Read COMMON.md (no git, no em dashes) and
`next/docs/PLAYTEST_REVIEW_2.md` fully; its "ten to fix" list is the core of this brief.

Also fix these specific findings:
1. A rest point (font) the party can reach BEFORE the Echo Warden (the F2 font now sits behind the hidden-ink bridge);
   keep the existing one too if it still makes sense.
2. Whisperwood Hollow: a rest point near the Alpha's door, and a lost Alpha fight retries at that rest point.
3. The Alpha should stay a fight for a party arriving after the Archivore: scale its level/stats with the party
   (or offer a "rematch" tier) while keeping the Lv 6 to 7 target for the intended route; the boss-intro actor uses
   the `briar_alpha` field sprite.
4. After `lantern_get`, one Talk hint (and a short Quill reminder in the valley) points back to the pool.
5. Ordinary fights average 5.5 rounds live against a 3 to 5 target: find the cause with the simulator and the
   live autoplay logs in `qa/out/autoplay/` (MP attrition, elites, Auto policy) and fix the cause, not the symptom.
6. Gold piles up (2,900 at the end): add one shop tier after the Echo Warden (better gear at the smithy or a
   peddler in the Archive) so gold has a use; keep the simulator's economy checks green.
7. Trim the text before the first fight where it can lose boxes without losing a protected moment (keep every
   "Protect" item in both reviews).

Verify: `node next/qa/run.mjs` green, `node next/tools/sim/simulate.mjs --check` green, previews of maps you touch,
dialogue renders for scenes you change. Report under 250 words.
