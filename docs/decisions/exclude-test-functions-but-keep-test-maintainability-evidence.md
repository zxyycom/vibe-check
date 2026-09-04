---
title: 排除测试函数复杂度但保留测试可维护性证据
status: active
alignment: aligned
createdAt: 2026-09-04T03:03:19Z
purpose: 降低 repository Function metrics 的无效分析成本，同时继续用重复和文件长度约束直接影响维护体验的测试代码问题。
background: Product test/test-support 显著增加 analyzer 时间；测试函数复杂度价值较低，但重复代码和超长文件仍影响维护。
decision: Function metrics 不分析 Product test/test-support，duplicate detection 与 file metrics 继续覆盖测试代码。
tags:
  - configuration
  - testing
  - workflow-policy
relations: []
---

## 目的

- 让函数复杂度和密度 Finding 聚焦需要长期演进的 Product implementation，而不是测试编排、断言或 fixture 函数。
- 保留对测试代码中大段复制和超长文件的可观察提示，因为这两类问题仍会增加阅读、定位和修改成本。

## 背景

- 当前 repository Function metrics 的 `product-source` 选择整个 `src/**/*.ts`，因此包含 184 个 `*.test.ts` / `*.test-support.ts` 文件、约 1.05 MiB；目标对照中排除它们可把 direct Check 从约 3.13–3.44 秒降至约 1.82 秒。
- Function metrics 的 cyclomatic complexity、nesting、parameter count 和 function density 对测试 fixture 与断言组合常形成低价值 Finding；测试行为已有 Bun Test Evidence、lint 和 typecheck。
- 用户确认测试代码并非完全无需质量约束：重复代码和文件长度会直接影响使用体验。因此不能把测试目录从全部 repository metrics 统一排除。

## 决策

- 采用: Project Gate repository Function metrics 的 Product area 显式排除 `src/**/*.test.ts` 与 `src/**/*.test-support.ts`；script test 已按现行策略排除，保持不变。
- 采用: Duplicate detection 继续选择 Product tests，并继续以独立 script-tests area 观察 script tests；File metrics 继续选择 Product tests。配置测试必须用代表路径证明三项策略的差异，不能重新共享一个统一 test exclusion。
- 采用: Product 和 scripts 的 lint、typecheck、format、行为测试、Test Evidence 与专用 analyzer verification 保持完整；Function metrics scope 变化不表示测试代码“不重要”。
- 采用: 若未来测试代码出现 Function metrics 才能识别且 duplicate/file/lint 无法承接的真实维护问题，应以具体消费者结果重新评估，而不是自动恢复全部测试函数扫描。
- 不采用: 从 duplicate/file metrics 排除测试、删除测试行为验证、按 Finding 数量扩大 exception，或把本仓库 private quality scope 变成 package consumer 默认值。
