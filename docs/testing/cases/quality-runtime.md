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

- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > defaults absent waivers without skipping finding identity validation`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > matches caller-defined structural identities, preserves reasons, and audits unused waivers`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > materializes waiver identity and reason without copying caller findings`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > does not waive findings when one caller-defined identity matches more than once`
- `bun|src/package-tools/finding-waivers/reconciliation.test.ts|finding waiver reconciliation > rejects malformed and hostile waiver boundaries without invoking caller accessors`
  Proves:
- The public helper reconciles each configured waiver against the complete caller-provided finding collection by caller-defined canonical structural identity, preserving finding order and original finding references. Zero, one, and multiple matches respectively produce unused, applied, and overmatched audit outcomes; overmatched identities do not waive findings.
- Applied evidence is a detached, deep-frozen materialization of the authored waiver rather than a mutable authored object. Duplicate, malformed, noncanonical, or hostile waiver authoring and invalid finding identity fail with `TypeError` without invoking author accessors.
- Omitted, `undefined` and empty-array waiver inputs keep every Finding actionable in its original order and reference, return frozen complete results with empty audits, and still validate every Finding identity; `null` and malformed explicit inputs fail rather than use the default.

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
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > derives a default strict aggregate and accepts a synchronous custom aggregate`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > reuses effective flag selection for custom aggregation`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > collects every Git delta once, retains rename and deletion paths, and matches frozen regions`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > retains a trustworthy zero-match snapshot without deriving a flag`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > preserves nonempty NUL flag identities without mistaking zero matches for unavailable evidence`
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
- Nonempty change flag IDs containing NUL retain their author identity: empty patterns yield trustworthy zero matches and no derived flag; matching paths yield the original prefixed token, not conservative unavailable evidence.
- After terminal settlement, this private selection filters complete Check facts in canonical order into the only aggregation input. The default passes only a non-empty all-passed list; a caller-local synchronous function may return any closed aggregate. Callback throws and invalid returns reject the Run after diagnostic/progress cleanup without a final success summary or machine publication; ordinary Check failures still settle as Run results. The private selected member list itself does not enter stable RunResult, machine, or diagnostic fields.

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

## Case WB-RUNTIME-CHECKPOINT-001: Frozen Check-facts snapshot is a two-entity projection

Owner: `docs/development/check-results.md#check-and-record-facts`
Entities:

- `bun|src/check-settlement/session-lifecycle.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes canonical Check and Record facts`
- `bun|src/check-settlement/facts.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot with structural Record identity`
- `bun|src/check-settlement/fact-validation.test.ts|check-record foundation runtime validation > rejects non-canonical final or Record data and invalid ownership`
  Proves:
- A frozen snapshot contains canonical `checks` and `records` only. The package-private settled Check seam reuses the same canonical final-data reference that the frozen snapshot projects; policy, publication, callbacks, scanner payloads, and scheduler state are not a third fact source.

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
- A completed traversal publishes only the documented safe local-reference Record projection and parser-validated exact final counts; root-external findings retain no destination material. The omitted finding policy defaults to non-blocking and retains the Records/final data in a passed outcome with an actionable warning, while explicit blocking retains the same evidence and settles failed with an actionable error. Enabled parse-facts cache hit, miss, hostile JSONL line, storage failure, and exact-byte source/target invalidation preserve the same link settlement; the separately owned capacity reminder adds only its documented Check message. Cancellation before source work or before terminal publication remains unavailable with no link-finding Record. Completed normal/rejected findings additionally project at most ten Check-owned summaries plus an exact omitted count; those summaries retain source navigation and closed reason while never copying the unsafe destination.
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
- `bun|src/package-checks/maintenance-reminders/measurement-reuse.test.ts|maintenance reminders > reuses successful overlapping measurements only within one execution and observes cancellation on reuse`
- `bun|src/package-checks/maintenance-reminders/measurement-reuse.test.ts|maintenance reminders > retries failed measurement steps while retaining usable shorter prefixes and ordered assessments`
  Proves:
- One owning Check measures only committed first-parent activity after each base, excludes worktree/index delta and base itself, sums Git numstat additions/deletions, and treats merge, revert, binary, rename, and strict thresholds as declared by the quality owner.
- 每个条目保留有序、经 parser 验收的 clear/due/unavailable assessment；七种测量失败/重试保留正确 reason、成功短前缀、安全累计与精确 retry 次数，默认真实 transport 的失败→恢复及两次 Run 复用仍独立验收。不可测量按 advisory/enforcing 保留 warning 或 error/failure，due message 可由 progress 与 readback 观察；取消则关闭 whole Check unavailable，不形成不完整 payload。

## Case API-COMMAND-CHECK-CONSTRUCTOR-001: Command Check closes its public authoring input

Owner: `docs/guides/command-check.md#输入与-ordinary-check-组合`
Entities:

- `bun|src/package-checks/command-check/command-check.test.ts|commandCheck authoring > closes command input, freezes defaults, and preserves ordinary Check composition`
  Proves:
- `commandCheck` retains literal identity and ordinary Check composition while materializing detached defaults, rejecting hostile/unknown command input, and blocking invalid prepared options rather than executing them.

## Case API-COMMAND-CHECK-ENVIRONMENT-001: Command Check resolves its execution directory and environment explicitly

Owner: `docs/guides/command-check.md#环境`
Entities:

- `bun|src/package-checks/command-check/command-check.environment.test.ts|commandCheck environment > uses no-shell arguments, resolved cwd, and exact or inherited environment without publishing child material`
- `bun|src/package-checks/command-check/command-check.environment.test.ts|commandCheck environment > resolves a closed invocation environment and lets afterCommand own complete numeric-exit settlement`
- `bun|src/package-checks/command-check/command-check.environment.test.ts|commandCheck environment > fails closed when the environment resolver throws or returns an invalid policy before spawn`
  Proves:
- A command receives dense no-shell argv, a project-root-relative working directory, exact variables without ambient leakage, an execution-start inherited environment with declared deletions, or a resolver-produced closed environment from the permitted invocation context; child output remains absent from the default terminal result.
- Static and resolver environment policies are mutually exclusive. A resolver throw or invalid return fails closed before spawn with `command-environment-resolution-failed`, without ambient fallback or environment publication.

## Case API-COMMAND-CHECK-TERMINAL-001: Command Check maps child lifecycle causes to closed terminal outcomes

Owner: `docs/guides/command-check.md#默认终态与失败边界`
Entities:

- `bun|src/package-checks/command-check/command-check.terminal.test.ts|commandCheck terminal settlement > maps numeric exit, startup, timeout, output limit, and signal terminal branches`
  Proves:
- Numeric nonzero exit publishes only its exit code as failed data, while startup failure, timeout, bounded-output overflow, and signal termination settle as their stable unavailable reason without child diagnostics.

## Case API-COMMAND-CHECK-TRANSCRIPT-001: Command Check persists raw output only through an explicit artifact capability

Owner: `docs/guides/command-check.md#输出`
Entities:

- `bun|src/package-checks/command-check/command-check.transcript.test.ts|commandCheck transcripts > requires artifact capability for transcripts and atomically retains only opted-in raw output`
  Proves:
- Transcript mode requires a writable Check-local artifact capability, atomically replaces only fixed `process.log` with closed raw stdout/stderr material, and converts unavailable capability or write failure into the stable transcript-unavailable outcome without exposing command input material or entering `afterCommand`.

## Case API-COMMAND-CHECK-CANCELLATION-001: Command Check delegates caller cancellation to ordinary Check settlement

Owner: `docs/guides/command-check.md#默认终态与失败边界`
Entities:

- `bun|src/package-checks/command-check/command-check.terminal.test.ts|commandCheck terminal settlement > leaves caller cancellation to the ordinary Core execution outcome`
- `bun|src/package-checks/command-check/command-check.terminal.test.ts|commandCheck terminal settlement > leaves resolver cancellation to the ordinary Core execution outcome`
  Proves:
- A caller abort observed during command execution is settled by the ordinary Core lifecycle as `execution-cancelled`, rather than exposing a command-specific child lifecycle diagnostic.

## Case API-COMMAND-CHECK-AFTER-COMMAND-001: Command Check gives complete child output to caller-owned settlement

Owner: `docs/guides/command-check.md#调用方完成阶段`
Entities:

