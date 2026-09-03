# Admission-core representation gate

This gate owns the final representation selection and its source-fingerprinted semantic, workload, retention and package evidence. [`current-admission-core-semantic-oracle.md`](current-admission-core-semantic-oracle.md) owns the correctness command and case contract.

## Final Decision

**Go: ship the one `immutable@5.1.9` `List` implementation for dense private stores; retain the project-specific persistent leftist max-heap; keep compiled reverse occurrences and counters native.**

The selected implementation fingerprint is SHA-256
`44dbcaa035d2a709c4be85be4f83f1a54d6b1d9b36f2c3572830002440080635` over:

```text
package.json
pnpm-lock.yaml
src/project-run/task-scheduler/admission-core-compiled-graph.ts
src/project-run/task-scheduler/admission-core.ts
```

It is embedded in all current selected JSON evidence. Raw artifacts' `gitCommit` fields are provenance; this fingerprint identifies the uncommitted shipping source and exact runtime dependency that were measured.

## Current Selected Evidence

### Semantic equality

```text
bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.ts \
  --compare changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.before.json \
  --output changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.immutable-list.after.json
```

This command passed and wrote [`current-admission-core-semantic-oracle.immutable-list.after.json`](current-admission-core-semantic-oracle.immutable-list.after.json). Its `oracle` is exact JSON-equal to the immutable before oracle; differing commit, representation and source-fingerprint provenance fields are excluded. The selected-only extension proves legacy `runningMutexes` remain additive after a same-mutex dynamic holder settles.

### Same-command matrix

```text
bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts
```

The command wrote [`current-admission-core-immutable-list-baseline.raw.json`](current-admission-core-immutable-list-baseline.raw.json) and its [summary](current-admission-core-immutable-list-baseline.summary.md), with seed `20260903`, two warm-ups, five measured samples and 79 rows. **77 shared scenario identities exactly match the read-only before matrix; two named rows are selected-only Change observations.** `independent-t256-legacy-seed-index` and `forced-cascade-t161-layered-forced-cascade-settle` therefore have no before ratio.

Current batch wall-p50 milliseconds (lower is better):

| Workload | read-only before | selected Immutable.List | selected/before |
| --- | ---: | ---: | ---: |
| T=256, D=48 Scheduler candidates | 45.974 | 0.486 | 0.0106 |
| T=256, D=48 public catalog | 90.853 | 0.815 | 0.0090 |
| T=1024, D=16 Scheduler candidates | 83.394 | 0.574 | 0.0069 |
| T=1024, D=16 public catalog | 166.393 | 0.931 | 0.0056 |
| T=256 high-fanout forced settle, B=255 | 54.771 | 6.702 | 0.1224 |
| real static unused-public-state | 82.729 | 38.725 | 0.4681 |
| real custom unused-public-state | 213.123 | 73.476 | 0.3448 |
| real learned unused-public-state | 85.408 | 35.464 | 0.4152 |

Across the 77 shared rows, 74 have lower selected wall-p50 and three have higher p50: mutex T=256 select (0.438 versus 0.237 ms), settle (0.309 versus 0.205 ms) and fork (0.455 versus 0.224 ms). The median selected/before ratio is `0.0756`; it summarizes this measured matrix only.

The unmatched cold legacy seed row is 1.686 ms p50. The direct root→80→80 forced cascade is 56.537 ms p50 with B=160; its direct behavior test proves root, descending L1, then newly-ready descending L2 effect priority and matching effect states.

### CPU, heap and retained branches

```text
bun --cpu-prof-md --cpu-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles \
  --cpu-prof-name current-admission-core-immutable-list.cpu.md \
  changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile

bun --heap-prof-md --heap-prof-dir changes/optimize-admission-core-selection-index/readiness/profiles \
  --heap-prof-name current-admission-core-immutable-list.heap-profile.txt \
  changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts --profile
```

The two-row selected profile is 4.135 ms catalog and 3.909 ms Scheduler candidates p50, versus before 722.313 and 714.957 ms. The CPU sample's largest core-local self frames are `admissionCandidatesForCore` (1.3%), `scopeCapacityBlockerFor` (1.2%) and a named Immutable frame (1.2%); native, module and sampling overhead dominate. Both DFS and BFS retain 65 strongly reachable states through `Bun.gc(true)` after construction. The selected observation confirms `Immutable.List` status storage, predecessor `pending`, successor `running`, and changed store identity.

The CPU sample, heap profile and process heap deltas are advisory observations: they are neither cross-host budgets/SLOs nor allocation or retained-byte attribution. The raw heap dump is intentionally not retained. The historical chunked-COW capture reported 10,593,593 bytes / 59,232 objects and the selected Immutable.List capture 10,928,659 bytes / 61,620 objects; both were dominated by GlobalObject, ModuleLoader and module runtime retainers, so neither totals nor retainers attribute memory to admission state.

### Structural and package acceptance

One selection index contains List-backed statuses/counters, `runningTotal`, scope facts, per-task held-mutex blockers, legacy mutex input and the forced queue. Candidates and inspection use payload-free blocker facts before O(1) capacity gates. Catalog/validate/rejected select alone materialize duplicate/sorted relation or mutex payloads. Scope remains global-running and scope-before-root.

`immutable` is an exact runtime dependency in `package.json`, `pnpm-lock.yaml` and `CANDIDATE_DEPENDENCIES`; its approved MIT text is packaged at `third-party-licenses/immutable-5.1.9-LICENSE` with SHA-256 `784fd7232e106901065a329b285ff9ba9ad98ff08ac1932b45b53a0b954974c5`. Candidate artifact, installed-material and release-receipt contracts all verify it.

## Formation Evidence Boundary

The original A parent+delta, B chunked-COW and C full-clone runs remain exact formation artifacts: their oracle outputs and 79-row raw files document why full semantic/reducer candidates were required before selection. The current harness rejects `--representation`, and shipping exposes no A/C switch or generic representation selector.

The library Investigation established `immutable@5.1.9` as a qualified vector baseline rather than an immediate dependency recommendation. A temporary full-product List integration then passed the product oracle, workload, branch-retention and package checks. [`current-admission-core-immutable-list-comparison.json`](current-admission-core-immutable-list-comparison.json) records bounded List-vs-prior chunked-COW context: all 79 List p50 rows are lower than the historical chunked-COW rows (median List/old-B ratio `0.4239`). The historical source is a retired uncommitted prototype, so that comparison is directional formation context only.

## Go/No-Go Conclusion

Go is supported by exact current semantics, one private shipping representation, retained-branch structural sharing, the complete same-shape matrix/profile, and package/license acceptance. The three mutex micro regressions and environment-sensitive CPU/heap observations remain visible evidence boundaries. No representation decision remains for this Change.
