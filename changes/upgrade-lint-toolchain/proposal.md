# Proposal

配套升级 Oxlint 与类型引擎，保持现有阻断政策。这是本次已授权实施的临时计划。

## Why

新版 type-aware 与已启用规则有实际修复，Oxlint 1.89.0 的 peer 要求也需要同步提升类型引擎。

## Outcome

Oxlint 1.89.0 与 oxlint-tsgolint 7.0.2004 配套运行，两个 lint scope 通过，所有新增或消失诊断已复核且规则政策没有被放宽。

## Scope

### Intended Change

升级配套工具并审阅 Product/scripts 诊断差异；保留现有显式规则、deny-warnings 与 safe-call 声明责任。

### Resulting Impacts

根声明和 lockfile 由统一依赖 owner 维护；如新诊断暴露真实问题，只在其源 owner 做有依据的最小修复；不得全树自动 fix、禁用规则或下调 severity 让升级变绿。

## Success Criteria

- 目标版本及实际安装、发布清单一致，最窄行为证据和最终完整 Gate 均通过。
- 实际差异、稳定 owner、Case 与必要交接同步；按本轮授权保存 Git 完成态、运行提交 hook 并正常结项，正式发布另行授权。

## Affected Owners

scripts/development/lint.ts 与 .oxlintrc.json；docs/tooling/workspace.md；受诊断影响的实际 source owner 和相关 tests。
