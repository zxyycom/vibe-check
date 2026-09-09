# Proposal

本 Draft 定义并验证一个基于公共终态 Scheduler 一阶事实的二阶性能参考投影；只有区分价值成立时，该投影才成为随包公共契约。

## Why

当前公共 `scheduler.measurementHooks` 接收冻结的 `{ graph, execution, rawMeasurement }`，而 diagnostic-enabled internal summary 会计算 span、slot utilization、admission delay totals 与 completion tail。调用方若要判断一次 schedule 是否接近依赖、并行、mutex 和 named-resource 约束共同允许的模型下界，目前只能自行重复计算，也无法复用内置 diagnostic 的公式 owner。

仅增加一个“理论最低开销”数字会产生虚假精度：Scheduler control overhead 没有有意义的非零理论下界，任务时长也可能随 contention 和环境变化。需要先证明一个明确命名、假设闭合、只读 public context 的 schedule reference 能在代表性场景中回答现有指标未回答的问题，再决定随包公开。

## Outcome

调用方和内置 diagnostic 能通过同一个只消费 `SchedulerMeasurementContext` 的确定性纯投影，取得包含适用范围、组成项和不可比较原因的 Scheduler schedule reference。该 reference 表示固定本次 observed task duration 的约束模型下界；调用方显式选择时才计算或输出，且虚拟场景与重复真实 workload 的价值证据决定它是否加入 package root。
