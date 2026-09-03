# quality-runtime

## Case AUX-CALLER-KEYED-JSON-CACHE-001: Caller-owned JSON cache isolates storage mechanics

Owner: `docs/api-mechanics.md#caller-keyed-json-cache`
Entities:

- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > validates a closed absolute input grammar before reading or computing`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > uses a digest-only identity and returns a parser-backed hit without recomputing`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > isolates namespace, payload version, and key identities`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > recovers malformed, mismatched, parser-rejected, and read-failed entries by computing once`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > rejects thenable parsers at runtime without writing an entry`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > counts only an EEXIST rename with a valid reread as stored`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > classifies an ordinary rename failure as failed without rereading a target`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > uses the same canonical payload/parser boundary for computation and cache hits`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > does not publish thrown, cancelled, noncanonical, or parser-rejected computations`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > keeps computed values when the target directory cannot be published`
- `bun|src/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > permits concurrent computation while exposing only a complete cached target`
  Proves:
- A closed absolute caller directory plus non-empty namespace, payload version and key identify one digest-only entry; raw key material is absent from names and envelopes, and namespace/version/key changes isolate values.
- The public parser type and runtime both reject thenable parser output. Only a complete envelope with matching identity, canonical object payload and synchronous caller parser is a hit. Missing, malformed, mismatched, parser-rejected or unreadable state computes exactly once; computed values pass the same detached canonical payload/parser boundary, while compute/parser failure never publishes an entry.
- Publication uses same-directory unique temporary files and atomic rename. Only a deterministic `EEXIST` target conflict can reread a complete valid target as stored; ordinary filesystem failure preserves the accepted computed value with `write: "failed"`. Concurrent misses may duplicate compute but only leave a complete readable target without lock, single-flight or global cache state.

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

## Case API-FINDING-PRESENTATION-001: Producing Checks own bounded Finding presentation

Owner: `docs/api-mechanics.md#finding-presentation`
Entities:

- `bun|src/check/finding-presentation.test.ts|Check Finding presentation > lets the producing Check own the visible limit and overflow navigation`
  Proves:
- The public helper formats only the caller-selected stable prefix, freezes its messages, and calls the overflow hook once with exact omitted/presented/total counts and the original omitted Finding references.
- A custom Check can choose a zero or positive limit and provide its actual full-detail location without Product knowledge of Finding shape or storage; an invalid limit fails before any Finding hook runs.

## Case WB-RUNTIME-CHECK-CONSOLE-001: Product settles Check console output without TTY interference

Owner: `docs/api-mechanics.md#check-输出与受管-progress`
Entities:

- `bun|src/project-run/check-execution/console-capture.test.ts|Package Run Check console capture > attributes concurrent console calls and presents them only after Check settlement`
- `bun|src/project-run/check-execution/console-capture.test.ts|Package Run Check console capture > retains preflight and execution console calls when the author callback throws`
  Proves:
- Concurrent awaited Check console calls remain attributed to their async Check contexts, become method-coded messages in canonical Check order, appear only in settled progress blocks, and leave no stale TTY running rows; progress-disabled Runs retain the same readback without direct console output, and the original host console method is restored after capture.
- One router is installed before preflight, reused by preflight and execution capture contexts, and restored only after resolved Check execution closes. Captured output preserves phase order and remains readable when execution throws, while author-provided preflight messages keep their relative place and terminal control bytes are escaped only by presentation.

## Case WB-RUNTIME-CHECK-CATALOG-001: Package Run validates and executes direct Checks

Owner: `docs/configuration.md#invocation-and-results`
Entities:

- `bun|src/project-run/run-controls.test.ts|Package Run > rejects invalid closed controls while a blocked preflight settles unavailable before execution`
- `bun|src/project-run/run-preflight-cancellation.test.ts|Package Run > returns execution cancellation when an admitted preflight aborts`
- `bun|src/project-run/run-callback-context.test.ts|Package Run > executes each normalized Check directly with the public callback context`
- `bun|src/project-run/check-execution/preflight-failures.test.ts|Package Run direct Check execution > fails closed for thrown, malformed, and noncanonical preflight results`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > runs each independent preflight inside its admitted Task lifecycle`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > rejects invalid flag input before any Check callback`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > provides canonical immutable callback snapshots`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables all mode only when every configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables any mode when at least one configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables none mode only when no configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables not-all mode when at least one configured flag is absent`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
  Proves:
