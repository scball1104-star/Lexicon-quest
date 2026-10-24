// Lexicon Quest NEXT, Episode 3: "The Forge of Ash".
// Every scripted scene, plus inspect text for signs, plaques, troughs, anvils and props.
//
// Scenes use ONLY the cutscene API (DESIGN 5.4; signatures in docs/story/STAGING.md section 1). Places and props
// are map mark / event / actor names, never tile coordinates. Staging for every scene (who stands where, props,
// camera, music, triggers) is in docs/story/STAGING_EP3.md. Beat sheet and canon: docs/story/EPISODE3.md.
//
// Writing rules: one idea per box, at most 3 lines of 42 characters, no em dashes, ASCII only, {hero} = player name.
// Scene ids and line ids never repeat an Episode 1 or Episode 2 id (qa/content/ep3.test.mjs checks it).
//
// THE TWO NAMES. Until `mara_read` nobody says Mara's name, and until `garrick_named` nobody says Garrick's: the
// party calls him "the Smith" or "Dad" and the speaker tag reads "The Smith" (actor swapped under a name flash in
// warden_after, the Aurel pattern). Mara speaks only in memory, tagged "A Voice" until she is read off the Bell Gate.
// qa/content/ep3.test.mjs scans every box for both names before their reveal.
//
// THE SWITCH. `ep3_morning` and `sand_gate` also need EP3_LIVE (src/game/episodes.js). While it is false they do
// nothing, no other scene can start (every other guard needs a flag only they set), and Episode 3 is unreachable.

import { REWARDS_EP3 } from '../quests.js';
import { CREDITS_EP3, EPISODE4_CARD } from '../text.js';
import { EP3_LIVE } from '../../game/episodes.js';

// Speakers with 48x48 portraits. Ilya borrows the built, unused `goggles_smith` painting (alias `ilya`); the Warden
// uses a crop of its boss frame. A missing portrait simply draws no portrait (ui/window.js). Vex uses `silver_rogue`.
// The Smith has Garrick's face: the party can see it, it is the word they cannot find.
const PORTRAIT = {
  hero: 'hero', mira: 'mira', bram: 'bram', mael: 'mael', hazel: 'hazel',
  smith: 'garrick', smith_t: 'garrick', garrick_t: 'garrick', garrick_e: 'garrick',
  ilya: 'ilya', ilya_t: 'ilya', vex: 'silver_rogue', cinder_warden: 'cinder_warden',
};

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

// Same wrapper as ep1.js / ep2.js: a scene runs only when its SCENE_CONDITIONS hold, with input locked for its whole
// run. `live: true` also needs the episode switch (GATE.live, read at call time so tests can flip it).
export const GATE = { live: EP3_LIVE };
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
async function allowed(s, cond) {
  if (!cond) return true;
  if (cond.live && !GATE.live) return false;
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
// Act I: Hollowmere, one name short
// ================================================================================================

// 1. nh_inn, on enter after the Episode 2 credits (also on enter of nameless_hollow for saves that left the inn).
// 14 boxes. The Smith is a scene spawn at the hearth. Sets ep3_morning_done and ep3_started.
async function ep3_morning(s) {
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'smith_seat', dir: 'left' });
  await s.fade('in', 60);
  await s.emote('hero', 'zzz');
  await s.wait(30);
  await s.walk('wren', 'wren_wake');
  await s.face('wren', 'hero');
  await say(s, 'wren', "Old fellow walked in at sunrise. Asked for Bram by name. Couldn't give me his own.");
  await s.walk('hero', ['down']);
  await s.camera.panTo('smith_seat', 40);
  await narrate(s, 'By the hearth sits an old man grey with road dust, his hands open on his knees as if he has put something down.');
  await s.walk('bram', 'smith_seat');
  await s.face('bram', 'smith');
  await say(s, 'bram', '...Dad.');
  await s.wait(40);
  await s.emote('bram', '...');
  await s.music('sorrow');
  await say(s, 'bram', "Dad, I can't. It's right there.");
  await say(s, 'smith', "I know. Mine's gone off too.");
  await say(s, 'smith', 'Heard it at the ford last night. Thirteen. I knew it was for me.');
  const c = await s.choice(['Say his name.', 'Who did this?']);
  await say(s, 'hero', '...');
  if (c === 0) await say(s, 'bram', "Don't. If you say it wrong, I'll keep the wrong one.");
  else await say(s, 'smith', 'Not who. What. I know what.');
  await say(s, 'mira', "I can see his face. I can't find the word for him.");
  await say(s, 'smith', 'It went like this with her. First the sign on the forge. Then the word in your mouth.');
  await say(s, 'smith', "It's the Warden. It's striking again. I'm going home.");
  await say(s, 'bram', 'Not alone.');
  await say(s, 'smith', 'Never said alone.');
  await s.music('hollowmere');
  await s.camera.follow('hero');
  await s.walk('smith', 'inn_door');
  await s.despawn('smith');
  await say(s, 'wren', "Three more eggs, then. I'll put them in his coat pocket. He won't notice.");
  await s.setFlag('ep3_morning_done');
  await s.setFlag('ep3_started');
}

// 2. nameless_hollow, step trigger sand_gate_trig at the chained east gate. Vessa unchains the road; Penny's cart is
// waiting and the Smith rides with her. Gives 3 Quench Flasks. Sets sand_gate_open.
async function sand_gate(s) {
  await s.spawn('vessa_g', { sprite: 'npc_vessa', name: 'Vessa', at: 'vessa_gate', dir: 'right' });
  await s.spawn('penny_g', { sprite: 'npc_shopkeeper', name: 'Penny', at: 'penny_cart_h', dir: 'right' });
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'penny_cart_h', dir: 'right' });
  await s.camera.panTo('sand_gate', 40);
  await narrate(s, 'At the east edge of town stands a stone arch with an iron chain across it. Beyond lies a road of pale grey sand.');
  await say(s, 'vessa_g', 'Emberpeak sand made the best silverglass. Made. The carts stopped twenty-five years ago.');
  await s.walk('vessa_g', 'sand_gate');
  await s.sfx('door_unlock');
  await narrate(s, 'Vessa takes a key from her apron. The chain drops into the sand, as if it had been waiting a long time to.');
  await s.give(REWARDS_EP3.vessa.item, REWARDS_EP3.vessa.qty);
  await say(s, 'vessa_g', 'Cold water, hot glass. Throw these at anything that glows.');
  await say(s, 'mira', "Heat, then water. A smith's oldest rule.");
  await say(s, 'penny_g', "I go where the roads still go. This one's coming back.");
  await s.walk('smith', 'penny_cart_h');
  await say(s, 'smith', 'Climbing on. Do not argue with a man who is climbing on.');
  await say(s, 'bram', "I wasn't going to.");
  await say(s, 'smith', 'You were about to.');
  await all(s.despawn('smith'), s.despawn('penny_g'), s.despawn('vessa_g'));
  await s.camera.follow('hero');
  await s.setFlag('sand_gate_open');
}

// ================================================================================================
// Act II: The Old Sand Road (sand_road)
// ================================================================================================

// 4. sand_road, on enter. Sets sand_road_arrived.
async function sand_road_arrival(s) {
  await narrate(s, 'Grey grass at the water, then ash. Far ahead, low on the sky, the mountain glows like a coal under a blanket.');
  await say(s, 'bram', 'I walked this road down once. I was twenty, carrying a sack and a father.');
  await say(s, 'mira', "And now you're carrying him back up.");
  await say(s, 'bram', "He's riding. I'm carrying.");
  await s.setFlag('sand_road_arrived');
}

// 5. sand_road, step column first_fight_trig. The one teaching fight: a Cinder Hound and a Cinder Beetle whose first
// move is always Stoke. No tutorial box. A loss sets nothing.
async function sand_first_fight(s) {
  await s.camera.panTo('e_sr_first', 40);
  await all(s.emote('bram', '!'), s.emote('mira', '!'));
  await narrate(s, 'A hound with an ember for a mane pads out of the ash. Behind it, a beetle with its seams lit like a stove door.');
  await s.walk('e_sr_first', 'hero', { speed: 'run' });
  await s.camera.follow('hero');
  await say(s, 'bram', 'Friendly?');
  await say(s, 'mira', "That beetle's heating up. Cool it before it boils over.");
  const result = await s.battle('sr_first', { canFlee: false });
  if (result !== 'win') return;
  await s.despawn('e_sr_first');
  await say(s, 'mira', 'Ice, and it went out like a coal in snow.');
  await say(s, 'bram', 'Breaking it worked too. Louder.');
  await s.setFlag('sand_first_fight_done');
}

