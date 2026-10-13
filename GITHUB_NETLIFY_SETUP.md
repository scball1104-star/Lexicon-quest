# Lexicon Quest - existing GitHub repository to existing Netlify site

GitHub repository: https://github.com/scball1104-star/Lexicon-quest
Netlify production site: https://forgotten-words.netlify.app
Production branch: main

## 1. Put the complete game in GitHub (Windows)

1. Install and sign into GitHub Desktop: https://desktop.github.com/
2. In GitHub Desktop, use File > Clone repository; select `scball1104-star/Lexicon-quest` and choose a local folder.
3. Extract this ZIP into a *different* temporary folder. The extracted root must contain `index.html`, `game.js`, `rpg-engine.js`, `assets/`, `qa/`, and `netlify.toml`.
4. Copy all extracted files and folders INTO the repository folder created by GitHub Desktop (the root directory, not a nested subfolder). Never remove the repo's hidden `.git` folder.
5. In GitHub Desktop, review Changes, enter summary `Publish Willowmere Chapter I` and click Commit to main, then Push origin.
6. Verify the GitHub repository web page now lists `index.html` and `netlify.toml` at the top level and an `assets` directory.

## 2. Connect GitHub to the EXISTING Netlify project

1. Log in at https://app.netlify.com/ and open the existing `forgotten-words` project.
2. Open Project configuration > Build & deploy (or Developer settings) > Continuous deployment > Repository.
3. Choose Link repository, then GitHub, and authorize the Netlify GitHub App to access `scball1104-star/Lexicon-quest` if prompted.
4. Select `scball1104-star/Lexicon-quest` and production branch `main`.
5. The `netlify.toml` in the repository specifies the build command and `publish = "."`. If Netlify asks for these settings explicitly, use build command `node verify-rpg.cjs && node verify-ui.cjs && node qa/willowmere-test.cjs && node qa/tactical-combat-test.cjs && node qa/sw-test.cjs` and publish directory `.`.
6. Save/link and open Deploys. Wait for the build to report Published, then open https://forgotten-words.netlify.app/ from a phone or PC.

IMPORTANT: Do not select Add new project; that would create a second Netlify site with a different address. Linking the repository to the existing site preserves the site's URL and origin-based browser saves.

## 3. Automatic deployment behavior

Netlify monitors commits pushed to the linked GitHub `main` branch. On each push it runs the three Node QA suites, and only publishes on success. Merely editing files in ChatGPT does not itself create a GitHub commit; the changes must be pushed to GitHub via GitHub Desktop, another authorized Git tool, or a write-enabled coding environment.

## Troubleshooting

- Repository not visible in Netlify: use Configure Netlify on GitHub (or GitHub's Installed GitHub Apps settings) to grant Netlify access to this repository.
- Netlify deploy fails: inspect Deploys > failed deploy > build log; check the root contains the complete site, not a folder containing the site.
- Site still appears old: reload Safari or clear the site's service-worker cache if appropriate; test in a private browser window without disturbing your normal saves.
- No new commit in GitHub: return to GitHub Desktop and use Push origin.
- Browser saves: existing saves are local to the domain and browser. Preserve the existing Netlify site and URL. Export important save codes before major releases.
