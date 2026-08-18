# Quality Metrics

本文拥有 Check、QualityRecord、DecisionPolicy 与人读质量状态。它不拥有 scanner command 配置、machine bytes、
CLI 参数或 generic task engine。

## Check and Record facts

Product validates and flattens the recursive Check tree, then Core records one fact for every executable Check.
Each has exactly one terminal outcome:

| `outcome.status` | Meaning |
| --- | --- |
| `completed` | Quality work finished; `verdict` is `passed` or `failed`. |
| `not-applicable` | The Check intentionally had no work; a reason code is optional. |
| `unavailable` | Product could not supply a normal conclusion; `reason.code` is required. |

`completed` (including quality `failed`) and `not-applicable` satisfy a dependent Check's prerequisite.
`unavailable` blocks dependent user work and identifies blocked IDs with
`reason: { code: "prerequisite-unavailable", checkIds }`.

A callback receives a Check-owned reporter, not a Core capability. It submits candidates with declared
`recordTypeId`, level, semantic subject, message, fields, and location. Product assigns Check/record identities,
validates fields and ownership, rejects invalid/duplicate/late writes, and preserves accepted records after later
ordinary failure or cancellation. Core has only canonical `checks` and `records`; no scheduler, callback, scanner
payload, or derived status is published as a fact.

## Direct defaults and exact inputs

The default Checks are `duplicate-detection`, `file-metrics`, and `function-metrics`. Their direct callbacks own
scanner options, operate only on Product-approved exact input paths, and report ordinary candidates. Adapter
availability, process, parser, cache, or scope failures settle the owning Check as unavailable rather than create
a parallel quality model. See [Scanner dependencies](scanner-dependencies.md) for this private adapter boundary.

The three Check results use the same grammar as a custom callback. Their options influence only their own metric
semantics and scanner execution; they do not change policy acceptance or output configuration.

## DecisionPolicy and human status

`DecisionPolicy` is closed declarative data: acceptance rules, named views, ordered readiness, and `blockWhen`.
It consumes a frozen snapshot and reference facts, then produces auditable decision evidence. A policy selects
existing Check/record facts; it cannot re-run callbacks, replace a scanner, or infer a second Check.

Human status is a pure projection of frozen facts and decision evidence. Any unavailable Check is `failed`; no
completed Check or a completed quality-failed Check yields `warning`; otherwise it is `passed`. Verification adds
its acceptance/readiness interpretation but does not mutate quality facts. Machine details and publication
lifecycle are owned by [Output](output.md).

## Verification

Current evidence covers recursive Definition validation, direct callback context/outcomes, Core ownership and
terminal closure, prerequisites/cancellation, default-scanner exact scope/cache behavior, policy evidence, and
human status. Exact machine schema/example/publication evidence is documented in [Output](output.md) and the
current Case catalog in [Testing](testing.md).
