# Proposal

本 Change 已在不改变公共配置、调度算法或 Run 结果的前提下，将跨 Run 的 duration model 与纯 critical-path 算法分离为两个 private owner，并由一个 invocation-scoped strategy provider 将它们组合为严格的 `prepare → decide → complete` 生命周期。

## Why

Plan baseline 虽已按 `history load/prediction → pure Scheduler → history record/write` 运行，但 private 组合分散在 invocation、history owner 和 `resolved-checks`：`scheduler-history/critical-path.ts` 包含图算法，`SchedulerLearning` 混合 history、prediction、score 与 state directory，而 invocation 手工分别准备、创建并记录。这样 duration 学习和 admission 算法无法独立演进，也没有一个能明确表达一次 effective strategy 生命周期的 owner。

已对齐的长期方向要求跨 Run history 位于 Scheduler 外、Scheduler 只消费 immutable prediction 与同步纯 `select | wait` 决策，并由 Scheduler 独占 hard guards。本 Change 只重组 private ownership 和调用边界，以当前可观察行为为等价基线。

## Outcome

当前每次 Project Run 都通过一个已解析的 private strategy provider 运行以下生命周期：

```text
graph ready
  → effective strategy.prepare()       // exactly once; before Scheduler measurement
  → Invocation combines prepared private measurement requirements with existing outputs/Hooks
  → Scheduler consumes prepared.admissionPolicy
       → policy.decide()                // 0..N times; synchronous select|wait result
  → drain, terminal measurement seal, and existing terminal Hook delivery
  → if executeResolvedChecks returns its terminal sequence/context:
       prepared.complete()             // exactly once; terminal commit
    otherwise: no complete delivery
```

- duration model 独占 history 的 load/validation、identity、prediction、terminal sample recording 与 storage；它不拥有 graph ranking 或 candidate selection。
- Task Scheduler owner 独占 critical-path ranking 与纯 comparator；它不读取 history、filesystem 或跨 Run state。
- learned-critical-path provider 在一次 Run 内组合上述两个 owner，返回 `PreparedAdmissionStrategy`；invocation 只负责解析 effective provider、驱动三个生命周期点和呈现已有诊断，不实现学习细节。
- Scheduler 只消费 prepared strategy 的完整、frozen private `admissionPolicy`，不接触 `prepare`/`complete`；其中 `decide` 同步只返回 `select | wait`。Product-owned static/learned algorithm 保持纯选择；现有 custom callback 仍是 trusted、可重入的同步 callback，可使用自己的 closure/host-side effect，且没有 imperative Scheduler capability。policy 保留 custom 的 `requiresMeasurement: true`、decision-boundary prefix、action interval attribution；prepared strategy 另有 closed private terminal-measurement requirement。invocation 将两者与既有 diagnostic logging/configured measurementHooks 合并决定 collector，绝不从 public kind 散落推断或把它们变成 public model field。只有 `executeResolvedChecks` 已返回现有 terminal sequence/context 时才 delivery `complete`，且它晚于既有 terminal measurement Hook delivery；该终态测量只能经 caller-owned store 被下一次 Run 的 `prepare` 读取，绝不回流到同一 Run 已发生的 decision。
- measurement requirement matrix 固定为：plain static 无额外 requirement；custom 保留 policy 的 per-decision requirement 与 prepared terminal requirement；learned ready 和 learned static-fallback 都保留 prepared terminal requirement；diagnostic logging 与 configured measurementHooks 始终独立启用。static 不产生 duration-model I/O，也不因 no-op completion全局新建 collector 或读取 clock。公开 custom lifecycle 由后继 Draft 单独承接。

## Scope

### Intended Change

