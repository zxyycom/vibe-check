---
title: 以版本化策略统一 Gate 性能阻断
id: 261022-version-gate-performance-policy
status: active
alignment: aligned
createdAt: 2026-10-22T09:59:32Z
purpose: 让各机器执行同一性能标准并保全失败现场
background: 预算虽已阻断但由 ignored 本机文件决定，不能统一约束
decision: 三档预算由版本化策略拥有，保留严格失败口径和同次安全证据
tags:
  - configuration
  - performance
  - workflow-policy
relations:
  - type: 修订
    target: 261022-enforce-gate-performance-budgets
    summary: 以统一版本化策略替代本机预算并扩展三档
---

## 目的

- 让各机器执行相同、可审查的 Gate 性能门限，超标在现场阻断并保全同次事实。

## 背景

- 前序已把总耗时、Check execution 均值和 P95 改为硬失败；但 ignored 本机 JSON 仍可改变阈值，不适合统一强制标准。
- Gate 分为 fast、changed 和 all 后，需要独立标识各自工作量；快检通过不能掩盖完整验收超标。

## 决策

- 采用: 预算唯一来源改为版本控制内的 Gate 私有策略；fast/changed 总时长均为 30000 ms、all 90000 ms，三档均值 2000 ms、P95 5000 ms。保留原日常/完整门限，不按 runtime、本机缓存、环境、CLI 或实测成绩覆盖和上调。
- 采用: 标准调用在 candidate preparation 前验证完整策略，字段缺失或非法即失败；help 无副作用，focused 仅作定向检查，不评估正式预算。运行平台、架构与 Bun version 仍是诊断事实，不参与选择预算。
- 采用: 延续三项独立硬失败：严格超标即 error / Gate failed / exit 1，等于预算通过；不自动重试取绿。总反馈时间包含同次 preparation/setup/Run，均值与 nearest-rank P95 只消费真实非 null execution durations，零计入、空集合为 n/a 且只评估总时间；重复、非法或溢出事实 fail closed，不生成伪统计。
- 采用: 延续同次安全现场，包括原始 timing/预算、runtime、候选包身份与准备动作、声明指纹、完整 duration facts 和日志入口；不复制源正文、环境或自由异常，不增加诊断子进程、重跑、全仓哈希或历史学习系统。
- 采用: 性能属于 Gate result contribution，只能将初步 passed 降为 failed，不改写 Product facts、aggregate、Check outcome 或 machine publication；原有失败不提升。接受环境波动可能阻断的取舍，不通过拆分/合并/跳过 Check 或转移 preparation 成本改善同一档指标，不以 fast 达标宣称 all 已达标。
- 采用: 本次不是超时立即强杀机制；现有 Check timeout 与进程回收仍由原 owner 承担。精确当前接线与预算由 [Gate owner](../tooling/project-gate.md#性能预算与-check-耗时分布) 拥有。
