# quality-gate

## Case WB-RUNTIME-CURRENT-POLICY-ADAPTER-001: Current spellings become catalog-bound policies
Owner: `docs/quality-metrics.md#decisionpolicy`
Entities:
- `bun|src/product/quality-core/src/check-record/current-adapter.test.ts|check-record current policy adapter > maps all five legacy acceptance IDs to their owning Check and same record type through registered predicates`
- `bun|src/product/quality-core/src/check-record/current-adapter.test.ts|check-record current policy adapter > rejects a legacy filter that the owning catalog surface does not expose instead of walking record data`
- `bun|src/product/quality-core/src/check-record/current-adapter.test.ts|check-record current policy adapter > turns an omitted gate into a disabled policy while retaining current observation`
- `bun|src/product/quality-core/src/check-record/current-adapter.test.ts|check-record current policy adapter > turns all three enabled gate spellings into ordinary policies with scoped readiness`
- `bun|src/product/quality-core/src/check-record/current-adapter.test.ts|check-record current policy adapter > uses its own readiness to preserve no-eligible current gate semantics without a Core gate-name switch`
- `bun|src/product/quality-core/src/check-record/current-adapter.test.ts|check-record current policy adapter > requires reference evidence only for current-applicable Checks`
Proves:
- `all`/`changed`/`regressions` and legacy acceptance inputs are one-way adapters to typed catalog-bound policy data; readiness and required reference evidence are policy-local.

## Case WB-RUNTIME-HUMAN-STATUS-PROJECTION-001: Human statuses are pure projections
Owner: `docs/quality-metrics.md#human-status`
Entities:
- `bun|src/product/quality-core/src/check-record/human-status.test.ts|check-record human status projection > projects incomplete, no-eligible, completed quality failure, and passed current snapshots without changing them`
- `bun|src/product/quality-core/src/check-record/human-status.test.ts|check-record human status projection > uses the acceptance-applied all view only for verification projection and keeps decision evidence unchanged`
- `bun|src/product/quality-core/src/check-record/human-status.test.ts|check-record human status projection > does not let verification output turn incomplete or no-eligible current work into passed`
Proves:
- Verification display reads accepted `all-current` evidence only and cannot modify Core, decision, artifacts or outcome.

## Case WB-RUNTIME-CHECK-RECORD-POLICY-001: Policy and named reference contract is closed
Owner: `docs/quality-metrics.md#decisionpolicy`
Entities:
- `bun|src/product/quality-core/src/check-record/policy-model.test.ts|check-record policy model > exposes only the closed reference, gate, and not-evaluated states`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > normalizes pure serializable policy data with qualified selectors into a detached frozen value`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > applies acceptance before views and preserves canonical blocking record and evidence order`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > stops at the first readiness failure while retaining failed-run records as not evaluated`
Proves:
- Closed policy validation/evaluation preserves canonical evidence, acceptance, ordered readiness and `blockWhen` without a global reducer.

## Case BB-CLI-GATE-ACCEPTANCE-001: Formal gate entry shares policy evidence
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > passes a zero-record quick all gate while preserving the skipped Check run`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > fails an all gate when the unaccepted all-current view is non-empty`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > keeps input-unchanged evidence relation-free for a regression gate`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > projects changed non-regression evidence for a changed gate`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > projects regression evidence for a regressions gate`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > rejects a comparison gate without an explicit baseline before scan work`
Proves:
- Formal CLI preserves policy result/reference evidence across the validated v2 set and rejects missing explicit comparison input before work.

## Case BB-CLI-GATE-OMITTED-001: Omitted gate and readable output remain stable
Owner: `docs/cli.md#console-与-artifacts`
Entities:
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the complete-passed projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the complete-warning projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the legitimate-empty projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the scan-incomplete projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > returns output failure without a partial canonical machine set`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > --verification-output changes only the warning preview`
Proves:
- Omitted gate and verification display preserve the validated publication/outcome boundary; output failure cannot publish a partial set.

