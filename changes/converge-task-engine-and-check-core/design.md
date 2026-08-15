# Design

本 Design 是 `converge-task-engine-and-check-core` 的实施契约 owner：它把活动决策投影为本 Change 的数据流、责任边界、实施门禁与验证义务。长期方向仍由 `docs/decisions/**` 拥有，当前事实仍由稳定 docs、source 和 tests 拥有；本文件不替代任一稳定 owner。

## Context

- `proposal.md` 定义问题、目标结果、范围和成功标准；本文件定义本 Change 的目标语义与责任边界；`tasks.md` 保存已完成工作的顺序、门禁和验证闭合。
- 本 Change 所需的长期方向均已建立为活动决策；下文“Contract baseline”按稳定 decision path 列出 owner。它们在 Readiness 时除 Definition/Run binding 外均为 `unaligned` 未来方向，现已随实现与验收核对成为 aligned current facts。
- 在 Readiness 时，已对齐的 `configuration/use-composable-check-tree-with-run-owned-bindings` 是 Definition/Run binding 基线；它现已作为前序归档。当前 successor `configuration/keep-check-groups-authoring-only` 要求 declarative normalization 与 Package Run private binding construction 分层，并保持 group 仅为 authoring context；当前普通 `BuiltInCheck` 与顶层 `replace` / `append` 已落地。本 Change 必须消费这些基线，不得恢复 descriptor carrier 或 normalization-owned built-in binding。
- 在 Readiness 时，runtime 使用 `ResolvedCheckCatalog`、`CheckManager`、`CheckRun`、work-handle acknowledgement、`FinalCoreSnapshot.definitions/runs` 与 publication v2。它们只作为形成时 migration evidence，不是完成 hard cut 后的 current model。
- Readiness 0.1–0.9 在实现前已闭合：测试证据全树、current-to-target 行为映射、owner-to-consumer migration inventory、terminal contract 与 output contract 均已核对。Implementation 随后从 task 1.1 开始；所有任务的完成记录见 `tasks.md`。
- 审阅或维护本 Change 时，若代码、测试或文档与本 Design 冲突，先判断它是 current-state evidence、活动决策还是新的产品约束；不得用 compatibility adapter 保留未经确认的旧架构，也不得把本 Design 的实现局部选择升级为 public contract。

### Terminology

| Term | Meaning and owner |
| --- | --- |
| Check Definition | Project Definition 中一个 leaf Check 的稳定声明式身份、显示信息与 Record 类型目录；Definition owner 负责验证。 |
| Normalized Check | Definition normalization 产生的声明式 leaf projection，包含 Check Definition、继承后的 dependency/mutex/cap 与 built-in options。它不包含 built-in runtime binding、applicability、Core capability 或 Task identity。 |
| Trusted function slots | 从已验证 custom Check authoring value 分离出的 applicability、direct runner 或 TaskPlan factory references。它们不进入 declarative snapshot、fingerprint、Core 或 output，并只在 Package Run pre-work 被消费。 |
| Resolved Check | Package Run pre-work 为一个 Normalized Check 绑定 invocation-scoped applicability、private execution binding 与 operational inputs 后形成的唯一 planning input。它不是额外 public/Core entity。 |
| Task | Task engine 调度的私有执行单元；Task identity、拆分、retry 与 result bookkeeping 不进入 policy、machine output 或 npm API。 |
| Check execution scope | 静态 Task graph 中属于一个 applicable Resolved Check 的 ownership boundary。它承载 `checkId`、scoped cap、RecordSink ownership 与 terminal relation，但不形成第三种 Core entity。 |
| Core Check | 每个 canonical Resolved Check 的 invocation-scoped 最终事实。它包含 definition projection，以及 `not-applicable`、`completed(passed/failed)` 或 `unavailable(diagnostic)` 中的一个闭合 outcome。 |
| QualityRecord | 由 Check-scoped RecordSink 验证并提交的最终领域记录。Record 保持独立稳定 identity，并以 `checkId`、`recordTypeId` 表达归属；不依赖 run instance identity。 |

## Goals / Non-Goals

### Goals

- 用一个静态 Task engine 承接 Product execution 与 repository scripts 的真实共享调度义务。
- 用 Product Check adapter 的 execution scope 连接 private Task settlement 与 Core Check/QualityRecord facts。
- 用“Normalized Checks → 一次 Run resolution → Resolved Checks → Task graph”的单向数据流消除长期按 ID 重组的平行事实源。
- 保持 npm authoring/result API，同时阻止 Task、capability、function slots 和 scheduler internals 泄漏。
- 在 hard cut 前固定所有会改变 terminal semantics 或 v3 public contract 的选择。

