# Tasks

按 current correctness oracle、A/B/C representation gate、private reducer implementation 与同形 after verification推进；完成 checkbox 只记录已实际执行的工作。

## Readiness

- [x] 0.1 Re-run and preserve the current before baseline in `readiness/current-admission-core-baseline.{raw.json,summary.md}`; verify its manifest records commit, seed, environment, warmup/samples, p50/p95, CPU and heap-proxy method.
- [x] 0.2 Capture and inspect `Bun --cpu-prof-md` (and an advisory `--heap-prof-md` observation) for the named representative current workload; record sampled hot frames and non-causal boundary in readiness notes.
- [x] 0.3 Run benchmark scenario closure and audit that static/custom/learned unused-state, catalog/validate/select/settle/fork/candidates, T=64/256/1024/4096, multiple D, independent/layered/mutex/scope/high-fanout and B forced settle are present; retain the documented 4096-depth limit.
- [x] 0.4 Persist `readiness/current-admission-core-semantic-oracle.before.json` with the executable oracle before any representation gate; include primary reason/payload/order, a same-pending-target competing-blocker trace that clears `dependsOn → observes → mutex → active scope → root` while retaining exact scope-before-root payloads at the same global running count, plus the inactive-scope activating-candidate gate, candidate order/canAdmit, select/settle/effect trace, forced IDs/order/effect projections, legacy snapshot, callback hard guard and cancellation.
- [ ] 0.5 Before selecting a representation, make A, B and C each execute the same complete semantic workload and compare each candidate against the persisted oracle. Timing output must not waive an item-level oracle mismatch.
- [ ] 0.6 For the A/B/C gate, retain equivalent DFS and BFS branch arrays; record retained-state count, per-state index/cache creation and lifetime, and comparable GC/heap method. Use `Bun.gc(true)` before construction and after retaining strong references when available; otherwise mark retained rows unavailable and do not use them to select.
- [ ] 0.7 Read current `admission-core`, `scheduler`, policy adapters, graph validation, direct tests and active Decisions again immediately before implementation; identify every import/export and Case owner actually changed.

## Implementation

- [ ] 1.1 Add private compiled task-slot/public-order/reverse-dependency/reverse-observation/mutex/scope indexes without changing graph validation or public graph/state DTOs; preserve every duplicate relation/mutex occurrence and original declaration order.
- [ ] 1.2 Implement development-only A, B and C full-semantic candidate paths/instrumentation necessary for the gate; each must cover legacy seed, reducer transitions, forced effects, Scheduler candidate/hard guard and lazy public projection rather than a simplified data-structure microbenchmark.
- [ ] 1.3 Apply the gate go/no-go/revise rule, document comparable A/B/C results and select no shipped representation until oracle, full workload and retained branch/cache evidence justify it; revise this Plan if none qualifies.
- [ ] 1.4 Integrate only the gate-selected immutable representation into the shared core reducer; remove repeated parent-chain task status resolution while preserving branch/predecessor immutability and legacy Scheduler snapshot seeding.
- [ ] 1.5 Incrementally maintain relation/observation blockers, held mutex facts and stage-local eligibility so validate/select/catalog/Scheduler candidates read one semantic index with existing primary-reason precedence, duplicate payload semantics and frozen payload shapes.
- [ ] 1.6 Implement global `runningTotal` root/scope capacity gates and lifecycle/activation facts. Active or activating scope selects a cap for every candidate, including scope-outside/unscoped; no per-scope running count may affect the gate, and `(maxParallel, scopeId)` scope-before-root ordering remains exact.
- [ ] 1.7 Replace repeated forced-block graph scans with an occurrence-aware persistent canonical-order reverse-dependency queue; preserve B cascade, duplicate declaration-order dependency IDs, effect order and immutable effect-state sequence.
- [ ] 1.8 Route Scheduler candidate projection and post-synchronous-custom-callback hard revalidation through the shared core index/reducer; retain Scheduler-only execution, cancellation, diagnostics, measurement and effect replay ownership.
- [ ] 1.9 Add/update narrow core, Scheduler and public-state tests for precedence/catalog order/laziness, duplicate non-lexical relation/mutex payloads, duplicate forced dependency IDs, active scope blocking inside/outside/unscoped candidates, scope-before-root payload, callback revalidation, legacy seeds, branching and forced cascade/effect-state order; update Case mappings only for actual test entity/body changes.
- [ ] 1.10 Extend the Change-owned benchmark to run the selected after state with the exact before matrix and distinguish cold legacy-seed index resolution, normal incremental successor, lazy DTO, cache lifetime and retained branches.

## Verification

- [ ] 2.1 Run affected Bun tests; when test nodes/bodies/Cases change, run `bun run test-evidence -- check --root .` before and after and audit Case/Proves continuity.
- [ ] 2.2 Run `current-admission-core-semantic-oracle.ts --compare` against the persisted before JSON for every candidate and the selected integration; review item-level mismatch before any performance result.
- [ ] 2.3 Run A/B/C and selected before/after benchmark/profile with identical command, fixture, seed, warmup, samples and runtime; report batch and derived-per-operation p50/p95, CPU, heap proxy, forced B, retained DFS/BFS state/cache observations and unavailable GC conditions without unsupported budget claims.
- [ ] 2.4 Assert benchmark scenario closure plus explicit behavior comparisons for public rejection reason/order, candidate order/canAdmit, catalog laziness, Scheduler hard guard, global-running scope/root capacity including outside/unscoped candidates, effect order and duplicate forced dependency IDs.
- [ ] 2.5 Verify one private index per immutable state, no eager public catalog DTO, no parent-chain selection fallback, no per-scope capacity gate, and no duplicate/order collapse in compiled reverse indexes or public payload materialization.
- [ ] 2.6 Run changed-owner typecheck/lint and relevant docs validation; run `bun run decisions -- check` and `bun run change-plan -- check changes/optimize-admission-core-selection-index`.
- [ ] 2.7 Run `bun run verify:vibe-check-workspace:required` because shared scheduler/runtime behavior crosses multiple product owners; report any full Gate or package-consumer verification intentionally not run.
