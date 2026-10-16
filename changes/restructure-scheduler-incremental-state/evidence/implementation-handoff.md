# Implementation handoff — 2026-10-16

## Stable implementation, not final adoption proof

Main source implementation is complete and Product writing is stopped for final optimization/review. Root owns Git/index/Change/stable docs. Numeric collector owner has stopped. Current HEAD remains d4dc896c01a373cf9c3e9709d744a86202373f18 until root commits; identify the real uncommitted source using source-identity.mjs, not HEAD alone.

- B canonical typed facts + memberships + direct counter/membership/lifecycle delta, ready actual-head -> static layer propagation, explicit lifecycle/no duplicate counts/unused compiled lookups, lazy weak membership ordering cache, net cancellation delta and stale forced root fix.
- Demand-only incremental queue groups, weighted threshold/zero crossing reverse indexes, global shared gate, exact dyadic contributions/local prefixes/rounding/checkpoints. Numerical proof: numeric/accuracy-proof.md; stable invariants transferred by docs owner.
- Independent low-optimization raw-graph trace oracle and raw-graph queue/exact numerical reference tests are adjacent owned tests. Case reused existing semantic identities; no new Topic or exemptions.
- Query native Heap adopted after controlled physical experiment: persistent backing remains immutable; only rejected-prefix traversal uses a transient heap of node references. Legitimate root ESM import is eager. Lazy createRequire variant rejected for loading-policy compatibility; no bypass or validator change.
- Two actual baseline Bugs fixed and independently recorded in 261016-correct-scheduler-seed-viability and 261016-correct-scheduler-cancel-forced-settlement. Each formal report contains minimal original script + original before/after outputs and source digests; public check 83 reports/full index current. Two old historical links to the deleted unused helper were converted to forming-time code paths without changing historical findings.

Latest actual self-verification after query adoption:

```
mise exec -- bun test ./src/project-run/task-scheduler ./src/project-run/invocation/learned-scheduling.test.ts ./src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts ./src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts
# 93 pass / 0 fail, 33 files
mise exec -- bun run typecheck product
mise exec -- bun run lint product
mise exec -- bun run test-evidence -- check --root .
# 749/749 entities, 185 Cases, 16 topics
git diff --check
```
Logs: final-implementation-{tests,typecheck,lint,test-evidence}.txt. Full Gate/dependency/material checks are root's next final stable-tree responsibility. Stage reviewer independently passed 71 Scheduler + 14 adjacent tests, 200 scope graphs/4583 transitions, 5000 ratios/9992 rounding probes before the small native query delta; final review must include the latter.

## Evidence facts / costs not to conceal

- Frozen before all complete on actual baseline d4dc: 120 Core rows each Node/Bun; separate Node allocation profiler; 54 publicRun/shell rows each Node/Bun; 6 scope and 12 queried-fork rows each Node/Bun. Warm-up then 7 samples, no difficult cohorts removed. Node v24.18.0, Bun1.3.14, same workspace/container, serial exclusive windows.
- frozen-before-resources.json hashes exact corpus/runners. before-source-identity.json records the baseline src digest. before-summary.json is derived and reproducible via summarize-results.mjs, not independent data. environment-observed.txt was captured after short-candidate measurements (not a contemporaneous before host-memory measurement).
- A is only actual-operation propagation isolation, not another delivered model and not a wall-time claim. build-a-overlay.ts overlays git archive baseline src; A-trace.json equals before-trace.json byte-for-byte. operations.ts had an early WeakMap-alias instrumentation bug; final saved before/A/B operations were all rerun with dimension-keyed proxies, old wrong numbers not used.
- B reduces actual selected operations beyond A: N2048 wide relation.has before/A/B 12287/8191/6143; readyMap.get 15017/15017/4096; groupSlot.read 10921/10921/3413. B removes duplicate active-scope Set + sort maintenance. Instrumentation covers specified collection/index operations only, not universal operations/allocations/runtime.
- Short B Node N2048 wide transition p50 20.96 ->32.40ms; G=N30.46 ->38.44ms. Typed current-transaction metadata has a real constant cost, no claim all transitions faster. Core full output improves several cohorts. Public Run total after remains unmeasured.
- Queried-fork Node N2048 64 retained forks: wide before4.02 ->B5.71MB and G=N6.93 ->8.61MB post-GC retained heap. No-query differences small. Lazy sorted arrays deliberately cost retained memory after actual reads; none path creates no observation index. Bun heapUsed measurements have noisy/negative/zero changes and cannot establish retained-memory absence.
- Native heap short experiment (query64 over one blocked-prefix snapshot, N2048): Node p50 71.49 ->34.46ms; Bun366.37 ->140.89ms; separate Node sampled allocation127025072 ->32784192 bytes. Other small/wide/G=N/hyper/scope forks have small absolute differences, some Bun regressions <0.1ms. Full per-cohort ranges in query-candidate-summary.json. No profiled timing used as speed evidence.
- Eager Heap root-import cold probe 7 fresh processes/kind/runtime: Node median22.26 ->62.27ms, Bun9.34 ->32.86ms; Node retained heap+~1.2MiB. Applies even with no blocked queries. This import probe is not fullProduct startup measurement; don't conflate it with full Run totals.
- Node/Bun diagnostic passes emitted96 success logs each, totaling4372528610 /4372534766 bytes, then exact-manifest cleanup outside timing. No unique failure samples. Full JSON/log manifests remain tmp until audit.

