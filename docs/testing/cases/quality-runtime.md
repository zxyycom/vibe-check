# quality-runtime

## Case WB-RUNTIME-CHECK-RECORD-001: Check and Record foundation is exact and closed

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/data-boundary/canonical-data.test.ts|check-record canonical data > emits canonical UTF-8 JSON for safe detached values`
- `bun|src/data-boundary/canonical-data.test.ts|check-record canonical data > rejects accessors, sparse arrays, and reflection failures without invoking author hooks`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > accepts exactly one four-state terminal outcome for each Core Check`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > materializes canonical final and Record data without evaluating author properties`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > accepts only closed Check definitions`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects Check definition accessors without executing them`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > creates detached frozen final and Record facts from canonical input`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- Check definitions, final data, and Record data admit only closed canonical JSON facts; callback execution and reporter ownership stay outside the frozen snapshot.
- Canonical bytes and detached data reject accessors, proxies, sparse arrays, and non-JSON values without evaluating author hooks.
- A Check-facts Check has exactly one closed `passed`, `failed`, `not-applicable`, or `unavailable` outcome, and a snapshot contains only canonical Checks and structural `(checkId, id)` Records.

## Case API-FINDING-WAIVER-RECONCILIATION-001: Public helper reconciles caller-defined finding identities

Owner: `docs/api-mechanics.md#finding-waiver-reconciliation`
Entities:

- `bun|src/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > matches caller-defined structural identities, preserves reasons, and audits unused waivers`
- `bun|src/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > materializes waiver identity and reason without copying caller findings`
- `bun|src/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > does not waive findings when one caller-defined identity matches more than once`
- `bun|src/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > rejects malformed and hostile waiver boundaries without invoking caller accessors`
  Proves:
- The public helper reconciles each configured waiver against the complete caller-provided finding collection by caller-defined canonical structural identity, preserving finding order and original finding references. Zero, one, and multiple matches respectively produce unused, applied, and overmatched audit outcomes; overmatched identities do not waive findings.
- Applied evidence is a detached, deep-frozen materialization of the authored waiver rather than a mutable authored object. Duplicate, malformed, noncanonical, or hostile waiver authoring and invalid finding identity fail with `TypeError` without invoking author accessors.

## Case WB-RUNTIME-CHECK-CATALOG-001: Package Run validates and executes direct Checks

Owner: `docs/configuration.md#invocation-and-results`
Entities:

- `bun|src/project-run/run-controls.test.ts|Package Run > rejects invalid closed controls while a blocked preflight settles unavailable before execution`
- `bun|src/project-run/run-preflight-cancellation.test.ts|Package Run > returns the existing execution cancellation result when the preflight barrier aborts`
- `bun|src/project-run/run-callback-context.test.ts|Package Run > executes each normalized Check directly with the public callback context`
- `bun|src/project-run/check-execution/preflight-failures.test.ts|Package Run direct Check execution > fails closed for thrown, malformed, and noncanonical preflight results`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > rejects invalid flag input before any Check callback`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > provides canonical immutable callback snapshots`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
  Proves:
- Package Run validates closed definitions and controls before execution callbacks or outputs, rejecting unknown Run control keys. An optional Check preflight receives detached frozen authored options and the invocation signal in a sequential global barrier; block, throw, malformed messages/descriptors, and noncanonical prepared/fallback values settle only its Check unavailable without callback execution, while accepted prepared/fallback values are invocation-local. Barrier cancellation returns the existing execution-phase `cancelled` result even with no scheduler task to admit and retains messages from preflights that completed before cancellation. Every ready executable Check receives only its public context, whose `project` value contains normalized `root` and canonical `flags`; trusted preflight/execution callbacks stay outside frozen facts, and Run derives no aggregate unless controls explicitly select one.
- The two `flags.test.ts` entities specifically prove pre-callback rejection for invalid flag input and the canonical immutable `project.flags` callback snapshot.

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: Each executable Check closes as one Check-facts fact

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > maps unresolved scopes to Product unavailable outcomes while retaining accepted Records`
- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
  Proves:
- Every registered Check closes exactly once. Passed, failed, not-applicable, malformed callback result, invalid Record use, and unresolved cancellation all use the same four-state outcome boundary rather than a second lifecycle model.

## Case WB-RUNTIME-RECORD-MANAGER-001: Check-owned reporters retain trustworthy Records

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/session-record-misuse.test.ts|check-record Core Check session > binds structural Record ownership, retains prior Records, and contains invalid author writes`
- `bun|src/check-settlement/session-record-misuse.test.ts|check-record Core Check session > rejects malformed data and duplicate lifecycle closure without revising frozen facts`
- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/project-run/check-execution/resolved-checks.failure.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- The reporter accepts only Check-local Record identity/data, preserves accepted independent Records, and closes with its Check. Duplicate, invalid, or late activity cannot revise frozen facts.

