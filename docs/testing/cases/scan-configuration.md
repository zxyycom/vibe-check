# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition authoring fails closed

Owner: `docs/configuration.md#public-authoring-surface`
Entities:

- `bun|src/product/public-contract/current.test.ts|current public contract > owns four runtime functions, three ordinary built-in values, minimal type roots, and effect defaults`
- `bun|src/product/definition/project.test.ts|Project Definition > creates a plain value with Product-owned authoring defaults`
- `bun|src/product/definition/project.test.ts|Project Definition > normalizes ordinary recursive Checks without a Record catalog`
- `bun|src/product/definition/project.test.ts|Project Definition > uses exact scheduling inheritance and rejects retired catalog fields`
- `bun|src/product/definition/project.test.ts|Project Definition > normalizes executable visibility and rejects container visibility`
- `bun|src/product/definition/project.test.ts|Project Definition > ignores inherited visibility while defaulting executable Checks`
- `bun|src/product/definition/project.test.ts|Project Definition > fingerprints canonical declarative data without retaining callback functions`
  Proves:
- The public authoring surface contains four operations and three ordinary complete default Check values, not a configuration adjustment or operational-dependency API.
- Recursive executable Checks normalize with their own final-result/reporting contract. Explicit `inherit` remains the only scheduling inheritance marker, unknown declarative inputs fail closed, and callback functions stay outside declarative fingerprints. Executable `visibility` normalizes omitted/undefined to `always`, rejects container or unknown declarations, ignores inherited values, and makes `attention` a distinct declarative fingerprint.

## Case WB-PROGRESS-EFFECT-001: Progress remains an optional fail-open Run effect

Owner: `docs/configuration.md#run-effects-and-compatibility-boundary`
Entities:

- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > presents enabled Package Run progress through the injected plain writer`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > contains progress writer failures while preserving completed Check facts`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > keeps an execution failure distinct when progress presentation has failed`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
- `bun|src/product/run/progress-default-effects.test.ts|Package Run default effects > keeps default progress and publication effects independently successful`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > keeps execution cancellation distinct when progress presentation has failed`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > contains a TTY rewrite failure without leaving Check or Record facts open`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > continues output publication after a progress writer failure`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > selects cache before progress when both effects fail`
  Proves:
- Disabling the existing progress effect does not construct its writer or affect Check execution.
- A progress write failure marks only the progress effect failed and stops later progress writes. Completed Check facts and accepted `checkMessages` return through the effect-failure result, while execution cancellation and `task-engine-failed` each retain their distinct execution result kind.
- Header, settled-row and TTY cursor-rewrite failures are first-error-only: subsequent progress writes stop, while all Check and Record facts close. Default progress and output publication remain separate enabled effects with independently observable success statuses; final effect diagnostics select the deterministic `cache → progress → output` priority when several effects fail.

## Case WB-RUN-RESULT-CHECK-MESSAGES-001: Final-snapshot Run results retain accepted Check messages

Owner: `docs/configuration.md#invocation-and-results`
Entities:

- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > retains supplemental Records independently from a passed final result`
- `bun|src/product/run/check-execution.test.ts|Package Run direct Check execution > keeps completed lifecycle feedback in settlement order but durations in canonical order`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > contains invalid callback outcomes and Record misuse in the owning Check`
- `bun|src/product/run/index.core.test.ts|Package Run core integration > publishes raw facts and derives an aggregate only from explicit selected statuses`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
  Proves:
- Completed, effect-failed, and execution-phase-cancelled final-snapshot `RunResult` values expose only accepted detached `{ checkId, level, code, message }` items. Invalid attachments and author results rejected by Record settlement expose no partial messages.
- `checkMessages` preserves author order within each Check and canonical snapshot Check order across parallel settlement; disabling progress or a settled progress writer failure does not remove it.
- A real Run preserves attention-Check Records, dependent admission, aggregation, canonical durations and machine-v4 facts while returning accepted messages separately; validated machine bytes and models contain neither messages nor visibility.
