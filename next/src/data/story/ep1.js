// Lexicon Quest NEXT, Episode 1: "The Missing Name".
// Every scripted scene, plus inspect text for signs, books, plaques and props.
//
// Scenes use ONLY the cutscene API (DESIGN 5.4). Exact signatures are in docs/story/STAGING.md
// ("Cutscene API as used by ep1.js"). Places and props are referenced by map mark / event names
// (strings) instead of tile coordinates, so map authors can move things without touching this file.
// Staging for every scene (who stands where, props, camera, music) is in docs/story/STAGING.md.
//
// Writing rules: one idea per box, at most 3 lines of 42 characters, no em dashes, {hero} = player name.

import { REWARDS } from '../quests.js';
import { CREDITS } from '../text.js';

// Speakers with 48x48 portraits (assets/sprites/portraits.json, ids `<id>_48`). Spawned stand-ins for an
// NPC use that NPC's portrait. Speakers not listed here have no portrait.
const PORTRAIT = {
  hero: 'hero', mira: 'mira', bram: 'bram', mael: 'mael', tess: 'tess', iris: 'iris', nella: 'nella', pell: 'pell',
  hazel: 'hazel', hob: 'hob', garrick: 'garrick', pip: 'pip',
  garrick_g: 'garrick', iris_g: 'iris', hazel_g: 'hazel',
};

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

// Wrap a scene: it only runs when its conditions hold (see SCENE_CONDITIONS), and input is locked for
// its whole run and always released. A trigger that fires at the wrong time is therefore harmless.
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

// ------------------------------------------------------------------------------------------------
// Prologue (title cards over the animated key art). Skippable by the prologue scene.
// ------------------------------------------------------------------------------------------------
export const PROLOGUE = [
  'In Aethelgard, every name is a promise.',
  'A promise that someone, somewhere, will remember.',
  'The Keepers wrote every name in the Book of Names, and the world held its shape.',
  'When the Keepers fell silent, they divided the Book among their archives and sealed the doors.',
  'Now, in the river valley of Willowmere, names have begun to fade.',
  'And last night, in a tower that holds twelve bells, a thirteenth bell rang.',
];

async function prologue(s) {
  await s.music('title');
  await s.fade('in', 60);
  for (const card of PROLOGUE) await s.title(card, { frames: 240 });
  await s.fade('out', 60);
}

// ------------------------------------------------------------------------------------------------
// 1. Waking up (hero_home). Runs on New Game after the prologue. Sets intro_done.
// ------------------------------------------------------------------------------------------------
async function wake_up(s) {
  await s.fade('in', 60);
  await s.emote('hero', 'zzz');
  await s.wait(40);
  await say(s, 'hazel', '{hero}! Up, up. The sun has been up for an hour, and so has the whole town.');
  await s.walk('hazel', 'bedside');
  await s.face('hazel', 'hero');
  await s.emote('hero', '!');
  await s.jump('hero');
  await s.walk('hero', ['down']);
  await s.face('hero', 'hazel');
  await say(s, 'hazel', 'There you are. You sleep like a stone at the bottom of the river.');
  await say(s, 'hazel', 'Did you hear the bells last night? Pip has been at the chapel since dawn, swearing he counted thirteen.');
  const c = await s.choice(['I heard them too.', 'Thirteen?']);
  if (c === 0) {
    await say(s, 'hazel', "Then I'm not the only one who lay awake counting. Good. Misery likes a crowd.");
  } else {
    await say(s, 'hazel', 'Thirteen. The tower holds twelve. Pip is beside himself, and he was never a small man to begin with.');
  }
  await say(s, 'hazel', "Elder Mael came by asking for you. He wouldn't say why.");
  await say(s, 'hazel', 'He had his worried face on. The one he thinks nobody notices.');
  await say(s, 'hazel', "Go and see him. He'll be in Lantern Square, by the well. And take these, in case his errand runs long.");
  await s.give('potion', 2);
  await say(s, 'hazel', "Breakfast is on the table. That wasn't a suggestion.");
  await s.setFlag('intro_done');
}

// Optional: talk to Hazel after meeting Mael, before leaving town. Gives a knitted mantle once.
async function hazel_farewell(s) {
  await say(s, 'hazel', 'So. The Archive.');
  await say(s, 'hazel', "Mael told me. Don't look at me like that. He tells me everything eventually, and usually first.");
  await s.emote('hazel', '...');
  await say(s, 'hazel', 'I knitted this over the winter. I was saving it for your birthday, but archives are only cellars with ambitions.');
  await s.give(REWARDS.hazel.item, REWARDS.hazel.qty);
  await say(s, 'hazel', "Come home with both boots and all ten fingers. That's all I ask. Well. That and letters.");
  await s.setFlag('hazel_farewell_done');
}

// ------------------------------------------------------------------------------------------------
// 2. The fading sign (willowmere). Trigger just outside the hero's front door, once, after intro_done.
// ------------------------------------------------------------------------------------------------
async function fading_sign(s) {
  await s.camera.panTo('bakery_sign', 40);
  await s.wait(30);
  await s.sfx('sign_fade');
  await s.setFlag('signs_fading');
  await narrate(s, "The bakery's lantern-sign flickers. Its painted name goes pale, then thin, then nothing at all.");
  await s.spawn('oren_out', { sprite: 'npc_baker', name: 'Oren', at: 'bakery_door', dir: 'down' });
  await s.walk('oren_out', ['down']);
  await s.face('oren_out', 'up');
  await s.emote('oren_out', '?');
  await say(s, 'oren_out', 'Huh.');
  await say(s, 'oren_out', 'That sign said something this morning. I painted it myself. Twice, because I got the first one crooked.');
  await s.camera.follow('hero');
  await s.face('oren_out', 'hero');
  await say(s, 'oren_out', '{hero}! You can read. What did my sign say?');
  const c = await s.choice(["Oren's Ovens.", "I can't remember either."]);
  if (c === 0) {
    await say(s, 'oren_out', "Oren's Ovens! Of course. Ha!");
    await s.wait(30);
    await s.emote('oren_out', '...');
    await say(s, 'oren_out', "Oren. That's... me. I'm Oren.");
    await say(s, 'oren_out', 'Long morning. Long, strange morning.');
  } else {
    await say(s, 'oren_out', "Then it's not just me.");
    await s.emote('oren_out', 'sweat');
    await say(s, 'oren_out', "That's worse, isn't it. That's a great deal worse.");
  }
  await say(s, 'oren_out', "Elder Mael's been pacing the square since dawn, asking after you. Go on. I'll find some paint.");
  await s.walk('oren_out', ['up']);
  await s.despawn('oren_out');
  await s.setFlag('saw_fading_sign');
}

// ------------------------------------------------------------------------------------------------
// 3. Meeting Mael (willowmere, Lantern Square). Talk to Mael after intro_done. Sets met_mael.
// ------------------------------------------------------------------------------------------------
async function mael_intro(s) {
  await s.face('mael', 'hero');
  await say(s, 'mael', 'Ah, there you are. Did you sleep through the bell again?');
  const c = await s.choice(['I was up early!', '...Maybe.']);
  if (c === 0) await say(s, 'mael', 'Up early, and still late. That is a rare gift. Treasure it.');
  else await say(s, 'mael', 'Honest, at least. Honesty is in short supply this morning.');
  await say(s, 'mael', "You saw Oren's sign. It is not the only one. The well, the chapel steps, half the shop boards in town.");
  await say(s, 'mael', 'Names are slipping off Willowmere like rain off a roof.');
  await s.camera.panTo('bell_tower', 50);
  await say(s, 'mael', 'And last night the tower rang thirteen times. It holds twelve bells. I have counted them every day for sixty years.');
  await s.camera.follow('hero');
  await say(s, 'mael', 'There is an old saying. When a name is taken from the world, a thirteenth bell tolls for it.');
  await s.emote('mael', '...');
  await say(s, 'mael', 'I would very much like that to be only a saying.');
  await say(s, 'mael', 'North of the valley stands the Rootbound Archive. The Keepers kept the first fragment of the Book of Names there.');
  await say(s, 'mael', 'If something is eating our names, that is where it will be eating. I need someone to go and look.');
  const c2 = await s.choice(['Why me?', "I'll go."]);
  if (c2 === 0) {
    await say(s, 'mael', 'Because you always come back.');
    await s.emote('mael', '...');
    await say(s, 'mael', 'Humor an old man. Say yes.');
  } else {
    await say(s, 'mael', 'I knew you would. You never could leave a locked door alone.');
  }
  await say(s, 'mael', 'But not alone. Find Mira at the library, east of the square. She has read every book on the Archive. Twice.');
  await say(s, 'mael', 'Then take the south gate. If Bram is on watch, tell him I sent you. Tell him twice. He is stubborn.');
  await s.setFlag('met_mael');
  // Mael's hidden fear: the player sees it, the hero only half notices.
  await s.face('mael', 'up');
  await s.emote('mael', '...');
  await narrate(s, 'Mael opens a heavy ledger, the Town Register, and runs a finger down one page.');
  await say(s, 'mael', '...Still there. Fainter than yesterday. But still there.');
  await s.emote('hero', '?');
  await s.face('mael', 'hero');
  await say(s, 'mael', 'Hm? Oh, nothing. An old man counting things. Go on, now.');
}

