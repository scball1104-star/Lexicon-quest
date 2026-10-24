# Battle and progression (W1-battle-rules)

The combat layer of Lexicon Quest NEXT: pure, deterministic rules that emit events for the battle scene to
animate, all Episode 1 combat data, a balance simulator, and node tests. Everything here is plain ES modules
with no DOM, canvas, audio or timers; every random roll goes through an injected rng.

| File | What it holds |
|---|---|
| `src/battle/rules.js` | `createBattle`, `createEncounterBattle`, damage math, turn flow, events, `memberStats`, `equipDelta`, `applyResult` |
| `src/battle/ctb.js` | timeline math: speed to delay, action ranks, Haste/Chill, `peek(n)` |
| `src/battle/status.js` | status tunables (Poison 8%, Burn 10%, Regen 8%, Protect 2/3, Defend 1/2, Blind 1/2, Focus 1.5x) |
| `src/battle/ai.js` | enemy scripts (basic, Echo Warden, Archivore, Lost Page), party policies (`competent` = Auto battle) |
| `src/battle/loot.js` | item rolls: rarity, bases, affixes, uniques, sets, drops, chests, names, values |
| `src/data/skills.js` | every skill (party, Fury arts, combos, enemy moves) and every status |
| `src/data/party.js` | hero, mira, bram: stat tables Lv 1 to 15 + formula to 99, EXP curve, mastery |
| `src/data/items.js` | consumables, key items, 30 equipment bases, 23 affixes, 6 uniques/set pieces |
| `src/data/enemies.js` | all 10 enemies, Echo Warden stances, Archivore phases, Lost Page variants, elites |
| `src/data/encounters.js` | 18 encounter groups, zone plans (how many visible enemies to place), `rollEncounter` |
| `src/data/loot-tables.js`, `src/data/shops.js` | drop tables, chest tiers, boss loot; three shops with flag-gated stock |
| `tools/sim/simulate.mjs` | the balance simulator; `tools/sim/tables.mjs` prints the tables below from the data |
| `tools/sim/route.mjs` | W10: the whole main route as one run (HP/MP carried, elites, field care, rest points) |
| `tools/sim/loadouts.mjs` | W10: the expected party per zone (`LOADOUTS`, `knownBestiary`), shared by both |
| `qa/battle/*.test.mjs` | node tests in 10 files (Episode 2 in `ep2.test.mjs`), including a fuzz pass over every encounter |

---

## 1. How a turn becomes a decision

Every turn the player weighs several of these, and none is always right:

1. **Weakness and Break.** Each foe shows shields and "?" weakness slots. Hitting a weakness strips a shield;
   at 0 it Breaks: loses its next turn, takes +50% damage, and any telegraphed attack is cancelled. Which
   character, which weapon (Swap is cheap), which element, and *when* to Break are the core choices.
2. **The timeline.** CTB (FFX): fast actions (Defend 50, Swap 40, Appraise 50, Flash Step 55) come back
   sooner, heavy ones (Heavy Chop 125) later. Every command previews where the actor lands. Pin Shot and
   Shield Bash push targets back, Break pushes the victim back, Haste/Chill scale delays, Stun eats a turn.
3. **Telegraphs.** Dangerous enemy moves are announced at the end of the enemy's turn, naming the target,
   one turn before they fire. Answers: Defend (halves; fully stops Devour Name), Bram's Guard (takes the hit
   for an ally while defending), Break or Stun (cancels it), Lunge (cancels on ordinary foes, knocks a boss
   back 35% of a turn), or simply racing the kill.
4. **Fury (Lufia II IP).** Per-character gauge 0 to 100, kept between battles. Fills from damage taken
   (3 + 35% of the HP fraction lost) and dealt (+8, +4 on a weakness, +12 on a Break), +10 on Defend. When full,
   the active weapon's Fury art is available. Spend it now, or hold it for the Break window?
5. **Combos (Chrono Trigger).** Offered only when the partners hold the very next timeline slots and have
   MP. They spend every member's MP and turn at once. Lining the timeline up for one is itself a decision.
6. **Resources.** MP must last a dungeon floor; Mira heals and scans; items cost a turn but are faster
   (rank 80). Defend restores 5% MP.
7. **Setups.** Hero's Steady and Bram's Rally grant Focus (next hit x1.5) to land inside a Break window.

## 2. Rules reference

**Damage.** `stat * power/100 * 24 / (24 + DEF)` with DEF reduced by `pierce`. Physical uses ATK/DEF, magic
MAG/SPR. Then: variance +-10%, crit x1.5 (physical only; 4% + LUK/500 + gear + mastery passives; enemies 3%),
weakness x1.3, resist x0.5 (immune 0, absorb heals), Broken x1.5, Defend x0.5, Protect x2/3, Focus x1.5,
mastery +3% per level above 1 with that weapon, element gear bonus (+% fire etc.), ink resistance on gear,
Stoneskin elites take x0.75 physical. Hit chance: physical 97% (enemies 95%), Blind x0.5, flying foes evade
melee 15 to 20% (bows and magic never miss). Minimum 1.

**Timeline.** `delay = 3000 / (SPD + 10) * rank/100 * (Haste 2/3 | Chill 1.5)`. A *round* is 150 ticks, one
normal action at SPD 10. The unit with the lowest `next` acts; ties go to the party. Statuses tick at turn
start (Poison/Burn/Regen) and count down at turn end. Poison and Burn never KO a party member (they stop at 1
HP) and bosses take 30% of normal ticks. Fire thaws Chill, ice puts out Burn; Burn and Chill replace each other.

**Break.** Shields 1 to 8. One shield per weakness hit (multi-hit skills chip per hit; Cross Rend, Fury arts
and Dawnname chip shields even without a weakness). At 0: `break` event, the foe is pushed back half a turn,
loses its next turn (`skip` reason `break`), then `shield_restore`. Phase changes set a new shield count.

**Mastery (Secret of Mana).** Levels 1 to 8 per weapon type at 0/25/70/140/240/380/560/800 points. Points:
+1 per use in battle, plus the enemies' mastery points split by the weapon types used. Unlocks: tech at M1,
Fury art at M2, tech at M3, tech at M5; passives +3% damage per level, +3% crit at M4 and M7, +15% Fury gain
at M6, +5% damage at M8.

**Elites (Diablo).** `ELITE_RATE` 1 in 8 ordinary encounters: one enemy gets a gold name, 1 or 2 modifiers
(30% chance of two), HP x1.45, ATK/MAG x1.12, double EXP/gold/mastery and a guaranteed magic+ drop.
Swift (SPD x1.4), Stoneskin (+2 shields, DEF x1.5, x0.75 physical taken), Vampiric (heals 35% of damage dealt),
Cursed (30% per hit: Poison, Blind or Chill), Splitting (splits into two 35%-HP copies when first defeated).

**Defend** halves damage until the defender's next turn, +10 Fury, +5% MP, rank 50. **Swap** changes the active
weapon (stats and techs follow; max HP/MP do not change), rank 40. **Flee** 50% +4% per SPD point over the
foes' average, +15% per retry; never in boss fights.

## 3. The party

| | Role | Weapons | Signature |
|---|---|---|---|
| hero | Striker | sword (fast, crit) + axe (heavy) | Rising Slash, Steady (Focus), Dawnsplitter, combo glue |
| mira | Archivist | staff (magic) + bow (flyers) | Ember/Frost/Spark/Lumen, Mend, Mending Rain, Appraise, Purify, Wellspring |
| bram | Guardian | spear (pierce) + axe (break) | Guard, Taunt, Rally, Lunge (interrupt), Skyfall Lance |

Start kits: hero Short Sword + Cloth Tunic; Mira Oak Staff + Short Bow + Cloth Tunic; Bram Ash Spear + Hatchet
+ Leather Vest + Cloth Cap. The hero's axe is the Hatchet that Garrick gives as a farewell gift (story,
W1-content); a spare in an early valley chest is a good safety net.

| Lv | EXP | Hero HP/MP/ATK/DEF/MAG/SPR/SPD | Mira | Bram |
|---|---|---|---|---|
| 1 | 0 | 48/12/12/8/6/7/12 | 36/22/7/6/14/12/11 | 60/10/11/12/4/8/9 |
| 2 | 20 | 58/14/14/9/7/8/13 | 44/25/8/7/16/14/12 | 73/11/13/14/5/9/9 |
| 3 | 68 | 69/15/16/11/8/9/13 | 52/29/9/8/19/16/12 | 86/13/15/16/5/10/10 |
| 4 | 148 | 80/17/18/12/9/11/14 | 60/32/10/9/21/18/13 | 100/14/17/18/6/12/10 |
| 5 | 266 | 92/19/20/14/10/12/14 | 69/36/12/10/24/20/13 | 115/16/19/20/6/13/11 |
| 6 | 424 | 104/21/23/15/11/14/15 | 79/39/13/11/27/22/14 | 130/17/21/22/7/15/11 |
| 7 | 623 | 117/23/25/17/12/15/15 | 88/43/14/12/29/24/14 | 146/19/23/24/7/16/12 |
| 8 | 867 | 130/25/27/18/13/16/16 | 98/47/15/13/32/27/15 | 162/20/26/27/8/17/12 |
| 9 | 1156 | 144/27/30/20/15/18/16 | 109/51/16/15/35/29/16 | 179/22/28/29/8/19/12 |
| 10 | 1493 | 158/29/32/21/16/19/17 | 120/55/18/16/38/32/16 | 197/23/31/32/9/20/13 |

Levels 11 to 15 are in `LEVEL_TABLE`; past 15 `statsAt` continues with `g(L-1) + q(L-1)^2` anchored on Lv 15.
EXP to reach level L past 15: `10(L-1)^2.25 + 10(L-1)` anchored the same way. Every living member gets the full
EXP of a victory.

### Skills

