# Current admission-core baseline

- Status: **historic chunked-cow formation after-run (retired; non-rerunnable)** at git commit `14007b38f5e55aa81ab490eff7741596da34bcd1`.
- Command: Historic execution command (now intentionally rejected): `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --representation chunked-cow`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.
- Comparison scope: 77 shared exact rows + 2 A/B/C-only rows. `legacy-seed-index` and `layered-forced-cascade-settle` have no immutable before row.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| real-mixed-real-static-unused-public-state | 96 | real-mixed | — | real-static-unused-public-state | — | 2 | 41.859 | 44.635 | 52.535 | 0.787 | 483500 |
| real-mixed-real-custom-unused-public-state | 96 | real-mixed | — | real-custom-unused-public-state | — | 2 | 82.612 | 83.046 | 89.871 | 4.872 | 1508161 |
| real-mixed-real-learned-unused-public-state | 96 | real-mixed | — | real-learned-unused-public-state | — | 2 | 46.847 | 55.305 | 50.686 | 0.741 | 453948 |
| independent-t64-d0-scheduler-candidates | 64 | independent | 0 | scheduler-candidates | — | 16 | 0.278 | 0.297 | 0.258 | 0.032 | 0 |
| independent-t64-d0-catalog | 64 | independent | 0 | catalog | — | 16 | 0.521 | 2.463 | 1.517 | 0.000 | 0 |
| independent-t64-d0-validate-selection | 64 | independent | 0 | validate-selection | — | 16 | 0.002 | 0.033 | 0.010 | 0.000 | 0 |
| independent-t64-d0-select | 64 | independent | 0 | select | — | 16 | 0.217 | 0.357 | 0.229 | 0.000 | 0 |
| independent-t64-d0-settle | 64 | independent | 0 | settle | — | 16 | 0.221 | 0.302 | 0.236 | 0.000 | 0 |
| independent-t64-d0-fork | 64 | independent | 0 | fork | — | 16 | 0.221 | 0.347 | 0.232 | 0.000 | 0 |
| independent-t64-d16-scheduler-candidates | 64 | independent | 16 | scheduler-candidates | — | 16 | 0.292 | 0.333 | 0.380 | 0.000 | 0 |
| independent-t64-d16-catalog | 64 | independent | 16 | catalog | — | 16 | 0.480 | 0.526 | 0.500 | 0.000 | 0 |
| independent-t64-d16-validate-selection | 64 | independent | 16 | validate-selection | — | 16 | 0.002 | 0.004 | 0.010 | 0.000 | 0 |
| independent-t64-d16-select | 64 | independent | 16 | select | — | 16 | 0.311 | 0.385 | 0.330 | 0.000 | 0 |
| independent-t64-d16-settle | 64 | independent | 16 | settle | — | 16 | 0.232 | 0.240 | 0.251 | 0.000 | 0 |
| independent-t64-d16-fork | 64 | independent | 16 | fork | — | 16 | 0.210 | 0.234 | 0.218 | 0.000 | 0 |
| independent-t64-d48-scheduler-candidates | 64 | independent | 48 | scheduler-candidates | — | 16 | 0.205 | 0.246 | 0.199 | 0.000 | 0 |
| independent-t64-d48-catalog | 64 | independent | 48 | catalog | — | 16 | 0.339 | 0.391 | 0.000 | 0.348 | 0 |
| independent-t64-d48-validate-selection | 64 | independent | 48 | validate-selection | — | 16 | 0.003 | 0.039 | 0.000 | 0.012 | 0 |
| independent-t64-d48-select | 64 | independent | 48 | select | — | 16 | 0.244 | 0.306 | 0.253 | 0.000 | 0 |
| independent-t64-d48-settle | 64 | independent | 48 | settle | — | 16 | 0.245 | 0.370 | 0.255 | 0.000 | 0 |
| independent-t64-d48-fork | 64 | independent | 48 | fork | — | 16 | 0.236 | 0.304 | 0.000 | 0.230 | 0 |
| high-fanout-t64-forced-block-settle | 64 | high-fanout | 2 | forced-block-settle | 63 | 16 | 19.748 | 24.467 | 22.282 | 0.000 | 0 |
| independent-t256-d0-scheduler-candidates | 256 | independent | 0 | scheduler-candidates | — | 8 | 0.977 | 2.325 | 0.990 | 0.001 | 0 |
| independent-t256-d0-catalog | 256 | independent | 0 | catalog | — | 8 | 1.233 | 1.376 | 1.280 | 0.001 | 0 |
| independent-t256-d0-validate-selection | 256 | independent | 0 | validate-selection | — | 8 | 0.001 | 0.013 | 0.010 | 0.000 | 0 |
| independent-t256-d0-select | 256 | independent | 0 | select | — | 8 | 0.116 | 0.153 | 0.128 | 0.000 | 0 |
| independent-t256-d0-settle | 256 | independent | 0 | settle | — | 8 | 0.101 | 0.124 | 0.120 | 0.000 | 0 |
| independent-t256-d0-fork | 256 | independent | 0 | fork | — | 8 | 0.185 | 0.315 | 0.195 | 0.000 | 0 |
| independent-t256-d16-scheduler-candidates | 256 | independent | 16 | scheduler-candidates | — | 8 | 0.685 | 0.816 | 0.824 | 0.000 | 0 |
| independent-t256-d16-catalog | 256 | independent | 16 | catalog | — | 8 | 1.255 | 1.376 | 1.168 | 0.024 | 0 |
| independent-t256-d16-validate-selection | 256 | independent | 16 | validate-selection | — | 8 | 0.001 | 0.006 | 0.008 | 0.001 | 0 |
| independent-t256-d16-select | 256 | independent | 16 | select | — | 8 | 0.107 | 0.171 | 0.103 | 0.012 | 0 |
| independent-t256-d16-settle | 256 | independent | 16 | settle | — | 8 | 0.108 | 0.139 | 0.103 | 0.013 | 0 |
| independent-t256-d16-fork | 256 | independent | 16 | fork | — | 8 | 0.116 | 0.167 | 0.120 | 0.000 | 0 |
| independent-t256-d48-scheduler-candidates | 256 | independent | 48 | scheduler-candidates | — | 8 | 0.784 | 0.982 | 0.760 | 0.000 | 0 |
| independent-t256-d48-catalog | 256 | independent | 48 | catalog | — | 8 | 2.052 | 5.484 | 2.067 | 0.205 | 0 |
| independent-t256-d48-validate-selection | 256 | independent | 48 | validate-selection | — | 8 | 0.002 | 0.011 | 0.012 | 0.000 | 0 |
| independent-t256-d48-select | 256 | independent | 48 | select | — | 8 | 0.214 | 0.354 | 0.233 | 0.001 | 0 |
| independent-t256-d48-settle | 256 | independent | 48 | settle | — | 8 | 0.204 | 0.271 | 0.214 | 0.000 | 0 |
| independent-t256-d48-fork | 256 | independent | 48 | fork | — | 8 | 0.262 | 6.177 | 0.286 | 0.026 | 0 |
| high-fanout-t256-forced-block-settle | 256 | high-fanout | 2 | forced-block-settle | 255 | 8 | 32.019 | 38.439 | 43.072 | 0.332 | 770204 |
| independent-t1024-d0-scheduler-candidates | 1024 | independent | 0 | scheduler-candidates | — | 2 | 1.665 | 1.950 | 0.000 | 1.503 | 0 |
| independent-t1024-d0-catalog | 1024 | independent | 0 | catalog | — | 2 | 1.323 | 1.647 | 1.329 | 0.001 | 0 |
| independent-t1024-d0-validate-selection | 1024 | independent | 0 | validate-selection | — | 2 | 0.000 | 0.006 | 0.009 | 0.000 | 0 |
| independent-t1024-d0-select | 1024 | independent | 0 | select | — | 2 | 0.041 | 0.052 | 0.050 | 0.000 | 0 |
| independent-t1024-d0-settle | 1024 | independent | 0 | settle | — | 2 | 0.030 | 0.035 | 0.038 | 0.000 | 0 |
| independent-t1024-d0-fork | 1024 | independent | 0 | fork | — | 2 | 0.027 | 0.030 | 0.036 | 0.000 | 0 |
| independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 2 | 0.713 | 0.936 | 0.000 | 0.722 | 0 |
| independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 2 | 1.170 | 1.582 | 1.191 | 0.002 | 0 |
| independent-t1024-d16-validate-selection | 1024 | independent | 16 | validate-selection | — | 2 | 0.000 | 0.001 | 0.008 | 0.000 | 0 |
| independent-t1024-d16-select | 1024 | independent | 16 | select | — | 2 | 0.028 | 0.033 | 0.036 | 0.000 | 0 |
| independent-t1024-d16-settle | 1024 | independent | 16 | settle | — | 2 | 0.025 | 0.035 | 0.033 | 0.000 | 0 |
| independent-t1024-d16-fork | 1024 | independent | 16 | fork | — | 2 | 0.026 | 0.048 | 0.034 | 0.000 | 0 |
| independent-t4096-d0-scheduler-candidates | 4096 | independent | 0 | scheduler-candidates | — | 1 | 3.435 | 4.005 | 3.446 | 0.008 | 0 |
| independent-t4096-d0-catalog | 4096 | independent | 0 | catalog | — | 1 | 4.775 | 7.317 | 4.585 | 0.001 | 0 |
| independent-t4096-d0-validate-selection | 4096 | independent | 0 | validate-selection | — | 1 | 0.000 | 0.001 | 0.008 | 0.001 | 0 |
| independent-t4096-d0-select | 4096 | independent | 0 | select | — | 1 | 0.020 | 0.023 | 0.025 | 0.003 | 0 |
| independent-t4096-d0-settle | 4096 | independent | 0 | settle | — | 1 | 0.024 | 0.028 | 0.030 | 0.003 | 0 |
| independent-t4096-d0-fork | 4096 | independent | 0 | fork | — | 1 | 0.018 | 0.028 | 0.024 | 0.003 | 0 |
| layered-t256-d16-scheduler-candidates | 256 | layered | 16 | scheduler-candidates | — | 8 | 0.151 | 0.166 | 0.155 | 0.019 | 0 |
| layered-t256-d16-catalog | 256 | layered | 16 | catalog | — | 8 | 3.512 | 5.150 | 3.564 | 0.000 | 0 |
| layered-t256-d16-validate-selection | 256 | layered | 16 | validate-selection | — | 8 | 0.001 | 0.005 | 0.009 | 0.000 | 0 |
| layered-t256-d16-select | 256 | layered | 16 | select | — | 8 | 0.099 | 0.140 | 0.109 | 0.000 | 0 |
| layered-t256-d16-settle | 256 | layered | 16 | settle | — | 8 | 0.207 | 0.390 | 0.215 | 0.006 | 0 |
| layered-t256-d16-fork | 256 | layered | 16 | fork | — | 8 | 0.093 | 0.100 | 0.092 | 0.011 | 0 |
| mutex-t256-d16-scheduler-candidates | 256 | mutex | 16 | scheduler-candidates | — | 8 | 0.938 | 0.952 | 0.000 | 0.950 | 0 |
| mutex-t256-d16-catalog | 256 | mutex | 16 | catalog | — | 8 | 1.323 | 1.692 | 1.351 | 0.000 | 0 |
| mutex-t256-d16-validate-selection | 256 | mutex | 16 | validate-selection | — | 8 | 0.002 | 0.002 | 0.011 | 0.000 | 0 |
| mutex-t256-d16-select | 256 | mutex | 16 | select | — | 8 | 0.575 | 0.730 | 0.607 | 0.000 | 0 |
| mutex-t256-d16-settle | 256 | mutex | 16 | settle | — | 8 | 0.639 | 0.757 | 0.649 | 0.000 | 0 |
| mutex-t256-d16-fork | 256 | mutex | 16 | fork | — | 8 | 0.650 | 0.838 | 0.667 | 0.000 | 0 |
| scope-t256-d16-scheduler-candidates | 256 | scope | 16 | scheduler-candidates | — | 8 | 0.740 | 0.892 | 0.625 | 0.103 | 0 |
| scope-t256-d16-catalog | 256 | scope | 16 | catalog | — | 8 | 2.343 | 3.074 | 2.389 | 0.001 | 0 |
| scope-t256-d16-validate-selection | 256 | scope | 16 | validate-selection | — | 8 | 0.002 | 0.002 | 0.010 | 0.000 | 0 |
| scope-t256-d16-select | 256 | scope | 16 | select | — | 8 | 0.101 | 0.207 | 0.108 | 0.000 | 0 |
| scope-t256-d16-settle | 256 | scope | 16 | settle | — | 8 | 0.173 | 0.182 | 0.181 | 0.000 | 0 |
| scope-t256-d16-fork | 256 | scope | 16 | fork | — | 8 | 0.098 | 0.102 | 0.106 | 0.000 | 0 |
| independent-t256-legacy-seed-index | 256 | independent | — | legacy-seed-index | — | 8 | 2.886 | 4.546 | 2.825 | 0.004 | 0 |
| forced-cascade-t161-layered-forced-cascade-settle | 161 | forced-cascade | 2 | layered-forced-cascade-settle | 160 | 8 | 72.841 | 78.039 | 66.711 | 8.746 | 6861168 |

## Reading boundary

77 shared rows exactly match before; the named `legacy-seed-index` and `layered-forced-cascade-settle` rows are A/B/C-only. They do not form a cross-host budget or turn heap proxy into allocation evidence. This historic candidate is retained only for formation review; the shipping harness accepts no representation switch.
