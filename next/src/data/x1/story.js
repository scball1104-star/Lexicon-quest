// Lexicon Quest NEXT, Episode 1 expansion: "The Wider Valley". Every scripted scene of docs/EXPANSION1_PLAN.md section 2.6 and
// section 5: 42 scene designs, 50 registered scene ids (stray_found, star_read and crate_delivered are one function each,
// registered once per sheep, mark and receiver because a scene cannot be told which event started it).
//
// Scenes use ONLY the cutscene API (DESIGN 5.4). Places and props are map mark, event and actor names, never tile
// coordinates; every name is in the marks checklist of plan 4.11. Staging for every scene is in docs/story/STAGING_X1.md.
// Writing rules: one idea per box, at most 3 lines of 42 characters, ASCII, no em dashes, {hero} = player name.
//
// Registration: this file is part of the `x1` pack. register() hands the scenes, the scene guards and nothing else to
// registerStory(); the inspect lines come from text.js. Each scene runs only when its SCENE_CONDITIONS hold AND its region is
// on (x1On(region) of live.js: the switch, the region and the loaded pack), with input locked for its whole run.
//
// THE NAMES. Every placeholder name (the Reeve, the twelve stones, the Keepers, Odo's song) is read from X1_NAMES_TO_CONFIRM in
// text.js. Nothing in this file spells one out, so the real names are a one-place edit.
//
// Quest EXP (plan 5.8): the closing scene of each quest calls `await s.give('exp', n)` once, after it sets the quest's done flag:
// Strays 8, Thirteenth Stone 12, Dark Stars 8, Pell's Crates 6, Four Rolls 12, Things Not To Forget 8 (54). The amounts come from
// REWARDS_X1 (quests.js).

import { REWARDS_X1 } from './quests.js';
import { X1_NAMES_TO_CONFIRM as NAMES, CELLAR_NOTE_PAGES } from './text.js';
import { X1_MAP_REGION } from './flags.js';
import { x1On } from './live.js';
import * as STORY from '../../game/story.js';

const PORTRAIT = { hero: 'hero', mira: 'mira', bram: 'bram', iris: 'iris', pell: 'pell' };
const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);

// A scene runs when its flags hold and its region is on. GATE.on is read at call time so tests can switch regions.
export const GATE = { on: (region) => x1On(region) };
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
async function allowed(s, cond, region) {
  if (region && !GATE.on(region)) return false;
  if (!cond) return true;
  for (const f of toList(cond.if)) if (!(await s.hasFlag(f))) return false;
  for (const f of toList(cond.ifNot)) if (await s.hasFlag(f)) return false;
  return true;
}
const cut = (fn, cond, region) => async (s) => {
  if (!(await allowed(s, cond, region))) return;
  await s.lockInput();
  try { await fn(s); } finally { await s.unlockInput(); }
};

const stone = (i) => NAMES.stones[i];
// Read at call time, so a changed name in X1_NAMES_TO_CONFIRM reaches the scene without a reload.
const reeveFull = () => `${NAMES.reeve.name}, ${NAMES.reeve.title}`;
const exp = (key) => REWARDS_X1[key].exp;

// ================================================================================================
// Shepherd's Downs and Thornfold (west)
// ================================================================================================

// 1. x1_downs, on enter (first time). 3 boxes. Sets downs_arrived.
async function downs_arrival(s) {
  await s.camera.panTo('thornfold', 50);
  await narrate(s, 'West of the valley the land lifts and rolls. Wind combs the grass. Far off, one thread of smoke.');
  await s.camera.follow('hero');
  await say(s, 'mira', "Four roads leave that signpost, and not one is on the library's map. I find that rude.");
  await say(s, 'bram', 'Maps forget the quiet places first. Smoke means a hearth. A hearth means a name on a door. Come on.');
  await s.setFlag('downs_arrived');
}

// 2. x1_downs, step trigger at the hamlet's edge. 4 boxes. Sets thornfold_arrived.
async function thornfold_arrival(s) {
  await s.camera.panTo('fold_gate', 40);
  await narrate(s, 'Thornfold: four low cottages, a drystone fold, a well, and a loom clacking behind a shuttered window.');
  await say(s, 'brindle', 'Visitors. Mind the gate, it sticks. So do I.');
  await s.camera.follow('hero');
  await say(s, 'bram', 'Woodsmoke and wet wool. It reminds me of nothing bad, which is rare.');
  await say(s, 'mira', 'Then let us be good guests. The man at the fold is counting something.');
  await s.setFlag('thornfold_arrived');
}

// 3. x1_downs, Brindle's talk entry. 5 boxes. Starts Strays of Thornfold.
async function brindle_strays(s) {
  await s.face('brindle', 'hero');
  await say(s, 'brindle', 'Twelve in the fold. Twelve is right. Twelve is always right.');
  await say(s, 'mira', 'I count seven, Mr. Brindle.');
  await say(s, 'brindle', 'So do I, every morning. Then I whistle for twelve. The five know the tune. They will come when they can.');
  await say(s, 'mira', 'Five missing. Three places a sheep would hide, and one with a fence.');
  await say(s, 'bram', '{hero} will find them. {hero} never could leave a locked door alone.');
  await s.setFlag('strays_started');
}

// 4. x1_downs and valley, a stray's talk entry. One function, five registered ids. 1 box each. Sets stray_N_found.
const STRAY_TEXT = {
  1: 'The sheep looks up from the hay, says baa, and trots toward Thornfold as if this had been its plan all along.',
  2: 'The sheep stands among the stones as if counting them. Baa. It trots off toward Thornfold.',
  3: 'Baa, says the sheep, with the wind in its wool. It picks its way down the ridge toward Thornfold.',
  4: 'Baa. The sheep leaves the pasture at a dignified trot, west, toward home.',
  5: 'Baa. The sheep squeezes back through the cracked wall like it has done this before.',
};
const strayFound = (n) => async (s) => {
  await s.sfx('sheep_baa');
  await narrate(s, STRAY_TEXT[n]);
  await s.despawn(`stray_${n}`);
  await s.setFlag(`stray_${n}_found`);
};

// 5. x1_downs, Brindle's talk entry once all five are home. 5 boxes. Gives fold_mantle, 100 gold, 8 EXP.
async function strays_done(s) {
  await s.face('brindle', 'hero');
  await narrate(s, 'Brindle whistles. Twelve short notes, clear as a kettle. Twelve sheep answer, and the fold is full.');
  await say(s, 'brindle', 'Twelve. Twelve is right. I never named a one of them. A sheep knows its whistle. That is its name, to the sheep.');
  await say(s, 'brindle', 'Here. Tamsin wove it. A fold mantle. It keeps a body from getting lost.');
  await s.give(REWARDS_X1.strays.item, REWARDS_X1.strays.qty);
  await s.give('gold', REWARDS_X1.strays.gold);
  await say(s, 'mira', "There's a name stitched in the hem. Tamsin's, I think.");
  await say(s, 'brindle', 'She does that. So it comes home. See that it does.');
  await s.setFlag('strays_done');
  await s.give('exp', exp('strays'));
}