| Skill | Who | Learn | MP | Target | Power | Types | Rank | Help |
|---|---|---|---|---|---|---|---|---|
| Rising Slash | sword | M1 | 3 | enemy | 160 | sword | 100 | A strong upward cut. Builds Fury. |
| Crescent Sweep | sword | M3 | 6 | enemies | 85 | sword | 110 | A wide arc that hits every foe. |
| Flash Step | sword | M5 | 4 | enemy | 125 | sword | 55 | Quick cut. Your next turn comes soon. |
| Heavy Chop | axe | M1 | 4 | enemy | 200 | axe | 125 | Huge blow, but slow to recover. |
| Sunder | axe | M3 | 5 | enemy | 130 | axe | 100 | Cracks armor: DEF -30% for 3 turns. |
| Whirlwind | axe | M5 | 7 | enemies | 105 | axe | 115 | Spinning axe strikes every foe. |
| Lunge | spear | M1 | 3 | enemy | 145 | spear | 100 | Piercing thrust. Interrupts charges. |
| Skewer | spear | M3 | 5 | random | 115x2 | spear | 100 | Two thrusts at random foes. |
| Valiant Lance | spear | M5 | 6 | enemy | 210 | spear | 100 | Mighty thrust. Bram gains Protect. |
| Channel | staff | M1 | 0 | enemy | 100 | staff | 100 | Staff strike that restores 5 MP. |
| Ward Strike | staff | M3 | 3 | enemy | 120 | staff | 100 | Staff blow. May stun the target. |
| Pin Shot | bow | M1 | 3 | enemy | 120 | bow | 100 | Arrow that knocks a foe back in line. |
| Volley | bow | M3 | 6 | random | 60x4 | bow | 100 | Four arrows at random foes. |
| Blinding Arrow | bow | M5 | 4 | enemy | 110 | bow | 100 | Arrow of ink-ash. May Blind. |
| Steady | hero | Lv 3 | 2 | self | - | - | 60 | Gain Focus: next hit deals 50% more. |
| Second Wind | hero | Lv 6 | 4 | self | - | - | 80 | Recover 35% HP and shake off ailments. |
| Guard | bram | Lv 1 | 0 | ally | - | - | 70 | Shield an ally until your next turn. |
| Taunt | bram | Lv 2 | 3 | self | - | - | 80 | Draw single attacks. Gain Protect. |
| Rally | bram | Lv 4 | 5 | allies | - | - | 90 | Allies gain Focus and 10 Fury. |
| Ember | mira | Lv 1 | 4 | enemy | 140 | fire | 100 | Fire magic. May Burn. |
| Mend | mira | Lv 1 | 4 | ally | 220 | - | 90 | Restore HP to one ally. |
| Appraise | mira | Lv 1 | 0 | enemy | - | - | 50 | Read a foe: weaknesses and HP. |
| Frost | mira | Lv 2 | 4 | enemy | 140 | ice | 100 | Ice magic. May Chill. |
| Purify | mira | Lv 3 | 3 | ally | - | - | 80 | Cleanse one ally of ailments. |
| Spark | mira | Lv 4 | 5 | enemy | 150 | thunder | 100 | Thunder magic. May Stun. |
| Lumen | mira | Lv 6 | 7 | enemy | 175 | light | 100 | Light magic. Ink fears it. |
| Mending Rain | mira | Lv 7 | 10 | allies | 140 | - | 110 | Restore HP to the whole party. |
| Dawnsplitter | sword | M2 | Fury | enemy | 330 | sword/light | 80 | Fury: a blinding cut of dawn light. |
| Earthsunder | axe | M2 | Fury | enemies | 190 | axe | 80 | Fury: split the ground under all foes. |
| Skyfall Lance | spear | M2 | Fury | enemy | 300 | spear | 80 | Fury: leap and pierce. Stuns. |
| Wellspring | staff | M2 | Fury | allies | 200 | - | 80 | Fury: heal and cleanse all, Regen. |
| Starfall Volley | bow | M2 | Fury | random | 85x6 | bow | 80 | Fury: six arrows rain on random foes. |
| Ember Edge | hero+mira | Lv 2 | 5/6 | enemy | 130+150 | sword/axe/fire | 110 | Hero + Mira: a blade wreathed in fire. |
| Cross Rend | hero+bram | Lv 2 | 5/5 | enemy | 135+135 | sword/axe/spear | 110 | Hero + Bram: X-cut, always chips 2. |
| Thorn Bulwark | mira+bram | Lv 2 | 6/6 | allies | - | - | 100 | Mira + Bram: party Protect and Regen. |
| Dawnname | hero+mira+bram | Lv 6 | 10/10/10 | enemies | 90+90+110 | light | 120 | All three speak a name of dawn. |

Statuses: Poison, Burn, Chill, Stun, Silence, Blind, Regen, Protect, Haste, Focus (DESIGN 7), plus **Taunt**
(Bram) and **Nameless** (Devour Name: ATK and MAG -20% until the battle ends). Icons: `icon_<status id>` in
`assets/ui/ui.json` (W1-ui-art confirmed all of them exist).

## 4. Enemies

| Enemy | Lv | HP | ATK/MAG | DEF/SPR | SPD | Shields | Weak | Resist | EXP / Gold | Moves (telegraph in bold) |
|---|---|---|---|---|---|---|---|---|---|---|
| Ink Slime | 2 | 74 | 12/12 | 4/6 | 9 | 2 | fire, axe | - | 7 / 10 | Tackle, Ink Spit |
| Briar Wolf | 3 | 120 | 14/4 | 6/4 | 15 | 2 | fire, spear | - | 9 / 12 | Bite, Thorn Bite, Howl |
| Moss Scarab | 3 | 110 | 15/4 | 14/8 | 8 | 3 | axe, ice | sword, bow | 12 / 18 | Shell Bash, Harden, **Burrowing Charge** |
| Page Wraith | 4 | 130 | 13/18 | 5/14 | 13 | 2 | fire, bow | ice | 14 / 24 | Paper Cut, Hush, Strike, **Page Storm** |
| Bookmite | 4 | 95 | 15/4 | 7/5 | 16 | 1 | thunder, sword | - | 8 / 14 | Nibble, Gnaw |
| Tome Golem | 6 | 220 | 26/6 | 18/8 | 7 | 4 | thunder, axe | sword, bow | 18 / 50 | Book Slam, Binding, **Shelf Quake** |
| Echo Warden | 6 | 420 | 37/36 | 15/15 | 11 | 5 | by stance | - | 60 / 300 | Echo Slash, Shield Bash, **Reverberate** |
| Ink Wraith | 7 | 150 | 16/30 | 9/18 | 14 | 3 | light, fire | sword, spear | 32 / 48 | Ink Lance, Ink Tide, Siphon, **Black Tide** |
| Lost Page | 7 | 70 | 34/34 | 5/6 | 13 | 1 | by ink color | - | 0 / 0 | Flutter, Recite |
| The Archivore | 8 | 820 | 70/72 | 12/14 | 12 | 6 | by phase | ice | 400 / 500 | Ink Lash, Gnash, Ink Spray |

Targeting rules give enemies personality: wolves go for the weakest, Page Wraiths Hush the healer, Bookmites
eat Mira's MP, Siphon drinks from the most hurt. Telegraphed moves fire on a fixed rhythm (`charge.first`,
`charge.cooldown` in enemies.js) so a player can learn it.

**Echo Warden** (mini-boss, guards the Lantern of Recall). Opens in **Mirror Stance**: spells rebound onto a
random ally; weak to axe and spear. After every second turn it swaps to **Bulwark Stance**: weapon hits rebound
(the attacker takes half), weak to fire and thunder. Breaking it drops the stance for the window; on recovery
it takes the other stance. Reverberate (party-wide, 210%) is telegraphed every 4 turns. The fight teaches
"read the stance": in Bulwark the sword arms Defend, Steady or Rally while Mira works; in Mirror they feast.

**The Archivore** (Episode 1 boss), three phases with HP locks (one hit can never skip a phase):
1. **Hunger** (100 to 70%): weak fire/spear, 6 shields. Devour Name telegraphed from its 2nd turn.
2. **The Torn Book** (70 to 30%): weak fire/spear/thunder, 7 shields. Tears out two **Lost Pages**, each in a
   different ink whose color is its weakness (Kindling = fire, Frosted = ice, Static = thunder, Taut =
   spear/bow, Brittle = axe/staff, Loose = sword). While pages live the Archivore takes 20% less damage, pages
   Recite to heal it, and it telegraphs **Feast** (eats every living page, 7% HP each, gains Haste). Kill the
   pages first and Feast snaps at empty air. It can tear the Book twice. Ink Storm joins the rotation.
3. **Nameless Maw** (below 30%): pages burn away, permanent Haste, weak light/axe/fire, 8 shields. Alternates
   Devour Name and Ink Storm with one ordinary turn between.
- **Devour Name**: names a target a turn ahead. If the target is Defending (or Guarded by a defending Bram) the
  name holds. Otherwise: Silence 3, Nameless (-20% ATK/MAG) and the Archivore heals 8% and gains +20% ATK and
  MAG for the rest of the fight. Ignoring it snowballs.
- **Ink Storm**: party-wide 245% ink magic, Blind 40%. At Lv 8 with the expected gear it takes about 80% of
  the hero's HP, 65% of Bram's and 45% of Mira's (Mirrorguard Mail); Defend halves it. Anyone below about 80%
  who ignores it can fall.

## 5. Items and loot

Consumables: potion (60 HP, 20g), hi_potion (180, 90g), ether (15 MP, 60g), antidote, eye_drops, echo_herb
(Silence/Burn/Chill), phoenix_feather (revive 30%, 150g), tent (save points, full rest). 15 weapons (5 types x 3
tiers), 5 body, 4 head, 7 accessories (charm, boots, mantle slots). Gear rolls 0 (common), 1 to 2 (magic) or 3
to 4 (rare) affixes from 8 prefixes and 15 suffixes, each with 2 to 3 tiers gated by item level, e.g.
"Gleaming Iron Pike of Embers" = +5 ATK, +14% fire. Rares get two-word names ("Ember Oath"). Rarity colors
DESIGN 6.4 (`RARITIES`).

| Weapon | Type | Tier | Price | Stats |
|---|---|---|---|---|
| Short Sword / Longsword / Runed Saber | sword | 1/2/3 | 80/360/900 | ATK +6/+13/+21, crit +2/+3/+5 |
| Hatchet / Battle Axe / Bearded Axe | axe | 1/2/3 | 90/400/950 | ATK +8/+16/+25, SPD -1 |
| Ash Spear / Iron Pike / Winged Lance | spear | 1/2/3 | 85/380/920 | ATK +7/+14/+22, DEF +0/+1/+2 |
| Oak Staff / Crystal Rod / Archivist's Staff | staff | 1/2/3 | 80/380/900 | MAG +5/+11/+18 |
| Short Bow / Hunter's Bow / Yew Longbow | bow | 1/2/3 | 85/370/900 | ATK +6/+12/+19 |

Placed uniques (Episode 1 random tables never roll legendaries):

| Item | Rarity | Stats | Suggested source |
|---|---|---|---|
| Lanternheart (sword) | legendary | ATK +24, crit +6, +20% light, sword hits count as light | Archivore (guaranteed drop) |
| Mirrorguard Mail (body) | legendary | DEF +11, SPR +9, HP +20, ink -20% | Echo Warden (guaranteed drop) |
| Pilgrim's Reach (spear) | legendary | ATK +17, SPD +1, crit +5 | Valley secret at the Whisperwood pool, Lantern-revealed (return trip; was the first "Thornwake") |
| Thornwake (axe) | legendary | ATK +18, crit +4, SPD -1, 30% poison on hit | Briar Alpha, Whisperwood Hollow (guaranteed drop, `BOSS_LOOT.briar_alpha`) |
| The First Quill (staff) | legendary | MAG +17, MP +12, spells cost 1 less | Archive F3 secret chest behind hidden ink |
| Wayfarer Boots (set) | set | SPD +2, DEF +1, HP +10 | Tess's reward for all three letters |
| Wayfarer Mantle (set) | set | DEF +2, SPR +3, LUK +3 | Archive F1 secret chest |
| Wayfarer's Promise (2 pieces) | set bonus | +1 SPD, start battles with Haste (2 turns) | |

