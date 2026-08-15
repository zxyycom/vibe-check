# quality-runtime

## Case WB-RUNTIME-CHECK-RECORD-001: Check 与 Record foundation contract 精确且封闭
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > emits exact versioned canonical UTF-8 JSON bytes and rejects non-JSON values`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > rejects accessors before changing getters can corrupt canonical bytes`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > redacts credential TypeErrors thrown by Proxy reflection traps`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > redacts ordinary errors thrown by Proxy reflection traps`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > normalizes semantic subjects explicitly without case or whitespace folding`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > matches exact golden record identity bytes and ID`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > excludes location and message while identity fields change recordId`
- `bun|src/product/quality-core/check-record/identity.test.ts|check-record foundation identity > canonicalizes catalog order and fixes the exact fingerprint`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > keeps producer candidates free of Core ownership and lifecycle provenance`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > accepts only closed foundation descriptors with check-qualified record type identities`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > accepts exactly one closed terminal outcome for each Core Check`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot without lifecycle projections`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects CheckDefinition accessors without executing them`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > redacts credential Proxy traps before foundation validation reads fields`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > validates unknown into a closed detached deeply readonly quality record`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > rejects unknown fields private material functions and invalid finite primitives`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > requires a known non-not-applicable owner and canonical entity order`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > accepts only the target unavailable taxonomy and exact snapshot fields`
Proves:
- Definition descriptors and producer candidates accept only serializable public Check/Record material; functions, private execution data and Core ownership are rejected or remain outside the candidate shape.
- Canonical bytes, semantic subject normalization, stable record identity and declarative fingerprint are deterministic, reject accessor/Proxy/non-JSON traps without leaking sensitive material, and do not use current location or message as identity.
- A Core Check has exactly one closed `not-applicable`、`completed` or `unavailable` outcome. Validation accepts exactly canonical `{ checks, records }` facts, direct Record ownership and the safe unavailable taxonomy, not a parallel lifecycle projection.

## Case WB-RUNTIME-CHECK-CATALOG-001: Two-phase Check resolution 在 work 前形成唯一 planning input
Owner: `docs/configuration.md#two-phase-resolution`
Entities:
- `bun|src/product/definition/project.test.ts|Project Definition > separates frozen declarative data from function bindings and fingerprints neither binding`
- `bun|src/product/run/index.test.ts|Package Run > calls an applicable TaskPlan factory during closed planning and lets the shared scheduler run it`
- `bun|src/product/run/index.test.ts|Package Run > does not call a TaskPlan factory for a not-applicable Check`
- `bun|src/product/run/index.test.ts|Package Run > prepares built-ins present in the tree before a dependent custom Check`
Proves:
- Definition normalization freezes sorted declarative Checks while trusted functions, operational binding and policy execution material stay outside the fingerprint and public facts.
- Package Run resolves each selected Check once before graph execution: it prepares only needed built-ins, calls an applicable TaskPlan factory during closed planning, and does not invoke a not-applicable factory.

## Case WB-RUNTIME-CHECK-LIFECYCLE-001: 每个 Resolved Check 形成一个闭合 Core Check
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes only canonical Check and Record facts`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > maps malformed terminal values to a contained unavailable result and cancellation closes unresolved scopes`
Proves:
- 每个已注册 Check 恰好一次关闭；not-applicable 不建立 executable scope，applicable Check 通过 trusted terminal path 形成 completed 或 unavailable outcome。
- malformed terminal 被 contained unavailable 吸收；取消只关闭仍未完成的 applicable scope，最终 snapshot 仍只含排序的 Check 与已接受的 Record facts。

## Case WB-RUNTIME-RECORD-MANAGER-001: Check-scoped RecordSink 独立验证并提交可信 Records
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > binds record ownership, retains accepted independent Records, and gives record failures precedence`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > rejects scope-external, duplicate, and late mutation without revising facts`
Proves:
- Scope-bound RecordSink 自动绑定 owning Check 与声明的 record type；valid submission 立即提交、equivalent replay 幂等，而 conflict/invalid submission 选择 owning Check 的 safe unavailable terminal，独立已提交 Records 保留。
- scope-external、duplicate settlement、terminal 后与 snapshot 冻结后的 submission 均被拒绝，不能改写已经形成的 Check 或 Record facts。

## Case WB-RUNTIME-CHECK-FAILURE-001: Contained Check failure 保持安全 terminal 语义
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > binds record ownership, retains accepted independent Records, and gives record failures precedence`
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > maps malformed terminal values to a contained unavailable result and cancellation closes unresolved scopes`
- `bun|src/product/run/index.test.ts|Package Run > calls an applicable TaskPlan factory during closed planning and lets the shared scheduler run it`
Proves:
- invalid result、record conflict、TaskPlan leaf failure 和 cancellation 各自归入 owning Check 的 safe unavailable outcome；合法 quality `failed` 仍是 completed outcome。
- 已经提交的 Records 在后续 ordinary failure 下保留；Core trusted invariant 会抛出 fatal failure，而不是伪装成普通 Check fact。Package Run 对逃逸 trusted failure 的 execution-result 映射由 Run boundary 的结构审计承担，不从这些不可由合法项目输入触发的测试实体推断。

