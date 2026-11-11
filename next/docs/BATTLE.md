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
15 to 16, the Warden at 17 (leaving at 18) / at 16 (leaving at 17), total EXP 6,060 / 5,584 (before E3-fixes-world cut four field foes, 2026-11-03: the Warden is now met at Lv 16 and the full clear carries 5,585). The plan wanted a full clear to reach
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

## 12. Episode 4: The Sunken Keep (E4-battle, wave 4a)

Design: `docs/EPISODE4_PLAN.md` sections 6 and 7. Everything is pack data (`src/data/ep4/{enemies,encounters,items,loot,shops,skills,ai}.js`,
each an idempotent `register()` the pack entry calls); no core data file changed. Nothing in Episodes 1 to 3 moved:
`simulate.mjs --check` passes all four episodes ("All targets met").

### 12.1 Enemies (final numbers after tuning)

| Enemy | Lv | HP | ATK/MAG | DEF/SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (telegraph in bold), trait |
|---|---|---|---|---|---|---|---|---|---|---|
| Floodhound | 17 | 620 | 110/16 | 24/16 | 18 | 2 | thunder, spear | ice | 65 / 110 | Bite, Undertow (Chill 20%); evade 10% |
| Lockjaw Crab | 17 | 360 | 105/12 | 40/18 | 9 | 4 | thunder, axe | ice, sword, bow | 55 / 120 | Claw, Clamp (Stun 15%), Shell Up |
| Ink Bloom | 17 | 520 | 60/100 | 14/24 | 11 | 2 | fire, light | ice | 55 / 110 | Stamp (forced opener), Blot (Blind 25%), **Runoff** (party mag 110%); Decree |
| Drowned Watch | 18 | 700 | 100/30 | 30/22 | 12 | 4 | light, thunder | ice | 62 / 140 | Halberd, Cover, Shield Wall |
| Gutter Phantom | 18 | 560 | 60/104 | 16/30 | 15 | 3 | light, fire | ice | 50 / 130 | Murk (party Blind 15%), Drag Under (Silence 25%), Cold Touch; flying, evade 20% |
| Blank Decree | 19 | 520 | 70/110 | 18/34 | 16 | 3 | fire, bow | thunder | 55 / 150 | Paper Cut, Stamp, **Edict** (single mag 220%, Silence 30%); Decree; flying |
| Waterlogged Sentinel | 19 | 620 | 120/30 | 32/22 | 8 | 5 | thunder, axe | sword, spear, ice | 65 / 170 | Slam, Floodfist (Chill 20%), **Breach** (party phys 150%, a charge) |
| The Inkbound Barrister | 19 | 2500 | 300/320 | 26/28 | 13 + Haste | 8 | fire, light, spear | ice, thunder | 220 / 800 | Rebuttal, Cross-Examine; 2 Seals at the end of every turn; **Objection** (party mag 200%, Silence 40%); a witness at 50%; immune Silence |
| Paper Witness | 19 | 300 | 50/60 | 14/20 | 12 | 2 | fire | thunder | 0 / 0 | **Stamp the Brief** (+1 Seal to the Barrister) every turn |
| The Paper Regent | 20 | 2950 | 330/300 | 26 (x1.4 in phases 1 and 2)/24 | 13 (+ Haste from 70%) | 7 / 7 / 8 | by phase | ice, thunder (phases 1 and 2) | 800 / 1100 | Trident Sweep, Wet Seal (Chill 30%), Stamp; **Flood Decree** (party mag 220%, Chill 30%); **Strike from the Roll** (the hero, mag 300%); immune Stun, Poison, Blind |
| Forged Writ of Silence | 20 | 600 | 60/90 | 16/22 | 12 | 3 | fire | ice | 0 / 0 | Mend the Seal (the Regent +6%); every 2nd turn Hush (Silence 35%, also mends) |
| Forged Writ of Oblivion | 20 | 650 | 60/80 | 18/20 | 11 | 4 | spear, fire | ice | 0 / 0 | **Stamp the Regent** (+1 Seal) every turn |

Keep F3 (the tightest ordinary floor, as Foundry F3): `encounters.js` `K3_POWER` decrees 2.25, watch 1.6, sentinels 1.2; `K3_SPEED`
1.5; `K3_HP` decrees 0.85, watch 0.7, sentinels 0.68 (the encounter's `hp`).

**What moved from the plan, and why.** EXP per foe is about half the plan's first pass (50 to 65, not 95 to 140): the plan's own
6.1 asks for about 120 EXP a fight, and the 6.2 numbers paid 190 to 375. The plan's HP and ATK were far under an Episode 3
finisher's party (the road's fights took 2.4 rounds and lost 5%), so HP rose about 40% and the bosses' ATK and MAG nearly doubled
(the Barrister 110/120 to 300/320, the Regent 180/175 to 330/300). **The Barrister resists fire** (plan: weak) and has Haste and 2
Seals a turn: weak to fire, Ember Edge voided every Objection by accident and ignoring the telegraph cost 0 points; now fire still
voids (a Decree's void is any fire damage, resisted or not) but it is a choice. (E4-fixes-A, PLAYTEST_REVIEW_6 fix 8: back to the
plan's weak fire, light, spear and resist ice, thunder, so the row agrees with Mira's "Burn the paper"; HP 2500, 8 shields, Haste and 2
Seals stay. `--zone ep4_keep_f2`: careful 7.3 rounds, 100%; reckless 72%; naive 0%. All targets met.) **The Regent is Hasted from the Royal Ward on**
(plan: phase 3 only), its Strike from the Roll is mag 300% (plan 200%) and its Flood Decree 220% (plan 140%): before that,
ignoring telegraphs cost 0 to 4 points. The Regent's HP is 2950 (plan 3800) to keep careful play in 10 to 14 rounds; the writs are
600 and 650 (plan 420 and 460) so the ward lasts long enough to choose a writ. Strike from the Roll empowers +30% (plan 20%).

### 12.2 Decrees (on the Heat counter)

- A Decree foe carries `heat: { max: 3, step: 0.15, flare, quench: 'fire', word: 'Voided!', sfx: 'decree_void' }` (rules.js seam 6
  reads `quench`, `word`, `sfx`). `stamp` is Stoke renamed (`stokeSelf: 1`, sfx `seal_stamp`); each Seal is +15% ATK and MAG.
- At 3 Seals the foe announces its decree (`telegraph` with `flare: true`; the skill has `decree: true` and `telegraphSfx:
  'decree_unroll'`) and fires it next turn. Any fire damage, **Lamp Oil**, a Break or **Answer** voids it: `quench` (sfx
  `decree_void`), `heat` to 0, `message` "Voided!" kind `quench`, `telegraph_cancel` reason `quench`.
