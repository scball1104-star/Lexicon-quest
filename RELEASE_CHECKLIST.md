# Lexicon Quest — Sunken Keep Edition release checklist

## Before replacing your live site

1. On the live game, export important save slots from the Field menu and store the export codes securely.
2. Extract the complete release ZIP and verify that `index.html` is in its root alongside `rpg-engine.js`, `rpg-chapter4.js`, `netlify.toml` and `assets/`.
3. Run the release QA command in `netlify.toml`, or use the packaged static assets to deploy to your **existing** Netlify project. Do not create a second Netlify site if you want to preserve your current URL.
4. On iPhone Safari and desktop Chrome, check: load an old v3 save; enter Valewyn; make one council choice; complete each floodgate and crossword; win the Paper Regent encounter; close and reopen the tab and check the latest autosave.
5. Listen for audio looping, inspect layout on a small phone, check that the battle target selections are responsive, and verify there are no console errors.
6. Confirm the offline service worker has refreshed before testing offline play. Older cached builds may appear after first load; a second refresh can be necessary.

## Status

- **Packaged and verified offline release**; not automatically published to the GitHub repository or Netlify.
- Developer synthetic-browser and automated game-logic tests passed. Actual hosted and device results still require verification.
- Save version stays at v3 but live browsers maintain saves per origin, not in the ZIP file itself. Maintain your existing domain.