### Non-Goals

- 不公开 Task engine internals，不支持动态 Task graph，也不建立第二 scheduler。
- 不让普通 child Task 自动成为 Core Check、policy operand 或 machine entity。
- 不把 scripts-only authoring fields、Check/Core capability 或 Product publication concerns 塞进通用 Task engine contract。
- 不在本 Change 中重做 built-in adjustment model、whole-invocation process isolation 或下游 package candidate。

## Decisions

### Authority and target data flow

```text
Project Definition Check tree
  -> validate + normalize
       -> canonical Normalized Checks (declarative)
       -> trusted custom function slots (private, non-serializable)
  -> Package Run pre-work
       -> built-in runtime preparation + applicability
       -> join each validated leaf exactly once
  -> canonical Resolved Checks (invocation-scoped planning input)
       -> not-applicable: trusted direct Core settlement, no executable scope
       -> applicable: one static planned Task graph
            -> Product Check adapter creates graph scope + Core-issued capabilities
            -> Task engine executes and settles Tasks
            -> trusted terminal path settles one Core Check
  -> frozen Core snapshot { checks, records }
  -> policy -> publication/effects -> Run result
```

Definition normalization and Task planning happen before executable work. Task engine owns generic graph admission and Task settlement but does not interpret quality verdicts or Record payloads. Product Check adapter owns scope-to-Task mapping. Core owns product facts and validation but does not admit, schedule or execute Tasks.

### Shared engine versus stable adapters

同一 engine 只承接各场景真正共享的语义；场景差异留在可识别的 adapter，不用 optional fields 把它们伪装成一个 authoring contract。

| Scenario | Shared Task engine obligation | Scenario-local obligation | Product/Core result |
| --- | --- | --- | --- |
| Applicable direct Check | validated static graph、dependency、mutex、root admission、Task settlement | Product adapter 建立一个 Check root、scoped cap、RecordSink 与 trusted terminal mapping | 一个 `completed` 或 `unavailable` Core Check |
| Applicable TaskPlan Check | 同上；child 与 terminal 都是同一 graph 中的 Tasks | Definition-owned TaskPlan authoring 经 Product adapter 形成 child Tasks、Check scope 与 terminal relation | 一个 Core Check；child Task 不形成实体 |
| Not-applicable Check | 不进入 engine | Package Run/Core trusted path 直接关闭对应事实，不创建 executable scope 或 cap span | 一个 `not-applicable` Core Check |
| Repository scripts-only Task | validated static graph、dependency、mutex、root admission、Task settlement | scripts adapter 保留 command/env/logging 等 scripts-owned fields；不获得 Check/Core capability | scripts-owned result，不产生 Core Check |

因此，Task engine 可以公开给仓库内 adapter 的共享 contract，但 Definition-owned public `TaskPlan` types 与 scripts task definitions 都不能直接等同于 scheduler-private `TaskDefinition`。

### Two-stage Check resolution

Definition normalization 形成一个确定性排序的 Normalized Check collection，并把 trusted custom function slots 保存在明确的 private handoff。该分离是 serializable data 与 executable references 的信任边界，不是第二个 selection、schedule 或 catalog owner。

Package Run pre-work：

1. 根据 normalized built-in `checkId` 与当次 Run inputs 构造 built-in private binding、applicability 与 operational dependency snapshot。
2. 读取已验证 custom function slots，但不重新加载、序列化或按源码路径发现 functions。
3. 对每个 Normalized Check 只 join 一次，形成一个 deterministically ordered Resolved Check collection。
4. 将该 collection 作为 planning、Core registration 与 policy catalog projection 的唯一 runtime input；pre-work 的临时 lookup 在 join 后不成为下游 truth source。

Declarative fingerprint/output 只显式选择 serializable fields。functions、applicability callbacks、capabilities 和 Task metadata 永不序列化。不得持久保存独立 definitions、schedules、mutexes、options、bindings 或 caps 再由下游消费者按 ID 重建 Resolved Check。

### Task graph and Check scope

Every applicable Resolved Check maps into the same static graph:

- A direct Check uses one Product-owned executable root Task assigned to a generic graph scope. That Task is both the first admitted Task and the terminal Task for the scope.
- A TaskPlan Check uses one Product-projected generic graph scope containing its planned child Tasks and one trusted terminal path. The first admitted executable Task activates the scope；the terminal relation closes it。A zero-child TaskPlan still executes its terminal Task and does not activate a scoped cap。
- A not-applicable Resolved Check contributes no executable Task and no active cap span, but still produces one `not-applicable` Core Check。不存在于 canonical collection 的 leaf 没有 Task，也没有 Core fact。