- Lamp Oil (`lamp_oil`, 110): thrown like the Quench Flask, `effect.throw = { fixed: 90, power: 130, types: ['fire'] }`, always voids.
- The Barrister's end-of-turn stamps are `heat` events with reason `stamp`; the witness's and the Writ of Oblivion's are reason `coil`.

### 12.3 Answer (`answer`, the hero)

10 MP tech, one foe, a small light hit (mag 60), `learn: { flag: 'hero_signed' }` (`fallbackLevel: 19` recorded, unused: knownSkills
reads the flag). It voids the target's Seals and pending decree or Strike from the Roll; if something was pending the target is
Broken (not through the Royal Ward), with the message "{hero} answers to their name. The decree will not stand." (kind `answer`).
Until the hero's next turn the hero cannot be made Nameless (`hero.answerGuard`; a Strike then posts kind `name_hold`). Event:
`answer` { actor, target, voided (skill id or null), seals, broke, guarded }. Implementation: no rules.js hook exists for a party
skill's custom effect, so each Episode 4 script's `reflect(ctx, tgt, part)` (called by strike() with the hit's part, `part.id ===
'answer'`, before the damage) runs `answerHook` in `src/data/ep4/ai.js` and returns null. Against other foes it is a plain light hit.

Menu (E4-fixes-A, PLAYTEST_REVIEW_6 fix 2): `SIGNATURE_TECHS` in `src/battle/scene/menu.js` lists { unit, flag, skill }: while a
foe's telegraph skill has `flag`, that unit's menu opens on Tech with `skill` first, in gold. Core holds Bram's Tempered Oath
(`turnable`); the ep4 pack's `scene.js` register() adds the hero's Answer (`answerable`, Strike from the Roll).

Keyboard (fix 4): Enter is both `confirm` and `start` (DESIGN 3). In a battle the help bar and Config name Enter as Auto, so there
Enter is Auto alone: `updatePlay` consumes `confirm` with `start`, and Z or Space confirm. Outside battle Enter confirms as before.

### 12.4 The Inkbound Barrister (ai `barrister`) and the Paper Regent (ai `paper_regent`)

- **Barrister**: Haste for the fight; an attack, then 2 Seals at the end of each turn, so Objection is announced at the end of its
  second turn. At 50% HP, once: "The Barrister calls a witness!" (kind `witness`) and `summon` `barrister_witness`. Loot: Barrister's
  Quill, 1 rare (ilvl 18), 2 Hi-Potions. Encounter: no flee, flag `barrister_defeated`, backdrop key `ep4_archive_deep`.
- **Regent 1 Forged Edicts** (100 to 70%, HP locked at 70%, DEF x1.4 as a `stat_mod` source `regent_armor`). **2 Royal Ward** (from
  70%; Haste): `summon` both writs, kind `ward`; while either stands it takes 25% damage, its shields cannot be chipped and its HP
  stops at 31%. The killing blow on the last writ breaks the ward (kind `ward_break`, `phase` 3, `break`, +25 `fury_gain` reason
  `ward_break` to each member). **3 The True Charter**: weak fire, spear, light; 8 shields; DEF normal; Strike from the Roll
  announced on the hero on every 3rd turn (the first a turn early), a charge, not a Decree (fire does not void it). If it lands:
  Nameless and 3 turns of Silence (kind `name_struck`), and the Regent +30% ATK and MAG. Encounter: no flee, flag
  `paper_regent_defeated`, music `boss_regent`, backdrop key `ep4_throne`, `startFury` +25 with `council_records`. Loot: The Broken
  Seal, 2 rares (ilvl 20), a Phoenix Feather, 2 Hi-Ethers.
- Ward-break timing: ai.js `onDeath()` only reaches the Episode 1 to 3 scripts, so the writs break the ward from their own
  `clampDamage` on the lethal hit; the ward events come just before that writ's `damage` and `ko`.

### 12.5 Auto (`POLICY_EXT`, careful play only)

`ep4Policy` returns null at once unless a living foe carries a fire Decree counter, has Strike from the Roll pending, or is the
Regent, so Episodes 1 to 3 play as before (a test pins it). 1. The hero Answers an announced Strike. 2. An announced decree, then any
foe at 2 Seals or more, is voided: Mira's fire (the others wait when she acts before the foe), the hero's Answer on a boss or an
announced decree, then Lamp Oil. 3. Against the Regent the hero keeps 10 MP for Answer (an MP action that would spend it becomes an
Attack; under 10 MP from the ward on, an Ether). The reckless policy skips all of it.

### 12.6 Items, loot, shops

Tier 7 bases are ilvl 18 (plan 17), tier 8 ilvl 20 (plan 19), and the road's loot ilvl is 18 (plan 17): Episode 3 rolls loot up to
ilvl 17, so no Episode 4 base enters an Episode 3 pool once the pack loads. "Ice resist" in the plan has no rule (rules.js resists
ink and fire damage only), so Wader Boots and Tidewalker Boots carry Chill resist (25 and 20). New stat label `resNameless` (the
Regent's Pardon: Nameless resist 50, read by addStatus). Affixes: a sixth tier at ilvl 18 for every five-tier affix. Shops:
`ferry_peddler` (Hale, road prices), `riverbank` (Linn), `vw_forge` (keeper `ep4_smith`; tier 8 after `keep_f2_done`); `pk_smithy`
gains the Riverguard Halberd and the Crownguard Sword after `ep4_complete`. `RARE_NAME_A_EP4` (Drowned, Sealed, Riverborn, Witnessed,
Tidal) is exported, but loot.js reads only the Episode 1 to 3 lists (12.7).

### 12.7 Seams this pack would like (none blocks Episode 4)

- `src/battle/rules.js` strike(): the void passes `quenchReason`, which is 'ice' for any damage hit, so a fire void reports
  `reason: 'ice'`. Suggested: `quench(tgt, quenchReason === 'ice' ? tgt.heatQuench : quenchReason)`.
- `src/battle/ai.js` scoreHit(): the Heat bonus reads `sk.types.includes('ice')`; for a Decree foe it should read the foe's
  `heatQuench` (`sk.types.includes(f.heatQuench || 'ice')`). Today `ep4Policy` voids first, so it rarely matters.
- `src/battle/ai.js` onDeath(): also call `onDeath` of the `SCRIPTS` a pack added (the writs' ward break could then move there).
- `src/battle/loot.js` rareName(): `if (ilvl >= 18) pool = pool.concat(RARE_NAME_A_EP4)` from a mutable list.

### 12.8 Simulator and the final table

`node tools/sim/simulate.mjs --check` (400 a cell; the CLI registers the pack's battle data through `tools/sim/ep4.mjs` `attach`, the tests
through `registerData()`, so the Episode 1 to 3 suites never see it). Levels: road [17, 18], F1 [18, 19], F2 [19, 20], F3 [19, 20], the
Barrister [19, 20], the Regent [20, 21] (reckless at the first). Progression from the quick start's 5,600 EXP, every fight: road 17 -> 18,
F1 -> 19, F2 19 (7,695), F3 -> 20, the Regent at 20 -> 21; at 80%: 17, 18, 19, 20, 21. Keep F3: careful HP lost 19%, attack-only wins 73%.
Careful play Answers 63% of the Strikes from the Roll (Nameless 0.06 a fight). Battle gold: 2,400 in, about 8,000 earned, 10,380 out.

Ordinary zones (careful, averaged over the plan, both levels): win / rounds / HP lost; attack-only win / rounds.

| Zone | Careful | Attack-only |
|---|---|---|
| ep4_flood_road | 100% / 3.59 / 9% | 100% / 8.18 |
| ep4_keep_f1 | 100% / 4.26 / 6% | 100% / 9.63 |
| ep4_keep_f2 | 100% / 4.08 / 7% | 100% / 9.45 |
| ep4_keep_f3 | 100% / 4.27 / 17% | 82% / 9.24 |

| Boss | Lv | Careful: win / rounds (p10-p90) / HP lost | Attack-only | Ignoring telegraphs |
|---|---|---|---|---|
| **barrister** | 19 | 100% / 8.32 (7.3-9.3) / 14% | 0% / 3.12 | 65% / 7.69 |
| **barrister** | 20 | 100% / 8.29 (7.0-9.7) / 16% | 0% / 3.45 | - |
| **paper_regent** | 20 | 99% / 13.52 (10.3-16.7) / 16% | 0% / 6.95 | 74% / 11.70 |
| **paper_regent** | 21 | 100% / 12.53 (10.0-15.3) / 15% | 0% / 7.16 | - |

## 13. Episode 5: The Last Prophecy (E5-battle, wave 5a)

Design: `docs/EPISODE5_PLAN.md` sections 6 and 7. Everything is pack data and pack code (`src/data/ep5/{enemies,encounters,items,loot,shops,
skills,ai,sky}.js`, each an idempotent `register()` the pack entry calls in its ORDER); no core file changed (`rules.js` `RULE_EXT` is
E5-pack's seam). `simulate.mjs --check` passes all five episodes ("All targets met"); `--cave --check` and `--tier 1 --check` unchanged.

### 13.1 Enemies (final numbers after tuning)

Every foe has a sky side (sun or star). Ordinary EXP: about 100 a head; the three-foe groups carry an encounter `expMul` (F1 stalkers 0.7,
F2 mixed 0.65, F3 shades 0.6) so a fight pays about 200 and the Oracle is met at Lv 24 at 100% and at 80% of the fights.

| Enemy | Side | Lv | HP | ATK/MAG | DEF/SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (telegraph in bold), trait |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Dune Stalker | sun | 21 | 560 | 112/20 | 30/20 | 19 | 2 | ice, spear | fire | 100 / 140 | Bite, Sandkick (Blind 20%); evade 10% |
| Dune Scarab | sun | 21 | 540 | 108/16 | 50/22 | 9 | 4 | ice, axe | fire, sword, bow | 105 / 150 | Mandible, Sunshell (fire), Burrow (Protect) |
| Dust Harrier | sun | 22 | 520 | 118/30 | 24/24 | 21 | 3 | bow, thunder | fire | 80 / 150 | Talon, Dust Devil (party phys 70%, Blind 15%); flying, evade 15% |
| Silt Reaver | star | 22 | 680 | 80/120 | 22/34 | 14 | 3 | light, fire | ice | 95 / 160 | Silt Lash, Bury (Silence 25%), Drain |
| Starsilt | star | 22 | 580 | 70/115 | 18/30 | 11 | 2 | fire, light | ice, thunder | 105 / 150 | Glimmer (Blind 25%), Starfall (single mag 160%, ice) |
| Horizon Shade | star | 23 | 700 | 76/130 | 20/38 | 16 | 3 | light, fire | ice | 100 / 170 | Cold Horizon (party mag 60%, Chill 25%), Mirage (Protect), **Eclipse** (party mag 100%) |
| Tomorrow Husk | sun | 24 | 900 | 150/40 | 48/26 | 8 | 5 | ice, axe | fire, sword, spear | 125 / 200 | Ground Slam (party phys 65%), Sandglass (Haste), **Hour Crush** (party phys 110%, first turn 1, then every 2) |
| The Mirage Knight | sun, mirrors | 23 | 2450 | 420/220 | 34/26 | 13 | 7 | ice, axe | fire, sword | 220 / 900 | Mirage Slash, Glare (party light 70%, Blind 20%); **Horizon Cleave** (party phys 400%) every 3rd turn; Double at 50%; immune Silence |
| Mirage Double | opposite the Knight | 23 | 600 | 150/90 | 30/24 | 12 | 2 | ice | - | 0 / 0 | Mirror Copy: the Knight's last attack at half power |
| The Sand Oracle | sun (phase 3 mirrors) | 24 | 4000 | 380/420 | 30/28 | 14 (+ Haste in phase 3) | 8 / 8 / 9 | by phase | fire, thunder (phases 1, 2) | 1000 / 1400 | Stinger, Sandfall (party mag 100%, Blind 25%); **The Last Prophecy** (single mag 320%, Starless); **Unbound Sandstorm** (party mag 180%, Blind 30%); immune Stun, Poison, Blind |
| False Future: Hunger | sun | 24 | 520 | 90/120 | 20/24 | 13 | 2 | ice | fire | 0 / 0 | Devour the Road (15 Fury from the member with most, the Oracle +5%) |
| False Future: Fear | star | 24 | 560 | 80/120 | 20/26 | 13 | 3 | spear, light | ice | 0 / 0 | Dread (the soonest member half a turn back); Hush the Reader on Mira every 3rd turn (Silence 40%) |

Well F3 (the tightest ordinary floor): `encounters.js` `L3_POWER` husks 1.6, shades 1.75, mixed 1.6; `L3_SPEED` 1.4, 1.2, 1.25; `L3_HP`
1.0, 0.8, 0.9.

**What moved from the plan, and why.** EXP per foe 80 to 125 (plan 125 to 180): plan 6.1 asks for about 180 a fight. The bosses' ATK
and MAG nearly doubled (the Knight 150 to 420 with Horizon Cleave 400%, plan 150%; the Oracle 215/210 to 380/420, the Last Prophecy
280%, plan 240%; the Sandstorm 180%, plan 160%): at the plan's numbers ignoring every telegraph cost 0 points. The Knight's HP is 2450
(plan 2600) and its Cleave comes every 3rd turn (plan 4th) for the same reason; the Oracle's HP is 4000 (plan 4800) to keep careful play
in 11 to 15 rounds. Star foes' HP rose about 17% (by Day they are Exposed and fell in 2.6 rounds). Careful play heals through any
single-target pressure, so F3 could only be made the tightest floor with spread damage: Horizon Shade's Cold Horizon and the Husk's Slam
became party-wide (60% and 65%), and Hour Crush and Eclipse dropped to 110% and 100% so attack-only play is not simply wiped.

### 13.2 The Turning Sky (`src/data/ep5/sky.js` on `RULE_EXT`)

- A battle has a sky only when a foe has a side (`state.sky`, saved with the battle state). Start: `SKY_START[encounter]` (`e5s_first`
  Night with the Turn in 4; the Knight and the Oracle Day), else the field hour (`setFieldHour`: dawn, noon Day; dusk, night Night; Day if
  unset).
- The Turn falls after 6 actions (every ended turn; a combo is one). Under its own sky a foe is Ascendant (ATK and MAG x1.2: mods in
  addMod's shape, source `sky`, written directly because addMod emits a `stat_mod` per stat with no source); under the other it is Exposed
  (`u.exposed`: every hit a weakness hit, never learned). Broken stays Broken.
- A natural Turn: "The sky turns. Night." (kind `sky`); `mirrorTurn` foes take the new sky's side ("{name} turns its mirror to the sky.",
  kind `mirror_turn`); a Double takes the side opposite its Knight; then a pinned foretelling falls (a direct strike, no Taunt or Guard;
  Starless is `nameless`, "{name} falls from the chart.", kind `starless`).
- Turn the Sky (`turn_sky`, Mira, 12 MP, rank 80, `learn: { flag: 'sky_learned' }`, fallback 22): turns now, the Turn reset to 6, no
  mirror; a pinned foretelling fails ("The words change.", sfx `prophecy_break`) and its owner is Broken. Hourglass Sand (`hourglass_sand`,
  140): +3 actions to the Turn (sky.js reads `itemsUsed`; it targets an ally only because every non-thrown item does).
- Events: `sky` { sky, turnIn, reason: start | action | turned }, `sky_turn` { sky, natural, by }, `exposed` { target, on, side },
  `ascendant` { target, on, side }, `foretell` { source, target, pinned, turnIn, skill, moved? }, a `telegraph` with `foretell: true` (the
  help text; `SKILLS.last_prophecy.foretold` is the flag for the `SIGNATURE_TECHS` row), `foretell_broken` { source, target, reason: turned
  | break | gone }, `foretell_fall` { source, target }, then an `action_start` with `charged: true` (clears the telegraph).

### 13.3 The Mirage Knight (ai `mirage_knight`) and the Sand Oracle (ai `oracle`)

- **Knight**: Mirror Turn (data) keeps it Ascendant on natural Turns, so only a Turn the party makes catches it Exposed (Mira's tip). Horizon
  Cleave announced at the end of every 3rd turn. At 50%, once: "The Knight's mirror steps out beside it!" (kind `double`), `summon`
  `mirage_double`. Loot: Horizon Glass, 1 rare (ilvl 23), 2 Hi-Potions. Encounter: no flee, flag `knight_defeated`, backdrop `ep5_gallery`.
- **Oracle 1 The Read Sky** (HP locked at 72%). **2 False Futures** (from 72%): `summon` Hunger and Fear, kind `veil`; under the Mirage Veil
  it takes 15% damage, its shields hold and its HP stops at 34%. The last future down tears the Veil (kind `veil_break`, `phase` 3, `break`,
  +25 `fury_gain` reason `veil_break`). **3 The True Horizon**: weak ice, spear, light; no resists; 9 shields; Haste; mirrors; the Sandstorm
  every 4th turn (the first a turn early). Every `phase` event carries `sprite` (`oracle`, `oracle_futures`, `oracle_true`). The Last
  Prophecy is read at the end of an Oracle turn when the Turn is 3 actions away or less and nothing is pinned: the hero first, then the
  lowest HP. The Turn then waits for the words (E5-fixes A2, PLAYTEST_REVIEW_7 item 2): it is set to exactly `READ_AT` (3) actions out,
  and sky.js `holdForMira` keeps it past Mira's next turn, at the read and after every action until she has acted (a Dread push
  included), so a reading never lands before the member who can answer it has had a turn. The False Futures stand at scene.js
  `FUTURE_SPOTS` (Hunger 194,116; Fear 240,134), on the foes' side in front of the Oracle, each row under its own feet (CRITIQUE_7 item 2). A Break cancels it; Answer does not ("A foretelling is not a decree. Nothing is written yet.", kind `foretell_answer`).
  Encounter: no flee, flag `oracle_defeated`, music `boss_oracle`, backdrop `ep5_oracle`, `startFury` +20 with `moonwell_woken`. Loot: The
  Oracle's Mask, 2 rares (ilvl 24), a Phoenix Feather, 2 Hi-Ethers.

### 13.4 Auto (`POLICY_EXT`, careful play only)

`ep5Policy` returns null unless the battle has a sky. 1. A foretelling pinned: Mira turns the sky when the Turn is 2 actions away or less, or
when her next turn would come after it; when Mira cannot, anyone holds it with Hourglass Sand on the last action. 2. More foe HP Ascendant
than Exposed, the Turn 4 or more away, and Mira keeps 24 MP after it: she turns it. While Mira owes a pinned reading its answer nobody
takes her into a combo (it would spend her turn: before E5-fixes most careful-play falls were Ember Edge and Thorn Bulwark). 3. A foe Exposed one hit from Broken, the Turn 1 away:
Hourglass Sand. 4. Against the Oracle Mira keeps 12 MP (an MP action that would spend it becomes an Attack; under 12, an Ether). Reckless
and attack-only play never turn or hold the sky. Careful play against the Oracle (Lv 24, after E5-fixes): 2.4 readings a fight, 91% broken by Turn
the Sky, 8% by a Break, 0% fall; 5.1 Turn the Sky casts and 0.1 Hourglass Sand a fight (before: 2.5, 87%, 4%, 7%, 5.1, 0.6).

### 13.5 Items, loot, shops

Tier 9 (ilvl 21) and tier 10 (ilvl 23) as plan 7.2; uniques and the Nomad's Way set as 7.3, except The Veiled Star: "evade" has no party
rule, so it carries DEF +5 (with SPR +8 and Nameless resist 50%). Affixes: a seventh tier at ilvl 22. `RARE_NAME_EXT` gains [22: Sunlit,
Starborn, Shaded, Wayfaring, Foretold] (`loot.js`). ZONE_LOOT: ship and road ilvl 21 (0.16), F1 22 (0.17), F2 23 (0.17), F3 24 (0.18).
Shops: `pathkeeper` (Omar, road prices), `saffron_supplies` (Yasmin), `copperwind` (Hassan; the tier 8 weapons too, tier 10 after
`lab_f2_done`).

### 13.6 Simulator and the final table

`tools/sim/ep5.mjs`: `registerData()` registers the ep4 and ep5 battle data plus `SIM_HOUR`, a `RULE_EXT` hook that sets each zone's field
hour (`ZONE_HOURS`); one added line in `simulate.mjs` (the `EP5` attach, which also chains its progression and check onto Episode 4's) and
`EPISODES[5]` in the default zone list. Loadouts: `ep5_ship` is the quick start's party (`EP5_START`, without the plan's two tier 8 pieces);
the road adds Hourglass Sand; F1 Dunewalker Mail, Starweave Robe and `sky_learned`; F2 Nomad Wraps; F3 the Copperwind Sword and Armillary
Rod; the Oracle Horizon Glass and mastery a step up. Progression from 8,900 EXP, every fight: ship 21, road -> 22, F1 -> 23, F2 -> 24
(11,888), F3 24, the Oracle at 24 -> 25; at 80%: the Oracle at 24 (12,008). Well F3 (Lv 23): careful HP lost 19%, attack-only wins 72%.
Battle gold: 3,200 in, 8,930 earned, 12,130 out.

| Zone | Careful: win / rounds / HP lost | Attack-only: win / rounds |
|---|---|---|
| ep5_ship | 100% / 3.79 / 6% | 100% / 7.28 |
| ep5_caravan_road | 100% / 3.45 / 6% | 100% / 6.64 |
| ep5_lab_f1 | 100% / 3.65 / 9% | 100% / 6.92 |
| ep5_lab_f2 | 100% / 3.83 / 5% | 100% / 8.01 |
| ep5_lab_f3 | 100% / 4.24 / 18% (Lv 23: 19%) | 82% (Lv 23: 72%) / 8.81 |

| Boss | Lv | Careful: win / rounds (p10-p90) / HP lost | Attack-only | Ignoring telegraphs |
|---|---|---|---|---|
| **mirage_knight** | 23 | 100% / 8.75 (7.3-10.3) / 8% | 0% / 4.56 | 86% / 11.53 |
| **mirage_knight** | 24 | 100% / 8.68 (7.3-10.3) / 7% | 0% / 4.95 | - |
| **oracle** | 24 | 99% / 13.14 (10.3-16.3) / 23% | 0% / 5.56 | 79% / 14.71 |
| **oracle** | 25 | 100% / 12.88 (10.0-15.7) / 21% | 0% / 5.96 | - |

### 13.7 E5-fixes (2026-11-09: CRITIQUE_7, PLAYTEST_REVIEW_7)

- **The menu casts a skill with no target** (`src/battle/scene/menu.js`, the one core change): the sub-list confirm returns the action
  when `b.targets()` says `mode: 'none'` (before, startTarget refused it and the menu buzzed, so Turn the Sky could not be cast by keys
  or touch; every bot acts through battleAct or Auto). Turn the Sky is the only party skill with no target in any episode. Paid in the
  same file by two comment trims (menu.js 5273 to 5258 gz). Proof through the menu: `qa/battlescene/ep5_menu_cast.test.mjs` (keys, taps,
  the pinned reading, every no-target party skill) and `qa/realplay/ep5battle.py` (real keys, the A button, canvas taps).
- **The reading is fair** (13.3): the Last Prophecy 280% -> 320% so ignoring telegraphs still costs 15+ points with the longer windows.
  The help line names who can answer: "Mira can turn the sky." only when her turn comes before the Turn and she can cast, else
  "Hourglass Sand holds the sky." with sand in the bag, else nothing (scene.js `answerLine`, ai.js `miraAnswers`).
- **Day is its own sky** (CRITIQUE_7 item 1): scene.js `paintDay` builds the Day copy from the stage's pixels: the warm grade, then
  over each stage's sky (`DAY_SKY`) the stars and the moon's path come down (a 5 x 5 grey opening finds small bright specks on a cool
  ground), the moon circle takes its row's sky, and the sky is repainted pale blue overhead to pale gold at the horizon with the
  painting's light and dark kept; the deck's sea turns turquoise. The gallery is indoors: the grade alone. About 30 ms once a battle.
- **Turn the Sky's icon** (CRITIQUE_7 item 10): a 12 x 12 sun and crescent drawn by scene.js on its Tech row (the core's hitIcon has
  none for a skill with no target).
- **Day is clear daylight, not a veil** (E5-finish): the warm grade (multiply `#ffcf8a`, then screen `#ffe2a6` at 0.56) lifted
  every dark to about 0.55 and read as a milky wash over the dunes and the Oracle's city. The pixel path is now `DAY_TONE` in OKLab:
  lightness 1 - (1 - L)^1.55 (darks lift, the painting's light and dark kept), violet to magenta (not blue) turned toward warm rock
  by 0.6 of its coolness with its chroma muted up to 45%, everything else at its own chroma, a small warm cast. Blue water and
  painted windows stay blue. The multiply and screen stay only as the fallback when the stage's pixels cannot be read. Foes still
  read: E5-tiles' check (share of a foe's body more than 0.12 OKLab from the ring round it) is 0.611 at worst by Day (the Well's
  husk; aim 0.6), the dunes' reaver 0.775 -> 0.749, the Oracle 0.95 -> 0.877 (its night value).
- **The Oracle with every optional fight** (E5-finish, PLAYTEST_REVIEW_7 item 3): no data change. The Lv 26 Continue run had
  fought 23 ordinary fights against 17 placed foes: its own save-and-reload check at F1 brings a dungeon floor's beaten foes back
  (field.js keeps them gone for the scene's life), and `--all-fights` hunted them again. Every placed foe once from the Episode 4
  save is 9,746 + 3,829 = 13,575 EXP before elites (Lv 25 spans 12,989 to 14,224). `qa/autoplay.py --all-fights` now hunts each
  placed foe once (foes back after its reload are not hunted); the run met the Oracle at Lv 25 (14,021 EXP, 21 battles, 2 elites).
  A data cut cannot cover the reload case: it needs about 240 EXP off the run, and the quick start's 80% route has 194 EXP over
  Lv 24 at the Oracle. Oracle by level (200 fights): Lv 25 careful 100% / 13.05 rounds, ignoring telegraphs 92%; Lv 26 98%.

### 13.8 Seams this pack would like (none blocks Episode 5)

- `src/battle/rules.js` useSkill(), after the effects: `for (const h of RULE_EXT) if (h.skill) h.skill(ctx, user, sk, targets)`. Today
  Turn the Sky reaches sky.js through `{ keep: 'sky' }` (applyEffect hands `keep` to ai.js special(), the user's script, `basic` for a party
  member, which sky.js gives a `special` that answers only `e.sky`). `SKY_RULE.skill` is ready; each action is applied once.
- `src/battle/rules.js` targetInfo(): an item `target: 'none'` would let Hourglass Sand skip the ally picker.

## 14. Episode 6: The Skybound Isles (E6-battle, wave 6a)

Design: `docs/EPISODE6_PLAN.md` sections 6 and 7. Everything is pack data and pack code (`src/data/ep6/{enemies,encounters,items,loot,shops,
skills,ai,gale}.js`, each an idempotent `register()` the pack entry calls in its ORDER; `gale` must come after `encounters` and after the
ep5 pack's `sky`); no core file changed (`RULE_EXT` is Episode 5's seam). `simulate.mjs --check` passes all six episodes; `--cave --check`
and `--tier 1 --check` unchanged.

### 14.1 Enemies (final numbers after tuning)

Every foe has a wind (`aloft` rides the Gust, `ground` is blown back). Ordinary EXP about 100 a head; the three-foe groups carry an
`expMul` (F1 sprites 0.65, F2 mixed 0.6).

| Enemy | Wind | Lv | HP | ATK/MAG | DEF/SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (telegraph in bold), trait |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Squall Wolf | ground | 25 | 760 | 175/20 | 30/22 | 20 | 2 | fire, spear | ice | 95 / 160 | Bite, Howl (allies ATK +20%); evade 10% |
| Gale Sprite | aloft | 25 | 640 | 90/165 | 18/32 | 18 | 2 | thunder, spear | ice, bow | 90 / 160 | Slap, Whirl (party mag 70%) |
| Rigger Beetle | ground | 25 | 600 | 165/18 | 44/24 | 9 | 4 | thunder, axe | sword, bow | 100 / 170 | Mandible, Clamp (Protect), Rivet (DEF +30%) |
| Signal Wraith | aloft | 26 | 640 | 78/175 | 22/36 | 15 | 3 | light, fire | ice, thunder | 100 / 180 | Static (single mag 150%), False Signal (Silence 25%), Drain |
| Storm Harrier | aloft | 26 | 600 | 175/30 | 26/26 | 22 | 3 | bow, ice | thunder | 100 / 180 | Talon, Dive (single phys 160%); flying, evade 15% |
| Lightning Manta | aloft | 26 | 680 | 82/180 | 22/38 | 16 | 3 | ice, bow | thunder, fire | 105 / 190 | Shock (Stun 15%), **Thunder Glide** (party mag 130%, first 2, every 3) |
| Storm-Marked Page | aloft | 27 | 640 | 100/185 | 20/40 | 17 | 3 | fire, light | thunder, ice | 100 / 200 | Margin Cut, Smudge (party mag 95%, Blind 15%), **Overwrite** (single mag 200%) |
| The Gale Engine | ground | 26 | 1750 | 750/200 | 42/24 | 14 | 7 | thunder, axe | ice, bow | 240 / 1000 | Fan Blade (40%), Piston (party 25%); Bellows (the Gust every 3; Braced against its own Gusts while they run); **Full Blast** (party phys 170%, pinned to the Gust, then three clear Gusts); two Gale Sprites at 50%; immune Silence |
| The Storm Scribe | aloft | 27 | 3900 | 520/520 | 32 (x1.4 armored)/30 | 15 (+ Haste in phase 3) | 8 / 8 / 9 | by phase | ice, thunder (phases 1, 2) | 1300 / 1600 | Quillstorm (party phys 130%), Ink Squall (single mag 150%, Blind 20%); **Rewrite the Course** (pinned); **Thunderhead** (party mag 170%, Stun 20%); immune Stun, Poison, Blind |
| The False Beacon | aloft | 27 | 560 | 200/200 | 22/28 | 14 | 2 | fire, light | thunder | 0 / 0 | False Light: Covers the Scribe every turn |
| The Broken Compass | ground | 27 | 520 | 200/200 | 26/26 | 13 | 3 | axe, thunder | ice | 0 / 0 | Spin (the soonest member half a turn back); Misdirect on Bram every 3rd turn (Silence 40%) |

The Eye of the Storm (the tightest ordinary floor): `encounters.js` `O3_POWER` pages 1.7, manta 1.8, mixed 2.8; `O3_SPEED` 1.45, 1.4,
1.9; `O3_HP` 1.0, 1.0, 1.05.

**What moved from the plan, and why.** Ordinary ATK and MAG about +30% (wolf 130 to 175, sprite MAG 120 to 165, wraith 132 to 175,
page 150 to 185): at the plan's numbers the Lv 25 to 27 party lost 2 to 10% HP a fight and attack-only play won everything; the beetle's
DEF 54 to 44 and HP 680 to 600 (it took 5.5 rounds). The bosses' ATK and MAG roughly tripled and doubled (the Engine 165 to 750, the
Scribe 230/235 to 520/520) and their HP fell (the Engine 3000 to 1750, the Scribe 5600 to 3900, the Beacon 720 to 560, the Compass 660
to 520): at the plan's numbers a pinned move that landed cost tempo but no fights, so ignoring the telegraphs cost 0 points, and careful
play took 11.5 and 17.7 rounds. Full Blast 140% to 180% and the Engine's SPD 11 to 14 (blown back on every 3-action Gust, it acted too
rarely to blast). Careful play heals through single-target pressure, so F3 is tight only through spread damage: the Page's Smudge became
party-wide (plan: single, Blind 25%). EXP: the Page 110 to 100, the Manta 110 to 105, the Engine 260 to 240, the three-foe groups' `expMul`
0.7 / 0.65 to 0.65 / 0.6, so every fight still meets the Scribe under Lv 28. The Gust (5) and the push (0.35), knobs 1 and 2, did not move.

