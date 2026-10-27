# Responsibility and Adventure: the spine for a professional Lexicon Quest

Written 2026-10-26. Direction from Scott: tie in the ideas Dr. Jordan Peterson teaches about responsibility and adventure; the game must capture the player from the first minute and keep them wanting the next hour. Status: DECIDED by Scott on 2026-10-26 (his words in section 7). Built one agent at a time on `overhaul`, unpublished until his explicit yes.

## 0. Ground rules for using the ideas

1. **Show it, never lecture it.** The ideas live in what the player does and what it costs, not in speeches. No NPC says "take responsibility". A Dragon Quest village does not sermonize; it hands you a bell to carry.
2. **Subtext, not citation.** The game never names Dr. Peterson and never puts words in his mouth. The ideas are older than any one teacher (the hero's journey, the dragon and the hoard, the Book of Names, "speak and be kept"), and the story already stands on them. Whether the credits or the store page say "inspired by" is Scott's call (open decision A).
3. **No invented quotes.** Nothing in the game is attributed to a real person. Write our own lines in the game's voice.
4. **No em dashes** in anything Scott reads.

## 1. The idea in game terms (Inference: my mapping, for Scott to correct)

| Idea | In Lexicon Quest | Where it already lives |
|---|---|---|
| A name is a promise you answer to | Responsibility is answering when your name is called. The hero is the one name on the list not crossed out | Door: SPEAK, AND BE KEPT; the Register; the list |
| Tend what is in front of you first | Small, real jobs before the big quest. Fixing the ferry bell is not a distraction from the dragon, it is the training | Side stories: Tess's letters, Oren, Wick, Nella |
| Voluntary adventure beats being dragged | The strongest play is the one the player chooses: optional fights, optional burdens, optional doors | Optional Whisperwood, X1 expansion |
| Face the thing you avoid; the treasure sits behind it | Every boss guards something the town forgot on purpose or by neglect | Archivore, Reeve, Millstone Golem |
| Carry the weight, grow into it | Burdens you take make you stronger; shortcuts leave you thin | NEW: Vows (section 3.2) |
| Chaos and order | The fading is chaos; the Book and the bells are order. Too much order is a cage (the Echo Warden's last order) | Echo Warden, Keepers |
| Tell the truth, or at least do not lie | Say the true name even when it is awkward. A lie costs you in play | NEW: Name Truth choices (section 3.4) |

## 2. The first five minutes: capture

Today (Fact, from `docs/story/EPISODE1.md` beats 1 to 4): six title cards, wake up, a gentle fading-sign scene, Mael at the well. It is warm and clear, and it spends about four minutes before anything is at stake in the player's hands. That is the gap.

**The rule: control in 20 seconds, a question in 60, a choice with a cost in 3 minutes, a taste of a fight in 5.**

Proposed opening (replaces beats 1 and 2, keeps 3 and 4 as the second scene):

1. **Cold open, playable, 90 seconds: "The Thirteenth Toll".** The hero already stands in the bell tower stair, at night, a lantern, no party. The player walks up twelve steps; each step a bell tolls and a name from the town is spoken (Hazel, Mael, Oren, Pip, Tess, Iris, Holt, Garrick, Nella, Wick, Edda, Bram). The thirteenth toll comes and no name is spoken: a gap the player hears. Black. Title.
   - Purpose: control at once, a mystery that is a question (whose name was the thirteenth?), the cast introduced by sound, and a first taste of the game's feel.
2. **Wake up** (existing, shortened by half). Hazel calls the hero up as before. The doorframe marks are already paler: the first quiet clue stays.
3. **First choice with a cost, minute 3.** Out the door the bakery sign fades. The player chooses what to say to Oren: the true name (he forgets himself for a breath, then recovers) or a kind lie ("it never said anything"). Both are playable and both remembered (section 3.4). Small, cheap, and it teaches the game's whole grammar.
4. **A first fight by minute 5** (today the first fight is after leaving town, roughly minute 20). Proposed: one tutorial scrap in Willowmere itself, a runaway ink slime loose in the bakery yard (ties to Oren's runaway starter). Bound to the existing battle scene, one enemy, no flee. Reward: the first "Name Returned" mark (section 3.1).

Open decision B: Scott may prefer the current gentler opening. The cold open and the early fight are flag-gated so both can be played and compared.

## 3. The systems that make it "one more hour"

### 3.1 The Ledger of Names (the long-term pull)
A single screen in the menu: every named person in the game, faded or bright. Each side story, each boss and each true answer restores one. Counter on the title screen: "Names kept: 17 of 63". It is the clearest completion goal in the game, it is on-theme, and it gives every NPC a reason to exist. Build: reads existing flags, one new scene, one new data table. Low risk.

### 3.2 Vows (adventure as chosen weight)
At every campfire and font the player may take ONE Vow, optional, self-imposed. Examples: "No fleeing", "No healing items this floor", "Carry the heavy lamp (-1 move speed)", "Protect Mira (she must end the floor above half)". Keep a Vow and the next rest pays out a stat or item and a line from the party; break it and it simply ends with a small, honest cost (no punishment screen, no lecture). This is the game's one mechanic that says: the harder road chosen on purpose is the better road. Build: a Vow table, three hooks in battle and field, a campfire menu row. Medium risk; ships behind a flag.

### 3.3 The Aim (focus, replaces the HUD clutter debate for good)
One line at the top of the field screen: the single present aim ("Find Mira at the library"). Already roughly the Wayfinder; rename and keep it the only guidance. Opening the menu shows the Aim, the Vow and the Ledger count together, so the player always knows what they are doing and what they have promised.

### 3.4 Name Truth choices (responsibility with a memory)
A handful of dialogue choices per episode (target six to eight in Episode 1, not more) where the true thing is harder than the kind lie. NPCs remember the choice and it changes one later line and one small reward, never the main route. Rule: the true answer is never "correct" in a way that feels like a quiz; the lie is understandable and costs something real later (Oren remembers you humoured him).

### 3.5 Cliffhanger rhythm (retention)
Every dungeon floor and every episode ends on a question, not a resolution (the thirteenth bell rings again). Rule for every writer: last scene of a floor opens exactly one new question. The existing episode endings already do this; floors do not yet consistently.

### 3.6 The Boss is the thing you avoided
Each boss intro card gains one line naming what the town avoided (not what the boss is). Archivore: "Eater of Names. It was fed for a hundred years." Reeve: "Keeper of the Count. Nobody checked the count." Small, cheap, and the theme lands without a speech.

## 4. What I am NOT proposing

- No philosophy dumps, no real names in the script, no morality meter, no good/evil bar.
- No change to the Episode 1 main route length or the published saves.
- No Episode 3 scope decision (still Scott's).

## 5. Build order, one agent at a time (usage guard)

| Step | Agent | Owned paths | Closes with |
|---|---|---|---|
| H1 | H1-opening: cold open scene, shortened wake up, Oren choice, in-town tutorial fight; REPLACES the opening (decision B), no flag | `src/data/story/ep1.js` (opening scenes only), `src/data/h1/**`, `qa/content/h1_*` | `node qa/run.mjs content battle`; autoplay still clears; shots viewed |
| H2 | H2-ledger: Ledger of Names scene, title counter, Aim line | new `src/scenes/ledger.js`, menu seam, `qa/ui/h2_*` | UI tests, phone shots viewed |
| H3 | H3-vows: Vow table, campfire row, battle and field hooks; then H3b Hard Road, the post-game mode (decision C) | `src/data/h3/**`, `src/game/vows.js`, `qa/battle/h3_*` | sim `--check` unchanged with no Vow taken; a Vow run clears |
| H4 | H4-truth: Name Truth choices (6 to 8) and remembered lines | `src/data/h4/**`, `qa/content/h4_*` | content tests; main route unchanged |
| H5 | H5-floor-hooks and boss lines | story data only | content tests |
| H6 | critic then play-critic (fresh eyes, phone first), then fixes, then publish gate list | per `EXPANSION_SCHEDULE.md` section 4 | full gate list; Scott's explicit yes |

Publishing remains Scott's explicit yes.

## 6. Open decisions for Scott (defaults chosen so work can proceed)

- **A.** Credit or store-page nod to Dr. Peterson? Default: none in the game; Scott decides wording if wanted.
- **B.** Replace the opening or flag-gate it? Default: flag-gated, both playable.
- **C.** Vows: opt-in at campfires (default) or a bigger "Hard Road" mode chosen at New Game?
- **D.** How hard should the "true answer" cost? Default: small and honest, never a locked route.

## 7. Scott's decisions (2026-10-26, his reply, his words)

> A. Default, none
> B. Replace the opening
> C. Both, perhaps something like the different modes available in Diablo after completing the game
> D. Default, small and honest

What each one does to the build:

- **A.** No credit, no store-page nod, no real name anywhere in the game. Section 0 stands as written.
- **B.** The cold open replaces the six-card prologue and the long wake-up. No `HOOK_OPENING` flag, no old path
  kept. Existing saves never see it (they already hold `intro_done`); the Episode 2 title entry is untouched.
  Brief: `docs/briefs/H1-opening.md`.
- **C.** Vows stay opt-in at campfires and fonts (section 3.2) AND difficulty tiers unlock after the player
  completes the game, the way Diablo opens Nightmare and Hell after a first clear. Scott's clarification,
  2026-10-26 late, his words: "difficulty settings that unlock after successfully completing the game. Like how
  Diablo does? Harder difficulty means better XP and better loot and better equipment in shops. Not sure if it
  works for us or not." So the shape is: tiers, not one mode; unlocked by completing the game; each harder tier
  pays better (EXP multiplier, higher item level and rarity weights on drops, shop stock gated by tier). Fact:
  the loot system already has the levers (`loot-tables.js` rarity weights, affix tiers by item level, base tiers
  1 to 6; `shops.js` stock gated by flags), so a tier is data plus balance proof, not a new system. Working name
  until Scott picks one: Hard Road. Status: PROPOSAL ONLY, `docs/HARD_ROAD.md` (H3 writes it, no code); Scott
  reads it and says whether it works for us before anything is built. My earlier default (foes scaled, a vow
  always on, fewer rests, nothing else carried) was half of it and is superseded by this paragraph.
- **D.** The true answer's cost stays small and honest; no locked routes, no morality meter.