The graph structurally carries generic Task membership、cap、activation and terminal metadata。The engine neither needs nor receives a Check discriminator or a second keyed task/check map；Product-owned layout keeps Check、Core capability and execution-operation semantics inside the adapter。The engine owns Task identity、graph validity、named mutexes、root budget、admission and Task settlement；the Product Check adapter owns how an engine settlement becomes a Check terminal fact。Check active span、deterministic reservation/drain、non-preemption and constrained continuation priority follow `configuration/carry-check-parallel-limit-in-task-scope`。

### Terminal outcome and failure ownership

The target separates contained Check outcomes from trusted Product invariant failures:

| Scenario | Required terminal result | Dependency availability |
| --- | --- | --- |
| valid returned `passed` | `completed(passed)` | available |
| valid returned `failed` | `completed(failed)` | available；quality failure is not execution unavailability |
| not applicable | `not-applicable` | available |
| required Check unavailable / planned leaf blocked | `unavailable` with dependency-safe diagnostic | unavailable |
| runner、leaf or completion throw/rejection | `unavailable` with execution-safe diagnostic | unavailable |
| invalid result、Record rejection/conflict or contained capability protocol failure | `unavailable` with the category defined in the target diagnostic table | unavailable；already committed independent Records remain |
| unexpected trusted graph/Core invariant violation | Package Run `kind: "execution"`; no fabricated completed snapshot or publication | not projected as an ordinary Check outcome |
| abort observed after graph execution starts | stop new admission；drain admitted Tasks with ordinary settlement；preserve settled facts and more-specific failure/dependency reasons；close only the remaining unresolved Check as `unavailable(cancelled)` | unavailable for the unresolved Check |

Task settlement is the only planned execution accounting；it does not by itself define a quality verdict。The trusted terminal path converts engine evidence into exactly one Core outcome and closes the RecordSink before prerequisite availability is exposed。Every non-fatal path settles or directly closes each Resolved Check exactly once；it must not rely on an ordinary terminal Task running after the engine has stopped admission。

### Cooperative cancellation closes the fact stream

`product-contract/cancel-task-admission-and-drain-started-work` owns execution-started cancellation：

1. Task engine observes the invocation `AbortSignal` before each admission commit。After it observes abort, no new Task is admitted；an abort arriving after graph terminal commit does not revise a completed Run。
2. Pending Tasks settle privately as cancelled-before-start。Already admitted Tasks receive the same signal and drain cooperatively；the engine does not preempt or hard-kill same-runtime project code。
3. A Task that completes or fails while draining keeps its ordinary settlement and any facts already formed。Completed/not-applicable Core Checks and committed QualityRecords never roll back；the engine does not infer a separate running-cancelled settlement from an error。
4. After admitted Tasks settle, a graph-owned trusted finalizer first maps contained failure/protocol evidence and propagates dependency unavailability；only remaining open applicable Checks close once as `unavailable(cancelled)`。It then rejects late capabilities。
5. Execution-phase Run returns `kind: "cancelled"` only after retained Core facts are frozen。Pre-work cancellation may return before Resolved Checks exist。

This is a streaming fact model, not a promise that partially written canonical files are valid。Core may commit or deliver Check/Record facts as they become final；Output still decides when a durable machine set becomes trustworthy。

### Minimal Core capability contract

Core must provide the following semantics; they do not require public classes or specific method names:

1. Register exactly one Core Check slot for every Resolved Check and bind its stable `checkId` and allowed Record types.
2. Close a not-applicable slot through a trusted non-execution path without creating a RecordSink or active Task scope.
3. For an applicable Check, give in-scope Tasks a `RecordSink` that accepts domain Record candidates without allowing callers to forge `checkId` ownership.
4. Give only the trusted direct/terminal adapter a single-use settle capability that closes the Check and its RecordSink before availability is returned.
5. Freeze and expose a snapshot whose entity collections are exactly `checks` and `records`.

Project-authored functions may receive the scoped RecordSink through their Check execution context, but never receive a repeatable Core Check settle port. Records accepted before an ordinary later failure remain committed. Scope-external、duplicate-settle and late calls fail closed and cannot revise frozen facts or prerequisite availability.

### Core, Run result and machine projection

`product-contract/publish-fingerprint-bound-check-record-machine-v3` fixes the public boundary：Core Check definition projection and outcome are the only Check facts，QualityRecord binds directly to `checkId` and `recordTypeId`，and machine v3 contains no independent lifecycle or integrity/completeness summary。`catalogFingerprint`、`recordsFingerprint`、invocation metadata、reference/acceptance/decision evidence and effect status may remain non-entity metadata only where the matrix below assigns them。