## Case WB-RUNTIME-CHECK-FAILURE-001: Product contains ordinary callback failures safely

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-execution/resolved-checks.failure.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- Ordinary malformed results, malformed terminal-message attachments, and Record misuse become the owning unavailable Check outcome without a partial message escape. A quality failure is an explicit `status: "failed"` with canonical final data; trusted invariant faults are not forged as public Check facts.

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Direct dependencies run through the shared graph

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/run-dependency-data.test.ts|Package Run > admits an unavailable dependency and exposes its read failure`
- `bun|src/project-run/run-planning.test.ts|Package Run > rejects an invalid projected generic Task graph before any Check callback runs`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > keeps dependent admission after local not-applicable`
- `bun|src/project-run/check-execution/resolved-checks.dependencies.test.ts|Package Run direct Check execution > admits all settled dependency outcomes and limits reads to direct dependencies`
  Proves:
- Direct executable Checks use the shared dependency graph. Every settled upstream outcome admits a dependent; its frozen callback-local string getter returns canonical final data only for an effective direct passed/failed dependency, or one of the two closed read failures without exposing undeclared or transitive facts.
- A Check can use `project.flags.includes(...)` to return `not-applicable`; in the mapped dependent fixture, its dependent still runs rather than being scheduler-level skipped. Cancellation-before-start and generic Task failures remain separate lifecycle/engine boundaries.

## Case WB-RUNTIME-CHECK-DURATION-001: Product Run closes private lifecycle and duration facts

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > hands final Check-facts outcomes and one finite duration to the private lifecycle`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > settles cancellation-before-start Checks without starting them`
- `bun|src/project-run/progress-rendering/timing.test.ts|Package Run progress timing > uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations`
  Proves:
- Package Run emits private started/settled facts only from its Check execution boundary: executed Checks settle with their final Check-facts outcome and a finite duration, while cancellation-before-start Checks settle without a start and use `null`/`not run` duration.
- The final duration summary follows canonical snapshot order and identity even when lifecycle completion order follows parallel settlement; a single monotonic invocation interval supplies elapsed time rather than summing overlapping Check durations.

## Case CHECK-SCOPED-CONCURRENCY-001: Check parallel limits use the shared engine

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > uses the minimum active cap and reserves capacity for a newly ready tighter scope`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > does not activate a cap for a scope with no activation task`
  Proves:
- Effective Check parallel limits project to generic graph scope metadata. The shared engine uses the active minimum without preemption and does not make a non-executing scope consume capacity.

## Case WB-RUNTIME-CHECKPOINT-001: Frozen Check-facts snapshot is a two-entity projection

Owner: `docs/architecture.md#check-facts`
Entities:

- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- A frozen snapshot contains canonical `checks` and `records` only. The package-private settled Check seam reuses the same canonical final-data reference that the frozen snapshot projects; policy, publication, callbacks, scanner payloads, and scheduler state are not a third fact source.

## Case AUX-MARKDOWN-LINK-OUTCOMES-001: Markdown Link settles safe complete outcomes

Owner: `docs/quality-metrics.md#markdown-link-findings-and-outcomes`
Entities:

- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > reports safe Markdown Link findings only after a complete traversal`
- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > reports a root-external target without persisting its path, fragment, or query`
- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > validates a direct Markdown target outside source scope without scanning its links`
- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable without publishing an earlier Markdown Link finding`
- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable without publishing an earlier finding when target work reaches its limit`
- `bun|src/package-checks/markdown-link-validation/input-rejection.test.ts|Markdown Link input rejection > is not applicable only when its file selection selects no path`
- `bun|src/package-checks/markdown-link-validation/input-rejection.test.ts|Markdown Link input rejection > reports every selected non-Markdown path without making blocking policy fail`
- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable when project root cannot be canonicalized before source discovery`
- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable before source collection when its Run signal is already cancelled`
  Proves:
- A completed traversal publishes only the documented safe local-reference Record projection and parser-validated exact final counts; root-external findings retain no destination material. The omitted finding policy defaults to non-blocking and retains the Records/final data in a passed outcome with an actionable warning, while explicit blocking retains the same evidence and settles failed with an actionable error. Completed normal/rejected findings additionally project at most ten Check-owned summaries plus an exact omitted count; those summaries retain source navigation and closed reason while never copying the unsafe destination.
- Every selected non-Markdown path publishes a fixed non-blocking rejection Record, contributes to the separate rejection and total finding counts, and cannot be made blocking by Link policy. All-rejected input is passed with a warning; only zero selected paths are not applicable.
- A direct root-contained target outside source scope can provide its own anchor facts but cannot recursively create more source work.
- Source/target limits, root canonicalization failure, and cancellation settle as `unavailable` with actionable Check-owned messages and no partial link-finding Records or final data; already classified rejection Records remain ordinary accepted facts. Zero selected input reaches `not-applicable` only after the root is usable.

## Case AUX-QUALITY-CACHE-001: Duplicate cache identity is stable

Owner: `docs/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/package-checks/duplicate-detection/cache/store.test.ts|quality measurement cache > keys duplicate-code cache by scanner and exact input identity`
  Proves:

- Duplicate raw-scan cache identity depends on package/custom backend identity, current commit, the complete exact-input union fingerprint, configuration version, and structured scanner configuration including the effective line/token lower bounds, JSON/absolute report policy, and tool-default worker policy, rather than pseudo command arguments, current area annotation, or final strict policy. The package command remains portable without a consumer install path; a custom command is identified only by its executable and remains distinct from package command identity.

## Case WB-MAINTENANCE-REMINDER-ASSESSMENT-001: One maintenance Check retains complete local Git assessments

Owner: `docs/quality-metrics.md#维护提醒评估`
Entities:

- `bun|src/package-checks/maintenance-reminders/first-parent-activity.test.ts|maintenance reminders > measures committed first-parent activity while ignoring worktree changes and folds due entries`
- `bun|src/package-checks/maintenance-reminders/first-parent-special-history.test.ts|maintenance reminders > uses first-parent merge diffs, reverts, binary and rename activity`
- `bun|src/package-checks/maintenance-reminders/history-failure-assessments.test.ts|maintenance reminders > classifies Git history failures as complete advisory or enforcing assessments`
- `bun|src/package-checks/maintenance-reminders/progress-and-cancellation.test.ts|maintenance reminders > renders due reminders through progress and retains their message readback`
- `bun|src/package-checks/maintenance-reminders/progress-and-cancellation.test.ts|maintenance reminders > keeps cancellation as a whole-Check unavailable boundary`
  Proves:
- One owning Check measures only committed first-parent activity after each base, excludes worktree/index delta and base itself, sums Git numstat additions/deletions, and treats merge, revert, binary, rename, and strict thresholds as declared by the quality owner.
- Every measurable entry retains a parser-validated ordered clear/due assessment. A Git measurement failure retains a complete unavailable assessment with an actionable `reason`, plus an advisory warning or enforcing error/failure, rather than being mistaken for clear or discarded; due messages remain visible through progress and `RunResult.checkMessages`; cancellation instead closes the whole Check unavailable with an actionable error because no complete payload is formed.
