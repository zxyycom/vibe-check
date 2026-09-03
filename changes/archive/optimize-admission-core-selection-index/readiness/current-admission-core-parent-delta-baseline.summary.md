# Current admission-core baseline

- Status: **historic parent-delta formation after-run (retired; non-rerunnable)** at git commit `14007b38f5e55aa81ab490eff7741596da34bcd1`.
- Command: Historic execution command (now intentionally rejected): `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --representation parent-delta`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.
- Comparison scope: 77 shared exact rows + 2 A/B/C-only rows. `legacy-seed-index` and `layered-forced-cascade-settle` have no immutable before row.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| real-mixed-real-static-unused-public-state | 96 | real-mixed | — | real-static-unused-public-state | — | 2 | 4015.479 | 4043.873 | 3993.120 | 200.759 | 18912887 |
| real-mixed-real-custom-unused-public-state | 96 | real-mixed | — | real-custom-unused-public-state | — | 2 | 4929.192 | 8947.543 | 4480.248 | 270.998 | -14028177 |
| real-mixed-real-learned-unused-public-state | 96 | real-mixed | — | real-learned-unused-public-state | — | 2 | 4159.197 | 4327.357 | 4094.033 | 256.534 | -10240923 |
| independent-t64-d0-scheduler-candidates | 64 | independent | 0 | scheduler-candidates | — | 16 | 0.389 | 0.492 | 0.399 | 0.019 | 0 |
| independent-t64-d0-catalog | 64 | independent | 0 | catalog | — | 16 | 0.556 | 0.645 | 0.852 | 0.000 | 0 |
| independent-t64-d0-validate-selection | 64 | independent | 0 | validate-selection | — | 16 | 0.002 | 0.036 | 0.010 | 0.000 | 0 |
| independent-t64-d0-select | 64 | independent | 0 | select | — | 16 | 0.051 | 0.116 | 0.056 | 0.004 | 0 |
| independent-t64-d0-settle | 64 | independent | 0 | settle | — | 16 | 3.392 | 5.657 | 3.365 | 0.000 | 0 |
| independent-t64-d0-fork | 64 | independent | 0 | fork | — | 16 | 0.048 | 0.166 | 0.056 | 0.000 | 0 |
| independent-t64-d16-scheduler-candidates | 64 | independent | 16 | scheduler-candidates | — | 16 | 0.288 | 0.337 | 0.325 | 0.000 | 0 |
| independent-t64-d16-catalog | 64 | independent | 16 | catalog | — | 16 | 0.485 | 0.540 | 0.526 | 0.000 | 0 |
| independent-t64-d16-validate-selection | 64 | independent | 16 | validate-selection | — | 16 | 0.002 | 0.002 | 0.010 | 0.000 | 0 |
| independent-t64-d16-select | 64 | independent | 16 | select | — | 16 | 0.048 | 0.058 | 0.056 | 0.000 | 0 |
| independent-t64-d16-settle | 64 | independent | 16 | settle | — | 16 | 17.189 | 18.137 | 18.279 | 0.002 | 45651 |
| independent-t64-d16-fork | 64 | independent | 16 | fork | — | 16 | 0.054 | 0.067 | 0.065 | 0.004 | 0 |
| independent-t64-d48-scheduler-candidates | 64 | independent | 48 | scheduler-candidates | — | 16 | 0.193 | 0.272 | 0.190 | 0.011 | 0 |
| independent-t64-d48-catalog | 64 | independent | 48 | catalog | — | 16 | 0.335 | 0.400 | 0.325 | 0.020 | 0 |
| independent-t64-d48-validate-selection | 64 | independent | 48 | validate-selection | — | 16 | 0.003 | 0.028 | 0.000 | 0.012 | 0 |
| independent-t64-d48-select | 64 | independent | 48 | select | — | 16 | 0.051 | 0.100 | 0.000 | 0.059 | 0 |
| independent-t64-d48-settle | 64 | independent | 48 | settle | — | 16 | 47.775 | 49.638 | 48.631 | 0.288 | 107622 |
| independent-t64-d48-fork | 64 | independent | 48 | fork | — | 16 | 0.045 | 0.108 | 0.051 | 0.003 | 0 |
| high-fanout-t64-forced-block-settle | 64 | high-fanout | 2 | forced-block-settle | 63 | 16 | 20.804 | 22.272 | 22.089 | 3.880 | 319224 |
| independent-t256-d0-scheduler-candidates | 256 | independent | 0 | scheduler-candidates | — | 8 | 0.635 | 0.675 | 0.655 | 0.001 | 0 |
| independent-t256-d0-catalog | 256 | independent | 0 | catalog | — | 8 | 1.021 | 1.143 | 1.155 | 0.000 | 0 |
| independent-t256-d0-validate-selection | 256 | independent | 0 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| independent-t256-d0-select | 256 | independent | 0 | select | — | 8 | 0.022 | 0.040 | 0.031 | 0.000 | 0 |
| independent-t256-d0-settle | 256 | independent | 0 | settle | — | 8 | 6.518 | 8.390 | 6.482 | 0.002 | 0 |
| independent-t256-d0-fork | 256 | independent | 0 | fork | — | 8 | 0.024 | 0.111 | 0.033 | 0.000 | 0 |
| independent-t256-d16-scheduler-candidates | 256 | independent | 16 | scheduler-candidates | — | 8 | 0.585 | 0.759 | 0.560 | 0.031 | 0 |
| independent-t256-d16-catalog | 256 | independent | 16 | catalog | — | 8 | 1.162 | 1.290 | 1.174 | 0.000 | 0 |
| independent-t256-d16-validate-selection | 256 | independent | 16 | validate-selection | — | 8 | 0.001 | 0.002 | 0.000 | 0.010 | 0 |
| independent-t256-d16-select | 256 | independent | 16 | select | — | 8 | 0.059 | 0.076 | 0.000 | 0.069 | 0 |
| independent-t256-d16-settle | 256 | independent | 16 | settle | — | 8 | 35.307 | 39.693 | 33.696 | 4.102 | 336470 |
| independent-t256-d16-fork | 256 | independent | 16 | fork | — | 8 | 0.036 | 0.050 | 0.043 | 0.002 | 0 |
| independent-t256-d48-scheduler-candidates | 256 | independent | 48 | scheduler-candidates | — | 8 | 0.481 | 0.650 | 0.465 | 0.029 | 0 |
| independent-t256-d48-catalog | 256 | independent | 48 | catalog | — | 8 | 0.781 | 0.836 | 0.806 | 0.000 | 0 |
| independent-t256-d48-validate-selection | 256 | independent | 48 | validate-selection | — | 8 | 0.001 | 0.002 | 0.009 | 0.000 | 0 |
| independent-t256-d48-select | 256 | independent | 48 | select | — | 8 | 0.023 | 0.027 | 0.031 | 0.000 | 0 |
| independent-t256-d48-settle | 256 | independent | 48 | settle | — | 8 | 101.602 | 109.945 | 96.003 | 8.030 | 748890 |
| independent-t256-d48-fork | 256 | independent | 48 | fork | — | 8 | 0.060 | 0.114 | 0.073 | 0.005 | 0 |
| high-fanout-t256-forced-block-settle | 256 | high-fanout | 2 | forced-block-settle | 255 | 8 | 108.081 | 112.964 | 107.660 | 11.509 | -3271444 |
| independent-t1024-d0-scheduler-candidates | 1024 | independent | 0 | scheduler-candidates | — | 2 | 0.862 | 1.081 | 0.825 | 0.000 | 0 |
| independent-t1024-d0-catalog | 1024 | independent | 0 | catalog | — | 2 | 1.168 | 1.401 | 1.179 | 0.000 | 0 |
| independent-t1024-d0-validate-selection | 1024 | independent | 0 | validate-selection | — | 2 | 0.000 | 0.001 | 0.008 | 0.000 | 0 |
| independent-t1024-d0-select | 1024 | independent | 0 | select | — | 2 | 0.006 | 0.010 | 0.014 | 0.000 | 0 |
| independent-t1024-d0-settle | 1024 | independent | 0 | settle | — | 2 | 8.407 | 11.333 | 8.397 | 0.025 | 0 |
| independent-t1024-d0-fork | 1024 | independent | 0 | fork | — | 2 | 0.006 | 0.013 | 0.014 | 0.000 | 0 |
| independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 2 | 0.558 | 0.671 | 0.534 | 0.034 | 0 |
| independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 2 | 0.966 | 1.200 | 0.991 | 0.000 | 0 |
| independent-t1024-d16-validate-selection | 1024 | independent | 16 | validate-selection | — | 2 | 0.000 | 0.001 | 0.008 | 0.000 | 0 |
| independent-t1024-d16-select | 1024 | independent | 16 | select | — | 2 | 0.008 | 0.017 | 0.016 | 0.000 | 0 |
| independent-t1024-d16-settle | 1024 | independent | 16 | settle | — | 2 | 36.737 | 38.021 | 38.453 | 0.013 | 1728435 |
| independent-t1024-d16-fork | 1024 | independent | 16 | fork | — | 2 | 0.008 | 0.013 | 0.017 | 0.000 | 0 |
| independent-t4096-d0-scheduler-candidates | 4096 | independent | 0 | scheduler-candidates | — | 1 | 4.480 | 7.815 | 4.493 | 0.002 | 0 |
| independent-t4096-d0-catalog | 4096 | independent | 0 | catalog | — | 1 | 5.073 | 6.356 | 5.080 | 0.000 | 0 |
| independent-t4096-d0-validate-selection | 4096 | independent | 0 | validate-selection | — | 1 | 0.000 | 0.001 | 0.008 | 0.001 | 0 |
| independent-t4096-d0-select | 4096 | independent | 0 | select | — | 1 | 0.004 | 0.009 | 0.000 | 0.012 | 0 |
| independent-t4096-d0-settle | 4096 | independent | 0 | settle | — | 1 | 22.744 | 24.479 | 21.622 | 0.013 | 0 |
| independent-t4096-d0-fork | 4096 | independent | 0 | fork | — | 1 | 0.004 | 0.012 | 0.012 | 0.000 | 0 |
| layered-t256-d16-scheduler-candidates | 256 | layered | 16 | scheduler-candidates | — | 8 | 0.146 | 0.188 | 0.174 | 0.008 | 0 |
| layered-t256-d16-catalog | 256 | layered | 16 | catalog | — | 8 | 3.799 | 6.446 | 3.519 | 0.000 | 0 |
| layered-t256-d16-validate-selection | 256 | layered | 16 | validate-selection | — | 8 | 0.001 | 0.005 | 0.011 | 0.000 | 0 |
| layered-t256-d16-select | 256 | layered | 16 | select | — | 8 | 0.023 | 0.032 | 0.030 | 0.002 | 0 |
| layered-t256-d16-settle | 256 | layered | 16 | settle | — | 8 | 41.000 | 45.117 | 41.554 | 4.037 | 203427 |
| layered-t256-d16-fork | 256 | layered | 16 | fork | — | 8 | 0.035 | 0.038 | 0.040 | 0.003 | 0 |
| mutex-t256-d16-scheduler-candidates | 256 | mutex | 16 | scheduler-candidates | — | 8 | 0.600 | 2.252 | 0.575 | 0.033 | 0 |
| mutex-t256-d16-catalog | 256 | mutex | 16 | catalog | — | 8 | 0.846 | 0.855 | 0.856 | 0.000 | 0 |
| mutex-t256-d16-validate-selection | 256 | mutex | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.000 | 0.009 | 0 |
| mutex-t256-d16-select | 256 | mutex | 16 | select | — | 8 | 0.027 | 0.032 | 0.000 | 0.035 | 0 |
| mutex-t256-d16-settle | 256 | mutex | 16 | settle | — | 8 | 39.759 | 43.877 | 40.490 | 0.103 | 197763 |
| mutex-t256-d16-fork | 256 | mutex | 16 | fork | — | 8 | 0.027 | 0.038 | 0.035 | 0.000 | 0 |
| scope-t256-d16-scheduler-candidates | 256 | scope | 16 | scheduler-candidates | — | 8 | 0.754 | 0.765 | 0.575 | 0.103 | 0 |
| scope-t256-d16-catalog | 256 | scope | 16 | catalog | — | 8 | 1.974 | 2.057 | 3.338 | 0.064 | 0 |
| scope-t256-d16-validate-selection | 256 | scope | 16 | validate-selection | — | 8 | 0.001 | 0.002 | 0.009 | 0.000 | 0 |
| scope-t256-d16-select | 256 | scope | 16 | select | — | 8 | 0.023 | 0.026 | 0.029 | 0.002 | 0 |
| scope-t256-d16-settle | 256 | scope | 16 | settle | — | 8 | 40.454 | 45.191 | 40.117 | 0.146 | 156515 |
| scope-t256-d16-fork | 256 | scope | 16 | fork | — | 8 | 0.043 | 0.061 | 0.049 | 0.004 | 0 |
| independent-t256-legacy-seed-index | 256 | independent | — | legacy-seed-index | — | 8 | 2.700 | 2.998 | 2.677 | 0.000 | 0 |
| forced-cascade-t161-layered-forced-cascade-settle | 161 | forced-cascade | 2 | layered-forced-cascade-settle | 160 | 8 | 126.068 | 136.875 | 133.874 | 11.863 | -10619030 |

## Reading boundary

77 shared rows exactly match before; the named `legacy-seed-index` and `layered-forced-cascade-settle` rows are A/B/C-only. They do not form a cross-host budget or turn heap proxy into allocation evidence. This historic candidate is retained only for formation review; the shipping harness accepts no representation switch.
