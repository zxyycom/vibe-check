# Consumer and Test-Evidence Audit

Date: 2026-09-01

This is implementation evidence for Readiness 0.2 and 0.3. It records the non-archived source tree as it was when that readiness audit ran; it is not a current-contract inventory after the hard cut. In the migration tables, “Current relation / read” is the relation/read at that snapshot and “Expected field after cut” is the required migration result. Current Product behavior belongs to the stable owner documents, while this Change's completed implementation and verification evidence belongs to `design.md` and `tasks.md`. This audit neither changes public behavior nor supersedes the Change design, owner documentation, or Decision evolution required by task 0.1.

## Audit boundary and method

Searched all non-archived workspace occurrences of the authored `dependsOn` spelling, then read each occurrence in its consumer context. The migration table includes effective Check authoring in Product-adjacent Gate code, examples, package-candidate fixtures, and tests. It deliberately excludes:

- Check field declarations, parsers, normalization, fingerprints, and scheduler graph implementation under `src/check/**`, `src/project-definition/**`, and `src/project-run/task-scheduler/**`: these are implementation owners, not consumers to classify;
- current/archived Decisions: 0.1 owns their evolution;
- prose that only describes the current contract, except where it owns a runnable example or must be changed with that example.

Classification rule from this Change:

- **Success prerequisite — retain `dependsOn`:** execution/preflight must not begin unless provider is `passed`; its final data is required to perform the work.
- **Terminal observation — migrate to `observes`:** consumer intentionally receives a failed, unavailable, or not-applicable upstream outcome in order to audit, summarize, or make ordinary TypeScript policy decisions.
- **Test corpus / validation:** an authored fixture or generic Task graph exists only to prove validation or current behavior. Convert it only when the asserted product behavior is an observation; otherwise retain/extend it as the relevant implementation test.

## Effective consumer migration inventory

### Success prerequisites: retain `dependsOn`

| Path and consumer | Relation / read at readiness snapshot | Reason | Expected field after cut |
| --- | --- | --- | --- |
| `scripts/project/gate/checks/process/process.ts` — `createProcessCheckWithDataDependency` | One provider; `dependencies.get`; derives process environment before starting a child process | A valid passed provider data value is necessary for process options. Existing defensive `get`/parser failure handling remains a boundary defense, but Scheduler correctness must no longer rely on it to prevent process start. | `dependsOn: [dependency.checkId]` |
| `scripts/project/gate/checks/process/process.ts` — `createProcessCheckWithDataDependencyAndSuccessData` | One provider; `dependencies.get`; derives environment and validates process output against provider data | Same successful-provider requirement; child work and typed success data must not be formed from a non-passed provider. | `dependsOn: [dependency.checkId]` |
| `scripts/project/gate/checks/external-consumer-material.ts` — `prepared-external-package-consumer` | Uses the typed-success process constructor with `prepared-package-candidate` | Candidate material is an input prerequisite to creating an external consumer. | Inherited constructor `dependsOn` |
| `scripts/project/gate/checks/test-execution/entries.ts` via `createProjectGateProcessEntry` — package artifact acceptance | Receives prepared-candidate data | Artifact acceptance consumes a successful exact candidate. | `dependsOn: [prepared-package-candidate]` |
| Same Gate entry factory — external consumer types/docs/runtime acceptance | Receives prepared-external-package-consumer data | These consumers need the prepared external-consumer provider to have succeeded. | `dependsOn: [prepared-external-package-consumer]` |
| `docs/examples/package-api/typed-dependency.ts` — `analyze-changed-files` | Parses one changed-files provider result | Published example is a provider-to-work consumer, not an audit. It should keep success-only admission; its `read.status` result construction can be simplified/documented as passed-only after the hard cut. | `dependsOn: [changedFiles.checkId]` |
| `scripts/package/candidate/external-consumer/fixtures/runtime.mjs` — `second-changed-files-consumer` | Uses `dependencies.get` then provider parser | Runtime acceptance’s second consumer demonstrates ordinary successful typed data handoff. | `dependsOn: [changedFiles.checkId]` |

### Terminal observations: migrate to `observes`

