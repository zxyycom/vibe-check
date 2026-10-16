---
title: "修正取消链 stale forced entry 的重复结算"
id: "261016-correct-scheduler-cancel-forced-settlement"
formedAt: "2026-10-16T09:57:59Z"
question: "为何取消 pending 依赖链后 drain running Task 会再次 blocked 已取消 Task 并抛错？"
tags:
  - "cancellation"
  - "correctness"
  - "scheduler"
relations: []
---

## 形成时背景

本轮冻结 Scheduler before 源码 d4dc896c01a373cf9c3e9709d744a86202373f18 时，发现 pending cancellation
可能给稍后也被取消的 dependent 留下 forced entry。最初未据源码推断直接修复；完整 before 后分别运行 Core trace 与
真实 shell 反例，确认同一 Task 被第二次结算，并使本应 drain 完成的取消 Run 抛出异常。

## 调查目的

确认 cancellation→running drain→forced reconciliation 的重复 settlement 条件，在保留 pending 声明序取消、
forced descending-slot 顺序与 effect 观察边界的前提下闭合 stale entry。它与队列 viability 统计错误无共同直接根因。

## 调查范围与依据

- [Scheduler owner](../development/scheduler.md#admission-state-与-real-shell) 规定同一 reducer 维护 Task lifecycle、取消 pending 与 drain started work；
  取消不应使已 settled Task 再次 blocked。公开 binary inspection 不展示 cancelled/blocked，不足以单独发现重复结算，须核对私有 effect stream 与真实 shell。
- Core 最小图 running→first→second：select running、cancel-pending、settle running satisfied。旧取消产生 first/second 各一次 cancelled-before-start，
  但 settle running 后又给 second 发 blocked。旧最终 public inspection 仅显示 running satisfied，掩盖了多余 effect。
- 原因是取消 first 令 second pendingDependencies 归零且 nonCompleted>0，入 forced heap；随后取消 second 未剔除该 entry。
  以后的 reconcile 直接信任 heap root，再次结算。不是 executor 错误，也不是 AbortSignal 重入。
- 真实 shell 反例加独立 fast Task，root cap2；fast 执行中 abort，fast 先从 Promise.race 返回，因此取消 pending 时 running 仍在 drain。
  旧 shell 随后抛出 task second is not pending for blocked settlement。只用一个 running Task 的初始设想不足以触发此 shell 顺序，故采用实际双 running 反例。
- 修后同输入：Core 最后仅 running completed；shell 正常返回 cancelled:true，fast/running completed，first/second cancelled-before-start 各一次。
  source digests、Bun1.3.14 与修前/修后原始观测保存在附件，证据属于 source-level 而非 installed artifact。
- 最窄回归在 admission-core/incremental-trace.test.ts 同时核对取消净 delta、live forced queue 与真实双 running shell；
  独立 full-scan trace oracle 只从 pending 原始状态发现 forced Task，不复用生产 heap/reducer。
  本阶段完整 Scheduler71/71、Product typecheck/lint、全树749实体 Case check 均通过。

## 调查结果与边界

**确认根因：forced queue 是带 tombstone 的派生 frontier，但取消发布 successor 时没有保证其 root 仍 live。**
修复在 source transition 发布 successor 时剪掉 status 非 pending 的 forced roots，使用同一不可变 queue merge；
非 head tombstone 保留，成为 root 后再被剪掉，每个分支仍保有自己的不可变 backing。查询继续只读当前 root，
不在每次 query 倒扫 graph。新的合法 forced entries 仍按原 descending task-slot 优先级派 effects。
取消观测一次的最终 Core 另合成 net transaction delta，防止 collector 误读最后一个取消的单项 delta；
此 collector 接线不是 stale forced Bug 的直接成因，但属于本轮取消验收边界。

已验证的是固定取消链、双 running shell 与 trace/原有 forced-cascade 回归，不推断所有宿主 cancellation 排程。
若改 forced admission 条件、pending settlement 顺序或批 transition 的发布边界，须重测此例。
与 seed viability Bug 分篇、关系为空；旧增量状态普查为背景，不曾回答本次重复结算问题。

附件代码原样供阅读；重跑时复制到 tmp/restructure-scheduler-incremental-state/cancellation-reproducer.ts 保持 ../../src 相对导入，
再执行 observations 中命令。修前观测需所记录基线。资源不新增永久工具或第二套 reducer。

## 随附资源

- [修前修后现场与源码身份](./_resources/261016-correct-scheduler-cancel-forced-settlement/observations.json)
- [Core 与真实 shell 最小反例](./_resources/261016-correct-scheduler-cancel-forced-settlement/reproducer.ts)
