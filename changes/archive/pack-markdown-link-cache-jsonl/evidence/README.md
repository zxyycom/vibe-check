# Markdown Link JSONL formal runtime evidence

This directory is the Plan-owned, reproducible formal runtime evidence for the implemented `pack-markdown-link-cache-jsonl` change. Its acceptance comparator is the current direct `executeMarkdownLinkValidation` envelope: default-disabled is the strict-serial no-persistent-cache side, and explicit-enabled is the current single-JSONL append side.

## Scope and authority

- [`benchmark.ts`](./benchmark.ts) owns fixture generation and the formal measurement protocol.
- [`results/formal-run.json`](./results/formal-run.json) is the managed raw result: samples, pair order, semantic outputs/digests, medians, MAD, CPU deltas, cumulative process maxRSS, cache bytes, candidate-source hashes, and gate calculation are all in this file.
- [`verification-report.md`](./verification-report.md) is a human/AI reading guide to that raw result. If prose and JSON differ, the JSON is the measurement source and the harness is the executable protocol.
- The active Plan's performance thresholds and JSONL design are owned by [`../design.md`](../design.md); this evidence does not alter them.

Historical inputs were read only as audit context: the current serial-I/O investigation, the cache-packing investigation, and the archived `cache-markdown-link-safe-facts` README/harness. They do not define this Plan's current contract, lifecycle, or acceptance result.

## Current recorded result

The managed raw run generated at `2026-09-03T10:14:45.773Z` currently passes cold, warm, and single-file incremental gates, with 15/15 enabled/disabled pairs preserving the direct Check semantic output. The exact medians, dispersion, CPU, maxRSS boundary, cache footprint, candidate-source hashes, and non-causal comparison limits are in the [verification report](./verification-report.md). A later re-run is a new observation and must replace neither the stable consumer contract in [`docs/checks/markdown-link-validation.md`](../../../docs/checks/markdown-link-validation.md) nor the raw result without review.

## Reproduce

From the repository root, first validate the harness without saving a formal result:

```sh
bun changes/pack-markdown-link-cache-jsonl/evidence/benchmark.ts --verify
```

This creates the deterministic `0x5eedc0de` fixture with 1,000 guide sources and 160 target documents, invokes the direct Check once disabled and once enabled, requires equal direct semantic outputs, and requires a nonempty `markdown-link-parse-facts-v1.jsonl` file.

Then run the formal protocol (this overwrites only the requested raw JSON output):

```sh
bun changes/pack-markdown-link-cache-jsonl/evidence/benchmark.ts \
  --output changes/pack-markdown-link-cache-jsonl/evidence/results/formal-run.json
```

## Protocol

Each measured invocation is awaited before the next begins; the harness starts no concurrent source or cache work. It calls `executeMarkdownLinkValidation` directly with the same bounded options, selected fixture, and fresh `AbortSignal` on both sides. It does not measure a storage-only API, a prototype resolver, or the public Run wrapper.

| Workload                | Pair preparation                                                                                | Measured enabled state                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| cold                    | Per pair, a distinct empty application-cache directory                                          | First enabled invocation populates its empty JSONL file. OS page cache is intentionally not dropped. |
| warm                    | Per pair, one unmeasured enabled prewarm                                                        | Enabled invocation restores the prewarmed single JSONL file.                                         |
| single-file incremental | Per pair, copy seed fixture, enabled prewarm, then append one heading to `guides/guide-0500.md` | Enabled invocation restores the prewarm and appends the changed identity to that same JSONL file.    |

There are five pairs per workload. Pair order alternates disabled-first, enabled-first, disabled-first, enabled-first, disabled-first. Every pair compares status, reason, final data, messages, and ordered Record identity/data; a mismatch fails the harness before it writes a successful result.

The cache footprint records the sole named file's bytes and newline count after enabled execution. CPU is `process.resourceUsage()` user plus system deltas. `maxRSS` is the Bun process's cumulative maximum, so it is reported as a boundary/max observed value rather than as isolated per-sample memory.

## Gates

The raw JSON calculates medians independently from the five disabled and five enabled samples in each current paired run:

- cold: enabled relative regression must be `<= 5%`;
- warm: enabled improvement must be `>= 20%` **and** save `>= 100 ms`;
- single-file incremental: the same warm threshold.

No absolute median from another run is included in these formulas. The raw file contains candidate-source SHA-256 values because the measured implementation is an uncommitted worktree candidate rather than a standalone committed revision.

## Comparison boundary

The historical per-entry strict-serial result in [`docs/investigations/evaluate-markdown-link-serial-io-optimization.md`](../../../docs/investigations/evaluate-markdown-link-serial-io-optimization.md) is a bounded audit comparison, not a causal before/after calculation: it was a different revision and run. The packing investigation's storage-only figures are excluded entirely from gate arithmetic. This directory therefore may state current paired observations and threshold status, but not that a storage layout alone caused an absolute timing difference.
