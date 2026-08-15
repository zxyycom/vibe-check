# Proposal

**当前状态：暂停。** `.change-plan.json` 的 `stage: plan` 只表示 artifacts 已具备 Plan 结构，不表示可以实施。不得据此开始或勾选任何未完成的 Implementation 任务。当前方向与交接 owner 是[新 Draft 的 Design](../unify-check-values-and-inherited-configuration/design.md)。

本 Change 形成时计划把 Project Definition 从“专门 `CheckGroup` + executable leaves”硬切为一种递归可执行 Check shape，并把父子编排投影到唯一静态 Task graph。下文保留该形成时 Plan 方案，不能作为当前实施指令。

## Why

当前 `CheckNode` 是 `CheckGroup | BuiltInCheck | CustomCheck`。带 `checks` 的 group 只在 authoring 时存在，normalization 会把它消除，只为 leaves 建立 Normalized/Resolved Check、Task scope、Core Check 与 QualityRecords。这与已经确认的产品模型不一致：Check 是拥有领域 identity、outcome 与 Records 的 Product-owned execution scope，每个父、子 Check 都应正常执行，而不是依赖另一种无执行身份的父节点。

父子嵌套还需要区分两种 Task 关系：

- `dependsOn` 是 availability prerequisite；前项 unavailable 会阻断后项。
- 父子先后只要求前项已经结算，不传播其 outcome；它不能复用 `dependsOn`。

本 Change 在预正式 public contract 内执行一次 hard cut：保留一个 Task engine、每 Check 一个 execution scope、独立 Check/Record facts 和现有 cancellation/cap 语义，同时移除 Product `CheckGroup`。

## Outcome

- `ProjectDefinition.checks` 只接受递归 `CheckNode`；built-in 与 custom Check 都可用非空 `checks` 包含子 Checks，不再公开或解析 `CheckGroup`。
- 每个出现的 Check node 都完成一次 normalization 与 Run resolution，并独立形成一个 Core Check；父、子 Check 各自产生 outcome 与 QualityRecords，不聚合、不复制。
- 父 Check 使用 `childrenOrder: "parallel" | "self-first" | "children-first"` 声明自身与整个 descendant subtree 的执行先后，缺省为 `parallel`；array order 与 sibling position 没有执行语义。
- Generic Task graph 使用独立 settled-order relation 表达父子先后；显式 `dependsOn` 继续独占 unavailable blocking。
- 每个 applicable Check 在同一 scope 内使用私有 closure terminal；父子顺序和显式 Check dependency 都以它为 target，确保后续 work 开始前前一 Check 的 outcome 与 RecordSink 已可信关闭。
- ancestor `dependsOn` 与 `mutex` 继续向 descendants 追加、去重；`maxParallel` 继续使用最近声明并由每个 Check 自己的 Task scope 携带到 closure terminal。
- direct Check 与 TaskPlan Check 继续进入同一 frozen graph；TaskPlan 仍只描述单个 Check 内部的 private Tasks。
- Core snapshot 与 machine v3 仍只包含独立 `checks`、`records` 和必要运行 metadata，不增加 hierarchy、group、aggregate outcome 或 Task entity。
- `replace` / `append` 继续只调整 built-in options/scheduling fields；它们不成为递归 tree editor，但必须保留输入 BuiltInCheck 已有的 `checks` 与 `childrenOrder`。

## Scope

纳入范围：

- Product Check authoring types、built-in/custom data shape、parser、normalization、inheritance、identity/reference/cycle validation 与 declarative fingerprint；
- generic Task graph 的 settled-order relation、validation、scheduler readiness/blocking 与 tests；
- Normalized/Resolved Check、static Check execution planning、direct/TaskPlan/closure scope projection、not-applicable、unavailable、cancellation 与 exact-once Core settlement；
- built-in adjustment preservation、current public-contract inventory 与 pre-publication type names；
- Architecture、Configuration、Quality Metrics、Output review、Testing/Cases、examples 与受影响验证材料；
- 对 `establish-api-only-npm-product-boundary` 的 Check tree/group assumptions 做 re-plan handoff，但不在本 Change 实现 package projection。

不纳入范围：

- 公开 Task engine、scheduler Task、scope、barrier 或 settled-order fields；
- 改造 custom `TaskPlan` 的 group/leaf authoring，或把 TaskPlan child Task 提升为 Check；
- 父子 verdict 聚合、父节点复制 child Records、hierarchy machine output 或 subtree policy operand；
- execution-time graph expansion、dynamic Check registration、第二 queue、per-Check scheduler 或 adapter 内部 Promise ordering；
- 修改 `scripts/vibe-check-workspace/**` 自己拥有的 scripts-only group authoring；
- 实现、打包或发布 npm package。

## Success Criteria

