# Source changes and reuse evidence

Comparison: `21777db37c0284308b8c69eb2cc92ab0b012cd9b` → `5cb448b23453edc90e02b25d003efd57dcdd3509`.
Production membership is unchanged: 322 files retain identical bytes and 25 changed.
[source-inventory.json](source-inventory.json) owns exact hashes and the final historical local-review entries,
including the 46-file analyzer deep review.

## Reuse and current reachability

Byte identity supports local semantic reuse. Current input cardinality, call frequency, caching and branch reachability
were checked separately for all 39 candidates. The conservative import/export graph flags 176 unchanged files that may
reach changed modules; type-only edges can overstate impact, while callbacks and external dispatch can escape it.
`changedLiteralDependencies` is therefore a navigation aid, with owner-level call review supplying the semantic judgment.

The [candidate summary](candidate-status.md) distinguishes normal, fallback, measurement, standalone graph, invalid-input
and trusted-cache paths. Key separations include R04 singleton versus multi-task scopes, T02 prepared versus fallback
indexes, K01 lookup versus pruning, K05 cached facts versus live target authorization, K06 success reuse versus failure
retry, and C01 deduplication versus C06 inherited-prefix materialization.

## The 25 changed production files

Paths below are relative to the repository root. Each row retains the observed delta and behavior boundary;
full hashes and exact anchors are available in the inventory and candidate JSON.

| Source | Delta and behavior boundary |
| --- | --- |
| `src/check-settlement/outcome-normalization.ts` | C03: duplicate blocker IDs now use a per-array Set; rejection and authored order unchanged. Public failed-prerequisite normalization still reaches this owner. |
| `src/check-settlement/session.ts` | C02: slot Map and known-ID Set initialized once per session; reads/terminals use stable indexes. No per-terminal rebuild. Ordered slots remain for publication. |
| `src/package-checks/duplicate-detection/area-policy.ts` | K04: path policies retain both policies and area-ID Set; intersection uses Set.has. All-location intersection and minimum-policy output preserved. |
| `src/package-checks/file-metrics/scc/batch-planner.ts` | K07: fixed argument units plus rolling per-path units replace growing prefix reconstruction; batch ceiling, flush order and escaping units preserved. |
| `src/package-checks/maintenance-reminders/maintenance-reminders.ts` | K06: exactly one invocation-local MaintenanceReminderMeasurementSession before ordered reminder loop. |
| `src/package-checks/maintenance-reminders/measurement.ts` | K06: first history index Map, successful base-resolution Map and lazy changed-line prefix cache. Failures are not cached; failed Git may intentionally retry. Caller abort checked before stages. |
| `src/package-checks/markdown-link-validation/local-resolution.ts` | K05: anchor membership now receives ReadonlySet and calls has; original parsed heading facts remain unchanged. |
| `src/package-checks/markdown-link-validation/resolver-engine.ts` | K05: WeakMap keyed by immutable facts lazily builds one heading-slug Set per facts instance. Live target authorization remains before fact reuse. |
| `src/package-checks/markdown-lint/records.ts` | K14: sort comparator reads raw line/range columns; public frozen range DTO only formed for emitted records; deterministic sort remains. |
| `src/package-checks/project-files/filesystem-collection.ts` | K01: directory-local name-to-all-raw-entries Map, not a cross-operation FS cache. Lossy-name collisions and no-follow validation retained. K02 prefix slice/join remains. |
| `src/package-tools/learned-critical-path/critical-path-ranking.ts` | T01: one first-occurrence prediction Map for ranking DFS; memoized per-task traversal remains. Exported-private score find helper has no production callers in current graph. |
| `src/package-tools/learned-critical-path/duration-model/prediction.ts` | T01: history identity Map built once, prediction map pass reuses it; bounds H<=4096/W<=32 and median/sort remain. Private linear predictionForTask helper unused by current production callers. |
| `src/package-tools/learned-critical-path/duration-model/recording.ts` | T01: prediction Map once per recording, sampleForAdmission gets by task ID; sample materialization/history truncation remain output-sensitive. |
| `src/package-tools/learned-critical-path/selection-layers.ts` | T02: graph indexes now optional injected prebuilt object; normal prepared strategy supplies it. Default parameter rebuild remains reachable from staticDecision fallback. Activation includes remains conditional multi-task-scope work. |
| `src/package-tools/learned-critical-path/strategy.ts` | T01/T02: prepared decisionIndexes include task/scope/prediction/score Maps. Invalid identity/model/ranking setup selects staticDecision, which rebuilds layers; normal candidate sorting still present. |
| `src/project-definition/check-tree/collection-authoring.ts` | C01: first-seen identifier Set replaces growing includes while preserving first order. C06 inherited edit materialization in unchanged resolution.ts remains. |
| `src/project-run/check-execution/dependencies.ts` | R08: direct relation/dependency Sets created once per callback, get authorization has. list still returns all requested direct facts and delegates settlement indexed lookup. |
| `src/project-run/check-execution/flag-controls.ts` | R08: runFlags Set once per selection invocation; AST traversal and dependency-closure visited semantics unchanged. |
| `src/project-run/invocation/paths.ts` | R08: per-invocation artifact-directory Map facade replaces per-Check array find; collision naming and no-base empty behavior retained. |
| `src/project-run/task-scheduler/admission-scope-layers.ts` | R02: compiled scope/task slots and activation boolean replace full scope find and activation scanning in Core static selection. |
| `src/project-run/task-scheduler/admission-selection-policy.ts` | R02: active-scope Set per decision, constrained choice fold replaces comparator lookup sort; default ordinary filter/reduce still boundary-linear (R05). |
| `src/project-run/task-scheduler/execution-state.ts` | R03: invocation graph fingerprint cache field added. R05 snapshot still scans scopes and copies pending/running/settled each boundary. |
| `src/project-run/task-scheduler/graph-validation.ts` | R04 partial: tasks grouped by scope once; old singleton scope all-task filter removed. Per nonterminal scoped-task reachability, direct dependsOn/observes membership, and four successful preparation boundaries remain. |
| `src/project-run/task-scheduler/scheduler-blocker-summary.ts` | R01: per-boundary settled kind Map / held mutex Set / resource Map replace per-relation linear searches. Rebuilding and pending scan remain R05/R09, not old R01 cubic proof. |
| `src/project-run/task-scheduler/scheduler-observation.ts` | R03: graph fingerprint lazily cached per invocation; R09 demand-enabled public-shaped admission/pending scan unchanged. |

## Evidence boundary

Mechanical checks closed 347 inventory entries, 25 delta notes, 39 unique candidate IDs and their current source anchors.
These checks establish identity and coverage; source reasoning, deterministic counts and elapsed-time measurements retain
separate evidence roles. Historical timings stay bound to their original revision and runtime.

Actual consumer dimensions and budgets, heap/GC behavior, engine string/regex operations, third-party internals and
arbitrary project callbacks remain unknown. Product behavior was unchanged by this investigation.
