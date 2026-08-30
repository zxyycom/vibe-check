---
title: 按材料所有权串行 Project Gate 文档验证
status: archived
alignment: aligned
createdAt: 2026-08-30T04:42:15Z
purpose: 让 Gate 仅在实测的 generated documentation material 读写边界串行，而保留无关验证的并行。
background: validation test 的 drift evidence 临时改写发布 schema/example；一次并行 Gate 因 docs example validator 读到该中间状态失败。
decision: 保留 package lifecycle mutex；仅让 validation lane 与 schema/example readers 共享 docs-materials mutex。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: schedule-project-gate-by-measured-resource-ownership.md
---

## 目的

- 让 Project Gate 的 named mutex 只表示已测量的同一 worktree 物理资源边界，而不是按 docs tag、Check 名称或失败后重试猜测串行范围。
- 在防止 generated documentation materials 读写竞争的同时，保留 JSON grammar、Markdown path 与其它无关 Check 的既有并行度。

## 背景

- `tests-scripts-validation` 中的 machine-artifact drift evidence 会短暂原地改写 checked-in schema、machine example `run.json` 和 example Definition，随后恢复原文件。
- 一次 full Gate 中该 lane 与 docs example validator 重叠；validator 只留下 `docs-example-validator-invalid` 的安全摘要。受控并发复现实验显示，只要 validator 在该短暂状态读取 example，`bun run validate -- docs examples` 会报告 published machine example drift；顺序执行则通过。
- docs schema validator 读取同一 schema/example material 并会因该 drift 失败。docs JSON validator 对测试使用的附加换行仍接受有效 JSON grammar，docs links validator 只读取 Markdown paths；它们不会因这些 temporary writes 改变 terminal result。

## 决策

- 采用: 保留 `project-gate-package-lifecycle` mutex 的现有判断：candidate lifecycle 与 external consumer provider 继续执行 build/install 型物理工作；artifact 与三个 consumer 只读 provider material，不持有该 mutex。
- 采用: `tests-scripts-validation`、`docs-schema-validator` 与 `docs-example-validator` 共享 Gate-owned `project-gate-documentation-materials` mutex。它只覆盖 validation test temporary mutation 与会因这些 materials 漂移而失败的 published schema/example readers。
- 采用: `docs-json-validator`、`docs-links-validator` 和其它 Check 不持有该 mutex；不能因同属 docs tag、读取工作树或可能出现诊断而无依据牺牲并行度。
- 不采用: 扩大 timeout、失败重试、将全部 docs validation 串行、为 docs materials 建立新 wrapper/nested Run，或把 temporary mutation 留给测试外的全局 lifecycle。