- Final Project Definition 在任何 project function 执行前 closed-validate recursive Check nodes，并拒绝旧 group-only shape、空 children、无 children 的 `childrenOrder`、未知字段、重复 `checkId`、未知引用和由显式 dependencies 与父子 order 共同形成的 cycle。
- 每个递归 Check node 恰好形成一个 Normalized Check、一个 Resolved Check 和一个 Core Check；父、子 outcome 与 Record ownership 独立，not-applicable 仍不创建 executable scope。
- `parallel` 不添加父子顺序；`self-first` 让所有 applicable descendant work 等待 parent terminal settlement；`children-first` 让 parent work 等待所有 applicable descendant terminal settlements。
- 每个 applicable Check 的 closure terminal 在自身 outcome 与 RecordSink 已可信关闭后 settlement；父子顺序等待该 closure，而不是只等待 native work Task。direct、TaskPlan success、leaf failure 与 dependency-blocked 路径都满足这一保证。
- settled-order target 无论 completed、failed、blocked 或 `cancelled-before-start` 都满足纯顺序关系本身，但 invocation Abort 仍停止 admission 并使 pending consumer `cancelled-before-start`；只有显式 `dependsOn` 将 unavailable 传播为 blocked work。
- 非 Abort 时，即使某个 `dependsOn` 已 unavailable，consumer 也必须等全部 settled-order targets 结束后才结算 blocked；blocked reason 只来自 unavailable dependencies，不能用提前阻断绕过父子顺序。
- direct、TaskPlan、zero-leaf TaskPlan、not-applicable、contained unavailable、explicit dependency blocking 与 cancellation drain 在递归关系中都有目标测试且 exact-once 关闭 Core。
- ancestor `dependsOn` / `mutex` inheritance、nearest `maxParallel`、active-scope minimum cap、reservation/drain 与 non-preemption 保持已确认语义；一个 Task 不同时属于多个 Check scopes。
- 语义等价的递归配置获得相同 canonical declarative fingerprint；改变 Check identity、inherited scheduling、显式 dependency 或 `childrenOrder` 会改变相应 projection。
- Current public contract、docs、examples与 Cases 不再把 `CheckGroup` 或 authoring-only group 当作 Product Check tree contract；built-in adjustments 保留 composition fields 且不新增递归 editor API。
- 父、子 Check 都作为独立 operands 进入 policy catalog；machine v3 同时发布各自 Checks/Records，且不增加 subtree implicit operand、hierarchy 或 aggregate 字段。
- 仓库自用 `scripts/quality/project-definition.ts` 不保留无执行 binding 的假 parent；原 group 被 flatten 为真实 top-level Checks，并把 effective cap 明确带到原 children，Project Run dogfood 继续通过。
- Product target tests、typecheck、lint、test-evidence、decisions、docs、Change gate、workspace required 与 full verification 全部通过。

## Affected Owners

以下条目保留本 Plan 形成时的 owner 与实施范围。其中列出的四条 direction paths 已不存在，不能再作为当前 authority；当前七条 direction owners 只在[新 Draft 的 authority table](../unify-check-values-and-inherited-configuration/design.md)中维护。其余条目同样是形成时的影响面，不构成暂停期间的实施授权。

- `docs/decisions/configuration/use-one-recursive-executable-check-shape.md`：递归 Check authoring shape、合法 order values 与 group hard cut。
- `docs/decisions/configuration/carry-recursive-check-parallel-limits-through-closure-scopes.md`：ancestor cap inheritance、closure scope 与 active-cap 行为。
- `docs/decisions/product-contract/execute-recursive-check-closures-through-one-task-graph.md`：settled order、closure projection、独立 facts 与唯一 Task engine。
- `docs/decisions/product-contract/confirm-recursive-check-authoring-and-adjustment-names-before-publication.md`：public type names 与 adjustment preservation。
- `docs/decisions/product-contract/use-core-check-and-record-facts-from-run-resolution.md`、machine v3 与 cancellation decisions：继续适用的 Core/output/cancellation 边界。
- `src/product/definition/**`：Check data、recursive validation/normalization、adjustments 与 fingerprint。
- `src/product/task-scheduler/**`：generic graph settled-order contract 与 scheduler。
- `src/product/run/**`：Resolved Checks、scope planning、execution settlement 与 Core facts；`src/product/quality-core/**` 只在 contract audit 发现失效 owner 时修改。
- `src/product/public-contract/current.ts`：definition-facing public name inventory。
- `docs/architecture.md`、`docs/configuration.md`、`docs/quality-metrics.md`、`docs/output.md`、`docs/testing.md` 与 semantic Case files：稳定行为与证明 owner。
- `scripts/quality/project-definition.ts` 与 Project Run dogfood aliases：仓库自用 Product Definition 的 hard-cut migration 与入口证据。
- `changes/establish-api-only-npm-product-boundary/**`：进入 package implementation 前必须重审的 downstream Plan。

## Pause Status

### Current State

本 Change 保持 active `plan`，未归档、未删除任务，也没有把暂停伪装成完成。形成时已勾选的 Readiness 项只记录当时的调查和决定；它们不授权继续进入 Implementation。

### Pause Reason

本 Plan 形成时引用的四条 direction paths 已不存在。其 `childrenOrder`、generic `settlesAfter`、per-Check closure terminal 和 built-in/custom adjustment boundary 与当前七条 `active + unaligned` 决策的单一 Check、无 containment order/closure、统一 base-value derivation 方向不兼容。因此保留本 Plan 作为形成时设计，不能把其 Scope、Success Criteria 或任务直接当作当前实现指令。

### Handoff and Resume Conditions

当前交接由[新 Draft](../unify-check-values-and-inherited-configuration/design.md)承接。恢复本 Change 或复用其任何范围前，必须：

1. 获得对旧 Plan 最终处置和范围交接的明确授权；可选择重写、拆分、转移无冲突工作或其他受授权路径，但本文件不预先选择其中之一。
2. 读取新 Draft、其 authority table 中的七条当前决策和当前实现事实，判断哪些形成时内容仍可保留。
3. 依授权更新 proposal、design 与 tasks，使其只表达仍适用的方向、owner、任务和验证；随后完成新的 Readiness 并运行 Change Plan 的 `plan` 命令刷新 Git baseline。
4. 仅在另有当前任务明确授权实施后，才开始任何 Implementation 任务。
