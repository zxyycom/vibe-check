---
title: 以静态 named resource capacity 约束 Check 准入
id: 260906-enforce-static-named-resource-capacities
status: active
alignment: aligned
createdAt: 2026-09-06T09:12:40Z
purpose: 让一次 Run 在 root 并行预算之外安全共享可计数资源，同时保持 Scheduler 对合法性和生命周期的唯一责任。
background: mutex 只能表达单 holder，root 与 scoped 并行预算不能区分浏览器、设备或内存等独立资源，也无法表达不同 Check 的加权消耗。
decision: 采用 Definition-owned 静态资源总量与可继承的 Check claims，并由共享 admission core 原子取得、持有和释放全部 units。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的
- 让调用方在不引入外部 semaphore、动态 reservation 或第二套执行模型的前提下，对一次 Run 内多个可计数共享资源施加可验证的并发上限。

## 背景
- `scheduler.maxParallel` 与 container `maxParallel` 只限制总体 Task slots，不能表达彼此独立的资源池；`mutex` 固定为同名资源的单 holder 语义，不能表达 capacity 大于一或加权消耗。
- named resource 限制必须和 relation、mutex、root/scoped capacity、custom proposal 复检及 hypothetical AdmissionGraph 使用同一合法性事实，否则 real Run 与公开推演会发生分叉。
- 多资源 Task 若逐项取得会产生部分占用、回滚和潜在死锁；静态 Definition 可以在 author work 前闭合未知资源和永远无法满足的 oversized claim。

## 决策
- 采用: `scheduler.resourceCapacities` 声明 resource ID 到正 safe-integer units 的 Definition-owned 静态总量；Check 的 `resourceClaims` 声明从 admission 到 settlement 持有的正 safe-integer units。claim 必须引用已声明资源且不得大于总量，无效 Definition 在任何 Check work 前失败。
- 采用: `resourceClaims` 继承最近的显式完整 mapping；省略保留，`{}` 清空，其它显式 mapping 完整替换而不逐 key 合并。capacities 与 effective claims 进入 canonical declarative identity。
- 采用: 一个 Task 的全部 claims 由共享 admission core 原子检查并取得，贯穿 task-local preflight 与 execution，在所有 settlement 路径一起释放；mutex 继续作为独立的 capacity-one primitive，不与 named resource 合并。
- 采用: real Scheduler、custom callback 与 standalone AdmissionGraph 共用同一 compiled resource indexes 和 persistent occupancy transition。公开 graph 使用 canonical `{ resourceId, units }[]`，inspection 只读公开 capacity/in-use/available，shortage rejection 给出不足资源事实，不提供 reservation 或资源 handle。
- 采用: 默认 static selection 在普通 ready candidates 中先选择当前 `canAdmit` 的项，使不声明冲突 claims 的 work 能填充空闲 root slots。named shortage 进入既有 capacity-blocked measurement 类，但保留独立 blocker 计数与 rejection facts。