Drops: each ordinary victory has a 10 to 15% chance (by zone) of one piece of gear (70% common / 25% magic / 5%
rare); elites always drop magic or rare; bosses drop their unique, rares and consumables. Chest tiers for map
authors: `wood` (gold 15 to 40, consumable or common/magic gear), `iron` (40 to 90, magic/rare 60%), `gold`
(100 to 200, a rare). `rollChest(rng, tier, ilvl)`.

Shops (`shopStock(shopId, flags)`): **willowmere_items** (potions, ethers, cures, tent, bronze charm; phoenix,
owl/river charms after `archive_entered`; hi_potion after `archive_f1_done`), **willowmere_smithy** (tier 1 gear;
tier 2 after `archive_entered`; helms, circlet, boots, mantle after `archive_f1_done`; Bronze Plate after
`echo_warden_defeated`), **valley_peddler** (consumables at a 15 to 20% markup, leather boots, hatchet).

## 6. Progression and map plans (for W2-maps)

Each zone's `plan` in `encounters.js` is how many visible enemies to place, by group. The EXP curve assumes the
player fights each about once:

| Zone | Fights | Level in, level out (all fights) | At 80% of fights |
|---|---|---|---|
| Willowmere Valley | 7 | 1 to 3 | 1 to 3 |
| Archive F1 | 8 | 3 to 5 (mostly Lv 4) | 3 to 5 |
| Archive F2 (+ Echo Warden) | 8 + 1 | 5 to 6 | 5 to 6 |
| Archive F3 | 8 | 6 to 8 | 6 to 7 |
| Archivore | 1 | fought at 8 | fought at 7 |
| Whisperwood Hollow (optional, + Briar Alpha) | 3 + 1 | fought at 6 to 7 (not in the EXP curve: `OPTIONAL_ZONES`) | - |

**Whisperwood Hollow** (W6-content, reached after the Lantern): `hollow_wolves` x2 (Thornback Wolf: Lv 6, HP 250,
weak fire/spear) and `hollow_blot` x1 (two Ink Blots, Lv 6, HP 190, weak fire/axe; the first is a fixed
Vampiric Stoneskin elite, `elite` on the encounter). The mini-boss `briar_alpha` (Lv 7, HP 560, ATK 37, shields
3, weak fire/axe, Burrowing Charge telegraph) uses the data-driven `phased` AI in `battle/ai.js`: at 50% Pack
Call summons one Thornback Wolf, at 25% Thorn Rage grants permanent Haste; HP locks stop a hit skipping a phase.
Art: no new sprites. `sprite.frame` borrows `briar_wolf` (Alpha at scale 1.3, elite gold tint; Thornback purple
tint) and `ink_slime` (Blot 1.15, dark ink tint); the battle actor must honor `sprite.frame/scale/tint`.
Sim at 400 per row: wolves 3.2/3.0 rounds, blot 4.7/4.5, Alpha careful 100% in 7.9/7.4 rounds (Lv 6/7) with 19%
HP lost, attack-only wins 10%/52%.

