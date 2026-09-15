# quality-runtime

## Case AUX-CALLER-KEYED-JSON-CACHE-001: Caller-owned JSON cache isolates storage mechanics

Owner: `docs/guides/cache-results.md#缓存计算结果`
Entities:

- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > validates a closed absolute input grammar before reading or computing`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > uses a digest-only identity and returns a parser-backed hit without recomputing`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > isolates namespace, payload version, and key identities`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > recovers malformed, mismatched, parser-rejected, and read-failed entries by computing once`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > rejects thenable parsers at runtime without writing an entry`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > counts only an EEXIST rename with a valid reread as stored`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > classifies an ordinary rename failure as failed without rereading a target`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > uses the same canonical payload/parser boundary for computation and cache hits`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > does not publish thrown, cancelled, noncanonical, or parser-rejected computations`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > keeps computed values when the target directory cannot be published`
- `bun|src/package-tools/cache/cache-json-by-key.test.ts|caller-keyed JSON cache > permits concurrent computation while exposing only a complete cached target`
  Proves:
- A closed absolute caller directory plus non-empty namespace, payload version and key identify one digest-only entry; raw key material is absent from names and envelopes, and namespace/version/key changes isolate values.
- The public parser type and runtime both reject thenable parser output. Only a complete envelope with matching identity, canonical object payload and synchronous caller parser is a hit. Missing, malformed, mismatched, parser-rejected or unreadable state computes exactly once; computed values pass the same detached canonical payload/parser boundary, while compute/parser failure never publishes an entry.
- Publication uses same-directory unique temporary files and atomic rename. Only a deterministic `EEXIST` target conflict can reread a complete valid target as stored; ordinary filesystem failure preserves the accepted computed value with `write: "failed"`. Concurrent misses may duplicate compute but only leave a complete readable target without lock, single-flight or global cache state.

## Case API-DATA-BOUNDARIES-001: Public data snapshots close only the outer structure

Owner: `docs/guides/data-boundaries.md#闭合快照`
Entities:

- `bun|src/data-boundary/closed-values.test.ts|public closed data snapshots > accepts only exact own data shapes without evaluating accessors or reflection failures`
- `bun|src/data-boundary/closed-values.test.ts|public closed data snapshots > accepts only dense standard arrays and keeps items as shallow references`
  Proves:
- `snapshotExactClosedRecord` accepts only the caller-declared exact own data-key set and rejects missing/extra fields, accessor authoring and contained reflection faults without evaluating an accessor.
- `snapshotClosedArray` accepts only dense standard arrays without extra own fields or accessors. Both helpers freeze only the outer container: callbacks retain their identity, own properties and array elements containing `undefined` remain present, and nested objects retain their identity and mutability.

## Case API-CANONICAL-JSON-001: Canonical JSON tools create independent data and deterministic representations

Owner: `docs/guides/data-boundaries.md#canonical-json`
Entities:

- `bun|src/data-boundary/canonical-data.test.ts|check-record canonical data > emits detached deep-frozen canonical UTF-8 JSON for safe values`
- `bun|src/data-boundary/canonical-data.test.ts|check-record canonical data > rejects accessors, sparse arrays, and reflection failures without invoking author hooks`
  Proves:
- Canonicalization creates detached, recursively frozen data with null-prototype objects; later mutations of input objects do not change the result.
- Text and UTF-8 bytes use lexical key order, including numeric keys whose `JSON.stringify` order differs. A structurally typed `CanonicalJsonPrimitive` can hold `NaN`, but runtime normalization rejects it.
- Accessors are rejected without executing their getters; sparse arrays, non-JSON values and throwing reflection traps fail normalization or serialization.

## Case WB-RUNTIME-CHECK-RECORD-001: Check and Record foundation is exact and closed

Owner: `docs/development/check-results.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/facts.test.ts|check-record foundation model > accepts exactly one four-state terminal outcome for each Core Check`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > materializes canonical final and Record data without evaluating author properties`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > accepts only closed Check definitions`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects Check definition accessors without executing them`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > creates detached frozen final and Record facts from canonical input`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- Check definitions, final data, and Record data admit only closed canonical JSON facts; callback execution and reporter ownership stay outside the frozen snapshot.
- Accepted final and Record data are detached, deep-frozen, null-prototype facts; invalid data is rejected without evaluating accessors.
- A Check-facts Check has exactly one closed `passed`, `failed`, `not-applicable`, or `unavailable` outcome, and a snapshot contains only canonical Checks and structural `(checkId, id)` Records.

## Case API-FINDING-WAIVER-RECONCILIATION-001: Public helper reconciles caller-defined finding identities

Owner: `docs/guides/finding-waivers.md#对账-finding-waiver`
Entities:

- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > matches caller-defined structural identities, preserves reasons, and audits unused waivers`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > materializes waiver identity and reason without copying caller findings`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > does not waive findings when one caller-defined identity matches more than once`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > rejects malformed and hostile waiver boundaries without invoking caller accessors`
  Proves:
- The public helper reconciles each configured waiver against the complete caller-provided finding collection by caller-defined canonical structural identity, preserving finding order and original finding references. Zero, one, and multiple matches respectively produce unused, applied, and overmatched audit outcomes; overmatched identities do not waive findings.
- Applied evidence is a detached, deep-frozen materialization of the authored waiver rather than a mutable authored object. Duplicate, malformed, noncanonical, or hostile waiver authoring and invalid finding identity fail with `TypeError` without invoking author accessors.

