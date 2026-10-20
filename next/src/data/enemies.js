// Enemies of Episodes 1 and 2 (ids from COMMON.md and EPISODE2_PLAN.md 2.4), elite modifiers, Lost Page variants.
// Pure data.
//
// Enemy schema:
//   id, name, family, level, size ('small' | 'medium' | 'large' | 'boss'), flying
//   hp mp atk def mag spr spd luk
//   shields              Break shield count (Octopath style)
//   weak resist immune absorb   damage types (skills.js DAMAGE_TYPES); unknown to the player until hit
//   statusImmune         statuses that never land
//   evade                chance to dodge melee weapon hits (bows and magic ignore it)
//   exp gold masteryPts  rewards (masteryPts go to the weapon types the party used)
//   moves                [{ skill, weight, target?, once?, if? }]  ordinary turn choices
//                        target: 'random' (default) | 'lowestHp' | 'lowestHpPct' | 'healer' | 'highestAtk'
//                        if: 'notHasted' | 'notProtected' | 'allyHurt' | 'hasPages'
//   charge               telegraphed move: { skill, first, cooldown, target? } -- announced at the end
//                        of the enemy's turn number `first`, then every `cooldown` turns after it fires
//   ai                   'basic' | 'echo_warden' | 'archivore' | 'lost_page' | 'phased' | 'mimic' | 'reflections'
//                        | 'nameless_king' (battle/ai.js)
//   drops                consumable drops [{ item, chance }]; equipment comes from loot-tables.js
//   lootZone             zone loot table for equipment drops
//   sprite               presentation hint: atlas + frame ids from W1-sprites (frame id = enemy id)
//   flavor               one-line bestiary hook (full lore lives in data/text.js)

export const ENEMIES = {};
function enemy(id, o) {
  ENEMIES[id] = {
    id, flying: false, size: 'medium', tags: [], weak: [], resist: [], immune: [], absorb: [], statusImmune: [],
    evade: 0, luk: 5, mp: 0, ai: 'basic', drops: [], boss: false, charge: null,
    sprite: { atlas: 'enemies_battle', field: 'enemies_field', frame: id }, ...o,
  };
}

// ---------------------------------------------------------------- Willowmere Valley (Lv 2-3)
enemy('ink_slime', {
  name: 'Ink Slime', family: 'ooze', level: 2, size: 'small',
  hp: 74, atk: 12, def: 4, mag: 12, spr: 6, spd: 9, luk: 3,
  shields: 2, weak: ['fire', 'axe'],
  exp: 7, gold: 10, masteryPts: 2,
  moves: [{ skill: 'slime_tackle', weight: 60 }, { skill: 'ink_spit', weight: 40 }],
  drops: [{ item: 'potion', chance: 0.12 }, { item: 'eye_drops', chance: 0.06 }], lootZone: 'valley',
  flavor: 'A puddle of spilled ink that learned to crawl.',
});
enemy('briar_wolf', {
  name: 'Briar Wolf', family: 'beast', level: 3,
  hp: 120, atk: 14, def: 6, mag: 4, spr: 4, spd: 15, luk: 6,
  shields: 2, weak: ['fire', 'spear'],
  exp: 9, gold: 12, masteryPts: 2,
  moves: [{ skill: 'bite', weight: 55, target: 'lowestHpPct' }, { skill: 'thorn_bite', weight: 30 },
          { skill: 'howl', weight: 15, once: true, if: 'notHasted' }],
  drops: [{ item: 'potion', chance: 0.12 }, { item: 'antidote', chance: 0.1 }], lootZone: 'valley',
  flavor: 'Thorns have grown through its fur like a second coat.',
});
enemy('moss_scarab', {
  name: 'Moss Scarab', family: 'insect', level: 3,
  hp: 110, atk: 15, def: 14, mag: 4, spr: 8, spd: 8, luk: 4,
  shields: 3, weak: ['axe', 'ice'], resist: ['sword', 'bow'],
  exp: 12, gold: 18, masteryPts: 3,
  moves: [{ skill: 'shell_bash', weight: 70 }, { skill: 'harden', weight: 30, if: 'notProtected' }],
  charge: { skill: 'burrow_charge', first: 2, cooldown: 3 },
  drops: [{ item: 'potion', chance: 0.15 }], lootZone: 'valley',
  flavor: 'A beetle wearing a hill of moss. It does not like to be hurried.',
});

