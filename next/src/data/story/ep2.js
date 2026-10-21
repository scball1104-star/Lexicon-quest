// Lexicon Quest NEXT, Episode 2: "The Town Without a Name".
// Every scripted scene, plus inspect text for signs, plaques, mirrors and props.
//
// Scenes use ONLY the cutscene API (DESIGN 5.4; signatures in docs/story/STAGING.md section 1). Places and props
// are map mark / event / actor names, never tile coordinates. Staging for every scene (who stands where, props,
// camera, music, triggers) is in docs/story/STAGING_EP2.md. Beat sheet and canon: docs/story/EPISODE2.md.
//
// Writing rules: one idea per box, at most 3 lines of 42 characters, no em dashes, {hero} = player name.
// Scene ids and line ids never repeat an Episode 1 id (qa/content/ep2.test.mjs checks it).

import { REWARDS_EP2 } from '../quests.js';
import { CREDITS_EP2 } from '../text.js';

// Speakers with 48x48 portraits. Episode 2 portraits (elian, anwen, tovin, lena, aurel, nameless_king) come
// from E2-sprites; a missing portrait simply draws no portrait (ui/window.js). Vex uses `silver_rogue`.
const PORTRAIT = {
  hero: 'hero', mira: 'mira', bram: 'bram', mael: 'mael', tess: 'tess', iris: 'iris', hazel: 'hazel',
  garrick_x: 'garrick', elian: 'elian', elian_f: 'elian', elian_k: 'elian', elian_g: 'elian',
  anwen: 'anwen', anwen_g: 'anwen', tovin: 'tovin', tovin_c: 'tovin', lena: 'lena',
  aurel: 'aurel', aurel_k: 'aurel', aurel_g: 'aurel', nameless_king: 'nameless_king', vex: 'silver_rogue',
};

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

// Same wrapper as ep1.js: a scene runs only when its SCENE_CONDITIONS hold, with input locked for its whole run.
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
async function allowed(s, cond) {
  if (!cond) return true;
  for (const f of toList(cond.if)) if (!(await s.hasFlag(f))) return false;
  for (const f of toList(cond.ifNot)) if (await s.hasFlag(f)) return false;
  return true;
}
const cut = (fn, cond) => async (s) => {
  if (!(await allowed(s, cond))) return;
  await s.lockInput();
  try { await fn(s); } finally { await s.unlockInput(); }
};

// ================================================================================================
// Act I: Willowmere, the morning after
// ================================================================================================

// 1. hero_home, on enter after the Episode 1 credits. Mira and Bram are in the party (followers), so they are
// in the house: the bible's "at the well" becomes "at my table". Sets ep2_morning_done.
async function ep2_morning(s) {
  await s.fade('in', 60);
  await s.emote('hero', 'zzz');
  await s.wait(30);
  await s.walk('hazel', 'bedside');
  await s.face('hazel', 'hero');
  await say(s, 'hazel', 'You heard it too. Thirteen.');
  await s.walk('hero', ['down']);
  await s.face('hero', 'hazel');
  await say(s, 'hazel', 'I lay there after, counting the ceiling. Twelve beams. I checked. Twice.');
  await say(s, 'hazel', "Mira has been at my table since before the birds, reading Mael's maps. Bram packed twice.");
  await say(s, 'hazel', 'Once for him, once for you.');
  await say(s, 'bram', "You didn't pack. I checked that too.");
  await say(s, 'mira', 'Every map of the east stops at the river. As if the mapmaker forgot the next stroke.');
  await say(s, 'hazel', 'Mael wants the three of you at the well. Take these, for the road.');
  await s.give(REWARDS_EP2.hazel.item, REWARDS_EP2.hazel.qty);
  await say(s, 'hazel', 'Boots. Two. Fingers. Ten. I am counting in advance this time, so you know what I expect back.');
  const c = await s.choice(["I'll come back.", "Don't wait up."]);
  if (c === 0) await say(s, 'hazel', 'I know you will. You just always take the long way.');
  else await say(s, 'hazel', '"Don\'t wait up." Listen to it. As if I have ever done anything else.');
  await say(s, 'hazel', "I'll wait up. That's not a choice. That's what I do.");
  await s.setFlag('ep2_morning_done');
}

// 2. willowmere, Mael's talk entry once ep1_complete and not ep2_started. Gives mael_letter. Sets ep2_started and
// garrick_at_ford (Garrick is at the ford until garrick_crossing clears it).
async function ep2_mael(s) {
  await s.face('mael', 'hero');
  await say(s, 'mael', 'All three of you, and all three names still on my page. I checked the Register before my tea.');
  await say(s, 'mael', '{hero}. Yours is still faint. No fainter. I will take "no fainter" this morning.');
  await say(s, 'mael', 'Every book I own about the Hollow stops in the same place. As if the writer forgot the next word.');
  await say(s, 'mael', 'So I wrote a letter of introduction, to whoever keeps the names in the town east of the river.');
  await narrate(s, 'Mael holds up the envelope. Where the name of the town should be, there is a blank line.');
  await say(s, 'mael', 'I tried to write it three times. The pen would not go. It stopped, like a horse at a bad bridge.');
  await s.give('mael_letter');
  await say(s, 'mael', "If anyone in the Hollow can say {hero}'s name better than I can, bring me back how.");
  await say(s, 'bram', "My father left before dawn. There's a note on the forge. GONE TO THE FORD. That's the whole note.");
  await say(s, 'mael', 'The east ford washed out in the spring flood. If Garrick has gone to it, he means to fix it.');
  await say(s, 'mira', "The list had a place scratched out. East. That's where we go.");
  const c = await s.choice(['East, then.', 'What is the Hollow?']);
  if (c === 1) {
    await say(s, 'mael', 'A town no map remembers. Travelers come back from the east road and cannot say where they slept.');
    await say(s, 'mael', 'They remember the people. Kind, they say. They simply cannot remember the place.');
  }
  await say(s, 'mael', 'The fork in the valley, then the east branch to the ford. Go gently. And come back.');
  await s.setFlag('ep2_started');
  await s.setFlag('garrick_at_ford');
}

// 3a. library, Iris's talk entry once ep1_complete. Optional. Sets iris_farewell_done.
async function iris_farewell(s) {
  await say(s, 'iris', 'Mira. Before you go. Look.');
  await narrate(s, 'Iris turns her list around. THINGS NOT TO FORGET. Above everything else, in fresh ink: "Mira. Come home."');
  await say(s, 'mira', 'You put me first.');
  await say(s, 'iris', 'Alphabetical order was never my strength.');
  await s.emote('mira', '...');
  await say(s, 'mira', "I'll be back before anything is overdue.");
  await say(s, 'iris', 'See that you are. I do not fine family. I simply stare at them until they apologize.');
  await s.setFlag('iris_farewell_done');
}

// 3b. willowmere, Tess's talk entry. Starts The Last Route, and later delivers the satchel (gives courier_knot).
async function tess_last_route(s) {
  const started = await s.hasFlag('last_route_started');
  const found = await s.hasFlag('satchel_found');
  if (!started && !found) {
    await say(s, 'tess', "{hero}. You're going east. Everyone knows. Hob told the whole inn before his own breakfast.");
    await say(s, 'tess', 'My father carried the east post before he ever went north. His route book never came home.');
    await say(s, 'tess', 'If the Hollow has a lost-property shelf, it has his satchel. Couriers can feel these things.');
    await say(s, 'bram', 'Can they?');
    await say(s, 'tess', 'No. But I can hope like a professional.');
    await s.setFlag('last_route_started');
    return;
  }
  if (!found) {
    await say(s, 'tess', 'Any luck east? A satchel, red post marks. It will smell of rain and pencil.');
    return;
  }
  await say(s, 'tess', 'That satchel. Those are our post marks. Willowmere, in red wax, the way we did it when I was small.');
  await narrate(s, 'Tess opens the route book to its last page. Her finger follows a line of crossed sevens.');
  await narrate(s, '"The Hollow." The rest of the name is smudged. Below it: "Then north, by the White Road."');
  await say(s, 'tess', 'North. He went north. That is further than nobody.');
  await s.take('courier_satchel');
  await say(s, 'tess', "This was his. A courier's knot never comes undone, unless you want it to. Keep it.");
  await s.give(REWARDS_EP2.last_route.item, REWARDS_EP2.last_route.qty);
  await say(s, 'tess', 'The White Road. I have a road now. Thank you, {hero}.');
  await s.setFlag('last_route_done');
}

// 4. valley, step trigger crossing_trig two tiles west of the ford. Garrick and Hal are spawned at the ford.
// Sets crossing_done and clears garrick_at_ford (Garrick is back in his smithy afterwards).
async function garrick_crossing(s) {
  await s.spawn('garrick_x', { sprite: 'npc_smith', name: 'Garrick', at: 'crossing_garrick', dir: 'right' });
  await s.spawn('hal_x', { sprite: 'npc_farmer', name: 'Hal', at: 'crossing_hal', dir: 'right' });
  await s.camera.panTo('ford', 40);
  await narrate(s, 'The ford the spring flood took is planked across. Two men are hammering down the last board.');
  await say(s, 'hal_x', "Seventy years old, and he won't let me carry the heavy end.");
  await say(s, 'garrick_x', 'Seventy-one.');
  await s.emote('hal_x', 'anger');
  await s.camera.follow('hero');
  await s.walk('hero', 'garrick_x');
  await s.face('garrick_x', 'hero');
  await say(s, 'bram', 'You went out before dawn and left a note four words long.');
  await say(s, 'garrick_x', 'Five. Counting the G.');
  await say(s, 'garrick_x', "Couldn't have you three wading. River's cold this time of year. Any time of year.");
  await s.face('garrick_x', 'bram');
  await say(s, 'garrick_x', "Toll's one word.");
  await say(s, 'bram', 'Garrick.');
  await say(s, 'garrick_x', 'Paid.');
  await s.emote('bram', 'heart');
  await narrate(s, 'Garrick takes out a knife and cuts letters into the rail, slow and deep, the way he does everything.');
  await s.camera.panTo('garrick_rail', 30);
  await narrate(s, "GARRICK'S CROSSING. SAY IT WHEN YOU CROSS.");
  await say(s, 'mira', 'Is that a sign or an instruction?');
  await say(s, 'bram', 'In this family, both.');
  await s.camera.follow('hero');
  await say(s, 'hal_x', 'Oren sent rolls. They are in your pack, Bram. Both packs. Go on, before they go stale.');
  await all(s.walk('garrick_x', ['left', 'left', 'left']), s.walk('hal_x', ['left', 'left', 'left']));
  await s.despawn('garrick_x');
  await s.despawn('hal_x');
  await s.setFlag('garrick_at_ford', false);
  await s.setFlag('crossing_done');
}

