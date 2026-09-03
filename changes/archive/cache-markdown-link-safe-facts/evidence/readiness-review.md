# Readiness review

**Status:** historical adoption evidence for Tasks 0.1–0.5. It selected persistent + memo before implementation. It is not the current runtime-performance result; the implemented runtime is owned by [verification review](verification-review.md).

## 0.1 Test Evidence review

Before test changes, `bun run test-evidence -- check --root .` passed with 375 Bun test entities and 96 semantic Cases. The review mapped the new behavior to existing owners rather than creating a generic cache abstraction:

| Existing Case | Owner | Independent proof added during implementation |
| --- | --- | --- |
| `AUX-MARKDOWN-LINK-OPTIONS-001` | `docs/checks/markdown-link-validation.md#参数与默认配置` | closed cache union, default-disabled resolution, validation, freeze and fingerprint |
| `AUX-MARKDOWN-LINK-PARSER-001` | `docs/scan-scope.md#markdown-link-source-occurrences` | private payload projection/parser and exact-byte/parser-version invalidation |
| `AUX-MARKDOWN-LINK-TARGET-001` | `docs/scan-scope.md#markdown-link-direct-targets` | successful target memo with unchanged logical count/limit |
| `AUX-MARKDOWN-LINK-OUTCOMES-001` | `docs/checks/markdown-link-validation.md#效果与结果` | cache failures cannot change settlement |
| `AUX-CALLER-KEYED-JSON-CACHE-001` | `docs/api-mechanics.md#caller-keyed-json-cache` | existing helper mechanics; Markdown remains the consumer |

The post-implementation ledger result is current in [verification review](verification-review.md#remaining-verification-state).

## 0.2–0.3 Deterministic workload

The fixed seed `0x5eedc0de` creates 1,000 source files, 160 normal-reuse or 8 high-reuse Markdown targets, 512 B / 2 KiB / 8 KiB bodies, and 1–5 cross-document anchors per source. Five paired repetitions alternate order; each incremental repetition starts from an independent prewarmed copy, then mutates `guides/guide-0500.md`.

The historical prototype ran on Bun 1.3.14, Linux x64, AMD Ryzen AI 7 H 450 (6 CPUs). It met the adoption gate and showed a high-reuse control with separately instrumented physical read/parse reduction while preserving parity. Its raw values remain in `results/latest.json` for traceability only. The exact workload, command and present limits are in [README](README.md); formal runtime values supersede prototype timings.

## 0.4 Prototype boundary

`PrototypeResolver` was evidence-local. It validated the minimum design before product work: exact-byte identity, strict closed payload parser, parser-version invalidation, successful-target memo, fallback on malformed payload/cache I/O failure, and parity for findings, records, logical limits and deterministic pre-abort cancellation.

It did not create the public contract and is not the candidate measured after implementation. The actual runtime and direct tests now own those claims.

## 0.5 Selected outcome

The historical evidence selected **persistent + memo** over memo-only/no-adoption. The selected direction is now implemented; current acceptance is the formal five-run retest and full Gate in [verification review](verification-review.md). The inaccessible private project remains outside fixtures, thresholds and CI.

## Retained limits

- The synthetic corpus is reproducible acceptance evidence, not a prediction for the unavailable private workload.
- “Cold” clears application cache state only; it does not flush the OS page cache.
- `maxRSS` is a cumulative process peak.
- Physical read/parse counters were prototype-only; no formal-runtime counter reduction is claimed from timing samples.