// ---------------------------------------------------------------- Rootbound Archive F1 (Lv 4)
enemy('page_wraith', {
  name: 'Page Wraith', family: 'spirit', level: 4, flying: true,
  hp: 130, atk: 13, def: 5, mag: 18, spr: 14, spd: 13, luk: 8,
  shields: 2, weak: ['fire', 'bow'], resist: ['ice'], evade: 0.2,
  exp: 14, gold: 24, masteryPts: 3,
  moves: [{ skill: 'paper_cut', weight: 55 }, { skill: 'hush', weight: 30, target: 'healer' },
          { skill: 'e_strike', weight: 15 }],
  charge: { skill: 'page_storm', first: 3, cooldown: 4 },
  drops: [{ item: 'echo_herb', chance: 0.12 }, { item: 'ether', chance: 0.06 }], lootZone: 'archive_f1',
  flavor: 'Torn pages that remember being a story, and resent the ending.',
});
enemy('bookmite', {
  name: 'Bookmite', family: 'insect', level: 4, size: 'small',
  hp: 95, atk: 15, def: 7, mag: 4, spr: 5, spd: 16, luk: 6,
  shields: 1, weak: ['thunder', 'sword'],
  exp: 8, gold: 14, masteryPts: 2,
  moves: [{ skill: 'nibble', weight: 45, target: 'healer' }, { skill: 'gnaw', weight: 55 }],
  drops: [{ item: 'potion', chance: 0.1 }, { item: 'ether', chance: 0.05 }], lootZone: 'archive_f1',
  flavor: 'It eats words. Some readers swear it eats the meaning first.',
});

// ---------------------------------------------------------------- Archive F2 (Lv 5-6)
enemy('tome_golem', {
  name: 'Tome Golem', family: 'construct', level: 6, size: 'large',
  hp: 220, atk: 26, def: 18, mag: 6, spr: 8, spd: 7, luk: 3,
  shields: 4, weak: ['thunder', 'axe'], resist: ['sword', 'bow'], statusImmune: ['poison'],
  exp: 18, gold: 50, masteryPts: 5,
  moves: [{ skill: 'book_slam', weight: 65 }, { skill: 'binding', weight: 35 }],
  charge: { skill: 'shelf_quake', first: 2, cooldown: 3 },
  drops: [{ item: 'hi_potion', chance: 0.08 }, { item: 'potion', chance: 0.2 }], lootZone: 'archive_f2',
  flavor: 'A shelf of encyclopedias that stood up and kept standing.',
});
enemy('echo_warden', {
  name: 'Echo Warden', family: 'construct', level: 6, size: 'large', boss: true, ai: 'echo_warden',
  hp: 420, mp: 40, atk: 37, def: 15, mag: 36, spr: 15, spd: 11, luk: 8,
  shields: 5, weak: ['axe', 'spear'], statusImmune: ['stun', 'silence', 'poison', 'blind'],
  exp: 60, gold: 300, masteryPts: 12,
  moves: [{ skill: 'echo_slash', weight: 60 }, { skill: 'shield_bash', weight: 40 }],
  charge: { skill: 'reverberate', first: 3, cooldown: 4 },
  // Stances: the Warden opens in Mirror. It swaps after every second turn and when its Break ends.
  stances: {
    mirror:  { name: 'Mirror Stance', reflect: 'magic', weak: ['axe', 'spear'],
               text: 'The Warden turns its mirror outward. Spells will rebound!' },
    bulwark: { name: 'Bulwark Stance', reflect: 'phys', weak: ['fire', 'thunder'],
               text: 'The Warden braces behind its shield. Weapons will rebound!' },
  },
  stanceEvery: 2,
  drops: [], lootZone: 'archive_f2', uniqueDrop: 'mirrorguard_mail',
  flavor: 'A knight of mirrors that repeats whatever you bring against it.',
});

