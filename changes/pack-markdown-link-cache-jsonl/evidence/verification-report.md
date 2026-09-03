# JSONL formal runtime verification report

This report reads the managed [`results/formal-run.json`](./results/formal-run.json) generated at `2026-09-03T10:14:45.773Z`. It is an audit summary, not a replacement for the raw samples or the active Plan's acceptance rules.

## Verdict

All three formal gates pass in this run, and all 15 enabled/disabled pairs have exact direct-Check semantic parity. No threshold failed, so no failure-only profiling diagnosis was run or needed.

| Gate                    | Disabled median | Enabled median |                                              Observed result | Required result          | Verdict |
| ----------------------- | --------------: | -------------: | -----------------------------------------------------------: | ------------------------ | ------- |
| cold                    |      3632.85 ms |     3587.65 ms | `-1.24%` enabled relative regression (that is, 1.24% faster) | `<= 5%` regression       | pass    |
| warm                    |      2890.35 ms |     1828.83 ms |                              36.73% faster; 1061.52 ms saved | `>= 20%` and `>= 100 ms` | pass    |
| single-file incremental |      2851.10 ms |     1827.96 ms |                              35.89% faster; 1023.14 ms saved | `>= 20%` and `>= 100 ms` | pass    |

## Measurement evidence

The fixture uses deterministic seed `0x5eedc0de`, 1,000 guide sources, 160 normal target documents, 512/2,048/8,192-byte source bodies, and deterministic 1–5 links per guide. It ran on Bun 1.3.14, Linux x64, AMD Ryzen AI 7 H 450 (6 CPUs). The direct path is `executeMarkdownLinkValidation`, not a storage-only helper or public-run observation.

| Workload / mode      | Wall-time MAD | Median CPU (user + system) |    CPU MAD | Max observed process maxRSS |
| -------------------- | ------------: | -------------------------: | ---------: | --------------------------: |
| cold disabled        |     338.26 ms |               3,746,652 µs | 133,518 µs |         1,028,415,488 bytes |
| cold enabled         |     162.14 ms |               3,706,176 µs | 338,336 µs |         1,028,415,488 bytes |
| warm disabled        |      34.09 ms |               3,115,112 µs |  50,853 µs |         1,028,415,488 bytes |
| warm enabled         |      14.37 ms |               2,078,387 µs |  20,140 µs |         1,028,415,488 bytes |
| incremental disabled |     118.42 ms |               3,075,641 µs | 125,796 µs |         1,028,415,488 bytes |
| incremental enabled  |      39.35 ms |               1,976,677 µs |  45,192 µs |         1,028,415,488 bytes |

`maxRSS` is cumulative within the benchmark Bun process. It cannot establish isolated per-sample memory use or an implementation-caused memory improvement.

## Cache and semantic boundaries

- Every cold and warm enabled sample ended with one `markdown-link-parse-facts-v1.jsonl` file of 1,102,893 bytes and 1,160 complete newline-terminated lines.
- Every incremental enabled sample ended with that same single file at 1,104,047 bytes and 1,161 complete lines: the prewarm plus the one modified source identity.
- The raw result records each pair's ordering, full direct Check semantic output, and SHA-256 digest. `allPairsPassed` is `true`; therefore enabled did not change status, reason, final data, messages, Record identity, Record data, or Record order on this fixture.
- The raw result also pins SHA-256 values for the six measured current candidate source files. The repository `HEAD` alone is not a candidate identity because those product files were uncommitted worktree content.

## Strict-serial and comparison interpretation

The formal comparison is **within this current run**: default-disabled versus current enabled single-JSONL append, five interleaved pairs per workload, with every invocation awaited before the next. “Cold” means an empty application cache directory; it does **not** flush OS page cache.

For audit context only, the earlier per-entry strict-serial investigation reported a cold enabled penalty of 34.26% (failed), warm improvement of 26.02%, and incremental improvement of 27.02%. The current run's threshold result is materially different, but it is not a causal storage-only before/after proof: revisions, worktree candidate state, and runtime conditions differ, and direct Check aggregate time includes more than cache I/O. The archived harness and the packing investigation are historical inputs, not current acceptance comparators; storage-only numbers do not enter this report's calculations.

## Recheck

1. Run `bun changes/pack-markdown-link-cache-jsonl/evidence/benchmark.ts --verify` to validate fixture/direct-envelope/semantic/output behavior.
2. Run the command in [`README.md`](./README.md#reproduce) to overwrite the raw result with a new observation.
3. Read the new raw `acceptance`, `summaries`, `pairs`, `semanticParity`, and `candidateSources` fields before updating any task state. A re-run is a new timing observation, not an automatic confirmation of this report's numbers.
