// Episode 4, "The Sunken Keep": every story flag of docs/EPISODE4_PLAN.md section 2.2, each with a one-line meaning
// (EP4_FLAGS), plus the few one-shot guards E4-story added (listed at the end, EPISODE4.md section 9). register() assigns
// them into FLAGS and pushes their ids onto FLAG_IDS (that array is computed once in quests.js, so a pack has to push).
// Idempotent. The two Tide Key chest flags are declared too, since the floor Talk hints read them.
// Part of the lazy `ep4` pack: nothing in a core file imports this module.

import { FLAGS, FLAG_IDS } from '../quests.js';

export const EP4_FLAGS = {
  // Main
  ep4_started: 'Episode 4 has begun: the running decree reached Emberpeak (ep4_morning). Only that scene sets it.',
  east_road_open: 'Rusk rigged the rope ladder down the east road washout (east_road_gate). The Flood Road door opens.',
  flood_road_arrived: 'First arrival on the Flood Road (flood_road_arrival).',
  flood_first_fight_done: 'The Ink Bloom and the Floodhound on the Flood Road are beaten (flood_first_fight).',
  vw_arrived: 'The party crossed by ferry into Valewyn and saw the flood board (vw_arrival).',
  met_regent: 'The Regent asked for help in her Hall and named the lockwright (regent_hall).',
  met_joss: 'Joss the Lockwright gave up the Lockwright\'s Crank (joss_locks).',
  keep_ferry_open: 'Hale poles the party to the Sunken Keep from the north landing (keep_ferry).',
  keep_entered: 'The party set foot in the Sunken Keep (keep_f1_arrival).',
  keep_f1_done: 'The lift behind the Eastern Tidegate was taken down to the second floor (keep_f1_lift).',
  barrister_defeated: 'The Inkbound Barrister is beaten. Set by the encounter, and by the scene after a win.',
  keep_f2_done: 'The stair under the court room was taken down to the Court of Witnesses (keep_f2_stair).',
  vex_archive_met: 'Vex Quill was met in the dry room under the glass dome (vex_archive).',
  petition_gate_open: 'The three principle stones rang and the Petition Gate opened (lyra_memory_3).',
  hero_signed: 'The hero signed the Witness Book of Valewyn under water, and the ink held (witness_book). Teaches Answer.',
  paper_regent_defeated: 'The Paper Regent is beaten. Set by the encounter, and by regent_after.',
  lyra_named: 'The Regent signed under the hero and her name came back: Lyra (regent_after).',
  charter_restored: 'The true charter was unfolded and the forged word ran off it (regent_after).',
  tide_bell_rung: 'The hero rang the Keep\'s drowned bell from the ferry (crown_remembers).',
  vw_restored: 'The great lock is open, the river quarter is dry, the forged orders are blank (crown_remembers).',
  ep4_complete: 'Episode 4 is complete: the sand-dry letter came addressed in stars (ep4_ending). Credits roll next.',

  // Beats and world state
  ep4_morning_done: 'The running decree scene at the Coal Lantern has played (ep4_morning).',
  saw_flood_lane: 'Bram pointed at the farm lock in the drowned lane (flood_lane).',
  ferry_rested: 'The party sat at Hale\'s fire at the ferry landing (ferry_rest). Opens Nilo\'s Bell.',
  saw_valewyn: 'The party saw Valewyn and the drowned Keep from the bluff (vw_view). The ferry door appears.',
  saw_statue: 'Mira read the empty coronation statue\'s inscription aloud (vw_statue).',
  keep_f1_arrived: 'First arrival on the Tidegate Causeway, floor I (keep_f1_arrival).',
  keep_f2_arrived: 'First arrival in the Archives Below Water, floor II (keep_f2_arrival).',
  keep_f3_arrived: 'First arrival in the Court of Witnesses, floor III (keep_f3_arrival).',
  lyra_memory_1: 'The Regent\'s first memory, The Flooded Audience, was seen (lyra_memory_1).',
  lyra_memory_2: 'The Regent\'s second memory, The Altered Charter, was seen (lyra_memory_2).',
  lyra_memory_3: 'The Regent\'s third memory, The Oath Remembered, was seen at the Petition Gate (lyra_memory_3).',
  principle_voice: 'The stone of the Voice rang (principle_voice).',
  principle_truth: 'The stone of the Truth rang (principle_truth).',
  principle_mercy: 'The stone of the Mercy rang (principle_mercy).',
  seal_key_found: 'The Sunken Seal Key was taken from the north gallery\'s gold chest on floor I. Set by the chest.',
  fragment4_get: 'The fourth Name Fragment, the Drowned Charter, is in the bag (regent_after).',
  lyra_truth: 'In her Hall the hero told the Regent plainly that she did it. Changes one line and her gift.',
  lyra_kind: 'In her Hall the hero told the Regent the seal did it. Changes one line and her gift.',
  tidegate_open: 'The Eastern Tidegate on floor I was lifted by high water and latched open. Set by the floodgate.',

  // Side: Three Witnesses
  witnesses_started: 'Dorian asked for three witnesses before the council switches are thrown (witnesses_start).',
  testimony_hale: 'Hale gave his witness: the gates shut under the seal, not her hand (testimony_hale).',
  testimony_dorian: 'Dorian gave his witness: the king\'s charter was copied, altered and hidden (testimony_dorian).',
  testimony_joss: 'Joss gave his witness: there is lock power for one district first (testimony_joss).',
  council_shelter: 'The council switch chose Shelter the River Quarter (council_choice).',
  council_records: 'The council switch chose Protect the Public Records (council_choice). +25 Fury against the Regent.',
  witnesses_done: 'One council switch was thrown and Dorian gave the Tidewalker Mantle (council_choice).',

  // Side: The Public Coffer
  coffer_found: 'The Keeper tide marks were read under water by the Lantern and the hidden cache opened (coffer_records).',

  // Side: Nilo's Bell
  nilo_started: 'Nilo asked for his boat bell back (nilo_bell). The bell chest appears on floor I.',
  nilo_bell_found: 'Nilo\'s boat bell was taken from the floor I canal floor. Set by the chest.',
  nilo_done: 'Nilo has his bell and rings it from the landing; the Ferryman\'s Charm given (nilo_bell).',

  // Chest flags the Talk hints read (plan 2.2 calls them map-local; a chest's flag is a game flag, so they are declared).
  tide_key_f1: 'The Tide Key chest in the floor I pontoon channel was opened. Set by the chest.',
  tide_key_f2: 'The Tide Key chest in the floor II locks was opened. Set by the chest.',

  // Added by E4-story (plan 2.2 did not list them): one-shot guards so a retried boss fight is short.
  barrister_tried: 'The Inkbound Barrister\'s intro has played once (barrister). A retry after a loss is shorter.',
  paper_regent_tried: 'The Paper Regent\'s intro has played once (paper_regent). A retry after a loss is shorter.',
};

/** Map ids of the pack (plan 2.1), for the Talk and banter tables. */
export const EP4_MAPS = ['ep4_flood_road', 'ep4_valewyn', 'ep4_vw_inn', 'ep4_vw_shop', 'ep4_vw_forge', 'ep4_vw_palace',
  'ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown'];

export function register() {
  Object.assign(FLAGS, EP4_FLAGS);
  for (const id of Object.keys(EP4_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
}

export default register;