// 6. sand_road, step trigger slag_trig. The field mechanic's first lesson: one line points at the paddle, the
// screen does the rest. Sets saw_slag.
async function slag_crossing(s) {
  await s.camera.panTo('slag', 40);
  await narrate(s, 'A tongue of slag has crossed the road, still glowing in its cracks. Beside it, snowmelt runs in an old stone trough.');
  await say(s, 'bram', "Sand carters' trick. Turn the paddle. Water takes the heat.");
  await say(s, 'mira', "The paddle's rusted open. It will still turn.");
  await s.camera.follow('hero');
  await s.setFlag('saw_slag');
}

// 7. Campfire object carters_fire (safe, rest): the field runs the rest flow afterwards. First visit: one choice of
// three. Later visits: one box. Sets carters_rested.
async function carters_rest(s) {
  if (await s.hasFlag('carters_rested')) {
    await say(s, 'bram', 'Fire is still going. Sit, {hero}. The glow is not going anywhere.');
    return;
  }
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'smith_crate', dir: 'up' });
  await narrate(s, 'A roofless stone shelter, a cart with one wheel off, and a fire someone keeps fed. The Smith sits on a crate by the glow.');
  const c = await s.choice(['What was she like?', 'Bram, are you all right?', 'Just rest.']);
  if (c === 0) {
    await say(s, 'smith', 'She could hear a crack in a bell before it rang. Heard one in me once.');
    await say(s, 'smith', 'Tall as a doorframe. Laughed at the wrong parts of sermons. Hands like mine, only quicker.');
    await narrate(s, 'He can say everything about her except the one word. His mouth goes round it, like a tongue around a missing tooth.');
  } else if (c === 1) {
    await say(s, 'bram', 'No. Ask me after.');
    await say(s, 'mira', "After, then. I'll remember to ask.");
  } else {
    await narrate(s, 'The Smith stays up and watches the glow. Nobody asks him to stop.');
    await narrate(s, 'Bram sleeps with one hand on his spear. Mira counts the Smith\'s breaths, so he does not have to.');
  }
  await s.despawn('smith');
  await s.setFlag('carters_rested');
}

// 8. sand_road, step trigger ash_view on the last rise. The Smith walks on ahead afterwards. Sets saw_emberpeak.
async function ash_view(s) {
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'rise_smith', dir: 'up' });
  await s.music('mystery');
  await s.camera.panTo('emberpeak_far', 60);
  await narrate(s, 'Below the rise lies Emberpeak: iron roofs under a skin of ash, a bell tower, and a furnace mouth glowing in the mountain.');
  await s.wait(40);
  await say(s, 'smith', "The bell's quiet. It was never quiet. Every shift, it rang.");
  await say(s, 'bram', "Then something's wrong up there.");
  await say(s, 'smith', "Something's been wrong for twenty-five years.");
  await s.camera.follow('hero');
  await s.music('ash_road');
  await s.walk('smith', 'town_gate');
  await s.despawn('smith');
  await s.setFlag('saw_emberpeak');
}

// ================================================================================================
// Act III: Emberpeak
// ================================================================================================

// 9. emberpeak, on first enter. Rusk the Watch at the gate; the Smith walks in with the party and goes ahead to the
// memorial. Sets pk_arrived.
async function pk_arrival(s) {
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'gate_smith', dir: 'up' });
  await s.camera.panTo('gate_in', 30);
  await narrate(s, 'Ash falls like slow snow on iron roofs and banked fires. Up in its tower, the bell hangs dark.');
  await s.face('rusk', 'hero');
  await say(s, 'rusk', "Nobody comes up the sand road. Nobody's come up it since I was a boy.");
  await s.face('rusk', 'smith');
  await narrate(s, 'Rusk looks at the Smith. He does not know him. He straightens anyway.');
  await say(s, 'rusk', '...Smith.');
  await say(s, 'smith', 'Watch.');
  await say(s, 'mira', "He doesn't know you. His back does.");
  await say(s, 'rusk', "Foreman Veyra's at the coolant station. She'll want a word with anyone who walks in.");
  await s.camera.follow('hero');
  await s.walk('smith', 'memorial');
  await s.despawn('smith');
  await s.setFlag('pk_arrived');
}

// 10. emberpeak, step trigger veyra_trig beside the coolant station. Sets met_veyra.
async function veyra_square(s) {
  await s.camera.panTo('coolant', 30);
  await narrate(s, 'A woman in a soot-streaked coat chalks numbers on a slate beside a stone cistern. A whistle hangs at her neck.');
  await s.face('veyra', 'hero');
  await say(s, 'veyra', "Foreman Veyra. You're not shift, you're not Watch. Can you carry a crate?");
  await say(s, 'veyra', 'The furnaces woke a month ago with nobody feeding them. The Warden runs the lifts now.');
  await say(s, 'veyra', 'The mine gates are shut from inside. Names come off the memorial wall about one a week.');
  await say(s, 'veyra', "We sand the plates and pretend it's soot.");
  await say(s, 'veyra', "The foundry gate answers to one key. The founder's apprentice keeps it. Ilya, in the Bell House.");
  await s.face('veyra', 'bram');
  await say(s, 'veyra', "You've got a guard's back and a smith's hands. Which are you?");
  await say(s, 'bram', 'Today? Both.');
  await say(s, 'veyra', "Then you'll do. Come back when you've seen Ilya. I've three people you should hear.");
  await s.camera.follow('hero');
  await s.setFlag('met_veyra');
}

// 11. emberpeak, object memorial. Three states: first look (this scene), later looks (short), and after the bell
// (the plates are lettered). Sets saw_memorial.
async function memorial_wall(s) {
  if (await s.hasFlag('pk_restored')) {
    await narrate(s, 'Names Etched in Iron. Every plate is lettered again, and the letters are deep and bright.');
    return;
  }
  if (await s.hasFlag('saw_memorial')) {
    await narrate(s, 'The memorial wall. One plate hammered flat. One going soft, like wax near a fire.');
    return;
  }
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'memorial_smith', dir: 'up' });
  await s.music('sorrow');
  await s.camera.panTo('memorial', 40);
  await narrate(s, 'Names Etched in Iron. Rows of plates bolted to the wall, each stamped with a name. One plate has been hammered flat.');
  await narrate(s, 'Below it hangs a newer plate. Its letters are going soft, like wax near a fire.');
  await s.walk('smith', 'memorial');
  await narrate(s, 'The Smith lays his hand on the flat place.');
  await say(s, 'smith', "That's hers.");
  await say(s, 'bram', 'What was it?');
  await say(s, 'smith', "I'd tell you if I had it.");
  await say(s, 'mira', "And this one is going now. Softly. I can't read it, and I'm watching it go.");
  await s.music('emberpeak');
  await s.camera.follow('hero');
  await s.walk('smith', 'bellhouse_door');
  await s.despawn('smith');
  await s.setFlag('saw_memorial');
}

