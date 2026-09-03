# Current admission-core semantic oracle

This guide owns correctness equality between the read-only before behavior and the selected shipping implementation. It does not own timing or representation selection; [representation-gate.md](representation-gate.md) owns those conclusions.

## Selected verification

Rerun the selected shipping implementation and write a separately reviewable after artifact:

```bash
bun changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.ts \
  --compare changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.before.json \
  --output changes/optimize-admission-core-selection-index/readiness/current-admission-core-semantic-oracle.immutable-list.after.json
```

This command passed. The resulting [`current-admission-core-semantic-oracle.immutable-list.after.json`](current-admission-core-semantic-oracle.immutable-list.after.json) has an `oracle` value that is exact JSON-equal to the before artifact. Commit and selected-source-fingerprint fields remain provenance and are deliberately outside that equality check.

## Oracle contract

The persisted cases cover:

- primary reason/payload ordering, including repeated `dependsOn`, `observes` and mutex occurrences; one pending target remains blocked by dependency, observation, held mutex, active scope and root capacity, then clears in `dependsOn → observes → mutex → scope → root` order at restored global occupancy;
- declared candidate order and `canAdmit`, accepted select/settle traces, catalog/validation/inspection projections and canonical effects;
- duplicate forced dependency IDs, reverse declared-slot forced-effect order and every matching `effectStates` projection;
- global-running active and activating scope capacity, including inside/outside/unscoped candidates and scope-before-root precedence;
- legacy Scheduler absent/running/pending seed, cancellation, and synchronous custom callback hard guard; and
- the selected-only extension: a legacy external `runningMutexes` blocker remains after a same-mutex dynamic holder settles.

An oracle mismatch blocks the Change regardless of timing evidence.

## Before and formation boundary

[`current-admission-core-semantic-oracle.before.json`](current-admission-core-semantic-oracle.before.json) is the immutable before source. It was created once before the representation gate and is retained without regeneration during this Change. `--representation` is rejected by the current harness; the A/B/C oracle records remain formation artifacts rather than selectable runtime paths.
