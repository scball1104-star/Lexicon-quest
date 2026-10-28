// The Deep Stacks (docs/DEEP_STACKS_PLAN.md 2.6, 6.2, 13 E): sixty cave uniques in three grades, the Binder's Quill and the
// Keeper's Bookmark. The pack's register() adds them to UNIQUES, KEY_ITEMS and ITEMS the way src/data/x1/items.js does; nothing
// edits items.js.
//
// Scott, 2026-10-27 (plan 13 E): weak uniques likely on shallow floors and strong ones unlikely, the odds reversing with depth, and
// enough of them, of different strengths and qualities, to equip the whole party in uniques several times over. C4-uniques built it:
//   GRADES       Lesser (item level 5), Greater (10), Named (16): twenty each, so each grade is a full party set (three readers, a
//                weapon and five armour slots each) with two to spare. The grade is said in the first lore line and on the plaque,
//                never as a number in the name. loot.js rolls the grade by floor first (GRADE_ODDS), then a unique of that grade.
//   home band    every grade has four uniques in each of the five bands; a blue chest still leans to the floor's band (blueWeight).
//   strength     each unique out-scores a rolled rare of its grade's item level in its slot for its best wearer, by the game's own
//                role weights (inventory.js weightedGain; status resists count on neither side), and every Lesser beats the
//                Episode 2 start's piece in its slot for everyone who can wear it (qa/cave/uniques_grades.test.mjs holds both).
//
// A cave unique is a legendary with `unique: true, cave: true`, a FIXED affix set (existing affix ids at a fixed tier, folded into
// `stats` at module load so the engine counts them with no new code; `fixedAffixes` keeps the record) and one `prop`: a property
// no rolled item has. CAVE_PROPS says what each prop does and WHO implements it:
//   kind 'stats'   already works: the prop is stat keys the engine reads (resX 100, poisonOnHit, inkRes, fireRes, mpCostDown,
//                  startHaste, crit, furyGain, healPow, lifesteal, an element's Dmg) or extraTypes, at values no affix rolls
//   kind 'loot'    implemented in src/data/cave/loot.js when the caller passes the worn props (bookmarkChance, rollRedChest)
//   kind 'field'   a world hook (world.js HOOKS): +15% move speed in the Stacks, the stairs marked on arrival
//   kind 'battle'  world.js HOOKS.armBattle (battle start in a reading) and rules.js firstBlow: the first blow cannot miss, the
//                  Inkwell's MP, the Standing Grudge's Fury, Quick Study's EXP (their numbers live in that hook, pinned to `value`
//                  here by qa/cave/uniques_props.test.mjs)
//   kind 'state'   a game/cave.js hook (C1-state): one free rise per reading
// A prop may appear at two grades; a prop with a number has one entry per grade (`venom_edge_1`, `_2`, `_3`), bigger deeper.
// A party's active props: `wornProps(members)` below (reads every worn cave unique).
// Vault uniques never sell (`noSell: true`, price 0) and never drop; they ride game.cave.vault (C1-state).

import { KEY_ITEMS, UNIQUES, ITEMS, AFFIXES, EQUIP_SLOTS } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];
const MIRA = ['mira'];

// ---------------------------------------------------------------- grades
/** The three grades ("measures of strength"): the item level the unique is built at and the lore line that names the grade. */
export const GRADES = {
  1: { id: 1, name: 'Lesser', ilvl: 5, line: 'A Lesser gift: a loose page of the Stacks.' },
  2: { id: 2, name: 'Greater', ilvl: 10, line: 'A Greater gift: a page the Stacks bound.' },
  3: { id: 3, name: 'Named', ilvl: 16, line: 'A Named gift: the Stacks wrote its name.' },
};
export const GRADE_IDS = [1, 2, 3];
const QUILL_LINE = 'The Binder\'s own. No chest ever held it.';

