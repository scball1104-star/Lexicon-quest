// Skills, statuses, Fury arts and combo techs for Episode 1. Pure data (no DOM).
//
// Skill schema (party and enemy alike):
//   id, name, help (max 40 chars, shown in the battle help window)
//   kind:    'attack' | 'tech' | 'magic' | 'fury' | 'combo' | 'enemy'
//   user:    character id for character techs and magic ('hero' | 'mira' | 'bram')
//   weapon:  weapon type for weapon techs and Fury arts (requires that weapon to be active)
//   learn:   { level: n } (character level) or { mastery: n } (weapon mastery level)
//   mp:      MP cost (combos: per-member costs in `cost`)
//   target:  'enemy' | 'enemies' | 'random' | 'ally' | 'allies' | 'self' | 'ko_ally' | 'boss' | 'none'
//   formula: 'phys' | 'mag' | 'heal' | 'none'
//   power:   percent of the stat (100 = a plain hit)
//   hits:    number of hits ('random' target: each hit picks a random living enemy)
//   types:   damage types for weakness checks; '$weapon' = the user's active weapon type
//   pierce:  fraction of target DEF ignored (0..1)
//   rank:    timeline cost (100 = a normal action; lower comes back sooner)
//   effects: extra effects, applied per target after damage:
//            {status, chance, turns}           inflict or grant a status (chance defaults to 1)
//            {selfStatus, turns}               status on the user
//            {delay: 0.4}                      push the target back by 40% of its base turn
//            {shieldChip: n}                   remove n shields per target even without a weakness
//            {interrupt: true}                 cancel a telegraphed attack (ordinary foes only;
//                                              a boss is pushed back 35% of a turn instead)
//            {reveal: true}                    reveal all weaknesses and stats (Appraise)
//            {cure: [statusIds]}               remove statuses
//            {mpGain: n} {furyGain: n}         to the user (or to each ally target)
//            {statMod: {def: -0.3}, turns: 3}  timed stat multiplier on the target
//            {cover: true}                     user guards the target ally (Bram's Guard)
//            {heal: 0.35}                      heal a fraction of max HP
//            {partyHeal: 0.2}                  heal every living ally by a fraction of max HP
//            {mpDrain: n} {drain: 0.5}         enemy: steal MP / heal by a fraction of damage
//            {devour: true} {feast: 0.07}      Archivore specials (see ai.js)
//   fx, sfx: presentation hints (the battle scene maps them to animations and sounds)
//   telegraph: enemy only; announced one turn ahead. '{name}' and '{target}' are substituted.

export const DAMAGE_TYPES = ['sword', 'axe', 'spear', 'staff', 'bow', 'fire', 'ice', 'thunder', 'light'];
export const WEAPON_TYPES = ['sword', 'axe', 'spear', 'staff', 'bow'];
export const ELEMENTS = ['fire', 'ice', 'thunder', 'light'];
// Enemy-side damage types (party gear can resist them): 'ink' is the Archive's dark magic.
export const ENEMY_TYPES = ['ink', 'fire', 'ice', 'thunder'];

// ---------------------------------------------------------------------------------------------
// Statuses (DESIGN 7: Poison, Burn, Chill, Stun, Silence, Blind, Regen, Protect, Haste, Focus)
// plus Taunt (Bram) and Nameless (the Archivore's signature drain). Durations count the owner's
// own turns and tick down at the end of each of its turns.
// ---------------------------------------------------------------------------------------------
export const STATUSES = {
  poison:   { id: 'poison', name: 'Poison', icon: 'poison', kind: 'bad', turns: 5,
              help: 'Loses 8% max HP each turn.' },
  burn:     { id: 'burn', name: 'Burn', icon: 'burn', kind: 'bad', turns: 3,
              help: 'Loses 10% HP/turn, DEF down. Ice cures.' },
  chill:    { id: 'chill', name: 'Chill', icon: 'chill', kind: 'bad', turns: 3,
              help: 'Turns come 50% slower. Fire cures.' },
  stun:     { id: 'stun', name: 'Stun', icon: 'stun', kind: 'bad', turns: 1,
              help: 'Loses the next turn. Cancels charges.' },
  silence:  { id: 'silence', name: 'Silence', icon: 'silence', kind: 'bad', turns: 3,
              help: 'No Magic, Tech, Fury or Combo.' },
  blind:    { id: 'blind', name: 'Blind', icon: 'blind', kind: 'bad', turns: 3,
              help: 'Physical attacks miss half the time.' },
  regen:    { id: 'regen', name: 'Regen', icon: 'regen', kind: 'good', turns: 4,
              help: 'Restores 8% max HP each turn.' },
  protect:  { id: 'protect', name: 'Protect', icon: 'protect', kind: 'good', turns: 4,
              help: 'Takes one third less damage.' },
  haste:    { id: 'haste', name: 'Haste', icon: 'haste', kind: 'good', turns: 4,
              help: 'Turns come 50% faster.' },
  focus:    { id: 'focus', name: 'Focus', icon: 'focus', kind: 'good', turns: 99,
              help: 'Next attack or spell deals 50% more.' },
  taunt:    { id: 'taunt', name: 'Taunt', icon: 'taunt', kind: 'good', turns: 2,
              help: 'Foes aim single attacks here.' },
  nameless: { id: 'nameless', name: 'Nameless', icon: 'nameless', kind: 'bad', turns: 99,
              help: 'Name devoured: ATK and MAG -20%.' },
  // Episode 2: the Nameless King's signature. The member is sealed in a mirror shard: it skips its turns, cannot
  // be targeted and ignores party-wide hits. Ends after 2 of its turns, on Recall or a Silver Salve, or when the
  // King is Broken. Every living member Kept (or KO) loses the battle.
  kept:     { id: 'kept', name: 'Kept', icon: 'kept', kind: 'bad', turns: 2,
              help: 'Sealed in a mirror. Skips its turns.' },
  // Episode 3: Bram's Tempered Oath. Taunt and Protect come with it; this one marks the Oath itself. It ends when Bram's
  // next turn begins. While it holds, a hammer blow aimed at the party lands on Bram alone (50%) and Strike the Name
  // cannot make him Nameless. The icon reuses Taunt's.
  oath:     { id: 'oath', name: 'Oath', icon: 'taunt', kind: 'good', turns: 3,
              help: 'Foes aim at Bram. Turns a hammer blow.' },
};

