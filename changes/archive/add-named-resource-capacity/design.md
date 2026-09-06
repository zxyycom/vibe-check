# Design

本设计把 named resource capacity 限定为已有 admission hard guard 的静态整数维度，并让 Definition、standalone simulation、custom policy 与真实 Scheduler 共享一套验证、状态和转换语义。

## Context

- `mutex` 是 Check 声明的 string collection；同名 mutex 任一 holder 正在运行时，另一个 task 不能 admission。它是易读的 binary exclusion，而不是可分配 pool。
- root/scoped `maxParallel` 约束 Product 总 running Task 数；它不能只限制某一资源类别而让不使用该资源的 Task 利用其余 root slots。
- 每个 executable Check 恰好投影一个 Task 和一个 active-lifetime scope；task-local preflight 与 execution 都在同一次 admission-to-settlement 生命周期内。
- public `AdmissionState` 与真实 Scheduler 已共享 compiled graph、persistent selection index、pure transitions 和 closed rejection reasons。custom policy 只提出 `select`/`wait`，Scheduler 负责 hard revalidation。
- queue pressure 已按 relation-ready pending Task 分类为 mutex-blocked、capacity-blocked 或 admissible；named resource shortage 是新的 capacity hard guard，而不是 relation 或 mutex。
- 本 Change 的已确认范围是通用 named resource limit。可复现基线采用 consumer-shaped graph：root capacity 3、browser capacity 2、三个 browser tasks 各 claim 1、一个 unrelated task 无 claim。mutex、root 2 和 root 3 分别产生错误串行、错误阻塞无关 work 和资源超配。

## Goals / Non-Goals

**Goals**

- 为调用方准确表达多个有限资源 pool、per-Task 整数权重和同时占用多个资源的原子 admission。
- 在任何 work 前验证静态资源闭包，并在 Task 全生命周期保持持有/释放不变量。
- 让 public simulation、custom strategy context、real Scheduler、diagnostics 与 measurement 使用相同事实源。
- 保持 deterministic selection、有限进展、cancellation drain 和无资源配置时的默认兼容。

**Non-Goals**

- 不采集或预测实时 CPU、memory、load average 或历史 duration，不自动调整 claims。
- 不提供 fraction、负数、动态 claim、preemption、priority inheritance、distributed lock、OS enforcement、rate limit 或业务 quota。
- 不新增 reservation、aging、防饥饿状态、层级资源、borrow、burst、deadline 或 resource-specific custom callback。
- 不把 `mutex` 改写、废弃或迁移为隐藏 capacity-1 resource。
- 不在没有实际 Gate workload 证据时修改 Project Gate 的资源配置。

## Decisions

### Intended Change

