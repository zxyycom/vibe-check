# quality-runtime

## Case WB-RUNTIME-CHECK-RECORD-001: Check 与 Record foundation contract 精确且封闭
Owner: `docs/architecture.md#核心定位`
Entities:
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > canonicalizes catalog order and fixes the exact fingerprint`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > constructs valid deterministic opaque run IDs and arrival-neutral conflict evidence`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > emits exact versioned canonical UTF-8 JSON bytes and rejects non-JSON values`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > excludes location message and checkRunId while identity fields change recordId`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > matches exact golden record identity bytes and ID`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > normalizes semantic subjects explicitly without case or whitespace folding`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > redacts credential TypeErrors thrown by Proxy reflection traps`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > redacts ordinary errors thrown by Proxy reflection traps`
- `bun|src/product/quality-core/src/check-record/identity.test.ts|check-record foundation identity > rejects accessors before changing getters can corrupt canonical bytes`
- `bun|src/product/quality-core/src/check-record/model.test.ts|check-record foundation model > accepts only closed foundation descriptors with check-qualified record type identities`
- `bun|src/product/quality-core/src/check-record/model.test.ts|check-record foundation model > enforces the closed selected applicability run and result matrix`
- `bun|src/product/quality-core/src/check-record/model.test.ts|check-record foundation model > fixes diagnostic precedence and canonical same-category tie breaking`
- `bun|src/product/quality-core/src/check-record/model.test.ts|check-record foundation model > keeps producer candidates free of manager provenance and complex field values`
- `bun|src/product/quality-core/src/check-record/model.test.ts|check-record foundation model > validates mechanical snapshot integrity and coverage without reducing quality`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > keeps conflict IDs out of trusted records while retaining independent integrity evidence`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > redacts credential Proxy traps before foundation validation reads fields`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > rejects unknown fields private material functions and invalid finite primitives`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > rejects CheckDefinition accessors without executing them`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > rejects records and integrity evidence inconsistent with the owning run`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > requires unique integrity evidence that closes the primary record diagnostic`
- `bun|src/product/quality-core/src/check-record/validation.test.ts|check-record foundation runtime validation > validates unknown into a closed detached deeply readonly quality record`
Proves:
- Foundation descriptor 只接受 serializable Check metadata、Check-qualified record-type identity、closed field/identity descriptor 与 closed policy-visible operand/relation surface；不接纳 runner、backend、Task、function 或其它私有执行材料。
- Canonical JSON 递归排序 object keys、保留 array 顺序并拒绝非 finite JSON 值；golden bytes、Unicode/semantic subject normalization、versioned SHA-256 record identity 与包含 policy binding 的 catalog fingerprint 精确固定。
- `checkRunId` 是 invocation-scoped opaque correlation identity，不进入 `recordId`；location、message 与 arrival 不改变稳定 record identity，catalog identity 与 conflict evidence 不依赖输入顺序。
- Selection/applicability 与 `skipped | completed | failed` / nullable result 组合封闭；snapshot completeness 只核对 manager-derived run/coverage facts，不产生全局 quality verdict。
- Producer candidate 不携带 manager provenance，validated field type 与 descriptor 的 primitive runtime 域一致；runtime validation 从 `unknown` 产生 detached deeply readonly domain values。
- Conflict record ID 不进入 trusted records，records、record-type、run、diagnostic 与独立 integrity evidence 双向闭合且 canonical；category-specific diagnostic identity、invalid-record evidence 与 validation issue 不暴露未受信敏感材料。

