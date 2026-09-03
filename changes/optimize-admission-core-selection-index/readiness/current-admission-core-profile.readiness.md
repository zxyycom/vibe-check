# Current admission-core profile reading

This is **before-only** readiness evidence for commit `ac493c24ecddca377f1576c6bbf343723895c588`; it makes no after-performance claim and does not set a numeric budget.

## Method

- Baseline command: `bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts`.
- Profile command: `bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --cpu-prof-name current-admission-core.cpu.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`.
- Heap method command: `bun --heap-prof-md --heap-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles --heap-prof-name current-admission-core.heap.md changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile`.
- Representative workload: 1,024 independent tasks at 16 state transitions; separate 16-iteration catalog and Scheduler-candidate batches; warmup/measured samples: 2/5; fixture seed: `20260903`.
- Wall p50/p95 and CPU user/system are batch quantiles. `heapUsed` around a batch is an unforced-GC live-heap proxy. `Bun --heap-prof-md` is a process snapshot; neither is an allocation counter nor a per-state retained-byte measurement.

## Before observations

| Batch                     |       Wall p50 / p95 | CPU user p50 | Interpretation boundary                                                                                          |
| ------------------------- | -------------------: | -----------: | ---------------------------------------------------------------------------------------------------------------- |
| catalog × 16              | 717.283 / 778.780 ms |   704.371 ms | Public DTO construction is included, but CPU profile shows the dominant time is upstream capacity recomputation. |
| Scheduler candidates × 16 | 713.487 / 717.626 ms |   674.774 ms | No public catalog DTO is constructed; its near-equal cost isolates repeated legality/capacity work.              |

The complete 77-row current baseline is in [current-admission-core-baseline.summary.md](current-admission-core-baseline.summary.md) and its raw samples/environment are in [current-admission-core-baseline.raw.json](current-admission-core-baseline.raw.json). It includes all required scenario categories and a T=256 high-fanout settlement that creates B=255 forced blocks. The bounded T=4096,D=48 cross-product did not complete in the initial measurement window; T=4096 remains represented at D=0 and is not evidence that high depth is acceptable.

## CPU profile evidence

[`current-admission-core.cpu.md`](profiles/current-admission-core.cpu.md) sampled 10.91 s / 9,072 samples at 1 ms. Native `filter` accounts for 95.2% self time. Its call tree attributes 94.5% total time to `capacityRejectionFor` → `runningCount`; `catalogForCore` and `admissionCandidatesForCore` each account for about half of the representative run (48.3% and 47.2% total respectively). This confirms the bottleneck class is repeated all-task running-count/capacity evaluation in both consumers, not public catalog DTO serialization alone.

The profile also includes frames for `taskStatusFor`, relation/mutex checks, scope blockers and forced-block scanning, but this representative independent workload is not a causal measurement of their worst shapes. The full topology and B scenarios remain required in the after comparison.

## Heap observation boundary

The readiness `Bun --heap-prof-md` capture reported a process heap snapshot of about 8.1 MB / 53,473 objects after the representative profile; module loader/records dominated the retained hierarchy. The 8.7 MB raw heap dump is intentionally not retained because it adds no admission-state attribution; this note, the profile command and the per-batch heap proxy preserve the reproducible observation. It does **not** isolate branch states, selection-index chunks or catalog DTOs, so it supplies only a method baseline. The after workload must add retained-branch and cold-index observations before making a memory trade-off claim.

## Design consequence

The profile validates work on shared selection/capacity aggregates and rules out a catalog-only optimization. It does not prove a particular chunk size or establish B as faster; the representation gate must compare A/B/C candidates with the same complete semantic matrix and persisted semantic oracle before any representation is selected.