| Path and consumer | Relation / read at readiness snapshot | Why it must run after non-passed settlement | Expected field after cut |
| --- | --- | --- | --- |
| `docs/examples/artifacts/mixed-outcomes/definition.ts` — `releaseWorkflow` inheritance to `releaseInputs`, `releasePolicy`, `optionalDocumentation`, and `externalReview` | Group `dependsOn: [packageManifest.checkId]` | The published mixed-outcomes example intentionally forms all four states. A failed/unavailable/not-applicable manifest must remain visible to `releasePolicy` rather than block the whole subtree. | `observes: [packageManifest.checkId]` |
| Same example — `releasePolicy` | `dependsOn: inherit({ add: [releaseInputs.checkId] })`; `dependencies.get` parses both manifest and release-input outcomes and emits policy Records | This is explicitly a downstream policy/audit: it examines final data and turns invalid inputs into its own failed result. It must observe the group-inherited manifest and `releaseInputs` even when either is non-passed. | `observes: inherit({ add: [releaseInputs.checkId] })` |
| `scripts/package/candidate/external-consumer/fixtures/runtime.mjs` — `first-changed-files-consumer` | `dependencies.list()` and explicitly accepts both `passed` and `failed` data | This deliberately proves outcome enumeration and returns the upstream status, so a failed upstream is a meaningful observed outcome. | `observes: [changedFiles.checkId]` |
| `scripts/package/candidate/external-consumer/type-acceptance.ts` — `changedFilesConsumer` | `dependencies.list()` and accepts both `passed` and `failed` data | Installed declaration acceptance must demonstrate direct four-state observation without casts; retaining `dependsOn` would make its failed branch unreachable. | `observes: [changedFiles.checkId]` |
| `src/project-run/check-execution/resolved-checks.dependencies.test.ts` — `assertSingleSettledDependencyRead` dependent and `src/project-run/check-execution/resolved-checks.dependencies.test-support.ts` list fixture | Direct getter/list over passed, failed, not-applicable, unavailable cases | These fixtures are the primary four-state readback proof. They must use `observes` so all four callbacks still run. | `observes: ["source"]` / four source IDs |
| `src/project-run/run.test-support.ts` — `assertUnavailableDependencyRead` dependent | Getter read failure after unavailable source | This is a terminal-readback fixture, not a successful prerequisite. | `observes: ["unavailable"]` |
| `src/project-run/run-dependency-data.test-support.ts` — inherited list container | Inherited effective collection includes failed and passed sources; child lists both | The fixture proves inherited ordered outcome enumeration, including failed. | `observes: ["inherited-list-omega", "inherited-list-alpha"]` |

### Test corpus and validation: implementation-owned updates, not production migrations

| Path / entity | Classification and required test evolution |
| --- | --- |
| `src/project-run/check-execution/preflight-barrier.test.ts` — blocked preflight plus dependent | **Replace old behavior.** It currently proves a dependent executes after upstream preflight blocks. Under the new contract, a `dependsOn` dependent must have neither preflight nor execution called, then settle Product-owned `unavailable / dependency-not-passed` with null duration and only direct blocker IDs. Add a separate `observes` variant to prove it does execute after that terminal settlement. |
| `src/project-run/controls/flags.test.ts` — “keeps dependent admission after local not-applicable” | **Replace old behavior.** Keep this as a `dependsOn` non-passed blocking regression (no dependent author call); add/use an observer fixture only if callback readback is required. |
| `src/project-run/check-execution/resolved-checks.test-support.ts`, `src/project-run/run.test-support.ts` helper shapes | **Fixture plumbing.** Add `observes` authoring support independently of `dependsOn`; do not make a helper infer one relation from the other. |
| `src/project-definition/project-definition.recursive-checks.test.ts`, `project-definition.scheduling-inheritance.test.ts`, `project-definition.fingerprint.test.ts` | **Definition validation corpus.** Preserve `dependsOn` coverage for exact replacement/inheritance/fingerprint; add parallel `observes` coverage, union unknown/self/cycle checks, and same-pair double-declaration rejection. |
| `scripts/project/gate/definition.test.ts` and `scripts/project/gate/runtime/entries.ts` | **Gate relation validation.** Existing checks only enumerate `dependsOn`. Extend entry closure, self/missing/selection validation to both relations and their union; retain the actual candidate/process success-prerequisite assertions. |
| `src/project-run/run-planning.test.ts`, `src/project-run/task-scheduler/task-engine.*.test.ts`, and `task-engine.test-support.ts` | **Generic graph corpus.** These are private task-engine dependency tests, not public Check observers. Retain generic failure/cancellation semantics and extend the Check projection/settlement seam to distinguish expected non-passed Check prerequisites from engine failures; do not add public `observes` semantics directly to the generic engine without the design’s package-private projection. |
| `src/project-run/check-facts-publication.test-support.ts`, `check-facts-record-misuse.test-support.ts`, `controls/flags.test.ts` setup, and `run.test-support.ts` inherited helper | **Supporting fixture authoring.** Reclassify only the fixtures that intentionally read non-passed outcomes; leave incidental passed-only setup as `dependsOn` or relation-free. |
| `scripts/package/candidate/external-consumer/type-acceptance.test.ts`, `runtime.test.ts`, and `documentation.test.ts` | **Package candidate acceptance.** Update the installed consumer fixtures above, then keep their outer test entities. The docs test must execute the changed mixed-outcomes artifact. |

## Documentation/example synchronization required at Readiness

The runnable examples above are source-of-truth inputs for package projection/acceptance. The hard cut therefore required implementation to update the public descriptions in `README.md`, `docs/configuration.md`, `docs/api-mechanics.md`, `docs/architecture.md`, and `docs/scan-scope.md`: `dependsOn` must mean passed prerequisite, while `observes` must mean direct settled-outcome authorization. At this readiness snapshot, statements that only `dependsOn`/`mutex` inherit or that every settled dependency admits a dependent were intentionally stale and had to be replaced.

## Case evidence and narrow test entrypoints at Readiness

