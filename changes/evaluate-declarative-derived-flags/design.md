# Design

本 Draft 以手动声明为基线，评估运行时派生 token 是否提供值得承担新增契约的收益。

## Context

- **命名条件**是可复用的 `CheckFlagCondition` 表达式，可通过常量、共享声明或 helper 提供给多个 Check。
  [Check authoring 指南](../../docs/guides/extending-check-lifecycle.md#按-flag-选择-check)拥有 grammar；
  [Definition owner](../../docs/development/project-definition.md#flag-enabled-checks)拥有复制、验证与冻结。
- **派生 flag**是在条件成立时产生的运行时 token。当前内置 producer 是 Git `changes.flags`，尚无通用条件派生入口；
  [Run owner](../../docs/development/project-run.md#change-preparation-and-flag-projection)拥有 effective flags 与 callback 投影。
- [RunControls](../../docs/api-mechanics.md#runcontrols-与-check-aggregation)允许调用方传入普通 token。
  调用方可用已有输入提前计算语义 flag；命名条件本身不会向 `project.flags` 注入 token。
- [已有决策](../../docs/decisions/unify-project-change-flags-as-effective-flags.md)采用单一 AST 与 effective flag 集，
  作为后续评估的兼容基线。

## Goals / Non-Goals

- 目标：明确内置派生相较手动声明的独立收益，以及重新评估所需的消费者证据。
- 范围外：Product 实现与用户指南补写；后者由独立的文档 Change 承接。

## Decisions

### Intended Change

已确认的判断是暂不实现，保留低优先级 Draft，优先使用手动声明。两种方案都能隐藏底层组合细节；
需要比较的是物化结果的收益，而非条件命名本身。

真实场景满足下列任一条件时，重新比较替代方案及契约成本，再确定是否进入 Plan：

1. 消费者需要用字符串引用语义，或回调需要读取统一物化的结果。
2. 手动接线产生可观察的维护、发现或一致性成本。

命名复用的文档可发现性由 `document-reusable-flag-conditions` 独立处理。

### Resulting Impacts

- 当前产物仅为评估草案，现有 API 与运行行为保持不变。
- 若派生需求成立，需确定 Definition 声明与 fingerprint、Run 求值顺序、命名冲突、token 引用、诊断和用户材料，
  再派生实施与验证任务。

## Risks / Trade-offs

- 内置物化可能改善集中声明与读取，但会增加 producer、冲突和求值契约。
- 调用前计算 token 只适用于调用方已有输入，不能消费本次 Run 尚未取得的 Git evidence，也不能伪造受保护的 change token。
- Git evidence 不可用时会保守注入 change flags；派生结果仍是选择信号，不能据此证明权限或业务事实。

## Open Questions

- 哪个真实消费者场景足以证明内置派生的增量价值？
- 需求成立后，最小求值范围、命名冲突与引用规则是什么？若需要派生间引用，须明确依赖与循环处理，
  尤其是 `not` 和 `exactlyOne` 下的求值语义。

## Baseline Evidence

2026-10-06 的源码 Run 核对已验证：两个 Check 共用条件，在空 flags、`required`、`required` 加 `source-changed`、
`force` 四种输入下得到预期终态；条件变量名未变成 token。调用前计算的普通语义 token 可选择 Check 并进入 callback。
该证据证明手动替代方案，不覆盖已发布包或新派生机制。