- `bun|src/package-checks/command-check/command-check.terminal.test.ts|commandCheck terminal settlement > does not invoke afterCommand for incomplete process results and delegates callback settlement to Core`
- `bun|src/package-checks/command-check/command-check.terminal.test.ts|commandCheck terminal settlement > never publishes callback-derived data or Records from output-limited children`
- `bun|src/package-checks/command-check/command-check.environment.test.ts|commandCheck environment > resolves a closed invocation environment and lets afterCommand own complete numeric-exit settlement`
  Proves:
- Only a complete numeric-exit child result reaches `afterCommand`; complete nonzero exits can be interpreted as passed by the caller. Stdout/stderr overflow with a planned zero or nonzero exit never invokes completion or publishes callback-derived data/Records; a racing nonzero exit retains its default failed mapping. Timeout and other incomplete results remain Product-owned. Once called, ordinary callback containment owns thrown settlement rather than leaking the callback error.

## Case QUALITY-RUNTIME-MARKDOWN-LINT: 有界 Markdown lint 结果发布

Owner: `docs/checks/markdown-lint.md#效果与结果`
Entities:

- `bun|src/package-checks/markdown-lint/constructor.test.ts|Markdown lint Check > publishes Product-owned findings only after a complete bounded traversal`
  Proves:
- A completed lint traversal reports only Product-owned public rules and produces a blocking failed outcome with canonical source, finding and rejected-input counts.
- Omitted and explicit empty waivers preserve the exact legacy Record data, IDs, ordering and terminal message text.

## Case QUALITY-RUNTIME-MARKDOWN-LINT-BOUNDARIES: Markdown lint terminal boundaries

Owner: `docs/checks/markdown-lint.md#not-applicable-与-unavailable`
Entities:

- `bun|src/package-checks/markdown-lint/constructor.test.ts|Markdown lint Check > settles zero input, rejected input, limits, and cancellation without partial lint publication`

Proves:

- Empty selections are not applicable, rejected selected inputs remain successful evidence, and limits or cancellation make the Check unavailable without publishing partial lint Findings.

## Case QUALITY-RUNTIME-MARKDOWN-LINT-REFERENCES: Markdown lint MD052 public result

Owner: `docs/checks/markdown-lint.md#效果与结果`
Entities:

- `bun|src/package-checks/markdown-lint/constructor.test.ts|Markdown lint Check > reports MD052 reference forms through the public single-rule Check`

Proves:

- Selecting only `reference-links-images` reports unresolved full, collapsed and image references as public MD052 findings, while ignored task labels, shortcut syntax and the private parser helper do not leak into Records.

## Case QUALITY-RUNTIME-MARKDOWN-LINT-CACHE-PARITY: Markdown lint 缓存保留完整结果

Owner: `docs/checks/markdown-lint.md#逐文件-findings-缓存`
Entities:

- `bun|src/package-checks/markdown-lint/findings-cache.test.ts|Markdown lint findings cache > preserves complete Check results on cold and warm traversal`
- `bun|src/package-checks/markdown-lint/findings-cache.test.ts|Markdown lint findings cache > reconciles current waiver changes and raw finding limits after cache hits`

Proves:

- 冷缓存、热缓存以及文件内容变化时，完整 Check 结果与 Records 和无缓存路径一致。
- waiver 的新增、理由更新、identity 漂移与移除每次实时结算；cache hit 不固化原 waiver，配置变化不改变逐文件 cache bytes。已豁免 Finding 仍计入 warm traversal 的 `maxFindings`，超限不发布 partial lint 或 waiver audit。

## Case QUALITY-RUNTIME-MARKDOWN-LINT-CACHE-KEY: Markdown lint 缓存身份

Owner: `docs/checks/markdown-lint.md#逐文件-findings-缓存`
Entities:

- `bun|src/package-checks/markdown-lint/findings-cache.test.ts|Markdown lint findings cache > keys per-file findings by source content and selected rules`

Proves:

- 未变化的逐文件结果命中缓存；内容或所选规则变化时重新计算。

## Case QUALITY-RUNTIME-MARKDOWN-LINT-CACHE-FAULTS: Markdown lint 缓存故障回退

Owner: `docs/checks/markdown-lint.md#逐文件-findings-缓存`
Entities:

- `bun|src/package-checks/markdown-lint/findings-cache.test.ts|Markdown lint findings cache > recomputes invalid or unwritable cache entries and respects cancellation`

Proves:

- 损坏或不可写的缓存退回实时 lint，取消不会伪装为命中。

