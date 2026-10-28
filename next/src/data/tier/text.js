// Fine Print (tier_1): every player-facing string of the tier, in one place, so a later change is one edit (docs/TIER.md).
// Rules for these lines: ASCII, no em dashes, the game's plain voice. `{name}` and the like are filled by the title code.

export const TIER = {
  name: 'Fine Print',
  row: 'Fine Print',
  note: 'Episode 1 again with a finished party. Stronger foes, better pay. Your record stays safe.',
  pick: 'Carry which record into Fine Print?',
  record: '{name}, Lv {level}, {place}',
  terms: [
    '{name} starts Episode 1 again, with levels,',
    'gear, the bag and gold. The story and chests',
    'start over. Foes are stronger and pay more.',
  ],
  saveTo: 'The run saves to record {slot}.',
  saveAuto: 'The run saves to the autosave.',
  begin: 'Begin',
  back: 'Back',
  none: 'No finished record is left to carry.',
  failed: 'Fine Print could not start.',
};
