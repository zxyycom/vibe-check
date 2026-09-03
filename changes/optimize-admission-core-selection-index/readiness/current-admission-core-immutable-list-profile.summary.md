# Current admission-core profile

- Status: **selected immutable-list sampled profile** at git commit `963425f5e5457b5cac4b33b120ba49d652134ebe`.
- Command: `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core-immutable-list.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches on the selected immutable@5.1.9 List implementation.
- Selected implementation fingerprint (SHA-256 over package.json, pnpm-lock.yaml, src/project-run/task-scheduler/admission-core-compiled-graph.ts, src/project-run/task-scheduler/admission-core.ts): `44dbcaa035d2a709c4be85be4f83f1a54d6b1d9b36f2c3572830002440080635`.
- Comparison scope: the 2 sampled profile scenario identities exactly match the read-only before profile.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.
- The `Bun --heap-prof-md` command was run, but its raw process snapshot is intentionally not retained: module/runtime retainers do not attribute memory to admission state. The manifest records its bounded totals and method.
- Historical A/B/C artifacts remain review evidence; this harness reruns only the selected shipping implementation.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| profile-independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 16 | 4.135 | 4.578 | 0.610 | 4.170 | 0 |
| profile-independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 16 | 3.909 | 8.851 | 3.794 | 3.799 | 0 |

## Reading boundary

The rows identify current selected-implementation scaling and sampled hot paths. They do not form a cross-host budget or turn heap proxy into allocation evidence.
