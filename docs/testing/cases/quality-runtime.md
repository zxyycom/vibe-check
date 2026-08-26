# quality-runtime

## Case WB-RUNTIME-CHECK-RECORD-001: Check and Record foundation is exact and closed

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/foundation/canonical-data.test.ts|check-record canonical data > emits canonical UTF-8 JSON for safe detached values`
- `bun|src/foundation/canonical-data.test.ts|check-record canonical data > rejects accessors, sparse arrays, and reflection failures without invoking author hooks`
- `bun|src/core/facts.test.ts|check-record foundation model > accepts exactly one four-state terminal outcome for each Core Check`
- `bun|src/core/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/core/facts.test.ts|check-record foundation model > materializes canonical final and Record data without evaluating author properties`
- `bun|src/core/facts.test.ts|check-record foundation model > accepts only closed Check definitions`
- `bun|src/core/fact-validation.test.ts|check-record foundation runtime validation > rejects Check definition accessors without executing them`
- `bun|src/core/fact-validation.test.ts|check-record foundation runtime validation > creates detached frozen final and Record facts from canonical input`
- `bun|src/core/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- Check definitions, final data, and Record data admit only closed canonical JSON facts; callback execution and reporter ownership stay outside the frozen snapshot.
- Canonical bytes and detached data reject accessors, proxies, sparse arrays, and non-JSON values without evaluating author hooks.
- A Core Check has exactly one closed `passed`, `failed`, `not-applicable`, or `unavailable` outcome, and a snapshot contains only canonical Checks and structural `(checkId, id)` Records.

## Case WB-RUNTIME-CHECK-CATALOG-001: Package Run validates and executes direct Checks

Owner: `docs/architecture.md#definition-boundary`
Entities:

- `bun|src/run/run.test.ts|Package Run > rejects invalid closed controls and definitions before any Check callback`
- `bun|src/run/run.test.ts|Package Run > executes each normalized Check directly with the public callback context`
- `bun|src/run/flags.test.ts|Package Run flags > rejects invalid flag input before any Check callback`
- `bun|src/run/flags.test.ts|Package Run flags > provides canonical immutable callback snapshots`
- `bun|src/run/core-integration.test.ts|Package Run core integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
  Proves:
- Package Run validates closed definitions and controls before calling project code, invokes every normalized executable Check with only its public context, excludes callbacks from frozen facts, and derives no aggregate unless controls explicitly select one.
- The two `flags.test.ts` entities specifically prove pre-callback rejection for invalid flag input and the canonical immutable `project.flags` callback snapshot.

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: Each executable Check closes as one Core fact

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/core/session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/core/session.test.ts|check-record Core Check session > maps unresolved scopes to Product unavailable outcomes while retaining accepted Records`
- `bun|src/run/core-integration.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
  Proves:
- Every registered Check closes exactly once. Passed, failed, not-applicable, malformed callback result, invalid Record use, and unresolved cancellation all use the same four-state outcome boundary rather than a second lifecycle model.

## Case WB-RUNTIME-RECORD-MANAGER-001: Check-owned reporters retain trustworthy Records

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/core/session.test.ts|check-record Core Check session > binds structural Record ownership, retains prior Records, and contains invalid author writes`
- `bun|src/core/session.test.ts|check-record Core Check session > rejects malformed data and duplicate lifecycle closure without revising frozen facts`
- `bun|src/run/core-integration.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- The reporter accepts only Check-local Record identity/data, preserves accepted independent Records, and closes with its Check. Duplicate, invalid, or late activity cannot revise frozen facts.

## Case WB-RUNTIME-CHECK-FAILURE-001: Product contains ordinary callback failures safely

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/run/core-integration.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- Ordinary malformed results, malformed terminal-message attachments, and Record misuse become the owning unavailable Check outcome without a partial message escape. A quality failure is an explicit `status: "failed"` with canonical final data; trusted invariant faults are not forged as public Check facts.

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Direct dependencies run through the shared graph

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/run/run.test.ts|Package Run > admits an unavailable dependency and exposes its read failure`
- `bun|src/run/run.test.ts|Package Run > rejects an invalid projected generic Task graph before any Check callback runs`
- `bun|src/run/flags.test.ts|Package Run flags > keeps dependent admission after local not-applicable`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > admits all settled dependency outcomes and limits reads to direct dependencies`
  Proves:
- Direct executable Checks use the shared dependency graph. Every settled upstream outcome admits a dependent; its frozen callback-local string getter returns canonical final data only for an effective direct passed/failed dependency, or one of the two closed read failures without exposing undeclared or transitive facts.
- A Check can use `project.flags.includes(...)` to return `not-applicable`; in the mapped dependent fixture, its dependent still runs rather than being scheduler-level skipped. Cancellation-before-start and generic Task failures remain separate lifecycle/engine boundaries.

## Case WB-RUNTIME-CHECK-DURATION-001: Product Run closes private lifecycle and duration facts

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > hands final Core outcomes and one finite duration to the private lifecycle`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > settles cancellation-before-start Checks without starting them`
- `bun|src/run/progress-timing.test.ts|Package Run progress timing > uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations`
  Proves:
- Package Run emits private started/settled facts only from its Check execution boundary: executed Checks settle with their final Core outcome and a finite duration, while cancellation-before-start Checks settle without a start and use `null`/`not run` duration.
- The final duration summary follows canonical snapshot order and identity even when lifecycle completion order follows parallel settlement; a single monotonic invocation interval supplies elapsed time rather than summing overlapping Check durations.

## Case CHECK-SCOPED-CONCURRENCY-001: Check parallel limits use the shared engine

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/scheduler/task-engine.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/scheduler/task-engine.test.ts|static task engine > uses the minimum active cap and reserves capacity for a newly ready tighter scope`
- `bun|src/scheduler/task-engine.test.ts|static task engine > does not activate a cap for a scope with no activation task`
  Proves:
- Effective Check parallel limits project to generic graph scope metadata. The shared engine uses the active minimum without preemption and does not make a non-executing scope consume capacity.

## Case WB-RUNTIME-CHECKPOINT-001: Frozen Core snapshot is a two-entity projection

Owner: `docs/architecture.md#core-facts`
Entities:

- `bun|src/core/session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/core/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/core/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- A frozen snapshot contains canonical `checks` and `records` only. The package-private settled Check seam reuses the same canonical final-data reference that the frozen snapshot projects; policy, publication, callbacks, scanner payloads, and scheduler state are not a third fact source.

## Case WB-RUNTIME-PROGRESS-PRESENTATION-001: Progress renders four-state Run facts safely

Owner: `docs/configuration.md#run-effects-and-compatibility-boundary`
Entities:

- `bun|src/run/progress.test.ts|Package Run progress lifecycle presentation > formats every terminal status with measured duration or not run and only the safe reason code`
- `bun|src/run/progress.test.ts|Package Run progress lifecycle presentation > applies the settled visibility matrix consistently in plain and dumb terminals`
- `bun|src/run/progress.test.ts|Package Run progress lifecycle presentation > hides only attention passed rows after clearing TTY running rows and writes each visible block atomically`
- `bun|src/run/progress.test.ts|Package Run progress lifecycle presentation > uses ANSI color only for message level labels on color-capable TTY writers`
- `bun|src/run/progress.test.ts|Package Run progress lifecycle presentation > renders an empty final TTY running region after zero-Check or fully settled progress`
- `bun|src/run/progress.test.ts|Package Run progress lifecycle presentation > propagates writer failures without swallowing them or attempting later writes`
- `bun|src/run/progress-terminal-statuses.test.ts|Package Run progress terminal statuses > renders unstarted cancellation as execution-cancelled and not run`
  Proves:
- Progress presentation consumes only settled four-state Check facts and accepted terminal messages, prints a duration or `not run`, and renders no unsafe reason detail. `attention` hides only the passed/no-message settled row; every running Check remains visible on TTY.
- TTY color and running-region behavior remain terminal-capability specific: only message level labels receive color, human text is escaped, and each visible settled row/message block is one write. Write faults stay observable instead of being hidden.

## Case AUX-MARKDOWN-LINK-OUTCOMES-001: Markdown Link settles safe complete outcomes

Owner: `docs/quality-metrics.md#markdown-link-findings-and-outcomes`
Entities:

- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > reports safe Markdown Link findings only after a complete traversal`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > reports a root-external target without persisting its path, fragment, or query`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > validates a direct Markdown target outside source scope without scanning its links`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable without publishing an earlier Markdown Link finding`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable without publishing an earlier finding when target work reaches its limit`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > is not applicable when its file selection has no eligible Markdown source`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable when project root cannot be canonicalized before source discovery`
- `bun|src/checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > returns unavailable before source collection when its Run signal is already cancelled`
  Proves:
- A completed traversal publishes only the documented safe local-reference Record projection and exact final counts; root-external findings retain no destination material.
- A direct root-contained target outside source scope can provide its own anchor facts but cannot recursively create more source work.
- Source/target limits, root canonicalization failure, and cancellation settle as `unavailable` with no partial Records or final data; zero eligible source reaches `not-applicable` only after the root is usable.

## Case AUX-RUNTIME-OPTION-001: Product Option explicitly separates presence and absence

Owner: `docs/coding-style.md#5-按问题形态选择实现模型`
Entities:

- `bun|src/foundation/option.test.ts|product Option > composes present values without entering absence branches`
- `bun|src/foundation/option.test.ts|product Option > keeps absence stable and evaluates only fallback branches`
- `bun|src/foundation/option.test.ts|product Option > converts nullable inputs and Result boundaries without losing values or errors`
  Proves:
- Present and absent Option values preserve their respective branches, including nullable conversion and Result boundaries, without evaluating unrelated effects.

## Case AUX-RUNTIME-FOUNDATION-001: Product foundation boundaries remain explicit and typed

Owner: `docs/coding-style.md#3-边界代码显式`
Entities:

- `bun|src/foundation/boundaries.test.ts|product foundation boundaries > normalizes repeated CLI string options without preserving boolean entries`
- `bun|src/foundation/boundaries.test.ts|product foundation boundaries > validates CSV rows and keeps NDJSON failures and parse results explicit`
- `bun|src/foundation/boundaries.test.ts|product foundation boundaries > uses named file and process inputs while preserving explicit serialization failures`
  Proves:
- Product foundation receives CLI and CSV parser values at an explicit boundary, exposes readonly argument views, and only returns strings through a string-array option view.
- NDJSON parsing returns readonly result collections; an unrepresentable record fails with its 1-based record position instead of becoming an empty line or omitted output.
- File writes and synchronous child-process execution use named input boundaries; JSON serialization failures name the affected file instead of being silently written or skipped.

## Case AUX-QUALITY-CACHE-001: Duplicate cache identity is stable

Owner: `docs/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/checks/duplicate-detection/cache/cache.test.ts|quality measurement cache > keys duplicate-code cache by scanner and exact input identity`
  Proves:
- Duplicate cache identity depends on the measurement/backend and exact input identity, not policy or presentation settings. The default marker becomes a Bun plus installed-jscpd identity without consumer install paths, distinct from the prior Node launcher and explicit commands.

## Case WB-MAINTENANCE-REMINDER-ASSESSMENT-001: One maintenance Check retains complete local Git assessments

Owner: `docs/quality-metrics.md#维护提醒评估`
Entities:

- `bun|src/checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > measures committed first-parent activity while ignoring worktree changes and folds due entries`
- `bun|src/checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > uses first-parent merge diffs, reverts, binary and rename activity`
- `bun|src/checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > classifies Git history failures as complete advisory or enforcing assessments`
- `bun|src/checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > renders due reminders through progress and retains their message readback`
- `bun|src/checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > keeps cancellation as a whole-Check unavailable boundary`
  Proves:
- One owning Check measures only committed first-parent activity after each base, excludes worktree/index delta and base itself, sums Git numstat additions/deletions, and treats merge, revert, binary, rename, and strict thresholds as declared by the quality owner.
- Every measurable entry retains an ordered clear/due assessment. A Git measurement failure retains a complete unavailable assessment with an actionable `reason`, plus an advisory warning or enforcing error/failure, rather than being mistaken for clear or discarded; due messages remain visible through progress and `RunResult.checkMessages`; cancellation instead closes the whole Check unavailable because no complete payload is formed.