## Remaining main-agent followup: complete full after

Do not run before final code/style/docs review and root fresh full Gate pass. Request exclusive performance window; freeze ALL Product writes and prohibit simultaneous test/build/Gate/profile (read-only/docs allowed). Regenerate source manifest at beginning and end and compare digests. Preserve original runners and inputs unchanged. Same between-pass diagnostics cleanup outside timing.

Run serially from root, all output under this directory:

```
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node tmp/restructure-scheduler-incremental-state/source-identity.mjs > tmp/restructure-scheduler-incremental-state/after-source-identity.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/benchmark.ts > tmp/restructure-scheduler-incremental-state/after-node.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- bun --expose-gc tmp/restructure-scheduler-incremental-state/benchmark.ts > tmp/restructure-scheduler-incremental-state/after-bun.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/benchmark.ts --allocations > tmp/restructure-scheduler-incremental-state/after-node-allocations.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/run-benchmark.ts > tmp/restructure-scheduler-incremental-state/after-run-node.json
mise exec -- node tmp/restructure-scheduler-incremental-state/cleanup-diagnostics.mjs after-node
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- bun --expose-gc tmp/restructure-scheduler-incremental-state/run-benchmark.ts > tmp/restructure-scheduler-incremental-state/after-run-bun.json
mise exec -- node tmp/restructure-scheduler-incremental-state/cleanup-diagnostics.mjs after-bun
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/scopes-benchmark.ts > tmp/restructure-scheduler-incremental-state/after-scopes-node.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- bun --expose-gc tmp/restructure-scheduler-incremental-state/scopes-benchmark.ts > tmp/restructure-scheduler-incremental-state/after-scopes-bun.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/fork-query-benchmark.ts > tmp/restructure-scheduler-incremental-state/after-fork-query-node.json
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- bun --expose-gc tmp/restructure-scheduler-incremental-state/fork-query-benchmark.ts > tmp/restructure-scheduler-incremental-state/after-fork-query-bun.json
mise exec -- node tmp/restructure-scheduler-incremental-state/summarize-results.mjs after
mise exec -- node tmp/restructure-scheduler-incremental-state/build-operations-b.mjs
mise exec -- bun tmp/restructure-scheduler-incremental-state/operations-B.ts > tmp/restructure-scheduler-incremental-state/after-operations.json
```

No current runner directly invokes old Integrals; full publicRun captures boundary+capture total and real logger. run-benchmark.ts verifies every result.kind completed and serializes only declared views. Complete Bun before took ~40min because complete outputs are intentionally expensive; after may be shorter with collector but do not quietly drop shapes. Poll natural boundaries. Disk has ample space; logs must be manifested/removed after successful pass. If any failed diagnostic run, preserve its unique sample before deleting.

After all passes explicitly release exclusive window. Build comparison/adoption summary of all shape/size/phase/demand rows, p50/ranges/absolute costs, sampled allocation, retained/RSS limitations and any regressions. Do not present sampled allocation or source counts as timing. Local source publicRun is not installed artifact acceptance; root full Gate handles that separately.

## Final evidence lifecycle / exact suggested resources

Root copies final reproducible evidence to Change evidence before commit/finalization; do not create permanent scripts or a generic performance Investigation. Scripts originally live under this tmp path; preserve their bytes/hashes and instruct restoring them to this path before execution (../../src imports are intentional source-level scope).

Minimal managed set:

- README.artifact-note.md plus final adoption summary/commands; corpus.ts; benchmark.ts; run-benchmark.ts; scopes-benchmark.ts; fork-query-benchmark.ts; summarize-results.mjs; source-identity.mjs; cleanup-diagnostics.mjs.
- operations.ts; build-a-overlay.ts; build-operations-b.mjs; before-operations.json; A-operations.json; final after-operations.json. A full source-A tree is NOT managed evidence; recipe and baseline Git tree recover it. Retain A trace equality/hash statement, not duplicate full raw trace unless needed.
- frozen-before-resources.json; before/after-source-identity.json; environment-observed.txt; 9 before and9 after raw result JSONs (node,bun,node-allocations,run-node,run-bun,scopes-node,scopes-bun,fork-query-node,fork-query-bun). Derived giant before/after-summary.json need not duplicate raw data if generator and readable adoption table retained.
- query-candidate-summary.json; native-static-query-eager.ts; query-candidate-benchmark.ts; query-candidate-correctness.ts; query-import-probe.ts; query-candidate-{node,bun,allocations}.json; query-import-probe.jsonl. The pre-adoption candidate imports ../src helpers unchanged; before/source digest supplied. Lazy rejected variant can be represented by its code and results if necessary, clearly rejected (do not execute it through Product).
- numeric/accuracy-proof.md should be stable-owner invariants after doc optimization; do not retain stale candidate implementation duplicates. If an empirical numerical corpus snapshot contributes independent evidence beyond stable tests, select just that minimal material.
- Bug materials are already separately managed under their two formal Investigation owners; don't duplicate into general performance evidence.

Raw repeated logs, drafts, source-A and derived scratch stay ignored tmp until root audits managed summary. Then request/confirm precise generated-file cleanup; do not recursively delete unknown contents. A-test-renames.json documents archived .test.ts -> .test.ts.baseline to prevent Bun substring-filter registration pollution; production baseline hashes never changed. Current main TestEvidence passes with that exclusion of experimental copies.
