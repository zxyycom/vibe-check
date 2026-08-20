# quality-runtime

## Case WB-RUNTIME-CHECK-RECORD-001: Check and Record foundation is exact and closed
Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > emits exact versioned canonical UTF-8 JSON bytes and rejects non-JSON values`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > rejects accessors before changing getters can corrupt canonical bytes`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > redacts credential TypeErrors thrown by Proxy reflection traps`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > redacts ordinary errors thrown by Proxy reflection traps`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > normalizes semantic subjects explicitly without case or whitespace folding`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > matches exact golden record identity bytes and ID`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > excludes location and message while identity fields change recordId`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > canonicalizes catalog order and fixes the exact fingerprint`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > keeps producer candidates free of Core ownership and lifecycle provenance`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > accepts only closed foundation descriptors with check-qualified record type identities`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > accepts exactly one closed terminal outcome for each Core Check`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot without lifecycle projections`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects CheckDefinition accessors without executing them`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > redacts credential Proxy traps before foundation validation reads fields`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > validates unknown into a closed detached deeply readonly quality record`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects unknown fields private material functions and invalid finite primitives`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > requires a known non-not-applicable owner and canonical entity order`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > accepts only closed Check reason envelopes and exact snapshot fields`
Proves:
- Definition descriptors and producer candidates admit only serializable public Check/Record data; execution data and ownership stay outside the candidate shape.
- Canonical bytes, record identity, and declarative fingerprints are deterministic and reject accessors, proxies, and non-JSON values without sensitive disclosure.
- A Core Check has exactly one closed `completed`, `not-applicable`, or `unavailable` outcome, with the public `status` and `reason` envelopes, and a snapshot contains only canonical Checks and Records.

## Case WB-RUNTIME-CHECK-CATALOG-001: Package Run validates and executes the canonical direct catalog
Owner: `docs/architecture.md#definition-boundary`
Entities:
- `bun|src/product/run/index.test.ts|Package Run > rejects invalid closed controls and definitions before any Check callback`
- `bun|src/product/run/index.test.ts|Package Run > executes each normalized Check directly with the public callback context`
- `bun|src/product/run/flags.test.ts|Package Run flags > rejects invalid flag input before any Check callback`
- `bun|src/product/run/flags.test.ts|Package Run flags > provides canonical immutable callback snapshots`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > publishes the direct Check snapshot without retaining executable callbacks`
Proves:
- Package Run validates closed definition and controls before calling project code, invokes every normalized executable Check with only its public context, and excludes executable callbacks from frozen/public facts.
- The two `flags.test.ts` entities specifically prove pre-callback rejection for invalid flag input and the canonical immutable `project.flags` callback snapshot.

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: Each executable Check closes as one Core fact
Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes only canonical Check and Record facts`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > maps not-applicable records and unresolved scopes to Product unavailable outcomes`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > contains invalid callback outcomes and record misuse in the Check outcome`
Proves:
- Every registered Check closes exactly once. Deliberate not-applicable, normal completion, malformed callback result, invalid record use, and unresolved cancellation all use the current status/reason outcome boundary rather than a second lifecycle model.

## Case WB-RUNTIME-RECORD-MANAGER-001: Check-owned reporters retain trustworthy Records and references
Owner: `docs/quality-metrics.md#check-and-record-facts`
Entities:
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > binds record ownership, retains independent Records, and gives record failures precedence`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > allows references only to committed records and rejects duplicate or late lifecycle changes`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > commits Check-owned records and closes its reporter when the callback settles`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > retains a valid optional comparison candidate when no selected policy requires it`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > retains one complete reference candidate by resolving the already committed Record identity`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > does not retain a reference candidate from a contradictory not-applicable callback`
Proves:
- The reporter binds Check ownership and declared record types, preserves accepted independent Records, and closes with its Check. Valid comparison candidates are retained independently of whether the selected policy requests their evidence; references can identify only already committed Records, and duplicate, invalid, or late activity cannot revise frozen facts.

## Case WB-RUNTIME-CHECK-FAILURE-001: Product contains ordinary callback failures safely
Owner: `docs/architecture.md#execution-boundary`
Entities:
- `bun|src/product/run/index.core.test.ts|Package Run core integration > contains invalid callback outcomes and record misuse in the Check outcome`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > turns malformed or uncommitted reference relations into the contained reference-invalid outcome`
Proves:
- Ordinary malformed results, record misuse, and invalid reference relations become the owning unavailable Check outcome. A completed quality failure remains `status: "completed"` with `verdict: "failed"`; trusted invariant faults are not forged as public Check facts.

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
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > settles blocked Checks without starting them and records not-run duration`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > closes cancelled-before-start Checks as execution-cancelled without starting them`
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
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes only canonical Check and Record facts`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot without lifecycle projections`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > requires a known non-not-applicable owner and canonical entity order`
Proves:
- A frozen snapshot contains canonical `checks` and `records` only. Policy, publication, callbacks, scanner payloads, and scheduler state are not a third fact source.

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