| Boundary | Case IDs at readiness snapshot | Narrow test entrypoint | Required evolution at readiness |
| --- | --- | --- | --- |
| Direct relation admission and readback | `WB-RUNTIME-CHECK-ORCHESTRATION-001` | `bun test src/project-run/check-execution/resolved-checks.dependencies.test.ts src/project-run/run-dependency-data.test.ts src/project-run/controls/flags.test.ts src/project-run/run-planning.test.ts` | Its current proof says every settled outcome admits `dependsOn`. Revise it for all-passed `dependsOn`, and add a distinct observer Case (recommended ID: `WB-RUNTIME-DEPENDENCY-OBSERVATION-001`) for four-state `observes` getter/list and union authorization. |
| Preflight lifecycle, messages, cancellation | `WB-RUNTIME-CHECK-CATALOG-001`, `WB-RUN-RESULT-CHECK-MESSAGES-001` | `bun test src/project-run/check-execution/preflight-barrier.test.ts src/project-run/check-execution/preflight-cancellation.test.ts src/project-run/run-preflight-cancellation.test.ts src/project-run/check-execution/preflight-messages.test.ts` | Both Cases currently describe a sequential global preflight barrier. Evolve their proof/entities to task-local readiness-gated preflight; add direct tests that blocked prerequisite prevents dependent preflight/execution, while observer preflight starts only after terminal observation. Retain cancellation-before-admission and drain assertions. |
| Scheduler task settlement, capacity, cancellation | `AUX-PARALLEL-RUNNER-001` | `bun test src/project-run/task-scheduler/task-engine.static-validation.test.ts src/project-run/task-scheduler/task-engine.admission.test.ts src/project-run/task-scheduler/task-engine.settlement.test.ts src/project-run/task-scheduler/task-engine.scope-capacity.test.ts src/project-run/check-execution/plan.test.ts` | Preserve generic executor failure and cancellation evidence. Add/modify Product projection tests showing non-passed Check outcome creates expected prerequisite block without being reported as generic engine invariant failure; observers remain admissible. |
| Check facts / blocked outcome closure | `WB-RUNTIME-CHECK-LIFECYCLE-001`, `WB-RUNTIME-CHECK-DURATION-001` | `bun test src/project-run/check-execution/resolved-checks.execution.test.ts src/project-run/check-settlement/session-lifecycle.test.ts src/project-run/check-facts-aggregation.test.ts` | Add a Product-owned blocked dependent fact: unavailable reason code `dependency-not-passed`, stable direct `checkIds`, null duration, no author Record/message, canonical progress/aggregation/publication closure. This is a distinct observable contract; recommended new Case ID: `WB-RUNTIME-DEPENDENCY-BLOCKING-001`. |
| Gate typed provider / process side effect | `AUX-PROJECT-GATE-PROCESS-001`, `AUX-PROJECT-GATE-CATALOG-001` | `bun test scripts/project/gate/checks/process/process.test.ts scripts/project/gate/definition.test.ts scripts/project/gate/checks/external-consumer-material.test.ts` | Existing Process Case already requires passed provider/no child process otherwise. Add full Run regression to prove Scheduler itself prevents the dependent preflight/process callback when the typed provider fails or is unavailable; preserve boundary parser defense. |
| Public authoring, candidate runtime, docs | `AUX-PUBLIC-AUTHORING-TYPES-001`, `AUX-PACKAGE-EXTERNAL-CONSUMER-001`, `AUX-PACKAGE-API-EXTERNAL-EXECUTION-001` | `bun test scripts/package/candidate/external-consumer/type-acceptance.test.ts scripts/package/candidate/external-consumer/runtime.test.ts scripts/package/candidate/external-consumer/documentation.test.ts` | Evolve installed type fixture to use `observes`; add negative type/runtime validation for dual relation and graph errors. Runtime fixture must prove observer readback after failed source, successful `dependsOn` data flow, and no dependent author call for non-passed prerequisite. Docs acceptance proves shipped examples and four outcomes. |

## Acceptance coverage gap summary at Readiness

The Case closure at this snapshot was mechanically complete but semantically encoded the replaced behavior in the direct-dependency and preflight Cases. No Case then proved all of the new obligations together. The implementation therefore had to add or evolve evidence for:

1. all three non-passed statuses block `dependsOn` before both preflight and execution, with direct-only stable blocker IDs and null duration;
2. `observes` runs once after each of all four upstream terminal outcomes and can use both `get` and `list` over the authorized relation union;
3. dual-relation unknown/self/cycle validation and same-pair overlap rejection, including `inherit({ add, remove })` for both collections;
4. task-local preflight readiness under mutex/capacity/priority/cancellation, without reviving a global preflight barrier;
5. complete Product lifecycle/console/progress/aggregation/machine-output closure for a blocked dependent; and
6. installed package type, runtime, and documentation examples for the hard cut.

No new Case was warranted for process parser guards or generic engine cancellation alone: those existing Cases retain independent proof purposes. The two recommended new Cases above were required only if their final assertions could not be meaningfully incorporated into the evolved existing owner Case without obscuring the independent observer and blocked-fact contracts.
