// Episode 1 expansion, "The Wider Valley": the new cast (plan 2.5 and 9.1) and the talk entries prepended to six existing
// NPCs. register() adds the records whose region is on and applies the prepends through prependTalk (npcs.js seam).
// Idempotent: records are assigned by id, each prepended entry object is added once.
//
// Record shape is the one in src/data/npcs.js. A talk entry that starts a scene uses { scene: 'id' }; the scene guards itself
// (story.js SCENE_CONDITIONS) and also checks x1On(region). Voices follow docs/story/EPISODE1.md section 4 and plan 9.2:
// warm first, one idea per box, names spoken with weight, nobody explains the forgetting. Each new NPC has one Episode 2 line
// (ep2_complete) and one Episode 3 line (ep3_started), at most two boxes, and before Garrick's name is given back nobody here
// says it.

import * as NPCMOD from '../npcs.js';
import { X1_REGIONS } from './live.js';
import { X1_MAP_REGION } from './flags.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;

const E2 = 'ep2_complete';
const E3 = 'ep3_started';
const ALL_STRAYS = ['stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found'];
const ALL_STARS = ['star_1_read', 'star_2_read', 'star_3_read'];
const ALL_CRATES = ['crate_1_done', 'crate_2_done', 'crate_3_done'];

const sheep = (n, spot, sceneId) => ({
  name: 'Stray Sheep', sprite: 'animal_sheep', map: spot.map, spot: spot.at, move: 'stand',
  show: { if: 'strays_started', ifNot: `stray_${n}_found` },
  about: `One of Brindle's five strays (stray ${n}). Talk runs ${sceneId}; it trots home and the flag hides it.`,
  talk: [{ scene: sceneId }],
});