#### Target fact shapes

| Fact | Exact target fields | Constraints |
| --- | --- | --- |
| Core Check | `checkId`、`displayName`、`recordTypes`、`outcome` | The first three fields are the validated declarative Check Definition projection。`outcome` is exactly one of `{ kind: "not-applicable" }`、`{ kind: "completed", verdict: "passed" | "failed" }` or `{ kind: "unavailable", diagnostic: { category } }`。No selection、run ID、Task data or coverage。 |
| QualityRecord | `recordId`、`checkId`、`recordTypeId`、`level`、`semanticSubject`、`message`、`fields`、`location` | Same domain fields as an accepted Record，minus `checkRunId`。Core binds `checkId`; project code cannot supply or revise it。 |
| Core snapshot | `checks`、`records` | These are the only entity collections。`catalogFingerprint` and policy/publication evidence remain Run-owned metadata rather than a third Core collection。 |

The public unavailable diagnostic vocabulary and precedence are closed as follows；when multiple contained failures exist for one Check，the first applicable category wins。Machine Check exposes the category only，not raw exception text、candidate payload、body fingerprint、filesystem path or private Task identity。

| Precedence | Category | Used for |
| --- | --- | --- |
| 1 | `record-conflict` | two valid candidates claim one canonical `recordId` with different bodies |
| 2 | `invalid-record` | a Record candidate fails the Check-owned Record type/field contract |
| 3 | `capability-protocol` | a contained scope/capability call violates its allowed ownership or lifecycle without corrupting trusted Core state |
| 4 | `invalid-result` | a Check or TaskPlan terminal value is not a legal outcome |
| 5 | `dependency-unavailable` | an explicit operational/Check dependency is unavailable or a planned leaf cannot run because its prerequisite is unavailable |
| 6 | `execution-failed` | runner、leaf or trusted completion call throws/rejects while Core remains valid |
| 7 | `cancelled` | abort prevents the Check from reaching any earlier terminal outcome |

`ack-protocol` and `terminal-report-set` disappear with work-handle acknowledgement and the old terminal report carrier。Unexpected graph corruption、duplicate trusted settlement or a Core invariant violation is not `capability-protocol`; it remains Package Run `kind: "execution"` and does not produce a fabricated terminal publication。

#### Target projection matrix

| Surface | Owner and exact projection | Availability / failure behavior |
| --- | --- | --- |
| Internal incremental delivery | Core emits only a complete settled Core Check or a complete committed QualityRecord from the target shapes above；event envelope/transport stays private。 | A fact may be consumed after it becomes final。This Change does not add a public subscription、resume or partial-file protocol。 |
| Core snapshot | Core freezes `{ checks, records }` after every canonical Resolved Check is closed；checks sort by `checkId` and records by `recordId`。 | Completed/not-applicable Checks and committed Records survive contained failures and cancellation；trusted invariant failure exposes no validated snapshot。 |
| Structured Run Result | `completed` exposes `declarativeFingerprint`、snapshot、reference facts、decision and effect statuses。Execution-phase `cancelled` exposes `phase: "execution"`、the retained frozen snapshot and effect statuses；pre-work/planning cancellation has no snapshot。A post-model `effect` failure exposes the same snapshot/reference/decision facts plus its effect diagnostic。 | No v2 publication model is a parallel result truth source。`configuration`、`planning` and trusted `execution` failures do not invent snapshot/decision fields。 |
| `run.json` | Output publishes schema `urn:vibe-check:schema:run:v3` with exactly `schemaVersion`、`invocation`、`catalogFingerprint`、`recordsFingerprint`、`checks`、`references`、`acceptance` and `decision`。`invocation` keeps `invocationId`、normalized `projectRoot` and `timestamp`；`recordsFingerprint` binds the complete canonical machine Record row set, including the empty set。 | Produced only from a terminal validated publication model。There is no `definitions`、`runs`、`integrity`、`completeness` or effect-status field。 |
| `records.ndjson` | Output publishes schema `urn:vibe-check:schema:record:v3`；each non-empty LF-terminated line is one target QualityRecord and lines sort by `recordId`。 | Empty Records remain a valid empty file。Rows contain no `checkRunId`、Task identity or invalid candidate evidence。 |
| report / console | Output derives status、counts and Record previews from the validated v3 model；presentation settings may change only the human projection。 | Human summaries are not Core or machine facts。They cannot be read back as decision input。 |

