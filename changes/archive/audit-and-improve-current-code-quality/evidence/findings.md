# Current code-quality findings

最终 manifest/ledger 覆盖 325 个身份（319 live、6 tracked-missing tombstone）。本摘要列出全部 S0–S2 finding；每项均已在 `review-ledger.json` 以完整字段、最终身份和独立复核结论记录。

## Status summary

- S0: 0
- S1: 5 resolved
- S2: 4 resolved
- Deferred: 0
- Open S0/S1: 0

## Resolved findings

| ID | Severity | Owner | Mechanism | Disposition and evidence | Independent review |
| --- | --- | --- | --- | --- | --- |
| PA-001 | S1 | `docs/configuration.md#public-authoring-surface` | Copying an own `__proto__` JSON key by assignment could mutate the snapshot prototype and drop the data key. | `json-snapshot.ts` now defines copied fields as data; Definition regression proves own-key retention and `Object.prototype`. | Accepted by `/root/review_product_batches`. |
| PA-002 | S1 | `docs/configuration.md#public-authoring-surface` | An own `__proto__` inherit-edit key could mutate a snapshot prototype before closed-key validation. | `custom-check.ts` copies trusted fields as own data before exact-key validation; regression rejects the injected key. | Accepted by `/root/review_product_batches`. |
| PA-003 | S1 | `docs/configuration.md#public-authoring-surface` | Dynamic named-code-area assignment could treat a valid own `__proto__` name as prototype mutation. | `quality-configuration.ts` defines named code areas as data; regression proves normal prototype and key retention. | Accepted by `/root/review_product_batches`. |
| CHECKS-1.3-001 | S1 | `docs/scanner-dependencies.md#adapter-handoff-and-exact-scope` | Fractional external scanner values were truncated into different valid measurements. | jscpd adapter now requires safe integers; existing scanner-adapters evidence proves fractional-token rejection fails closed. | Accepted by `/root/review_product_batches`. |
| OUTPUT-1.4-001 | S1 | `docs/output.md#core-to-machine-projection` | `Date.parse` accepted timestamps outside the fixed v4 UTC-millisecond schema form before trusted-model construction. | Output owns and enforces the unchanged v4 timestamp pattern at model construction; regression rejects a date-only value. | Accepted by `/root/review_product_batches`. |
| GATE-SEL-CLOSURE-001 | S2 | `docs/script-tooling.md#project-gate` | A disabled dependency tag could leave a dependent eligible while its prerequisite was not applicable. | Gate entry validation now rejects tag-incomplete dependency selections; existing Definition test covers the counterexample. | Accepted by `/root/review_scripts_and_fixture`. |
| audit-1.8-controlled-lizard-version-drift | S2 | `docs/scanner-dependencies.md#check-owned-command-options` | An unconsumed controlled scanner protocol/version surface had drifted from the locked environment. | The complete unconsumed configured-typescript fixture was removed; its final manifest identity is a tombstone. | Accepted by `/root/review_scripts_and_fixture`. |
| audit-1.8-configured-typescript-orphaned-fixture | S2 | `docs/testing.md#testing-layers`; `docs/scan-scope.md#resolved-scope` | Fixture inputs, wrappers, and README had no current owner or consumer. | The complete fixture was removed rather than manufacturing a consumer; source search recorded no replacement obligation. | Accepted by `/root/review_scripts_and_fixture`. |
| CP-1.9-001 | S2 | `docs/script-tooling.md#root-commands` | Obsolete direct internal-script approvals bypassed the public root-workflow boundary. | Removed 21 direct-script prefix rules; root `bun run` workflows remain. Review corrected the source count to 9 unique currently missing targets (13 rules because of repeats). | Accepted by `/root/review_control_plane`. |

## Boundaries

The 1.9 remote-release observation is not a finding and is intentionally absent from this table. The S3 evidence-precision note from control-plane review likewise did not identify an owner violation or require a code disposition.
