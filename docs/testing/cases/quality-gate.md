# quality-gate

## Case WB-POLICY-RUNTIME-001: Retained policy runtime evidence
Owner: `docs/architecture.md#核心定位`
Entities:
- `bun|src/product/quality-core/src/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > keeps current facts complete when reference scope is incomplete and policy readiness stops evaluation`
- `bun|src/product/quality-core/src/check-record/human-status.test.ts|check-record human status projection > does not let verification output turn incomplete or no-eligible current work into passed`
- `bun|src/product/quality-core/src/check-record/human-status.test.ts|check-record human status projection > projects incomplete, no-eligible, completed quality failure, and passed current snapshots without changing them`
- `bun|src/product/quality-core/src/check-record/human-status.test.ts|check-record human status projection > uses the acceptance-applied all view only for verification projection and keeps decision evidence unchanged`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > allows another closed policy to treat the same run failure as an ordinary blocking operand`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > applies acceptance before views and preserves canonical blocking record and evidence order`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > binds policy surfaces to the resolved catalog fingerprint instead of a replaceable registry`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > keeps a disabled policy closed without blockWhen evidence`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > makes unavailable reference evidence policy-local without changing Core facts`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > matches relation-kind-in membership so regressions enter changed views and unchanged records stay out`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > passes a ready policy when complete reference facts leave its view empty`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > stops at the first readiness failure while retaining failed-run records as not evaluated`
- `bun|src/product/quality-core/src/check-record/policy-model.test.ts|check-record policy model > exposes only the closed reference, gate, and not-evaluated states`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > accepts canonical registered relation-kind-in values as frozen policy data`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > derives the detached policy surface only from the resolved fingerprinted catalog`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > keeps validation execution-free even when rejected data contains callable material`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > normalizes pure serializable policy data with qualified selectors into a detached frozen value`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects accessors and reflection failures without invocation or credential disclosure`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects missing or duplicate references and unknown qualified selectors, operands, relations, and fields`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects relation-kind-in values not shared by every selected record surface`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects unknown relation predicates and invalid relation-kind-in value sets`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > requires a non-empty safe acceptance reason and rejects unknown acceptance fields`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record reference fact validation > binds one status to each required check/reference pair and accepts only registered relation variants`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > canonicalizes commit aliases to one full commit object ID`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > keeps Git execution failures as runtime errors`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > rejects missing, non-commit, and option-like revisions`
Proves:
- Named-policy validation/evaluation, reference facts, human status, and baseline resolution remain owned by Package Run foundations rather than a JSON/CLI adapter.
