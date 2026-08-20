# Proposal

本 Draft 保存 Project Run 日志、生命周期反馈与 Gate 诊断证据的未来设计边界；它不是一项已批准的日志实现计划，也不要求调整当前正式 Project Gate。

## Why

当前 Project Gate 已经能在 `.log/project-gate/<invocation-id>/` 中为每个实际启动的 Check 保留独立 transcript，并由 Product progress 在终端展示执行状态。这个组合足以定位现有 Gate 失败；本文不为已归档的 cutover 或后续 Gate 优化新增前置。

不过，“日志”一词同时指向不同层次的东西：通用进程捕获、Product 已知的 Check 生命周期、人读终端输出、Gate 的本地诊断证据，以及可能的 invocation receipt 或按时间排序事件。若未来需求直接以通用 logger、decorator、旧 verifier 的聚合文件或 stdout 解析来满足，容易把 owner、顺序保证、失败语义和持久化责任混在一起。本 Draft 为将来出现真实消费需求时提供唯一的判断边界。

## Outcome

后续设计或实现能够先区分 foundation primitives、Product lifecycle 与 Gate evidence 三个 owner，再按明确消费者决定是否新增持久 receipt 或 chronological event sink。默认继续保留当前 per-Check transcript 与 Product progress 行为；不因为这份 Draft 引入 `summary.json`、`events.ndjson`、聚合日志、`latest` 指针、retention/cleanup 或泛化 logger/decorator。