// 6. x1_downs, step trigger on stepping into the ring. 3 boxes. Sets stones_seen.
async function stones_arrival(s) {
  await s.camera.panTo('stones_center', 50);
  await narrate(s, 'Twelve grey stones stand in a ring, taller than a man. A thirteenth slab lies apart, face to the sky.');
  await say(s, 'mira', 'Not worn. Blank. Weather leaves scratches, and these have none.');
  await say(s, 'bram', 'Feels like walking into a room where everybody just stopped talking.');
  await s.camera.follow('hero');
  await s.setFlag('stones_seen');
}

// 7. x1_downs, Brindle's talk entry (after seeing the stones). 5 boxes. Starts The Thirteenth Stone.
async function rollcall_start(s) {
  await s.face('brindle', 'hero');
  await say(s, 'brindle', 'Aye, the stones. Every spring we touch each one and say its name. My father did. His father did.');
  await say(s, 'brindle', 'This spring I put my hand on the first stone and said the weather. Then the next. Twelve remarks about the weather.');
  await say(s, 'mira', "Iris keeps the old rolls at the library. Quill, at the Pilgrim's Rest, copies everything. Twice.");
  await say(s, 'bram', 'So we fetch the papers and bring them back.');
  await say(s, 'brindle', 'Say them aloud, mind. Paper is no good to a stone. A stone wants to be told.');
  await s.setFlag('rollcall_started');
}

// 8. library, Iris's talk entry. 4 boxes. Gives burial_roll. Sets roll_found.
async function iris_roll(s) {
  await s.face('iris', 'hero');
  await say(s, 'iris', "Thornfold's burial roll. The bottom third is gone, not faded. Gone, with the paper. Nine names survive.");
  await s.give('burial_roll');
  await say(s, 'mira', `${stone(0)}. ${stone(1)}. ${stone(2)}. ${stone(3)}. ${stone(4)}.`);
  await say(s, 'mira', `${stone(5)}. ${stone(6)}. ${stone(7)}. ${stone(8)}. And that is where the roll ends.`);
  if (await s.hasFlag('copy_found')) await say(s, 'iris', 'Then you have the last three from Quill already. Good. Nothing here ought to wait.');
  else await say(s, 'iris', 'The last three are on no page of mine. Quill copied the stones themselves. He copies everything.');
  await s.setFlag('roll_found');
}

// 9. valley, Quill's talk entry. 3 boxes. Gives quill_copy. Sets copy_found.
async function quill_copy(s) {
  await say(s, 'quill', "Thornfold's ring? Ten springs ago. I copy everything. Twice.");
  await s.give('quill_copy');
  await say(s, 'quill', `Twelve stones, clockwise from the north. The last three I only got by touch: ${stone(9)}, ${stone(10)}, ${stone(11)}.`);
  if (await s.hasFlag('roll_found')) await say(s, 'mira', 'Nine from the roll, three from your copy. Twelve. Quill, you are the most useful man in the valley.');
  else await say(s, 'mira', "Three here, and nine on Iris's roll. Twelve. Quill, you are the most useful man in the valley.");
  await s.setFlag('copy_found');
}

// 10. x1_downs, the stones object, with both papers. 11 boxes. Sets stones_lettered (and reeve_named when the Reeve is
// already down: the missing beat plays here instead of in the Barrow).
async function rollcall_stones(s) {
  if (await s.hasFlag('stones_lettered')) {
    if (await s.hasFlag('reeve_named')) await narrate(s, 'Thirteen names now, in thirteen stones. The wind goes round the ring and does not stop.');
    else await narrate(s, 'Twelve names, fresh in twelve stones. The thirteenth slab stays blank, face to the sky.');
    return;
  }
  if (!((await s.hasFlag('roll_found')) && (await s.hasFlag('copy_found')))) {
    if (await s.hasFlag('rollcall_started')) await narrate(s, "Twelve blank stones. You need the whole list first: the torn roll at the library, and the copy at the Pilgrim's Rest.");
    else await narrate(s, 'Twelve blank stones in a ring. Whatever they want, the shepherd at the fold in Thornfold would know.');
    return;
  }
  const reeveDown = await s.hasFlag('barrow_reeve_defeated');
  await s.music('sorrow');
  await s.camera.panTo('stones_center', 40);
  await s.walk('hero', 'ring_n');
  await narrate(s, "They stand in the ring. Mira unrolls the torn roll. Bram holds Quill's copy flat against the wind.");
  await say(s, 'mira', 'Brindle said a stone wants to be told. So. A hand on the stone, and the name out loud.');
  await s.sfx('stone_name');
  await say(s, 'mira', `${stone(0)}.`);
  await s.walk('hero', 'ring_e');
  await s.flash('#e8f0ff', 8);
  await s.sfx('stone_name');
  await say(s, 'mira', `${stone(1)}. ${stone(2)}. ${stone(3)}.`);
  await s.sfx('stone_name');
  await say(s, 'mira', `${stone(4)}. ${stone(5)}. ${stone(6)}.`);
  await s.walk('hero', 'ring_s');
  await s.sfx('stone_name');
  await say(s, 'mira', `${stone(7)}. ${stone(8)}. That is where my roll ends.`);
  await s.walk('hero', 'ring_w');
  await s.sfx('stone_name');
  await say(s, 'bram', `${stone(9)}. ${stone(10)}. Two I have never heard. Two I will not forget.`);
  if (!reeveDown) await narrate(s, 'Eleven stones carry their letters again, pale as frost. One is still blank. The wind has dropped.');
  await say(s, 'mira', '{hero}. The last one is yours. Say it and be kept.');
  await s.wait(30);
  await say(s, 'hero', `${stone(11)}.`);
  await s.flash('#ffffff', 10);
  await s.sfx('name_restore');
  await s.setFlag('stones_lettered');
  if (reeveDown) {
    await narrate(s, 'Twelve names stand in the ring. Then Mira crosses to the lone slab and lays a hand flat on it.');
    await say(s, 'mira', `${reeveFull()}.`);
    await s.sfx('stone_name');
    await s.setFlag('reeve_named');
  } else {
    await narrate(s, 'The last letters rise like breath on cold glass. Twelve names. The thirteenth slab, apart, stays blank.');
  }
  await s.camera.follow('hero');
  await s.music('the_downs');
}

