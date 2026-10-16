# Evidence restoration and query replay v2

This resource supersedes the reproduction section of implementation-handoff.md, not any historical samples or frozen hashes.
All resources are source-level experiments, not installed-candidate acceptance. Restore listed files byte-for-byte into
`tmp/restructure-scheduler-incremental-state/` in the workspace revision being examined. Do not run them from the Change's
`evidence/` directory: their `../../src` imports intentionally bind to that restored workspace. Runtime dependencies come from
the repository's pinned install; use `mise exec -- node` (24.18.0) / `mise exec -- bun` (1.3.14).

## Immutable primary before / final after protocol

`corpus.ts`, `benchmark.ts`, `run-benchmark.ts`, `scopes-benchmark.ts`, `fork-query-benchmark.ts`, `operations.ts`,
`build-a-overlay.ts`, `trace-baseline.ts`, `trace-corpus.ts` and the original query experiment files retain their original bytes.
`frozen-before-resources.json` and the managed manifest identify them. The same five primary runners will produce final after;
none was edited to accommodate the final Product. `before-source-identity.json` identifies the actual baseline source;
`after-source-identity.json` will identify the final measured tree, which may contain uncommitted source changes.

Primary commands are in `implementation-handoff.md`; each timing/profiler process must run serially in an explicitly
exclusive window, separate from tests/build/Gate/profile. GC is outside timed intervals. Diagnostic cleanup is outside timing,
after a successful complete pass, preserving generated manifests and any unique failure sample before deletion.

## A control: restore, never retain the full source copy

Use a fresh absent/empty controlled source-A directory. Do not overlay an unknown existing directory.

```sh
mkdir -p tmp/restructure-scheduler-incremental-state/source-A
git archive d4dc896c01a373cf9c3e9709d744a86202373f18 src |
  tar -x -C tmp/restructure-scheduler-incremental-state/source-A
mise exec -- node tmp/restructure-scheduler-incremental-state/build-a-overlay.ts
mise exec -- bun tmp/restructure-scheduler-incremental-state/operations-A.ts
mise exec -- bun tmp/restructure-scheduler-incremental-state/trace-baseline-A.ts > tmp/restructure-scheduler-incremental-state/A-trace.json
```

`build-a-overlay.ts` generates operations-A.ts and a currently unused benchmark-A.ts. A has only the recorded ready-membership
propagation difference, not B facts/frontiers/collector. `trace-baseline-A.ts` is a tiny retained import remap of trace-baseline.ts;
its dependencies are trace-corpus.ts and the generated source-A tree. A-trace.json is a generated, deliberately unmanaged
intermediate: the command above saves it so the manifest builder can reread it and independently verify byte-for-byte equality
with the managed before-trace.json. It need not be copied as another historical result.
Before any broad Bun test registration, rename archived `.test.ts` files to `.test.ts.baseline`: Bun substring path filtering
otherwise registers ignored source copies. `A-test-renames.json` records the original operation. These archive renames do not
alter production-module bytes or baseline main source. No archived source tree or stale implementation draft is managed evidence.

For final B operation counters:

```sh
mise exec -- node tmp/restructure-scheduler-incremental-state/build-operations-b.mjs
mise exec -- bun tmp/restructure-scheduler-incremental-state/operations-B.ts
```

The B wrapper is generated from the original operation instrumenter; metric names remain comparable. Selected proxy operations
are not universal operation counts, allocated bytes, or wall-clock speed evidence.

## Historical query experiment versus explicit replay v2

The historical `query-candidate-benchmark.ts` imported then-current Product static query as `persistent-merge`, and the historical
correctness/import probes similarly imported then-current Product. That Product query was still persistent merge at measurement
time. It is now native Heap. **Do not run those old entrypoints against final Product and label the output as the old experiment.**
Their raw output and hashes remain unchanged for audit. Their local native-static-query.ts alias is included, verified to match
native-static-query-eager.ts, SHA256 `46332c85006f5f0d3f48c5ac8080b6086b5f8bc59259a640a91d1b93765ca618`.
The alias is legitimate eager ESM, not the rejected lazy variant.

