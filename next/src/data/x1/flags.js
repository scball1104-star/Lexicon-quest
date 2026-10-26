// Episode 1 expansion, "The Wider Valley": every story flag of docs/EXPANSION1_PLAN.md section 2.2, each with a one-line
// meaning (X1_FLAGS). register() assigns them into FLAGS and pushes their ids onto FLAG_IDS (the array is computed once,
// before the Episode 3 flags are added, so a pack has to push). Idempotent. Map-local chest flags (x1_*) are not here:
// they belong to the map files and game.opened.
//
// X1_MAP_REGION lives here because every X1-story module needs it and this one imports nothing but quests.js: map id ->
// the region key of src/data/x1/live.js (west, north, south, wild; the moor and Larchhill are both "wild").

import { FLAGS, FLAG_IDS } from '../quests.js';

export const X1_FLAGS = {
  // Arrivals and world state
  downs_arrived: 'First arrival in Shepherd\'s Downs (downs_arrival).',
  thornfold_arrived: 'The party walked into Thornfold (thornfold_arrival).',
  stones_seen: 'The party stepped into the ring of standing stones (stones_arrival). Brindle can now ask for the names.',
  moor_arrived: 'First arrival on the High Moor (moor_arrival).',
  larchhill_arrived: 'First arrival on Larchhill (larchhill_arrival).',
  terrace_arrived: 'First arrival on the Keepers\' Terrace (terrace_arrival).',
  millrace_arrived: 'First arrival at the Lower Millrace (millrace_arrival).',
  barrow_entered: 'The party went down into the Wethers\' Barrow (barrow_entry).',
  cellar_entered: 'The party went down into the Keepers\' Cellar (cellar_entry).',
  culvert_entered: 'The party went down into the Weir Culvert (culvert_entry).',
  cleft_seen: 'Mira and Bram pointed out the black cleft under the valley\'s north cliff (cleft_hint).',
  odo_met: 'Odo the chime keeper was met on the High Moor (odo_meet).',
  yarrow_met: 'Yarrow the beekeeper was met on Larchhill (yarrow_meet). Opens the hay chute.',
  windmill_seen: 'The party climbed the Larchhill windmill ladder and saw the valley from above (windmill_view).',
  x1_gate_drain_open: 'The Weir Culvert drain gate has been opened once by its two plates (set by the gate itself, W7).',

  // Strays of Thornfold
  strays_started: 'Brindle asked for his five strays (brindle_strays). The stray sheep appear on their maps.',
  stray_1_found: 'Stray sheep 1 (the old fold, behind the hay) is home (stray_found_1).',
  stray_2_found: 'Stray sheep 2 (inside the ring of stones) is home (stray_found_2).',
  stray_3_found: 'Stray sheep 3 (the ridge) is home (stray_found_3).',
  stray_4_found: 'Stray sheep 4 (the valley pasture) is home (stray_found_4).',
  stray_5_found: 'Stray sheep 5 (behind the cracked fold wall) is home (stray_found_5).',
  strays_done: 'Brindle has twelve sheep again; the Fold Mantle and 8 EXP given (strays_done).',

  // The Thirteenth Stone
  rollcall_started: 'Brindle asked for the twelve names for the standing stones (rollcall_start).',
  roll_found: 'Iris gave the torn burial roll (iris_roll).',
  copy_found: 'Quill gave his copy of the stones (quill_copy).',
  stones_lettered: 'The twelve names were said at the stones and the letters came back (rollcall_stones).',
  reeve_named: 'The Reeve\'s name was said, at the stones or in the Barrow, and the thirteenth slab is lettered.',
  barrow_reeve_defeated: 'The Barrow Reeve is beaten. Set by the encounter, not by a scene.',
  rollcall_done: 'Brindle counted thirteen; the Rollcall Charm and 12 EXP given (rollcall_done).',

  // Pell's Crates
  crates_started: 'Pell handed over three crates (crates_start).',
  crate_1_done: 'The spools reached Tamsin (crate_delivered_1).',
  crate_2_done: 'The beeswax moulds reached Yarrow (crate_delivered_2).',
  crate_3_done: 'The bearing reached Ferrick (crate_delivered_3).',
  crates_done: 'Pell has his receipts; Drover Boots, the price card and 6 EXP given (crates_done).',
  pell_stamp: 'Willowmere Goods sells every item a tenth cheaper (set by crates_done).',

  // Four Rolls for the Miller
  mill_started: 'Hal asked the party to see to the mill wheel (mill_start).',
  ferrick_met: 'Ferrick the weirkeeper was met at the Millrace (ferrick_meet).',
  pin_found: 'The millstone pin was taken from the Weir Culvert pump room. Set by the map chest.',
  mill_turning: 'The pin is set and the wheel turns (pin_place).',
  millstone_golem_defeated: 'The Millstone Golem is beaten. Set by the encounter, not by a scene.',
  mill_done: 'Hal and Oren stood in the mill door; 8 Honey Rolls, 200 gold and 12 EXP given (mill_done).',

  // The Dark Stars
  stars_started: 'Hesper asked for the three dark Keepers\' names (hesper_meet). The Lantern marks answer.',
  star_1_read: 'The milestone\'s hidden ink was read (star_read_1).',
  star_2_read: 'The Archive door\'s hidden ink was read (star_read_2).',
  star_3_read: 'The Watchtower\'s hidden ink was read (star_read_3).',
  orrery_aligned: 'Hesper lit the three stars; the hatch to the Cellar is open (orrery_align).',
  stars_done: 'The Keeper\'s last note in the Cellar was read; 8 EXP given (cellar_note).',

  // Things Not To Forget
  list_started: 'Iris asked for three remembrances for her list (list_start).',
  list_rhyme: 'Brindle\'s counting rhyme was heard (list_rhyme).',
  list_ledger: 'The oldest name in Hal\'s ledger was read (list_ledger).',
  list_song: 'Odo\'s chime song was heard (list_song).',
  list_done: 'Iris wrote the three down; 200 gold, 3 Ethers and 8 EXP given (list_done).',

  // Added by X1-story (plan 2.2 did not list them): one-shot guards so a retried boss fight is short and its aftermath
  // plays once.
  reeve_met: 'The Barrow Reeve\'s intro has played once (reeve_intro). A retry after a loss is shorter.',
  reeve_after_done: 'The Barrow Reeve\'s aftermath has played (reeve_after).',
  golem_met: 'The Millstone Golem\'s intro has played once (golem_intro). A retry after a loss is shorter.',
  golem_after_done: 'The Millstone Golem\'s aftermath has played (golem_after).',
};

/** Map id -> region key of live.js (X1_REGIONS: west, north, south, wild). The moor and Larchhill are "wild". */
export const X1_MAP_REGION = {
  x1_downs: 'west', x1_loomhouse: 'west', x1_barrow: 'west',
  x1_terrace: 'north', x1_orrery: 'north', x1_cellar: 'north',
  x1_millrace: 'south', x1_mill: 'south', x1_culvert: 'south',
  x1_highmoor: 'wild', x1_larchhill: 'wild',
};

export function register() {
  Object.assign(FLAGS, X1_FLAGS);
  for (const id of Object.keys(X1_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
}

export default register;
