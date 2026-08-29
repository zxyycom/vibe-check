---
title: 在 Project Gate 内直接观察仓库质量 Checks
status: active
alignment: aligned
createdAt: 2026-08-29T15:39:14Z
purpose: 让 Gate 直接运行并显示仓库质量事实，同时保持这些诊断性 findings 非阻断且不恢复嵌套 Run。
background: 本 Decision 形成时，原始 policy 会产生 blocking Check statuses；用户要求去除无感知包装而不把既有非阻断质量报告升级为硬门禁。
decision: 四项原始质量 Checks 在同一 Gate Run 中直接运行并保留真实事实，但不进入 assurance aggregate。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: run-repository-quality-checks-inside-project-gate.md
---

## 目的

- 让 required/full Project Gate 直接调度和显示当前仓库的 duplicate detection、file metrics、function metrics 与 Markdown local-link validation 终态。
- 保留 producing Check 自己形成的真实 status、final data、Records 和 messages，不再由外层 process completion 遮蔽。
- 保持这些仓库质量观察非阻断，避免把删除包装层误作一次未经确认的 merge policy 升级。

## 背景

- 已删除的 `repository-quality` process 启动独立 Project Run；外层 Gate 只能看到 child completed，不能直接显示内层 Check identity 或事实。
- 本记录修订已归档的 `run-repository-quality-checks-inside-project-gate.md`；该前序“纳入 aggregate”的历史方向不是当前 policy，当前方向只保留 raw facts 并排除 assurance aggregate。
- 本 Decision 形成时，Gate 的同领域 test lanes 只证明 package Check 实现，不扫描当前仓库。按旧 repository policy 直接探测时，file metrics 与 Markdown links 会形成 failed 终态，function metrics 会形成大量 non-blocking findings。
- 用户确认需要恢复原始质量工具并删除包装，同时此前已明确该质量报告是非阻断的。是否把某类 finding 升级为硬 Gate policy 是独立决定，不能由接线方式暗中产生。
- SCC 与 Lizard 由仓库 mise 配置锁定。正式 Gate 不能退回 ambient PATH，也不能把工具绑定提升为 Product-wide scanner registry。
- 本记录当前为 `aligned`：完整方向已成为当前稳定基线并完成核对；后续局部接线、测试或文档修改不单独改变这一对齐状态。

## 决策

- 采用: required 与 full Gate 都在现有 bound Project Run 中直接加入 `duplicate-detection`、`file-metrics`、`function-metrics` 和 `markdown-link-validation` 四个 ordinary Checks；四项使用原 repository 文件选择、区域与 finding policy。
- 采用: 四项 entry 明确标记为 Gate observation，不进入 assurance aggregate selected IDs；它们仍被同一 scheduler 执行，并通过 progress、RunResult、Records、messages 与 diagnostic evidence 保留真实 terminal facts。
- 采用: 正式 Gate 命令进入仓库锁定的 mise environment，并把 SCC/Lizard 的绝对锁定 executable 显式交给对应 Check；缺少绑定时 owning observation fail closed 为 unavailable，不使用 ambient PATH。
- 采用: `quality` 只作为这四项 direct observations 的有界 disable filter，不代表父 Check、独立 workflow 或第二套结果。
- 不采用: 改写 producing Check outcome 以伪装通过、按 Records 重新归约结果、`repository-quality` 父 Check、嵌套 Project Run、独立 scheduler/output tree、`bun run quality` 短命令，或未经独立政策决定把这些 observation 纳入 assurance aggregate。
