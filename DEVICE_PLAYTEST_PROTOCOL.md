# Final Device & Playtime Certification Protocol

The roadmap is code-complete except for two evidence-based gates that require real-world play.

## #093 Low-memory iPhone performance
1. Deploy this exact folder to the existing HTTPS site.
2. On at least one recent iPhone and one older supported iPhone, open the game in Safari and as an Add-to-Home-Screen PWA.
3. Play at least 20 minutes including overworld, regional town, ruins, crossword, and a boss.
4. Background the game for 5 minutes while using several other apps, then return. Confirm no reset, white screen, audio lock, or lost unsaved in-memory state beyond the documented save behavior.
5. Rotate portrait/landscape repeatedly during town, dungeon, crossword, and combat screens.
6. Save, force-close, relaunch, continue, and export the playtest report.
7. Record device model, iOS version, browser/PWA mode, any crashes, and peak symptoms.

## #100 Measured 15–20-hour content verification
1. Begin a clean Standard-difficulty save with no debug edits.
2. Complete all eight main chapters plus a representative majority of optional ruins, regional story quests, town restorations, aftermaths, elite hunts, companion arcs, rival encounters, rescues, and forge content.
3. At THE END, export the in-game playtest JSON. Use `playtimeSeconds` as the active foreground time measure.
4. Repeat with at least three players. A credible 15–20-hour claim should be based on observed playtime, not extrapolated screen counts.
5. Record friction points, clue repeats, difficulty spikes, navigation confusion, and optional-content completion. Use the median playtime and issue log for the final certification decision.
