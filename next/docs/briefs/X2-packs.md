# X2-packs: RETIRED (superseded by `XP-packs.md`)

Reconciled 2026-10-25. The pack mechanism, the data registry seams, atlas resolution across atlases, the PWA exclusion and the load-budget ratchet are built **once, for both expansions, in the Episode 1 build** (X1 wave W1, the first job):
`docs/briefs/XP-packs.md`. There is no X2-packs agent.

What an Episode 2 agent still needs from it:
- `src/data/x2/index.js` and `src/data/x2/live.js` already exist (skeletons, `X2_LIVE = false`). Every `src/data/x2/*` module exports `register()`; the index calls them in the fixed order.
- New art and data files carry the `x2_` prefix (`assets/tiles/x2.png` and `x2_tiles.json`, atlases `x2_*`, `src/data/maps/x2_*.js`) and are listed by `node qa/core/sync-manifest.mjs --pack x2` into `assets/x2_manifest.json`.
- The edited existing maps (`east_road`, `nameless_hollow`, `nh_chapel`, `court_f1`, `court_f2`, `court_f3`) are the `touches` list of the `x2` pack; their additions are gated by `x2On()`.
- The budget: the initial download ratchet ends at 6.45 MB (cap 6.5 MB unchanged); the `x2` pack is at most 0.8 MB wire.
