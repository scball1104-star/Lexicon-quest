// Episode 5, "The Last Prophecy": every story flag of docs/EPISODE5_PLAN.md section 2.2, each with a one-line meaning
// (EP5_FLAGS), plus the few one-shot guards E5-story added (listed at the end, EPISODE5.md section 9). register() assigns
// them into FLAGS and pushes their ids onto FLAG_IDS (that array is computed once in quests.js, so a pack has to push).
// Idempotent. Chest flags the Talk hints read are declared too.
// Part of the lazy `ep5` pack: nothing in a core file imports this module.

import { FLAGS, FLAG_IDS } from '../quests.js';

export const EP5_FLAGS = {
  // Main
  ep5_started: 'Episode 5 has begun: the star letter lost a name at the Floodwatch Inn (ep5_morning). Only that scene sets it.',
  ship_boarded: 'Yara took the party aboard the Saffron Wind at the south landing (ep5_board). The berth door sails.',
  ship_first_fight_done: 'The Dust Harrier and the Dune Scarab on the deck are beaten (ship_fight). The gangway opens.',
  road_landed: 'The party came ashore at the jetty on the Caravan Road (road_landing).',
  haven_arrived: 'The party walked into the Moonwell Caravanserai and saw the waystone change (haven_arrival).',
  met_sel: 'Sel spoke with the party in the northern market court (meet_sel). Opens Three Roads Home.',
  star_reading_done: 'Laleh and Nasrin read the prophecy at the armillary (star_reading).',
  sky_learned: 'Mira turned the rings with Laleh and learned Turn the Sky (star_reading). The skill is learned on it.',
  gnomon_get: "Sel gave the Nomad's Gnomon at the north gate (sel_gate). The door to the Labyrinth opens.",
  lab_entered: 'The party set foot in the Oracle Labyrinth (lab_f1_arrival).',
  lab_f1_done: 'The stair down from the Shifting Dunes was taken (lab_f1_stair).',
  knight_defeated: 'The Mirage Knight is beaten. Set by the encounter, and by the scene after a win.',
  lab_f2_done: 'The stair down from the Gallery of False Horizons was taken (lab_f2_stair).',
  vex_gallery_met: 'Vex Quill was met on the star floor of the Gallery (vex_gallery).',
  sel_walked_in: 'Sel walked into the Well of Tomorrow after the party (sel_walks_in).',
  oracle_door_open: "Ishra's page was read and the Sun Keyhole can turn (sel_memory_3).",
  oracle_defeated: 'The Sand Oracle is beaten. Set by the encounter, and by oracle_after.',
  chart_restored: "The Star Chart opened and twenty years of struck stars lit again (oracle_after).",
  fragment5_get: 'The fifth Name Fragment, the Star Chart, is in the bag (oracle_after).',
  roads_returned: "Tamir's caravan walked home to Saffron Haven (every_road).",
  haven_restored: 'The waystone holds its names and the Haven has its road again (every_road).',
  ep5_complete: 'Episode 5 is complete: the stars wrote a road over the Haven (ep5_ending). Credits roll next.',

  // Beats and world state
  ep5_morning_done: 'The star letter scene at the Floodwatch Inn has played (ep5_morning).',
  ship_arrived: 'The first night on the deck of the Saffron Wind has played (ship_night).',
  bram_told: 'At the bow the hero told Bram whose name went: Mine. Changes one line and one bark.',
  bram_spared: "At the bow the hero told Bram: Nobody's. Changes one line and one bark.",
  bram_asked: 'Bram asked at the bow, and was answered either way (ship_bram). The fight row wakes.',
  saw_glass_flat: 'Omar pointed at the sundial by the Glass Flat (road_shade).',
  tent_rested: "The party sat at Omar's fire under the shade tent (tent_rest).",
  saw_haven: 'The party saw Saffron Haven and its armillary from the last dune (haven_view).',
  moonwell_seen: 'Kamal showed the party the Moonwell and its one road (moonwell).',
  lab_f1_arrived: 'First arrival in the Shifting Dunes, floor I (lab_f1_arrival).',
  lab_f2_arrived: 'First arrival in the Gallery of False Horizons, floor II (lab_f2_arrival).',
  lab_f3_arrived: 'First arrival in the Well of Tomorrow, floor III (lab_f3_arrival).',
  sel_memory_1: "Sel's first memory, The Unfinished Caravan, was seen (sel_memory_1).",
  sel_memory_2: "Sel's second memory, The Map That Lied, was seen (sel_memory_2).",
  sel_memory_3: "Sel's third memory, The Name Under the Sand, was read: her mother's name is Ishra (sel_memory_3).",
  landing_shelter: 'The spring of Shelter filled on the first landing of the Well (landing_shelter).',
  landing_truth: 'The spring of Truth filled on the second landing of the Well (landing_truth).',
  landing_return: 'The spring of Return filled on the last landing of the Well (landing_return).',
  sun_key_found: 'The Nomad Sun Key was taken from the gold chest in the far court of floor I. Set by the chest.',
  fifth_list_get: 'Vex gave the party the fifth list (vex_gallery).',
  star_restored: "In the Gallery the hero put their own star back in its socket. Changes one line and Sel's gift.",
  star_hidden: "In the Gallery the hero left their star hidden in the painted sky. Changes one line and Sel's gift.",
  plate_f1_open: 'The sun gate on floor I latched open in the light. Set by the sun plate.',

  // Side: Three Roads Home
  roads_started: 'Kamal asked the party to hear the three witnesses of the old caravan law (roads_start).',
  testimony_yara: 'Yara gave her witness: her father left his route to find the missing (testimony_yara).',
  testimony_kamal: 'Kamal gave his witness: the water tells the truth when the wind is still (testimony_kamal).',
  testimony_nasrin: 'Nasrin gave her witness: Shelter, Truth, Return (testimony_nasrin).',
  moonwell_woken: 'Water was drawn at the Moonwell and it showed three roads (moonwell_wake). +20 Fury at the Oracle.',
  roads_done: 'Three Roads Home is done and the Nomad Mantle given (moonwell_wake).',

  // Side: The Lost Traveler Reliquary
  reliquary_found: "The travelers' names under the sand were read by the Lantern and the hidden cache opened (reliquary).",

  // Side: Hassan's Bells
  bells_started: 'Hassan asked for the three caravan bells back (bells_start). The bell chests appear.',
  bell_1_found: 'The first caravan bell was taken from the sand island on the Caravan Road. Set by the chest.',
  bell_2_found: 'The second caravan bell was taken from the dead-end court on floor I. Set by the chest.',
  bell_3_found: 'The third caravan bell was taken from behind the cracked obelisk on floor I. Set by the chest.',
  bells_done: 'Hassan has his three bells and gave the Copperwind Bell (bells_done).',

  // Chest flags the Talk hints read (plan 2.2 calls them map-local; a chest's flag is a game flag, so they are declared).
  dune_key_f1: 'The Dune Key chest on floor I was opened. Set by the chest.',
  dune_key_f2: 'The Dune Key chest on floor II was opened. Set by the chest.',

  // Added by E5-story (plan 2.2 did not list them): one-shot guards so a retried boss fight is short.
  knight_tried: "The Mirage Knight's intro has played once (mirage_knight). A retry after a loss is shorter.",
  oracle_tried: "The Sand Oracle's intro has played once (oracle). A retry after a loss is shorter.",
};

/** Map ids of the pack (plan 2.1), for the Talk and banter tables. */
export const EP5_MAPS = ['ep5_ship', 'ep5_caravan_road', 'ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy',
  'ep5_sh_observatory', 'ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3', 'ep5_lab_oracle'];

export function register() {
  Object.assign(FLAGS, EP5_FLAGS);
  for (const id of Object.keys(EP5_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
}

export default register;