// 12. pk_bellhouse, step trigger ilya_trig two tiles inside. Gives lift_key. Sets met_ilya and foundry_open.
// The key's display name must not carry the founder's name (see EPISODE3.md build notes).
async function ilya_bellhouse(s) {
  await s.spawn('smith', { sprite: 'npc_smith', name: 'The Smith', at: 'bellhouse_in', dir: 'up' });
  await narrate(s, 'A workshop kept exactly as it was left. Bell molds on the shelves, and a practice bell over a bench with no dust.');
  await s.face('ilya', 'hero');
  await say(s, 'ilya', 'Veyra sent you. She sends everyone she cannot use herself. Mind the molds.');
  await s.camera.panTo('ilya_spot', 30);
  await narrate(s, 'Through the window stands the bell tower. In it hangs the First Bell, mouth open and no tongue.');
  await say(s, 'ilya', 'She took the clapper in with her. Said a bell that can\'t ring can\'t be made to lie.');
  await say(s, 'ilya', "I can't say her name. I can say what she said. Shape shelter before weapons.");
  await say(s, 'bram', '...I know that.');
  await s.face('ilya', 'smith');
  await say(s, 'ilya', "You've got her husband's hands. He'd be about your age.");
  await say(s, 'smith', 'About.');
  await say(s, 'ilya', "Her key to the ore lift. I've kept it oiled twenty-five years. Don't ask me why.");
  await s.give('lift_key');
  await say(s, 'ilya', 'She tuned every bell on this mountain. And one down in your valley, once.');
  await s.camera.follow('hero');
  await s.walk('smith', 'bellhouse_door');
  await s.despawn('smith');
  await s.setFlag('met_ilya');
  await s.setFlag('foundry_open');
}

// 13. pk_smithy, the Smith's talk entry (garrick_e). Optional; Talk suggests it. Sets forge_relit.
async function garrick_forge(s) {
  await narrate(s, 'The Emberpeak Weaponsmith. A cold forge, a young smith with her sleeves rolled, and an old man staring at the anvil.');
  await s.face('sella', 'garrick_e');
  await say(s, 'garrick_e', 'Might I borrow your forge, miss? Not to sell from. To sit by.');
  await narrate(s, 'Sella watches the way he lifts the tongs. She does not argue.');
  await say(s, 'sella', "...Your grip's the old grip. Nobody taught me that grip.");
  await say(s, 'garrick_e', 'Somebody taught somebody.');
  await say(s, 'garrick_e', "I'll keep the fire here. The right kind.");
  await say(s, 'bram', 'Dad. Rest. That is all I am asking.');
  await say(s, 'garrick_e', "That's what this is.");
  await s.setFlag('forge_relit');
}

// ================================================================================================
// Act IV: The Ashen Foundry
// ================================================================================================

// 14. emberpeak, the foundry gate object (needs lift_key). Sets foundry_entered.
async function foundry_gate(s) {
  await s.sfx('door_unlock');
  await narrate(s, 'The key turns in a lock oiled for twenty-five years. Somewhere below, chains take up their slack.');
  await say(s, 'mira', 'A key that waited. Somebody trusted the dark to keep it.');
  await s.sfx('lift_rumble');
  await s.setFlag('foundry_entered');
}

// 15. foundry_f1, on enter. Sets foundry_f1_arrived.
async function foundry_f1_arrival(s) {
  await narrate(s, 'Slag crawls through channels in the floor. Stone troughs line the walls, dry, and a great waterwheel hangs still.');
  await say(s, 'mira', 'Water from the snows, fire from the mountain. Someone built this to balance.');
  await say(s, 'bram', 'My mother. She drew the cooling lines.');
  await s.emote('mira', '...');
  await say(s, 'mira', 'Your mother.');
  await say(s, 'bram', "That's all I've got for her. Mother. It'll have to do.");
  await s.setFlag('foundry_f1_arrived');
}

// 16. foundry_f1, step trigger shaft_trig. Bram's first memory (canon text). A warm vignette; the bell is ringing.
// Sets bram_memory_1.
async function bram_memory_1(s) {
  await s.camera.panTo('shaft', 40);
  await s.music('sorrow');
  await s.sfx('bell_first');
  await s.tint('dawn', 30);
  await s.spawn('bram_m', { sprite: 'bram', name: 'Bram', at: 'shaft_bram', dir: 'up' });
  await s.spawn('foreman_m', { sprite: 'npc_guard', name: 'Foreman', at: 'shaft_foreman', dir: 'down' });
  await narrate(s, 'The old shaft mouth. The light goes amber, and the air smells of coal dust and wet stone.');
  await narrate(s, 'A young man, about twenty, hauls a miner out of a falling shaft by the collar. Above them, a bell is ringing.');
  await say(s, 'foreman_m', "Count the ore, boy! The fire doesn't wait!");
  await say(s, 'bram_m', 'I was ordered to count the ore. I counted the people.');
  await narrate(s, 'Behind him three more miners crawl out of the dust. The bell does not stop.');
  await all(s.despawn('bram_m'), s.despawn('foreman_m'));
  await s.tint('none', 30);
  await s.music('foundry');
  await s.camera.follow('hero');
  await say(s, 'bram', 'The bell was ringing. She was ringing it. That is why we got out.');
  await say(s, 'mira', 'Your mother rang it.');
  await say(s, 'bram', 'I think the bell was her. Do you know what I mean?');
  await s.setFlag('bram_memory_1');
}

// 17. foundry_f1, basin bs_wheel's script (first fill). A pan along the flow; the lift wakes. Sets lift_wheel_lit
// (the basin's latch flag) and lift_wheel_seen.
async function liftworks_lift(s) {
  await s.sfx('water_flow');
  await s.camera.panTo('wheel', 30);
  await s.sfx('wheel_turn');
  await narrate(s, 'Water finds the wheel. It turns once, groans, and turns again, and the whole floor shudders as the ore lift wakes.');
  await s.sfx('lift_rumble');
  await s.shake(1, 20);
  await s.camera.panTo('lift_down', 30);
  await say(s, 'bram', 'Hear that? Chains taking weight. Somebody built a thing that lasts.');
  await s.camera.follow('hero');
  await s.setFlag('lift_wheel_lit');
  await s.setFlag('lift_wheel_seen');
}

// Step trigger on the lift gate once the wheel turns. Silent: the lift speaks for itself. Sets foundry_f1_done.
async function foundry_f1_lift(s) {
  await s.setFlag('foundry_f1_done');
}

// 18. foundry_f2, on enter. Sets foundry_f2_arrived.
async function foundry_f2_arrival(s) {
  await narrate(s, 'Great fans, black with soot, turn in their housings. Bellows the size of houses sigh somewhere out of sight.');
  await say(s, 'mira', 'Breath for the furnaces. They never stopped breathing.');
  await say(s, 'bram', 'Quiet is not the word I would use.');
  await s.setFlag('foundry_f2_arrived');
}

// 19. foundry_f2, step trigger bell_trig2 under an unstruck bell. Bram's second memory (canon text). Sets bram_memory_2.
async function bram_memory_2(s) {
  await s.camera.panTo('bell', 30);
  await s.music('sorrow');
  await s.sfx('bell_first');
  await narrate(s, 'An unstruck bell hangs over the gallery walk. As you pass beneath, it hums, though nothing has touched it.');
  await say(s, 'voice', 'A true smith shapes shelter before weapons.');
  await say(s, 'bram', 'My mother said that. I thought the fire took her name.');
  await say(s, 'mira', 'It took the word. It left the voice.');
  await say(s, 'bram', "...Then I'll take the voice. For now.");
  await s.music('foundry');
  await s.camera.follow('hero');
  await s.setFlag('bram_memory_2');
}

