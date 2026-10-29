# Lexicon Quest Kids Edition

A separate, kid-sized game built by Stephen's Claude on top of Lexicon Quest NEXT's art and sound. It is not part
of `next/` and does not share its saves or service worker.

- Play locally: from the repo root, `python -m http.server 8777`, open http://localhost:8777/kids/
- Live (after the next ship): https://scball1104-star.github.io/Lexicon-quest/kids/
- Code: plain ES modules in `src/` (`main.js` screens and menus, `game.js` levels and combat, `maps.js` floors,
  `world3d.js` and `models.js` the 3D view, `runway.js` the Runway minigame, `shop.js` pets and upgrades).
  Three.js r128 loads from cdnjs.
- Art and sound in `assets/` are copies of NEXT's files (`next/assets/...`), reused as is. Add nothing here that
  would not be allowed in NEXT (see "Art and music sources" in `AGENTS.md`).
- Kids' ideas go in as issues labeled `idea` and `from-playtesters`.
