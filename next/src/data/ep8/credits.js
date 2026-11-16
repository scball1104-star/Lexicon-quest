// Episode 8, "The Last Word": the whole game's credits, once (EPISODE8 section 6.3), and the end cards. CREDITS_EP8 plays
// over `the_last_word` after ep8_complete (E8-pack's hooks.js CREDITS_HANDOFF[8]); END_CARD_EP8 follows it. While EP8_LIVE,
// END_CARD_EP7_LIVE replaces the Episode 7 end card. EPISODE8_CARD is the title card Episode 7's ending shows (the same
// words as src/data/ep7/text.js, kept here for the Episode 8 title and the quick start).
//
// The order: the end title; the cast by place in the order the player met them (the Ledger's order, Willowmere to the First
// Library), with each realm's canon epilogue sentence, word for word, on its own card over that realm's existing key art
// (`art`: no new art); the party last; then the chosen ending's banner; the makers (as Episodes 1 to 7 credit them);
// "From the playtesters" (no names, AGENTS.md); the sources as the provenance files state them; the closing card "Names
// kept: N of M" from this save. No real person is named or thanked beyond the makers card Episodes 1 to 7 already carry
// (decision A); no kids' names.
//
// Two cards depend on the save: `ending` (the chosen ending's title) and `names_kept` (the count). creditsEp8(hasFlag,
// count) resolves them; the static CREDITS_EP8 carries them as { slot } cards for a reader that cannot (the credits scene
// fills only {hero}: E8-pack's hook or E8-scene-ui calls creditsEp8 at roll time).

import { END_CARD_EP7 } from '../ep7/text.js';

export const EPISODE8_CARD = { text: 'Episode 8: The Last Word', sub: 'The lists were written here.' };
export const END_TITLE_EP8 = { text: 'Lexicon Quest', sub: 'The End' };
/** The cold open's card, and under it the new line (EPISODE8 beat 30). */
export const COLD_OPEN_CARD = { text: 'In Aethelgard, every name is a promise.', sub: 'This one was kept.' };
/** The plan's end card words in two lines (each within 42 characters: EPISODE8 choice 21). */
export const END_CARD_EP8 = { text: 'Every road is open.', sub: 'The Deep Stacks wait under the library.', frames: 300, backdrop: 'ep8_dialog_keyart' };
export const END_CARD_EP7_LIVE = { ...END_CARD_EP7, sub: 'Episode 8 begins in the morning.' };
/** A line the end title can carry under it in a reader that shows three lines (unused by the title card). */
export const END_LINE_EP8 = 'Every name is a promise. Thank you for keeping ours.';

const EPILOGUE = (line, art) => ({ heading: '', lines: [line], art, epilogue: true });