// ================================================================================================
// Act II: The Fading Road (east_road)
// ================================================================================================

async function east_road_arrival(s) {
  await narrate(s, 'East of the crossing the paving thins to ruts, and the ruts to grass, as if the road were forgetting itself.');
  await s.camera.panTo('east_signpost', 40);
  await narrate(s, 'A signpost leans at the bend. Both of its arms are blank.');
  await say(s, 'mira', 'Stage three. Writing first, then memory, then the thing itself. Roads forget where they go.');
  await say(s, 'bram', 'Then we remind it. Right. One foot, then the other.');
  await s.camera.follow('hero');
  await s.setFlag('east_road_arrived');
}

// The one teaching fight of the episode (Reflect). Step trigger column first_fight_trig; the group e_road_mixed
// (a chase enemy at the bend) cuts the road. Unavoidable, no signage. A loss sets nothing.
async function east_first_fight(s) {
  await s.camera.panTo('e_road_mixed', 40);
  await all(s.emote('bram', '!'), s.emote('mira', '!'));
  await s.walk('e_road_mixed', 'hero', { speed: 'run' });
  await s.camera.follow('hero');
  await say(s, 'bram', 'A wolf, and something wearing a mirror.');
  await say(s, 'mira', 'Its shell is glittering. Careful what you throw at it.');
  const result = await s.battle('road_mixed', { canFlee: false });
  if (result !== 'win') return;
  await s.despawn('e_road_mixed');
  await say(s, 'mira', 'It threw my spell straight back at me.');
  await say(s, 'bram', 'Shiny ones do. Crack the shell, then cast.');
  await say(s, 'mira', 'Axe first, then magic. Noted.');
  await s.setFlag('east_first_fight_done');
}

// Object old_milestone. The hidden-versus-taken lesson: the Lantern finds nothing. Commentary once.
async function old_milestone(s) {
  await narrate(s, 'A milestone, worn soft by passing hands. One word is left on it: HOLLOW.');
  await narrate(s, 'The rest is not faded. The stone is simply smooth, as if nothing was ever cut there.');
  if (await s.hasFlag('saw_old_milestone')) return;
  await s.sfx('lantern_reveal');
  await narrate(s, 'Mira raises the Lantern. Green light washes over the stone, and nothing rises to meet it.');
  await say(s, 'mira', "The Lantern shows what was hidden. This wasn't hidden. It was taken.");
  await say(s, 'bram', 'Taken where?');
  await say(s, 'mira', 'East. Everything out here points east.');
  await s.setFlag('saw_old_milestone');
}

// Step trigger at fog_start, the west edge of the mist band. Sets saw_cairns.
async function fading_stretch(s) {
  await s.camera.panTo('cairn_first', 40);
  await narrate(s, 'Mist rolls up from the river over the grass, and the road is gone. Stacked stones stand where it was.');
  await say(s, 'mira', 'Cairns. Somebody stacked these so the road would remember where it goes.');
  await say(s, 'bram', 'Somebody with a lot of time and a good back.');
  await say(s, 'mira', 'A road is harder to lose while someone walks it. Stay where the stones are.');
  await s.camera.follow('hero');
  await s.setFlag('saw_cairns');
}

// Step trigger at fog_return (where the fog doors land a wanderer). Once. Sets fog_looped.
async function fog_loop(s) {
  await s.emote('mira', '?');
  await say(s, 'mira', "We've passed this one. Eleven pebbles. I counted.");
  await say(s, 'bram', 'Stay on the stones.');
  await s.setFlag('fog_looped');
}

// Campfire object waystation_fire (safe, rest): the field runs the rest flow afterwards, so this never heals.
// First visit: one choice of three, then the rest flows. Later visits: one box.
async function waystation_rest(s) {
  if (await s.hasFlag('waystation_rested')) {
    await say(s, 'bram', "Fire's still going. Penny keeps it fed. Sit, {hero}. The mist isn't going anywhere.");
    return;
  }
  await all(s.emote('bram', 'music'), s.emote('mira', '...'));
  await narrate(s, 'A ruined toll house, a blank toll board, and a fire someone keeps going. The mist keeps back from it.');
  await say(s, 'bram', 'A fire on a road that forgets. Somebody out here is very stubborn. I like them already.');
  const c = await s.choice(['Mira, that tune?', 'Bram, how is Garrick?', 'Just rest']);
  if (c === 0) {
    await s.music('hollow');
    await say(s, 'mira', "You noticed. It's been in my head since the fork. I don't know where I learned it.");
    await say(s, 'mira', 'Three notes, and then it stops. Every time. As if the fourth one is on the other side of a door.');
    await say(s, 'bram', "I don't know it. But I'd like to. Hum it again.");
    await s.music('fading_road');
  } else if (c === 1) {
    await say(s, 'bram', "He said my name forty times at breakfast. I counted. Mira's catching.");
    await say(s, 'bram', "Forty-one, with the one at the door. He doesn't say goodbye. He says Bram. Same thing, with him.");
    await say(s, 'mira', "You're both catching.");
  } else {
    await narrate(s, "Bram is asleep before the fire settles. Mira counts stars until she isn't.");
    await narrate(s, 'You sit up a while. The mist moves around the firelight like something listening.');
  }
  await s.setFlag('waystation_rested');
}

// Step trigger on the rise above the shore. Sets saw_court.
async function mere_view(s) {
  await s.music('mystery');
  await s.camera.panTo('court_far', 60);
  await narrate(s, 'The road tops a rise. Below lies a lake so still it looks painted, and a town asleep on its shore.');
  await narrate(s, 'Across the water stands a palace of glass. Its reflection moves a heartbeat after it does.');
  await s.wait(40);
  await say(s, 'mira', "...I know this. I don't know how I know this.");
  await say(s, 'bram', "Then we'll find out how.");
  await s.camera.follow('hero');
  await s.music('fading_road');
  await s.setFlag('saw_court');
}

// ================================================================================================
// Act III: The Nameless Hollow
// ================================================================================================

// nameless_hollow, on first enter. Nico chalks the gate sign; Corin greets. Sets nh_arrived.
async function nh_arrival(s) {
  await s.music('hollow');
  await s.camera.panTo('gate_sign', 40);
  await narrate(s, 'Silver dusk, though it is not evening. Over the gate the sign is blank, and a boy is chalking a crown on it.');
  await say(s, 'nico', "Every sign gets a crown. That's the rule. I made the rule.");
  await s.face('nico', 'hero');
  await say(s, 'nico', "You've got mud on your boots. Real mud. From somewhere.");
  await s.camera.follow('hero');
  await s.walk('corin', 'hero');
  await s.face('corin', 'hero');
  await say(s, 'corin', 'Welcome to...');
  await s.emote('corin', '...');
  await say(s, 'corin', "Welcome home. That's what we say here. It's easier.");
  await say(s, 'bram', 'Home. Right. Thank you.');
  await narrate(s, 'The square beyond the gate is busy and cheerful. Every shop sign in it is blank.');
  await say(s, 'mira', 'Not faded. Blank. Like the milestone.');
  await say(s, 'corin', "I'm Corin, of the watch. I have stood this watch for a year I cannot name.");
  await say(s, 'corin', 'The mayor will want to see you. He is at the fountain, in the middle of the square. He usually is.');
  await s.setFlag('nh_arrived');
}

// Step ring fountain_trig around the fountain. Faces in the water; Elian. Sets met_elian.
async function fountain_faces(s) {
  await s.walk('hero', 'fountain_view');
  await s.face('hero', 'up');
  await narrate(s, 'The Fountain of Faces. In its still water, three faces look back at you.');
  await s.walk('sava', 'crowd_a');
  await say(s, 'sava', 'You have faces in the water!');
  await s.spawn('nh_crowd_a', { sprite: 'npc_old_woman', name: 'Old Woman', at: 'crowd_b', dir: 'up' });
  await s.spawn('nh_crowd_b', { sprite: 'npc_farmer', name: 'Townsman', at: 'crowd_c', dir: 'up' });
  await s.spawn('nh_crowd_c', { sprite: 'npc_child_b', name: 'Small Girl', at: 'crowd_d', dir: 'up' });
  await all(s.emote('nh_crowd_a', '!'), s.emote('nh_crowd_b', '!'), s.emote('nh_crowd_c', '!'));
  await narrate(s, 'People gather at the rim to look. The water shows the sky behind them, and nothing of them at all.');
  await say(s, 'nh_crowd_c', 'Mama, look. That one has a nose.');
  await say(s, 'nh_crowd_a', 'Hush. Everyone has a nose. Theirs just... shows.');
  await s.music('mystery');
  await say(s, 'bram', '{hero}. Yours is... faint.');
  await narrate(s, 'Your reflection is a smudge on the water, like breath on glass.');
  await say(s, 'mira', 'Like the name.');
  await s.music('hollow');
  await s.spawn('elian_f', { sprite: 'npc_elian', name: 'Elian', at: 'elian_from', dir: 'down' });
  await s.walk('elian_f', 'meet_elian');
  await s.face('elian_f', 'mira');
  await s.wait(40);
  await say(s, 'elian_f', 'Have we met? You stand like someone I used to wait for.');
  await say(s, 'mira', "I... don't think so.");
  await s.face('elian_f', 'hero');
  await say(s, 'elian_f', 'Forgive me. Elian. They made me mayor because I was the only one who kept a ledger.');
  await say(s, 'elian_f', "Come to the hall. You'll want to hear this sitting down.");
  await s.walk('elian_f', 'hall_door');
  await s.despawn('elian_f');
  for (const id of ['nh_crowd_a', 'nh_crowd_b', 'nh_crowd_c']) await s.despawn(id);
  await s.setFlag('met_elian');
}