## Case WB-RUNTIME-CHECK-CATALOG-001: Check catalog 与 private binding 在 work 前完整冻结
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/src/check-record/catalog.test.ts|check-record catalog resolution > fails pre-work for invalid catalogs bindings selections and applicability without executing bindings`
- `bun|src/product/quality-core/src/check-record/catalog.test.ts|check-record catalog resolution > freezes a canonical public catalog and resolves qualified record types and selected applicability`
- `bun|src/product/quality-core/src/check-record/catalog.test.ts|check-record catalog resolution > closes requiresChecks before applicability and rejects invalid schedules with zero execution`
Proves:
- Catalog resolution 从 `unknown` 生成 detached、deeply readonly、canonical definitions 与 fingerprint；相同 `recordTypeId` 只按 owning `checkId` qualified 解析，resolved record descriptor 保留 fingerprinted policy surface，public definition 不携带 executable 或 backend。
- Definition / descriptor、binding 一对一关系、selection、closed `requiresChecks` schedule 与 selected applicability 任一非法时在 work 前失败且 binding zero calls；selection 先闭包 prerequisite，未选择 Check 不解析 applicability，applicable work handles 在执行前冻结。

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: CheckManager 每 definition 形成一个合法 run
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/src/check-record/check-manager.test.ts|check-record CheckManager > creates one run per definition and keeps skipped not-applicable and applicable zero-work states distinct`
- `bun|src/product/quality-core/src/check-record/check-manager.test.ts|check-record CheckManager > freezes acknowledgement facts at settlement and rejects retained ports without changing them`
- `bun|src/product/quality-core/src/check-record/check-manager.test.ts|check-record CheckManager > makes availability exactly match final completed status under result ack and record failures`
- `bun|src/product/quality-core/src/check-record/check-manager.test.ts|check-record CheckManager > treats duplicate unknown and missing settlement as trusted invariant failures`
Proves:
- 每个 definition 恰有一个 run；unselected 为 `skipped / null`，selected not-applicable 在 pre-work 完成且 zero coverage，applicable zero-work 仍消费 terminal result并可形成独立 `passed | failed` quality verdict。
- 每个 applicable Check 恰好 settlement 一次；settlement 先冻结 acknowledgement/result/record-failure facts，再返回 private availability。合法 quality `failed` 是 available completed run；invalid result、ack 或 record failure 是 unavailable failed run，failed run 不保留 lower-layer candidate。
- settlement 后 retained acknowledgement port 被拒绝，不能改写 frozen coverage、availability 或最终 run；final CheckRun 只在全部 settlement 后形成一次。

## Case WB-RUNTIME-CHECK-COVERAGE-001: CheckManager coverage 只由 owned handles 与 acknowledgement 决定
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/src/check-record/check-manager.test.ts|check-record CheckManager > freezes acknowledgement facts at settlement and rejects retained ports without changing them`
Proves:
- 首次 owned-handle acknowledgement 增加 coverage，duplicate acknowledgement 幂等；settlement 前的 unknown、foreign acknowledgement 形成 owning run protocol failure，但不伪造 coverage。settlement 后 retained acknowledgement 被拒绝，不改变 frozen coverage、availability 或 final run。
- Ack diagnostic 只发布安全 opaque handle identity；未受信 candidate material不进入 run facts。

## Case WB-RUNTIME-RECORD-MANAGER-001: RecordManager 独立验证并提交可信 records
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/src/check-record/record-manager.test.ts|check-record RecordManager > adds unforgeable provenance validates descriptors commits immediately and replays idempotently`
- `bun|src/product/quality-core/src/check-record/record-manager.test.ts|check-record RecordManager > canonicalizes invalid evidence independently of arrival and deduplicates the same safe violation`
- `bun|src/product/quality-core/src/check-record/record-manager.test.ts|check-record RecordManager > keeps evidence distinct across definitions after more than 10000 repeated submissions`
- `bun|src/product/quality-core/src/check-record/record-manager.test.ts|check-record RecordManager > isolates same-ID different-body conflicts with arrival-neutral evidence and retains independent records`
- `bun|src/product/quality-core/src/check-record/record-manager.test.ts|check-record RecordManager > rejects submissions after a run terminal boundary without leaking candidate material`
Proves:
- Bound sink 添加不可伪造的 `checkId / checkRunId`，按 qualified descriptor 验证 candidate并用 foundation identity owner创建 `recordId`；valid record即时提交，equivalent replay幂等，invalid candidate形成 owning-run integrity evidence。
- Same-ID / different-body 不让先到 body 留在 trusted records，conflict evidence 与 arrival order无关；此前独立 valid records保留，terminal 后 candidate只被拒绝、不新增 integrity evidence 或其它事实，diagnostic不暴露 message、location或敏感材料。
- Invalid-record evidence 只按 manager-owned run / Check / qualified known record type / closed reason形成canonical安全事实；到达顺序不改变evidence，相同安全违规幂等归并，跨definition与超过10,000次重复提交仍保持唯一合法identity并通过snapshot validation。

