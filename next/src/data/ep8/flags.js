// Episode 8, "The Last Word": every story flag of docs/EPISODE8_PLAN.md section 2.2, each with a one-line meaning
// (EP8_FLAGS), plus the guards E8-story added (listed at the end, EPISODE8.md section 9): two one-shot boss guards and the
// twelve toll steps of the bell night. register() assigns them into FLAGS and pushes their ids onto FLAG_IDS (that array is
// computed once in quests.js, so a pack has to push). Idempotent. Chest flags the Talk hints read are declared too. The
// counter credits8_rolled is not a flag; pop-up books carry no flag (they reset on every arrival, plan 5.1).
// Part of the lazy `ep8` pack: nothing in a core file imports this module.

import { FLAGS, FLAG_IDS } from '../quests.js';

/** The cold open's twelve names, in its order (src/data/story/ep1.js TOLL_NAMES), tolled again on the bell night. */
export const EP8_TOLL_NAMES = ['Hazel', 'Mael', 'Oren', 'Pip', 'Tess', 'Iris', 'Holt', 'Garrick', 'Nella', 'Wick', 'Edda', 'Bram'];
export const EP8_TOLL_FLAGS = EP8_TOLL_NAMES.map((_, i) => `ep8_toll_${i + 1}`);

export const EP8_FLAGS = {
  // Main
  ep8_started: 'Episode 8 has begun: Nox said the last truth lies in the First Library (ep8_morning). Only that scene sets it.',
  ep8_roofed: 'The party climbed to the Stillheart roof by day and stepped onto the stair of light (ep8_roof).',
  stair_arrived: 'The party set foot on the Stair of Written Light (stair_arrival). The door back to the roof opens.',
  first_rub_done: 'The two Index Hounds on the stair are beaten (first_rub). Bram asked why the ink never takes the hero.',
  eraser_seen: 'The party saw a faceless shape rub out the stair far above them (rubbed_steps).',
  saw_scriptorium: 'The party looked down on the Scriptorium from the South Margin gate (south_margin).',
  scriptorium_arrived: 'The party walked into the Scriptorium (scriptorium_arrival). The side stories open.',
  read_learned: 'Mira read Meya\'s rubbed-out word back and learned Read Aloud (first_word). The skill is learned on it.',
  librarian_met: 'The old Librarian at the Index gave the party reader\'s cards and went up through his door (meet_librarian).',
  card_read: 'Mira read her reader\'s card and knew the hand of every list (meet_librarian).',
  elowen_met: 'The Keeper of the Scriptorium showed the party the blanket tag and the line that ran (elowen_scriptorium).',
  library_open: 'Nox opened the First Library\'s great door (library_door).',
  library_entered: 'The party set foot in the First Library (catalog_arrival).',
  ink_key_found: 'The Original Ink Key was taken from the gold chest on the northern shelf of floor I. Set by the chest.',
  library_f1_done: 'The lift up from the Catalog of Lost Lives was taken (library_f1_lift).',
  sentry_defeated: 'The Unnamed Sentry is beaten. Set by the encounter, and by the scene after a win.',
  library_f2_done: 'The lift up from the Palimpsest Galleries was taken (library_f2_lift).',
  beginning_seen: 'The Library replayed the night of the vault fire: the hero\'s beginning (keeper_memory_c).',
  name_told: 'Nox said the name at the keyhole: the hero\'s own (the_name). The door to the Last Word opens.',
  vex_arrived: 'Vex came up the gallery stair with the first page, whole, and gave it to the hero (eraser).',
  eraser_defeated: 'The Eraser is beaten. Set by the encounter, and by eraser_after.',
  lexicon_restored: 'The First Lexicon opened by itself and the names flew home (eraser_after).',
  fragment8_get: 'The eighth Name Fragment, the First Lexicon, is in the bag (eraser_after).',
  keeper_named: 'The Eraser\'s face came back and he was the First Keeper again; he said Nox\'s name (eraser_after).',
  ending_return: 'The final choice: every stolen name returned to the public pages. Permanent on this save (last_choice).',
  ending_choose: 'The final choice: each person chooses whether to bear their name. Permanent on this save (last_choice).',
  page_shelved: 'The hero put the first page on the first shelf of the Library (last_page).',
  night_read: 'The Concordance\'s run read back up its page: the birth line, the eleven names, his own (last_page).',
  eighth_star: 'The eighth star on the dome lit and took a sign: an open book with one line in it (last_page).',
  hero_kept: 'The hero\'s own name is kept in the Ledger at last (last_page).',
  scriptorium_open: 'Every sign in the Scriptorium finished its word; Elowen said the name she gave (scriptorium_open).',
  home_reached: 'Aeris flew the party home and Hazel met them at the door (home).',
  ep8_complete: 'Episode 8 is complete: the thirteenth bell tolled the hero\'s name (thirteenth_name). Credits roll next.',

  // Beats and world state
  ep8_morning_done: 'The morning in the Keeper\'s Watch has played (ep8_morning).',
  afraid_yes: 'At the first step the hero told Nox: Yes, frightened. Changes one line in the_name.',
  afraid_no: 'At the first step the hero told Nox: No. Changes one line in the_name.',
  first_book_read: 'Nox showed the party the first pop-up book at the first gap (first_book).',
  lib_f1_arrived: 'First arrival in the Catalog of Lost Lives, floor I (catalog_arrival).',
  lib_f2_arrived: 'First arrival in the Palimpsest Galleries, floor II (palimpsest_arrival).',
  lib_f3_arrived: 'First arrival on the Unwritten Page, floor III (unwritten_arrival).',
  keeper_memory_a: 'The First Keeper\'s first memory, The First Duty, played at the doorway alcove (keeper_memory_a).',
  keeper_memory_b: 'The First Keeper\'s second memory, The Order That Changed Everything, played (keeper_memory_b).',
  keeper_memory_c: 'The First Keeper\'s third memory, The Last Unwritten Name, played on the first landing (keeper_memory_c).',
  told_elowen: 'Elowen asked if the hero ever wondered who left them: Not really. Changes her gift (the Binder\'s Awl).',
  spared_elowen: 'Elowen asked if the hero ever wondered who left them: Every day. Changes her gift (Riverwater Thread).',
  answered_yes: 'At the Last Word the hero answered the Eraser: It\'s my name.',
  answered_page: 'At the Last Word the hero answered the Eraser: Then come and take it.',
  told_hazel: 'Hazel asked if the hero found where they came from: I did. Changes her post-game line.',
  spared_hazel: 'Hazel asked if the hero found where they came from: No. Changes her post-game line.',

  // Side: The Living Concordance
  concordance_started: 'Ione asked the party to hear three witnesses and light the Concordance folio (concordance_start).',
  testimony_ione: 'Ione gave her witness: an honest archive records joy and loss (concordance_start).',
  testimony_fen: 'Fen gave his witness: the list of names no one was allowed to forget (testimony_fen).',
  testimony_elowen: 'Elowen gave her witness: each binding hides one witness page (testimony_elowen).',
  concordance_lit: 'The Concordance folio is lit in the square (concordance_light). +25 Fury at the Eraser; a rest point.',
  concordance_done: 'The Living Concordance is done and the Bookcloth Coat given (concordance_light).',

  // Side: The Archive of Uncensored Lives
  page_names_found: 'The evidence page The Names was taken from a side gallery of floor II. Set by the chest.',
  page_order_found: 'The evidence page The Order was taken from a side gallery of floor II. Set by the chest.',
  page_correction_found: 'The evidence page The Correction was taken from a side gallery of floor II. Set by the chest.',
  archive_open: 'The Archive of Uncensored Lives was opened with the three evidence pages (uncensored_archive).',

  // Side: Quinn's Drifting Pages
  drift_started: 'Quinn asked for the three pages that drifted out of the stacks (drift_start).',
  drift_1_found: 'The first drifting page was taken from the side ledge of the Stair. Set by the chest.',
  drift_2_found: 'The second drifting page was taken from the side alcove of floor I. Set by the chest.',
  drift_3_found: 'The third drifting page was taken from behind the cracked drawer stack of floor I. Set by the chest.',
  drift_done: 'Quinn bound the three pages back and read out the oldest line (drift_done).',

  // Added by E8-story (plan 2.2 did not list them): one-shot guards so a retried boss fight is short, and the bell night's
  // twelve toll steps (the cold open's shape: step n tolls only after step n-1).
  sentry_tried: 'The Unnamed Sentry\'s intro has played once (unnamed_sentry). A retry after a loss is shorter.',
  eraser_tried: 'The Eraser\'s intro has played once (eraser). A retry after a loss is shorter.',
};
EP8_TOLL_NAMES.forEach((name, i) => {
  EP8_FLAGS[EP8_TOLL_FLAGS[i]] = `The bell night: bell ${i + 1} tolled for ${name} again (ep8_toll_${i + 1}).`;
});

/** Map ids of the pack (plan 2.1), for the Talk and banter tables. */
export const EP8_MAPS = ['ep8_stair', 'ep8_scriptorium', 'ep8_sc_inn', 'ep8_sc_shop', 'ep8_sc_atelier', 'ep8_sc_index',
  'ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word', 'ep8_bell_night'];

export function register() {
  Object.assign(FLAGS, EP8_FLAGS);
  for (const id of Object.keys(EP8_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
}

export default register;