Placement notes: make the first valley fight a `valley_wolves` (gentlest at Lv 1), keep scarabs and the
`valley_pack` deeper in. The hero should own a **Hatchet** by Archive F1 (Garrick's gift). The simulator assumes **Iron
Pike** and one **Chain Shirt** come from Archive F2 chests; with enemy gold that keeps the smithy reachable
(battle gold on arriving at F1/F2/F3: about 200/520/1290). Field sprite for an enemy event = its leader's enemy id.

## 7. API for the battle scene (W2-battle-scene)

```js
import { createEncounterBattle, createBattle, applyResult, memberStats, equipDelta } from './battle/rules.js';
import { partyAction } from './battle/ai.js';

const { battle: b, encounter } = createEncounterBattle('valley_wolves', {
  party: save.party,            // member records (party.js): {id,name,level,exp,hp,mp,fury,weapon,equip,mastery}
  rng: engine.rng.fork('battle'),
  inventory: save.items,        // {potion: 3, ...}; battle uses and drops update a copy
  bestiary: save.bestiary,      // weaknesses seen before (result().revealed) so "?" stays solved
  start: 'normal',              // 'preemptive' (player touched it from behind) | 'ambush'
});
play(b.startEvents);            // battle_start, phase/stance/elite messages, first turn_start + timeline
while (!b.isOver()) {
  const u = b.current();
  if (u.side === 'enemy') play(b.runEnemyTurn());
  else play(b.perform(settings.autoBattle ? partyAction(b) : await chooseAction(u)));
}
const r = b.result();           // {outcome, exp, gold, mastery:{hero:{sword:12}}, items, consumables, inventory, party, revealed}
const ups = applyResult(save.party, r);   // mutates members: EXP, levels (stat gains, learned skills), mastery ups
```

Menus: `b.commands(u)` returns `[{id:'attack'|'tech'|'magic'|'fury'|'combo'|'item'|'defend'|'swap'|'flee', name,
enabled, reason, list?}]`; list entries carry `{skill|item, name, mp|qty, help, enabled, reason}`; `combo` has
`visible` (show it only then) and `partners`. `b.targets(u, action)` gives `{mode:'single'|'all'|'random'|'self',
side, ids, default}`. `b.previewTimeline(u, action)` gives `{order:[{uid, at, skip?, charging?}], landing, rank,
delay, effects:[{target, min, max, avg, weak: true|false|'?', breaks, shieldsAfter, kills, hit, crit}]}` (weakness
shows `'?'` until known, so the preview never leaks). `b.timeline(8)` is the top-right bar; `b.knowledge(uid)`
gives `{weak, resist, unknown, appraised}` for the weakness row. `b.unit(uid)` is the live unit
(`hp, maxHp, mp, fury, shields, maxShields, broken, statuses, charging, ai.stance, ai.phase, tint`).
Actions: `{type:'attack', target}`, `{type:'skill', skill, target}` (techs, magic, Fury arts),
`{type:'combo', skill, target}`, `{type:'item', item, target}`, `{type:'defend'}`, `{type:'swap'}`,
`{type:'flee'}`. A bad action returns `[{type:'invalid', reason}]` and changes nothing.

Events (in order; animate them as they come; uids are `hero mira bram e0 e1 ...`):

| type | fields |
|---|---|
| battle_start | units[{uid,id,side,name,hp,maxHp,mp,maxMp,fury,elite,shields,boss,weapon,variant}], start, boss |
| turn_start | actor, time, round |
| timeline | order[{uid, at, skip?, charging?}] (next 8; emitted when an actor is ready for a command) |
| telegraph | actor, skill, name, text, target, targets, nextTurn (turns until it fires) |
| telegraph_cancel | actor, skill, reason: break, stun, interrupt, phase |
| action_start | actor, action{type, skill/item, name, members?}, targets, fx, sfx, charged, weapon |
| move_to | actor, target (melee step-in; bows and magic do not) |
| damage | source, target, amount, hp, maxHp, kind (phys/mag/status), crit, weak, resist, types, element, shieldLost, shields, broken (target was already broken), reflected? |
| shield | target, lost, shields (shield chips from effects) |
| break / shield_restore | target / target, shields |
| reveal | target, enemy, weak[], resist[], all?, hp?, maxHp? |
| heal / mp | target, amount, hp/mp, max, plus skill/item/status/drain/lifesteal/feast/absorbed hints |
| miss | source, target, reason: miss, evade, immune |
| status_add / status_remove / status_tick / status_resist | target, status, turns / reason: expired, cured, consumed, countered, replaced / amount, hp |
| stat_mod | target, stat, mult, turns (Sunder, Devour Name) |
| fury_gain / fury_ready | target, amount, fury, reason / target |
| defend / defend_end / guard / cover / swap | actor / actor / actor, target / actor (Bram), target / actor, weapon |
| delay | target, amount (ticks), reason |
| reflect | actor (Warden), source, kind: magic or phys, target (who takes it) |
| stance / phase | actor, stance, name, text, reflect / actor, phase (1-3), id, name, text |
| summon / split | enemy, id, name, variant, tint, hp, by, split / source, into[] |
| devour / feast | actor, target, success / actor, pages[], healed |
| ko / revive | target, reason (damage, poison, burn, devoured, burned) / target, hp |
| skip | actor, reason: stun or break |
| message | text, kind? (elite, taunt, interrupt) |
| escape / victory / defeat | success / exp, gold, mastery, items, consumables |

Equip screen: `memberStats(member)` and `equipDelta(member, slotOrWeaponType, item)` give the numbers for the
green/red arrows. Loot UI: `itemStats`, `describeItem`, `rarityColor`, `itemValue` in `battle/loot.js`.

## 8. Simulator and tuning

`node tools/sim/simulate.mjs [--n 400] [--zone z] [--check] [--json]`, or `--trace <encounter> <seed> <policy>`
to read one battle. Policies: **competent** (the Auto brain: answers telegraphs by Break/Lunge/Defend/Guard,
heals under 40% (50% in boss fights), revives, exploits known weaknesses, swaps weapons when the other one has
the only weakness, uses Fury in Break windows, combos when worth it, Appraises unknown bosses, and rations MP
to about a third of the bar per ordinary fight), **naive** (Attack the first foe, nothing else) and **reckless**
(competent but ignores telegraphs). The party uses each zone's expected level, mastery and gear (`LOADOUTS`);
ordinary foes' weaknesses are known (bestiary), bosses' are not. All targets are checked by `checkTargets` and
by `qa/battle/sim.test.mjs`.

Final run (400 battles per row, 25,300 battles in 28 s, all targets met):

| Zone | Encounter | Lv | Careful: win / rounds (p10-p90) / HP lost | Attack-only: win / rounds / HP lost |
|---|---|---|---|---|
| valley | valley_wolves | 2 | 100% / 3.2 (2.7-4.0) / 16% | 100% / 5.3 / 41% |
| valley | valley_wolves | 3 | 100% / 2.8 (2.3-3.3) / 14% | 100% / 4.9 / 31% |
| valley | valley_slimes | 2 | 100% / 4.2 (3.3-5.0) / 24% | 100% / 6.2 / 44% |
| valley | valley_slimes | 3 | 100% / 3.7 (3.0-4.3) / 19% | 100% / 5.5 / 30% |
| valley | valley_scarab | 2 | 100% / 4.3 (3.0-5.3) / 13% | 100% / 7.1 / 50% |
| valley | valley_scarab | 3 | 100% / 3.7 (3.0-5.0) / 10% | 100% / 6.4 / 36% |
| valley | valley_mixed | 2 | 100% / 4.9 (3.7-6.0) / 17% | 100% / 7.6 / 49% |
| valley | valley_mixed | 3 | 100% / 4.2 (3.0-5.0) / 13% | 100% / 7.0 / 36% |
| valley | valley_pack | 2 | 100% / 5.5 (4.3-6.7) / 26% | 80% / 7.0 / 78% |
| valley | valley_pack | 3 | 100% / 4.6 (3.7-5.7) / 23% | 99% / 6.7 / 57% |
| archive_f1 | f1_slimes | 4 | 100% / 3.3 (2.7-4.0) / 15% | 100% / 4.9 / 29% |
| archive_f1 | f1_mites | 4 | 100% / 3.3 (2.7-4.0) / 17% | 100% / 4.9 / 31% |
| archive_f1 | f1_wraith | 4 | 100% / 4.6 (3.7-6.0) / 20% | 99% / 6.4 / 53% |
| archive_f1 | f1_mixed | 4 | 100% / 3.1 (2.3-4.0) / 14% | 100% / 5.0 / 29% |
| archive_f2 | f2_golem | 5 | 100% / 3.6 (3.0-4.3) / 12% | 100% / 8.0 / 59% |
| archive_f2 | f2_golem | 6 | 100% / 3.3 (3.0-3.7) / 10% | 100% / 7.6 / 48% |
| archive_f2 | f2_wraiths | 5 | 100% / 4.2 (3.0-5.7) / 19% | 100% / 6.8 / 51% |
| archive_f2 | f2_wraiths | 6 | 100% / 3.7 (2.7-5.0) / 16% | 100% / 6.4 / 41% |
| archive_f2 | f2_mites | 5 | 100% / 3.9 (2.7-5.3) / 17% | 100% / 6.9 / 49% |
| archive_f2 | f2_mites | 6 | 100% / 3.4 (2.3-5.0) / 14% | 100% / 6.5 / 40% |
| archive_f2 | f2_mixed | 5 | 100% / 4.7 (3.7-6.0) / 18% | 97% / 9.2 / 81% |
| archive_f2 | f2_mixed | 6 | 100% / 4.2 (3.3-5.0) / 14% | 100% / 8.8 / 63% |
| archive_f2 | echo_warden | 5 | 100% / 8.3 (6.3-10.3) / 22% | 0% / 5.3 / 100% |
| archive_f2 | echo_warden | 6 | 100% / 7.2 (6.0-8.7) / 18% | 0% / 6.5 / 100% |
| archive_f3 | f3_ink | 7 | 100% / 3.1 (2.3-4.0) / 20% | 100% / 6.6 / 54% |
| archive_f3 | f3_golem | 7 | 100% / 4.5 (3.7-5.7) / 21% | 48% / 9.2 / 94% |
| archive_f3 | f3_wraiths | 7 | 100% / 4.8 (3.3-6.7) / 25% | 34% / 7.8 / 95% |
| archive_f3 | f3_mixed | 7 | 100% / 5.4 (4.3-7.0) / 22% | 100% / 9.3 / 66% |
| archive_boss | archivore | 8 | 100% / 10.6 (8.0-13.3) / 23% | 0% / 8.4 / 100% |

The Archivore when the party plays well but **ignores telegraphs**: 81% win, 11.5 rounds, 1.3 KOs per fight,
3.6 items used (careful play: 100%, 0.2 KOs, 1.4 items). Elites (competent): 4 to 7 rounds in the valley and
F1/F2, 5 to 9 in F3, always won. At Lv 1 the opening valley fights take 4 to 5 rounds (attack-only still wins
87 to 99%).

Rounds = party turns / party size. Targets: ordinary 3 to 5 (per-encounter tolerance 0.5, zone averages
strictly), Echo Warden 6 to 8, Archivore 8 to 12 with careful play winning 85%+, attack-only winning at most
60% and ignoring telegraphs costing at least 15 points of win rate.

Tuning notes (what moved and why):
- First pass: fights ended in 1.6 to 2.8 rounds. Enemy HP went up about 1.6x; combos got pricier
  (Ember Edge 5/6, Cross Rend 5/5, Thorn Bulwark 6/6, Dawnname 10 each).
- The simulator first started every fight at full MP and the policy spent it all; it now rations about a third
  per ordinary fight, as a player on a long floor does. Without that, combos ran every turn.
- A weapon-swap flip-flop in mixed groups (Bram: spear for wolves, axe for slimes, repeat) made the policy look
  slow; Swap now only happens when the current weapon exploits nothing.
- Burn was ticking 10% of the Archivore's HP (it once died to Burn); bosses now take 30% of DoT.
- The Archivore's phase 2 dragged (pages respawning forever, 30% page armor): page waves capped at 2, armor
  20%, a gap of one ordinary turn between telegraphs, HP 1700 to 820, DEF 16 to 12, ATK/MAG up to 70/72 so it
  threatens a healing party. Ink Storm 150 to 245% and "each devoured name makes it stronger" are what make
  ignoring telegraphs lose about one fight in five.
- Echo Warden: HP 900 to 420, Reverberate 130 to 210% so defending against it matters.
- EXP: golem 30 to 18, Echo Warden 140 to 60, ink wraith 36 to 32 so F2 ends at Lv 6 and F3 at Lv 8.
- Gold roughly doubled so the smithy's tier 2 gear is reachable (see section 6).

## 9. Known gaps and proposals

- **DESIGN 7 weakness list** names sword, spear, staff, axe, fire, ice, thunder, light. Mira's bow is a weapon
  type, so `bow` is also a weakness type here (Page Wraiths are weak to it). Proposal: add "bow" to that list.
- **Statuses**: Taunt and Nameless are extra to DESIGN 7's list (both have icons). Proposal: list them.
- Unique items have fixed stats (no rolled ranges) to keep their identity and the balance predictable.
- The valley peddler has no COMMON.md sprite id; `keeperSprite: 'npc_farmer'` is only a hint.
- The battle rules do not model field "preemptive/ambush" detection: the field scene passes `start`.
- Multi-fight attrition is simulated since W10 by `tools/sim/route.mjs` (section 8b). It still assumes the bot or a
  careful player; it does not model backtracking to a font mid-floor.

## 8b. The route, the Auto MP fix, the Alpha tiers and the gold sink (W10, PLAYTEST_REVIEW_2)

**Why live fights ran long.** The bot's 35 live fights averaged 5.5 rounds (valley 5.2, F1 4.8, F2 7.4, F3 5.1)
while every simulated fight was 3 to 5. `simulate.mjs` starts each fight at full HP and MP; the field has no MP
regeneration. `route.mjs` plays the route as one run (each zone's plan shuffled, HP/MP/EXP carried, elites at
`ELITE_RATE`, rests only at rest points) and, with the bot's habits (`--bot`: potions only, chest gear, no field
heals; `--rests old`: no font before the Echo Warden) reproduced the live numbers: valley 5.0, F1 4.7, F2 6.7,
F3 6.2, overall 5.6. Split by MP at the start of a fight, F2 fights took 4.7 rounds above half MP and 6.8 below,
and 94% of them started below (average 14%). Elites add about 2 rounds but are 1 in 8 (about 0.25 per zone).
Cause: MP attrition (no rest from the valley campfire through F1 and F2 to the Warden) plus an Auto brain that
never valued Mira's Channel (a free staff strike that returns 5 MP) and so walked into every next fight dry.

**Fixes.** (1) The F2 entry hall font (maps). (2) Auto values the MP an action returns at the same weight it
charges for MP spent, outside boss fights (`ai.js damageOptions`, `mpGainOf`). Bot route after both: valley 4.3,
F1 4.0, F2 4.9, F3 5.3, overall 4.65, losses per run 0.93 to 0.06; careful route 4.17 overall, every zone
3.9 to 4.3. Boss tuning is unchanged (boss fights ignore the MP gain). `simulate.mjs --check` and
`qa/battle/sim.test.mjs` now gate the route (`ROUTE_TARGETS`: careful zones 3 to 5, overall 4.6 or less; bot
overall 5 or less, zones 5.75 or less: the bot fights F3 with valley weapons).

**The Briar Alpha for a late party.** Encounters `whisperwood_alpha_t1` / `_t2` are the same Alpha with a fixed
story elite (`ELITE_MODS.elder`: DEF x1.1; `elder_ii`: DEF x1.25, SPD x1.2, +1 shield; both `fixed`, never rolled,
`RANDOM_ELITE_MODS` excludes them) on top of the elite base (HP x1.45, ATK/MAG x1.12, double rewards). The name
reads "Elder Briar Alpha"; the bestiary key stays `briar_alpha` and Thornwake still drops. `alphaEncounter()` picks
by flags: `boss_door_open` -> t1 (party about Lv 8), `archivore_defeated` -> t2 (Lv 9 to 10). Results (careful /
attack-only): base Lv 6 7.9 rounds / 10% win, Lv 7 7.4 / 52%; t1 Lv 8 8.5 / 5%; t2 Lv 9 8.1 / 17%, Lv 10 7.6 / 56%.
Without tiers a Lv 9 to 10 party won attack-only 99 to 100%.

**Gold.** Rook's salvage in the great door hall (`shops.js archive_salvage`): the five tier 3 weapons (900 to 950),
bronze plate, Hi-Potion 110, Ether 80, Phoenix Feather 180. The smithy gets the same weapons on `archive_f2_done`.
`economy()` / `checkEconomy()`: battle gold on the route 2,516; a player who skips the optional F3 town trip
reaches Rook with about 1,490 (one tier 3 weapon); the salvage stock (5,210) can absorb the whole route's gold.
With tier 3 weapons bought (hero and Bram, or all three) the Archivore takes 9.1 / 8.7 rounds (careful, 98 to
100%) and reckless play still loses 10 to 14% of the time; F3 mixed groups drop from 5.2 to 4.2 to 4.4 rounds.

---

## 10. Episode 2: The Town Without a Name (E2-battle, wave 10a)

Design: `docs/EPISODE2_PLAN.md` sections 6 and 7. Nothing in Episode 1's data, order or targets moved: its rows in
section 8 still hold and `simulate.mjs --check` passes both episodes.

### 10.1 Enemies (final numbers after tuning)