## Case WB-RUNTIME-CHECK-ORCHESTRATION-001: Product Check adapter 在同一 graph 上执行 direct 与 TaskPlan
Owner: `docs/quality-metrics.md#当前模型`
Entities:
- `bun|src/product/run/index.test.ts|Package Run > calls an applicable TaskPlan factory during closed planning and lets the shared scheduler run it`
- `bun|src/product/run/index.test.ts|Package Run > does not call a TaskPlan factory for a not-applicable Check`
- `bun|src/product/run/index.test.ts|Package Run > flattens group dependencies before shared execution`
- `bun|src/product/run/index.test.ts|Package Run > uses only explicit mutex constraints to serialize direct and TaskPlan leaf work`
- `bun|src/product/run/index.test.ts|Package Run > prepares built-ins present in the tree before a dependent custom Check`
- `bun|src/product/run/index.test.ts|Package Run > observes cooperative cancellation after input validation and before planning work`
Proves:
- direct Check、static TaskPlan 和 zero-child completion 使用一个 prevalidated static graph；普通 child Task 不形成 Product Check，且 not-applicable Check 不创建 scope。
- group dependency、explicit mutex 和 settled prerequisite availability 在同一 engine 中协作。completed quality `failed` 与 not-applicable 可放行 dependent；unavailable 会阻断 dependent user work，unrelated work 仍可完成。
- execution-phase abort 停止新的 admission、drain 已开始 work，并保留已形成 facts；未关闭 Check 在冻结前以 cancelled unavailable outcome 关闭。

## Case CHECK-SCOPED-CONCURRENCY-001: Check-scoped cap 在 shared Task engine 内临时收紧 invocation
Owner: `docs/architecture.md#checktask-system`
Entities:
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > uses the minimum active cap and reserves capacity for a newly ready tighter scope`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > does not activate a cap for a scope with no activation task`
Proves:
- Product layout can project an effective Check cap as generic graph scope metadata: active scope caps take their minimum with root capacity and last from first admission through terminal settlement.
- A newly ready tighter scope reserves/drains deterministic capacity without preemption; an active constrained continuation is preferred. A scope without an activation Task does not tighten capacity.

## Case WB-RUNTIME-CHECKPOINT-001: Frozen Core snapshot 形成 canonical two-entity fact projection
Owner: `docs/architecture.md#核心定位`
Entities:
- `bun|src/product/quality-core/check-record/core-session.test.ts|check-record Core Check session > closes every registered Check exactly once and freezes only canonical Check and Record facts`
- `bun|src/product/quality-core/check-record/model.test.ts|check-record foundation model > validates an exact canonical two-entity snapshot without lifecycle projections`
- `bun|src/product/quality-core/check-record/validation.test.ts|check-record foundation runtime validation > requires a known non-not-applicable owner and canonical entity order`
Proves:
- frozen snapshot 的实体集合恰好为 `checks` 与 `records`，以 canonical order 表达 one-Check-one-outcome 与 direct Record ownership；policy、output 与 private execution data 不成为第三事实源。

## Case AUX-RUNTIME-OPTION-001: Product Option 显式区分值存在与缺失
Owner: `docs/coding-style.md#5-按问题形态选择实现模型`
Entities:
- `bun|src/product/foundation/option.test.ts|product Option > composes present values without entering absence branches`
- `bun|src/product/foundation/option.test.ts|product Option > keeps absence stable and evaluates only fallback branches`
- `bun|src/product/foundation/option.test.ts|product Option > converts nullable inputs and Result boundaries without losing values or errors`
Proves:
- `Some` 的 type guard、映射、链式组合、过滤、匹配和 fallback 保持存在值，并且只执行存在分支副作用。
- 单例 `None` 在映射、链式组合和过滤中保持缺失，通过 `or`、`orElse`、`unwrapOr` 和 `match` 显式进入 fallback，并且只执行缺失分支副作用。
- `fromNullable` 只把 `null` 与 `undefined` 转成缺失，保留 falsy 值；`toResult` 分别保留存在值和指定的缺失错误。

## Case AUX-QUALITY-CACHE-001: Quality measurement cache identity 稳定
Owner: `docs/scanner-dependencies.md#exact-input-adapter-handoff`
Entities:
- `bun|src/product/quality-core/measurement/cache.test.ts|quality measurement cache > keys duplicate-code cache by scan identity and strips changed-scope annotations`
Proves:
- duplicate-code cache key changes for tested code area、input fingerprint、tool name/version 和 normalized args differences。
- cache hit 返回不带 changed-scope annotation 的 metric，保持复用扫描与当前 diff 语义分离。
- baseline snapshot cache identity 由 materialized exact-input fingerprints、有效 code-area/duplication measurement settings 与 eligible backend executable/args/version 构成；tested input、executable 或 tool version 变化时 key 改变。
- accepted-warning、report、sibling file-check 与 project-config contract version 变化不影响 baseline measurement cache key；命中时通过 snapshot hash 防止错读缓存内容。
