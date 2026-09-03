# Current admission-core baseline

- Status: **before-only baseline** at git commit `ac493c24ecddca377f1576c6bbf343723895c588`; no product runtime or test was changed by this Change.
- Command: `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| real-mixed-real-static-unused-public-state | 96 | real-mixed | — | real-static-unused-public-state | — | 2 | 82.729 | 86.327 | 89.337 | 0.024 | 367996 |
| real-mixed-real-custom-unused-public-state | 96 | real-mixed | — | real-custom-unused-public-state | — | 2 | 213.123 | 220.739 | 230.768 | 8.396 | 1296298 |
| real-mixed-real-learned-unused-public-state | 96 | real-mixed | — | real-learned-unused-public-state | — | 2 | 85.408 | 86.528 | 88.301 | 0.396 | 304076 |
| independent-t64-d0-scheduler-candidates | 64 | independent | 0 | scheduler-candidates | — | 16 | 1.668 | 1.758 | 1.681 | 0.000 | 0 |
| independent-t64-d0-catalog | 64 | independent | 0 | catalog | — | 16 | 3.410 | 3.556 | 4.293 | 0.000 | 0 |
| independent-t64-d0-validate-selection | 64 | independent | 0 | validate-selection | — | 16 | 0.024 | 0.071 | 0.032 | 0.000 | 0 |
| independent-t64-d0-select | 64 | independent | 0 | select | — | 16 | 0.080 | 0.122 | 0.088 | 0.000 | 0 |
| independent-t64-d0-settle | 64 | independent | 0 | settle | — | 16 | 0.233 | 0.263 | 0.242 | 0.000 | 0 |
| independent-t64-d0-fork | 64 | independent | 0 | fork | — | 16 | 0.091 | 0.160 | 0.120 | 0.000 | 0 |
| independent-t64-d16-scheduler-candidates | 64 | independent | 16 | scheduler-candidates | — | 16 | 3.484 | 5.198 | 2.690 | 0.137 | 0 |
| independent-t64-d16-catalog | 64 | independent | 16 | catalog | — | 16 | 5.605 | 5.922 | 5.618 | 0.000 | 0 |
| independent-t64-d16-validate-selection | 64 | independent | 16 | validate-selection | — | 16 | 0.049 | 0.063 | 0.058 | 0.000 | 0 |
| independent-t64-d16-select | 64 | independent | 16 | select | — | 16 | 0.096 | 0.140 | 0.105 | 0.000 | 0 |
| independent-t64-d16-settle | 64 | independent | 16 | settle | — | 16 | 0.117 | 0.156 | 0.147 | 0.000 | 0 |
| independent-t64-d16-fork | 64 | independent | 16 | fork | — | 16 | 0.122 | 0.151 | 0.132 | 0.000 | 0 |
| independent-t64-d48-scheduler-candidates | 64 | independent | 48 | scheduler-candidates | — | 16 | 3.874 | 4.070 | 3.888 | 0.000 | 0 |
| independent-t64-d48-catalog | 64 | independent | 48 | catalog | — | 16 | 7.912 | 9.280 | 8.022 | 0.000 | 0 |
| independent-t64-d48-validate-selection | 64 | independent | 48 | validate-selection | — | 16 | 0.143 | 0.181 | 0.153 | 0.000 | 0 |
| independent-t64-d48-select | 64 | independent | 48 | select | — | 16 | 0.190 | 0.220 | 0.000 | 0.165 | 0 |
| independent-t64-d48-settle | 64 | independent | 48 | settle | — | 16 | 0.175 | 0.211 | 0.173 | 0.011 | 0 |
| independent-t64-d48-fork | 64 | independent | 48 | fork | — | 16 | 0.158 | 0.216 | 0.000 | 0.166 | 0 |
| high-fanout-t64-forced-block-settle | 64 | high-fanout | 2 | forced-block-settle | 63 | 16 | 4.280 | 4.568 | 8.291 | 0.000 | 0 |
| independent-t256-d0-scheduler-candidates | 256 | independent | 0 | scheduler-candidates | — | 8 | 10.768 | 12.737 | 10.783 | 0.002 | 0 |
| independent-t256-d0-catalog | 256 | independent | 0 | catalog | — | 8 | 20.793 | 21.178 | 20.402 | 0.022 | 0 |
| independent-t256-d0-validate-selection | 256 | independent | 0 | validate-selection | — | 8 | 0.037 | 0.060 | 0.060 | 0.003 | 0 |
| independent-t256-d0-select | 256 | independent | 0 | select | — | 8 | 0.065 | 0.080 | 0.069 | 0.004 | 0 |
| independent-t256-d0-settle | 256 | independent | 0 | settle | — | 8 | 0.558 | 1.475 | 0.000 | 0.568 | 0 |
| independent-t256-d0-fork | 256 | independent | 0 | fork | — | 8 | 0.090 | 0.106 | 0.102 | 0.004 | 0 |
| independent-t256-d16-scheduler-candidates | 256 | independent | 16 | scheduler-candidates | — | 8 | 22.146 | 23.145 | 21.908 | 0.000 | 0 |
| independent-t256-d16-catalog | 256 | independent | 16 | catalog | — | 8 | 45.761 | 46.471 | 45.720 | 0.000 | 0 |
| independent-t256-d16-validate-selection | 256 | independent | 16 | validate-selection | — | 8 | 0.094 | 0.101 | 0.104 | 0.000 | 0 |
| independent-t256-d16-select | 256 | independent | 16 | select | — | 8 | 0.110 | 0.113 | 0.118 | 0.000 | 0 |
| independent-t256-d16-settle | 256 | independent | 16 | settle | — | 8 | 0.177 | 0.218 | 0.185 | 0.000 | 0 |
| independent-t256-d16-fork | 256 | independent | 16 | fork | — | 8 | 0.110 | 0.110 | 0.118 | 0.000 | 0 |
| independent-t256-d48-scheduler-candidates | 256 | independent | 48 | scheduler-candidates | — | 8 | 45.974 | 47.405 | 45.155 | 0.000 | 0 |
| independent-t256-d48-catalog | 256 | independent | 48 | catalog | — | 8 | 90.853 | 94.930 | 90.963 | 0.000 | 0 |
| independent-t256-d48-validate-selection | 256 | independent | 48 | validate-selection | — | 8 | 0.222 | 0.246 | 0.231 | 0.000 | 0 |
| independent-t256-d48-select | 256 | independent | 48 | select | — | 8 | 0.244 | 0.279 | 0.288 | 0.000 | 0 |
| independent-t256-d48-settle | 256 | independent | 48 | settle | — | 8 | 0.357 | 0.370 | 0.367 | 0.000 | 0 |
| independent-t256-d48-fork | 256 | independent | 48 | fork | — | 8 | 0.237 | 0.258 | 0.246 | 0.000 | 0 |
| high-fanout-t256-forced-block-settle | 256 | high-fanout | 2 | forced-block-settle | 255 | 8 | 54.771 | 56.040 | 55.462 | 0.000 | 0 |
| independent-t1024-d0-scheduler-candidates | 1024 | independent | 0 | scheduler-candidates | — | 2 | 37.418 | 42.522 | 37.832 | 0.029 | 0 |
| independent-t1024-d0-catalog | 1024 | independent | 0 | catalog | — | 2 | 75.370 | 75.986 | 75.567 | 0.002 | 0 |
| independent-t1024-d0-validate-selection | 1024 | independent | 0 | validate-selection | — | 2 | 0.036 | 0.055 | 0.043 | 0.001 | 0 |
| independent-t1024-d0-select | 1024 | independent | 0 | select | — | 2 | 0.042 | 0.052 | 0.048 | 0.002 | 0 |
| independent-t1024-d0-settle | 1024 | independent | 0 | settle | — | 2 | 0.124 | 1.141 | 0.133 | 0.000 | 0 |
| independent-t1024-d0-fork | 1024 | independent | 0 | fork | — | 2 | 0.042 | 0.044 | 0.049 | 0.000 | 0 |
| independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 2 | 83.394 | 86.569 | 83.408 | 0.000 | 0 |
| independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 2 | 166.393 | 168.731 | 166.665 | 0.000 | 0 |
| independent-t1024-d16-validate-selection | 1024 | independent | 16 | validate-selection | — | 2 | 0.081 | 0.089 | 0.088 | 0.000 | 0 |
| independent-t1024-d16-select | 1024 | independent | 16 | select | — | 2 | 0.088 | 0.105 | 0.096 | 0.000 | 0 |
| independent-t1024-d16-settle | 1024 | independent | 16 | settle | — | 2 | 0.186 | 0.191 | 0.196 | 0.000 | 0 |
| independent-t1024-d16-fork | 1024 | independent | 16 | fork | — | 2 | 0.089 | 0.100 | 0.096 | 0.000 | 0 |
| independent-t4096-d0-scheduler-candidates | 4096 | independent | 0 | scheduler-candidates | — | 1 | 309.928 | 314.942 | 310.355 | 0.017 | 0 |
| independent-t4096-d0-catalog | 4096 | independent | 0 | catalog | — | 1 | 617.153 | 625.351 | 614.996 | 0.046 | 0 |
| independent-t4096-d0-validate-selection | 4096 | independent | 0 | validate-selection | — | 1 | 0.071 | 0.080 | 0.079 | 0.000 | 0 |
| independent-t4096-d0-select | 4096 | independent | 0 | select | — | 1 | 0.084 | 0.134 | 0.094 | 0.000 | 0 |
| independent-t4096-d0-settle | 4096 | independent | 0 | settle | — | 1 | 0.290 | 2.041 | 0.302 | 0.000 | 0 |
| independent-t4096-d0-fork | 4096 | independent | 0 | fork | — | 1 | 0.079 | 0.097 | 0.088 | 0.000 | 0 |
| layered-t256-d16-scheduler-candidates | 256 | layered | 16 | scheduler-candidates | — | 8 | 2.557 | 2.614 | 2.569 | 0.000 | 0 |
| layered-t256-d16-catalog | 256 | layered | 16 | catalog | — | 8 | 7.209 | 9.598 | 7.397 | 0.000 | 0 |
| layered-t256-d16-validate-selection | 256 | layered | 16 | validate-selection | — | 8 | 0.085 | 0.119 | 0.094 | 0.000 | 0 |
| layered-t256-d16-select | 256 | layered | 16 | select | — | 8 | 0.109 | 0.113 | 0.115 | 0.002 | 0 |
| layered-t256-d16-settle | 256 | layered | 16 | settle | — | 8 | 0.321 | 0.431 | 0.348 | 0.000 | 0 |
| layered-t256-d16-fork | 256 | layered | 16 | fork | — | 8 | 0.114 | 0.131 | 0.120 | 0.003 | 0 |
| mutex-t256-d16-scheduler-candidates | 256 | mutex | 16 | scheduler-candidates | — | 8 | 53.860 | 56.480 | 52.987 | 0.016 | 0 |
| mutex-t256-d16-catalog | 256 | mutex | 16 | catalog | — | 8 | 108.031 | 112.649 | 108.569 | 0.000 | 0 |
| mutex-t256-d16-validate-selection | 256 | mutex | 16 | validate-selection | — | 8 | 0.220 | 0.302 | 0.230 | 0.000 | 0 |
| mutex-t256-d16-select | 256 | mutex | 16 | select | — | 8 | 0.237 | 0.336 | 0.245 | 0.000 | 0 |
| mutex-t256-d16-settle | 256 | mutex | 16 | settle | — | 8 | 0.205 | 0.266 | 0.214 | 0.000 | 0 |
| mutex-t256-d16-fork | 256 | mutex | 16 | fork | — | 8 | 0.224 | 0.241 | 0.234 | 0.000 | 0 |
| scope-t256-d16-scheduler-candidates | 256 | scope | 16 | scheduler-candidates | — | 8 | 22.578 | 23.430 | 22.623 | 0.001 | 0 |
| scope-t256-d16-catalog | 256 | scope | 16 | catalog | — | 8 | 45.940 | 48.038 | 45.918 | 0.036 | 0 |
| scope-t256-d16-validate-selection | 256 | scope | 16 | validate-selection | — | 8 | 0.090 | 0.099 | 0.097 | 0.000 | 0 |
| scope-t256-d16-select | 256 | scope | 16 | select | — | 8 | 0.111 | 0.117 | 0.119 | 0.000 | 0 |
| scope-t256-d16-settle | 256 | scope | 16 | settle | — | 8 | 0.333 | 0.355 | 0.348 | 0.000 | 0 |
| scope-t256-d16-fork | 256 | scope | 16 | fork | — | 8 | 0.118 | 0.132 | 0.126 | 0.000 | 0 |

## Reading boundary

The rows identify current scaling and sampled hot paths. They do not prove a future representation's benefit, form a cross-host budget, or turn heap proxy into allocation evidence. Candidate selection must use these before data together with a semantically complete after workload.