Cross-surface invariants are mandatory：every Record `checkId` names one published Check；its `recordTypeId` exists in that Check definition projection；all identities are unique and canonically ordered；`catalogFingerprint` is computed only from canonical declarative Check projections；`recordsFingerprint` is recomputed from the complete canonical Record row set；reference、acceptance and decision evidence resolve only to published `checkId`、`recordId` or named reference identities。`run.json` and `records.ndjson` are validated as one set before canonical rename，and validator failure returns no partial validated prefix。The fixed paths do not claim a cross-path OS-atomic snapshot；consumer trust begins only after complete-set validation。

Cancellation and trusted execution failure do not start a new publication effect and do not overwrite an existing canonical set。An effect failure follows the Output lifecycle owner：candidates/temps are cleaned before any failed partial set can become trusted，while a later logs failure may return `kind: "effect"` after an already validated machine set exists。

The completed hard cut moved the v2 run/record schema bytes unchanged into `docs/schemas/historical/v2/`, where they remain validated only as historical identities。The generic run/record schema paths are now the v3 exact field owners；current artifact examples are v3。Runtime `publication-v2` writer/reader/mapper/validator paths、fallbacks、v2 annotation acceptance and default docs references were removed rather than retained beside v3。

This matrix was the implementation readiness contract, not a second runtime schema owner。The v3 schemas now own exact machine grammar, and stable `docs/output.md` summarizes the public lifecycle without copying every field rule。

### Public and package boundary

Definition-owned `CustomCheck`、TaskPlan、planning context and result-facing types give package consumers contextual typing without exporting scheduler-private TaskDefinition、TaskRun、worker or capability types。Package work remains downstream。`establish-api-only-npm-product-boundary` must consume the final authoring/result contract only after this Change closes and must then perform its own semantic review and re-plan。

The existing `catalogFingerprint` remains a fingerprint of the declarative Check catalog。This Change does not silently add functions、runtime binding、Task metadata or full policy definitions to that fingerprint。If a future consumer needs a whole-Project-Definition fingerprint, that is a separate contract outside this migration。

### Contract baseline

The following active aligned decision paths are the long-term direction owners used by this Change。At Readiness，`use-composable-check-tree-with-run-owned-bindings` was the aligned input baseline；its current successor is listed below。All rows are active aligned facts after focused、required and full verification。

| Decision owner | Obligation consumed by this Change |
| --- | --- |
| `configuration/keep-check-groups-authoring-only` | Definition normalization owns declarative leaf Check data；group remains authoring-only，and Package Run owns invocation-scoped applicability、built-in binding and operational preparation。 |
| `configuration/evaluate-decision-policies-from-core-facts` | Run pre-work validates each named closed policy against the canonical Resolved Check collection、its Check/Record policy surface and named reference identities；post-work evaluation consumes only frozen Core Check outcome、QualityRecord and named reference facts/evidence。 |
| `product-contract/use-core-check-and-record-facts-from-run-resolution` | Definition owns Normalized Checks、Run pre-work owns canonical Resolved Checks；each Resolved Check produces one Core Check，QualityRecord binds directly to `checkId`，and snapshot entity collections are `checks` and `records`。 |
| `product-contract/execute-check-scopes-through-one-task-graph` | Direct and TaskPlan Checks execute through one static graph；Task settlement replaces work-handle acknowledgement；availability is exposed only after trusted Check settlement。 |
| `configuration/carry-check-parallel-limit-in-task-scope` | Check cap metadata travels in graph scope；first admission、terminal release、minimum active cap and deterministic reservation/drain remain unchanged。 |
| `product-contract/cancel-task-admission-and-drain-started-work` | Task admission observes `AbortSignal`；admitted work drains with ordinary settlement semantics；settled facts remain and only otherwise-unresolved Checks close as `unavailable(cancelled)`。 |
| `product-contract/hard-cut-prestable-machine-contracts` | Breaking machine shape receives v3 identities and one active runtime path；no v2 writer、reader、fallback or dual publication remains。 |
| `product-contract/publish-fingerprint-bound-check-record-machine-v3` | Machine v3 publishes Checks、Record rows and necessary Run metadata only；complete-set validation and `recordsFingerprint` binding make partial or mixed generations fail closed without claiming a cross-path OS-atomic snapshot。 |

### Formation-time readiness and migration record

At Readiness, the audit used then-current stable owners, source and the semantic Case catalog rather than archived material。Before implementation，`bun run test-evidence:check` closed 186 Bun entities through 37 Cases across 10 topics；after the hard cut it closes 158 Bun entities through 38 Cases across the same 10 topics。The lower entity count reflects removal/merging of old lifecycle tests while the added Case separates target responsibilities。Mechanical closure proves entity/Case consistency；the two tables record this Change's formation-time migration interpretation and do not describe the current runtime。