- 将 `scheduler-history/**` 收敛为 `scheduler-duration-model/**`，使其只拥有 bounded history、prediction、preparation、recording 与 storage，不保留 graph algorithm。
- 将 critical-path ranking 移入 `task-scheduler/**`，使其以 immutable graph 与 prediction 形成 score snapshot 和纯 `AdmissionSelectionPolicy`。
- 增加 closed private strategy-provider boundary：static、现有 custom 与 learned 都解析为一次 Run 独立的 prepared strategy；其完整 frozen `admissionPolicy` 保留 per-decision requirement，另有 closed private terminal-measurement requirement。learned provider 在 `prepare` 内调用 duration-model preparation、在 `complete` 内调用 record capability。
- invocation 在 graph ready 后调用一次 `prepare`，合并 prepared strategy 的 private per-decision/terminal measurement requirement 与既有 logging/Hooks，按现有条件配置 collector，再将完整 frozen `admissionPolicy` 交给 `resolved-checks`/Scheduler；仅当 `executeResolvedChecks` 返回现有 terminal sequence/context 时，才在其已完成 drain、measurement seal 和既有 terminal Hook delivery之后调用一次 `complete`。normal、cancelled 与 admission-policy-failed 若有该 context 均 delivery；task-engine/pre-terminal failure 没有该 context 时不 delivery。`prepare`/`complete` 可异步并可有受控副作用，`decide` 必须同步且只作选择。
- 迁移直接测试与文档，证明生命周期顺序、owner direction 与既有行为等价；不将 private provider 或 prepared strategy 投影为 public configuration。

### Resulting Impacts

- `invocation.ts` 删除混合 `SchedulerLearning`，成为 lifecycle runner，不再手工组合 duration prediction、score 和 recording。
- `resolved-checks.ts` 只接收完整 frozen private `AdmissionSelectionPolicy`；它不分派 public policy kind，也不认识 history、prediction、score table、provider lifecycle 或 terminal requirement resolution。
- 测试必须证明：只有返回 terminal sequence/context 的 normal、cancelled、admission-policy-failed Run 才满足 `prepare once → decide 0..N → complete once`；complete 开始时 admission 已停止、started work 已 drain、terminal measurement 已封闭且既有 terminal Hook 已 delivery。task-engine/pre-terminal failure 不产生 complete。
- history schema、model version、prediction digest、score formula、selection layers、priority/ID tie-break、`canAdmit`/`wait`、fallback、diagnostic containment、custom closure/reentrancy/host-side-effect boundary、per-decision/terminal measurement requirement matrix、Task/Check results 和 deterministic history bytes 保持不变。
- 后继 `optimize-learned-admission-strategy` 固定消费本 Change 提供的 prediction/algorithm seam；后继 `support-invocation-scoped-custom-admission-strategies` 依赖本 Change 的 lifecycle seam 再评审 public contract。两者不参与本 Change 验收。

## Success Criteria

- 代码目录和 imports 清楚表达三个 private 责任：duration model 无 graph/admission 依赖；纯 critical-path 算法无 filesystem/history/record 依赖；provider 才负责将二者组成 learned 生命周期。
- 返回现有 terminal sequence/context 的 normal、cancelled、admission-policy-failed Run 可直接恢复 `prepare once → policy.decide 0..N → complete once`；prepare 在 measurement 前，complete 在 terminal measurement seal 和既有 terminal Hook delivery 后。task-engine/pre-terminal failure 不 delivery complete。Scheduler 只接收完整 frozen private `admissionPolicy`，其中 decide 同步只返回 `select | wait`；Product-owned static/learned algorithm 纯，custom保留trusted callback boundary，且既有 per-decision/terminal measurement requirement metadata不变。
- 同一 Run 的终态数据不会改变此前 decision；跨 Run 学习唯一流向为 `complete → caller-owned store → next prepare`。
- `resolved-checks` 只接收 private `AdmissionSelectionPolicy`，不导入 public `AdmissionPolicy`、duration model 或 critical-path snapshot。
- 相同 Definition、controls、project root 和 history input 产生与基线相同的 fingerprint、prediction/digest、score、admission trace、settlement、diagnostic facts 与 history serialization。
- static/default 不进行 duration-model I/O，也不因 no-op provider completion 改变 measurement collector/clock 读取；custom policy fault contract、measurement hooks、`requiresMeasurement: true`、decision-boundary measurement prefix、action interval attribution 与其既有 collector 启用条件不变；learned empty model、prepare static fallback、complete record/write failure 保持既有分类与结果边界。
- 不新增 public field、algorithm registry、generic model interface、per-Check estimate、第二个 configurable algorithm 或外部依赖。
- 直接测试、installed consumer、Test Evidence、format、typecheck、lint、dependency boundary 与 required/full Project Gate 全部通过。

## Affected Owners