// ---------------------------------------------------------------- properties
export const CAVE_PROPS = {};
function prop(id, kind, name, text, o = {}) { CAVE_PROPS[id] = { id, kind, name, text, ...o }; }
const pct = (v) => `${v}%`;
// status proofs: complete immunities (a resist suffix rolls 100 only at item level 7 and up, and only one at a time)
prop('poison_proof', 'stats', 'Poison-proof', 'Cannot be Poisoned.', { stats: { resPoison: 100 } });
prop('blind_proof', 'stats', 'Clear-eyed', 'Cannot be Blinded.', { stats: { resBlind: 100 } });
prop('silence_proof', 'stats', 'Unhushed', 'Cannot be Silenced.', { stats: { resSilence: 100 } });
prop('burn_proof', 'stats', 'Unburnt', 'Cannot be Burned.', { stats: { resBurn: 100 } });
prop('chill_proof', 'stats', 'Unchilled', 'Cannot be Chilled.', { stats: { resChill: 100 } });
prop('clear_proof', 'stats', 'Clear Voice', 'Cannot be Blinded or Silenced.', { stats: { resBlind: 100, resSilence: 100 } });
prop('unwritten', 'stats', 'Unwritten', 'Cannot be Poisoned, Burned or Chilled.', { stats: { resPoison: 100, resBurn: 100, resChill: 100 } });
prop('forge_ward', 'stats', 'Forge Ward', 'Ink and fire attacks do 15% less.', { stats: { inkRes: 15, fireRes: 15 } });
// numbered families: one entry per grade (the suffix), the number bigger at the higher grade, never more than two grades
const family = (stem, name, text, stat, pairs) => { for (const [g, v] of pairs) prop(`${stem}_${g}`, 'stats', name, text(v), { stats: { [stat]: v }, grade: g }); };
// Lesser and Greater: Mira's thrift and the element scripts (every hit of the type does more: rules.js baseHit)
family('thrift', 'Thrift', (v) => `Every skill costs ${v} MP less.`, 'mpCostDown', [[1, 1], [2, 2]]);
for (const [el, stat, name, grades] of [['fire', 'fireDmg', 'Fire Script', [1, 2]], ['ice', 'iceDmg', 'Frost Script', [1, 2]], ['thunder', 'thunderDmg', 'Storm Script', [1, 2]], ['light', 'lightDmg', 'Dawn Script', [2]]]) {
  family(`${name.split(' ')[0].toLowerCase()}_script`, name, (v) => `${el[0].toUpperCase()}${el.slice(1)} attacks hit ${pct(v)} harder.`, stat, grades.map((g) => [g, g === 1 ? 25 : 40]));
}
// Greater and Named: the battle edges
family('venom_edge', 'Venom Edge', (v) => `Hits Poison ${pct(v)} of the time.`, 'poisonOnHit', [[2, 40], [3, 60]]);
family('ink_ward', 'Ink Ward', (v) => `Ink attacks do ${pct(v)} less.`, 'inkRes', [[2, 40], [3, 60]]);
family('fire_ward', 'Fire Ward', (v) => `Fire attacks do ${pct(v)} less.`, 'fireRes', [[2, 40], [3, 60]]);
family('haste_at_start', 'Already Moving', (v) => `Starts every fight Hasted (${v} turns).`, 'startHaste', [[2, 2], [3, 3]]);
family('crit_lean', 'Hairline', (v) => `Critical hit chance +${pct(v)}.`, 'crit', [[2, 15], [3, 25]]);
family('fury_lean', 'Short Fuse', (v) => `Fury fills ${pct(v)} faster.`, 'furyGain', [[2, 50], [3, 80]]);
family('mender', 'Mender', (v) => `Heals it casts are ${pct(v)} stronger.`, 'healPow', [[2, 30], [3, 50]]);
family('leeching', 'Leeching', (v) => `Heals ${pct(v)} of the damage dealt.`, 'lifesteal', [[2, 10], [3, 15]]);
prop('all_scripts', 'stats', 'Full Index', 'Every element hits 25% harder.', { stats: { fireDmg: 25, iceDmg: 25, thunderDmg: 25, lightDmg: 25 } });
prop('quill_leech', 'stats', 'The Binder\'s Hand', 'Heals a quarter of the damage dealt.', { stats: { lifesteal: 25 } });
// weapons that strike as an element (extraTypes: the engine adds the type to the active weapon's hits)
for (const [el, name] of [['fire', 'Burning Edge'], ['ice', 'Quenched Edge'], ['thunder', 'Storm Edge'], ['light', 'Dawn Edge']]) {
  prop(`strikes_as_${el}`, 'stats', name, `Its hits count as ${el}.`, { extraTypes: [el] });
}
// loot: src/data/cave/loot.js reads them from opts.props
prop('bookmark_more', 'loot', 'Dog-Eared', 'Bookmarks turn up half again as often.');
prop('bookmark_twice', 'loot', 'Marked Pages', 'Bookmarks turn up twice as often.');
prop('lent_more', 'loot', 'Owed More', 'Red chests lend gear more often.');
prop('feather_find', 'loot', 'Carried Out', 'Supply chests turn up Phoenix Feathers more often.');
prop('red_rarity_up', 'loot', 'Better Lent', 'Red chests lend one rarity better.');
prop('larder_1', 'loot', 'Warm Larder', 'Supply chests sometimes hold one more find.');
prop('larder', 'loot', 'Kept Stores', 'Supply chests hold one more find.');
// field hooks (world.js HOOKS.moveFrames, HOOKS.stairsDir)
prop('cave_move_plus', 'field', 'Rootbound Step', 'Moves one step further in the Stacks.');
prop('stairs_sense', 'field', 'Downward Sense', 'The way down is marked on arrival.');
// battle hooks (rules.js firstBlow; world.js HOOKS.armBattle, inside a reading only)
prop('first_blow_true', 'battle', 'First Line', 'The first blow each fight cannot miss.');
prop('ink_well', 'battle', 'Inkwell', 'In the Stacks, starts every fight with 4 more MP.', { value: 4 });
prop('fury_floor', 'battle', 'Standing Grudge', 'In the Stacks, starts every fight at half Fury or more.', { value: 50 });
prop('exp_lean', 'battle', 'Quick Study', 'Fights in the Stacks pay 15% more EXP.', { value: 1.15 });
// state hook (game/cave.js takeRise)
prop('second_life', 'state', 'Rebound', 'Once a reading, the wearer rises from a fall at 30% HP.');