## Case QUALITY-RUNTIME-MARKDOWN-LINT-WAIVERS: Markdown lint 完整精确对账保留证据

Owner: `docs/checks/markdown-lint.md#精确-finding-waiver`
Entities:

- `bun|src/package-checks/markdown-lint/finding-waivers.test.ts|Markdown lint finding waivers > retains exact finding evidence and counts while only unwaived findings block`
- `bun|src/package-checks/markdown-lint/finding-waivers.test.ts|Markdown lint finding waivers > matches full ranges and leaves repeated identities actionable with a stable audit`
- `bun|src/package-checks/markdown-lint/finding-waiver-boundaries.test.ts|Markdown lint finding waivers > audits only complete candidate sets and never waives rejected or unavailable inputs`

Proves:

- 唯一匹配仅为原 lint Record 增加 `waiver.reason`，保留全部原 ID、字段和三项 final counts；仅剩余 actionable Findings 按 blocking/non-blocking policy 决定结算，applied/unused 消息以及被省略的 rejected inputs 不制造错误级消息。
- 完整公开 range 区分同起点不同终点的候选；synthetic publication 候选中的重复完整 identity 不按 ordinal 任挑一条豁免，而是保留全部 Finding、发布稳定 hashed `overmatched` audit 和 warning。此分支不宣称实际 backend 一定产生重复诊断。
- 无 selected path 不对账；完整空 lint 集合（包括仅 rejected inputs）产生 unused audit，但不更改 rejected evidence 或 Finding 计数。source decode failure、字节/Finding 超限和取消保留已分类 rejected Record，不发布 partial lint、waiver audit 或 final data。

## Case AUX-MARKDOWN-LINK-CACHE-CAPACITY-001: Markdown cache 容量提醒保持链接结算

Owner: `docs/checks/markdown-link-validation.md#parse-facts-cache`
Entities:

- `bun|src/package-checks/markdown-link-validation/cache-behavior.test.ts|default Check direct callbacks > adds only an actionable capacity message without changing link settlement`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts|Markdown Link parse-facts cache > warns once only above the first actual restore byte threshold`
  Proves:
- 首次实际 restore 的已读文件 bytes 严格超过自定义或默认 16 MiB 阈值才产生一次 warning；等于阈值不提醒，后续 parse 不重读或重复提醒。message 给出大小、阈值和准确可删除文件；除容量 message 外，冷 miss 与 warm hit 均保留相同链接 Records、data、status 和 messages。
- 未实际 parse、已取消或非 UTF-8 source 不触发提醒；关闭 cache 不改变现有文件，无输入不产生 message。成功读取超阈值的无效 UTF-8 cache 仍 fresh-parse 并提醒，但不追加 publication；后续 traversal 不可用也保留提醒而不发布 partial findings。

## Case API-CONTEXT-CALLBACK-SNAPSHOT-001: Static declarations close before precise lazy delivery

Owner: `docs/api-mechanics.md#固定生产与精确交付`
Entities:

- `bun|src/data-boundary/context-callback.test.ts|snapshots closed static callback demand and delivers exact frozen views without unused reads`
  Proves:

- Descriptor snapshots reject unknown, accessor, symbol, sparse and non-array demand without evaluating getters; copied canonical demand and callback identity survive later author mutation. Delivery freezes exact own data fields and never reads unrequested producers, including all four empty-demand forms.

## Case WB-RUNTIME-CHECK-CONTEXT-DEMAND-001: Check capabilities are optional without removing lifecycle obligations

Owner: `docs/guides/extending-check-lifecycle.md#callback-声明与字段`
Entities:

- `bun|src/project-run/check-execution/callback-context-needs.test.ts|produces Check capabilities only on demand and keeps cancellation independent of empty context`
- `bun|src/project-run/check-execution/callback-context-needs.test.ts|keeps preparation and execution views exact while reusing the Run project and signal`
  Proves:

- None, individual and combined declarations receive only their frozen own data fields; unrequested project/dependency/artifact producers and Record reporter wrappers are not created. Empty execution remains subject to cancellation settlement.
- Preparation and execution receive their own selected fields while sharing the same Run cancellation signal and lazy frozen project projection.

## Case AUX-MARKDOWN-GRAPH-EXECUTION-001: 图式执行保留预算与协作取消的完整发布

Owner: `docs/checks/markdown-link-validation.md#工作原理`
Entities:

- `bun|src/package-checks/markdown-link-validation/graph-behavior.test.ts|Markdown reference graph > prechecks the entire logical-node batch before extra target reads and honors staged failure order`
- `bun|src/package-checks/markdown-link-validation/graph-behavior.test.ts|Markdown reference graph > completes more than the old target maximum with disabled or explicit larger totals`
- `bun|src/package-checks/markdown-link-validation/graph-behavior.test.ts|Markdown reference graph > yields edge batches to timer and I/O cancellation without publishing normal Records`
  Proves:
- 全部源错误先于目标内容错误；节点全部逻辑边的预算超限先于额外内容读取和解码，不能先读首条边再逐边耗尽。不可用不发布部分普通 Records。
- 10,001 条计费引用在 false 和显式更大正整数预算下完整成功，计数不因节点命中缩小；显式有限 10,000 预算仍阻断。
- 边批次向真实事件循环让步，可观察 timer 与 I/O 触发的取消；取消结算无普通 Records 或 final data，不解释为 clean validation。

## Case AUX-MARKDOWN-LINK-IO-LIFECYCLE-001: Markdown Link 私有 I/O 在发布前完成收束

Owner: `docs/development/markdown-link-resolution.md#私有-io-会话与收束`
Entities:

- `bun|src/package-checks/markdown-link-validation/source-reader.test.ts|Markdown Link source reader > loads an authorized source with one fused job and preserves byte failure mapping`
- `bun|src/package-checks/markdown-link-validation/io-session.test.ts|Markdown Link private I/O session > preserves parent preload context for file-backed Workers under Node string-input hosts`
- `bun|src/package-checks/markdown-link-validation/io-session.test.ts|Markdown Link private I/O session > starts lazily, drains one pending job, and finalizes once without terminating active work`
- `bun|src/package-checks/markdown-link-validation/io-session.test.ts|Markdown Link private I/O session > settles construction, send, protocol, error and exit faults once and removes subscriptions`
- `bun|src/package-checks/markdown-link-validation/io-session.test.ts|Markdown Link private I/O session > keeps simultaneous resolver cancellation isolated and awaits real Worker exit`
- `bun|src/package-checks/markdown-link-validation/io-worker-cancellation.test.ts|Markdown Link Worker cancellation > observes atomic cancellation during a real Worker read and drains its descriptor before exit`
- `bun|src/package-checks/markdown-link-validation/execution-lifecycle.test.ts|Markdown Link terminal I/O lifecycle > awaits Worker exit and prioritizes cancellation, original failure and close failure before publication`
  Proves:
- source adapter 只发送一个包含 byte bound 的融合请求，不再追加独立 containment/read job；contained bytes 恰一次交给 parser，缺失、越界与 I/O 失败不解析，too-large 保持 source-too-large 映射。父端拒绝 malformed source union、超长或非 Uint8Array 正文，以及 contained/missing 响应中的 root 外 path，不放行额外工作。
- 文件 Worker 仅剔除父进程 string-input-only 的 `--input-type` / `--input_type` split/等号形式，其余参数原样保留；无此 flag 时沿用默认继承。真实 Node 24.18 验证四种形式及普通 V8 flag 路径均可读取、执行 Worker preload 并正常收束；这不是任意 Node flags 组合的兼容性证明。
- 空输入和提前取消不启动 Worker；正常 finalize 幂等，停止新请求并等待在途 job、关闭确认和退出后移除订阅，不 terminate 活跃工作。
- 创建、发送、关闭发送、请求身份/响应形状、超长 bytes、error、意外 exit、重复响应和重入请求故障恰一次结算 pending，随后拒绝新工作，不静默切换后端。
- 两个真实 resolver 的取消互相隔离。融合 source job 在真实 Worker 的 lstat、readlink、open、fstat、read、close 受控 native 返回边界被原子取消时，pending 与 finalize 均等待操作返回；probe 阶段不启动正文 open，已打开 descriptor 恰一次 close，取消阻止后续 read，Worker 退出与监听器移除后才完成 finalize。
- execution 在退出后才结算；最终取消优先于 traversal 首错，已有 unavailable 不被关闭失败覆盖，仅关闭失败则 target-unavailable 且无普通 Records/final data。best-effort cache 写入失败不抑制完整成功或 Finding 结果。
