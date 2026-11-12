// Episode 7, "The Vanishing World": every story flag of docs/EPISODE7_PLAN.md section 2.2, each with a one-line meaning
// (EP7_FLAGS), plus the two one-shot boss guards E7-story added (listed at the end, EPISODE7.md section 9). register()
// assigns them into FLAGS and pushes their ids onto FLAG_IDS (that array is computed once in quests.js, so a pack has to
// push). Idempotent. Chest flags the Talk hints read are declared too. The counter credits7_rolled is not a flag; stones
// and frost doors carry no flag (they reset on every arrival, plan 5.1).
// Part of the lazy `ep7` pack: nothing in a core file imports this module.

import { FLAGS, FLAG_IDS } from '../quests.js';

export const EP7_FLAGS = {
  // Main
  ep7_started: 'Episode 7 has begun: Aeris showed the fading chart in the Chart Room at dawn (ep7_morning). Only that scene sets it.',
  ep7_boarded: 'The party boarded the Kestrel at the north dock with Vex in the fourth seat (ep7_board). The berth flies north.',
  road_arrived: 'The Kestrel set down on the frozen lake at the foot of the White Road (ep7_landing).',
  vex_carved: 'Vex carved his name into the Traveler\'s Wall and watched half of it go (name_under_ice). The fight row wakes.',
  road_fight_done: 'The two Rime Wolves above the wall are beaten (road_fight).',
  call_learned: 'The hero called Mira and Bram back out of the whiteout and learned Call (whiteout). The skill is learned on it.',
  saw_sevens: 'The party saw the crossed sevens on the Waystation doorframe (waystation). The stove is a rest point from here.',
  saw_palehaven: 'The party saw Palehaven and the blinking cathedral from the South Icegate (palehaven_view).',
  palehaven_arrived: 'The party walked into Palehaven through the south gate (palehaven_arrival). The side stories open.',
  met_keeper: 'The Keeper spoke with the party by her lamp at the north end of the square (meet_keeper). The Watch opens.',
  keeper_told: 'The Keeper told the party about the half page in the Vault, with Vex in the Watch (keeper_and_vex).',
  vault_open: 'The Keeper unlocked the north gate to the Frostbound Vault; Vex sits on the step (vault_gate).',
  vault_entered: 'The party set foot in the Frostbound Vault (vault_f1_arrival).',
  stillheart_key_found: 'The Stillheart Crystal Key was taken from the gold chest on the northern balcony of floor I. Set by the chest.',
  vault_f1_done: 'The lift up from the Vanishing Steps was taken (vault_f1_lift).',
  bell_found: "Bram found his mother's bell frozen in the bell bay and read Mara's tag (listening_bell).",
  lantern_defeated: 'The Pale Lantern is beaten. Set by the encounter, and by the scene after a win.',
  vault_f2_done: 'The lift up from the Hall of Borrowed Light was taken (vault_f2_lift).',
  keeper_came: 'The Keeper came up the Sanctum stair with her lamp lit (keeper_comes). She walks with the party from here.',
  stillheart_open: 'The Keeper opened the round door with her bare hand (keeper_comes). The inner grate wants the key.',
  phantom_defeated: 'The White Phantom is beaten. Set by the encounter, and by phantom_after.',
  stillheart_restored: 'The Stillheart thawed and every name ran clear again (phantom_after).',
  fragment7_get: 'The seventh Name Fragment, the Stillheart, is in the bag (phantom_after).',
  seventh_list_get: 'The seventh list was taken from the floor where the Phantom knelt (phantom_after).',
  page_whole: "The two halves of the hero's first page met over the hearth (whole_page).",
  nox_named: "Mira read the Keeper's signature off the page: Nox (whole_page). Palehaven says her name from here.",
  marten_named: "The carrier's mark on the page was read: Marten, Tess's father (whole_page).",
  doors_reopened: "Nox read her brother's letter in the square and the iced doors opened (doors_reopen).",
  letter_sent: 'The hero gave Aeris the White Road letter to carry south to Tess (doors_reopen).',
  vex_name_whole: "Vex's name came back whole in the Traveler's Wall (doors_reopen).",
  ep7_complete: 'Episode 7 is complete: the stair of written light (ep7_ending). Credits roll next.',

  // Beats and world state
  ep7_morning_done: 'The chart scene in the Chart Room has played (ep7_morning).',
  told_vex: 'At the wall the hero told Vex: Half of it. Changes one line in doors_reopen and one Talk line.',
  spared_vex: 'At the wall the hero told Vex: All of it. Changes one line in doors_reopen and one Talk line.',
  valewyn_list_get: 'Vex handed over the Valewyn list with his own name at the top (name_under_ice).',
  first_stone_read: 'Sol showed the party the first name stone at the first white gap (first_stone). The whiteout waits on it.',
  vault_f1_arrived: 'First arrival on the Vanishing Steps, floor I (vault_f1_arrival).',
  vault_f2_arrived: 'First arrival in the Hall of Borrowed Light, floor II (vault_f2_arrival).',
  vault_f3_arrived: 'First arrival in the Stillheart Sanctum, floor III (vault_f3_arrival).',
  keeper_memory_1: "The Keeper's first memory, A Gate Kept Open, played at the frozen gate (keeper_memory_1).",
  keeper_memory_2: "The Keeper's second memory, The Name Left Outside, played at the letter wall (keeper_memory_2).",
  keeper_memory_3: "The Keeper's third memory, The Winter She Could Not End, played on the first landing (keeper_memory_3).",
  told_nox: 'In the Sanctum the hero told the Keeper: No. Changes one line in whole_page and her gift (the Open Gate).',
  spared_nox: 'In the Sanctum the hero told the Keeper: I remember. Changes one line in whole_page and her gift (the Kept Lamp).',

  // Side: The Hearth of Returning Names
  hearth_started: 'Eira asked the party to hear three witnesses and light the hearth in the square (hearth_start).',
  testimony_mirael: 'Mirael gave her witness: the Keeper hid every loss to spare the town grief (testimony_mirael).',
  testimony_sol: 'Sol gave his witness: the northern beacons were built for returning travelers (testimony_sol).',
  testimony_eira: "Eira gave her witness: her sister's last letter, frozen (hearth_start).",
  hearth_lit: 'The Hearth of Returning Names burns in the square (hearth_light). +20 Fury at the White Phantom; a rest point.',
  hearth_done: 'The Hearth of Returning Names is done and the Winterwatch Coat given (hearth_light).',

  // Side: The Keeper Emergency Reliquary
  page_door_found: 'The witness page Open the Door was taken from a side gallery of floor II. Set by the chest.',
  page_flame_found: 'The witness page Share the Flame was taken from a side gallery of floor II. Set by the chest.',
  page_lost_found: 'The witness page Call the Lost was taken from a side gallery of floor II. Set by the chest.',
  reliquary_open: 'The Keeper Emergency Reliquary was opened with the three witness pages (ep7_reliquary).',

  // Side: Torr's Missing Streets
  streets_started: "Torr asked for the three street plaques the wind blew off Palehaven's walls (streets_start).",
  street_1_found: 'The first street plaque was taken from the ledge west of the second gap on the White Road. Set by the chest.',
  street_2_found: 'The second street plaque was taken from the dead-end side gallery of floor I. Set by the chest.',
  street_3_found: 'The third street plaque was taken from behind the cracked ice crate on floor I. Set by the chest.',
  streets_done: 'Torr wrote the three streets back into his book (streets_done).',

  // Added by E7-story (plan 2.2 did not list them): one-shot guards so a retried boss fight is short.
  lantern_tried: "The Pale Lantern's intro has played once (pale_lantern). A retry after a loss is shorter.",
  phantom_tried: "The White Phantom's intro has played once (phantom). A retry after a loss is shorter.",
};

/** Map ids of the pack (plan 2.1), for the Talk and banter tables. */
export const EP7_MAPS = ['ep7_white_road', 'ep7_waystation', 'ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory',
  'ep7_ph_watch', 'ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3', 'ep7_stillheart'];

export function register() {
  Object.assign(FLAGS, EP7_FLAGS);
  for (const id of Object.keys(EP7_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
}

export default register;
