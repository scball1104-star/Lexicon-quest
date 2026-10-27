// The Vows (H3, docs/VOWS.md): one optional vow per rest, kept until the next rest. Pure data; the state machine is
// src/game/vows.js. Row shape: { id, name (under 17 chars), line (the offer, under 42), rule, breaksOn (vowEvent types),
// to (reward recipients in preference order), keptLine / brokenLine ([{ who, text }], the first speaker in the party is
// said, who: null is the fallback), offerIf(game, ctx) }. Box rules: 3 lines of 42, ASCII, no em dashes.

/** Mastery points a kept vow pays, by chapter: a chapter's five never add up to one mastery level (docs/VOWS.md). */
export const VOW_REWARD = { 1: 4, 2: 8, 3: 12 };
/** Kept vows that pay per chapter; later ones keep their line but pay no points. */
export const VOW_PAID_CAP = 5;

const inParty = (g, id) => (g.party || []).some((m) => m.id === id);

export const VOWS = [
  {
    id: 'no_flee', name: 'No fleeing',
    line: 'Stand in every fight until you rest.',
    rule: 'Flee once and the vow ends.',
    breaksOn: ['flee'],
    to: ['hero'],
    keptLine: [
      { who: 'bram', text: 'Not one step back. I saw it. So did the road.' },
      { who: 'mira', text: 'You stayed. Every time. I kept count.' },
      { who: null, text: 'You stood your ground every time. It shows.' },
    ],
    brokenLine: [
      { who: 'bram', text: "You ran. Fair enough. Some fights are tomorrow's. The vow's done, that's all." },
      { who: 'mira', text: 'A retreat is not forgetting. The vow ends; you do not.' },
      { who: null, text: 'The vow ended when you ran. Nothing else did.' },
    ],
    offerIf: () => true,
  },
  {
    id: 'no_heal', name: 'No healing items',
    line: 'No potion, no feather, until you rest.',
    rule: 'Use one, in a fight or from the bag, and it ends.',
    breaksOn: ['item'],
    to: ['bram', 'hero'],
    keptLine: [
      { who: 'bram', text: 'Not one swallow. Hard on the belly, good for the spine.' },
      { who: 'mira', text: 'Every scrape left to mend on its own. I noted it.' },
      { who: null, text: 'The bag stayed shut. You made do.' },
    ],
    brokenLine: [
      { who: 'bram', text: "You needed it. That's what it was for. The vow's done." },
      { who: 'mira', text: 'A potion is not a failing. The vow just ends.' },
      { who: null, text: 'The bag opened. The vow ended. You kept the rest.' },
    ],
    offerIf: () => true,
  },
  {
    id: 'walk', name: 'Walk the road',
    line: 'Walk every step until you rest.',
    rule: 'One running step and it ends.',
    breaksOn: ['run'],
    to: ['hero'],
    keptLine: [
      { who: 'bram', text: 'Every step at a walk. You saw more of the road than I did.' },
      { who: 'mira', text: 'You walked the whole way. The road kept pace.' },
      { who: null, text: 'You walked it. Every step.' },
    ],
    brokenLine: [
      { who: 'bram', text: "You ran. Legs are for that. The vow's done." },
      { who: 'mira', text: "A run, then. The road doesn't mind. The vow ends." },
      { who: null, text: 'You ran. The vow ended there.' },
    ],
    // Always Run makes every step a run, so the vow could not be kept: it is not offered then.
    offerIf: (g, ctx) => !(ctx && ctx.alwaysRun),
  },
  {
    id: 'mira_stands', name: 'Mira stands',
    line: 'Mira does not fall until you rest.',
    rule: 'If she drops to zero, it ends.',
    breaksOn: ['fell'],
    member: 'mira',
    to: ['mira'],
    keptLine: [
      { who: 'mira', text: 'I stayed standing. You made sure of it. Thank you.' },
      { who: 'bram', text: "She never went down. That was you, {hero}." },
      { who: null, text: 'Mira stood to the end.' },
    ],
    brokenLine: [
      { who: 'mira', text: "I fell. I'm up again. The vow ends; I don't." },
      { who: 'bram', text: "She went down. She's up. The vow's done, that's all." },
      { who: null, text: 'Mira fell. The vow ended. She is up again.' },
    ],
    offerIf: (g) => inParty(g, 'mira'),
  },
  {
    id: 'no_fury', name: 'No Fury',
    line: 'Spend no Fury until you rest.',
    rule: 'One Fury art and it ends.',
    breaksOn: ['fury'],
    to: ['hero'],
    keptLine: [
      { who: 'bram', text: 'No Fury, and we still won. Remember how that felt.' },
      { who: 'mira', text: 'You won on the blade and the plan. No Fury needed.' },
      { who: null, text: 'Your Fury stayed unspent. You won anyway.' },
    ],
    brokenLine: [
      { who: 'bram', text: "You let it out. Sometimes you have to. Vow's done." },
      { who: 'mira', text: 'Fury has its hour. The vow ended, nothing else.' },
      { who: null, text: 'The Fury went out. The vow ended with it.' },
    ],
    offerIf: () => true,
  },
];

export const VOW_BY_ID = Object.fromEntries(VOWS.map((v) => [v.id, v]));

/** H6: said once, before the first offer. */
export const VOW_INTRO = [
  { who: 'bram', text: 'Old guard habit: swear one hard thing at a fire. Keep it to the next fire, and your weapon hand learns from it.' },
  { who: null, text: 'A vow is one hard rule until the next rest. Kept, it pays in weapon mastery.' },
];

export default VOWS;