## Case WB-RUNTIME-CHECK-FAILURE-001: Manager 与 coordinator 单点收敛 execution failure precedence
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/src/check-record/check-manager.test.ts|check-record CheckManager > makes availability exactly match final completed status under result ack and record failures`
- `bun|src/product/quality-core/src/check-record/coordinator.test.ts|check-record contribution coordinator > normalizes direct returned unavailable throws and rejections into closed terminal run facts`
- `bun|src/product/quality-core/src/check-record/coordinator.test.ts|check-record contribution coordinator > preserves records under ranked combined failures`
Proves:
- Ordinary unavailable、sync throw、async rejection与非法 returned candidate归一为closed terminal run facts；failed run始终 `result = null`，而合法 quality `failed`仍是completed run。缺失、duplicate 或 unknown settlement则属于 trusted foundation invariant failure，不发布 snapshot。
- Record conflict / invalid record、ack protocol 与 invalid result组合只由 foundation rank及canonical tie-break选出primary diagnostic；已验证 records和acks保留，诊断不携带runner exception或unknown correlation材料。

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Closed Check adapter 在共享 runner 上形成可信依赖边界
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/src/check-record/task-planning.test.ts|check-record task orchestration > plans a closed detached graph before execution and namespaces group leaves with exact work`
- `bun|src/product/quality-core/src/check-record/task-planning.test.ts|check-record task orchestration > rejects cycles ancestor self dependencies open shapes and work partition gaps before user execution`
- `bun|src/product/quality-core/src/check-record/task-orchestration.test.ts|check-record task orchestration > enforces one global slot budget and mutex across direct leaves and synthetic completion`
- `bun|src/product/quality-core/src/check-record/task-orchestration.test.ts|check-record task orchestration > isolates ordinary failures blocks transitive dependents and accepts quality failure prerequisites`
- `bun|src/product/quality-core/src/check-record/task-orchestration.test.ts|check-record task orchestration > uses foundation availability for invalid result record and acknowledgement prerequisites`
- `bun|src/product/quality-core/src/check-record/task-planning.test.ts|check-record task orchestration > runs one zero-leaf completion and blocks dependent leaves plus completion after leaf failure`
- `bun|src/product/quality-core/src/check-record/task-execution-lifecycle.test.ts|check-record task orchestration > treats hidden and symbol unavailable fields as invalid results before dependent execution`
- `bun|src/product/quality-core/src/check-record/task-execution-lifecycle.test.ts|check-record task orchestration > blocks dependent leaves and completion when a task record submission fails`
- `bun|src/product/quality-core/src/check-record/task-execution-lifecycle.test.ts|check-record task orchestration > revokes function-scoped sinks on return and throw while retaining committed records`
- `bun|src/product/quality-core/src/check-record/task-execution-lifecycle.test.ts|check-record task orchestration > drains started wrappers and stops new user calls after a trusted invariant failure`
Proves:
- Adapter 在 user work 前解析、验证、detached freeze closed TaskPlan；拒绝 open shape、self/ancestor/cycle、unknown dependency 与 exact work partition 缺口，planning 失败时不调用 user function。Task/group identity 保持 invocation-private。
- Direct binding、TaskPlan leaves 和唯一 synthetic completion 共用 Product-owned generic runner 的单一 `maxParallel` slot budget 与 mutex；零-leaf plan 也只调用一次 completion，leaf execution 或 record submission failed、或 leaf blocked 时不调用 dependent leaf 与 completion。completion 接收按叶 ID 形成的 opaque outcomes。
- `requiresChecks` 只消费 settlement 后的 availability：合法 completed quality `failed` 与 `not-applicable` 放行 dependent；execution、result、record 或 acknowledgement failure 使 dependent 及其 transitive dependent unavailable 且不调用其 user function；unrelated work 继续。hidden、symbol 或其它 unavailable returned field 只拒绝 owning Check，不阻止无依赖的有效 Check。
- 每个 leaf 只拿到 work handles 和 function-scoped record sink；adapter 只在 leaf 正常完成后自动推进 acknowledgement。return 或 throw 后 retained sink 被拒绝，早先 committed record 保留。trusted invariant failure 停止尚未开始的 user function、drain 已开始 wrapper，随后拒绝 trusted publication。

