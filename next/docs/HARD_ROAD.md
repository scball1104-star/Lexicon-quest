# Hard Road: difficulty tiers after the credits (proposal only)

Written 2026-10-26 by H3-vows, for Scott. Status: PROPOSAL. No code, no flag, nothing built. Scott's words
(`docs/RESPONSIBILITY_ARC.md` 7 C): "difficulty settings that unlock after successfully completing the game. Like how
Diablo does? Harder difficulty means better XP and better loot and better equipment in shops. Not sure if it works for
us or not." This page answers that question. Every default below is marked Inference; the levers are Fact (read from
the code today).

## The short answer

It works mechanically and it is cheap: every lever a harder, better-paying tier needs already exists (foe numbers,
an EXP scale, item level, rarity weights, affix tiers by item level, flag-gated shop stock), so a tier is tables plus
a balance proof, not a new system. What it does not give us by itself is Diablo's reason to replay: the loot chase.
Fact: 42 equipment bases over tiers 1 to 6, 12 legendaries that are placed by the story and never rolled, 6 set pieces
in 2 sets, and random tables that roll common, magic and rare only. Diablo II has hundreds of uniques and runewords
and a randomized map; we have a short, linear story (Episode 1 is tuned to 60 to 90 minutes; the three episodes
together are about 4 to 5 hours). So a tier as described is a New Game Plus that pays better, played once or twice,
not a treadmill. Inference: it becomes a real chase only if the harder tier opens what the base game never rolls,
legendaries in the random tables (the twelve that exist, plus a handful made for the tier). My recommendation: build
ONE tier, with rollable legendaries on it, and watch whether Scott and two testers start a second lap. A second tier
only if the first earns it.

## The unlock (Inference)

A "Hard Road" row on the title under Continue, shown once any slot holds the latest live episode's complete flag
(`ep2_complete` today, `ep3_complete` when Episode 3 ships), the way the "Episode 2: new party" row appears on
`ep1_complete` (Fact: `src/scenes/title.js`). Picking it asks which completed record to carry, writes the run to its
own slot (the Episode 3 runs already do this), and starts Episode 1 from the top on the tier.

## What changes on a tier, lever by lever

| Lever | Exists today (Fact) | A tier needs (Inference default) |
|---|---|---|
| Foe numbers | Each foe is a record of hp, atk, def, mag, spr, spd, luk (`src/data/enemies.js`); units are built in `rules.js makeEnemyUnit` | One flat multiplier set per tier applied at unit build (Tier 1: HP x1.6, ATK and MAG x1.35, SPD +1; Tier 2: x2.2, x1.7, +2). One option on the battle, a 6-number table. Proof: the sim run at the carried party's level with the tier on; targets stay DESIGN 7's 3 to 5 rounds, bosses 8 to 12 |
| EXP | `src/data/expcurve.js scaleExp(raw, episode, expMul)`: a per-episode scale and a per-encounter multiplier, both x1 | A tier multiplier in the same product (Tier 1 x1.5, Tier 2 x2): one constant and the plumbing to read the save's tier. Enough |
| Drop item level | `loot-tables.js ZONE_LOOT` ilvl per zone (2 in the valley to 16 in the Foundry); `rollBase` takes any base with ilvl at or under the cap; `tierFor(affix, ilvl)` unlocks higher affix tiers as ilvl rises | ilvl +6 per tier on every zone, capped at the last live episode's top (16). Affixes need nothing new. Careful: a higher cap lets Episode 1 foes drop Episode 2 and 3 bases, which IS the "better equipment", and also the reason for the cap |
| Rarity | `RARITY_TABLES`: normal 70/25/5, elite magic 70 / rare 30, boss rare 100, chests by tier; legendary weight 0 everywhere | A per-tier table (five rows): Tier 1 normal 50/35/15, elites rare 60 / legendary 5, bosses rare 85 / legendary 15. This is the one new table and the one lever that creates a chase |
| Shops | `src/data/shops.js` stock rows gated by `ifFlag` (one flag or a list) | A `tier_1` flag on the save gates new rows: tier 4 to 6 bases in Willowmere and the Hollow at tier prices. Data only; `checkEconomy` in the sim must still pass with the higher EXP and gold |
| Vows | Opt-in at every rest (`docs/VOWS.md`) | Unchanged. Offered at every rest as in the base game, never forced |

## What carries over

Inference default, as Diablo carries the character: levels, EXP, mastery, gear, the bag, gold, the Ledger of Names
(kept names stay kept; the tier adds no names) and the vows kept. Story flags reset. Mira and Bram would wait in the
save's `reserve` list (it exists, unused in Episode 1) until their join scenes, so the story still introduces them.
The alternative: a fresh Lv 1 party at the harder tier. Cheaper to balance (the base sim with the multiplier), harsher,
and it throws away the point, since better loot only matters to a character who keeps it. My pick: carry.

## What it costs to build (agent terms)

One tier with a carried character: about a week of one agent. Title row, record choice and save plumbing (a day);
the tier field read by the five levers (a day); the five tables (half a day); the sim's `--tier` switch and two or
three balance passes (two days); shop rows and the economy check (half a day); the autoplay bot through Episode 1 on
the tier (a day); a critic pass. Rollable legendaries on the tier: half a day plus their balance. A second tier is one
more day once the first is table-driven. Nothing here touches the published game until Scott's explicit yes.

## The one risk

The story is short and linear, so a second lap is the same lap with bigger numbers, and the replay value rests
entirely on the loot depth. Today that depth is thin (the counts above). Without rollable legendaries and a few new
ones made for the tier, I expect the tier to be played once, by Scott, out of curiosity. With them there is a small,
honest chase. I would not promise Diablo's hundreds of hours either way; the honest frame is a New Game Plus that pays.

## The three questions only Scott can answer

1. Carry the character into the tier (my default), or start a fresh party at the harder tier?
2. One tier or two? (My default: one, and a second only after the first is played.)
3. A name. Working name: Hard Road. In the game's own voice: The Second Toll, or The Long Way.

## Scott's answers (2026-10-27, verbatim)

> 1. Default, carry the character into the tier.2. Default3. let's keeping trying to come up with a better name.

So: the character is carried; one tier; the name is open. Status: APPROVED TO BUILD as `docs/briefs/H7-hard-road.md`
(queued behind the Deep Stacks critic and fixes under the usage guard). Name candidates offered 10/27, in the game's own
words: Second Edition, The Unabridged, Red Ink, Fine Print, The Second Toll, The Long Way. Until he picks, the strings
say "Hard Road" in one place (`text.js` TIER).

**Name, Scott 2026-10-27, verbatim:** "For the name question: I think I like Fine Print" The tier is **Fine Print**.
