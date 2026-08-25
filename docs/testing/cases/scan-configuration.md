# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition authoring fails closed

Owner: `docs/configuration.md#public-authoring-surface`
Entities:

- `bun|src/contract/public-api.test.ts|public API inventory > owns five runtime functions, three ordinary built-in values, and minimal type roots`
- `bun|src/definition/effect-defaults.test.ts|Project Definition effect defaults > uses the Definition-owned default effect values`
- `bun|src/definition/project-definition.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/definition/project-definition.test.ts|Project Definition > normalizes ordinary recursive Checks without a Record catalog`
- `bun|src/definition/project-definition.test.ts|Project Definition > uses exact scheduling inheritance and rejects retired catalog fields`
- `bun|src/definition/project-definition.test.ts|Project Definition > normalizes executable visibility and rejects container visibility`
- `bun|src/definition/project-definition.test.ts|Project Definition > ignores inherited visibility while defaulting executable Checks`
- `bun|src/definition/project-definition.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
- `bun|src/definition/project-definition.test.ts|Project Definition > accepts parsers only on executable providers and excludes them from declarative identity`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|accepts a candidate in an external consumer`
  Proves:
- The public authoring surface contains five operations, including the specialized `maintenanceReminders` constructor, and three ordinary complete default Check values; it does not add a configuration-adjustment or operational-dependency API.
- Recursive executable Checks normalize with their own final-result/reporting contract. Explicit `inherit` remains the only scheduling inheritance marker, unknown declarative inputs fail closed, and callback functions stay outside declarative fingerprints. Closed declarative JSON preserves every own data key, including `__proto__`, without retaining an author-controlled prototype. An executable typed provider retains its required parser for trusted runtime consumers but excludes it from declarative identity; a container or malformed parser fails closed. Executable `visibility` normalizes omitted/undefined to `always`, rejects container or unknown declarations, ignores inherited values, and makes `attention` a distinct declarative fingerprint.
- The emitted public declaration keeps a provider parser required, anchors passed/failed data to its return type, and preserves ordinary, options, recursive, and native-spread authoring without a consumer cast or manual read generic.

## Case WB-MAINTENANCE-REMINDER-CONFIGURATION-001: Specialized maintenance reminder authoring is one closed ordinary Check

Owner: `docs/configuration.md#维护提醒`
Entities:

- `bun|src/checks/builtins/maintenance-reminders.test.ts|maintenance reminders > constructs one fixed Check, validates full composed policy, and fingerprints entries`
  Proves:
- `maintenanceReminders(entries)` creates exactly one fixed-ID, attention ordinary Check with package-owned Git options; it does not create a child Check collection.
- Its complete composed options accept only dense, uniquely identified reminder policies with full immutable bases, positive limits, non-empty messages, recognized modes, and a complete Git executable branch. Invalid/unknown replacement data closes as a Definition configuration result, while policy changes affect the declarative fingerprint.

## Case WB-PROGRESS-EFFECT-001: Progress remains an optional fail-open Run effect

Owner: `docs/configuration.md#run-effects-and-compatibility-boundary`
Entities:

- `bun|src/run/progress-invocation.test.ts|Package Run progress effects > presents enabled Package Run progress through the injected plain writer`
- `bun|src/run/progress-invocation.test.ts|Package Run progress effects > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/run/progress-invocation.test.ts|Package Run progress effects > contains progress writer failures while preserving completed Check facts`
- `bun|src/run/progress-result-priority.test.ts|Package Run progress result priority > keeps an execution failure distinct when progress presentation has failed`
- `bun|src/run/progress-result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
- `bun|src/run/progress-default-effects.test.ts|Package Run default effects > keeps default progress and publication effects independently successful`
- `bun|src/run/progress-result-priority.test.ts|Package Run progress result priority > keeps execution cancellation distinct when progress presentation has failed`
- `bun|src/run/progress-invocation.test.ts|Package Run progress effects > contains a TTY rewrite failure without leaving Check or Record facts open`
- `bun|src/run/progress-invocation.test.ts|Package Run progress effects > continues output publication after a progress writer failure`
- `bun|src/run/progress-invocation.test.ts|Package Run progress effects > selects cache before progress when both effects fail`
  Proves:
- Disabling the existing progress effect does not construct its writer or affect Check execution.
- A progress write failure marks only the progress effect failed and stops later progress writes. Completed Check facts and accepted `checkMessages` return through the effect-failure result, while execution cancellation and `task-engine-failed` each retain their distinct execution result kind.
- Header, settled-row and TTY cursor-rewrite failures are first-error-only: subsequent progress writes stop, while all Check and Record facts close. Default progress and output publication remain separate enabled effects with independently observable success statuses; final effect diagnostics select the deterministic `cache → progress → output` priority when several effects fail.

## Case WB-RUN-RESULT-CHECK-MESSAGES-001: Final-snapshot Run results retain accepted Check messages

Owner: `docs/configuration.md#invocation-and-results`
Entities:

- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/run/check-execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/run/core-integration.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/run/core-integration.test.ts|Package Run core integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
- `bun|src/run/progress-result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
  Proves:
- Completed, effect-failed, and execution-phase-cancelled final-snapshot `RunResult` values expose only accepted detached `{ checkId, level, code, message }` items. Invalid attachments and author results rejected by Record settlement expose no partial messages.
- `checkMessages` preserves author order within each Check and canonical snapshot Check order across parallel settlement; disabling progress or a settled progress writer failure does not remove it.
- A real Run preserves attention-Check Records, dependent admission, aggregation, canonical durations and machine-v4 facts while returning accepted messages separately; validated machine bytes and models contain neither messages nor visibility.
