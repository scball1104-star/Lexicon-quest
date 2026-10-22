# W13: small backlog after the Episode 2 publish

Read `docs/briefs/COMMON.md` and `DESIGN.md` first. Each item is small; keep each change local and reversible.

1. **King fight HUD placement** (left over from W12): the "!" telegraph bubble covers the Nameless King's veil, and a
   two-line help box hides the top points of his crown. Place the bubble and the help box so a tall boss's face and
   crown stay visible, phone and desktop. Check every boss in both episodes after the change (Archivore, Echo Warden,
   Briar Alpha, Elder Alpha, the Other Selves, the King veiled and unmasked).
2. **Map previews**: regenerate `tools/maps/previews/` for the Court maps so they show W12's per-room walls; update
   `docs/MAPS.md` image references only if names change.
3. **A 2x Briar Alpha avatar** where the bestiary or boss card uses a stretched one (find the stretched use first;
   if none is visibly stretched, say so and skip).
4. **Autoplay visits Whisperwood Hollow**: extend `qa/autoplay.py` so the Episode 1 route can include the optional
   dungeon (a flag or option, default off so the gate run time does not grow), and prove it once on desktop with 0
   game overs.
5. **DESIGN.md**: document the two engine additions W11 made, the `closeup(kind, opts)` cutscene step (section 5.4)
   and a field map's `respawn: 'reentry'` (section 5.2), in the existing style.

Rules: owned paths are what each item needs under `next/src/battle/scene/**`, `next/src/ui/**`, `next/assets/**`,
`next/tools/**`, `next/qa/**` (`qa/shots.json` append only), `next/DESIGN.md`, `next/docs/MAPS.md`. No git. No em
dashes. Every subprocess gets a timeout; one browser job at a time. Verify with `node next/qa/run.mjs` and
`python next/qa/shots.py --only <affected shots> --device all`; LOOK at every boss before/after on the phone.
Report under 300 words with before/after paths (`next/qa/battlescene/out/w13_*`), files touched, test counts, and a
plain-words line for the owner.
