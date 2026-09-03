# Current admission-core profile

- Status: **historic chunked-cow formation after-profile (retired; non-rerunnable)** at git commit `14007b38f5e55aa81ab490eff7741596da34bcd1`.
- Command: Historic execution command (now intentionally rejected): `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --representation chunked-cow`; seed: `20260903`; warmup/measured samples: 2/5.
- CPU profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`; profiled workload: 1024-task independent graph at 16 immutable transitions; 16 catalog and 16 Scheduler-candidate batches.
- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.
- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.
- The formation `Bun --heap-prof-md` capture reported 10,593,593 process heap bytes and 59,232 objects; its raw dump is intentionally not retained because module/runtime retainers do not attribute memory to admission state.

## Results

| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| profile-independent-t1024-d16-catalog | 1024 | independent | 16 | catalog | — | 16 | 4.684 | 5.038 | 4.713 | 0.143 | 0 |
| profile-independent-t1024-d16-scheduler-candidates | 1024 | independent | 16 | scheduler-candidates | — | 16 | 5.366 | 7.700 | 4.865 | 0.354 | 0 |

## Reading boundary

The rows are one semantically checked candidate under the exact before matrix. They do not form a cross-host budget or turn heap proxy into allocation evidence. Candidate selection must compare all three candidates and retained-branch observations.
