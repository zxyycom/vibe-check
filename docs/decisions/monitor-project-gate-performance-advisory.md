---
title: 用 Gate-owned Hook 提示标准运行的性能偏移
status: active
alignment: aligned
createdAt: 2026-08-29T15:36:05Z
purpose: 让标准 Project Gate invocation 显示可比较的 elapsed observation，并在明显偏离实测基线时提示审阅。
background: 本 Decision 形成时，Gate 已有 afterGate context，但没有经测量 baseline 或默认项目规则。
decision: 以 afterGate 对匹配基线的标准 workload 做 advisory 比较，超界只警告且不改变 Gate status；硬门禁留待受控环境和明确预算。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让每次 Project Gate 在最终结果前报告从 invocation 启动到初步结论的 wall elapsed，并能识别标准 workload 的明显性能退化。
- 让 baseline、适用 workload、样本与容差可审阅，避免把单次直觉或 process timeout 冒充性能预算。
- 保持调用方只消费一个最终 Gate result，同时不让普通开发机差异造成抖动性硬失败。

## 背景

- Project Gate 的唯一私有 `afterGate` 已取得 normalized selection、prepared candidate、原始 RunResult、invocation logs 和 `elapsedToInitialResultMs`；不需要扩展 Product public lifecycle API。
- 现有 process timeout 用于中止卡死 child，不是吞吐或 wall-time budget；并行 Check duration 也不能机械求和得到 Gate wall time。
- 当前调度方向明确反对未经同机测量的跨主机硬 timing 门禁。质量 Checks 直接加入 Gate 后，旧 timing observation 也不能作为新 workload baseline。
- 本记录当前为 `aligned`：完整方向已成为当前稳定基线并完成核对；后续局部接线、测试或文档修改不单独改变这一对齐状态。

## 决策

- 采用: 默认 `afterGate` 使用 Gate-owned performance observer；它只读取 context 和初步 result，返回同类型最终 result，不解析 diagnostic log，也不修改 Check outcome、RunResult 或 aggregate。
- 采用: 每次输出 `elapsedToInitialResultMs` observation；只有 profile、tag selection、candidate preparation 与已记录 workload identity 完整匹配时才比较 baseline，否则明确标为不可比较。
- 采用: baseline 保存形成它的 workload、环境、原始重复样本、统计量与 advisory threshold；它是形成它的开发机 workload 的 comparison，不是 performance budget。membership、scheduler、runtime 或工具变化后必须重新测量，不能只提高阈值消除告警。
- 采用: 第一阶段超出 advisory threshold 只追加 warning，并保持初步 Gate status 与 process exit 不变；observer 对未知或不完整 timing facts 保守退出，不把自身诊断失败变成第二种 Gate 结论。
- 不采用: 解析人读日志、把 Check duration 相加为 wall time、复用 process timeout、为每个 Check 预设未经测量的预算，或在没有受控 benchmark host 与明确 merge policy时建立跨主机硬门禁。