// Statuses a cleanse (Purify, Wellspring, items) can remove. Nameless lifts when the battle ends.
export const CLEANSABLE = ['poison', 'burn', 'chill', 'silence', 'blind'];

// ---------------------------------------------------------------------------------------------
// Party skills
// ---------------------------------------------------------------------------------------------
const S = {};
function def(id, o) {
  S[id] = { id, effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none', ...o };
}

// Basic attack: uses the active weapon.
def('attack', { name: 'Attack', kind: 'attack', target: 'enemy', formula: 'phys', power: 100,
  types: ['$weapon'], help: 'Strike with the equipped weapon.', fx: 'weapon' });

// --- Sword (hero) -------------------------------------------------------------------------
def('rising_slash', { name: 'Rising Slash', kind: 'tech', weapon: 'sword', learn: { mastery: 1 }, mp: 3,
  target: 'enemy', formula: 'phys', power: 160, types: ['sword'], effects: [{ furyGain: 8 }],
  help: 'A strong upward cut. Builds Fury.', fx: 'slash_up', sfx: 'sword_slash' });
def('crescent_sweep', { name: 'Crescent Sweep', kind: 'tech', weapon: 'sword', learn: { mastery: 3 }, mp: 6,
  target: 'enemies', formula: 'phys', power: 85, types: ['sword'], rank: 110,
  help: 'A wide arc that hits every foe.', fx: 'slash_wide', sfx: 'sword_slash' });
def('flash_step', { name: 'Flash Step', kind: 'tech', weapon: 'sword', learn: { mastery: 5 }, mp: 4,
  target: 'enemy', formula: 'phys', power: 125, types: ['sword'], rank: 55,
  help: 'Quick cut. Your next turn comes soon.', fx: 'dash_cut', sfx: 'sword_slash' });

// --- Axe (hero, bram) ----------------------------------------------------------------------
def('heavy_chop', { name: 'Heavy Chop', kind: 'tech', weapon: 'axe', learn: { mastery: 1 }, mp: 4,
  target: 'enemy', formula: 'phys', power: 200, types: ['axe'], rank: 125,
  help: 'Huge blow, but slow to recover.', fx: 'chop', sfx: 'axe_chop' });
def('sunder', { name: 'Sunder', kind: 'tech', weapon: 'axe', learn: { mastery: 3 }, mp: 5,
  target: 'enemy', formula: 'phys', power: 130, types: ['axe'],
  effects: [{ statMod: { def: -0.3 }, turns: 3 }],
  help: 'Cracks armor: DEF -30% for 3 turns.', fx: 'chop', sfx: 'axe_chop' });
def('whirlwind', { name: 'Whirlwind', kind: 'tech', weapon: 'axe', learn: { mastery: 5 }, mp: 7,
  target: 'enemies', formula: 'phys', power: 105, types: ['axe'], rank: 115,
  help: 'Spinning axe strikes every foe.', fx: 'spin', sfx: 'axe_chop' });

// --- Spear (bram) --------------------------------------------------------------------------
def('lunge', { name: 'Lunge', kind: 'tech', weapon: 'spear', learn: { mastery: 1 }, mp: 3,
  target: 'enemy', formula: 'phys', power: 145, types: ['spear'], pierce: 0.5,
  effects: [{ interrupt: true }],
  help: 'Piercing thrust. Interrupts charges.', fx: 'thrust', sfx: 'spear_thrust' });
def('skewer', { name: 'Skewer', kind: 'tech', weapon: 'spear', learn: { mastery: 3 }, mp: 5,
  target: 'random', formula: 'phys', power: 115, hits: 2, types: ['spear'], pierce: 0.25,
  help: 'Two thrusts at random foes.', fx: 'thrust', sfx: 'spear_thrust' });
def('valiant_lance', { name: 'Valiant Lance', kind: 'tech', weapon: 'spear', learn: { mastery: 5 }, mp: 6,
  target: 'enemy', formula: 'phys', power: 210, types: ['spear'], pierce: 0.3,
  effects: [{ selfStatus: 'protect', turns: 2 }],
  help: 'Mighty thrust. Bram gains Protect.', fx: 'thrust_big', sfx: 'spear_thrust' });

// --- Staff (mira) --------------------------------------------------------------------------
def('channel', { name: 'Channel', kind: 'tech', weapon: 'staff', learn: { mastery: 1 }, mp: 0,
  target: 'enemy', formula: 'phys', power: 100, types: ['staff'], effects: [{ mpGain: 5 }],
  help: 'Staff strike that restores 5 MP.', fx: 'staff_hit', sfx: 'staff_hit' });
def('ward_strike', { name: 'Ward Strike', kind: 'tech', weapon: 'staff', learn: { mastery: 3 }, mp: 3,
  target: 'enemy', formula: 'phys', power: 120, types: ['staff'], effects: [{ status: 'stun', chance: 0.4 }],
  help: 'Staff blow. May stun the target.', fx: 'staff_hit', sfx: 'staff_hit' });

// --- Bow (mira) ----------------------------------------------------------------------------
def('pin_shot', { name: 'Pin Shot', kind: 'tech', weapon: 'bow', learn: { mastery: 1 }, mp: 3,
  target: 'enemy', formula: 'phys', power: 120, types: ['bow'], effects: [{ delay: 0.4 }],
  help: 'Arrow that knocks a foe back in line.', fx: 'arrow', sfx: 'bow_shot' });
def('volley', { name: 'Volley', kind: 'tech', weapon: 'bow', learn: { mastery: 3 }, mp: 6,
  target: 'random', formula: 'phys', power: 60, hits: 4, types: ['bow'],
  help: 'Four arrows at random foes.', fx: 'arrows', sfx: 'bow_shot' });
def('blinding_arrow', { name: 'Blinding Arrow', kind: 'tech', weapon: 'bow', learn: { mastery: 5 }, mp: 4,
  target: 'enemy', formula: 'phys', power: 110, types: ['bow'], effects: [{ status: 'blind', chance: 0.7 }],
  help: 'Arrow of ink-ash. May Blind.', fx: 'arrow', sfx: 'bow_shot' });

// --- Character techs -----------------------------------------------------------------------
def('steady', { name: 'Steady', kind: 'tech', user: 'hero', learn: { level: 3 }, mp: 2,
  target: 'self', formula: 'none', rank: 60, effects: [{ status: 'focus' }, { furyGain: 15 }],
  help: 'Gain Focus: next hit deals 50% more.', fx: 'focus', sfx: 'buff' });
def('second_wind', { name: 'Second Wind', kind: 'tech', user: 'hero', learn: { level: 6 }, mp: 4,
  target: 'self', formula: 'none', rank: 80, effects: [{ heal: 0.35 }, { cure: ['poison', 'blind', 'burn'] }],
  help: 'Recover 35% HP and shake off ailments.', fx: 'heal', sfx: 'heal' });
def('guard', { name: 'Guard', kind: 'tech', user: 'bram', learn: { level: 1 }, mp: 0,
  target: 'ally', formula: 'none', rank: 70, excludeSelf: true, effects: [{ cover: true }],
  help: 'Shield an ally until your next turn.', fx: 'guard', sfx: 'buff' });
def('taunt', { name: 'Taunt', kind: 'tech', user: 'bram', learn: { level: 2 }, mp: 3,
  target: 'self', formula: 'none', rank: 80, effects: [{ status: 'taunt', turns: 2 }, { status: 'protect', turns: 2 }],
  help: 'Draw single attacks. Gain Protect.', fx: 'taunt', sfx: 'buff' });
def('rally', { name: 'Rally', kind: 'tech', user: 'bram', learn: { level: 4 }, mp: 5,
  target: 'allies', formula: 'none', rank: 90, excludeSelf: true,
  effects: [{ status: 'focus' }, { furyGain: 10 }],
  help: 'Allies gain Focus and 10 Fury.', fx: 'rally', sfx: 'buff' });

// --- Mira's magic --------------------------------------------------------------------------
def('ember', { name: 'Ember', kind: 'magic', user: 'mira', learn: { level: 1 }, mp: 4,
  target: 'enemy', formula: 'mag', power: 140, types: ['fire'], effects: [{ status: 'burn', chance: 0.25 }],
  help: 'Fire magic. May Burn.', fx: 'fire', sfx: 'fire' });
def('mend', { name: 'Mend', kind: 'magic', user: 'mira', learn: { level: 1 }, mp: 4,
  target: 'ally', formula: 'heal', power: 220, rank: 90,
  help: 'Restore HP to one ally.', fx: 'heal', sfx: 'heal' });
def('appraise', { name: 'Appraise', kind: 'magic', user: 'mira', learn: { level: 1 }, mp: 0,
  target: 'enemy', formula: 'none', rank: 50, effects: [{ reveal: true }],
  help: 'Read a foe: weaknesses and HP.', fx: 'scan', sfx: 'confirm' });
def('frost', { name: 'Frost', kind: 'magic', user: 'mira', learn: { level: 2 }, mp: 4,
  target: 'enemy', formula: 'mag', power: 140, types: ['ice'], effects: [{ status: 'chill', chance: 0.3 }],
  help: 'Ice magic. May Chill.', fx: 'ice', sfx: 'ice' });
def('purify', { name: 'Purify', kind: 'magic', user: 'mira', learn: { level: 3 }, mp: 3,
  target: 'ally', formula: 'none', rank: 80, effects: [{ cure: ['poison', 'burn', 'chill', 'silence', 'blind'] }],
  help: 'Cleanse one ally of ailments.', fx: 'cleanse', sfx: 'heal' });
def('spark', { name: 'Spark', kind: 'magic', user: 'mira', learn: { level: 4 }, mp: 5,
  target: 'enemy', formula: 'mag', power: 150, types: ['thunder'], effects: [{ status: 'stun', chance: 0.2 }],
  help: 'Thunder magic. May Stun.', fx: 'thunder', sfx: 'thunder' });
def('lumen', { name: 'Lumen', kind: 'magic', user: 'mira', learn: { level: 6 }, mp: 7,
  target: 'enemy', formula: 'mag', power: 175, types: ['light'],
  help: 'Light magic. Ink fears it.', fx: 'light', sfx: 'heal' });
def('mending_rain', { name: 'Mending Rain', kind: 'magic', user: 'mira', learn: { level: 7 }, mp: 10,
  target: 'allies', formula: 'heal', power: 140, rank: 110,
  help: 'Restore HP to the whole party.', fx: 'heal_all', sfx: 'heal' });

// --- Episode 2 (E2-battle) -------------------------------------------------------------------
// Recall reaches a Kept ally (`canTargetKept`); Shatter cracks glass (`glassChip`: 2 shields on a `glass` foe,
// counting a weakness hit's own shield); True Strike ignores Taunt, Cover and Reflect (`trueStrike`).
def('recall', { name: 'Recall', kind: 'magic', user: 'mira', learn: { level: 9 }, mp: 5,
  target: 'ally', formula: 'none', rank: 80, canTargetKept: true,
  effects: [{ heal: 0.15 }, { cure: ['kept', 'nameless', 'silence'] }],
  help: "Speak an ally's name. Frees the Kept.", fx: 'recall', sfx: 'heal' });
def('shatter', { name: 'Shatter', kind: 'tech', user: 'bram', learn: { level: 10 }, mp: 6,
  target: 'enemy', formula: 'phys', power: 150, types: ['$weapon'], rank: 110, effects: [{ glassChip: 2 }],
  help: 'Heavy blow. Cracks glass: 2 shields.', fx: 'chop', sfx: 'glass_break' });
def('true_strike', { name: 'True Strike', kind: 'tech', user: 'hero', learn: { level: 11 }, mp: 5,
  target: 'enemy', formula: 'phys', power: 170, types: ['$weapon'], trueStrike: true,
  help: 'A strike that goes where it is aimed.', fx: 'dash_cut', sfx: 'sword_slash' });

// --- Episode 3 (E3-battle): Tempered Oath, learned in bram_memory_3 (EPISODE3_PLAN.md 6.5) ---------------
// `learn: { flag }`: known once the story flag is set (party.js knownSkills(member, flags); the battle scene passes the
// save's flags to createEncounterBattle). The fallback if flags are ever not at hand is level 15 (not used: the scenes pass them).
def('tempered_oath', { name: 'Tempered Oath', kind: 'tech', user: 'bram', learn: { flag: 'bram_memory_3' }, mp: 8,
  target: 'self', formula: 'none', rank: 80,
  effects: [{ status: 'taunt', turns: 3 }, { status: 'protect', turns: 3 }, { status: 'oath', turns: 3 }],
  help: 'Stand in front. Turns a hammer blow.', fx: 'taunt', sfx: 'oath_ring' });

// --- Fury arts (one per weapon type, unlocked at mastery 2) ---------------------------------
def('fury_dawnsplitter', { name: 'Dawnsplitter', kind: 'fury', weapon: 'sword', learn: { mastery: 2 },
  target: 'enemy', formula: 'phys', power: 330, types: ['sword', 'light'], rank: 80, effects: [{ shieldChip: 1 }],
  help: 'Fury: a blinding cut of dawn light.', fx: 'fury_sword', sfx: 'fury_art' });
def('fury_earthsunder', { name: 'Earthsunder', kind: 'fury', weapon: 'axe', learn: { mastery: 2 },
  target: 'enemies', formula: 'phys', power: 190, types: ['axe'], rank: 80, effects: [{ shieldChip: 1 }],
  help: 'Fury: split the ground under all foes.', fx: 'fury_axe', sfx: 'fury_art' });
def('fury_skyfall', { name: 'Skyfall Lance', kind: 'fury', weapon: 'spear', learn: { mastery: 2 },
  target: 'enemy', formula: 'phys', power: 300, types: ['spear'], pierce: 1, rank: 80,
  effects: [{ status: 'stun', chance: 1 }],
  help: 'Fury: leap and pierce. Stuns.', fx: 'fury_spear', sfx: 'fury_art' });
def('fury_wellspring', { name: 'Wellspring', kind: 'fury', weapon: 'staff', learn: { mastery: 2 },
  target: 'allies', formula: 'heal', power: 200, rank: 80,
  effects: [{ status: 'regen', turns: 4 }, { cure: ['poison', 'burn', 'chill', 'silence', 'blind'] }],
  help: 'Fury: heal and cleanse all, Regen.', fx: 'fury_staff', sfx: 'fury_art' });
def('fury_starfall', { name: 'Starfall Volley', kind: 'fury', weapon: 'bow', learn: { mastery: 2 },
  target: 'random', formula: 'phys', power: 85, hits: 6, types: ['bow'], rank: 80,
  help: 'Fury: six arrows rain on random foes.', fx: 'fury_bow', sfx: 'fury_art' });

// --- Combo techs (Chrono Trigger): the members must hold the next slots on the timeline -------
// parts: one entry per hit, each computed from that member's stats. weaponTyped: the hit uses the
// member's active weapon type if it is listed in `types`, else the first listed type.
def('ember_edge', { name: 'Ember Edge', kind: 'combo', members: ['hero', 'mira'], cost: { hero: 5, mira: 6 },
  target: 'enemy', rank: 110, learn: { level: 2 },
  parts: [{ by: 'hero', formula: 'phys', power: 130, types: ['sword', 'axe'], weaponTyped: true },
          { by: 'mira', formula: 'mag', power: 150, types: ['fire'] }],
  effects: [{ status: 'burn', chance: 0.5 }],
  help: 'Hero + Mira: a blade wreathed in fire.', fx: 'combo_ember', sfx: 'combo_start' });
def('cross_rend', { name: 'Cross Rend', kind: 'combo', members: ['hero', 'bram'], cost: { hero: 5, bram: 5 },
  target: 'enemy', rank: 110, learn: { level: 2 },
  parts: [{ by: 'hero', formula: 'phys', power: 135, types: ['sword', 'axe'], weaponTyped: true },
          { by: 'bram', formula: 'phys', power: 135, types: ['spear', 'axe'], weaponTyped: true, pierce: 0.3 }],
  effects: [{ shieldChip: 2 }],
  help: 'Hero + Bram: X-cut, always chips 2.', fx: 'combo_cross', sfx: 'combo_start' });
def('thorn_bulwark', { name: 'Thorn Bulwark', kind: 'combo', members: ['mira', 'bram'], cost: { mira: 6, bram: 6 },
  target: 'allies', rank: 100, learn: { level: 2 }, parts: [],
  effects: [{ status: 'protect', turns: 4 }, { status: 'regen', turns: 4 }],
  help: 'Mira + Bram: party Protect and Regen.', fx: 'combo_thorn', sfx: 'combo_start' });
def('dawnname', { name: 'Dawnname', kind: 'combo', members: ['hero', 'mira', 'bram'],
  cost: { hero: 10, mira: 10, bram: 10 }, target: 'enemies', rank: 120, learn: { level: 6 },
  parts: [{ by: 'hero', formula: 'phys', power: 90, types: ['light'] },
          { by: 'bram', formula: 'phys', power: 90, types: ['light'] },
          { by: 'mira', formula: 'mag', power: 110, types: ['light'] }],
  effects: [{ shieldChip: 1 }, { partyHeal: 0.2 }],
  help: 'All three speak a name of dawn.', fx: 'combo_dawn', sfx: 'combo_start' });

// ---------------------------------------------------------------------------------------------
// Enemy skills. power is relative to the enemy's ATK (phys) or MAG (mag).
// ---------------------------------------------------------------------------------------------
function foe(id, o) { def(id, { kind: 'enemy', ...o }); }

foe('e_strike', { name: 'Strike', target: 'enemy', formula: 'phys', power: 100, help: 'A plain attack.', fx: 'hit' });
// Ink Slime
foe('slime_tackle', { name: 'Tackle', target: 'enemy', formula: 'phys', power: 100, help: 'A wet slap.', fx: 'bump' });
foe('ink_spit', { name: 'Ink Spit', target: 'enemy', formula: 'mag', power: 90, types: ['ink'],
  effects: [{ status: 'blind', chance: 0.3 }], help: 'Spits ink. May Blind.', fx: 'ink_spit' });
// Briar Wolf
foe('bite', { name: 'Bite', target: 'enemy', formula: 'phys', power: 100, help: 'Snapping jaws.', fx: 'bite' });
foe('thorn_bite', { name: 'Thorn Bite', target: 'enemy', formula: 'phys', power: 85,
  effects: [{ status: 'poison', chance: 0.4 }], help: 'Briar fangs. May Poison.', fx: 'bite' });
foe('howl', { name: 'Howl', target: 'self', formula: 'none', rank: 80,
  effects: [{ status: 'haste', turns: 3 }], help: 'The wolf quickens.', fx: 'howl' });
// Moss Scarab
foe('shell_bash', { name: 'Shell Bash', target: 'enemy', formula: 'phys', power: 100, help: 'A shell ram.', fx: 'bump' });
foe('harden', { name: 'Harden', target: 'self', formula: 'none', rank: 80,
  effects: [{ status: 'protect', turns: 3 }], help: 'Moss shell hardens.', fx: 'buff' });
foe('burrow_charge', { name: 'Burrowing Charge', target: 'enemy', formula: 'phys', power: 200,
  telegraph: '{name} digs in, eyes fixed on {target}.', help: 'A devastating charge.', fx: 'charge' });
// Page Wraith
foe('paper_cut', { name: 'Paper Cut', target: 'enemy', formula: 'phys', power: 55, hits: 2,
  help: 'Two razor-edged pages.', fx: 'cut' });
foe('hush', { name: 'Hush', target: 'enemy', formula: 'mag', power: 50, types: ['ink'],
  effects: [{ status: 'silence', chance: 0.6 }], help: 'A whisper that steals voice.', fx: 'hush' });
foe('page_storm', { name: 'Page Storm', target: 'enemies', formula: 'mag', power: 120, types: ['ink'],
  telegraph: 'Loose pages spin around {name}...', help: 'A whirl of cutting pages.', fx: 'pages' });
// Bookmite
foe('nibble', { name: 'Nibble', target: 'enemy', formula: 'phys', power: 90, effects: [{ mpDrain: 3 }],
  help: 'Chews words: drains 3 MP.', fx: 'bite' });
foe('gnaw', { name: 'Gnaw', target: 'enemy', formula: 'phys', power: 105, help: 'Sharp little jaws.', fx: 'bite' });
// Tome Golem
foe('book_slam', { name: 'Book Slam', target: 'enemy', formula: 'phys', power: 110, help: 'A crushing tome.', fx: 'slam' });
foe('binding', { name: 'Binding', target: 'enemy', formula: 'phys', power: 70,
  effects: [{ status: 'chill', chance: 0.5 }], help: 'Spine-cords slow a foe.', fx: 'bind' });
foe('shelf_quake', { name: 'Shelf Quake', target: 'enemies', formula: 'phys', power: 125,
  effects: [{ status: 'stun', chance: 0.2 }],
  telegraph: '{name} rears back. The shelves begin to shake.', help: 'Quake that may Stun.', fx: 'quake' });
// Ink Wraith
foe('ink_lance', { name: 'Ink Lance', target: 'enemy', formula: 'mag', power: 110, types: ['ink'],
  help: 'A spear of black ink.', fx: 'ink_lance' });
foe('ink_tide', { name: 'Ink Tide', target: 'enemies', formula: 'mag', power: 65, types: ['ink'],
  effects: [{ status: 'blind', chance: 0.25 }], help: 'Ink washes over all.', fx: 'ink_wave' });
foe('siphon', { name: 'Siphon', target: 'enemy', formula: 'mag', power: 90, types: ['ink'], effects: [{ drain: 0.5 }],
  help: 'Drinks life from a foe.', fx: 'drain' });
foe('black_tide', { name: 'Black Tide', target: 'enemies', formula: 'mag', power: 135, types: ['ink'],
  telegraph: 'Ink pools and rises around {name}...', help: 'A drowning wave of ink.', fx: 'ink_wave_big' });
// Echo Warden
foe('echo_slash', { name: 'Echo Slash', target: 'enemy', formula: 'phys', power: 110, help: 'A ringing blade.', fx: 'slash' });
foe('shield_bash', { name: 'Shield Bash', target: 'enemy', formula: 'phys', power: 85, effects: [{ delay: 0.4 }],
  help: 'Knocks a foe back in line.', fx: 'bash' });
foe('reverberate', { name: 'Reverberate', target: 'enemies', formula: 'mag', power: 210,
  telegraph: '{name} raises its blade. The hall begins to hum...', help: 'A shockwave of echoes.', fx: 'shockwave' });
// Lost Page (Archivore add)
foe('page_flutter', { name: 'Flutter', target: 'enemy', formula: 'phys', power: 75, help: 'Edges like knives.', fx: 'cut' });
foe('recite', { name: 'Recite', target: 'boss', formula: 'none', effects: [{ heal: 0.03 }],
  help: 'Reads itself to the Archivore.', fx: 'recite' });
// Archivore
foe('ink_lash', { name: 'Ink Lash', target: 'enemy', formula: 'phys', power: 105, help: 'A whip of ink.', fx: 'lash' });
foe('gnash', { name: 'Gnash', target: 'enemy', formula: 'phys', power: 130, help: 'Rows of paper teeth.', fx: 'bite_big' });
foe('ink_spray', { name: 'Ink Spray', target: 'enemies', formula: 'mag', power: 70, types: ['ink'],
  effects: [{ status: 'blind', chance: 0.25 }], help: 'Sprays ink on all.', fx: 'ink_wave' });
foe('devour_name', { name: 'Devour Name', target: 'enemy', formula: 'mag', power: 115, types: ['ink'],
  effects: [{ devour: true }],
  telegraph: "{name}'s gaze settles on {target}. It hungers for a name...",
  help: 'Eats a name: Silence and drain.', fx: 'devour' });
foe('ink_storm', { name: 'Ink Storm', target: 'enemies', formula: 'mag', power: 245, types: ['ink'],
  effects: [{ status: 'blind', chance: 0.4 }],
  telegraph: '{name} inhales a storm of ink...', help: 'A storm of ink hits all.', fx: 'ink_storm' });
foe('summon_pages', { name: 'Tear the Book', target: 'none', formula: 'none', rank: 80,
  help: 'Lost Pages spill out.', fx: 'summon' });
foe('feast', { name: 'Feast', target: 'none', formula: 'none', rank: 90, effects: [{ feast: 0.07 }],
  telegraph: '{name} turns its maw toward the Lost Pages...', help: 'Devours its pages to heal.', fx: 'feast' });

// ---------------------------------------------------------------------------------------------
// Episode 2 enemy skills (E2-battle). New effect keys: {keep: true} (the King's Keeping), {bossHeal: f} (heal the
// boss on the user's side), {cleanse: true} (remove bad statuses and stat cuts), {coverAlly: true, defend?}
// (guard the lowest-HP ally: party single-target hits on it go to the user until the user's next turn).
// Mirrored Combo skills carry `mirrorCombo` (ai.js `reflections` fires them with both reflections).
// ---------------------------------------------------------------------------------------------
// Mist Wolf
foe('mist_bite', { name: 'Mist Bite', target: 'enemy', formula: 'phys', power: 90,
  effects: [{ status: 'blind', chance: 0.2 }], help: 'A bite out of the fog. May Blind.', fx: 'bite' });
// Glassback Beetle
foe('glass_ram', { name: 'Glass Ram', target: 'enemy', formula: 'phys', power: 200,
  telegraph: '{name} lowers its glass horn at {target}.', help: 'A charging ram of silverglass.', fx: 'charge' });
// Quicksilver
foe('mercury_spit', { name: 'Mercury Spit', target: 'enemy', formula: 'mag', power: 90,
  effects: [{ status: 'poison', chance: 0.25 }], help: 'Spits mercury. May Poison.', fx: 'ink_spit' });
// Glint Wisp
foe('glint', { name: 'Glint', target: 'enemy', formula: 'mag', power: 85,
  effects: [{ status: 'blind', chance: 0.3 }], help: 'A sharp flash. May Blind.', fx: 'light' });
foe('mirror_dust', { name: 'Mirror Dust', target: 'enemies', formula: 'mag', power: 45,
  effects: [{ status: 'blind', chance: 0.15 }], help: 'Glittering dust over all.', fx: 'scan' });
foe('prism_burst', { name: 'Prism Burst', target: 'enemies', formula: 'mag', power: 120,
  telegraph: 'Light bends and gathers inside {name}...', help: 'Light breaks over the party.', fx: 'light' });
// Glass Sentinel
foe('shard_fist', { name: 'Shard Fist', target: 'enemy', formula: 'phys', power: 105, help: 'A fist of cut glass.', fx: 'slam' });
foe('glass_guard', { name: 'Glass Guard', target: 'self', formula: 'none', rank: 80,
  effects: [{ status: 'protect', turns: 3 }], help: 'Its glass thickens.', fx: 'buff' });
foe('shatter_quake', { name: 'Shatter Quake', target: 'enemies', formula: 'phys', power: 125,
  effects: [{ status: 'stun', chance: 0.2 }],
  telegraph: '{name} raises both fists. The glass floor hums...', help: 'The floor cracks. May Stun.', fx: 'quake' });
// Borrowed Shadow (ai 'mimic': copies the type that last hit it)
foe('dusk_touch', { name: 'Dusk Touch', target: 'enemy', formula: 'mag', power: 85,
  effects: [{ status: 'blind', chance: 0.2 }], help: 'A cold hand of dusk. May Blind.', fx: 'drain' });
foe('shadow_strike', { name: 'Shadow Strike', target: 'enemy', formula: 'phys', power: 110,
  help: 'Your own blow, borrowed.', fx: 'slash' });
foe('shadow_ember', { name: 'Shadow Ember', target: 'enemy', formula: 'mag', power: 120, types: ['fire'],
  help: 'Your own fire, borrowed.', fx: 'fire' });
foe('shadow_frost', { name: 'Shadow Frost', target: 'enemy', formula: 'mag', power: 120, types: ['ice'],
  effects: [{ status: 'chill', chance: 0.2 }], help: 'Your own frost, borrowed.', fx: 'ice' });
foe('shadow_spark', { name: 'Shadow Spark', target: 'enemy', formula: 'mag', power: 125, types: ['thunder'],
  help: 'Your own thunder, borrowed.', fx: 'thunder' });
foe('shadow_mend', { name: 'Shadow Mend', target: 'self', formula: 'none', rank: 90, effects: [{ heal: 0.18 }],
  help: 'Your own healing, borrowed.', fx: 'heal' });
// Faceless Knight
foe('blank_blade', { name: 'Blank Blade', target: 'enemy', formula: 'phys', power: 110, help: 'A blade with no crest.', fx: 'slash' });
foe('knight_cover', { name: 'Cover', target: 'none', formula: 'none', rank: 80, effects: [{ coverAlly: true }],
  help: 'Stands before the weakest ally.', fx: 'guard' });
foe('judgement', { name: 'Judgement', target: 'enemy', formula: 'phys', power: 220,
  telegraph: '{name} lifts its blade toward {target}. Judgement is coming.', help: 'A sentence carried out.', fx: 'slash' });
// Shard Swarm
foe('shard_rain', { name: 'Shard Rain', target: 'random', formula: 'phys', power: 45, hits: 3,
  help: 'Three shards at random.', fx: 'cut' });
foe('glitter', { name: 'Glitter', target: 'enemy', formula: 'mag', power: 70,
  effects: [{ status: 'blind', chance: 0.25 }], help: 'Blinding glitter. May Blind.', fx: 'scan' });
foe('shard_storm', { name: 'Shard Storm', target: 'enemies', formula: 'phys', power: 140,
  telegraph: 'The shards spin faster and faster around {name}...', help: 'A storm of broken glass.', fx: 'pages' });
// The Other Selves (ai 'reflections')
foe('mirror_slash', { name: 'Mirror Slash', target: 'enemy', formula: 'phys', power: 110, help: 'Your own cut, reversed.', fx: 'slash' });
foe('risen_slash', { name: 'Risen Slash', target: 'enemy', formula: 'phys', power: 160, help: 'A rising cut, reversed.', fx: 'slash_up' });
foe('refl_steady', { name: 'Steady', target: 'self', formula: 'none', rank: 60, effects: [{ status: 'focus' }],
  help: 'It steadies, as you would.', fx: 'focus' });
foe('refl_ember', { name: 'Ember', target: 'enemy', formula: 'mag', power: 140, types: ['fire'],
  help: 'Fire magic, reversed.', fx: 'fire' });
foe('refl_frost', { name: 'Frost', target: 'enemy', formula: 'mag', power: 140, types: ['ice'],
  effects: [{ status: 'chill', chance: 0.25 }], help: 'Ice magic, reversed.', fx: 'ice' });
foe('refl_mend', { name: 'Mend', target: 'ally', formula: 'none', rank: 90, effects: [{ heal: 0.22 }],
  help: 'Mends a reflection.', fx: 'heal' });
foe('refl_guard', { name: 'Guard', target: 'none', formula: 'none', rank: 70, effects: [{ coverAlly: true, defend: true }],
  help: 'Shields a reflection.', fx: 'guard' });
foe('refl_lunge', { name: 'Lunge', target: 'enemy', formula: 'phys', power: 145, pierce: 0.5,
  help: 'A piercing thrust, reversed.', fx: 'thrust' });
foe('refl_taunt', { name: 'Taunt', target: 'self', formula: 'none', rank: 80, effects: [{ status: 'taunt', turns: 2 }],
  help: 'It draws your single attacks.', fx: 'taunt' });
foe('mirror_cinder_edge', { name: 'Cinder Edge', target: 'enemy', formula: 'none', rank: 110,
  mirrorCombo: { pair: ['refl_hero', 'refl_mira'],
    parts: [{ by: 'refl_hero', formula: 'phys', power: 230, types: [] }, { by: 'refl_mira', formula: 'mag', power: 250, types: ['fire'] }] },
  telegraph: '{name} and {partner} move as one. Break their rhythm!', help: 'A blade wreathed in fire, reversed.', fx: 'combo_ember' });
foe('mirror_cross_shatter', { name: 'Cross Shatter', target: 'enemy', formula: 'none', rank: 110,
  mirrorCombo: { pair: ['refl_hero', 'refl_bram'],
    parts: [{ by: 'refl_hero', formula: 'phys', power: 230, types: [] }, { by: 'refl_bram', formula: 'phys', power: 230, types: [], pierce: 0.3 }] },
  telegraph: '{name} and {partner} move as one. Break their rhythm!', help: 'An X-cut of glass, reversed.', fx: 'combo_cross' });
foe('mirror_glass_bulwark', { name: 'Glass Bulwark', target: 'none', formula: 'none', rank: 100,
  mirrorCombo: { pair: ['refl_mira', 'refl_bram'], parts: [], buff: [['protect', 3], ['regen', 3], ['focus', 99]] },
  telegraph: '{name} and {partner} move as one. Break their rhythm!', help: 'Protect, Regen and Focus, reversed.', fx: 'combo_thorn' });
// The Nameless King (ai 'nameless_king') and his court
foe('glass_sword', { name: 'Glass Sword', target: 'enemy', formula: 'phys', power: 110, help: 'A cut of cold glass.', fx: 'slash' });
foe('cold_mirror', { name: 'Cold Mirror', target: 'enemy', formula: 'mag', power: 105, types: ['ice'],
  effects: [{ status: 'chill', chance: 0.3 }], help: 'A mirror of frost. May Chill.', fx: 'ice' });
foe('keeping', { name: 'Keeping', target: 'enemy', formula: 'mag', power: 70, effects: [{ keep: true }],
  telegraph: '{name} turns his mirror toward {target}. He means to keep {target}.',
  help: 'Seals a foe in a mirror shard.', fx: 'keeping', sfx: 'kept' });
foe('mirror_rain', { name: 'Mirror Rain', target: 'enemies', formula: 'mag', power: 190,
  telegraph: 'Every shard in the hall turns toward you...', help: 'Glass rains on the party.', fx: 'ink_storm' });
foe('last_decree', { name: 'Last Decree', target: 'enemies', formula: 'phys', power: 260,
  telegraph: 'The King raises his glass sword. NOTHING MORE WILL BE TAKEN.', help: 'The final sentence.', fx: 'shockwave' });
foe('weep', { name: 'Weep', target: 'enemy', formula: 'mag', power: 55, types: ['ice'],
  effects: [{ status: 'chill', chance: 0.3 }, { bossHeal: 0.05 }], help: 'Tears that mend the King.', fx: 'ice' });
foe('lament', { name: 'Lament', target: 'boss', formula: 'none', rank: 90, effects: [{ heal: 0.15 }, { cleanse: true }],
  telegraph: '{name} begins to weep for the King...', help: 'Heals and cleanses the King.', fx: 'heal' });
foe('proud_stance', { name: 'Proud Stance', target: 'self', formula: 'none', rank: 80, effects: [{ status: 'taunt', turns: 2 }],
  help: 'Pride stands in front.', fx: 'taunt' });
foe('glass_lance', { name: 'Glass Lance', target: 'enemy', formula: 'phys', power: 120, help: 'A lance of silverglass.', fx: 'thrust' });

// ---------------------------------------------------------------------------------------------
// Episode 3 enemy skills (E3-battle). Heat (EPISODE3_PLAN.md 6.3): `stoke` / `stokeSelf` raise a foe's Heat, a foe at its
// maximum announces its flare (a telegraphed skill named in the enemy's `heat.flare`), and ice, a Quench Flask or a Break
// quench it. Fire attacks carry types ['fire'] so the party's `fireRes` gear applies.
// ---------------------------------------------------------------------------------------------
foe('stoke', { name: 'Stoke', target: 'self', formula: 'none', rank: 80, effects: [{ stokeSelf: 1 }],
  help: 'Burns hotter. Ice or a Break cools it.', fx: 'buff', sfx: 'furnace_roar' });
// Cinder Hound
foe('ember_snap', { name: 'Ember Snap', target: 'enemy', formula: 'phys', power: 90, types: ['fire'],
  effects: [{ status: 'burn', chance: 0.2 }], help: 'A smouldering bite. May Burn.', fx: 'bite' });
// Cinder Beetle
foe('shell_ram', { name: 'Shell Ram', target: 'enemy', formula: 'phys', power: 100, help: 'A shell of hot iron.', fx: 'bump' });
foe('flare_ram', { name: 'Flare Ram', target: 'enemy', formula: 'phys', power: 200, types: ['fire'],
  telegraph: '{name} glows white and lowers its head at {target}...', help: 'A white-hot charge.', fx: 'charge' });
// Slag Slime
foe('slag_splash', { name: 'Splash', target: 'enemy', formula: 'mag', power: 80, types: ['fire'],
  effects: [{ status: 'burn', chance: 0.25 }], help: 'Molten splash. May Burn.', fx: 'ink_spit' });
foe('slag_burst', { name: 'Slag Burst', target: 'enemies', formula: 'mag', power: 110, types: ['fire'],
  telegraph: '{name} swells and glows white-hot...', help: 'Slag bursts over the party.', fx: 'fire' });
// Ashbound Miner
foe('pick_swing', { name: 'Pick Swing', target: 'enemy', formula: 'phys', power: 105, help: 'A miner\'s pick.', fx: 'slash' });
foe('lamp_flash', { name: 'Lamp Flash', target: 'enemy', formula: 'mag', power: 55,
  effects: [{ status: 'blind', chance: 0.25 }], help: 'A lamp flash. May Blind.', fx: 'light' });
// Furnace Construct
foe('iron_fist', { name: 'Iron Fist', target: 'enemy', formula: 'phys', power: 105, help: 'A fist of hot bronze.', fx: 'slam' });
foe('overheat', { name: 'Overheat', target: 'enemies', formula: 'phys', power: 140, types: ['fire'],
  telegraph: '{name}\'s core burns white. The air begins to shimmer...', help: 'The core vents on the party.', fx: 'quake' });
// Soot Phantom
foe('soot_cloud', { name: 'Soot Cloud', target: 'enemies', formula: 'mag', power: 40,
  effects: [{ status: 'blind', chance: 0.15 }], help: 'Soot over the party. May Blind.', fx: 'ink_wave' });
foe('choke', { name: 'Choke', target: 'enemy', formula: 'mag', power: 60,
  effects: [{ status: 'silence', chance: 0.25 }], help: 'Steals a voice. May Silence.', fx: 'hush' });
foe('cinder_touch', { name: 'Cinder Touch', target: 'enemy', formula: 'mag', power: 100, types: ['fire'],
  help: 'A touch of hot cinder.', fx: 'drain' });
// Forge Defender
foe('tempered_blow', { name: 'Tempered Blow', target: 'enemy', formula: 'phys', power: 100, help: 'A blow of tempered bronze.', fx: 'slash' });
foe('brand', { name: 'Brand', target: 'enemy', formula: 'phys', power: 220, types: ['fire'],
  telegraph: '{name}\'s visor glows white. It marks {target}...', help: 'A white-hot brand.', fx: 'slash' });
// The Bellows Specter (ai 'specter'): each attack feeds it (stokeSelf), the fans feed it again once reversed
foe('soot_wing', { name: 'Soot Wing', target: 'enemy', formula: 'phys', power: 100, effects: [{ stokeSelf: 2 }],
  help: 'A wing of soot. It draws the draft.', fx: 'slash' });
foe('draft_lash', { name: 'Draft Lash', target: 'enemy', formula: 'mag', power: 85, types: ['fire'],
  effects: [{ status: 'burn', chance: 0.2 }, { stokeSelf: 2 }], help: 'A lash of hot draft. May Burn.', fx: 'fire' });
foe('furnace_breath', { name: 'Furnace Breath', target: 'enemies', formula: 'mag', power: 240, types: ['fire'],
  effects: [{ status: 'burn', chance: 0.3 }],
  telegraph: '{name} draws the whole draft into its chest...', help: 'The whole draft, breathed out.', fx: 'fire_big' });
// The Cinder Warden (ai 'cinder_warden') and its coils
foe('hammerfall', { name: 'Hammerfall', target: 'enemy', formula: 'phys', power: 115, help: 'The molten hammer comes down.', fx: 'slam' });
foe('ember_spray', { name: 'Ember Spray', target: 'enemies', formula: 'mag', power: 90, types: ['fire'],
  effects: [{ status: 'burn', chance: 0.2 }], help: 'Embers over the party. May Burn.', fx: 'fire' });
foe('strike_the_name', { name: 'Strike the Name', target: 'enemy', formula: 'mag', power: 60, effects: [{ nameStrike: true }],
  telegraph: '{name} raises its hammer over {target}...', help: 'Strikes a name out. Defend, or Bram.', fx: 'devour' });
foe('last_hammer', { name: 'Last Hammer', target: 'enemies', formula: 'phys', power: 260, turnable: true,
  telegraph: '{name} raises the Last Hammer. The whole forge holds its breath...', help: 'The last blow. Defend, Break, or Bram.',
  fx: 'shockwave', sfx: 'hammer_charge' });
foe('stoke_warden', { name: 'Stoke the Warden', target: 'boss', formula: 'none', rank: 80, effects: [{ stoke: 1 }],
  help: 'Feeds the Warden. Break it first.', fx: 'buff', sfx: 'furnace_roar' });
foe('slag_spray', { name: 'Slag Spray', target: 'enemies', formula: 'mag', power: 100, types: ['fire'],
  effects: [{ status: 'burn', chance: 0.3 }], help: 'Slag over the party. May Burn.', fx: 'fire' });
foe('coil_pressure', { name: 'Build Pressure', target: 'none', formula: 'none', rank: 60,
  help: 'The coil builds pressure.', fx: 'buff' });

export const SKILLS = S;

export function skill(id) { return S[id] || null; }

// Combos, Fury arts and learnable lists, derived for quick lookup.
export const COMBOS = Object.values(S).filter((s) => s.kind === 'combo').map((s) => s.id);
export const FURY_ARTS = Object.fromEntries(Object.values(S).filter((s) => s.kind === 'fury').map((s) => [s.weapon, s.id]));
export const WEAPON_TECHS = Object.fromEntries(WEAPON_TYPES.map((w) => [w,
  Object.values(S).filter((s) => s.kind === 'tech' && s.weapon === w).map((s) => s.id)]));
export const CHARACTER_SKILLS = Object.fromEntries(['hero', 'mira', 'bram'].map((c) => [c,
  Object.values(S).filter((s) => s.user === c).map((s) => s.id)]));