// nh_hall, step trigger hall_trig two tiles inside the door. The crisis; Mael's letter. Sets heard_crisis.
async function elian_hall(s) {
  await s.walk('hero', 'elian');
  await s.face('elian', 'hero');
  await say(s, 'elian', 'Sit, if you like. The benches remember being sat on, at least.');
  await say(s, 'elian', 'Fifteen years ago this town lost its name overnight. The next morning, nobody had a reflection.');
  await say(s, 'elian', 'Across the mere, the Court of Mirrors shut its doors. Its king has not been seen since.');
  await say(s, 'elian', 'We remember each other. We simply cannot remember where we are.');
  await narrate(s, 'Elian opens his ledger. Page after page of names, the same names, written fresh each morning.');
  await say(s, 'elian', 'Every morning I write every name in town. If a name is going to go, I want to see it leave.');
  await say(s, 'elian', 'Lately our mirrors crack, and every crack takes a memory with it. Last week Fitch forgot how to whistle.');
  await say(s, 'elian', 'And two nights ago, at midnight, Sister Anwen heard a bell across the water. Thirteen strokes.');
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await say(s, 'mira', 'We heard it too. The whole valley heard it.');
  const c = await s.choice(["Give him Mael's letter", 'Ask about the king']);
  if (c === 1) {
    await say(s, 'elian', 'Nobody remembers his face. Only that he was kind, and that we called him our king.');
    await say(s, 'elian', 'Strange, to miss someone you cannot picture. But you have something for me, I think.');
  }
  await s.take('mael_letter');
  await narrate(s, 'Elian reads the letter. At the blank line where the town should be, he smiles for the first time.');
  await say(s, 'elian', "He couldn't write it either. Good. I thought it was only us.");
  await say(s, 'elian', "I'll answer it when I have a name to sign. May I write yours, in the meantime?");
  await narrate(s, 'He writes Mira, then Bram, then {hero}. The last name goes pale while the ink is still wet.');
  await s.emote('elian', '...');
  await say(s, 'elian', 'Sister Anwen keeps the chapel register, south-east of the square. She heard the bell first.');
  await s.setFlag('heard_crisis');
}

// nh_chapel, step trigger. The white line, the candles. Sets met_anwen.
async function anwen_register(s) {
  await s.walk('hero', 'anwen');
  await s.face('anwen', 'hero');
  await say(s, 'anwen', 'Visitors with faces. Corin ran all the way here to tell me. He has not run in a year he can name.');
  await s.camera.panTo('register', 30);
  await narrate(s, 'The chapel register lies open on its lectern. One line, halfway down the page, is perfectly white.');
  await s.music('sorrow');
  await say(s, 'anwen', 'Fifteen years ago I wrote one name on this line and swore to keep it. At the thirteenth bell, it went white.');
  await say(s, 'anwen', "I don't know whose it was. That is what frightens me.");
  await s.camera.follow('hero');
  await say(s, 'anwen', 'My grandmother said the thirteenth bell only rings when the town remembers who it rings for.');
  await say(s, 'mira', 'Pip says that. In Willowmere. Word for word.');
  await narrate(s, 'Mira is looking past Anwen at the candles. Her lips are moving.');
  await say(s, 'mira', 'Forty-one.');
  await s.emote('anwen', '!');
  await say(s, 'anwen', 'A little girl counted my candles every night. Forty-one. She was never wrong.');
  await say(s, 'mira', "I don't remember. I just counted.");
  await say(s, 'anwen', "Then your hands remember. That's a start.");
  await s.music('hollow');
  await say(s, 'anwen', "Tovin rows the only boat on the mere. He won't go to the Court. Ask him anyway.");
  await say(s, 'anwen', 'He mends nets at the pier on the north shore. He will tell you no. Let him. Then ask again.');
  await s.setFlag('met_anwen');
}

// nameless_hollow, Tovin's talk entry after met_anwen. The second crossing. Sets testimony_tovin (Fountain
// quest witness) and court_ferry_open (the ferry_court event becomes rideable).
async function tovin_ferry(s) {
  await s.face('tovin', 'hero');
  await say(s, 'tovin', 'Nobody rows to the Court. The Court keeps what it takes.');
  await say(s, 'bram', 'We heard. We were hoping for a boat anyway.');
  await say(s, 'tovin', 'Boat is for fish. Fish come back.');
  await s.face('tovin', 'mira');
  await s.wait(40);
  await s.emote('tovin', '...');
  await say(s, 'tovin', 'Fifteen years ago a girl begged me to row her over. Her friend had gone in after his reflection.');
  await say(s, 'tovin', "She called herself Mira. She came out alone at dawn and wouldn't look at the water.");
  await s.emote('mira', '...');
  await s.walk('mira', 'pier_end');
  await s.face('mira', 'up');
  await s.music('sorrow');
  await say(s, 'mira', '...Then watch me look.');
  await s.wait(40);
  await narrate(s, 'In the black water: Mira, and for one breath beside her, the reflection of a small boy. Then only Mira.');
  await say(s, 'mira', 'There was a boy.');
  await s.wait(30);
  await s.face('mira', 'tovin');
  await s.music('hollow');
  await say(s, 'tovin', 'Get in the boat. I owe that girl a second crossing.');
  await say(s, 'tovin', 'Ring the post at the end of the pier when you are ready. I will be at the oars.');
  await s.setFlag('testimony_tovin');
  await s.setFlag('court_ferry_open');
}

// nh_inn, object lost_property. Gives courier_satchel once (and starts The Last Route if Tess never asked).
async function satchel_found(s) {
  if (await s.hasFlag('satchel_found')) {
    await narrate(s, 'The lost-property shelf. Umbrellas, one boot, a birdcage, and a great many keys to doors nobody can name.');
    return;
  }
  await narrate(s, "The lost-property shelf. Umbrellas, one boot, a birdcage, and at the very back, a courier's satchel.");
  await narrate(s, 'The leather is cracked. The flap carries Willowmere post marks in faded red wax.');
  await say(s, 'wren', "That one? Before my time. Before my mother's time, nearly. Take it, if it knows you.");
  await say(s, 'mira', "Willowmere post marks. That's Tess's father's satchel. It has to be.");
  await s.give('courier_satchel');
  await s.setFlag('satchel_found');
  await s.setFlag('last_route_started');
}

// ------------------------------------------------------------------------------------------------
// Side quest: The Fountain of Faces. Orla starts it, Lena and Anwen testify (Tovin already did in tovin_ferry),
// the fountain object pays out. fountain_done also gives +25 Fury at the start of the King fight (E2-battle).
// ------------------------------------------------------------------------------------------------
async function orla_fountain(s) {
  await say(s, 'orla', 'You have faces. I saw from the shrine. Old Keeper eyes see a long way, and badly.');
  await say(s, 'orla', 'The fountain listens when all three witnesses have spoken. The Watchmaker. The Ferryman. The Sister.');
  await say(s, 'orla', 'The plinth in the square still carries their names. It is all that is left on it.');
  await say(s, 'mira', 'Tovin has told us his part. That leaves Lena at the clocktower, and Sister Anwen.');
  await say(s, 'orla', 'Then go and listen. Listening is most of remembering.');
  await s.setFlag('fountain_started');
}

async function lena_testimony(s) {
  await say(s, 'lena', 'Orla sent you. Then you want the witness, not the watchmaker. Sit. No, not there. That clock bites.');
  await say(s, 'lena', 'Our clocks strike at midnight, but the tower has no hands. Fifteen years, and never once late.');
  await say(s, 'lena', 'The night before the name went, the king came to my shop. He asked me how long a bargain lasts.');
  await say(s, 'lena', 'I said, until somebody remembers what it cost. He thanked me. He looked so tired.');
  await s.setFlag('testimony_lena');
}

async function anwen_testimony(s) {
  await say(s, 'anwen', 'You want my testimony. It is short, and it has been heavy for fifteen years.');
  await say(s, 'anwen', 'The king gave up his name to keep this town alive. I know that the way I know my prayers.');
  await say(s, 'anwen', 'And he cannot remember why. Nor can I. A name is a promise, not a title. His was kept somewhere.');
  await s.setFlag('testimony_anwen');
}

async function fountain_check(s) {
  if (await s.hasFlag('fountain_done')) {
    if (await s.hasFlag('nh_restored')) await narrate(s, 'The Fountain of Faces. The square leans over it all day, laughing at itself.');
    else await narrate(s, 'The Fountain of Faces. Still water, the dusk sky, and your three faces. It listened once.');
    return;
  }
  const ready = (await s.hasFlag('fountain_started')) && (await s.hasFlag('testimony_lena'))
    && (await s.hasFlag('testimony_tovin')) && (await s.hasFlag('testimony_anwen'));
  if (!ready) {
    await narrate(s, "The Fountain of Faces. Its water shows the sky over the square, and your three faces. Nobody else's.");
    if (await s.hasFlag('fountain_started')) {
      await say(s, 'mira', 'Orla said it listens when all three witnesses have spoken. Lena, Tovin and Sister Anwen.');
    }
    return;
  }
  await s.music('mystery');
  await narrate(s, 'You lean over the water, as the three witnesses once did. For one breath, the fountain fills with faces.');
  await narrate(s, 'Every face in town, looking up. And a whisper, half a word, rising off the water: "Hollow..."');
  await s.wait(40);
  await say(s, 'mira', "Hollow... and then the rest. It's in there. It's still in there somewhere.");
  await narrate(s, 'On the fountain floor lie offerings left long ago: a sea-green mantle, folded, and two silver flasks.');
  await s.give(REWARDS_EP2.fountain.item, REWARDS_EP2.fountain.qty);
  await s.give(REWARDS_EP2.fountain_extra.item, REWARDS_EP2.fountain_extra.qty);
  await say(s, 'bram', 'I feel like hitting something. In a good way.');
  await say(s, 'mira', 'Whatever this water keeps, it gave us some of it. Bring it to whoever kept the rest.');
  await s.music('hollow');
  await s.setFlag('fountain_done');
}

