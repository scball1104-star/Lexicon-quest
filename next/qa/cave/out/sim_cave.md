# Deep Stacks descent (tools/sim/cave.mjs)

Written by `node tools/sim/simulate.mjs --cave --check --json --md` (C3-sim-bot).

Deep Stacks descent: 50 seeds from 1, policy competent, B1 to B99; reached B90.9 on average; 34 cleared B100

| band | entered | wiped | death rate | target | fights | rounds | HP lost / fight | KOs / fight | min / floor | chests | HP on arrival | potions held |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1-B9 | 50 | 0 | 0.0% | < 5% | 1800 | 2.79 | 5% | 0.00 | 2.7 | 3.1 | 89% | 10.4 |
| B10-B29 | 50 | 0 | 0.0% | < 15% | 4950 | 3.17 | 9% | 0.01 | 3.5 | 3.0 | 87% | 24.0 |
| B30-B59 | 50 | 5 | 10.0% | < 30% | 8148 | 3.36 | 9% | 0.03 | 4.1 | 2.9 | 85% | 8.0 |
| B60-B99 | 45 | 11 | 24.4% | < 45% | 8782 | 2.91 | 8% | 0.03 | 3.6 | 3.0 | 87% | 8.7 |

| decade | entered | wiped | death rate | rounds | HP lost / fight | KOs / fight | min / floor | gear found / floor | feathers held |
|---|---|---|---|---|---|---|---|---|---|
| B1-B9 | 50 | 0 | 0.0% | 2.79 | 5% | 0.00 | 2.7 | 2.1 | 0.6 |
| B10-B19 | 50 | 0 | 0.0% | 2.93 | 8% | 0.00 | 3.1 | 2.0 | 3.5 |
| B20-B29 | 50 | 0 | 0.0% | 3.37 | 9% | 0.01 | 3.9 | 2.7 | 6.1 |
| B30-B39 | 50 | 2 | 4.0% | 3.45 | 9% | 0.04 | 4.5 | 2.8 | 7.6 |
| B40-B49 | 48 | 2 | 4.2% | 3.38 | 9% | 0.02 | 3.9 | 2.9 | 7.4 |
| B50-B59 | 46 | 1 | 2.2% | 3.22 | 9% | 0.02 | 3.8 | 3.4 | 8.6 |
| B60-B69 | 45 | 1 | 2.2% | 3.07 | 8% | 0.02 | 3.7 | 4.0 | 9.2 |
| B70-B79 | 44 | 4 | 9.1% | 2.90 | 8% | 0.04 | 3.6 | 4.0 | 9.2 |
| B80-B89 | 40 | 2 | 5.0% | 2.80 | 8% | 0.02 | 3.6 | 4.0 | 9.2 |
| B90-B99 | 38 | 4 | 10.5% | 2.84 | 8% | 0.05 | 3.6 | 4.3 | 9.1 |

| arrival | seeds | mean Lv | min | max | plan |
|---|---|---|---|---|---|
| B1 | 50 | 1.0 | 1.0 | 1.0 | - |
| B5 | 50 | 8.0 | 8.0 | 9.0 | - |
| B10 | 50 | 11.3 | 11.0 | 12.0 | 12 |
| B20 | 50 | 16.3 | 16.0 | 17.0 | - |
| B30 | 50 | 24.8 | 24.0 | 26.0 | 25 |
| B40 | 48 | 31.7 | 31.0 | 33.0 | - |
| B50 | 46 | 36.3 | 35.0 | 38.0 | - |
| B60 | 45 | 40.6 | 39.7 | 42.0 | 40 |
| B70 | 44 | 44.6 | 44.0 | 46.0 | - |
| B80 | 40 | 49.7 | 48.0 | 52.0 | - |
| B90 | 38 | 55.7 | 55.0 | 58.0 | 55 |
| B99 | 35 | 59.6 | 59.0 | 62.0 | - |

Bookmarks: first held on B8 (median; mean B6.8), 2.0 found per run, 0 runs without one by B10. Blue chests: 12.9 uniques per run.
The Binder: 102 fights from 34 seeds at B100 (party Lv 59.7, 87% HP on arrival): win 97%, within 20 rounds 97%, 9.4 rounds per win, 15% HP lost, 0.41 KOs. Attack-only: win 0% (0.0 rounds, 87% HP lost). Ignoring the telegraphs: win 69% (9.2 rounds, 40% HP lost).
Wipes by floor: B38, B39, B44, B47, B55, B67, B75, B77, B78, B79, B82, B88, B91 x2, B96, B99
(23680 fights in 96.8 s)

All cave targets met.
