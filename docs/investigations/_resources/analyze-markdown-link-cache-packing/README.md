# Markdown Link cache packing mechanics experiment

This directory preserves two **non-equivalent diagnostic lanes** for a possible Markdown Link packed cache. Neither lane is a formal end-to-end Markdown Link Check benchmark or a release/gate result.

## 1. Storage-mechanics microbenchmark

[`benchmark.ts`](./benchmark.ts) and [`raw-results.json`](./raw-results.json) compare serial storage mechanics for the archived deterministic 1,160-document payload shape. The script prepares real parser payloads, the temporary directory, warm prepopulation, and post-run footprint accounting *outside* timing; every measured scenario times only its strictly serial lookup and publication. It never calls `executeMarkdownLinkValidation` and creates/removes only a temporary directory below the system temp directory.

Each raw sample also retains `processMaxRssBytes`, but it is `process.resourceUsage().maxRSS` sampled after the scenario: a **process-lifetime cumulative high-water**, not per-sample memory, a delta, or timed-interval memory. It is diagnostic context only and does not support a memory or optimization conclusion.

```sh
bun docs/investigations/_resources/analyze-markdown-link-cache-packing/benchmark.ts \
  --output docs/investigations/_resources/analyze-markdown-link-cache-packing/latest.json
```

Five-sample median wall times in milliseconds:

| Approx. entries/file | Cold population | Warm full | Warm 1 file | Warm 100 files | One-file incremental |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 (entry files) | 661.33 | 209.28 | 0.24 | 18.47 | 0.59 |
| 16 (73 files) | 54.30 | 43.47 | 0.28 | 15.32 | 0.91 |
| 64 (19 files) | 24.95 | 31.16 | 0.40 | 9.44 | 1.12 |
| 256 (5 files) | 13.51 | 26.59 | 0.68 | 6.94 | 2.21 |
| all (1 file) | 10.64 | 26.74 | 2.93 | 4.58 | 8.06 |

The cold entry-file median records 1,160 empty lookup attempts, `mkdir`s, temporary writes, and renames for `976,502 B`; the about-16 layout records 73 of each and writes `898,968 B`. The 16-entry one-file warm lookup reads `7,704 B`, compared with `579 B` for the entry file; the about-64 layout reads `55,439 B`. It shows that serial per-entry storage creates substantial mechanics cost and supports *testing* bounded shards. About 16 entries/file is only the report's first formal-runtime measurement candidate, not a product-format selection. Partial access reads a complete containing pack, no concurrent writers/corruption/compaction/growth policy is modeled, and the values cannot prove a formal Check cold gate.

## 2. Direct current-cache API profile

[`direct-cache-api-profile.ts`](./direct-cache-api-profile.ts), [`cache-syscall-stage-profile.ts`](./cache-syscall-stage-profile.ts), and the merged raw output [`direct-cache-api-profile-results.json`](./direct-cache-api-profile-results.json) preserve a second, narrower diagnosis. The first calls the current parser/cache API directly over 1,160 synthetic documents; the second isolates strictly serial filesystem stages for 1,160 842-byte payloads. Both avoid the formal Project/Check runtime, source collection, endpoint validation, Records, and settlement.

The merged output deliberately replaces four temporary JSONL fragments with one reviewable JSON resource. It preserves raw profile records and the source-fragment names, but the original profile scripts did not record a formal candidate revision, so this is current-environment diagnostic evidence, not a release artifact.

The seven direct `cache-only-cold` raw values have a median of `755.72 ms` (exact `755.721428 ms`) for 1,160 entries; no single round is used as representative. It is 77.15% of the historical formal cold enabled-disabled gap of `979.49 ms`, but that is only a cross-benchmark order-of-magnitude comparison, not attribution or a formal Check result. Independent stage medians for missing `readFile`, recursive existing `mkdir`, exclusive `writeFile`, and `rename` sum to `584.50 ms` (77.34% of the direct median). Those stage medians come from a separate profile/run, so the comparison is explanatory context rather than a causal decomposition.

## Explicit exclusions

- No data here claims that packing passes the formal Markdown Link Check cold gate.
- No data establishes safe concurrent packed writes, corruption fallback, unbounded growth/compaction, quota, TTL, or cross-process merge semantics.
- A single global pack reduces operations in this microbenchmark but makes partial lookup and incremental rewrite materially larger; it is not selected by this experiment.
