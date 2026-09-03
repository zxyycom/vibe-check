# Admission-state benchmark summary

- Command: `bun changes/provide-admission-strategy-simulation/readiness/admission-state-benchmark.ts`
- Fixture seed: `20260903`; warmup/measured samples: 5/17.
- The three named representations remain readiness prototypes. Implementation rows exercise the shipped parent+delta public state; real static/custom/learned rows verify their unused-state path.
- The implementation fixed-depth setup is timed separately. Inspection, warm catalog, repeated validation, and high-fanout rows reuse prebuilt immutable states so their timed operation excludes state construction.
- Allocation is a `heapUsed` delta proxy, not an allocation counter. Retained heap is process-wide, GC-dependent and advisory.

## Results

| Representation | Scenario | Iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | heap-delta proxy p50 bytes |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| current-real-shell | compile | 64 | 12.169 | 15.636 | 14.386 | 105276 |
| current-real-shell | real-static-unused-state-hot-path | 4 | 147.661 | 163.403 | 154.759 | 626064 |
| current-real-shell | real-custom-unused-state-hot-path | 4 | 353.913 | 386.719 | 357.438 | 1712368 |
| current-real-shell | real-learned-unused-state-hot-path | 4 | 144.814 | 157.442 | 148.852 | 868960 |
| implementation-parent-delta | fixed-depth-state-setup | 64 | 189.397 | 204.552 | 192.523 | 544238 |
| implementation-parent-delta | inspection | 64 | 1.695 | 3.194 | 1.808 | 0 |
| implementation-parent-delta | catalog-cold | 8 | 2.221 | 4.657 | 2.187 | 0 |
| implementation-parent-delta | catalog-warm | 8 | 2.631 | 4.428 | 2.526 | 0 |
| implementation-parent-delta | repeated-validate | 512 | 6.031 | 9.46 | 6.045 | 0 |
| implementation-parent-delta | select-settle | 64 | 41.462 | 47.298 | 42.036 | 145091 |
| implementation-parent-delta | same-predecessor-fork | 512 | 4.804 | 6.102 | 4.788 | 0 |
| implementation-parent-delta | high-fanout | 64 | 8.399 | 10.538 | 8.533 | 0 |
| full-clone-map-set | inspection | 64 | 0.011 | 0.085 | 0.012 | 0 |
| full-clone-map-set | catalog-cold | 8 | 0.241 | 2.635 | 0.256 | 0 |
| full-clone-map-set | catalog-warm | 8 | 0.25 | 0.279 | 0.252 | 0 |
| full-clone-map-set | repeated-validate | 512 | 0.032 | 0.042 | 0.032 | 0 |
| full-clone-map-set | select-settle | 64 | 0.097 | 0.151 | 0.098 | 0 |
| full-clone-map-set | same-predecessor-fork | 512 | 0.102 | 2.114 | 0.089 | 0 |
| full-clone-map-set | high-fanout | 64 | 1.974 | 2.92 | 1.012 | 0 |
| parent-delta | inspection | 64 | 0.007 | 0.037 | 0.008 | 0 |
| parent-delta | catalog-cold | 8 | 0.235 | 0.464 | 0.213 | 0 |
| parent-delta | catalog-warm | 8 | 0.168 | 0.327 | 0.169 | 0 |
| parent-delta | repeated-validate | 512 | 0.032 | 0.063 | 0.033 | 0 |
| parent-delta | select-settle | 64 | 0.02 | 0.045 | 0.021 | 0 |
| parent-delta | same-predecessor-fork | 512 | 0.033 | 0.072 | 0.033 | 0 |
| parent-delta | high-fanout | 64 | 0.925 | 2.299 | 0.927 | 0 |
| dense-id-chunked-cow | inspection | 64 | 0.022 | 0.068 | 0.022 | 0 |
| dense-id-chunked-cow | catalog-cold | 8 | 0.299 | 0.487 | 0.31 | 0 |
| dense-id-chunked-cow | catalog-warm | 8 | 0.201 | 0.304 | 0.203 | 0 |
| dense-id-chunked-cow | repeated-validate | 512 | 0.064 | 0.099 | 0.065 | 0 |
| dense-id-chunked-cow | select-settle | 64 | 0.095 | 0.153 | 0.095 | 0 |
| dense-id-chunked-cow | same-predecessor-fork | 512 | 0.5 | 0.625 | 0.514 | 0 |
| dense-id-chunked-cow | high-fanout | 64 | 1.386 | 3.312 | 1.322 | 0 |

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
  },
  {
    "id": "dfs-retained-branches",
    "representation": "implementation-parent-delta",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": 151084,
    "status": "observed"
  },
  {
    "id": "bfs-retained-branches",
    "representation": "implementation-parent-delta",
    "retainedBranchCount": 255,
    "retainedHeapDeltaBytes": -8213,
    "status": "observed"
  }
]
```

## Representation decision

The Plan retains `parent+delta` as the simplest representation that satisfies immutable predecessor retention and successor-only branching. The separately timed fixed-depth setup and target-operation rows do not establish parent-chain lookup as a dominant cost, so they do not justify private compaction or a dense fallback. Dense chunked COW remains an evidence-gated fallback; full-clone Map/Set remains rejected because successor transitions copy the whole dynamic collection.

The raw samples, environment, fixture descriptions, method and limitations are in [admission-state-benchmark.raw.json](admission-state-benchmark.raw.json) and [admission-state-benchmark.manifest.json](admission-state-benchmark.manifest.json).