#### Formation-time behavior migration evidence

| Target obligation | Readiness evidence | Migration rule for task 1.11 |
| --- | --- | --- |
| Definition normalization freezes serializable Check data while private functions remain outside fingerprints and output；Package Run validates definition/controls before work。 | `WB-PROJECT-DEFINITION-001`、`WB-RUNTIME-CHECK-CATALOG-001` | Preserve validation、freeze、fingerprint and zero-user-call failure signals；replace parallel catalog arrays/maps with Normalized Check plus one Run-owned resolution。 |
| Every canonical Resolved Check closes once as not-applicable、completed or unavailable；an absent tree leaf has no fact。 | `WB-RUNTIME-CHECK-LIFECYCLE-001`、`WB-RUNTIME-CHECKPOINT-001` | Rework the lifecycle Case around Core Check outcome；remove assertions whose only purpose is unselected CheckRun、run ID or coverage。 |
| Direct、TaskPlan and zero-child TaskPlan share one graph；completion is exact-once and Check prerequisites use settled availability。 | `WB-RUNTIME-CHECK-ORCHESTRATION-001` | Preserve closed planning、zero-child completion、quality-failed/not-applicable prerequisite availability、blocked transitive work and unrelated continuation；replace synthetic acknowledgement/result carriers with graph scope settlement。 |
| Record provenance is unforgeable；valid Records commit immediately；invalid/conflicting input closes the owner safely；late sinks cannot mutate facts。 | `WB-RUNTIME-RECORD-MANAGER-001`、`WB-RUNTIME-CHECK-FAILURE-001`、`WB-RUNTIME-CHECK-LIFECYCLE-001` | Preserve `recordId` identity、idempotence、arrival-neutral conflict handling、committed Record retention and late rejection；remove `checkRunId` and standalone integrity evidence from target facts。 |
| Contained execution/result/record/protocol failures differ from trusted graph/Core invariant failure。 | `WB-RUNTIME-CHECK-FAILURE-001`、`WB-RUNTIME-CHECK-ORCHESTRATION-001` | Map contained failures to the target diagnostic table；keep trusted corruption as Package Run `kind: "execution"` with no validated snapshot/publication。 |
| Root concurrency、mutex、Check cap span、minimum active cap and reservation/drain remain one scheduler behavior。 | `AUX-PARALLEL-RUNNER-001`、`CHECK-SCOPED-CONCURRENCY-001` | Retain generic graph/admission assertions and cap timing assertions；move scripts-only task fields to the scripts adapter and cap ownership into graph scope。 |
| Pre-work cancellation remains valid and execution-started cancellation gains admission cutoff、ordinary-settlement drain and retained facts。 | `WB-PROJECT-DEFINITION-001`、`AUX-PARALLEL-RUNNER-001`、`WB-RUNTIME-CHECK-ORCHESTRATION-001` | Preserve the pre-work boundary and prove admission cutoff、cancelled-before-start、admitted drain、more-specific failure/dependency precedence、retained facts、late-cap rejection and execution-phase cancelled result。 |
| Structured result、machine files、readable output and annotation consume one validated fact model and never accept a partial or mixed machine set as trusted。 | `WB-OUTPUT-MACHINE-V3-CONTRACT-001`、`WB-OUTPUT-PUBLISHED-MATERIALS-001`、`WB-OUTPUT-READABLE-PROJECTION-001`、`WB-OUTPUT-PUBLICATION-LIFECYCLE-001`、`AUX-DOCS-MACHINE-ARTIFACTS-001`、`AUX-QUALITY-ANNOTATION-001` | Preserve complete-set validation、Record-set binding、canonical order、independent docs acceptance、handled-failure cleanup and readable parity；retain one active v3 validator rather than a v2-named Case or dual path。 |
| Repository callers bind one Project Definition and scripts reuse the shared Task engine without acquiring Product Check/Core semantics。 | `AUX-QUALITY-DOGFOOD-001`、`AUX-PARALLEL-RUNNER-001` | Keep the bound Project Run Case；prove scripts command/env/report fields remain adapter-owned after the shared engine contract narrows。 |

At Readiness, `WB-RUNTIME-CHECK-COVERAGE-001` had no independent target product fact：its work-handle count/acknowledgement purpose exited with the old lifecycle after Task settlement coverage moved to Task engine Cases。Execution-phase cancellation and machine v3 now have direct target evidence in the Cases above；the old coverage and v2-named Cases no longer exist。

