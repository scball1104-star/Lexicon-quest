# W12: Episode 2 art pass (after publish)

Episode 2 is live (2026-10-21). This pass lifts the art the W11 fix pass deferred to Episode 1's level. Read
`docs/briefs/COMMON.md`, `DESIGN.md`, and `docs/CRITIQUE_4.md` items 5, 6, 9 and 15 plus its "Protect these" list.

## Items, in order

1. **Five Episode 2 portraits** (`elian`, `anwen`, `tovin`, `lena`, `aurel`; CRITIQUE_4 item 5). Repaint at 48 px and
   32 px to match Episode 1: three-quarter view, key light from the upper left, 4 to 5 skin steps, hair in clusters,
   shoulders. References: `mael`, `garrick`, `pip`, `hob` in `assets/sprites/portraits.png`. The unused painted cells
   `hooded_sage` and `noble_lady` in `../assets/art/portraits.png` (no references in `src/`) may stand in where they
   fit a character's description in `docs/story/EPISODE2.md`; say which and why. Build through
   `tools/art/sprites/build_portraits.py` (or a sibling tool) so the sheet stays reproducible.
2. **Other Selves battle sprites** (item 9). Today they are flat violet cutouts. Each must read as its owner's
   silhouette in glass (the hero's, Mira's and Bram's poses and weapons), with all the animation states the battle
   scene uses. Keep the distinct timeline icons W11 added.
3. **The King's battle art focal point** (item 15): a readable face or crown and a clear silhouette in both the veiled
   and unmasked states, at the size the stage draws him on the phone.
4. **Court per-room wall strips** (item 6's unfinished part): varied wall art per Court room so F1 to F3 and the throne
   do not share one strip.

Quality gate for every item: put before and after side by side with an Episode 1 reference on the phone profile, and
keep the change only if it is clearly better. If an item cannot beat what exists, keep the old art and say so.

## Rules

- Owned paths: `next/assets/**` (sprites, portraits, tiles), `next/tools/art/**`, the sprite and portrait id wiring
  in `next/src/**` only where a new frame needs registering, `next/qa/**` (tests, labs; `qa/shots.json` append only).
  Not: PLAN.md, PROGRESS.md, HANDOFF.md, the review docs, story text, balance data.
- No git. No em dashes. Every subprocess gets a timeout; one browser job at a time; this account also runs the owner's
  business loops, so prefer targeted renders.
- Verify: `node next/qa/run.mjs` green; `python next/qa/shots.py --only <affected shots> --device all` with zero
  console errors; LOOK at every before/after on phone and desktop. Precache size stays under the budget
  (`qa/pwa/precache.test.mjs`).
- Report under 400 words: each item kept or reverted with why, before/after paths
  (`next/qa/integrate/out/w12_*`), files touched, test counts, a plain-words paragraph for the owner.