// ------------------------------------------------------------------------------------------------
// Side quest: Nico's Crowns (Nico, after court_entered). The paper crown is a chest in F3's Belonging wing.
// Nico is eight: he knows festival day from his mother's stories, not his own memory.
// ------------------------------------------------------------------------------------------------
async function nico_crowns(s) {
  if (!(await s.hasFlag('nico_crowns_started'))) {
    await say(s, 'nico', 'I drew a crown on every blank sign. The grownups hated it.');
    await say(s, 'nico', 'I dream about a crown. A paper one. Somebody gives it to somebody. I always wake up before I see who.');
    await say(s, 'mira', "A paper crown. If we find one, Nico, we'll bring it to you.");
    await say(s, 'nico', 'Promise? Promises are big here. Everybody keeps them extra hard.');
    await s.setFlag('nico_crowns_started');
    return;
  }
  if (!(await s.hasFlag('paper_crown_found'))) {
    await say(s, 'nico', 'Did you find a paper crown yet? I drew one on the inn sign while you were gone. Wren let me.');
    return;
  }
  await narrate(s, 'You show Nico the paper crown. It is soft with age, and its gold paint has worn to a shine.');
  await s.emote('nico', '!');
  await say(s, 'nico', 'Ma told me about festival day. The king gave every child a paper crown. Then the festivals stopped.');
  await say(s, 'nico', "I never got one. That's why I draw them.");
  await s.wait(30);
  if (await s.hasFlag('nh_restored')) {
    await say(s, 'nico', 'This one was his. Aurel says he is done with crowns. So you keep it. Somebody should.');
  } else {
    await say(s, 'nico', 'This one is HIS. You keep it. You are going to see him, and he should know somebody kept it safe.');
  }
  await say(s, 'bram', 'You could keep it, Nico.');
  await say(s, 'nico', "No. I'm going to draw a better one. Mine will have more points.");
  await s.setFlag('nico_crowns_done');
}

// ------------------------------------------------------------------------------------------------
// Side quest: A Letter Answered. Elian writes (nh_hall, after nh_restored); Mael receives (willowmere).
// ------------------------------------------------------------------------------------------------
async function elian_letter(s) {
  await say(s, 'elian', 'I owe an old man in Willowmere a letter. I said I would answer it when I had a name to sign.');
  await narrate(s, 'Elian signs with a flourish that takes three tries. On the third he laughs out loud.');
  await say(s, 'elian', '"Elian, Mayor of Hollowmere." I have never signed anything so long. Would you carry it to him?');
  await s.give('elian_reply');
  await say(s, 'mira', 'Mael will read it three times. Then he will write it down.');
  await say(s, 'elian', 'Good. The more places a name is written, the harder it is to lose.');
  await s.setFlag('letter_answer_started');
}

async function letter_answer(s) {
  await s.face('mael', 'hero');
  await say(s, 'mael', 'A letter? From the east?');
  await s.take('elian_reply');
  await narrate(s, 'Mael breaks the seal. He reads it twice, then a third time, slowly, the way he reads the Register.');
  await say(s, 'mael', '"Elian, Mayor of Hollowmere." Hollowmere. It sits on the tongue as if it had always been there.');
  await s.sfx('name_restore');
  await narrate(s, 'Mael opens the Town Register to a clean page and writes one word in his very best hand: HOLLOWMERE.');
  await say(s, 'mael', 'There. Now two towns remember it.');
  await say(s, 'mael', 'Take these. I was saving them for a rainy day, and you three are the weather.');
  await s.give(REWARDS_EP2.letter.item, REWARDS_EP2.letter.qty);
  await s.setFlag('letter_answer_done');
}

// ================================================================================================
// Act IV: The Court of Mirrors
// ================================================================================================

// court_f1, on enter, the first arrival by ferry. Tovin is the map actor tovin_c at the landing. Sets court_entered.
async function court_crossing(s) {
  await s.music('mystery');
  await narrate(s, 'The mere is so still the boat seems to row across the sky.');
  await s.sfx('ferry_oars');
  await narrate(s, "Behind you, the Court's reflection follows the Court across the water, always a heartbeat late.");
  await s.camera.panTo('great_door', 40);
  await say(s, 'bram', "It's bigger up close. Things usually aren't.");
  await s.camera.follow('hero');
  await s.face('tovin_c', 'hero');
  await say(s, 'tovin_c', "I'll wait at the landing. I've waited longer for worse.");
  await say(s, 'tovin_c', 'Want to go home, come to the boat. I row both ways.');
  await s.music('court');
  await s.setFlag('court_entered');
}

// Step trigger at the great door. The room teaches the beam by showing it; nobody explains. Sets court_f1_arrived.
async function court_f1_arrival(s) {
  await narrate(s, 'Tall mirrors line the hall from floor to vault. Mira and Bram look back from every one of them.');
  await narrate(s, 'So do you. Your reflection has no face.');
  await say(s, 'bram', "Your reflection's smudged. Like breath on glass.");
  await say(s, 'mira', "Mirrors here keep faces. Yours is faint, so they can't hold it.");
  await s.choice(["It's fine.", '...']);
  await say(s, 'mira', "It isn't. But it's ours to fix.");
  await s.camera.panTo('b_center', 40);
  await narrate(s, 'Moonlight falls through the roof in a single shaft, strikes a mirror on a stand, and runs off sideways.');
  await say(s, 'bram', "Moonlight, going sideways. That's new.");
  await s.camera.follow('hero');
  await s.setFlag('court_f1_arrived');
}

// Step trigger mira_window_trig at the stairs hall window. Memory 1 (canon text). Sets mira_memory_1.
async function mira_memory_1(s) {
  await s.camera.panTo('mira_window', 40);
  await s.music('hollow');
  await narrate(s, 'The tall window holds no night at all. In the glass stands a small girl, looking up at someone.');
  await s.emote('mira', '!');
  await say(s, 'mira', 'I came here when I was little. The king showed me someone brave enough to rescue everyone.');
  await say(s, 'mira', 'She was not me. I ran away instead.');
  await say(s, 'bram', 'You were a child.');
  await say(s, 'mira', 'I was seven, and I ran.');
  await s.wait(40);
  await s.music('court');
  await s.camera.follow('hero');
  await s.setFlag('mira_memory_1');
}

// Receptor rec_lock's script (first light). A pan along the beam. Sets silverglass_lock_seen (and the latch flag).
async function silverglass_lock(s) {
  await s.sfx('beam_hit');
  await s.flash('#e8f0ff', 12);
  await s.camera.panTo('lens_1', 30);
  await s.camera.panTo('lens_2', 30);
  await s.camera.panTo('rec_lock', 30);
  await narrate(s, 'A silver beam crosses three chambers and comes to rest in the crystal beside the stairs.');
  await s.sfx('gate_open');
  await s.camera.panTo('lock_gate', 30);
  await s.shake(1, 20);
  await say(s, 'bram', 'Three rooms and three lenses, to carry one beam of moonlight.');
  await say(s, 'mira', 'Keepers. They never did anything the short way.');
  await s.camera.follow('hero');
  await s.setFlag('silverglass_lock_lit');
  await s.setFlag('silverglass_lock_seen');
}

// Step trigger on the stairs down to court_f2. Sets court_f1_done.
async function court_f1_stairs(s) {
  await say(s, 'bram', 'Down again. Every old place we visit goes down.');
  await say(s, 'mira', 'The Keepers kept the precious things lowest. They never feared floods. They feared readers.');
  await s.setFlag('court_f1_done');
}

// court_f2, on enter. Sets court_f2_arrived.
async function court_f2_arrival(s) {
  await narrate(s, 'Every portrait resembles someone you once knew. None of you can remember the sitter.');
  await say(s, 'bram', "That one has Holt's ears.");
  await say(s, 'mira', "They're the town. Before.");
  await narrate(s, 'Past the portraits, the floor falls away into a wide, dark well. Its walls are mirror all the way down.');
  await s.setFlag('court_f2_arrived');
}

// The three portraits (objects, any order). The third one seen sets remembrance_open (the cache chest appears).
const PORTRAIT_VIEWS = {
  portrait_child: {
    flag: 'portrait_child_seen',
    text: "A CHILD AT THE RIVER. A small boy at the edge of the mere. A ferryman's hand reaches for him.",
    who: 'bram', line: "Look at the knuckles on that hand. That's Tovin.",
  },
  portrait_keeper: {
    flag: 'portrait_keeper_seen',
    text: 'A KEEPER IN THE COURT. The frame is empty. Not blank: empty, right through to the wall behind it.',
    who: 'mira', line: 'Whoever built this place is gone from it entirely.',
  },
  portrait_king: {
    flag: 'portrait_king_seen',
    text: 'A KING WITHOUT A CROWN. A man in a long coat, his crown in his hand, and a boy on his shoulders.',
    who: 'bram', line: 'He looks happy. Kings in paintings never look happy.',
  },
};
const viewPortrait = (id) => async (s) => {
  const p = PORTRAIT_VIEWS[id];
  await narrate(s, p.text);
  if (await s.hasFlag(p.flag)) return;
  await say(s, p.who, p.line);
  await s.setFlag('portraits_started');
  await s.setFlag(p.flag);
  if (await s.hasFlag('remembrance_open')) return;
  for (const q of Object.values(PORTRAIT_VIEWS)) if (!(await s.hasFlag(q.flag))) return;
  await say(s, 'mira', 'A child, a keeper, a king. The Court kept them in order.');
  await s.sfx('gate_open');
  await narrate(s, 'Somewhere along the south gallery, a lock lets go.');
  await s.setFlag('remembrance_open');
};