- **Plan baseline `src/project-run/invocation.ts` → 当前 `src/project-run/invocation.ts`**：baseline 混合 `SchedulerLearning` 和手工 prepare/create/record；当前只负责 effective provider resolution、生命周期运行、failure containment 与 diagnostic presentation。
- **Plan baseline `src/project-run/scheduler-history/**` → 当前 `src/project-run/scheduler-duration-model/**`**：baseline 混合 history/prediction/recording 与 graph-derived ranking；当前只承担 history identity、prediction、prepare/record capability、bounded model 和 storage。
- **当前 `src/project-run/admission-strategy-provider/**`**：closed provider dispatch、prepared strategy lifecycle 与 learned composition；不成为 registry 或 public API。
- **当前 `src/project-run/task-scheduler/**`**：承接 critical-path ranking、pure admission decision 与 Scheduler hard-guard handoff；它不接触 duration history I/O。
- **Plan baseline → 当前 `src/project-run/check-execution/resolved-checks.ts`**：当前只向 Scheduler hand off prepared strategy 的完整 frozen private `AdmissionSelectionPolicy`，不接触 provider lifecycle。
- `docs/architecture.md`、`docs/api-mechanics.md`、`docs/configuration.md`、`docs/testing.md` 与 `docs/testing/cases/**`：private lifecycle、owner、public/non-public boundary 和行为证据。
- [`docs/decisions/introduce-invocation-scoped-admission-strategy-lifecycle.md`](../../docs/decisions/introduce-invocation-scoped-admission-strategy-lifecycle.md)：现为 `active + aligned`，拥有 invocation 外层 strategy lifecycle 与 Scheduler-facing pure policy 的分层方向；它不开放 public custom lifecycle。既有 aligned Decisions 仍拥有 history、pure policy 与 Scheduler hard-guard 边界。
- `changes/optimize-learned-admission-strategy/**`、`changes/support-invocation-scoped-custom-admission-strategies/**`：本 Change 的两个后继 Draft；不参与本 Change 验收。

## Change Boundary

本 Proposal 是本 Change 的临时范围 owner。**Plan baseline** 是 `src/project-run/invocation.ts` 中混合的 `SchedulerLearning` 与手工 lifecycle、`src/project-run/scheduler-history/**` 中混合的 history/prediction/critical-path，以及 `resolved-checks.ts` 的 policy handoff；`task-scheduler/**` 已拥有 Scheduler hard guards。**当前**由 `scheduler-duration-model/**` 承担 duration model、`task-scheduler/**` 承担 pure ranking/selection、`admission-strategy-provider/**` 承担 prepared-strategy composition，而 invocation 是它们的唯一 lifecycle 集成 owner。

- **唯一 Outcome owner**：当前 invocation 是一次 effective strategy 生命周期的唯一集成 owner；它只编排 `prepare → decide* → complete`，不拥有模型或算法。
- **生命周期 Decision 状态**：Implementation 前，Decision owner 已将 `introduce-invocation-scoped-admission-strategy-lifecycle` 建立为 `active + unaligned`，并完成 `tasks.md` 的 Readiness oracle；本 Change 验收后，Decision owner 已按实现事实标记为 `active + aligned`。该演进记录确认当前 private lifecycle 边界，不开放 public custom lifecycle。
- **与其它三个 Change 的关系**：`support-invocation-scoped-custom-admission-strategies` 的 Plan/Implementation 硬依赖本 Change 已验收的稳定 lifecycle seam；`optimize-learned-admission-strategy` 的生产策略实施也硬依赖该 seam。`provide-admission-strategy-simulation` 不依赖本 Change 的语义或 public contract；两者仅因共享 Scheduler/invocation owner 推荐串行、继承稳定提交。任何推荐合入顺序都是 worktree 协调，不改变各自 Outcome。
- **承诺边界**：只重组 private owner 与等价调用边界。现有 public learned/static/custom grammar、fingerprint、`stateDirectory`、measurement Hooks 和 result contracts 不变；不新增 `expectedDurationMs`、public model DTO、registry 或 custom lifecycle。当前模型细节仍可由既有文档/diagnostic 观察，但不因此成为跨版本兼容承诺。
- **验证出口**：以同输入的 prediction/digest、score、trace、terminal facts、diagnostic 分类与 history bytes 等价，加上 lifecycle 顺序和 public-consumer/Gate 验证为完成证据；算法收益不是本 Change 的成功主张。
