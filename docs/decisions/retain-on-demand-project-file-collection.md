---
title: 保持按需项目文件收集
id: 260915-retain-on-demand-project-file-collection
status: active
alignment: aligned
createdAt: 2026-09-15T02:35:18Z
purpose: 以单次收集与 Check 内批处理维持简单输入边界
background: 跨 Check 批处理有方向性收益，但现有证据不支持其公共契约与 Run 生命周期成本
decision: 保持按需收集，并仅在真实瓶颈或共享路径快照需求得到证明后重新立项
tags:
  - performance
  - product-contract
  - product-priority
relations:
  - type: 替代
    target: 260910-batch-declared-project-file-inputs-at-invocation-boundary
    summary: 恢复按需收集并为共享机制设置证据门槛
---

## 目的

- 以简单、稳定的公开用法满足项目文件收集，不为未经证明的优化扩大 Check authoring 和 Run 生命周期。
- 让未来共享机制由真实消费者和可复现 measurement 驱动，并从满足需求的最小方案开始。

## 背景

- 当前公开 `collectProjectFiles(...)` 提供同步单次收集，文件型随包 Check 也已在各自边界内按 source 批量处理多个 selections；调用级方案只能消除剩余的跨 Check acquisition。
- 设计期 filesystem observation 的中位 collection 时间约从 261.9ms 降到 248.0ms，但没有可重放 baseline、性能 budget 或真实多 Check Git 瓶颈，因此不足以支持扩大产品表面。
- 调用级方案还需要 public declaration、Definition identity、Check-local input view、pre-admission barrier、失败与取消结算、Core owner 和 constructor coherence。barrier 会增加首个 Check 延迟与无效预收集，并且只能固定路径 membership，不能提供内容原子快照。

## 决策

- 采用: 继续以同步单次 `collectProjectFiles(...)` 和各 owning Check 内的批量收集作为默认产品边界。
- 采用: `changes/batch-declared-project-file-inputs` 保持 Draft，不进入 Plan；本次不增加声明式 `projectFiles`、调用级输入 barrier 或公开 cache/refresh 契约。
- 采用: 不改变公共契约和 Run 可观察时序的私有优化可以独立评估，但必须由目标 workload 证明瓶颈，并验证结果等价、首个 Check 延迟和总 wall time。
- 采用: 只有可复现的真实 workload 证明 acquisition 是显著成本，或出现需要同一 invocation path-membership cut 的独立消费者时，才建立新的 Change，重新比较按需 memoization、source 共享和声明式 barrier。
- 采用: 本决策以按需收集和证据门槛替代此前的调用级声明式批处理方向；前序记录仅用于恢复该取舍的演进。