// ---------------------------------------------------------------- Archive F3 (Lv 7)
enemy('ink_wraith', {
  name: 'Ink Wraith', family: 'spirit', level: 7, flying: true,
  hp: 150, atk: 16, def: 9, mag: 30, spr: 18, spd: 14, luk: 8,
  shields: 3, weak: ['light', 'fire'], resist: ['sword', 'spear'], evade: 0.15,
  exp: 32, gold: 48, masteryPts: 5,
  moves: [{ skill: 'ink_lance', weight: 45 }, { skill: 'ink_tide', weight: 25 },
          { skill: 'siphon', weight: 30, target: 'lowestHpPct' }],
  charge: { skill: 'black_tide', first: 3, cooldown: 4 },
  drops: [{ item: 'ether', chance: 0.12 }, { item: 'eye_drops', chance: 0.1 }], lootZone: 'archive_f3',
  flavor: 'Where a name was scraped away, this is what seeped out.',
});
enemy('lost_page', {
  name: 'Lost Page', family: 'spirit', level: 7, size: 'small', flying: true, ai: 'lost_page',
  hp: 70, atk: 34, def: 5, mag: 34, spr: 6, spd: 13, luk: 5,
  shields: 1, weak: ['fire'], statusImmune: ['poison'],
  exp: 0, gold: 0, masteryPts: 1,
  moves: [{ skill: 'page_flutter', weight: 60 }, { skill: 'recite', weight: 40 }],
  drops: [], lootZone: null,
  flavor: 'A page torn from the Book of Names. A name is still written on it.',
});
enemy('archivore', {
  name: 'The Archivore', family: 'devourer', level: 8, size: 'boss', boss: true, ai: 'archivore',
  hp: 820, mp: 99, atk: 70, def: 12, mag: 72, spr: 14, spd: 12, luk: 10,
  shields: 6, weak: ['fire', 'spear'], resist: ['ice'],
  statusImmune: ['stun', 'silence', 'poison', 'blind', 'chill'],
  exp: 400, gold: 500, masteryPts: 20,
  moves: [{ skill: 'ink_lash', weight: 45 }, { skill: 'gnash', weight: 30, target: 'lowestHpPct' },
          { skill: 'ink_spray', weight: 25 }],
  // Phases by HP fraction. Entering a phase changes weaknesses, refills shields (new count) and runs
  // the phase script in ai.js. Weaknesses of a new phase are unknown again until hit or appraised.
  phases: [
    { id: 'hunger', name: 'Hunger', at: 1.0, weak: ['fire', 'spear'], resist: ['ice'], shields: 6,
      text: 'The Archivore uncoils from the stacks, ink dripping from a thousand mouths.' },
    { id: 'torn_book', name: 'The Torn Book', at: 0.7, weak: ['fire', 'spear', 'thunder'], resist: ['ice'], shields: 7,
      summon: 2, text: 'The Archivore tears open the Book of Names! Lost Pages spill into the air.' },
    { id: 'nameless_maw', name: 'Nameless Maw', at: 0.3, weak: ['light', 'axe', 'fire'], resist: [], shields: 8,
      haste: true, text: 'Its pages burn away. Only the maw remains, and it is starving.' },
  ],
  drops: [], lootZone: 'archive_f3', uniqueDrop: 'lanternheart',
  flavor: 'It was commanded to forget. It has been eating names ever since.',
});

