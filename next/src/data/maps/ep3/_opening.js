// The episode openings (docs/WORLD_MAP_PLAN.md section 4, issue #99): Episodes 3 to 6 each open in their own place, not in
// the last episode's inn. Lives in the ep3 pack (never in the first download); the ep4, ep5 and ep6 packs load after it, so
// their opening rooms use the same field event.
//
// The field event `opening_stage` (put STAGE in a map's events) gives the cutscene API of the field that loads that map two
// helpers, the way the ep5 pack adds `leaderAt` (src/data/ep5/field/events.js):
//   s.leaderAt()          the leader's tile [x, y]: a morning plays only where it is staged, else it moves the party there first
//   s.openingTint(name)   the opening's light. The credits handoff (field.js rollCredits) sets 'day' once its own transition
//                         ends, which is after a scene the wake map starts on entry has begun. While the screen is black this
//                         keeps it black (a long fade tween, so rollCredits leaves the alpha alone), waits for the engine's
//                         transition to finish (bounded), then sets the tint and hands the black screen back to the scene's own
//                         fade in. A quick start or a resumed save (screen not black) gets the tint at once.
import { EXT } from '../../../world/events.js';

export const STAGE = { id: 'opening_stage', type: 'opening_stage', x: 0, y: 0, on: 'enter' };   // `on`: the map tools count it as reached
/** The longest the black hold waits for the handoff's transition (frames; rollCredits' fadeTo takes 72 at most). */
export const HANDOFF_HOLD = 240;

export function installOpening(field) {
  const api = field && field.cutscene && field.cutscene.api;
  if (!api) return false;
  if (!api.leaderAt) api.leaderAt = () => (field.leader ? [field.leader.tx, field.leader.ty] : null);
  if (!api.openingTint) {
    api.openingTint = async (name) => {
      const E = field.engine;
      if (field.fadeAlpha >= 0.99 && !field.dead && E) {
        field.fadeScreen(1, HANDOFF_HOLD);   // not awaited: a tween only so rollCredits keeps the screen black
        for (let i = 0; i < HANDOFF_HOLD && E.transition && !field.dead; i++) await E.waitFrames(1);
        await E.waitFrames(2);
        if (!field.dead) { field.fadeTween = null; field.fadeAlpha = 1; }
      }
      if (!field.dead && field.lighting) field.lighting.setTint(name, 0);
    };
  }
  return true;
}

if (!EXT.opening_stage) EXT.opening_stage = { create(field) { installOpening(field); } };

/** Is the leader on this tile? Without leaderAt (an old field, a test API) the answer is `fallback`. */
export function standsOn(s, at, fallback) {
  const L = s && 'leaderAt' in s ? s.leaderAt() : null;   // `in`: the content tests' API proxy throws on an unknown get
  return L ? L[0] === at[0] && L[1] === at[1] : fallback;
}
