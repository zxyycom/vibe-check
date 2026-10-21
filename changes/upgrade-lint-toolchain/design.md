# Design

配套升级 Oxlint 与类型引擎，保持现有阻断政策。

## Context

assess-oxlint-upgrade.md、assess-oxlint-tsgolint-upgrade.md；现有 coding-style 与类型可靠性 Decision。
当前 main 基线为 a36600da4aa2e4d3f4dcebb87722e56d1200ee9d；开始时已有十九份未提交升级报告和调查索引，作为既有工作保留。

## Goals / Non-Goals

目标：Oxlint 1.89.0 与 oxlint-tsgolint 7.0.2004 配套运行，两个 lint scope 通过，所有新增或消失诊断已复核且规则政策没有被放宽。
范围以本组已批准依赖和必要适配为限；不升级其余根库、不改变 mise/Node 支持范围、不修改既有调查的历史认识。

## Decisions

### Intended Change

升级配套工具并审阅 Product/scripts 诊断差异；保留现有显式规则、deny-warnings 与 safe-call 声明责任。

### Resulting Impacts

根声明和 lockfile 由统一依赖 owner 维护；如新诊断暴露真实问题，只在其源 owner 做有依据的最小修复；不得全树自动 fix、禁用规则或下调 severity 让升级变绿。
所有 package.json、pnpm-lock.yaml、node_modules 和 release-manifest 由 compiler_dependency_integration 单一 owner 串行写入；其余模块按明确所有权并行。主代理维护四组计划和最终验收，完整 Gate 在实现稳定后统一运行，失败时定向修复并重验，四组共享同轮证据。

## Risks / Trade-offs

recommended 类别、unused directives 和 safe-call 来源变化可能产生新诊断；新增规则不自动获得 policy 授权。

## Open Questions

当前方案已由用户确认。安装、行为差异与平台边界按实际验证更新，实质扩大范围时再确认。
