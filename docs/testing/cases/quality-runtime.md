# quality-runtime

## Case WB-RUNTIME-CHECK-RECORD-001: Check and Record foundation is exact and closed

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > emits canonical UTF-8 JSON for safe detached values`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > rejects accessors, sparse arrays, and reflection failures without invoking author hooks`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > normalizes Check-local semantic subjects without creating Record identities`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > accepts exactly one four-state terminal outcome for each Core Check`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > materializes canonical final and Record data without evaluating author properties`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > accepts only closed Check definitions`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects Check definition accessors without executing them`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > creates detached frozen final and Record facts from canonical input`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- Check definitions, final data, and Record data admit only closed canonical JSON facts; callback execution and reporter ownership stay outside the frozen snapshot.
- Canonical bytes and detached data reject accessors, proxies, sparse arrays, and non-JSON values without evaluating author hooks.
- A Core Check has exactly one closed `passed`, `failed`, `not-applicable`, or `unavailable` outcome, and a snapshot contains only canonical Checks and structural `(checkId, id)` Records.

## Case WB-RUNTIME-CHECK-CATALOG-001: Package Run validates and executes direct Checks

Owner: `docs/architecture.md#definition-boundary`
Entities:

- `bun|src/product/run/index.test.ts|Package Run > rejects invalid closed controls and definitions before any Check callback`
- `bun|src/product/run/index.test.ts|Package Run > executes each normalized Check directly with the public callback context`
- `bun|src/product/run/flags.test.ts|Package Run flags > rejects invalid flag input before any Check callback`
- `bun|src/product/run/flags.test.ts|Package Run flags > provides canonical immutable callback snapshots`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
  Proves:
- Package Run validates closed definitions and controls before calling project code, invokes every normalized executable Check with only its public context, excludes callbacks from frozen facts, and derives no aggregate unless controls explicitly select one.
- The two `flags.test.ts` entities specifically prove pre-callback rejection for invalid flag input and the canonical immutable `project.flags` callback snapshot.

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: Each executable Check closes as one Core fact

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > maps unresolved scopes to Product unavailable outcomes while retaining accepted Records`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
  Proves:
- Every registered Check closes exactly once. Passed, failed, not-applicable, malformed callback result, invalid Record use, and unresolved cancellation all use the same four-state outcome boundary rather than a second lifecycle model.

## Case WB-RUNTIME-RECORD-MANAGER-001: Check-owned reporters retain trustworthy Records

Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:

- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > binds structural Record ownership, retains prior Records, and contains invalid author writes`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > rejects malformed data and duplicate lifecycle closure without revising frozen facts`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- The reporter binds structural Check ownership, preserves accepted independent Records, and closes with its Check. Duplicate, invalid, or late activity cannot revise frozen facts; no reference or comparison execution channel exists.

## Case WB-RUNTIME-CHECK-FAILURE-001: Product contains ordinary callback failures safely

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/product/run/index.core.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- Ordinary malformed results and Record misuse become the owning unavailable Check outcome. A quality failure is an explicit `status: "failed"` with canonical final data; trusted invariant faults are not forged as public Check facts.

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Direct dependencies run through the shared graph

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/product/run/index.test.ts|Package Run > projects direct dependencies to generic tasks and gives skipped dependents a prerequisite reason`
- `bun|src/product/run/index.test.ts|Package Run > rejects an invalid projected generic Task graph before any Check callback runs`
- `bun|src/product/run/flags.test.ts|Package Run flags > keeps dependent admission after local not-applicable`
  Proves:
- Direct executable Checks use the shared dependency graph. A skipped dependent receives `prerequisite-unavailable` and named prerequisite IDs, while no separate execution layout or scheduler API becomes public.
- A Check can use `project.flags.includes(...)` to return `not-applicable`; in the mapped dependent fixture, its dependent still runs rather than being scheduler-level skipped.

## Case WB-RUNTIME-CHECK-DURATION-001: Product Run closes private lifecycle and duration facts

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > hands final Core outcomes and one finite duration to the private lifecycle`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > settles blocked and cancelled-before-start Checks without starting them`
- `bun|src/product/run/progress-timing.test.ts|Package Run progress timing > uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations`
  Proves:
- Package Run emits private started/settled facts only from its Check execution boundary: executed Checks settle with their final Core outcome and a finite duration, while blocked and cancellation-before-start Checks settle without a start and use `null`/`not run` duration.
- The final duration summary follows canonical snapshot order and identity even when lifecycle completion order follows parallel settlement; a single monotonic invocation interval supplies elapsed time rather than summing overlapping Check durations.