export const X1_NPCS = {
  brindle: {
    name: 'Brindle', sprite: 'npc_brindle', map: 'x1_downs',
    spot: 'Thornfold, at the sheep fold gate (mark fold_gate / brindle)', move: 'turn',
    about: 'An old shepherd. Counts his flock by whistling, does not name his sheep, found the stones blank. Slow, dry, kind.',
    talk: [
      { if: ALL_STRAYS, ifNot: 'strays_done', scene: 'strays_done' },
      { if: 'reeve_named', ifNot: 'rollcall_done', scene: 'rollcall_done' },
      { ifNot: 'strays_started', scene: 'brindle_strays' },
      { if: 'stones_seen', ifNot: 'rollcall_started', scene: 'rollcall_start' },
      { if: 'list_started', ifNot: 'list_rhyme', scene: 'list_rhyme' },
      { if: 'strays_started', ifNot: 'strays_done', lines: [
        'Seven in the fold. I whistle for twelve anyway.',
        'A sheep hides where it feels small. Behind hay. Among stones. Beside a wall with a crack in it.',
      ] },
      { if: 'rollcall_started', ifNot: 'rollcall_done', lines: [
        'The stones want their names said, not read. Paper is no good to a stone.',
        'Bring the roll and the copy, and your own voices. Mind the barrow, if you go in. Something counts down there.',
      ] },
      { if: E3, lines: [
        'They say a smith has gone missing from his own name. I counted the fold three times today. Twelve.',
        'Twelve is right. I checked.',
      ] },
      { if: E2, lines: [
        'The east road has a name again, they say. I told the sheep. They took it well.',
      ] },
      { if: 'rollcall_done', lines: [
        'Twelve in the fold. Thirteen on the hill. Twelve is right, and thirteen is right, and I have stopped minding.',
      ] },
      { if: 'strays_done', lines: [
        'Twelve in the fold. Twelve is right. Twelve is always right.',
        'Never named a one of them. A sheep knows its whistle.',
      ] },
      { lines: [
        'Twelve in the fold. Twelve is right. Twelve is always right.',
      ] },
    ],
  },

  tamsin: {
    name: 'Tamsin', sprite: 'npc_tamsin', map: 'x1_loomhouse',
    spot: 'The Loom House, at the great loom (mark tamsin)', move: 'stand', service: { type: 'shop', id: 'thornfold_loom' },
    about: 'The weaver and the hamlet shopkeeper. Stitches a name into every cloth she sells, so it comes home. Brisk, warm, sharp.',
    talk: [
      { if: 'crates_started', ifNot: 'crate_1_done', scene: 'crate_delivered_1' },
      { if: E3, lines: [
        'A smith, they say, who cannot find his own name. I put a hem on the loom for him. Blank. It seemed polite.',
      ] },
      { if: E2, lines: [
        'A tinker came by saying Hollowmere. I stitched it into his scarf, twice. The stitching does the remembering.',
      ] },
      { if: 'stones_lettered', lines: [
        'My sampler went dark again. No. Came back. Every stitch. I sat with it till the candle went.',
        'Hold still. Ah. There. That stitch is older than my mother.',
      ] },
      { lines: [
        'Hold still. Ah. There. That stitch is older than my mother.',
        'Every cloth I sell has a name in the hem, so it finds its way home. Look as long as you like.',
      ] },
    ],
  },

  ferrick: {
    name: 'Ferrick', sprite: 'npc_ferrick', map: 'x1_millrace',
    spot: "Ferrick's Landing, by the weir-keeper's shed (mark ferrick)", move: 'turn', service: { type: 'shop', id: 'millrace_stall' },
    about: 'The weirkeeper, sixty, gruff. Puts up signs nobody reads. Kept the chain on the Drovers\' Road and does not know why.',
    talk: [
      { ifNot: 'ferrick_met', scene: 'ferrick_meet' },
      { if: 'crates_started', ifNot: 'crate_3_done', scene: 'crate_delivered_3' },
      { if: 'mill_started', ifNot: 'pin_found', lines: [
        'Pin went through the grating. Culvert arch, east of the weir. Go carefully. Something grinds down there.',
      ] },
      { if: 'pin_found', ifNot: 'mill_done', lines: [
        'Pin in your pocket? Then the wheel is waiting. I will watch the weir. Habit.',
      ] },
      { if: 'mill_done', ifNot: E2, lines: [
        'Pond is filling. Slowly. Like a rumor. Hal came down the road with his brother. Both of them talking.',
        'Put the chain up again if you like. I will not.',
      ] },
      { if: E3, lines: [
        'A smith has lost his name, I hear. Put a sign up for him. Blank board. Seemed right.',
      ] },
      { if: E2, lines: [
        'The town to the east got its name back. Good. Names ought to travel by river.',
      ] },
      { lines: [
        'Weir broke. Told nobody. Nobody came. That is how I knew.',
        'Stall is open. Take what you need. Do not ask the price twice.',
      ] },
    ],
  },

  hesper: {
    name: 'Hesper', sprite: 'npc_hesper', map: 'x1_orrery',
    spot: "The Orrery, at the telescope (mark hesper)", move: 'turn',
    about: "The Orrery's last tender, a Keeper's apprentice's grandchild. Precise, absent-minded, a little eerie; talks to the stars as if they were late for dinner.",
    talk: [
      { if: ALL_STARS, ifNot: 'orrery_aligned', scene: 'orrery_align' },
      { if: 'stars_started', ifNot: ALL_STARS[0], lines: [
        'Three dark stars. A milestone, a door, a tower. Hidden ink, if my grandmother was right. She usually was. She disliked it.',
      ] },
      { if: 'orrery_aligned', ifNot: 'stars_done', lines: [
        'The hatch is open. Below is the Cellar. Nobody has been down since my grandmother, and she would not say what for.',
      ] },
      { if: E3, lines: [
        'The stars say a name went out this week, far to the east. They cannot say whose. They say it kindly.',
      ] },
      { if: E2, lines: [
        'A town found its name. The brass does not sing for it, but the dome noticed. I felt it from here.',
      ] },
      { if: 'stars_done', lines: [
        'Nine stars lit. They are all very smug about it. Late, every one, and smug.',
        'Look up now and then. That is all the Keeping there is.',
      ] },
      { lines: [
        'Late again, all of you. The soup has gone cold.',
        'Not you. I was talking to the stars. They are never on time.',
      ] },
    ],
  },

  odo: {
    name: 'Odo', sprite: 'npc_odo', map: 'x1_highmoor',
    spot: "The Watchtower hut, beside the turf door (mark odo)", move: 'wander', radius: 1,
    about: 'The chime keeper of the High Moor. A hermit in a turf hut who walks the nine chime posts every dawn and says each word aloud. Slow, plain, a little funny.',
    talk: [
      { ifNot: 'odo_met', scene: 'odo_meet' },
      { if: 'list_started', ifNot: 'list_song', scene: 'list_song' },
      { if: E3, lines: [
        'Wind has turned. East wind, and it smells of ash. I say the nine words twice a day now.',
      ] },
      { if: E2, lines: [
        'A name came back across the heath on the wind. I said it to Post Nine. It kept it.',
      ] },
      { lines: [
        'Nine. I count them. They count me.',
        'A post that is not said goes quiet. So I say them. Wind and stone do the rest.',
      ] },
    ],
  },

  yarrow: {
    name: 'Yarrow', sprite: 'npc_yarrow', map: 'x1_larchhill',
    spot: "The apiary cottage, among the hives (mark yarrow)", move: 'wander', radius: 1,
    about: 'The beekeeper of Larchhill. Keeps hives on every terrace and a windmill\'s worth of opinions. Her honey is what Hal bakes with. Warm, practical, a little stung.',
    talk: [
      { ifNot: 'yarrow_met', scene: 'yarrow_meet' },
      { if: 'crates_started', ifNot: 'crate_2_done', scene: 'crate_delivered_2' },
      { if: E3, lines: [
        'Hal says there is a smith in trouble. I sent honey. It is all I know how to send.',
      ] },
      { if: E2, lines: [
        'The bees swarmed east last week and came back smelling of lake. Whatever happened over there, it went well.',
      ] },
      { lines: [
        'Forty hives. Forty-one. Sorry. Say it again, I was counting.',
        'Mind the third terrace. They are sulking.',
      ] },
    ],
  },

  stray_1: sheep(1, { map: 'x1_downs', at: 'The Old Fold, hidden behind the hay (20, 26)' }, 'stray_found_1'),
  stray_2: sheep(2, { map: 'x1_downs', at: 'Inside the ring of standing stones' }, 'stray_found_2'),
  stray_3: sheep(3, { map: 'x1_downs', at: 'The Ridge, (33, 5)' }, 'stray_found_3'),
  stray_4: sheep(4, { map: 'valley', at: 'The fenced valley pasture, (7, 20)' }, 'stray_found_4'),
  stray_5: sheep(5, { map: 'x1_downs', at: 'Behind the cracked wall of the Old Fold (17, 22)' }, 'stray_found_5'),

  fold_sheep_a: {
    name: 'Sheep', sprite: 'animal_sheep', map: 'x1_downs', spot: 'Inside the sheep fold', move: 'wander', radius: 1,
    about: 'An ambient fold sheep. Does not know its own name and does not mind.',
    talk: [{ lines: [{ who: null, text: 'The sheep chews, regards you for a long moment, and decides you are not interesting. Baa.' }] }],
  },
  fold_sheep_b: {
    name: 'Sheep', sprite: 'animal_sheep', map: 'x1_downs', spot: 'Inside the sheep fold, by the trough', move: 'wander', radius: 1,
    about: 'An ambient fold sheep.',
    talk: [{ lines: [{ who: null, text: 'This sheep is standing very close to the other sheep. Baa, it says, to nobody in particular.' }] }],
  },
};