// 20. foundry_f2, arena trigger specter_trig. Mini-boss intro in the Episode 2 style. A retry (after a loss) plays
// only the fans, Mira's tip and the card. Sets bellows_specter_tried; the encounter flag sets bellows_specter_defeated.
async function bellows_specter(s) {
  if (await s.hasFlag('bellows_specter_defeated')) return;
  const retry = await s.hasFlag('bellows_specter_tried');
  await s.music(null);
  await s.camera.panTo('specter_spot', 40);
  await s.wait(retry ? 10 : 30);
  if (!retry) {
    await narrate(s, 'Every fan in the hall turns the wrong way. Soot and smoke fold into a great bird with a furnace for a heart.');
    await say(s, 'bram', "That's not a bird. That's the whole draft with a grudge.");
  }
  await say(s, 'mira', "It's stoking itself. Cool it before it's white, or it'll breathe the fire at us.");
  await s.setFlag('bellows_specter_tried');
  await s.title('THE BELLOWS SPECTER', { sub: 'Breath of the Foundry', frames: 100 });
  await s.shake(3, 24);
  await s.flash('#ffffff', 8);
  await s.music('battle');
  const result = await s.battle('bellows_specter', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.camera.panTo('specter_spot', 20);
  await narrate(s, 'The fans wind down. Soot drifts and settles. Below the great fan, a stair opens in the floor.');
  await say(s, 'bram', 'Quiet. That is worse.');
  await s.camera.follow('hero');
  await s.music('foundry');
  await s.setFlag('bellows_specter_defeated');
}

// Step trigger on the shaft stair under the great fan. Silent. Sets foundry_f2_done.
async function foundry_f2_shaft(s) {
  await s.setFlag('foundry_f2_done');
}

// 21. foundry_f2, object ledger_obj (Lantern secret, side quest What the Ash Kept). Sets ledger_found.
async function ledger_ash(s) {
  await s.sfx('lantern_reveal');
  await narrate(s, 'Three ledger pages lie on the floor of the records cage, burned black and curled. Mira raises the Lantern over them.');
  await narrate(s, "Ink rises out of the ash: the last shift's names, row on row. In one row, a small bell is stamped where a name should be.");
  await say(s, 'mira', "Ink remembers, even when paper burns. That's new. I'm writing that down.");
  await say(s, 'bram', 'A stamp where a name should be. Whose?');
  await say(s, 'mira', 'No letters. Only the bell.');
  await s.sfx('door_unlock');
  await narrate(s, "Somewhere in the cage, a lock lets go. The apprentice's cache.");
  await s.setFlag('ledger_found');
}

// 22. foundry_f3, on enter. Sets foundry_f3_arrived.
async function foundry_f3_arrival(s) {
  await narrate(s, 'A wide hub of black stone, slag glowing in its cracks. Three wings, three great anvils, and one gate.');
  await s.camera.panTo('hub', 40);
  await say(s, 'mira', 'Hand, Heart, Home. Three anvils. The Keepers did love a set of three.');
  await say(s, 'bram', 'So did she.');
  await s.camera.follow('hero');
  await s.setFlag('foundry_f3_arrived');
}

// 23. foundry_f3, step trigger vex_trig at the hottest furnace mouth. Gives struck_list. Sets vex_furnace_met.
// Vex is a scene spawn on the ledge inside the furnace; he never fights.
async function vex_furnace(s) {
  await s.music(null);
  await s.sfx('furnace_roar');
  await s.camera.panTo('furnace_mouth', 40);
  await narrate(s, 'The hottest furnace roars along the east wall. Behind the fire, on a ledge inside it, a silver-haired man stands unburned.');
  await s.spawn('vex', { sprite: 'npc_vex', name: 'Vex Quill', at: 'vex_ledge', dir: 'down' });
  await s.music('mystery');
  await say(s, 'vex', 'The Archivore burns records. I burn excuses. We are not the same.');
  await narrate(s, 'At his feet lies a black feather. It does not burn.');
  await s.face('vex', 'bram');
  await say(s, 'vex', "Your father was at the top of this, Bram. I've torn him off. It won't stop the hammer. It'll slow it.");
  await narrate(s, 'He drops a scrap of cheap paper through the grate. It lands at your feet, unscorched: the corner of a list.');
  await s.give('struck_list');
  await say(s, 'mira', 'Why help us?');
  await say(s, 'vex', 'I collect things nobody is using. Nobody should use this.');
  await s.face('vex', 'hero');
  await say(s, 'vex', "Your name's on the leaf in there, {hero}. Stamped by a hand I'd very much like to meet.");
  await say(s, 'vex', "Your first page isn't in this fire either. I looked.");
  await s.flash('#ff9a40', 10);
  await s.despawn('vex');
  await narrate(s, 'The fire gutters. When it rights itself, the ledge is empty. The feather stays.');
  await say(s, 'bram', 'He tore my father off a list. I want to thank him and hit him.');
  await s.camera.follow('hero');
  await s.setFlag('vex_furnace_met');
}

// 24. The three oaths. Each runs when the party strikes its wing's anvil. Silent but for the strike, a deep bell tone
// answering from the gate, and one line from A Voice. The third also tells the party the gate has woken.
async function oathClose(s, flag) {
  await s.setFlag(flag);
  const others = ['oath_hand', 'oath_heart', 'oath_home'].filter((f) => f !== flag);
  let n = 0;
  for (const f of others) if (await s.hasFlag(f)) n++;
  if (n === 2) {
    await s.sfx('bell_first');
    await narrate(s, 'Three bells, answering as one. Far across the Crucible, something heavy turns. The Bell Gate has woken.');
  }
}
async function oath_hand(s) {
  await s.sfx('anvil_strike');
  await s.sfx('bell_first');
  await narrate(s, "Bram brings the flat of his axe down on the anvil. It rings, clean and long, and a deeper bell answers from the gate.");
  await say(s, 'voice', 'Hold it like you mean to let go.');
  await oathClose(s, 'oath_hand');
}
async function oath_heart(s) {
  await s.sfx('anvil_strike');
  await s.sfx('bell_first');
  await narrate(s, 'The anvil rings under the hammer-blow, and in the dark wing a second bell sounds from the gate.');
  await say(s, 'voice', 'Ring it for them. Not for you.');
  await oathClose(s, 'oath_heart');
}
async function oath_home(s) {
  await s.sfx('anvil_strike');
  await s.sfx('bell_first');
  await narrate(s, 'The last anvil rings. The note goes out along the stone like water finding its level.');
  await say(s, 'voice', 'Then come home.');
  await say(s, 'bram', "That's what Dad says. Respect the rhythm, and come home. I thought it was his.");
  await oathClose(s, 'oath_home');
}

// 25. foundry_f3, step trigger at gate_spot once all three oaths are struck. Bram's third memory (canon text, then new
// lines): the founder's stamp, hidden by ash. Teaches Tempered Oath. Sets bram_memory_3, mara_read, bell_gate_open.
async function bram_memory_3(s) {
  await s.music(null);
  await s.camera.panTo('gate_spot', 40);
  await s.sfx('bell_first');
  await s.shake(2, 30);
  await narrate(s, 'The Bell Gate swings open. On its inner face, under twenty-five years of ash, something small is stamped into the iron.');
  await s.walk('bram', 'gate_spot');
  await s.face('bram', 'up');
  await s.music('sorrow');
  await narrate(s, 'Bram wipes the ash away with his sleeve. A founder\'s stamp: a small bell, and letters around it, deep and clean.');
  await say(s, 'bram', 'MARA OF THE FIRST BELL.');
  await s.wait(30);
  await say(s, 'bram', '...Mara. Her name is Mara.');
  await say(s, 'mira', 'The ash hid it. Hidden things survive. The Lantern taught us that.');
  await say(s, 'bram', 'She made the bell that warned us. It struck her out for ringing it.');
  await say(s, 'bram', "Mara. I'll keep saying it. Somebody has to hold it.");
  await s.sfx('level_up_sparkle');
  await narrate(s, '{c:gold}Bram learned Tempered Oath.{/c}');
  await say(s, 'mira', 'Mara. Two of us, then.');
  await s.music('mystery');
  await s.camera.follow('hero');
  await s.setFlag('bram_memory_3');
  await s.setFlag('mara_read');
  await s.setFlag('bell_gate_open');
}

// ================================================================================================
// Act V: The Cinder Warden (foundry_heart)
// ================================================================================================

// 26. foundry_heart, step trigger row warden_trig. Boss intro in the Episode 1 and 2 style; the Warden is the map
// actor cinder_warden. After a loss it only stirs, Mira repeats her tip, and the card shows. A win chains warden_after.
async function cinder_warden(s) {
  if (await s.hasFlag('cinder_warden_defeated')) return;
  if (await s.hasFlag('cinder_warden_tried')) {
    await s.music(null);
    await s.camera.panTo('warden', 40);
    await s.shake(2, 30);
    await say(s, 'mira', 'When it glows white, cool it. When the hammer goes up, put Bram in front.');
    await warden_fight(s);
    return;
  }
  await s.music(null);
  await s.camera.panTo('warden', 40);
  await s.wait(40);
  await narrate(s, 'A round crucible hall. A furnace the size of a house, and before it a bronze guardian with a molten hammer.');
  await say(s, 'cinder_warden', 'THE FIRE MUST NOT GO OUT.');
  await say(s, 'cinder_warden', 'ASH IS CLEAN. ASH FORGETS.');
  await s.shake(2, 30);
  await say(s, 'cinder_warden', 'THE ORE COUNTER. YOU AND THE FOUNDER STOPPED MY FIRE.');
  const c = await s.choice(['Put it out.', 'We came for two names.']);
  if (c === 0) await say(s, 'cinder_warden', 'A MAN CANNOT PUT OUT A MOUNTAIN.');
  else await say(s, 'cinder_warden', 'THERE ARE NO NAMES HERE. ONLY ASH.');
  await say(s, 'bram', "Mara. And my father's. I don't have his yet. I'll take it off you.");
  await say(s, 'mira', 'When it glows white, cool it. When the hammer goes up, put Bram in front.');
  await warden_fight(s);
}
async function warden_fight(s) {
  await s.setFlag('cinder_warden_tried');
  await s.title('THE CINDER WARDEN', { sub: 'Keeper of the Heartforge', frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_warden');
  const result = await s.battle('cinder_warden', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await warden_after(s);
}

// 27. foundry_heart, after the win (also runnable on its own, from an enter trigger after a reload). The order is
// the bible's. The Warden kneels, the clapper falls, the Smith comes down with Ilya and Sella, the leaf is read and
// reforged, the names rise (the Smith becomes Garrick under the flash), the hero's third stamp, the hammer.
// 24 boxes. Gives name_fragment_3 and first_bell_hammer. Sets clapper_get, leaf_get, mara_named, garrick_named.
async function warden_after(s) {
  await s.setFlag('cinder_warden_defeated');
  await s.camera.panTo('warden', 20);
  await s.shake(3, 40);
  await s.sfx('boss_die');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The Warden kneels. The white goes out of its heart, and its fire sinks to embers.');
  await say(s, 'cinder_warden', 'THE ORDER SAID KEEP THE FIRE. IT NEVER SAID WHAT FOR.');
  await narrate(s, 'Its chest opens like a door. Inside, cooling in the dark: a leaf of steel, stamped in rows with names.');
  await narrate(s, 'Its hammer slips from its hand and rings once on the stone. The head is a bell\'s clapper.');
  await s.sfx('bell_first');
  await s.setFlag('clapper_get');
  await s.spawn('smith_t', { sprite: 'npc_smith', name: 'The Smith', at: 'garrick_enter', dir: 'up' });
  await s.spawn('ilya_t', { sprite: 'npc_ilya', name: 'Ilya', at: 'garrick_enter', dir: 'up' });
  await s.spawn('sella_t', { sprite: 'npc_sella', name: 'Sella', at: 'garrick_enter', dir: 'up' });
  await all(s.walk('smith_t', 'party_stop', { speed: 'run' }), s.walk('ilya_t', 'party_stop'), s.walk('sella_t', 'party_stop'));
  await say(s, 'smith_t', "Couldn't keep the fire with the whole mountain shaking.");
  await s.camera.panTo('leaf_spot', 30);
  await narrate(s, 'On the leaf, one place is hammered flat, and beside it a newer place, half flat. The Smith\'s thumb finds the first.');
  await s.setFlag('leaf_get');
  await say(s, 'smith_t', "You can file off the letters. You can't file off the press.");
  await say(s, 'ilya_t', 'Only a Heartforge hand can raise a struck name. That is why they want him gone.');
  await s.walk('smith_t', 'garrick_anvil');
  await s.walk('bram', 'bram_anvil');
  await narrate(s, 'The Smith lays the leaf in the last heat of the Heartforge and takes the tongs. Bram takes the hammer.');
  await s.sfx('anvil_strike');
  await s.wait(20);
  await s.sfx('anvil_strike');
  await s.wait(20);
  await s.sfx('anvil_strike');
  await s.flash('#ffffff', 24);
  await s.music('triumph');
  await s.sfx('name_restore');
  await narrate(s, 'Three strokes: hand, heart, home. The third whites out the room. Letters rise out of the steel, bright as wire.');
  await say(s, 'bram', 'MARA OF THE FIRST BELL.');
  await s.setFlag('mara_named');
  await say(s, 'mara_voice', 'Good hands.');
  await s.emote('bram', 'heart');
  await say(s, 'bram', "Toll's one word.");
  await s.emote('smith_t', '...');
  await say(s, 'bram', 'Garrick.');
  // Under the flash the Smith becomes Garrick: same tile, same sprite, his name on the speaker tag.
  await s.sfx('name_restore');
  await s.flash('#fff2b0', 16);
  await s.despawn('smith_t');
  await s.spawn('garrick_t', { sprite: 'npc_smith', name: 'Garrick', at: 'garrick_anvil', dir: 'down' });
  await s.face('garrick_t', 'bram');
  await say(s, 'garrick_t', 'Paid.');
  await all(s.emote('bram', 'heart'), s.emote('garrick_t', 'heart'));
  await s.setFlag('garrick_named');
  await s.music('mystery');
  await s.camera.panTo('leaf_spot', 30);
  await say(s, 'mira', '{hero}. You are here too. Third leaf, third time.');
  await say(s, 'mira', 'Their seal is a book with nothing in it. This one has a line.');
  await say(s, 'bram', "Somebody's writing you in.");
  await say(s, 'mira', "Faster than somebody else is crossing you out.");
  await s.give('name_fragment_3');
  await say(s, 'mira', "Same seal as Aurel's list. The First Library again.");
  await say(s, 'bram', "Then that's a road too.");
  await s.music('first_bell');
  await s.camera.follow('hero');
  await say(s, 'garrick_t', "Hers. I couldn't come in for it. You did.");
  await s.give('first_bell_hammer');
  await all(s.despawn('garrick_t'), s.despawn('ilya_t'), s.despawn('sella_t'));
}

// ================================================================================================
// Act VI: The First Bell (emberpeak)
// ================================================================================================

// 28. emberpeak, on enter by the lift after warden_after. Ilya hangs the clapper, Bram rings the First Bell, the ash
// stops, the plates fill, the town gathers. 14 boxes at most. Sets first_bell_rung and pk_restored; chains ep3_ending.
async function first_bell(s) {
  await s.music(null);
  await s.spawn('garrick_t', { sprite: 'npc_smith', name: 'Garrick', at: 'gather_garrick', dir: 'up' });
  await s.spawn('pk_crowd_a', { sprite: 'npc_old_woman', name: 'Old Woman', at: 'crowd_a', dir: 'up' });
  await s.spawn('pk_crowd_b', { sprite: 'npc_farmer', name: 'Miner', at: 'crowd_b', dir: 'up' });
  await s.spawn('pk_crowd_c', { sprite: 'npc_child_a', name: 'Child', at: 'crowd_c', dir: 'up' });
  await s.spawn('pk_crowd_d', { sprite: 'npc_child_b', name: 'Child', at: 'crowd_d', dir: 'up' });
  await s.spawn('ilya_t', { sprite: 'npc_ilya', name: 'Ilya', at: 'gather_ilya', dir: 'up' });
  await s.spawn('bess_t', { sprite: 'npc_bess', name: 'Bess', at: 'crowd_d', dir: 'up' });
  await s.camera.panTo('bell_tower', 40);
  await narrate(s, 'Ilya threads the clapper into the First Bell with shaking hands. A bell wants its tongue. Twenty-five years it has waited.');
  await s.walk('bram', 'bell_rope');
  await narrate(s, 'The rope is worn smooth in the shape of a hand that is not his. Bram takes it anyway.');
  await s.sfx('bell_first');
  await s.shake(1, 20);
  await s.wait(30);
  await s.sfx('bell_first');
  await s.wait(30);
  await s.sfx('bell_first');
  await s.music('first_bell');
  await narrate(s, 'The tone rolls down the mountain, a little flat, and every door in Emberpeak opens. The ash stops falling.');
  await s.tint('none', 120);
  await s.camera.panTo('memorial', 40);
  await narrate(s, 'On the memorial wall the plates fill with letters. MARA OF THE FIRST BELL. And beside it, deep and firm: GARRICK.');
  await s.camera.follow('hero');
  await s.walk('veyra', 'gather_veyra');
  await say(s, 'veyra', 'The furnaces are banked. For the first time in a month, nothing is feeding them.');
  await s.walk('rusk', 'gather_rusk', { speed: 'run' });
  await say(s, 'rusk', 'Garrick! Watch of Emberpeak says: Garrick.');
  await say(s, 'garrick_t', 'Heard you the first time.');
  await say(s, 'ilya_t', "She'd say the tone's flat by a hair.");
  await say(s, 'garrick_t', "She'd say it, and then she'd fix it.");
  await s.walk('bess_t', 'gather_bess');
  await say(s, 'bess_t', "Three stews tonight. Hot, hotter, and Mara's.");
  await say(s, 'bram', 'Mara. Garrick.');
  await say(s, 'garrick_t', 'You going to keep doing that?');
  await say(s, 'bram', 'Forty times at breakfast.');
  await s.setFlag('first_bell_rung');
  await s.setFlag('pk_restored');
  await ep3_ending(s);
}

// 29. emberpeak at night, straight after. The forge glows the right way. A courier from Valewyn rides in with a
// decree whose seal runs like wet ink. The First Bell hums by itself. End cards. Sets ep3_complete; the integrator
// then rolls CREDITS_EP3 (counter credits3_rolled), shows END_CARD_EP3 and wakes the party at pk_inn inn_bed.
async function ep3_ending(s) {
  await s.fade('out', 60);
  for (const id of ['garrick_t', 'ilya_t', 'bess_t', 'pk_crowd_a', 'pk_crowd_b', 'pk_crowd_c', 'pk_crowd_d']) await s.despawn(id);
  await s.tint('night', 0);
  await s.music(null);
  await s.camera.panTo('night_view', 0);
  await s.spawn('courier_v', { sprite: 'npc_courier_v', name: 'Courier', at: 'east_road', dir: 'left' });
  await s.fade('in', 90);
  await narrate(s, 'That night the forge glows the right way: low and orange, a hearth and not a threat.');
  await narrate(s, 'Garrick and Bram stand at the anvil, saying nothing together. You and Mira sit on the bell tower steps.');
  await s.camera.follow('hero');
  await narrate(s, 'A rider comes up the east road, soaked to the knees, though it has not rained here in a month.');
  await s.walk('courier_v', 'bell_tower');
  await say(s, 'courier_v', "For whoever rang that bell. From the Regent of Valewyn. I think. The seal won't stay dry.");
  await narrate(s, 'On the decree, the seal runs like wet ink. Where a crest should be, there is only a smear.');
  await say(s, 'mira', 'Ink that will not stay put.');
  await say(s, 'bram', 'East, then.');
  await s.spawn('garrick_t', { sprite: 'npc_smith', name: 'Garrick', at: 'gather_garrick', dir: 'down' });
  await say(s, 'garrick_t', 'Come home after.');
  await say(s, 'bram', 'Always.');
  await s.sfx('bell_first');
  await narrate(s, 'Behind them, the First Bell hums once, by itself, as if answering something far off.');
  await s.music('mystery');
  await say(s, 'mira', "That's a bell. Under water.");
  await s.fade('out', 120);
  await s.despawn('courier_v');
  await s.despawn('garrick_t');
  await s.title('End of Episode 3', { sub: 'The Forge of Ash', frames: 240 });
  await s.title(EPISODE4_CARD.text, { sub: EPISODE4_CARD.sub, frames: 240 });
  await s.setFlag('ep3_complete');
}

// ------------------------------------------------------------------------------------------------
// Side quests (EPISODE3.md section 2)
// ------------------------------------------------------------------------------------------------

// The Coolant Station. Veyra's talk entry once met_ilya; three witnesses (their talk entries); the station object.
async function coolant_start(s) {
  await s.face('veyra', 'hero');
  await say(s, 'veyra', 'Ilya gave you the key? Good. Then you can do me a favor. Can you do me a favor?');
  await say(s, 'veyra', "The Emergency Coolant Station has been stuck on HIGH since the fire. I can't tell why, and I can't ask the dead.");
  await say(s, 'veyra', 'Ilya knew the founder. Harl reads the ground. Sella was in the mine that night. Hear them, then check the station.');
  await say(s, 'mira', 'Three witnesses, then the valve. We can do that.');
  await s.setFlag('coolant_started');
}
async function testimony_ilya(s) {
  await say(s, 'ilya', 'Veyra wants my witness. Fine. She tuned every bell on this mountain, by ear, before breakfast.');
  await say(s, 'ilya', 'The night of the fire the Warden burned her records. All of them. Before it ever touched her.');
  await say(s, 'ilya', "A thing that fears a name that much knows it matters. Tell Veyra that. It's all I have.");
  await s.setFlag('testimony_ilya');
}
async function testimony_harl(s) {
  await say(s, 'harl', 'Veyra sent you. I have readings, if you can stand the smell of soot.');
  await say(s, 'harl', "The cooling lines ran from the snow cistern. Hot to the east, cold to the north. That's how they were drawn.");
  await say(s, 'harl', 'Whoever drew them drew them to balance. The station is the last valve on that line. It still works. Nobody believes it.');
  await s.setFlag('testimony_harl');
}
async function testimony_sella(s) {
  await say(s, 'sella', 'I was nine, the night the shaft came down. Dust, and the bell, and somebody carrying me.');
  await say(s, 'sella', 'He had a young back and a sack of ore he would not drop. I do not remember his face. I remember how he walked.');
  await s.face('sella', 'bram');
  await say(s, 'sella', 'You walk away when someone thanks you. It was you.');
  await say(s, 'bram', "...I don't remember a girl. I remember the weight. I thought it was ore.");
  await s.setFlag('testimony_sella');
}
async function coolant_check(s) {
  if (await s.hasFlag('coolant_done')) {
    await narrate(s, 'The gauge reads steady. Someone has chalked THANK YOU on the valve wheel.');
    return;
  }
  const ready = (await s.hasFlag('testimony_ilya')) && (await s.hasFlag('testimony_harl')) && (await s.hasFlag('testimony_sella'));
  if (!ready) {
    await narrate(s, 'The Emergency Coolant Station. A cistern, a gauge stuck on HIGH, and a valve wheel painted red.');
    if (await s.hasFlag('coolant_started')) await say(s, 'mira', 'Veyra wants three witnesses first. Ilya, Harl and Sella.');
    return;
  }
  await narrate(s, 'Mira reads Harl\'s marks off the wall: hot to the east, cold to the north. She turns the red wheel against its rust.');
  await s.sfx('quench_hiss');
  await narrate(s, 'Water runs for the first time in twenty-five years. The gauge shivers, drops, and settles.');
  await s.give(REWARDS_EP3.coolant.item, REWARDS_EP3.coolant.qty);
  await s.give(REWARDS_EP3.coolant_extra.item, REWARDS_EP3.coolant_extra.qty);
  await say(s, 'bram', 'I feel like going down there and hitting something. In a good way.');
  await say(s, 'mira', 'The mountain is cooler by a degree. It will help, down below.');
  await s.setFlag('coolant_done');
}

// Vessa's Sand. Start (after sand_gate_open), a reminder, and the delivery. The sack is a chest in F1's sand hopper
// dead end (flag glass_sand_found, present only once sand_started).
async function vessa_sand(s) {
  const started = await s.hasFlag('sand_started');
  const found = await s.hasFlag('glass_sand_found');
  if (!started) {
    await say(s, 'vessa', 'You walked the sand road. Did you see the sand? Pale as flour. I have not had a handful in twenty-five years.');
    await say(s, 'vessa', "The foundry has a hopper of it. A dead end, they say, behind the ore lines. Bring me a sack, and I'll make you something.");
    await say(s, 'bram', 'You want sand, from a mountain full of fire.');
    await say(s, 'vessa', 'I want glass that remembers heat. Sand first.');
    await s.setFlag('sand_started');
    return;
  }
  if (!found) {
    await say(s, 'vessa', 'Any luck? The hopper is at a dead end in the ore lines, east side. It is the paler heap.');
    return;
  }
  await narrate(s, 'You tip the sack onto Vessa\'s bench. The sand runs through her fingers like flour, and she closes her eyes.');
  await s.take('glass_sand');
  await say(s, 'vessa', 'Glass that remembers fire. Finally.');
  await s.give(REWARDS_EP3.sand.item, REWARDS_EP3.sand.qty);
  await say(s, 'vessa', 'Wear it. It will not keep you from burning. But it will remember that you did not.');
  await s.setFlag('sand_done');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Conditions as in ep1.js / ep2.js; every flag is declared in quests.js FLAGS. A scene that needs
// the episode switch says `live: true`. Every other chain bottoms out at ep3_started, which only ep3_morning sets.
// ------------------------------------------------------------------------------------------------
const OATHS = ['oath_hand', 'oath_heart', 'oath_home'];
export const SCENE_CONDITIONS = {
  ep3_morning: { if: 'ep2_complete', ifNot: 'ep3_morning_done', live: true },
  sand_gate: { if: 'ep3_started', ifNot: 'sand_gate_open', live: true },
  sand_road_arrival: { if: 'sand_gate_open', ifNot: 'sand_road_arrived' },
  sand_first_fight: { if: 'sand_road_arrived', ifNot: 'sand_first_fight_done' },
  slag_crossing: { if: 'sand_road_arrived', ifNot: 'saw_slag' },
  carters_rest: { if: 'sand_road_arrived' },
  ash_view: { if: 'sand_road_arrived', ifNot: 'saw_emberpeak' },
  pk_arrival: { if: 'sand_gate_open', ifNot: 'pk_arrived' },
  veyra_square: { if: 'pk_arrived', ifNot: 'met_veyra' },
  memorial_wall: { if: 'pk_arrived' },
  ilya_bellhouse: { if: 'met_veyra', ifNot: 'met_ilya' },
  garrick_forge: { if: 'met_ilya', ifNot: 'forge_relit' },
  foundry_gate: { if: 'met_ilya', ifNot: 'foundry_entered' },
  foundry_f1_arrival: { if: 'foundry_entered', ifNot: 'foundry_f1_arrived' },
  bram_memory_1: { if: 'foundry_f1_arrived', ifNot: 'bram_memory_1' },
  liftworks_lift: { if: 'foundry_f1_arrived', ifNot: 'lift_wheel_seen' },
  foundry_f1_lift: { if: 'lift_wheel_lit', ifNot: 'foundry_f1_done' },
  foundry_f2_arrival: { if: 'foundry_f1_done', ifNot: 'foundry_f2_arrived' },
  bram_memory_2: { if: 'foundry_f2_arrived', ifNot: 'bram_memory_2' },
  bellows_specter: { if: 'foundry_f2_arrived', ifNot: 'bellows_specter_defeated' },
  foundry_f2_shaft: { if: 'bellows_specter_defeated', ifNot: 'foundry_f2_done' },
  ledger_ash: { if: 'foundry_f2_arrived', ifNot: 'ledger_found' },
  foundry_f3_arrival: { if: 'foundry_f2_done', ifNot: 'foundry_f3_arrived' },
  vex_furnace: { if: 'foundry_f3_arrived', ifNot: 'vex_furnace_met' },
  oath_hand: { if: 'foundry_f3_arrived', ifNot: 'oath_hand' },
  oath_heart: { if: 'foundry_f3_arrived', ifNot: 'oath_heart' },
  oath_home: { if: 'foundry_f3_arrived', ifNot: 'oath_home' },
  bram_memory_3: { if: OATHS, ifNot: 'bram_memory_3' },
  cinder_warden: { if: 'bell_gate_open', ifNot: 'cinder_warden_defeated' },
  warden_after: { if: 'cinder_warden_defeated', ifNot: 'garrick_named' },
  first_bell: { if: 'garrick_named', ifNot: 'first_bell_rung' },
  ep3_ending: { if: 'pk_restored', ifNot: 'ep3_complete' },
  coolant_start: { if: 'met_ilya', ifNot: 'coolant_started' },
  testimony_ilya: { if: 'coolant_started', ifNot: 'testimony_ilya' },
  testimony_harl: { if: 'coolant_started', ifNot: 'testimony_harl' },
  testimony_sella: { if: 'coolant_started', ifNot: 'testimony_sella' },
  coolant_check: { if: 'pk_arrived' },
  vessa_sand: { if: 'sand_gate_open', ifNot: 'sand_done' },
};

const RAW = {
  ep3_morning, sand_gate, sand_road_arrival, sand_first_fight, slag_crossing, carters_rest, ash_view,
  pk_arrival, veyra_square, memorial_wall, ilya_bellhouse, garrick_forge,
  foundry_gate, foundry_f1_arrival, bram_memory_1, liftworks_lift, foundry_f1_lift,
  foundry_f2_arrival, bram_memory_2, bellows_specter, foundry_f2_shaft, ledger_ash,
  foundry_f3_arrival, vex_furnace, oath_hand, oath_heart, oath_home, bram_memory_3,
  cinder_warden, warden_after, first_bell, ep3_ending,
  coolant_start, testimony_ilya, testimony_harl, testimony_sella, coolant_check, vessa_sand,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// The main-path scenes in story order, for the box-budget and playthrough tests (side scenes are not on it).
export const MAIN_PATH = ['ep3_morning', 'sand_gate', 'sand_road_arrival', 'sand_first_fight', 'slag_crossing', 'carters_rest',
  'ash_view', 'pk_arrival', 'veyra_square', 'memorial_wall', 'ilya_bellhouse', 'foundry_gate', 'foundry_f1_arrival',
  'bram_memory_1', 'liftworks_lift', 'foundry_f1_lift', 'foundry_f2_arrival', 'bram_memory_2', 'bellows_specter',
  'foundry_f2_shaft', 'foundry_f3_arrival', 'vex_furnace', 'oath_hand', 'oath_heart', 'oath_home', 'bram_memory_3',
  'cinder_warden', 'first_bell'];
/** Box budgets (EPISODE3.md section 1): 12 per main scene, except these. */
export const BOX_BUDGET = { default: 12, ep3_morning: 14, first_bell: 14, warden_after: 24 };

// ------------------------------------------------------------------------------------------------
// Inspect text (same shapes as ep1.js / ep2.js lines): a string, a list of boxes, or a conditional list
// [{ if, ifNot, lines }] whose last entry is the unconditional fallback. Map events: { type: 'sign', text: id }.
// ------------------------------------------------------------------------------------------------
export const lines = {
  // nameless_hollow, willowmere (E3-maps edits)
  sand_chain: [
    { if: 'sand_gate_open', lines: 'The old sand road, open. The chain lies coiled in the sand where Vessa let it fall.' },
    { lines: 'The old sand road. Chained since the carts stopped.' },
  ],
  smithy_gone_east: [
    { if: 'garrick_named', lines: 'A note nailed to the smithy door, in square capitals: GONE EAST. BACK FOR THE THAW. G.' },
    { lines: 'A note nailed to the smithy door, in square capitals: GONE EAST. G.' },
  ],
  pk_mirror: [
    { if: 'mirror_sigil_get', lines: 'A tall Keeper mirror among the bell molds. It ripples. Through it, faintly: a square, a fountain, lanterns on water.' },
    { lines: 'A tall old mirror, dull and spotted. It reflects the bells, and one more.' },
  ],

  // sand_road
  sand_milestone: 'A carters\' milestone, worn smooth by wheels. The number on it has been eaten by sand.',
  sand_milestone_ink: 'Under the Lantern, green letters: EMBERPEAK 3 MI. SAND FOR THE HOLLOW.',
  sand_hopper: 'Pale sand heaped in a hopper. Emberpeak sand, fine as flour. It would make good glass.',
  east_road_sign: [
    { if: 'pk_restored', lines: ['The east road. Flooded past the ridge.', 'Someone has scratched a bell and an arrow under it.'] },
    { lines: 'The east road. Flooded past the ridge.' },
  ],
  emberpeak_far: 'Emberpeak, a glow on the grey: iron roofs, a bell tower, and a furnace mouth in the mountain.',

  // The quench kit (troughs, sluices, spouts, basins, the wheel). Maps pick the ids they need.
  trough_dry: 'A stone trough, dry and grey. It was built to carry water somewhere.',
  trough_wet: 'Water runs bright and quick along the trough. Wherever it goes, the stone goes dark behind it.',
  sluice_paddle: 'A sluice paddle on a stone post. Turn it, and the water goes the other way.',
  spout_wall: 'A cold spout in the mountain face. Snowmelt from the cistern above, running whether you want it or not.',
  spout_cistern: 'A spout in the cistern floor. The water comes up cold from somewhere very deep.',
  basin_empty: 'A stone basin, dry. Something is meant to fill it.',
  basin_full: 'A stone basin, brimming. Whatever it holds up, stays up.',
  waterwheel: [
    { if: 'lift_wheel_lit', lines: 'The great waterwheel turns, slow and dripping. Far below, the lift answers it.' },
    { lines: 'A waterwheel as tall as a house, still. Its buckets are bone dry.' },
  ],
  slag_pool: 'Slag, orange and slow. The heat comes off it in waves.',
  slag_crust: 'Cooled slag: dark rock with red cracks that are going dim. It will hold a boot.',
  hot_grate_shut: 'A grate glowing too hot to touch. Whatever is behind it is waiting for the cold.',
  hot_grate_open: 'The grate has cooled to dull iron. Steam still curls off the bars.',
  ore_crate: 'A heavy crate of ore. It sits in the trough like a cork in a bottle.',
  font_cistern: 'A cistern font. The water is cold enough to ache, and it clears your head.',

  // emberpeak
  memorial: [
    { if: 'pk_restored', lines: 'Names Etched in Iron. Every plate is lettered again, and the letters are deep and bright.' },
    { if: 'saw_memorial', lines: 'The memorial wall. One plate hammered flat. One going soft, like wax near a fire.' },
    { lines: 'Names Etched in Iron. Rows of plates bolted to a wall, each stamped with a name. A few are rubbed smooth.' },
  ],
  smelter_proclamation: [
    'SMELTER PROCLAMATION. The fires are lit at the first bell and banked at the last.',
    'Beneath it, in a harder hand: ANY HAND THAT STOPS A SHIFT ANSWERS TO THE WARDEN.',
  ],
  silent_bell: [
    { if: 'pk_restored', lines: 'The First Bell. It hums when the wind finds it, and the wind has found it often.' },
    { if: 'clapper_get', lines: 'The First Bell, still silent. Ilya is polishing a place for the clapper.' },
    { lines: ['The First Bell hangs in its tower, mouth open. There is no tongue in it.', 'The rope is worn smooth in the shape of a hand.'] },
  ],
  coolant_station: [
    { if: 'coolant_done', lines: 'The gauge reads steady. Someone has chalked THANK YOU on the valve wheel.' },
    { lines: 'The Emergency Coolant Station. A cistern, a gauge stuck on HIGH, and a valve wheel painted red.' },
  ],
  safety_board: 'FORGE SAFETY. 1. Water before hands. 2. Never leave a fire unwatched. 3. Count the shift in. 4. Count the shift out.',
  fire_pit: [
    { if: 'pk_restored', lines: 'An ember pit, banked. The coals under the grate are sleeping.' },
    { lines: 'An ember pit with a grate. The coals under it glow, though nothing is feeding them.' },
  ],
  sign_pk_inn: 'THE COAL LANTERN INN. THREE STEWS: HOT, HOTTER, AND SAFE.',
  sign_pk_shop: 'VENTWORKS SUPPLIES. PIPES, GAUGES AND OPINIONS.',
  sign_pk_smithy: [
    { if: 'forge_relit', lines: 'EMBERPEAK WEAPONSMITH. A thin line of smoke is rising from the chimney, low and patient.' },
    { lines: 'EMBERPEAK WEAPONSMITH. The chimney is cold. The sign has been dusted by someone who hoped.' },
  ],
  sign_pk_bellhouse: 'THE BELL HOUSE. KNOCK TWICE. THE BELLS DO NOT MIND.',
  foundry_door: [
    { if: 'foundry_entered', lines: 'The foundry gate stands open. A lift waits behind it, chains slack.' },
    { lines: 'The foundry gate, set into the mountain face. The keyhole is worn bright by one key.' },
  ],
  stew_pots: 'Three pots on the hearth, chalked HOT, HOTTER and SAFE. The third has the best lid.',
  bell_molds: 'Bell molds in a row, clay dried hard. One is only half finished.',
  practice_bell: 'A practice bell hung low over a bench. Tap it and it answers, flat by a hair.',
  founder_bench: "The founder's workbench. Every tool has been dusted, put back, and dusted again.",
  forge_cold: 'The forge, cold. The anvil is worn to a dip by one kind of blow.',
  forge_lit: 'The forge, low and orange. It is the right kind of fire: patient, and not in a hurry.',

  // foundry_f1, f2
  records_cage: 'The records cage. Shelves of ledgers, burned to black curls. One shelf is empty and swept.',
  ledger_burned: [
    { if: 'ledger_found', lines: 'Three burned pages. Under the Lantern they read as rows of names, and one small stamp.' },
    { lines: 'Three burned ledger pages, black and curled. A faint shine on the ash, if you tilt your head.' },
  ],
  fan_great: [
    { if: 'bellows_specter_defeated', lines: 'The great fan has stopped. Soot sifts down from its blades like slow snow.' },
    { lines: 'The great fan turns, roaring. The updraft smells of hot iron and old smoke.' },
  ],
  bellows_decor: 'A bellows the size of a house. It sighs on its own, and nothing is pumping it.',
  bell_unstruck: 'An unstruck bell, hung over the gallery walk. It is cold, and it hums.',
  ore_lift: 'An ore lift, its chains slack. It wants a wheel to turn.',

  // foundry_f3, foundry_heart
  proclamation_gate: [
    'A bell rings for each craft: the one who shapes, the one who remembers, and the one who returns.',
    'The hearth cannot run without all three.',
  ],
  bell_gate: [
    { if: 'bell_gate_open', lines: 'The Bell Gate stands open. Its three sockets burn steady, and the stamp inside is bare.' },
    { lines: 'The Bell Gate, three sockets in its face. They are dark. Each wants a bell, and each bell wants an anvil.' },
  ],
  anvil_hand: [
    { if: 'oath_hand', lines: 'The Anvil of the Hand rang for you. The note is still in the iron.' },
    { lines: 'The Anvil of the Hand. Cold, worn to a dip by one kind of blow.' },
  ],
  anvil_heart: [
    { if: 'oath_heart', lines: 'The Anvil of the Heart rang for you. The note is still in the iron.' },
    { lines: 'The Anvil of the Heart. Black as the wing around it. The scars on it are all one size.' },
  ],
  anvil_home: [
    { if: 'oath_home', lines: 'The Anvil of the Home rang for you. The note is still in the iron.' },
    { lines: 'The Anvil of the Home. Smaller than the others, and the most worn.' },
  ],
  heart_anvil: 'The Heartforge anvil. Black, scarred, enormous. It has been waiting for a hammer, not a fire.',
  vex_feather: 'A black feather on the hot stone. It is not burning.',
  steel_leaf: [
    { if: 'garrick_named', lines: 'The Steel Leaf: names in rows, stamped deep. Two places shine where letters were raised.' },
    { if: 'leaf_get', lines: 'The Steel Leaf: names in rows, stamped deep. One place is flat. Another is half flat.' },
    { lines: 'A leaf of steel, set in the Warden\'s chest, cooling.' },
  ],
  heartforge: [
    { if: 'pk_restored', lines: 'The Heartforge, banked. The glow in it is the low red of a sleeping thing.' },
    { if: 'cinder_warden_defeated', lines: 'The Heartforge, sinking to embers. For the first time in a month, nobody is feeding it.' },
    { lines: 'The Heartforge furnace, as wide as a house, roaring. The heat leans on you like a hand.' },
  ],
  tool_rack: [
    { if: 'garrick_named', lines: 'A tool rack, old and well kept. Every tool hangs in its own outline. One outline is empty.' },
    { lines: 'A tool rack. Tongs, hooks, files, and a founder\'s hammer with a small bell stamped on its head.' },
  ],
};

// Credits text lives in data/text.js; re-exported here so the story module is self-contained.
export const credits = CREDITS_EP3;

export default { scenes, lines, credits };