// ================================================================================================
// The Wethers' Barrow (west)
// ================================================================================================

// 11. x1_barrow, on enter. 3 boxes. Sets barrow_entered.
async function barrow_entry(s) {
  await narrate(s, 'Cold green flagstone, turf for a ceiling, and from far ahead a dry voice, counting. ...Eleven. Twelve.');
  await say(s, 'mira', 'It stops at twelve. Every time. Then it starts over.');
  await say(s, 'bram', 'Counting is honest work. It is the stopping I do not like. Stay close.');
  await s.setFlag('barrow_entered');
}

// 12. x1_barrow, step row before the Reeve's hall. Boss intro: 3 boxes (1 on a retry), then the battle and reeve_after.
async function reeve_intro(s) {
  if (await s.hasFlag('barrow_reeve_defeated')) { await reeve_after(s); return; }
  const lettered = await s.hasFlag('stones_lettered');
  const met = await s.hasFlag('reeve_met');
  await s.music(null);
  await s.camera.panTo('reeve_spot', 40);
  await s.wait(30);
  if (met) {
    await say(s, 'barrow_reeve', lettered ? 'Twelve. In good order. And still one short.' : 'Eleven. Twelve. ...Twelve.');
  } else if (lettered) {
    await say(s, 'barrow_reeve', 'Twelve. I have them. Twelve in the hall, in good order. And the count will not come out.');
    await say(s, 'mira', 'He has all twelve names now. He is looking for the one he lost.');
    await say(s, 'bram', 'Everybody in here is one short. Gently, then. Ready?');
  } else {
    await say(s, 'barrow_reeve', 'Eleven. Twelve. ...Twelve. The flock is short. The flock is always short.');
    await say(s, 'mira', 'He is not angry. He is adding.');
    await say(s, 'bram', 'Does not matter why. He will not let us past the sum. Ready?');
  }
  await s.setFlag('reeve_met');
  await s.title('THE BARROW REEVE', { sub: 'Keeper of the Count', frames: 100 });
  await s.shake(2, 20);
  await s.flash('#ffffff', 8);
  await s.music('boss_reeve');
  const result = await s.battle('barrow_reeve', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await reeve_after(s);
  await s.music('wethers_barrow');
}

// 13. x1_barrow, after the battle (chained from reeve_intro; also a scene of its own for a reload). 5 boxes.
// Sets reeve_after_done (and reeve_named when the stones are lettered).
async function reeve_after(s) {
  if (await s.hasFlag('reeve_after_done')) return;
  const lettered = await s.hasFlag('stones_lettered');
  await s.music(null);
  await s.camera.panTo('reeve_spot', 20);
  if (lettered) {
    await say(s, 'barrow_reeve', 'Twelve. Twelve in good order. ...And the count is still one short.');
    await say(s, 'mira', 'It is not short. You never counted yourself.');
    await say(s, 'mira', `${reeveFull()}. That makes thirteen.`);
    await say(s, 'barrow_reeve', '...Thirteen.');
    await s.flash('#ffffff', 10);
    await s.sfx('name_restore');
    await s.despawn('barrow_reeve');
    await narrate(s, 'In the north wall the thirteenth niche takes its letters, slow as breath.');
    await s.setFlag('reeve_named');
  } else {
    await say(s, 'barrow_reeve', 'Eleven. Twelve. ...One short. One short.');
    await s.sfx('page_flutter');
    await s.despawn('barrow_reeve');
    await narrate(s, 'The Reeve sits down among his niches and goes on counting, softer, to no one. Then there is only the dark.');
    await say(s, 'mira', 'We beat his sum. We did not fix it.');
    await say(s, 'bram', 'Then there is a way to fix it. Something we have not done yet.');
    await say(s, 'mira', 'The stones. If they had their names back, he would have something true to count.');
  }
  await s.setFlag('reeve_after_done');
  await s.camera.follow('hero');
  await s.music('wethers_barrow');
}

// 14. x1_downs, Brindle's talk entry once the Reeve is named. 3 boxes. Gives rollcall_charm, 12 EXP.
async function rollcall_done(s) {
  await s.face('brindle', 'hero');
  await say(s, 'brindle', 'I went up to the ring at dawn. A hand on each stone, one after another. Twelve names, and my voice never wobbled.');
  await say(s, 'brindle', `Then the odd slab, off by itself. A name, cut deep: ${NAMES.reeve.name}. My grandmother said the Reeve counted the flock. ...Thirteen.`);
  await say(s, 'brindle', 'Here. My father\'s charm. We hold it up at the count. It has more use in your pocket than in my drawer.');
  await s.give(REWARDS_X1.rollcall.item, REWARDS_X1.rollcall.qty);
  await s.setFlag('rollcall_done');
  await s.give('exp', exp('rollcall'));
}

// ================================================================================================
// The Keepers' Terrace, the Orrery and the Cellar (north)
// ================================================================================================

// 15. valley, once-only trigger at the cleft (with the Lantern). 2 boxes. Sets cleft_seen.
async function cleft_hint(s) {
  await s.camera.panTo('cleft', 50);
  await say(s, 'mira', 'That cleft has a stair on its far side, and an edge that looks rubbed out. Ink does that. Lantern, {hero}.');
  await say(s, 'bram', 'Black gap, faint ink, a stair at the end. Raise the lamp and see if the gap agrees.');
  await s.camera.follow('hero');
  await s.setFlag('cleft_seen');
}

// 16. x1_terrace, on enter. 3 boxes. Sets terrace_arrived.
async function terrace_arrival(s) {
  await s.camera.panTo('court', 60);
  await narrate(s, 'A stone walk along the cliff, a parapet on one side and sky on the other. The whole valley lies below like a map.');
  await s.camera.follow('hero');
  await say(s, 'bram', 'I have walked under this cliff my whole life. Never once thought of walking on top of it.');
  await say(s, 'mira', 'Keepers\' work. They built where you would have to look up to see them.');
  await s.setFlag('terrace_arrived');
}

// 17. x1_orrery, on enter (first time). 6 boxes. Sets stars_started.
async function hesper_meet(s) {
  await s.camera.panTo('orrery', 40);
  await narrate(s, 'Under a brass dome, bronze rings turn very slowly. Nine small stars hang on them. Three are dark.');
  await say(s, 'hesper', 'Late again, all of you. The soup has gone cold.');
  await s.camera.follow('hero');
  await say(s, 'hesper', 'Oh. Visitors. The stars do not bring visitors. They bring weather.');
  await say(s, 'mira', 'Nine stars. Why are three of them dark?');
  await say(s, 'hesper', 'Nine Keepers, nine names. Three went dark, and I have lost whose. They signed where they worked, in hidden ink.');
  await say(s, 'hesper', 'You carry a Lantern. It is rude of it to glow from there. Read them for me, and I will light what I am owed.');
  await s.setFlag('stars_started');
}

// 18. A Keeper's mark read under the Lantern. One function, three registered ids (1 milestone, 2 Archive door, 3 Watchtower).
// 2 boxes each. Sets star_N_read.
const STAR_FIRST = {
  1: "Green letters rise on the milestone's back:",
  2: "Green letters rise in the Archive door's carving:",
  3: "Green letters rise on the Watchtower's base:",
};
const STAR_FLAG = ['star_1_read', 'star_2_read', 'star_3_read'];
const STAR_REMARK = {
  1: (n) => `${n}. He cut the words that keep fading. I would like to shake his hand.`,
  2: (n) => `${n}. A door that asks, not a door that guards. I never read it that way.`,
  3: (n) => `${n}. He hung the chimes. Odo says their words every dawn, and does not know who hung them.`,
};
const starRead = (n) => async (s) => {
  const k = NAMES.keepers[n - 1];
  if (await s.hasFlag(STAR_FLAG[n - 1])) { await narrate(s, `${k.name.toUpperCase()}, ${k.trade}. ${k.built}.`); return; }
  await s.sfx('star_chime');
  await s.flash('#9fe8c8', 12);
  await narrate(s, `${STAR_FIRST[n]} ${k.name.toUpperCase()}, ${k.trade}. ${k.built}.`);
  await s.setFlag(STAR_FLAG[n - 1]);
  let others = 0;
  for (const f of STAR_FLAG) if (f !== STAR_FLAG[n - 1] && (await s.hasFlag(f))) others++;
  if (others === 2) await say(s, 'mira', `${k.name}. That is all three. Back to Hesper, in the Orrery on the Terrace.`);
  else await say(s, 'mira', STAR_REMARK[n](k.name));
};

// 19. x1_orrery, Hesper's talk entry with all three marks read. 8 boxes. Sets orrery_aligned.
async function orrery_align(s) {
  await s.face('hesper', 'hero');
  await say(s, 'hesper', "Three names. Let me say them properly. I have not said a Keeper's name aloud in eleven years.");
  await s.music('mystery');
  await s.camera.panTo('orrery', 40);
  await s.sfx('orrery_hum');
  await say(s, 'hesper', `${NAMES.keepers[0].name}.`);
  await s.sfx('star_chime');
  await say(s, 'hesper', `${NAMES.keepers[1].name}.`);
  await s.sfx('star_chime');
  await say(s, 'hesper', `${NAMES.keepers[2].name}.`);
  await s.flash('#ffe9a8', 14);
  await s.sfx('star_chime');
  await narrate(s, 'Three brass stars wake on their rings. The dome splits like a seed, and light the color of old honey falls on the floor.');
  await say(s, 'hesper', 'They were never gone. They were waiting for someone to say them out loud. Rude, really. Late and smug.');
  await s.camera.panTo('hatch', 40);
  await s.sfx('door_unlock');
  await narrate(s, 'The seal slides back from the trapdoor in the floor. Pale stairs go down into the dark.');
  await s.camera.follow('hero');
  await say(s, 'mira', 'The Cellar. Whatever the Keepers kept beneath the stars, it is open now.');
  await s.setFlag('orrery_aligned');
  await s.music('orrery');
}

// 20. x1_cellar, on enter. 3 boxes. Sets cellar_entered.
async function cellar_entry(s) {
  await narrate(s, 'Pale blue tile, a star set into every fourth stone. The air is dry and perfectly still.');
  await say(s, 'bram', 'Quiet. I mean it. Even my boots are being polite.');
  await say(s, 'mira', 'Dry and cold. Perfect for keeping ink. Perfect for keeping anything.');
  await s.setFlag('cellar_entered');
}

// 21. x1_cellar, the note on the dais. 6 boxes. Sets stars_done. 8 EXP.
async function cellar_note(s) {
  if (await s.hasFlag('stars_done')) { await narrate(s, "Under the glass the Keeper's page still glows green. Look up, it says. That is all."); return; }
  await narrate(s, "On the dais, under glass, lies a Keeper's last page. The ink is green and looks wet.");
  await say(s, 'mira', `"${CELLAR_NOTE_PAGES[0]}"`);
  await say(s, 'mira', `"${CELLAR_NOTE_PAGES[1]}"`);
  await say(s, 'mira', `"${CELLAR_NOTE_PAGES[2]}"`);
  await say(s, 'bram', 'That is it? Look up?');
  await say(s, 'mira', 'That is it. It is harder than it sounds. Most days I am looking at my feet.');
  await s.setFlag('stars_done');
  await s.give('exp', exp('dark_stars'));
}

// ================================================================================================
// Pell's Crates (Willowmere, Thornfold, Larchhill, the Millrace)
// ================================================================================================

// 22. item_shop, Pell's talk entry. 4 boxes. Gives three pell_crate. Starts Pell's Crates.
async function crates_start(s) {
  await say(s, 'pell', 'Three crates. I labeled them, relabeled them, and then labeled the labels. The labels have gone pale again.');
  await say(s, 'pell', 'I think: spools for Tamsin in Thornfold. Beeswax moulds for Yarrow on Larchhill. A bearing for Ferrick at the weir.');
  await say(s, 'pell', 'I knew this morning. The crates know. Ask them nicely.');
  await say(s, 'bram', 'Three crates, three doors. Right. We will carry them.');
  await s.give('pell_crate', 3);
  await s.setFlag('crates_started');
}

// 23. A receiver's talk entry. One function, three registered ids (1 Tamsin, 2 Yarrow, 3 Ferrick). 2 boxes each.
const CRATE_LINES = {
  1: ['tamsin', 'Spools! Twelve, undyed, wool-grey. Pell wrote CANDLES, PROBABLY on the lid. He has never been wrong about a spool.',
    'Tell him I will stitch his name in the next hem. So it comes home.'],
  2: ['yarrow', 'Beeswax moulds! Forty-one hives and not a decent mould among them. The label says WAX THINGS. Precisely.',
    "Tell Pell his honey is on me. He worries, so I send sweet."],
  3: ['ferrick', 'Bearing. For the weir wheel. The label says ROUND THING. Correct.',
    'Tell him I will sign the receipt. Nobody ever asks me to.'],
};
const crateDelivered = (n) => async (s) => {
  const [who, a, bLine] = CRATE_LINES[n];
  await s.take('pell_crate', 1);
  await say(s, who, a);
  await say(s, who, bLine);
  await s.setFlag(`crate_${n}_done`);
};

// 24. item_shop, Pell's talk entry with all three delivered. 4 boxes. Gives drover_boots, sets pell_stamp, 6 EXP.
async function crates_done(s) {
  await say(s, 'pell', 'All three? Delivered? You did not lose a single one? I will sit down. I am sitting down.');
  await say(s, 'pell', 'Here. Drover boots. They were in the back, under a label I can no longer read. They fit someone.');
  await s.give(REWARDS_X1.pell_crates.item, REWARDS_X1.pell_crates.qty);
  await say(s, 'pell', 'And a stamp for the counter. A tenth off, every item, every day. It said STAMP. I am choosing to believe it.');
  await say(s, 'pell', "I wrote your names on the crate lid, in case they fade. In pencil. Twice.");
  await s.setFlag('pell_stamp');
  await s.setFlag('crates_done');
  await s.give('exp', exp('pell_crates'));
}

// ================================================================================================
// Four Rolls for the Miller (the Millrace, the Culvert, the mill)
// ================================================================================================

// 25. bakery, Hal's talk entry (after hal_returned and the Archivore). 6 boxes. Starts Four Rolls.
async function mill_start(s) {
  await say(s, 'hal', 'The mill has been quiet a month. The wheel jammed the night the bell rang. I was standing next to it.');
  await say(s, 'hal', 'I stayed. Set out flour every morning. Four sacks, four bowls. For a brother. I could not tell you which brother.');
  await say(s, 'hal', "Now I can. Oren's rolls are too sweet and I have never been happier to complain.");
  await say(s, 'hal', 'Thing is, I cannot walk back in alone. Not yet. Ferrick keeps the weir. Ask him about the pin.');
  await say(s, 'oren', 'I will go with him. After he says he will go. So, in a month.');
  await say(s, 'mira', 'We will see to it, Hal. Four rolls on the sill, and a wheel that turns.');
  await s.setFlag('mill_started');
}

// 26. x1_millrace, on enter. 3 boxes. Sets millrace_arrived.
async function millrace_arrival(s) {
  await s.camera.panTo('wheel', 50);
  await narrate(s, 'The river runs low and bright. Birds, flour on the wind, and the slow tick of a wheel that is not turning.');
  await s.camera.follow('hero');
  await say(s, 'bram', 'A mill, a weir, a cat on a cart. I could live here.');
  await say(s, 'mira', 'The weir is dry. Somebody should ask why a river would leave.');
  await s.setFlag('millrace_arrived');
}

// 27. x1_millrace, Ferrick's talk entry (first time). 6 boxes. Sets ferrick_met.
async function ferrick_meet(s) {
  await s.face('ferrick', 'hero');
  await say(s, 'ferrick', 'Weir broke. Told nobody. Nobody came. That is how I knew.');
  await say(s, 'ferrick', 'The chain on the Drovers\' Road was mine. Took it down when the bell rang. Could not say why I put it up.');
  if (await s.hasFlag('mill_started')) await say(s, 'mira', "Hal's wheel is stopped. He said a pin dropped.");
  else await say(s, 'mira', 'The mill wheel is stopped. Do you know why?');
  await say(s, 'ferrick', 'Pin went through the grating. Into the culvert, under the pond. Something lives down there. It grinds like a mill.');
  await say(s, 'bram', 'We will go down and fetch it.');
  await say(s, 'ferrick', 'Bring it to the wheel. I will watch the weir. Nobody else will.');
  await s.setFlag('ferrick_met');
}

// 28. x1_culvert, on enter. 2 boxes. Sets culvert_entered.
async function culvert_entry(s) {
  await narrate(s, 'Wet red brick, rusted grating, and the slow drip of a pond that left. Somewhere deeper, stone grinds on stone.');
  await say(s, 'bram', 'I hear a mill. In a drain. That is not a good sentence.');
  await s.setFlag('culvert_entered');
}

// 29. x1_culvert, step row before the Sluice Chamber. Boss intro: 3 boxes (1 on a retry), then the battle and golem_after.
async function golem_intro(s) {
  if (await s.hasFlag('millstone_golem_defeated')) { await golem_after(s); return; }
  const met = await s.hasFlag('golem_met');
  await s.music(null);
  await s.camera.panTo('golem_spot', 40);
  await s.wait(30);
  if (met) {
    await narrate(s, 'The grindstone turns on the broken sluice gate. It has not noticed it was gone.');
  } else {
    await narrate(s, 'A grindstone as tall as a door sits on the broken sluice gate, turning slowly on nothing.');
    await say(s, 'mira', 'A millstone with legs. It is grinding the gate to flour. Slowly. Patiently.');
    await say(s, 'bram', 'Running alone for a month. I know that feeling. Let us end its shift.');
  }
  await s.setFlag('golem_met');
  await s.title('MILLSTONE GOLEM', { sub: 'The Wheel That Ran Alone', frames: 100 });
  await s.shake(3, 24);
  await s.flash('#ffffff', 8);
  await s.music('boss_millstone');
  const result = await s.battle('millstone_golem', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await golem_after(s);
  await s.music('mystery');
}

// 30. x1_culvert, after the battle (chained; also a scene of its own for a reload). 4 boxes. Sets golem_after_done.
async function golem_after(s) {
  if (await s.hasFlag('golem_after_done')) return;
  await s.music(null);
  await s.camera.panTo('golem_spot', 20);
  await s.sfx('page_flutter');
  await s.despawn('millstone_golem');
  await narrate(s, 'The grindstone stops. For the first time in a month the drain is silent. Then a small sound: water.');
  await say(s, 'mira', 'The wheel was not the only thing that wanted turning off.');
  await say(s, 'bram', 'That is the pond coming back. Slowly. Like a rumor.');
  if (await s.hasFlag('pin_found')) await say(s, 'mira', 'The pin is in our pocket, and Hal\'s wheel is waiting.');
  else await say(s, 'mira', 'The pin is in a chest in the pump room, behind the old pipes. Then the wheel.');
  await s.setFlag('golem_after_done');
  await s.camera.follow('hero');
  await s.music('mystery');
}

// 31. x1_millrace, the wheel object (with the pin). 4 boxes; chains into mill_done (10 boxes). Sets mill_turning.
async function pin_place(s) {
  const ready = (await s.hasFlag('pin_found')) && (await s.hasFlag('mill_started'));
  if (!ready) {
    await narrate(s, 'The wheel\'s hub has an empty socket, a forearm wide. Whatever fits it is not in your pack yet.');
    return;
  }
  await s.camera.panTo('wheel', 40);
  await s.walk('hero', 'pin_socket');
  await narrate(s, "The wheel's hub has an empty socket, a forearm wide. The pin slides home like a key into a lock that missed it.");
  await s.take('millstone_pin');
  await say(s, 'bram', 'Right. Together. Push when I say push.');
  await s.sfx('wheel_groan');
  await s.shake(2, 40);
  await narrate(s, '{hero} and Bram lean on the spokes. The wheel groans, shudders, and begins to turn.');
  await say(s, 'mira', 'Listen. Water. The weir is filling.');
  await s.setFlag('mill_turning');
  await mill_done(s);
}

// 32. x1_millrace, chained from pin_place (also a scene of its own for a reload). 10 boxes. Hal and Oren walk up the road.
// Gives 8 honey_roll, 200 gold, 12 EXP. Sets mill_done.
async function mill_done(s) {
  if (await s.hasFlag('mill_done')) return;
  await s.spawn('hal_m', { sprite: 'npc_farmer', name: 'Hal', at: 'valley_gate', dir: 'down' });
  await s.spawn('oren_m', { sprite: 'npc_baker', name: 'Oren', at: 'valley_gate', dir: 'down' });
  await s.camera.panTo('valley_gate', 40);
  await narrate(s, 'Down the road come two men. One carries a basket. The other carries a grudge, mostly against his own feet.');
  await Promise.all([s.walk('hal_m', 'mill_door'), s.walk('oren_m', 'mill_door')]);
  await s.camera.panTo('mill_door', 30);
  await say(s, 'oren_m', 'He would not come alone. I said I would carry the rolls. He said that was not a reason. I said it was a very good reason.');
  await say(s, 'hal_m', 'It is turning.');
  await say(s, 'hal_m', 'A month beside that wheel, and I heard nothing. Like a man at the bottom of a well.');
  await narrate(s, 'Hal pushes the door. Inside: four bowls, four sacks of flour, laid out with great care. Oren sets four rolls on the sill.');
  await say(s, 'hal_m', 'Four sacks. For a baker I could not name.');
  await say(s, 'oren_m', 'Four rolls. For a miller I could not name.');
  await say(s, 'hal_m', 'We are idiots.');
  await say(s, 'oren_m', 'We are brothers. It is the same thing, with better habits. Habit is a stubborn kind of love.');
  await narrate(s, 'The wheel turns. Flour dusts the doorway. For once, nobody forgets anything.');
  await s.despawn('hal_m');
  await s.despawn('oren_m');
  await s.camera.follow('hero');
  await s.setFlag('mill_done');
  await s.give(REWARDS_X1.four_rolls.item, REWARDS_X1.four_rolls.qty);
  await s.give('gold', REWARDS_X1.four_rolls.gold);
  await s.give('exp', exp('four_rolls'));
}

// ================================================================================================
// Things Not To Forget (the library and three places)
// ================================================================================================

// 33. library, Iris's talk entry (after the Archivore, with Mira). 4 boxes. Starts Things Not To Forget.
async function list_start(s) {
  await say(s, 'iris', 'Mira. Come here. My list is complete, and I do not trust a complete list.');
  await say(s, 'iris', "Three entries more: a shepherd's counting rhyme, the oldest name in a miller's ledger, a hermit's song for his posts.");
  await say(s, 'mira', 'From Thornfold, the mill and the moor. In their own words, not ours.');
  await say(s, 'iris', 'In their own voices. Paper keeps what it is given, if it is given early.');
  await s.setFlag('list_started');
}

// 34. x1_downs, Brindle's talk entry. 2 boxes. Sets list_rhyme.
async function list_rhyme(s) {
  await say(s, 'brindle', "My counting rhyme? Older than the fold. 'Count them out and count them in, count them till the stars begin.'");
  await say(s, 'brindle', "'Twelve to bed and twelve to rise.' Say it with me, if you like. Everyone does, eventually.");
  await s.setFlag('list_rhyme');
}

// 35. x1_mill, the mill ledger (book object). 2 boxes. Sets list_ledger.
async function list_ledger(s) {
  if (!(await s.hasFlag('list_started')) || (await s.hasFlag('list_ledger'))) {
    await narrate(s, 'Page one of the ledger holds a single name: Ebba Corley. One sack of barley. Paid in eggs.');
    return;
  }
  await narrate(s, "Thirty years of customers in Hal's blunt hand. Page one holds a single name: Ebba Corley. One sack of barley. Paid in eggs.");
  await say(s, 'mira', 'The oldest name in the book, and it is paid. Every line is paid. Not one is crossed out.');
  await s.setFlag('list_ledger');
}

// 36. x1_highmoor, Odo's talk entry. 2 boxes. Sets list_song.
async function list_song(s) {
  await say(s, 'odo', `Aye, I sing it. Not for anyone. For the posts. '${NAMES.song.firstLine} ${NAMES.song.secondLine}'`);
  await say(s, 'odo', 'Nine verses, one a post. The last is a single word. You read it on the ninth post. I will not spoil it.');
  await s.setFlag('list_song');
}

// 37. library, Iris's talk entry with all three. 4 boxes. Gives 3 ethers and 200 gold, 8 EXP.
async function list_done(s) {
  await say(s, 'iris', `A rhyme, a name paid in eggs, and a song called ${NAMES.song.title}. Pen, please.`);
  await say(s, 'iris', 'Those go on the list in my best hand. The last line is Mira\'s. Hers is steadier than mine now.');
  await say(s, 'mira', 'Iris. I wrote Iris. You keep a list of everything, and you were the one thing not on it.');
  await say(s, 'iris', '...Well. That is the first line I did not write myself, and I intend to keep it.');
  await s.give(REWARDS_X1.not_to_forget.item, REWARDS_X1.not_to_forget.qty);
  await s.give('gold', REWARDS_X1.not_to_forget.gold);
  await s.setFlag('list_done');
  await s.give('exp', exp('not_to_forget'));
}

// ================================================================================================
// The High Moor and Larchhill (wild)
// ================================================================================================

// 38. x1_highmoor, on enter. 3 boxes. Sets moor_arrived.
async function moor_arrival(s) {
  await s.camera.panTo('tower', 60);
  await narrate(s, 'The heath rolls on under a bigger sky. Gorse, grey crags, a black tarn. On the skyline, a broken tower.');
  await s.camera.follow('hero');
  await say(s, 'bram', 'Chime posts every fifty paces, the sign says. Follow them or do not.');
  await say(s, 'mira', 'That is the tower we saw from the Downs. It is even taller from here.');
  await s.setFlag('moor_arrived');
}

// 39. x1_highmoor, Odo's talk entry (first time). 5 boxes. Sets odo_met.
async function odo_meet(s) {
  await s.face('odo', 'hero');
  await say(s, 'odo', 'Visitors. Good. I was telling the cairn about you. It said you would be shorter.');
  await say(s, 'odo', 'Odo. Chime keeper. Nine posts, nine words, and I say each one aloud every dawn, in order.');
  await say(s, 'mira', 'Why aloud?');
  await say(s, 'odo', 'Nine. I count them. They count me. A post that is not said goes quiet.');
  await say(s, 'odo', 'Walk the road if you like. The ninth post says the last word. I will not spoil it.');
  await s.setFlag('odo_met');
}

// 40. x1_larchhill, on enter. 3 boxes. Sets larchhill_arrived.
async function larchhill_arrival(s) {
  await s.camera.panTo('windmill', 60);
  await narrate(s, 'Terraces climb the hill in stone steps, orchard rows on each, white hives like loaves. Everything hums.');
  await s.camera.follow('hero');
  await say(s, 'bram', 'That hum. Is that the hill, or is that bees?');
  await say(s, 'mira', 'Both. Forty hives at the least. Walk slowly and they will mind their business.');
  await s.setFlag('larchhill_arrived');
}

// 41. x1_larchhill, Yarrow's talk entry (first time). 4 boxes. Sets yarrow_met (the hay chute opens).
async function yarrow_meet(s) {
  await s.face('yarrow', 'hero');
  await say(s, 'yarrow', 'Forty hives. Forty-one. Sorry. Say it again, I was counting.');
  await say(s, 'yarrow', "The honey in Hal's rolls is mine, if that is a recommendation. Too sweet, he says. He asks for another jar.");
  await say(s, 'yarrow', 'My children use the hay chute to get to the river. One way, fast, no brakes. I tell them do not. They hear do.');
  await say(s, 'bram', 'A hay chute. I am going to need to see this chute.');
  await s.setFlag('yarrow_met');
}

// 42. x1_larchhill, the windmill ladder. 3 boxes the first time, 1 after. Sets windmill_seen.
async function windmill_view(s) {
  const seen = await s.hasFlag('windmill_seen');
  await s.sfx('windmill_creak');
  await s.camera.panTo('windmill', 50);
  await s.camera.panTo('north_gate', 90);
  await s.camera.panTo('east_gate', 90);
  if (seen) {
    await narrate(s, 'The whole hill, from the top rung. The sails creak. Somebody below is talking to a hive.');
  } else {
    await narrate(s, 'From the top rung the whole hillside lies open: terrace on terrace, the long aqueduct, the road to the river.');
    await say(s, 'mira', 'Beyond the ridge there is the valley, and the Archive\'s willow, and the tower with its empty hook. All of it, small and kept.');
    await say(s, 'bram', 'Home is smaller than I thought. Home is also bigger. Both.');
  }
  await s.camera.follow('hero');
  await s.setFlag('windmill_seen');
}

// ------------------------------------------------------------------------------------------------
// Registry. SCENE_CONDITIONS as in ep1.js / ep2.js / ep3.js; every flag is declared in flags.js. SCENE_MAP is the map each
// scene belongs to (for the staging doc and the tests); the region is derived from it.
// ------------------------------------------------------------------------------------------------
const ALL5 = ['stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found'];
const STARS = ['star_1_read', 'star_2_read', 'star_3_read'];
const CRATES = ['crate_1_done', 'crate_2_done', 'crate_3_done'];

export const SCENE_CONDITIONS = {
  downs_arrival: { ifNot: 'downs_arrived' },
  thornfold_arrival: { ifNot: 'thornfold_arrived' },
  brindle_strays: { ifNot: 'strays_started' },
  stray_found_1: { if: 'strays_started', ifNot: 'stray_1_found' },
  stray_found_2: { if: 'strays_started', ifNot: 'stray_2_found' },
  stray_found_3: { if: 'strays_started', ifNot: 'stray_3_found' },
  stray_found_4: { if: 'strays_started', ifNot: 'stray_4_found' },
  stray_found_5: { if: 'strays_started', ifNot: 'stray_5_found' },
  strays_done: { if: ['strays_started', ...ALL5], ifNot: 'strays_done' },
  stones_arrival: { ifNot: 'stones_seen' },
  rollcall_start: { if: 'stones_seen', ifNot: 'rollcall_started' },
  iris_roll: { if: 'rollcall_started', ifNot: 'roll_found' },
  quill_copy: { if: 'rollcall_started', ifNot: 'copy_found' },
  rollcall_stones: {},
  barrow_entry: { ifNot: 'barrow_entered' },
  reeve_intro: { ifNot: 'barrow_reeve_defeated' },
  reeve_after: { if: 'barrow_reeve_defeated', ifNot: 'reeve_after_done' },
  rollcall_done: { if: 'reeve_named', ifNot: 'rollcall_done' },
  cleft_hint: { if: 'lantern_get', ifNot: 'cleft_seen' },
  terrace_arrival: { ifNot: 'terrace_arrived' },
  hesper_meet: { ifNot: 'stars_started' },
  star_read_1: { if: 'stars_started' },
  star_read_2: { if: 'stars_started' },
  star_read_3: { if: 'stars_started' },
  orrery_align: { if: ['stars_started', ...STARS], ifNot: 'orrery_aligned' },
  cellar_entry: { ifNot: 'cellar_entered' },
  cellar_note: {},
  crates_start: { if: 'archivore_defeated', ifNot: 'crates_started' },
  crate_delivered_1: { if: 'crates_started', ifNot: 'crate_1_done' },
  crate_delivered_2: { if: 'crates_started', ifNot: 'crate_2_done' },
  crate_delivered_3: { if: 'crates_started', ifNot: 'crate_3_done' },
  crates_done: { if: ['crates_started', ...CRATES], ifNot: 'crates_done' },
  mill_start: { if: ['archivore_defeated', 'hal_returned'], ifNot: 'mill_started' },
  millrace_arrival: { ifNot: 'millrace_arrived' },
  ferrick_meet: { ifNot: 'ferrick_met' },
  culvert_entry: { ifNot: 'culvert_entered' },
  golem_intro: { ifNot: 'millstone_golem_defeated' },
  golem_after: { if: 'millstone_golem_defeated', ifNot: 'golem_after_done' },
  pin_place: { ifNot: 'mill_turning' },
  mill_done: { if: 'mill_turning', ifNot: 'mill_done' },
  list_start: { if: ['archivore_defeated', 'mira_joined'], ifNot: 'list_started' },
  list_rhyme: { if: 'list_started', ifNot: 'list_rhyme' },
  list_ledger: {},
  list_song: { if: 'list_started', ifNot: 'list_song' },
  list_done: { if: ['list_started', 'list_rhyme', 'list_ledger', 'list_song'], ifNot: 'list_done' },
  moor_arrival: { ifNot: 'moor_arrived' },
  odo_meet: { ifNot: 'odo_met' },
  larchhill_arrival: { ifNot: 'larchhill_arrived' },
  yarrow_meet: { ifNot: 'yarrow_met' },
  windmill_view: {},
};

/** The raw scene functions (no guard, no input lock), for tests that count boxes and for the chains. */
export const rawScenes = {
  downs_arrival, thornfold_arrival, brindle_strays,
  stray_found_1: strayFound(1), stray_found_2: strayFound(2), stray_found_3: strayFound(3), stray_found_4: strayFound(4), stray_found_5: strayFound(5),
  strays_done, stones_arrival, rollcall_start, iris_roll, quill_copy, rollcall_stones,
  barrow_entry, reeve_intro, reeve_after, rollcall_done,
  cleft_hint, terrace_arrival, hesper_meet,
  star_read_1: starRead(1), star_read_2: starRead(2), star_read_3: starRead(3),
  orrery_align, cellar_entry, cellar_note,
  crates_start, crate_delivered_1: crateDelivered(1), crate_delivered_2: crateDelivered(2), crate_delivered_3: crateDelivered(3), crates_done,
  mill_start, millrace_arrival, ferrick_meet, culvert_entry, golem_intro, golem_after, pin_place, mill_done,
  list_start, list_rhyme, list_ledger, list_song, list_done,
  moor_arrival, odo_meet, larchhill_arrival, yarrow_meet, windmill_view,
};

/** Scene id -> the map it plays on (plan 2.6). */
export const SCENE_MAP = {
  downs_arrival: 'x1_downs', thornfold_arrival: 'x1_downs', brindle_strays: 'x1_downs',
  stray_found_1: 'x1_downs', stray_found_2: 'x1_downs', stray_found_3: 'x1_downs', stray_found_4: 'valley', stray_found_5: 'x1_downs',
  strays_done: 'x1_downs', stones_arrival: 'x1_downs', rollcall_start: 'x1_downs', iris_roll: 'library', quill_copy: 'valley',
  rollcall_stones: 'x1_downs', barrow_entry: 'x1_barrow', reeve_intro: 'x1_barrow', reeve_after: 'x1_barrow', rollcall_done: 'x1_downs',
  cleft_hint: 'valley', terrace_arrival: 'x1_terrace', hesper_meet: 'x1_orrery',
  star_read_1: 'valley', star_read_2: 'valley', star_read_3: 'x1_highmoor',
  orrery_align: 'x1_orrery', cellar_entry: 'x1_cellar', cellar_note: 'x1_cellar',
  crates_start: 'item_shop', crate_delivered_1: 'x1_loomhouse', crate_delivered_2: 'x1_larchhill', crate_delivered_3: 'x1_millrace', crates_done: 'item_shop',
  mill_start: 'bakery', millrace_arrival: 'x1_millrace', ferrick_meet: 'x1_millrace', culvert_entry: 'x1_culvert',
  golem_intro: 'x1_culvert', golem_after: 'x1_culvert', pin_place: 'x1_millrace', mill_done: 'x1_millrace',
  list_start: 'library', list_rhyme: 'x1_downs', list_ledger: 'x1_mill', list_song: 'x1_highmoor', list_done: 'library',
  moor_arrival: 'x1_highmoor', odo_meet: 'x1_highmoor', larchhill_arrival: 'x1_larchhill', yarrow_meet: 'x1_larchhill', windmill_view: 'x1_larchhill',
};

/** The region key (live.js) a scene needs on: its map's, except the quest scenes that play in Willowmere or the valley. */
const REGION_OVERRIDE = {
  iris_roll: 'west', quill_copy: 'west', stray_found_4: 'west', crates_start: 'west', crates_done: 'west',
  cleft_hint: 'north', star_read_1: 'north', star_read_2: 'north', star_read_3: 'wild',
  mill_start: 'south', list_start: 'west', list_done: 'west', list_rhyme: 'west', list_ledger: 'south', list_song: 'wild',
};
export const SCENE_REGION = Object.fromEntries(Object.keys(rawScenes).map((id) => [id, REGION_OVERRIDE[id] || X1_MAP_REGION[SCENE_MAP[id]]]));

/** Box budgets (plan 2.6): the listed count per scene design; chains are measured together. */
export const BOX_BUDGET = {
  default: 12,
  downs_arrival: 3, thornfold_arrival: 4, brindle_strays: 5, stray_found_1: 1, stray_found_2: 1, stray_found_3: 1, stray_found_4: 1, stray_found_5: 1,
  strays_done: 5, stones_arrival: 3, rollcall_start: 5, iris_roll: 4, quill_copy: 3, rollcall_stones: 11, barrow_entry: 3,
  reeve_intro: 8, reeve_after: 5, rollcall_done: 3, cleft_hint: 2, terrace_arrival: 3, hesper_meet: 6,
  star_read_1: 2, star_read_2: 2, star_read_3: 2, orrery_align: 8, cellar_entry: 3, cellar_note: 6,
  crates_start: 4, crate_delivered_1: 2, crate_delivered_2: 2, crate_delivered_3: 2, crates_done: 4,
  mill_start: 6, millrace_arrival: 3, ferrick_meet: 6, culvert_entry: 2, golem_intro: 7, golem_after: 4, pin_place: 14, mill_done: 10,
  list_start: 4, list_rhyme: 2, list_ledger: 2, list_song: 2, list_done: 4,
  moor_arrival: 3, odo_meet: 5, larchhill_arrival: 3, yarrow_meet: 4, windmill_view: 3,
};
/** Chains: the first scene calls the second after its own boxes (reeve_intro -> reeve_after, golem_intro -> golem_after, pin_place -> mill_done). */
export const CHAINS = { reeve_intro: 'reeve_after', golem_intro: 'golem_after', pin_place: 'mill_done' };
/** The quest closing scenes and their EXP (plan 5.8): the test reads the give('exp', n) calls against this. */
export const EXP_SCENES = { strays_done: 8, rollcall_done: 12, cellar_note: 8, crates_done: 6, mill_done: 12, list_done: 8 };

export const scenes = Object.fromEntries(Object.entries(rawScenes).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id], SCENE_REGION[id])]));

export function register() {
  // Scene guards are also given to registerStory so sceneAllowed() (the field's banner hold) knows them.
  if (typeof STORY.registerStory === 'function') STORY.registerStory({ scenes, lines: {}, conditions: SCENE_CONDITIONS });
  else Object.assign(STORY.SCENES, scenes);
}

export default { scenes, register };
