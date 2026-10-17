# Paired timing and resource observations

Each row has five independent-process pairs after warmup. Timing and RSS are observations, not additional hard thresholds.
RSS is process peak including fixture setup and hit prefill; time covers only the final public Run. OS page cache was not cleared.

| shape | edges | depth | cache | before ms (MAD) | after ms (MAD) | after/before | before MiB | after MiB |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| hot | 1000 | 3 | off | 572.0 (12.4) | 168.5 (2.2) | 0.295 | 132.8 | 132.7 |
| hot | 1000 | 3 | empty | 748.6 (63.4) | 186.4 (7.9) | 0.249 | 132.0 | 132.4 |
| hot | 1000 | 3 | hit | 449.1 (17.5) | 23.7 (1.1) | 0.053 | 133.4 | 133.9 |
| hot | 1000 | 32 | off | 3429.6 (96.6) | 202.4 (4.8) | 0.059 | 133.0 | 132.6 |
| hot | 1000 | 32 | empty | 3308.8 (71.6) | 202.2 (7.5) | 0.061 | 133.4 | 134.1 |
| hot | 1000 | 32 | hit | 3170.6 (138.4) | 31.5 (0.9) | 0.010 | 134.0 | 134.6 |
| hot | 8000 | 3 | off | 6062.4 (953.4) | 1137.8 (201.1) | 0.188 | 304.8 | 304.4 |
| hot | 8000 | 3 | empty | 6614.3 (446.5) | 1457.2 (568.7) | 0.220 | 309.2 | 311.8 |
| hot | 8000 | 3 | hit | 3722.7 (535.5) | 108.6 (15.2) | 0.029 | 313.2 | 314.0 |
| hot | 8000 | 32 | off | 25094.0 (179.1) | 906.1 (14.9) | 0.036 | 308.9 | 309.6 |
| hot | 8000 | 32 | empty | 27085.5 (481.2) | 1009.0 (65.5) | 0.037 | 309.0 | 308.8 |
| hot | 8000 | 32 | hit | 28745.4 (1140.1) | 138.6 (10.4) | 0.005 | 310.4 | 313.9 |
| unique | 1000 | 3 | off | 1451.1 (84.7) | 1480.0 (126.8) | 1.020 | 160.8 | 164.3 |
| unique | 1000 | 3 | empty | 1244.3 (100.3) | 1269.6 (103.5) | 1.020 | 177.4 | 174.3 |
| unique | 1000 | 3 | hit | 1014.8 (52.3) | 1005.6 (19.9) | 0.991 | 189.6 | 186.9 |
| unique | 1000 | 32 | off | 4943.0 (656.4) | 4309.7 (81.8) | 0.872 | 152.0 | 148.3 |
| unique | 1000 | 32 | empty | 3989.0 (84.4) | 3967.6 (80.4) | 0.995 | 179.1 | 161.4 |
| unique | 1000 | 32 | hit | 3678.7 (33.5) | 3742.4 (12.3) | 1.017 | 188.6 | 187.9 |
| unique | 8000 | 3 | off | 12302.7 (1009.7) | 11249.3 (1080.5) | 0.914 | 344.2 | 351.3 |
| unique | 8000 | 3 | empty | 14892.9 (2652.8) | 14915.8 (378.8) | 1.002 | 353.5 | 353.4 |
| unique | 8000 | 3 | hit | 7340.5 (74.9) | 7763.0 (204.3) | 1.058 | 356.4 | 357.6 |
| unique | 8000 | 32 | off | 31411.7 (162.2) | 30825.0 (37.0) | 0.981 | 338.3 | 352.4 |
| unique | 8000 | 32 | empty | 28121.2 (51.0) | 27943.7 (361.9) | 0.994 | 351.3 | 351.1 |
| unique | 8000 | 32 | hit | 27035.2 (162.6) | 27202.3 (253.0) | 1.006 | 357.9 | 362.7 |
| real | 1939 | mixed | off | 3648.8 (16.1) | 3023.6 (12.9) | 0.829 | 341.6 | 311.4 |
| real | 1939 | mixed | empty | 3373.5 (1.9) | 3042.7 (21.1) | 0.902 | 282.8 | 315.6 |
| real | 1939 | mixed | hit | 1116.7 (5.0) | 835.8 (11.0) | 0.748 | 348.2 | 352.2 |

The real corpus has 361 selected Markdown sources, 2,343 occurrences and 1,939 logically charged target references; mixed path depth. Synthetic count/depth are fixture parameters. Full time/RSS median and MAD values are in summary.json.
