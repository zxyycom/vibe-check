# Admission-state benchmark summary

- Command: `bun changes/provide-admission-strategy-simulation/readiness/admission-state-benchmark.ts`
- Fixture seed: `20260903`; warmup/measured samples: 5/17.
- This is readiness evidence only. The three representations are prototype labs; the current real paths are baselines and do not instantiate the proposed public state.
- Allocation is a `heapUsed` delta proxy, not an allocation counter. Retained heap is process-wide, GC-dependent and advisory.

## Results

| Representation | Scenario | Iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | heap-delta proxy p50 bytes |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| current-real-shell | compile | 64 | 12.429 | 14.405 | 12.551 | 120524 |
| current-real-shell | real-static-unused-state-hot-path | 4 | 86.677 | 92.303 | 91.115 | 536736 |
| current-real-shell | real-custom-unused-state-hot-path | 4 | 166.631 | 182.408 | 167.431 | 1774836 |
| current-real-shell | real-learned-unused-state-hot-path | 4 | 91.445 | 100.572 | 89.619 | 582640 |
| full-clone-map-set | inspection | 64 | 0.014 | 0.039 | 0.014 | 0 |
| full-clone-map-set | catalog-cold | 8 | 0.203 | 0.253 | 0.189 | 0 |
| full-clone-map-set | catalog-warm | 8 | 0.187 | 0.258 | 0.194 | 0 |
| full-clone-map-set | repeated-validate | 512 | 0.032 | 0.057 | 0.032 | 0 |
| full-clone-map-set | select-settle | 64 | 0.094 | 0.133 | 0.093 | 0 |
| full-clone-map-set | same-predecessor-fork | 512 | 0.083 | 1.118 | 0.08 | 0 |
| full-clone-map-set | high-fanout | 64 | 1.079 | 2.798 | 1.071 | 0 |
| parent-delta | inspection | 64 | 0.007 | 0.017 | 0.008 | 0 |
| parent-delta | catalog-cold | 8 | 0.338 | 0.483 | 0.292 | 0 |
| parent-delta | catalog-warm | 8 | 0.283 | 0.477 | 0.141 | 0 |
| parent-delta | repeated-validate | 512 | 0.033 | 0.062 | 0.034 | 0 |
| parent-delta | select-settle | 64 | 0.02 | 0.044 | 0.021 | 0 |
| parent-delta | same-predecessor-fork | 512 | 0.031 | 0.068 | 0.029 | 0 |
| parent-delta | high-fanout | 64 | 0.891 | 2.056 | 0.869 | 0 |
| dense-id-chunked-cow | inspection | 64 | 0.017 | 0.046 | 0.017 | 0 |
| dense-id-chunked-cow | catalog-cold | 8 | 0.294 | 0.434 | 0.34 | 0 |
| dense-id-chunked-cow | catalog-warm | 8 | 0.185 | 0.227 | 0.186 | 0 |
| dense-id-chunked-cow | repeated-validate | 512 | 0.049 | 0.069 | 0.05 | 0 |
| dense-id-chunked-cow | select-settle | 64 | 0.091 | 0.114 | 0 | 0 |
| dense-id-chunked-cow | same-predecessor-fork | 512 | 0.353 | 0.605 | 0.344 | 0 |
| dense-id-chunked-cow | high-fanout | 64 | 1.497 | 2.726 | 1.499 | 0 |

## Retained heap observation

```json
[
  {
    "id": "dfs-retained-branches",
    "representation": "full-clone-map-set",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 0,
    "status": "observed"
  },
  {
    "id": "bfs-retained-branches",
    "representation": "full-clone-map-set",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 0,
    "status": "observed"
  },
  {
    "id": "dfs-retained-branches",
    "representation": "parent-delta",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 0,
    "status": "observed"
  },
  {
    "id": "bfs-retained-branches",
    "representation": "parent-delta",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 0,
    "status": "observed"
  },
  {
    "id": "dfs-retained-branches",
    "representation": "dense-id-chunked-cow",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 0,
    "status": "observed"
  },
  {
    "id": "bfs-retained-branches",
    "representation": "dense-id-chunked-cow",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 0,
    "status": "observed"
  }
]
```

## Representation decision

The Plan selects `parent+delta` as the simplest representation that satisfies immutable predecessor retention and successor-only branching. The lab shows the expected catalog/validation depth cost, so the implementation task must retain the same workloads and may introduce a private bounded compaction only if implementation measurements demonstrate it is needed. Dense chunked COW remains the explicit fallback; full-clone Map/Set is rejected for successor transitions because it copies the whole dynamic collection.

The raw samples, environment, fixture descriptions, method and limitations are in [admission-state-benchmark.raw.json](admission-state-benchmark.raw.json) and [admission-state-benchmark.manifest.json](admission-state-benchmark.manifest.json).
