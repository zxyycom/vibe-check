---
title: 按变更选择 Project Gate 日常 required 检查
id: 260923-select-project-gate-required-checks-by-change
status: archived
alignment: aligned
createdAt: 2026-09-23T10:39:53Z
purpose: 使默认 Gate 只执行与当前变更相关的检查并保留完整强制入口
background: 原 changeFlag 只覆盖少数材料和 Product runtime 检查，日常 required 仍执行大多数耗时检查
decision: 以单次可信 Git 变更证据映射保守输入 region 到 required Checks；focused 与 all 强制选择且 Git 不可用时保守运行
tags:
  - performance
  - repository-automation
  - workflow-policy
relations:
  - type: 修订
    target: 260922-adopt-repository-material-change-selection
    summary: 保留材料选择并扩展默认增量范围
---

## 目的

- 让日常 `bun run check` 的检查数量与实际变更相称，而不是只把少数材料 Check 和 Product runtime test 增量化。
- 保持 focused preset 与 `--all` 为可恢复的强制执行入口，避免增量结果被误当发布前完整验收。

## 背景

- 前序材料选择已使用 Product 的一次 Git change snapshot 和 `changeFlag`，但默认 required 仍无条件执行大多数 lint、typecheck、test 与质量扫描；用户的 35.5 秒运行中 32/38 个 Check 执行。
- 跨文件引用、生成材料和测试依赖需要保守 region，不能简单地只检查变更文件。Git evidence 缺失也不能解释为无变更。
- 材料链接的反向 target 依赖尚未有完整模型；原 `materials-links-validator` 必须继续总是 required。

## 决策

- 采用: Gate 在唯一 `project.changes` 比较 `origin/main` 的 snapshot 上声明稳定输入 region。默认 required 对 typecheck、lint、format、test lanes、质量扫描、Decision 和 Test Evidence 按对应 region 的 `changeFlag` 选择；Product 负责 committed、rename/delete、staged、unstaged、untracked 和 Git unavailable 的 flag 注入。每个 region 对依赖输入采取保守覆盖，不能因性能目标遗漏已知共享输入。
- 采用: 保留前序 `repository-material` 条件和 `src/**` / `scripts/**` 输入闭合，以及 `materials-links-validator` 的无条件 required；prepared candidate 与 Git diff whitespace 也总是 required。Markdown link validation 对任意路径变化运行完整 corpus，以覆盖任意链接 target 的反向依赖。
- 采用: focused preset 与 `--all` 不依赖变化 flag；前者只运行请求的闭合集，后者包含 package artifact 与 external-consumer acceptance。可信零变更时 required 可只保留少数无条件 Check；Git unavailable 时需要 change flag 的 required Checks 保守执行并保留 unavailable evidence。
- 采用: 未选择的 Checks 保留 Product `not-applicable / flag-condition-not-matched` facts，默认 strict-all aggregate 只计算同次 effective selection；增量选择不改变单个 Check 的结果语义。
- 不采用: 通过 Gate 自行重做 Git acquisition、从历史耗时动态选择 Checks、让 focused/complete 受变化 flag 抑制、无 Git 时假定零变更，或用增量 required 代替发布前 `--all`。