| Enemy | Lv | HP | ATK/MAG | DEF/SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (telegraph in bold), trait |
|---|---|---|---|---|---|---|---|---|---|---|
| Mist Wolf | 9 | 280 | 31/7 | 12/8 | 16 | 2 | fire, spear | - | 11 / 45 | Bite, Mist Bite (Blind 20%), Howl; evade 10% |
| Glassback Beetle | 9 | 180 | 34/7 | 22/14 | 8 | 3 | axe, thunder | sword, bow, ice | 14 / 54 | Harden (forced opener), Shell Bash, **Glass Ram**; reflects spells while Protected; glass |
| Quicksilver | 9 | 110 | 30/40 | 8/10 | 10 | 2 | thunder, ice | fire | 8 / 33 | Tackle, Mercury Spit (Poison 25%); splits into 2 beads at 35% |
| Quicksilver Bead | 9 | 35% of parent | 30/40 | 8/10 | 12 | 1 | thunder, ice | fire | 0 / 0 | Tackle |
| Glint Wisp | 10 | 205 | 26/51 | 9/18 | 14 | 2 | bow, thunder | fire, light | 20 / 66 | Glint, Mirror Dust, Strike, **Prism Burst**; flying, evade 20% |
| Glass Sentinel | 10 | 290 | 55/13 | 22/10 | 7 | 4 | thunder, axe | sword, spear | 26 / 90 | Shard Fist, Glass Guard, **Shatter Quake**; glass |
| Borrowed Shadow | 11 | 370 | 44/62 | 12/20 | 13 | 3 | light, bow | adaptive | 20 / 84 | Dusk Touch, shadow copies; ai `mimic` |
| Faceless Knight | 11 | 280 | 66/26 | 24/14 | 10 | 5 | axe, thunder, light | sword, spear | 26 / 105 | Blank Blade, Cover, **Judgement** |
| Shard Swarm | 12 | 320 | 42/51 | 10/12 | 17 | 2 | thunder, axe, light | spear, bow | 26 / 93 | Shard Rain, Glitter, **Shard Storm**; flying, evade 25%; glass |
| Nameless Reflection | 11 | 365 | 100/24 | 18/14 | 16 | 4 | spear, staff, bow | sword, axe | 40 / 134 | Mirror Slash, Risen Slash, Steady |
| Mira's Reflection | 11 | 285 | 40/102 | 12/22 | 15 | 3 | sword, axe, spear | staff, bow | 40 / 133 | Ember, Frost, Mend |
| Bram's Reflection | 11 | 375 | 88/19 | 26/16 | 12 | 5 | sword, staff, bow | spear, axe | 40 / 133 | Lunge, Guard, Taunt |
| The Nameless King | 13 | 1400 | 158/149 | 22/20 | 13 | 6/6/8 | by phase | ice (1-2) | 500 / 800 | Glass Sword, Cold Mirror, **Keeping**, **Mirror Rain**, **Last Decree**; glass |
| Sorrow | 13 | 240 | 40/74 | 10/22 | 12 | 2 | fire, bow | ice | 0 / 0 | Weep (heals the King 5%), **Lament** (King +15%, cleansed) |
| Pride | 13 | 280 | 86/25 | 26/12 | 11 | 4 | spear, thunder | fire, sword | 0 / 0 | Proud Stance (Taunt 2), Glass Lance |

Data keys (enemies.js): `tags: ['glass']`, `opener`, `reflectWhileProtected: 'magic'`, `split: { into, hp }`, ai `mimic`,
`reflections`, `nameless_king`. The reflections are `boss: true` (30% DoT; Lunge knocks them back 35% instead of
cancelling); Sorrow and Pride are not (Lunge cancels Lament).

### 10.2 New rules

