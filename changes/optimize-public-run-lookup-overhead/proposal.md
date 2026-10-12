# Proposal

以局部索引和 invocation 内复用降低公共 Run 的重复查找成本；本文保存本轮实施与验收范围。

## Why

[复杂度调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)在真实公共 Run 的稀疏链和独立 Check 图上，分别测得 R01 blocker settlement 查找与 R02 scope 查找的三次增长；R03 重复处理不可变图，C02 重复查找 session slots 与构造已知 ID Set。它们不要求引入新策略或改变公开契约，适合先建立端到端 baseline 后局部优化。

## Outcome

同样的公共 `defineConfig` / `run` workload 在 Check 数增长时减少上述可避免工作，端到端收益超过样本噪声；顺序、admission legality、Check facts、diagnostic facts 和失败语义不变。

## Scope

### Intended Change

- C02：session 注册后构建 private slot Map 与 known-ID Set，复用到 lifecycle 查找与 normalization。
- R01：每个 blocker summary 从当前 inspection 构建局部 settled-kind、mutex 与 resource 索引。
- R02：复用 admission core 已编译的 task/scope 索引，使用 decision-local active scope membership 与保持同序的最优候选 fold。
- R03：在单 Scheduler state 内延迟计算一次同字节 graph fingerprint，所有观察继续保留。
- 冻结 before/after 公共 workload、原始样本、源码身份和有界操作计数。

### Resulting Impacts

- 私有索引须跟随唯一原事实生命周期，不能变成新 public capability、跨 Run cache 或第二套 legality。
- 既有相邻测试需加强索引生命周期、opaque IDs、blocker precedence、tie/order、detached snapshots 与 fingerprint 同字节证据；按现有 Case 归属闭合。
- 内部 owner 文档同步实现不变量；公开行为不变时不新增指南承诺或数值 SLA。
- 独立审查实际 diff 与文档影响，完整 Gate 验证集成；形成时性能依据由独立 Investigation 保存。

## Success Criteria

1. 源码修改前已有冻结 public API baseline，after 使用相同 harness、配置与 locked runtime；小规模与大规模分别报告，不由总平均掩盖回退。
2. 计数证明目标重复扫描/序列化被移除；timing 支持所选场景的收益，不能外推为整体算法线性或真实用户预算。
3. 受影响行为测试、typecheck、lint、依赖/入口检查、Case 完整性和完整 Gate 通过；独立审查无实质阻断。
4. 稳定事实与形成时证据各归 owner，无未授权 Git stage/commit/push 或 Change finalize/delete。

## Affected Owners

[Check results](../../docs/development/check-results.md)、[Scheduler](../../docs/development/scheduler.md)、[Project Run](../../docs/development/project-run.md)、[Human output](../../docs/development/human-output.md)、[测试策略](../../docs/testing/strategy.md)与 [Project Gate](../../docs/tooling/project-gate.md)。
