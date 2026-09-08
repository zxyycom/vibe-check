# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition grammar fails closed

Owner: `docs/development/project-definition.md#recursive-check-tree`
Entities:

- `bun|src/project-definition/project-definition.authoring-defaults.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/project-definition/project-definition.recursive-checks.test.ts|Project Definition > normalizes ordinary recursive Checks without a Record catalog`
- `bun|src/project-definition/project-definition.scheduling-inheritance.test.ts|Project Definition > uses exact scheduling inheritance and rejects retired catalog fields`
- `bun|src/project-definition/project-definition.scheduling-inheritance.test.ts|Project Definition > normalizes signed admission priority by nearest explicit ancestor`
- `bun|src/project-definition/project-definition.scheduling-inheritance.test.ts|Project Definition > normalizes closed named resource capacities and exact replacement claims`
- `bun|src/project-definition/project-definition.visibility.test.ts|Project Definition > normalizes executable visibility and rejects container visibility`
- `bun|src/project-definition/project-definition.visibility.test.ts|Project Definition > ignores inherited visibility while defaulting executable Checks`
- `bun|src/project-definition/project-definition.fingerprint.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
- `bun|src/project-definition/project-definition.typed-provider.test.ts|Project Definition > accepts parsers only on executable providers and excludes them from declarative identity`
- `bun|src/project-run/outputs/directories.test.ts|Package Run output directories > accepts child, parent, and absolute directories in Definition and RunControls`
  Proves:

- Recursive ordinary Checks normalize only the declared executable/container grammar. Exact `dependsOn`, `observes`, and `mutex` scheduling collections use explicit `inherit` independently; scalar `maxParallel` and signed `admissionPriority` inherit the nearest explicit value, while named `resourceClaims` inherit the nearest explicit complete mapping and support explicit replacement or clearing. Root capacities and claims are closed positive-safe-integer mappings; unknown or oversized claims fail before author work. Priority omission and explicit `0` share canonical identity, and canonical resources participate in declarative identity. Executable `enabledByFlags` and visibility are canonical declarative identity. The closed scheduler policy defaults to canonical `static` and accepts exact `static`, `custom` with nested simple/prepared strategy, or `custom`; custom strategy kind enters the fingerprint, while callback identity, caller-owned strategy options, and history location stay outside declarative identity. Nonconforming, retired or unknown authoring fails closed; trusted execution/parser functions remain outside declarative fingerprints.
- Canonical declarative data preserves ordinary authored values without retaining author-controlled prototypes or callback identity; an executable provider must retain its parser while containers and malformed parser declarations fail closed.
- Definition and RunControls use one closed directory grammar for machine publication and diagnostic logging: child, parent and absolute targets are valid without output I/O; empty, U+0000 and unknown output keys remain configuration failures before callbacks run.

## Case WB-PROJECT-DEFINITION-FLAG-ENABLEMENT-001: Flag enablement is closed executable identity

Owner: `docs/development/project-definition.md#flag-enabled-checks`
Entities:

- `bun|src/project-definition/project-definition.flag-enablement.test.ts|Project Definition > normalizes executable flag enablement as declarative identity`
- `bun|src/project-definition/project-definition.flag-enablement.test.ts|Project Definition > normalizes opt-in dependency propagation as declarative identity`
- `bun|src/project-definition/project-definition.flag-enablement.test.ts|Project Definition > rejects malformed and container flag enablement`
  Proves:

- An executable Check's non-empty `enabledByFlags` set is copied, de-duplicated, sorted and frozen with its closed mode. Equivalent declarations share a fingerprint; mode or the literal opt-in `propagateDependsOn: true` changes declarative identity, while omission preserves direct-selection compatibility.
- Empty or malformed flag sets, unknown modes or control fields, non-literal propagation values, container declarations and the retired singular field fail Definition validation.

## Case AUX-PACKAGE-CHECK-COMPOSITION-001: Package Check options remain Definition-opaque before preflight

Owner: `docs/development/project-definition.md#package-provided-check-composition`
Entities:

- `bun|src/project-definition/project-definition.options-preflight.test.ts|Project Definition > accepts ordinary authored JSON options while their Check preflight owns domain validation`
- `bun|src/project-definition/project-definition.options-preflight.test.ts|Project Definition > accepts ordinary JSON Schema options while their Check preflight owns domain validation`
  Proves:

