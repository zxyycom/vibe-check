# Markdown Link measurement evidence

`before.mjs` freezes the public `defineConfig` / `run` measurement entry before Product runtime changes.
`fixture.tar.gz` contains the selected real corpus plus direct target bytes and directory structure, without Git metadata.
The Product-owned `measurement.test-support.ts` creates synthetic fixtures and removes each temporary project in `finally`.
The `freeze` command snapshots only selected source documents and their direct local targets; it does not discover target links recursively.

Formal commands use `mise exec -- node` (24.18.0) and builds use `mise exec -- bun` (1.3.14).
`sample.mjs baseline` performs a warmup and at least one independent-process before sample per group before runtime editing.
Early completed groups retain up to five initial samples; these baseline-only extras are not paired comparison evidence.
`sample.mjs paired` performs a warmup and five alternating-order before/after independent-process pairs per group.
Both use identical finite before-compatible options (100,000 occurrences / 10,000 target reads) and disable outputs.
Empty caches are fresh per process; hit prefill is outside timing. OS page cache is not cleared.
Peak RSS includes the entire process, including fixture setup and hit prefill; only the final public Run is timed.

`superseded-baseline.jsonl` is an incomplete exploratory series, excluded from comparisons: its real-corpus selection
had not yet applied Gate's negative patterns, and the fixture initially copied unnecessary tracked files.
No real workload from that series was used. The corrected fixture and frozen bundle are identified by `manifest.json`.
A separate 1,000-hot-edge I/O smoke overlapped that exploratory series; neither its timing nor those overlapping samples
supports performance claims. Formal timing and operation instrumentation run separately.

`io-counts.mjs` is a separate Node preload that counts async Link filesystem operations; it is not enabled for formal timing.
Artifacts are temporary Change evidence: retain through Git's completed-Change snapshot; finalize removes the working-tree copy.

`pre-gate-paired.jsonl` / `after-pre-gate.mjs` preserve the incomplete initial after series. A real complete-Gate
preflight exposed existing blocking function/file-maintainability limits. That series is superseded by the domain-phase
structural repair and is excluded from the final five-pair comparison; neither thresholds nor selection were changed.