// ---------------------------------------------------------------- Whisperwood Hollow (optional, Lv 6-7)
// W8-art: each foe has its own frames at 1x in enemies_battle (`<id>`, `<id>_idle_1|attack|hurt|die_0..2`; built by
// tools/art/sprites/hollow_enemies.py), so there is no scale or tint any more. The field still uses the base
// field sprite ids (briar_wolf, ink_slime). The hollow is reached after the Lantern, so its foes are tuned for a
// Lv 6 to 7 party.
enemy('thornback_wolf', {
  name: 'Thornback Wolf', family: 'beast', level: 6,
  hp: 250, atk: 27, def: 10, mag: 6, spr: 8, spd: 16, luk: 7,
  shields: 2, weak: ['fire', 'spear'],
  exp: 26, gold: 34, masteryPts: 4,
  moves: [{ skill: 'bite', weight: 50, target: 'lowestHpPct' }, { skill: 'thorn_bite', weight: 35 },
          { skill: 'howl', weight: 15, once: true, if: 'notHasted' }],
  drops: [{ item: 'potion', chance: 0.12 }, { item: 'antidote', chance: 0.15 }], lootZone: 'whisperwood_hollow',
  sprite: { atlas: 'enemies_battle', field: 'enemies_field', frame: 'thornback_wolf' },
  flavor: 'A briar wolf grown old under the pines. The thorns go all the way through.',
});
enemy('ink_blot', {
  name: 'Ink Blot', family: 'ooze', level: 6,
  hp: 190, atk: 24, def: 8, mag: 26, spr: 12, spd: 10, luk: 4,
  shields: 3, weak: ['fire', 'axe'], resist: ['ice'], statusImmune: ['poison'],
  exp: 22, gold: 40, masteryPts: 4,
  moves: [{ skill: 'slime_tackle', weight: 50 }, { skill: 'ink_spit', weight: 50 }],
  drops: [{ item: 'ether', chance: 0.12 }, { item: 'eye_drops', chance: 0.15 }], lootZone: 'whisperwood_hollow',
  sprite: { atlas: 'enemies_battle', field: 'enemies_field', frame: 'ink_blot' },
  flavor: 'Ink from the black pool, thick as tar and twice as patient.',
});
enemy('briar_alpha', {
  name: 'Briar Alpha', family: 'beast', level: 7, size: 'large', boss: true, ai: 'phased',
  hp: 560, atk: 37, def: 11, mag: 10, spr: 10, spd: 15, luk: 8,
  shields: 3, weak: ['fire', 'axe'],
  statusImmune: ['stun', 'silence', 'poison', 'blind'],
  exp: 110, gold: 260, masteryPts: 14,
  moves: [{ skill: 'bite', weight: 55, target: 'lowestHpPct' }, { skill: 'thorn_bite', weight: 45 }],
  // Its telegraph reuses the scarab's charge (the only single-target telegraph skill in skills.js): "digs in,
  // eyes fixed on {target}" reads as a pounce. Lunge, Defend or a Break answer it.
  charge: { skill: 'burrow_charge', first: 2, cooldown: 3 },
  // Two phase changes (ai.js `phased`): at 50% it calls one Thornback Wolf, at 25% it gains Haste.
  phases: [
    { id: 'warden', name: 'Warden of the Lost Bridge', at: 1.0, weak: ['fire', 'axe'], resist: [], shields: 3,
      text: 'The Briar Alpha plants itself between you and the plaque.' },
    { id: 'pack_call', name: 'Pack Call', at: 0.5, weak: ['fire', 'axe'], resist: [], shields: 3, summon: 'thornback_wolf',
      text: 'The Alpha throws back its head and calls. Something answers from the pines.' },
    { id: 'thornrage', name: 'Thorn Rage', at: 0.25, weak: ['fire', 'axe'], resist: [], shields: 4, haste: true,
      text: 'Thorns bristle along its spine. It is faster now, and past caring.' },
  ],
  drops: [], lootZone: 'whisperwood_hollow', uniqueDrop: 'thornwake',
  // W8-art: its own 1x frame, drawn larger from the painting (no 1.3x upscale, no tint).
  sprite: { atlas: 'enemies_battle', field: 'enemies_field', frame: 'briar_alpha' },
  flavor: "The pack's first and oldest. It kept the lost bridge for years, and nobody told it to stop.",
});

// =============================================================================================
// Episode 2: The Town Without a Name (E2-battle; EPISODE2_PLAN.md section 6). Names and flavors are mirrored
// by the bestiary in data/text.js (E2-story). New traits, all handled in battle/ai.js:
//   tags: ['glass']                  family tag: Bram's Shatter cracks 2 shields on glass foes
//   opener: skillId                  forced first move (the Glassback teaches its reflect by opening with Harden)
//   reflectWhileProtected: 'magic'   while it has Protect (and is not Broken) spells rebound onto a random ally
//   split: { into, hp }              innate split on first defeat into two `into` foes at hp x the parent's max HP
//   ai 'mimic'                       the Borrowed Shadow: adapts to the type that last hit it (half damage from it)
//                                    and answers with a shadow copy of it
//   ai 'reflections'                 the Other Selves: Mirrored Combo telegraph when two hold consecutive slots
//   ai 'nameless_king'               three phases, Keeping (status kept), the Mirror Ward and its two adds
// Field sprite for a map enemy event = the encounter's leader id (enemies_field), battle frames = the enemy id.
// =============================================================================================

