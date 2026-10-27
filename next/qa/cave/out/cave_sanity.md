# Deep Stacks curve sanity (C1-data, 2026-10-27)

n = 60 battles per floor and policy; the cave party of data_cave_loadouts.mjs at the curve's arrival level; bestiary known; no elites except the floor's own fixed ones.

Bands: 1 catalogue (native Lv 3.0, mean group EXP 21); 2 root_cellars (native Lv 5.8, mean group EXP 47); 3 court_below (native Lv 10.3, mean group EXP 45); 4 ember_shelves (native Lv 12.6, mean group EXP 83, EP3 fallback); 5 forge_of_names (native Lv 12.0, mean group EXP 96, EP3 fallback)

EXP pace knots [floor, pace]: [[0,2.03],[9,2.03],[29,2.06],[59,1.46],[89,0.74],[99,0.98]]

| floor | Lv | ilvl | hp / power / speed / expMul | careful win | rounds (p10-p90) | HP lost | KOs | attack-only win | rounds |
|---|---|---|---|---|---|---|---|---|---|
| B1 | 1 | 1 | 0.56 / 0.69 / 0.91 / 3.05 | 100% | 3.90 (2-6) | 17% | 0.00 | 90% | 5.59 |
| B1b | 1 | 1 | 0.56 / 0.69 / 0.91 / 3.05 | 100% | 3.30 (1.6666666666666667-5) | 17% | 0.00 | 92% | 4.95 |
| B5 | 9 | 1 | 2.01 / 3.69 / 1.24 / 3.05 | 100% | 4.10 (2.3333333333333335-6.333333333333333) | 22% | 0.00 | 65% | 6.08 |
| B10 | 12 | 2 | 2.82 / 6.43 / 1.43 / 3.05 | 100% | 3.75 (2-5.333333333333333) | 21% | 0.00 | 72% | 5.52 |
| B20 | 17 | 4 | 2.43 / 7.07 / 1.46 / 3.08 | 100% | 5.07 (3.3333333333333335-7.333333333333333) | 28% | 0.12 | 20% | 5.39 |
| B30 | 25 | 6 | 3.58 / 16.22 / 1.89 / 3.06 | 100% | 4.27 (3-6) | 23% | 0.08 | 27% | 5.05 |
| B45 | 33 | 8 | 2.89 / 11.69 / 2.01 / 2.62 | 100% | 4.25 (3-6) | 15% | 0.03 | 52% | 6.55 |
| B60 | 40 | 11 | 2.78 / 18.06 / 2.15 / 2.16 | 100% | 4.82 (4-6.333333333333333) | 15% | 0.02 | 3% | 6.61 |
| B75 | 48 | 13 | 3.16 / 27.71 / 2.61 / 1.62 | 100% | 4.57 (3.3333333333333335-6) | 14% | 0.02 | 10% | 6.42 |
| B90 | 55 | 16 | 3.57 / 39.91 / 3.04 / 1.15 | 100% | 5.01 (3.3333333333333335-7.666666666666667) | 15% | 0.10 | 17% | 6.26 |
| B99 | 59 | 16 | 3.49 / 45 / 3.23 / 1.48 | 100% | 4.93 (3.3333333333333335-7) | 14% | 0.10 | 22% | 6.31 |

## Per template (careful play)

