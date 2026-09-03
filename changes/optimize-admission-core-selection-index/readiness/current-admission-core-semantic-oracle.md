# Current admission-core semantic oracle

This artifact persists the **current behavior oracle** before any representation gate. It is correctness evidence, not a timing benchmark and not a public API contract.

## Commands

Create the before oracle at the current runtime commit:

```bash
bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.ts --write-before
```

After each candidate representation is complete enough to exercise the same reducer/Scheduler paths, compare it item-for-item and write a separately reviewable observation:

```bash
bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.ts \
  --compare changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.before.json \
  --output changes/optimize-admission-core-selection-index/readiness/<candidate>-semantic-oracle.after.json
```

The compare command fails unless the persisted `oracle` value is exact JSON-equal. `currentCommit` is recorded for provenance and is intentionally not compared, so an implementation commit cannot hide a semantic difference behind a changed revision.

## Persisted cases

- primary rejection reason and payload ordering, including repeated `dependsOn`, `observes` and mutex occurrences; a single pending target has a persisted executable trace that is simultaneously blocked by dependency, observation, held mutex, active scope and root capacity, then clears them in `dependsOn → observes → mutex → scope → root` order at restored global occupancy;
- declared candidate order and `canAdmit` projection before/after a mutex holder;
- accepted `select`/`settle` trace, catalog/validation/inspection projections and each canonical effect projection;
- duplicate forced dependency IDs, reverse declared-graph forced-effect order and every matching `effectStates` projection;
- active scope capacity blocking an inside, scope-outside and unscoped pending candidate, plus an inactive scope blocking its own pending activating candidate; scope-before-root precedence uses the same global running count, and the competing-target trace retains the exact scope and root payloads before and after that scope closes;
- legacy Scheduler snapshot seed, including absent/running/pending status projection and a failed-running forced transition;
- private cancellation effect trace; and
- synchronous custom callback hard guard after callback-triggered abort, including callback validation, fault, settlement and execution count.

Timing, p50/p95, CPU and heap rows never waive an oracle mismatch. A candidate must produce this exact oracle before it may enter the A/B/C performance/retention comparison.
