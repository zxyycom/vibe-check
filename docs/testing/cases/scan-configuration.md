# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition authoring fails closed
Owner: `docs/configuration.md#public-authoring-surface`
Entities:
- `bun|src/product/public-contract/current.test.ts|current public contract > owns four runtime functions, three ordinary built-in values, public type roots, and effect defaults`
- `bun|src/product/definition/project.test.ts|Project Definition > creates a plain value with product-owned authoring defaults`
- `bun|src/product/definition/project.test.ts|Project Definition > normalizes independently executable parents, children, and an omitted record catalog`
- `bun|src/product/definition/project.test.ts|Project Definition > uses exact collections, clears, and marked inheritance while keeping canonical scheduling`
- `bun|src/product/definition/project.test.ts|Project Definition > accepts empty information-only Checks and returns their non-blocking warnings`
- `bun|src/product/definition/project.test.ts|Project Definition > fails closed for malformed nodes, options, and unmarked inheritance objects`
- `bun|src/product/definition/project.test.ts|Project Definition > fingerprints canonical declarative data, including options but not execution functions`
- `bun|src/product/definition/project.test.ts|Project Definition > keeps complete default Checks mutable through native nested spread before Definition validation`
Proves:
- The public authoring surface contains four operations and three ordinary complete default Check values, not a configuration adjustment or operational-dependency API.
- Recursive executable and information-only Checks normalize independently; exact collections clear inherited values only deliberately through `inherit`, and callback functions stay outside declarative fingerprints.
- Malformed node data, incomplete default option branches, invalid scanner values, unknown default code areas, and unmarked inheritance values fail closed. Native object spread creates a mutable candidate before Definition validation without mutating shared defaults; the duplication default keeps its portable marker across copied Definition fingerprints.

## Case WB-PROGRESS-EFFECT-001: Progress remains an optional fail-open Run effect
Owner: `docs/configuration.md#policy-effects-and-retired-inputs`
Entities:
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > does not create or write a progress writer when Package Run progress is disabled`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > contains progress writer failures while preserving completed Check facts`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > keeps an execution failure distinct when progress presentation has failed`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > mutes ordinary progress events after a settled writer failure while preserving final facts`
- `bun|src/product/run/progress-default-effects.test.ts|Package Run default effects > keeps default progress output logs and publication effects independently successful`
- `bun|src/product/run/progress-result-priority.test.ts|Package Run progress result priority > keeps execution cancellation distinct when progress presentation has failed`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > contains a TTY rewrite failure without leaving Check or Record facts open`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > continues output publication after a progress writer failure`
- `bun|src/product/run/progress-invocation.test.ts|Package Run progress effects > selects cache before progress when both effects fail`
Proves:
- Disabling the existing progress effect does not construct its writer or affect Check execution.
- A progress write failure marks only the progress effect failed and stops later progress writes. Completed Check facts return through the effect-failure result, while execution cancellation and `task-engine-failed` each retain their distinct execution result kind.
- Header, settled-row and TTY cursor-rewrite failures are first-error-only: subsequent progress writes stop, while all Check and Record facts close. Default progress, output publication and logs remain separate enabled effects with independently observable success statuses; final effect diagnostics select the deterministic `cache → progress → output → logs` priority when several effects fail.