## Case CHECK-SCOPED-CONCURRENCY-001: Check parallel limits use the shared engine

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > uses the minimum active cap and reserves capacity for a newly ready tighter scope`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > does not activate a cap for a scope with no activation task`
  Proves:
- Effective Check parallel limits project to generic graph scope metadata. The shared engine uses the active minimum without preemption and does not make a non-executing scope consume capacity.

## Case WB-RUNTIME-CHECKPOINT-001: Frozen Core snapshot is a two-entity projection

Owner: `docs/architecture.md#core-facts`
Entities:

- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- A frozen snapshot contains canonical `checks` and `records` only. Policy, publication, callbacks, scanner payloads, and scheduler state are not a third fact source.

## Case WB-RUNTIME-PROGRESS-PRESENTATION-001: Progress renders four-state Run facts safely

Owner: `docs/configuration.md#policy-effects-and-retired-inputs`
Entities:

- `bun|src/product/run/progress.test.ts|Package Run progress lifecycle presentation > formats every terminal status with measured duration or not run and only the safe reason code`
- `bun|src/product/run/progress.test.ts|Package Run progress lifecycle presentation > uses ANSI status color only for color-capable TTY writers`
- `bun|src/product/run/progress.test.ts|Package Run progress lifecycle presentation > renders an empty final TTY running region after zero-Check or fully settled progress`
- `bun|src/product/run/progress.test.ts|Package Run progress lifecycle presentation > propagates writer failures without swallowing them or attempting later writes`
- `bun|src/product/run/progress-terminal-statuses.test.ts|Package Run progress terminal statuses > renders unstarted cancellation as execution-cancelled and not run`
  Proves:
- Progress presentation consumes only settled four-state Check facts, prints a duration or `not run`, and renders no unsafe reason detail.
- TTY color and running-region behavior remain terminal-capability specific; write faults stay observable instead of being hidden.

## Case WB-RUNTIME-BASELINE-REVISION-001: Explicit baseline revisions fail closed

Owner: `docs/configuration.md#invocation-and-results`
Entities:

- `bun|src/product/quality-core/input/revisions.test.ts|explicit baseline revision resolution > canonicalizes commit aliases to one full commit object ID`
- `bun|src/product/quality-core/input/revisions.test.ts|explicit baseline revision resolution > rejects missing, non-commit, and option-like revisions`
- `bun|src/product/quality-core/input/revisions.test.ts|explicit baseline revision resolution > keeps Git execution failures as runtime errors`
  Proves:
- An explicit baseline revision resolves only to a canonical commit object ID; malformed or non-commit values fail closed, while Git execution failures remain runtime failures.

## Case AUX-RUNTIME-OPTION-001: Product Option explicitly separates presence and absence

Owner: `docs/coding-style.md#5-按问题形态选择实现模型`
Entities:

- `bun|src/product/foundation/option.test.ts|product Option > composes present values without entering absence branches`
- `bun|src/product/foundation/option.test.ts|product Option > keeps absence stable and evaluates only fallback branches`
- `bun|src/product/foundation/option.test.ts|product Option > converts nullable inputs and Result boundaries without losing values or errors`
  Proves:
- Present and absent Option values preserve their respective branches, including nullable conversion and Result boundaries, without evaluating unrelated effects.

## Case AUX-RUNTIME-FOUNDATION-001: Product foundation boundaries remain explicit and typed

Owner: `docs/coding-style.md#3-边界代码显式`
Entities:

- `bun|src/product/foundation/boundaries.test.ts|product foundation boundaries > normalizes repeated CLI string options without preserving boolean entries`
- `bun|src/product/foundation/boundaries.test.ts|product foundation boundaries > validates CSV rows and keeps NDJSON failures and parse results explicit`
- `bun|src/product/foundation/boundaries.test.ts|product foundation boundaries > uses named file and process inputs while preserving explicit serialization failures`
  Proves:
- Product foundation receives CLI and CSV parser values at an explicit boundary, exposes readonly argument views, and only returns strings through a string-array option view.
- NDJSON parsing returns readonly result collections; an unrepresentable record fails with its 1-based record position instead of becoming an empty line or omitted output.
- File writes and synchronous child-process execution use named input boundaries; JSON serialization failures name the affected file instead of being silently written or skipped.

## Case AUX-QUALITY-CACHE-001: Duplicate cache identity is stable

Owner: `docs/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/product/quality-core/measurement/cache.test.ts|quality measurement cache > keys duplicate-code cache by scan identity and strips changed-scope annotations`
  Proves:
- Duplicate cache identity depends on the measurement/backend and exact input identity, not policy or report settings; cache results remain separate from changed-scope annotation. The default marker becomes a Bun plus installed-jscpd identity without consumer install paths, distinct from the prior Node launcher and explicit commands.