// ---------------------------------------------------------------- the sixty and the Quill
// Rows: [id, name, grade, band, slot, type|who, baseStats, fixedAffixes [[affixId, tier]], prop, lore line 1, lore line 2]
// In grade order, then band order (the plaque lists them so). The sixteen of C1-data keep their ids, props and lore: band 1 became
// Lesser, bands 2 and 3 Greater, bands 4 and 5 Named, each rebuilt at its grade's item level.
const ROWS = [
  // ======== Lesser (item level 5): conveniences, status proofs and the small edges (thrift, the scripts, two struck elements)
  // the Catalogue (B1 to B19)
  ['cave_catalogue_pen', "The Catalogue's Pen", 1, 1, 'weapon', 'sword', { atk: 27, crit: 6, spd: 1 }, [['keen', 2]], 'first_blow_true',
    "A keeper's pen, ground to an edge.", 'It never misses the first line.'],
  ['cave_shelf_mail', "Shelf-Keeper's Mail", 1, 1, 'body', ALL, { def: 14, spr: 8, mag: 2, hp: 12 }, [['vital', 2]], 'poison_proof',
    'Riveted from the brackets of the first shelves.', 'Bookworms find nothing in it to eat.'],
  ['cave_reading_hood', 'Reading Hood', 1, 1, 'head', ALL, { def: 5, spr: 5, mag: 3 }, [['runed', 2]], 'blind_proof',
    'A hood lined with lamp-black cloth.', 'The eyes beneath it never water.'],
  ['cave_lamp_rod', 'Reading-Lamp Rod', 1, 1, 'weapon', 'staff', { atk: 5, mag: 15, spr: 3, mp: 8 }, [['runed', 2]], 'ink_well',
    'A brass reading lamp on an iron stem.', 'Its oil never seems to run down.'],
  // the Root Cellars (B20 to B39)
  ['cave_rootspur', 'Rootspur Pike', 1, 2, 'weapon', 'spear', { atk: 18, def: 2, spd: 1 }, [['gleaming', 2]], 'strikes_as_ice',
    'A root from the cold cellar wall, sharpened.', "It strikes with the cellar's chill."],
  ['cave_cellar_clogs', 'Cellar Clogs', 1, 2, 'boots', ALL, { spd: 2, def: 4, hp: 10 }, [['of_the_bear', 2]], 'chill_proof',
    'Wooden soles, tarred against the damp.', 'Cold water never gets in.'],
  ['cave_drip_cloak', 'Drip Cloak', 1, 2, 'mantle', ALL, { def: 5, spr: 4, hp: 10 }, [['of_the_lantern', 2]], 'frost_script_1',
    "Oilcloth that sheds the cellar's drip.", "The cellar's cold goes where it goes."],
  ['cave_draught_candle', 'Draught Candle', 1, 2, 'charm', ALL, { atk: 2, mag: 4, spr: 3, spd: 1 }, [['runed', 2]], 'stairs_sense',
    'A candle stub whose flame leans one way.', 'Always toward the stair down.'],
  // the Court Below (B40 to B59)
  ['cave_bailiff_hatchet', "Bailiff's Hatchet", 1, 3, 'weapon', 'axe', { atk: 21, spd: -1, crit: 2 }, [['gleaming', 2]], 'strikes_as_thunder',
    "A bailiff's hatchet, swung like a gavel.", 'Every blow lands with a crack.'],
  ['cave_clerk_gown', "Clerk's Gown", 1, 3, 'body', MIRA, { def: 9, spr: 8, mag: 5 }, [['of_warding', 2]], 'silence_proof',
    "A court clerk's gown, ink at the cuffs.", 'Nobody ever told a clerk to be quiet.'],
  ['cave_usher_helm', "Usher's Helm", 1, 3, 'head', HB, { def: 7, spr: 2, spd: 1 }, [['sturdy', 2]], 'forge_ward',
    "An usher's helm, polished for processions.", 'Ink and sparks glance off the shine.'],
  ['cave_juror_mantle', "Juror's Mantle", 1, 3, 'mantle', ALL, { def: 5, spr: 5, luk: 3 }, [['sturdy', 2]], 'lent_more',
    'One of twelve that hung in the jury room.', 'Whoever wore it was owed a little more.'],
  // the Ember Shelves (B60 to B79)
  ['cave_alum_jerkin', 'Alum-Soaked Jerkin', 1, 4, 'body', HB, { def: 12, spr: 3, hp: 10 }, [['sturdy', 2]], 'burn_proof',
    'Leather soaked in alum and left to dry.', 'Sparks die on it like moths.'],
  ['cave_cinder_shoes', 'Cinder-Step Shoes', 1, 4, 'boots', ALL, { spd: 2, def: 4 }, [['of_the_bear', 2]], 'feather_find',
    'Felt shoes for walking on hot shelves.', 'They have carried more than one reader out.'],
  ['cave_banked_coal', 'Banked Coal Charm', 1, 4, 'charm', ALL, { atk: 3, mag: 3, spd: 1 }, [['furious', 2]], 'fire_script_1',
    'A coal that never quite goes out.', 'Every ember burns hotter near it.'],
  ['cave_soot_cap', 'Soot Cap', 1, 4, 'head', MIRA, { def: 3, spr: 6, mag: 4 }, [['runed', 2]], 'thrift_1',
    "A reader's cap, black with lamp soot.", 'Every word costs a little less in it.'],
  // the Forge of Names (B80 to B99)
  ['cave_smith_apron', "Smith's Apron", 1, 5, 'body', ALL, { def: 13, spr: 7, mag: 2, hp: 10 }, [['of_the_bear', 2]], 'storm_script_1',
    "A smith's apron, scarred by every spark.", 'The sparks it caught still jump.'],
  ['cave_runner_boots', "Forge-Runner's Boots", 1, 5, 'boots', ALL, { spd: 2, def: 2, hp: 10 }, [['fleet', 2]], 'cave_move_plus',
    'Soft boots for running between fires.', 'Down here, they are quick on the stair.'],
  ['cave_ribbon_mantle', 'Ribbon Mantle', 1, 5, 'mantle', ALL, { def: 6, spr: 7, hp: 10 }, [['vital', 2]], 'bookmark_more',
    'A mantle hemmed with old ribbon markers.', 'Bookmarks catch in it and stay.'],
  ['cave_hearth_charm', 'Hearth Charm', 1, 5, 'charm', ALL, { spr: 4, mag: 6, hp: 10 }, [['of_mending', 2]], 'larder_1',
    'A chip of hearthstone on a thong.', "The Stacks' larder is warmer near it."],

  // ======== Greater (item level 10): battle edges
  // the Catalogue
  ['cave_sparkwrit', 'Sparkwrit Sabre', 2, 1, 'weapon', 'sword', { atk: 28, crit: 5 }, [['gleaming', 4], ['keen', 3]], 'strikes_as_thunder',
    'Etched with a word that means lightning.', 'Every cut lands as thunder.'],
  ['cave_indexer_robe', "Indexer's Robe", 2, 1, 'body', MIRA, { def: 10, spr: 9, mag: 5 }, [['of_warding', 4]], 'mender_2',
    'A pocket for every card in the index.', 'Mending comes easier in it.'],
  ['cave_lector_circlet', "Lector's Circlet", 2, 1, 'head', MIRA, { def: 4, spr: 7, mag: 5 }, [['runed', 4]], 'dawn_script_2',
    'A thin band that holds a reading light.', 'Lumen burns brighter under it.'],
  ['cave_ladder_boots', 'Ladderstep Boots', 2, 1, 'boots', ALL, { spd: 2, def: 5, hp: 24 }, [['fleet', 4]], 'first_blow_true',
    'Hobnails that never slip on a rung.', 'The first step, and the first blow, land.'],
  // the Root Cellars
  ['cave_cellar_key', 'The Cellar Key', 2, 2, 'weapon', 'spear', { atk: 24, def: 2 }, [['gleaming', 4], ['of_frost', 4]], 'venom_edge_2',
    'An iron key as long as a spear, and sharper.', 'What it opens does not close again.'],
  ['cave_root_boots', 'Rootbound Boots', 2, 2, 'boots', ALL, { spd: 3, def: 5, hp: 12 }, [['of_the_bear', 4]], 'cave_move_plus',
    'Soles grown over with root.', 'Down here, the ground remembers your feet.'],
  ['cave_damp_mantle', 'Mantle of the Damp Stair', 2, 2, 'mantle', ALL, { def: 8, spr: 8 }, [['of_the_lantern', 4]], 'ink_ward_2',
    'Wool that never dries and never rots.', 'Ink beads on it and runs off.'],
  ['cave_cistern_charm', 'Cistern Charm', 2, 2, 'charm', ALL, { mag: 11, spr: 4, mp: 10 }, [['of_frost', 3]], 'frost_script_2',
    'A bead of cellar ice that will not melt.', 'Frost bites deeper near it.'],
  // the Court Below
  ['cave_court_word', "The Court's Last Word", 2, 3, 'weapon', 'staff', { atk: 8, mag: 30, spr: 6, mp: 10 }, [['of_echoes', 4], ['of_mending', 3]], 'thrift_2',
    'The last ruling of a court that is gone.', 'Nobody has argued with it since.'],
  ['cave_glass_coat', 'Glass-Lined Coat', 2, 3, 'body', ALL, { def: 18, spr: 9, mag: 3, hp: 20 }, [['sturdy', 4]], 'haste_at_start_2',
    'Silverglass sewn between two layers of felt.', 'Whoever wears it is already moving.'],
  ['cave_twice_read', 'Twice-Read Charm', 2, 3, 'charm', ALL, { atk: 5, mag: 5, luk: 4 }, [['furious', 4]], 'silence_proof',
    'A charm read twice, in two voices.', 'Neither can be hushed.'],
  ['cave_sergeant_helm', "Sergeant's Helm", 2, 3, 'head', HB, { def: 8, spr: 4, hp: 20 }, [['sturdy', 4]], 'blind_proof',
    "A court sergeant's helm, visor up.", 'Nothing gets in its eyes.'],
  // the Ember Shelves
  ['cave_quench_axe', 'Quench Axe', 2, 4, 'weapon', 'axe', { atk: 32, spd: -1, crit: 6 }, [['gleaming', 4]], 'strikes_as_ice',
    'Its head was quenched in snowmelt.', 'Every blow hisses, then freezes.'],
  ['cave_ember_hauberk', 'Ember-Scale Hauberk', 2, 4, 'body', HB, { def: 14, spr: 5, hp: 20 }, [['sturdy', 4]], 'fire_ward_2',
    'Scales cut from a cooled fire door.', 'Heat slides off it.'],
  ['cave_scorch_cowl', 'Scorch Cowl', 2, 4, 'head', ALL, { def: 8, spr: 6, mag: 4, hp: 15 }, [['runed', 4]], 'burn_proof',
    'Singed felt, fireproofed twice over.', 'Nothing on it will catch.'],
  ['cave_ashwind_mantle', 'Ash-Wind Mantle', 2, 4, 'mantle', ALL, { def: 6, spr: 5, spd: 1 }, [['sturdy', 3]], 'fury_lean_2',
    'Ash rides the hem whenever it moves.', 'Anger comes quicker under it.'],
  // the Forge of Names
  ['cave_anvil_coat', 'Anvil-Riveted Coat', 2, 5, 'body', ALL, { def: 20, spr: 7, atk: 2, hp: 20 }, [['of_the_bear', 4]], 'leeching_2',
    "Riveted on the forge's own anvil.", 'It takes a little back from every blow.'],
  ['cave_spur_boots', 'Spur Boots', 2, 5, 'boots', ALL, { spd: 2, def: 5, hp: 15 }, [['lucky', 4]], 'crit_lean_2',
    'Spurred boots from a forge-rider.', 'Every blow they carry lands harder.'],
  ['cave_smoke_mantle', 'Forge-Smoke Mantle', 2, 5, 'mantle', ALL, { def: 6, spr: 5, mag: 2 }, [['of_warding', 4]], 'fire_script_2',
    'It smells of the forge and always will.', 'Fire answers whoever wears it.'],
  ['cave_anvil_spark', 'Anvil-Spark Charm', 2, 5, 'charm', ALL, { mag: 10, spr: 3, spd: 1 }, [['of_storms', 4]], 'storm_script_2',
    'A spark off the anvil, kept in glass.', 'Thunder follows it.'],

  // ======== Named (item level 16): run-changers
  // the Catalogue
  ['cave_lampwick', 'Lampwick Blade', 3, 1, 'weapon', 'sword', { atk: 44, crit: 8, spd: 1 }, [['gleaming', 5], ['keen', 5]], 'strikes_as_light',
    "Forged from the Catalogue's first lamp.", 'It strikes as light, and never dims.'],
  ['cave_record_rod', "Recordkeeper's Rod", 3, 1, 'weapon', 'staff', { atk: 10, mag: 40, spr: 8, mp: 14 }, [['runed', 5], ['of_echoes', 5]], 'all_scripts',
    'Every keeper held it to speak for the record.', 'Every element answers to it.'],
  ['cave_reader_diadem', "Reader's Diadem", 3, 1, 'head', ALL, { def: 12, spr: 8, mag: 6, hp: 20 }, [['runed', 5]], 'clear_proof',
    'A diadem set with two clear lenses.', 'No ink blinds it and no hush stops it.'],
  ['cave_catalogue_seal', 'Catalogue Seal', 3, 1, 'charm', ALL, { atk: 4, mag: 14, spr: 5, spd: 1 }, [['furious', 5]], 'exp_lean',
    'The seal that marked a book as read.', 'Whoever carries it learns faster.'],
  // the Root Cellars
  ['cave_taproot_pike', 'Taproot Pike', 3, 2, 'weapon', 'spear', { atk: 46, def: 4, spd: 1 }, [['gleaming', 5], ['keen', 5]], 'leeching_3',
    'A taproot grown straight, then hardened.', 'It drinks from every wound.'],
  ['cave_rootweave', 'Rootweave Hauberk', 3, 2, 'body', ALL, { def: 30, spr: 14, mag: 4, hp: 30 }, [['vital', 5]], 'unwritten',
    'Root and wire woven tight as mail.', 'No sickness of the cellars gets through.'],
  ['cave_wellspring_boots', 'Wellspring Boots', 3, 2, 'boots', ALL, { spd: 2, def: 6, hp: 20 }, [['fleet', 5], ['of_the_bear', 5]], 'haste_at_start_3',
    'Boots that walked up out of a spring.', 'They are moving before you are.'],
  ['cave_deep_well_mantle', 'Mantle of the Deep Well', 3, 2, 'mantle', ALL, { def: 10, spr: 9, hp: 20 }, [['of_warding', 5]], 'ink_ward_3',
    "Cut from the cistern's own waxed cloth.", 'Ink slides off it like rain.'],
  // the Court Below
  ['cave_writ_coat', 'Writ-Bound Coat', 3, 3, 'body', ALL, { def: 22, spr: 10, atk: 3, hp: 20 }, [['sturdy', 5]], 'venom_edge_3',
    'A coat sewn shut with old writs.', 'Its sentences keep working.'],
  ['cave_clemency_circlet', 'Clemency Circlet', 3, 3, 'head', MIRA, { def: 6, spr: 10, mag: 6 }, [['runed', 5]], 'mender_3',
    'Worn by the judge who granted mercy.', 'Healing given under it runs deep.'],
  ['cave_contempt_mantle', 'Mantle of Contempt', 3, 3, 'mantle', ALL, { def: 10, spr: 8, atk: 3, spd: 1 }, [['sturdy', 5]], 'fury_floor',
    'Cut from the robe of a judge nobody liked.', 'It walks into every fight half angry.'],
  ['cave_gavel_charm', 'Gavel Charm', 3, 3, 'charm', ALL, { atk: 5, mag: 4, spr: 3, spd: 1 }, [['lucky', 5]], 'crit_lean_3',
    "A sliver of the court's last gavel.", 'It always finds the deciding blow.'],
  // the Ember Shelves
  ['cave_ember_reader', 'The Ember Reader', 3, 4, 'weapon', 'axe', { atk: 50, spd: -1, crit: 6 }, [['gleaming', 5], ['of_embers', 5]], 'strikes_as_fire',
    'An axe that reads by its own light.', 'Every shelf it opens, it opens burning.'],
  ['cave_ash_helm', "Ash-Reader's Helm", 3, 4, 'head', ALL, { def: 16, spr: 8, mag: 2, hp: 20 }, [['vital', 5]], 'fire_ward_3',
    'A close helm, grey with old ash.', 'Heat passes it by like gossip.'],
  ['cave_cinder_stride', 'Cinder Stride', 3, 4, 'boots', ALL, { spd: 4, def: 7, hp: 20 }, [['lucky', 5]], 'stairs_sense',
    'Boots that always find the way down.', 'The way back up is not their business.'],
  ['cave_kindling_boots', 'Kindling Boots', 3, 4, 'boots', ALL, { spd: 3, def: 6, atk: 2, hp: 20 }, [['of_the_bear', 5]], 'fury_lean_3',
    'Every step strikes a spark.', 'Tempers catch the same way.'],
  // the Forge of Names
  ['cave_vellum_robe', 'Vellum Robe', 3, 5, 'body', MIRA, { def: 18, spr: 16, mag: 12 }, [['of_warding', 5], ['vital', 5]], 'red_rarity_up',
    'Cut from the pages the forge would not take.', 'The Stacks lend better to whoever wears it.'],
  ['cave_forge_binding', 'The Forge Binding', 3, 5, 'body', HB, { def: 30, spr: 8, spd: 2, hp: 40 }, [['sturdy', 5], ['of_the_bear', 5]], 'second_life',
    'Plate bound the way the forge bound names.', 'What it holds, it holds through one fall.'],
  ['cave_name_mantle', 'Mantle of Kept Names', 3, 5, 'mantle', ALL, { def: 16, spr: 10, luk: 6, hp: 20 }, [['fleet', 5]], 'larder',
    'Every name the forge kept, stitched in.', 'The Stacks pay their debts to it.'],
  ['cave_binders_mark', "The Binder's Mark", 3, 5, 'charm', ALL, { atk: 9, mag: 9, spd: 2 }, [['furious', 5]], 'bookmark_twice',
    'A pressed mark on a strip of leather.', 'Bookmarks turn up wherever it goes.'],

  // ======== B100 only: the Binder's prize (plan 2.12, 6.2), the best charm in the Stacks
  ['cave_binders_quill', "The Binder's Quill", 3, 0, 'charm', ALL, { atk: 10, mag: 12, spr: 6, spd: 2 }, [['of_dawn', 3], ['furious', 5]], 'quill_leech',
    'The quill that wrote every name into the spine.', 'What it writes down, it takes back.'],
];