### 14.2 The Gale (`src/data/ep6/gale.js` on `RULE_EXT`)

- A battle has a Gale only when a foe has a `wind` (`state.gale`, saved with the battle state). No encounter field (the `rollEncounter` and
  `rules.js` double-entry trap is avoided); `GALE_START` (`encounters.js`) names the first Gust only for `e6a_first` (in 3).
- The Gust falls after 5 actions (every ended turn, a combo is one), or every `gustEvery` (3) while the Gale Engine stands and its bellows run.
  Every Aloft foe that is not Broken rides it (0.35 of its base delay sooner); every grounded foe and party member is blown back 0.35 unless
  Braced (`u.defending`: Defended since its last turn, or a Ballast Stone's brace); an Anchored party catches it (each member 0.35 sooner).
  A Broken Aloft foe is Grounded.
- **The negative-push check.** `delayUnit(u, -f)` has no floor: a unit less than f of a turn from acting lands before `state.now` (seen in
  the test: next 41 and 59 against now 78). `advance()` never moves time back, so it would just act next, but the timeline would show a
  time in the past and two such units could swap for no visible reason. So every ride and catch is `delayUnit` with the fraction clamped
  to the unit's room (`push()`): a unit about to act stays put, the rest keep their order. The plan's fallback (Aloft foes not moved) is
  not needed (`RIDE = true`).
- **Pinned moves** (`pin()`): Rewrite the Course and Full Blast are not charges. They are pinned to the Gust marker exactly 2 actions out and
  never before Bram's next turn (`holdForBram`, at the pin and after every action until he has acted, a Spin push included). When the Gust
  falls: Anchored, it fails ("The course holds.", sfx `rewrite_break`) and its owner goes back a full turn (the party's double turn). Else
  the Rewrite sends every member back a full turn (Braced: half) and the Scribe acts at once; the Blast strikes the party (phys 180%,
  Defend halves) and sends every member back a full turn (Defending: none; Ballast: half). A Break of its owner cancels it; so does its fall.
- **Anchor** (`anchor_line`, Bram, 14 MP, rank 80, `target: 'none'`, `learn: { flag: 'anchor_learned' }`, fallback 26): the party is Anchored
  through the next Gust. It reaches gale.js through `{ keep: 'gale', gale: 'anchor' }` (the 13.8 bridge: `basic.special` answers `e.gale` and
  passes the rest on to Episode 5's sky bridge). For E6-scene-ui: its target kind is `none` (the menu's E5-fixes A1 path); its
  `SIGNATURE_TECHS` row is `{ unit: 'bram', flag: 'rewrite', skill: 'anchor_line' }`.
- **The Ballast Stone** (`ballast_stone`, 150): braces through the next Gust. rules.js tells a rule which unit acted, not whom its item went
  to, so it braces the member who uses it (14.8).
- **Answer, Turn the Sky.** Answer on the owner of a pinned move is a plain light hit and says "A course is not a decree." (kind
  `rewrite_answer`). Turn the Sky in a Gale with no sky says "The wind is not the sky." (kind `rewrite_sky`) and changes nothing.
- **Turn the Sky with no sky** (checked 2026-11-09): in a battle with no sky (an Episode 1 to 4 revisit, the cave, the tier, every Episode 6
  battle) it was listed, enabled, and spent Mira's turn and 12 MP on "There is no sky to turn here.". `SKILL_GATE` (a `RULE_EXT` start, after
  the sky and the Gale start) takes it out of that battle's copy of Mira's skills (the saved member keeps it), with `state.gated` = [{ unit,
  skill, reason: 'No sky to turn.' }]; Anchor with no wind likewise ("No wind to hold."). Episode 5 is untouched (every Episode 5 battle has
  a sky). `gale.js gateCommands(b, unit, cmds)` returns the list with each gated row put back, disabled, with its reason: the scene shows
  it by wrapping `battle.commands` (E6-scene-ui; `src/scenes/battle.js`'s vow view is the pattern). No core line.
- Events: `gale` { gustIn, every, reason: start | action | bellows | hold }, `gust` { pushed: [{ target, amount, ticks }] }, `aloft` { target,
  on }, `anchored` { targets, on, by? }, `braced` { target, on, by: 'ballast' }, `rewrite` { source, pinned, gustIn, skill, moved? } plus a
  `telegraph` with `rewrite: true` (`nextTurn` = actions to the Gust), `rewrite_broken` { source, reason: anchor | break | gone, skill },
  `rewrite_land` { source, skill } then an `action_start` with `charged: true`, `telegraph_cancel` when a pin ends early. Message kinds
  `gust`, `anchor`, `ballast`, `rewrite_broken`, `rewrite_land`, `rewrite_answer`, `rewrite_sky`, `bellows`, `vents`, `ward`, `ward_break`,
  `blessing`.

### 14.3 The Gale Engine (ai `gale_engine`) and the Storm Scribe (ai `scribe`)

- **Engine**: Bellows from the start (the Gust every 3); a Break stalls them for 2 of its turns ("The bellows stall!") and cancels a pinned
  blast. Full Blast pinned whenever the Gust is 2 actions away or less and nothing is pinned ("The Engine winds the bellows... It blasts when
  the wind gusts."). At 50%, once: two Gale Sprites (`summon`, reward 0, Aloft). Loot: Bellows Heart, 1 rare (ilvl 26), 2 Hi-Potions.
  Encounter: no flee, flag `engine_defeated`, backdrop `ep6_relays`.
- **Scribe 1 The Wind Script** (HP locked at 68%): armored (a DEF x1.4 mod, source `armor`). **2 The Storm Script Ward** (from 68%): `summon`
  the False Beacon and the Broken Compass; the ward: 20% damage, shields locked, HP stops at 33%. The last light down tears it (kind
  `ward_break`, `phase` 3, `break`, +25 `fury_gain` reason `ward_break`). **3 The True Sky Chart**: armor gone, weak fire, spear, light, no
  resists, 9 shields, Haste, Thunderhead every 4th turn (the first a turn early; a charge, so Defend or Break; Anchor does not stop it).
  Rewrite the Course in every phase. `phase` events carry `sprite`: `scribe`, `scribe_ward`, `scribe_chart`. Encounter: no flee, flag
  `scribe_defeated`, music `boss_scribe`, backdrop `ep6_eyrie`, `startFury` +20 with `beacon_lit`. Loot: The Scribe's Quill, 2 rares (ilvl
  27), a Phoenix Feather, 2 Hi-Ethers.

### 14.4 Auto (`POLICY_EXT`, careful play only)

`ep6Policy` returns null unless the battle has a Gale. 1. A move pinned: Bram Anchors when the Gust is 2 actions away or less, or when his
next turn would come after it; when he cannot, the member on turn Defends against a Full Blast, and Mira holds a Ballast Stone against a
Rewrite. While Bram owes a pin its answer nobody takes him into a combo. 2. The Gust 1 or 2 away, Aloft foes outnumber grounded ones, and
Bram keeps 28 MP: he Anchors. 3. The Gust 1 away and a member under 35% (not Mira): Defend. 4. Against the Engine and the Scribe, Bram keeps
14 MP for Anchor. Reckless and attack-only play never Anchor, brace or use a stone. Careful play, the Scribe at Lv 27: 2.2 Rewrites a fight,
79% broken by Anchor, 6% by a Break, 12% land; 2.6 Anchors and 0.3 Ballast Stones a fight. The Engine at Lv 26: 1.1 Full Blasts a fight,
88% broken by Anchor, 2% by a Break, 4% land.

### 14.5 Items, loot, shops

Tier 11 (ilvl 25) and tier 12 (ilvl 27) as plan 7.2; uniques and the Skyhands set as 7.3 (every stat named is a party stat). The Sky
Compass carries `descAfter: { flag: 'compass_restored', desc }` for its steady desc (the item view must read it). Affixes: an eighth tier
at ilvl 26. `RARE_NAME_EXT` gains [26: Windborne, Stormwrit, Anchored, Highflown, Ballasted]. ZONE_LOOT: the Airstair and F1 ilvl 25
(0.17), F2 26 (0.18), F3 27 (0.18). Shops: `winch` (Bennet, peddler prices), `aeris_provisions` (Nova; Hourglass Sand when the ep5 pack has
registered it), `galewing` (Ilex; the tier 10 weapons too, tier 12 after `obs_f2_done`).

### 14.6 Simulator and the final table

`tools/sim/ep6.mjs`: `registerData()` registers the ep4, ep5 and ep6 battle data; the `EP6` attach line in `simulate.mjs` (chaining its
progression and check onto Episode 4's, as Episode 5 does) and `EPISODES[6]` in the default zone list (two lines; that file is CRLF and
kept so). The quick start's EXP is read from `src/data/ep6/start.js` `EP6_START` when it exists (else the plan's 13,300). Loadouts: the
Airstair is `ep5_lab_oracle` plus the Oracle's Mask (Mira), the Caravan Compass and Sunplate Mail (Bram), the Sunplate Helm (hero); F1 +
Skysteel Mail, Windweave Robe and `anchor_learned`; F2 + Skyhand Boots (Bram); F3 + the Galewing Sword and Compass Rod; the Scribe + Bellows
Heart and mastery a step up; 2 to 4 Ballast Stones. Progression from 13,300, every fight: the Airstair 25, F1 -> 26, F2 -> 27, F3 27, **the
Scribe met at Lv 27 with 16,834 EXP: 53 under Lv 28 (16,887)**; at 80%, 16,175 (Lv 27). The Eye of the Storm (Lv 27): careful HP lost 19%,
attack-only wins 76%. Battle gold: 3,600 in, 9,230 earned, 12,830 out.

| Zone | Careful: win / rounds / HP lost | Attack-only: win / rounds |
|---|---|---|
| ep6_airstair | 100% / 3.07 / 8% | 100% / 7.03 |
| ep6_obs_f1 | 100% / 3.98 / 12% | 100% / 8.62 |
| ep6_obs_f2 | 100% / 3.94 / 7% | 100% / 8.90 |
| ep6_obs_f3 | 100% / 3.41 / 19% | 76% / 6.34 |

| Boss | Lv | Careful: win / rounds (p10-p90) / HP lost | Attack-only | Ignoring telegraphs |
|---|---|---|---|---|
| **gale_engine** | 26 | 100% / 8.88 (7.3-10.3) / 13% | 0% / 3.48 | 43% / 6.59 |
| **gale_engine** | 27 | 100% / 8.84 (7.3-10.3) / 12% | 0% / 3.73 | - |
| **scribe** | 27 | 97% / 14.55 (12.0-17.7) / 17% | 0% / 4.38 | 64% / 12.65 |
| **scribe** | 28 | 96% / 13.91 (11.3-16.7) / 20% | 0% / 4.69 | - |

**E6-fixes (2026-11-10, PLAYTEST_REVIEW_8 items 1, 4, 6).** The Engine was blown back by its own bellows Gust every 3 actions
and acted twice a fight. `gale.js ownsWind`: a foe whose data has `gustEvery` is Braced against its own Gusts while its bellows run
(a Break stalls them, and a stalled Engine is blown back like any grounded foe). Acting every turn, it hit too hard: Fan Blade 110
to 40, Piston 70 to 25, Full Blast 180 to 170, and `ai.js ENGINE_TUNE.blastGap` 3 (after a blast lands or breaks, three Gusts pass
clear). Now (400 fights a row) careful Lv 26 100% / 8.94 rounds / 14% HP lost, Lv 27 100% / 8.72; reckless 71%; attack-only 0%;
1.8 Full Blasts and about 4 Engine turns a fight (was 1.1 and 2). Attack-only does not reach the review's 20 to 40%: it needs
about 30 plain attacks into 1,750 HP with no healing while the two Gale Sprites ride every Gust, and even the Engine at a fifth of
its ATK left it at 0%; the levers are the Engine's HP and the sprites (`enemies.js`, outside this pass). The Eye's manta pair now
pays `expMul` 0.6 (205 to 123 a fight): the Scribe is met with 16,670 EXP at 100% of the fights, 217 under Lv 28 (was 53). Tier 11
prices about 30% down (bodies 4,300 / 4,200, helms 2,100, boots 1,800, mantle 1,750, charms 1,550) so the arrival gold buys two
pieces. The Defend row's help in a Gale battle reads "Brace against the gust." (scene.js menu wrap). The Scribe's first Rewrite comes on its second
turn at the latest (`ai.js FIRST_REWRITE_TURN`, item 10; it pulls the Gust in to 2): careful Lv 27 98% / 14.73 rounds / 16% HP lost,
Lv 28 98% / 14.14, reckless 63%, attack-only 0%; 2.59 Rewrites a fight, 87% broken by Anchor (was 2.17 and 79%).

**The Engine's attack-only 0% stays (2026-11-10, after the ship).** The HP lever was tried (`--zone ep6_obs_f2`, 200 fights a
row): HP 1,750 / 1,500 / 1,350 / 1,200, each at ATK 750 and 600, left attack-only at 0% every time, and it fell sooner as HP
dropped because the two Gale Sprites come at 50% HP; ATK 650 to 470 alone also left it at 0% and pushed "ignoring telegraphs"
under its 10% floor. More to the point, attack-only wins 0% against every main boss since Episode 1 (Archivore, Nameless King,
Cinder Warden, Barrister, Paper Regent, Mirage Knight, Oracle, Scribe; `out/full_check.txt`); only the optional Whisperwood
Alpha is tuned to let it through. A 20 to 40% Engine would be the one soft main boss in six episodes, so PLAYTEST_REVIEW_8 item
1's second half is closed as matching the house rule. Changing that rule for all bosses is a call for Scott and Stephen.

### 14.7 Tests

`qa/battle/ep6_battle.test.mjs` (17): registration and idempotence, Episodes 1 to 5 untouched (an Episode 4 and an Episode 5 boss replay
bit for bit), the negative-push check, the Gust's pushes, Defend and Ballast, Anchor, a Rewrite landing and failing, holdForBram, Answer and
Turn the Sky against a Rewrite, Turn the Sky with no sky, the Engine, the Scribe's phases, Bram's two tips' levers, Auto, items, purity.
`qa/battle/ep6_sim.test.mjs` (2): the suite at 100 fights and the EXP curve.

### 14.8 Seams this pack would like (none blocks Episode 6)

- `src/battle/rules.js` doItem(): hand the item's target to `RULE_EXT` (`h.item(ctx, user, it, target)`), so a Ballast Stone braces the ally
  it is used on (today: its user).
- `src/battle/rules.js` commands(): a `RULE_EXT` `commands(ctx, unit, list)` filter, so Turn the Sky with no sky could stay listed and
  disabled ("No sky to turn.") without the scene's wrap (today: `SKILL_GATE` plus `gateCommands`).