// ------------------------------------------------------------------------------------------------
// 4. Mira joins (library). Entry trigger inside the library door, met_mael and not mira_joined.
// ------------------------------------------------------------------------------------------------
async function mira_joins(s) {
  await s.camera.panTo('mira', 30);
  await say(s, 'mira', 'Forty-one books on the Rootbound Archive. Forty-one. And every one has lost the page about the door.');
  await say(s, 'mira', 'Not torn out. Not stolen. Blank. As if the ink got up in the night and left.');
  await say(s, 'iris', 'Mira. You have a visitor.');
  await s.face('mira', 'hero');
  await s.emote('mira', '!');
  await s.camera.follow('hero');
  await say(s, 'mira', "Oh. You're the Elder's errand. He said someone would come.");
  await say(s, 'mira', "He didn't say you'd be on time. I had a whole speech about patience ready.");
  await s.walk('mira', 'mira_meet');
  await s.face('mira', 'hero');
  await say(s, 'mira', 'Mira. Archivist apprentice. I reshelve, I copy, and I correct people. Mostly the last one.');
  await say(s, 'mira', "You're going to the Archive. I'd like to come. I know its floor plans, its seals, and which end of a staff to hold.");
  await s.face('iris', 'mira');
  await say(s, 'iris', 'Absolutely not. That place has been sealed for a hundred years, and you get lost in our reading room.');
  await say(s, 'mira', 'Once. And the reading room has two doors that look exactly alike.');
  await s.face('iris', 'hero');
  await say(s, 'iris', 'Forgive us. This girl is the finest apprentice I have taught in thirty years. Her name is...');
  await s.wait(40);
  await s.emote('iris', '...');
  await say(s, 'iris', 'Her name is...');
  await s.emote('mira', '...');
  await s.wait(70);
  await say(s, 'mira', "Mira. It's Mira.");
  await say(s, 'iris', 'Mira. Of course. Of course it is. I know that. I know you.');
  await say(s, 'mira', "Third time this week. I've started writing it on my sleeve.");
  await s.emote('iris', 'sweat');
  await say(s, 'iris', 'Go with them. Find out what is eating our names, before I lose something I cannot bear to lose.');
  await say(s, 'mira', "I'll bring the Book home with every name in it. Yours first.");
  await s.walk('mira', 'hero');
  await s.despawn('mira');
  await s.addMember('mira');
  await narrate(s, '{c:gold}Mira{/c} joined the party!');
  await say(s, 'mira', "Right. Lead the way. I'll be the one taking notes.");
  await s.setFlag('mira_joined');
}

// ------------------------------------------------------------------------------------------------
// 5. The south gate (willowmere). One trigger in front of the gate runs this; it branches.
// ------------------------------------------------------------------------------------------------
async function south_gate(s) {
  if (await s.hasFlag('bram_joined')) return;
  if (await s.hasFlag('mira_joined')) return bram_joins_body(s);
  await s.face('bram', 'hero');
  if (!(await s.hasFlag('met_mael'))) {
    await say(s, 'bram', "Halt. Nobody leaves town today, {hero}. Elder's orders. He's been asking for you, too.");
    await say(s, 'bram', "He's in the square, by the well. Go on. I'll still be here. I'm always here.");
  } else {
    await say(s, 'bram', "Mael's sending you to the Archive? Alone?");
    await say(s, 'bram', 'No. Nobody walks that road alone, not since the signs started. Find some company and come back.');
  }
  await s.walk('hero', ['up']);
}

async function bram_joins_body(s) {
  await s.face('bram', 'hero');
  await say(s, 'bram', 'Halt! Nobody... Mira?');
  await s.emote('bram', '?');
  await say(s, 'bram', "Mira, you've got a pack on. You get winded climbing the library ladder.");
  await say(s, 'mira', 'Eleven rungs. And I was carrying an atlas. A large one.');
  await say(s, 'bram', 'So it really is the Archive. Mael told me this morning. He told me twice.');
  await say(s, 'bram', "Fine. Then I'm coming. Somebody has to stop you two from reading the monsters to death.");
  await say(s, 'holt', 'You are on watch until noon, son.');
  await say(s, 'bram', "Put me down for leave, Sergeant. My father'll understand. He always says...");
  await say(s, 'bram', 'He says a guard who never leaves his gate is just a very tall gate.');
  await say(s, 'bram', 'If you see my father at the forge, tell him... tell...');
  await s.wait(40);
  await s.emote('bram', '...');
  await s.wait(40);
  await say(s, 'bram', "His name. My father's name. I said it at breakfast.");
  await say(s, 'bram', "I've said it my whole life. It's right there, and I can't...");
  await s.emote('mira', 'sweat');
  await s.wait(50);
  await say(s, 'holt', 'Garrick. Your father is Garrick, son.');
  await say(s, 'bram', 'Garrick.');
  await s.wait(30);
  await say(s, 'bram', 'Garrick. I know that.');
  await s.face('bram', 'down');
  await say(s, 'bram', "I lost my mother's name years ago, in the fire at Emberpeak. Her face, I've still got. Her name went with the smoke.");
  await say(s, 'bram', "I am not losing his.");
  await s.face('bram', 'hero');
  await say(s, 'bram', "I'm coming with you. That wasn't a question.");
  await say(s, 'holt', 'I will tell Garrick. I will tell him twice. And I will say his name every hour until you are back.');
  await say(s, 'bram', '...Thank you, Sergeant.');
  await s.walk('bram', 'hero');
  await s.despawn('bram');
  await s.addMember('bram');
  await narrate(s, '{c:gold}Bram{/c} joined the party!');
  await say(s, 'bram', "Right. South gate, then the north road up the valley. Let's go before I think about it.");
  await s.setFlag('bram_joined');
}

// Optional: visit Garrick at the smithy with Bram in the party. Gives the hero an axe once.
async function garrick_farewell(s) {
  await say(s, 'garrick', 'Heard you were leaving.');
  await say(s, 'bram', 'Heard right.');
  await s.emote('garrick', '...');
  await say(s, 'garrick', 'You. {hero}. A sword is a fine thing, but some doors want an axe. Take this one.');
  await s.give(REWARDS.garrick.item, REWARDS.garrick.qty);
  await say(s, 'garrick', 'Do not rush a forge. Do not rush a fight. Respect the rhythm, and come home.');
  await say(s, 'bram', 'Garrick.');
  await s.wait(30);
  await say(s, 'bram', 'I just wanted to say it. Out loud. While I can.');
  await say(s, 'garrick', 'I know my own name, son.');
  await s.wait(30);
  await say(s, 'garrick', 'But say it again when you are back.');
  await s.setFlag('garrick_farewell_done');
}

// ------------------------------------------------------------------------------------------------
// 6. Leaving town (willowmere). Trigger on the gate exit row, bram_joined, once. Sets left_town.
// ------------------------------------------------------------------------------------------------
async function leave_town(s) {
  await s.camera.panTo('town_sign', 30);
  await s.sfx('sign_fade');
  await s.flash('#ffffff', 4);
  await say(s, 'mira', 'The town sign.');
  await say(s, 'bram', "Don't.");
  await say(s, 'mira', "It's still there. Mostly. I can read it if I squint.");
  await say(s, 'bram', "Then don't squint. Walk.");
  await s.camera.follow('hero');
  await s.setFlag('left_town');
}

// ------------------------------------------------------------------------------------------------
// 7. Willowmere Valley. Arrival (first entry) and the milestone (inspect, first time).
// ------------------------------------------------------------------------------------------------
async function valley_arrival(s) {
  await say(s, 'bram', 'Smell that? Rain on the way. And sheep. Mostly sheep.');
  await say(s, 'mira', 'Willowmere Valley. Over the bridge, then the pilgrim road north to the Archive. Two hours on foot.');
  await say(s, 'mira', 'Assuming nothing eats us.');
  await say(s, 'bram', "Anything out here tries to eat you, you hit it first. That's the whole secret.");
  await s.setFlag('valley_arrived');
}

async function milestone(s) {
  await narrate(s, 'A weathered milestone. Its words are worn soft by centuries of passing hands.');
  await narrate(s, '"Every name is a promise that something will not be forgotten."');
  if (!(await s.hasFlag('mira_joined')) || (await s.hasFlag('saw_milestone'))) return;
  await say(s, 'mira', "The Keepers' first line. Every book I own begins with it.");
  if (await s.hasFlag('bram_joined')) {
    await say(s, 'bram', 'Every book you own is about the Keepers.');
    await say(s, 'mira', "Yes. That's how I know.");
  }
  await say(s, 'mira', 'Look at the last word. "Forgotten." It\'s fading faster than the rest.');
  if (await s.hasFlag('bram_joined')) {
    await say(s, 'bram', "That's not funny.");
    await say(s, 'mira', "No. It isn't.");
  }
  await s.setFlag('saw_milestone');
}

