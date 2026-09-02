---
title: 以 policy action 后状态观察修订准入 measurement
status: active
alignment: aligned
createdAt: 2026-09-02T02:56:32Z
purpose: 让下一次 custom admission policy 读取上一 accepted action 之后完整且无因果主张的 Scheduler 一阶观察。
background: 归档前序 Decision 的单条 transition snapshot 归属 prior-state interval，无法表达 action 后状态。
decision: 采用 detached cumulative 与 captured-prefix reader，冻结 action observation 从 action post-state append。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: provide-decision-boundary-admission-measurement.md
---

## 目的
- 让 custom policy 的下一真实 callback 得到上一 accepted `select` 或 `wait` action 后的 Scheduler state observation，而不把 lifecycle mutation 的前态 interval误称为 action 结果。
- 保持 Scheduler 是 clock、interval、hard guard、mutation、effect 和 bounded measurement 的唯一 owner；policy 仍是同步无状态 select/wait callback。

## 背景
- 已归档前序 Decision 的单条 transition snapshot 将 prior-state interval 置于同一记录，连续 select 和 wait/settlement 时不能精确表达 action 后状态及期间产生的离散事实；它只解释本修订的来源，不是当前 API 或 owner。
- callback context 与 terminal raw measurement 都必须 detached/frozen；逐轮重建 graph identity 或完整 admissions table会使 policy path 随 decisions×tasks 分配增长。

## 决策
- 采用: `measurement.cumulative` 是 callback boundary 前已 flush 的 detached/frozen bounded scalar、peak和discrete facts；每次 Run 一次构造的 `SchedulerGraphSnapshot` 在 callbacks 间共享，动态 arrays仍按轮 detached/frozen。
- 采用: collector invocation-local append-only 保存逐条 frozen action observation。每个 context 捕获 `measurementCount` end-count，并以 `measurementAt(index)` 同步读取该 immutable prefix；越界为 `undefined`，旧 context 以后调用也不能观察 future append，因此不返回 live mutable array或每轮 slice。每条 observation 在 accepted `select`/`wait` 完成 hard guard/action 的 post-state 后开始，下一次**实际** custom callback 前 flush、append，交接 action 的 sequence/kind/task identity、post-action occupancy interval及期间 bounded admitted/settled effects。其 interval 是 closed union：available timing 才有数值 contribution，unavailable timing 只交接 closed reason；合法 zero span 仍是 available，clock/integral fault 不伪造成全零。它没有 actionDuration、causedBy、criticalPath或 CPU 归因。
- 采用: blocked、cancel、settlement等不创建 policy callback，只在存在 pending action 时作为 since-action effect；policy fault 不形成有效 action。terminal raw measurement仍由同一 collector一次 materialize。
- 采用: 所有 public snapshot 均 detached/frozen，旧 callback context不能观察 collector 后续 mutation。默认 summary Hook 自身包含其投影/writer失败；terminal delivery runner仅执行 generic hook delivery和其 wrapper failure policy，不识别 summary identity。
- 不采用: complete interval ledger、跨 invocation history、learned scheduling、自动调参、async policy、per-transition caller Hook或让 policy直接读取 mutable collector。