## Case API-FINDING-PRESENTATION-001: Producing Checks own bounded Finding presentation

Owner: `docs/guides/presenting-findings.md#输入与投影`
Entities:

- `bun|src/package-tools/finding-presentation/finding-presentation.test.ts|Check Finding presentation > lets the producing Check own the visible limit and overflow navigation`
  Proves:
- The public helper formats only the caller-selected stable prefix, freezes its messages, and calls the overflow hook once with exact omitted/presented/total counts and the original omitted Finding references.
- A custom Check can choose a zero or positive limit and provide its actual full-detail location without Product knowledge of Finding shape or storage; an invalid limit fails before any Finding hook runs.

## Case WB-RUNTIME-CHECK-CONSOLE-001: Product settles Check console output without TTY interference

Owner: `docs/development/human-output.md#check-console-capture-maintenance`
Entities:

- `bun|src/project-run/check-execution/console-capture.test.ts|Package Run Check console capture > attributes concurrent console calls and presents them only after Check settlement`
- `bun|src/project-run/check-execution/console-capture.test.ts|Package Run Check console capture > retains preparation and execution console calls when the author callback throws`
  Proves:
- Concurrent awaited Check console calls remain attributed to their async Check contexts, become method-coded messages in canonical Check order, appear only in settled progress blocks, and leave no stale TTY running rows; progress-disabled Runs retain the same readback without direct console output, and the original host console method is restored after capture.
- One router is installed before preparation, reused by preparation and execution capture contexts, and restored only after resolved Check execution closes. Captured output preserves phase order and remains readable when execution throws, while author-provided preparation messages keep their relative place and terminal control bytes are escaped only by presentation.

## Case WB-RUNTIME-CHECK-CATALOG-001: Package Run validates and executes direct Checks

Owner: `docs/development/project-run.md#invocation-and-results`
Entities:

- `bun|src/project-run/run-controls.test.ts|Package Run > rejects invalid closed controls while a blocked preparation settles unavailable before execution`
- `bun|src/project-run/run-preparation-cancellation.test.ts|Package Run > returns execution cancellation when an admitted preparation aborts`
- `bun|src/project-run/run-callback-context.test.ts|Package Run > executes each normalized Check directly with the public callback context`
- `bun|src/project-run/check-execution/preparation-failures.test.ts|Package Run direct Check execution > fails closed for thrown, malformed, and noncanonical preparation results`
- `bun|src/project-run/check-execution/task-local-preparation.test.ts|Package Run direct Check execution > runs each independent preparation inside its admitted Task lifecycle`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > rejects invalid flag input before any Check callback`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > provides canonical immutable callback snapshots`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables all mode only when every configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables any mode when at least one configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables none mode only when no configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables not-all mode when at least one configured flag is absent`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > rejects caller attempts to supply Product-reserved change flags before preparation`
- `bun|src/project-run/check-execution/flag-dependency-selection.test.ts|Package Run flag dependency selection > keeps matching roots direct unless their author opts into dependency propagation`
- `bun|src/project-run/check-execution/flag-dependency-selection.test.ts|Package Run flag dependency selection > starts each opt-in root dependency closure without selecting observations`
- `bun|src/project-run/check-execution/flag-dependency-selection.test.ts|Package Run flag dependency selection > expands a direct-selected dependency when an opt-in root requires its prerequisite`
- `bun|src/project-run/check-execution/flag-dependency-selection.test.ts|Package Run flag dependency selection > leaves pre-work cancellation ahead of flag dependency selection`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > reuses effective flag selection for explicit aggregation`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > collects every Git delta once, retains rename and deletion paths, and matches frozen regions`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > retains a trustworthy zero-match snapshot without deriving a flag`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > keeps unavailable evidence distinct while conservatively enabling every declared flag`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > rejects raw Git paths that could masquerade as region path separators`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > scopes every Git delta to a nested project root and retains only its side of cross-root renames`
- `bun|src/project-run/project-changes-lifecycle.test.ts|Package Run project changes > uses one frozen change result for preparation and execution while selecting with derived flags`
- `bun|src/project-run/project-changes-lifecycle.test.ts|Package Run project changes > keeps unavailable evidence honest while conservatively selecting change-enabled checks`
- `bun|src/project-run/project-changes-lifecycle.test.ts|Package Run project changes > rejects option-like Git comparisons before preparation or execution`
  Proves:

