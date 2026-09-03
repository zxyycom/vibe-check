# Current admission-core baseline

- Status: **selected immutable-list baseline** at git commit `963425f5e5457b5cac4b33b120ba49d652134ebe`.
- Command: `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core-immutable-list.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches on the selected immutable@5.1.9 List implementation.
- Selected implementation fingerprint (SHA-256 over package.json, pnpm-lock.yaml, src/project-run/task-scheduler/admission-core-compiled-graph.ts, src/project-run/task-scheduler/admission-core.ts): `44dbcaa035d2a709c4be85be4f83f1a54d6b1d9b36f2c3572830002440080635`.
- Comparison scope: 77 shared scenario identities exactly match the read-only before matrix; the named legacy-seed-index and layered-forced-cascade-settle rows are selected-only Change observations.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.
- The `Bun --heap-prof-md` command was run, but its raw process snapshot is intentionally not retained: module/runtime retainers do not attribute memory to admission state. The manifest records its bounded totals and method.
- Historical A/B/C artifacts remain review evidence; this harness reruns only the selected shipping implementation.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| real-mixed-real-static-unused-public-state | 96 | real-mixed | — | real-static-unused-public-state | — | 2 | 38.725 | 41.681 | 54.769 | 2.727 | 517760 |
| real-mixed-real-custom-unused-public-state | 96 | real-mixed | — | real-custom-unused-public-state | — | 2 | 73.476 | 83.400 | 86.887 | 3.885 | 1549896 |
| real-mixed-real-learned-unused-public-state | 96 | real-mixed | — | real-learned-unused-public-state | — | 2 | 35.464 | 36.364 | 39.785 | 0.258 | 439868 |
| independent-t64-d0-scheduler-candidates | 64 | independent | 0 | scheduler-candidates | — | 16 | 0.255 | 0.343 | 0.226 | 0.038 | 0 |
| independent-t64-d0-catalog | 64 | independent | 0 | catalog | — | 16 | 0.448 | 0.458 | 0.465 | 0.000 | 0 |
| independent-t64-d0-validate-selection | 64 | independent | 0 | validate-selection | — | 16 | 0.002 | 0.033 | 0.010 | 0.000 | 0 |
| independent-t64-d0-select | 64 | independent | 0 | select | — | 16 | 0.078 | 0.178 | 0.075 | 0.011 | 0 |
| independent-t64-d0-settle | 64 | independent | 0 | settle | — | 16 | 0.068 | 0.170 | 0.080 | 0.000 | 0 |
| independent-t64-d0-fork | 64 | independent | 0 | fork | — | 16 | 0.055 | 0.174 | 0.065 | 0.000 | 0 |
| independent-t64-d16-scheduler-candidates | 64 | independent | 16 | scheduler-candidates | — | 16 | 0.231 | 0.324 | 0.239 | 0.033 | 0 |
| independent-t64-d16-catalog | 64 | independent | 16 | catalog | — | 16 | 0.369 | 0.503 | 0.398 | 0.000 | 0 |
| independent-t64-d16-validate-selection | 64 | independent | 16 | validate-selection | — | 16 | 0.002 | 0.002 | 0.010 | 0.000 | 0 |
| independent-t64-d16-select | 64 | independent | 16 | select | — | 16 | 0.064 | 0.113 | 0.004 | 0.078 | 0 |
| independent-t64-d16-settle | 64 | independent | 16 | settle | — | 16 | 0.069 | 0.091 | 0.000 | 0.077 | 0 |
| independent-t64-d16-fork | 64 | independent | 16 | fork | — | 16 | 0.061 | 0.090 | 0.000 | 0.071 | 0 |
| independent-t64-d48-scheduler-candidates | 64 | independent | 48 | scheduler-candidates | — | 16 | 0.201 | 2.064 | 0.181 | 0.030 | 0 |
| independent-t64-d48-catalog | 64 | independent | 48 | catalog | — | 16 | 0.319 | 0.329 | 0.288 | 0.043 | 0 |
| independent-t64-d48-validate-selection | 64 | independent | 48 | validate-selection | — | 16 | 0.003 | 0.027 | 0.011 | 0.000 | 0 |
| independent-t64-d48-select | 64 | independent | 48 | select | — | 16 | 0.060 | 0.117 | 0.070 | 0.000 | 0 |
| independent-t64-d48-settle | 64 | independent | 48 | settle | — | 16 | 0.058 | 0.116 | 0.068 | 0.000 | 0 |
| independent-t64-d48-fork | 64 | independent | 48 | fork | — | 16 | 0.053 | 0.101 | 0.062 | 0.000 | 0 |
| high-fanout-t64-forced-block-settle | 64 | high-fanout | 2 | forced-block-settle | 63 | 16 | 4.088 | 5.245 | 8.575 | 0.001 | 0 |
| independent-t256-d0-scheduler-candidates | 256 | independent | 0 | scheduler-candidates | — | 8 | 0.535 | 0.668 | 0.544 | 0.000 | 0 |
| independent-t256-d0-catalog | 256 | independent | 0 | catalog | — | 8 | 0.908 | 1.230 | 1.073 | 0.000 | 0 |
| independent-t256-d0-validate-selection | 256 | independent | 0 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| independent-t256-d0-select | 256 | independent | 0 | select | — | 8 | 0.030 | 0.036 | 0.038 | 0.000 | 0 |
| independent-t256-d0-settle | 256 | independent | 0 | settle | — | 8 | 0.028 | 0.037 | 0.036 | 0.000 | 0 |
| independent-t256-d0-fork | 256 | independent | 0 | fork | — | 8 | 0.034 | 0.065 | 0.047 | 0.000 | 0 |
| independent-t256-d16-scheduler-candidates | 256 | independent | 16 | scheduler-candidates | — | 8 | 0.545 | 0.675 | 0.554 | 0.000 | 0 |
| independent-t256-d16-catalog | 256 | independent | 16 | catalog | — | 8 | 0.887 | 0.934 | 0.093 | 0.808 | 0 |
| independent-t256-d16-validate-selection | 256 | independent | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.007 | 0.001 | 0 |
| independent-t256-d16-select | 256 | independent | 16 | select | — | 8 | 0.028 | 0.034 | 0.031 | 0.005 | 0 |
| independent-t256-d16-settle | 256 | independent | 16 | settle | — | 8 | 0.027 | 0.032 | 0.034 | 0.006 | 0 |
| independent-t256-d16-fork | 256 | independent | 16 | fork | — | 8 | 0.025 | 0.038 | 0.029 | 0.005 | 0 |
| independent-t256-d48-scheduler-candidates | 256 | independent | 48 | scheduler-candidates | — | 8 | 0.486 | 2.309 | 0.424 | 0.068 | 0 |
| independent-t256-d48-catalog | 256 | independent | 48 | catalog | — | 8 | 0.815 | 1.030 | 0.011 | 0.802 | 0 |
| independent-t256-d48-validate-selection | 256 | independent | 48 | validate-selection | — | 8 | 0.001 | 0.004 | 0.008 | 0.001 | 0 |
| independent-t256-d48-select | 256 | independent | 48 | select | — | 8 | 0.030 | 0.039 | 0.032 | 0.006 | 0 |
| independent-t256-d48-settle | 256 | independent | 48 | settle | — | 8 | 0.027 | 0.045 | 0.030 | 0.005 | 0 |
| independent-t256-d48-fork | 256 | independent | 48 | fork | — | 8 | 0.026 | 0.029 | 0.029 | 0.005 | 0 |
| high-fanout-t256-forced-block-settle | 256 | high-fanout | 2 | forced-block-settle | 255 | 8 | 6.702 | 7.944 | 7.506 | 0.001 | 0 |
| independent-t1024-d0-scheduler-candidates | 1024 | independent | 0 | scheduler-candidates | — | 2 | 0.588 | 1.221 | 0.000 | 0.669 | 0 |
| independent-t1024-d0-catalog | 1024 | independent | 0 | catalog | — | 2 | 1.037 | 1.380 | 1.029 | 0.026 | 0 |
| independent-t1024-d0-validate-selection | 1024 | independent | 0 | validate-selection | — | 2 | 0.000 | 0.006 | 0.000 | 0.008 | 0 |
| independent-t1024-d0-select | 1024 | independent | 0 | select | — | 2 | 0.008 | 0.015 | 0.000 | 0.016 | 0 |
| independent-t1024-d0-settle | 1024 | independent | 0 | settle | — | 2 | 0.010 | 0.012 | 0.000 | 0.018 | 0 |
| independent-t1024-d0-fork | 1024 | independent | 0 | fork | — | 2 | 0.008 | 0.011 | 0.000 | 0.016 | 0 |
| independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 2 | 0.574 | 0.648 | 0.498 | 0.085 | 0 |
| independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 2 | 0.931 | 1.040 | 0.941 | 0.000 | 0 |
| independent-t1024-d16-validate-selection | 1024 | independent | 16 | validate-selection | — | 2 | 0.000 | 0.000 | 0.008 | 0.000 | 0 |
| independent-t1024-d16-select | 1024 | independent | 16 | select | — | 2 | 0.007 | 0.014 | 0.014 | 0.000 | 0 |
| independent-t1024-d16-settle | 1024 | independent | 16 | settle | — | 2 | 0.008 | 0.009 | 0.016 | 0.000 | 0 |
| independent-t1024-d16-fork | 1024 | independent | 16 | fork | — | 2 | 0.006 | 0.007 | 0.014 | 0.000 | 0 |
| independent-t4096-d0-scheduler-candidates | 4096 | independent | 0 | scheduler-candidates | — | 1 | 2.505 | 2.627 | 2.519 | 0.000 | 0 |
| independent-t4096-d0-catalog | 4096 | independent | 0 | catalog | — | 1 | 3.329 | 4.461 | 3.770 | 0.001 | 0 |
| independent-t4096-d0-validate-selection | 4096 | independent | 0 | validate-selection | — | 1 | 0.000 | 0.001 | 0.008 | 0.000 | 0 |
| independent-t4096-d0-select | 4096 | independent | 0 | select | — | 1 | 0.008 | 0.010 | 0.016 | 0.000 | 0 |
| independent-t4096-d0-settle | 4096 | independent | 0 | settle | — | 1 | 0.004 | 0.015 | 0.011 | 0.000 | 0 |
| independent-t4096-d0-fork | 4096 | independent | 0 | fork | — | 1 | 0.004 | 0.005 | 0.012 | 0.000 | 0 |
| layered-t256-d16-scheduler-candidates | 256 | layered | 16 | scheduler-candidates | — | 8 | 0.096 | 0.154 | 0.110 | 0.000 | 0 |
| layered-t256-d16-catalog | 256 | layered | 16 | catalog | — | 8 | 3.043 | 3.247 | 3.056 | 0.000 | 0 |
| layered-t256-d16-validate-selection | 256 | layered | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| layered-t256-d16-select | 256 | layered | 16 | select | — | 8 | 0.024 | 0.033 | 0.032 | 0.000 | 0 |
| layered-t256-d16-settle | 256 | layered | 16 | settle | — | 8 | 0.030 | 0.152 | 0.038 | 0.000 | 0 |
| layered-t256-d16-fork | 256 | layered | 16 | fork | — | 8 | 0.033 | 0.075 | 0.041 | 0.000 | 0 |
| mutex-t256-d16-scheduler-candidates | 256 | mutex | 16 | scheduler-candidates | — | 8 | 0.435 | 0.520 | 0.387 | 0.057 | 0 |
| mutex-t256-d16-catalog | 256 | mutex | 16 | catalog | — | 8 | 0.815 | 0.887 | 0.723 | 0.122 | 0 |
| mutex-t256-d16-validate-selection | 256 | mutex | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.001 | 0 |
| mutex-t256-d16-select | 256 | mutex | 16 | select | — | 8 | 0.438 | 2.650 | 0.450 | 0.001 | 0 |
| mutex-t256-d16-settle | 256 | mutex | 16 | settle | — | 8 | 0.309 | 0.334 | 0.271 | 0.046 | 0 |
| mutex-t256-d16-fork | 256 | mutex | 16 | fork | — | 8 | 0.455 | 2.398 | 0.324 | 0.382 | 0 |
| scope-t256-d16-scheduler-candidates | 256 | scope | 16 | scheduler-candidates | — | 8 | 0.608 | 0.653 | 0.663 | 0.000 | 0 |
| scope-t256-d16-catalog | 256 | scope | 16 | catalog | — | 8 | 1.796 | 4.002 | 5.181 | 0.001 | 0 |
| scope-t256-d16-validate-selection | 256 | scope | 16 | validate-selection | — | 8 | 0.001 | 0.001 | 0.009 | 0.000 | 0 |
| scope-t256-d16-select | 256 | scope | 16 | select | — | 8 | 0.025 | 0.029 | 0.033 | 0.000 | 0 |
| scope-t256-d16-settle | 256 | scope | 16 | settle | — | 8 | 0.031 | 0.031 | 0.039 | 0.000 | 0 |
| scope-t256-d16-fork | 256 | scope | 16 | fork | — | 8 | 0.027 | 0.036 | 0.042 | 0.000 | 0 |
| independent-t256-legacy-seed-index | 256 | independent | — | legacy-seed-index | — | 8 | 1.686 | 3.319 | 1.760 | 0.000 | 0 |
| forced-cascade-t161-layered-forced-cascade-settle | 161 | forced-cascade | 2 | layered-forced-cascade-settle | 160 | 8 | 56.537 | 59.413 | 56.459 | 11.433 | 3526672 |

## Reading boundary

The rows identify current selected-implementation scaling and sampled hot paths. They do not form a cross-host budget or turn heap proxy into allocation evidence.
