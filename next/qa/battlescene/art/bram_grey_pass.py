"""Retired 2026-11-03 (polish-battle): Bram's grey (CRITIQUE_5 item 7) now lives in the sprite build,
tools/art/sprites/bram_grey.py apply() (bands plus the crown mix), ON by default (LQ_BRAM_GREY=0 for the brown Bram),
called by build_party_field.py and build_party_battle.py. The old post-pass also greyed the aliased bram_combo and
bram_levelup rects a second time (12 px); the build greys each frame once. Running a pass on the built sheet would grey twice."""
import sys
sys.exit('folded into tools/art/sprites/bram_grey.py (ENABLED by default); rebuild the sheets instead')
