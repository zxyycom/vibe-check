---
title: 将累计观察与 action prefix 分为独立需求
id: 261016-separate-post-action-observation-demands
status: active
alignment: aligned
createdAt: 2026-10-16T07:28:23Z
purpose: 保持 post-action 观察含义与旧 prefix 隔离，同时避免强制维护无消费者历史
background: 聚合 measurement 把有界累计、action history 与终态逐 Task 维护成本绑定
decision: 以 cumulative、actionHistory、runMeasurement、taskTimings 独立启用同一 collector
tags:
  - admission-scheduling
  - configuration
  - measurement
  - performance
  - product-contract
  - scheduler
relations:
  - type: 修订
    target: 260902-observe-post-action-policy-measurement
    summary: 拆分公共观察字段，保留后状态区间与固定前缀
---

## 目的

- 保留上一 accepted select/wait 后的完整一阶观察，不把 prior-state interval 或因果归属混入 action history。
- 让 bounded cumulative、action prefix、Run 汇总与逐 Task timing 各自独立按需求生产，仍以唯一 collector 为 timing owner。

## 背景

- 前序用 detached cumulative 与 captured-prefix reader 修正了 transition 前态 interval 的归属；但公共 measurement 聚合累计与 action prefix，终态 rawMeasurement 又绑定逐 Task admissions。
- 默认空与精确字段必须避免仅仅读累计就维护 history 或逐 Task 表；这是生产边界和表示拆分，不是统计定义或累加算法重构。
- 逐轮重建 graph 或完整 admissions table 会增加 decisions×tasks 分配；immutable 共享事实与固定 prefix 仍需保持。

## 决策

### 逐次决策与 captured prefix

- 采用: decision 的 cumulative 是边界前 flush 后 detached/frozen 的 bounded counters、peaks 和 timing availability；actionHistory 是独立启用的 captured end-count reader。graph 每 Run 至多按需构造一次，动态投影仅在需求边界建立。
- 采用: collector invocation-local append-only 保存 frozen action observation。reader 在交付边界固定 end-count，只读 immutable prefix；越界返回 undefined，旧 reader 不见 future append，不交付 live array 或每轮 slice。
- 采用: accepted select/wait 完成 hard guard/action 的 post-state 后开启 observation，在下一次实际 custom callback 前 flush、append，保存 sequence/kind/task identity、post-action occupancy interval 及期间 bounded admitted/settled effects。blocked、cancel、settlement 不凭空创建 callback；仅在有 pending action 时成为 since-action effect，policy fault 不形成有效 action。

### 独立测量组与有效性

- 采用: terminal runMeasurement 保留旧 raw 除 admissions 外的 fingerprint、discrete、peaks 与 Run timing；taskTimings 独立保存现有 Task ID、分类 delay、admitted/settled timestamps 与顺序。仅 cumulative 不维护 action history、逐 Task delay/chronology；仅 taskTimings 不维护 history、Run tail 或无人消费的 aggregate DTO，共享中间量仅因真实生产依赖启用。
- 采用: 所有启用 timing 组共享同一 clock、采样边界和 first-fault validity。clock throw/non-finite/backward 或启用计算的 invalid interval/integral 使后续 timing 不可用；不计算关闭组只为寻找故障。合法 zero span 仍 available，不伪造全零；cumulative/runMeasurement 保留离散事实和 peaks，taskTimings 不交付伪造 timing 数值，history 保留离散 action/effects 并以 closed unavailable interval 继续。
- 采用: 每个 reader 在自身调用边界固定 availability、数值和 prefix；后续 fault 不回写旧 view。沿用原采样边界、逐项累加次序、单位与 interval 归属，新的数值保证和累加算法另行演进。

### Owner 与非目标

- 采用: Scheduler 独占 hard guards、mutation 与 effects；shell 提供真实执行事实，collector 独占 clock、interval、积分和 history，不造第二 admissions truth。terminal 由同一 collector 按启用需求物化；summary 自行包含投影/writer failure，runner 不识别其身份。
- 不采用: actionDuration、causedBy、criticalPath、CPU 归因、完整 interval ledger、跨 Run history、自动调参、async policy、per-transition caller hook 或 policy 直接读取 mutable collector。分组本身不引入 learned scheduling。
