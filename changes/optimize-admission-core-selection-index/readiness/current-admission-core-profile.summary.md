# Current admission-core profile

- Status: **before-only sampled profile** at git commit `ac493c24ecddca377f1576c6bbf343723895c588`; no product runtime or test was changed by this Change.
- Command: `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| profile-independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 16 | 722.313 | 764.178 | 679.719 | 61.592 | 108040 |
| profile-independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 16 | 714.957 | 726.090 | 685.601 | 61.257 | 0 |

## Reading boundary

The rows identify current scaling and sampled hot paths. They do not prove a future representation's benefit, form a cross-host budget, or turn heap proxy into allocation evidence. Candidate selection must use these before data together with a semantically complete after workload.