// Step trigger pool_trig at the reflection pool on the island. Memory 2 (canon text). Sets mira_memory_2.
async function mira_memory_2(s) {
  await s.camera.panTo('pool', 30);
  await s.music('sorrow');
  await narrate(s, 'The pool on the island is perfectly still. In it, a girl of seven reaches for a smaller child.');
  await say(s, 'mira', 'I promised I would come back for him.');
  await say(s, 'mira', 'The mirrors made me forget the promise. Not the person.');
  await s.wait(30);
  await say(s, 'mira', "I still can't see his face.");
  await narrate(s, 'Bram says nothing. He stands a little closer, the way he stands at the gate.');
  await s.music('court');
  await s.camera.follow('hero');
  await s.setFlag('mira_memory_2');
}

// Step trigger vex_trig in the corridor before the arena. Vex is a scene spawn "in" the mirror. Sets vex_met.
async function vex_mirror(s) {
  await s.music(null);
  await s.camera.panTo('vex_mirror', 40);
  await narrate(s, 'A great mirror fills the corridor wall. It shows the three of you, and a fourth.');
  await s.spawn('vex', { sprite: 'npc_vex', name: 'Vex Quill', at: 'vex_glass', dir: 'down' });
  await s.music('mystery');
  await say(s, 'vex', 'Reflections are honest only when they disagree with you.');
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await say(s, 'bram', 'Who are you?');
  await say(s, 'vex', 'Vex Quill. I collect things nobody is using.');
  await narrate(s, 'He is not in the corridor. He is only in the glass, silver-haired, leaning on nothing, smiling at you.');
  await s.face('vex', 'hero');
  await say(s, 'vex', 'Yours has no face. Do you know why?');
  const c = await s.choice(['Do you?', 'Get out of the mirror.']);
  if (c === 0) await say(s, 'vex', 'I know a great many things. Knowing is cheap. Telling costs extra.');
  else await say(s, 'vex', "Can't. I'm not in it. That's rather the point of me.");
  await say(s, 'vex', 'If a name can be stolen, perhaps it never belonged to you.');
  await say(s, 'vex', "You're missing a page, {hero}. Not that one. The first one.");
  await say(s, 'mira', 'What does that mean?');
  await say(s, 'vex', 'That someone is reading your story out of order.');
  await s.sfx('crystal_hit');
  await narrate(s, 'He taps the glass from the inside. It rings like a struck bell.');
  await say(s, 'vex', "Your reflections are restless. I'd hurry.");
  await s.flash('#ffffff', 8);
  await s.despawn('vex');
  await say(s, 'bram', "I don't like him.");
  await say(s, 'mira', "He's in a mirror, Bram. Liking him is optional.");
  await s.music('court');
  await s.camera.follow('hero');
  await s.setFlag('vex_met');
}