/** Speaker tags for the two boss actors the scenes address by id (display names for the dialogue window). */
export const X1_SPEAKERS = {
  barrow_reeve: 'The Barrow Reeve', millstone_golem: 'The Millstone Golem',
};

// ------------------------------------------------------------------------------------------------
// Talk entries added at the FRONT of existing NPCs. Every entry needs a flag only the expansion sets, or stops showing once
// the main story moves on (ifNot ep1_complete / ep2_started), so a save that never touched the expansion reads exactly as before
// and an expansion quest can never hide an old scene (Iris's farewell, Hal's return) for good.
// ------------------------------------------------------------------------------------------------
export const X1_TALK_PREPEND = {
  iris: [
    { if: ['list_rhyme', 'list_ledger', 'list_song'], ifNot: 'list_done', scene: 'list_done' },
    { if: ['downs_arrived', 'archivore_defeated', 'mira_joined'], ifNot: 'list_started', scene: 'list_start' },
    { if: 'rollcall_started', ifNot: 'roll_found', scene: 'iris_roll' },
    { if: 'list_started', ifNot: ['list_done', 'ep1_complete'], lines: [
      'A rhyme, a name from a ledger, a song for some posts. Three small things. They are the ones that go first.',
    ] },
  ],
  quill: [
    { if: 'rollcall_started', ifNot: 'copy_found', scene: 'quill_copy' },
    { if: 'stars_started', ifNot: 'star_1_read', lines: [
      'The Terrace, you say? Keepers wrote on milestones? I have copied the front of that stone for years.',
      'I never once looked behind it. That is the trouble with copying. You only ever look at the part you copy.',
    ] },
  ],
  pell: [
    { if: ALL_CRATES, ifNot: 'crates_done', scene: 'crates_done' },
    { if: ['downs_arrived', 'archivore_defeated'], ifNot: 'crates_started', scene: 'crates_start' },
    { if: 'crates_started', ifNot: 'crates_done', lines: [
      'Spools. Moulds. A bearing. Or was it moulds, a bearing, spools? The crates know. Ask them nicely.',
    ] },
    { if: 'crates_done', lines: [
      'A tenth off, every item, every day. The stamp says so. I have checked it eleven times. It keeps saying so.',
    ] },
  ],
  hal: [
    { if: ['archivore_defeated', 'hal_returned', 'millrace_arrived'], ifNot: 'mill_started', scene: 'mill_start' },
    { if: 'mill_started', ifNot: 'mill_done', lines: [
      'Ferrick has the weir. The pin is in the culvert, he says. I would go myself. I will go myself. After tea.',
    ] },
    { if: 'mill_done', ifNot: 'ep2_started', lines: [
      'It turns. I can hear it from here, if the wind is right. Do not tell Oren I said it is a lovely sound.',
    ] },
  ],
  oren: [
    { if: 'mill_done', ifNot: 'ep2_started', lines: [
      'I baked a fifth roll today. Do not tell Hal. It is for the cat.',
      'Four for the sill, one for the cat. Hal says a baker should never eat his own rolls. Hal is wrong.',
    ] },
  ],
  holt: [
    { if: 'strays_started', ifNot: 'strays_done', lines: [
      'Sheep in the valley pasture? That will be Brindle. Brindle never reports a loss. He reports the weather.',
    ] },
    { if: 'rollcall_done', ifNot: 'ep2_started', lines: [
      'Walked out to the ring on my day off. Thirteen names, and I said every one. Then I said Garrick, while I was there.',
    ] },
  ],
};