// ---------------------------------------------------------------- The Fading Road (Lv 9-10)
enemy('mist_wolf', {
  name: 'Mist Wolf', family: 'beast', level: 9,
  hp: 280, atk: 31, def: 12, mag: 7, spr: 8, spd: 16, luk: 7,
  shields: 2, weak: ['fire', 'spear'], evade: 0.1,
  exp: 11, gold: 45, masteryPts: 4,
  moves: [{ skill: 'bite', weight: 50, target: 'lowestHpPct' }, { skill: 'mist_bite', weight: 35 },
          { skill: 'howl', weight: 15, once: true, if: 'notHasted' }],
  drops: [{ item: 'potion', chance: 0.12 }, { item: 'eye_drops', chance: 0.1 }], lootZone: 'east_road',
  flavor: 'A wolf made mostly of morning fog. The bite is real.',
});
enemy('glassback', {
  name: 'Glassback Beetle', family: 'insect', tags: ['glass'], level: 9,
  hp: 180, atk: 34, def: 22, mag: 7, spr: 14, spd: 8, luk: 4,
  shields: 3, weak: ['axe', 'thunder'], resist: ['sword', 'bow', 'ice'],
  exp: 14, gold: 54, masteryPts: 4,
  opener: 'harden', reflectWhileProtected: 'magic',
  moves: [{ skill: 'shell_bash', weight: 70 }, { skill: 'harden', weight: 30, if: 'notProtected' }],
  charge: { skill: 'glass_ram', first: 2, cooldown: 3 },
  drops: [{ item: 'potion', chance: 0.15 }, { item: 'hi_potion', chance: 0.04 }], lootZone: 'east_road',
  flavor: 'Its shell is old silverglass. While it glitters, spells bounce.',
});
enemy('quicksilver', {
  name: 'Quicksilver', family: 'ooze', level: 9, size: 'small',
  hp: 110, atk: 30, def: 8, mag: 40, spr: 10, spd: 10, luk: 4,
  shields: 2, weak: ['thunder', 'ice'], resist: ['fire'], statusImmune: ['poison'],
  exp: 8, gold: 33, masteryPts: 3,
  split: { into: 'quicksilver_bead', hp: 0.35 },
  moves: [{ skill: 'slime_tackle', weight: 55 }, { skill: 'mercury_spit', weight: 45 }],
  drops: [{ item: 'antidote', chance: 0.12 }, { item: 'ether', chance: 0.06 }], lootZone: 'east_road',
  flavor: 'A bead of mercury that rolled off a mirror and kept rolling.',
});
enemy('quicksilver_bead', {
  name: 'Quicksilver Bead', family: 'ooze', level: 9, size: 'small',
  hp: 39, atk: 30, def: 8, mag: 40, spr: 10, spd: 12, luk: 4,
  shields: 1, weak: ['thunder', 'ice'], resist: ['fire'], statusImmune: ['poison'],
  exp: 0, gold: 0, masteryPts: 1,
  moves: [{ skill: 'slime_tackle', weight: 100 }],
  drops: [], lootZone: null,
  flavor: 'A drop of Quicksilver that broke away. It wants to roll back.',
});

