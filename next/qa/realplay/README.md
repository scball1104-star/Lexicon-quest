# qa/realplay: the game played through real controls

Every bot and test before this one acts through `LQ_DEBUG`, which closes menus itself and skips the input path. That hid a
frozen battle for 11 days (PR #14). This driver reads through `LQ_DEBUG` and `LQ_ENGINE` and may set up a start point (a save,
a fight, a warp), but every action inside a tested sequence is a real key press, a finger on an on-screen control, or a touch
on the canvas. A guard counts `LQ_DEBUG.press`, `battleAct` and `battleUntil`; one call fails the sequence.

    python next/qa/realplay/run.py                 under 10 minutes: desktop, phone, a portrait subset
    python next/qa/realplay/run.py --full          every sequence on all three
    python next/qa/realplay/run.py --device phone --only flee,shop

Exit 1 on a failed check, a Stuck wait (a screenshot is taken), a console or engine error. Output in `next/qa/out/realplay/`.
A local pre-ship step, not part of CI (`next/qa/run.mjs` does not run it). It needs Playwright with Chromium.

| File | Covers |
|---|---|
| `driver.py` | `Play`: boot, `act`, `tap`, `until`, `check`, the guard |
| `battle.py` | every root command, sub-lists, targets, Item, Swap, Flee, Auto, Answer, rewards |
| `menus.py` | pause menu pages, equip, Config, Save, quit, Load |
| `ep4field.py` | walking, talk, chest, map stairs, a wheel low / mid / high, a pontoon, a forged seal |
| `title.py` | the tap gate, the Episode 4 row and its asks, `?ep=4`, name entry, the rotate card |
| `boss.py` | the Inkbound Barrister, from the trigger to the field after the win |
| `hunt.py` | what bots never do: mashing, keys held across changes, every list row, a shop, a wipe, Touch controls Off |
| `worldmap.py` | world map travel (#103): Valewyn's stone to Willowmere and back by road, the arrival cell, music, autosave slot; the offline refusal |

On touch the driver runs at 1x: a CDP touch takes about 100 ms to land, and at 2x that is the 18 frames of menu auto-repeat, so
one press would walk two rows. That is the harness, not the game.

Add a sequence: write a function taking `p`, list it in the module's `SEQUENCES`. Start points are set-up; after that use only
`p.act`, `p.tap`, `p.hold` and the walkers.
