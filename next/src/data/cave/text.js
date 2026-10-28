// The Deep Stacks: every line the player reads that is not scene staging (docs/DEEP_STACKS_PLAN.md 3 and 9; docs/briefs/
// C2-story-ui.md). Written by C2-story-ui. A pack file (src/data/cave/, never precached): the title keeps its own copy of the
// resume row's label because title.js is precached and draws the row before the pack loads (qa/cave/ui_stacks.test.mjs holds
// the two copies equal).
//
//   PLAQUES       the eleven plaque lines (plaque_hall, plaque_b10 .. plaque_b90, plaque_b100 the approach text): the Stacks'
//                 own voice, one box each, a small truth about names and keeping, no sermon. world.js wires them as the
//                 landings' sign text (plaqueId(floor)); story.js registers them as inspect lines (game/story.js LINES) so the
//                 hall's plaque reads plaque_hall; plaque_b100 waits for a sign in B100's antechamber (C2-sprites-boss).
//   STACKS_TEXT   the toast, card and prompt strings C2-world's world.js reads through textOf(key); its FALLBACK_TEXT has the
//                 same keys: close, bank, quit_ask, quit_yes, quit_no, bank_ask, bank_yes, bank_no, save_refused, floor_tag ({n}),
//                 bookmark_outside, stair_wait, rise ({name}).
//   HOLLIS        the Archivist (name, sprite, voice) and LINES: every line he or the Stacks say in story.js's scenes, by scene.
//   TITLE_ROWS    the title's resume row ({n}), its help, the B100 mark, the failure toast. STACKS_HELP: the plaque screen's
//                 help bar and labels. BAND_NAMES: the five bands and B100 as the plaque screen names a unique's home.
//
// Writing rules (ep1.js): one idea per box, at most 3 lines of 42 characters, ASCII, no em dashes, {hero} = player name.
// Hollis is dry and kind and never explains more than asked (the voice rules of docs/briefs/C2-story-ui.md 1; the tests hold
// the file to them).

export const HOLLIS_ID = 'hollis';

/** The Archivist's record, as src/data/npcs.js shapes one (story.js assigns it into NPCS at register). */
export const HOLLIS = {
  name: 'Hollis', sprite: 'npc_scholar', map: 'cave_landing0', move: 'stand',
  spot: 'The Entrance Hall under the library, behind the long desk (mark archivist), facing the party at party_stop',
  about: 'The one Keeper who stayed down when the Archive went quiet. Minds the desk at the top of the Deep Stacks. Dry, kind, says only what is asked.',
  talk: [
    { ifNot: 'deep_stacks_open', scene: 'stacks_intro' },
    { scene: 'stacks_enter' },
  ],
};

/** The plaques: the Stacks' own voice. One box each; the gold line is the landing's name. */
export const PLAQUES = {
  plaque_hall: '{c:gold}THE DEEP STACKS{/c}\nWhat the Book could not file, it kept. What it kept, it did not forget.',
  plaque_b10: '{c:gold}B10. THE FIRST LANDING{/c}\nNobody wrote the names below this line. They were kept anyway.',
  plaque_b20: '{c:gold}B20. THE ROOT CELLARS{/c}\nThe roots came up and the Keepers let them. A root remembers where it drank.',
  plaque_b30: '{c:gold}B30. THE SECOND SHELVING{/c}\nEvery shelf here was shelved twice, by two hands. Neither signed. Both are kept.',
  plaque_b40: '{c:gold}B40. THE COURT BELOW{/c}\nA court sat here once and ruled on names. Nobody remembers its own.',
  plaque_b50: '{c:gold}B50. HALFWAY{/c}\nThe Keepers who read this far stopped signing their work. The work stayed.',
  plaque_b60: '{c:gold}B60. THE EMBER SHELVES{/c}\nThe shelves are warm. Something below is still reading. It is not at your page yet.',
  plaque_b70: '{c:gold}B70. THE ASH{/c}\nAsh on every page, every word under it. Fire takes the paper and leaves the name.',
  plaque_b80: '{c:gold}B80. THE FORGE OF NAMES{/c}\nThe forge made names, and the forge unmade them. The Stacks kept the shavings.',
  plaque_b90: '{c:gold}B90. THE LAST LANDING{/c}\nBelow is the one who bound the book. It is binding still.',
  plaque_b100: '{c:gold}B100. THE BINDING{/c}\nThe last page. What the Stacks kept is bound here, and the binding is awake.',
};
export const PLAQUE_IDS = ['plaque_hall', 'plaque_b10', 'plaque_b20', 'plaque_b30', 'plaque_b40', 'plaque_b50', 'plaque_b60', 'plaque_b70', 'plaque_b80', 'plaque_b90', 'plaque_b100'];

