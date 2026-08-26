# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition authoring fails closed

Owner: `docs/configuration.md#public-authoring-surface`
Entities:

- `bun|scripts/docs/package-api/public-api-inventory.test.ts|public API inventory > owns five runtime functions, six package-provided ordinary Check values, and minimal type roots`
- `bun|src/project-definition/output-defaults.test.ts|Project Definition output defaults > uses the Definition-owned default output values`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > normalizes ordinary recursive Checks without a Record catalog`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > uses exact scheduling inheritance and rejects retired catalog fields`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > normalizes executable visibility and rejects container visibility`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > ignores inherited visibility while defaulting executable Checks`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > accepts ordinary authored JSON options while their Check preflight owns domain validation`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > accepts ordinary JSON Schema options while their Check preflight owns domain validation`
- `bun|src/project-definition/project-definition.test.ts|Project Definition > accepts parsers only on executable providers and excludes them from declarative identity`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|accepts a candidate in an external consumer`

Proves:

- The public authoring surface contains five operations and six complete, valid package-provided ordinary Check values, plus the specialized `maintenanceReminders` constructor rather than a seventh package value or an operational-dependency API. `jsonValidation` owns its closed `{ files, maximumBytes }` options; `jsonSchemaValidation` additionally owns identity mode, explicit registry/bindings and offline/allowlisted source policy; `markdownLinkValidation` closes its local-target policy and bounded limits. Each value carries its own block preflight. Definition keeps package fields opaque and authored options declarative; Run calls the preflight barrier and settles an illegal replacement only as the owning Check unavailable, even when its Check ID is changed; native replacement never fills a missing branch.
- Recursive executable Checks normalize with their own final-result/reporting contract. Explicit `inherit` remains the only scheduling inheritance marker, unknown declarative inputs fail closed, and trusted preflight/execution/parser functions stay outside declarative fingerprints. Options remain authored declarative JSON; an optional preflight runs before every execution, canonicalizes its invocation-local prepared/fallback value, and block/throw/malformed values settle only the owning Check unavailable. Closed declarative JSON preserves every own data key, including `__proto__`, without retaining an author-controlled prototype. An executable typed provider retains its required parser for trusted runtime consumers but excludes it from declarative identity; a container or malformed parser fails closed. Executable `visibility` normalizes omitted/undefined to `always`, rejects container or unknown declarations, ignores inherited values, and makes `attention` a distinct declarative fingerprint.
- The emitted public declaration keeps a provider parser required, anchors passed/failed data to its return type, and preserves ordinary, options, recursive, and native-spread authoring without a consumer cast or manual read generic.


## Case AUX-MARKDOWN-LINK-OPTIONS-001: Markdown Link options remain complete and bounded

Owner: `docs/configuration.md#markdown-link-validation`
Entities:

- `bun|src/package-checks/markdown-link-validation/default-check.test.ts|default Check direct callbacks > requires the complete closed Markdown Link options shape and bounded limits`
  Proves:
- The complete exported `markdownLinkValidation` value carries block preflight that rejects omitted, oversized, or unknown option shapes; Run owns the resulting unavailable Check settlement before execution.


## Case WB-MAINTENANCE-REMINDER-CONFIGURATION-001: Specialized maintenance reminder authoring is one closed ordinary Check

Owner: `docs/configuration.md#维护提醒`
Entities:

- `bun|src/package-checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > constructs one fixed Check, validates full composed policy, and fingerprints entries`
  Proves:
- `maintenanceReminders(entries)` creates exactly one fixed-ID, attention ordinary Check with package-owned Git options; it does not create a child Check collection.
- Its complete composed options accept only dense, uniquely identified reminder policies with full immutable bases, positive limits, non-empty messages, recognized modes, and a complete Git executable branch. Invalid/unknown replacement data settles the owning Check unavailable in preflight, while policy changes affect the declarative fingerprint.

## Case WB-PROGRESS-OUTPUT-001: Progress rendering is a Run-owned output

Owner: `docs/configuration.md#run-outputs-and-compatibility-boundary`
Entities:

- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > presents enabled Package Run progress through the injected plain writer`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/project-run/progress-rendering/invocation.test.ts|Package Run progress rendering outputs > contains progress writer failures while preserving completed Check facts`
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
- A progress writer failure marks only `outputs.progressRendering` failed and retains closed Check/Record facts.
- Machine publication failure marks `outputs.machinePublication` failed and returns `kind: "output"` with final facts. If both fail, both statuses are failed and `progress-rendering-failed` is selected deterministically.


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
