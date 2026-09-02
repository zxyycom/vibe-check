---
title: 扩展 invocation-local Scheduler 压力与尾段诊断
status: active
alignment: aligned
createdAt: 2026-09-02T00:07:04Z
purpose: 让 Scheduler 人读汇总解释可准入队列压力与完成尾段，并以现有声明指纹支持同配置比较。
background: 现有汇总能显示总体延迟与尾段，却不能区分硬阻塞、可准入等待或识别尾段参与 Task。
decision: 在既有私有汇总内增加互斥压力积分、延迟分解、有界尾段参与项及 invocation 声明指纹。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: add-invocation-local-scheduler-performance-summary.md
---

## 目的

- 让维护者从同一次 invocation 的 terminal Scheduler summary 区分 mutex 硬阻塞、capacity 硬阻塞与当前可准入但仍 pending 的队列压力，而不从 decision 次数推断等待时长。
- 让 top admission delay 显示同一组事实分类，并让 completion tail 显示最后一次准入后仍在运行的有界 Task 集合。
- 让待比较运行复用 invocation 已拥有的 declarative fingerprint 识别声明配置，同时保持该标识不承诺代码、candidate、工具、runtime、host、outcome 或 callback 等价。

## 背景

- `add-invocation-local-scheduler-performance-summary.md` 已建立 enabled-only、invocation-local、human-only summary 以及安全 clock、slot·ms、accepted wait、top admission delay 和 completion tail 的当前基线；本记录只修订其诊断分辨率，不改变输出层级或失败隔离。
- 现有 `acceptedWaitCount` 大体随 capacity drain 周期增长，decision 次数和单个 `admissionDelayMs` 不能说明等待期间 Task 是 mutex blocked、capacity blocked，还是已满足硬条件但 policy 尚未选择。
- Scheduler 的 broader graph-ready 概念只要求全部 directed relations settled；依赖以非 completed 终态结算的 Task 会随后 blocked-settle，不能冒充仍可能 admission 的队列压力。constructor 与每次真实 mutation 后的 state capture 在 Task 首次进入 admission-viable logical state boundary 时安装其 delay accumulator；该安装不采样 clock。实际 admitted Task 的这个逻辑起点在语义上对应其 graph-ready-to-admission 区间，并可由三类事实完整分解。
- invocation 已在任何 Scheduler execution 前形成 canonical `declarativeFingerprint`；其 scheduler policy identity 只包含 normalized `static | custom` kind，不包含 callback source、closure 或版本。重新计算 Scheduler graph hash、引入 `policyVersion` 或使用 callback identity 都会形成冲突的比较身份。

## 决策

- 采用: queue pressure 只观察仍 pending 且 admission-viable 的 Task：所有 `dependsOn` 已 completed、所有 `observes` 已 settled。failed-dependency 后等待 blocked settlement 的 broader graph-ready Task 不进入该集合。
- 采用: 每个 admission-viable pending Task 在一个 sampled interval 中恰好属于一类，按硬事实顺序判定：存在 running mutex collision 时为 `mutex-blocked`；否则 canonical `canAdmit` 为 false 时为 `capacity-blocked`；否则为 `admissible-pending`。summary 顶层以 `admissionViablePendingTaskMs` 记录总 task·ms，以 `mutexBlockedTaskMs`、`capacityBlockedTaskMs`、`admissiblePendingTaskMs` 记录互斥分量；`peakAdmissionViablePendingTaskCount`、`peakMutexBlockedTaskCount`、`peakCapacityBlockedTaskCount` 与 `peakAdmissiblePendingTaskCount` 分别保留 total/分类峰值。三个分类 peak 发生时刻可以不同，不能把它们相加为同一时刻的 total peak。
- 采用: Scheduler shell 在 accumulator constructor 及每次真实 state mutation 完成后的 `captureState`，从唯一 execution state 原子安装 post-state 只读分类投影与新 Task delay accumulator；下一次既有 admission、pending removal、running settlement、accepted wait 或 terminal boundary 同源累计 global/per-Task interval，分类投影本身不产生 clock sample。accumulator 不重新实现 relation、mutex、capacity 或 policy，也不建立第二套 pending/running/settlement 状态机。custom policy 在存在 admissible Task 时选择 `wait` 只累计 `admissible-pending` interval（投影为 `admissiblePendingTaskMs`），不记录或推断 starvation、fairness、reservation 或 policy reason。
- 采用: 现有 top-three admission delay 排序与上限保持不变；每个 actually admitted Task 在原 item 中平铺 `mutexBlockedMs`、`capacityBlockedMs`、`admissiblePendingMs` 事实分解，并在有效 timing 的 sampled-boundary 模型内保证三者之和等于 `admissionDelayMs`。blocked/cancelled-before-admission Task 仍不伪造 admission chronology。
- 采用: completion tail 仍从最后一次 admission 到 terminal；`discrete.completionTailActiveTaskCount` 保留最后一次 admission 后实际 active 的完整 Task 数，`topCompletionTailContributors` 至多列出其中三个随后 settled 的 contributor，按 `settledAfterLastAdmissionMs` 降序、Task ID 升序。该列表解释 tail 参与项，不声称 critical path、CPU bottleneck 或因果归属。
- 采用: enabled-only private handoff 将 invocation 已有的 exact `declarativeFingerprint` 原样带入 `scheduler.summary`；不重算、不版本化、不读取 callback identity。相同值只证明 canonical declarative Definition identity 相同，覆盖声明的 Check membership/options/relations、outputs 与 Scheduler declarative fields；trusted function bodies 不进入该 snapshot。它不能单独证明实际 execution selection、terminal outcomes、RunControls、代码/candidate/tool/runtime/host 或 custom callback 算法相同。
- 采用: peak counts、`discrete.completionTailActiveTaskCount` 与 declarative fingerprint 是不依赖 timing 的离散事实；clock/integral unavailable 时继续保留。queue task·ms、admission delay breakdown、`topCompletionTailContributors` 与其它 time projection 一同 unavailable，不以零值或空 timing 假装成功。
- 保留: summary 继续是一次 invocation 的有界人读 diagnostic，既有 writer containment、single terminal attempt、disabled-path no accumulator/no sample 以及 future fail-fast/named-resource capacity re-review trigger 均不改变。
- 不采用: public `RunResult` 或 package API 字段、machine/progress/warning/autotune、parser/schema/version、跨 invocation store、通用 telemetry、OS/CPU/RSS/thread/event-loop 指标、`policyVersion`、callback identity、policy wait reason，或由这些观察自动改变 capacity、priority 与 admission。