// Step trigger selves_trig in the arena. Mini-boss intro in the Episode 1 boss style. Sets other_selves_defeated
// (also the encounter flag). The Twinfold Charm drops in the Victory window.
async function other_selves(s) {
  if (await s.hasFlag('other_selves_defeated')) return;
  await s.music(null);
  await s.camera.panTo('selves_spot', 40);
  await s.wait(30);
  await narrate(s, 'The great mirror at the end of the arena holds the three of you. Then it holds you a moment too long.');
  await s.sfx('reflection_out');
  await s.flash('#d8d0ff', 10);
  await s.spawn('refl_mira_f', { sprite: 'refl_mira', name: "Mira's Reflection", at: 'selves_mira', dir: 'down' });
  await s.spawn('refl_bram_f', { sprite: 'refl_bram', name: "Bram's Reflection", at: 'selves_bram', dir: 'down' });
  await s.spawn('refl_hero_f', { sprite: 'refl_hero', name: 'Nameless Reflection', at: 'selves_hero', dir: 'down' });
  await say(s, 'refl_mira_f', "I ran. You'll run too.");
  await say(s, 'refl_bram_f', 'Stand still. Guards stand still.');
  await say(s, 'refl_hero_f', '...');
  await say(s, 'bram', "That's me. I don't stand like that.");
  await say(s, 'mira', "You do. That's the trouble.");
  await say(s, 'mira', "They're us, backwards. Hit each one with what its owner doesn't carry.");
  await s.title('THE OTHER SELVES', { sub: 'Hall of Reflections', frames: 100 });
  await s.shake(3, 24);
  await s.flash('#ffffff', 8);
  await s.music('battle');
  const result = await s.battle('other_selves', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.camera.panTo('selves_spot', 20);
  await s.sfx('glass_break');
  await s.flash('#ffffff', 12);
  await narrate(s, 'The reflections crack from crown to heel and fall as glass.');
  for (const id of ['refl_mira_f', 'refl_bram_f', 'refl_hero_f']) await s.despawn(id);
  await say(s, 'mira', "I'm not running.");
  await say(s, 'bram', 'Never thought you were.');
  await narrate(s, 'Where the great mirror stood, a stair runs down into the dark.');
  await s.camera.follow('hero');
  await s.music('court');
  await s.setFlag('other_selves_defeated');
}

// Step trigger on the stair the great mirror became. Sets court_f2_done.
async function court_f2_stairs(s) {
  await say(s, 'bram', 'Down through a mirror. Of course it is.');
  await say(s, 'mira', 'Everything here is a mirror, Bram. Sooner or later one of them had to be a door.');
  await s.setFlag('court_f2_done');
}

// court_f3, on enter. Sets court_f3_arrived.
async function court_f3_arrival(s) {
  await s.music('mystery');
  await narrate(s, 'Dark. The floor is a black mirror, and every step you take is answered from underneath.');
  await s.camera.panTo('vow_door', 60);
  await narrate(s, "Far ahead, behind glass, stands an empty throne. In the floor's reflection, a crowned shape sits on it.");
  await say(s, 'bram', "There's someone on that throne. Down there. Not up here.");
  await s.camera.follow('hero');
  await say(s, 'mira', 'Three doors, three vows. The Keepers loved a set of three.');
  await s.setFlag('court_f3_arrived');
}

// The three vows: each runs on its wing receptor's first light. The vow mirror shows a memory of the King, in
// reflection only (the memory voices are named speaker ids with no actor). Each sets its *_seen flag and the
// latch flag (harmless if the receptor already set it).
async function vowOpen(s, mark) {
  await s.sfx('beam_hit');
  await s.camera.panTo(mark, 40);
  await s.music('hollow');
}
async function vowClose(s, flag) {
  await s.wait(30);
  await s.music('mystery');
  await s.camera.follow('hero');
  await s.setFlag(flag);
  await s.setFlag(`${flag}_seen`);
}

async function vow_belonging(s) {
  await vowOpen(s, 'vow_belonging');
  await narrate(s, 'The vow mirror fills with light, and in it, only in it: the square on a festival day.');
  await narrate(s, 'A tall man in a long coat hands paper crowns to a line of children. The smallest boy will not take one.');
  await say(s, 'boy_memory', 'I want yours.');
  await say(s, 'king_memory', 'Then you shall have it, when you are grown.');
  await vowClose(s, 'vow_belonging');
  await say(s, 'bram', 'A crown for every child in the square. I like this king.');
}

async function vow_mercy(s) {
  await vowOpen(s, 'vow_mercy');
  await narrate(s, 'In the vow mirror, a ferryman wades out of the mere with a soaked little boy in his arms.');
  await say(s, 'tovin_memory', 'I looked away for one breath.');
  await say(s, 'king_memory', 'You brought him back. That is all I will remember of today.');
  await vowClose(s, 'vow_mercy');
  await say(s, 'mira', 'That was Tovin. Younger. The same hands.');
}

async function vow_courage(s) {
  await vowOpen(s, 'vow_courage');
  await narrate(s, 'In the vow mirror, the King stands before a great mirror holding a sheet of cheap paper.');
  await narrate(s, "The top line is a child's name. Under it, the town's.");
  await say(s, 'king_memory', 'Take mine instead.');
  await narrate(s, 'His mouth keeps moving after that, and no sound comes out.');
  await vowClose(s, 'vow_courage');
  await say(s, 'mira', 'Cheap paper, {hero}. That was a list. Like the one in the Archive.');
}

// Step trigger in front of the vow door, once all three vows are lit. Memory 3 (canon text, then new lines).
// Sets mira_memory_3 and vow_door_open.
async function vow_door(s) {
  await s.camera.panTo('vow_door', 40);
  await s.sfx('crystal_hit');
  await s.flash('#e8f0ff', 10);
  await narrate(s, "The vow door's three crystals blaze, one after another, and the glass door swings inward.");
  await s.sfx('gate_open');
  await s.music('sorrow');
  await narrate(s, "Mira lays her hand on the door glass, over the throne's reflection.");
  await say(s, 'mira', "I did come back. The child was the king's son.");
  await say(s, 'mira', "The king protected this town because he couldn't bear to lose him again.");
  await say(s, 'mira', 'He carried the boy out himself, before he shut the doors.');
  await say(s, 'bram', 'Guardians are taught to stand still. I was good at it.');
  await say(s, 'bram', "He's a guard at a post nobody came to relieve.");
  await say(s, 'mira', 'Then we relieve him.');
  await s.music('mystery');
  await s.camera.follow('hero');
  await s.setFlag('mira_memory_3');
  await s.setFlag('vow_door_open');
}

// Object feather_obj on a glass bench in the throne antechamber. Optional. Gives black_feather.
async function black_feather(s) {
  await narrate(s, 'On the arm of a glass bench lies a single black feather.');
  await s.give('black_feather');
  await say(s, 'mira', 'Black. Our friend from the mirror.');
  await say(s, 'bram', 'Not my friend.');
  await s.setFlag('black_feather_found');
}

// ================================================================================================
// Act V: The Nameless King (court_throne)
// ================================================================================================

// Step trigger row king_trig. Boss intro in the Episode 1 style; the King is the map actor nameless_king.
async function nameless_king(s) {
  if (await s.hasFlag('nameless_king_defeated')) return;
  await s.music(null);
  await s.camera.panTo('nameless_king', 40);
  await s.wait(40);
  await narrate(s, 'A long hall of black glass. At the far end, a man sits with his back to you, facing a great mirror.');
  await s.camera.panTo('great_mirror', 40);
  await narrate(s, 'In the mirror is the whole town: roofs, the fountain, a festival, and every face the Hollow ever cast.');
  await say(s, 'nameless_king', 'NOTHING MORE WILL BE TAKEN.');
  await say(s, 'nameless_king', 'I KEEP IT ALL.');
  await s.camera.panTo('nameless_king', 20);
  await s.face('nameless_king', 'down');
  await s.shake(2, 30);
  await narrate(s, 'He turns. Where his face should be hangs a veil of glass.');
  await say(s, 'nameless_king', 'YOU HAVE FACES. I WILL KEEP THEM SAFE.');
  await say(s, 'nameless_king', '...YOU. YOU HAVE NO REFLECTION TO KEEP.');
  await all(s.emote('hero', '...'), s.emote('mira', '!'), s.emote('bram', '!'));
  const c = await s.choice(['Let them go.', "We're taking them home."]);
  if (c === 0) await say(s, 'nameless_king', 'LET THEM GO? I LET ONE GO, ONCE. I DO NOT REMEMBER WHO.');
  else await say(s, 'nameless_king', 'HOME IS WHERE I KEEP THEM. HOME IS HERE.');
  await say(s, 'mira', "He isn't eating them. He's hiding them.");
  await say(s, 'bram', 'From what?');
  await say(s, 'mira', 'From the list.');
  await say(s, 'mira', 'When his mirror turns to one of us, defend. Break him and the glass cracks.');
  await s.title('THE NAMELESS KING', { sub: 'Keeper of the Court', frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_king');
  const result = await s.battle('nameless_king', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await king_after(s);
}

// After the win (also runnable on its own, from an enter trigger after a reload). The order is the bible's.
// The unmasked King is a spawn (aurel_k at mark kneel) replacing the map actor; Elian is a spawn (elian_k).
// Gives name_fragment_2, mirror_sigil, kept_promise. Sets nameless_king_defeated, aurel_named, mirror_sigil_get.
async function king_after(s) {
  await s.setFlag('nameless_king_defeated');
  await s.camera.panTo('kneel', 20);
  await s.shake(3, 40);
  await s.sfx('glass_break');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The King sinks to one knee. His veil of glass slides away and breaks on the black floor.');
  await s.despawn('nameless_king');
  await s.spawn('aurel_k', { sprite: 'npc_aurel', name: 'The King', at: 'kneel', dir: 'down' });
  await narrate(s, 'Under it is a tired, grey-bearded man. In the last unbroken mirror he sees a father holding his young son.');
  await say(s, 'aurel_k', 'I traded my name for theirs.');
  await s.walk('mira', 'aurel_k');
  await s.face('mira', 'aurel_k');
  await say(s, 'mira', 'You were never forgotten. I remember your son, and I remember you.');
  await s.emote('aurel_k', '!');
  await say(s, 'aurel_k', 'My son. Is he...?');
  await s.sfx('footstep_stone');
  await s.spawn('elian_k', { sprite: 'npc_elian', name: 'Elian', at: 'elian_enter', dir: 'up' });
  await s.camera.panTo('elian_meet', 30);
  await s.walk('elian_k', 'elian_meet', { speed: 'run' });
  await say(s, 'elian_k', "I couldn't wait in the hall. I've been waiting fifteen years.");
  await narrate(s, 'Tovin rowed him over. At the far door, the old ferryman leans on an oar and does not come in.');
  await s.face('aurel_k', 'elian_k');
  await say(s, 'aurel_k', 'That coat. It was always too big for you.');
  await s.camera.panTo('great_mirror', 30);
  await s.shake(2, 40);
  await s.sfx('glass_break');
  await s.flash('#ffffff', 20);
  await narrate(s, 'Cracks race across the great mirror. Reflections pour out of it like birds and stream away over the mere.');
  await s.camera.panTo('elian_meet', 20);
  await s.emote('elian_k', '!');
  await say(s, 'elian_k', '...Father.');
  await s.wait(30);
  await say(s, 'elian_k', 'Aurel. Your name is Aurel.');
  await s.sfx('name_restore');
  await s.flash('#fff2b0', 16);
  // Under the flash, the unnamed King becomes Aurel: same tile, same sprite, his name back on the speaker tag.
  await s.despawn('aurel_k');
  await s.spawn('aurel', { sprite: 'npc_aurel', name: 'Aurel', at: 'kneel', dir: 'down' });
  await s.face('aurel', 'elian_k');
  await s.music('triumph');
  await say(s, 'aurel', 'Elian.');
  await all(s.emote('elian_k', 'heart'), s.emote('aurel', 'heart'));
  await s.camera.panTo('fragment_spot', 40);
  await narrate(s, 'From the empty frame of the great mirror rises a single page, edged in gold and covered in names.');
  await s.give('name_fragment_2');
  await say(s, 'mira', "The second fragment of the Book of Names. The Hollow's names, and at the top, the town's own.");
  await say(s, 'mira', 'Hollowmere.');
  await narrate(s, 'Mira reads further down the page, and stops.');
  await s.music('mystery');
  await say(s, 'mira', '{hero}. Your name is on this page too.');
  await say(s, 'bram', 'It was on the other one.');
  await say(s, 'mira', 'A name is written once in the Book. Once.');
  await say(s, 'bram', 'Then someone wrote it twice.');
  await s.wait(40);
  await s.camera.panTo('kneel', 30);
  await say(s, 'aurel', 'There was a list. Cheap paper, a cold hand, and a seal: an open book with nothing written in it.');
  await say(s, 'aurel', 'It was written in the First Library. I kept it, to know my enemy.');
  await say(s, 'aurel', 'A man with silver hair took it from my hand while I slept, and left a feather.');
  await say(s, 'bram', 'Vex.');
  await say(s, 'aurel', 'Take this. Any mirror the Keepers made will open for whoever carries it.');
  await s.give('mirror_sigil');
  await s.music('hollowmere');
  await s.face('elian_k', 'mira');
  await say(s, 'elian_k', 'Mira. This was wrapped in the coat, on the chapel step. My father made it for me.');
  await narrate(s, "A small bow of pale wood, strung with silver thread. The grip is worn smooth by a child's hand.");
  await say(s, 'elian_k', 'You came back. That was the whole promise.');
  await say(s, 'mira', 'Fifteen years late.');
  await say(s, 'elian_k', 'You came back.');
  await s.give(REWARDS_EP2.kept_promise.item, REWARDS_EP2.kept_promise.qty);
  await say(s, 'elian_k', 'Father called it the Kept Promise. I never knew why. I think I do now.');
  await s.camera.panTo('great_mirror', 30);
  await narrate(s, "The great mirror's frame holds no reflection now. It holds the square, and the fountain, in morning light.");
  await say(s, 'aurel', 'Go through. The town should see you come home.');
  await s.camera.follow('hero');
  await s.setFlag('aurel_named');
  await s.setFlag('mirror_sigil_get');
}

// ================================================================================================
// Act VI: Hollowmere
// ================================================================================================

// nameless_hollow, on enter through the throne room mirror (the party lands at fountain_out). Signs fill (their
// overlays are gated on nh_restored), the dusk tint lifts. Sets nh_restored, then chains ep2_ending.
async function hollowmere_restored(s) {
  await s.sfx('mirror_step');
  await s.flash('#ffffff', 20);
  await narrate(s, "You step out of the fountain's reflection into the square. The water closes behind you without a ripple.");
  await s.spawn('aurel_g', { sprite: 'npc_aurel', name: 'Aurel', at: 'restored_aurel', dir: 'down' });
  await s.spawn('elian_g', { sprite: 'npc_elian', name: 'Elian', at: 'restored_elian', dir: 'down' });
  await s.walk('hero', 'restored_spot');
  await s.music('hollowmere');
  await s.setFlag('nh_restored');
  await s.tint('none', 120);
  await s.sfx('name_restore');
  await s.camera.panTo('gate_sign', 40);
  await narrate(s, 'Silver letters fill the blank signs one by one: the inn, the hall, the smithy, the gate. HOLLOWMERE.');
  await s.camera.panTo('fountain', 30);
  await narrate(s, 'People come out of every door. At the fountain they find their own faces, and laugh, or cry, or both.');
  await s.sfx('bell_peal');
  await s.camera.follow('hero');
  await s.walk('corin', 'gather_corin', { speed: 'run' });
  await say(s, 'corin', "Hollowmere! The watch of Hollowmere! I've wanted to say that for a year I couldn't name.");
  await s.walk('lena', 'gather_lena');
  await s.sfx('clock_chime');
  await say(s, 'lena', 'The clocktower has hands again. Ten past four! I have never been so happy to be late.');
  await s.walk('nico', 'gather_nico', { speed: 'run' });
  await say(s, 'nico', 'My crowns are on real signs now!');
  await s.spawn('anwen_g', { sprite: 'npc_anwen', name: 'Sister Anwen', at: 'gather_anwen', dir: 'up' });
  await say(s, 'anwen_g', 'The white line in my register. It has a name on it now. It says AUREL.');
  await s.face('anwen_g', 'aurel_g');
  await s.emote('anwen_g', 'heart');
  await say(s, 'anwen_g', 'It rang for him. And now we remember who it rang for.');
  await say(s, 'elian_g', 'Hollowmere. I can sign my letters properly now.');
  await s.walk('mira', 'fountain_rim');     // the north rim (the fountain mark itself is inside the basin)
  await s.face('mira', 'down');
  await narrate(s, 'Mira leans over the fountain rim. Her reflection leans back.');
  await say(s, 'mira', "Hollowmere. I'm from Hollowmere.");
  await say(s, 'bram', 'Took you long enough to say it.');
  await say(s, 'mira', 'Fifteen years. I counted.');
  await ep2_ending(s);
}

// The ending hook, straight after (night). Sets ep2_complete; the integrator then rolls CREDITS_EP2 and wakes
// the party at nh_inn inn_bed (plan 5.6).
async function ep2_ending(s) {
  await s.fade('out', 60);
  for (const id of ['aurel_g', 'elian_g', 'anwen_g']) await s.despawn(id);
  await s.tint('night', 0);
  await s.music(null);
  await s.camera.panTo('night_view', 0);
  await s.fade('in', 90);
  await narrate(s, 'That night, Hollowmere sets lanterns on the water, one for every face that came home.');
  await s.wait(60);
  await s.camera.follow('hero');
  await s.walk('hero', 'fountain_view');
  await s.face('hero', 'up');
  await narrate(s, 'You look into the fountain. Your reflection is there now. Faint, like writing seen through water.');
  await say(s, 'mira', "It's there. That's more than yesterday.");
  await s.camera.panTo('emberpeak_glow', 60);
  await narrate(s, 'Far to the north-east, a red glow lies along the mountains.');
  await s.wait(60);
  await narrate(s, 'And from far to the west, across the water, a single toll.');
  await s.sfx('bell_toll');
  await s.wait(180);
  await say(s, 'mira', '...Thirteen.');
  await s.music('mystery');
  await narrate(s, 'Bram goes very still.');
  await say(s, 'bram', "That glow. That's Emberpeak. That's my mountain.");
  await say(s, 'mira', "Then that's where we go next.");
  await say(s, 'bram', 'All three of us.');
  await s.camera.follow('hero');
  await s.fade('out', 120);
  await s.title('End of Episode 2', { sub: 'The Town Without a Name', frames: 240 });
  await s.title('Episode 3: The Forge of Ash', { sub: 'Far away, the mountains begin to smolder.', frames: 240 });
  await s.setFlag('ep2_complete');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Conditions as in ep1.js; every flag is declared in quests.js FLAGS.
// ------------------------------------------------------------------------------------------------
const VOWS = ['vow_belonging', 'vow_mercy', 'vow_courage'];
export const SCENE_CONDITIONS = {
  ep2_morning: { if: 'ep1_complete', ifNot: 'ep2_morning_done' },
  ep2_mael: { if: 'ep1_complete', ifNot: 'ep2_started' },
  iris_farewell: { if: 'ep1_complete', ifNot: 'iris_farewell_done' },
  tess_last_route: { if: 'ep1_complete', ifNot: 'last_route_done' },
  garrick_crossing: { if: 'ep2_started', ifNot: 'crossing_done' },
  east_road_arrival: { if: 'crossing_done', ifNot: 'east_road_arrived' },
  east_first_fight: { if: 'crossing_done', ifNot: 'east_first_fight_done' },
  old_milestone: null,
  fading_stretch: { if: 'crossing_done', ifNot: 'saw_cairns' },
  fog_loop: { if: 'saw_cairns', ifNot: 'fog_looped' },
  waystation_rest: { if: 'crossing_done' },
  mere_view: { if: 'crossing_done', ifNot: 'saw_court' },
  nh_arrival: { if: 'crossing_done', ifNot: 'nh_arrived' },
  fountain_faces: { if: 'nh_arrived', ifNot: 'met_elian' },
  elian_hall: { if: 'met_elian', ifNot: 'heard_crisis' },
  anwen_register: { if: 'heard_crisis', ifNot: 'met_anwen' },
  tovin_ferry: { if: 'met_anwen', ifNot: 'court_ferry_open' },
  satchel_found: { if: 'nh_arrived' },
  orla_fountain: { if: 'court_ferry_open', ifNot: 'fountain_started' },
  lena_testimony: { if: 'fountain_started', ifNot: 'testimony_lena' },
  anwen_testimony: { if: 'fountain_started', ifNot: 'testimony_anwen' },
  fountain_check: { if: 'nh_arrived' },
  nico_crowns: { if: 'court_entered', ifNot: 'nico_crowns_done' },
  elian_letter: { if: 'nh_restored', ifNot: 'letter_answer_started' },
  letter_answer: { if: 'letter_answer_started', ifNot: 'letter_answer_done' },
  court_crossing: { if: 'court_ferry_open', ifNot: 'court_entered' },
  court_f1_arrival: { if: 'court_entered', ifNot: 'court_f1_arrived' },
  mira_memory_1: { if: 'court_f1_arrived', ifNot: 'mira_memory_1' },
  silverglass_lock: { if: 'court_entered', ifNot: 'silverglass_lock_seen' },
  court_f1_stairs: { if: 'court_entered', ifNot: 'court_f1_done' },
  court_f2_arrival: { if: 'court_f1_done', ifNot: 'court_f2_arrived' },
  portrait_child: { if: 'court_f1_done' },
  portrait_keeper: { if: 'court_f1_done' },
  portrait_king: { if: 'court_f1_done' },
  mira_memory_2: { if: 'court_f2_arrived', ifNot: 'mira_memory_2' },
  vex_mirror: { if: 'court_f2_arrived', ifNot: 'vex_met' },
  other_selves: { if: 'court_f1_done', ifNot: 'other_selves_defeated' },
  court_f2_stairs: { if: 'other_selves_defeated', ifNot: 'court_f2_done' },
  court_f3_arrival: { if: 'court_f2_done', ifNot: 'court_f3_arrived' },
  vow_belonging: { if: 'court_f2_done', ifNot: 'vow_belonging_seen' },
  vow_mercy: { if: 'court_f2_done', ifNot: 'vow_mercy_seen' },
  vow_courage: { if: 'court_f2_done', ifNot: 'vow_courage_seen' },
  vow_door: { if: VOWS, ifNot: 'vow_door_open' },
  black_feather: { if: 'court_f2_done', ifNot: 'black_feather_found' },
  nameless_king: { if: 'vow_door_open', ifNot: 'nameless_king_defeated' },
  king_after: { if: 'nameless_king_defeated', ifNot: 'aurel_named' },
  hollowmere_restored: { if: 'aurel_named', ifNot: 'nh_restored' },
  ep2_ending: { if: 'nh_restored', ifNot: 'ep2_complete' },
};

const RAW = {
  ep2_morning, ep2_mael, iris_farewell, tess_last_route, garrick_crossing,
  east_road_arrival, east_first_fight, old_milestone, fading_stretch, fog_loop, waystation_rest, mere_view,
  nh_arrival, fountain_faces, elian_hall, anwen_register, tovin_ferry, satchel_found,
  orla_fountain, lena_testimony, anwen_testimony, fountain_check, nico_crowns, elian_letter, letter_answer,
  court_crossing, court_f1_arrival, mira_memory_1, silverglass_lock, court_f1_stairs, court_f2_arrival,
  portrait_child: viewPortrait('portrait_child'), portrait_keeper: viewPortrait('portrait_keeper'),
  portrait_king: viewPortrait('portrait_king'),
  mira_memory_2, vex_mirror, other_selves, court_f2_stairs,
  court_f3_arrival, vow_belonging, vow_mercy, vow_courage, vow_door, black_feather,
  nameless_king, king_after, hollowmere_restored, ep2_ending,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// ------------------------------------------------------------------------------------------------
// Inspect text (same shapes as ep1.js lines): a string, a list of boxes, or a conditional list
// [{ if, ifNot, lines }] whose last entry is the unconditional fallback. Map events: { type: 'sign', text: id }.
// ------------------------------------------------------------------------------------------------
const NHR = 'nh_restored';
export const lines = {
  // valley (E2-maps edits)
  ford_wrack: [
    { if: 'crossing_done', lines: 'Floodwrack, pushed aside to make room for planks. The post has been sawn off clean.' },
    { lines: 'Floodwrack and a sheared post. The east road is washed out.' },
  ],
  garrick_rail: [
    "GARRICK'S CROSSING. SAY IT WHEN YOU CROSS.",
    'The letters are cut slow and deep, the way Garrick does everything.',
  ],

  // willowmere (E2-maps edits): a note on the smithy door, present while garrick_at_ford; the chapel mirror
  smithy_ford_note: 'A note nailed to the smithy door, in square capitals: GONE TO THE FORD. G.',
  wm_chapel_mirror: [
    { if: 'mirror_sigil_get', lines: 'The tall mirror behind the altar ripples like still water. Through it, faintly, a chapel full of candles.' },
    { lines: 'A tall old mirror behind the altar. Nobody has looked at it closely for a century. It looks back.' },
  ],

  // east_road
  east_signpost: [
    { if: 'nh_restored', lines: 'A signpost. Someone has chalked on the east arm, in a boy\'s capitals: HOLLOWMERE. And a crown.' },
    { lines: 'A signpost with two arms. Both are blank. Not weathered: blank.' },
  ],
  cairn: [
    'A cairn of river stones, stacked by many hands. The top pebble is newer than the rest.',
  ],
  toll_board: [
    { if: 'nh_restored', lines: 'The toll board. Faint letters have come back: TOLL TO HOLLOWMERE, ONE COPPER OR ONE GOOD STORY.' },
    { lines: 'A toll board, nailed up beside the gate of the ruined toll house. Every line on it is blank.' },
  ],
  toll_house: 'A ruined toll house. The roof is half gone, but somebody sweeps the floor.',
  waystation_bench: 'A log bench by the fire. Names have been carved into it and then smoothed away, one layer over another.',
  mere_shore: 'The mere. Not a ripple. Your reflection stands in the water a heartbeat behind you.',

  // nameless_hollow
  gate_sign: [
    { if: NHR, lines: 'HOLLOWMERE. In silver letters, over the gate. A chalk crown still sits on the O.' },
    { lines: 'The sign over the gate is blank. A chalk crown has been drawn in the middle of it, very carefully.' },
  ],
  proclamation: [
    { if: NHR, lines: [
      'PROCLAMATION. The town of HOLLOWMERE welcomes all travelers.',
      'Below it, still in a child\'s hand: WE ARE MORE THAN OUR REFLECTIONS. Someone has added: BUT WE LIKE THEM.',
    ] },
    { lines: [
      'A proclamation board. Where the town\'s name once stood, a child has drawn a looking glass.',
      'Beneath it: WE ARE MORE THAN OUR REFLECTIONS.',
    ] },
  ],
  plinth: [
    { if: NHR, lines: 'The plinth holds a new plaque: AUREL, WHO KEPT US. Under it, three signatures: the Watchmaker, the Ferryman, and the Sister.' },
    { lines: 'The plinth is empty. Three signatures remain: the Watchmaker, the Ferryman, and the Sister.' },
  ],
  fountain: [
    { if: NHR, lines: 'The Fountain of Faces. Every face in the square leans over it, laughing at itself.' },
    { lines: 'The Fountain of Faces. The water shows the sky, and the strangers in it. Nobody from town.' },
  ],
  sign_nh_inn: [
    { if: NHR, lines: 'THE SIGNLESS INN. Wren has decided to keep the name. A chalk crown hangs off the S.' },
    { lines: 'A blank inn sign, with a painted bed under it so travelers can guess.' },
  ],
  sign_nh_shop: [
    { if: NHR, lines: 'THE HOLLOW PROVISIONER. FITCH, PROP. YOU ARE A SHOP. YES YOU ARE.' },
    { lines: 'A blank shop sign. Under it, a paper label in an anxious hand: SHOP. FOR SURE. ASK FITCH.' },
  ],
  sign_nh_smithy: [
    { if: NHR, lines: 'SILVERGLASS SMITHY. GLASS AND STEEL. VESSA.' },
    { lines: 'A blank sign over the smithy. The glass in its window glows a little, all by itself.' },
  ],
  sign_nh_hall: [
    { if: NHR, lines: "MAYOR'S HALL, HOLLOWMERE. ELIAN, MAYOR. Underneath, smaller: AND AUREL, WHO WAS KING." },
    { lines: 'A blank sign over a big blank door. The door has a knocker shaped like a ledger.' },
  ],
  sign_nh_chapel: [
    { if: NHR, lines: 'CHAPEL OF THE CANDLES. FORTY-ONE LIGHTS AND ONE BELL.' },
    { lines: 'The chapel sign is blank. In the tower above it hangs an empty bell frame.' },
  ],
  clocktower: [
    { if: NHR, lines: "Lena's clocktower. It has hands again. It is running four minutes fast, and nobody minds." },
    { lines: "Lena's clocktower. The face is perfect and polished. It has no hands at all." },
  ],
  rune_shrine: "A small Keeper's shrine at the landing. The rune on it still glows, faintly silver.",
  nh_pier: [
    { if: 'court_ferry_open', lines: "Tovin's pier. The boat is untied and waiting, oars shipped." },
    { lines: "Tovin's pier. One boat, tied short, and a net spread out for mending." },
  ],
  nh_house: [
    { if: NHR, lines: 'A neat house with a new nameplate on the door. The paint is still wet.' },
    { lines: 'A neat house. The nameplate by the door is blank, and polished, as if someone still hopes.' },
  ],
  nh_flowers: 'Silver-blue flowers in a careful bed. They lean toward the mere, not the sun.',

  // nh_hall
  elian_desk_note: [
    { if: 'met_elian', lines: "Elian's desk. The ledger, a cold cup of tea, and a pen worn down to a stub." },
    { lines: 'A note on the mayor\'s desk, in a neat young hand: "At the fountain. Back soon. E."' },
  ],
  hall_mirror: [
    { if: NHR, lines: 'A wall mirror, crack and all. In it, the hall, the benches, and you. Everyone in it has a face.' },
    { lines: 'A wall mirror with a crack across one corner. It shows the hall, the benches, and you. Nobody else.' },
  ],
  hall_notice: [
    { if: NHR, lines: 'TOWN NOTICE: The town of HOLLOWMERE will hold a festival. Crowns provided. Ask Nico.' },
    { lines: 'TOWN NOTICE: (the title is blank). Market every morning. Fountain at dusk. Be kind to the mayor.' },
  ],

  // nh_chapel
  register: [
    { if: NHR, lines: 'The chapel register. Halfway down the page, on the line that was white, one name: AUREL.' },
    { if: 'met_anwen', lines: 'The chapel register. Halfway down the page, one line is perfectly white.' },
    { lines: 'The chapel register, open on its lectern. Anwen\'s hand fills every page, except one line.' },
  ],
  nh_candles: [
    { if: 'court_entered', lines: 'Forty-four candles. Forty-one for the town, and three new ones, close together.' },
    { lines: 'Forty-one candles.' },
  ],
  nh_bell_frame: [
    { if: NHR, lines: 'A bell rope hangs from the frame. The frame is still empty. The rope does not seem to mind.' },
    { lines: 'A bell rope hanging from an empty frame. The rope is worn smooth, as if someone rings nothing every night.' },
  ],
  nh_save_bell: 'A small silver hand-bell by the door. Ring it, and someone in Hollowmere will remember you were here.',
  nh_chapel_mirror: [
    { if: 'mirror_sigil_get', lines: 'A tall Keeper mirror. It ripples. Through it, faintly: twelve bell ropes and a thirteenth hook.' },
    { lines: 'A tall old mirror between the candles. It reflects them all, and adds one more.' },
  ],

  // nh_inn, nh_shop, nh_smithy
  lost_property: 'The lost-property shelf. Umbrellas, one boot, a birdcage, and a great many keys to doors nobody can name.',
  nh_guestbook: [
    { if: NHR, lines: 'The guest book. Wren has gone back through fifteen years and written HOLLOWMERE at the top of every page.' },
    { lines: 'The guest book. Every guest signed their name. Not one of them wrote where they were staying.' },
  ],
  fitch_shelves: 'Shelves of stock, each item labeled twice. The labels say what it is, then what it is for.',
  glass_furnace: [
    { if: 'court_f2_done', lines: 'The glass furnace roars white. The glass on the bench holds an edge you can see from across the room.' },
    { lines: 'A glass furnace, banked low. The glass beside it is cloudy, as if it is trying to remember something.' },
  ],

  // court_f1
  tovin_landing: [
    { if: 'nameless_king_defeated', lines: [{ who: 'tovin_c', text: 'You went in and came out. Both of you. All of you. Get in, I am rowing.' }] },
    { lines: [{ who: 'tovin_c', text: 'Boat is here when you want it. I row both ways. Mostly the one way, lately.' }] },
  ],
  great_door_court: 'The great door of the Court of Mirrors. It stands open. Its glass panels show the mere, and you, a heartbeat late.',
  court_wall_mirror: 'A tall wall mirror. Mira and Bram look back from it. Where you stand, there is only a smudge.',
  court_lens: 'A silverglass mirror on a turning stand. It catches the light and throws it somewhere else.',
  court_receptor: [
    { if: 'silverglass_lock_lit', lines: 'A crystal set in the wall, full of held moonlight. It hums.' },
    { lines: 'A crystal set in the wall, dark and cold. A silver inlay runs from it across the floor.' },
  ],
  glass_slot: 'A slit of clear glass through the wall. Too narrow for anyone. Wide enough for light.',
  court_glass_door: 'A door of cold glass with a keyhole like a frozen drop. It wants a glass key.',
  cracked_pane: 'A cracked pane in the wall. Cold air breathes through it. It sounds hollow when you tap it.',
  moon_window: 'A great moon window. The moon in it is not where the moon is outside.',
  silver_font: "A silver font. The water is so still it reflects the ceiling. It tastes like the first morning after rain.",

  // court_f2
  portrait_blank: 'A portrait of someone you almost know. The face is a smooth, pale blank, like paint not yet dry.',
  well_edge: 'The Well of Reflections. Its mirrored walls go down and down. Somewhere far below, a light is waiting.',
  glass_rail: [
    'A rail of dim glass running out over the drop. Too thin to stand on. In the right light, it might be a bridge.',
  ],
  reflection_pool: 'The reflection pool on the island. Still as a held breath.',
  great_mirror_f2: [
    { if: 'other_selves_defeated', lines: 'The great mirror is a stairway now. Its frame holds nothing but the way down.' },
    { lines: 'The great mirror at the end of the arena. In it the three of you stand very still.' },
  ],

  // court_f3
  black_floor: 'The floor is a black mirror. Your steps answer from underneath, a moment late.',
  vow_door_face: [
    { if: 'vow_door_open', lines: 'The vow door stands open. Its three crystals burn steady: belonging, mercy, courage.' },
    { lines: 'A door of dark glass with three crystals in its face: BELONGING. MERCY. COURAGE.' },
  ],
  vow_mirror: 'A vow mirror, framed in silver. Light brought here is kept here.',
  heavy_mirror: 'A heavy mirror on a stone stand. It turns, but it will not slide. Not for you.',
  floor_socket: 'A socket in the floor, ringed with silver inlay. Something heavy is meant to stand here.',
  glass_bench: 'A glass bench, cold as the mere. Someone sat here, not long ago.',
  court_note: [
    '"To whoever keeps the Court after me: a reflection is a name\'s shadow."',
    '"While someone keeps it, the name has a place to rest. Keep faces gently. Never keep the people."',
    'The signature has been cut out of the page.',
  ],

  // court_throne
  throne_glass: [
    { if: 'aurel_named', lines: 'An empty throne of glass. Nobody sits on it now, up here or down there.' },
    { lines: 'An empty throne of glass. In the floor beneath it, a crowned shape sits very still.' },
  ],
  great_mirror_throne: [
    { if: 'aurel_named', lines: 'The great mirror\'s frame holds the square of Hollowmere, in morning light. You could walk into it.' },
    { lines: 'The great mirror. The whole town is in it: roofs, the fountain, a festival, every face.' },
  ],
};

// Credits text lives in data/text.js; re-exported here so the story module is self-contained.
export const credits = CREDITS_EP2;

export default { scenes, lines, credits };