#### Formation-time owner-to-consumer hard-cut inventory

| Readiness source and consumers | Observed readiness representation | Target owner and hard-cut action | Required proof |
| --- | --- | --- | --- |
| `src/product/definition/check-tree/**`、`src/product/definition/project.ts`；consumed by `src/product/run/invocation.ts` | `ResolvedCheckTreeLeaf` plus parallel `declarative.checks.definitions/schedules/mutexes/maxParallel/options/selected`、`builtInOptions`、`checkMaxParallelById` and private `bindings.customChecks` | Definition produces one ordered Normalized Check collection plus a trusted function-slot handoff。Package Run joins each item once into Resolved Checks；remove downstream ID-based reconstruction collections after the join。 | Definition tests、Package Run tests、fingerprint golden tests and focused search for retired parallel fields。 |
| `src/product/run/invocation.ts`、`src/product/quality-core/check-record/catalog.ts` | Run separately supplies definitions、bindings、selection、applicability、schedule and mutex to build `ResolvedCheckCatalog` with CheckRun/work handles | Package Run pre-work owns built-in preparation and the one Normalized-to-Resolved join。Planning、Core registration and policy catalog projection consume that collection directly；retire the long-lived catalog carrier。 | Pre-work zero-call failures、one-item-per-leaf mapping、not-applicable binding/factory zero calls and no post-join lookup truth source。 |
| `src/product/quality-core/check-record/task-planning.ts`、`task-execution.ts`、`task-orchestrator.ts`、`check-concurrency.ts` | Product adapter builds direct/leaf/synthetic-terminal Tasks and reconstructs terminal/cap ownership with keyed maps | Product Check adapter writes Check scope、cap、RecordSink ownership and terminal relation into one validated graph。No per-Check scheduler or keyed side map survives planning。 | Direct/TaskPlan/zero-child、dependency blocking、exact-once terminal、cap span/reservation and trusted invariant tests。 |
| `src/product/task-scheduler/**`；direct consumers are Product Check orchestration and `scripts/vibe-check-workspace/**` | Shared `TaskDefinition` mixes graph fields with scripts-oriented `tasks/type/env/envFile/run` and lifecycle callbacks | Task engine owns only validated static graph、dependency、mutex、root admission、abort observation and Task settlement。Product and scripts adapters own their authoring fields、execution body and result projection。 | `AUX-PARALLEL-RUNNER-001` plus Product orchestration and workspace verifier integration；focused import-boundary search proves one engine。 |
| `src/product/quality-core/check-record/check-manager.ts`、`coordinator.ts`、`model.ts`、`foundation-validation/**` | `CheckManager`、`CheckRun`、`checkRunId`、definitions/runs、workHandles/ack、integrity and completeness form Core lifecycle | Core registers one Check slot per Resolved Check and freezes only Check/Record entity collections。Remove managers/IDs/coverage summaries；scoped capabilities and terminal outcomes own closure。 | Core model/validation/capability tests and final search for `.runs`、`checkRunId`、work handles and acknowledgement outside historical v2 material。 |
| `src/product/quality-core/check-record/record-manager.ts`、`identity.ts` and `builtins/**` Record producers | Bound sink adds `checkId + checkRunId`；invalid/conflict evidence also appears in integrity collections | RecordSink binds only `checkId` and allowed Record types；QualityRecord retains stable `recordId`。Invalid/conflict material selects the owning Check diagnostic without publishing raw candidate or a third evidence entity。 | Record identity golden bytes、idempotence、conflict arrival neutrality、partial Record retention、late rejection and sensitive-material redaction。 |
| `src/product/quality-core/check-record/policy-model.ts`、`policy-validation/**`、`policy-evaluator.ts`、`builtins/*-reference.ts`、`human-status.ts` | Policy/reference/human status read `FinalCoreSnapshot.definitions/runs/records/integrity/completeness` and can reference CheckRun IDs | Policy validates against Check definition projections embedded in Core Checks；evaluation and human status consume Check outcomes/Records。Evidence references only `checkId`、`recordId` or named references；no completeness reducer is recreated。 | Policy/reference/readiness/gate/human-status suites and decision-reference invariant tests。 |
| `src/product/run/result.ts`、`src/product/run/publication.ts`、`src/product/run/effects.ts` | Completed/effect results expose `ValidatedPublicationModelV2` beside snapshot/decision/reference facts；cancellation only has pre-work/planning phases | Result variants follow the projection matrix：completed/post-model effect expose one set of snapshot/reference/decision facts；execution cancellation exposes retained snapshot；effect status remains result metadata；remove v2 model as parallel truth。 | Run result matrix、effect-stage tests、execution cancellation and public-contract type acceptance。 |
| `src/product/quality-core/output/publication-v2/**`、`scan-command/publication-v2.ts`、`src/product/run/machine-output.ts` | Runtime v2 schema/mapper/model/serializer/validator/readable stack owns two-file output | Replace with one publication-v3 stack and shallow v3 validator；delete every runtime v2 writer/reader/fallback/import in the same hard cut。 | Runtime v3 schema/bytes/set invariants、candidate-before-write、cleanup、readable parity and no trusted prefix。 |
| `docs/schemas/**`、`docs/examples/artifacts/**`、`scripts/docs/machine-*.ts`、`scripts/tools/validators/schema/machine-artifact-*.ts` | Generic schema paths and five then-current examples were v2；the independent validator encoded v2 fields/relations | Copy the then-current run/record v2 schema bytes unchanged to `docs/schemas/historical/v2/`，make generic paths v3，regenerate current examples and migrate independent acceptance/registry。No v2 current examples or generator remain。 | Schema strict compile、generation drift、five-set independent acceptance、byte comparison of historical v2 schemas and docs validation。 |
| `scripts/quality/annotate.ts`、`scripts/quality/annotate/github.ts` | Annotation imports v2 shallow validator and `MachineRecordV2` | Consume the v3 shallow two-file validator and only the Record fields needed for rendering；retain argument、limit、zero-command and exit behavior。 | `AUX-QUALITY-ANNOTATION-001` migrated to v3 positive/failure matrix。 |
| `src/product/public-contract/current.ts`、`src/product/run/index.ts`、`scripts/quality/project-run.ts`；downstream `changes/establish-api-only-npm-product-boundary/**` | At Readiness, the public surface named `RunResult` while result/Core internals still carried v2/CheckRun shapes；downstream acceptance still mentioned scan completeness | Update result-facing types without exporting Task/Core capabilities。Repository Run remains a bound adapter。Do not edit the downstream Change here；after this Change closes it must re-audit result/completeness assumptions and re-plan before package implementation。 | Public-contract tests、repository Project Run test、dogfood、focused export scan and downstream read-only handoff check。 |
| `docs/architecture.md`、`docs/configuration.md`、`docs/quality-metrics.md`、`docs/output.md`、`docs/scanner-dependencies.md`、`docs/script-tooling.md`、`docs/testing.md` and `docs/testing/cases/**` | At Readiness, stable docs described Resolved catalog、CheckRun、ack/completeness and v2 output | Update each owner in the same hard cut；navigation changes only if owner/entry routing changes。Cases describe current target evidence after test migration，not historical field inventories。 | Docs validation、owner-to-artifact audit、test-evidence closure and workspace required/full verification。 |

