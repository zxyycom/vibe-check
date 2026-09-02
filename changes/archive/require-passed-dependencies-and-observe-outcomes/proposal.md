# Proposal

本 Change 将 `dependsOn` 收敛为成功前置关系，并用独立的 `observes` 表达等待任意上游终态后读取结果，从默认路径消除 dependent Check 在前置失败后继续启动的副作用风险。

## Why

当前 `dependsOn` 只等待上游 Task 正常结算。上游 Check 返回 `failed`、`unavailable` 或 `not-applicable` 时，对应 Task 仍可被 Scheduler 视为 completed，dependent callback 随后照常启动；上游 preflight block 形成 `unavailable` 后，dependent 也仍会运行。依赖数据 reader 虽能暴露这些状态，但要求每个有副作用的 consumer 在任何工作前重复编写 guard。

多数项目把依赖理解为成功前置条件：生成物不一致时不应启动消费验证，provider 没有可信数据时不应启动下游进程。失败后仍需形成审计、汇总或诊断的场景具有独立语义，不应决定默认依赖行为，也不应扩张为按任意状态路由 Check 的工作流 DSL。

## Outcome

`dependsOn` 的每个 direct upstream 只有在 `passed` 时才允许 dependent Check 开始 preflight 和 execution；任一 upstream 非 `passed` 时，Product 不调用 dependent author work，并以可追溯 direct Check IDs 形成受控 unavailable outcome。需要观察任意四态终态的 Check 改用 `observes`，等待上游结算后通过同一个只读 dependency context 处理结果。Product 不增加状态表达式、条件分支节点或成功/失败工作流编排能力。

## Scope

### Intended Change

- 将 `dependsOn` 定义为 all-passed prerequisite relation，将新增 `observes` 定义为 settled-outcome observation relation。
- 让两种 direct relation 共同参与静态授权、unknown/self/cycle validation 与 Check tree collection inheritance，但禁止同一 source-target pair 同时声明两种关系。
- 把 Check preflight 纳入受 relation、mutex、capacity、priority 与 cancellation 约束的 Check Task 生命周期，移除会提前启动 dependent author work 的全局 preflight barrier。
- 以一次硬切同步公共类型、Definition normalization/fingerprint、Scheduler projection、dependency reader、结果结算、文档、示例和本仓库 Gate consumer。

### Resulting Impacts

- 现有所有 `dependsOn` consumer 必须逐项分类：真正的成功前置关系保留；需要读取失败、不可用或不适用结果的 audit/summary consumer 迁移到 `observes`。
- 当前 dependency readback、preflight、collection inheritance 与 Task settlement Decisions 需要演进；现行取消、四态 Check facts、aggregation、console capture 和 machine publication边界继续保留。
- blocked dependent 需要形成完整 Check lifecycle facts，而不能继续被 finalizer 当成 Task engine invariant failure。
- public declaration、README、API/configuration/architecture 文档、package examples、installed consumer 与 schema-like authoring validation 必须在同一版本切换。

## Success Criteria

1. upstream `passed` 时，`dependsOn` dependent 的 preflight 与 execution 各执行一次，并能读取 upstream final data。
2. upstream 为 `failed`、`unavailable` 或 `not-applicable` 时，`dependsOn` dependent 的 preflight 与 execution均不调用；其 outcome 为 Product-owned `unavailable / dependency-not-passed`，reason 只列出直接未通过 dependency IDs，duration 为 `null`。
3. `observes` consumer 在 upstream 四种状态下都只于上游结算后运行，并从 `dependencies.get/list` 读取全部已声明 direct observations；它自己决定普通 TypeScript 分支和 terminal result。
4. `dependsOn` 与 `observes` 的 union 拒绝 unknown ID、self edge、跨 relation cycle 和同一 pair 的双重声明；两者都遵守唯一 `inherit({ add, remove })` collection grammar。
5. Scheduler 不提供 `when`、allowed-status array、`onSuccess`、`onFailure`、any-of dependency 或条件图节点；发布、部署、回滚与 Gate 后处理仍由项目 orchestration拥有。
6. cancellation、mutex、`maxParallel`、`admissionPriority`、Record/console containment、四态 Core facts、aggregation 与 machine output 通过回归验证；package candidate 和外部 consumer看到匹配的新类型、文档和运行行为。

## Affected Owners

- `src/check/**`：公共 Check authoring、dependency context 与 result types。
- `src/project-definition/**`：relation authoring、inheritance、normalization、fingerprint 与静态检查。
- `src/project-run/check-execution/**`：preflight/task 生命周期、dependency authorization 和 blocked Check settlement。
- `src/project-run/task-scheduler/**`：两类 relation 的 readiness 与非成功 prerequisite propagation。
- `scripts/project/gate/**`：现有 data-dependent process consumer 的关系迁移与防御边界。
- `README.md`、`docs/configuration.md`、`docs/api-mechanics.md`、`docs/architecture.md`、`docs/examples/**` 与 package documentation acceptance。
- dependency、preflight、task graph、inheritance、console、cancellation 与 package API 相关 Decisions 和 Test Evidence。
