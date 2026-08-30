# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition grammar fails closed

Owner: `docs/configuration.md#recursive-check-tree`
Entities:

- `bun|src/project-definition/project-definition.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > normalizes ordinary recursive Checks without a Record catalog`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > uses exact scheduling inheritance and rejects retired catalog fields`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > normalizes executable visibility and rejects container visibility`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > ignores inherited visibility while defaulting executable Checks`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > accepts parsers only on executable providers and excludes them from declarative identity`
  Proves:

- Recursive ordinary Checks normalize only the declared executable/container grammar. Explicit `inherit` is the scheduling inheritance marker, executable visibility is canonical while container or unknown declarations fail closed, and trusted execution/parser functions remain outside declarative fingerprints.
- Canonical declarative data preserves ordinary authored values without retaining author-controlled prototypes or callback identity; an executable provider must retain its parser while containers and malformed parser declarations fail closed.

## Case AUX-PACKAGE-CHECK-COMPOSITION-001: Package Check options remain Definition-opaque before preflight

Owner: `docs/configuration.md#package-provided-check-composition`
Entities:

- `bun|src/project-definition/project-definition.test.ts|Project Definition > accepts ordinary authored JSON options while their Check preflight owns domain validation`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > accepts ordinary JSON Schema options while their Check preflight owns domain validation`
  Proves:

- Definition preserves authored package Check options as declarative JSON without interpreting their domain shape; the owning Check preflight, not Definition normalization, decides whether ordinary JSON or JSON Schema options are valid before execution.

## Case AUX-PUBLIC-AUTHORING-TYPES-001: Public authoring values and declarations remain usable from an installed package

Owner: `docs/configuration.md#public-authoring-surface`
Entities:

- `bun|scripts/package/public-api-inventory.test.ts|public API inventory > publishes only the approved runtime and type roots`
- `bun|scripts/package/candidate/isolated-consumer-types.test.ts|external consumer type acceptance`
  Proves:

- The public package exposes only the documented generic authoring/run operations, seven package-provided Check functions, seven named final-data parsers, and their required authoring/resolved/final/Record/reason type roots.
- An ancestry-external TypeScript consumer imports and typechecks that public surface and declaration documentation without casts or manual dependency-read generics; every package Check export is callable and retains its typed parser relation.

## Case AUX-MARKDOWN-LINK-OPTIONS-001: Markdown Link authoring defaults remain partial and bounded

Owner: `docs/configuration.md#markdown-link-validation`
Entities:

- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > materializes bounded Markdown Link defaults and rejects malformed resolved options`
  Proves:
- `markdownLinkValidation(options?)` accepts closed partial authoring fields, defaults `findingPolicy` to blocking, fills and freezes the complete bounded resolved policy, and exposes its final-data parser. Unknown authoring fields or an unsupported policy fail synchronously; malformed complete replacements fail in the owning Check before execution with an actionable message.

## Case WB-MAINTENANCE-REMINDER-CONFIGURATION-001: Specialized maintenance reminder authoring is one closed ordinary Check

Owner: `docs/configuration.md#维护提醒`
Entities:

- `bun|src/package-checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > constructs one fixed Check, validates full composed policy, and fingerprints entries`
  Proves:
- `maintenanceReminders(entries)` creates exactly one fixed-ID, attention ordinary Check with package-owned Git options; it does not create a child Check collection.
- Its complete composed options accept only dense, uniquely identified reminder policies with full immutable bases, positive limits, non-empty messages, recognized modes, and a complete Git executable branch. It exposes a discriminated final-data parser; invalid/unknown replacement data settles the owning Check unavailable in preflight with an actionable message, while policy changes affect the declarative fingerprint.

## Case WB-PROGRESS-OUTPUT-001: Progress rendering is a Run-owned output

Owner: `docs/configuration.md#run-outputs-and-compatibility-boundary`
Entities:

- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > presents enabled Package Run progress through the injected plain writer`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > contains progress writer failures while preserving completed Check facts`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > schedules one 5-second TTY heartbeat and cancels it after the last Check settles`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > keeps an execution failure distinct when progress presentation has failed`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
- `bun|src/project-run/progress-rendering/default-outputs.test.ts|Package Run default outputs > keeps default progress and publication outputs independently successful`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > keeps execution cancellation distinct when progress presentation has failed`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > contains a TTY rewrite failure without leaving Check or Record facts open`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > continues output publication after a progress writer failure`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > returns output facts when machine publication alone fails`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > keeps both failed outputs and prioritizes progress rendering`
  Proves:
- Disabling progress rendering does not construct its writer or affect Check execution.
- Enabled TTY progress owns one 5-second heartbeat while Checks are running and cancels it when the last running Check settles; the refresh remains inside presentation and does not alter Check facts.
- A progress writer failure, including one raised by a scheduled TTY heartbeat rewrite, cancels the heartbeat, marks only `outputs.progressRendering` failed, and retains closed Check/Record facts.
- Machine publication failure marks `outputs.machinePublication` failed and returns `kind: "output"` with final facts. When progress rendering and machine publication both fail, their statuses remain observable and progress rendering keeps its existing diagnostic priority.

## Case WB-DIAGNOSTIC-LOGGING-OUTPUT-001: Diagnostic logging is a Product-owned Run output

Owner: `docs/api-mechanics.md#outputs-与-runresult-边界`
Entities:

- `bun|src/project-run/progress-rendering/default-outputs.test.ts|Package Run default outputs > keeps default progress and publication outputs independently successful`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger > renders only bounded descriptor-safe details without invoking author hooks`
- `bun|src/project-run/diagnostic-logging/logger.test.ts|Project Run diagnostic logger > summarizes descriptor-safe normal values without rendering their full lifecycle payload`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > writes one compact invocation start instead of catalog entries for every Check`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > summarizes accepted final data instead of copying it into the diagnostic log`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > does not invoke hostile author details while diagnostic logging is enabled`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > closes diagnostic logging once after an unexpected nonconfiguration failure`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > contains diagnostic logger implementation failures without revising final facts`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > continues output publication after a progress writer failure`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > keeps both failed outputs and prioritizes progress rendering`
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
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > finishes every sequential preflight before any author execution`
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > settles blocked preflights before graph admission without a started fact or duration`
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > passes the invocation signal to cooperative preflights and closes a cancelled barrier`
- `bun|src/project-run/check-execution/resolved-checks.test.ts|Package Run direct Check execution > canonicalizes continue fallbacks and retains preflight messages through execution settlement`
- `bun|src/project-run/check-facts-integration.test.ts|Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/project-run/check-facts-integration.test.ts|Package Run Check facts integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
- `bun|src/project-run/progress-rendering/result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
  Proves:
- Completed, output failure, and execution-phase-cancelled final-snapshot `RunResult` values expose only accepted detached `{ checkId, level, code, message }` items. Invalid attachments and author results rejected by Record settlement expose no partial messages.
- `checkMessages` preserves author order within each Check and canonical snapshot Check order across parallel settlement; disabling progress or a settled progress writer failure does not remove it.
- The sequential preflight barrier receives the invocation signal; cooperative cancellation closes the existing execution phase as `cancelled` even when all blocked Checks leave no scheduler task to admit.
- A real Run preserves attention-Check Records, dependent admission, aggregation, canonical durations and machine-v4 facts while returning accepted messages separately; validated machine bytes and models contain neither messages nor visibility.
