# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition grammar fails closed

Owner: `docs/configuration.md#recursive-check-tree`
Entities:

- `bun|src/project-definition/project-definition.authoring-defaults.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/project-definition/project-definition.recursive-checks.test.ts|Project Definition > normalizes ordinary recursive Checks without a Record catalog`
- `bun|src/project-definition/project-definition.scheduling-inheritance.test.ts|Project Definition > uses exact scheduling inheritance and rejects retired catalog fields`
- `bun|src/project-definition/project-definition.scheduling-inheritance.test.ts|Project Definition > normalizes signed admission priority by nearest explicit ancestor`
- `bun|src/project-definition/project-definition.visibility.test.ts|Project Definition > normalizes executable visibility and rejects container visibility`
- `bun|src/project-definition/project-definition.visibility.test.ts|Project Definition > ignores inherited visibility while defaulting executable Checks`
- `bun|src/project-definition/project-definition.fingerprint.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
- `bun|src/project-definition/project-definition.typed-provider.test.ts|Project Definition > accepts parsers only on executable providers and excludes them from declarative identity`
- `bun|src/project-run/output-directories.test.ts|Package Run output directories > accepts child, parent, and absolute directories in Definition and RunControls`
  Proves:

- Recursive ordinary Checks normalize only the declared executable/container grammar. Exact `dependsOn`, `observes`, and `mutex` scheduling collections use explicit `inherit` independently; scalar `maxParallel` and signed `admissionPriority` inherit the nearest explicit value, with priority omission and explicit `0` sharing canonical identity. Executable `enabledByFlags` and visibility are canonical declarative identity. The closed scheduler policy defaults to canonical `static` and accepts exact `static`, `custom` with nested simple/prepared strategy, or `learned-critical-path`; custom strategy kind enters the fingerprint, while callback identity stays outside it and non-empty, NUL-free learned `stateDirectory` remains declarative identity. Nonconforming, retired or unknown authoring fails closed; trusted execution/parser functions remain outside declarative fingerprints.
- Canonical declarative data preserves ordinary authored values without retaining author-controlled prototypes or callback identity; an executable provider must retain its parser while containers and malformed parser declarations fail closed.
- Definition and RunControls use one closed directory grammar for machine publication and diagnostic logging: child, parent and absolute targets are valid without output I/O; empty, U+0000 and unknown output keys remain configuration failures before callbacks run.

## Case WB-PROJECT-DEFINITION-FLAG-ENABLEMENT-001: Flag enablement is closed executable identity

Owner: `docs/configuration.md#flag-enabled-checks`
Entities:

- `bun|src/project-definition/project-definition.flag-enablement.test.ts|Project Definition > normalizes executable flag enablement as declarative identity`
- `bun|src/project-definition/project-definition.flag-enablement.test.ts|Project Definition > rejects malformed and container flag enablement`
  Proves:

- An executable Check's non-empty `enabledByFlags` set is copied, de-duplicated, sorted and frozen with its closed mode. Equivalent declarations share a fingerprint, while changing the mode changes declarative identity.
- Empty or malformed flag sets, unknown modes or control fields, container declarations and the retired singular field fail Definition validation.

## Case AUX-PACKAGE-CHECK-COMPOSITION-001: Package Check options remain Definition-opaque before preflight

Owner: `docs/configuration.md#package-provided-check-composition`
Entities:

- `bun|src/project-definition/project-definition.options-preflight.test.ts|Project Definition > accepts ordinary authored JSON options while their Check preflight owns domain validation`
- `bun|src/project-definition/project-definition.options-preflight.test.ts|Project Definition > accepts ordinary JSON Schema options while their Check preflight owns domain validation`
  Proves:

- Definition preserves authored package Check options as declarative JSON without interpreting their domain shape; the owning Check preflight, not Definition normalization, decides whether ordinary JSON or JSON Schema options are valid before execution.

## Case AUX-PUBLIC-AUTHORING-TYPES-001: Public authoring values and declarations remain usable from an installed package

Owner: `docs/configuration.md#public-authoring-surface`
Entities:

- `bun|scripts/package/public-api-inventory.test.ts|public API inventory > publishes only the approved runtime and type roots`
- `bun|scripts/package/candidate/external-consumer/type-acceptance.test.ts|external consumer type acceptance`
  Proves:

- The public package uses the `@zxyycom/vibe-check` import specifier and exposes only the documented generic authoring/run/Finding-presentation/waiver/cache/admission-simulation operations, the `defineAdmissionPolicy` inference helper, one composable default project-file selection, eight package-provided Check functions, eight named final-data parsers, and their required authoring/resolved/final/Record/reason/cache/admission-policy/admission-state type roots.
- An ancestry-external TypeScript consumer imports and typechecks that public surface without casts or manual dependency-read generics; the same acceptance reads the installed declaration owners directly and requires the documented `defineCheck` / `run` summaries, remarks, parameters, returns and example rather than constructing a second compiler program after `tsgo`. The consumer can declare `observes`, enumerate its direct settled outcome through the callback-local `dependencies.list()` surface, and still uses the producing parser for final data. It can create standalone immutable admission graph branches and read the same callback `admissionState`, while the closed strategy result remains only `select(taskId)` or `wait`. It can author a simple or prepared custom strategy over frozen graph/decision/terminal DTOs: `decide` must synchronously return exact `select(taskId)` or `wait`, prepared may asynchronously form its Run-local closure and optional complete, and retired `proposeAdmission` plus unknown nested fields are rejected in installed declarations. It can also author learned-critical-path with its local state directory; v1 `expectedDurationMs` remains rejected. The caller-keyed cache parser must likewise synchronously return a non-thenable typed value. The deeply frozen file-selection baseline composes into a consumer-owned selection, and every package Check export is callable and retains its typed parser relation.

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

## Case WB-PROGRESS-OUTPUT-001: Progress rendering is a Run-owned output

Owner: `docs/configuration.md#run-outputs-and-compatibility-boundary`
Entities:

- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > presents enabled Package Run progress through the injected plain writer`
- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > contains progress writer failures while preserving completed Check facts`
- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > schedules one 5-second TTY heartbeat and cancels it after the last Check settles`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > keeps an execution failure distinct when progress presentation has failed`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
- `bun|src/project-run/progress-rendering/default-outputs.test.ts|Package Run default outputs > keeps default progress and publication outputs independently successful`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > keeps execution cancellation distinct when progress presentation has failed`
- `bun|src/project-run/progress-rendering/invocation-progress.test.ts|Package Run progress rendering outputs > contains a TTY rewrite failure without leaving Check or Record facts open`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > continues output publication after a progress writer failure`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > returns output facts when machine publication alone fails`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > keeps both failed outputs and prioritizes progress rendering`
  Proves:
- Disabling progress rendering does not construct its writer or affect Check execution.
- Enabled TTY progress owns one 5-second heartbeat while Checks are running and cancels it when the last running Check settles; the refresh remains inside presentation and does not alter Check facts.
- A progress writer failure, including one raised by a scheduled TTY heartbeat rewrite, cancels the heartbeat, marks only `outputs.progressRendering` failed, and retains closed Check/Record facts.
- Machine publication failure marks `outputs.machinePublication` failed and returns `kind: "output"` with final facts. When progress rendering and machine publication both fail, their statuses remain observable and progress rendering keeps its existing diagnostic priority.

## Case WB-DIAGNOSTIC-LOGGING-OUTPUT-001: Diagnostic logging is a Product-owned Run output

Owner: `docs/api-mechanics.md#outputs-与-runresult-边界`
Entities:

- `bun|src/project-run/progress-rendering/default-outputs.test.ts|Package Run default outputs > keeps default progress and publication outputs independently successful`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger detail safety > rejects descriptor-unsafe details without invoking author hooks`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger observation formatting > renders bounded filterable facts without changing their format`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger > summarizes descriptor-safe normal values without rendering their full lifecycle payload`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-start.test.ts|Package Run diagnostic logging output > writes one compact invocation start instead of catalog entries for every Check`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-data.test.ts|Package Run diagnostic logging output > summarizes accepted final data instead of copying it into the diagnostic log`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-hostile.test.ts|Package Run diagnostic logging output > does not invoke hostile author details while diagnostic logging is enabled`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > closes diagnostic logging once after an unexpected nonconfiguration failure`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-failures.test.ts|Package Run diagnostic logging output > contains diagnostic logger implementation failures without revising final facts`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > continues output publication after a progress writer failure`
- `bun|src/project-run/progress-rendering/invocation-output-failure.test.ts|Package Run output failure composition > keeps both failed outputs and prioritizes progress rendering`
  Proves:

- Disabled diagnostic logging constructs neither directory/file nor writer; its disabled status and `null` file are independently observable without changing progress, publication or Check execution. Only diagnostic logging or machine publication enables one invocation-creation wall-clock capture: machine-only publication serializes it as `invocation.timestamp`; diagnostic-only logging uses it for the UTC-compact filename; when both are enabled they share the same immutable instant; when both are disabled the Run does not read or serialize wall clock.
- An enabled log uses one UTC-compact-time-and-UUID-named file and newline-terminated timeline observations. Each event has one sequence/elapsed header, filterable `[]` tags and semantic `key=value` facts; long facts continue on bounded physical lines without becoming a parser or versioned format. Its instant is not publication completion time. Its compact initial Run observation reports the Check count without one `catalog.check` projection per normalized Check; `run.terminal-before-log-close` reports that the terminal fact is written while diagnostic close remains unconfirmed, and a progress failure does not prevent this independent Product output from closing.
- Normal accepted final data is reported once by the owning final Check through a bounded safe shape/size summary. Successful dependency reads retain only producer, status and data presence; each Record report and exceptional boundary still uses the same descriptor-only safety boundary for its one full value.
- Diagnostic details use bounded descriptor-only rendering: accessors, `toJSON`, Proxy traps, cyclic/deep/extreme-wide/oversized values and malformed author handoff data cannot execute author hooks or alter Check facts.
- Every non-configuration result path closes diagnostic logging at most once, including unexpected runtime containment failures. Factory, append/render and close failures preserve final Check/Record facts; all output statuses remain observable, and diagnostic logging is selected only after the existing progress-rendering and machine-publication failure priorities.

## Case WB-RUN-RESULT-CHECK-MESSAGES-001: Final-snapshot Run results retain accepted Check messages

Owner: `docs/configuration.md#invocation-and-results`
Entities:

- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/project-run/check-execution/resolved-checks.execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > runs each independent preflight inside its admitted Task lifecycle`
- `bun|src/project-run/check-execution/task-local-preflight.test.ts|Package Run direct Check execution > blocks success dependents before their preflight and lets observers read the terminal result`
- `bun|src/project-run/check-execution/preflight-cancellation.test.ts|Package Run direct Check execution > passes the invocation signal to admitted preflights and closes cancelled Check Tasks`
- `bun|src/project-run/check-execution/preflight-messages.test.ts|Package Run direct Check execution > canonicalizes continue fallbacks and retains preflight messages through execution settlement`
- `bun|src/project-run/check-facts-record-misuse.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-facts-aggregation.test.ts|Package Run Check facts integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
  Proves:
- Completed, output failure, and execution-phase-cancelled final-snapshot `RunResult` values expose only accepted detached `{ checkId, level, code, message }` items. Invalid attachments and author results rejected by Record settlement expose no partial messages.
- `checkMessages` preserves author order within each Check and canonical snapshot Check order across parallel settlement; disabling progress or a settled progress writer failure does not remove it.
- Task-local preflight receives the invocation signal only after admission; cooperative cancellation closes the existing execution phase as `cancelled` without admitting pending author work.
- A real Run preserves attention-Check Records, dependent admission, aggregation, canonical durations and machine-v4 facts while returning accepted messages separately; validated machine bytes and models contain neither messages nor visibility.

## Case ADD-SECRET-DETECTION-AUTHORING-001: Secret detection requires an explicit closed files policy

Owner: `docs/checks/secret-detection.md#参数与默认配置`
Entities:

- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > requires a complete explicit files policy and publishes the public parser`

Proves:
- `secretDetection` rejects missing or partial files authoring, freezes only its closed resource/waiver options, and exposes a parser that verifies the five safe final-count invariants.