- Package Run validates closed definitions and controls before execution callbacks or outputs, rejecting unknown Run control keys. Its invocation control barrier checks cancellation and all declarative flag conditions before Scheduler admission; nonmatching Checks settle without author work. An admitted remaining Check runs optional preflight with detached frozen authored options and the invocation signal before its own callback; independent admitted Tasks can prepare concurrently, while block, throw, malformed messages/descriptors, and noncanonical prepared/fallback values settle only the owning Check unavailable without callback execution. Cancellation closes the execution phase without admitting new author work. Every ready executable Check receives only its public context, whose `project` value contains normalized `root` and canonical `flags`; trusted preflight/execution callbacks stay outside frozen facts, and Run derives no aggregate unless controls explicitly select one.
- The mapped `flags.test.ts` entities specifically prove pre-callback rejection for invalid flag input, the canonical immutable `project.flags` callback snapshot, and all four declarative `enabledByFlags` predicates. Matching conditions execute the ordinary task-local preflight/callback path; nonmatching conditions settle before author work and enter the Scheduler as pre-admission non-passed Task results.

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

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Direct Check relations run through the shared graph

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/run-planning.test.ts|Package Run > rejects an invalid projected Check relation graph before any Check callback runs`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > runs each independent preflight inside its admitted Task lifecycle`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables all mode only when every configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables any mode when at least one configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables none mode only when no configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables not-all mode when at least one configured flag is absent`
  Proves:
- Direct executable Checks project both `dependsOn` and `observes` into one statically validated shared graph before any author work. Invocation flag control settlements remain Tasks in that graph as pre-admission terminal results and are not admitted again; task-local preflight is admitted work subject to direct relation readiness, mutex, capacity, priority and cancellation rather than a Definition-order preflight barrier.
- A nonmatching `enabledByFlags` predicate settles `not-applicable / flag-condition-not-matched` before author work. It blocks `dependsOn` consumers as a non-passed prerequisite while remaining visible to explicit `observes` consumers; matching predicates execute the normal preflight/callback path.

## Case WB-RUNTIME-DEPENDENCY-BLOCKING-001: Non-passed prerequisites settle dependents without author work

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > blocks success dependents before their preflight and lets observers read the terminal result`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > settles every direct non-passed prerequisite before dependent author work`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables all mode only when every configured flag is present`
  Proves:
- A `failed`, `not-applicable`, or `unavailable` direct `dependsOn` outcome prevents both the dependent preflight and callback. Product, rather than the generic Scheduler, then closes that Check as `unavailable` with `dependency-not-passed`, only stable direct blocker IDs, no author message/Record, and `null` duration.
- Prerequisite blocking does not cancel the invocation or suppress an explicit observer; cancellation-before-start and generic executor failure remain separate scheduler boundaries.

## Case WB-RUNTIME-DEPENDENCY-OBSERVATION-001: Observers read direct terminal outcomes

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/run-dependency-data.test.ts|Package Run > observes an unavailable Check and exposes its read failure`
- `bun|src/project-run/check-execution/resolved-checks.dependencies.test.ts|Package Run direct Check execution > waits for direct observations and limits readback to direct relations`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > makes a scheduler-blocked outcome available to its terminal observer`
  Proves:
- `observes` waits for each direct Check to reach any of the four terminal outcomes and then admits ordinary author work. Callback-local `get` and `list` authorize exactly the normalized direct union of `dependsOn` and `observes`: passed/failed retain canonical data, unavailable/not-applicable retain the closed data-read failure, and list values are frozen in stable ID order without ambient, transitive or scheduler-history access.

## Case WB-RUNTIME-CHECK-DURATION-001: Product Run closes private lifecycle and duration facts

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > hands final Check-facts outcomes and one finite duration to the private lifecycle`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > settles cancellation-before-start Checks without starting them`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > blocks success dependents before their preflight and lets observers read the terminal result`
- `bun|src/project-run/progress-rendering/timing.test.ts|Package Run progress timing > uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations`
  Proves:
- Package Run emits private started/settled facts only from its Check execution boundary: executed Checks settle with their final Check-facts outcome and a finite duration, while cancellation-before-start and Product-owned prerequisite-blocked Checks settle without a start and use `null`/`not run` duration.
- The final duration summary follows canonical snapshot order and identity even when lifecycle completion order follows parallel settlement; a single monotonic invocation interval supplies elapsed time rather than summing overlapping Check durations.

## Case CHECK-SCOPED-CONCURRENCY-001: Check parallel limits use the shared engine

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > recomputes tighter-scope selection after capacity becomes available`
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