1. **Public grammar**：`SchedulerPolicy.resourceCapacities` 与 `Check.resourceClaims` 都是 readonly string-to-number closed mapping。resource ID 必须是非空字符串，值必须是 positive safe integer。`defineConfig` 默认 capacity mapping 为 frozen `{}`；Check claims 默认 effective `{}`。
2. **Inheritance**：claims 是一个完整映射而非 collection。省略时沿 recursive containment 继承最近显式 mapping；显式 `{}` 清空；显式 mapping 完整替换。这样 child 不会因隐式 merge 获得未在自身 effective snapshot 中明显可见的额外占用，也不需要新的 `inheritMap` DSL。
3. **Static closure**：每个 effective claim 必须引用已声明 resource，且 claim 不得超过 capacity。Definition validation 与 generic Task graph validation 都在 work 前 fail closed；standalone graph input 使用相同 exact snapshot grammar。
4. **Graph facts**：`SchedulerGraphSnapshot` root 保存 canonical `resourceCapacities` 数组，Task 保存 canonical `resourceClaims` 数组；数组项使用 `{ resourceId, units }`，避免把 hostile property name 重新投影为对象属性。Definition authoring 仍使用 ergonomic mapping，normalized/declarative Definition 保存 canonical frozen mapping。
5. **Core state**：compiled graph 为 resources 分配稳定 slot，并为每个 Task 保存 `(resourceSlot, units)` claims。persistent selection index 保存每个 resource 的 `inUse` units；pending→running 原子增加全部 claims，running→settled 原子减少全部 claims。任何 accepted transition 都不会出现部分持有。
6. **Selection precedence**：primary rejection 保持 relation → mutex → scoped/root capacity → named resource capacity。named resource rejection 为 `{ kind: "resource-capacity-insufficient", resources: [{ resourceId, capacity, inUse, available, required }] }`，只列 canonical 排序的不足资源。所有 hard guards 满足后，现有 static/custom policy 才可选择 Task；priority 不越过资源限制。
7. **Inspection and policy**：`AdmissionInspection.resources` 暴露 canonical `{ resourceId, capacity, inUse, available }[]`；完整 static capacities/claims 位于 `SchedulerGraphSnapshot`。不在 `AdmissionPolicyContext` 再复制一套 resource state。
8. **Diagnostics and measurement**：Scheduler graph event 保存静态 capacities/claims，decision/callback state 可由 shared inspection 得到 dynamic availability；blocker summary 增加 `resourceCapacity` count。measurement 将 resource-insufficient Task 计入既有 `capacityBlockedTask*`，不改变 machine/Check/Record contract，也不新增 resource-time 指标。
9. **Progress**：有限静态 pending graph 中，每次 select 减少 pending，每次合法 wait 必须有 running work 可 drain；resource shortage 不引入持有部分资源的等待，因此不形成经典多资源 deadlock，也不需要 Core reservation。

### Resulting Impacts

- `defineConfig`、runtime validation 和 declarative fingerprint 会把显式/默认空 resource capacity 规范为同一 identity；不同 capacities 或 effective claims 必须改变 fingerprint。
- Check tree materialization/resolution 需要安全 snapshot mappings 并冻结 effective values；public declaration 和 package generated API 材料必须同步。
- Task graph exact-key tests 与 test support fixtures 需要加入 root capacities 和 per-task claims。无资源 graph 统一投影空数组，避免 optional public DTO 分支。
- Core compiler 和 selection index 新增 resource slots 与 occupancy counters；seed 必须从 running statuses 推导 in-use，保证 standalone、real shell 与 legacy snapshot adapters 同型。
- selection rejection、catalog、inspection、scheduler blocker summary、diagnostic rendering 和 queue classification tests 需要更新，而不改变既有 mutex/root/scope 原因的顺序。
- Case 账本沿用现有 Definition 与 Scheduler cases；只有 owner requirement/observable result 独立时新增 Case，不按新增测试数量机械拆 Case。
- package 文档明确 capacity 是 caller policy 而非资源探测；错误 claims 可能导致闲置或保护不足，调用方负责根据自身资源预算配置。

## Risks / Trade-offs

- 多资源和不同 weight 扩大 admission 状态空间；dense compiled slots 和原子整数加减把复杂度限制在线性 claims 检查，不引入搜索或装箱优化。
- 无 reservation 时持续到达的小任务在动态队列中可能使大 claim 饥饿，但当前 graph 静态且有限，pending 严格缩小，所以最终仍有进展；未来若引入动态 Task 才重新评审 fairness state。
- exact replacement inheritance 要求 child 添加一个资源时重述 inherited claims；这是刻意的显式性成本，换取 closed snapshot、简单移除语义和避免隐式累加。
- capacities/claims 进入 public snapshot 是 contract 扩张；若隐藏它们，custom policy 无法在不复制私有知识的情况下解释或模拟选择，违背 shared AdmissionState 目标。
- `mutex` 和 capacity 并存增加两个相邻概念；保持 binary exclusion 与 weighted pool 的稳定差异，比把所有 mutex 作者迁移到单位 mapping 更易读且兼容。

## Open Questions

无。若未来要让 Project Gate 采用具体 resource claim，必须另行提供同 workload 的 peak-resource 与 elapsed 证据；该 Gate 配置不属于本 Change。