const ICON = { weapon: null, body: 'armor', head: 'helm', charm: 'charm', boots: 'boots', mantle: 'mantle' };
const BAND_WORDS = { 1: 'the Catalogue', 2: 'the Root Cellars', 3: 'the Court Below', 4: 'the Ember Shelves', 5: 'the Forge of Names' };

function buildUnique(row) {
  const [id, name, grade, band, slot, typeOrWho, base, fixed, propId, lore1, lore2] = row;
  const G = GRADES[grade];
  if (!G) throw new Error(`${id}: unknown grade ${grade}`);
  const prop = CAVE_PROPS[propId];
  if (!prop) throw new Error(`${id}: unknown prop ${propId}`);
  const ilvl = G.ilvl;
  const stats = { ...base };
  const fixedAffixes = fixed.map(([aid, tier]) => {
    const a = AFFIXES[aid];
    if (!a) throw new Error(`${id}: unknown affix ${aid}`);
    const t = a.tiers[tier - 1];
    if (!t) throw new Error(`${id}: ${aid} has no tier ${tier}`);
    if (t[0] > ilvl) throw new Error(`${id}: ${aid} tier ${tier} needs item level ${t[0]}, the grade is ${ilvl}`);
    const value = t[2];   // the tier's top roll: a unique is the best copy of its affix
    stats[a.stat] = (stats[a.stat] || 0) + value;
    return { id: aid, tier, value };
  });
  for (const [k, v] of Object.entries(prop.stats || {})) stats[k] = (stats[k] || 0) + v;
  for (const k of Object.keys(stats)) if (!stats[k]) delete stats[k];
  const first = band ? G.line : QUILL_LINE;
  const u = { id, name, rarity: 'legendary', unique: true, cave: true, grade, band, slot, ilvl, price: 0, noSell: true,
    icon: slot === 'weapon' ? typeOrWho : ICON[slot], stats, fixedAffixes, prop: propId, lore: [first, lore1, lore2],
    source: band ? `The Deep Stacks, a blue chest (${G.name}, ${BAND_WORDS[band]})` : 'The Binder (B100)', desc: `${first} ${lore1} ${lore2}` };
  if (slot === 'weapon') u.type = typeOrWho; else u.who = typeOrWho.slice();
  if (prop.extraTypes) u.extraTypes = prop.extraTypes.slice();
  return u;
}