// ---------------------------------------------------------------- Court of Mirrors F1 (Lv 10-11)
enemy('glint_wisp', {
  name: 'Glint Wisp', family: 'spirit', level: 10, flying: true, size: 'small',
  hp: 205, atk: 26, def: 9, mag: 51, spr: 18, spd: 14, luk: 8,
  shields: 2, weak: ['bow', 'thunder'], resist: ['fire', 'light'], evade: 0.2,
  exp: 20, gold: 66, masteryPts: 4,
  moves: [{ skill: 'glint', weight: 50 }, { skill: 'mirror_dust', weight: 30 }, { skill: 'e_strike', weight: 20 }],
  charge: { skill: 'prism_burst', first: 3, cooldown: 4 },
  drops: [{ item: 'eye_drops', chance: 0.12 }, { item: 'ether', chance: 0.08 }], lootZone: 'court_f1',
  flavor: 'A glint of light that came loose from the glass and lost its way.',
});
enemy('glass_sentinel', {
  name: 'Glass Sentinel', family: 'construct', tags: ['glass'], level: 10, size: 'large',
  hp: 290, atk: 55, def: 22, mag: 13, spr: 10, spd: 7, luk: 3,
  shields: 4, weak: ['thunder', 'axe'], resist: ['sword', 'spear'], statusImmune: ['poison'],
  exp: 26, gold: 90, masteryPts: 6,
  moves: [{ skill: 'shard_fist', weight: 70 }, { skill: 'glass_guard', weight: 30, if: 'notProtected' }],
  charge: { skill: 'shatter_quake', first: 2, cooldown: 3 },
  drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'potion', chance: 0.2 }], lootZone: 'court_f1',
  flavor: 'A sentry of the Court, built of silverglass and very old orders.',
});

// ---------------------------------------------------------------- Court of Mirrors F2 (Lv 11-12)
enemy('borrowed_shadow', {
  name: 'Borrowed Shadow', family: 'spirit', level: 11, ai: 'mimic',
  hp: 370, atk: 44, def: 12, mag: 62, spr: 20, spd: 13, luk: 8,
  shields: 3, weak: ['light', 'bow'],
  exp: 20, gold: 84, masteryPts: 5,
  // ai 'mimic' answers with shadow_strike / shadow_ember / shadow_frost / shadow_spark / shadow_mend (see ai.js)
  moves: [{ skill: 'dusk_touch', weight: 100 }],
  drops: [{ item: 'echo_herb', chance: 0.12 }, { item: 'ether', chance: 0.1 }], lootZone: 'court_f2',
  flavor: 'A shadow with nobody to belong to. It borrows whatever hits it.',
});
enemy('faceless_knight', {
  name: 'Faceless Knight', family: 'construct', level: 11, size: 'large',
  hp: 280, atk: 66, def: 24, mag: 26, spr: 14, spd: 10, luk: 5,
  shields: 5, weak: ['axe', 'thunder', 'light'], resist: ['sword', 'spear'], statusImmune: ['poison'],
  exp: 26, gold: 105, masteryPts: 6,
  moves: [{ skill: 'blank_blade', weight: 70 }, { skill: 'knight_cover', weight: 30, if: 'hasAlly' }],
  charge: { skill: 'judgement', first: 2, cooldown: 3 },
  drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'phoenix_feather', chance: 0.03 }], lootZone: 'court_f2',
  flavor: 'A knight of the Court with a blank visor. It guards the weakest.',
});

// ---------------------------------------------------------------- Court of Mirrors F3 (Lv 12-13)
enemy('shard_swarm', {
  name: 'Shard Swarm', family: 'construct', tags: ['glass'], level: 12, size: 'small', flying: true,
  hp: 320, atk: 42, def: 10, mag: 51, spr: 12, spd: 17, luk: 6,
  shields: 2, weak: ['thunder', 'axe', 'light'], resist: ['spear', 'bow'], evade: 0.25, statusImmune: ['poison'],
  exp: 26, gold: 93, masteryPts: 5,
  moves: [{ skill: 'shard_rain', weight: 60 }, { skill: 'glitter', weight: 40 }],
  charge: { skill: 'shard_storm', first: 3, cooldown: 4 },
  drops: [{ item: 'eye_drops', chance: 0.12 }, { item: 'hi_ether', chance: 0.04 }], lootZone: 'court_f3',
  flavor: 'Pieces of a broken mirror that still fly in formation.',
});

// ---------------------------------------------------------------- The Other Selves (F2 mini-boss, Lv 11-12)
// "Everything you are not": each reflection is weak to every weapon type its owner does not carry and resists
// its owner's own. Battle art: party_battle frames flipped and glass-recolored (E2-sprites), frame id = enemy id.
const REFLECTION = { boss: true, size: 'medium', family: 'reflection', ai: 'reflections', statusImmune: ['poison'],
  drops: [], lootZone: 'court_f2' };
