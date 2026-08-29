---
title: 在 Project Gate 内直接运行仓库质量 Checks
status: archived
alignment: unaligned
createdAt: 2026-08-29T15:36:05Z
purpose: 让 Gate 直接结算仓库重复、文件指标、函数指标与 Markdown 链接质量，而不恢复嵌套 Run 或二次汇总器。
background: 删除无感知的 repository-quality process wrapper 后，Gate 只保留了质量 Check 的实现测试，没有扫描当前仓库的同类事实。
decision: 将四项原始 package Check 直接纳入 Gate Definition 和 aggregate，并由正式 Gate 入口显式绑定仓库锁定的 scanner 工具。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让 required/full Project Gate 直接报告当前仓库的 duplicate detection、file metrics、function metrics 与 Markdown local-link validation 终态。
- 让这些质量终态与其它 Gate Checks 一样进入同一次 Product Run、调度和 aggregate，而不是由外层 process completion 代替。
- 保持 scanner 工具可复现，并让 finding、Record 和阻断政策继续由各 producing Check 自己拥有。

## 背景

- 已删除的 `repository-quality` 是一个启动独立 Project Run 的 process Check；外层 Gate 不能感知内层 Check status 或 Records，只知道 child process 已完成。
- 删除该包装后，Gate 中的 duplicate/file/function/Markdown-link test lanes 只证明 package Check 实现，不能证明当前仓库通过这些质量检查。
- 原仓库 policy 已分别定义四项 Check 的文件范围、区域和 finding policy；其中 function metrics findings 为 non-blocking，其它阻断语义沿用 owning Check。
- SCC 与 Lizard 由仓库 mise 配置锁定。正式 Gate 不能退回 ambient PATH，也不能把工具绑定提升为 Product-wide scanner registry。

## 决策

- 采用: required 与 full Gate 都在现有 bound Project Run 中直接加入 `duplicate-detection`、`file-metrics`、`function-metrics` 和 `markdown-link-validation` 四个 ordinary Checks，并把四项 eligible Check ID 纳入同一个 explicit aggregate。
- 采用: 迁入原仓库文件选择、区域与 finding policy；function metrics 继续完整输出 non-blocking Records 并以 owning Check 的 passed 终态进入 aggregate，其它 Check 的 failed 或 unavailable 按现有 Gate aggregation 处理。
- 采用: 正式 Gate 命令进入仓库锁定的 mise environment，并把 SCC/Lizard 的绝对锁定 executable 显式交给对应 Check；缺少绑定时 fail closed，不使用 ambient PATH。
- 采用: Gate 的现有 progress、terminal Check message、RunResult facts 和 diagnostic evidence 承接直接结果；不恢复独立 quality machine publication 或第二套报告归约。
- 不采用: `repository-quality` 父 Check、嵌套 Project Run、独立 scheduler/output tree、`bun run quality` 短命令、非阻断 process wrapper，或按 Records 重新计算 Gate 结论。
