# Lexicon Quest v62 — Living Combat Studio

**Development status:** Implemented on `feature/v62-living-combat`. Built on v61 Adventure Wayfinder and v60 Premium RPG. Production `main` and the Netlify deployment have not been changed.

## What this milestone delivers

- **Active-character battle portrait.** The current ally is now rendered in the combat header through the existing original directional character sprite atlas, instead of relying only on a text turn label.
- **Context-sensitive combat choreography.** Canvas effects express melee strikes, piercing, fire, ice, arcane techniques, party healing, mana recovery, Aegis/Guard, and Triad Resonance. Effects use deterministic particles, movement paths, impacts, rings, and spell signatures.
- **Foe idle animation.** Enemies breathe/hover gently. Protected foes get distinct silhouettes; charging attacks receive a legible visual telegraph.
- **Presentation synchronized with rules.** The acting party member is captured *before* the turn advances, and the visual model reads confirmed battle-effect deltas. No new damage calculation, animation-gated input, or RNG mutation was introduced.
- **Responsive battlefield.** Portraits, effects, HP data and actions retain existing mobile and desktop layouts. Reduced-motion devices skip the animation while retaining all tactical text.
- **Offline readiness.** Both new studio files are precached under a new versioned offline shell; videos/music still load on demand.

## Implementation

- `v62-combat-studio.js` — pure action classification/palettes, seeded particles, frame drawing, sprite portrait, stage animation and effect lifecycle.
- `v62-combat-studio.css` — premium battle layout supplements, danger warnings, hover and idle state, mobile viewport behavior and reduced-motion accessibility.
- `rpg-ui.js` — light hooks that record the actor and invoke the studio after an authoritative game render.
- `index.html`, `sw.js` — deterministic asset load and offline cache.
- `qa/v62-combat-studio-test.cjs` and `qa/v62-browser-smoke.py` — rules-preservation, eight-guardian regression, visual effects checks, accessible mobile and desktop rendering.

## Validation and release policy

The GitHub Actions `Full RPG + mobile QA` job executes the exact command in `netlify.toml`; feature branch Chromium QA exercises both desktop and phone views, and a non-reduced-motion frame assertion confirms an animated effect actually appears. This document does not claim a branch is green until Actions has completed successfully.

**No merge to `main`, Netlify publish, or paid AI-art asset import has occurred.** The work remains on a self-contained feature branch until production release is explicitly requested.

## Known boundaries and next improvements

The game still uses much of its existing authored art; the studio adds drawn choreography rather than finished, manually cut animation atlases. The next major art-production stage should replace hero and enemy battle motions, improve map tiles and scene-specific effects, and review collisions/readability on physical phones. Commercial RPG polish takes sustained art and playtesting; v62 is a meaningful step, not the final bar.

## Testing

Local tests in the repository:

```sh
node qa/v62-combat-studio-test.cjs
python qa/v62-browser-smoke.py
```

For the full Netlify-equivalent suite, use the build command in `netlify.toml`. GitHub Actions on `feature/v62-living-combat` runs it automatically without deploying the production site.