B1: slimes 100% 2.1r 9% (n 16); wraith 100% 3.1r 13% (n 9); mites 100% 4.4r 18% (n 8); mixed 100% 6.1r 28% (n 6); scarab 100% 4.7r 17% (n 5); pack 100% 5.6r 18% (n 6); wolves 100% 2.7r 20% (n 5); wraiths 100% 6.1r 36% (n 5)
B1b: slimes 100% 1.8r 8% (n 16); wraith 100% 2.9r 13% (n 9); mites 100% 3.7r 22% (n 8); mixed 100% 5.1r 28% (n 6); scarab 100% 4.4r 15% (n 5); pack 100% 4.6r 23% (n 6); wolves 100% 2.7r 20% (n 5); wraiths 100% 4.1r 28% (n 5)
B5: pack 100% 5.1r 29% (n 7); scarab 100% 3.7r 16% (n 10); mixed 100% 5.9r 32% (n 9); slimes 100% 2.3r 14% (n 10); wraith 100% 3.8r 20% (n 8); wolves 100% 3.2r 15% (n 8); wraiths 100% 5.7r 31% (n 4); mites 100% 4.8r 22% (n 4)
B10: mixed 100% 5.4r 29% (n 8); slimes 100% 2.2r 14% (n 9); wolves 100% 2.8r 17% (n 12); wraiths 100% 4.8r 35% (n 2); wraith 100% 3.7r 18% (n 6); pack 100% 4.8r 23% (n 8); scarab 100% 3.6r 18% (n 7); mites 100% 4.1r 23% (n 8)
B20: mixed 100% 5.4r 31% (n 7); blots 100% 4.1r 25% (n 5); mixed (elite) 100% 9.3r 84% (n 1); golem_wraith 100% 5.5r 26% (n 8); ink 100% 4.8r 18% (n 2); blots (elite) 100% 4.7r 43% (n 1); shelf (elite) 100% 8.3r 18% (n 2); wraiths 100% 4.5r 29% (n 10); thornbacks 100% 4.2r 21% (n 7); shelf 100% 6.9r 32% (n 5); golem_wraith (elite) 100% 6.7r 30% (n 2); golem 100% 3.7r 17% (n 9); wraiths (elite) 100% 5.7r 94% (n 1)
B30: golem 100% 3.7r 15% (n 3); golem_wraith 100% 5.8r 20% (n 8); thornbacks 100% 3.6r 21% (n 11); blots 100% 3.5r 25% (n 9); wraiths 100% 3.6r 29% (n 10); golem_wraith (elite) 100% 6.7r 19% (n 2); mixed 100% 4.5r 26% (n 5); golem (elite) 100% 4.2r 22% (n 3); mixed (elite) 100% 5.7r 0% (n 1); thornbacks (elite) 100% 4.3r 36% (n 1); ink 100% 4.3r 16% (n 4); shelf 100% 5.3r 33% (n 2); wraiths (elite) 100% 5.3r 12% (n 1)
B45: shadow_pair 100% 4.3r 10% (n 2); knight 100% 4.2r 23% (n 6); shadows 100% 4.6r 22% (n 4); shards (elite) 100% 5.3r 13% (n 2); sentinel 100% 4.3r 8% (n 7); beetles 100% 3.9r 9% (n 9); wisps 100% 3.7r 24% (n 8); wolves 100% 2.4r 7% (n 6); sentinel (elite) 100% 7.3r 0% (n 1); shards 100% 4.2r 20% (n 6); court 100% 7.2r 15% (n 2); beetles (elite) 100% 5.3r 2% (n 1); wolves (elite) 100% 3.3r 11% (n 2); knight (elite) 100% 5.3r 22% (n 2); wisps (elite) 100% 5.7r 32% (n 1); shadows (elite) 100% 7.3r 16% (n 1)
B60: knight (elite) 100% 4.4r 17% (n 16); shadows (elite) 100% 4.4r 12% (n 18); shards (elite) 100% 4.1r 22% (n 4); shadow_pair (elite) 100% 4.7r 18% (n 4); sentinel (elite) 100% 5.4r 14% (n 15); court (elite) 100% 7.6r 23% (n 3)
B75: knight (elite) 100% 3.7r 16% (n 12); shadow_pair (elite) 100% 4.4r 10% (n 7); court (elite) 100% 6.3r 15% (n 6); shadows (elite) 100% 4.2r 14% (n 15); shards (elite) 100% 4.7r 17% (n 8); sentinel (elite) 100% 5.0r 14% (n 12)
B90: sentinels (elite) 100% 5.7r 17% (n 15); shards (elite) 100% 5.7r 9% (n 6); court (elite) 100% 6.9r 8% (n 5); knights (elite) 100% 4.7r 17% (n 18); shadow_pair (elite) 100% 4.2r 17% (n 9); elite_shelf (elite) 100% 3.4r 11% (n 7)
B99: shards (elite) 100% 6.4r 11% (n 7); shadow_pair (elite) 100% 4.1r 9% (n 10); knights (elite) 100% 4.2r 17% (n 18); sentinels (elite) 100% 5.9r 15% (n 14); elite_shelf (elite) 100% 2.8r 5% (n 5); court (elite) 100% 6.2r 18% (n 6)

## The Binder (B100) at Lv 58

- competent: win 100%, rounds 12.84 (10.666666666666666-15.666666666666666), HP lost 16%, KOs 0.00
- naive: win 0%, rounds 12.20 (10-14.666666666666666), HP lost 100%, KOs 3.00
- reckless: win 97%, rounds 14.61 (11.666666666666666-19.333333333333332), HP lost 26%, KOs 0.33

## Through the sim's runSet (rollEncounter path: hp multiplier DROPPED today; B10 and B30 are landings, so B11 and B31 fight)

- B1 (4 encounters of seed 1000, Lv 1): careful win 100%, rounds 6.82
- B11 (5 encounters of seed 1000, Lv 12): careful win 100%, rounds 1.88
- B31 (7 encounters of seed 1000, Lv 25): careful win 100%, rounds 1.43

(3.3 s)