// The first fight (valley road, just outside the gate). A step trigger on the road; the wolf pack
// `e_wolves_a` (a chase enemy at the bend) cuts the party off. Unavoidable, four boxes, no signage: Bram's
// box carries the valley's first-enemy line, Mira's the free Appraise. Sets first_fight_done on a win; a
// loss is a Game Over and the trigger fires again on reload.
async function first_fight(s) {
  await s.camera.panTo('e_wolves_a', 40);
  await all(s.emote('bram', '!'), s.emote('mira', '!'));
  await s.walk('e_wolves_a', 'hero', { speed: 'run' });
  await s.camera.follow('hero');
  await say(s, 'bram', 'Wolves. They will come to us. Good. When one winds up to charge, Lunge: a Lunge breaks a charging foe.');
  await say(s, 'mira', "And Appraise one before you swing. It shows a foe's weak points, and it costs us nothing.");
  const result = await s.battle('valley_wolves', { canFlee: false });
  if (result !== 'win') return;
  await s.despawn('e_wolves_a');
  await say(s, 'mira', 'Spear. Wolves hate it. Noted.');
  await say(s, 'bram', "Everything hates a spear. That's the point of a spear.");
  await s.setFlag('first_fight_done');
}

// The Pilgrim's Rest campfire (valley fork). Object `campfire` with `rest: true`: the field runs the
// rest flow (Rest here?, full heal, save prompt) after this scene returns, so the scene never heals.
// First visit: the party sits, one choice, three boxes. Later visits: one box, then the rest offer.
async function campfire_rest(s) {
  if (await s.hasFlag('campfire_rested')) {
    await say(s, 'bram', "Fire's still warm. Sit a minute, {hero}. The road isn't going anywhere.");
    return;
  }
  await all(s.emote('bram', 'music'), s.emote('mira', '...'));
  await say(s, 'bram', 'A warm fire on a long road. Even heroes need a sit-down. Go on, sit.');
  const c = await s.choice(['Ask Bram about Emberpeak', 'Ask Mira about the Archive', 'Just rest']);
  if (c === 0) {
    await say(s, 'bram', 'Emberpeak. A forge town, high up where the snow starts. Every roof was copper. You could see it shine from two valleys off.');
    await say(s, 'bram', 'The fire took the lower town in one night. I was nine. My father carried me out. My mother went back in for the neighbors.');
    await say(s, 'bram', "They got out. She didn't. I kept her face. Her name went with the smoke. That's all I'm saying tonight. Pass the kettle.");
  } else if (c === 1) {
    await say(s, 'mira', 'Sealed a hundred years ago by the Keepers themselves. Nobody knows why. The page that would tell us went blank.');
    await say(s, 'mira', 'Three floors, the books agree on that much: the Catalog Halls, the Reading Galleries, and the Rootbound Stacks.');
    await say(s, 'mira', 'The Keepers loved a lock and hated a straight corridor. If a room looks finished, assume a key or a switch.');
  } else {
    await say(s, 'bram', "Hazel put apples in your pack, {hero}. I checked. Don't give me that look, I was hungry.");
    await say(s, 'mira', 'And mine?');
    await say(s, 'bram', "Eleven pencils, Mira. Eleven. I counted. I thought you'd want them counted.");
  }
  await s.setFlag('campfire_rested');
}

// ------------------------------------------------------------------------------------------------
// 8. The Archive door (valley, north end). Trigger on the door step. Sets archive_entered.
// ------------------------------------------------------------------------------------------------
async function archive_door(s) {
  await s.camera.panTo('archive_door', 60);
  await narrate(s, 'The Rootbound Archive: a library grown into the roots of a vast willow. Or a willow grown through a library.');
  await say(s, 'mira', 'Nobody knows which came first. The Keepers argued about it for two hundred years.');
  await say(s, 'bram', 'Two hundred years. About a tree.');
  await say(s, 'mira', 'About a library.');
  await narrate(s, 'Carved above the great door: SPEAK, AND BE KEPT.');
  await say(s, 'mira', "Keeper doors ask for a name. Say yours, plainly. It's a formality.");
  await s.walk('bram', 'door_step');
  await say(s, 'bram', 'Bram. Son of Garrick.');
  await s.sfx('name_restore');
  await narrate(s, "A ring of light kindles in the door's carving.");
  await s.walk('bram', ['left']);
  await s.walk('mira', 'door_step');
  await say(s, 'mira', 'Mira. Apprentice to Iris of Willowmere.');
  await s.sfx('name_restore');
  await narrate(s, 'The ring brightens.');
  await s.walk('mira', ['right']);
  await s.walk('hero', 'door_step');
  await s.face('hero', 'up');
  await narrate(s, 'You speak your name.');
  await s.wait(50);
  await s.shake(1, 20);
  await narrate(s, 'The light flickers... and dims.');
  await s.emote('mira', '?');
  await say(s, 'mira', "It didn't hear you. Say it again. Louder.");
  await narrate(s, 'You say it again. The light gutters like a candle in a draft.');
  await s.emote('bram', '...');
  await s.face('bram', 'up');
  await say(s, 'bram', "{hero}. That's {hero}. I've known them since they were knee-high and threw a mud pie at me.");
  await s.face('mira', 'up');
  await say(s, 'mira', '{hero}. Witnessed. Twice.');
  await s.sfx('door_rumble');
  await s.shake(2, 40);
  await narrate(s, 'The light swells. With a groan of root and stone, the door swings inward.');
  await s.setFlag('archive_entered');
  await s.face('mira', 'hero');
  await say(s, 'mira', "Old doors. Hard of hearing. That's all it was.");
  await say(s, 'bram', 'Right. Old door.');
  await all(s.emote('mira', '...'), s.emote('bram', '...'));
  await s.camera.follow('hero');
}

// ------------------------------------------------------------------------------------------------
// 9. Archive F1, the Catalog Halls.
// ------------------------------------------------------------------------------------------------
async function archive_f1_arrival(s) {
  await s.music('archive');
  await say(s, 'mira', 'The Catalog Halls. Every name the Keepers ever wrote was indexed in these drawers.');
  await s.walk('mira', 'catalog_drawer');
  await s.face('mira', 'up');
  await s.sfx('page_flutter');
  await say(s, 'mira', 'Blank. This one too. All of them.');
  await say(s, 'mira', 'Not torn. Not burned. Look at the edges. Something has been nibbling.');
  await say(s, 'bram', 'Something is eating index cards?');
  await say(s, 'mira', 'Something is eating names. The cards were just the plate.');
  await say(s, 'bram', 'Old stone, new trouble. We go slow, and we go together.');
  await s.camera.follow('hero');
  await s.setFlag('f1_arrived');
}

async function find_letter_1(s) {
  await s.sfx('page_flutter');
  await narrate(s, 'A letter lies in the dust, sealed with a thumbprint of flour.');
  await say(s, 'mira', "Willowmere post. That's Tess's courier stamp on the corner.");
  await narrate(s, '"Oren, I put too much honey in the rolls again. Keep one for me. I will be home before the bell. Hal"');
  await say(s, 'bram', "Oren has a brother? I never knew Oren had a brother.");
  await say(s, 'mira', "None of us did. I think that's the point.");
  await s.give('tess_letter_1');
  await s.setFlag('tess_letter_1_found');
}

async function archive_f1_bell(s) {
  await s.sfx('bell_toll');
  await s.shake(2, 40);
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await say(s, 'mira', "That's it. That's the sound from last night.");
  await say(s, 'bram', "It's coming from under us.");
  await say(s, 'mira', 'The thirteenth bell is down there. Somewhere in the Archive.');
  await say(s, 'bram', 'Then we go down.');
  await s.setFlag('archive_f1_done');
  // The toll shakes the Keepers' back-stair open (F1 events shortcut_b / shortcut_j, gated on archive_f1_done).
  await s.sfx('door_rumble');
  await s.shake(1, 20);
  await narrate(s, 'The toll has shaken a panel loose beside the stairs: a narrow back-stair, running down to the antechamber by the entrance.');
  await say(s, 'bram', "Good. Next time we come this way, it's the short way.");
}

// ------------------------------------------------------------------------------------------------
// 10. Archive F2, the Reading Galleries. Echo Warden, the Lantern of Recall.
// ------------------------------------------------------------------------------------------------
async function archive_f2_arrival(s) {
  await narrate(s, 'Faint shapes sit at the reading desks: readers made of pale ink, turning pages that are not there.');
  await s.emote('mira', 'heart');
  await say(s, 'mira', 'Echoes. Impressions left by people who read here every day for years. The Archive remembers them.');
  await say(s, 'bram', "They're not going to get up, are they?");
  await say(s, 'mira', "They've been reading for a hundred years. I doubt we're more interesting.");
  await narrate(s, 'Somewhere ahead, a voice is repeating itself.');
  await s.setFlag('f2_arrived');
}

async function find_letter_2(s) {
  await s.sfx('page_flutter');
  await narrate(s, 'A letter is tucked under a reading lamp. The envelope is water-stained and addressed to "Edda, by the river beds."');
  await narrate(s, '"Mother, the ferry rope held. You were right: make room for the river instead of fighting it."');
  await narrate(s, '"Let us mend the next boat together. Nella"');
  await say(s, 'bram', "Nella from the ferry? Writing to old Edda? Edda isn't her mother. Is she?");
  await say(s, 'mira', 'If Nella wrote "Mother" on it, she is. They just stopped remembering.');
  await say(s, 'mira', 'They pass each other by the river every day, Bram. Like polite strangers.');
  await s.give('tess_letter_2');
  await s.setFlag('tess_letter_2_found');
}

