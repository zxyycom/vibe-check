# Formal implementation verification review

**Current evidence owner:** this review records completed implementation verification for Tasks 2.1–2.5. Task 2.6 remains a separate semantic/Decision alignment review; it is not asserted as complete here.

## 2.1 Narrow behavior tests

```sh
bun test src/package-checks/markdown-link-validation/{markdown-parser.test.ts,parse-facts-cache.test.ts,options-resolution.test.ts,options-validation.test.ts,local-resolver.test.ts,default-check.test.ts}
```

Passed: **23 tests, 0 failed.** The tests prove the closed default-disabled/enabled option, persistent hit/miss/invalidation, malformed payload and cache-I/O fallback, settlement parity, and real canonical-target memo reuse with unchanged logical `targetReadCount`/`maxTargetReads` behavior.

## 2.2 Formal five-pair retest

```sh
bun changes/cache-markdown-link-safe-facts/evidence/benchmark.ts \
  --output changes/cache-markdown-link-safe-facts/evidence/results/latest.json
```

On 2026-09-02, schema-2 result data was generated with Bun 1.3.14 on Linux x64. The benchmark uses five interleaved paired samples for each deterministic 1,000-source workload and calls the implemented `executeMarkdownLinkValidation` with resolved disabled/enabled options. Raw samples, order, MAD, CPU deltas, cumulative maxRSS, cache footprint, fixture and storage facts are retained in [`results/latest.json`](results/latest.json).

| Workload | Disabled median (MAD) | Enabled median (MAD) | Gate result |
| --- | ---: | ---: | --- |
| Cold / empty application cache | 3380.79 ms (186.46 ms) | 2645.96 ms (124.67 ms) | **21.74% faster; 734.83 ms saved** |
| Warm / prewarmed cache | 3124.95 ms (41.78 ms) | 1199.77 ms (28.29 ms) | **61.61% faster; 1925.18 ms saved** |
| Incremental / independent prewarm + one mutation | 3192.93 ms (53.19 ms) | 1220.20 ms (15.59 ms) | **61.78% faster; 1972.73 ms saved** |
| High target reuse | 2906.50 ms (2.52 ms) | 2367.44 ms (245.60 ms) | diagnostic only; enabled cache footprint 1,008 entries |

**Result: all selected performance gates are met.** Cold is better than the permitted no-more-than-5% regression; warm and incremental both exceed 20% improvement and 100 ms saved. Every formal direct-Check sample passed with identical final data (`sourceFileCount: 1160`, `occurrenceCount: 2955`, `targetReadCount: 2955`, no findings or Records).

The runtime intentionally exposes no physical read/decode/parse counters. This evidence does not infer counters from timings. The direct resolver test is the scoped proof that memo reuses a canonical target while logical accounting is unchanged.

## 2.3–2.5 Cross-owner verification

- `bun run test-evidence -- check --root .` passed: 382 Bun test entities, 96 semantic Cases, 9 topics.
- `bun run validate -- docs` passed JSON, schema, report-example and 303 Markdown-link checks.
- `bun run verify:vibe-check-workspace:full` passed **36/36** checks, including typecheck, lint, format, runtime tests, candidate and installed-consumer acceptance, docs validators, Decision records and Test Evidence.

The full Gate retained three known non-blocking file-metric warnings, one non-blocking function-metric warning and one non-blocking missing-anchor warning in Change task text. They do not identify a cache correctness, performance or public-contract failure; this Change does not authorize unrelated refactoring.

## Boundaries and remaining step

- The synthetic corpus is accepted reproducible evidence, not a prediction for the inaccessible private workload.
- “Cold” clears application cache only; it does not flush OS page cache. `maxRSS` is cumulative process peak rather than isolated per-sample memory.
- Historical prototype results are not used as the current candidate. See [readiness review](readiness-review.md) only for the original selection rationale.
- Tasks 2.1–2.5 are current. **Task 2.6 remains unchecked** pending final semantic owner review and a separate Decision alignment decision. No Change archive is authorized.
