# Markdown Link parse-cache evidence

This directory owns the reproducible performance evidence for `cache-markdown-link-safe-facts`. The current result is the implemented runtime benchmark; `PrototypeResolver` is retained only as historical pre-implementation adoption evidence.

## Reproduce the formal runtime result

From the repository root:

```sh
bun changes/cache-markdown-link-safe-facts/evidence/benchmark.ts \
  --output changes/cache-markdown-link-safe-facts/evidence/results/latest.json
```

The command creates only deterministic temporary fixtures, then compares resolved default-disabled and explicit-enabled options through the actual `executeMarkdownLinkValidation` Check envelope. It overwrites only the requested JSON result. A separate public-API observation uses `defineConfig → run → markdownLinkValidation`; it is recorded but is not divided into the gate comparator.

## Fixture and gate

Fixed seed `0x5eedc0de` produces 1,000 source Markdown files, 160 normal-reuse or 8 high-reuse targets, 512 B / 2 KiB / 8 KiB bodies and 1–5 cross-document anchors per source. Five paired repetitions alternate disabled/enabled order. For each incremental repetition, the harness creates an independent prewarmed copy and appends one heading to `guides/guide-0500.md`.

The gate is: cold may regress by at most 5%; warm and incremental must each improve by at least 20% and save at least 100 ms. The current formal result meets all three gates: cold **21.74% faster** (734.83 ms saved), warm **61.61% faster** (1925.18 ms), and incremental **61.78% faster** (1972.73 ms). [Verification review](verification-review.md) is the human-readable result; `results/latest.json` retains raw samples, MAD, CPU, cumulative maxRSS, cache footprint, order, fixture and environment.

“Cold” means an empty application cache directory, not a flushed OS page cache. The corpus is the accepted reproducible input, not a prediction for the inaccessible private workload.

## What this evidence proves

- The formal benchmark proves end-to-end timing and direct-Check output parity for the implemented resolver.
- Direct resolver tests prove successful canonical-target memo reuse while preserving logical `targetReadCount` and `maxTargetReads`; formal runtime exposes no physical read/decode/parse counters, so this benchmark does not claim such a counter reduction.
- Direct tests also cover default-disabled no-I/O, enabled cache behavior, invalidation, malformed/hostile payload fallback, cache I/O failure fallback, failure/cancellation boundaries, and settlement parity. See [verification review](verification-review.md#21-narrow-behavior-tests).

Cache payloads contain only strict Link-private occurrences, headings and ranges, but may retain source-derived destinations/headings. They are performance state, not confidential storage. The public lifecycle and security boundary are owned by [`docs/checks/markdown-link-validation.md`](../../../docs/checks/markdown-link-validation.md#parse-facts-cache-的生命周期与可见性).

## Historical prototype

`benchmark.ts` still contains a Link-private `PrototypeResolver` and its recorded controls because Tasks 0.3–0.5 used them to choose the direction. It is not invoked as the post-implementation candidate and must not be used for present performance or public-contract claims. The concise history is [readiness review](readiness-review.md).