async function echo_warden(s) {
  if (await s.hasFlag('echo_warden_defeated')) return;
  await s.music(null);
  await s.camera.panTo('echo_warden', 40);
  await s.wait(30);
  await say(s, 'echo_warden', '...WHO COMES... WHO COMES... COMES...');
  await say(s, 'bram', "We're here for the lantern.");
  await say(s, 'echo_warden', '...THE LANTERN... THE LANTERN...');
  await s.shake(2, 20);
  await say(s, 'echo_warden', 'NONE SHALL READ WHAT WAS NOT WRITTEN FOR THEM.');
  await say(s, 'mira', "It's an echo of the last order its Keeper gave. It will fight until the order runs out.");
  await say(s, 'bram', "Then let's help it run out.");
  await say(s, 'echo_warden', '...RUN OUT... RUN OUT...');
  await say(s, 'mira', 'Watch its stance. One stance turns back magic, the other turns back steel. Read it before you swing.');
  // Boss intro: name card, a jolt, then the battle theme and the swirl.
  await s.title('ECHO WARDEN', { sub: 'Knight of the Last Order', frames: 100 });
  await s.shake(3, 24);
  await s.flash('#ffffff', 8);
  await s.music('battle');
  const result = await s.battle('echo_warden', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.camera.panTo('echo_warden', 20);
  await say(s, 'echo_warden', '...keep them...');
  await say(s, 'echo_warden', '...keep... their names...');
  await s.flash('#ffffff', 10);
  await s.sfx('page_flutter');
  await s.despawn('echo_warden');
  await say(s, 'mira', "That wasn't the order it fought for. That was underneath it. What its Keeper really wanted.");
  await say(s, 'bram', "Keep their names. Yeah. We're trying.");
  await s.camera.follow('hero');
  await s.music('archive');
  await s.setFlag('echo_warden_defeated');
}

async function lantern_get(s) {
  if (!(await s.hasFlag('echo_warden_defeated')) || (await s.hasFlag('lantern_get'))) return;
  await narrate(s, 'On the pedestal sits a lantern of green bronze. Its glass is etched with writing too small to read.');
  await s.give('lantern_of_recall');
  await s.sfx('lantern_reveal');
  await s.flash('#9fe8c8', 20);
  await s.setFlag('lantern_get');
  await narrate(s, 'The wick catches without a flame. Green light spills across the gallery, and words rise on the wall.');
  await narrate(s, '"A Keeper pledged that no name could be erased without a living witness."');
  await say(s, 'mira', 'The Lantern of Recall. It shows ink that was written and then hidden. Ink remembers, even when paper forgets.');
  await say(s, 'bram', "So it's a lamp that finds things.");
  await say(s, 'mira', "It's a priceless relic of the Keepers' order that restores concealed text.");
  await say(s, 'bram', 'A lamp that finds things.');
  await say(s, 'mira', "...Yes. Fine. It's a lamp that finds things.");
  await say(s, 'mira', "If a path ends where it shouldn't, raise the Lantern with {i:btn_pageR}. The Keepers hid their bridges in ink.");
}

async function archive_f2_exit(s) {
  await say(s, 'mira', "Every bridge on this floor was written in hidden ink. The Keepers didn't want just anyone going deeper.");
  await say(s, 'bram', 'What did they want to keep down there?');
  await say(s, 'mira', 'Or keep in.');
  await s.setFlag('archive_f2_done');
}

// ------------------------------------------------------------------------------------------------
// 11. Archive F3, the Rootbound Stacks. The thirteenth bell, the boss door.
// ------------------------------------------------------------------------------------------------
async function archive_f3_arrival(s) {
  await narrate(s, 'The Rootbound Stacks. Roots as thick as houses have split the shelves, and the shelves have learned to move.');
  await s.sfx('shelf_move');
  await say(s, 'bram', 'Did that shelf just move?');
  await say(s, 'mira', 'Yes.');
  await say(s, 'bram', "Shelves shouldn't move.");
  await say(s, 'mira', 'These were built to. The Keepers moved the stacks to keep thieves lost. Or readers. Possibly both.');
  await s.setFlag('f3_arrived');
}

async function find_letter_3(s) {
  await s.sfx('page_flutter');
  await narrate(s, 'Wedged between two roots is a letter, far older than the others. The envelope is soft as cloth.');
  await narrate(s, '"Tess, do not wait for a grand story. Bring the little ones home."');
  await narrate(s, '"A recipe, a crossing, a promise to return. That is a life worth keeping. Your father."');
  await narrate(s, 'Below that, where a name should be, the paper has been eaten through.');
  await s.emote('mira', '...');
  await say(s, 'mira', 'This has been down here for years. Not weeks. Years.');
  await say(s, 'bram', "Tess's father carried the post north when she was small. He never came back.");
  await say(s, 'bram', "She walks the north road every spring. Says she's delivering. I think she's looking.");
  if ((await s.hasFlag('tess_letter_1_found')) && (await s.hasFlag('tess_letter_2_found'))) {
    await say(s, 'mira', 'A recipe. A crossing. As if he knew which letters we would find first.');
  }
  await say(s, 'mira', "Then we bring her this. It's a start.");
  await s.give('tess_letter_3');
  await s.setFlag('tess_letter_3_found');
}

async function thirteenth_bell(s) {
  await s.camera.panTo('thirteenth_bell', 60);
  await narrate(s, 'In a hollow among the roots hangs a great bronze bell, green with age and cracked from lip to crown.');
  await say(s, 'mira', 'The thirteenth bell. Pip showed me the empty hook in our tower once. I thought it was a story.');
  await narrate(s, 'Words are cast around its rim: RUNG FOR EVERY NAME THE WORLD FORGETS, SO THAT SOMEONE WILL NOTICE.');
  await say(s, 'mira', "It isn't a curse. It's an alarm. The Keepers made it to ring whenever a name is taken.");
  await say(s, 'mira', "Its voice runs down the roots, under the whole valley. Under our tower. That's what the town heard.");
  await say(s, 'bram', 'So every time it rings...');
  await s.sfx('bell_toll');
  await s.shake(2, 50);
  await s.wait(60);
  await say(s, 'bram', 'Who was that? Who did we just lose?');
  await say(s, 'mira', "We'll never know. That's what it means to forget someone.");
  await s.emote('bram', 'anger');
  await say(s, 'bram', "Then let's go and stop whatever's doing the eating.");
  await s.camera.follow('hero');
  await s.setFlag('found_thirteenth_bell');
}

async function boss_door(s) {
  if (await s.hasFlag('boss_door_open')) return;
  if (!(await s.hasFlag('stacks_key_found'))) {
    await say(s, 'bram', "Locked. The keyhole's the size of my fist.");
    await say(s, 'mira', "That takes the Stacks Key. It's somewhere on this floor, guarded by something irritating.");
    return;
  }
  await s.sfx('ink_gurgle');
  await narrate(s, 'Ink seeps from under the great door, slow and black. Behind it, something is chewing.');
  await say(s, 'bram', 'Hear that?');
  await say(s, 'mira', "It's eating. It's eating right now.");
  await say(s, 'mira', 'The notes upstairs say it warns before it feeds. When it draws a breath, we brace.');
  await say(s, 'bram', "And if it fixes its eyes on one of you, I'm standing in front of you. That's what guards are for.");
  const c = await s.choice(["Let's go.", 'Not yet.']);
  if (c === 1) {
    await say(s, 'mira', "Sensible. There's a Keeper's font back the way we came. We should go in at our best.");
    return;
  }
  await s.take('stacks_key');
  await s.sfx('door_rumble');
  await s.shake(2, 30);
  await s.setFlag('boss_door_open');
  await say(s, 'bram', 'Our road brought us here. Hold fast.');
}

// ------------------------------------------------------------------------------------------------
// 12. The Archivore (archive_boss). Entry trigger. Sets archivore_defeated.
// ------------------------------------------------------------------------------------------------
async function archivore(s) {
  if (await s.hasFlag('archivore_defeated')) return;
  await s.music(null);
  await s.camera.panTo('archivore', 40);
  await s.wait(30);
  await narrate(s, "The chamber is a hollow in the willow's heart. Pages drift through the air like slow snow.");
  await narrate(s, 'In the middle of it all, something vast is eating.');
  await s.sfx('ink_gurgle');
  await say(s, 'archivore', '...OREN... IRIS... GARRICK...');
  await say(s, 'bram', "Those are our names. It's saying our names.");
  await say(s, 'mira', "It's tasting them.");
  await s.face('archivore', 'down');
  await s.shake(2, 30);
  await say(s, 'archivore', '...{hero}...');
  await all(s.emote('hero', '!'), s.emote('mira', '!'), s.emote('bram', '!'));
  await say(s, 'archivore', '{hero}. ON THE LIST. NEXT ON THE LIST.');
  await say(s, 'archivore', 'NAMES ARE HEAVY. THE LIST SAYS: LET THEM GO.');
  await say(s, 'bram', "Nobody's letting anybody go.");
  await say(s, 'mira', 'A list. Someone gave it orders.');
  await say(s, 'mira', 'Keep saying each other\'s names. A name is harder to eat while someone is holding it.');
  // Boss intro: name card, a jolt, then its own theme and the swirl.
  await s.title('THE ARCHIVORE', { sub: 'Eater of Names', frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_archivore');
  const result = await s.battle('archivore', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await archivore_after(s);
}

async function archivore_after(s) {
  await s.camera.panTo('archivore', 20);
  await s.shake(4, 60);
  await s.flash('#ffffff', 20);
  await narrate(s, 'The Archivore shudders. Ink pours off it like rain off a roof, and underneath...');
  await narrate(s, '...underneath is something small, papery and old, curled up like a moth in winter.');
  await say(s, 'mira', 'A keeper-beast. The Keepers raised them to eat mildew and rot, to protect the books.');
  await say(s, 'mira', 'The journal upstairs named her. Moth. She was somebody\'s.');
  await say(s, 'mira', 'Someone taught Moth to eat names instead.');
  await narrate(s, 'At the sound of her name, the little creature sighs once, and crumbles into dry pages.');
  await s.sfx('page_flutter');
  await s.despawn('archivore');
  await s.camera.panTo('fragment_spot', 40);
  await s.sfx('name_restore');
  await s.flash('#fff2b0', 16);
  await narrate(s, 'Something settles at your feet: a single great page, edged in gold and covered in names.');
  await s.give('name_fragment_1');
  await s.music('triumph');
  await say(s, 'mira', "Willowmere's names. All of them. Oren. Tess. Iris. Pip.");
  await say(s, 'bram', 'Garrick.');
  await s.emote('bram', 'heart');
  await say(s, 'bram', 'There he is.');
  await narrate(s, 'Among the drifting pages, one is different: cheap paper, and a cold, careful hand. A list.');
  await say(s, 'mira', 'Names. Every one crossed out. Hal. Edda. Garrick.');
  await say(s, 'mira', 'Mira.');
  await s.wait(30);
  await say(s, 'mira', "Someone wrote this for it. Someone sat at a desk and decided who we'd forget.");
  await s.emote('mira', '...');
  await say(s, 'mira', 'The last name is not crossed out.');
  await say(s, 'mira', "It's {hero}.");
  await say(s, 'bram', "Why would anyone want {hero}'s name?");
  await say(s, 'mira', "I don't know. But someone wrote it on purpose, in ink that doesn't fade.");
  await narrate(s, 'On the golden page, the names brighten one by one. All but one.');
  await narrate(s, 'Near the bottom, your own name stays faint, like writing seen through water.');
  await say(s, 'mira', 'Yours is still faint.');
  await say(s, 'bram', "It'll come back. They all came back.");
  await say(s, 'mira', '...Maybe it just takes longer.');
  // The legendary: given here, with its own line, so the player sees it land (not a silent battle drop).
  await s.camera.panTo('archivore', 30);
  await s.sfx('name_restore');
  await narrate(s, 'Where Moth lay, the ink draws back from something long and bright: an old sword, its edge the green of the Lantern\'s glass.');
  await s.give('lanternheart');
  await say(s, 'mira', 'Lanternheart. Every Keeper archive kept one blade, for the day its books needed more than a lock. Yours now, {hero}.');
  await s.camera.panTo('fragment_spot', 30);
  await narrate(s, 'Warm air moves through the roots. Between them, a passage opens toward daylight.');
  await say(s, 'bram', "Let's go home.");
  await s.setFlag('archivore_defeated');
  await s.camera.follow('hero');
}

// ------------------------------------------------------------------------------------------------
// 13. Return to Willowmere. Entry trigger at the south gate after archivore_defeated, once.
// ------------------------------------------------------------------------------------------------
async function return_to_willowmere(s) {
  await s.music('triumph');
  await s.camera.panTo('town_sign', 40);
  await s.sfx('name_restore');
  await s.flash('#fff2b0', 12);
  await narrate(s, "Above the gate, the town's name burns bright again: WILLOWMERE.");
  await s.camera.follow('hero');
  await s.sfx('name_restore');
  await narrate(s, 'One by one, the shop signs light up as you pass. Doors open. People come out to read them aloud.');
  await s.walk('hero', 'return_spot');
  await s.face('hero', 'down');
  await s.walk('holt', 'meet_holt', { speed: 'run' });
  await s.face('holt', 'bram');
  await say(s, 'holt', "Bram! Garrick! Your father's name is Garrick!");
  await say(s, 'holt', 'Said it every hour, like I promised. Half the town thinks I have gone soft in the head.');
  await say(s, 'bram', 'I know it, Sergeant. I know it on my own.');
  await say(s, 'holt', 'Good lad. Then go and say it to his face. Here he comes.');
  await s.spawn('garrick_g', { sprite: 'npc_smith', name: 'Garrick', at: 'gather_garrick', dir: 'down' });
  await s.walk('garrick_g', 'meet_garrick');
  await s.face('garrick_g', 'bram');
  await s.face('bram', 'garrick_g');
  await say(s, 'bram', 'Garrick.');
  await say(s, 'garrick_g', 'Took your time.');
  await say(s, 'bram', 'I said your name the whole way home.');
  await say(s, 'garrick_g', 'I know. I heard.');
  await all(s.emote('bram', 'heart'), s.emote('garrick_g', 'heart'));
  await s.spawn('iris_g', { sprite: 'npc_scholar', name: 'Iris', at: 'gather_iris', dir: 'down' });
  await s.walk('iris_g', 'meet_iris');
  await s.face('iris_g', 'mira');
  await say(s, 'iris_g', 'Mira.');
  await s.emote('mira', '!');
  await say(s, 'mira', 'First try.');
  await say(s, 'iris_g', 'First try. And every try after, for as long as I live.');
  await s.spawn('oren_g', { sprite: 'npc_baker', name: 'Oren', at: 'gather_oren', dir: 'down' });
  await s.walk('oren_g', 'meet_oren', { speed: 'run' });
  await say(s, 'oren_g', "I can read my sign! OREN'S OVENS! And I have a brother!");
  await say(s, 'oren_g', 'His name is Hal! He came down from the mill at dawn, shouting it, and he is furious with all of us!');
  await s.spawn('hazel_g', { sprite: 'npc_parent', name: 'Hazel', at: 'gather_hazel', dir: 'down' });
  await s.walk('hazel_g', 'meet_hazel');
  await s.face('hazel_g', 'hero');
  await say(s, 'hazel_g', 'Both boots. Ten fingers.');
  await s.emote('hazel_g', 'heart');
  await say(s, 'hazel_g', 'Good. Now I can breathe again.');
  await s.walk('mael', 'meet_mael', { speed: 'slow' });
  await s.face('mael', 'hero');
  await say(s, 'mael', 'You did it. Every sign in Willowmere has its name back. Every name in this book.');
  await narrate(s, 'Mael opens the Town Register. His finger stops near the bottom of the page.');
  await s.emote('mael', '...');
  await say(s, 'mael', 'Every name but one.');
  await say(s, 'mael', '{hero}. Yours began to fade a month ago. Before the signs. Before the bell.');
  await say(s, 'mael', 'I did not tell you. I was afraid that saying it aloud would make it true.');
  const c = await s.choice(['Why my name?', 'You should have told me.']);
  if (c === 0) {
    await say(s, 'mael', 'I do not know. I have read every page I own, and I do not know.');
  } else {
    await say(s, 'mael', 'Yes. I should have. An old man\'s fear is a poor excuse, and it is the only one I have.');
  }
  await say(s, 'mira', "Someone put {hero}'s name on a list. We found it in the Archive, with all of yours crossed out.");
  await say(s, 'mira', 'Below the names, a place was scratched out so hard the pen tore through the paper.');
  await s.emote('mael', '!');
  await say(s, 'mael', 'East of the river there is a town no map remembers. Travelers call it the Nameless Hollow.');
  await say(s, 'mael', 'They say its people cannot recall what their own home is called.');
  await s.emote('mira', '...');
  await say(s, 'mira', "I came to Willowmere from the east, when I was small. I've never been able to say where from.");
  await say(s, 'bram', "Then that's where we go next. All three of us.");
  await say(s, 'mael', 'Rest first. Tonight Willowmere rings its bells for every name that came home.');
  await s.setFlag('returned_home');
  await ending_hook(s);
}

// ------------------------------------------------------------------------------------------------
// 14. The ending hook (willowmere at night), straight after the return. Sets ep1_complete.
// The integrator pushes the credits scene (data: CREDITS in data/text.js) once ep1_complete is set.
// ------------------------------------------------------------------------------------------------
async function ending_hook(s) {
  await s.fade('out', 60);
  for (const id of ['garrick_g', 'iris_g', 'oren_g', 'hazel_g']) await s.despawn(id);
  await s.tint('night', 0);
  await s.music(null);
  await s.camera.panTo('bell_tower', 0);
  await s.fade('in', 90);
  // Timings follow W1-audio's files: bell_peal is 4.25 s, bell_toll 3.21 s.
  await s.sfx('bell_peal');
  await s.wait(60);
  await narrate(s, "That night, Willowmere's twelve bells ring out, one for every family, and the whole valley hears them.");
  await s.wait(150);
  await narrate(s, 'The last note fades. And in the quiet after it...');
  await s.wait(60);
  await s.sfx('bell_toll');
  await s.wait(180);
  await s.camera.follow('hero');
  await say(s, 'mira', '...Thirteen.');
  await s.emote('bram', '!');
  await s.emote('hero', '...');
  await s.music('mystery');
  await narrate(s, 'Somewhere, someone has just been forgotten.');
  await s.fade('out', 120);
  await s.title('End of Episode 1', { sub: 'The Missing Name', frames: 240 });
  await s.title('Episode 2: The Town Without a Name', { sub: 'The road east is waiting.', frames: 240 });
  await s.setFlag('ep1_complete');
}

// ------------------------------------------------------------------------------------------------
// Side quest: Letters for the Living (Tess). Talk to Tess; this scene starts, delivers and rewards.
// ------------------------------------------------------------------------------------------------
async function tess_letters(s) {
  const inHand = [];
  for (const n of [1, 2, 3]) {
    if ((await s.hasFlag(`tess_letter_${n}_found`)) && !(await s.hasFlag(`tess_letter_${n}_delivered`))) inHand.push(n);
  }
  if (!(await s.hasFlag('tess_quest_started'))) {
    await say(s, 'tess', "{hero}! You haven't seen any letters blowing about, have you? Three of them?");
    await say(s, 'tess', 'They jumped out of my satchel last week. Jumped! Like startled sparrows. Then they flew north.');
    await say(s, 'tess', "Toward the Archive. Letters don't fly. I've carried the post for six years. Letters. Do. Not. Fly.");
    // If the player already picked some up, skip the plea and let the surprise land.
    if (inHand.length === 0) await say(s, 'tess', "If you're going that way, bring them home? A courier never loses a letter. Never.");
    await s.setFlag('tess_quest_started');
  }
  if (inHand.length === 0) {
    if ((await s.hasFlag('tess_letter_1_delivered')) || (await s.hasFlag('tess_letter_2_delivered')) || (await s.hasFlag('tess_letter_3_delivered'))) {
      await say(s, 'tess', "The rest are still out there. Letters like to hide where it's quiet. Deep down, I'd guess.");
    }
    return;
  }
  await s.emote('tess', '!');
  await say(s, 'tess', 'You found them! Oh, look at them. Dusty, but whole.');
  if (inHand.includes(1)) {
    await s.take('tess_letter_1');
    await s.setFlag('tess_letter_1_delivered');
    await say(s, 'tess', "Oren's. From... Hal? Who's Hal?");
    if (await s.hasFlag('mira_joined')) await say(s, 'mira', "Oren's brother, we think. Give it to him gently.");
    await say(s, 'tess', "I'll run it to the bakery myself. A courier delivers. That's the whole job.");
  }
  if (inHand.includes(2)) {
    await s.take('tess_letter_2');
    await s.setFlag('tess_letter_2_delivered');
    await say(s, 'tess', 'Nella\'s, addressed to "Edda, by the river beds." Edda is Nella\'s mother? Since when?');
    if (await s.hasFlag('bram_joined')) await say(s, 'bram', "Since always, I think. That's the awful part.");
    await say(s, 'tess', "Then I'll put it in Edda's hands and stand there until Nella comes to see why.");
  }
  if (inHand.includes(3)) {
    await s.take('tess_letter_3');
    await s.setFlag('tess_letter_3_delivered');
    await say(s, 'tess', 'This one is addressed to... me.');
    await s.wait(40);
    await say(s, 'tess', "That's my father's hand. I'd know it anywhere. He crossed his sevens.");
    await s.emote('tess', '...');
    await say(s, 'tess', 'He knew I would come looking.');
    await say(s, 'tess', "I can't remember his name. I've tried every night for years. But he wrote to me. He wrote to me.");
  }
  let done = true;
  for (const n of [1, 2, 3]) if (!(await s.hasFlag(`tess_letter_${n}_delivered`))) done = false;
  if (!done) {
    await say(s, 'tess', "That leaves the rest. Bring them when you find them. I'll be right here.");
    return;
  }
  await say(s, 'tess', "Three letters, home again. Thank you. You don't know what that means to a courier.");
  await say(s, 'tess', "Take my traveling boots. They've walked every road in this valley. They'll walk you home.");
  await s.give(REWARDS.tess.item, REWARDS.tess.qty);
  await s.setFlag('tess_quest_done');
}

// ------------------------------------------------------------------------------------------------
// Side quest: The Runaway Starter (Oren). Start by talking to Oren; the dough hides by the forge.
// ------------------------------------------------------------------------------------------------
async function oren_starter(s) {
  if (!(await s.hasFlag('starter_quest_started'))) {
    await say(s, 'oren', 'Have you seen my starter? My sourdough starter. Big, pale, about so wide. Answers to nothing.');
    await say(s, 'oren', "It crawled out of its crock in the night. They do that when they're happy. Or offended.");
    await say(s, 'oren', "There's a trail of flour out the back door, heading for the warm side of town. Find it, would you?");
    await s.setFlag('starter_quest_started');
    return;
  }
  if (!(await s.hasFlag('starter_found'))) {
    await say(s, 'oren', "No sign of it? Dough goes where it's warm. Follow the heat, and you'll find my starter.");
    return;
  }
  await s.emote('oren', '!');
  await say(s, 'oren', 'You found it! By the forge? Of course. It always did like Garrick better.');
  await narrate(s, 'Oren eases the dough back into its crock. A label on the crock reads: HAL\'S. DO NOT TOUCH. THIS MEANS YOU, OREN.');
  if ((await s.hasFlag('tess_letter_1_delivered')) || (await s.hasFlag('archivore_defeated'))) {
    await say(s, 'oren', "Hal. My brother wrote that. Twenty years ago, and he's still bossing me about.");
  } else {
    await s.emote('oren', '?');
    await say(s, 'oren', "Whoever Hal is, he's very rude. And he knows my name.");
  }
  await say(s, 'oren', "Here. For the road. Don't eat them all at once. They're medicine, not breakfast.");
  await s.give(REWARDS.starter.item, REWARDS.starter.qty);
  await s.setFlag('starter_done');
}

async function starter_found(s) {
  if (await s.hasFlag('starter_found')) return;
  await narrate(s, 'A lump of pale dough has made itself at home beside the forge, rising happily in the heat.');
  await say(s, 'garrick', "Came in last night. Warm, and rising. Didn't have the heart to throw it out.");
  await narrate(s, 'You scoop up the dough. It wobbles, offended, then settles in your arms.');
  await s.despawn('starter_dough');
  await s.setFlag('starter_found');
}

// ------------------------------------------------------------------------------------------------
// Side quest: Wick's Name-Tag. Wick lost his tag to the Duke, the river duck. The nest is on the bank.
// ------------------------------------------------------------------------------------------------
async function wick_tag(s) {
  if (!(await s.hasFlag('wick_quest_started'))) {
    await say(s, 'wick', 'The Duke took my tag! He just bit it off my collar and waddled away!');
    await say(s, 'wick', 'Ma sewed it on after the signs went funny. So I wouldn\'t get forgot.');
    await say(s, 'wick', "The Duke lives down by the river. He's the meanest duck in the whole world.");
    await s.setFlag('wick_quest_started');
    return;
  }
  if (!(await s.hasFlag('wick_tag_found'))) {
    await say(s, 'wick', 'Did you get it? The Duke keeps everything shiny in his nest, by the river reeds.');
    return;
  }
  await s.emote('wick', '!');
  await say(s, 'wick', 'My tag! It still says me!');
  await say(s, 'wick', "You can have my lucky coin. On its string. It's very lucky. I checked.");
  await s.give(REWARDS.wick.item, REWARDS.wick.qty);
  await s.setFlag('wick_tag_done');
}

async function duck_nest(s) {
  if (await s.hasFlag('wick_tag_found')) {
    await narrate(s, 'A nest of reeds, string, and one shiny button. The Duke watches you with deep suspicion.');
    return;
  }
  await narrate(s, 'A nest of reeds, string, and one shiny button. Tucked in the middle is a little cloth tag.');
  await narrate(s, '"WICK. If found, he belongs to Willowmere."');
  await s.sfx('confirm');
  await s.emote('the_duke', 'anger');
  if (await s.hasFlag('bram_joined')) await say(s, 'bram', "Back off, Duke. It's not yours.");
  else await narrate(s, 'The Duke hisses. You take the tag anyway.');
  await s.setFlag('wick_tag_found');
}

// ------------------------------------------------------------------------------------------------
// Side quest: Nella's Ferry Bell. The call-bell washed into the valley shallows the night of the storm.
// ------------------------------------------------------------------------------------------------
async function nella_bell(s) {
  if (!(await s.hasFlag('nella_quest_started'))) {
    await say(s, 'nella', 'My call-bell is gone. Little brass thing. It hangs at the north landing up the valley, so folk can ring for the ferry.');
    await say(s, 'nella', "The storm tore it off the post. It'll be in the shallows downstream of the landing, if it's anywhere.");
    await say(s, 'nella', "No bell, no ferry. The valley folk have to walk the long way round. Their knees aren't thanking me.");
    await s.setFlag('nella_quest_started');
    return;
  }
  if (!(await s.hasFlag('ferry_bell_found'))) {
    await say(s, 'nella', "Below the north landing, in the valley. Where the river goes wide and lazy and drops what it's carrying.");
    return;
  }
  await s.emote('nella', '!');
  await say(s, 'nella', 'Maudie! You found her.');
  await narrate(s, 'Nella gives the little bell a shake. It rings out clear and bright across the water.');
  await say(s, 'nella', 'From now on, ring at the north landing in the valley and the ferry will fetch you home. Saves your feet.');
  await say(s, 'nella', 'And take this. Every ferry pilot keeps a river stone. This one never let me drown.');
  await s.give(REWARDS.nella.item, REWARDS.nella.qty);
  await s.setFlag('nella_bell_done');
}

async function ferry_bell_found(s) {
  if (await s.hasFlag('ferry_bell_found')) return;
  await narrate(s, 'Half-buried in the shallows lies a small brass bell. Scratched into its handle: MAUDIE.');
  if (await s.hasFlag('bram_joined')) {
    await say(s, 'bram', 'Who names a bell?');
    await say(s, 'mira', "Everyone in Willowmere names everything. It's how we keep things.");
  }
  await s.setFlag('ferry_bell_found');
}

// ------------------------------------------------------------------------------------------------
// After the boss: Hal comes home (bakery entry, once, archivore_defeated).
// ------------------------------------------------------------------------------------------------
async function hal_returns(s) {
  if (await s.hasFlag('tess_letter_1_delivered')) await say(s, 'hal', "So you're the ones who found my letter. Thank you. It took the long way round.");
  else await say(s, 'hal', "So you're the ones who went down that hole for us. Thank you.");
  await say(s, 'oren', "My brother! Hal! I set out his rolls every morning for a month and couldn't tell you why.");
  await say(s, 'hal', 'Habit is a stubborn kind of love, Oren. You told me that once.');
  await say(s, 'oren', "Did I? That's good. I should paint it on the sign.");
  await say(s, 'hal', 'You should paint MY name on the sign.');
  if (await s.hasFlag('starter_done')) await say(s, 'hal', 'And who let my starter run off to the smithy?');
  await s.setFlag('hal_returned');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. SCENE_CONDITIONS says when each scene is allowed to run ({ if, ifNot } flags); the
// wrapper checks it, so map triggers can stay simple. Every scene locks input while it runs.
// ------------------------------------------------------------------------------------------------
export const SCENE_CONDITIONS = {
  prologue: null,
  wake_up: { ifNot: 'intro_done' },
  hazel_farewell: { if: 'met_mael', ifNot: ['hazel_farewell_done', 'archivore_defeated'] },
  fading_sign: { if: 'intro_done', ifNot: 'saw_fading_sign' },
  mael_intro: { if: 'intro_done', ifNot: 'met_mael' },
  mira_joins: { if: 'met_mael', ifNot: 'mira_joined' },
  south_gate: { ifNot: 'bram_joined' },
  garrick_farewell: { if: 'bram_joined', ifNot: ['garrick_farewell_done', 'archivore_defeated'] },
  leave_town: { if: 'bram_joined', ifNot: 'left_town' },
  valley_arrival: { if: 'bram_joined', ifNot: 'valley_arrived' },
  milestone: null,
  first_fight: { if: 'bram_joined', ifNot: 'first_fight_done' },
  campfire_rest: { if: 'bram_joined' },
  archive_door: { if: 'bram_joined', ifNot: 'archive_entered' },
  archive_f1_arrival: { if: 'archive_entered', ifNot: 'f1_arrived' },
  find_letter_1: { if: 'archive_entered', ifNot: 'tess_letter_1_found' },
  archive_f1_bell: { if: 'archive_entered', ifNot: 'archive_f1_done' },
  archive_f2_arrival: { if: 'archive_f1_done', ifNot: 'f2_arrived' },
  find_letter_2: { if: 'archive_f1_done', ifNot: 'tess_letter_2_found' },
  echo_warden: { if: 'archive_f1_done', ifNot: 'echo_warden_defeated' },
  lantern_get: { if: 'echo_warden_defeated', ifNot: 'lantern_get' },
  archive_f2_exit: { if: 'lantern_get', ifNot: 'archive_f2_done' },
  archive_f3_arrival: { if: 'archive_f2_done', ifNot: 'f3_arrived' },
  find_letter_3: { if: 'archive_f2_done', ifNot: 'tess_letter_3_found' },
  thirteenth_bell: { if: 'archive_f2_done', ifNot: 'found_thirteenth_bell' },
  boss_door: { if: 'archive_f2_done', ifNot: 'boss_door_open' },
  archivore: { if: 'boss_door_open', ifNot: 'archivore_defeated' },
  return_to_willowmere: { if: 'archivore_defeated', ifNot: 'returned_home' },
  ending_hook: { if: 'returned_home', ifNot: 'ep1_complete' },
  tess_letters: { ifNot: 'tess_quest_done' },
  oren_starter: { ifNot: 'starter_done' },
  starter_found: { if: 'starter_quest_started', ifNot: 'starter_found' },
  wick_tag: { ifNot: 'wick_tag_done' },
  duck_nest: null,
  nella_bell: { ifNot: 'nella_bell_done' },
  ferry_bell_found: { if: 'nella_quest_started', ifNot: 'ferry_bell_found' },
  hal_returns: { if: 'archivore_defeated', ifNot: 'hal_returned' },
};

const RAW = {
  prologue, wake_up, hazel_farewell, fading_sign, mael_intro, mira_joins, south_gate, garrick_farewell,
  leave_town, valley_arrival, milestone, first_fight, campfire_rest, archive_door, archive_f1_arrival, find_letter_1, archive_f1_bell,
  archive_f2_arrival, find_letter_2, echo_warden, lantern_get, archive_f2_exit, archive_f3_arrival,
  find_letter_3, thirteenth_bell, boss_door, archivore, return_to_willowmere, ending_hook,
  tess_letters, oren_starter, starter_found, wick_tag, duck_nest, nella_bell, ferry_bell_found, hal_returns,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// ------------------------------------------------------------------------------------------------
// Inspect text: signs, books, plaques, props. Each value is a string, a list of boxes, or a
// conditional list [{ if, ifNot, lines }] (first match wins). Speaker is narration unless a line
// is { who, text }. Map events reference these by id: { type: 'sign', text: '<id>' }.
// ------------------------------------------------------------------------------------------------
export const lines = {
  // hero_home
  home_doorframe: [
    { if: 'archivore_defeated', lines: [
      'Height marks, one for every birthday. Your name is written beside each one.',
      'The other names in the house came back bright. Yours is still pale, like a word written in water.',
    ] },
    { lines: [
      'Height marks, one for every birthday. Your name is written beside each one.',
      'The ink looks paler than you remember. Probably just the morning light.',
    ] },
  ],
  home_blanket: [
    'A baby blanket, worn soft, folded at the bottom of the chest.',
    'Someone stitched your name into one corner, in thread the color of river water.',
  ],
  home_loom: 'Hazel\'s loom. A scarf in progress, with three different colors where she lost count and started again.',
  home_hearth: 'The hearth is banked and warm. Something with onions has been simmering since dawn.',
  home_window: [
    { if: 'archivore_defeated', lines: 'Lantern Square glows below. Every sign in sight has its name again.' },
    { if: 'signs_fading', lines: 'Lantern Square. From here you can see two shop signs that have gone completely blank.' },
    { lines: 'Morning over Lantern Square. Smoke from the bakery chimney, and the bell tower against a clean sky.' },
  ],
  home_bookshelf: [
    'Hazel\'s books: herbs, knots, river weather, and one very worn copy of "Tales of the Keepers."',
    '"Chapter One. Every name is a promise that something will not be forgotten."',
  ],

  // willowmere
  sign_bakery: [
    { if: 'archivore_defeated', lines: [
      'OREN\'S OVENS. FRESH BREAD DAILY.',
      'Below it, in fresh chalk: AND HAL\'S HONEY ROLLS. ASK NICELY.',
    ] },
    { if: 'signs_fading', lines: 'The bakery sign is blank. Not scraped, not painted over. Simply blank, as if it never said anything.' },
    { lines: 'OREN\'S OVENS. FRESH BREAD DAILY. The paint looks oddly thin this morning.' },
  ],
  sign_inn: [
    { if: 'archivore_defeated', lines: 'THE LANTERN INN. A BED, A MEAL, A STORY.' },
    { if: 'signs_fading', lines: 'THE LAN... INN. The rest has faded. Hob has pinned a paper note under it: "IT IS STILL AN INN."' },
    { lines: 'THE LANTERN INN. A BED, A MEAL, A STORY.' },
  ],
  sign_shop: [
    { if: 'archivore_defeated', lines: 'WILLOWMERE GOODS. POTIONS, PROVISIONS, PATIENCE.' },
    { if: 'signs_fading', lines: 'The shop sign is blank. Underneath, three paper labels, each saying SHOP in Pell\'s anxious capitals.' },
    { lines: 'WILLOWMERE GOODS. POTIONS, PROVISIONS, PATIENCE.' },
  ],
  sign_smithy: [
    { if: 'archivore_defeated', lines: 'MOSSFORGE SMITHY. GARRICK AND SON. The "AND SON" has been freshly repainted.' },
    { if: 'signs_fading', lines: 'MOSSFORGE SMI... The rest has gone. Someone has scratched GARRICK into the post beneath it, deep.' },
    { lines: 'MOSSFORGE SMITHY. GARRICK AND SON.' },
  ],
  sign_library: [
    { if: 'archivore_defeated', lines: 'WILLOWMERE LIBRARY. QUIET, PLEASE. RETURN WHAT YOU BORROW.' },
    { if: 'signs_fading', lines: 'The library sign has faded to nothing. A neat card in Mira\'s hand is tacked beneath: LIBRARY. STILL.' },
    { lines: 'WILLOWMERE LIBRARY. QUIET, PLEASE. RETURN WHAT YOU BORROW.' },
  ],
  sign_chapel: [
    'CHAPEL OF THE TWELVE BELLS.',
    'Ring the small bell inside, and Willowmere will remember you were here.',
  ],
  sign_square: [
    { if: 'archivore_defeated', lines: 'LANTERN SQUARE. The letters shine like they were painted this morning.' },
    { lines: 'LANTERN SQUARE. The first word is fading. Someone has chalked LANTERN back in, twice.' },
  ],
  town_sign: [
    { if: 'archivore_defeated', lines: 'WILLOWMERE. The name above the gate is bright and whole.' },
    { if: 'left_town', lines: 'WILL... ERE. The town\'s own name, fading over its own gate.' },
    { lines: 'WILLOWMERE. The letters over the gate are old and deep, carved as well as painted.' },
  ],
  notice_board: [
    { if: 'archivore_defeated', lines: [
      'NOTICE: Names have returned. Please check your doors, boxes, boats and children for labels.',
      'NOTICE: Feast in Lantern Square. Hal is baking. Oren is "helping."',
    ] },
    { if: 'signs_fading', lines: [
      'NOTICE: If you forget a neighbor\'s name, ASK THEM. Do not be shy. Be kind. Mael.',
      'NOTICE: LOST, three letters. Answer to nothing. Very fast. See Tess.',
      'NOTICE: Children must wear name-tags until further notice.',
    ] },
    { lines: [
      'NOTICE: Spring flood repairs at the ferry landing. Volunteers to Nella.',
      'NOTICE: LOST, one sourdough starter. Pale. Friendly. See Oren.',
    ] },
  ],
  well: [
    { if: 'archivore_defeated', lines: 'The old well. Its stone rim names the families who dug it: twelve names, and every one of them clear.' },
    { lines: 'The old well. Its stone rim names the families who dug it. Several names have worn smooth since spring.' },
  ],
  flowerbeds: [
    'Twelve flowerbeds along the river road, one for each founding family. Lantern blossoms, mostly.',
    'And a thirteenth bed at the end, planted just as carefully, with no name stake at all.',
  ],
  garden_plaque: 'These beds honor the first caretakers of Willowmere, who planted lantern blossoms beside the river road.',
  ferry_landing: [
    { if: 'nella_bell_done', lines: 'The ferry landing. The ferry is out on the river again, and Nella\'s voice carries across the water.' },
    { lines: 'The ferry landing. The ferry is tied up and idle, knocking gently against the posts.' },
  ],

  // chapel
  chapel_plaque: 'A bell remembers every hand that has ever rung it. When the final note sounds, forgotten names return.',
  chapel_ropes: 'Twelve bell ropes hang from the tower, each tied off with a family\'s colors. A thirteenth hook holds nothing.',
  save_bell: 'A small bronze hand-bell by the chapel door. Ring it, and Willowmere will remember you were here.',
  chapel_pews: 'Polished pews, smooth from generations of sitting. Someone has carved a tiny duck into the end of one.',

  // library
  library_desk: 'Iris\'s desk. A ledger of borrowed books, a cold cup of tea, and a list headed THINGS NOT TO FORGET.',
  library_globe: 'An old globe of Aethelgard. Several towns on it have faded to blank pale circles.',
  library_returns: 'The returns cart. Every book on it is about remembering things. Someone has a sense of humor.',
  mira_desk: [
    { if: 'mira_joined', lines: 'Mira\'s reading desk. Forty-one books on the Rootbound Archive, stacked by height, then by color.' },
    { lines: 'A reading desk buried in books on the Rootbound Archive. A sheet of notes is written in a small, precise hand.' },
  ],

  // shops and inn
  inn_guestbook: [
    { if: 'archivore_defeated', lines: 'The inn\'s guest book. Every name in it is written once again. Hob has drawn a little smiling sun.' },
    { lines: 'The inn\'s guest book. Lately, every name in it has been written twice, in two different hands.' },
  ],
  bakery_crock: [
    { if: 'starter_done', lines: 'A big stoneware crock, the lid tied down with string. HAL\'S. DO NOT TOUCH. THIS MEANS YOU, OREN.' },
    { lines: 'A big stoneware crock, empty, its lid knocked aside. A trail of flour leads out the back door.' },
  ],
  flour_bin: [
    { if: 'archivore_defeated', lines: 'A flour bin. Chalked on the lid, in Oren\'s hand: HAL. HAL. HAL. BROTHER. DO NOT FORGET.' },
    { lines: 'A flour bin. On the lid, in faded chalk, a word has been rubbed out and rewritten so often it is just a smudge.' },
  ],
  forge: 'Garrick\'s forge, glowing a sleepy orange. The warmest spot in Willowmere, and everything in town knows it.',

  // valley
  valley_fork_sign: 'NORTH: ROOTBOUND ARCHIVE. WEST: WILLOWMERE. Beyond the old milestone, the roads have begun to forget their names.',
  milestone: [
    'A weathered milestone. Its words are worn soft by centuries of passing hands.',
    '"Every name is a promise that something will not be forgotten."',
  ],
  hollow_tree: 'A hollow willow, its heart split open by lightning long ago. Pilgrims leave small gifts inside for travelers who come after.',
  pilgrim_rest: 'The Pilgrim\'s Rest: a ring of stones, a kettle, and a dry log bench. A warm fire on a long road.',
  pilgrim_bench: 'A dry log bench, worn smooth by a century of pilgrims. Someone has carved a small bell into the end of it.',
  bridge_plaque: 'MENDED BY NELLA AND THE RIVER FOLK, SPRING FLOOD YEAR. MAKE ROOM FOR THE RIVER.',
  ferry_post_valley: [
    { if: 'nella_bell_done', lines: 'A bell-post at the north landing. Ring, and Nella\'s ferry will carry you home to Willowmere.' },
    { lines: 'A bell-post at the north landing, with nothing hanging from it. No bell, no ferry.' },
  ],
  whisperwood_edge: 'The edge of the Whisperwood. The trees here lean together as if trading secrets.',
  pilgrim_note: [
    'A scrap of bark nailed to a post by the benches, lettered in a careful pilgrim\'s hand:',
    '"East of the fork the pines close ranks. Past them, a black pool. The way across is ink, and only a true light reads it."',
    'Beneath it, scratched in a rougher hand: "Worth the thorns."',
  ],

  // archive
  archive_door_carving: 'Carved above the great door: SPEAK, AND BE KEPT.',
  catalog_promise: 'When the first names were written, the Keepers promised never to erase a soul, even those who made mistakes.',
  catalog_drawers: 'Card drawers taller than a house. Every card you pull out is blank, its edges nibbled.',
  marginalia: [
    'A warning, scratched into a margin: "The beast below devours remembered names."',
    '"Steel cuts its body. Memory denies its hunger."',
  ],
  reading_desk: 'A reading desk, its chair pushed back as if someone just stood up. The book on it is open to a blank page.',
  hidden_ink_1: '"A Keeper pledged that no name could be erased without a living witness. Something beneath the Archive broke that promise."',
  hidden_ink_2: '"We built our bridges in ink, so that only those who could see what was hidden would cross."',
  hidden_ink_3: '"If you are reading this, the Lantern still burns. Good. Keep going. We could not."',
  broken_chronicle: [
    'A broken chronicle: "The Archivore was not born a monster. It was commanded to forget."',
    '"Perhaps the one holding the list still walks free."',
  ],
  keeper_font: 'A Keeper\'s font. The water is cold, clear, and somehow tastes like the first day of spring.',
  keeper_font_galleries: [
    'A Keeper\'s font set into the gallery wall. The water runs clear over a lip of green bronze, and the air above it is cool.',
    'Three words are chipped into the rim: DRINK. REST. REMEMBER.',
  ],
  crystal_plaque: 'A bronze plate beside the barred door. Three crystals are etched into it, a small flame over each. THREE LIGHTS, ONE DOOR.',
  thirteenth_bell: [
    { if: 'found_thirteenth_bell', lines: [
      'The thirteenth bell. RUNG FOR EVERY NAME THE WORLD FORGETS, SO THAT SOMEONE WILL NOTICE.',
      'It hangs silent now. Listening.',
    ] },
    { lines: 'A great bronze bell among the roots, cracked from lip to crown.' },
  ],
  boss_door_plate: 'A brass plate on the great door: THE HEART OF THE ARCHIVE. KEEPERS ONLY. FEED NOTHING.',
};

// Credits text lives in data/text.js; re-exported here so the story module is self-contained.
export const credits = CREDITS;

export default { scenes, lines, PROLOGUE, credits };