- **Kept** (`kept`, 2 turns, icon `icon_kept`). The member skips its turns (`skip` reason `kept`, no Poison/Regen ticks),
  foes cannot target it (single, random and party-wide hits pass it by; a charged hit on it re-targets), and party-wide
  support (Mending Rain, Rally, Wellspring, Dawnname's heal) skips it. Only actions with `canTargetKept` reach it: Mira's
  **Recall** and the **Silver Salve** (both cure Kept, Nameless, Silence). It also ends when the King is **Broken**
  ("The mirror cracks!", `status_remove` reason `freed`). Every living member Kept (or KO) is a defeat ("THE KING KEEPS
  YOU ALL."). The timeline marks a Kept member's next turns `skip: 'kept'`. A Kept partner cannot join a combo.
- **Enemy Taunt and Cover.** A party single-target hit (attack, tech, spell, single-target combo) is pulled by a
  taunting foe (Pride, Bram's Reflection), then taken by a foe covering its target (the Knight's Cover; Bram's
  Reflection's Guard, which also defends). Party-wide and random hits are not. **True Strike** (`trueStrike`) ignores
  Taunt, Cover and reflection. `estimate()` keeps `target` as chosen and adds `redirect: <uid>` when the hit would land
  elsewhere, with the numbers for the foe that really takes it.
- **Reflect while Protected** (Glassback): spells rebound on a random (non-Kept) ally while it has Protect and is not
  Broken. Its first turn is always Harden. `knowledge(uid).reflect` is `'magic'` then (also the Warden's stance reflect).
- **Innate split** (Quicksilver): on its first defeat, two Quicksilver Beads at 35% of its max HP (`split` event).
- **Mimic** (Borrowed Shadow): a hit of a type it is not weak to becomes its borrowed type (`knowledge(uid).adapted`,
  `message` kind `adapt`); it takes half damage from that type until another type lands (a weakness hit clears it), and
  its turn throws a copy back at the last attacker (weapon types: Shadow Strike; fire, ice, thunder: Shadow Ember, Frost,
  Spark). After a party heal it Shadow Mends itself (18%). Nothing borrowed: Dusk Touch.
- **Shatter** (`glassChip: 2`): a glass foe loses 2 shields in all (its weakness hit's shield counts toward them).
- **Fountain blessing**: `createEncounterBattle(id, { flags })` reads the encounter's `startFury: { flag, amount }`
  (the King: `fountain_done`, +25); `flags` is a Set, array, `{flag: true}` or a function; a number in `opts.startFury`
  overrides. A `message` kind `blessing` announces it. **The battle scene must pass `flags`** (today it does not).
- **Encounter power** (W15, Court F3): an encounter's `power` (a number) multiplies its foes' ATK and MAG in that
  encounter only (`rollEncounter` puts it on each enemy spec, `makeEnemyUnit` applies it); HP, shields and rewards stay
  the enemy's own. `C3_POWER` in `data/encounters.js` tightens the last floor before the King without touching the
  Knights and Sentinels Court F1 and F2 share. qa/battle/data.test.mjs checks no boosted foe fells a full-HP member
  with one ordinary action.

### 10.3 The Other Selves (`other_selves`)

"Everything you are not": each reflection is weak to the weapon types its owner does not carry. **Mirrored Combo**: at
the end of a reflection's turn, if its next timeline slot and another reflection's first slot are consecutive (either
order, no party member between) and a party member acts first, the first of the pair telegraphs the reversed combo of
that pair (`telegraph` with `partner: <uid>`, `mirrorCombo: true`; "{a} and {b} move as one..."): Cinder Edge (hero +
Mira, phys 230 + fire 250), Cross Shatter (hero + Bram, phys 230 x 2), Glass Bulwark (Mira + Bram: Protect, Regen and
Focus on every reflection). It fires on the announcer's turn as one `action_start` with `members: [a, b]` and spends the
partner's coming turn, unless either was pushed back (Pin Shot, Lunge, any `delay`) or the partner lost or spent a turn
(Break, Stun, KO): then `telegraph_cancel` reason `split` and "{a} and {b} fall out of step!". A combo that lands makes
every reflection +15% ATK and MAG for the fight ("The reflections learn your rhythm."): the Devour Name rule, and what
makes ignoring it cost. Loot: `BOSS_LOOT.other_selves` (keyed by the encounter, dropped once): Twinfold Charm, one rare
(ilvl 11), Hi-Potion 2, Hi-Ether 1. 120 EXP, 400 gold.

### 10.4 The Nameless King (`nameless_king`)

1. **The Veiled King** (to 66%, HP locked there): Glass Sword, Cold Mirror; **Keeping** announced at the end of his first
   turn, then every 4 of his turns. A Keeping already announced survives the move to phase 2.
2. **The Shattered Court** (from 66%): Sorrow and Pride appear; the **Mirror Ward** (`message` kind `ward`) makes him take
   25% damage, locks his shields and stops his HP at 34%. Mirror Rain (party mag 190%) two turns in, then every 3;
   Keeping every 5. When both adds fall: "The Mirror Ward shatters!" (kind `ward_break`), phase 3 begins, he is Broken.
3. **Aurel Unmasked**: `phase` event with `sprite: 'nameless_king_unmasked'`; weak fire, light, spear; 8 shields;
   permanent Haste; Last Decree (party phys 260%) first, then Keeping and Last Decree alternate with exactly one ordinary
   turn between.

**Keeping** (mag 70): Defending (or Guarded by a defending Bram) holds ("{name} looks away from the mirror!", kind
`kept_hold`); otherwise Kept for 2 turns and the King gains **+25%** ATK and MAG for the fight. Rewards: 500 EXP, 800
gold; `BOSS_LOOT.nameless_king`: two rares (ilvl 13), a Phoenix Feather, 2 Hi-Ethers; the Kept Promise is `king_after`'s.

### 10.5 Items, shops, loot

Consumables `hi_ether` (40 MP, 200) and `silver_salve` (cures Kept, Nameless, Silence; 120; `canTargetKept`). Key items
`mael_letter`, `glass_key` (counted), `name_fragment_2`, `mirror_sigil`, `courier_satchel`, `elian_reply`, `black_feather`
(icons `sigil` and `feather` are new). Tier 3 armor and charms at **ilvl 9** (the plan said 8: Episode 1 rolls loot at item
level 8 at most, so its pools stay exactly as tuned) and tier 4 at ilvl 11, as plan 7.2. Uniques `twinfold_charm`,
`kept_promise`, `hollowcrown`, `paper_crown`, `courier_knot`; set `merewardens_watch` (`merewarden_helm`,
`merewarden_mantle`: +3 SPR, +2 DEF, +10% healing). Every affix has a fourth tier at ilvl 10. Rare names draw
`RARE_NAME_A_EP2` (Silver, Glass, Mere, Mirror, Veiled, Still) only at ilvl 9 and up. `ZONE_LOOT`: east_road 9 / 0.15,
court_f1 10 / 0.15, court_f2 11 / 0.16, court_f3 12 / 0.18. Shops: `east_peddler` (Penny's Cart, keeper `penny_e`),
`hollow_items` (Fitch; Silver Salve after `court_entered`), `hollow_smithy` (Vessa; tier 4 after `court_f2_done`),
Garrick's tier 3 restock on `ep1_complete`. `rollBattleDrops(rng, killed, { zone, encounter })` (called by rules.js).

### 10.6 Zones, encounters, the scene contract

`EP2_ZONES` and `EP2_ZONE_ORDER` (east_road, court_f1, court_f2, court_f3, court_throne; backdrops `east_road`, `court`,
`court`, `court_deep`, `throne`). They resolve through `ZONES[id]` but stay **non-enumerable** until the Episode 2 maps
exist (qa/maps checks a map per listed zone): **E2-maps sets `EP2_MAPS_LISTED = true` in encounters.js** when the five
maps land; mapcheck's enemy-plan check covers them by id already. Encounter groups are plan 6.7 exactly.

New for the scene (all additive): `skip` reason `kept`; `status_remove` reason `freed`; `telegraph.partner` and
`telegraph.mirrorCombo`; `telegraph_cancel` reason `split`; enemy `action_start.action.members`; `phase.sprite`; `guard`
from an enemy (actor = the coverer); `stat_mod` with `reason: 'cleansed'`, `mult: 1`; `message` kinds `ward`,
`ward_break`, `kept`, `kept_hold`, `kept_break`, `adapt`, `mirror_combo`, `blessing`; `knowledge()` fields `reflect` and
`adapted`; `estimate()` fields `redirect` and `chip`; `timeline()` rows with `skip: 'kept'`.

### 10.7 Auto (the competent policy) in Episode 2

Recall (Mira) or a Silver Salve (anyone, when Mira cannot) on a Kept ally, right after revives; Defend or Guard against
Keeping as against Devour Name; when even a halved telegraph would finish the member, a potion that keeps it standing
instead (shared with Episode 1, where the suite never meets that case); single-target options that a Taunt or Cover would
send elsewhere are skipped, so party-wide skills and True Strike reach Sorrow (scored x1.5); no spells at a Protected
Glassback; the Borrowed Shadow's halved type shows in the estimate, so Auto varies its attacks; Lunge (or Pin Shot) on a
Mirrored Combo announcer even when it is a boss; Shatter's glass chips scored as shields.

### 10.8 Simulator and the final table

`node tools/sim/simulate.mjs` runs both episodes (`--episode 1|2`, `--zone court_f2`, `--trace nameless_king 3 reckless`).
`LOADOUTS` east_road to court_throne follow plan 6.8 (party stats match its calibration table within 2 points; the hero
needs an Iron Helm at F1 for the plan's DEF). Levels: road [9, 10], F1 [10, 11], F2 [11, 12], F3 [12, 13], the Other
Selves [11, 12] (reckless measured at 11, where the plan meets them), the King [13]. `progression(share, 2)` continues
from Episode 1's EXP. `economy2()` / `checkEconomy2()`: from Episode 1's 1,346 leftover, 2,033 battle gold at the Hollow
(two tier 3 pieces: 1,380), 4,923 before F3 (two tier 4 pieces: 3,000), 7,445 at the end (the whole smithy: 15,970).

Final run, 400 battles per row (64,800 battles in 111 s), **all targets met for both episodes**:

| Encounter | Lv | Careful: win / rounds (p10-p90) / HP lost; next level | Attack-only: win / rounds | Elite (careful) |
|---|---|---|---|---|
| road_wolves | 9 / 10 | 100% / 2.9 (2.3-3.7) / 14%; 2.8 | 100% / 6.1 | 4.1 |
| road_beetles | 9 / 10 | 100% / 4.1 (3.7-4.7) / 15%; 4.0 | 100% / 6.5 | 4.9 |
| road_quick | 9 / 10 | 100% / 4.3 (3.0-5.7) / 25%; 4.1 | 93% / 6.9 | 5.0 |
| road_mixed | 9 / 10 | 100% / 4.2 (3.7-5.0) / 12%; 4.1 | 100% / 6.7 | 5.4 |
| road_pack | 9 / 10 | 100% / 5.0 (4.0-6.0) / 16%; 4.6 | 100% / 8.8 | 6.3 |
| c1_quick | 10 / 11 | 100% / 4.4 (3.0-5.7) / 26%; 3.7 | 64% / 6.7 | 5.1 |
| c1_wisps | 10 / 11 | 100% / 3.4 (2.7-4.3) / 21%; 3.2 | 96% / 6.8 | 4.6 |
| c1_sentinel | 10 / 11 | 100% / 3.8 (3.0-4.7) / 17%; 3.4 | 100% / 8.6 | 4.6 |
| c1_mixed | 10 / 11 | 100% / 3.9 (3.0-5.0) / 21%; 3.7 | 45% / 9.3 | 5.4 |
| c2_shadows | 11 / 12 | 100% / 3.6 (3.0-4.3) / 18%; 3.4 | 100% / 6.1 | 5.2 |
| c2_knight | 11 / 12 | 100% / 3.1 (2.3-4.0) / 14%; 3.0 | 100% / 6.8 | 4.4 |
| c2_sentinel | 11 / 12 | 100% / 4.0 (3.7-4.7) / 13%; 3.8 | 100% / 9.6 | 5.6 |
| c2_mixed | 11 / 12 | 100% / 3.5 (3.0-4.0) / 12%; 3.3 | 100% / 6.6 | 4.9 |
| c3_shards | 12 / 13 | 100% / 3.0 (2.3-4.0) / 12%; 2.8 | 100% / 6.8 | 4.1 |
| c3_knights | 12 / 13 | 100% / 3.3 (2.7-3.7) / 9%; 3.2 | 100% / 6.1 | 4.1 |
| c3_shadow | 12 / 13 | 100% / 3.0 (2.3-3.7) / 13%; 2.9 | 100% / 6.1 | 4.3 |
| c3_mixed | 12 / 13 | 100% / 5.3 (4.3-6.7) / 17%; 5.1 | 61% / 11.2 | 6.4 |
| **other_selves** | 11 | 92% / 8.0 (6.0-10.0) / 25%, 0.8 KOs | 0% / 3.3 | ignoring telegraphs: 82% |
| **other_selves** | 12 | 99% / 7.7 (6.0-9.7) / 20% | 0% / 3.8 | - |
| **nameless_king** | 13 | 98% / 12.3 (8.7-16.3) / 22%, Kept 0.34 a fight | 0% / 6.7 | ignoring telegraphs: 74%, Kept 1.47 |

Episode 2 level curve (all fights / 80%): road 9 to 10 / 9 to 9, F1 10 to 11 / 9 to 10, F2 11 to 12 / 10 to 11, F3
12 to 13 / 11 to 12, the King at 13, leaving at 14 / at 12, leaving at 13 (total EXP 3,347 / 2,895).

Tuning notes (what moved from the plan's first pass, and why):
- Light is everywhere in the Court (Lanternheart's sword hits count as light): the Borrowed Shadow (235 to 370) and the
  Shard Swarm (220 to 320) died in 2 rounds, and so did the Mist Wolf (185 to 280). The Quicksilver (150 to 110, beads 39)
  took 6 rounds as three of them split into nine bodies. The Sentinel (330 to 290) and the Knight (320 to 280) brought
  c3_mixed (three large foes) from 5.9 to 5.3.
- The King, first pass: 12 rounds and ignoring telegraphs cost nothing; phase 1 lasted 1.5 rounds, so Keeping almost
  never landed. Now: Keeping from his first turn and surviving the phase change, Mirror Rain 120 to 190, Last Decree 230
  to 260, phase 3 opens with Last Decree with one ordinary turn between telegraphs, HP 1600 to 1400 with DEF/SPR 22/20,
  adds 300/340 to 240/280, and **each Keeping +25% ATK and MAG** (the plan's +10% left reckless play within 10 points of
  careful play and +20% within 13 to 18; the Archivore's Devour Name is +20% plus a heal).
- The Other Selves, first pass: the Mirrored Combo fired 0.2 times a fight (the partner was usually the very next actor,
  so it had already acted). It now takes any two consecutive first slots, survives faster party actions, falls apart only
  on a push or a lost turn, hits at 230 to 250% and empowers the reflections +15% when it lands; reflection ATK/MAG +15%.
- Episode 2 gold is about 1.5x the plan's per-enemy numbers so the totals match its gold column.

Known gaps: no Episode 2 route simulation (`route.mjs` carries HP and MP through Episode 1 only). The plan 6.8 `LOADOUTS`
assume more gear than battle gold buys (about 10,400 of purchases against 5,800 of gold): chests, drops and sales must
cover the rest, or fights run longer for a thrifty player. The scene does not pass `flags` yet, so the Fountain's Fury
is off until E2-scene-ui adds `flags` (the save's story flags) to its `createEncounterBattle` call.


---

## 11. Episode 3: The Forge of Ash (E3-battle, wave 17a)

Design: `docs/EPISODE3_PLAN.md` sections 6 and 7. Nothing in Episode 1's or 2's data, order or targets moved:
`simulate.mjs --check` passes all three episodes ("All targets met").

### 11.1 Enemies (final numbers after tuning)

| Enemy | Lv | HP | ATK/MAG | DEF/SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (telegraph in bold), trait |
|---|---|---|---|---|---|---|---|---|---|---|
| Cinder Hound | 13 | 340 | 60/12 | 18/12 | 17 | 2 | ice, spear | fire | 60 / 70 | Bite, Ember Snap (Burn 20%); evade 10% |
| Cinder Beetle | 13 | 290 | 62/10 | 30/16 | 9 | 3 | ice, axe | fire, sword, bow | 55 / 80 | Stoke (forced opener), Shell Ram, **Flare Ram** (single 200%); Heat |
| Slag Slime | 14 | 290 | 50/64 | 12/18 | 10 | 2 | ice, thunder | fire | 40 / 70 | Splash (Burn 25%), Stoke, **Slag Burst** (party mag fire 110%); Heat |
| Ashbound Miner | 14 | 410 | 70/30 | 16/22 | 12 | 3 | light, bow | ice | 50 / 90 | Pick Swing, Lamp Flash (Blind 25%) |
| Furnace Construct | 15 | 390 | 82/30 | 30/18 | 7 | 5 | ice, thunder | fire, sword, spear | 60 / 120 | Iron Fist, Stoke, **Overheat** (party 140%); Heat |
| Soot Phantom | 15 | 340 | 50/80 | 14/26 | 14 | 3 | light, bow | fire | 50 / 100 | Soot Cloud (party Blind 15%), Choke (Silence 25%), Cinder Touch; flying, evade 20% |
| Forge Defender | 16 | 520 | 92/30 | 34/20 | 10 | 5 | ice, axe, light | fire, sword, spear | 75 / 140 | Tempered Blow, Cover, Stoke, **Brand** (single 220%); Heat |
| The Bellows Specter | 15 | 2100 | 170/200 | 20/20 | 14 | 6 | ice, bow, spear | fire | 160 / 600 | Soot Wing, Draft Lash (each feeds it +2 Heat), **Furnace Breath** (party mag fire 240%, Burn 30%); ai `specter`, immune Blind |
| The Cinder Warden | 16 | 2300 | 230/200 | 22/18 | 18 | 9 / 9 / 10 | by phase | fire, sword (phases 1 and 2) | 620 / 900 | Hammerfall, Ember Spray, Stoke, **Strike the Name** (its Heat flare), **Last Hammer** (party phys 260%); ai `cinder_warden`, immune Stun, Silence, Poison, Blind |
| Bellows Coil | 16 | 260 | 60/40 | 16/18 | 11 | 2 | ice, spear | fire | 0 / 0 | **Stoke the Warden** every turn |
| Smelter Coil | 16 | 300 | 60/62 | 18/16 | 10 | 3 | ice, axe | fire | 0 / 0 | Slag Spray (party mag fire 100%, Burn 30%) on its 1st, 3rd, 5th turn, Build Pressure between |

Names and `flavor` are `BESTIARY_EP3`'s (lore[0] word for word; nothing was changed in `text.js`). EXP is lower than the plan's
first pass for the same reason as always: a 3-foe group paid 200 EXP and Lv 15 came before the Foundry.

### 11.2 Heat and Quench

- **Heat is a counter on the foe**, not a status: `enemies.js heat: { max: 3, step: 0.15, flare }`. Each Stoke is +1 (`stoke`
  has `stokeSelf: 1`; the Bellows Coil's `stoke` effect targets the Warden). Each level is +15% ATK and MAG (`eff()`).
- **The flare.** A foe that reaches max Heat with no charge pending announces its flare (a normal telegraph one turn ahead,
  `telegraph.flare: true`, `telegraph.heat`) and fires it on its next turn; the firing resets Heat (`heat` event reason
  `flare`). A flare that a Stun cancelled is announced again at the end of the foe's next turn.
- **Quench** (`quench` event; `rules.js quench()`): any ice damage (a Frost, an ice-weapon hit, the Tempered Lexicon Blade), a
  Quench Flask, or a Break sets Heat to 0 and cancels a pending flare (`telegraph_cancel` reason `quench`).
- **Quench Flask** (`quench_flask`, 90 gold): thrown at a foe (`CONSUMABLES.target: 'enemy'`; `b.targets()` answers
  `{ side: 'enemy' }`); `effect.throw = { fixed: 60, power: 120, types: ['ice'] }`, so it hits for the same amount in any hand
  (about 40 on a Lv 15 foe) and always quenches, even a foe that resists ice. It is not usable in the field.
- **fireRes** (new stat): -% damage taken from fire-typed attacks (`types: ['fire']`: Ember Snap, Slag Burst, Overheat,
  Brand, Furnace Breath, Ember Spray, Slag Spray; capped at 80). Cinder Boots 10, Coalheart Charm 25, Ashwalker Boots 10, the
  set +20, Ember Heart 30, Emberglass Charm 15.
- `knowledge(uid)` gains `heat`, `heatMax`, `flare` (the pending flare skill id). `battle_start.units[]` gains `heat`, `heatMax`.

### 11.3 The Bellows Specter (`bellows_specter`, ai `specter`)

Every attack it makes feeds it (+2 Heat): Heat 3 on its second action, the flare announced at the end of it, **Furnace Breath**
on the next. Quench it (any ice, a flask, a Break) or Defend. Each Breath that lands makes it +20% ATK and MAG for the rest of the
fight (the Devour Name rule). At 50% "the fans reverse": `phase` event 2, permanent Haste, and at the end of each of its turns it
stokes once more unless ice hit it since its last turn. Plan 6.4 said "Stokes every turn"; at +1 per action a party with a
Frost always quenched it by accident (the flare came 0.8 times a fight and ignoring it cost nothing), so the number is +2.
Loot: Updraft Charm, one rare (ilvl 15), 2 Hi-Potions; 160 EXP, 600 gold.

### 11.4 The Cinder Warden (`cinder_warden`, ai `cinder_warden`) and Tempered Oath

1. **Tempered Iron** (100 to 70%, HP locked at 70%): Hammerfall, Ember Spray, Stoke. At Heat 3 it announces **Strike the Name** on
   one member who is not already Nameless (`telegraph.flare`). Defend holds (`message` kind `name_hold`), Tempered Oath holds
   (kind `oath_hold`: "Bram is saying her name!"); otherwise the target gets Nameless and 3 turns of Silence (kind `name_struck`)
   and the Warden is +20% ATK and MAG for the fight.
2. **Molten Shell** (from 70%): `phase` 2 summons the Bellows Coil and the Smelter Coil (`summon` events), `message` kind `ward`.
   While either stands the Warden takes 25% damage, its shields cannot be chipped and its HP stops at 31%. The Bellows Coil
   stokes the Warden every turn; the Smelter Coil sprays the party every second turn. Killing the last coil: `message` kind
   `ward_break` ("The shell cracks!"), `phase` 3, the Warden is Broken (`break`) and Hasted.
3. **Quenched Core**: weak ice, spear, light (no resists), 10 shields. Hammerfall, Stoke, Strike the Name at Heat 3, and the
   **Last Hammer** (party phys 260%, `telegraph` text "The Cinder Warden raises the Last Hammer. The whole forge holds its
   breath...") announced on every third turn, the first a turn early. Answers: everyone Defends, a Break, Lunge's knock-back
   (a boss is pushed back 35% of a turn), or **Tempered Oath**.

**Tempered Oath** (`tempered_oath`, Bram, 8 MP, self, `learn: { flag: 'bram_memory_3' }`): Taunt, Protect and the `oath` status
(icon `taunt`) for Bram. Single-target attacks on allies go to him (the existing Taunt), he cannot be made Nameless, and a Last
Hammer (`turnable`) lands on him alone at 50% (`oath_ring` event, `message` kind `oath_ring`: "The hammer rings on Bram like a
bell.") and Breaks the Warden. **One change from the plan:** the Oath ends when Bram's next turn begins, *unless a hammer is
raised and has not fallen*: then it holds until it does (statuses last 3 of his turns). Without it the Oath is only useful when
Bram's next turn comes after the Warden's, which a player cannot read off the timeline fast enough (Auto managed 27%).

**`learn: { flag }`** (the flag path, not the level 15 fallback): `party.js knownSkills(member, flags)` takes the save's story
flags (Set, array, `{flag: true}` or a function); without them a flag-learned skill is unknown. `createEncounterBattle` passes
`opts.flags` (the battle scene already does) to `createBattle({ options: { flags } })`, so Bram has the Oath in battle. The
menus (`skills.js`, `status.js`, `inventory.js`) call `knownSkills(m)` without flags and will not list it until E3-scene-ui
passes `g.flags`.

`coolant_done`: the Warden encounter's `startFury: { flag: 'coolant_done', amount: 25, text }`; the `message` kind `blessing` now
carries the encounter's own text ("The station still runs cold behind you. Fury rises! (+25)").

### 11.5 Items, shops, loot

- Key items `lift_key` ("The Founder's Lift Key": the plan's "Mara's Lift Key" leaked a name; the content test checks it),
  `ash_key` (counted), `crucible_hook`, `struck_list`, `name_fragment_3`, `glass_sand`.
- Tier 5 (ilvl 14): Ashsteel Cuirass and Helm, Founder's Robe, Soot Hood, Cinder Boots, Carter's Mantle, Coalheart Charm, Bellchime
  Charm. Tier 6 (ilvl 16): Tempered Sword, Forge Axe, Heartforge Pike, Founder's Rod, Bellwire Bow, Tempered Mail, Ashweave Robe, Forge
  Helm. Plan numbers.
- Uniques: First Bell Hammer (staged by `warden_after`, never dropped), Tempered Lexicon Blade (strikes as ice: `extraTypes:
  ['ice']`, so its hits quench; against Lanternheart's light and the Silverglass Blade's edge it is a choice), Ember Heart
  (Warden, guaranteed), Updraft Charm (Specter, guaranteed), Emberglass Charm, Ashwalker Boots and Mantle (set `ashwalkers_road`: +20% fire
  resist, +1 SPD).
- Affixes with four tiers get a fifth at ilvl 14 (about +15%; resist suffixes cap at 100; `of_dawn` has three tiers and none was
  added). Rare names draw `RARE_NAME_A_EP3` (Ashen, Tempered, Forged, Banked, Cinder) at ilvl 14 and up only.
- `ZONE_LOOT`: sand_road 13 / 0.16, foundry_f1 14 / 0.16, foundry_f2 15 / 0.17, foundry_f3 16 / 0.18. `BOSS_LOOT.bellows_specter`
  and `.cinder_warden` (two rares, a Phoenix Feather, 2 Hi-Ethers).
- Shops: `sand_peddler` (Penny; road prices, flask 100, Cinder Boots 970), `ventworks` (Taro; list prices), `pk_smithy` (Sella;
  tier 5, the tier 4 weapons, and tier 6 behind `ifFlag: ['foundry_f2_done', 'forge_relit']`: `shopStock` now takes a list of
  flags that must all be set), Vessa's tier 5 for Mira after `sand_done`.

### 11.6 Zones, encounters, the scene contract

`EP3_ZONES` / `EP3_ZONE_ORDER` (sand_road, foundry_f1, foundry_f2, foundry_f3, foundry_heart; backdrops `ash_road`, `foundry`,
`foundry`, `crucible`, `heartforge`; the Specter's and the Warden's encounters name `foundry` and `heartforge`). They resolve through
`ZONES[id]` but stay non-enumerable until **E3-maps sets `EP3_MAPS_LISTED = true`** (a one-word change; `episodes.js
ep3MapsListed()` reads it). `zoneOrder(3)` returns the order. Encounter groups are plan 6.2 exactly, with `sr_first` led by the
Cinder Beetle (the scene calls it with `canFlee: false`).

New for the scene (all additive; names are what the scene draws):
- `heat` { target, heat, max, delta, reason: 'stoke' | 'coil' | 'fans' | 'flare' | 'quench' }: redraw the Heat pips (3 small
  flames under the feet or above the head, readable while a command is being chosen; `knowledge(uid).heat` and `.heatMax` give the
  current value at any time).
- `quench` { target, reason: 'ice' | 'flask' | 'break', heat, cancelled: skillId | null, sfx: 'quench_hiss' }: the steam puff;
  followed by `message` kind `quench` ("Quenched!") and `telegraph_cancel` reason `quench`.
- `telegraph` gains `flare: true` (and `heat`) for a Heat flare: draw it as the glowing-white announce.
- `oath_ring` { actor: Bram, target: Warden, sfx: 'oath_ring' }: the bell; the Warden then gets a `break`.
- `message` kinds: `quench`, `ward`, `ward_break`, `name_hold`, `name_struck`, `oath_hold`, `oath_ring`, `blessing`.
- `phase` events for the Specter and the Warden (ids `updraft`, `fans_reverse`; `tempered_iron`, `molten_shell`, `quenched_core`);
  the Warden's three looks switch on `phase` 1, 2, 3 (the coils arrive by `summon`).
- Statuses: `oath` (icon `taunt`). Items: `quench_flask` targets foes (`b.targets` side `enemy`; `estimate` gives `quench: true`
  and damage numbers). `sfx` ids named by skills and events: `furnace_roar`, `quench_hiss`, `oath_ring`, `hammer_charge`.
- Presentation hints for E3-sprites: enemy frames are `<id>` as always (the coils are small); the Specter is `size: 'large'` and
  flying, the Warden `size: 'boss'`.

### 11.7 Auto (the competent policy) in Episode 3

Quench a flare that is announced: a Break first (as before), then the best ice skill (Mira's Frost), else a Quench Flask (unless
Mira's Frost comes before the foe acts); Defend otherwise (the existing telegraph rules). Ice on a foe at Heat 2 or more scores
a bonus before any flare is announced. At a Last Hammer Bram raises Tempered Oath at once (the others attack: with the Oath up or
about to be, they do not brace or Break), and Bram keeps 8 MP back for it in a Warden fight (combos that spend his MP count whoever
starts them). The coils score x1.6 (the Warden's shell holds up until they fall). The **reckless** policy reads neither
telegraphs nor Heat.

### 11.8 Simulator and the final table

`node tools/sim/simulate.mjs` runs all three episodes (`--episode 3`, `--zone foundry_f3`, `--trace cinder_warden 2 competent`,
`--trace bellows_specter 2 competent --level 15`). The table has three new columns: quenches a fight, names struck out a fight,
and the share of Last Hammers turned by Tempered Oath. `LOADOUTS` sand_road to foundry_heart follow plan 6.6: sand_road is the
court_throne row plus the Kept Promise and tier 4 gear (and is the Episode 3 quick start, `state.js EP3_START`), foundry_f1 adds
Ashsteel Helm and Cinder Boots, foundry_f2 Ashwalker Boots and Soot Hood, foundry_f3 the Heartforge Pike and Founder's Rod,
foundry_heart the Updraft Charm and `flags: ['bram_memory_3']`. `progression(share, 3)` starts at 2,900 EXP (`EP3_START_EXP`).
Levels: sand_road [13, 14], F1 [14, 15], F2 [15, 16], F3 [16, 17], the Specter [15, 16] (reckless at 15), the Warden [16, 17]
(reckless at 16). `economy3()` / `checkEconomy3()`: from the quick start's 1,500, 590 battle gold on the road, 2,090 at Emberpeak
(two tier 5 pieces, Ashsteel Helm and Cinder Boots: 1,800), 4,930 before F3 (the cheapest tier 6 piece, the Forge Helm: 1,400),
7,110 at the end (the whole smithy: 29,550). That is one tier 6 piece before F3 from battle gold alone, a second from chests and
sales (the plan said two); never everything.

Final run, 400 battles per row (92,500 battles in 167 s), **all targets met for all three episodes**:

| Encounter | Lv | Careful: win / rounds (p10-p90) / HP lost; quenches | Attack-only: win / rounds | Ignoring telegraphs | Elite (careful) |
|---|---|---|---|---|---|
| sr_first | 13 | 100% / 3.87 (3.3-4.3) / 12%; 1.05 | 100% / 6.99 | - | - |
| sr_first | 14 | 100% / 3.73 (3.0-4.7) / 11%; 0.68 | 100% / 6.75 | - | 4.97 |
| sr_hounds | 13 | 100% / 3.03 (2.3-3.7) / 15%; 0.00 | 100% / 5.59 | - | - |
| sr_hounds | 14 | 100% / 2.88 (2.3-3.3) / 14%; 0.00 | 100% / 5.45 | - | 4.07 |
| sr_beetles | 13 | 100% / 4.00 (3.3-4.7) / 10%; 1.18 | 100% / 8.41 | - | - |
| sr_beetles | 14 | 100% / 3.82 (3.3-4.7) / 9%; 0.58 | 100% / 8.11 | - | 5.48 |
| sr_mixed | 13 | 100% / 2.81 (2.3-3.3) / 14%; 0.10 | 100% / 4.98 | - | - |
| sr_mixed | 14 | 100% / 2.62 (2.3-3.0) / 12%; 0.07 | 100% / 4.84 | - | 3.82 |
| fo1_beetles | 14 | 100% / 5.23 (4.7-6.0) / 12%; 1.59 | 100% / 10.16 | - | - |
| fo1_beetles | 15 | 100% / 5.10 (4.3-6.0) / 11%; 1.50 | 100% / 9.86 | - | 6.14 |
| fo1_slimes | 14 | 100% / 3.64 (3.0-4.0) / 15%; 0.28 | 100% / 6.35 | - | - |
| fo1_slimes | 15 | 100% / 3.53 (3.0-4.0) / 14%; 0.20 | 100% / 6.11 | - | 4.74 |
| fo1_miners | 14 | 100% / 2.95 (2.7-3.3) / 10%; 0.00 | 100% / 5.77 | - | - |
| fo1_miners | 15 | 100% / 2.90 (2.3-3.3) / 9%; 0.00 | 100% / 5.53 | - | 4.20 |
| fo1_mixed | 14 | 100% / 3.65 (2.7-4.7) / 8%; 0.67 | 100% / 6.77 | - | - |
| fo1_mixed | 15 | 100% / 3.54 (2.7-4.0) / 7%; 0.61 | 100% / 6.54 | - | 4.64 |
| fo2_phantoms | 15 | 100% / 3.12 (2.3-4.0) / 13%; 0.00 | 100% / 5.89 | - | - |
| fo2_phantoms | 16 | 100% / 2.94 (2.3-3.7) / 11%; 0.00 | 100% / 5.58 | - | 4.24 |
| fo2_constructs | 15 | 100% / 4.54 (3.7-5.0) / 9%; 0.13 | 100% / 9.76 | - | - |
| fo2_constructs | 16 | 100% / 4.31 (3.7-5.0) / 8%; 0.07 | 100% / 9.35 | - | 5.90 |
| fo2_mixed | 15 | 100% / 4.52 (3.7-5.0) / 8%; 0.14 | 100% / 9.54 | - | - |
| fo2_mixed | 16 | 100% / 4.36 (3.7-5.0) / 7%; 0.11 | 100% / 9.19 | - | 5.67 |
| **bellows_specter** | 15 | 99% / 8.07 (7.0-9.7) / 19%; 2.71 | 0% / 3.48 | 63% / 7.20 | - |
| **bellows_specter** | 16 | 100% / 7.65 (6.7-8.7) / 19%; 2.32 | 0% / 4.09 | - | - |
| fo3_defenders | 16 | 100% / 3.75 (3.0-4.7) / 19%; 0.39 | 80% / 7.53 | - | - |
| fo3_defenders | 17 | 100% / 3.64 (3.0-4.7) / 18%; 0.34 | 94% / 7.39 | - | 5.08 |
| fo3_mixed | 16 | 100% / 4.24 (3.7-5.0) / 19%; 0.48 | 77% / 8.34 | - | - |
| fo3_mixed | 17 | 100% / 3.94 (3.3-4.7) / 18%; 0.42 | 92% / 8.32 | - | 5.26 |
| fo3_furnace | 16 | 100% / 5.19 (4.7-6.0) / 18%; 0.40 | 77% / 11.26 | - | - |
| fo3_furnace | 17 | 100% / 4.95 (4.3-5.7) / 17%; 0.37 | 92% / 11.11 | - | 7.33 |
| **cinder_warden** | 16 | 99% / 12.73 (9.7-15.7) / 19%; 1.72; Oath on 55% of hammers | 0% / 7.51 | 71% / 12.83 | - |
| **cinder_warden** | 17 | 99% / 11.64 (9.0-14.7) / 21%; 1.68; Oath on 54% of hammers | 0% / 7.98 | - | - |

Episode 3 level curve (all fights / 80%): road 13 to 14 / 13 to 13, F1 14 to 15 / 13 to 14, F2 15 to 16 / 14 to 15, F3 16 to 17 /
15 to 16, the Warden at 17 (leaving at 18) / at 16 (leaving at 17), total EXP 6,060 / 5,584. The plan wanted a full clear to reach
the Warden at 16 and the 80% route to be a level behind; with its own EXP column the full clear is a level above, which is why the
Warden is measured at both 16 and 17.

Tuning notes (what moved from the plan's first pass, and why):
- EXP per foe: 60 / 55 / 40 / 50 / 60 / 50 / 75 (plan 60 / 66 / 62 / 72 / 90 / 80 / 100). At the plan's numbers the Foundry paid
  1,000 EXP on F1 and 988 on F3 against 600 and 460 planned, and the party was Lv 17 before F2.
- HP: Hound 300 to 340, Slag Slime 260 to 290, Miner 330 to 410 (the Hound and Slime groups and the Miners ended in 2.4 rounds),
  Furnace Construct 480 to 390 (the F3 pair took 6.1).
- Foundry F3 is the tightest ordinary floor (target: careful 18 to 24% HP lost, attack-only wins 70 to 85%, as zone averages at Lv 16).
  `power` alone could not do it: careful play heals, so 3.5x ATK moved its HP loss from 13% to 17% while attack-only collapsed.
  Encounters now also take `speed` (like `power`, in `rollEncounter` and `makeEnemyUnit`): the F3 foes act 1.5x as often
  (`F3_SPEED`) and hit 1.9 to 2.3x as hard (`F3_POWER`), which is steady chip damage rather than bigger single hits. Result: 19%
  and 78%. qa/battle/data.test.mjs checks no boosted foe fells a full-HP member with one ordinary action.
- The Specter: HP 1400 to 2100, ATK/MAG 90/96 to 170/200, Furnace Breath 160 to 240, +2 Heat per attack and +20% per Breath that
  lands. First pass: 5 rounds, attack-only won 92%, ignoring the telegraph cost nothing.
- The Warden: HP 3000 to 2300, ATK/MAG 170/150 to 230/200, SPD 12 to 18 (a SPD 12 Warden acted once every two rounds), shields 7/7/8
  to 9/9/10, coils 380/420 to 260/300 HP, Last Hammer 230 to 260, Strike the Name +20% per name. First pass: 15 to 18 rounds,
  ignoring telegraphs cost nothing, Auto never used the Oath (Bram was out of MP; and a timeline-bound Oath fired 27% of the time).
- The Auto reckless gap: the policy's Heat bonus is off for reckless play, otherwise Frost on an ice-weak Specter quenches it by
  accident and the telegraph never matters.

Known gaps: no Episode 3 route simulation (`route.mjs` is Episode 1 only). The Tempered Lexicon Blade, the Emberglass Charm, the
Ashwalker pieces and the Dash and Lantern secrets are not in any `LOADOUTS` row (placed, optional). The menus do not know the flag-learned
Oath yet (see 11.4).