// ------------------------------------------------------------------------------------------------
/** The region key a record needs on (stray_4 stands in the valley pasture, a west quest). */
export const npcRegion = (rec) => X1_MAP_REGION[rec.map] || (rec.map === 'valley' ? 'west' : null);
/** The ids register() would add when `regionOn(region)` says a region is on. */
export function activeNpcIds(regionOn = (r) => X1_REGIONS[r] !== false) {
  return Object.entries(X1_NPCS).filter(([, rec]) => { const r = npcRegion(rec); return !r || regionOn(r) !== false; }).map(([id]) => id);
}

export function register({ regionOn = (r) => X1_REGIONS[r] !== false } = {}) {
  for (const id of activeNpcIds(regionOn)) NPCS[id] = X1_NPCS[id];
  Object.assign(SPEAKER_NAMES, X1_SPEAKERS);
  const prepend = NPCMOD.prependTalk || localPrepend;
  for (const [id, entries] of Object.entries(X1_TALK_PREPEND)) prepend(id, entries);
}

const _local = new WeakSet();
function localPrepend(npcId, entries) {
  const n = NPCS[npcId];
  if (!n || !Array.isArray(n.talk)) return 0;
  const fresh = entries.filter((e) => !_local.has(e));
  for (const e of fresh) _local.add(e);
  n.talk.unshift(...fresh);
  return fresh.length;
}

export default register;