Owner: `docs/checks/markdown-link-validation.md#效果与结果`
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

Owner: `docs/checks/maintenance-reminders.md#效果与结果`
Entities:

- `bun|src/package-checks/maintenance-reminders/first-parent-activity.test.ts|maintenance reminders > measures committed first-parent activity while ignoring worktree changes and folds due entries`
- `bun|src/package-checks/maintenance-reminders/first-parent-special-history.test.ts|maintenance reminders > uses first-parent merge diffs, reverts, binary and rename activity`
- `bun|src/package-checks/maintenance-reminders/history-failure-assessments.test.ts|maintenance reminders > classifies Git history failures as complete advisory or enforcing assessments`
- `bun|src/package-checks/maintenance-reminders/progress-and-cancellation.test.ts|maintenance reminders > renders due reminders through progress and retains their message readback`
- `bun|src/package-checks/maintenance-reminders/progress-and-cancellation.test.ts|maintenance reminders > keeps cancellation as a whole-Check unavailable boundary`
  Proves:
- One owning Check measures only committed first-parent activity after each base, excludes worktree/index delta and base itself, sums Git numstat additions/deletions, and treats merge, revert, binary, rename, and strict thresholds as declared by the quality owner.
- Every measurable entry retains a parser-validated ordered clear/due assessment. A Git measurement failure retains a complete unavailable assessment with an actionable `reason`, plus an advisory warning or enforcing error/failure, rather than being mistaken for clear or discarded; due messages remain visible through progress and `RunResult.checkMessages`; cancellation instead closes the whole Check unavailable with an actionable error because no complete payload is formed.

## Case WB-RUNTIME-SCHEDULER-PERFORMANCE-DIAGNOSTICS-001: Enabled Scheduler diagnostics retain bounded honest timing projections

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics.test.ts|Scheduler performance diagnostics > keeps control-path and decision observation separate while integrating real running slots`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics.test.ts|Scheduler performance diagnostics > bounds top admission delays and breaks equal delays by Task ID`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-waits.test.ts|Scheduler performance diagnostics > records an accepted explicit policy wait`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-waits.test.ts|Scheduler performance diagnostics > retains an accepted wait count when timing becomes unavailable`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-boundaries.test.ts|Scheduler performance diagnostics > distinguishes a valid zero-span summary from unavailable timing and retains discrete facts`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-waits.test.ts|Scheduler performance diagnostics > excludes a passive running drain with a null proposal`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-boundaries.test.ts|Scheduler performance diagnostics > contains terminal writer failures`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-terminal.test.ts|Scheduler performance diagnostics terminal drains > contains a policy diagnostic writer failure while draining admitted work`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-terminal.test.ts|Scheduler performance diagnostics terminal drains > emits exactly one summary after caller cancellation drains admitted work`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > hands enabled diagnostics to the Scheduler for one terminal human summary`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > does not sample Scheduler diagnostics when diagnostic logging is disabled`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-hooks.test.ts|Scheduler measurement hooks > awaits ordered hooks over one immutable terminal context without exposing Task values`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-hooks.test.ts|Scheduler measurement hooks > continues after synchronous and asynchronous hook failures`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-hooks.test.ts|Scheduler measurement hooks > delivers the internal summary Hook before caller Hooks through one runner`
- `bun|src/project-run/task-scheduler/scheduler-performance-diagnostics-hooks.test.ts|Scheduler measurement hooks > contains summary writer failure while preserving caller Hook failure delivery`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler measurement Hook output > keeps settled facts while making Hook failures visible`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler measurement Hook output > marks all successfully settled configured Hooks as succeeded`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler measurement Hook output > preserves execution cancellation when a measurement Hook fails after drain`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler measurement Hook output > preserves an admission-policy failure when a measurement Hook fails after drain`
  Proves:
- An explicitly enabled Scheduler-only diagnostic handoff emits one bounded human summary after terminal drain. It separates shell control work from decision observation, integrates Scheduler slot/capacity state without claiming wall/CPU utilization, and records accepted policy waits rather than passive drains.
- For pending Tasks whose prerequisites completed and observations settled, each interval classifies every Task exactly once as mutex-blocked, capacity-blocked, or currently admissible. The corresponding task·ms and peaks expose queue pressure; each reported top admission delay uses the same three components to construct its complete delay without inferring a policy reason.
- The last admission boundary's logical post-state active snapshot retains its complete discrete count and at most three settlement-delta contributors, including the newly admitted Task. These contributors explain the observed completion tail but do not claim dependency critical-path ownership. The invocation-owned declarative fingerprint remains only a declarative-configuration matching signal and does not identify RunControls, code/candidate/tool/runtime/host, terminal outcomes, or a custom callback.
- Named scripted clock phases distinguish valid zero spans from invalid clock samples; timing failure retains the fingerprint, admitted and accepted-wait counts, max-running, last-settled Task ID, queue peaks, and tail active count without fabricating time. Only when the policy is static, diagnostics are disabled, and the caller Hook list is empty does Scheduler add no measurement collector or clock reads; a custom policy needs decision-boundary measurement even without terminal consumers. Summary writer failures cannot revise the settled Scheduler result.
- Internal default summary Hook and each caller measurement Hook share one ordered terminal runner; the default wrapper contains writer failure before caller failure/output policy applies. Each caller measurement Hook receives the same recursively frozen terminal context after admission stops and started work drains. It exposes canonical graph, admitted/settled kind-only observations, and first-order raw measurement without Task values/errors/callbacks, summary top-N projections, mutable internals, or an interval event log. Sync/async generic Hooks run in configuration order and all settle. When they are the only output participants, their all-successful sequence marks `measurementHooks` succeeded; a generic throw/rejection still gives later generic Hooks their chance and marks the aggregate failed. A normal completed Run with that failure becomes the facts-preserving `scheduler-measurement-hooks-failed` output result; cancellation and admission-policy failure retain their primary result/diagnostic with the Hook status still visible.

## Case WB-RUNTIME-SCHEDULER-HISTORY-001: Local Scheduler history remains bounded and failure-contained

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts|scheduler history and prediction > persists bounded admitted Task samples without retaining authored inputs`
- `bun|src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts|scheduler history and prediction > isolates missing, malformed, incompatible, failed, and concurrent local state`
- `bun|src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts|scheduler history and prediction > evicts the oldest series by observation sequence`
- `bun|src/project-run/invocation.learned-scheduling.test.ts|Package Run learned Scheduler admission > learns admitted Task durations through a project-root-relative state directory`
- `bun|src/project-run/invocation.learned-scheduling.test.ts|Package Run learned Scheduler admission > emits bounded learned diagnostics and contains local history write failure`
Proves:

- The Product-private local history accepts only valid admitted-to-settled intervals, retains settlement kind and monotonic observation sequence, keeps at most 32 samples per identity and 4096 recently updated identities, and persists digest-only closed state through same-directory atomic replacement.
- Missing, malformed, incompatible, and read-failed state forms an empty learned model; post-drain write failure and concurrent last-writer activity only reduce future samples. None exposes partial JSON or retains authored options and effective flags. The Architecture/API owner, not this Case, defines the distinct static fallback when prediction cannot be formed.

## Case WB-RUNTIME-SCHEDULER-PREDICTION-001: Frozen duration predictions use a deterministic bounded prior

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts|scheduler history and prediction > persists bounded admitted Task samples without retaining authored inputs`
- `bun|src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts|scheduler history and prediction > uses learned means before a median project prior and a cold-start fallback`
Proves:

- An identity derived from model version, Check ID, canonical authored options, and canonical effective flags yields a frozen digest-only prediction snapshot. Its learned estimates retain sample count, arithmetic mean, and nearest-rank p90 without retaining source options or flags.
- The snapshot selects learned estimates first, then one median of the Run's learned estimates for unknown Tasks, and finally common positive cold-start weight `1`; unavailable timing does not revise it or create a sample.

