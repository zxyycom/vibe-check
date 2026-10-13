# Tasks

逐项结构审计及行为证明，独立验收后仍不自行结项。

## Readiness

- [x] 0.1 核对 A–D 残留、公开/内部 owner、Decision 和 baseline Case 检查。
- [x] 0.2 确认 shared readiness membership 不缓存 capacity，scope/resource 变化实时判断。

## Implementation

- [x] 1.1 A summary 直接聚合 Core facts，保留独立 priority，去掉 DTO 回读重判。
- [x] 1.2 B 删除 scope/mutex 无用 Shell 镜像及维护，保留真实 Task/Promise/value/error。
- [x] 1.3 C compile 之后按 pre-admission 原顺序验证/映射并一次 seed。
- [x] 1.4 D Core 增量 partitions/readiness 由 candidates、public projection、ID 与 measurement 共读。
- [x] 1.5 同步 owner 文档、Case 和本计划的实际边界。

## Verification

- [x] 2.1 验证 ordered memberships、不可变旧状态/fork、mutex/relation release、capacity/scope/resource 未永久 prune。
- [x] 2.2 验证 blocker summary 不被 primary root/scope reason 遮盖，measurement 与 selection 同源分类。
- [x] 2.3 验证 pre-admission error 顺序及 forced effects，运行 Scheduler 目标 tests/typecheck/lint。
- [x] 2.4 运行材料、Case、格式与 Change 检查并逐项 source 结构审计。
- [x] 2.5 主代理独立文档/代码审查、成本证据和完整 Gate 验收。
- [x] 2.6 本轮代码/文档优化后，复核 owner 与 Case 语义、材料和知识索引检查；以最终 diff 完成独立反查及完整 Gate。