/** The strings world.js shows on its own (cards, toasts, the two confirms, the refusals). Keys match its FALLBACK_TEXT. */
export const STACKS_TEXT = {
  close: 'The Stacks close.',
  bank: 'The book closes where you stand.',
  quit_ask: 'Leave the Stacks? This reading ends here. What it gave goes back on the shelf.',
  quit_yes: 'Leave', quit_no: 'Stay',
  bank_ask: "Close the book here? This reading's gifts come up with you.", bank_yes: 'Close it', bank_no: 'Not yet',
  save_refused: 'The Stacks keep their own pages.',
  floor_tag: 'B{n}',
  bookmark_outside: 'The Bookmark marks nothing up here.',
  stair_wait: 'The stair waits. A reading begins at the desk, with Hollis.',
  rise: '{name} rises!',
  // C4-fixes: the stair the generator refused twice (world.js beforeDoor keeps the party on the floor); the Bookmark's own line
  // (world.js writes it over items.js's at register); the vault offer on B1 of a reading that brought the vault down
  stair_stuck: 'The stair goes down into nothing. A Bookmark still closes the book; the menu still leaves.',
  bookmark_desc: "Closes the book where you stand. This reading's blue gifts come up with you.",
  vault_ask: 'The vault came down with you. Put it on?', vault_yes: 'Put it on', vault_no: 'Later',
  vault_worn: 'Wearing {n} from the vault.',
};