export const CAVE_UNIQUES = Object.fromEntries(ROWS.map((r) => { const u = buildUnique(r); return [u.id, u]; }));
/** The sixty blue-chest uniques, in grade order then band order (the Quill is not among them). */
export const CAVE_UNIQUE_IDS = ROWS.filter((r) => r[3] > 0).map((r) => r[0]);
export const BINDER_QUILL_ID = 'cave_binders_quill';
/** Blue-chest uniques of a home band, every grade (plan 6.3: a blue chest leans toward the current band's own). */
export function uniquesOfBand(k) { return CAVE_UNIQUE_IDS.filter((id) => CAVE_UNIQUES[id].band === k); }
/** Blue-chest uniques of a grade (1 Lesser, 2 Greater, 3 Named), in band order. */
export function uniquesOfGrade(g) { return CAVE_UNIQUE_IDS.filter((id) => CAVE_UNIQUES[id].grade === g); }
/** The grade of a cave unique (id or instance), or 0. */
export function gradeOf(itemOrId) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId && itemOrId.base;
  const u = id && CAVE_UNIQUES[id];
  return u ? u.grade : 0;
}

export const KEEPERS_BOOKMARK_ID = 'keepers_bookmark';
export const KEEPERS_BOOKMARK = { id: KEEPERS_BOOKMARK_ID, name: "Keeper's Bookmark", icon: 'book', key: true, counted: true,
  consumable: true, use: 'cave_bank', cave: true, desc: 'Closes the book where you stand.' };