## Case WB-RUNTIME-CHECKPOINT-001: Frozen contribution batch 形成 canonical final Core snapshot
Owner: `docs/architecture.md#核心定位`
Entities:
- `bun|src/product/quality-core/src/check-record/coordinator.test.ts|check-record contribution coordinator > produces one canonical integrated snapshot regardless of direct runner completion order`
Proves:
- 完整 applicable contribution batch 在调用 coordinator 前冻结；skipped与not-applicable binding zero calls，applicable zero-work binding仍调用且一个 definition只产生一个run。
- 多 definition execution在runner completion order置换后产生相同canonical runs、records、integrity与manager-derived completeness snapshot；final Core不包含policy、output或legacy projection。

## Case AUX-RUNTIME-OPTION-001: Product Option 显式区分值存在与缺失
Owner: `docs/coding-style.md#5-按问题形态选择实现模型`
Entities:
- `bun|src/product/foundation/src/option.test.ts|product Option > composes present values without entering absence branches`
- `bun|src/product/foundation/src/option.test.ts|product Option > keeps absence stable and evaluates only fallback branches`
- `bun|src/product/foundation/src/option.test.ts|product Option > converts nullable inputs and Result boundaries without losing values or errors`
Proves:
- `Some` 的 type guard、映射、链式组合、过滤、匹配和 fallback 保持存在值，并且只执行存在分支副作用。
- 单例 `None` 在映射、链式组合和过滤中保持缺失，通过 `or`、`orElse`、`unwrapOr` 和 `match` 显式进入 fallback，并且只执行缺失分支副作用。
- `fromNullable` 只把 `null` 与 `undefined` 转成缺失，保留 falsy 值；`toResult` 分别保留存在值和指定的缺失错误。

## Case AUX-QUALITY-CACHE-001: Quality measurement cache identity 稳定
Owner: `docs/scanner-dependencies.md#exact-input-adapter-handoff`
Entities:
- `bun|src/product/quality-core/src/measurement/cache.test.ts|quality measurement cache > keys duplicate-code cache by scan identity and strips changed-scope annotations`
Proves:
- duplicate-code cache key changes for tested code area、input fingerprint、tool name/version 和 normalized args differences。
- cache hit 返回不带 changed-scope annotation 的 metric，保持复用扫描与当前 diff 语义分离。
- baseline snapshot cache identity 由 materialized exact-input fingerprints、有效 code-area/duplication measurement settings 与 eligible backend executable/args/version 构成；tested input、executable 或 tool version 变化时 key 改变。
- accepted-warning、report、sibling file-check 与 project-config contract version 变化不影响 baseline measurement cache key；命中时通过 snapshot hash 防止错读缓存内容。

## Case BB-RUNTIME-CHECK-STATUS-001: Formal entry projects final Check facts
Owner: `docs/quality-metrics.md#human-status`
Entities:
- `bun|src/product/configured-project-completeness.test.ts|formal CLI configured scan completeness > returns a warning when all selected Checks are not applicable`
- `bun|src/product/configured-project-completeness.test.ts|formal CLI configured scan completeness > treats a successful zero-finding quick scan as complete without resolving jscpd`
- `bun|src/product/configured-project-completeness.test.ts|formal CLI configured scan completeness > projects Lizard execution and invalid-result failures consistently`
- `bun|src/product/configured-project-completeness.test.ts|formal CLI configured scan completeness > fails closed when an eligible current measurement component is unavailable`
Proves:
- Formal entry makes selected Check applicability, successful zero work and owning execution failure observable through readable projection and outcome without a legacy global reducer.
