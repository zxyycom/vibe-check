---
title: "修正预准入未满足依赖的队列统计"
id: "261016-correct-scheduler-seed-viability"
formedAt: "2026-10-16T09:57:53Z"
question: "为何从未 admission-viable 的 pending Task 会抬高 seed peak 并累计 admissible delay？"
tags:
  - "correctness"
  - "measurement"
  - "scheduler"
relations: []
---

## 形成时背景

本轮 Scheduler 增量状态重构在冻结源码 d4dc896c01a373cf9c3e9709d744a86202373f18 的 before 阶段发现：
queue 分类使用 relation-ready，却没有排除已结算但不满足的 prerequisite。最初仅是源码疑点；未据此改写基线，
完整 before 结束后才运行固定 clock 的真实 shell 反例，确认静默统计错误。

## 调查目的

判断 pre-admission prerequisite-unsatisfied seed 是否使从未 admission-viable 的 pending Task 进入 peak 与 delay，
并在不改 action/rejection/effect、clock 边界或已承诺的统计定义下修复。本轮不是一般性能采用调查。

## 调查范围与依据

- 当前定义来自 [Human output](../development/human-output.md) 与 [Scheduler measurement owner](../development/scheduler.md#measurement-collector-与-immutable-context)：dependency 必须 completed，observation 只须 settled。
- 实际输入只有 source→doomed，source 预准入结果 false；没有 Task 执行，clock 从100逐次加1，
  terminal 请求 execution、runMeasurement、taskTimings。旧/新都依次得到 source prerequisite-unsatisfied、doomed blocked。
- 旧 shell 在首次 reconciliation 前对 seed 采样；旧 queue helper 只判断关系已 settled。实际结果 peak viable/admissible 均1，
  doomed admissionDelay.admissiblePendingMs=1；这不是浮点舍入，也不是 Task 真曾可准入。
- 修后相同 runner/输入得 peak 均0，taskTimings.admissions=[]，effects/settlements 与 clock span 不变。
  当前运行来自实施中源码树，修前/修后内容 digest 与原始观测保存在附件；没有声称 installed artifact 验收。
- 最窄回归是 measurement/queue.test.ts 的 seed-unsatisfied 测试；独立 raw-graph oracle 分类不复用被测 Core reducer。
  本阶段执行完整 Scheduler 71/71、Product typecheck/lint、全树 TestEvidence 749实体映射均通过。

## 调查结果与边界

**确认根因：relation-ready（关系已结算）与 admission-viable（dependency 已 completed）不是同一成员条件。**
首次 reconciliation 很快 blocked doomed，不能撤销此前错误 peak，也不能使此前累计的 delay 合法。
修复在 Core 提供同源 viability predicate；collector 在 seed 与真实 relation-ready 增删时筛选，并对旧 Core 查询净 removal，
不复制 legality、不增加另一份 viable membership backing。正常 live classification 仍按 mutex→capacity→admissible 分组。

本轮具体反例和回归闭合这一 seed 缺口，不证明所有外部 timing 来源或未执行的 artifact 环境。
两 Bug 的直接根因不同，因此与取消 stale forced 问题分篇，关系为空；前序增量状态普查只提供背景，不回答本轮反例。
后续若更改 dependency satisfaction 定义、seed/首次 capture 顺序或批 delta，应重新核对该边界。

附件代码保留当时原样供阅读：若要重跑，将其复制到仓库 tmp/restructure-scheduler-incremental-state/viability-reproducer.ts，
保持其 ../../src 相对路径，再运行 observations 中命令；旧结果需检出所记录基线。资源不是受维护的永久工具入口。

## 随附资源

- [修前修后现场与源码身份](./_resources/261016-correct-scheduler-seed-viability/observations.json)
- [最小真实 shell 反例](./_resources/261016-correct-scheduler-seed-viability/reproducer.ts)
