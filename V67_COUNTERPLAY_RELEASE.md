# Lexicon Quest v67 — Cinematic Counterplay

Development branch: `feature/v67-battle-counterplay`. Started from current v66 `main` without modifying or publishing to the production branch.

## Goal

Close the combat readability gap: v62/v64 choreographed the *player's* attacks, while an enemy phase could damage companions without equally distinctive visual feedback.

## Implemented

- **Enemy retaliation read from real combat results.** `v67-counterplay.js` consumes the existing `LQBattleEffects.make` snapshot only after `Game.act` finishes. It looks for negative HP deltas among allies and ignores MP changes, healing, and unaffected party members.
- **Actual, attributed damage numbers.** Each injured party member shows a visible negative-HP indicator and a short screen-shudder effect. The recap names each injured hero and reports exactly the HP lost; a heavier presentation activates for total confirmed damage of at least 38 HP.
- **Realm-specific incoming impacts.** Eight authentic realm palettes drive projected attack beams and impact rings from the enemy side of the arena. The effect deliberately does *not* identify a particular attacking enemy when the combat snapshot does not provide that information.
- **Accessibility first.** Reduced-motion devices get static damage indicators and the HP recap, with no moving canvas. The response layout adapts to small phones.
- **No game-rules or save changes.** The director neither calls `Game.act` nor writes flags, saves, HP or RNG. The game remains turn-based with unchanged controls, Focus, weapons, skills, and three-member party. The latest v66 animated creature / dungeon / world artwork is untouched.
- **Offline support.** The JavaScript and CSS assets are precached with a distinct v67 offline shell.

## Files

- `v67-counterplay.js` — damage extraction, safe damage labels, eight-region visual rendering, transient animations
- `v67-counterplay.css` — damage reports, companion impact, mobile and reduced-motion styles
- `rpg-ui.js` — one additive hook in the existing battle renderer
- `index.html` and `sw.js` — loading and cache order
- `qa/v67-counterplay-test.cjs` — deterministic tests on HP/MP separation, all eight regions, visual drawing, and no mutation
- `qa/v67-browser-smoke.py` — Chromium desktop and mobile playthrough checks, including a rendered counterattack and mobile motion settings
- `.github/workflows/quality-gate.yml` — uses existing complete RPG regression and current v66 campaign browser tests

## Validation and release boundaries

GitHub Actions executes the full `netlify.toml` verification command. Desktop and mobile tests run against a local HTTP server on the isolated branch; they never deploy Netlify.

Known limits: These are **presentation improvements**, not a new enemy combat AI, reactive interruption mechanic, or manually animated cinematic. They enhance legibility of real enemy damage. The entire game still needs full playtesting, scene curation and production-quality sprites before it can fairly be compared to a commercial AAA-quality JRPG.

No merge into `main`, Netlify deploy, or existing-save migration is required or performed here. Review the branch and Actions screenshots before any eventual coordinated release.