After the hard cut, the only retained v2 material is the byte-identical run/record schema pair under `docs/schemas/historical/v2/` and decision/history references that explicitly identify v2。Runtime code、public readers、annotation acceptance、current examples、default docs and Case purposes do not retain a second active v2 path。

### Implementation-Local Choices

No additional product decision is required for private type names、module splits、whether graph scope metadata uses a discriminated union or private object、or exact internal capability function names。These choices are acceptable only when they preserve the confirmed data flow, do not create a second truth source, and remain absent from package/public output。

## Risks / Trade-offs

- The largest regression risk is not scheduler syntax but terminal closure: blocked、cancelled、zero-task and failed paths must close every non-fatal Check scope exactly once before availability or snapshot exposure。
- A leaked settle capability would break one-Check-one-settlement。Types and runtime closure checks must both enforce ownership。
- A canonical runtime collection still needs a separate declarative projection。Blind serialization could leak functions or omit policy-relevant Check fields；keeping pre-work lookup maps alive after the join would recreate the original problem。
- Sharing the engine with repository scripts can over-generalize the Product contract。Only common graph/admission/settlement obligations belong in the engine；scripts fields and Check/Core semantics remain adapters。
- The hard cut is intentionally integration-sized；completing only half would leave dual Core、scheduler or publication truth sources。Transitional adapters may exist only within one bounded implementation step and must be removed before that task is marked complete。
- v3 can accidentally preserve old lifecycle under renamed fields。The readiness projection matrix and schema invariants must prove semantic removal, not only field renaming。

## Open Questions

无。当前没有需要用户决定的产品契约或未完成的 Readiness 门禁；private names、module layout、adapter mechanics 和 migration sequencing 都按上面的 closed contracts 作为 implementation-local choices。