- Definition preserves authored package Check options as declarative JSON without interpreting their domain shape; the owning Check preflight, not Definition normalization, decides whether ordinary JSON or JSON Schema options are valid before execution.

## Case AUX-PUBLIC-AUTHORING-TYPES-001: Public authoring values and declarations remain usable from an installed package

Owner: `docs/development/project-definition.md#public-authoring-surface`
Entities:

- `bun|scripts/package/public-api-inventory.test.ts|public API inventory > publishes only the approved runtime and type roots`
- `bun|scripts/package/candidate/external-consumer/type-acceptance.test.ts|external consumer type acceptance`
  Proves:

- The public package uses the `@zxyycom/vibe-check` import specifier and exposes only the documented generic authoring/run/Finding-presentation/waiver/cache/admission-simulation operations, the `defineAdmissionPolicy` inference helper, one composable default project-file selection, eight package-provided Check functions, eight named final-data parsers, and their required authoring/resolved/final/Record/reason/cache/admission-policy/admission-state type roots.
- An ancestry-external TypeScript consumer imports and typechecks that public surface without casts or manual dependency-read generics; the same acceptance reads the installed declaration owners directly and requires the documented `defineCheck` / `run` summaries, remarks, parameters, returns and example rather than constructing a second compiler program after `tsgo`. The consumer can declare `observes`, enumerate its direct settled outcome through the callback-local `dependencies.list()` surface, and still uses the producing parser for final data. It can create standalone immutable admission graph branches and read the same callback `admissionState`, while the closed strategy result remains only `select(taskId)` or `wait`. It can author a simple or prepared custom strategy over frozen graph/decision/terminal DTOs: `decide` must synchronously return exact `select(taskId)` or `wait`, prepared may asynchronously form its Run-local closure and optional complete, and retired `proposeAdmission` plus unknown nested fields are rejected in installed declarations. It can import the learned strategy factory, pass caller-owned history identity and model options, and install its returned prepared strategy through the same custom hook. The caller-keyed cache parser must likewise synchronously return a non-thenable typed value. The deeply frozen file-selection baseline composes into a consumer-owned selection, and every package Check export is callable and retains its typed parser relation.

## Case AUX-MARKDOWN-LINK-OPTIONS-001: Markdown Link authoring defaults remain partial and bounded

Owner: `docs/checks/markdown-link-validation.md#参数与默认配置`
Entities:

- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > materializes bounded Markdown Link defaults and rejects malformed resolved options`
  Proves:
- `markdownLinkValidation(options?)` accepts closed partial authoring fields, derives its precise case-insensitive Markdown include from the public source/exclude baseline, defaults `findingPolicy` to non-blocking, and fills/freezes the complete bounded resolved policy. Its cache branch defaults to exact `{ enabled: false }`; only exact enabled/disabled alternatives are accepted, enabled requires a non-empty absolute directory without U+0000, and that resolved branch participates in declarative identity. It exposes its final-data parser. Unknown authoring fields or an unsupported policy fail synchronously; malformed complete replacements fail in the owning Check before execution with an actionable message.

## Case WB-MAINTENANCE-REMINDER-CONFIGURATION-001: Specialized maintenance reminder authoring is one closed ordinary Check

Owner: `docs/checks/maintenance-reminders.md#参数与默认配置`
Entities:

- `bun|src/package-checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > constructs one fixed Check, validates full composed policy, and fingerprints entries`
  Proves:
- `maintenanceReminders(entries)` creates exactly one fixed-ID, attention ordinary Check with package-owned Git options; it does not create a child Check collection.
- Its complete composed options accept only dense, uniquely identified reminder policies with full immutable bases, positive limits, non-empty messages, recognized modes, and a complete Git executable branch. It exposes a discriminated final-data parser; invalid/unknown replacement data settles the owning Check unavailable in preflight with an actionable message, while policy changes affect the declarative fingerprint.

## Case WB-PROGRESS-PREVIEW-DEFINITION-001: Progress preview Definition is defaulted and callback-free declarative identity

Owner: `docs/development/project-definition.md#progress-preview-配置`
Entities:

- `bun|src/project-definition/project-definition.authoring-defaults.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/project-definition/project-definition.fingerprint.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
  Proves:

- Definition defaults Record/message preview limits to `5`/`5`, text budget to `240`, and formatter to `null`; compatible direct `{ enabled }` input receives the same frozen resolved policy. Closed validation rejects invalid limits, formatter values and unknown fields even when progress is disabled.
- Normalized numeric policy and formatter `default`/`custom` kind enter declarative identity. Omission and explicit defaults share a fingerprint; distinct callback identities share the `custom` projection, while a policy value or formatter kind change does not.

## Case WB-PROGRESS-PREVIEW-OVERRIDE-001: RunControls override progress preview fields without changing Definition policy

Owner: `docs/development/project-run.md#run-outputs-and-compatibility-boundary`
Entities:

- `bun|src/project-run/controls/outputs-override-validation.test.ts|Package Run output overrides > merges bounded progress previews field by field and clears a Definition formatter`
  Proves:

- RunControls applies only explicit preview fields: `0` is an effective count, `undefined` preserves the Definition field, and `formatter: null` clears the authored callback without mutating it. The accepted override remains frozen.

## Case WB-OUTPUT-OVERRIDE-DIAGNOSTIC-001: 输出覆盖值错误可定位且不执行作者代码

Owner: `docs/development/project-run.md#run-outputs-and-compatibility-boundary`
Entities:

- `bun|src/project-run/controls/outputs-override-validation.test.ts|Package Run output overrides > locates rejected output fields with closed expectations and without reading accessors`
- `bun|src/project-run/run-controls.test.ts|Package Run > rejects invalid closed controls while a blocked preflight settles unavailable before execution`
  Proves:

- 无效 output object 与已知 leaf 返回对应 controls path、invalid-value 和封闭的合法值提示；unknown key 返回具体字段 path 与 unknown-key，不附加 expected 或回显被拒绝值。
- disabled output 的显式字段仍被校验；accessor 不被执行，Run 在无效目录、未知 output 字段或非法 preview 配置下返回 configuration，且不执行 Check author callback。

## Case WB-PROGRESS-OUTPUT-001: Progress rendering is a Run-owned output

Owner: `docs/development/project-run.md#run-outputs-and-compatibility-boundary`
Entities:

- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > presents enabled Package Run progress through the injected plain writer`
- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > tees final progress while retaining canonical Check durations in RunResult`
- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > keeps terminal progress when its selected file target cannot be opened`
- `bun|src/project-run/progress-rendering/invocation-progress-failures.test.ts|Package Run progress rendering outputs > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/project-run/progress-rendering/invocation-progress-failures.test.ts|Package Run progress rendering outputs > contains progress writer failures while preserving completed Check facts`
- `bun|src/project-run/progress-rendering/invocation-progress-failures.test.ts|Package Run progress rendering outputs > contains a Record preview write failure while retaining accepted Check and Record facts`
- `bun|src/project-run/progress-rendering/invocation-progress-failures.test.ts|Package Run progress rendering outputs > contains formatter failure and observes returned Promise rejection without revising accepted facts`
- `bun|src/project-run/progress-rendering/invocation-progress-failures.test.ts|Package Run progress rendering outputs > previews only accepted Records when Record misuse settles its Check unavailable`
- `bun|src/project-run/progress-rendering/invocation-progress-heartbeat.test.ts|Package Run progress rendering outputs > schedules one 5-second TTY heartbeat and cancels it after the last Check settles`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > keeps an execution failure distinct when progress presentation has failed`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > resolves closed output statuses without replacing primary results`
- `bun|src/project-run/progress-rendering/default-outputs.test.ts|Package Run default outputs > keeps default progress and publication outputs independently successful`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > keeps execution cancellation distinct when progress presentation has failed`
- `bun|src/project-run/progress-rendering/invocation-progress-failures.test.ts|Package Run progress rendering outputs > contains a TTY rewrite failure without leaving Check or Record facts open`
- `bun|src/project-run/progress-rendering/invocation-progress-record-previews.test.ts|Package Run progress rendering outputs > renders accepted attention Records while retaining complete Records and messages in final facts`
- `bun|src/project-run/progress-rendering/invocation-progress-record-previews.test.ts|Package Run progress rendering outputs > applies RunControls preview limits and formatter to terminal and tee bytes without changing facts`
- `bun|src/project-run/progress-rendering/renderer-formatting-records.test.ts|Package Run progress Record and message previews > renders independent bounded Record and message previews without changing their source facts`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > continues output publication after a progress writer failure`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > returns output facts when machine publication alone fails`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > keeps both failed outputs and prioritizes progress rendering`
  Proves:
- Disabling progress rendering constructs neither writer, tee, refresh schedule nor Record/message preview, and does not affect Check execution or complete facts.
- Enabled TTY progress owns one 5-second heartbeat while Checks are running and cancels it when the last running Check settles; the refresh remains inside presentation and does not alter Check facts.
- A progress writer failure, including one raised by a Record preview or scheduled TTY heartbeat rewrite, cancels the heartbeat, marks only `outputs.progressRendering` failed, and retains closed Check/Record facts. A caller-selected `progressLogFile` tees the same bytes after terminal output, preserving visible settled-row duration and final execution/counts/elapsed; complete canonical Check durations, including `null`, remain in `RunResult`, and a file target failure cannot suppress terminal output.
- Every settled block independently previews its configured number of accepted Records and messages. By default, a Record uses only its local ID plus canonical JSON data; both kinds terminal-escape then truncate at their configured Unicode code-point budget with the marker included and report their own exact omitted count. A synchronous formatter sees frozen default text only for count-selected items, Records precede messages, and its empty string remains presented; it cannot change labels, ordering or facts. Only Records accepted before settlement are previewed; rejected or fabricated Record data never appears. Formatter throw/non-string results—including real rejected Promises with a caller-owned `then`—fail only progress rendering without reading arbitrary thenables or revising snapshot Records/`RunResult.checkMessages`; an attention passed Check with either kind remains visible.
- Machine publication failure marks `outputs.machinePublication` failed and returns `kind: "output"` with final facts. After all output owners close, result resolution is pure: a completed candidate upgrades to `output` using failed-output priority—progress rendering, machine publication, diagnostic logging, then measurement hooks; an existing `output` candidate reselects that same priority; `planning`, `cancelled` and `execution` candidates retain their primary kind while exposing every closed status. When progress rendering and machine publication both fail, both statuses remain observable and the result diagnostic selects progress rendering.

## Case WB-DIAGNOSTIC-LOGGING-OUTPUT-001: Diagnostic logging is a Product-owned Run output

Owner: `docs/development/human-output.md#diagnostic-logging-maintenance`
Entities:

- `bun|src/project-run/progress-rendering/default-outputs.test.ts|Package Run default outputs > keeps default progress and publication outputs independently successful`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger detail safety > rejects descriptor-unsafe details without invoking author hooks`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger observation formatting > renders bounded filterable facts without changing their format`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger > correlates explicit owner channels with one invocation-wide sequence`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger > contains setup and close failure of one owner channel`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger > summarizes descriptor-safe normal values without rendering their full lifecycle payload`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-start.test.ts|Package Run diagnostic logging output > writes one compact invocation start instead of catalog entries for every Check`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-data.test.ts|Package Run diagnostic logging output > does not duplicate accepted final data into the core diagnostic channel`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-hostile.test.ts|Package Run diagnostic logging output > does not invoke hostile author details while diagnostic logging is enabled`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > closes diagnostic logging once after an unexpected nonconfiguration failure`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-failures.test.ts|Package Run diagnostic logging output > isolates a scheduler channel writer failure while retaining core channel evidence and facts`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-failures.test.ts|Package Run diagnostic logging output > closes diagnostic channels before progress after a diagnostic close failure`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > continues output publication after a progress writer failure`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > keeps both failed outputs and prioritizes progress rendering`
  Proves:

- Disabled diagnostic logging constructs neither directory/file nor writer; its disabled channel readbacks have `null` files without changing progress, publication or Check execution. Only diagnostic logging or machine publication enables one invocation-creation wall-clock capture: machine-only publication serializes it as `invocation.timestamp`; diagnostic-only logging captures it for diagnostic identity and the default UTC-compact filename; when both are enabled they share the same immutable instant; when both are disabled the Run does not read or serialize wall clock.
- By default an enabled log uses explicit core/scheduler owner files with one UTC-compact-time-and-UUID suffix and newline-terminated timeline observations. The router assigns every channel observation one invocation-wide sequence/elapsed/invocation ID header; filterable `[]` tags and semantic `key=value` facts remain bounded physical lines without becoming a parser or versioned format. Its instant is not publication completion time. Scheduler writes one graph plus fingerprint and decisions retain only the fingerprint and dynamic facts. The compact core initial observation reports the Check count without one `catalog.check` projection per normalized Check; `run.terminal-before-log-close` reports that terminal fact is written while diagnostic close remains unconfirmed, and a progress failure does not prevent this independent Product output from closing.
- `check.finished` contains only phase, status, duration and message count; it does not duplicate accepted final data or captured message text. Successful dependency reads retain only producer, status and data presence; a committed Record observation contains `{ checkId, recordId, result }`, while rejected Record reporting remains bounded.
- Diagnostic details use bounded descriptor-only rendering: accessors, `toJSON`, Proxy traps, cyclic/deep/extreme-wide/oversized values and malformed author handoff data cannot execute author hooks or alter Check facts.
- Every non-configuration result path closes each enabled diagnostic channel at most once, including unexpected runtime containment failures. Terminal observation precedes diagnostic close/status merge; the invocation attempts every enabled diagnostic-channel close before it closes an unclosed progress writer, even when a diagnostic close fails. Setup, append/render and close failures are contained per channel, preserve final Check/Record facts, retain aggregate plus per-channel readback, and diagnostic logging is selected only after progress-rendering and machine-publication failure priorities. Public learned helpers use caller-owned observations and do not create a Product diagnostic channel.

## Case WB-RUN-RESULT-CHECK-MESSAGES-001: Final-snapshot Run results retain accepted Check messages

Owner: `docs/development/project-run.md#invocation-and-results`
Entities:

- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > runs each independent preflight inside its admitted Task lifecycle`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > blocks success dependents before their preflight and lets observers read the terminal result`
- `bun|src/project-run/check-execution/preflight-cancellation.test.ts|Package Run direct Check execution > passes the invocation signal to admitted preflights and closes cancelled Check Tasks`
- `bun|src/project-run/check-execution/preflight-messages.test.ts|Package Run direct Check execution > canonicalizes continue fallbacks and retains preflight messages through execution settlement`
- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > reuses effective flag selection for explicit aggregation`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
  Proves:
- Completed, output failure, and execution-phase-cancelled final-snapshot `RunResult` values expose only accepted detached `{ checkId, level, code, message }` items. Invalid attachments and author results rejected by Record settlement expose no partial messages.
- `checkMessages` preserves author order within each Check and canonical snapshot Check order across parallel settlement; disabling progress or a settled progress writer failure does not remove it.
- Task-local preflight receives the invocation signal only after admission; cooperative cancellation closes the existing execution phase as `cancelled` without admitting pending author work.
- A real Run preserves attention-Check Records, dependent admission, aggregation, canonical durations and machine-v4 facts while returning accepted messages separately; validated machine bytes and models contain neither messages nor visibility. The explicit `effective` selector reuses the invocation's private flag selection, including activated prerequisites, without projecting that selection into the result.

## Case ADD-SECRET-DETECTION-AUTHORING-001: Secret detection requires an explicit closed files policy

Owner: `docs/checks/secret-detection.md#参数与默认配置`
Entities:

- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > requires a complete explicit files policy and publishes the public parser`

Proves:

- `secretDetection` rejects missing or partial files authoring, freezes only its closed resource/waiver options, and exposes a parser that verifies the five safe final-count invariants.

## Case WB-DIAGNOSTIC-FILE-NAMING-001: Invocation controls opt into channel-only filenames without weakening writer safety

Owner: `docs/development/project-run.md#diagnostic-file-naming`
Entities:

- `bun|src/project-run/progress-rendering/invocation-diagnostic-naming.test.ts|Package Run diagnostic file naming > rejects unsupported naming before author work while preserving optional controls`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-naming.test.ts|Package Run diagnostic file naming > keeps unique defaults and selects fixed channel names without changing identity or disabled output`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-naming.test.ts|Package Run diagnostic file naming > refuses concurrent and repeated channel targets without overwriting existing logs or facts`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-naming.test.ts|Package Run diagnostic file naming > reports a single channel collision with its real target while the other channel succeeds`
  Proves:

- Only omitted/undefined, `unique` and `channel` controls are accepted; invalid values fail before author work, valid controls are frozen, and undefined is omitted from the snapshot.
- Default and explicit unique modes preserve UTC/UUID basenames; channel mode selects only `core.log` / `scheduler.log`, preserves invocation correlation and Definition fingerprint, and does not enable disabled diagnostics or create their directory.
- Concurrent and repeated channel targets fail without overwriting or appending existing bytes, while settled Check facts survive. A pre-existing core file fails only that channel, retains its real target readback, allows scheduler success and produces aggregate diagnostic failure; no pair-atomic rollback is promised.