export const CREDITS_EP8 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 8: The Last Word'] },
  { heading: 'Willowmere', lines: ['Hazel, who knew you on sight', 'Elder Mael and his Register', 'Oren and Hal', 'Tess the courier',
    'Wick and his tag'], art: 'dialog_keyart' },
  { heading: 'Willowmere', lines: ['Lark, Nella and Edda', 'Sergeant Holt', 'Garrick of the forge', 'Iris of the library',
    'Pip the bellkeeper'], art: 'dialog_keyart' },
  { heading: 'Willowmere', lines: ['Barnaby, who slept through it', 'Pell of the inn', 'Marten, who carried you'], art: 'dialog_keyart' },
  { heading: 'Willowmere Valley', lines: ['Quill of the lost bridge'], art: 'dialog_keyart' },
  { heading: 'The Wider Valley', lines: ['Brindle, Tamsin and Ferrick', 'Hesper of the Orrery', 'Odo and Yarrow'], art: 'dialog_keyart' },
  { heading: 'Hollowmere', lines: ['Mayor Elian', 'Sister Anwen', 'Tovin the ferryman', 'Lena the watchmaker', 'Vessa of the Silverglass'],
    art: 'dialog_keyart_ep2' },
  { heading: 'Hollowmere', lines: ['Corin, Nico and Sava', 'Orla of the shrine', 'Wren of the Signless Inn', 'Fitch, and his stock',
    'Aurel, the Nameless King'], art: 'dialog_keyart_ep2' },
  EPILOGUE('Mira opens the mirrors and shows the names she recovered.', 'dialog_keyart_ep2'),
  { heading: 'Emberpeak', lines: ['Foreman Veyra', 'Ilya', 'Sella, Harl and Bess', 'Taro and Rusk',
    'Mara of the First Bell'], art: 'dialog_keyart_ep3' },
  EPILOGUE("Bram rings Mara's forge bell one last time.", 'dialog_keyart_ep3'),
  { heading: 'Valewyn', lines: ['Regent Lyra', 'Captain Hale', 'Dorian, Joss and Ada', 'Nilo of the bell', 'Linn, Vance and Sori'],
    art: 'ep4_dialog_keyart' },
  EPILOGUE('Regent Lyra reads the amended charter to her city.', 'ep4_dialog_keyart'),
  { heading: 'Saffron Haven', lines: ['Nomad Sel', 'Yara, Kamal and Nasrin', 'Laleh and Omar', 'Yasmin and Hassan', 'Tamir and Ishra'],
    art: 'ep5_dialog_keyart' },
  EPILOGUE('Sel sends caravans home.', 'ep5_dialog_keyart'),
  { heading: 'Zephyr Landing', lines: ['Captain Aeris of the Kestrel', 'Liora, Bennet and Suri', 'Ilex and Nova', 'Piri of the dead letters',
    'Thea and Pippa Voss'], art: 'ep6_dialog_keyart' },
  EPILOGUE('Aeris signals the missing pilots.', 'ep6_dialog_keyart'),
  { heading: 'Palehaven', lines: ['Nox, the Keeper of the Hollow North', 'Bryn the Frost Keeper', 'Maera and Torr', 'Eira the Glassblower',
    'Sol and Mirael'], art: 'ep7_dialog_keyart' },
  EPILOGUE('Nox opens the northward gates.', 'ep7_dialog_keyart'),
  { heading: 'The Scriptorium', lines: ['Elowen, Keeper of the Scriptorium', 'Ione, Archivist of True Names', 'Fen, Apprentice Keeper',
    'Quinn the Page Runner'], art: 'ep8_dialog_keyart' },
  { heading: 'The Scriptorium', lines: ['Sorel the Restorer', 'Arun the Candlekeeper', 'Meya the First Student'], art: 'ep8_dialog_keyart' },
  { heading: 'The First Library', lines: ['The Unnamed Sentry', 'Grief and Change', 'The First Keeper, who read his own line'],
    art: 'ep8_dialog_keyart' },
  { heading: 'The Road', lines: ['Vex Quill, who kept your beginning'], art: 'ep8_dialog_keyart' },
  { heading: 'The Party', lines: ['{hero}, who answered to it', 'Mira, who read it aloud', 'Bram, who stood in front'], art: 'ep8_dialog_keyart' },
  { slot: 'ending', heading: 'The Last Word', lines: ['{ending}'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'From the playtesters', lines: ['Who played it first, and said so.'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest', 'with Suno, and in code'] },
  { heading: 'Art', lines: ['Painted source art made for', 'Lexicon Quest with Runway', 'Pixels, pages and sound made in code'] },
  { heading: '', lines: ['Every name is a promise.', 'Read it back, then answer.'] },
  { slot: 'names_kept', heading: 'Names kept', lines: ['{kept} of {total}'] },
];

export const ENDING_TITLES = { ending_return: 'Ending: Every Name Returned', ending_choose: 'Ending: The Right to Choose' };

/**
 * The credits for one save: the `ending` card names the chosen ending (dropped when neither flag is set), the `names_kept`
 * card reads "Names kept: N of M" ({ kept, total }, from ledger.js namesKept; dropped when no count is given). Pure.
 */
export function creditsEp8(hasFlag = () => false, count = null) {
  const out = [];
  for (const c of CREDITS_EP8) {
    if (c.slot === 'ending') {
      const f = Object.keys(ENDING_TITLES).find((k) => hasFlag(k));
      if (f) out.push({ heading: c.heading, lines: [ENDING_TITLES[f]] });
      continue;
    }
    if (c.slot === 'names_kept') {
      if (count && Number.isFinite(count.kept) && Number.isFinite(count.total)) out.push({ heading: '', lines: [`Names kept: ${count.kept} of ${count.total}`] });
      continue;
    }
    out.push(c);
  }
  return out;
}

export function register() { /* data only: E8-pack's hooks.js reads CREDITS_EP8, creditsEp8 and the cards */ }

export default register;