## Case WB-RUNTIME-SCHEDULER-CRITICAL-PATH-001: Directed readiness relations form one reverse critical-path score

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/critical-path-ranking.test.ts|critical-path ranking > scores both dependency and observation downstream paths once`
Proves:

- Before admission, the immutable score table adds each Task estimate to the maximum direct downstream score across both `dependsOn` and `observes` relations; it is frozen and does not reinterpret Task priority or runtime capacity facts.

## Case WB-RUNTIME-SCHEDULER-LEARNED-ADMISSION-001: Learned admission preserves generic Scheduler legality

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/learned-critical-path-admission-policy.test.ts|learned critical-path task engine > forms one frozen ranking and complete policy from immutable graph and prediction`
- `bun|src/project-run/task-scheduler/learned-critical-path-admission-policy.test.ts|learned critical-path task engine > uses score, effective priority, and canonical order within each existing selection layer`
- `bun|src/project-run/task-scheduler/learned-critical-path-admission-policy.test.ts|learned critical-path task engine > keeps the Scheduler capacity wait guard when the highest score cannot admit`
- `bun|src/project-run/invocation.learned-scheduling.test.ts|Package Run learned Scheduler admission > learns admitted Task durations through a project-root-relative state directory`
Proves:

- Learned scheduling captures its immutable graph/prediction into one frozen critical-path score table and complete Scheduler policy before admission, then compares score descending only within the existing tightening, constrained-continuation, and ordinary layers; equal scores retain effective priority and canonical Task-ID order.
- The pure policy returns `wait` for a capacity-blocked preferred Task, leaving relation, mutex, capacity, cancellation, and drain hard guards to the generic Scheduler. Terminal raw measurement is consumed privately after drain and is not added to `RunResult`.

## Case WB-RUNTIME-SCHEDULER-LEARNED-DIAGNOSTICS-001: Learned optimization observations stay bounded and non-quality-bearing

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/invocation.learned-scheduling.test.ts|Package Run learned Scheduler admission > emits bounded learned diagnostics and contains local history write failure`
Proves:

- Learned diagnostics report bounded read/write and selected-admission facts without raw authored options, effective flags, identity inputs, or samples. A local history write failure remains an optimization-only observation and preserves the completed quality result.

## Case WB-RUNTIME-ADMISSION-STRATEGY-LIFECYCLE-001: Invocation-scoped strategies preserve terminal delivery

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/admission-strategy-provider/provider.test.ts|admission strategy provider > prepares one closed static, custom, or learned-fallback policy without widening public configuration`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > prepares once, decides synchronously, and completes after terminal Hooks on normal execution`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > completes after terminal Hooks when cancellation drains started work`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > completes after terminal Hooks when an admission policy fault drains`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > does not complete when pre-terminal task-engine setup fails`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps a prepared completion output enabled but not-run without a sealed context`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps prepared policy closures independent across overlapping Runs`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > runs a public prepared strategy once and completes after generic terminal Hooks`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps public prepared closures isolated across overlapping Runs`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > fails public preparation before Scheduler start and preserves its output boundary`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > aggregates public completion failures without rewriting a sealed primary result`
- `bun|src/project-run/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > enables measurement output only for generic Hooks or an actual prepared completion`
- `bun|src/project-run/invocation.learned-scheduling.test.ts|Package Run learned Scheduler admission > prepares before admission and records only after terminal measurement Hooks settle`
- `bun|src/project-run/invocation.learned-scheduling.test.ts|Package Run learned Scheduler admission > records a cancelled Run only after its terminal measurement Hook settles`
Proves:

- Graph-ready public prepared authoring prepares once per Run from frozen graph facts and returns an isolated closure; normal, cancelled and admission-policy-failed Runs keep Scheduler decisions synchronous and deliver completion at most once after admission stops, started work drains and generic terminal Hooks settle. Preparation failure forms `admission-strategy-preparation-failed` before Scheduler start; pre-terminal task-engine failure has no completion delivery.
- Generic Hooks all receive their chance before public complete. Their actual settlement, plus optional complete, is the sole input to the existing measurement output: generic-only no-context stays enabled/`not-run`; simple and prepared-without-complete do not independently enable it; a completion failure cannot overwrite sealed primary facts, and later complete success cannot overwrite a generic failure.
- A learned strategy prepares its immutable prediction before Scheduler decisions and records its terminal sample only after terminal delivery. This private lifecycle remains contained while public simple/prepared authoring provides the closed public lifecycle.
