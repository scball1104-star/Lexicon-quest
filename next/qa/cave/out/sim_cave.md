# Deep Stacks descent (tools/sim/cave.mjs)

Written by `node tools/sim/simulate.mjs --cave --check --json --jobs 2 --md` (C3-sim-bot).

Deep Stacks descent: 50 seeds from 1, policy competent, B1 to B99; reached B84.6 on average; 34 cleared B100

| band | entered | wiped | death rate | target | fights | rounds | HP lost / fight | KOs / fight | min / floor | chests | HP on arrival | potions held |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1-B9 | 50 | 1 | 2.0% | < 5% | 1794 | 3.05 | 6% | 0.00 | 2.9 | 3.0 | 88% | 7.3 |
| B10-B29 | 49 | 5 | 10.2% | < 15% | 4674 | 3.48 | 8% | 0.02 | 3.6 | 3.0 | 86% | 12.8 |
| B30-B59 | 44 | 3 | 6.8% | < 30% | 9248 | 3.74 | 8% | 0.02 | 5.3 | 2.9 | 84% | 4.9 |
| B60-B99 | 41 | 7 | 17.1% | < 45% | 15154 | 3.93 | 8% | 0.04 | 7.5 | 2.9 | 84% | 3.7 |

| decade | entered | wiped | death rate | rounds | HP lost / fight | KOs / fight | min / floor | gear found / floor | feathers held |
|---|---|---|---|---|---|---|---|---|---|
| B1-B9 | 50 | 1 | 2.0% | 3.05 | 6% | 0.00 | 2.9 | 2.1 | 1.4 |
| B10-B19 | 49 | 2 | 4.1% | 3.17 | 8% | 0.02 | 3.2 | 2.0 | 5.8 |
| B20-B29 | 47 | 3 | 6.4% | 3.75 | 8% | 0.03 | 4.1 | 2.7 | 10.7 |
| B30-B39 | 44 | 0 | 0.0% | 3.93 | 8% | 0.03 | 4.9 | 2.7 | 15.1 |
| B40-B49 | 44 | 2 | 4.5% | 3.71 | 8% | 0.03 | 5.3 | 3.1 | 16.5 |
| B50-B59 | 42 | 1 | 2.4% | 3.61 | 7% | 0.02 | 5.8 | 4.2 | 17.1 |
| B60-B69 | 41 | 1 | 2.4% | 3.90 | 9% | 0.03 | 6.7 | 11.8 | 18.5 |
| B70-B79 | 40 | 2 | 5.0% | 3.85 | 8% | 0.05 | 7.3 | 12.8 | 18.8 |
| B80-B89 | 38 | 2 | 5.3% | 3.96 | 7% | 0.04 | 8.0 | 14.2 | 19.2 |
| B90-B99 | 36 | 2 | 5.6% | 4.01 | 7% | 0.06 | 8.1 | 14.1 | 20.4 |

| arrival | seeds | mean Lv | min | max | plan |
|---|---|---|---|---|---|
| B1 | 50 | 1.0 | 1.0 | 1.0 | - |
| B5 | 50 | 8.0 | 8.0 | 9.0 | - |
| B10 | 49 | 11.3 | 11.0 | 12.0 | 12 |
| B20 | 47 | 16.3 | 16.0 | 17.0 | - |
| B30 | 44 | 24.8 | 24.0 | 26.0 | 25 |
| B40 | 44 | 31.0 | 30.0 | 32.0 | - |
| B50 | 42 | 36.1 | 35.0 | 37.0 | - |
| B60 | 41 | 40.6 | 39.0 | 42.0 | 40 |
| B70 | 40 | 47.0 | 46.0 | 48.0 | - |
| B80 | 38 | 51.9 | 51.0 | 53.0 | - |
| B90 | 36 | 56.1 | 55.0 | 57.0 | 55 |
| B99 | 34 | 59.7 | 59.0 | 60.0 | - |

Bookmarks: first held on B8 (median; mean B7.2), 26.1 found per run, 0 runs without one by B10. Blue chests: 10.3 uniques per run.
The Binder: 102 fights from 34 seeds at B100 (party Lv 60.1, 85% HP on arrival): win 100%, within 20 rounds 93%, 14.5 rounds per win, 9% HP lost, 0.15 KOs. Attack-only: win 0% (0.0 rounds, 85% HP lost). Ignoring the telegraphs: win 91% (17.8 rounds, 22% HP lost).
Wipes by floor: B8, B13, B18, B25, B29 x2, B44, B46, B57, B61, B72, B73, B83, B84, B94, B96
(30870 fights in 1429.6 s)

All cave targets met.
