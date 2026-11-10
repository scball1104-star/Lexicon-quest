// Episode 6, "The Skybound Isles": every story flag of docs/EPISODE6_PLAN.md section 2.2, each with a one-line meaning
// (EP6_FLAGS), plus the two one-shot guards E6-story added (listed at the end, EPISODE6.md section 9). register() assigns
// them into FLAGS and pushes their ids onto FLAG_IDS (that array is computed once in quests.js, so a pack has to push).
// Idempotent. Chest flags the Talk hints read are declared too. The counter credits6_rolled is not a flag.
// Part of the lazy `ep6` pack: nothing in a core file imports this module.

import { FLAGS, FLAG_IDS } from '../quests.js';

export const EP6_FLAGS = {
  // Main
  ep6_started: 'Episode 6 has begun: a grey bird brought a boarding slip to the Dune Lantern (ep6_morning). Only that scene sets it.',
  ep6_boarded: 'Yara took the party aboard at the water stairs of Saffron Haven (ep6_board). The berth door sails north-west.',
  airstair_arrived: 'The party stood at the foot of the sea stack under the skyport (airstair_foot).',
  airstair_fight_done: 'The two Storm Harriers on the second landing are beaten (airstair_fight).',
  zephyr_arrived: 'The party walked onto the Windward Docks of Zephyr Landing (zephyr_arrival). The side stories open.',
  met_aeris: 'Captain Aeris spoke with the party at the north dock (meet_aeris). The chart room opens.',
  charts_seen: "Aeris showed the party the struck manifests in the chart room (chart_room). Suri's beacon opens.",
  anchor_learned: 'Bram caught Mira on the east dock and learned Anchor (anchor_lesson). The skill is learned on it.',
  windward_pass: 'Aeris gave the Windward Pass at the east airstair (east_gate). The Observatory gate opens.',
  obs_entered: 'The party set foot in the Storm Observatory (obs_f1_arrival).',
  obs_f1_done: 'The lift up from the Windward Causeways was taken (obs_f1_lift).',
  vex_relay_met: 'Vex Quill was met at the crown relay in the Hall of Broken Signals (vex_relay).',
  engine_defeated: 'The Gale Engine is beaten. Set by the encounter, and by the scene after a win.',
  obs_f2_done: 'The lift up from the Hall of Broken Signals was taken (obs_f2_lift).',
  aeris_came: 'Aeris brought the Kestrel up through the storm to the first landing of the Eye (aeris_turns).',
  vex_held: 'Bram held Vex on a line over nothing on the broken causeway (vex_falls).',
  asker_known: 'Vex showed the letter that asked him to keep the first page (vex_falls).',
  pippa_found: 'The signal apprentice was found alive on the beacon platform, and Mira read her name (fifth_voice).',
  scribe_door_open: 'The Sky Compass Keyhole behind the lamp can turn (fifth_voice).',
  scribe_defeated: 'The Storm Scribe is beaten. Set by the encounter, and by scribe_after.',
  wind_script_restored: 'The Wind Script unrolled and every struck line wrote itself back (scribe_after).',
  fragment6_get: 'The sixth Name Fragment, the Wind Script, is in the bag (scribe_after).',
  compass_restored: 'The Sky Compass stopped spinning and pointed at the shelf (scribe_after).',
  library_reached: 'The Kestrel carried the party up to the Cloud Library (cloud_library).',
  first_page_read: "The hero's first page was read, half of it, under the glass (cloud_library).",
  isles_restored: 'The chimes ring and the board tells the truth again over Zephyr Landing (isles_return).',
  pippa_home: 'The signal apprentice came home to dock four (isles_return).',
  ep6_complete: 'Episode 6 is complete: the compass points north (ep6_ending). Credits roll next.',

  // Beats and world state
  ep6_morning_done: 'The boarding slip scene at the Dune Lantern has played (ep6_morning).',
  mira_asked: 'Mira asked on the first rope landing, and was answered either way (mira_asks). The fight row wakes.',
  mira_told: 'On the Airstair the hero told Mira: Yes, scared. Changes one line in the library and one Talk line.',
  mira_spared: 'On the Airstair the hero told Mira: No. Changes one line in the library and one Talk line.',
  saw_gust: 'Ilex pointed at the first gust lane on the third landing (first_gust).',
  saw_isles: 'The party climbed through the cloud and saw the Skybound Isles (isles_view).',
  liora_met: 'Liora told the party about her sister at dock four (liora_dock).',
  obs_f1_arrived: 'First arrival on the Windward Causeways, floor I (obs_f1_arrival).',
  obs_f2_arrived: 'First arrival in the Hall of Broken Signals, floor II (obs_f2_arrival).',
  obs_f3_arrived: 'First arrival in the Eye of the Storm, floor III (obs_f3_arrival).',
  aeris_memory_1: "Aeris's first memory, The Shortest Way Home, was heard at the old relay (aeris_memory_1).",
  aeris_memory_2: "Aeris's second memory, The Name Removed From the Crew, was heard (aeris_memory_2).",
  pledge_anchor: 'The signal lamp of the first landing of the Eye lit by itself: ANCHOR (pledge_anchor).',
  pledge_listen: 'The signal lamp of the second landing of the Eye lit by itself: LISTEN (pledge_listen).',
  pledge_return: 'The signal lamp of the last landing of the Eye lit by itself: RETURN (pledge_return).',
  compass_key_found: 'The Sky Compass Key was taken from the gold chest on the upper deck of floor I. Set by the chest.',
  sixth_list_get: 'Vex gave the party the sixth list, the one with no names (vex_relay).',
  told_aeris: "On the spire the hero told Aeris the storm hunts their page. Changes one line and Aeris's gift.",
  kept_from_aeris: "On the spire the hero kept it from Aeris. Changes one line and Aeris's gift.",

  // Side: The Signal Beacon of Lost Flights
  beacon_started: 'Suri asked the party to hear the three witnesses and light the old beacon (beacon_start).',
  testimony_liora: 'Liora gave her witness: the false arrival times, her sister at the wrong dock (testimony_liora).',
  testimony_bennet: 'Bennet gave his witness: the Scribe erased the word RETURN from every flight plan (testimony_bennet).',
  testimony_suri: 'Suri gave her witness: the charts redrew themselves overnight (beacon_start).',
  beacon_lit: 'The Signal Beacon of Lost Flights burns again (beacon_light). +20 Fury at the Storm Scribe.',
  beacon_done: 'The Signal Beacon of Lost Flights is done and the Skyhand Coat given (beacon_light).',

  // Side: The Sky Sailors' Emergency Locker
  log_1_found: 'The Departure log was taken from a side deck of floor II. Set by the chest.',
  log_2_found: 'The Distress log was taken from a side deck of floor II. Set by the chest.',
  log_3_found: 'The Rescue log was taken from a side deck of floor II. Set by the chest.',
  locker_found: "The Sky Sailors' Emergency Locker was found on its ledge and opened (locker).",

  // Side: Piri's Dead Letters
  letters_started: "Piri asked for the three letters the storm blew out of his sack (letters_start). The letter chests appear.",
  letter_1_found: 'The first dead letter was taken from the ledge by the post on the Airstair. Set by the chest.',
  letter_2_found: 'The second dead letter was taken from the dead-end deck behind a vane on floor I. Set by the chest.',
  letter_3_found: 'The third dead letter was taken from behind the cracked crate on floor I. Set by the chest.',
  letters_done: "Piri has his three letters and sent them on true courses (letters_done).",
  white_road_letter_get: 'Piri gave the hero an old letter for Willowmere from the White Road, never opened (letters_done).',

  // Added by E6-story (plan 2.2 did not list them): one-shot guards so a retried boss fight is short.
  engine_tried: "The Gale Engine's intro has played once (gale_engine). A retry after a loss is shorter.",
  scribe_tried: "The Storm Scribe's intro has played once (scribe). A retry after a loss is shorter.",
};

/** Map ids of the pack (plan 2.1), for the Talk and banter tables. */
export const EP6_MAPS = ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts',
  'ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie', 'ep6_library'];

export function register() {
  Object.assign(FLAGS, EP6_FLAGS);
  for (const id of Object.keys(EP6_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
}

export default register;