/** Hollis's lines and the Stacks' own, by scene. {n} a count, {floor} a floor, {vault} and {total} the vault's numbers. */
export const LINES = {
  // the library's trapdoor before ep1_complete (stacks_locked, narration)
  locked: "A trapdoor, iron-banded, sealed with the Keepers' glyph. It does not move.",
  // the first talk (stacks_intro): a greeting, three rules, then the offer
  greet: 'Hollis. Keeper, once. The others went up when the Archive went quiet. I stayed down to mind the desk.',
  rule_1: 'Under this hall the Stacks go down a hundred floors. Whoever goes down goes as a first page: level one, empty hands.',
  rule_2: 'What you find down there, the Stacks lend. A red chest lends. A blue chest gives, and a gift you may carry out.',
  rule_3: "One way up alive: the Keeper's Bookmark. Fall instead, and the Stacks take back this reading's gifts.",
  // the offer (stacks_enter): yes, the record, or no; then one confirm
  offer: 'Begin a reading?',
  offer_yes: 'Begin', offer_record: 'The record', offer_no: 'Not yet',
  confirm: 'Level one. Empty hands. The Stacks lend the rest. Down you go?',
  confirm_yes: 'Go down', confirm_no: 'Stay',
  stay: 'The desk is not going anywhere. Neither am I.',
  // a reading still waits in the suspend save (C4-fixes, CRITIQUE_STACKS 12): asked before a new one would write over it
  abandon: 'A reading is open below. Abandon it?',
  abandon_yes: 'Abandon it', abandon_no: 'Keep it',
  abandon_kept: 'Then it waits where you left it. The title page will take you back down to it.',
  refused: 'The stair is not taking anyone just now. Come back when the hall is quieter.',
  // the vault reminder (stacks_vault), once, the first reading that starts with something in the vault
  vault: 'Your vault is not empty. What the Stacks gave you before waits in your pack at the first page. Put it on before you walk.',
  // back in the hall (stacks_return), by how the reading ended
  bank_kept: '{n} kept. The Stacks noticed.',
  bank_kept_2: 'They are yours now, up here and down there. Go and wear them in daylight.',
  bank_none: 'The book is closed and nothing new is kept. B{floor} is written down. That is not nothing.',
  die: 'The Stacks close. You woke here.',
  die_lost: 'They took back what they lent, and this time what they gave. The vault from before is untouched.',
  die_safe: 'They took back what they lent. Nothing of yours went with it. B{floor} is written down.',
  quit: 'You left the Stacks. That reading is lost.',
  quit_2: 'The pages you turned are blank again. The next reading starts at the first.',
  clear: 'The Binder is bound. The Stacks stay open for what is left on the shelves.',
  clear_2: 'You read to the last page. Nobody had. I will write that down, and then I will sit for a while.',
  // the record (stacks_record): one line, then the plaque screen
  record_none: 'No page has been turned yet. The record is blank, which is the one honest thing a record can be.',
  record_empty: 'B{floor} is the deepest page anyone has read. The vault is empty. The blue chests are waiting.',
  record: 'B{floor} is the deepest page anyone has read. {vault} of {total} names in the vault. The rest are waiting.',
  // B100 (binder_intro, binder_cleared): the card names what was avoided (H5 style), one box, one line after
  binder_card: 'THE BINDER',
  binder_sub: 'Keeper of the Spine. Nobody read to the last page.',
  binder_intro: 'The last shelf. Something is bound to it, and it has been reading you since the first page.',
  binder_retry: 'The Binder waits where you left it. Fire and light trouble the spine; keep them coming.',
  binder_cleared: 'The Binder comes apart along its spine. On the dais lies one quill, still wet. The Stacks are read to the last page.',
};

/** The title's two rows. `resume` is duplicated in src/scenes/title.js (STACKS_RESUME_LABEL); the test holds them equal. */
export const TITLE_ROWS = {
  resume: 'Resume the Deep Stacks (B{n})',
  resume_help: 'Back to your reading, at the floor you left.',
  resume_failed: 'The Stacks could not be reopened.',
  cleared: 'B100',
};

/** The plaque screen's help bar and labels. */
export const STACKS_HELP = {
  screen: 'Read a name. {i:btn_cancel}: back.',
  title: 'The Deep Stacks',
  vault: 'Vault',
  unfound: 'Not yet found. The Stacks still hold it.',
  record: { deepest: 'Deepest', readings: 'Readings', clears: 'Read through', time: 'Time below' },
};

/** The bands as the plaque screen names a unique's home (items.js `band`; 0 is the Binder's prize). */
export const BAND_NAMES = {
  0: 'The Binder, B100',
  1: 'The Catalogue, B1 to B19',
  2: 'The Root Cellars, B20 to B39',
  3: 'The Court Below, B40 to B59',
  4: 'The Ember Shelves, B60 to B79',
  5: 'The Forge of Names, B80 to B99',
};

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen'];
/** "Three names" / "One name" (digits past seventeen). */
export function countNames(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  return `${WORDS[n] || String(n)} ${n === 1 ? 'name' : 'names'}`;
}

/** Fill {n}, {floor}, {vault}, {total}, {name} in a line. */
export function fillLine(text, ctx = {}) {
  return String(text == null ? '' : text).replace(/\{(n|floor|vault|total|name)\}/g, (m, k) => (ctx[k] == null ? m : String(ctx[k])));
}

/** register() is a no-op (the data registers nothing); index.js calls it like every module's. */
export function register() {}
export default register;