- Package Run closes definitions and controls before callbacks or outputs. Its control barrier checks cancellation and declarative conditions before Scheduler admission; nonmatching Checks settle without author work. An admitted Check runs optional preparation with detached frozen options and the invocation signal before its callback. Block, throw, malformed messages/descriptors, and noncanonical prepared/fallback values settle only the owning Check unavailable; cancellation admits no new author work.
- The mapped `flags.test.ts` entities prove pre-callback rejection for malformed flags and caller use of the `vibe-check:change:` namespace, plus immutable canonical `project.flags` snapshots and declarative `enabledByFlags` predicates. Matching opt-in roots activate their transitive `dependsOn` closure; activated dependencies may run despite their own unmet predicate. Directly selected intermediates still expand when required, shared prerequisites deduplicate, `observes` stays outside the closure, and pre-work cancellation remains earlier.
- The mapped Git/change lifecycle entities prove one frozen snapshot per invocation. It supplies the same `project.changes` to `prepare` and `execute`; its derived protected tokens union with caller tokens into the one canonical effective set that drives selection and both callbacks' `project.flags`. The Git fixture covers `compareWith` as a branch, commit hash, `HEAD~N`, or tag revision. A trustworthy zero match is `{ ok: true, files: [] }` and leaves only caller flags; unavailable Git evidence has no fabricated files but injects every declared change flag into that same effective set.
- Committed, staged, unstaged, untracked, rename and deletion paths deduplicate before frozen regions emit stable flag lists. For a nested project root, each Git delta is root-relative; a cross-root rename keeps only its in-root side. A raw Git path containing a backslash is not converted to slash form before validation, so it cannot masquerade as an excluded nested path; it follows the unavailable fallback. Option-like comparison revisions are Definition failures before preparation or execution author work.
- This private selection is not a member-list callback capability and does not enter stable RunResult, machine, or diagnostic fields. It remains distinct from explicit aggregation, which is derived only when controls select one.

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: Each executable Check closes as one Check-facts fact

Owner: `docs/development/check-results.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > maps unresolved scopes to Product unavailable outcomes while retaining accepted Records`
- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
  Proves:
- Every registered Check closes exactly once. Passed, failed, not-applicable, malformed callback result, invalid Record use, and unresolved cancellation all use the same four-state outcome boundary rather than a second lifecycle model.

## Case WB-RUNTIME-RECORD-MANAGER-001: Check-owned reporters retain trustworthy Records

Owner: `docs/development/check-results.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/session-record-misuse.test.ts|check-record Core Check session > binds structural Record ownership, retains prior Records, and contains invalid author writes`
- `bun|src/check-settlement/session-record-misuse.test.ts|check-record Core Check session > rejects malformed data and duplicate lifecycle closure without revising frozen facts`
- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/project-run/check-execution/resolved-checks.failure.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
  Proves:
- The reporter accepts only Check-local Record identity/data, preserves accepted independent Records, and closes with its Check. Duplicate, invalid, or late activity cannot revise frozen facts.

## Case WB-RUNTIME-CHECK-FAILURE-001: Product contains ordinary callback failures safely

Owner: `docs/development/project-run.md#check-执行与依赖交接`
Entities:

- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-execution/resolved-checks.failure.test.ts|Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`
- `bun|src/project-run/check-execution/resolved-checks.handoff-failure.test.ts|Package Run direct Check handoff execution > rejects malformed declared handoff results before a direct dependent can read them`
  Proves:
- Ordinary malformed results, malformed terminal-message attachments, malformed declared-handoff branches/references, and Record misuse become the owning unavailable Check outcome without a partial message or handoff escape. A quality failure is an explicit `status: "failed"` with canonical final data; trusted invariant faults are not forged as public Check facts.

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Direct Check relations run through the shared graph

Owner: `docs/development/project-run.md#check-执行与依赖交接`
Entities:

- `bun|src/project-run/run-planning.test.ts|Package Run > rejects an invalid projected Check relation graph before any Check callback runs`
- `bun|src/project-run/check-execution/task-local-preparation.test.ts|Package Run direct Check execution > runs each independent preparation inside its admitted Task lifecycle`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables all mode only when every configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables any mode when at least one configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables none mode only when no configured flag is present`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables not-all mode when at least one configured flag is absent`
  Proves:
- Direct executable Checks project both `dependsOn` and `observes` into one statically validated shared graph before any author work. Invocation flag control settlements remain Tasks in that graph as pre-admission terminal results and are not admitted again; task-local preparation is admitted work subject to direct relation readiness, mutex, capacity, priority and cancellation rather than a Definition-order preparation barrier.
- A nonmatching `enabledByFlags` predicate settles `not-applicable / flag-condition-not-matched` before author work. It blocks `dependsOn` consumers as a non-passed prerequisite while remaining visible to explicit `observes` consumers; matching predicates execute the normal preparation/callback path.

## Case WB-RUNTIME-DEPENDENCY-BLOCKING-001: Non-passed prerequisites settle dependents without author work

Owner: `docs/development/project-run.md#check-执行与依赖交接`
Entities:

- `bun|src/project-run/check-execution/task-local-preparation.test.ts|Package Run direct Check execution > blocks success dependents before their preparation and lets observers read the terminal result`
- `bun|src/project-run/check-execution/task-local-preparation.test.ts|Package Run direct Check execution > settles every direct non-passed prerequisite before dependent author work`
- `bun|src/project-run/controls/flags.test.ts|Package Run flags > enables all mode only when every configured flag is present`
  Proves:
- A `failed`, `not-applicable`, or `unavailable` direct `dependsOn` outcome prevents both the dependent preparation and callback. Product, rather than the generic Scheduler, then closes that Check as `unavailable` with `dependency-not-passed`, only stable direct blocker IDs, no author message/Record, and `null` duration.
- Prerequisite blocking does not cancel the invocation or suppress an explicit observer; cancellation-before-start and generic executor failure remain separate scheduler boundaries.

## Case WB-RUNTIME-DEPENDENCY-OBSERVATION-001: Observers read direct terminal outcomes

