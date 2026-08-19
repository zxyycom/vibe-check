# Proposal

本 Plan 用一种普通递归 `Check` 对象统一 Project Definition 的 Check authoring、默认值自定义、执行结果与 Task 投影；实现可以从 Readiness 已确认的类型、owner、测试和迁移清单直接开始。

## Why

当前模型不能用一条规则回答“什么是 Check、怎样修改它、怎样执行它”：

1. `CheckGroup | BuiltInCheck | CustomCheck` 让 tree position 和来源决定对象形状；
2. direct binding、applicability callback 与 TaskPlan binding 让一个 Check 有多种执行协议；
3. Product 默认 Check 是完整数据，却只能通过 `replace` / `append` 和 partial patch types 修改；
4. executable 位于 Project/Run operational dependency maps，Run 还要按 `checkId` 重建 built-in runtime；
5. group dependency expansion 在 Check 层复制了 generic Task graph 已拥有的依赖检查。

这些分支没有形成五种独立产品能力，只是旧实现把 authoring role、来源、运行准备和调度责任编码进了不同 variants。它们增加 API 学习成本，也使 Definition、Run、Core、scanner dependency 和 package planning 必须同步维护多套路径。

目标模型只保留一个普通递归 `Check` value：`execution` 决定当前节点是否执行，`checks` 决定是否继续展开 children；两者相互独立。Product 默认 Check 遵守同一对象契约，自己的完整 `options` 包含 scanner executable 等 Check-specific execution configuration。普通对象调整使用 JavaScript/TypeScript 原生组合，只有 parent-relative scheduling collection edit 使用 `inherit(...)`。

## Outcome

完成后：

