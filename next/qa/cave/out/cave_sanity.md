# Deep Stacks curve sanity (C1-data, 2026-10-28)

n = 60 battles per floor and policy; the cave party of data_cave_loadouts.mjs at the curve's arrival level; bestiary known; no elites except the floor's own fixed ones.

Bands: 1 catalogue (native Lv 3.0, mean group EXP 21); 2 root_cellars (native Lv 5.8, mean group EXP 47); 3 court_below (native Lv 10.3, mean group EXP 45); 4 ember_shelves (native Lv 6.5, mean group EXP 38, EP3 fallback); 5 forge_of_names (native Lv 7.3, mean group EXP 40, EP3 fallback)

EXP pace knots [floor, pace]: [[0,2.03],[9,2.03],[29,2.06],[59,2.29],[89,6.19],[99,2.94]]

| floor | Lv | ilvl | hp / power / speed / expMul | careful win | rounds (p10-p90) | HP lost | KOs | attack-only win | rounds |
|---|---|---|---|---|---|---|---|---|---|
| B1 | 1 | 1 | 0.38 / 0.3 / 0.91 / 3.05 | 100% | 2.72 (1.6666666666666667-4) | 10% | 0.00 | 100% | 4.34 |
| B1b | 1 | 1 | 0.38 / 0.3 / 0.91 / 3.05 | 100% | 2.36 (1.3333333333333333-3.6666666666666665) | 8% | 0.00 | 100% | 3.59 |
| B5 | 9 | 1 | 1.22 / 1.54 / 1.24 / 3.05 | 100% | 2.56 (1.6666666666666667-3.6666666666666665) | 8% | 0.00 | 100% | 4.76 |
| B10 | 12 | 2 | 1.74 / 3.57 / 1.43 / 3.05 | 100% | 2.35 (1.3333333333333333-3.3333333333333335) | 12% | 0.00 | 100% | 4.37 |
| B30 | 25 | 6 | 2.33 / 12.42 / 1.89 / 3.11 | 100% | 3.01 (2-4) | 20% | 0.00 | 72% | 5.00 |
| B60 | 40 | 11 | 4.3 / 18.05 / 2.69 / 3.63 | 100% | 3.28 (2-4.666666666666667) | 16% | 0.02 | 65% | 5.65 |
| B90 | 55 | 16 | 5.59 / 39.9 / 3.66 / 8.8 | 100% | 3.47 (2-5.666666666666667) | 13% | 0.03 | 50% | 5.27 |
| B99 | 59 | 16 | 5.75 / 45 / 3.9 / 4.41 | 100% | 3.18 (2-5) | 15% | 0.03 | 60% | 5.16 |

## Per template (careful play)