`persistent-query-pre-adoption-source-v1.txt` reconstructs the exact pre-adoption source query bytes, SHA256
`c3c6ad3b648f8383c34a0672b1c9cd2610440a731ae786d7ba8e3b4ee8c8df85`, matching the original entry in
`candidate-B-source-identity.json`. `query-control-reconstruction-v1.json` records that check. The replay module
`persistent-static-query-control-v2.ts` retains the original persistent traversal and locally embeds its pre-adoption
`static-frontier.ts` liveness helper (the original owner used revision equality and persistent queue merging).
Its original byte excerpt is persistent-liveness-pre-adoption-v1.txt; persistent-liveness-provenance-v1.json records an exact
whole-owner reconstruction match SHA256 06c01d1a6ab6c05197d8076a2bc3c29051a83508feec2550891517fea6f40f0b
and excerpt offsets/hashes against the historical candidate-B source identity. Final code
optimization made that helper private and extracted capacity-query.ts, so replay v2 additionally imports final capacity-query.ts
for both algorithms. It does not import the final Product static algorithm. `native-static-query-eager-replay-v2.ts` adapts the
original eager candidate to that same final capacity owner. These are mechanical helper-binding adaptations, not only
imports/export-name edits. `persistent-static-query-control-v1.ts` is obsolete scratch and intentionally not managed.
`native-static-query-eager.ts` and the exact pre-adoption text remain historical byte evidence, not current runnable entrypoints.

```sh
# Non-timing oracle first; only after root Gate has ended.
mise exec -- bun tmp/restructure-scheduler-incremental-state/query-candidate-correctness-replay-v2.ts
# Timing/profiler commands below require their own exclusive window, not implicitly authorized by this document.
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc \
  tmp/restructure-scheduler-incremental-state/query-candidate-benchmark-replay-v2.ts
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- bun --expose-gc \
  tmp/restructure-scheduler-incremental-state/query-candidate-benchmark-replay-v2.ts
SOURCE_REVISION=$(git rev-parse HEAD) mise exec -- node --expose-gc \
  tmp/restructure-scheduler-incremental-state/query-candidate-benchmark-replay-v2.ts --allocations
mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/query-import-probe-replay-v2.ts persistent
mise exec -- node --expose-gc tmp/restructure-scheduler-incremental-state/query-import-probe-replay-v2.ts native
```

Replay v2 binds both algorithms to the **final restored B helper modules and final frozen source identity**. The full original
intermediate B source tree has not been preserved or reconstructed; a matching query file alone does not reconstruct it.
Consequently new v2 results are separate replays, not regenerated old measurements. Keep their outputs separately named and
never replace `query-candidate-{node,bun,allocations}.json` or the historical cold-import probe.
The original query source identity and historical sampled outputs remain independently readable.

The lazy createRequire variant was experimentally investigated then rejected for Core loading-policy compatibility. No lazy
implementation or loader workaround is retained as a supported reproduction dependency. Historical summary metadata mentioning
its hashes describes discarded scratch, not missing required imports of any retained entrypoint; its claimed warm results are
not the adopted eager candidate. The root ESM candidate has an eager module loading cost even for unblocked/no-observer Runs.

## External dependencies and lifecycle

Copy the manifest and every available entry preserving its **relative path**, including numeric/accuracy-proof.md;
flattening to basenames breaks ownership and restoration. Local support modules required by retained entrypoints are enumerated in the manifest. Product imports resolve through restored
`src/**`, bound by the appropriate source identity / Git revision, and pinned `immutable` / `mnemonist` runtime dependencies.
The replay correctness runner additionally reads the final adjacent reference oracle and trace fixtures in Product tests;
these are retained stable source test support, not omitted tmp resources. The original `numeric/accuracy-proof.md` is retained byte-for-byte as a frozen candidate proof, not a new stable contract
or a second runtime. Stable algorithm invariants remain in Scheduler owner documentation. Bug reproducers/observations already belong to their two separate formal Investigation owners.

Raw repeat logs, source-A, draft candidates and giant derived summaries remain tmp until the managed evidence audit is accepted;
then only an exact generated-file cleanup list may remove them. The Change evidence is committed before finalization so Git
can recover it; no permanent script consumer exception or generic performance Investigation is introduced.

Final measurement completion: after-completion-check.json proves source start/end identity, all row/sample counts and RSS boundaries.
comparison-all-cohorts-v1.json retains all504 result cohorts plus24 operation cohorts; compare-results-v1.mjs regenerates it from
the raw before/after results. adoption-evidence.md explains the adopted model and all material regressions/limits concisely.