1. `defineConfig({ checks: [...] })` 只接收一种 recursive `Check`；`defineCheck(...)` 是可选的 TypeScript authoring helper，普通对象仍是运行时输入。
2. 每个带 `execution` 的节点形成一个 Task、一个 Check outcome 和一个 Check-scoped Record reporter；information-only 节点只组织 children 和传递继承配置。
3. execution 一次返回 completed、not-applicable 或 unavailable；Check-declared unavailable 与 Product 生成的 throw、非法结果、取消、依赖和 reporter protocol 原因保持可区分。
4. `dependsOn`、`mutex` 和 `maxParallel` 直接投影为 generic Task graph inputs；完整 graph 在 work 前统一拒绝重复 Task、未知依赖和环。
5. `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是带完整 options/execution 的普通默认对象；项目使用 object spread、destructuring 和数组操作修改它们。
6. `replace`、`append`、role/source Check variants、TaskPlan、Project-wide operational dependency map、Run dependency override 和 source-specific runtime lookup 从目标 contract 中退出。

## Scope

### In scope

- single recursive `Check`、independently optional `execution` / `checks`、closed validation 与 empty information-node warning；
- direct execution context、structured result、Check-declared reasons、Product-generated unavailable reasons、Record 与 reference evidence reporters；
- `recordTypes` 省略时归一化为 `[]`；
- `dependsOn` / `mutex` 的 missing、exact array、`[]` clear、`inherit(add/remove)`，以及 `maxParallel` nearest-explicit semantics；
- one executable Check to one generic Task、pre-work graph validation 和 active Task cap projection；
- Check-owned scanner executable/options，以及 invocation-wide project/comparison/cache inputs 的显式 context 归位；
- complete Product default Check values 与 native object composition；
- public inventory、stable decisions、tests/Cases、docs/examples、repository dogfood 和 downstream package Change handoff；
- hard cut old Check variants、TaskPlan、adjustment helpers/types、operational maps 和 source/checkId-specific runtime binding。

### Out of scope

- 修改 generic Task engine 的 graph、admission、blocked sweep 或 cancellation contract；
- containment-derived order、parent completion、aggregate outcome、Record copy、hierarchy output 或一个 Check 内的多阶段 execution；
- generic deep merge、partial Check grammar、默认值自动补全或 adjustment compatibility aliases；
- package build、tarball、registry 或 publish implementation；这些由 downstream package Change 负责。

## Success Criteria

### Authoring and types

- `ProjectDefinition.checks` 是 `readonly Check[]`；所有 tree positions 使用同一种 recursive node type。
- `defineCheck` 对 standalone option-aware literal 提供 `options -> execution context` 推断、closed root-field diagnostics、no-options context 和 required options preservation；已形成的 child Check value 不需重复包装。
- plain object、`satisfies Check<Options>` 和 `defineConfig` 中的 ordinary Check values 保持合法；helper 不增加 brand、binding、冻结、validation 或 patch semantics。
- authored `recordTypes` 可省略，Definition 在 policy、fingerprint、RecordSink 与 Core 前确定性归一化为 `[]`。

### Execution and facts

- callback context 只暴露 `{ options, project, records, signal }`；`project` 提供规范化 root、changed files、file configuration、comparison 与 cache capability，`records` 提供 Record 与 reference evidence reporting。
- callback 返回 completed(passed|failed)、not-applicable 或 Check-declared unavailable；Records 和 reference evidence 不从 verdict 反推。
- Product 分别保留 prerequisite unavailable、execution throw/rejection、invalid callback result、execution cancellation、invalid/conflicting Record 和 invalid reference evidence 原因；callback settle 后关闭的 reporter 不能再改变 facts，pre-work cancellation 不伪造 Check fact。
- 每个 execution-bearing node 独立注册 Core Check 与 RecordSink；information-only node 不创建 Task、outcome、Record owner 或 dependency alias。

### Scheduling and defaults

- missing/exact/clear/`inherit(add/remove)` collection states 与 nearest-explicit `maxParallel` 都有闭合 normalization；set-like values canonicalize，不产生 authored-order execution semantics。
- executable Check 的 `checkId`、effective `dependsOn`、`mutex`、`maxParallel` 直接进入一个 generic Task；graph validation 在 work 前拒绝 duplicate id、unknown dependency 和 cycle。
- effective `maxParallel: 2` 从该 Task admission 到 settlement 持续约束“正在运行的 Product Tasks 加当前 candidate”不超过 2。
- 三个 Product 默认 Check 的完整 options 包含 scanner executable、固定 adapter arguments 和 Check-specific semantics；native nested spread 可以覆盖其中任意公开字段。
- Definition 与 Run 不再接受 operational dependency maps/overrides，不按 Check 来源、`checkId` 或 object identity 恢复 runtime binding。

### Migration and verification

- source、tests、semantic Cases、stable docs、examples、public-contract inventory、dogfood 和 downstream package Plan 使用同一目标 API。
- focused searches 证明旧 Check variants、TaskPlan、group dependency expansion、`replace` / `append`、partial patch materialization 和 source-specific runtime lookup 已退出受支持表面。
- target tests、typecheck、lint、decision/change/docs checks、required verifier 与 full verifier 通过，或明确记录确实不可用的验证及其影响。

## Affected Owners

- `src/product/definition/**`：recursive authoring、validation、normalization、defaults 与 fingerprint inputs；
- `src/product/run/**`：execution context、Task projection、result mapping、comparison/cache lifetime 与 publication handoff；
- `src/product/task-scheduler/**`：继续作为唯一静态 graph 和 admission owner，不改变其 public contract；
- `src/product/quality-core/**`：Check/Record outcomes、reference evidence、catalog/fingerprint 与 default Check implementation；
- `src/product/scanner-dependencies/**`：移除平行 resolution boundary，保留 scanner adapter protocol；
- `src/product/public-contract/**`：最终 runtime value/function/type inventory；
- `docs/{architecture,configuration,quality-metrics,scanner-dependencies,output,testing,script-tooling}.md`、schemas/examples 与 `docs/testing/cases/**`；
- `scripts/quality/project-definition.ts`、dogfood tests 与 `changes/establish-api-only-npm-product-boundary/`。