## Case WB-CLI-GATE-PLANNING-001: Gate parser and baseline planning
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > accepts every descriptor-derived gate policy value`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > derives gate values and policy descriptions in scan help from the descriptor`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps gate enforcement disabled when callers omit --gate`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps --skip-baseline as a CLI-only current-snapshot compatibility flag`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps the selected profile and baseline plan for the all policy`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps verification output orthogonal to gate policy and scan planning`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > rejects comparison policies with quick profile or explicit baseline skipping`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > rejects missing, duplicate, and unknown gate values with actionable usage errors`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > rejects retired and contradictory baseline options`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > requires an explicit baseline for comparison policies`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > retains an explicit baseline revision for comparison policies`
- `bun|src/product/cli.test.ts|gate CLI usage contract > returns exit 3 before scanners or artifacts for every invalid gate form`
- `bun|src/product/cli.test.ts|baseline resolution CLI contract > maps Git execution failures to runtime exit 2 before scan work`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > canonicalizes commit aliases to one full commit object ID`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > keeps Git execution failures as runtime errors`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > rejects missing, non-commit, and option-like revisions`
Proves:
- CLI accepts only the three adapter spellings and freezes a valid explicit baseline before work.

## Case AUX-CURRENT-POLICY-EVIDENCE-001: Additional current policy and outcome evidence
Owner: `docs/quality-metrics.md#decisionpolicy`
Entities:
- `bun|src/product/quality-core/src/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > keeps current facts complete when reference scope is incomplete and policy readiness stops evaluation`
- `bun|src/product/quality-core/src/check-record/current-composition.test.ts|current Check/Record composition > coordinates three selected built-ins into five record types and evaluates all changed and regressions as ordinary policies`
- `bun|src/product/quality-core/src/check-record/current-composition.test.ts|current Check/Record composition > keeps an omitted gate disabled while acceptance supplies the all-current verification view and reasons`
- `bun|src/product/quality-core/src/check-record/current-composition.test.ts|current Check/Record composition > retains the complete current snapshot when one reference is incomplete and stops comparison policy readiness`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > allows another closed policy to treat the same run failure as an ordinary blocking operand`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > binds policy surfaces to the resolved catalog fingerprint instead of a replaceable registry`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > keeps a disabled policy closed without blockWhen evidence`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > makes unavailable reference evidence policy-local without changing Core facts`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > passes a ready policy when complete reference facts leave its view empty`
- `bun|src/product/quality-core/src/check-record/policy-evaluator.test.ts|check-record policy evaluation > matches relation-kind-in membership so regressions enter changed views and unchanged records stay out`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > accepts canonical registered relation-kind-in values as frozen policy data`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > derives the detached policy surface only from the resolved fingerprinted catalog`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > keeps validation execution-free even when rejected data contains callable material`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects accessors and reflection failures without invocation or credential disclosure`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects missing or duplicate references and unknown qualified selectors, operands, relations, and fields`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects relation-kind-in values not shared by every selected record surface`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > rejects unknown relation predicates and invalid relation-kind-in value sets`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record policy pre-work validation > requires a non-empty safe acceptance reason and rejects unknown acceptance fields`
- `bun|src/product/quality-core/src/check-record/policy-validation.test.ts|check-record reference fact validation > binds one status to each required check/reference pair and accepts only registered relation variants`
Proves:
- Named reference facts remain separate from current runs; catalog-bound acceptance, relation matching, named views and ordered readiness produce canonical policy evidence without a global completeness or comparison reducer.
- Failed-run and unavailable-reference facts affect a policy only through its declared operands/readiness; an omitted gate stays disabled while the acceptance-applied `all-current` view remains available to human verification projection.

## Case BB-CURRENT-POLICY-PUBLICATION-001: Publication preserves policy outcome priority
Owner: `docs/output.md#core-to-machine-projection`
Entities:
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > does not publish a computed failed gate when output validation fails`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > keeps gate projection independent from verification warning preview`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > publishes the same records and GateResult across successful outputs`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns failed for requested gates without complete evidence`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns failed when artifact output fails after a failed gate was computed`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns gate-failed only after the written failed-gate publication validates`
Proves:
- A computed policy result reaches console, machine artifacts and process outcome only through a validated publication model; validation/publication failure suppresses gate projection and takes the failed outcome.
- Successful outputs preserve the same records and `GateResult`; `--verification-output` changes only the readable preview, while not-evaluated evidence remains a failed process outcome and a validated failed gate becomes `gate-failed`.
