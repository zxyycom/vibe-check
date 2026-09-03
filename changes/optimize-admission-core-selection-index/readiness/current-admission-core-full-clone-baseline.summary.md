# Current admission-core baseline

- Status: **historic full-clone formation after-run (retired; non-rerunnable)** at git commit `14007b38f5e55aa81ab490eff7741596da34bcd1`.
- Command: Historic execution command (now intentionally rejected): `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --representation full-clone`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.
- Comparison scope: 77 shared exact rows + 2 A/B/C-only rows. `legacy-seed-index` and `layered-forced-cascade-settle` have no immutable before row.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| real-mixed-real-static-unused-public-state | 96 | real-mixed | — | real-static-unused-public-state | — | 2 | 75.230 | 78.377 | 90.637 | 4.495 | 975812 |
| real-mixed-real-custom-unused-public-state | 96 | real-mixed | — | real-custom-unused-public-state | — | 2 | 110.662 | 113.567 | 116.094 | 8.015 | 1675221 |
| real-mixed-real-learned-unused-public-state | 96 | real-mixed | — | real-learned-unused-public-state | — | 2 | 78.053 | 80.644 | 79.788 | 4.301 | 993940 |
| independent-t64-d0-scheduler-candidates | 64 | independent | 0 | scheduler-candidates | — | 16 | 0.297 | 0.340 | 0.000 | 0.299 | 0 |
| independent-t64-d0-catalog | 64 | independent | 0 | catalog | — | 16 | 0.616 | 0.779 | 0.879 | 0.000 | 0 |
| independent-t64-d0-validate-selection | 64 | independent | 0 | validate-selection | — | 16 | 0.004 | 0.040 | 0.013 | 0.000 | 0 |
| independent-t64-d0-select | 64 | independent | 0 | select | — | 16 | 1.128 | 4.105 | 0.028 | 1.059 | 0 |
| independent-t64-d0-settle | 64 | independent | 0 | settle | — | 16 | 0.954 | 1.229 | 0.963 | 0.000 | 0 |
| independent-t64-d0-fork | 64 | independent | 0 | fork | — | 16 | 0.997 | 1.159 | 1.008 | 0.000 | 0 |
| independent-t64-d16-scheduler-candidates | 64 | independent | 16 | scheduler-candidates | — | 16 | 0.291 | 0.300 | 0.308 | 0.000 | 0 |
| independent-t64-d16-catalog | 64 | independent | 16 | catalog | — | 16 | 0.465 | 0.514 | 0.461 | 0.000 | 0 |
| independent-t64-d16-validate-selection | 64 | independent | 16 | validate-selection | — | 16 | 0.002 | 0.004 | 0.000 | 0.010 | 0 |
| independent-t64-d16-select | 64 | independent | 16 | select | — | 16 | 1.113 | 1.167 | 1.059 | 0.001 | 0 |
| independent-t64-d16-settle | 64 | independent | 16 | settle | — | 16 | 0.892 | 2.823 | 0.794 | 0.098 | 0 |
| independent-t64-d16-fork | 64 | independent | 16 | fork | — | 16 | 0.881 | 0.944 | 0.876 | 0.000 | 0 |
| independent-t64-d48-scheduler-candidates | 64 | independent | 48 | scheduler-candidates | — | 16 | 0.200 | 0.237 | 0.191 | 0.000 | 0 |
| independent-t64-d48-catalog | 64 | independent | 48 | catalog | — | 16 | 0.283 | 0.351 | 0.292 | 0.000 | 0 |
| independent-t64-d48-validate-selection | 64 | independent | 48 | validate-selection | — | 16 | 0.003 | 0.027 | 0.012 | 0.000 | 0 |
| independent-t64-d48-select | 64 | independent | 48 | select | — | 16 | 0.928 | 0.954 | 0.950 | 0.000 | 0 |
| independent-t64-d48-settle | 64 | independent | 48 | settle | — | 16 | 0.913 | 2.814 | 0.799 | 0.108 | 0 |
| independent-t64-d48-fork | 64 | independent | 48 | fork | — | 16 | 0.881 | 1.076 | 0.822 | 0.068 | 0 |
| high-fanout-t64-forced-block-settle | 64 | high-fanout | 2 | forced-block-settle | 63 | 16 | 81.658 | 84.781 | 81.979 | 11.501 | 2709740 |
| independent-t256-d0-scheduler-candidates | 256 | independent | 0 | scheduler-candidates | — | 8 | 0.958 | 1.053 | 0.006 | 0.935 | 0 |
| independent-t256-d0-catalog | 256 | independent | 0 | catalog | — | 8 | 1.222 | 1.453 | 1.196 | 0.001 | 0 |
| independent-t256-d0-validate-selection | 256 | independent | 0 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| independent-t256-d0-select | 256 | independent | 0 | select | — | 8 | 1.791 | 1.987 | 1.802 | 0.000 | 0 |
| independent-t256-d0-settle | 256 | independent | 0 | settle | — | 8 | 2.163 | 3.477 | 1.991 | 0.027 | 0 |
| independent-t256-d0-fork | 256 | independent | 0 | fork | — | 8 | 1.994 | 2.539 | 0.470 | 1.475 | 0 |
| independent-t256-d16-scheduler-candidates | 256 | independent | 16 | scheduler-candidates | — | 8 | 0.571 | 0.587 | 0.529 | 0.066 | 0 |
| independent-t256-d16-catalog | 256 | independent | 16 | catalog | — | 8 | 0.823 | 0.863 | 0.838 | 0.000 | 0 |
| independent-t256-d16-validate-selection | 256 | independent | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| independent-t256-d16-select | 256 | independent | 16 | select | — | 8 | 1.592 | 1.744 | 1.593 | 0.000 | 0 |
| independent-t256-d16-settle | 256 | independent | 16 | settle | — | 8 | 1.584 | 1.991 | 1.595 | 0.000 | 0 |
| independent-t256-d16-fork | 256 | independent | 16 | fork | — | 8 | 1.622 | 3.864 | 1.697 | 0.113 | 0 |
| independent-t256-d48-scheduler-candidates | 256 | independent | 48 | scheduler-candidates | — | 8 | 0.549 | 0.633 | 0.535 | 0.057 | 0 |
| independent-t256-d48-catalog | 256 | independent | 48 | catalog | — | 8 | 0.784 | 0.908 | 0.794 | 0.000 | 0 |
| independent-t256-d48-validate-selection | 256 | independent | 48 | validate-selection | — | 8 | 0.001 | 0.003 | 0.009 | 0.000 | 0 |
| independent-t256-d48-select | 256 | independent | 48 | select | — | 8 | 1.706 | 1.774 | 1.750 | 0.000 | 0 |
| independent-t256-d48-settle | 256 | independent | 48 | settle | — | 8 | 1.718 | 2.962 | 1.729 | 0.000 | 0 |
| independent-t256-d48-fork | 256 | independent | 48 | fork | — | 8 | 1.681 | 1.829 | 1.659 | 0.000 | 0 |
| high-fanout-t256-forced-block-settle | 256 | high-fanout | 2 | forced-block-settle | 255 | 8 | 618.290 | 631.429 | 746.638 | 52.920 | 2633178 |
| independent-t1024-d0-scheduler-candidates | 1024 | independent | 0 | scheduler-candidates | — | 2 | 0.988 | 2.901 | 1.956 | 0.186 | 0 |
| independent-t1024-d0-catalog | 1024 | independent | 0 | catalog | — | 2 | 1.157 | 1.349 | 1.167 | 0.000 | 0 |
| independent-t1024-d0-validate-selection | 1024 | independent | 0 | validate-selection | — | 2 | 0.000 | 0.002 | 0.008 | 0.000 | 0 |
| independent-t1024-d0-select | 1024 | independent | 0 | select | — | 2 | 2.178 | 2.612 | 2.183 | 0.000 | 0 |
| independent-t1024-d0-settle | 1024 | independent | 0 | settle | — | 2 | 1.940 | 1.999 | 1.898 | 0.004 | 0 |
| independent-t1024-d0-fork | 1024 | independent | 0 | fork | — | 2 | 1.766 | 1.854 | 1.486 | 0.158 | 0 |
| independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 2 | 0.550 | 0.610 | 0.548 | 0.000 | 0 |
| independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 2 | 0.833 | 0.932 | 0.843 | 0.000 | 0 |
| independent-t1024-d16-validate-selection | 1024 | independent | 16 | validate-selection | — | 2 | 0.000 | 0.002 | 0.008 | 0.000 | 0 |
| independent-t1024-d16-select | 1024 | independent | 16 | select | — | 2 | 1.797 | 3.576 | 1.807 | 0.000 | 0 |
| independent-t1024-d16-settle | 1024 | independent | 16 | settle | — | 2 | 1.828 | 3.829 | 1.759 | 0.000 | 0 |
| independent-t1024-d16-fork | 1024 | independent | 16 | fork | — | 2 | 2.049 | 3.644 | 1.687 | 0.131 | 0 |
| independent-t4096-d0-scheduler-candidates | 4096 | independent | 0 | scheduler-candidates | — | 1 | 3.200 | 3.824 | 3.216 | 0.000 | 0 |
| independent-t4096-d0-catalog | 4096 | independent | 0 | catalog | — | 1 | 4.604 | 4.701 | 4.697 | 0.001 | 0 |
| independent-t4096-d0-validate-selection | 4096 | independent | 0 | validate-selection | — | 1 | 0.000 | 0.001 | 0.008 | 0.001 | 0 |
| independent-t4096-d0-select | 4096 | independent | 0 | select | — | 1 | 7.484 | 8.513 | 7.135 | 0.004 | 0 |
| independent-t4096-d0-settle | 4096 | independent | 0 | settle | — | 1 | 6.349 | 8.293 | 6.362 | 0.003 | 0 |
| independent-t4096-d0-fork | 4096 | independent | 0 | fork | — | 1 | 6.265 | 8.551 | 6.280 | 0.001 | 0 |
| layered-t256-d16-scheduler-candidates | 256 | layered | 16 | scheduler-candidates | — | 8 | 0.128 | 0.141 | 0.136 | 0.000 | 0 |
| layered-t256-d16-catalog | 256 | layered | 16 | catalog | — | 8 | 3.110 | 5.855 | 2.912 | 0.163 | 0 |
| layered-t256-d16-validate-selection | 256 | layered | 16 | validate-selection | — | 8 | 0.001 | 0.005 | 0.009 | 0.000 | 0 |
| layered-t256-d16-select | 256 | layered | 16 | select | — | 8 | 1.915 | 2.148 | 1.957 | 0.000 | 0 |
| layered-t256-d16-settle | 256 | layered | 16 | settle | — | 8 | 2.281 | 2.341 | 2.293 | 0.000 | 0 |
| layered-t256-d16-fork | 256 | layered | 16 | fork | — | 8 | 1.902 | 1.991 | 1.912 | 0.000 | 0 |
| mutex-t256-d16-scheduler-candidates | 256 | mutex | 16 | scheduler-candidates | — | 8 | 0.506 | 0.555 | 0.516 | 0.000 | 0 |
| mutex-t256-d16-catalog | 256 | mutex | 16 | catalog | — | 8 | 0.789 | 0.838 | 0.806 | 0.000 | 0 |
| mutex-t256-d16-validate-selection | 256 | mutex | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| mutex-t256-d16-select | 256 | mutex | 16 | select | — | 8 | 1.928 | 4.115 | 1.938 | 0.000 | 0 |
| mutex-t256-d16-settle | 256 | mutex | 16 | settle | — | 8 | 1.800 | 2.586 | 1.796 | 0.139 | 0 |
| mutex-t256-d16-fork | 256 | mutex | 16 | fork | — | 8 | 2.008 | 3.260 | 2.019 | 0.000 | 0 |
| scope-t256-d16-scheduler-candidates | 256 | scope | 16 | scheduler-candidates | — | 8 | 0.892 | 1.000 | 0.903 | 0.000 | 0 |
| scope-t256-d16-catalog | 256 | scope | 16 | catalog | — | 8 | 2.011 | 4.789 | 3.513 | 0.000 | 0 |
| scope-t256-d16-validate-selection | 256 | scope | 16 | validate-selection | — | 8 | 0.001 | 0.004 | 0.009 | 0.000 | 0 |
| scope-t256-d16-select | 256 | scope | 16 | select | — | 8 | 2.008 | 2.159 | 2.020 | 0.000 | 0 |
| scope-t256-d16-settle | 256 | scope | 16 | settle | — | 8 | 2.009 | 3.761 | 2.404 | 0.000 | 0 |
| scope-t256-d16-fork | 256 | scope | 16 | fork | — | 8 | 1.876 | 1.949 | 1.907 | 0.000 | 0 |
| independent-t256-legacy-seed-index | 256 | independent | — | legacy-seed-index | — | 8 | 2.569 | 4.838 | 2.590 | 0.000 | 0 |
| forced-cascade-t161-layered-forced-cascade-settle | 161 | forced-cascade | 2 | layered-forced-cascade-settle | 160 | 8 | 553.179 | 557.378 | 579.033 | 16.246 | 1407872 |

## Reading boundary

77 shared rows exactly match before; the named `legacy-seed-index` and `layered-forced-cascade-settle` rows are A/B/C-only. They do not form a cross-host budget or turn heap proxy into allocation evidence. This historic candidate is retained only for formation review; the shipping harness accepts no representation switch.