Owner: `docs/development/project-run.md#check-执行与依赖交接`
Entities:

- `bun|src/project-run/run-dependency-data.test.ts|Package Run > observes an unavailable Check and exposes its read failure`
- `bun|src/project-run/check-execution/resolved-checks.dependencies.test.ts|Package Run direct Check execution > waits for direct observations and limits readback to direct relations`
- `bun|src/project-run/check-execution/task-local-preparation.test.ts|Package Run direct Check execution > makes a scheduler-blocked outcome available to its terminal observer`
  Proves:
- `observes` waits for each direct Check to reach any of the four terminal outcomes and then admits ordinary author work. Callback-local `get` and `list` authorize exactly the normalized direct union of `dependsOn` and `observes`: passed/failed retain canonical data, unavailable/not-applicable retain the closed data-read failure, and list values are frozen in stable ID order without ambient, transitive or scheduler-history access.

## Case WB-RUNTIME-DEPENDENCY-HANDOFF-001: Direct prerequisites share accepted invocation-private references

Owner: `docs/development/project-run.md#check-执行与依赖交接`
Entities:

- `bun|src/project-run/check-execution/resolved-checks.handoff.test.ts|Package Run direct Check execution > delivers accepted provider handoffs only to direct dependents and clears them after each Run`
- `bun|src/project-run/check-execution/resolved-checks.handoff-diagnostics.test.ts|Package Run direct Check handoff execution > does not expose declared-provider handoffs in containment or cancellation diagnostics`
  Proves:
- A `handoff: true` provider publishes its original accepted `passed` reference only after canonical settlement. Same-Run direct `dependsOn` fan-out receives strict-equal identity together with Core-owned canonical data; direct `observes`, transitive consumers and post-graph retained readers fail closed without upstream data/reference.
- Every Run owns a distinct private store. Completion clears Product-held internal identity/value entries; this evidence proves no remaining Product read capability, not JavaScript GC, producer mutation safety or external resource disposal.
- Core containment and callback-after-callback cancellation diagnostics retain the `handoff: true` provider's stripped terminal result only; they never retain the private handoff reference or its values.

## Case WB-RUNTIME-CHECK-DURATION-001: Product Run closes private lifecycle and duration facts

Owner: `docs/development/project-run.md#check-执行与依赖交接`
Entities:

- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > hands final Check-facts outcomes and one finite duration to the private lifecycle`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > settles cancellation-before-start Checks without starting them`
- `bun|src/project-run/check-execution/task-local-preparation.test.ts|Package Run direct Check execution > blocks success dependents before their preparation and lets observers read the terminal result`
- `bun|src/project-run/progress-rendering/timing.test.ts|Package Run progress timing > uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations`
  Proves:
- Package Run emits private started/settled facts only from its Check execution boundary: executed Checks settle with their final Check-facts outcome and a finite duration, while cancellation-before-start and Product-owned prerequisite-blocked Checks settle without a start and use `null`/`not run` duration.
- Complete `RunResult.checkDurations` keeps canonical snapshot order and Check identity even when lifecycle completion order follows parallel settlement; a single monotonic invocation interval supplies elapsed time rather than summing overlapping Check durations.

## Case CHECK-SCOPED-CONCURRENCY-001: Check parallel limits use the shared engine

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > recomputes tighter-scope selection after capacity becomes available`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > does not activate a cap for a scope with no activation task`
  Proves:
- Effective Check parallel limits project to generic graph scope metadata. The shared engine uses the active minimum without preemption and does not make a non-executing scope consume capacity.

## Case WB-RUNTIME-CHECKPOINT-001: Frozen Check-facts snapshot is a two-entity projection

Owner: `docs/development/check-results.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- A frozen snapshot contains canonical `checks` and `records` only. The package-private settled Check seam reuses the same canonical final-data reference that the frozen snapshot projects; policy, publication, callbacks, scanner payloads, and scheduler state are not a third fact source.

## Case WB-RUNTIME-ADMISSION-GRAPH-001: Immutable AdmissionGraph shares Scheduler legality without control capability

Owner: `docs/guides/simulating-admission.md#模拟-admissiongraph`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/graph.test.ts|immutable admission graph > validates exact input and returns frozen opaque branching successors`
- `bun|src/project-run/task-scheduler/admission-core/graph.test.ts|immutable admission graph > uses canonical catalog order, dedicated validation reasons, binary settlements, and scope lifecycle`
- `bun|src/project-run/task-scheduler/admission-core/graph.capacity.test.ts|immutable admission graph capacity > keeps duplicate blocker payloads and global active-scope capacity for every candidate`
- `bun|src/project-run/task-scheduler/admission-core/graph.capacity.test.ts|immutable admission graph capacity > atomically holds and releases weighted claims across named resources`
- `bun|src/project-run/task-scheduler/admission-core/transitions.test.ts|admission core transitions > admission core settles in the selected implementation`
- `bun|src/project-run/task-scheduler/admission-core/transitions.test.ts|admission core transitions > keeps persistent forced-frontier priority and closed scope roots across a 80-by-80 cascade`
- `bun|src/project-run/task-scheduler/admission-core/trace.test.ts|admission core trace > traces public and private binary/failed/cancellation transitions through one reducer`
- `bun|src/project-run/task-scheduler/admission-core.scheduler-integration.test.ts|Scheduler admission core integration > replays canonical failed and forced effects through shell diagnostics and measurement`
- `bun|src/project-run/task-scheduler/admission-core/graph.test.ts|immutable admission graph > supplies callback lookahead without reserving or starting a real Task`
  Proves:
- The standalone and callback seeds expose one frozen opaque state contract. Its canonical catalog, inspection, validation precedence, binary settlement, forced block, scope lifecycle and named-resource occupancy return successors without mutating a retained predecessor. Static resource/claim input fails closed, and selection rejection reports every insufficient resource without granting reservation capability.
- The private trace invokes the same reducer for public and real-only failed/cancellation actions. An instrumented real Scheduler pairs every canonical effect with its immutable Core post-state; legacy snapshot mutex facts remain additive with dynamic holders through their settlement, and an 80-by-80 failed cascade keeps every newly ready child in descending declared-slot frontier order and retains a frozen closed-scope root. Direct running settlement precedes forced effects. For each forced blocked effect, the shell preserves this observable order: pending-measurement flush, matching immutable post-state, shell blocked settlement, state capture, blocked-effect record, conditional diagnostic projection, then Core observer. Custom policy measurements retain the direct-then-forced order; synthetic blocked diagnostics retain the direct failed-source `task-settled` trigger; terminal last-settled facts retain that order. Callback lookahead cannot start, reserve, settle or otherwise control real Task lifecycle, whose callback proposal remains Scheduler-hard-revalidated.

## Case WB-RUNTIME-ADMISSION-COMPILED-GRAPH-001: Prepared graph compilation retains Scheduler static indexes

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/compiled-graph.test.ts|prepared admission graph compiler > compiles static indexes from a prepared graph without rematerializing it`
  Proves:
- When invoked with a prepared graph, the Product-private compiler produces Scheduler lookup tables without rematerializing the graph or its frozen snapshot. Task/scope/mutex/resource declaration slots, capacities and per-Task claim units, duplicate mutex/relation occurrences, reverse dependency/observation/terminal mappings, activation membership and lexical public catalog order stay exact.
- `prepareTaskGraph` remains the only untrusted-input validation/normalization boundary. The compiler's root-cap assertion is a defensive invariant for prepared input, not a second validation path.
- The compiled object, its relation indexes, and tested slot lists retain their existing Object.freeze guards; this Case does not claim deep `Map` immutability or a public API. Forced reverse-slot priority and active-scope cap/ID ordering remain separately owned by the existing admission-core and Scheduler evidence.

## Case CHECK-NAMED-RESOURCE-CONCURRENCY-001: Check Tasks atomically share named resource capacity

Owner: `docs/guides/scheduling.md#限制-named-resource-并发`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/graph.capacity.test.ts|immutable admission graph capacity > atomically holds and releases weighted claims across named resources`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > limits named resource concurrency without withholding unrelated root slots`
  Proves:
- A Task acquires all weighted named-resource claims atomically at admission, holds them in the shared immutable state until satisfied, unsatisfied or failed settlement, and then releases every unit. Unknown and oversized claims fail static graph validation.
- The real static Scheduler admits no more resource consumers than configured capacity while still filling an available root slot with unrelated ready work. Its blocker observation distinguishes named-resource shortage, and a failed holder releases capacity for later work.

## Case AUX-MARKDOWN-LINK-OUTCOMES-001: Markdown Link settles safe complete outcomes

Owner: `docs/checks/markdown-link-validation.md#效果与结果`
Entities:

- `bun|src/package-checks/markdown-link-validation/execution-outcomes.test.ts|default Check direct callbacks > reports safe Markdown Link findings only after a complete traversal`
- `bun|src/package-checks/markdown-link-validation/cache-behavior.test.ts|default Check direct callbacks > uses an explicit parse-facts cache only as best-effort state`
- `bun|src/package-checks/markdown-link-validation/cache-behavior.test.ts|default Check direct callbacks > invalidates source and direct-target parse facts by exact content bytes`
- `bun|src/package-checks/markdown-link-validation/execution-outcomes.test.ts|default Check direct callbacks > reports a root-external target without persisting its path, fragment, or query`
- `bun|src/package-checks/markdown-link-validation/execution-outcomes.test.ts|default Check direct callbacks > validates a direct Markdown target outside source scope without scanning its links`
- `bun|src/package-checks/markdown-link-validation/unavailable-outcomes.test.ts|default Check direct callbacks > returns unavailable without publishing an earlier Markdown Link finding`
- `bun|src/package-checks/markdown-link-validation/unavailable-outcomes.test.ts|default Check direct callbacks > returns unavailable without publishing an earlier finding when target work reaches its limit`
- `bun|src/package-checks/markdown-link-validation/input-rejection.test.ts|Markdown Link input rejection > is not applicable only when its file selection selects no path`
- `bun|src/package-checks/markdown-link-validation/input-rejection.test.ts|Markdown Link input rejection > reports every selected non-Markdown path without making blocking policy fail`
- `bun|src/package-checks/markdown-link-validation/unavailable-outcomes.test.ts|default Check direct callbacks > returns unavailable when project root cannot be canonicalized before source discovery`
- `bun|src/package-checks/markdown-link-validation/unavailable-outcomes.test.ts|default Check direct callbacks > returns unavailable before source collection when its Run signal is already cancelled`
- `bun|src/package-checks/markdown-link-validation/unavailable-outcomes.test.ts|default Check direct callbacks > does not start parse-facts publication after cancellation without reporting stale findings`
  Proves:
- A completed traversal publishes only the documented safe local-reference Record projection and parser-validated exact final counts; root-external findings retain no destination material. The omitted finding policy defaults to non-blocking and retains the Records/final data in a passed outcome with an actionable warning, while explicit blocking retains the same evidence and settles failed with an actionable error. Enabled parse-facts cache hit, miss, hostile JSONL line, storage failure, and exact-byte source/target invalidation preserve the same Check settlement and do not create cache output facts. Cancellation before source work or before terminal publication remains unavailable with no link-finding Record. Completed normal/rejected findings additionally project at most ten Check-owned summaries plus an exact omitted count; those summaries retain source navigation and closed reason while never copying the unsafe destination.
- Every selected non-Markdown path publishes a fixed non-blocking rejection Record, contributes to the separate rejection and total finding counts, and cannot be made blocking by Link policy. All-rejected input is passed with a warning; only zero selected paths are not applicable.
- A direct root-contained target outside source scope can provide its own anchor facts but cannot recursively create more source work.
- Source/target limits, root canonicalization failure, and cancellation settle as `unavailable` with actionable Check-owned messages and no partial link-finding Records or final data; already classified rejection Records remain ordinary accepted facts. Zero selected input reaches `not-applicable` only after the root is usable.

## Case AUX-QUALITY-CACHE-001: Duplicate cache identity is stable

Owner: `docs/development/scanner-dependencies.md#cache-and-failures`
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

Owner: `docs/development/scheduler.md#measurement-collector-与-immutable-context`
Entities:

- `bun|src/project-run/task-scheduler/measurement/diagnostics.test.ts|Scheduler performance diagnostics > keeps control-path and decision observation separate while integrating real running slots`
- `bun|src/project-run/task-scheduler/measurement/diagnostics.test.ts|Scheduler performance diagnostics > bounds top admission delays and breaks equal delays by Task ID`
- `bun|src/project-run/task-scheduler/measurement/diagnostics.test.ts|Scheduler performance diagnostics > classifies a named resource wait as capacity blocked`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts|Scheduler performance diagnostics > records an accepted explicit policy wait`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts|Scheduler performance diagnostics > retains an accepted wait count when timing becomes unavailable`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-boundaries.test.ts|Scheduler performance diagnostics > distinguishes a valid zero-span summary from unavailable timing and retains discrete facts`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts|Scheduler performance diagnostics > excludes a passive running drain with a null proposal`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-boundaries.test.ts|Scheduler performance diagnostics > contains terminal writer failures`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-terminal.test.ts|Scheduler performance diagnostics terminal drains > contains a policy diagnostic writer failure while draining admitted work`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-terminal.test.ts|Scheduler performance diagnostics terminal drains > emits exactly one summary after caller cancellation drains admitted work`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > hands enabled diagnostics to the Scheduler for one terminal human summary`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > does not sample Scheduler diagnostics when diagnostic logging is disabled`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > awaits ordered hooks over one immutable terminal context without exposing Task values`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > continues after synchronous and asynchronous hook failures`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > delivers the internal summary Hook before caller terminal effects through one runner`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > contains summary writer failure while preserving caller terminal effect failure delivery`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > keeps settled facts while making Hook failures visible`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > marks all successfully settled configured Hooks as succeeded`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > preserves execution cancellation when a terminal effect fails after drain`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > preserves an admission-policy failure when a terminal effect fails after drain`
  Proves:
- An explicitly enabled Scheduler-only diagnostic handoff emits one bounded human summary after terminal drain. It separates shell control work from decision observation, integrates Scheduler slot/capacity state without claiming wall/CPU utilization, and records accepted policy waits rather than passive drains.
- For pending Tasks whose prerequisites completed and observations settled, each interval classifies every Task exactly once as mutex-blocked, capacity-blocked, or currently admissible. Root, scoped and named-resource shortages share the capacity-blocked class. The corresponding task·ms and peaks expose queue pressure; each reported top admission delay uses the same three components to construct its complete delay without inferring a policy reason.
- The last admission boundary's logical post-state active snapshot retains its complete discrete count and at most three settlement-delta contributors, including the newly admitted Task. These contributors explain the observed completion tail but do not claim dependency critical-path ownership. The invocation-owned declarative fingerprint remains only a declarative-configuration matching signal and does not identify RunControls, code/candidate/tool/runtime/host, terminal outcomes, or a custom callback.
- Named scripted clock phases distinguish valid zero spans from invalid clock samples; timing failure retains the fingerprint, admitted and accepted-wait counts, max-running, last-settled Task ID, queue peaks, and tail active count without fabricating time. Only when the policy is static, diagnostics are disabled, and the caller terminal effect list is empty does Scheduler add no measurement collector or clock reads; a custom policy needs decision-boundary measurement even without terminal consumers. Summary writer failures cannot revise the settled Scheduler result.
- Internal default summary Hook and each caller terminal effect share one ordered terminal runner; the default wrapper contains writer failure before caller failure/output policy applies. Each caller terminal effect receives the same recursively frozen terminal context after admission stops and started work drains. It exposes canonical graph, admitted/settled kind-only observations, and first-order raw measurement without Task values/errors/callbacks, summary top-N projections, mutable internals, or an interval event log. Sync/async generic terminal effects run in configuration order and all settle. When they are the only output participants, their all-successful sequence marks `terminalEffects` succeeded; a generic throw/rejection still gives later generic terminal effects their chance and marks the aggregate failed. A normal completed Run with that failure becomes the facts-preserving `scheduler-terminal-effects-failed` output result; cancellation and admission-policy failure retain their primary result/diagnostic with the Hook status still visible.

## Case WB-RUNTIME-SCHEDULER-HISTORY-001: Local Scheduler history remains bounded and failure-contained

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts|scheduler duration recording > retains bounded admitted samples`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts|scheduler duration recording > does not create samples when timing is unavailable`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts|scheduler duration recording > evicts the oldest series beyond capacity`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-storage.test.ts|scheduler duration storage > round-trips closed digest-only history`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-storage.test.ts|scheduler duration storage > contains read and write faults with concurrent writers`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > learns admitted Task durations through a caller-owned absolute state directory`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > uses caller-owned observations and contains local history write failure`
  Proves:

- Caller-owned learned history accepts only valid admitted-to-settled intervals, retains settlement kind and monotonic observation sequence, applies the configured sample/series bounds, and persists digest-only closed state through same-directory atomic replacement.
- Missing, malformed, incompatible, and read-failed state forms an empty model; post-drain write failure and concurrent last-writer activity only reduce future samples. Caller-owned identity projections and optional observations do not expose Product options, flags, or a Product diagnostic channel. The tool/API owner, not this Case, defines static fallback when prediction cannot be formed.

## Case WB-RUNTIME-SCHEDULER-PREDICTION-001: Frozen duration predictions use a deterministic bounded prior

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-prediction.test.ts|scheduler duration prediction > forms a frozen digest-only summary`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-prediction.test.ts|scheduler duration prediction > uses learned means before a median project prior and cold start`
  Proves:

- An identity derived from model version, Check ID, canonical authored options, and canonical effective flags yields a frozen digest-only prediction snapshot. Its learned estimates retain sample count, arithmetic mean, and nearest-rank p90 without retaining source options or flags.
- The snapshot selects learned estimates first, then one median of the Run's learned estimates for unknown Tasks, and finally common positive cold-start weight `1`; unavailable timing does not revise it or create a sample.

## Case WB-RUNTIME-SCHEDULER-CRITICAL-PATH-001: Directed readiness relations form one reverse critical-path score

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/critical-path-ranking.test.ts|critical-path ranking > scores both dependency and observation downstream paths once`
  Proves:

- Before admission, the immutable score table adds each Task estimate to the maximum direct downstream score across both `dependsOn` and `observes` relations; it is frozen and does not reinterpret Task priority or runtime capacity facts.

## Case WB-RUNTIME-SCHEDULER-LEARNED-ADMISSION-001: Public learned strategy preserves generic Scheduler legality

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/strategy.test.ts|public learned critical-path strategy > uses the public scope layers and returns wait for an unavailable learned preference`
- `bun|src/package-tools/learned-critical-path/strategy.test.ts|public learned critical-path strategy > rejects a non-absolute history path and contains rejected caller observations`
- `bun|src/package-tools/learned-critical-path/strategy.test.ts|public learned critical-path strategy > orders score, priority, canonical IDs, constrained scope caps, continuations, and static fallback through public data`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > learns admitted Task durations through a caller-owned absolute state directory`
  Proves:

- The exported learned factory builds an ordinary prepared custom strategy from caller-owned history location and identity projection. It captures its immutable graph/prediction before admission, compares critical-path score within existing layers, and keeps generic relation, mutex, capacity, cancellation and drain guards authoritative.

## Case WB-RUNTIME-SCHEDULER-LEARNED-DIAGNOSTICS-001: Learned caller observations stay bounded and non-quality-bearing

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > uses caller-owned observations and contains local history write failure`
  Proves:

- The factory sends bounded setup/fallback observations to its optional caller-owned observer without Product diagnostic output. A local history failure remains optimization-only and preserves the completed quality result.

## Case WB-RUNTIME-ADMISSION-STRATEGY-LIFECYCLE-001: Invocation-scoped strategies preserve terminal delivery

Owner: `docs/development/scheduler.md#public-prepared-admission-strategy-lifecycle`
Entities:

- `bun|src/project-run/admission-strategy-provider/provider.test.ts|admission strategy provider > prepares one closed static or custom policy without widening public configuration`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > prepares once, decides synchronously, and completes after terminal effects on normal execute`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > completes after terminal effects when cancellation drains started work`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > completes after terminal effects when an admission policy fault drains`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > does not complete when pre-terminal task-engine setup fails`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps a prepared terminal effect output enabled but not-run without a sealed context`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps prepared policy closures independent across overlapping Runs`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > runs a public prepared strategy once and completes after generic terminal effects`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps public prepared closures isolated across overlapping Runs`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > fails public preparation before Scheduler start and preserves its output boundary`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > aggregates public terminal-effect failures without rewriting a sealed primary result`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > enables measurement output only for generic terminal effects or an actual prepared terminal effect`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > prepares before admission and records only after terminal effects settle`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > records a cancelled Run only after its terminal terminal effect settles`
  Proves:

- Graph-ready public prepared authoring prepares once per Run from frozen graph facts and returns an isolated closure; normal, cancelled and admission-policy-failed Runs keep Scheduler decisions synchronous and deliver terminalEffect at most once after admission stops, started work drains and generic terminal effects settle. Preparation failure forms `admission-strategy-preparation-failed` before Scheduler start; pre-terminal task-engine failure has no terminal-effect delivery.
- Generic terminal effects all receive their chance before public `terminalEffect`. Their actual settlement, plus optional `terminalEffect`, is the sole input to `terminalEffects`: generic-only no-context stays enabled/`not-run`; simple and prepared-without-terminalEffect do not independently enable it; a terminal-effect failure cannot overwrite sealed primary facts, and later terminalEffect success cannot overwrite a generic failure.
- A learned factory is an ordinary public prepared strategy: it prepares immutable prediction before Scheduler decisions and records its terminal sample only after terminal delivery, without a private Invocation lifecycle.

## Case API-COMMAND-CHECK-CONSTRUCTOR-001: Command Check closes its public authoring input

Owner: `docs/guides/command-check.md#输入与-ordinary-check-组合`
Entities:

- `bun|src/package-checks/command-check/command-check.test.ts|commandCheck constructor and execution > closes command input, freezes defaults, and preserves ordinary Check composition`
  Proves:
- `commandCheck` retains literal identity and ordinary Check composition while materializing detached defaults, rejecting hostile/unknown command input, and blocking invalid prepared options rather than executing them.

## Case API-COMMAND-CHECK-ENVIRONMENT-001: Command Check resolves its execution directory and environment explicitly

Owner: `docs/guides/command-check.md#环境`
Entities:

- `bun|src/package-checks/command-check/command-check.test.ts|commandCheck constructor and execution > uses no-shell arguments, resolved cwd, and exact or inherited environment without publishing child material`
  Proves:
- A command receives dense no-shell argv, a project-root-relative working directory, exact variables without ambient leakage, or an execution-start inherited environment with declared deletions; child output remains absent from the default terminal result.

## Case API-COMMAND-CHECK-TERMINAL-001: Command Check maps child lifecycle causes to closed terminal outcomes

Owner: `docs/guides/command-check.md#终态与-final-data`
Entities:

- `bun|src/package-checks/command-check/command-check.test.ts|commandCheck constructor and execution > maps numeric exit, startup, timeout, output limit, and signal terminal branches`
  Proves:
- Numeric nonzero exit publishes only its exit code as failed data, while startup failure, timeout, bounded-output overflow, and signal termination settle as their stable unavailable reason without child diagnostics.

## Case API-COMMAND-CHECK-TRANSCRIPT-001: Command Check persists raw output only through an explicit artifact capability

Owner: `docs/guides/command-check.md#输出`
Entities:

- `bun|src/package-checks/command-check/command-check.test.ts|commandCheck constructor and execution > requires artifact capability for transcripts and atomically retains only opted-in raw output`
  Proves:
- Transcript mode requires a writable Check-local artifact capability, atomically replaces only fixed `process.log` with closed raw stdout/stderr material, and converts unavailable capability or write failure into the stable transcript-unavailable outcome without exposing command input material.

## Case API-COMMAND-CHECK-CANCELLATION-001: Command Check delegates caller cancellation to ordinary Check settlement

Owner: `docs/guides/command-check.md#终态与-final-data`
Entities:

- `bun|src/package-checks/command-check/command-check.test.ts|commandCheck constructor and execution > leaves caller cancellation to the ordinary Core execution outcome`
  Proves:
- A caller abort observed during command execution is settled by the ordinary Core lifecycle as `execution-cancelled`, rather than exposing a command-specific child lifecycle diagnostic.

## Case QUALITY-RUNTIME-MARKDOWN-LINT: 有界 Markdown lint 结果发布

Owner: `docs/checks/markdown-lint.md#效果与结果`
Entities:

- `bun|src/package-checks/markdown-lint/default-check.test.ts|Markdown lint Check > publishes Product-owned findings only after a complete bounded traversal`
  Proves:
- A completed lint traversal reports only Product-owned public rules and produces a blocking failed outcome with canonical source, finding and rejected-input counts.

## Case QUALITY-RUNTIME-MARKDOWN-LINT-BOUNDARIES: Markdown lint terminal boundaries

Owner: `docs/checks/markdown-lint.md#not-applicable-与-unavailable`
Entities:

- `bun|src/package-checks/markdown-lint/default-check.test.ts|Markdown lint Check > settles zero input, rejected input, limits, and cancellation without partial lint publication`

Proves:

- Empty selections are not applicable, rejected selected inputs remain successful evidence, and limits or cancellation make the Check unavailable without publishing partial lint Findings.

## Case QUALITY-RUNTIME-MARKDOWN-LINT-REFERENCES: Markdown lint MD052 public result

Owner: `docs/checks/markdown-lint.md#效果与结果`
Entities:

- `bun|src/package-checks/markdown-lint/default-check.test.ts|Markdown lint Check > reports MD052 reference forms through the public single-rule Check`

Proves:

- Selecting only `reference-links-images` reports unresolved full, collapsed and image references as public MD052 findings, while ignored task labels, shortcut syntax and the private parser helper do not leak into Records.