enemy('refl_hero', {
  ...REFLECTION, name: 'Nameless Reflection', level: 11,
  hp: 365, atk: 100, def: 18, mag: 24, spr: 14, spd: 16, luk: 8,
  shields: 4, weak: ['spear', 'staff', 'bow'], resist: ['sword', 'axe'],
  exp: 40, gold: 134, masteryPts: 5,
  moves: [{ skill: 'mirror_slash', weight: 55 }, { skill: 'risen_slash', weight: 30 },
          { skill: 'refl_steady', weight: 15, if: 'notFocused' }],
  flavor: 'Your reflection, stepped out of the glass. It has no face.',
});
enemy('refl_mira', {
  ...REFLECTION, name: "Mira's Reflection", level: 11,
  hp: 285, atk: 40, def: 12, mag: 102, spr: 22, spd: 15, luk: 8,
  shields: 3, weak: ['sword', 'axe', 'spear'], resist: ['staff', 'bow'],
  exp: 40, gold: 133, masteryPts: 5,
  moves: [{ skill: 'refl_ember', weight: 40 }, { skill: 'refl_frost', weight: 35 },
          { skill: 'refl_mend', weight: 25, if: 'allyHurt' }],
  flavor: 'Mira, backwards. It says what she is afraid of.',
});
enemy('refl_bram', {
  ...REFLECTION, name: "Bram's Reflection", level: 11,
  hp: 375, atk: 88, def: 26, mag: 19, spr: 16, spd: 12, luk: 6,
  shields: 5, weak: ['sword', 'staff', 'bow'], resist: ['spear', 'axe'],
  exp: 40, gold: 133, masteryPts: 4,
  moves: [{ skill: 'refl_lunge', weight: 55 }, { skill: 'refl_guard', weight: 25, if: 'allyHurt' },
          { skill: 'refl_taunt', weight: 20, if: 'notTaunting' }],
  flavor: 'Bram, backwards. It stands still, the way guards are taught.',
});

// ---------------------------------------------------------------- The Nameless King (Lv 13) and his court
enemy('nameless_king', {
  name: 'The Nameless King', family: 'king', tags: ['glass'], level: 13, size: 'boss', boss: true, ai: 'nameless_king',
  hp: 1400, mp: 99, atk: 158, def: 22, mag: 149, spr: 20, spd: 13, luk: 10,
  shields: 6, weak: ['thunder', 'spear'], resist: ['ice'],
  statusImmune: ['stun', 'silence', 'poison', 'blind', 'chill'],
  exp: 500, gold: 800, masteryPts: 24,
  moves: [{ skill: 'glass_sword', weight: 60 }, { skill: 'cold_mirror', weight: 40 }],
  // Phases by HP fraction (ai.js nameless_king). HP locks: phase 1 stops at 66%; under the Mirror Ward (phase 2,
  // while Sorrow or Pride stands) he takes 25% damage, his shields cannot be chipped and his HP stops at 34%. When
  // both adds fall the ward shatters: he is Broken for a turn (freeing every Kept member) and phase 3 begins.
  phases: [
    { id: 'veiled', name: 'The Veiled King', at: 1.0, weak: ['thunder', 'spear'], resist: ['ice'], shields: 6,
      text: 'The King rises from the throne. His mirror shows everything except himself.' },
    { id: 'shattered_court', name: 'The Shattered Court', at: 0.66, weak: ['thunder', 'spear'], resist: ['ice'], shields: 6,
      summon: ['false_sorrow', 'false_pride'], ward: true, floor: 0.34,
      moves: [{ skill: 'glass_sword', weight: 70 }, { skill: 'cold_mirror', weight: 30 }],
      text: 'His mirror breaks into a court of faces. Sorrow and Pride step out to guard him.' },
    { id: 'unmasked', name: 'Aurel Unmasked', at: 0, weak: ['fire', 'light', 'spear'], resist: [], shields: 8, haste: true,
      sprite: 'nameless_king_unmasked', moves: [{ skill: 'glass_sword', weight: 100 }],
      text: "The glass veil shatters. Under the glass is a tired man's face." },
  ],
  drops: [], lootZone: 'court_f3',
  flavor: 'The lord of the Court of Mirrors. He keeps everything.',
});
enemy('false_sorrow', {
  name: 'Sorrow', family: 'reflection', level: 13,
  hp: 240, atk: 40, def: 10, mag: 74, spr: 22, spd: 12, luk: 6,
  shields: 2, weak: ['fire', 'bow'], resist: ['ice'], statusImmune: ['poison'],
  exp: 0, gold: 0, masteryPts: 2,
  moves: [{ skill: 'weep', weight: 100 }],
  charge: { skill: 'lament', first: 3, cooldown: 3 },
  drops: [], lootZone: null,
  flavor: 'A reflection of grief. While it weeps, the King mends.',
});
enemy('false_pride', {
  name: 'Pride', family: 'reflection', level: 13,
  hp: 280, atk: 86, def: 26, mag: 25, spr: 12, spd: 11, luk: 6,
  shields: 4, weak: ['spear', 'thunder'], resist: ['fire', 'sword'], statusImmune: ['poison'],
  exp: 0, gold: 0, masteryPts: 2,
  moves: [{ skill: 'proud_stance', weight: 35, if: 'notTaunting' }, { skill: 'glass_lance', weight: 65 }],
  drops: [], lootZone: null,
  flavor: 'A reflection of pride. It stands in front of what it guards.',
});