/** The prop ids active on a party: every cave unique worn by any member (instances or base ids in `equip`). */
export function wornProps(members) {
  const out = new Set();
  for (const m of members || []) {
    for (const v of Object.values(m.equip || {})) {
      const id = v && (typeof v === 'string' ? v : v.base);
      const u = id && CAVE_UNIQUES[id];
      if (u) out.add(u.prop);
    }
  }
  return [...out];
}

/** True when the item table row (or an instance) is a cave unique. */
export function isCaveUnique(itemOrId) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId && itemOrId.base;
  return !!(id && CAVE_UNIQUES[id]);
}

let done = false;
/** Add the sixty-one uniques and the Bookmark. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, u] of Object.entries(CAVE_UNIQUES)) {
    if (!EQUIP_SLOTS.includes(u.slot)) throw new Error(`${id}: bad slot ${u.slot}`);
    if (!ITEMS[id]) { UNIQUES[id] = u; ITEMS[id] = { ...u, kind: 'equipment', unique: true }; }
  }
  if (!ITEMS[KEEPERS_BOOKMARK_ID]) { KEY_ITEMS[KEEPERS_BOOKMARK_ID] = KEEPERS_BOOKMARK; ITEMS[KEEPERS_BOOKMARK_ID] = { ...KEEPERS_BOOKMARK, kind: 'key' }; }
  done = true;
}
export default register;
