# `functionMetrics` Contract Audit at the Plan Baseline

**Historical readiness evidence:** this audit records the implementation baseline reviewed after the Change was promoted to Plan. It is evidence for readiness task 0.4, not a statement of current completion and not a replacement for the stable owners linked below. Current completion evidence belongs to verification tasks 2.1–2.5; current behavior belongs to the stable owners.

## Reviewed baseline

- Public API owner: [`src/index.ts`](../../../../src/index.ts)
- Check behavior owner: [`docs/checks/function-metrics.md`](../../../../docs/checks/function-metrics.md)
- Product implementation: [`src/package-checks/function-metrics`](../../../../src/package-checks/function-metrics)
- Gate binding: [`scripts/project/gate/checks/repository-quality.ts`](../../../../scripts/project/gate/checks/repository-quality.ts)
- Package API inventory: [`scripts/package/public-api-inventory.test.ts`](../../../../scripts/package/public-api-inventory.test.ts)
- Current Decisions:
  - [`replace-lizard-runtime-with-product-owned-typescript-analyzers`](../../../../docs/decisions/replace-lizard-runtime-with-product-owned-typescript-analyzers.md)
  - [`track-lizard-supported-languages-with-upstream-advisory`](../../../../docs/decisions/track-lizard-supported-languages-with-upstream-advisory.md)
  - [`preserve-applicable-upstream-licenses-for-translated-analyzers`](../../../../docs/decisions/preserve-applicable-upstream-licenses-for-translated-analyzers.md)

## Contract that the replacement had to preserve

- `functionMetrics`, its final-data parser, findings, waivers, Records and four-state Check settlement remain public Product behavior.
- File collection and containment remain owned by `project-files`. The analyzer receives only the approved root-relative exact paths and must not rediscover the project root or apply an unknown-extension fallback.
- The current registry is 55 case-insensitive canonical extensions. The upstream `.r` and `.R` declarations are one canonical extension, not two scans.
- Overlapping areas, the strictest applicable limit, blocking settlement, allowance behavior, canonical result ordering, safe messages and Finding waiver reconciliation remain unchanged.
- A complete candidate set is required before unused-waiver audit. Read, analysis or cancellation failure must not publish a partial measurement prefix or a false audit.
- The hard cut removes the public `scanner` option and the private Lizard probe, process and CSV vocabulary. It does not retain misleading `external-*` unavailable reasons for an in-process analyzer.

## Semantic drift assessed at the Plan baseline

- `@zxyycom/vibe-check@0.0.1` has been published, so `scanner.executable` is a real pre-stable public surface. The accepted migration is direct deletion in the next `0.0.x`, without a shim or deprecation window.
- Finding waivers and their audit Records were added after the original Lizard replacement investigation. They are now mandatory migration behavior and require reader-level identity evidence.
- Gate, package-candidate and installed-consumer acceptance had become explicit owners. The cutover had to prove that none of them injected or resolved Python, Lizard or `VIBE_CHECK_LIZARD_CMD`.
- The current Check has no owner-local cache. No `functionMetrics` cache migration or new cache abstraction is required; cache behavior elsewhere in the repository is unrelated.
- The existing adapter tests proved the old executable/CSV boundary. They did not prove parity for any translated reader and were replaced by analyzer and integration evidence rather than mechanically renamed.

## Baseline verification performed

```text
bun test src/package-checks/function-metrics
# 23 passed

bun test scripts/project/gate/checks/repository-quality.test.ts scripts/project/gate/definition.test.ts scripts/package/public-api-inventory.test.ts
# 7 passed

bun run test-evidence -- check --root .
# 375/375 entities mapped before implementation work began
```

The audit found no additional product decision that blocked implementation. The then-remaining translated-reader parity, resource/cancellation, package/legal inventory and removal-trace boundaries are closed by tasks 1–2; the active Change remains unarchived only pending explicit archive authorization.