// Lost Page variants: each summon picks distinct variants so the pages want different answers.
// The ink color tells the player the weakness (revealed from the start: the tint IS the hint).
export const LOST_PAGE_VARIANTS = [
  { id: 'kindling', name: 'Kindling Page', weak: ['fire'], tint: '#ff8a2a' },
  { id: 'frosted', name: 'Frosted Page', weak: ['ice'], tint: '#9fd8ff' },
  { id: 'static', name: 'Static Page', weak: ['thunder'], tint: '#ffe066' },
  { id: 'taut', name: 'Taut Page', weak: ['spear', 'bow'], tint: '#c8b88a' },
  { id: 'brittle', name: 'Brittle Page', weak: ['axe', 'staff'], tint: '#9a6a4a' },
  { id: 'loose', name: 'Loose Page', weak: ['sword'], tint: '#e8e0c8' },
];

// ---------------------------------------------------------------------------------------------
// Elites (Diablo). One enemy in about 8 encounters. Gold name, 1 or 2 modifiers.
// ---------------------------------------------------------------------------------------------
export const ELITE_RATE = 0.125;
export const ELITE_BASE = { hp: 1.45, atk: 1.12, mag: 1.12, exp: 2, gold: 2, masteryPts: 2, color: '#ffd34d' };
export const ELITE_MODS = {
  swift:     { id: 'swift', name: 'Swift', spd: 1.4, desc: 'Acts far more often.' },
  stoneskin: { id: 'stoneskin', name: 'Stoneskin', shields: 2, def: 1.5, desc: 'Two extra shields, tougher hide.' },
  vampiric:  { id: 'vampiric', name: 'Vampiric', lifesteal: 0.35, desc: 'Heals for a third of the damage it deals.' },
  cursed:    { id: 'cursed', name: 'Cursed', curse: 0.3, desc: 'Its hits may inflict Poison, Blind or Chill.' },
  splitting: { id: 'splitting', name: 'Splitting', split: 0.35, desc: 'Splits in two when first defeated.' },
  // W10: story tiers, never rolled at random (`fixed`). A party that reaches the Briar Alpha late meets an Elder
  // (encounters.js whisperwood_alpha_t1 / _t2, chosen by ep1.js hollow_alpha from story flags), so the optional
  // mini-boss stays a fight at Lv 8 and at Lv 9 to 10 instead of a walk. Same bestiary entry (weakKey is the id).
  elder:     { id: 'elder', name: 'Elder', def: 1.1, fixed: true, desc: 'Grey at the muzzle and grown into its briar.' },
  elder_ii:  { id: 'elder_ii', name: 'Elder', def: 1.25, spd: 1.2, shields: 1, fixed: true,
    desc: 'Grey at the muzzle, grown into its briar, and faster than it looks.' },
};
/** Modifiers an ordinary encounter may roll (the `fixed` story tiers are excluded). */
export const RANDOM_ELITE_MODS = Object.keys(ELITE_MODS).filter((k) => !ELITE_MODS[k].fixed);
export const CURSE_STATUSES = ['poison', 'blind', 'chill'];

export function enemyDef(id) { return ENEMIES[id] || null; }
