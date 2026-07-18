# output-contract Specification

## Purpose
TBD - created by archiving change define-mvp-cli-output-contract. Update Purpose after archive.
## Requirements
### Requirement: Shared report data projection
Output layer SHALL 按 pinned generation conditions 从 product core 产出的同一份 TypeScript metrics/report data 写出 `metrics.json`、`report.md`、`warnings.ndjson` 和 `warnings-all.ndjson`，并且 MUST NOT 独立重新计算 scanner metrics、warning channels、baseline/comparison 或 `passed` / `warning` / `failed` status。为复现 scanner behavior 保存的 raw artifacts SHALL 保持 adapter-private boundary，不得直接成为 stable product output field。

#### Scenario: Stable artifacts project the same product data
- **WHEN** 同一次已完成 scan 按既有生成条件写出 metrics、Markdown report 和 warning-channel artifacts
- **THEN** `metrics.json`、`report.md`、`warnings.ndjson` 和 `warnings-all.ndjson` 投影同一份 product metrics/report data
- **AND** Output 不重新运行 scanner 或重新计算 warning、baseline/comparison 与 status

#### Scenario: Raw scanner material remains private
- **WHEN** adapter 保存 normalized scanner reproduction material 或 raw artifact
- **THEN** 该 material 留在 scanner artifact boundary
- **AND** 第三方原生 output structure 不直接提升为 stable product output field

### Requirement: Empty-state output
Output layer SHALL 保持 pinned TypeScript consumer 对 zero scan inputs、zero metrics/findings、zero warnings、profile skip、baseline unavailable 与 fatal failure 的既有可观察区分。正常 empty result SHALL 按既有生成条件写出 metrics/report artifacts 和一致 console summary；fatal failure MUST NOT 被投影为 empty success。

#### Scenario: Completed empty result remains distinct
- **WHEN** scan 正常完成但没有 scan inputs、scanner findings 或 warnings
- **THEN** 既有 artifacts 和 console summary 表达相应 empty state
- **AND** 该结果不被标记为 fatal failure

#### Scenario: Profile skip and unavailable baseline remain observable
- **WHEN** quick profile 跳过既有 component，或 baseline comparison 不可用
- **THEN** artifacts 与 console 保持 pinned consumer 对 skip 或 unavailable state 的表达
- **AND** Output 不把这些状态重新分类为 successful finding 或 fatal failure

#### Scenario: Fatal failure is not empty success
- **WHEN** scanner/runtime fatal issue 阻止 scan 正常完成
- **THEN** Output 保持既有 fatal console、artifact 和 status behavior
- **AND** 不生成伪装为 zero-result success 的报告

### Requirement: Output owner documentation
Output 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录 operational console channels、`metrics.json`、`report.md`、`warnings.ndjson`、`warnings-all.ndjson`、raw scanner artifacts、adapter-private output boundary、empty/failure state 和 status consistency，并被 `docs/navigation.md` 引用。Owner 文档 MUST NOT 把 Rust human/JSON stdout mode、`vibe-check.report.v1` schema 或 examples 作为 TypeScript 产品 contract。

#### Scenario: Navigation points to TypeScript output owner
- **WHEN** reviewer 从 `docs/navigation.md` 查找输出规则
- **THEN** 导航文档指向记录现有 TypeScript console 与 artifact boundary 的 owner 文档
- **AND** owner 文档不要求 TypeScript 产品实现 Rust stdout report 或 schema/example contract