B1: slimes 100% 1.6r 3% (n 16); wraith 100% 2.5r 7% (n 9); mites 100% 3.2r 15% (n 8); mixed 100% 4.2r 14% (n 6); scarab 100% 3.2r 6% (n 5); pack 100% 3.6r 17% (n 6); wolves 100% 2.0r 10% (n 5); wraiths 100% 3.5r 13% (n 5)
B1b: slimes 100% 1.3r 3% (n 16); wraith 100% 2.1r 6% (n 9); mites 100% 2.7r 13% (n 8); mixed 100% 4.0r 14% (n 6); scarab 100% 2.7r 4% (n 5); pack 100% 3.1r 15% (n 6); wolves 100% 1.9r 8% (n 5); wraiths 100% 2.9r 12% (n 5)
B5: pack 100% 3.1r 17% (n 7); scarab 100% 2.4r 3% (n 10); mixed 100% 3.4r 10% (n 9); slimes 100% 1.5r 3% (n 10); wraith 100% 2.8r 8% (n 8); wolves 100% 2.0r 7% (n 8); wraiths 100% 3.7r 12% (n 4); mites 100% 2.3r 9% (n 4)
B10: mixed 100% 3.5r 13% (n 8); slimes 100% 1.3r 6% (n 9); wolves 100% 1.9r 13% (n 12); wraiths 100% 3.3r 16% (n 2); wraith 100% 2.3r 9% (n 6); pack 100% 2.9r 18% (n 8); scarab 100% 2.2r 7% (n 7); mites 100% 2.5r 13% (n 8)
B30: golem 100% 2.6r 13% (n 3); golem_wraith 100% 3.5r 23% (n 8); thornbacks 100% 2.7r 16% (n 11); blots 100% 2.3r 16% (n 9); wraiths 100% 2.8r 25% (n 10); golem_wraith (elite) 100% 4.0r 20% (n 2); mixed 100% 3.1r 23% (n 5); golem (elite) 100% 3.4r 12% (n 3); mixed (elite) 100% 3.7r 25% (n 1); thornbacks (elite) 100% 3.7r 29% (n 1); ink 100% 3.4r 35% (n 4); shelf 100% 3.5r 20% (n 2); wraiths (elite) 100% 5.7r 0% (n 1)
B60: cat_mites 100% 2.3r 22% (n 2); cat_wolves (elite) 100% 3.7r 19% (n 2); cat_slimes 100% 1.7r 11% (n 2); cel_thornbacks 100% 2.9r 14% (n 5); court_beetles 100% 3.7r 4% (n 2); court_shards (elite) 100% 3.7r 0% (n 1); cat_mixed 100% 4.3r 21% (n 2); cel_mixed 100% 3.5r 22% (n 4); cel_golem 100% 2.5r 11% (n 4); cel_wraiths 100% 2.8r 15% (n 2); cel_golem_wraith 100% 3.3r 18% (n 3); cel_golem_wraith (elite) 100% 4.5r 16% (n 2); cat_scarab 100% 2.8r 12% (n 3); cel_thornbacks (elite) 100% 3.3r 22% (n 1); cat_mites (elite) 100% 2.7r 20% (n 1); court_knight 100% 3.3r 6% (n 1); cel_blots 100% 2.2r 14% (n 2); cel_blots (elite) 100% 4.0r 8% (n 1); cel_ink 100% 3.0r 29% (n 2); court_shadow_pair (elite) 100% 4.3r 30% (n 1); cat_wolves 100% 2.0r 17% (n 2); court_court 100% 5.3r 4% (n 1); cel_golem (elite) 100% 4.3r 34% (n 1); court_sentinel 100% 3.0r 2% (n 1); cat_pack (elite) 100% 4.0r 31% (n 1); court_wolves (elite) 100% 4.3r 0% (n 1); court_shards 100% 4.0r 31% (n 1); cat_wraiths 100% 3.0r 20% (n 1); cat_pack 100% 3.2r 28% (n 2); cat_wraith 100% 1.7r 5% (n 1); cat_slimes (elite) 100% 3.0r 6% (n 1); court_knight (elite) 100% 5.0r 2% (n 1); cel_ink (elite) 100% 4.7r 12% (n 1); court_shadows 100% 4.0r 22% (n 1); cat_mixed (elite) 100% 5.7r 0% (n 1)
B90: court_beetles 100% 3.5r 3% (n 2); court_shadows (elite) 100% 4.0r 24% (n 1); cel_blots 100% 2.5r 6% (n 2); cat_pack 100% 3.7r 26% (n 1); court_knight (elite) 100% 3.3r 8% (n 3); cel_golem_wraith 100% 4.3r 3% (n 1); court_knight 100% 2.9r 9% (n 6); cel_golem 100% 2.8r 12% (n 2); cat_slimes 100% 2.0r 12% (n 3); cel_shelf (elite) 100% 3.7r 7% (n 1); court_sentinel 100% 3.0r 8% (n 2); court_court (elite) 100% 6.7r 14% (n 1); court_wolves (elite) 100% 3.7r 9% (n 2); cat_mixed 100% 3.8r 18% (n 2); cel_wraiths (elite) 100% 6.3r 39% (n 2); court_court 100% 6.5r 21% (n 2); court_shadow_pair (elite) 100% 5.7r 3% (n 1); court_shards (elite) 100% 3.7r 33% (n 1); court_shadows 100% 2.5r 2% (n 2); court_beetles (elite) 100% 5.0r 11% (n 1); cat_wraith 100% 1.8r 12% (n 2); court_wisps 100% 2.0r 14% (n 1); court_wolves 100% 3.0r 11% (n 1); court_wisps (elite) 100% 4.3r 17% (n 2); cel_mixed 100% 3.8r 23% (n 2); cel_thornbacks 100% 2.3r 19% (n 1); cat_wraiths (elite) 100% 4.0r 29% (n 1); court_shadow_pair 100% 3.0r 21% (n 1); cat_wolves (elite) 100% 3.4r 15% (n 3); cel_golem (elite) 100% 4.3r 4% (n 1); court_shards 100% 2.4r 4% (n 4); cel_blots (elite) 100% 3.7r 24% (n 1); cel_shelf 100% 3.7r 5% (n 1); cat_slimes (elite) 100% 2.3r 18% (n 1)
B99: court_shadows 100% 2.9r 16% (n 6); court_knight (elite) 100% 4.7r 5% (n 2); court_shadows (elite) 100% 3.7r 17% (n 2); cel_mixed (elite) 100% 5.0r 20% (n 1); cel_golem (elite) 100% 4.3r 10% (n 1); court_sentinel 100% 3.1r 9% (n 3); court_shadow_pair 100% 3.0r 12% (n 2); cel_thornbacks 100% 3.2r 23% (n 2); cat_wraith 100% 1.7r 10% (n 1); court_wisps 100% 2.8r 9% (n 2); cat_wolves 100% 2.7r 19% (n 2); court_sentinel (elite) 100% 3.8r 23% (n 2); court_knight 100% 2.9r 12% (n 6); cel_golem_wraith 100% 3.2r 23% (n 2); cat_wolves (elite) 100% 2.7r 24% (n 2); court_court 100% 5.7r 23% (n 1); cel_mixed 100% 4.4r 23% (n 3); cat_slimes 100% 1.3r 13% (n 2); court_wolves 100% 2.3r 20% (n 1); court_shards (elite) 100% 4.3r 3% (n 1); cel_golem 100% 2.7r 5% (n 1); cat_mites (elite) 100% 2.3r 24% (n 1); cel_wraiths (elite) 100% 3.3r 9% (n 1); court_beetles 100% 3.1r 2% (n 4); cel_thornbacks (elite) 100% 5.0r 5% (n 1); cel_wraiths 100% 2.0r 22% (n 1); cat_mixed 100% 3.0r 32% (n 1); cat_mites 100% 2.3r 14% (n 1); cat_slimes (elite) 100% 2.0r 17% (n 1); cel_blots (elite) 100% 3.3r 24% (n 1); court_wisps (elite) 100% 4.0r 43% (n 1); cat_scarab (elite) 100% 3.0r 23% (n 1); court_shards 100% 2.7r 8% (n 1)

## The Binder (B100) at Lv 58

- competent: win 70%, rounds 10.34 (7.333333333333333-13.666666666666666), HP lost 53%, KOs 1.67
- naive: win 0%, rounds 5.70 (4.333333333333333-7), HP lost 100%, KOs 3.00
- reckless: win 37%, rounds 9.67 (6.666666666666667-12.666666666666666), HP lost 76%, KOs 2.30

(8.6 s)
